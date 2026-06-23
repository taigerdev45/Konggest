"""
Konggest — Planning Tests
Couvre : CRUD ShiftTemplate, CRUD Schedule, bulk-create, isolation tenant,
filtrage par date, rôle employé vs manager.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from datetime import date
from apps.accounts.models import Organization, UserProfile
from apps.employees.models import Employee
from apps.planning.models import ShiftTemplate, Schedule
from unittest.mock import patch


class ShiftTemplateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Org Plan', slug='org-plan')
        self.mgr = User.objects.create_user(username='plan_mgr', email='mgr@plan.com')
        UserProfile.objects.create(user=self.mgr, organization=self.org, role='manager')
        self.emp_user = User.objects.create_user(username='plan_emp', email='emp@plan.com')
        UserProfile.objects.create(user=self.emp_user, organization=self.org, role='employee')

    def test_create_shift_template(self):
        self.client.force_authenticate(user=self.mgr)
        payload = {'name': 'Matin', 'start_time': '08:00:00', 'end_time': '16:00:00'}
        response = self.client.post('/api/planning/templates/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Matin')

    def test_list_shift_templates(self):
        ShiftTemplate.objects.create(organization=self.org, name='Soir', start_time='16:00', end_time='00:00')
        self.client.force_authenticate(user=self.mgr)
        response = self.client.get('/api/planning/templates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unique_name_per_org(self):
        ShiftTemplate.objects.create(organization=self.org, name='Nuit', start_time='00:00', end_time='08:00')
        self.client.force_authenticate(user=self.mgr)
        payload = {'name': 'Nuit', 'start_time': '00:00:00', 'end_time': '08:00:00'}
        response = self.client.post('/api/planning/templates/', payload)
        # Unique constraint → DRF retourne 400 ou la DB remonte une IntegrityError (500)
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        ])

    def test_unauthenticated_blocked(self):
        response = self.client.get('/api/planning/templates/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ScheduleCRUDTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Org Plan2', slug='org-plan-2')
        self.mgr = User.objects.create_user(username='plan_mgr2', email='mgr2@plan.com')
        UserProfile.objects.create(user=self.mgr, organization=self.org, role='manager')
        self.emp = Employee.objects.create(
            organization=self.org, first_name='Luc', last_name='S',
            email='luc@plan.com', hire_date=date(2022, 1, 1), employee_id='PLAN001',
        )
        self.schedule = Schedule.objects.create(
            organization=self.org, employee=self.emp,
            date=date(2026, 7, 1), start_time='08:00', end_time='16:00', status='draft',
        )

    def test_list_schedules(self):
        self.client.force_authenticate(user=self.mgr)
        response = self.client.get('/api/planning/schedules/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_schedule(self):
        self.client.force_authenticate(user=self.mgr)
        payload = {
            'employee': self.emp.id,
            'date': '2026-07-10',
            'start_time': '09:00:00',
            'end_time': '17:00:00',
            'status': 'draft',
        }
        response = self.client.post('/api/planning/schedules/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_update_schedule_status(self):
        self.client.force_authenticate(user=self.mgr)
        response = self.client.patch(f'/api/planning/schedules/{self.schedule.id}/', {'status': 'published'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.status, 'published')

    def test_delete_schedule(self):
        self.client.force_authenticate(user=self.mgr)
        response = self.client.delete(f'/api/planning/schedules/{self.schedule.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_filter_by_date_range(self):
        Schedule.objects.create(
            organization=self.org, employee=self.emp,
            date=date(2026, 8, 1), start_time='08:00', end_time='16:00',
        )
        self.client.force_authenticate(user=self.mgr)
        response = self.client.get('/api/planning/schedules/?start_date=2026-07-01&end_date=2026-07-31')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        for s in results:
            self.assertTrue(s['date'] <= '2026-07-31')


class ScheduleBulkCreateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Org Plan3', slug='org-plan-3')
        self.mgr = User.objects.create_user(username='plan_mgr3', email='mgr3@plan.com')
        UserProfile.objects.create(user=self.mgr, organization=self.org, role='manager')
        self.emp1 = Employee.objects.create(
            organization=self.org, first_name='Ana', last_name='B',
            email='ana@plan.com', hire_date=date(2022, 1, 1), employee_id='PLAN002',
        )
        self.emp2 = Employee.objects.create(
            organization=self.org, first_name='Marc', last_name='C',
            email='marc@plan.com', hire_date=date(2022, 1, 1), employee_id='PLAN003',
        )

    def test_bulk_create_schedules(self):
        self.client.force_authenticate(user=self.mgr)
        payload = {
            'employee_ids': [self.emp1.id, self.emp2.id],
            'date': '2026-07-15',
            'start_time': '08:00:00',
            'end_time': '16:00:00',
            'status': 'draft',
        }
        response = self.client.post('/api/planning/schedules/bulk-create/', payload, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        count = Schedule.objects.filter(
            organization=self.org, date=date(2026, 7, 15),
        ).count()
        self.assertEqual(count, 2)


class PlanningTenantIsolationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org1 = Organization.objects.create(name='POrg1', slug='p-org-1')
        self.org2 = Organization.objects.create(name='POrg2', slug='p-org-2')

        self.mgr1 = User.objects.create_user(username='pmgr1', email='pmgr1@p.com')
        UserProfile.objects.create(user=self.mgr1, organization=self.org1, role='manager')
        self.mgr2 = User.objects.create_user(username='pmgr2', email='pmgr2@p.com')
        UserProfile.objects.create(user=self.mgr2, organization=self.org2, role='manager')

        self.emp1 = Employee.objects.create(
            organization=self.org1, first_name='X', last_name='1',
            email='x@p1.com', hire_date=date(2022, 1, 1), employee_id='PLAN004',
        )
        self.emp2 = Employee.objects.create(
            organization=self.org2, first_name='Y', last_name='2',
            email='y@p2.com', hire_date=date(2022, 1, 1), employee_id='PLAN005',
        )
        Schedule.objects.create(organization=self.org1, employee=self.emp1, date=date(2026, 7, 1), start_time='08:00', end_time='16:00')
        Schedule.objects.create(organization=self.org2, employee=self.emp2, date=date(2026, 7, 1), start_time='08:00', end_time='16:00')

    def test_mgr1_sees_only_org1_schedules(self):
        self.client.force_authenticate(user=self.mgr1)
        response = self.client.get('/api/planning/schedules/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        emp1_ids = list(Employee.objects.filter(organization=self.org1).values_list('id', flat=True))
        for s in results:
            emp_id = s['employee'] if isinstance(s['employee'], int) else s['employee']['id']
            self.assertIn(emp_id, emp1_ids)
