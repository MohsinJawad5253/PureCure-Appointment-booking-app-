from datetime import datetime, date, timedelta
from django.db.models import Q, Count, Avg
from django.utils import timezone
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from apps.users.views import api_response
from apps.users.permissions import IsPatient, IsDoctor
from .models import Appointment, AppointmentReview
from .serializers import (
    AppointmentPatientSerializer, AppointmentDoctorSerializer,
    BookAppointmentSerializer, CancelAppointmentSerializer,
    RescheduleAppointmentSerializer, CompleteAppointmentSerializer,
    AppointmentReviewSerializer
)
from .services import AppointmentService


class BookAppointmentView(APIView):
    permission_classes = [IsPatient]

    def post(self, request):
        serializer = BookAppointmentSerializer(data=request.data)
        if serializer.is_valid():
            try:
                appointment = AppointmentService.book_appointment(
                    patient=request.user,
                    doctor_id=str(serializer.validated_data['doctor_id']),
                    slot_id=str(serializer.validated_data['slot_id']),
                    reason=serializer.validated_data.get('reason', ''),
                    patient_notes=serializer.validated_data.get('patient_notes', '')
                )
                output_serializer = AppointmentPatientSerializer(appointment)
                return api_response(
                    success=True,
                    message="Appointment booked successfully",
                    data=output_serializer.data,
                    status_code=status.HTTP_201_CREATED
                )
            except ValueError as e:
                return api_response(
                    success=False,
                    message=str(e),
                    status_code=status.HTTP_400_BAD_REQUEST
                )
        return api_response(
            success=False,
            message="Invalid data",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )


class PatientAppointmentListView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        status_filter = request.query_params.get('status')
        date_filter = request.query_params.get('date')
        
        queryset = Appointment.objects.filter(patient=request.user)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_filter:
            queryset = queryset.filter(appointment_date=date_filter)
            
        # Default logic: upcoming first, then past
        if not status_filter and not request.query_params.get('ordering'):
            upcoming = queryset.filter(status='upcoming').order_by('appointment_date', 'start_time')
            past = queryset.exclude(status='upcoming').order_by('-appointment_date', '-start_time')
            result_list = list(upcoming) + list(past)
            # Manual pagination or just return all for now since limit is 10
            # For simplicity, we'll just use the list
            serializer = AppointmentPatientSerializer(result_list[:20], many=True)
        else:
            ordering = request.query_params.get('ordering', 'appointment_date')
            queryset = queryset.order_by(ordering)
            serializer = AppointmentPatientSerializer(queryset[:20], many=True)
            
        return api_response(
            success=True,
            message="Appointments retrieved",
            data=serializer.data
        )


class PatientAppointmentDetailView(APIView):
    permission_classes = [IsPatient]

    def get(self, request, id):
        try:
            appointment = Appointment.objects.get(id=id, patient=request.user)
            serializer = AppointmentPatientSerializer(appointment)
            return api_response(success=True, message="Appointment details", data=serializer.data)
        except Appointment.DoesNotExist:
            return api_response(success=False, message="Appointment not found", status_code=status.HTTP_404_NOT_FOUND)


class CancelAppointmentView(APIView):
    permission_classes = [IsPatient]

    def patch(self, request, id):
        try:
            appointment = Appointment.objects.get(id=id, patient=request.user)
            serializer = CancelAppointmentSerializer(data=request.data)
            if serializer.is_valid():
                try:
                    updated_appt = AppointmentService.cancel_appointment(
                        appointment, request.user, serializer.validated_data.get('cancellation_reason', '')
                    )
                    return api_response(
                        success=True, 
                        message="Appointment cancelled", 
                        data=AppointmentPatientSerializer(updated_appt).data
                    )
                except ValueError as e:
                    return api_response(success=False, message=str(e), status_code=status.HTTP_400_BAD_REQUEST)
            return api_response(success=False, message="Invalid data", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        except Appointment.DoesNotExist:
            return api_response(success=False, message="Appointment not found", status_code=status.HTTP_404_NOT_FOUND)


class RescheduleAppointmentView(APIView):
    permission_classes = [IsPatient]

    def patch(self, request, id):
        try:
            appointment = Appointment.objects.get(id=id, patient=request.user)
            serializer = RescheduleAppointmentSerializer(data=request.data)
            if serializer.is_valid():
                try:
                    new_appt = AppointmentService.reschedule_appointment(
                        appointment, request.user, str(serializer.validated_data['new_slot_id'])
                    )
                    return api_response(
                        success=True,
                        message="Appointment rescheduled successfully",
                        data=AppointmentPatientSerializer(new_appt).data
                    )
                except ValueError as e:
                    return api_response(success=False, message=str(e), status_code=status.HTTP_400_BAD_REQUEST)
            return api_response(success=False, message="Invalid data", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        except Appointment.DoesNotExist:
            return api_response(success=False, message="Appointment not found", status_code=status.HTTP_404_NOT_FOUND)


class SubmitReviewView(APIView):
    permission_classes = [IsPatient]

    def post(self, request, id):
        try:
            appointment = Appointment.objects.get(id=id, patient=request.user)
            serializer = AppointmentReviewSerializer(data=request.data)
            if serializer.is_valid():
                try:
                    review = AppointmentService.submit_review(
                        appointment, request.user,
                        serializer.validated_data['rating'],
                        serializer.validated_data.get('comment', ''),
                        serializer.validated_data.get('is_anonymous', False)
                    )
                    return api_response(
                        success=True,
                        message="Review submitted",
                        data=AppointmentReviewSerializer(review).data,
                        status_code=status.HTTP_201_CREATED
                    )
                except ValueError as e:
                    return api_response(success=False, message=str(e), status_code=status.HTTP_400_BAD_REQUEST)
            return api_response(success=False, message="Invalid data", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        except Appointment.DoesNotExist:
            return api_response(success=False, message="Appointment not found", status_code=status.HTTP_404_NOT_FOUND)


class DoctorAppointmentListView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        status_filter = request.query_params.get('status')
        date_filter = request.query_params.get('date')
        patient_name = request.query_params.get('patient_name')
        
        queryset = Appointment.objects.filter(doctor=request.user.doctor_profile)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_filter:
            queryset = queryset.filter(appointment_date=date_filter)
        if patient_name:
            queryset = queryset.filter(
                Q(patient__first_name__icontains=patient_name) | 
                Q(patient__last_name__icontains=patient_name)
            )
            
        ordering = request.query_params.get('ordering', 'appointment_date')
        queryset = queryset.order_by(ordering, 'start_time')
        
        serializer = AppointmentDoctorSerializer(queryset[:50], many=True)
        return api_response(success=True, message="Doctor appointments retrieved", data=serializer.data)


class DoctorAppointmentDetailView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request, id):
        try:
            appointment = Appointment.objects.get(id=id, doctor=request.user.doctor_profile)
            serializer = AppointmentDoctorSerializer(appointment)
            return api_response(success=True, message="Appointment details", data=serializer.data)
        except Appointment.DoesNotExist:
            return api_response(success=False, message="Appointment not found", status_code=status.HTTP_404_NOT_FOUND)


class CompleteAppointmentView(APIView):
    permission_classes = [IsDoctor]

    def patch(self, request, id):
        try:
            appointment = Appointment.objects.get(id=id, doctor=request.user.doctor_profile)
            serializer = CompleteAppointmentSerializer(data=request.data)
            if serializer.is_valid():
                try:
                    updated_appt = AppointmentService.complete_appointment(
                        appointment, request.user, serializer.validated_data.get('notes', '')
                    )
                    return api_response(success=True, message="Appointment completed", data=AppointmentDoctorSerializer(updated_appt).data)
                except ValueError as e:
                    return api_response(success=False, message=str(e), status_code=status.HTTP_400_BAD_REQUEST)
            return api_response(success=False, message="Invalid data", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        except Appointment.DoesNotExist:
            return api_response(success=False, message="Appointment not found", status_code=status.HTTP_404_NOT_FOUND)


class NoShowView(APIView):
    permission_classes = [IsDoctor]

    def patch(self, request, id):
        try:
            appointment = Appointment.objects.get(id=id, doctor=request.user.doctor_profile)
            try:
                updated_appt = AppointmentService.mark_no_show(appointment, request.user)
                return api_response(success=True, message="Marked as no-show", data=AppointmentDoctorSerializer(updated_appt).data)
            except ValueError as e:
                return api_response(success=False, message=str(e), status_code=status.HTTP_400_BAD_REQUEST)
        except Appointment.DoesNotExist:
            return api_response(success=False, message="Appointment not found", status_code=status.HTTP_404_NOT_FOUND)


class DoctorCancelView(APIView):
    permission_classes = [IsDoctor]

    def patch(self, request, id):
        try:
            appointment = Appointment.objects.get(id=id, doctor=request.user.doctor_profile)
            serializer = CancelAppointmentSerializer(data=request.data)
            if serializer.is_valid():
                try:
                    updated_appt = AppointmentService.cancel_appointment(
                        appointment, request.user, serializer.validated_data.get('cancellation_reason', '')
                    )
                    return api_response(success=True, message="Appointment cancelled by doctor", data=AppointmentDoctorSerializer(updated_appt).data)
                except ValueError as e:
                    return api_response(success=False, message=str(e), status_code=status.HTTP_400_BAD_REQUEST)
            return api_response(success=False, message="Invalid data", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        except Appointment.DoesNotExist:
            return api_response(success=False, message="Appointment not found", status_code=status.HTTP_404_NOT_FOUND)


class UpdateNotesView(APIView):
    permission_classes = [IsDoctor]

    def patch(self, request, id):
        try:
            appointment = Appointment.objects.get(id=id, doctor=request.user.doctor_profile)
            notes = request.data.get('notes', '')
            appointment.notes = notes
            appointment.save(update_fields=['notes', 'updated_at'])
            return api_response(success=True, message="Notes updated", data=AppointmentDoctorSerializer(appointment).data)
        except Appointment.DoesNotExist:
            return api_response(success=False, message="Appointment not found", status_code=status.HTTP_404_NOT_FOUND)


class AppointmentStatsView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        doctor_profile = request.user.doctor_profile
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        
        # Aggregations
        today_stats = Appointment.objects.filter(doctor=doctor_profile, appointment_date=today).aggregate(
            total=Count('id'),
            upcoming=Count('id', filter=Q(status='upcoming')),
            completed=Count('id', filter=Q(status='completed')),
            cancelled=Count('id', filter=Q(status__startswith='cancelled'))
        )
        
        week_stats = Appointment.objects.filter(doctor=doctor_profile, appointment_date__gte=week_start).aggregate(
            total=Count('id'),
            upcoming=Count('id', filter=Q(status='upcoming')),
            completed=Count('id', filter=Q(status='completed')),
            cancelled=Count('id', filter=Q(status__startswith='cancelled'))
        )
        
        all_time_stats = Appointment.objects.filter(doctor=doctor_profile).aggregate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='completed')),
            cancelled=Count('id', filter=Q(status__startswith='cancelled')),
            no_show=Count('id', filter=Q(status='no_show'))
        )
        
        return api_response(
            success=True,
            message="Stats retrieved",
            data={
                "today": today_stats,
                "this_week": week_stats,
                "all_time": all_time_stats,
                "average_rating": float(doctor_profile.rating),
                "total_reviews": doctor_profile.review_count
            }
        )
