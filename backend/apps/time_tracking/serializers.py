"""
Konggest — Time Tracking Serializers
Version complète (2026-04-11)

AT2 : Ajout de QRSessionSerializer et QRScanSerializer
"""
from rest_framework import serializers
from .models import TimeEntry, OvertimeRequest, QRSession, QRScan


class TimeEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    department_name = serializers.CharField(source='employee.department.name', read_only=True)
    worked_hours = serializers.FloatField(read_only=True)

    class Meta:
        model = TimeEntry
        fields = [
            'id', 'employee', 'employee_name', 'department_name',
            'date', 'check_in', 'check_out',
            'break_minutes', 'worked_hours',
            'notes', 'is_remote', 'scanned_via_qr',
            'created_at',
        ]
        read_only_fields = ['created_at', 'scanned_via_qr']


class OvertimeSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = OvertimeRequest
        fields = ['id', 'employee', 'employee_name', 'date', 'hours', 'reason', 'status', 'created_at']
        read_only_fields = ['created_at', 'status']


class QRSessionSerializer(serializers.ModelSerializer):
    """AT2 — Serializer pour les sessions QR (lecture seule — le token est généré côté serveur)."""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    is_expired = serializers.SerializerMethodField()
    scans_count = serializers.SerializerMethodField()

    class Meta:
        model = QRSession
        fields = [
            'id', 'organization', 'organization_name',
            'date', 'expires_at', 'is_active',
            'is_expired', 'scans_count',
            'created_at',
        ]
        read_only_fields = ['token', 'created_at']

    def get_is_expired(self, obj):
        return obj.is_expired()

    def get_scans_count(self, obj):
        return obj.scans.count()


class QRScanSerializer(serializers.ModelSerializer):
    """AT2 — Serializer pour les scans individuels (traçabilité)."""
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    scan_type_display = serializers.CharField(source='get_scan_type_display', read_only=True)

    class Meta:
        model = QRScan
        fields = [
            'id', 'qr_session', 'employee', 'employee_name',
            'scan_type', 'scan_type_display', 'scanned_at',
        ]
        read_only_fields = ['scanned_at']
