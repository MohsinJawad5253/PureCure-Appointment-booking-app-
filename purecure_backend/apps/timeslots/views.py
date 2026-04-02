from datetime import datetime
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from apps.users.views import api_response
from apps.users.permissions import IsDoctor
from apps.users.models import DoctorProfile
from .models import DoctorSchedule, TimeSlot, BlockedDate
from .serializers import (
    TimeSlotSerializer, DoctorScheduleSerializer, 
    DoctorScheduleWriteSerializer, BlockedDateSerializer,
    WeekAvailabilitySerializer
)
from .utils import (
    get_available_slots_by_date, get_week_availability, 
    generate_slots_for_doctor_range
)


class AvailableSlotsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, doctor_id):
        date_str = request.query_params.get('date')
        clinic_id = request.query_params.get('clinic_id') # Extract clinic_id
        
        if not date_str:
            return api_response(
                success=False,
                message="date query param is required",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return api_response(
                success=False,
                message="Invalid date format. Use YYYY-MM-DD",
                status_code=status.HTTP_400_BAD_REQUEST
            )
            
        if target_date < timezone.now().date():
            return api_response(
                success=False,
                message="Cannot query slots for past dates",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        try:
            doctor = DoctorProfile.objects.get(id=doctor_id)
        except DoctorProfile.DoesNotExist:
            return api_response(
                success=False,
                message="Doctor not found",
                status_code=status.HTTP_404_NOT_FOUND
            )

        # Pass clinic_id to utility
        slots = get_available_slots_by_date(doctor, target_date, clinic_id=clinic_id)
        serializer = TimeSlotSerializer(slots, many=True)
        
        return api_response(
            success=True,
            message="Available slots retrieved",
            data={
                "doctor_id": str(doctor_id),
                "clinic_id": clinic_id, # Include in response
                "date": date_str,
                "slots": serializer.data,
                "total_available": len(serializer.data)
            }
        )


class WeekAvailabilityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, doctor_id):
        start_date_str = request.query_params.get('start_date')
        clinic_id = request.query_params.get('clinic_id') # Extract clinic_id
        
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                return api_response(
                    success=False,
                    message="Invalid date format",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
        else:
            start_date = timezone.now().date()

        try:
            doctor = DoctorProfile.objects.get(id=doctor_id)
        except DoctorProfile.DoesNotExist:
            return api_response(
                success=False,
                message="Doctor not found",
                status_code=status.HTTP_404_NOT_FOUND
            )

        # Pass clinic_id to utility
        week_data = get_week_availability(doctor, start_date, clinic_id=clinic_id)
        serializer = WeekAvailabilitySerializer(week_data, many=True)
        
        return api_response(
            success=True,
            message="Weekly availability retrieved",
            data={
                "doctor_id": str(doctor_id),
                "clinic_id": clinic_id, # Include in response
                "week": serializer.data
            }
        )


class DoctorScheduleView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        schedules = DoctorSchedule.objects.filter(doctor=request.user.doctor_profile)
        serializer = DoctorScheduleSerializer(schedules, many=True)
        return api_response(
            success=True,
            message="Schedule retrieved",
            data=serializer.data
        )

    def post(self, request):
        serializer = DoctorScheduleWriteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(doctor=request.user.doctor_profile)
            return api_response(
                success=True,
                message="Schedule created successfully",
                data=serializer.data,
                status_code=status.HTTP_201_CREATED
            )
        return api_response(
            success=False,
            message="Invalid data",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )


class DoctorScheduleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsDoctor]
    serializer_class = DoctorScheduleSerializer
    queryset = DoctorSchedule.objects.all()
    lookup_field = 'id'

    def get_queryset(self):
        return self.queryset.filter(doctor=self.request.user.doctor_profile)

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        return api_response(success=True, message="Schedule details", data=response.data)

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        response = super().update(request, *args, **kwargs)
        return api_response(success=True, message="Schedule updated", data=response.data)

    def destroy(self, request, *args, **kwargs):
        super().destroy(request, *args, **kwargs)
        return api_response(success=True, message="Schedule deleted")


class BlockedDateView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        blocked = BlockedDate.objects.filter(doctor=request.user.doctor_profile).order_by('date')
        serializer = BlockedDateSerializer(blocked, many=True)
        return api_response(
            success=True,
            message="Blocked dates retrieved",
            data=serializer.data
        )

    def post(self, request):
        serializer = BlockedDateSerializer(data=request.data)
        if serializer.is_valid():
            blocked_date = serializer.save(doctor=request.user.doctor_profile)
            
            # Update existing slots for this date
            queryset = TimeSlot.objects.filter(
                doctor=request.user.doctor_profile, 
                date=blocked_date.date,
                status='available'
            )
            
            if blocked_date.block_entire_day:
                queryset.update(status='blocked')
            else:
                # Partial block logic
                for slot in queryset:
                    if not (slot.end_time <= blocked_date.block_start_time or 
                            slot.start_time >= blocked_date.block_end_time):
                        slot.status = 'blocked'
                        slot.save()
                        
            return api_response(
                success=True,
                message="Blocked date created and slots updated",
                data=serializer.data,
                status_code=status.HTTP_201_CREATED
            )
        return api_response(
            success=False,
            message="Invalid data",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )


class BlockedDateDetailView(APIView):
    permission_classes = [IsDoctor]

    def delete(self, request, id):
        try:
            blocked = BlockedDate.objects.get(id=id, doctor=request.user.doctor_profile)
            target_date = blocked.date
            blocked.delete()
            
            # Restore blocked slots to available (only those that were 'blocked')
            TimeSlot.objects.filter(
                doctor=request.user.doctor_profile,
                date=target_date,
                status='blocked'
            ).update(status='available')
            
            return api_response(success=True, message="Block removed and slots restored")
        except BlockedDate.DoesNotExist:
            return api_response(
                success=False,
                message="Blocked date not found",
                status_code=status.HTTP_404_NOT_FOUND
            )


class GenerateSlotsView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request):
        days_ahead = int(request.data.get('days_ahead', 14))
        days_ahead = min(max(days_ahead, 1), 30)
        
        results = generate_slots_for_doctor_range(request.user.doctor_profile, days_ahead)
        total_created = sum(r.get('created', 0) for r in results)
        total_skipped = sum(r.get('skipped', 0) for r in results)
        
        return api_response(
            success=True,
            message="Slots generated successfully",
            data={
                "total_created": total_created,
                "total_skipped": total_skipped,
                "days_ahead": days_ahead
            }
        )


class SlotDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slot_id):
        try:
            slot = TimeSlot.objects.get(id=slot_id)
            serializer = TimeSlotSerializer(slot)
            return api_response(success=True, message="Slot details", data=serializer.data)
        except TimeSlot.DoesNotExist:
            return api_response(
                success=False, 
                message="Slot not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
