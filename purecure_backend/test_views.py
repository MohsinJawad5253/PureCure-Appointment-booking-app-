import os
import django
import sys
from rest_framework.test import APIRequestFactory, force_authenticate

# Setup django environment
sys.path.append('/Users/macbookairm2/Desktop/purecure/purecure_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'purecure.settings')
django.setup()

from apps.users.models import User, DoctorProfile
from apps.dashboard.views import DashboardStatsView, EarningsSummaryView

def test_views():
    user = User.objects.filter(role='doctor').first()
    if not user:
        print("No doctor user found in DB")
        return

    print(f"Testing views for {user.email}")
    factory = APIRequestFactory()

    # Test DashboardStatsView
    view = DashboardStatsView.as_view()
    request = factory.get('/dashboard/stats/')
    force_authenticate(request, user=user)
    
    try:
        response = view(request)
        print(f"DashboardStatsView: {response.status_code}")
        if response.status_code != 200:
            print(response.data)
    except Exception as e:
        print(f"DashboardStatsView: FAILED - {e}")
        import traceback
        traceback.print_exc()

    # Test EarningsSummaryView
    view = EarningsSummaryView.as_view()
    request = factory.get('/dashboard/earnings/')
    force_authenticate(request, user=user)
    
    try:
        response = view(request)
        print(f"EarningsSummaryView: {response.status_code}")
        if response.status_code != 200:
            print(response.data)
    except Exception as e:
        print(f"EarningsSummaryView: FAILED - {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_views()
