from rest_framework import serializers
from apps.users.models import User, DoctorProfile
from apps.clinics.models import Clinic

class ClinicForDoctorSerializer(serializers.Serializer):
    """Clinic info shown on doctor's profile."""
    id = serializers.UUIDField()
    clinic_id = serializers.UUIDField(source='clinic.id')
    name = serializers.CharField(source='clinic.name')
    city = serializers.CharField(source='clinic.city')
    address = serializers.CharField(source='clinic.address')
    rating = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()
    tags = serializers.ListField(source='clinic.tags')
    is_primary = serializers.BooleanField()
    consultation_fee = serializers.SerializerMethodField()

    def get_rating(self, obj):
        return float(obj.clinic.rating or 0)

    def get_distance_km(self, obj):
        return float(obj.clinic.distance_km or 0)

    def get_consultation_fee(self, obj):
        # Use clinic-specific fee if set, else doctor default
        if obj.consultation_fee is not None:
            return float(obj.consultation_fee)
        return float(obj.doctor.consultation_fee or 0)

class DoctorListSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    full_name = serializers.SerializerMethodField()
    specialty_display = serializers.CharField(source='get_specialty_display', read_only=True)
    
    # NEW: clinics list
    clinics = serializers.SerializerMethodField()
    # Backward compatibility fields
    clinic_name = serializers.SerializerMethodField()
    clinic = serializers.SerializerMethodField()
    
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'user_id', 'full_name', 'specialty', 'specialty_display', 
            'clinic_name', 'clinic', 'clinics', 'years_experience', 'rating', 
            'review_count', 'consultation_fee', 'is_available', 
            'profile_photo', 'languages'
        ]

    def get_full_name(self, obj):
        try:
            return f"Dr. {obj.user.first_name} {obj.user.last_name}"
        except:
            return "Dr. Unknown"

    def get_clinics(self, obj):
        doctor_clinics = obj.doctor_clinics.filter(
            is_active=True
        ).select_related('clinic').order_by('-is_primary')
        return ClinicForDoctorSerializer(
            doctor_clinics, many=True
        ).data

    def get_clinic_name(self, obj):
        # Primary clinic name for backward compat
        primary = obj.doctor_clinics.filter(
            is_primary=True, is_active=True
        ).select_related('clinic').first()
        if primary:
            return primary.clinic.name
        first = obj.doctor_clinics.filter(
            is_active=True
        ).select_related('clinic').first()
        return first.clinic.name if first else "Independent"

    def get_clinic(self, obj):
        # Primary clinic minimal info for backward compat
        primary = obj.doctor_clinics.filter(
            is_primary=True, is_active=True
        ).select_related('clinic').first()
        if not primary:
            primary = obj.doctor_clinics.filter(
                is_active=True
            ).select_related('clinic').first()
        if not primary:
            return None
        return {
            'id': str(primary.clinic.id),
            'name': primary.clinic.name,
            'city': primary.clinic.city,
            'rating': float(primary.clinic.rating or 0),
            'distance_km': float(primary.clinic.distance_km or 0),
        }

    def get_profile_photo(self, obj):
        request = self.context.get('request')
        if obj.profile_photo and request:
            try:
                return request.build_absolute_uri(obj.profile_photo.url)
            except:
                return obj.profile_photo.url
        return None

class DoctorDetailSerializer(DoctorListSerializer):
    user_email = serializers.SerializerMethodField()
    total_appointments = serializers.SerializerMethodField()

    class Meta(DoctorListSerializer.Meta):
        fields = DoctorListSerializer.Meta.fields + ['bio', 'user_email', 'total_appointments']

    def get_user_email(self, obj):
        request = self.context.get('request')
        if not request: return None
        user = request.user
        if user.is_staff or (user.is_authenticated and user == obj.user):
            return obj.user.email
        return None

    def get_total_appointments(self, obj):
        return obj.appointments.count()

class DoctorAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = '__all__'
