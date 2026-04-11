from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.utils import log_action
from core.cache import cache_response
from .models import ShiftTemplate, Schedule
from .serializers import ShiftTemplateSerializer, ScheduleSerializer, BulkScheduleSerializer
from .tasks import generate_monthly_schedule_pdf
from apps.time_tracking.views import _broadcast_realtime_async
from django.db.models import Q
import threading

class ShiftTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftTemplateSerializer

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try: tenant_id = self.request.user.profile.organization_id
            except: return ShiftTemplate.objects.none()
        return ShiftTemplate.objects.filter(organization_id=tenant_id)

    def perform_create(self, serializer):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try: tenant_id = self.request.user.profile.organization_id
            except: pass
        if not tenant_id:
            raise serializers.ValidationError({"error": "Organisation non identifiée."})
        serializer.save(organization_id=tenant_id)

class ScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleSerializer

    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try: tenant_id = self.request.user.profile.organization_id
            except: return Schedule.objects.none()
            
        qs = Schedule.objects.filter(organization_id=tenant_id)
        
        # Access control based on role
        if getattr(self.request.user, 'role', '') == 'employee':
            if hasattr(self.request.user, 'profile'):
                qs = qs.filter(employee=self.request.user.profile)
                
        # Time filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            qs = qs.filter(date__range=[start_date, end_date])
            
        return qs

    def perform_create(self, serializer):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            try: tenant_id = self.request.user.profile.organization_id
            except: pass
        if not tenant_id:
            raise serializers.ValidationError({"error": "Organisation non identifiée."})
        
        schedule = serializer.save(organization_id=tenant_id)
        if schedule.status == 'published':
            self._broadcast_planning(tenant_id, schedule)

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        schedule = serializer.save()
        if schedule.status == 'published' and old_status != 'published':
            self._broadcast_planning(schedule.organization_id, schedule)

    def _broadcast_planning(self, tenant_id, schedule):
        try:
            payload = {
                "id": schedule.id,
                "date": str(schedule.date),
                "employee": f"{schedule.employee.first_name} {schedule.employee.last_name}",
                "start": str(schedule.start_time),
                "end": str(schedule.end_time)
            }
            threading.Thread(
                target=_broadcast_realtime_async,
                args=(f"planning:{tenant_id}", "schedule.published", payload)
            ).start()
        except:
            pass

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        tenant_id = getattr(request, 'tenant_id', None)
        if not tenant_id:
            try: tenant_id = request.user.profile.organization_id
            except: return Response({"error": "Organisation introuvable"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = BulkScheduleSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            schedules_to_create = []
            
            for emp_id in data['employee_ids']:
                schedules_to_create.append(
                    Schedule(
                        organization_id=tenant_id,
                        employee_id=emp_id,
                        date=data['date'],
                        start_time=data['start_time'],
                        end_time=data['end_time'],
                        status=data['status']
                    )
                )
            
            created = Schedule.objects.bulk_create(schedules_to_create)
            
            # Broadcast if published
            if data['status'] == 'published':
                for sched in created:
                    self._broadcast_planning(tenant_id, sched)
                    
            log_action(request.user, tenant_id, "CREATE", f"{len(created)} plannings créés en masse.")
            return Response({"message": f"{len(created)} plannings créés avec succès."})
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='export-pdf')
    def export_pdf(self, request):
        tenant_id = getattr(request, 'tenant_id', None)
        if not tenant_id:
            try: tenant_id = request.user.profile.organization_id
            except: return Response({"error": "Organisation introuvable"}, status=status.HTTP_400_BAD_REQUEST)

        month = request.query_params.get('month') # expected format YYYY-MM
        if not month:
            return Response({"error": "Paramètre 'month' requis (YYYY-MM)"}, status=status.HTTP_400_BAD_REQUEST)

        # Triggers the async celery task
        generate_monthly_schedule_pdf.delay(tenant_id, month, request.user.email)
        
        log_action(request.user, tenant_id, "EXPORT", f"Demande d'export du planning {month} (PDF).")
        return Response({
            "message": "La génération du PDF a démarré. Vous recevrez un email ou une notification une fois terminé."
        })
