from django.contrib import admin
from .models import DoctorSchedule, TimeSlot, BlockedDate


@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'get_weekday_display', 'start_time', 'end_time', 'slot_duration_minutes', 'is_active']
    list_filter = ['weekday', 'is_active', 'slot_duration_minutes']
    list_editable = ['is_active']
    search_fields = ['doctor__user__first_name', 'doctor__user__last_name']


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'date', 'start_time', 'end_time', 'status', 'slot_duration_minutes']
    list_filter = ['status', 'date', 'slot_duration_minutes']
    list_editable = ['status']
    search_fields = ['doctor__user__first_name', 'doctor__user__last_name']
    date_hierarchy = 'date'
    ordering = ['date', 'start_time']


@admin.register(BlockedDate)
class BlockedDateAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'date', 'reason', 'block_entire_day']
    list_filter = ['block_entire_day', 'date']
    search_fields = ['doctor__user__first_name', 'doctor__user__last_name', 'reason']
