"""
Konggest — Documents Tests
Couvre : CRUD Document, CRUD DocumentCategory, isolation multi-tenant,
confidentialité, filtres.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from datetime import date
from apps.accounts.models import Organization, UserProfile
from apps.employees.models import Employee
from apps.documents.models import Document, DocumentCategory


class DocumentCategoryTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Org Doc', slug='org-doc')
        self.mgr = User.objects.create_user(username='doc_mgr', email='mgr@doc.com')
        UserProfile.objects.create(user=self.mgr, organization=self.org, role='manager')

        self.emp_user = User.objects.create_user(username='doc_emp', email='emp@doc.com')
        UserProfile.objects.create(user=self.emp_user, organization=self.org, role='employee')

    def test_manager_can_create_category(self):
        self.client.force_authenticate(user=self.mgr)
        response = self.client.post('/api/documents/categories/', {'name': 'Contrats'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Contrats')

    def test_manager_can_list_categories(self):
        DocumentCategory.objects.create(organization=self.org, name='RH')
        self.client.force_authenticate(user=self.mgr)
        response = self.client.get('/api/documents/categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_employee_cannot_create_category(self):
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.post('/api/documents/categories/', {'name': 'Paie'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_blocked(self):
        response = self.client.get('/api/documents/categories/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DocumentCRUDTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Org Doc2', slug='org-doc2')
        self.mgr = User.objects.create_user(username='doc_mgr2', email='mgr2@doc.com')
        UserProfile.objects.create(user=self.mgr, organization=self.org, role='manager')

        self.cat = DocumentCategory.objects.create(organization=self.org, name='Contrats')
        self.emp = Employee.objects.create(
            organization=self.org, first_name='Jean', last_name='Doc',
            email='jean@doc.com', hire_date=date(2022, 1, 1), employee_id='DOC001',
        )
        self.doc = Document.objects.create(
            organization=self.org, employee=self.emp, category=self.cat,
            title='Contrat Jean', file_url='https://storage.example.com/c.pdf',
            file_name='contrat.pdf', is_confidential=False, uploaded_by=self.mgr,
        )

    def test_list_documents(self):
        self.client.force_authenticate(user=self.mgr)
        response = self.client.get('/api/documents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_document(self):
        self.client.force_authenticate(user=self.mgr)
        payload = {
            'title': 'Avenant',
            'file_url': 'https://storage.example.com/av.pdf',
            'file_name': 'avenant.pdf',
            'is_confidential': True,
            'employee': self.emp.id,
            'category': self.cat.id,
        }
        response = self.client.post('/api/documents/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Avenant')

    def test_retrieve_document(self):
        self.client.force_authenticate(user=self.mgr)
        response = self.client.get(f'/api/documents/{self.doc.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Contrat Jean')

    def test_update_document(self):
        self.client.force_authenticate(user=self.mgr)
        response = self.client.patch(f'/api/documents/{self.doc.id}/', {'title': 'Contrat v2'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Contrat v2')

    def test_delete_document(self):
        self.client.force_authenticate(user=self.mgr)
        response = self.client.delete(f'/api/documents/{self.doc.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Document.objects.filter(id=self.doc.id).exists())

    def test_filter_by_confidential(self):
        Document.objects.create(
            organization=self.org, title='Secret', file_url='https://s.com/s.pdf',
            file_name='s.pdf', is_confidential=True, uploaded_by=self.mgr,
        )
        self.client.force_authenticate(user=self.mgr)
        response = self.client.get('/api/documents/?is_confidential=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        for doc in results:
            self.assertTrue(doc['is_confidential'])


class DocumentTenantIsolationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org1 = Organization.objects.create(name='OrgA', slug='org-doc-a')
        self.org2 = Organization.objects.create(name='OrgB', slug='org-doc-b')

        self.mgr1 = User.objects.create_user(username='mgr_a', email='mgr@a.com')
        UserProfile.objects.create(user=self.mgr1, organization=self.org1, role='manager')
        self.mgr2 = User.objects.create_user(username='mgr_b', email='mgr@b.com')
        UserProfile.objects.create(user=self.mgr2, organization=self.org2, role='manager')

        Document.objects.create(
            organization=self.org1, title='Doc Org1',
            file_url='https://s.com/1.pdf', file_name='1.pdf', uploaded_by=self.mgr1,
        )
        Document.objects.create(
            organization=self.org2, title='Doc Org2',
            file_url='https://s.com/2.pdf', file_name='2.pdf', uploaded_by=self.mgr2,
        )

    def test_manager_sees_only_own_org_docs(self):
        self.client.force_authenticate(user=self.mgr1)
        response = self.client.get('/api/documents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        for doc in results:
            self.assertEqual(doc['title'], 'Doc Org1')
