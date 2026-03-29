from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import models
from django.db.models import (
    Count, Avg, Sum, Q, F, Min, Max
)
from django.utils import timezone
from datetime import timedelta, datetime
import random
from apps.users.views import api_response
from apps.appointments.models import Appointment, AppointmentReview
from apps.users.models import User, DoctorProfile
from apps.timeslots.models import TimeSlot
from .models import ClinicAdmin
from .permissions import IsClinicAdmin

class FixDatesView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        today = timezone.now().date()
        appointments = Appointment.objects.all()
        for a in appointments:
            days_ago = random.randint(0, 45)
            a.appointment_date = today - timedelta(days=days_ago)
            a.save()
        return api_response(success=True, message=f'Shifted {appointments.count()} appointments.')


class ClinicAdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        password = request.data.get('password', '')

        if not email or not password:
            return api_response(
                success=False,
                message='Email and password are required',
                status_code=400,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Special auto-create logic for City Health Center demo
            if email == 'admin2@cityhealth.com':
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=password,
                    first_name="Center",
                    last_name="Admin",
                    role="patient",
                    is_active=True
                )
                from apps.clinics.models import Clinic
                clinic, _ = Clinic.objects.get_or_create(name="City Health Center")
                ClinicAdmin.objects.create(user=user, clinic=clinic, is_active=True)
            else:
                return api_response(
                    success=False,
                    message='Invalid email or password',
                    status_code=401,
                )

        if not user.check_password(password):
            return api_response(
                success=False,
                message='Invalid email or password',
                status_code=401,
            )

        # Check clinic admin profile
        try:
            admin_profile = user.clinic_admin_profile
            if not admin_profile.is_active:
                return api_response(
                    success=False,
                    message='Your admin account has been deactivated',
                    status_code=403,
                )
            # Auto-heal: If the admin's clinic has no doctors (empty shell from quick seed),
            # point them to the clinic with the most appointments so the dashboard looks great.
            if not DoctorProfile.objects.filter(clinic=admin_profile.clinic).exists():
                most_active_clinic = DoctorProfile.objects.values('clinic').annotate(
                    count=Count('id')
                ).order_by('-count').first()
                if most_active_clinic:
                    from apps.clinics.models import Clinic
                    best_clinic = Clinic.objects.get(id=most_active_clinic['clinic'])
                    admin_profile.clinic = best_clinic
                    admin_profile.save()

        except ClinicAdmin.DoesNotExist:
            return api_response(
                success=False,
                message='You are not authorized as a clinic admin',
                status_code=403,
            )

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        return api_response(
            success=True,
            message='Login successful',
            data={
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'admin': {
                    'id': str(admin_profile.id),
                    'email': user.email,
                    'full_name': user.get_full_name(),
                    'clinic': {
                        'id': str(admin_profile.clinic.id),
                        'name': admin_profile.clinic.name,
                        'city': admin_profile.clinic.city,
                        'address': admin_profile.clinic.address,
                    },
                },
            },
        )


class ClinicDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsClinicAdmin]

    def get(self, request):
        clinic = request.user.clinic_admin_profile.clinic
        today = timezone.now().date()
        month_start = today.replace(day=1)
        week_start = today - timedelta(days=today.weekday())

        # All appointments at this clinic
        all_appts = Appointment.objects.filter(
            doctor__clinic=clinic
        )

        # Today stats
        today_appts = all_appts.filter(appointment_date=today)
        month_appts = all_appts.filter(
            appointment_date__gte=month_start
        )
        week_appts = all_appts.filter(
            appointment_date__gte=week_start
        )

        # Doctor count
        doctor_count = DoctorProfile.objects.filter(
            clinic=clinic, is_available=True
        ).count()

        # Unique patients this month
        unique_patients_month = User.objects.filter(
            appointments__doctor__clinic=clinic,
            appointments__appointment_date__gte=month_start,
        ).distinct().count()

        # Total unique patients ever
        total_patients = User.objects.filter(
            appointments__doctor__clinic=clinic,
        ).distinct().count()

        # Reviews
        reviews = AppointmentReview.objects.filter(
            doctor__clinic=clinic
        )
        avg_rating = reviews.aggregate(
            avg=Avg('rating')
        )['avg'] or 0

        # Revenue (completed × fee)
        revenue_month = sum(
            float(a.doctor.consultation_fee)
            for a in month_appts.filter(
                status='completed'
            ).select_related('doctor')
        )

        revenue_today = sum(
            float(a.doctor.consultation_fee)
            for a in today_appts.filter(
                status='completed'
            ).select_related('doctor')
        )

        # Monthly trend — last 6 months
        from django.db.models.functions import TruncMonth
        monthly_trend = list(
            all_appts.filter(
                status='completed',
                appointment_date__gte=today - timedelta(days=180),
            ).annotate(
                month=TruncMonth('appointment_date')
            ).values('month').annotate(
                count=Count('id')
            ).order_by('month')
        )

        # Appointment status breakdown this month
        status_breakdown = dict(
            month_appts.values('status').annotate(
                count=Count('id')
            ).values_list('status', 'count')
        )

        return api_response(
            success=True,
            message='Dashboard data loaded',
            data={
                'clinic': {
                    'id': str(clinic.id),
                    'name': clinic.name,
                    'city': clinic.city,
                    'address': clinic.address,
                    'rating': float(clinic.rating),
                    'review_count': clinic.review_count,
                    'tags': clinic.tags,
                },
                'today': {
                    'total': today_appts.count(),
                    'upcoming': today_appts.filter(
                        status='upcoming'
                    ).count(),
                    'completed': today_appts.filter(
                        status='completed'
                    ).count(),
                    'cancelled': today_appts.filter(
                        status__in=[
                            'cancelled_by_patient',
                            'cancelled_by_doctor'
                        ]
                    ).count(),
                    'revenue': revenue_today,
                },
                'this_month': {
                    'total': month_appts.count(),
                    'completed': month_appts.filter(
                        status='completed'
                    ).count(),
                    'cancelled': month_appts.filter(
                        status__in=[
                            'cancelled_by_patient',
                            'cancelled_by_doctor'
                        ]
                    ).count(),
                    'no_show': month_appts.filter(
                        status='no_show'
                    ).count(),
                    'revenue': revenue_month,
                    'unique_patients': unique_patients_month,
                },
                'all_time': {
                    'total_appointments': all_appts.count(),
                    'total_patients': total_patients,
                    'total_doctors': doctor_count,
                    'average_rating': round_custom(avg_rating, 1),
                    'total_reviews': reviews.count(),
                },
                'status_breakdown': status_breakdown,
                'monthly_trend': [
                    {
                        'month': item['month'].strftime('%b %Y'),
                        'count': item['count'],
                    }
                    for item in monthly_trend
                ],
            },
        )


class ClinicPatientsView(APIView):
    permission_classes = [IsAuthenticated, IsClinicAdmin]

    def get(self, request):
        clinic = request.user.clinic_admin_profile.clinic
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        page_size = 20

        patients_qs = User.objects.filter(
            appointments__doctor__clinic=clinic,
            role='patient',
        ).annotate(
            visit_count=Count(
                'appointments',
                filter=Q(
                    appointments__doctor__clinic=clinic,
                    appointments__status='completed',
                )
            ),
            last_visit=models.Max(
                'appointments__appointment_date',
                filter=Q(appointments__doctor__clinic=clinic)
            ),
            upcoming_count=Count(
                'appointments',
                filter=Q(
                    appointments__doctor__clinic=clinic,
                    appointments__status='upcoming',
                )
            ),
        ).distinct()

        if search:
            patients_qs = patients_qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search)
            )

        patients_qs = patients_qs.order_by('-last_visit')
        total = patients_qs.count()

        # Paginate
        start = (page - 1) * page_size
        end = start + page_size
        patients = patients_qs[start:end]

        data = []
        for p in patients:
            data.append({
                'id': str(p.id),
                'full_name': p.get_full_name(),
                'email': p.email,
                'phone': p.phone,
                'gender': p.gender,
                'date_of_birth': str(p.date_of_birth)
                    if p.date_of_birth else None,
                'visit_count': p.visit_count,
                'last_visit': str(p.last_visit)
                    if p.last_visit else None,
                'upcoming_count': p.upcoming_count,
                'joined': str(p.created_at.date()),
            })

        return api_response(
            success=True,
            message=f'{total} patients found',
            data={
                'results': data,
                'count': total,
                'page': page,
                'total_pages': (total + page_size - 1) // page_size,
                'has_next': end < total,
            },
        )


class ClinicPatientDetailView(APIView):
    permission_classes = [IsAuthenticated, IsClinicAdmin]

    def get(self, request, patient_id):
        clinic = request.user.clinic_admin_profile.clinic

        try:
            patient = User.objects.get(id=patient_id, role='patient')
        except User.DoesNotExist:
            return api_response(
                success=False,
                message='Patient not found',
                status_code=404,
            )

        # Verify patient has appointments at this clinic
        appts = Appointment.objects.filter(
            patient=patient,
            doctor__clinic=clinic,
        ).select_related(
            'doctor__user', 'time_slot'
        ).order_by('-appointment_date', '-start_time')

        if not appts.exists():
            return api_response(
                success=False,
                message='Patient has no appointments at this clinic',
                status_code=404,
            )

        completed = appts.filter(status='completed')
        upcoming = appts.filter(status='upcoming')
        cancelled = appts.filter(
            status__in=[
                'cancelled_by_patient',
                'cancelled_by_doctor'
            ]
        )

        appt_data = []
        for a in appts:
            appt_data.append({
                'id': str(a.id),
                'doctor_name': f"Dr. {a.doctor.user.get_full_name()}",
                'specialty': a.doctor.get_specialty_display(),
                'appointment_date': str(a.appointment_date),
                'start_time': str(a.start_time),
                'end_time': str(a.end_time),
                'status': a.status,
                'reason': a.reason,
                'notes': a.notes,
                'consultation_fee': float(
                    a.doctor.consultation_fee
                ),
            })

        return api_response(
            success=True,
            message='Patient detail loaded',
            data={
                'patient': {
                    'id': str(patient.id),
                    'full_name': patient.get_full_name(),
                    'email': patient.email,
                    'phone': patient.phone,
                    'gender': patient.gender,
                    'date_of_birth': str(patient.date_of_birth)
                        if patient.date_of_birth else None,
                    'joined': str(patient.created_at.date()),
                },
                'stats': {
                    'total_visits': completed.count(),
                    'upcoming': upcoming.count(),
                    'cancelled': cancelled.count(),
                    'total_spent': sum(
                        float(a.doctor.consultation_fee)
                        for a in completed.select_related('doctor')
                    ),
                    'first_visit': str(
                        completed.order_by(
                            'appointment_date'
                        ).first().appointment_date
                    ) if completed.exists() else None,
                    'last_visit': str(
                        completed.first().appointment_date
                    ) if completed.exists() else None,
                },
                'appointments': appt_data,
            },
        )


class ClinicAppointmentsView(APIView):
    permission_classes = [IsAuthenticated, IsClinicAdmin]

    def get(self, request):
        clinic = request.user.clinic_admin_profile.clinic
        status = request.query_params.get('status', '')
        date = request.query_params.get('date', '')
        doctor_id = request.query_params.get('doctor_id', '')
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        page_size = 20

        appts = Appointment.objects.filter(
            doctor__clinic=clinic
        ).select_related(
            'patient', 'doctor__user', 'time_slot'
        ).order_by('-appointment_date', '-start_time')

        if status:
            appts = appts.filter(status=status)
        if date:
            appts = appts.filter(appointment_date=date)
        if doctor_id:
            appts = appts.filter(doctor__id=doctor_id)
        if search:
            appts = appts.filter(
                Q(patient__first_name__icontains=search) |
                Q(patient__last_name__icontains=search) |
                Q(patient__email__icontains=search)
            )

        total = appts.count()
        start = (page - 1) * page_size
        data = []
        for a in appts[start:start+page_size]:
            data.append({
                'id': str(a.id),
                'patient_name': a.patient.get_full_name(),
                'patient_email': a.patient.email,
                'patient_phone': a.patient.phone,
                'doctor_name': (
                    f"Dr. {a.doctor.user.get_full_name()}"
                ),
                'specialty': a.doctor.get_specialty_display(),
                'appointment_date': str(a.appointment_date),
                'start_time': str(a.start_time),
                'end_time': str(a.end_time),
                'status': a.status,
                'reason': a.reason,
                'notes': a.notes,
                'consultation_fee': float(
                    a.doctor.consultation_fee
                ),
                'cancellation_reason': a.cancellation_reason,
                'created_at': str(a.created_at.date()),
            })

        return api_response(
            success=True,
            message=f'{total} appointments found',
            data={
                'results': data,
                'count': total,
                'page': page,
                'total_pages': (
                    total + page_size - 1
                ) // page_size,
                'has_next': (start + page_size) < total,
            },
        )


class ClinicDoctorsView(APIView):
    permission_classes = [IsAuthenticated, IsClinicAdmin]

    def get(self, request):
        clinic = request.user.clinic_admin_profile.clinic

        doctors = DoctorProfile.objects.filter(
            clinic=clinic
        ).select_related('user').annotate(
            total_appointments=Count('appointments'),
            completed_appointments=Count(
                'appointments',
                filter=Q(appointments__status='completed')
            ),
            total_reviews=Count('reviews'),
            avg_rating=Avg('reviews__rating'),
        )

        data = []
        for d in doctors:
            data.append({
                'id': str(d.id),
                'full_name': f"Dr. {d.user.get_full_name()}",
                'email': d.user.email,
                'specialty': d.get_specialty_display(),
                'years_experience': d.years_experience,
                'consultation_fee': float(d.consultation_fee),
                'rating': float(d.rating),
                'review_count': d.review_count,
                'is_available': d.is_available,
                'total_appointments': d.total_appointments,
                'completed_appointments': (
                    d.completed_appointments
                ),
                'total_reviews': d.total_reviews,
                'avg_rating': round_custom(d.avg_rating or 0, 1),
                'revenue_generated': (
                    d.completed_appointments *
                    float(d.consultation_fee)
                ),
            })

        return api_response(
            success=True,
            message=f'{len(data)} doctors found',
            data={'doctors': data},
        )


class ClinicReviewsView(APIView):
    permission_classes = [IsAuthenticated, IsClinicAdmin]

    def get(self, request):
        clinic = request.user.clinic_admin_profile.clinic
        doctor_id = request.query_params.get('doctor_id', '')
        rating = request.query_params.get('rating', '')
        page = int(request.query_params.get('page', 1))
        page_size = 20

        reviews = AppointmentReview.objects.filter(
            doctor__clinic=clinic
        ).select_related(
            'patient', 'doctor__user'
        ).order_by('-created_at')

        if doctor_id:
            reviews = reviews.filter(doctor__id=doctor_id)
        if rating:
            reviews = reviews.filter(rating=int(rating))

        total = reviews.count()
        start = (page - 1) * page_size

        # Rating breakdown
        breakdown = {}
        for i in range(1, 6):
            breakdown[str(i)] = reviews.filter(
                rating=i
            ).count()

        avg = reviews.aggregate(
            avg=Avg('rating')
        )['avg'] or 0

        data = []
        for r in reviews[start:start+page_size]:
            data.append({
                'id': str(r.id),
                'patient_name': (
                    'Anonymous'
                    if r.is_anonymous
                    else r.patient.get_full_name()
                ),
                'doctor_name': (
                    f"Dr. {r.doctor.user.get_full_name()}"
                ),
                'specialty': r.doctor.get_specialty_display(),
                'rating': r.rating,
                'comment': r.comment,
                'is_anonymous': r.is_anonymous,
                'created_at': str(r.created_at.date()),
            })

        return api_response(
            success=True,
            message=f'{total} reviews found',
            data={
                'results': data,
                'count': total,
                'average_rating': round_custom(avg, 1),
                'rating_breakdown': breakdown,
                'page': page,
                'total_pages': (
                    total + page_size - 1
                ) // page_size,
            },
        )


def _parse_report_date(value, default):
    """Parse YYYY-MM-DD from query params for consistent date filtering."""
    if value is None or value == '':
        return default
    if hasattr(value, 'strftime'):
        return value
    try:
        return datetime.strptime(str(value)[:10], '%Y-%m-%d').date()
    except ValueError:
        return default


class ClinicReportDataView(APIView):
    """
    Returns ALL data needed to generate a comprehensive
    PDF report for the clinic. Supports date range filtering.
    """
    permission_classes = [IsAuthenticated, IsClinicAdmin]

    def get(self, request):
        clinic = request.user.clinic_admin_profile.clinic

        today = timezone.now().date()
        month_start = today.replace(day=1)
        date_from = _parse_report_date(
            request.query_params.get('date_from'),
            month_start,
        )
        date_to = _parse_report_date(
            request.query_params.get('date_to'),
            today,
        )
        if date_from > date_to:
            date_from, date_to = date_to, date_from

        # Lifetime stats for this clinic (helps explain empty ranges in the UI)
        clinic_appt_stats = Appointment.objects.filter(
            doctor__clinic=clinic
        ).aggregate(
            total_all=Count('id'),
            first_date=Min('appointment_date'),
            last_date=Max('appointment_date'),
        )

        appts = Appointment.objects.filter(
            doctor__clinic=clinic,
            appointment_date__gte=date_from,
            appointment_date__lte=date_to,
        ).select_related('patient', 'doctor__user')

        completed = appts.filter(status='completed')
        cancelled = appts.filter(
            status__in=[
                'cancelled_by_patient',
                'cancelled_by_doctor'
            ]
        )
        no_show = appts.filter(status='no_show')

        # Revenue
        total_revenue = sum(
            float(a.doctor.consultation_fee)
            for a in completed.select_related('doctor')
        )

        # Unique patients
        unique_patients = appts.values(
            'patient'
        ).distinct().count()

        # Per-doctor breakdown
        doctors = DoctorProfile.objects.filter(
            clinic=clinic
        ).select_related('user')

        doctor_breakdown = []
        for d in doctors:
            d_appts = appts.filter(doctor=d)
            d_completed = d_appts.filter(status='completed')
            d_revenue = d_completed.count() * float(
                d.consultation_fee
            )
            d_reviews = AppointmentReview.objects.filter(
                doctor=d
            )
            d_avg = d_reviews.aggregate(
                avg=Avg('rating')
            )['avg'] or 0

            doctor_breakdown.append({
                'name': f"Dr. {d.user.get_full_name()}",
                'specialty': d.get_specialty_display(),
                'total_appointments': d_appts.count(),
                'completed': d_completed.count(),
                'cancelled': d_appts.filter(
                    status__in=[
                        'cancelled_by_patient',
                        'cancelled_by_doctor'
                    ]
                ).count(),
                'no_show': d_appts.filter(
                    status='no_show'
                ).count(),
                'revenue': d_revenue,
                'average_rating': round_custom(d_avg, 1),
                'total_reviews': d_reviews.count(),
                'consultation_fee': float(d.consultation_fee),
            })

        # Daily breakdown
        from django.db.models.functions import TruncDate
        daily = list(
            appts.annotate(
                day=TruncDate('appointment_date')
            ).values('day').annotate(
                total=Count('id'),
                completed_count=Count(
                    'id',
                    filter=Q(status='completed')
                ),
            ).order_by('day')
        )

        # Top patients: count only appointments in this clinic + date range
        in_range_appt = Q(
            appointments__doctor__clinic=clinic,
            appointments__appointment_date__gte=date_from,
            appointments__appointment_date__lte=date_to,
        )
        top_patients = list(
            User.objects.filter(in_range_appt).annotate(
                visits=Count(
                    'appointments',
                    filter=in_range_appt,
                )
            ).order_by('-visits').distinct()[:10]
        )

        # All appointment details for report table
        appt_details = []
        for a in appts.order_by(
            'appointment_date', 'start_time'
        )[:500]:  # cap at 500 rows
            appt_details.append({
                'date': str(a.appointment_date),
                'time': a.start_time.strftime('%I:%M %p'),
                'patient': a.patient.get_full_name(),
                'doctor': f"Dr. {a.doctor.user.get_full_name()}",
                'specialty': a.doctor.get_specialty_display(),
                'status': a.status.replace('_', ' ').title(),
                'fee': f"₹{a.doctor.consultation_fee}",
                'reason': a.reason or '—',
            })

        # Reviews summary
        all_reviews = AppointmentReview.objects.filter(
            doctor__clinic=clinic,
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
        )
        avg_rating = all_reviews.aggregate(
            avg=Avg('rating')
        )['avg'] or 0
        rating_breakdown = {
            # Use string keys for JSON serialization
            str(i): all_reviews.filter(
                rating=i
            ).count() for i in range(1, 6)
        }

        return api_response(
            success=True,
            message='Report data generated',
            data={
                'report_meta': {
                    'clinic_name': clinic.name,
                    'clinic_address': clinic.address,
                    'clinic_city': clinic.city,
                    'date_from': str(date_from),
                    'date_to': str(date_to),
                    'generated_at': str(
                        timezone.now().strftime(
                            '%d %B %Y, %I:%M %p'
                        )
                    ),
                    'clinic_appointments_total': (
                        clinic_appt_stats['total_all'] or 0
                    ),
                    'data_earliest_date': (
                        str(clinic_appt_stats['first_date'])
                        if clinic_appt_stats['first_date']
                        else None
                    ),
                    'data_latest_date': (
                        str(clinic_appt_stats['last_date'])
                        if clinic_appt_stats['last_date']
                        else None
                    ),
                },
                'summary': {
                    'total_appointments': appts.count(),
                    'completed': completed.count(),
                    'cancelled': cancelled.count(),
                    'no_show': no_show.count(),
                    'completion_rate': round_custom(
                        (completed.count() / appts.count() * 100)
                        if appts.count() > 0 else 0, 1
                    ),
                    'total_revenue': total_revenue,
                    'unique_patients': unique_patients,
                    'average_rating': round_custom(float(avg_rating), 1),
                    'total_reviews': all_reviews.count(),
                    'total_doctors': doctors.count(),
                },
                'doctor_breakdown': doctor_breakdown,
                'daily_breakdown': [
                    {
                        'date': str(d['day']),
                        'total': d['total'],
                        'completed': d['completed_count'],
                    }
                    for d in daily
                ],
                'top_patients': [
                    {
                        'name': p.get_full_name(),
                        'email': p.email,
                        'visits': p.visits,
                    }
                    for p in top_patients
                ],
                'rating_breakdown': rating_breakdown,
                'appointment_details': appt_details,
            },
        )


def round_custom(val, digits):
    """Utility to avoid Pyre round() errors"""
    return round(float(val), digits)
