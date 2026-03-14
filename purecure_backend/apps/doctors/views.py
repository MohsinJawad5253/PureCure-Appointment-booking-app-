from rest_framework import generics, permissions, filters, status
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from apps.users.models import DoctorProfile
from apps.users.views import api_response
from .serializers import DoctorListSerializer, DoctorDetailSerializer, DoctorAdminSerializer
from .filters import DoctorFilter

class DoctorListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = DoctorProfile.objects.select_related('user', 'clinic').filter(user__is_active=True)
    serializer_class = DoctorListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = DoctorFilter
    search_fields = ['user__first_name', 'user__last_name', 'specialty', 'clinic_name', 'clinic__name']
    ordering_fields = ['rating', 'consultation_fee', 'years_experience', 'review_count']
    ordering = ['-rating']

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return api_response(
            success=True,
            message="Doctors retrieved successfully",
            data=response.data
        )

class DoctorDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        try:
            doctor = DoctorProfile.objects.select_related('user', 'clinic').get(id=id)
            serializer = DoctorDetailSerializer(doctor, context={'request': request})
            return api_response(
                success=True,
                message="Doctor details retrieved",
                data=serializer.data
            )
        except DoctorProfile.DoesNotExist:
            return api_response(
                success=False,
                message="Doctor not found",
                status_code=status.HTTP_404_NOT_FOUND
            )

class DoctorsBySpecialtyView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DoctorListSerializer

    def get_queryset(self):
        specialty = self.kwargs['specialty'].lower()
        return DoctorProfile.objects.select_related('user', 'clinic').filter(
            specialty__iexact=specialty,
            user__is_active=True
        )

    def list(self, request, *args, **kwargs):
        specialty = self.kwargs['specialty'].lower()
        valid_specialties = [choice[0] for choice in DoctorProfile.SPECIALTY_CHOICES]
        
        if specialty not in valid_specialties:
            return api_response(
                success=False,
                message="Invalid specialty",
                status_code=status.HTTP_400_BAD_REQUEST
            )
            
        response = super().list(request, *args, **kwargs)
        return api_response(
            success=True,
            message=f"Doctors specialized in {specialty} retrieved",
            data=response.data
        )

class SpecialtyListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        specialties_data = []
        for value, label in DoctorProfile.SPECIALTY_CHOICES:
            count = DoctorProfile.objects.filter(specialty=value, is_available=True, user__is_active=True).count()
            if count > 0:
                specialties_data.append({
                    "value": value,
                    "label": label,
                    "doctor_count": count
                })
        
        return api_response(
            success=True,
            message="Specialties retrieved",
            data={"specialties": specialties_data}
        )

class TopRatedDoctorsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        doctors = DoctorProfile.objects.select_related('user', 'clinic').filter(
            user__is_active=True,
            is_available=True
        ).order_by('-rating', '-review_count')[:6]
        
        serializer = DoctorListSerializer(doctors, many=True, context={'request': request})
        return api_response(
            success=True,
            message="Top rated doctors retrieved",
            data=serializer.data
        )
