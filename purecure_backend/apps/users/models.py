from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    ROLE_CHOICES = [
        ('patient', 'Patient'),
        ('doctor', 'Doctor'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=15, blank=True)
    profile_photo = models.ImageField(upload_to='profiles/', blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(
        max_length=10,
        choices=[('male','Male'),('female','Female'),('other','Other')],
        blank=True
    )
    is_profile_complete = models.BooleanField(default=False)
    push_token = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text='Expo push notification token'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'role']

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_full_name()} ({self.role}) - {self.email}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username

class DoctorProfile(models.Model):
    SPECIALTY_CHOICES = [
        ('general', 'General Physician'),
        ('cardiology', 'Cardiologist'),
        ('dermatology', 'Dermatologist'),
        ('dental', 'Dentist'),
        ('ophthalmology', 'Ophthalmologist'),
        ('orthopedics', 'Orthopedic Surgeon'),
        ('pediatrics', 'Pediatrician'),
        ('psychiatry', 'Psychiatrist'),
        ('gynecology', 'Gynecologist'),
        ('neurology', 'Neurologist'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    # Deprecated: use DoctorClinic junction table instead.
    # Keeping it as null=True for migration data transfer.
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='legacy_doctors'
    )
    profile_photo = models.ImageField(upload_to='doctors/', blank=True, null=True)
    languages = models.JSONField(default=list)
    specialty = models.CharField(max_length=50, choices=SPECIALTY_CHOICES)
    clinic_name = models.CharField(max_length=200)
    years_experience = models.PositiveIntegerField(default=0)
    license_number = models.CharField(max_length=50, unique=True)
    bio = models.TextField(blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    review_count = models.PositiveIntegerField(default=0)
    consultation_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doctor_profiles'

    def __str__(self):
        return f"Dr. {self.user.full_name} — {self.get_specialty_display()}"

class DoctorClinic(models.Model):
    """
    Junction table: Doctor ↔ Clinic relationship.
    A doctor can attend at most 4 clinics.
    Each clinic visit has its own schedule.
    """
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.CASCADE,
        related_name='doctor_clinics',
    )
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='doctor_clinics',
    )
    is_primary = models.BooleanField(
        default=False,
        help_text='Primary clinic shown by default on doctor profile',
    )
    consultation_fee = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Override consultation fee for this clinic. '
                  'If null, uses doctor default fee.',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doctor_clinics'
        unique_together = ['doctor', 'clinic']
        ordering = ['-is_primary', 'clinic__name']

    def clean(self):
        from django.core.exceptions import ValidationError
        # Enforce max 4 clinics per doctor
        existing = DoctorClinic.objects.filter(
            doctor=self.doctor
        ).exclude(id=self.id).count()
        if existing >= 4:
            raise ValidationError(
                'A doctor can be associated with at most 4 clinics.'
            )

    def save(self, *args, **kwargs):
        self.clean()
        # If this is marked primary, unmark all others
        if self.is_primary:
            DoctorClinic.objects.filter(
                doctor=self.doctor,
                is_primary=True,
            ).exclude(id=self.id).update(is_primary=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"Dr. {self.doctor.user.get_full_name()} "
            f"@ {self.clinic.name}"
            f"{' (Primary)' if self.is_primary else ''}"
        )
