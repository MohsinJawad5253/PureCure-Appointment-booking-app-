from rest_framework import generics, permissions, filters, status
from rest_framework.views import APIView
from .models import Clinic
from apps.users.views import api_response
from .serializers import ClinicListSerializer, ClinicDetailSerializer

class ClinicListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Clinic.objects.filter(is_active=True)
    serializer_class = ClinicListSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'city', 'address', 'tags']
    ordering_fields = ['rating', 'distance_km', 'review_count']
    ordering = ['-rating', 'distance_km']

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return api_response(
            success=True,
            message="Clinics retrieved successfully",
            data=response.data
        )

class ClinicDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        try:
            clinic = Clinic.objects.get(id=id)
            serializer = ClinicDetailSerializer(clinic, context={'request': request})
            return api_response(
                success=True,
                message="Clinic details retrieved",
                data=serializer.data
            )
        except Clinic.DoesNotExist:
            return api_response(
                success=False,
                message="Clinic not found",
                status_code=status.HTTP_404_NOT_FOUND
            )

class TopRatedClinicsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        clinics = Clinic.objects.filter(is_active=True).order_by('-rating')[:6]
        serializer = ClinicListSerializer(clinics, many=True, context={'request': request})
        return api_response(
            success=True,
            message="Top rated clinics retrieved",
            data=serializer.data
        )
