"""
Konggest — Recruitment Tests
Couvre : CRUD JobPosting, Application, Interview, accès public (liste + détail + candidature),
isolation multi-tenant, pipeline stages, RBAC (HR only pour write).
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from datetime import date
from django.utils import timezone
from apps.accounts.models import Organization, UserProfile
from apps.recruitment.models import JobPosting, Application, Interview
from unittest.mock import patch


class JobPostingTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Org Rec', slug='org-rec')
        self.hr = User.objects.create_user(username='rec_hr', email='hr@rec.com')
        UserProfile.objects.create(user=self.hr, organization=self.org, role='hr')
        self.emp_user = User.objects.create_user(username='rec_emp', email='emp@rec.com')
        UserProfile.objects.create(user=self.emp_user, organization=self.org, role='employee')

    def test_hr_can_create_job_posting(self):
        self.client.force_authenticate(user=self.hr)
        payload = {
            'title': 'Développeur Python',
            'description': 'Poste de dev backend',
            'contract_type': 'cdi',
            'status': 'draft',
        }
        response = self.client.post('/api/recruitment/jobs/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Développeur Python')

    def test_hr_can_list_jobs(self):
        JobPosting.objects.create(organization=self.org, title='Job1', description='D', status='draft')
        self.client.force_authenticate(user=self.hr)
        response = self.client.get('/api/recruitment/jobs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_employee_cannot_create_job(self):
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.post('/api/recruitment/jobs/', {'title': 'Hack', 'description': 'D'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_job_status_to_published(self):
        job = JobPosting.objects.create(organization=self.org, title='Job2', description='D', status='draft')
        self.client.force_authenticate(user=self.hr)
        response = self.client.patch(f'/api/recruitment/jobs/{job.id}/', {'status': 'published'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        job.refresh_from_db()
        self.assertEqual(job.status, 'published')

    def test_delete_job(self):
        job = JobPosting.objects.create(organization=self.org, title='JobDel', description='D')
        self.client.force_authenticate(user=self.hr)
        response = self.client.delete(f'/api/recruitment/jobs/{job.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_filter_by_status(self):
        JobPosting.objects.create(organization=self.org, title='Draft', description='D', status='draft')
        JobPosting.objects.create(organization=self.org, title='Published', description='D', status='published')
        self.client.force_authenticate(user=self.hr)
        response = self.client.get('/api/recruitment/jobs/?status=draft')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        for j in results:
            self.assertEqual(j['status'], 'draft')


class PublicJobAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Org Pub', slug='org-pub')
        self.job_pub = JobPosting.objects.create(
            organization=self.org, title='Offre Publique',
            description='Open to all', status='published',
        )
        self.job_draft = JobPosting.objects.create(
            organization=self.org, title='Brouillon',
            description='Not visible', status='draft',
        )

    def test_public_list_shows_only_published(self):
        response = self.client.get('/api/recruitment/public/jobs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data if isinstance(response.data, list) else response.data.get('results', response.data)
        titles = [j['title'] for j in results]
        self.assertIn('Offre Publique', titles)
        self.assertNotIn('Brouillon', titles)

    def test_public_job_detail(self):
        response = self.client.get(f'/api/recruitment/public/jobs/{self.job_pub.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Offre Publique')

    def test_draft_job_not_accessible_publicly(self):
        response = self.client.get(f'/api/recruitment/public/jobs/{self.job_draft.id}/')
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    @patch('apps.recruitment.views.send_application_confirmation', autospec=True)
    def test_public_apply(self, mock_task):
        payload = {
            'first_name': 'Jean',
            'last_name': 'Doe',
            'email': 'jean@doe.com',
            'cover_letter': 'Je suis motivé',
        }
        response = self.client.post(f'/api/recruitment/public/jobs/{self.job_pub.id}/apply/', payload)
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertTrue(Application.objects.filter(job=self.job_pub, email='jean@doe.com').exists())


class ApplicationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Org App', slug='org-app')
        self.hr = User.objects.create_user(username='app_hr', email='hr@app.com')
        UserProfile.objects.create(user=self.hr, organization=self.org, role='hr')

        self.job = JobPosting.objects.create(
            organization=self.org, title='Analyste', description='D', status='published',
        )
        self.application = Application.objects.create(
            job=self.job, first_name='Paul', last_name='K', email='paul@k.com', stage='new',
        )

    def test_hr_can_list_applications(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.get('/api/recruitment/applications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_hr_can_update_stage(self):
        self.client.force_authenticate(user=self.hr)
        response = self.client.patch(
            f'/api/recruitment/applications/{self.application.id}/',
            {'stage': 'screening'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.application.refresh_from_db()
        self.assertEqual(self.application.stage, 'screening')

    def test_filter_applications_by_stage(self):
        Application.objects.create(job=self.job, first_name='Alice', last_name='L', email='alice@l.com', stage='hired')
        self.client.force_authenticate(user=self.hr)
        response = self.client.get('/api/recruitment/applications/?stage=new')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        for a in results:
            self.assertEqual(a['stage'], 'new')

    def test_unauthenticated_blocked(self):
        response = self.client.get('/api/recruitment/applications/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class InterviewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Org Interv', slug='org-interv')
        self.hr = User.objects.create_user(username='interv_hr', email='hr@interv.com')
        UserProfile.objects.create(user=self.hr, organization=self.org, role='hr')

        self.job = JobPosting.objects.create(
            organization=self.org, title='Manager', description='D', status='published',
        )
        self.app = Application.objects.create(
            job=self.job, first_name='Sara', last_name='T', email='sara@t.com', stage='interview',
        )

    def test_create_interview(self):
        self.client.force_authenticate(user=self.hr)
        payload = {
            'application': self.app.id,
            'scheduled_at': '2026-07-20T10:00:00Z',
            'interviewer': 'DRH Martin',
            'location': 'Libreville',
        }
        response = self.client.post('/api/recruitment/interviews/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['interviewer'], 'DRH Martin')

    def test_list_interviews(self):
        Interview.objects.create(
            application=self.app,
            scheduled_at=timezone.now(),
            interviewer='Chef',
        )
        self.client.force_authenticate(user=self.hr)
        response = self.client.get('/api/recruitment/interviews/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class RecruitmentTenantIsolationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org1 = Organization.objects.create(name='RecOrg1', slug='rec-org-1')
        self.org2 = Organization.objects.create(name='RecOrg2', slug='rec-org-2')

        self.hr1 = User.objects.create_user(username='rhr1', email='rhr1@r.com')
        UserProfile.objects.create(user=self.hr1, organization=self.org1, role='hr')
        self.hr2 = User.objects.create_user(username='rhr2', email='rhr2@r.com')
        UserProfile.objects.create(user=self.hr2, organization=self.org2, role='hr')

        JobPosting.objects.create(organization=self.org1, title='Job Org1', description='D', status='published')
        JobPosting.objects.create(organization=self.org2, title='Job Org2', description='D', status='published')

    def test_hr1_sees_only_org1_jobs(self):
        self.client.force_authenticate(user=self.hr1)
        response = self.client.get('/api/recruitment/jobs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        for j in results:
            self.assertEqual(j['title'], 'Job Org1')
