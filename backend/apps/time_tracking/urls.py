"""
Konggest — Time Tracking URLs
Version complète (2026-04-11)

Routes disponibles :
  /api/time-tracking/entries/             → TimeEntryViewSet (list, create, retrieve, update, destroy)
  /api/time-tracking/entries/today/       → TimeEntryViewSet.today
  /api/time-tracking/entries/toggle/      → TimeEntryViewSet.toggle (AT9 — unifié IN/OUT)
  /api/time-tracking/entries/generate_qr/ → TimeEntryViewSet.generate_qr (AT3)
  /api/time-tracking/entries/scan/        → TimeEntryViewSet.scan (AT4)
  /api/time-tracking/entries/stats/       → TimeEntryViewSet.stats (AT10)
  /api/time-tracking/entries/anomalies/   → TimeEntryViewSet.anomalies (AT14)
  /api/time-tracking/overtime/            → OvertimeViewSet
  /api/time-tracking/overtime/{id}/approve/ → OvertimeViewSet.approve
  /api/time-tracking/overtime/{id}/reject/  → OvertimeViewSet.reject
  /api/time-tracking/qr-sessions/        → QRSessionViewSet (lecture seule историја)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import TimeEntryViewSet, OvertimeViewSet, QRSessionViewSet

router = DefaultRouter()
router.register('entries', TimeEntryViewSet, basename='time-entries')
router.register('overtime', OvertimeViewSet, basename='overtime')
router.register('qr-sessions', QRSessionViewSet, basename='qr-sessions')

urlpatterns = [path('', include(router.urls))]
