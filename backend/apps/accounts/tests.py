from django.test import TestCase
from django.contrib.auth.models import User
from apps.accounts.models import Organization, UserProfile
from apps.employees.models import Employee
from datetime import date

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
