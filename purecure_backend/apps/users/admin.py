from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, DoctorProfile

class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'full_name', 'role', 'is_active', 'created_at')
    search_fields = ('email', 'first_name', 'last_name')
    list_filter = ('role', 'is_active', 'gender')
    ordering = ('-created_at',)
    
admin.site.register(User, CustomUserAdmin)
