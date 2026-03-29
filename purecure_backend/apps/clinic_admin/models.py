import uuid
from django.db import models
from apps.users.models import User
from apps.clinics.models import Clinic


class ClinicAdmin(models.Model):
    """
    A user who is authorized to administer a specific clinic.
    Separate from the doctor/patient role system.
    """
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='clinic_admin_profile'
    )
    clinic = models.ForeignKey(
        Clinic, on_delete=models.CASCADE,
        related_name='admins'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'clinic_admins'

    def __str__(self):
        return f"{self.user.email} → {self.clinic.name}"
