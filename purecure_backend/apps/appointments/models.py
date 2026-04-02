import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.users.models import User, DoctorProfile
from apps.timeslots.models import TimeSlot


class Appointment(models.Model):

    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled_by_patient', 'Cancelled by Patient'),
        ('cancelled_by_doctor', 'Cancelled by Doctor'),
        ('no_show', 'No Show'),
        ('rescheduled', 'Rescheduled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='appointments',
        limit_choices_to={'role': 'patient'}
    )
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE,
        related_name='appointments'
    )
    time_slot = models.OneToOneField(
        TimeSlot, on_delete=models.PROTECT,
        related_name='appointment'
    )
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appointments',
        help_text='Which clinic the appointment is at.'
    )

    # Denormalized for fast reads (no joins needed for list views)
    appointment_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default='upcoming'
    )
    reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)          # doctor's notes post-consultation
    patient_notes = models.TextField(blank=True)  # patient's pre-visit notes

    # Rescheduling chain
    rescheduled_from = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='rescheduled_to'
    )

    # Cancellation
    cancellation_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='cancelled_appointments'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments'
        ordering = ['appointment_date', 'start_time']
        indexes = [
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['doctor', 'appointment_date']),
            models.Index(fields=['doctor', 'status']),
            models.Index(fields=['appointment_date', 'status']),
        ]

    def clean(self):
        # Enforce: patient cannot have 2 upcoming appointments at same date+time
        overlapping = Appointment.objects.filter(
            patient=self.patient,
            appointment_date=self.appointment_date,
            start_time=self.start_time,
            status='upcoming',
        ).exclude(id=self.id)
        if overlapping.exists():
            raise ValidationError(
                "You already have an appointment at this date and time."
            )

    @property
    def is_cancellable(self):
        """Can only cancel upcoming appointments at least 1 hour in future."""
        if self.status != 'upcoming':
            return False
        from datetime import datetime, timezone as tz
        appt_dt = datetime.combine(
            self.appointment_date, self.start_time
        ).replace(tzinfo=tz.utc)
        return appt_dt > datetime.now(tz=tz.utc)

    @property
    def is_reschedulable(self):
        """Same rule as cancellable."""
        return self.is_cancellable

    def __str__(self):
        return (
            f"{self.patient.full_name} → "
            f"Dr.{self.doctor.user.full_name} "
            f"[{self.appointment_date} {self.start_time}] [{self.status}]"
        )


class AppointmentReview(models.Model):
    """Patient leaves a review after appointment is completed."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE,
        related_name='review'
    )
    patient = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='reviews'
    )
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE,
        related_name='reviews'
    )
    rating = models.PositiveSmallIntegerField()  # 1–5
    comment = models.TextField(blank=True)
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'appointment_reviews'
        ordering = ['-created_at']

    def clean(self):
        if not (1 <= self.rating <= 5):
            raise ValidationError("Rating must be between 1 and 5.")
        if self.appointment.status != 'completed':
            raise ValidationError(
                "Can only review completed appointments."
            )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._update_doctor_rating()

    def _update_doctor_rating(self):
        """Recalculate and save doctor's avg rating after each review."""
        from django.db.models import Avg
        avg = AppointmentReview.objects.filter(
            doctor=self.doctor
        ).aggregate(Avg('rating'))['rating__avg']
        count = AppointmentReview.objects.filter(doctor=self.doctor).count()
        self.doctor.rating = round(avg, 1) if avg else 0
        self.doctor.review_count = count
        self.doctor.save(update_fields=['rating', 'review_count'])
