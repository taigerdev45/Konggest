"""Konggest — Documents Models"""
from django.db import models
from apps.accounts.models import Organization
from apps.employees.models import Employee


class DocumentCategory(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='doc_categories')
    name = models.CharField(max_length=100)
    class Meta:
        verbose_name = "Catégorie Document"
    def __str__(self):
        return self.name


class Document(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='documents')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    category = models.ForeignKey(DocumentCategory, on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=200, verbose_name="Titre")
    description = models.TextField(blank=True)
    file_url = models.URLField(verbose_name="Fichier (Supabase Storage)")
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True)
    is_confidential = models.BooleanField(default=False)
    uploaded_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)
    expires_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Document"
        ordering = ['-created_at']

    def __str__(self):
        return self.title
