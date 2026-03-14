from rest_framework import serializers
from .models import Clinic
from apps.doctors.serializers import DoctorListSerializer

class ClinicMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = ['id', 'name', 'city', 'rating', 'distance_km']

class ClinicListSerializer(serializers.ModelSerializer):
    doctor_count = serializers.SerializerMethodField()

    class Meta:
        model = Clinic
        fields = [
            'id', 'name', 'city', 'address', 'photo', 'rating', 
            'review_count', 'distance_km', 'tags', 'opening_time', 
            'closing_time', 'is_active', 'doctor_count'
        ]

    def get_doctor_count(self, obj):
        return obj.doctors.filter(is_available=True).count()

class ClinicDetailSerializer(ClinicListSerializer):
    doctors = DoctorListSerializer(many=True, read_only=True)

    class Meta(ClinicListSerializer.Meta):
        fields = ClinicListSerializer.Meta.fields + ['doctors', 'phone', 'email']
