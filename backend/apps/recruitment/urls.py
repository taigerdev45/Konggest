from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .models import JobPostingViewSet, ApplicationViewSet, InterviewViewSet

router = DefaultRouter()
router.register('jobs', JobPostingViewSet, basename='job-postings')
router.register('applications', ApplicationViewSet, basename='applications')
router.register('interviews', InterviewViewSet, basename='interviews')

urlpatterns = [path('', include(router.urls))]
