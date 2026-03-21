"""Konggest — URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({'status': 'ok', 'service': 'konggest-backend'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/employees/', include('apps.employees.urls')),
    path('api/departments/', include('apps.employees.urls_departments')),
    path('api/leaves/', include('apps.leaves.urls')),
    path('api/payroll/', include('apps.payroll.urls')),
    path('api/documents/', include('apps.documents.urls')),
    path('api/time-tracking/', include('apps.time_tracking.urls')),
    path('api/recruitment/', include('apps.recruitment.urls')),
    path('api/performance/', include('apps.performance.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
]
