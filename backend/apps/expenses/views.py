import tempfile
import os
import csv
from django.utils import timezone
from django.db.models import Sum, Count
from django.conf import settings
from django.http import StreamingHttpResponse

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.employees.models import Employee
from core.permissions import IsManager, IsEmployee, IsSameTenant
from core.pagination import StandardPagination
from core.cache import cache_response
from apps.expenses.models import Expense, ExpenseCategory
from apps.expenses.serializers import ExpenseSerializer, ExpenseCategorySerializer
from apps.expenses.tasks import compress_and_upload_expense_attachment

# Helper pour broadcast asynchrone déjà présent (généralement importable depuis core ou time_tracking). On simule la fonction utilitaire.
import asyncio

def _broadcast_realtime_async(tenant_id, event, payload):
    supabase_url = getattr(settings, 'SUPABASE_URL', '')
    key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '')
    if not (supabase_url and key):
        return
    import requests
    import threading
    url = f"{supabase_url}/realtime/v1/api/broadcast"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    data = {
        "messages": [{
            "topic": "konggest_public_expenses",
            "event": event,
            "payload": payload
        }]
    }
    threading.Thread(target=lambda: requests.post(url, headers=headers, json=data)).start()

class Echo:
    """An object that implements just the write method of the file-like interface."""
    def write(self, value):
        return value

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsSameTenant]
    pagination_class = None # Standard cache global

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(user=user).first()
        if not employee:
            return ExpenseCategory.objects.none()
        return ExpenseCategory.objects.filter(organization=employee.organization)

    def perform_create(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(user=user).first()
        serializer.save(organization=employee.organization)

class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameTenant]
    pagination_class = StandardPagination

    def get_queryset(self):
        user = self.request.user
        employee = Employee.objects.filter(user=user).first()
        if not employee:
            return Expense.objects.none()
            
        qs = Expense.objects.filter(organization=employee.organization).select_related('employee__user', 'category')
        
        # Filtre sur employé ou tout tenant si admin/manager
        if not (user.profile.role in ['manager', 'hr', 'admin']):
            qs = qs.filter(employee=employee)
            
        # Filtres API natifs
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
            
        return qs.order_by('-date')

    def create(self, request, *args, **kwargs):
        # Surcharge create pour checker fichiers uploadés (multipart)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()
        
        # Gére le fichier en asynchrone (Celery + Pillow) E3
        attachment_file = request.FILES.get('attachment')
        if attachment_file:
            fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(attachment_file.name)[1])
            with os.fdopen(fd, 'wb') as f:
                for chunk in attachment_file.chunks():
                    f.write(chunk)
            
            # Send to Celery worker (non blocking)
            compress_and_upload_expense_attachment.delay(
                expense.id, temp_path, attachment_file.name, attachment_file.content_type
            )

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManager])
    def approve(self, request, pk=None):
        expense = self.get_object()
        if expense.status != 'pending':
            return Response({"error": "Dépense déjà traitée"}, status=status.HTTP_400_BAD_REQUEST)
            
        expense.status = 'approved'
        expense.save()
        
        _broadcast_realtime_async(str(expense.organization.id), 'expense.approved', {
            'expense_id': expense.id,
            'employee_id': expense.employee.id,
            'amount': str(expense.amount)
        })
        return Response({"status": "Dépense approuvée"})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManager])
    def reject(self, request, pk=None):
        expense = self.get_object()
        if expense.status != 'pending':
            return Response({"error": "Dépense déjà traitée"}, status=status.HTTP_400_BAD_REQUEST)
            
        expense.status = 'rejected'
        expense.save()
        
        _broadcast_realtime_async(str(expense.organization.id), 'expense.rejected', {
            'expense_id': expense.id,
            'employee_id': expense.employee.id,
            'amount': str(expense.amount)
        })
        return Response({"status": "Dépense refusée"})
        
    @action(detail=True, methods=['get'])
    def presigned_url(self, request, pk=None):
        """E2: Génère une URL temporaire signée si le dev utilise private buckets."""
        expense = self.get_object()
        if not expense.attachment_url:
            return Response({"error": "Pas d'attachement"}, status=404)
            
        try:
            from apps.expenses.tasks import get_supabase_client
            supabase = get_supabase_client()
            res = supabase.storage.from_("expenses").create_signed_url(expense.attachment_url, 3600)
            return Response({"url": res['signedURL']})
        except Exception as e:
            # Fallback en bucket pseudo-public ou url stockée tel quel
            return Response({"url": expense.attachment_url})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self.get_queryset()
        
        # Stats E5 
        total_pending = qs.filter(status='pending').aggregate(Sum('amount'))['amount__sum'] or 0
        total_approved = qs.filter(status='approved').aggregate(Sum('amount'))['amount__sum'] or 0
        
        return Response({
            "pending_amount": total_pending,
            "approved_amount": total_approved,
            "total_requests": qs.count()
        })

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        qs = self.get_queryset()
        
        def iter_items():
            yield ['ID', 'Employé', 'Catégorie', 'Montant', 'Motif', 'Date', 'Statut']
            for item in qs.iterator():
                yield [
                    str(item.id),
                    item.employee.user.get_full_name(),
                    item.category.name if item.category else 'N/A',
                    str(item.amount),
                    item.reason,
                    str(item.date),
                    item.status
                ]
                
        writer = csv.writer(Echo())
        response = StreamingHttpResponse(
            (writer.writerow(row) for row in iter_items()),
            content_type="text/csv"
        )
        response['Content-Disposition'] = f'attachment; filename="expenses_export_{timezone.now().date()}.csv"'
        return response
