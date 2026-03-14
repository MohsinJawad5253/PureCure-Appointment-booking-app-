from datetime import date, time, datetime, timedelta
from django.utils import timezone
from apps.users.models import DoctorProfile
from apps.timeslots.models import DoctorSchedule, TimeSlot, BlockedDate


def generate_slots_for_doctor_date(doctor: DoctorProfile, target_date: date) -> dict:
    """
    Generate TimeSlot rows for a doctor on a specific date.
    
    Logic:
    1. Get the weekday of target_date (0=Mon ... 6=Sun)
    2. Find all active DoctorSchedule rows for doctor + weekday
    3. For each schedule, generate time windows of slot_duration_minutes
       from start_time to end_time
    4. Skip if a TimeSlot already exists for that doctor+date+start_time
    5. Check BlockedDate — if the entire day is blocked, skip ALL slots
    6. If partial block, skip slots that overlap the blocked window
    7. Skip any slots whose start_time is in the past (for today's date)
    8. Bulk create all new TimeSlot rows
    9. Return {"created": N, "skipped": N, "date": str(target_date)}
    """
    weekday = target_date.weekday()
    today = timezone.now().date()
    now_time = timezone.now().time()

    # Check for full-day block
    try:
        blocked = BlockedDate.objects.get(doctor=doctor, date=target_date)
        if blocked.block_entire_day:
            return {"created": 0, "skipped": 0, "date": str(target_date), "blocked": True}
    except BlockedDate.DoesNotExist:
        blocked = None

    # Get schedules for this weekday
    schedules = DoctorSchedule.objects.filter(
        doctor=doctor, weekday=weekday, is_active=True
    )
    if not schedules.exists():
        return {"created": 0, "skipped": 0, "date": str(target_date), "no_schedule": True}

    # Get existing slots to avoid duplicates
    existing_starts = set(
        TimeSlot.objects.filter(doctor=doctor, date=target_date)
        .values_list('start_time', flat=True)
    )

    slots_to_create = []
    skipped = 0

    for schedule in schedules:
        current = datetime.combine(target_date, schedule.start_time)
        end = datetime.combine(target_date, schedule.end_time)
        duration = timedelta(minutes=schedule.slot_duration_minutes)

        while current + duration <= end:
            slot_start = current.time()
            slot_end = (current + duration).time()

            # Skip past slots for today
            if target_date == today and slot_start <= now_time:
                current += duration
                skipped += 1
                continue

            # Skip already existing
            if slot_start in existing_starts:
                current += duration
                skipped += 1
                continue

            # Skip if overlaps partial block
            if blocked and not blocked.block_entire_day:
                if (blocked.block_start_time and blocked.block_end_time):
                    if not (slot_end <= blocked.block_start_time or
                            slot_start >= blocked.block_end_time):
                        current += duration
                        skipped += 1
                        continue

            slots_to_create.append(TimeSlot(
                doctor=doctor,
                date=target_date,
                start_time=slot_start,
                end_time=slot_end,
                status='available',
                slot_duration_minutes=schedule.slot_duration_minutes,
            ))
            current += duration

    if slots_to_create:
        TimeSlot.objects.bulk_create(slots_to_create, ignore_conflicts=True)

    return {
        "created": len(slots_to_create),
        "skipped": skipped,
        "date": str(target_date),
    }


def generate_slots_for_doctor_range(doctor: DoctorProfile, days_ahead: int = 14) -> list:
    """
    Generate slots for a doctor for the next N days starting from today.
    Calls generate_slots_for_doctor_date() for each day.
    Returns list of per-day result dicts.
    """
    today = timezone.now().date()
    results = []
    for i in range(days_ahead):
        target = today + timedelta(days=i)
        result = generate_slots_for_doctor_date(doctor, target)
        results.append(result)
    return results


def generate_slots_for_all_doctors(days_ahead: int = 14) -> dict:
    """
    Generate slots for ALL active doctors for the next N days.
    Used by the management command and nightly cron job.
    """
    doctors = DoctorProfile.objects.filter(
        is_available=True, user__is_active=True
    )
    total_created = 0
    total_skipped = 0
    doctor_results = []

    for doctor in doctors:
        results = generate_slots_for_doctor_range(doctor, days_ahead)
        created = sum(r.get('created', 0) for r in results)
        skipped = sum(r.get('skipped', 0) for r in results)
        total_created += created
        total_skipped += skipped
        doctor_results.append({
            "doctor": f"Dr. {doctor.user.get_full_name()}",
            "created": created,
            "skipped": skipped,
        })

    return {
        "total_created": total_created,
        "total_skipped": total_skipped,
        "days_ahead": days_ahead,
        "doctors_processed": len(doctor_results),
        "details": doctor_results,
    }


def get_available_slots_by_date(doctor: DoctorProfile, target_date: date) -> list:
    """
    Returns available TimeSlot queryset for a doctor on a date.
    Auto-generates slots first if none exist for that date.
    """
    existing = TimeSlot.objects.filter(doctor=doctor, date=target_date)
    if not existing.exists():
        generate_slots_for_doctor_date(doctor, target_date)

    queryset = TimeSlot.objects.filter(
        doctor=doctor,
        date=target_date,
        status='available',
    ).order_by('start_time')

    # If it's today, filter out past slots
    if target_date == timezone.now().date():
        now_time = timezone.now().time()
        # QuerySet filtering
        queryset = queryset.filter(start_time__gt=now_time)

    return queryset


def get_week_availability(doctor: DoctorProfile, start_date: date) -> list:
    """
    Returns slot availability summary for 7 days starting from start_date.
    Used by the date picker to show which days have open slots.
    Returns:
    [
      {"date": "2026-03-14", "weekday": "Mon", "available_count": 8, "has_slots": true},
      ...
    ]
    """
    result = []
    weekday_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    for i in range(7):
        target = start_date + timedelta(days=i)
        slots = get_available_slots_by_date(doctor, target)
        # Handle queryset count or list len
        if hasattr(slots, 'count'):
            count = slots.count()
        else:
            count = len(slots)
            
        result.append({
            "date": str(target),
            "weekday": weekday_names[target.weekday()],
            "day_number": target.day,
            "available_count": count,
            "has_slots": count > 0,
        })
    return result
