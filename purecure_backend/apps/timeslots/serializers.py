from rest_framework import serializers
from .models import DoctorSchedule, TimeSlot, BlockedDate


class TimeSlotSerializer(serializers.ModelSerializer):
    is_available = serializers.BooleanField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    display_time = serializers.SerializerMethodField()

    class Meta:
        model = TimeSlot
        fields = [
            'id', 'date', 'start_time', 'end_time',
            'status', 'slot_duration_minutes',
            'is_available', 'is_past', 'display_time',
        ]

    def get_display_time(self, obj):
        # Returns "09:00 AM" format for UI display
        return obj.start_time.strftime('%I:%M %p').lstrip('0')


class DoctorScheduleSerializer(serializers.ModelSerializer):
    weekday_display = serializers.CharField(
        source='get_weekday_display', read_only=True
    )

    class Meta:
        model = DoctorSchedule
        fields = [
            'id', 'weekday', 'weekday_display',
            'start_time', 'end_time',
            'slot_duration_minutes', 'is_active',
        ]


class DoctorScheduleWriteSerializer(serializers.ModelSerializer):
    """Used by doctor to set/update their own schedule."""

    class Meta:
        model = DoctorSchedule
        fields = [
            'weekday', 'start_time', 'end_time',
            'slot_duration_minutes', 'is_active',
        ]

    def validate(self, data):
        if data.get('start_time') and data.get('end_time'):
            if data['start_time'] >= data['end_time']:
                raise serializers.ValidationError(
                    "start_time must be before end_time."
                )
        return data


class BlockedDateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockedDate
        fields = [
            'id', 'date', 'reason',
            'block_entire_day', 'block_start_time', 'block_end_time',
        ]

    def validate(self, data):
        if not data.get('block_entire_day'):
            if not data.get('block_start_time') or not data.get('block_end_time'):
                raise serializers.ValidationError(
                    "block_start_time and block_end_time are required for partial blocks."
                )
            if data['block_start_time'] >= data['block_end_time']:
                raise serializers.ValidationError(
                    "block_start_time must be before block_end_time."
                )
        return data


class WeekAvailabilitySerializer(serializers.Serializer):
    """Read-only. Represents one day in the week picker."""
    date = serializers.DateField()
    weekday = serializers.CharField()
    day_number = serializers.IntegerField()
    available_count = serializers.IntegerField()
    has_slots = serializers.BooleanField()
