from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import HabitViewSet, CheckInViewSet, register

router = DefaultRouter()
router.register(r'habits', HabitViewSet, basename='habit')
router.register(r'checkins', CheckInViewSet, basename='checkin')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', register, name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]