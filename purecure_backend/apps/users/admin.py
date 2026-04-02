from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, DoctorProfile, DoctorClinic

class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'full_name', 'role', 'is_active', 'created_at')
    search_fields = ('email', 'first_name', 'last_name')
    list_filter = ('role', 'is_active', 'gender')
    ordering = ('-created_at',)
    
admin.site.register(User, CustomUserAdmin)

class DoctorClinicInline(admin.TabularInline):
    model = DoctorClinic
    extra = 1
    max_num = 4
    fields = ['clinic', 'is_primary', 'consultation_fee', 'is_active']

@admin.register(DoctorClinic)
class DoctorClinicAdmin(admin.ModelAdmin):
    list_display = ['doctor_name', 'clinic_name', 'is_primary', 'consultation_fee', 'is_active']
    list_filter = ['is_primary', 'is_active', 'clinic']
    list_editable = ['is_primary', 'is_active']
    search_fields = ['doctor__user__first_name', 'doctor__user__last_name', 'clinic__name']

    def doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.get_full_name()}"
    doctor_name.short_description = 'Doctor'

    def clinic_name(self, obj):
        return obj.clinic.name
    clinic_name.short_description = 'Clinic'

@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ['get_full_name', 'specialty', 'get_clinics', 'rating', 'is_available']
    inlines = [DoctorClinicInline]
    list_filter = ['specialty', 'is_available']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'license_number']

    def get_full_name(self, obj):
        return f"Dr. {obj.user.get_full_name()}"
    get_full_name.short_description = 'Doctor'

    def get_clinics(self, obj):
        clinics = obj.doctor_clinics.filter(is_active=True).values_list('clinic__name', flat=True)
        return ", ".join(clinics) or "—"
    get_clinics.short_description = 'Clinics'
