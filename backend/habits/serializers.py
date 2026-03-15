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

    class Meta:
        model = Habit
        fields = ['id', 'name', 'description', 'frequency', 'start_date', 'end_date', 'is_active', 'created_at', 'checkins']
        read_only_fields = ['created_at']