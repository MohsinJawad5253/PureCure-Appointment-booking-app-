from rest_framework import serializers
from apps.users.models import User, DoctorProfile
from apps.clinics.models import Clinic

class ClinicMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = ['id', 'name', 'city', 'rating', 'distance_km']

class DoctorListSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    full_name = serializers.SerializerMethodField()
    specialty_display = serializers.CharField(source='get_specialty_display', read_only=True)
    clinic = ClinicMinimalSerializer(read_only=True)
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'user_id', 'full_name', 'specialty', 'specialty_display', 
            'clinic_name', 'clinic', 'years_experience', 'rating', 
            'review_count', 'consultation_fee', 'is_available', 
            'profile_photo', 'languages'
        ]

    def get_full_name(self, obj):
        return f"Dr. {obj.user.first_name} {obj.user.last_name}"

    def get_profile_photo(self, obj):
        request = self.context.get('request')
        if obj.profile_photo and request:
            return request.build_absolute_uri(obj.profile_photo.url)
        return None

class DoctorDetailSerializer(DoctorListSerializer):
    user_email = serializers.SerializerMethodField()
    total_appointments = serializers.SerializerMethodField()

    class Meta(DoctorListSerializer.Meta):
        fields = DoctorListSerializer.Meta.fields + ['bio', 'user_email', 'total_appointments']

    def get_user_email(self, obj):
        user = self.context.get('request').user
        if user.is_staff or user == obj.user:
            return obj.user.email
        return None

    def get_total_appointments(self, obj):
        # Stub for now
        return 0

class DoctorAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = '__all__'
