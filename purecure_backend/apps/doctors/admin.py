from django.contrib import admin
from apps.users.models import DoctorProfile

@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ['get_full_name', 'specialty', 'clinic_name', 'rating', 'review_count', 'consultation_fee', 'is_available']
    list_filter = ['specialty', 'is_available', 'clinic']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'license_number']
    list_editable = ['is_available', 'consultation_fee']
    ordering = ['-rating']

    def get_full_name(self, obj):
        return f"Dr. {obj.user.get_full_name()}"
    get_full_name.short_description = 'Doctor Name'
