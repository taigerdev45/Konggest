"""Konggest — Analytics URLs"""
from django.urls import path
from .views import KPIDashboardView

urlpatterns = [
    path('kpis/', KPIDashboardView.as_view(), name='analytics-kpis'),
]
