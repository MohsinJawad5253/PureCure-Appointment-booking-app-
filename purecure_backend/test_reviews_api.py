import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'purecure.settings')
django.setup()

from apps.doctors.views import DoctorReviewsView
from apps.users.models import DoctorProfile
from apps.appointments.models import Appointment, AppointmentReview
from django.test import RequestFactory
from django.contrib.auth import get_user_model

User = get_user_model()

def test_reviews():
    factory = RequestFactory()
    doctor = DoctorProfile.objects.first()
    if not doctor:
        print("No doctor found")
        return

    print(f"Testing reviews for doctor: {doctor.id}")
    
    # Create a dummy review if none exists
    if not AppointmentReview.objects.filter(doctor=doctor).exists():
        patient = User.objects.filter(role='patient').first()
        if patient:
            AppointmentReview.objects.create(
                doctor=doctor,
                patient=patient,
                rating=5,
                comment="Test review"
            )
            print("Created test review")

    view = DoctorReviewsView.as_view()
    request = factory.get(f'/api/doctors/{doctor.id}/reviews/')
    
    # Authenticate
    user = User.objects.first()
    request.user = user
    
    response = view(request, doctor_id=doctor.id)
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {json.dumps(response.data, indent=2)}")

if __name__ == "__main__":
    test_reviews()
