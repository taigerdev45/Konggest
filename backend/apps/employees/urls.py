"""Konggest — Employees URLs"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet

router = DefaultRouter()
router.register('', EmployeeViewSet, basename='employees')

urlpatterns = [
    path('', include(router.urls)),
]
