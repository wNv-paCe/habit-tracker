from django.db import models
from django.contrib.auth.models import User

# Habit table
class Habit(models.Model):
    FREQUENCY_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='habits')
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, default='DAILY')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.name}"


# CheckIn table
class CheckIn(models.Model):
    MOOD_CHOICES = [
        ('GREAT', 'Great'),
        ('GOOD', 'Good'),
        ('NEUTRAL', 'Neutral'),
        ('BAD', 'Bad'),
    ]

    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name='checkins')
    checked_at = models.DateTimeField()
    note = models.TextField(null=True, blank=True)
    mood = models.CharField(max_length=10, choices=MOOD_CHOICES, null=True, blank=True)
    is_cancelled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.habit.name} - {self.checked_at.date()}"
