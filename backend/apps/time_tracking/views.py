"""Konggest — Time Tracking Views"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import date, datetime, timedelta
from .models import TimeEntry, OvertimeRequest
from .serializers import TimeEntrySerializer, OvertimeSerializer
from core.permissions import IsEmployee, IsManager


class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    permission_classes = [IsEmployee]
    filterset_fields = ['employee', 'date', 'is_remote']
    
    def get_queryset(self):
        """Get time entries filtered by tenant and user role."""
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = TimeEntry.objects.select_related('employee')
        
        if tenant_id:
            qs = qs.filter(employee__organization_id=tenant_id)
        
        # Filter by employee if user is not a manager/admin/hr
        user = self.request.user
        if hasattr(user, 'profile'):
            user_role = getattr(user.profile, 'role', None)
            # Only filter if regular employee
            if user_role == 'employee':
                try:
                    employee = user.profile.employee
                    qs = qs.filter(employee=employee)
                except AttributeError:
                    # No employee linked, return empty
                    return TimeEntry.objects.none()
        
        return qs

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's time entry for current employee."""
        # Get employee from user profile
        employee = self._get_employee_from_request(request)
        if not employee:
            return Response({'error': 'Profil employé non trouvé'}, status=400)
        
        today = date.today()
        entry = TimeEntry.objects.filter(employee=employee, date=today).first()
        
        if not entry:
            return Response({'checked_in': False, 'message': 'Pas encore pointé aujourd\'hui'})
        
        serializer = self.get_serializer(entry)
        data = serializer.data
        data['checked_in'] = True
        data['checked_out'] = bool(entry.check_out)
        return Response(data)

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """Toggle check-in/check-out for today."""
        employee = self._get_employee_from_request(request)
        if not employee:
            return Response({'error': 'Profil employé non trouvé'}, status=400)
        
        today = date.today()
        now = timezone.now().time()
        
        # Try to get or create today's entry
        try:
            entry = TimeEntry.objects.get(employee=employee, date=today)
            # Entry exists - handle clock out
            if entry.check_out:
                return Response({
                    'error': 'Déjà pointé pour aujourd\'hui.',
                    'check_in': entry.check_in.strftime('%H:%M'),
                    'check_out': entry.check_out.strftime('%H:%M')
                }, status=400)
            elif not entry.check_in:
                # Entry exists but no check_in (shouldn't happen but handle it)
                entry.check_in = now
                entry.save()
                return Response({
                    'message': 'Arrivée enregistrée',
                    'check_in': entry.check_in.strftime('%H:%M'),
                    'entry_id': entry.id
                })
            else:
                # Clock out
                entry.check_out = now
                entry.save()
                worked = entry.worked_hours
                return Response({
                    'message': 'Départ enregistré',
                    'check_in': entry.check_in.strftime('%H:%M'),
                    'check_out': entry.check_out.strftime('%H:%M'),
                    'worked_hours': worked,
                    'entry_id': entry.id
                })
        except TimeEntry.DoesNotExist:
            # No entry for today - create with check_in
            entry = TimeEntry.objects.create(
                employee=employee,
                date=today,
                check_in=now,
                break_minutes=60  # Default 60 minutes break
            )
            return Response({
                'message': 'Arrivée enregistrée',
                'check_in': entry.check_in.strftime('%H:%M'),
                'entry_id': entry.id
            })

    def _get_employee_from_request(self, request):
        """Helper to get employee from user profile."""
        if hasattr(request.user, 'profile'):
            try:
                return request.user.profile.employee
            except AttributeError:
                pass
        return None

    def perform_create(self, serializer):
        """Create entry with employee auto-assigned from user profile."""
        employee = self._get_employee_from_request(self.request)
        if employee:
            serializer.save(employee=employee)
        else:
            serializer.save()


class OvertimeViewSet(viewsets.ModelViewSet):
    serializer_class = OvertimeSerializer
    permission_classes = [IsEmployee]
    filterset_fields = ['employee', 'status']
    
    def get_queryset(self):
        """Get overtime requests filtered by tenant and user."""
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = OvertimeRequest.objects.select_related('employee')
        
        if tenant_id:
            qs = qs.filter(employee__organization_id=tenant_id)
        
        # Filter by employee if regular employee
        user = self.request.user
        if hasattr(user, 'profile'):
            user_role = getattr(user.profile, 'role', None)
            if user_role == 'employee':
                try:
                    employee = user.profile.employee
                    qs = qs.filter(employee=employee)
                except AttributeError:
                    return OvertimeRequest.objects.none()
        
        return qs
    
    def perform_create(self, serializer):
        """Create overtime request with employee auto-assigned."""
        user = self.request.user
        if hasattr(user, 'profile'):
            try:
                employee = user.profile.employee
                serializer.save(employee=employee, status='pending')
                return
            except AttributeError:
                pass
        serializer.save(status='pending')
    
    @action(detail=True, methods=['post'], permission_classes=[IsManager])
    def approve(self, request, pk=None):
        """Approve an overtime request."""
        overtime = self.get_object()
        overtime.status = 'approved'
        overtime.save()
        return Response({'message': 'Demande approuvée', 'status': 'approved'})
    
    @action(detail=True, methods=['post'], permission_classes=[IsManager])
    def reject(self, request, pk=None):
        """Reject an overtime request."""
        overtime = self.get_object()
        overtime.status = 'rejected'
        overtime.save()
        return Response({'message': 'Demande refusée', 'status': 'rejected'})
