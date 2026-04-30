from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from datetime import datetime, timedelta
import uuid

from apps.users.models import User, DoctorProfile
from apps.appointments.models import Appointment, AppointmentReview
from apps.users.permissions import IsDoctor
from . import selectors
from . import serializers


def api_response(success, message, data=None, errors=None, status_code=200):
    response_data = {
        "success": success,
        "message": message
    }
    if data is not None:
        response_data["data"] = data
    if errors is not None:
        response_data["errors"] = errors
    return Response(response_data, status=status_code)


class DailyAgendaView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        doctor = request.user.doctor_profile
        date_str = request.query_params.get('date')
        tab = request.query_params.get('tab', 'all')

        try:
            if date_str:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                target_date = timezone.now().date()
            
            # Validation
            today = timezone.now().date()
            if target_date < today - timedelta(days=90):
                 return api_response(False, "Date is too far in the past", status_code=status.HTTP_400_BAD_REQUEST)
            if target_date > today + timedelta(days=365):
                 return api_response(False, "Date is too far in the future", status_code=status.HTTP_400_BAD_REQUEST)

        except ValueError:
            return api_response(False, "Invalid date format. Use YYYY-MM-DD", status_code=status.HTTP_400_BAD_REQUEST)

        agenda_data = selectors.get_daily_agenda(doctor, target_date)
        
        # Filter by tab if requested
        if tab == 'upcoming':
            agenda_data['appointments'] = {'upcoming': agenda_data['appointments']['upcoming']}
        elif tab == 'completed':
            agenda_data['appointments'] = {'completed': agenda_data['appointments']['completed']}

        serializer = serializers.DailyAgendaSerializer(agenda_data, context={'request': request})
        return api_response(True, "Daily agenda retrieved", data=serializer.data)


class WeekAgendaView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        doctor = request.user.doctor_profile
        start_date_str = request.query_params.get('start_date')

        try:
            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            else:
                today = timezone.now().date()
                start_date = today - timedelta(days=today.weekday()) # This Monday
        except ValueError:
            return api_response(False, "Invalid date format. Use YYYY-MM-DD", status_code=status.HTTP_400_BAD_REQUEST)

        week_summary = selectors.get_week_agenda_summary(doctor, start_date)
        return api_response(True, "Week agenda summary retrieved", data={"week": week_summary})


class UpcomingTodayView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        doctor = request.user.doctor_profile
        appointments = selectors.get_upcoming_appointments_today(doctor)
        serializer = serializers.AgendaAppointmentSerializer(appointments, many=True, context={'request': request})
        
        return api_response(True, "Upcoming appointments retrieved", data={
            "appointments": serializer.data,
            "count": len(appointments)
        })


class PatientListView(APIView, PageNumberPagination):
    permission_classes = [IsDoctor]
    page_size = 20

    def get(self, request):
        doctor = request.user.doctor_profile
        search = request.query_params.get('search', '')
        ordering = request.query_params.get('ordering', '-last_visit')

        patients = selectors.get_doctor_patient_list(doctor, search, ordering)
        
        page = self.paginate_queryset(patients, request, view=self)
        if page is not None:
            serializer = serializers.PatientRecordSerializer(page, many=True, context={'request': request})
            return api_response(True, "Patients retrieved", data=self.get_paginated_response(serializer.data).data)

        serializer = serializers.PatientRecordSerializer(patients, many=True, context={'request': request})
        return api_response(True, "Patients retrieved", data=serializer.data)


class PatientDetailView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request, patient_id):
        doctor = request.user.doctor_profile
        try:
            patient = User.objects.get(id=patient_id, role='patient')
        except (User.DoesNotExist, ValueError):
            return api_response(False, "Patient not found", status_code=status.HTTP_404_NOT_FOUND)

        if not Appointment.objects.filter(doctor=doctor, patient=patient).exists():
            return api_response(False, "This patient has no appointment history with you", status_code=status.HTTP_403_FORBIDDEN)

        history_data = selectors.get_patient_appointment_history(doctor, patient)
        serializer = serializers.PatientHistorySerializer(history_data, context={'request': request})
        return api_response(True, "Patient profile retrieved", data=serializer.data)


class DashboardStatsView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        doctor = request.user.doctor_profile
        stats = selectors.get_dashboard_stats(doctor)
        
        # Serialize next_appointment if it exists
        if stats['next_appointment']:
            serializer = serializers.AgendaAppointmentSerializer(stats['next_appointment'], context={'request': request})
            stats['next_appointment'] = serializer.data

        return api_response(True, "Dashboard stats retrieved", data=stats)


class EarningsSummaryView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        doctor = request.user.doctor_profile
        earnings = selectors.get_earnings_summary(doctor)
        return api_response(True, "Earnings summary retrieved", data=earnings)


class DoctorProfileView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        doctor = request.user.doctor_profile
        serializer = serializers.DoctorPublicProfileSerializer(doctor, context={'request': request})
        return api_response(True, "Doctor profile retrieved", data=serializer.data)

    def patch(self, request):
        doctor = request.user.doctor_profile
        serializer = serializers.DoctorProfileUpdateSerializer(doctor, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Return updated profile using public serializer
            return api_response(
                True, 
                "Profile updated successfully", 
                data=serializers.DoctorPublicProfileSerializer(doctor, context={'request': request}).data
            )
        return api_response(False, "Update failed", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)


class DoctorAvailabilityToggleView(APIView):
    permission_classes = [IsDoctor]

    def patch(self, request):
        doctor = request.user.doctor_profile
        is_available = request.data.get('is_available')
        
        if is_available is None:
            return api_response(False, "is_available field is required", status_code=status.HTTP_400_BAD_REQUEST)
        
        doctor.is_available = bool(is_available)
        doctor.save(update_fields=['is_available'])
        
        message = "You are now available for bookings" if doctor.is_available else "You are now unavailable for bookings"
        return api_response(True, message, data={"is_available": doctor.is_available})


class NotificationsView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        doctor = request.user.doctor_profile
        notifications = []
        now = timezone.now()

        # 1. New bookings in last 24h
        new_bookings = Appointment.objects.filter(
            doctor=doctor, 
            created_at__gte=now - timedelta(hours=24), 
            status='upcoming'
        )
        for appt in new_bookings:
            notifications.append({
                'id': uuid.uuid4(),
                'type': 'new_booking',
                'title': 'New appointment booked',
                'message': f"{appt.patient.full_name} booked for {appt.appointment_date} at {appt.start_time.strftime('%I:%M %p')}",
                'appointment_id': appt.id,
                'is_read': False,
                'created_at': appt.created_at
            })

        # 2. Cancellations in last 24h
        cancellations = Appointment.objects.filter(
            doctor=doctor, 
            cancelled_at__gte=now - timedelta(hours=24),
            status='cancelled_by_patient'
        )
        for appt in cancellations:
            notifications.append({
                'id': uuid.uuid4(),
                'type': 'cancellation',
                'title': 'Appointment cancelled',
                'message': f"{appt.patient.full_name} cancelled their {appt.appointment_date} appointment",
                'appointment_id': appt.id,
                'is_read': False,
                'created_at': appt.cancelled_at
            })

        # 3. New reviews in last 7 days
        new_reviews = AppointmentReview.objects.filter(
            doctor=doctor, 
            created_at__gte=now - timedelta(days=7)
        )
        for review in new_reviews:
            name = "A patient" if review.is_anonymous else review.patient.first_name
            notifications.append({
                'id': uuid.uuid4(),
                'type': 'review',
                'title': 'New review received',
                'message': f"{name} left a {review.rating}★ review",
                'appointment_id': review.appointment.id,
                'is_read': False,
                'created_at': review.created_at
            })

        # 4. Tomorrow's appointment reminders
        tomorrow = now.date() + timedelta(days=1)
        reminders = Appointment.objects.filter(
            doctor=doctor, 
            appointment_date=tomorrow, 
            status='upcoming'
        )
        for appt in reminders:
            notifications.append({
                'id': uuid.uuid4(),
                'type': 'reminder',
                'title': "Tomorrow's appointment",
                'message': f"{appt.patient.full_name} at {appt.start_time.strftime('%I:%M %p')}",
                'appointment_id': appt.id,
                'is_read': False,
                'created_at': now # Dummy creation time for reminders to show first?
            })

        # Sort combined list
        notifications.sort(key=lambda x: x['created_at'], reverse=True)
        notifications = notifications[:20]
        
        serializer = serializers.NotificationSerializer(notifications, many=True)
        unread_count = len([n for n in notifications if not n['is_read']])

        return api_response(True, "Notifications retrieved", data={
            "notifications": serializer.data,
            "unread_count": unread_count
        })


class SearchPatientsView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        doctor = request.user.doctor_profile
        query = request.query_params.get('q', '')

        if len(query) < 2:
            return api_response(False, "Search query must be at least 2 characters", status_code=status.HTTP_400_BAD_REQUEST)

        patients = selectors.get_doctor_patient_list(doctor, search=query)
        patients = patients[:10] # Max 10 results

        serializer = serializers.PatientRecordSerializer(patients, many=True, context={'request': request})
        return api_response(True, "Search results retrieved", data=serializer.data)
