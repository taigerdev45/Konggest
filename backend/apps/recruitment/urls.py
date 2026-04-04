from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .models import (
    JobPostingViewSet, ApplicationViewSet, InterviewViewSet,
    public_job_list, public_job_detail, public_apply
)

router = DefaultRouter()
router.register('jobs', JobPostingViewSet, basename='job-postings')
router.register('applications', ApplicationViewSet, basename='applications')
router.register('interviews', InterviewViewSet, basename='interviews')

urlpatterns = [
    path('', include(router.urls)),
    # Public endpoints (no authentication required)
    path('public/jobs/', public_job_list, name='public-job-list'),
    path('public/jobs/<int:pk>/', public_job_detail, name='public-job-detail'),
    path('public/jobs/<int:job_id>/apply/', public_apply, name='public-apply'),
]
