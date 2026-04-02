import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.users.models import DoctorProfile


class DoctorSchedule(models.Model):
    """
    Defines a doctor's recurring weekly availability.
    One row per doctor per weekday. Used to AUTO-GENERATE TimeSlots.
    """
    WEEKDAY_CHOICES = [
        (0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'),
        (3, 'Thursday'), (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday'),
    ]
    SLOT_DURATION_CHOICES = [
        (15, '15 minutes'), (30, '30 minutes'),
        (45, '45 minutes'), (60, '60 minutes'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name='schedules'
    )
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='doctor_schedules',
        null=True,
        blank=True,
        help_text='Which clinic this schedule applies to. Null = legacy support.'
    )
    weekday = models.IntegerField(choices=WEEKDAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration_minutes = models.IntegerField(
        choices=SLOT_DURATION_CHOICES, default=30
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doctor_schedules'
        unique_together = ['doctor', 'clinic', 'weekday', 'start_time']
        ordering = ['weekday', 'start_time']

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("start_time must be before end_time.")

    def __str__(self):
        clinic_name = self.clinic.name if self.clinic else "Global"
        return f"Dr.{self.doctor.user.last_name} @ {clinic_name} — {self.get_weekday_display()} {self.start_time}–{self.end_time}"


class TimeSlot(models.Model):
    """
    A concrete bookable slot on a specific calendar date.
    Generated from DoctorSchedule by the management command or API trigger.
    """
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('booked', 'Booked'),
        ('blocked', 'Blocked'),    # manually blocked by doctor
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name='time_slots'
    )
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='time_slots',
        null=True,
        blank=True,
        help_text='Which clinic this slot is at.'
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='available'
    )
    slot_duration_minutes = models.IntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'time_slots'
        unique_together = ['doctor', 'clinic', 'date', 'start_time']
        ordering = ['date', 'start_time']
        indexes = [
            models.Index(fields=['doctor', 'date']),
            models.Index(fields=['doctor', 'clinic', 'date']),
            models.Index(fields=['date', 'status']),
            models.Index(fields=['doctor', 'date', 'status']),
        ]

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("start_time must be before end_time.")
        if self.date < timezone.now().date():
            raise ValidationError("Cannot create time slots in the past.")

    @property
    def is_available(self):
        return self.status == 'available'

    @property
    def is_past(self):
        from datetime import datetime, timezone as tz
        slot_datetime = datetime.combine(self.date, self.start_time).replace(tzinfo=tz.utc)
        return slot_datetime < datetime.now(tz=tz.utc)

    def __str__(self):
        return f"Dr.{self.doctor.user.last_name} — {self.date} {self.start_time}–{self.end_time} [{self.status}]"


class BlockedDate(models.Model):
    """
    A full day or partial day blocked by the doctor (vacation, holiday, etc.)
    When a BlockedDate exists for a doctor+date, all slots for that day are blocked.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name='blocked_dates'
    )
    date = models.DateField()
    reason = models.CharField(max_length=200, blank=True)
    block_entire_day = models.BooleanField(default=True)
    block_start_time = models.TimeField(null=True, blank=True)
    block_end_time = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'blocked_dates'
        unique_together = ['doctor', 'date']

    def __str__(self):
        return f"Dr.{self.doctor.user.last_name} blocked — {self.date} ({self.reason or 'No reason'})"
