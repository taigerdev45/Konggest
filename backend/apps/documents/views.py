"""Konggest — Documents Views"""
from rest_framework import viewsets, serializers
from core.permissions import IsManager
from .models import Document, DocumentCategory


def _resolve_tenant_id(request):
    tenant_id = getattr(request, 'tenant_id', None)
    if not tenant_id:
        try:
            tenant_id = request.user.profile.organization_id
        except Exception:
            pass
    return tenant_id


class DocumentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentCategory
        fields = ['id', 'name']

class DocumentSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    employee_name = serializers.SerializerMethodField()
    class Meta:
        model = Document
        fields = ['id', 'employee', 'employee_name', 'category', 'category_name', 'title',
                  'description', 'file_url', 'file_name', 'file_size', 'mime_type',
                  'is_confidential', 'expires_at', 'created_at']
        read_only_fields = ['id', 'created_at']
    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else None

class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsManager]
    filterset_fields = ['category', 'employee', 'is_confidential']
    search_fields = ['title', 'description']
    def get_queryset(self):
        tenant_id = _resolve_tenant_id(self.request)
        qs = Document.objects.select_related('category', 'employee')
        return qs.filter(organization_id=tenant_id) if tenant_id else qs
    def perform_create(self, serializer):
        tenant_id = _resolve_tenant_id(self.request)
        if not tenant_id:
            raise serializers.ValidationError({'error': 'Organisation non identifiée.'})
        serializer.save(organization_id=tenant_id, uploaded_by=self.request.user)

class DocumentCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentCategorySerializer
    permission_classes = [IsManager]
    def get_queryset(self):
        tenant_id = _resolve_tenant_id(self.request)
        qs = DocumentCategory.objects.all()
        return qs.filter(organization_id=tenant_id) if tenant_id else qs
    def perform_create(self, serializer):
        tenant_id = _resolve_tenant_id(self.request)
        if not tenant_id:
            raise serializers.ValidationError({'error': 'Organisation non identifiée.'})
        serializer.save(organization_id=tenant_id)
