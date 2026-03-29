import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'purecure.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from apps.clinic_admin.views import ClinicReportDataView
from apps.users.models import User

admin_user = User.objects.get(email="admin@cityhealth.com")

factory = APIRequestFactory()
request = factory.get('/api/clinic-admin/report/?date_from=2024-03-01&date_to=2024-03-31')
force_authenticate(request, user=admin_user)

view = ClinicReportDataView.as_view()
try:
    response = view(request)
    if response.status_code == 200:
        print("SUCCESS")
    else:
        print(f"FAILED with {response.status_code}: {response.data}")
except Exception as e:
    import traceback
    traceback.print_exc()
