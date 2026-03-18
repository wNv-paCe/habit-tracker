from django.contrib import admin
from .models import Habit, CheckIn

@admin.register(Habit)
class HabitAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'frequency', 'start_date', 'end_date', 'is_active', 'created_at')

@admin.register(CheckIn)
class CheckInAdmin(admin.ModelAdmin):
    list_display = ('id', 'habit', 'checked_at', 'is_cancelled', 'created_at')
    list_filter = ('is_cancelled', 'checked_at', 'habit')
