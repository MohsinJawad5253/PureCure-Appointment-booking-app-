import os
import sys

# Change to the correct directory containing manage.py
sys.path.append('/Users/macbookairm2/Desktop/purecure/purecure_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'purecure.settings')

import django
django.setup()

from apps.appointments.models import Appointment

qs = Appointment.objects.all().order_by('appointment_date')
if not qs.exists():
    print("NO APPOINTMENTS IN DB!")
else:
    print(f"Earliest: {qs.first().appointment_date}")
    print(f"Latest:   {qs.last().appointment_date}")
    print(f"Total:    {qs.count()}")
