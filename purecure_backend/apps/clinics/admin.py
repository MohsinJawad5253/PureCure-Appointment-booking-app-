from django.contrib import admin
from .models import Clinic

@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'rating', 'review_count', 'distance_km', 'is_active']
    list_filter = ['city', 'is_active']
    search_fields = ['name', 'city', 'address']
    list_editable = ['is_active', 'rating']
