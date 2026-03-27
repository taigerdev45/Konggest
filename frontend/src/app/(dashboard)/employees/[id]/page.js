'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { HiOutlineArrowLeft, HiOutlineMail, HiOutlinePhone, HiOutlineOfficeBuilding, HiOutlineBriefcase, HiOutlineCalendar, HiOutlineIdentification } from 'react-icons/hi';
import api from '@/lib/api';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const data = await api.get(`/employees/${id}/`);
        setEmployee(data);
      } catch (err) {
        console.error('Error fetching employee:', err);
        setError(err.error || 'Employé non trouvé.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchEmployee();
  }, [id]);

  if (loading) return <div className="p-xl text-center"><div className="skeleton" style={{ height: 200 }} /></div>;
  if (error) return <div className="p-xl text-center card"><p style={{ color: 'var(--danger)' }}>{error}</p><Link href="/employees" className="btn btn-ghost mt-md">Retour à la liste</Link></div>;
  if (!employee) return null;

  const STATUS_MAP = {
    active: { label: 'Actif', class: 'badge-success' },
    on_leave: { label: 'En congé', class: 'badge-warning' },
    suspended: { label: 'Suspendu', class: 'badge-danger' },
    terminated: { label: 'Terminé', class: 'badge-neutral' },
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="flex items-center gap-md">
          <Link href="/employees" className="btn btn-ghost btn-sm">
            <HiOutlineArrowLeft />
          </Link>
          <div>
            <h1>{employee.first_name} {employee.last_name}</h1>
            <p>Détails du profil employé — {employee.employee_id}</p>
          </div>
        </div>
        <span className={`badge ${STATUS_MAP[employee.status]?.class || 'badge-neutral'}`}>
          {STATUS_MAP[employee.status]?.label || employee.status}
        </span>
      </div>

      <div className="grid grid-3 gap-lg">
        {/* Main Info */}
        <div className="card col-span-2">
          <div className="flex items-start gap-lg mb-xl">
            <div className="avatar avatar-xl">
              {employee.photo ? <img src={employee.photo} alt={employee.full_name} /> : `${employee.first_name[0]}${employee.last_name[0]}`}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ marginBottom: 4 }}>{employee.first_name} {employee.last_name}</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{employee.position_title} @ {employee.department_name}</p>
              
              <div className="grid grid-2 gap-md">
                <div className="flex items-center gap-sm text-secondary">
                  <HiOutlineMail /> {employee.email}
                </div>
                <div className="flex items-center gap-sm text-secondary">
                  <HiOutlinePhone /> {employee.phone || 'Non renseigné'}
                </div>
                <div className="flex items-center gap-sm text-secondary">
                  <HiOutlineIdentification /> {employee.employee_id}
                </div>
                <div className="flex items-center gap-sm text-secondary">
                  <HiOutlineCalendar /> Embauché le {new Date(employee.hire_date).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
            <h3 className="mb-md">Informations Professionnelles</h3>
            <div className="grid grid-2 gap-lg">
              <div>
                <p className="text-muted small">Type de contrat</p>
                <p style={{ fontWeight: 500 }}>{employee.contract_type.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-muted small">Manager</p>
                <p style={{ fontWeight: 500 }}>{employee.manager_name || 'Aucun'}</p>
              </div>
              <div>
                <p className="text-muted small">Salaire brut annuel</p>
                <p style={{ fontWeight: 500 }}>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(employee.salary * 12)}</p>
              </div>
              <div>
                <p className="text-muted small">Nationalité</p>
                <p style={{ fontWeight: 500 }}>{employee.nationality || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="flex flex-col gap-lg">
          <div className="card">
            <h3 className="mb-md">Adresse</h3>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
              {employee.address || 'Aucune adresse renseignée'}
            </p>
          </div>
          <div className="card">
            <h3 className="mb-md">Contact d'Urgence</h3>
            {employee.emergency_contact_name ? (
              <>
                <p style={{ fontWeight: 500 }}>{employee.emergency_contact_name}</p>
                <p style={{ color: 'var(--text-secondary)' }}>{employee.emergency_contact_phone}</p>
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Non renseigné</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
