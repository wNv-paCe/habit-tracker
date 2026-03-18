from rest_framework import serializers
from .models import Habit, CheckIn

# CheckIn JSON pass to Frontend
class CheckInSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckIn
        fields = ['id', 'habit', 'checked_at', 'note', 'mood', 'is_cancelled', 'created_at']
        read_only_fields = ['created_at']


# Habit JSON pass to Frontend
class HabitSerializer(serializers.ModelSerializer):
    checkins = CheckInSerializer(many=True, read_only=True)
    last_checkin = serializers.SerializerMethodField()

    class Meta:
        model = Habit
        fields = ['id', 'name', 'description', 'frequency', 'start_date', 'end_date', 'is_active', 'created_at', 'checkins', 'last_checkin']
        read_only_fields = ['created_at']
    
    def get_last_checkin(self, obj):
        # Get the most recent non-cancelled CheckIn
        checkin = CheckIn.objects.filter(
            habit=obj,
            is_cancelled=False
        ).order_by('-checked_at').first()
        return checkin.checked_at if checkin else None