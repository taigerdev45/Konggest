"""Konggest — Employees URLs"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, PositionViewSet, LocationViewSet

router = DefaultRouter()
router.register('positions', PositionViewSet, basename='positions')
router.register('locations', LocationViewSet, basename='locations')
router.register('', EmployeeViewSet, basename='employees')

urlpatterns = [
    path('', include(router.urls)),
]
