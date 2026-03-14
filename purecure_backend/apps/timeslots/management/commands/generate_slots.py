from django.core.management.base import BaseCommand
from apps.timeslots.utils import generate_slots_for_all_doctors
from apps.users.models import DoctorProfile
from apps.timeslots.utils import generate_slots_for_doctor_range


class Command(BaseCommand):
    help = 'Generate time slots for all doctors for the next N days'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days', type=int, default=14,
            help='Number of days ahead to generate slots (default: 14)'
        )
        parser.add_argument(
            '--doctor', type=str, default=None,
            help='UUID of a specific DoctorProfile to generate for (optional)'
        )

    def handle(self, *args, **options):
        days = options['days']
        doctor_id = options.get('doctor')

        if doctor_id:
            try:
                doctor = DoctorProfile.objects.get(id=doctor_id)
                self.stdout.write(
                    f"Generating slots for Dr. {doctor.user.get_full_name()}..."
                )
                results = generate_slots_for_doctor_range(doctor, days)
                created = sum(r.get('created', 0) for r in results)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Done: {created} slots created across {days} days."
                    )
                )
            except DoctorProfile.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"DoctorProfile {doctor_id} not found."))
        else:
            self.stdout.write(f"Generating slots for all doctors ({days} days ahead)...")
            result = generate_slots_for_all_doctors(days)
            self.stdout.write(self.style.SUCCESS(
                f"\nDone!\n"
                f"  Doctors processed : {result['doctors_processed']}\n"
                f"  Slots created     : {result['total_created']}\n"
                f"  Slots skipped     : {result['total_skipped']}\n"
            ))
            for dr in result['details']:
                self.stdout.write(
                    f"  {dr['doctor']}: {dr['created']} created, {dr['skipped']} skipped"
                )
