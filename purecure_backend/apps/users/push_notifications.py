from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
import logging

logger = logging.getLogger(__name__)


def send_push_notification(
    push_token: str,
    title: str,
    body: str,
    data: dict = None,
    sound: str = 'default',
    badge: int = 1,
) -> bool:
    """
    Send a push notification to a single device.
    Returns True if successful, False otherwise.
    """
    if not push_token:
        logger.warning('No push token provided')
        return False

    if not push_token.startswith('ExponentPushToken['):
        logger.warning(f'Invalid push token format: {push_token}')
        return False

    try:
        response = PushClient().publish(
            PushMessage(
                to=push_token,
                title=title,
                body=body,
                data=data or {},
                sound=sound,
                badge=badge,
                channel_id='appointments',  # matches Android channel
            )
        )
        response.validate_response()
        logger.info(f'Push notification sent successfully to {push_token[:20]}...')
        return True

    except PushServerError as e:
        logger.error(f'Push server error: {e}')
        return False

    except DeviceNotRegisteredError:
        logger.warning(f'Device not registered, clearing token')
        # Clear the invalid token from database
        from apps.users.models import User
        User.objects.filter(push_token=push_token).update(push_token=None)
        return False

    except PushTicketError as e:
        logger.error(f'Push ticket error: {e}')
        return False

    except Exception as e:
        logger.error(f'Unexpected push notification error: {e}')
        return False


def send_appointment_cancelled_by_doctor(appointment) -> bool:
    """
    Notify patient when doctor cancels their appointment.
    This is the main notification for your feature.
    """
    patient = appointment.patient
    doctor = appointment.doctor
    doctor_name = f"Dr. {doctor.user.full_name}"

    if not patient.push_token:
        logger.info(f'Patient {patient.email} has no push token')
        return False

    # Format the appointment date nicely
    appt_date = appointment.appointment_date.strftime('%B %d')
    appt_time = appointment.start_time.strftime('%I:%M %p').lstrip('0')

    return send_push_notification(
        push_token=patient.push_token,
        title='Appointment Cancelled',
        body=f'{doctor_name} has cancelled your appointment on {appt_date} at {appt_time}.',
        data={
            'type': 'appointment_cancelled',
            'appointment_id': str(appointment.id),
            'doctor_name': doctor_name,
            'date': str(appointment.appointment_date),
            'time': str(appointment.start_time),
        }
    )


def send_new_booking_to_doctor(appointment) -> bool:
    """
    Notify doctor when a patient books an appointment.
    """
    doctor = appointment.doctor
    patient = appointment.patient

    if not doctor.user.push_token:
        return False

    appt_date = appointment.appointment_date.strftime('%B %d')
    appt_time = appointment.start_time.strftime('%I:%M %p').lstrip('0')

    return send_push_notification(
        push_token=doctor.user.push_token,
        title='New Appointment Booked',
        body=f'{patient.full_name} booked an appointment for {appt_date} at {appt_time}.',
        data={
            'type': 'new_booking',
            'appointment_id': str(appointment.id),
            'patient_name': patient.full_name,
            'date': str(appointment.appointment_date),
            'time': str(appointment.start_time),
        }
    )


def send_appointment_reminder(appointment) -> bool:
    """
    Remind patient about upcoming appointment.
    Call this from a scheduled task 1 hour before.
    """
    patient = appointment.patient
    doctor = appointment.doctor

    if not patient.push_token:
        return False

    doctor_name = f"Dr. {doctor.user.full_name}"
    appt_time = appointment.start_time.strftime('%I:%M %p').lstrip('0')

    return send_push_notification(
        push_token=patient.push_token,
        title='Appointment Reminder',
        body=f'Your appointment with {doctor_name} is in 1 hour at {appt_time}.',
        data={
            'type': 'reminder',
            'appointment_id': str(appointment.id),
        }
    )
