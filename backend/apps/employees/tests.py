from django.test import TestCase
from django.contrib.auth.models import User
from apps.accounts.models import Organization
from apps.employees.models import Employee, Department
from datetime import date, timedelta

class EmployeeModelTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        self.dept = Department.objects.create(name="IT", organization=self.org)
        
        # Employee hired 5 years ago
        hire_date = date.today() - timedelta(days=5*365 + 1)
        self.employee = Employee.objects.create(
            organization=self.org,
            employee_id="EMP001",
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            department=self.dept,
            hire_date=hire_date,
            salary=500000,
            site_location='libreville',
            sector='commerce'
        )

    def test_seniority_years(self):
        """Test that seniority is calculated correctly."""
        self.assertEqual(self.employee.seniority_years, 5)

    def test_gabonese_fields_persistence(self):
        """Test that new Gabonese fields are correctly saved."""
        self.employee.cnss_number = "123456-X"
        self.employee.is_expat = True
        self.employee.site_location = 'port-gentil'
        self.employee.family_parts = 2.5
        self.employee.save()
        
        emp = Employee.objects.get(id=self.employee.id)
        self.assertEqual(emp.cnss_number, "123456-X")
        self.assertTrue(emp.is_expat)
        self.assertEqual(emp.site_location, 'port-gentil')
        self.assertEqual(float(emp.family_parts), 2.5)
