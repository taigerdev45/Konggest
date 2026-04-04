from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth.models import User
from apps.accounts.models import Organization, UserProfile
from apps.employees.models import Employee, Department
from apps.payroll.models import PayrollPeriod, Payslip, PayrollItem
from apps.payroll.views import PayslipViewSet
from core import hr_settings
from datetime import date
import json

class PayrollEngineTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        self.dept = Department.objects.create(name="IT", organization=self.org)
        self.admin = User.objects.create_user(username='admin', email='a@a.com', password='p')
        UserProfile.objects.create(user=self.admin, organization=self.org, role='hr')
        
        # Standard domestic employee
        self.employee = Employee.objects.create(
            organization=self.org,
            employee_id="GAB001",
            first_name="Marc",
            last_name="Mba",
            email="marc@example.com",
            hire_date=date(2020, 1, 1),
            salary=500000, # 500k XAF
            site_location='libreville',
            sector='commerce',
            family_parts=1.0 # Single
        )
        
        self.period_nov = PayrollPeriod.objects.create(
            organization=self.org,
            name="Nov 2026",
            start_date=date(2026, 11, 1),
            end_date=date(2026, 11, 30)
        )
        
        self.period_dec = PayrollPeriod.objects.create(
            organization=self.org,
            name="Dec 2026",
            start_date=date(2026, 12, 1),
            end_date=date(2026, 12, 31)
        )
        
        self.factory = APIRequestFactory()

    def test_payroll_calc_standard(self):
        """Test calculation of CNSS, TCS, and IRPP in a normal month."""
        view = PayslipViewSet.as_view({'post': 'generate_for_period'})
        request = self.factory.post('/api/payroll/generate_for_period/', {'period_id': self.period_nov.id}, format='json')
        force_authenticate(request, user=self.admin)
        request.user = self.admin
        request.tenant_id = self.org.id
        
        response = view(request)
        if response.status_code != 200:
            print(f"DEBUG: Response 500 Data: {response.data}")
            print(f"DEBUG: Response Content: {response.content}")
        self.assertEqual(response.status_code, 200)
        
        payslip = Payslip.objects.get(employee=self.employee, period=self.period_nov)
        
        # Expected Results for 500k XAF:
        # CNSS = 500,000 * 0.05 = 25,000
        # TCS = (500,000 - 150,000) * 0.05 = 350,000 * 0.05 = 17,500
        # IRPP = Scale (Calculated in hr_settings)
        
        item_cnss = PayrollItem.objects.get(payslip=payslip, name='CNSS (5%)')
        item_tcs = PayrollItem.objects.get(payslip=payslip, name='TCS (5%)')
        
        self.assertEqual(float(item_cnss.amount), 25000)
        self.assertEqual(float(item_tcs.amount), 17500)
        self.assertTrue(float(payslip.net_salary) < 500000)

    def test_13th_month_oil_sector(self):
        """Test that petroleum sector gets 13th month in December."""
        self.employee.sector = 'petrole'
        self.employee.save()
        
        view = PayslipViewSet.as_view({'post': 'generate_for_period'})
        request = self.factory.post('/api/payroll/generate_for_period/', {'period_id': self.period_dec.id}, format='json')
        force_authenticate(request, user=self.admin)
        request.user = self.admin
        request.tenant_id = self.org.id
        
        response = view(request)
        self.assertEqual(response.status_code, 200)
        
        payslip = Payslip.objects.get(employee=self.employee, period=self.period_dec)
        item_13th = PayrollItem.objects.get(payslip=payslip, name='13ème Mois')
        
        self.assertEqual(float(item_13th.amount), 500000)
        self.assertEqual(float(payslip.total_bonuses), 500000)

    def test_irpp_scale_progressive(self):
        """Test IRPP calculation for higher income."""
        # Update salary to 1.2M
        self.employee.salary = 1200000
        self.employee.save()
        
        irpp_amount = hr_settings.calculate_irpp_monthly(1200000, 1.0)
        # Should be more than simple rate
        self.assertTrue(irpp_amount > 0)
        
        # Test abattement for parts
        irpp_with_parts = hr_settings.calculate_irpp_monthly(1200000, 3.0)
        self.assertTrue(irpp_with_parts < irpp_amount)
