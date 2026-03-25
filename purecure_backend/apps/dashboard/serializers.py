from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from datetime import date
import uuid

from apps.users.models import User, DoctorProfile
from apps.appointments.models import Appointment, AppointmentReview
from apps.timeslots.models import TimeSlot, DoctorSchedule
from apps.clinics.models import Clinic
from apps.clinics.serializers import ClinicMinimalSerializer
from apps.appointments.serializers import AppointmentDoctorSerializer


# ─────────────────────────────────────────────
# 3a. AgendaAppointmentSerializer
# ─────────────────────────────────────────────

class AgendaPatientMinimalSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'full_name', 'profile_photo', 'phone', 'gender']

    def get_profile_photo(self, obj):
        request = self.context.get('request')
        if obj.profile_photo and request:
            return request.build_absolute_uri(obj.profile_photo.url)
        return None


class AgendaAppointmentSerializer(serializers.ModelSerializer):
    patient = AgendaPatientMinimalSerializer(read_only=True)
    display_time = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    is_emergency = serializers.SerializerMethodField()
    time_slot = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'start_time', 'end_time', 'display_time',
            'status', 'status_label', 'reason', 'notes', 'is_emergency',
            'time_slot'
        ]

    def get_display_time(self, obj):
        start = obj.start_time.strftime('%I:%M %p').lstrip('0')
        end = obj.end_time.strftime('%I:%M %p').lstrip('0')
        return f"{start} – {end}"

    def get_status_label(self, obj):
        labels = {
            'upcoming': 'Upcoming',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'cancelled_by_patient': 'Cancelled',
            'cancelled_by_doctor': 'Cancelled by You',
            'no_show': 'No Show',
            'rescheduled': 'Rescheduled',
        }
        return labels.get(obj.status, obj.status.replace('_', ' ').title())

    def get_is_emergency(self, obj):
        if not obj.reason:
            return False
        keywords = ['emergency', 'urgent', 'severe', 'chest pain', 'breathing', 'unconscious']
        reason_lower = obj.reason.lower()
        return any(kw in reason_lower for kw in keywords)

    def get_time_slot(self, obj):
        if hasattr(obj, 'time_slot'):
            return {
                'id': obj.time_slot.id,
                'date': obj.time_slot.date,
                'start_time': obj.time_slot.start_time,
                'end_time': obj.time_slot.end_time
            }
        return None


# ─────────────────────────────────────────────
# 3b. DailyAgendaSerializer
# ─────────────────────────────────────────────

class DailyAgendaSerializer(serializers.Serializer):
    date = serializers.DateField()
    weekday = serializers.CharField()
    summary = serializers.DictField()
    appointments = serializers.DictField()

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Serialize the appointment groups
        apps_data = instance.get('appointments', {})
        serialized_apps = {}
        for status, appts in apps_data.items():
            serialized_apps[status] = AgendaAppointmentSerializer(appts, many=True, context=self.context).data
        ret['appointments'] = serialized_apps
        return ret


# ─────────────────────────────────────────────
# 3c. PatientRecordSerializer
# ─────────────────────────────────────────────

class PatientRecordSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    age = serializers.SerializerMethodField()
    visit_count = serializers.IntegerField(read_only=True)
    last_visit = serializers.DateField(read_only=True)
    upcoming_count = serializers.IntegerField(read_only=True)
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'email', 'phone', 'gender',
            'date_of_birth', 'age', 'profile_photo',
            'visit_count', 'last_visit', 'upcoming_count'
        ]

    def get_profile_photo(self, obj):
        request = self.context.get('request')
        if obj.profile_photo and request:
            return request.build_absolute_uri(obj.profile_photo.url)
        return None

    def get_age(self, obj):
        if not obj.date_of_birth:
            return None
        today = date.today()
        dob = obj.date_of_birth
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


# ─────────────────────────────────────────────
# 3d. PatientHistorySerializer
# ─────────────────────────────────────────────

class PatientHistorySerializer(serializers.Serializer):
    patient = PatientRecordSerializer()
    stats = serializers.DictField()
    appointments = AppointmentDoctorSerializer(many=True)


# ─────────────────────────────────────────────
# 3e. DoctorProfileUpdateSerializer
# ─────────────────────────────────────────────

class DoctorProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)
    phone = serializers.CharField(required=False)
    bio = serializers.CharField(required=False, allow_blank=True)
    consultation_fee = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False)
    languages = serializers.JSONField(required=False)
    is_available = serializers.BooleanField(required=False)
    profile_photo = serializers.ImageField(required=False)
    clinic = serializers.PrimaryKeyRelatedField(queryset=Clinic.objects.all(), required=False)

    @transaction.atomic
    def update(self, instance, validated_data):
        user = instance.user
        
        # User fields
        user.first_name = validated_data.get('first_name', user.first_name)
        user.last_name = validated_data.get('last_name', user.last_name)
        user.phone = validated_data.get('phone', user.phone)
        user.save()

        # DoctorProfile fields
        instance.bio = validated_data.get('bio', instance.bio)
        instance.consultation_fee = validated_data.get('consultation_fee', instance.consultation_fee)
        instance.languages = validated_data.get('languages', instance.languages)
        instance.is_available = validated_data.get('is_available', instance.is_available)
        instance.profile_photo = validated_data.get('profile_photo', instance.profile_photo)
        instance.clinic = validated_data.get('clinic', instance.clinic)
        instance.save()

        return instance


# ─────────────────────────────────────────────
# 3f. DoctorPublicProfileSerializer
# ─────────────────────────────────────────────

class DoctorPublicProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    specialty_display = serializers.CharField(source='get_specialty_display', read_only=True)
    clinic = ClinicMinimalSerializer(read_only=True)
    schedule_summary = serializers.SerializerMethodField()
    recent_reviews = serializers.SerializerMethodField()
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'full_name', 'specialty', 'specialty_display', 'clinic',
            'years_experience', 'rating', 'review_count', 'consultation_fee',
            'bio', 'languages', 'is_available', 'profile_photo',
            'schedule_summary', 'recent_reviews'
        ]

    def get_profile_photo(self, obj):
        request = self.context.get('request')
        if obj.profile_photo and request:
            return request.build_absolute_uri(obj.profile_photo.url)
        return None

    def get_full_name(self, obj):
        return f"Dr. {obj.user.first_name} {obj.user.last_name}"

    def get_schedule_summary(self, obj):
        schedules = DoctorSchedule.objects.filter(doctor=obj, is_active=True)
        return [
            {
                "weekday": s.get_weekday_display(),
                "start_time": s.start_time.strftime('%H:%M'),
                "end_time": s.end_time.strftime('%H:%M')
            }
            for s in schedules
        ]

    def get_recent_reviews(self, obj):
        reviews = AppointmentReview.objects.filter(doctor=obj).order_by('-created_at')[:3]
        return [
            {
                "rating": r.rating,
                "comment": r.comment,
                "patient_name": "Anon" if r.is_anonymous else r.patient.first_name,
                "created_at": r.created_at
            }
            for r in reviews
        ]


# ─────────────────────────────────────────────
# 3g. NotificationSerializer
# ─────────────────────────────────────────────

class NotificationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    type = serializers.CharField()
    title = serializers.CharField()
    message = serializers.CharField()
    appointment_id = serializers.UUIDField(allow_null=True)
    is_read = serializers.BooleanField(default=False)
    created_at = serializers.DateTimeField()
