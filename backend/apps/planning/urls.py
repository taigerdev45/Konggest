from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShiftTemplateViewSet, ScheduleViewSet

router = DefaultRouter()
router.register('templates', ShiftTemplateViewSet, basename='shift-templates')
router.register('schedules', ScheduleViewSet, basename='schedules')

urlpatterns = [
    path('', include(router.urls)),
]
