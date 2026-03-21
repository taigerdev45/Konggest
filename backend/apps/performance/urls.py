from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .models import PerformanceReviewViewSet, ObjectiveViewSet

router = DefaultRouter()
router.register('reviews', PerformanceReviewViewSet, basename='reviews')
router.register('objectives', ObjectiveViewSet, basename='objectives')

urlpatterns = [path('', include(router.urls))]
