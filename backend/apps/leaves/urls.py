from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LeaveTypeViewSet, LeaveRequestViewSet, LeaveBalanceViewSet

router = DefaultRouter()
router.register('types', LeaveTypeViewSet, basename='leave-types')
router.register('requests', LeaveRequestViewSet, basename='leave-requests')
router.register('balances', LeaveBalanceViewSet, basename='leave-balances')

urlpatterns = [path('', include(router.urls))]
