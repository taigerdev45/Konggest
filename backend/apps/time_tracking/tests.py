"""
Konggest — Time Tracking Tests
Tests AT18 (2026-04-11)
- RBAC, isolation multi-tenant
- CRUD Pointage
- Scan QR (valide, expiré, anti-replay)
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from apps.accounts.models import Organization, UserProfile
from apps.employees.models import Employee
from apps.time_tracking.models import TimeEntry, QRSession, QRScan
from apps.time_tracking.views import _generate_qr_token

class TimeTrackingTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()
        
        # Tenant 1
        self.org1 = Organization.objects.create(name='Org 1', slug='org-1')
        self.user1 = User.objects.create_user(username='emp1', email='emp1@org1.com')
        self.profile1 = UserProfile.objects.create(user=self.user1, organization=self.org1, role='employee')
        self.emp1 = Employee.objects.create(organization=self.org1, user=self.user1, first_name='Emp', last_name='1', email='emp1@org1.com', hire_date=date.today())

        # Manager Tenant 1
        self.user1_mgr = User.objects.create_user(username='mgr1', email='mgr1@org1.com')
        self.profile1_mgr = UserProfile.objects.create(user=self.user1_mgr, organization=self.org1, role='manager')
        
        # Tenant 2
        self.org2 = Organization.objects.create(name='Org 2', slug='org-2')
        self.user2 = User.objects.create_user(username='emp2', email='emp2@org2.com')
        self.profile2 = UserProfile.objects.create(user=self.user2, organization=self.org2, role='employee')
        self.emp2 = Employee.objects.create(organization=self.org2, user=self.user2, first_name='Emp', last_name='2', email='emp2@org2.com', hire_date=date.today())

    def authenticate(self, user, org):
        """Helper to mock JWT auth and TenantMiddleware"""
        self.client.force_authenticate(user=user)
        # Mock TenantMiddleware behavior (usually sets request.tenant_id)
        # DRF test client doesn't run middlewares by default for API requests the same way
        # But we can pass custom headers or simulate it by patching
        self.client.defaults['HTTP_X_TENANT_ID'] = str(org.id)

    def test_rbac_and_isolation(self):
        """Emp1 of org1 shouldn't see time entries of emp2 of org2"""
        TimeEntry.objects.create(employee=self.emp1, date=date.today(), check_in='09:00:00')
        TimeEntry.objects.create(employee=self.emp2, date=date.today(), check_in='09:00:00')
        
        # Log in as Emp 1
        self.authenticate(self.user1, self.org1)
        response = self.client.get('/api/time-tracking/entries/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only see their own
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['employee'], self.emp1.id)

        # Log in as Manager 1
        self.authenticate(self.user1_mgr, self.org1)
        response = self.client.get('/api/time-tracking/entries/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see all emp of org1 (which is just emp1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['employee'], self.emp1.id)

    def test_toggle_endpoint(self):
        """Test AT9 unified toggle logic"""
        self.authenticate(self.user1, self.org1)
        
        # Clock IN
        response = self.client.post('/api/time-tracking/entries/toggle/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'checked_in')
        
        # Clock OUT
        response = self.client.post('/api/time-tracking/entries/toggle/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'checked_out')
        
        # Try again -> Error
        response = self.client.post('/api/time-tracking/entries/toggle/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['status'], 'already_done')

    def test_generate_qr(self):
        """Test AT3 QR generation"""
        # Only manager can generate QR
        self.authenticate(self.user1, self.org1)
        response = self.client.post('/api/time-tracking/entries/generate_qr/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # With manager
        self.authenticate(self.user1_mgr, self.org1)
        response = self.client.post('/api/time-tracking/entries/generate_qr/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('qr_payload', response.data)
        
        # Verify it created a QRSession
        session = QRSession.objects.filter(organization=self.org1, date=date.today()).first()
        self.assertIsNotNone(session)
        self.assertEqual(session.token, response.data['qr_payload'])

    def test_scan_qr_flow(self):
        """Test AT4 QR SCAN logic (valide, expiré, anti-replay)"""
        today = date.today()
        # Create a valid session
        token = _generate_qr_token(str(self.org1.id), str(today))
        session = QRSession.objects.create(
            organization=self.org1,
            date=today,
            token=token,
            expires_at=timezone.now() + timedelta(days=1),
            is_active=True
        )
        
        self.authenticate(self.user1, self.org1)
        
        # Invalid Token
        response = self.client.post('/api/time-tracking/entries/scan/', {'token': 'fake_token', 'scan_type': 'in'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Valid IN scan
        response = self.client.post('/api/time-tracking/entries/scan/', {'token': token, 'scan_type': 'in'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'checked_in')
        
        # Replay IN scan (should fail due to anti-replay)
        response = self.client.post('/api/time-tracking/entries/scan/', {'token': token, 'scan_type': 'in'})
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        
        # Valid OUT scan
        response = self.client.post('/api/time-tracking/entries/scan/', {'token': token, 'scan_type': 'out'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'checked_out')
        
        # Replay OUT scan (anti-replay → 409)
        response = self.client.post('/api/time-tracking/entries/scan/', {'token': token, 'scan_type': 'out'})
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_expired_qr_scan(self):
        """Test scan with expired QR"""
        today = date.today()
        # Token for yesterday (simulated expiry)
        token = _generate_qr_token(str(self.org1.id), str(today))
        session = QRSession.objects.create(
            organization=self.org1,
            date=today,
            token=token,
            expires_at=timezone.now() - timedelta(minutes=1), # Expired
            is_active=True
        )
        
        self.authenticate(self.user1, self.org1)
        response = self.client.post('/api/time-tracking/entries/scan/', {'token': token, 'scan_type': 'in'})
        self.assertEqual(response.status_code, status.HTTP_410_GONE)
        
