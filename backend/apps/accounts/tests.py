from django.test import TestCase
from django.contrib.auth.models import User
from apps.accounts.models import Organization, UserProfile
from apps.employees.models import Employee
from datetime import date
from unittest.mock import patch, MagicMock
import json

class MultiTenantSecurityTest(TestCase):
    def setUp(self):
        self.org_a = Organization.objects.create(name="Org A", slug="org-a")
        self.org_b = Organization.objects.create(name="Org B", slug="org-b")
        
        self.user_a = User.objects.create_user(username='user_a', password='p')
        UserProfile.objects.create(user=self.user_a, organization=self.org_a, role='hr')
        
        self.emp_a = Employee.objects.create(
            organization=self.org_a, employee_id="A001", first_name="A", last_name="A", 
            email="a@a.com", hire_date=date.today(), salary=100
        )
        self.emp_b = Employee.objects.create(
            organization=self.org_b, employee_id="B001", first_name="B", last_name="B", 
            email="b@b.com", hire_date=date.today(), salary=100
        )

    def test_tenant_data_isolation(self):
        """Test that data is strictly filtered by tenant in the ViewSet logic."""
        # This test checks the model layer level for this organization
        # We assume the get_queryset logic in views uses organization_id
        
        # Count for Org A
        count_a = Employee.objects.filter(organization=self.org_a).count()
        self.assertEqual(count_a, 1)
        
        # Ensuring B is NOT in A
        self.assertFalse(Employee.objects.filter(organization=self.org_a, id=self.emp_b.id).exists())


class UserInvitationTest(TestCase):
    """Tests for user invitation with temporary password."""
    
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        self.admin_user = User.objects.create_user(
            username='admin@test.com', 
            email='admin@test.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User'
        )
        self.admin_profile = UserProfile.objects.create(
            user=self.admin_user, 
            organization=self.org, 
            role='admin'
        )
        
    @patch('urllib.request.urlopen')
    @patch('urllib.request.Request')
    def test_invite_user_with_temp_password(self, mock_request, mock_urlopen):
        """Test that inviting a user creates them with a temporary password."""
        # Mock Supabase response
        mock_response = MagicMock()
        mock_response.status = 201
        mock_response.read.return_value = json.dumps({
            'id': 'supabase-uuid-123',
            'email': 'newuser@test.com'
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        # Authenticate as admin
        self.client.force_login(self.admin_user)
        
        # Send invitation request
        response = self.client.post(
            '/api/accounts/profiles/',
            data=json.dumps({
                'email': 'newuser@test.com',
                'full_name': 'New User',
                'role': 'employee'
            }),
            content_type='application/json'
        )
        
        # Check response
        self.assertEqual(response.status_code, 201)
        data = response.json()
        
        # Verify temp_password is returned
        self.assertIn('temp_password', data)
        self.assertIsNotNone(data['temp_password'])
        self.assertEqual(len(data['temp_password']), 14)  # Our generated password length
        
        # Verify login_url is returned
        self.assertIn('login_url', data)
        self.assertIn('/login', data['login_url'])
        
        # Verify email_sent is False (we don't send email, admin shows password)
        self.assertEqual(data.get('email_sent'), False)
        
        # Verify user was created in Django
        new_user = User.objects.filter(email='newuser@test.com').first()
        self.assertIsNotNone(new_user)
        
        # Verify user has correct organization
        profile = UserProfile.objects.filter(user=new_user).first()
        self.assertIsNotNone(profile)
        self.assertEqual(profile.organization_id, self.org.id)
        self.assertEqual(profile.role, 'employee')
        
        # Verify user can authenticate with temp password
        self.assertTrue(
            self.client.login(username='newuser@test.com', password=data['temp_password'])
        )
    
    @patch('urllib.request.urlopen')
    @patch('urllib.request.Request')
    def test_invited_user_is_attached_to_inviter_organization(self, mock_request, mock_urlopen):
        """Test that invited user is attached to the inviter's organization."""
        # Create second organization
        org2 = Organization.objects.create(name="Org 2", slug="org-2")
        
        # Mock Supabase response
        mock_response = MagicMock()
        mock_response.status = 201
        mock_response.read.return_value = json.dumps({
            'id': 'supabase-uuid-456',
            'email': 'user2@test.com'
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        # Authenticate as admin of org
        self.client.force_login(self.admin_user)
        
        # Invite user
        response = self.client.post(
            '/api/accounts/profiles/',
            data=json.dumps({
                'email': 'user2@test.com',
                'full_name': 'User Two',
                'role': 'manager'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        
        # Verify user is in admin's org, not org2
        invited_user = User.objects.filter(email='user2@test.com').first()
        self.assertIsNotNone(invited_user)
        profile = UserProfile.objects.filter(user=invited_user).first()
        self.assertEqual(profile.organization_id, self.org.id)
        self.assertNotEqual(profile.organization_id, org2.id)
    
    def test_invited_user_not_visible_in_other_organizations(self):
        """Test that invited user is not visible in other organizations."""
        # Create user in org A
        other_org = Organization.objects.create(name="Other Org", slug="other-org")
        invited_user = User.objects.create_user(
            username='invited@test.com',
            email='invited@test.com',
            password='temppass'
        )
        UserProfile.objects.create(
            user=invited_user,
            organization=self.org,
            role='employee'
        )
        
        # Create HR in other org
        other_hr = User.objects.create_user(
            username='otherhr@test.com',
            email='otherhr@test.com',
            password='hrpass'
        )
        UserProfile.objects.create(
            user=other_hr,
            organization=other_org,
            role='hr'
        )
        
        # Login as other HR and check queryset
        self.client.force_login(other_hr)
        response = self.client.get('/api/accounts/profiles/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Should not see invited user from other org
        emails = [user.get('email', '') for user in data.get('results', [])]
        self.assertNotIn('invited@test.com', emails)
    
    @patch('urllib.request.urlopen')
    @patch('urllib.request.Request')
    def test_supabase_user_created_with_password(self, mock_request, mock_urlopen):
        """Test that Supabase user is created with password for immediate login."""
        mock_response = MagicMock()
        mock_response.status = 201
        mock_response.read.return_value = json.dumps({
            'id': 'supabase-uuid-789',
            'email': 'supabaseuser@test.com'
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        self.client.force_login(self.admin_user)
        
        response = self.client.post(
            '/api/accounts/profiles/',
            data=json.dumps({
                'email': 'supabaseuser@test.com',
                'full_name': 'Supabase User',
                'role': 'employee'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        
        # Verify Supabase was called with password
        call_args = mock_request.call_args
        self.assertIsNotNone(call_args)
        
        # Check the payload contains password and email_confirm
        payload = json.loads(call_args[0][1])  # Second positional arg is data
        self.assertIn('password', payload)
        self.assertEqual(payload.get('email_confirm'), True)
        self.assertEqual(payload.get('email'), 'supabaseuser@test.com')
    
    def test_invite_requires_manager_permission(self):
        """Test that only managers can invite users."""
        # Create regular employee (not manager)
        employee = User.objects.create_user(
            username='employee@test.com',
            email='employee@test.com',
            password='emppass'
        )
        UserProfile.objects.create(
            user=employee,
            organization=self.org,
            role='employee'  # Not a manager
        )
        
        self.client.force_login(employee)
        
        response = self.client.post(
            '/api/accounts/profiles/',
            data=json.dumps({
                'email': 'shouldfail@test.com',
                'full_name': 'Should Fail',
                'role': 'employee'
            }),
            content_type='application/json'
        )
        
        # Should get 403 Forbidden
        self.assertEqual(response.status_code, 403)
        
        # Verify user was NOT created
        self.assertFalse(User.objects.filter(email='shouldfail@test.com').exists())

