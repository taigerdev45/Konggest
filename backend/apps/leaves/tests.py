from django.test import TestCase
from apps.accounts.models import Organization
from apps.employees.models import Employee, Department
from apps.leaves.models import LeaveType, LeaveBalance
from datetime import date, timedelta

class LeaveEngineTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        self.leave_type = LeaveType.objects.create(organization=self.org, name="CP", code="AL")
        
        # New employee (0 years)
        self.emp_new = Employee.objects.create(
            organization=self.org,
            employee_id="NEW001",
            first_name="New",
            last_name="Guy",
            email="new@example.com",
            hire_date=date.today() - timedelta(days=365*2), # 2 years
            salary=300000
        )
        
        # Old employee (15 years)
        self.emp_old = Employee.objects.create(
            organization=self.org,
            employee_id="OLD015",
            first_name="Old",
            last_name="Timer",
            email="old@example.com",
            hire_date=date.today() - timedelta(days=365*16), # 16 years
            salary=600000
        )

    def test_leave_accrual_baseline(self):
        """Test that a 2-year employee gets 24 days baseline."""
        balance = LeaveBalance.objects.create(
            employee=self.emp_new,
            leave_type=self.leave_type,
            year=2026,
            total_days=0
        )
        balance.recalculate_balance()
        # 2 days * 12 months = 24
        self.assertEqual(balance.total_days, 24)

    def test_leave_accrual_seniority_bonus(self):
        """Test that a 16-year employee gets 24 + 3 = 27 days."""
        balance = LeaveBalance.objects.create(
            employee=self.emp_old,
            leave_type=self.leave_type,
            year=2026,
            total_days=0
        )
        balance.recalculate_balance()
        # 24 baseline + 3 bonus (for 15+ years) = 27
        self.assertEqual(balance.total_days, 27)

    def test_remaining_days_property(self):
        balance = LeaveBalance.objects.create(
            employee=self.emp_new,
            leave_type=self.leave_type,
            year=2026,
            total_days=24,
            used_days=5,
            carried_over=2
        )
        self.assertEqual(balance.remaining_days, 21) # 24 + 2 - 5
