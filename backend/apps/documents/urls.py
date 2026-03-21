from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, DocumentCategoryViewSet

router = DefaultRouter()
router.register('categories', DocumentCategoryViewSet, basename='doc-categories')
router.register('', DocumentViewSet, basename='documents')

urlpatterns = [path('', include(router.urls))]
