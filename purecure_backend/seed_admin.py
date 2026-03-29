import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'purecure.settings')
django.setup()

from apps.users.models import User
from apps.clinics.models import Clinic
from apps.clinic_admin.models import ClinicAdmin
from decimal import Decimal

def seed_admin():
    # 1. Get or create the main clinic
    clinic, _ = Clinic.objects.get_or_create(
        name="City Health Clinic",
        defaults={
            "address": "123 Healthcare Ave",
            "city": "Mumbai",
            "phone": "022-12345678",
            "rating": Decimal("4.8"),
            "review_count": 1240,
            "tags": ["Multi-specialty", "24/7", "Emergency"]
        }
    )

    # 2. Create the admin user
    email = "admin@cityhealth.com"
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "first_name": "Clinic",
            "last_name": "Administrator",
            "role": "patient", 
            "phone": "9876543210",
            "is_active": True
        }
    )

    if created:
        user.set_password("admin123")
        user.save()
        print(f"User {email} created.")
    else:
        print(f"User {email} already exists.")

    # 3. Create ClinicAdmin profile
    admin_profile, admin_created = ClinicAdmin.objects.get_or_create(
        user=user,
        defaults={"clinic": clinic}
    )

    if admin_created:
        print(f"ClinicAdmin profile created for {email} at {clinic.name}.")
    else:
        print(f"ClinicAdmin profile already exists for {email}.")

if __name__ == "__main__":
    seed_admin()
