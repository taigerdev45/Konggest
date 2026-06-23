"""
Konggest — Notifications Tests
Couvre : CRUD, mark-read, mark-all-read, unread-count, isolation user.
"""
from django.test import TestCase
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from rest_framework import status
from django.contrib.auth.models import User
from apps.accounts.models import Organization, UserProfile
from apps.notifications.models import Notification
from apps.notifications.views import NotificationViewSet


class NotificationCRUDTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Org Notif', slug='org-notif')
        self.user = User.objects.create_user(username='notif_user', email='n@org.com')
        UserProfile.objects.create(user=self.user, organization=self.org, role='employee')
        self.notif = Notification.objects.create(
            user=self.user, title='Test', message='Hello', notification_type='info',
        )

    def test_list_notifications(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/notifications/items/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_notification(self):
        self.client.force_authenticate(user=self.user)
        payload = {'title': 'Nouveau', 'message': 'Paie prête', 'notification_type': 'payroll'}
        response = self.client.post('/api/notifications/items/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Notification.objects.get(id=response.data['id']).user, self.user)

    def test_retrieve_notification(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/notifications/items/{self.notif.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test')

    def test_unauthenticated_blocked(self):
        response = self.client.get('/api/notifications/items/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class NotificationMarkReadTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.org = Organization.objects.create(name='Org Notif2', slug='org-notif-2')
        self.user = User.objects.create_user(username='notif_user2', email='n2@org.com')
        UserProfile.objects.create(user=self.user, organization=self.org, role='employee')
        self.n1 = Notification.objects.create(user=self.user, title='N1', message='m1', is_read=False)
        self.n2 = Notification.objects.create(user=self.user, title='N2', message='m2', is_read=False)
        self.n3 = Notification.objects.create(user=self.user, title='N3', message='m3', is_read=True)

    def _auth_request(self, method, path, data=None):
        fn = getattr(self.factory, method)
        req = fn(path, data=data, format='json') if data else fn(path)
        force_authenticate(req, user=self.user)
        return req

    def test_unread_count(self):
        view = NotificationViewSet.as_view({'get': 'unread_count'})
        request = self._auth_request('get', '/api/notifications/items/unread-count/')
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 2)

    def test_mark_single_read(self):
        view = NotificationViewSet.as_view({'post': 'mark_read'})
        request = self._auth_request('post', f'/api/notifications/items/{self.n1.id}/mark-read/')
        response = view(request, pk=self.n1.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.n1.refresh_from_db()
        self.assertTrue(self.n1.is_read)

    def test_mark_all_read(self):
        view = NotificationViewSet.as_view({'post': 'mark_all_read'})
        request = self._auth_request('post', '/api/notifications/items/mark-all-read/')
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        unread = Notification.objects.filter(user=self.user, is_read=False).count()
        self.assertEqual(unread, 0)


class NotificationIsolationTest(TestCase):
    """Un user ne doit pas voir les notifications d'un autre user."""
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name='Org Notif3', slug='org-notif-3')
        self.user_a = User.objects.create_user(username='na', email='na@org.com')
        self.user_b = User.objects.create_user(username='nb', email='nb@org.com')
        UserProfile.objects.create(user=self.user_a, organization=self.org, role='employee')
        UserProfile.objects.create(user=self.user_b, organization=self.org, role='employee')
        Notification.objects.create(user=self.user_a, title='Pour A', message='m')
        Notification.objects.create(user=self.user_b, title='Pour B', message='m')

    def test_user_sees_only_own_notifications(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/notifications/items/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        for n in results:
            self.assertEqual(n['title'], 'Pour A')
