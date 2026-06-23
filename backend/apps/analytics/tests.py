"""
Konggest — Analytics Tests
Couvre GET /api/analytics/kpis/ : structure, isolation tenant, KPIs effectifs.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from datetime import date
from apps.accounts.models import Organization, UserProfile
from apps.employees.models import Employee
from apps.payroll.models import PayrollPeriod, Payslip
from apps.leaves.models import LeaveRequest
from apps.recruitment.models import JobPosting, Application


class KPIDashboardTest(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()

        self.client = APIClient()
        self.org = Organization.objects.create(name='Org KPI', slug='org-kpi')
        self.user = User.objects.create_user(username='kpi_user', email='kpi@org.com')
        self.profile = UserProfile.objects.create(user=self.user, organization=self.org, role='hr')

        # Org isolée (pour tester isolation multi-tenant)
        self.org2 = Organization.objects.create(name='Org2', slug='org-kpi-2')
        self.user2 = User.objects.create_user(username='kpi_user2', email='kpi@org2.com')
        UserProfile.objects.create(user=self.user2, organization=self.org2, role='hr')

        # Employés org1
        self.emp_active = Employee.objects.create(
            organization=self.org, first_name='Alice', last_name='A',
            email='alice@org.com', hire_date=date(2022, 1, 1), status='active',
            salary=600000, employee_id='KPI001',
        )
        self.emp_term = Employee.objects.create(
            organization=self.org, first_name='Bob', last_name='B',
            email='bob@org.com', hire_date=date(2021, 1, 1), status='terminated',
            salary=400000, employee_id='KPI002',
        )
        # Employé org2 (ne doit pas apparaître dans KPIs org1)
        Employee.objects.create(
            organization=self.org2, first_name='Eve', last_name='E',
            email='eve@org2.com', hire_date=date(2023, 1, 1), status='active',
            salary=700000, employee_id='KPI003',
        )

    def _auth(self, user=None):
        u = user or self.user
        self.client.force_authenticate(user=u)

    def test_unauthenticated_returns_401(self):
        response = self.client.get('/api/analytics/kpis/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_structure_keys_present(self):
        """Response contient toutes les sections KPI attendues."""
        self._auth()
        response = self.client.get('/api/analytics/kpis/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        for key in ('employees', 'payroll', 'attendance', 'recruitment', 'expenses', 'recent_activity', '_meta'):
            self.assertIn(key, data, f"Clé '{key}' absente de la réponse KPI")

    def test_employees_kpi_values(self):
        """KPI effectifs : total, active, turnover_rate corrects."""
        self._auth()
        response = self.client.get('/api/analytics/kpis/')
        emp = response.data['employees']
        self.assertEqual(emp['total'], 2)        # alice + bob dans org1
        self.assertEqual(emp['active'], 1)       # alice seulement
        self.assertGreater(emp['turnover_rate'], 0)

    def test_tenant_isolation(self):
        """KPI org2 ne voit pas les employés org1."""
        self._auth(self.user2)
        response = self.client.get('/api/analytics/kpis/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emp = response.data['employees']
        self.assertEqual(emp['total'], 1)   # seulement Eve (org2)

    def test_recruitment_kpi_counts(self):
        """KPI recrutement : open_positions et active_applications."""
        job = JobPosting.objects.create(
            organization=self.org, title='Dev', status='published',
        )
        Application.objects.create(job=job, first_name='C', last_name='D', email='c@d.com', stage='new')
        Application.objects.create(job=job, first_name='E', last_name='F', email='e@f.com', stage='hired')

        self._auth()
        response = self.client.get('/api/analytics/kpis/')
        rec = response.data['recruitment']
        self.assertEqual(rec['open_positions'], 1)
        self.assertEqual(rec['active_applications'], 1)   # 'hired' exclu
        self.assertEqual(rec['hired_last_30d'], 1)

    def test_meta_contains_tenant_id(self):
        self._auth()
        response = self.client.get('/api/analytics/kpis/')
        self.assertEqual(response.data['_meta']['tenant_id'], str(self.org.id))
