from datetime import date, timedelta, datetime, timezone as tz
from django.db.models import (
    Count, Avg, Sum, Q, F, Value, CharField,
    Case, When, IntegerField, DecimalField, Max
)
from collections import defaultdict
from django.utils import timezone
from apps.users.models import DoctorProfile, User
from apps.appointments.models import Appointment, AppointmentReview
from apps.timeslots.models import TimeSlot


# ─────────────────────────────────────────────
# DAILY AGENDA
# ─────────────────────────────────────────────

def get_daily_agenda(doctor: DoctorProfile, target_date: date) -> dict:
    """
    Returns everything needed for the doctor's daily agenda screen.
    Includes appointments grouped by status, slot summary, and day stats.
    """
    appointments = Appointment.objects.filter(
        doctor=doctor,
        appointment_date=target_date,
    ).select_related(
        'patient', 'time_slot'
    ).order_by('start_time')

    upcoming = appointments.filter(status='upcoming')
    in_progress = appointments.filter(status='in_progress')
    completed = appointments.filter(status='completed')
    cancelled = appointments.filter(
        status__in=['cancelled_by_patient', 'cancelled_by_doctor']
    )
    no_shows = appointments.filter(status='no_show')

    total_slots = TimeSlot.objects.filter(
        doctor=doctor, date=target_date
    ).count()

    booked_slots = TimeSlot.objects.filter(
        doctor=doctor, date=target_date, status='booked'
    ).count()

    return {
        'date': str(target_date),
        'weekday': target_date.strftime('%A'),
        'summary': {
            'total': appointments.count(),
            'upcoming': upcoming.count(),
            'in_progress': in_progress.count(),
            'completed': completed.count(),
            'cancelled': cancelled.count(),
            'no_show': no_shows.count(),
            'total_slots': total_slots,
            'booked_slots': booked_slots,
            'available_slots': total_slots - booked_slots,
        },
        'appointments': {
            'upcoming': list(upcoming),
            'in_progress': list(in_progress),
            'completed': list(completed),
            'cancelled': list(cancelled),
            'no_show': list(no_shows),
        }
    }


def get_upcoming_appointments_today(doctor: DoctorProfile) -> list:
    """
    Returns next 3 upcoming appointments for today — for dashboard header widget.
    """
    today = timezone.now().date()
    now_time = timezone.now().time()
    return list(
        Appointment.objects.filter(
            doctor=doctor,
            appointment_date=today,
            status='upcoming',
            start_time__gte=now_time,
        ).select_related('patient', 'time_slot')
        .order_by('start_time')[:3]
    )


def get_week_agenda_summary(doctor: DoctorProfile, start_date: date) -> list:
    """
    Returns per-day appointment counts for 7 days — for week overview strip.
    [
      {"date": "2026-03-14", "weekday": "Mon", "day_number": 14,
       "total": 8, "upcoming": 5, "completed": 2, "cancelled": 1}
    ]
    """
    result = []
    weekday_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    for i in range(7):
        target = start_date + timedelta(days=i)
        qs = Appointment.objects.filter(
            doctor=doctor, appointment_date=target
        )
        result.append({
            'date': str(target),
            'weekday': weekday_names[target.weekday()],
            'day_number': target.day,
            'total': qs.count(),
            'upcoming': qs.filter(status='upcoming').count(),
            'completed': qs.filter(status='completed').count(),
            'cancelled': qs.filter(
                status__in=['cancelled_by_patient', 'cancelled_by_doctor']
            ).count(),
        })
    return result


# ─────────────────────────────────────────────
# PATIENT RECORDS
# ─────────────────────────────────────────────

def get_doctor_patient_list(doctor: DoctorProfile, search: str = '',
                             ordering: str = '-last_visit') -> list:
    """
    Returns all unique patients who have had at least one appointment
    with this doctor. Annotates with visit count and last visit date.
    """
    patients_qs = User.objects.filter(
        appointments__doctor=doctor,
        role='patient',
    ).annotate(
        visit_count=Count('appointments', filter=Q(
            appointments__doctor=doctor,
            appointments__status='completed'
        )),
        last_visit=Max(
            'appointments__appointment_date',
            filter=Q(appointments__doctor=doctor)
        ),
        upcoming_count=Count('appointments', filter=Q(
            appointments__doctor=doctor,
            appointments__status='upcoming'
        )),
    ).distinct()

    if search:
        patients_qs = patients_qs.filter(
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(email__icontains=search) |
            Q(phone__icontains=search)
        )

    # Ordering
    valid_orderings = {
        '-last_visit': '-last_visit',
        'last_visit': 'last_visit',
        '-visit_count': '-visit_count',
        'visit_count': 'visit_count',
        'name': 'first_name',
        '-name': '-first_name',
    }
    order_field = valid_orderings.get(ordering, '-last_visit')
    patients_qs = patients_qs.order_by(order_field)

    return list(patients_qs)


def get_patient_appointment_history(doctor: DoctorProfile,
                                     patient: User) -> dict:
    """
    Returns full appointment history for a specific patient with this doctor.
    Also returns patient stats: total visits, last visit, upcoming count.
    """
    appointments = Appointment.objects.filter(
        doctor=doctor,
        patient=patient,
    ).select_related('time_slot').order_by('-appointment_date', '-start_time')

    completed = appointments.filter(status='completed')
    upcoming = appointments.filter(status='upcoming')
    cancelled = appointments.filter(
        status__in=['cancelled_by_patient', 'cancelled_by_doctor']
    )

    last_appointment = completed.first()

    return {
        'patient': patient,
        'stats': {
            'total_visits': completed.count(),
            'total_upcoming': upcoming.count(),
            'total_cancelled': cancelled.count(),
            'last_visit': str(last_appointment.appointment_date)
                          if last_appointment else None,
            'first_visit': str(
                completed.order_by('appointment_date').first().appointment_date
            ) if completed.exists() else None,
        },
        'appointments': list(appointments),
    }


# ─────────────────────────────────────────────
# STATS & ANALYTICS
# ─────────────────────────────────────────────

def get_dashboard_stats(doctor: DoctorProfile) -> dict:
    """
    Aggregated stats for the doctor dashboard home.
    """
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    all_appts = Appointment.objects.filter(doctor=doctor)

    def count_by_status(qs):
        return {
            'total': qs.count(),
            'upcoming': qs.filter(status='upcoming').count(),
            'completed': qs.filter(status='completed').count(),
            'cancelled': qs.filter(
                status__in=['cancelled_by_patient', 'cancelled_by_doctor']
            ).count(),
            'no_show': qs.filter(status='no_show').count(),
        }

    today_stats = count_by_status(all_appts.filter(appointment_date=today))
    week_stats = count_by_status(
        all_appts.filter(appointment_date__gte=week_start)
    )
    month_stats = count_by_status(
        all_appts.filter(appointment_date__gte=month_start)
    )
    all_time_stats = count_by_status(all_appts)

    # Unique patients
    unique_patients_total = User.objects.filter(
        appointments__doctor=doctor,
        appointments__status='completed',
    ).distinct().count()

    unique_patients_month = User.objects.filter(
        appointments__doctor=doctor,
        appointments__status='completed',
        appointments__appointment_date__gte=month_start,
    ).distinct().count()

    # Reviews
    reviews = AppointmentReview.objects.filter(doctor=doctor)
    avg_rating = reviews.aggregate(avg=Avg('rating'))['avg'] or 0
    rating_breakdown = {}
    for i in range(1, 6):
        rating_breakdown[str(i)] = reviews.filter(rating=i).count()

    # Monthly trend — Python grouping (SQLite compatible)
    six_months_ago = today - timedelta(days=180)
    recent_appts = all_appts.filter(
        appointment_date__gte=six_months_ago,
        status='completed',
    ).values('appointment_date')

    month_map = defaultdict(int)
    for a in recent_appts:
        month_key = a['appointment_date'].strftime('%b %Y')
        month_map[month_key] += 1

    # Sort by actual date
    def month_sort_key(m):
        try:
            return datetime.strptime(m, '%b %Y')
        except Exception:
            return datetime.min

    sorted_months = sorted(month_map.items(), key=lambda x: month_sort_key(x[0]))
    monthly_trend = [
        {'month': month, 'count': count}
        for month, count in sorted_months
    ]

    # Next appointment
    next_appt = all_appts.filter(
        appointment_date__gte=today,
        status='upcoming',
    ).order_by('appointment_date', 'start_time').first()

    return {
        'today': today_stats,
        'this_week': week_stats,
        'this_month': month_stats,
        'all_time': all_time_stats,
        'patients': {
            'total_unique': unique_patients_total,
            'new_this_month': unique_patients_month,
        },
        'ratings': {
            'average': round(float(avg_rating), 1),
            'total_reviews': reviews.count(),
            'breakdown': rating_breakdown,
        },
        'monthly_trend': [
            {
                'month': item['month'].strftime('%b %Y'),
                'count': item['count'],
            }
            for item in monthly_trend
        ],
        'next_appointment': next_appt,
    }


def get_earnings_summary(doctor: DoctorProfile) -> dict:
    """
    Earnings based on completed appointments × consultation_fee.
    """
    today = timezone.now().date()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=today.weekday())
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    last_month_end = month_start - timedelta(days=1)

    fee = float(doctor.consultation_fee)

    def earned(qs):
        count = qs.filter(
            doctor=doctor, status='completed'
        ).count()
        return round(count * fee, 2)

    today_earnings = earned(
        Appointment.objects.filter(appointment_date=today)
    )
    week_earnings = earned(
        Appointment.objects.filter(appointment_date__gte=week_start)
    )
    month_earnings = earned(
        Appointment.objects.filter(appointment_date__gte=month_start)
    )
    last_month_earnings = earned(
        Appointment.objects.filter(
            appointment_date__gte=last_month_start,
            appointment_date__lte=last_month_end,
        )
    )
    all_time_earnings = earned(Appointment.objects)

    # Monthly breakdown — Python grouping (SQLite compatible)
    six_months_ago = today - timedelta(days=180)
    recent_appts = Appointment.objects.filter(
        doctor=doctor,
        status='completed',
        appointment_date__gte=six_months_ago,
    ).values('appointment_date')

    month_map = defaultdict(int)
    for a in recent_appts:
        month_key = a['appointment_date'].strftime('%b %Y')
        month_map[month_key] += 1

    # Sort by actual date
    def month_sort_key(m):
        try:
            return datetime.strptime(m, '%b %Y')
        except Exception:
            return datetime.min

    sorted_months = sorted(month_map.items(), key=lambda x: month_sort_key(x[0]))
    monthly = [
        {'month': month, 'count': count}
        for month, count in sorted_months
    ]

    return {
        'consultation_fee': fee,
        'today': today_earnings,
        'this_week': week_earnings,
        'this_month': month_earnings,
        'last_month': last_month_earnings,
        'all_time': all_time_earnings,
        'monthly_breakdown': [
            {
                'month': item['month'].strftime('%b %Y'),
                'appointments': item['count'],
                'earned': round(item['count'] * fee, 2),
            }
            for item in monthly
        ],
    }
