"""Konggest — URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.views.generic import RedirectView

def health_check(request):
    return JsonResponse({'status': 'ok', 'service': 'konggest-backend'})


urlpatterns = [
    path('favicon.ico', RedirectView.as_view(url='/static/favicon.ico', permanent=True)),
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/employees/', include('apps.employees.urls')),
    path('api/departments/', include('apps.employees.urls_departments')),
    path('api/leaves/', include('apps.leaves.urls')),
    path('api/payroll/', include('apps.payroll.urls')),
    path('api/documents/', include('apps.documents.urls')),
    path('api/time-tracking/', include('apps.time_tracking.urls')),
    path('api/recruitment/', include('apps.recruitment.urls')),
    path('api/planning/', include('apps.planning.urls')),
    path('api/performance/', include('apps.performance.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/expenses/', include('apps.expenses.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
]
