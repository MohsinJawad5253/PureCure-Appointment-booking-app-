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

        # 4. Link doctors to clinics (using new DoctorClinic model)
        from apps.users.models import DoctorClinic
        
        doctor_clinic_data = [
            # Dr. Jenkins — PureCure (primary) + Green Valley
            ('PC-DERM-001', 'PureCure Wellness Clinic', True,  800),
            ('PC-DERM-001', 'Green Valley Clinic',       False, 900),

            # Dr. Chen — City Health (primary) + PureCure
            ('PC-CARD-002', 'City Health Center',        True,  1200),
            ('PC-CARD-002', 'PureCure Wellness Clinic',  False, 1100),

            # Dr. Rodriguez — Green Valley (primary) + City Health + PureCure
            ('PC-GEN-003', 'Green Valley Clinic',        True,  500),
            ('PC-GEN-003', 'City Health Center',         False, 550),
            ('PC-GEN-003', 'PureCure Wellness Clinic',   False, 500),
        ]

        for license_no, clinic_name, is_primary, fee in doctor_clinic_data:
            try:
                doctor = DoctorProfile.objects.get(license_number=license_no)
                clinic = Clinic.objects.get(name=clinic_name)
                
                # Update legacy fields for compat (primary only)
                if is_primary:
                    doctor.clinic = clinic
                    doctor.clinic_name = clinic.name
                    doctor.consultation_fee = fee
                    doctor.rating = 4.5 + (0.1 * (len(license_no) % 5))
                    doctor.review_count = 50 + (len(clinic_name) * 2)
                    doctor.languages = ['English', 'Hindi', 'Marathi']
                    doctor.save()

                DoctorClinic.objects.get_or_create(
                    doctor=doctor,
                    clinic=clinic,
                    defaults={
                        'is_primary': is_primary,
                        'consultation_fee': fee,
                        'is_active': True,
                    }
                )
                self.stdout.write(self.style.SUCCESS(f"Linked Dr. {doctor.user.last_name} → {clinic_name}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error linking doctor {license_no}: {e}"))

        # 5. Create DoctorSchedule rows for all 3 seed doctors (linked to clinics)
        from apps.timeslots.models import DoctorSchedule
        from apps.timeslots.utils import generate_slots_for_all_doctors
        from datetime import time as t

        # Clear existing schedules to avoid unique_together conflicts with NULL clinic
        DoctorSchedule.objects.all().delete()

        schedule_data = [
            # (license, clinic_name, weekday, start, end, duration)
            # Dr. Jenkins at PureCure — Mon-Fri 9-5
            ('PC-DERM-001', 'PureCure Wellness Clinic', 0, '09:00', '17:00', 30),
            ('PC-DERM-001', 'PureCure Wellness Clinic', 1, '09:00', '17:00', 30),
            ('PC-DERM-001', 'PureCure Wellness Clinic', 2, '09:00', '17:00', 30),
            ('PC-DERM-001', 'PureCure Wellness Clinic', 3, '09:00', '17:00', 30),
            ('PC-DERM-001', 'PureCure Wellness Clinic', 4, '09:00', '13:00', 30),
            # Dr. Jenkins at Green Valley — Sat 10-2
            ('PC-DERM-001', 'Green Valley Clinic',       5, '10:00', '14:00', 30),

            # Dr. Chen at City Health — Mon, Wed, Fri 10-6
            ('PC-CARD-002', 'City Health Center',        0, '10:00', '18:00', 30),
            ('PC-CARD-002', 'City Health Center',        2, '10:00', '18:00', 30),
            ('PC-CARD-002', 'City Health Center',        4, '10:00', '18:00', 30),
            # Dr. Chen at PureCure — Tue, Thu 10-2
            ('PC-CARD-002', 'PureCure Wellness Clinic',  1, '10:00', '14:00', 30),
            ('PC-CARD-002', 'PureCure Wellness Clinic',  3, '10:00', '14:00', 30),

            # Dr. Rodriguez at Green Valley — Mon-Sat
            ('PC-GEN-003', 'Green Valley Clinic',        0, '08:00', '20:00', 30),
            ('PC-GEN-003', 'Green Valley Clinic',        1, '08:00', '20:00', 30),
            ('PC-GEN-003', 'Green Valley Clinic',        2, '08:00', '20:00', 30),
            ('PC-GEN-003', 'Green Valley Clinic',        3, '08:00', '20:00', 30),
            ('PC-GEN-003', 'Green Valley Clinic',        4, '08:00', '20:00', 30),
            ('PC-GEN-003', 'Green Valley Clinic',        5, '09:00', '14:00', 30),
            # Dr. Rodriguez at City Health — Sun
            ('PC-GEN-003', 'City Health Center',         6, '10:00', '16:00', 30),
        ]

        for license_no, clinic_name, weekday, start, end, dur in schedule_data:
            try:
                doctor = DoctorProfile.objects.get(license_number=license_no)
                clinic = Clinic.objects.get(name=clinic_name)
                start_h, start_m = map(int, start.split(':'))
                end_h, end_m = map(int, end.split(':'))
                DoctorSchedule.objects.get_or_create(
                    doctor=doctor,
                    clinic=clinic,
                    weekday=weekday,
                    start_time=t(start_h, start_m),
                    defaults={
                        'end_time': t(end_h, end_m),
                        'slot_duration_minutes': dur,
                        'is_active': True,
                    }
                )
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Schedule error for {license_no} @ {clinic_name}: {e}"))

        self.stdout.write(self.style.SUCCESS("Schedules created. Generating time slots for next 14 days..."))
        result = generate_slots_for_all_doctors(days_ahead=14)
        self.stdout.write(self.style.SUCCESS(f"Slots generated: {result['total_created']} created, {result['total_skipped']} skipped"))

        self.stdout.write(self.style.SUCCESS('Time slot seeding complete!'))

        # 6. Seed sample appointments
        from apps.appointments.services import AppointmentService
        from apps.timeslots.models import TimeSlot
        from django.utils import timezone
        from datetime import timedelta

        self.stdout.write("\nSeeding sample appointments...")

        # Get seed users
        try:
            patient1 = User.objects.get(email='patient1@purecure.com')
            patient2 = User.objects.get(email='patient2@purecure.com')
            doctor1_profile = DoctorProfile.objects.get(license_number='PC-DERM-001')
            doctor2_profile = DoctorProfile.objects.get(license_number='PC-CARD-002')

            # Find first available future slot for doctor1
            tomorrow = timezone.now().date() + timedelta(days=1)
            slot1 = TimeSlot.objects.filter(
                doctor=doctor1_profile,
                date=tomorrow,
                status='available'
            ).order_by('start_time').first()

            if slot1:
                appt1 = AppointmentService.book_appointment(
                    patient=patient1,
                    doctor_id=str(doctor1_profile.id),
                    slot_id=str(slot1.id),
                    reason='Annual skin checkup',
                    patient_notes='Have a mole on my left arm I want checked',
                )
                self.stdout.write(self.style.SUCCESS(f"Appointment 1 created: {appt1}"))

            # Find slot for doctor2 day after tomorrow
            day_after = timezone.now().date() + timedelta(days=2)
            slot2 = TimeSlot.objects.filter(
                doctor=doctor2_profile,
                date=day_after,
                status='available'
            ).order_by('start_time').first()

            if slot2:
                appt2 = AppointmentService.book_appointment(
                    patient=patient2,
                    doctor_id=str(doctor2_profile.id),
                    slot_id=str(slot2.id),
                    reason='Chest pain follow-up',
                    patient_notes='Experiencing occasional chest tightness',
                )
                self.stdout.write(self.style.SUCCESS(f"Appointment 2 created: {appt2}"))

            self.stdout.write(self.style.SUCCESS("Sample appointments seeded successfully!"))

        except User.DoesNotExist:
            self.stdout.write(self.style.WARNING("Seed users not found — skipping appointment seeding"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Appointment seeding error: {e}"))
