from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PayrollPeriodViewSet, PayslipViewSet

router = DefaultRouter()
router.register('periods', PayrollPeriodViewSet, basename='payroll-periods')
router.register('payslips', PayslipViewSet, basename='payslips')

urlpatterns = [path('', include(router.urls))]
