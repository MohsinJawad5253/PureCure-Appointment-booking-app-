from rest_framework import serializers
from apps.users.models import User, DoctorProfile
from apps.timeslots.models import TimeSlot
from .models import Appointment, AppointmentReview


class AppointmentDoctorMinimalSerializer(serializers.ModelSerializer):
    user_id = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    specialty_display = serializers.CharField(source='get_specialty_display', read_only=True)
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'user_id', 'full_name', 'specialty', 'specialty_display',
            'clinic_name', 'profile_photo', 'rating', 'consultation_fee'
        ]

    def get_user_id(self, obj):
        try:
            return obj.user.id
        except:
            return None

    def get_full_name(self, obj):
        try:
            return f"Dr. {obj.user.first_name} {obj.user.last_name}"
        except:
            return "Dr. Unknown"

    def get_profile_photo(self, obj):
        request = self.context.get('request')
        if obj.profile_photo and request:
            try:
                return request.build_absolute_uri(obj.profile_photo.url)
            except:
                return obj.profile_photo.url
        return None


class AppointmentPatientMinimalSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'email', 'phone',
            'gender', 'date_of_birth', 'profile_photo'
        ]

    def get_profile_photo(self, obj):
        request = self.context.get('request')
        if obj.profile_photo and request:
            return request.build_absolute_uri(obj.profile_photo.url)
        return None


class AppointmentTimeSlotMinimalSerializer(serializers.ModelSerializer):
    display_time = serializers.SerializerMethodField()

    class Meta:
        model = TimeSlot
        fields = ['id', 'date', 'start_time', 'end_time', 'display_time']

    def get_display_time(self, obj):
        return obj.start_time.strftime('%I:%M %p').lstrip('0')


class AppointmentPatientSerializer(serializers.ModelSerializer):
    is_cancellable = serializers.BooleanField(read_only=True)
    is_reschedulable = serializers.BooleanField(read_only=True)
    has_review = serializers.SerializerMethodField()
    doctor = AppointmentDoctorMinimalSerializer(read_only=True)
    time_slot = AppointmentTimeSlotMinimalSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'status', 'appointment_date', 'start_time', 'end_time',
            'reason', 'patient_notes', 'cancellation_reason', 'cancelled_at',
            'is_cancellable', 'is_reschedulable', 'has_review',
            'created_at', 'updated_at', 'rescheduled_from',
            'doctor', 'time_slot'
        ]

    def get_has_review(self, obj):
        return hasattr(obj, 'review')


class AppointmentDoctorSerializer(serializers.ModelSerializer):
    patient = AppointmentPatientMinimalSerializer(read_only=True)
    time_slot = AppointmentTimeSlotMinimalSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'status', 'appointment_date', 'start_time', 'end_time',
            'reason', 'patient_notes', 'notes',
            'cancellation_reason', 'cancelled_at',
            'created_at', 'patient', 'time_slot'
        ]


class BookAppointmentSerializer(serializers.Serializer):
    doctor_id = serializers.CharField()
    slot_id = serializers.UUIDField()
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)
    patient_notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate_doctor_id(self, value):
        if not DoctorProfile.objects.filter(id=value, is_available=True, user__is_active=True).exists():
            # Check if value is actually an int (some IDs are ints in this DB)
            try:
                if not DoctorProfile.objects.filter(id=int(value)).exists():
                    raise serializers.ValidationError("Doctor not found or not available")
            except:
                raise serializers.ValidationError("Doctor not found or not available")
        return value

    def validate_slot_id(self, value):
        if not TimeSlot.objects.filter(id=value, status='available').exists():
            raise serializers.ValidationError("Slot not found or not available")
        return value


class CancelAppointmentSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class RescheduleAppointmentSerializer(serializers.Serializer):
    new_slot_id = serializers.UUIDField()

    def validate_new_slot_id(self, value):
        if not TimeSlot.objects.filter(id=value, status='available').exists():
            raise serializers.ValidationError("New slot not found or not available")
        return value


class CompleteAppointmentSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class AppointmentReviewSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = AppointmentReview
        fields = ['id', 'rating', 'comment', 'is_anonymous', 'patient_name', 'created_at']
        read_only_fields = ['id', 'patient_name', 'created_at']

    def get_patient_name(self, obj):
        if obj.is_anonymous:
            return "Anonymous"
        return obj.patient.full_name

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
