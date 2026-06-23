"""
Konggest — Performance Tests
Couvre : CRUD PerformanceReview, CRUD Objective, RBAC (manager only),
isolation multi-tenant, filtres statut/période.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from datetime import date
from apps.accounts.models import Organization, UserProfile
from apps.employees.models import Employee
from apps.performance.models import PerformanceReview, Objective


class PerformanceSetupMixin:
    def _setup(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Org Perf', slug='org-perf')

        self.mgr_user = User.objects.create_user(username='perf_mgr', email='mgr@perf.com')
        UserProfile.objects.create(user=self.mgr_user, organization=self.org, role='manager')

        self.emp_user = User.objects.create_user(username='perf_emp', email='emp@perf.com')
        UserProfile.objects.create(user=self.emp_user, organization=self.org, role='employee')

        self.emp = Employee.objects.create(
            organization=self.org, first_name='Alice', last_name='P',
            email='alice@perf.com', hire_date=date(2022, 1, 1), employee_id='PERF001',
        )
        self.mgr_emp = Employee.objects.create(
            organization=self.org, first_name='Bob', last_name='M',
            email='bob@perf.com', hire_date=date(2021, 1, 1), employee_id='PERF002',
        )


class PerformanceReviewTest(PerformanceSetupMixin, TestCase):
    def setUp(self):
        self._setup()
        self.review = PerformanceReview.objects.create(
            employee=self.emp, period='2026-Q1', overall_rating=4, status='draft',
        )

    def test_manager_can_list_reviews(self):
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.get('/api/performance/reviews/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_employee_cannot_list_reviews(self):
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.get('/api/performance/reviews/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_blocked(self):
        response = self.client.get('/api/performance/reviews/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_manager_can_create_review(self):
        self.client.force_authenticate(user=self.mgr_user)
        payload = {
            'employee': self.emp.id,
            'period': '2026-Q2',
            'overall_rating': 3,
            'status': 'draft',
        }
        response = self.client.post('/api/performance/reviews/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['period'], '2026-Q2')

    def test_retrieve_review(self):
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.get(f'/api/performance/reviews/{self.review.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['overall_rating'], 4)

    def test_update_review_status(self):
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.patch(f'/api/performance/reviews/{self.review.id}/', {'status': 'in_progress'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.review.refresh_from_db()
        self.assertEqual(self.review.status, 'in_progress')

    def test_delete_review(self):
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.delete(f'/api/performance/reviews/{self.review.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_filter_by_status(self):
        PerformanceReview.objects.create(employee=self.emp, period='2026-Q3', status='completed')
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.get('/api/performance/reviews/?status=draft')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        for r in results:
            self.assertEqual(r['status'], 'draft')


class ObjectiveTest(PerformanceSetupMixin, TestCase):
    def setUp(self):
        self._setup()
        self.review = PerformanceReview.objects.create(
            employee=self.emp, period='2026-Q1', status='draft',
        )
        self.obj = Objective.objects.create(
            employee=self.emp, review=self.review,
            title='Augmenter ventes', progress=30, status='in_progress',
        )

    def test_manager_can_list_objectives(self):
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.get('/api/performance/objectives/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_objective(self):
        self.client.force_authenticate(user=self.mgr_user)
        payload = {
            'employee': self.emp.id,
            'review': self.review.id,
            'title': 'Réduire coûts',
            'progress': 0,
            'status': 'not_started',
        }
        response = self.client.post('/api/performance/objectives/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_update_objective_progress(self):
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.patch(f'/api/performance/objectives/{self.obj.id}/', {'progress': 80})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.obj.refresh_from_db()
        self.assertEqual(self.obj.progress, 80)

    def test_filter_objective_by_status(self):
        Objective.objects.create(employee=self.emp, title='Obj2', status='completed')
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.get('/api/performance/objectives/?status=in_progress')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        for o in results:
            self.assertEqual(o['status'], 'in_progress')


class PerformanceTenantIsolationTest(PerformanceSetupMixin, TestCase):
    def setUp(self):
        self._setup()
        self.org2 = Organization.objects.create(name='Org Perf2', slug='org-perf-2')
        self.mgr2 = User.objects.create_user(username='perf_mgr2', email='mgr2@perf.com')
        UserProfile.objects.create(user=self.mgr2, organization=self.org2, role='manager')
        self.emp2 = Employee.objects.create(
            organization=self.org2, first_name='Zoe', last_name='Z',
            email='zoe@perf.com', hire_date=date(2022, 1, 1), employee_id='PERF003',
        )
        PerformanceReview.objects.create(employee=self.emp, period='2026-Q1', status='draft')
        PerformanceReview.objects.create(employee=self.emp2, period='2026-Q1', status='draft')

    def test_manager_sees_only_own_org_reviews(self):
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.get('/api/performance/reviews/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        # All reviews belong to org employees
        emp_ids = list(Employee.objects.filter(organization=self.org).values_list('id', flat=True))
        for r in results:
            self.assertIn(r['employee'], emp_ids)
