from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .models import NotificationViewSet

router = DefaultRouter()
router.register('', NotificationViewSet, basename='notifications')

urlpatterns = [path('', include(router.urls))]
