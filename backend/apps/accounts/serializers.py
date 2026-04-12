"""Konggest — Accounts Serializers"""
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Organization, UserProfile, AuditLog, Invoice


class OrganizationSerializer(serializers.ModelSerializer):
    employees_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'sector', 'logo', 'plan', 
            'subscription_status', 'max_employees', 'employees_count',
            'activated_modules', 'address', 'phone', 'email', 
            'website', 'is_active', 'is_trusted_partner', 'created_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'employees_count']


class InvoiceSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'organization', 'organization_name', 'invoice_number',
            'amount', 'currency', 'status', 'period_start', 'period_end',
            'due_date', 'file_url', 'created_at', 'paid_at'
        ]
        read_only_fields = ['id', 'created_at']


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'resource_type', 'resource_id',
                  'details', 'ip_address', 'user_agent', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'user_id', 'username', 'email', 'full_name', 'role', 'avatar',
                  'phone', 'organization', 'organization_name', 'is_active', 'created_at']
        read_only_fields = ['id', 'user_id', 'created_at', 'username', 'email']

    def get_full_name(self, obj):
        return obj.user.get_full_name()


class RegisterSerializer(serializers.Serializer):
    """Registration: creates Organization + Admin User."""
    organization_name = serializers.CharField(max_length=200)
    sector = serializers.CharField(max_length=100, required=False, default='')
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cette adresse email est déjà utilisée.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserInviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    role = serializers.ChoiceField(choices=UserProfile.ROLE_CHOICES, default='employee')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet utilisateur existe déjà.")
        return value


class StaffInviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    role = serializers.ChoiceField(choices=[
        ('admin', 'Super Administrateur'),
        ('support', 'Support Technique'),
        ('commercial', 'Agent Commercial'),
    ], default='support')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet utilisateur existe déjà dans le système.")
        return value
