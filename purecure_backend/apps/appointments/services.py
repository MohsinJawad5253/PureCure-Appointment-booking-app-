from datetime import datetime, timezone as tz
from django.db import transaction
from django.utils import timezone
from apps.timeslots.models import TimeSlot
from apps.users.models import DoctorProfile, User
from .models import Appointment, AppointmentReview


class AppointmentService:

    @staticmethod
    @transaction.atomic
    def book_appointment(patient: User, doctor_id: str, slot_id: str,
                         reason: str = '', patient_notes: str = '') -> Appointment:
        """
        Book an appointment. Atomic — slot status and appointment creation
        happen in the same DB transaction.

        Raises ValueError with user-friendly message on any failure.
        """
        # 1. Fetch and lock the slot (select_for_update prevents race conditions)
        try:
            slot = TimeSlot.objects.select_for_update().get(id=slot_id)
        except (TimeSlot.DoesNotExist, ValidationError):
            raise ValueError("Time slot not found.")

        # 2. Verify slot belongs to the requested doctor
        if str(slot.doctor.id) != str(doctor_id):
            raise ValueError("Time slot does not belong to this doctor.")

        # 3. Check slot is still available
        if slot.status != 'available':
            status_messages = {
                'booked': "This slot has just been booked by someone else.",
                'blocked': "This slot is not available for booking.",
                'cancelled': "This slot is no longer valid.",
                'completed': "This slot has already been used.",
            }
            raise ValueError(status_messages.get(slot.status, "This slot is not available."))

        # 4. Check slot is not in the past
        slot_dt = datetime.combine(slot.date, slot.start_time).replace(tzinfo=tz.utc)
        if slot_dt <= datetime.now(tz=tz.utc):
            raise ValueError("Cannot book a slot that is in the past.")

        # 5. Check patient has no conflicting upcoming appointment
        conflict = Appointment.objects.filter(
            patient=patient,
            appointment_date=slot.date,
            start_time=slot.start_time,
            status='upcoming',
        ).exists()
        if conflict:
            raise ValueError("You already have an appointment at this time.")

        # 6. Check patient has no more than 1 upcoming appointment
        #    with the same doctor on the same day
        same_day_same_doctor = Appointment.objects.filter(
            patient=patient,
            doctor=slot.doctor,
            appointment_date=slot.date,
            status='upcoming',
        ).exists()
        if same_day_same_doctor:
            raise ValueError(
                "You already have an appointment with this doctor today."
            )

        # 7. Flip slot to booked
        slot.status = 'booked'
        slot.save(update_fields=['status', 'updated_at'])

        # 8. Create appointment
        appointment = Appointment.objects.create(
            patient=patient,
            doctor=slot.doctor,
            time_slot=slot,
            appointment_date=slot.date,
            start_time=slot.start_time,
            end_time=slot.end_time,
            status='upcoming',
            reason=reason,
            patient_notes=patient_notes,
        )

        return appointment

    @staticmethod
    @transaction.atomic
    def cancel_appointment(appointment: Appointment, cancelled_by: User,
                           reason: str = '') -> Appointment:
        """
        Cancel an appointment. Frees up the time slot.

        Raises ValueError if appointment is not cancellable.
        """
        if appointment.status not in ('upcoming', 'in_progress'):
            raise ValueError(
                f"Cannot cancel an appointment with status '{appointment.status}'."
            )

        # Determine cancel status based on who is cancelling
        if cancelled_by.role == 'patient':
            if str(cancelled_by.id) != str(appointment.patient.id):
                raise ValueError("You can only cancel your own appointments.")
            new_status = 'cancelled_by_patient'
        elif cancelled_by.role == 'doctor':
            try:
                if str(cancelled_by.doctor_profile.id) != str(appointment.doctor.id):
                    raise ValueError("You can only cancel your own appointments.")
            except AttributeError:
                raise ValueError("Doctor profile not found.")
            new_status = 'cancelled_by_doctor'
        else:
            raise ValueError("Invalid user role for cancellation.")

        # Free the time slot
        slot = appointment.time_slot
        slot.status = 'available'
        slot.save(update_fields=['status', 'updated_at'])

        # Update appointment
        appointment.status = new_status
        appointment.cancellation_reason = reason
        appointment.cancelled_at = timezone.now()
        appointment.cancelled_by = cancelled_by
        appointment.save(update_fields=[
            'status', 'cancellation_reason', 'cancelled_at',
            'cancelled_by', 'updated_at'
        ])

        return appointment

    @staticmethod
    @transaction.atomic
    def reschedule_appointment(appointment: Appointment, patient: User,
                               new_slot_id: str) -> Appointment:
        """
        Reschedule by cancelling old appointment and booking a new one.
        Links new appointment to old via rescheduled_from.

        Raises ValueError on any failure.
        """
        if not appointment.is_reschedulable:
            raise ValueError(
                "This appointment cannot be rescheduled. "
                "It may already be completed, cancelled, or too close to start time."
            )

        if str(patient.id) != str(appointment.patient.id):
            raise ValueError("You can only reschedule your own appointments.")

        # Cancel old appointment (frees the old slot)
        AppointmentService.cancel_appointment(
            appointment, patient, reason='Rescheduled by patient'
        )
        # Override status to 'rescheduled' (more informative than cancelled_by_patient)
        appointment.status = 'rescheduled'
        appointment.save(update_fields=['status', 'updated_at'])

        # Book new appointment
        new_appointment = AppointmentService.book_appointment(
            patient=patient,
            doctor_id=str(appointment.doctor.id),
            slot_id=new_slot_id,
            reason=appointment.reason,
            patient_notes=appointment.patient_notes,
        )

        # Link the chain
        new_appointment.rescheduled_from = appointment
        new_appointment.save(update_fields=['rescheduled_from'])

        return new_appointment

    @staticmethod
    @transaction.atomic
    def complete_appointment(appointment: Appointment, doctor: User,
                             notes: str = '') -> Appointment:
        """
        Mark appointment as completed. Only the doctor can do this.
        """
        try:
            doctor_profile = doctor.doctor_profile
        except AttributeError:
            raise ValueError("Doctor profile not found.")

        if str(doctor_profile.id) != str(appointment.doctor.id):
            raise ValueError("You can only complete your own appointments.")

        if appointment.status not in ('upcoming', 'in_progress'):
            raise ValueError(
                f"Cannot complete an appointment with status '{appointment.status}'."
            )

        # Flip slot to completed
        slot = appointment.time_slot
        slot.status = 'completed'
        slot.save(update_fields=['status', 'updated_at'])

        appointment.status = 'completed'
        appointment.notes = notes
        appointment.save(update_fields=['status', 'notes', 'updated_at'])

        return appointment

    @staticmethod
    @transaction.atomic
    def mark_no_show(appointment: Appointment, doctor: User) -> Appointment:
        """Doctor marks patient as no-show."""
        try:
            doctor_profile = doctor.doctor_profile
        except AttributeError:
            raise ValueError("Doctor profile not found.")

        if str(doctor_profile.id) != str(appointment.doctor.id):
            raise ValueError("You can only update your own appointments.")

        if appointment.status != 'upcoming':
            raise ValueError("Can only mark upcoming appointments as no-show.")

        slot = appointment.time_slot
        slot.status = 'completed'
        slot.save(update_fields=['status', 'updated_at'])

        appointment.status = 'no_show'
        appointment.save(update_fields=['status', 'updated_at'])

        return appointment

    @staticmethod
    @transaction.atomic
    def submit_review(appointment: Appointment, patient: User,
                      rating: int, comment: str = '',
                      is_anonymous: bool = False) -> AppointmentReview:
        """Patient submits review for a completed appointment."""
        if str(patient.id) != str(appointment.patient.id):
            raise ValueError("You can only review your own appointments.")

        if appointment.status != 'completed':
            raise ValueError("You can only review completed appointments.")

        if hasattr(appointment, 'review'):
            raise ValueError("You have already reviewed this appointment.")

        if not (1 <= rating <= 5):
            raise ValueError("Rating must be between 1 and 5.")

        review = AppointmentReview.objects.create(
            appointment=appointment,
            patient=patient,
            doctor=appointment.doctor,
            rating=rating,
            comment=comment,
            is_anonymous=is_anonymous,
        )

        return review
