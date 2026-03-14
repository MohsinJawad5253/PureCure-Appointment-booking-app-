from django.contrib import admin
from .models import Appointment, AppointmentReview


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        'id_short', 'patient_name', 'doctor_name',
        'appointment_date', 'start_time', 'status', 'created_at'
    ]
    list_filter = ['status', 'appointment_date']
    search_fields = [
        'patient__first_name', 'patient__last_name',
        'doctor__user__first_name', 'doctor__user__last_name',
    ]
    date_hierarchy = 'appointment_date'
    readonly_fields = ['created_at', 'updated_at', 'cancelled_at']
    ordering = ['appointment_date', 'start_time']

    def id_short(self, obj):
        return str(obj.id)[:8] + '...'
    id_short.short_description = 'ID'

    def patient_name(self, obj):
        return obj.patient.full_name
    patient_name.short_description = 'Patient'

    def doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.full_name}"
    doctor_name.short_description = 'Doctor'


@admin.register(AppointmentReview)
class AppointmentReviewAdmin(admin.ModelAdmin):
    list_display = ['patient_name', 'doctor_name', 'rating', 'is_anonymous', 'created_at']
    list_filter = ['rating', 'is_anonymous']
    search_fields = ['patient__first_name', 'doctor__user__last_name']

    def patient_name(self, obj):
        return obj.patient.full_name

    def doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.full_name}"
