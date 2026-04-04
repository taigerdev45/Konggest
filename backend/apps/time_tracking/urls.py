from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TimeEntryViewSet, OvertimeViewSet

router = DefaultRouter()
router.register('entries', TimeEntryViewSet, basename='time-entries')
router.register('overtime', OvertimeViewSet, basename='overtime')

urlpatterns = [path('', include(router.urls))]
