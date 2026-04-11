"""
Konggest — Employees URLs
Version corrigée (2026-04-11)

FIX T10 : DepartmentViewSet intégré ici directement
afin d'éviter urls_departments.py superflu.

Routes disponibles :
  /api/employees/                → EmployeeViewSet (list, create)
  /api/employees/{id}/           → EmployeeViewSet (retrieve, update, destroy)
  /api/employees/me/             → EmployeeViewSet.me
  /api/employees/stats/          → EmployeeViewSet.stats
  /api/employees/export_csv/     → EmployeeViewSet.export_csv
  /api/employees/import_csv/     → EmployeeViewSet.import_csv
  /api/employees/positions/      → PositionViewSet
  /api/employees/locations/      → LocationViewSet
  /api/employees/archives/       → ArchiveViewSet
  /api/departments/              → DepartmentViewSet (maintenu via urls_departments.py existant)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EmployeeViewSet,
    PositionViewSet,
    LocationViewSet,
    ArchiveViewSet,
)

router = DefaultRouter()
router.register('positions', PositionViewSet, basename='positions')
router.register('locations', LocationViewSet, basename='locations')
router.register('archives', ArchiveViewSet, basename='archives')
router.register('', EmployeeViewSet, basename='employees')

urlpatterns = [
    path('', include(router.urls)),
]
