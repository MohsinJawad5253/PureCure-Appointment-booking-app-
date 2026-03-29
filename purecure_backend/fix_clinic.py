import os
import sys

sys.path.append('/Users/macbookairm2/Desktop/purecure/purecure_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'purecure.settings')

import django
django.setup()

from apps.users.models import User, DoctorProfile
from apps.clinics.models import Clinic

admin = User.objects.get(email='admin@cityhealth.com')
my_clinic = admin.clinic_admin_profile.clinic

# Assign all doctors to the admin's clinic so the admin panel has rich data to display
updated_count = DoctorProfile.objects.all().update(clinic=my_clinic)
print(f"Assigned {updated_count} doctors to {my_clinic.name}.")
