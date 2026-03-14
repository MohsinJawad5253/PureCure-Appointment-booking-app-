from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.users.models import DoctorProfile
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds initial authentication data for PureCure'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding authentication data...')
        
        # 1. Patients
        patients = [
            {
                'email': 'patient1@purecure.com',
                'password': 'Test@1234',
                'first_name': 'Rahul',
                'last_name': 'Sharma',
                'gender': 'male',
                'role': 'patient'
            },
            {
                'email': 'patient2@purecure.com',
                'password': 'Test@1234',
                'first_name': 'Priya',
                'last_name': 'Patel',
                'gender': 'female',
                'role': 'patient'
            }
        ]

        for p_data in patients:
            if not User.objects.filter(email=p_data['email']).exists():
                user = User.objects.create(
                    email=p_data['email'],
                    username=p_data['email'],
                    first_name=p_data['first_name'],
                    last_name=p_data['last_name'],
                    gender=p_data['gender'],
                    role=p_data['role']
                )
                user.set_password(p_data['password'])
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Created patient: {p_data['email']}"))
            else:
                self.stdout.write(f"Patient {p_data['email']} already exists. Skipping.")

        # 2. Doctors
        doctors = [
            {
                'email': 'doctor1@purecure.com',
                'password': 'Test@1234',
                'first_name': 'Sarah',
                'last_name': 'Jenkins',
                'role': 'doctor',
                'profile': {
                    'specialty': 'dermatology',
                    'clinic_name': 'PureCure Wellness Clinic',
                    'years_experience': 12,
                    'license_number': 'PC-DERM-001'
                }
            },
            {
                'email': 'doctor2@purecure.com',
                'password': 'Test@1234',
                'first_name': 'Michael',
                'last_name': 'Chen',
                'role': 'doctor',
                'profile': {
                    'specialty': 'cardiology',
                    'clinic_name': 'City Health Center',
                    'years_experience': 8,
                    'license_number': 'PC-CARD-002'
                }
            },
            {
                'email': 'doctor3@purecure.com',
                'password': 'Test@1234',
                'first_name': 'Emily',
                'last_name': 'Rodriguez',
                'role': 'doctor',
                'profile': {
                    'specialty': 'general',
                    'clinic_name': 'Green Valley Clinic',
                    'years_experience': 5,
                    'license_number': 'PC-GEN-003'
                }
            }
        ]

        for d_data in doctors:
            if not User.objects.filter(email=d_data['email']).exists():
                with transaction.atomic():
                    user = User.objects.create(
                        email=d_data['email'],
                        username=d_data['email'],
                        first_name=d_data['first_name'],
                        last_name=d_data['last_name'],
                        role=d_data['role']
                    )
                    user.set_password(d_data['password'])
                    user.save()

                    profile_data = d_data['profile']
                    DoctorProfile.objects.create(
                        user=user,
                        specialty=profile_data['specialty'],
                        clinic_name=profile_data['clinic_name'],
                        years_experience=profile_data['years_experience'],
                        license_number=profile_data['license_number']
                    )
                    self.stdout.write(self.style.SUCCESS(f"Created doctor: {d_data['email']}"))
            else:
                self.stdout.write(f"Doctor {d_data['email']} already exists. Skipping.")

        self.stdout.write(self.style.SUCCESS('Data seeding completed.'))

        # 3. Create clinics
        from apps.clinics.models import Clinic

        clinic1 = Clinic.objects.get_or_create(
            name='City Health Center',
            defaults={
                'address': '42 MG Road, Bandra West, Mumbai',
                'city': 'Mumbai',
                'rating': 4.9,
                'review_count': 120,
                'distance_km': 1.2,
                'tags': ['SPECIALIZED', '24/7'],
                'opening_time': '00:00',
                'closing_time': '23:59',
                'phone': '022-12345678',
            }
        )[0]

        clinic2 = Clinic.objects.get_or_create(
            name='Green Valley Clinic',
            defaults={
                'address': '15 Hill Road, Powai, Mumbai',
                'city': 'Mumbai',
                'rating': 4.7,
                'review_count': 95,
                'distance_km': 3.5,
                'tags': ['FAMILY CARE'],
                'opening_time': '08:00',
                'closing_time': '22:00',
                'phone': '022-87654321',
            }
        )[0]

        clinic3 = Clinic.objects.get_or_create(
            name='PureCure Wellness Clinic',
            defaults={
                'address': '8 Carter Road, Borivali, Mumbai',
                'city': 'Mumbai',
                'rating': 4.8,
                'review_count': 200,
                'distance_km': 5.0,
                'tags': ['SPECIALIZED', 'FAMILY CARE', 'EMERGENCY'],
                'opening_time': '07:00',
                'closing_time': '23:00',
                'phone': '022-11223344',
            }
        )[0]

        # 4. Link doctors to clinics (update existing doctor profiles)
        try:
            d1 = DoctorProfile.objects.get(license_number='PC-DERM-001')
            d1.clinic = clinic3
            d1.rating = 4.9
            d1.review_count = 124
            d1.consultation_fee = 800
            d1.languages = ['English', 'Hindi']
            d1.save()
            self.stdout.write(self.style.SUCCESS("Linked Dr. Jenkins to PureCure Wellness Clinic"))
        except DoctorProfile.DoesNotExist:
            self.stdout.write(self.style.WARNING("Doctor PC-DERM-001 not found"))

        try:
            d2 = DoctorProfile.objects.get(license_number='PC-CARD-002')
            d2.clinic = clinic1
            d2.rating = 4.7
            d2.review_count = 98
            d2.consultation_fee = 1200
            d2.languages = ['English', 'Hindi', 'Marathi']
            d2.save()
            self.stdout.write(self.style.SUCCESS("Linked Dr. Chen to City Health Center"))
        except DoctorProfile.DoesNotExist:
            self.stdout.write(self.style.WARNING("Doctor PC-CARD-002 not found"))

        try:
            d3 = DoctorProfile.objects.get(license_number='PC-GEN-003')
            d3.clinic = clinic2
            d3.rating = 4.5
            d3.review_count = 67
            d3.consultation_fee = 500
            d3.languages = ['English', 'Marathi']
            d3.save()
            self.stdout.write(self.style.SUCCESS("Linked Dr. Rodriguez to Green Valley Clinic"))
        except DoctorProfile.DoesNotExist:
            self.stdout.write(self.style.WARNING("Doctor PC-GEN-003 not found"))

        self.stdout.write(self.style.SUCCESS('Clinic and doctor seeding complete!'))
