"""Konggest — Payroll Views"""
from rest_framework import viewsets, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from core.permissions import IsHRManager
from .models import PayrollPeriod, Payslip, PayrollItem
from apps.accounts.utils import log_action


class PayrollPeriodSerializer(serializers.ModelSerializer):
    payslip_count = serializers.SerializerMethodField()
    class Meta:
        model = PayrollPeriod
        fields = ['id', 'name', 'start_date', 'end_date', 'is_closed', 'payslip_count', 'created_at']
    def get_payslip_count(self, obj):
        return obj.payslips.count()


class PayrollItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollItem
        fields = ['id', 'name', 'item_type', 'amount', 'is_percentage']


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)
    items = PayrollItemSerializer(many=True, read_only=True)
    class Meta:
        model = Payslip
        fields = ['id', 'employee', 'employee_name', 'period', 'period_name',
                  'gross_salary', 'total_deductions', 'total_bonuses', 'net_salary',
                  'status', 'notes', 'items', 'created_at']


class PayrollPeriodViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollPeriodSerializer
    permission_classes = [IsHRManager]
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = PayrollPeriod.objects.all()
        return qs.filter(organization_id=tenant_id) if tenant_id else qs
    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.tenant_id)


class PayslipViewSet(viewsets.ModelViewSet):
    serializer_class = PayslipSerializer
    permission_classes = [IsHRManager]
    filterset_fields = ['period', 'status', 'employee']
    def get_queryset(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        qs = Payslip.objects.select_related('employee', 'period').prefetch_related('items')
        if tenant_id:
            qs = qs.filter(employee__organization_id=tenant_id)
        # Non-managers see only their own payslips
        if hasattr(self.request.user, 'profile') and self.request.user.profile.role == 'employee':
            qs = qs.filter(employee__user=self.request.user)
    @action(detail=False, methods=['post'])
    def generate_for_period(self, request):
        """Mass generate payslips for a specific period (Gabon 2026 Engine)."""
        period_id = request.data.get('period_id')
        if not period_id:
            return Response({'error': 'period_id is required'}, status=400)

        from apps.employees.models import Employee
        from .models import PayrollPeriod, Payslip, PayrollItem
        from core import hr_settings
        
        try:
            period = PayrollPeriod.objects.get(id=period_id, organization_id=self.request.tenant_id)
        except PayrollPeriod.DoesNotExist:
            return Response({'error': 'Period not found'}, status=404)

        active_employees = Employee.objects.filter(
            organization_id=self.request.tenant_id,
            status='active'
        )
        
        created_count = 0
        for emp in active_employees:
            # 1. Base Salary
            gross = float(emp.salary)
            
            # 2. CNSS (5% Employee)
            cnss_base = min(gross, hr_settings.CNSS_CEILING)
            cnss_amount = round(cnss_base * hr_settings.CNSS_EMPLOYEE_RATE, 2)
            
            # 3. CNAMGS (1% Employee)
            cnamgs_amount = round(gross * hr_settings.CNAMGS_EMPLOYEE_RATE, 2)
            
            # 4. TCS (5% > 150k)
            tcs_taxable = max(0, gross - hr_settings.TCS_EXEMPT_BASE)
            tcs_amount = round(tcs_taxable * hr_settings.TCS_RATE, 2)
            
            # 5. IRPP (Progressive)
            # Deduction of social charges and professional expenses
            taxable_for_irpp = (gross - cnss_amount - cnamgs_amount - tcs_amount) * (1 - hr_settings.PROFESSIONAL_EXPENSES_RATE)
            irpp_amount = hr_settings.calculate_irpp_monthly(taxable_for_irpp, float(emp.family_parts))
            
            total_deductions = cnss_amount + cnamgs_amount + tcs_amount + irpp_amount
            
            # --- 6. Sector Specifics (13th Month in December) ---
            total_bonuses = 0
            is_december = period.start_date.month == 12
            if is_december and emp.sector in ['petrole', 'bois']:
                total_bonuses = gross # 13th Month is usually 100% of base
            
            net_salary = gross + total_bonuses - total_deductions
            
            # Create/Update Payslip
            payslip, created = Payslip.objects.update_or_create(
                employee=emp,
                period=period,
                defaults={
                    'gross_salary': gross,
                    'total_deductions': total_deductions,
                    'total_bonuses': total_bonuses,
                    'net_salary': net_salary,
                    'status': 'draft'
                }
            )
            
            # Create Details (items)
            PayrollItem.objects.filter(payslip=payslip).delete()
            items = [
                PayrollItem(payslip=payslip, name='CNSS (5%)', item_type='deduction', amount=cnss_amount),
                PayrollItem(payslip=payslip, name='CNAMGS (1%)', item_type='deduction', amount=cnamgs_amount),
                PayrollItem(payslip=payslip, name='TCS (5%)', item_type='deduction', amount=tcs_amount),
                PayrollItem(payslip=payslip, name='IRPP', item_type='deduction', amount=irpp_amount),
            ]
            if total_bonuses > 0:
                items.append(PayrollItem(payslip=payslip, name='13ème Mois', item_type='bonus', amount=total_bonuses))
                
            PayrollItem.objects.bulk_create(items)
            
            if created:
                created_count += 1
        
        if created_count > 0:
            log_action(request.user, request.user.profile.organization, 'create', 'payroll', f'period_{period_id}', {'count': created_count})
                
        return Response({'status': f'{created_count} payslips generated/updated with Gabonese calculation.'})

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        payslip = self.get_object()
        payslip.status = 'validated'
        payslip.save()
        log_action(request.user, request.user.profile.organization, 'update', 'payslip', payslip.id, {'status': 'validated'})
        return Response({'status': 'validated'})

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        payslip = self.get_object()
        payslip.status = 'paid'
        payslip.save()
        log_action(request.user, request.user.profile.organization, 'update', 'payslip', payslip.id, {'status': 'paid'})
        return Response({'status': 'paid'})
