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


class DoctorReviewsView(APIView):
    """
    Returns all reviews for a specific doctor.
    Accessible by authenticated patients and doctors.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, doctor_id):
        from apps.appointments.models import AppointmentReview
        from django.db.models import Avg, Count

        try:
            doctor = DoctorProfile.objects.get(id=doctor_id)
        except DoctorProfile.DoesNotExist:
            return api_response(
                success=False,
                message='Doctor not found',
                status_code=404,
            )

        page = int(request.query_params.get('page', 1))
        page_size = 20
        rating_filter = request.query_params.get('rating', '')

        reviews_qs = AppointmentReview.objects.filter(
            doctor=doctor,
        ).select_related('patient').order_by('-created_at')

        if rating_filter and rating_filter.isdigit():
            reviews_qs = reviews_qs.filter(
                rating=int(rating_filter)
            )

        total = reviews_qs.count()

        # Rating breakdown
        all_reviews = AppointmentReview.objects.filter(
            doctor=doctor
        )
        avg = all_reviews.aggregate(
            avg=Avg('rating')
        )['avg'] or 0

        breakdown = {}
        for i in range(1, 6):
            breakdown[str(i)] = all_reviews.filter(
                rating=i
            ).count()

        # Paginate
        start = (page - 1) * page_size
        end = start + page_size
        reviews = reviews_qs[start:end]

        data = []
        for r in reviews:
            # Time since review
            from django.utils import timezone
            now = timezone.now()
            diff = now - r.created_at
            days = diff.days
            seconds = diff.seconds

            if days == 0:
                if seconds < 3600:
                    time_ago = f'{seconds // 60} min ago'
                elif seconds < 7200:
                    time_ago = '1 hour ago'
                else:
                    time_ago = f'{seconds // 3600} hours ago'
            elif days == 1:
                time_ago = 'Yesterday'
            elif days < 7:
                time_ago = f'{days} days ago'
            elif days < 30:
                weeks = days // 7
                time_ago = (
                    f'{weeks} week ago'
                    if weeks == 1
                    else f'{weeks} weeks ago'
                )
            elif days < 30 * 12:
                months = days // 30
                time_ago = (
                    f'{months} month ago'
                    if months == 1
                    else f'{months} months ago'
                )
            else:
                years = days // 365
                time_ago = (
                    f'{years} year ago'
                    if years == 1
                    else f'{years} years ago'
                )

            data.append({
                'id': str(r.id),
                'rating': r.rating,
                'comment': r.comment or '',
                'is_anonymous': r.is_anonymous,
                'patient_name': (
                    'Anonymous'
                    if r.is_anonymous
                    else r.patient.get_full_name()
                ),
                'patient_initials': (
                    'AN'
                    if r.is_anonymous
                    else ''.join([
                        n[0].upper()
                        for n in r.patient.get_full_name().split()
                        if n
                    ])[:2]
                ),
                'time_ago': time_ago,
                'created_at': str(r.created_at.date()),
            })

        return api_response(
            success=True,
            message=f'{total} reviews found',
            data={
                'doctor': {
                    'id': str(doctor.id),
                    'full_name': (
                        f"Dr. {doctor.user.get_full_name()}"
                    ),
                    'specialty': doctor.get_specialty_display(),
                    'profile_photo': (
                        request.build_absolute_uri(
                            doctor.profile_photo.url
                        )
                        if doctor.profile_photo
                        else None
                    ),
                },
                'summary': {
                    'average_rating': round(float(avg), 1),
                    'total_reviews': total,
                    'breakdown': breakdown,
                },
                'reviews': data,
                'page': page,
                'total_pages': (
                    total + page_size - 1
                ) // page_size if total > 0 else 1,
                'has_next': end < total,
            },
        )
