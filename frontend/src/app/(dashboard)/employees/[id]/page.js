'use client';

/**
 * Konggest — Employee Detail Page
 * Professional profile view with PDF export.
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  HiOutlineArrowLeft, HiOutlineMail, HiOutlinePhone,
  HiOutlineOfficeBuilding, HiOutlineBriefcase, HiOutlineCalendar,
  HiOutlineIdentification, HiOutlineLocationMarker, HiOutlineUserGroup,
  HiOutlineDocumentDownload, HiOutlinePencil, HiOutlineCurrencyDollar,
  HiOutlineGlobe, HiOutlineShieldCheck, HiOutlinePrinter
} from 'react-icons/hi';
import api from '@/lib/api';

const STATUS_MAP = {
  active:     { label: 'Actif',     cls: 'badge-success',  color: '#10b981' },
  on_leave:   { label: 'En congé', cls: 'badge-warning',  color: '#f59e0b' },
  suspended:  { label: 'Suspendu', cls: 'badge-danger',   color: '#ef4444' },
  terminated: { label: 'Terminé',  cls: 'badge-neutral',  color: '#6b7280' },
};

export default function EmployeeDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const printRef = useRef(null);
  const { id }   = params;

  const [employee, setEmployee] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const data = await api.get(`/employees/${id}/`);
        setEmployee(data);
      } catch (err) {
        setError(err?.error || 'Employé non trouvé.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetch_();
  }, [id]);

  const handlePrintPDF = () => {
    window.print();
  };

  if (loading) return (
    <div style={{ padding: 40 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12, marginBottom: 16 }} />
      ))}
    </div>
  );

  if (error) return (
    <div className="card" style={{ margin: 40, padding: 32, textAlign: 'center' }}>
      <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>
      <Link href="/employees" className="btn btn-ghost">← Retour à la liste</Link>
    </div>
  );

  if (!employee) return null;

  const status = STATUS_MAP[employee.status] || STATUS_MAP.active;
  const fmtCurrency = (n) => new Intl.NumberFormat('fr-GA', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const initials = `${(employee.first_name || '?')[0]}${(employee.last_name || '?')[0]}`;

  return (
    <>
      {/* Global print styles injected inline */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #employee-print-zone, #employee-print-zone * { visibility: visible !important; }
          #employee-print-zone { position: absolute; inset: 0; background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .card { box-shadow: none !important; border: 1px solid #e5e7eb !important; background: #fff !important; }
        }
        .print-only { display: none; }
        .info-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border-color); }
        .info-row:last-child { border-bottom: none; }
        .info-icon { color: var(--primary); flex-shrink: 0; margin-top: 2px; }
        .info-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
        .info-value { font-size: 0.92rem; font-weight: 500; color: var(--text-primary); }
        .stat-card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; text-align: center; }
        .stat-card .stat-val { font-size: 1.5rem; font-weight: 800; color: var(--primary); }
        .stat-card .stat-lbl { font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
      `}</style>

      <div id="employee-print-zone" ref={printRef}>
        {/* Toolbar (hidden on print) */}
        <div className="no-print page-header" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/employees" className="btn btn-ghost btn-sm" style={{ padding: '8px 12px' }}>
              <HiOutlineArrowLeft size={18} />
            </Link>
            <div>
              <h1 style={{ marginBottom: 2 }}>{employee.first_name} {employee.last_name}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Fiche collaborateur · {employee.employee_id}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href={`/employees`} className="btn btn-ghost btn-sm">
              <HiOutlinePencil size={15} /> Modifier
            </Link>
            <button className="btn btn-primary" onClick={handlePrintPDF} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlinePrinter size={16} /> Exporter PDF
            </button>
          </div>
        </div>

        {/* Print Header (visible only on print) */}
        <div className="print-only" style={{ padding: '24px 40px 16px', borderBottom: '3px solid #059669', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#059669', letterSpacing: '-0.5px' }}>KONGGEST</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Système de Gestion RH — Gabon 2026</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>FICHE COLLABORATEUR</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Générée le {new Date().toLocaleDateString('fr-FR')}</div>
              <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', marginTop: 2 }}>Réf. : {employee.employee_id}</div>
            </div>
          </div>
        </div>

        {/* Hero Card */}
        <div className="card animate-in" style={{ marginBottom: 20, padding: 28, display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '0.05em',
            boxShadow: '0 4px 20px rgba(5, 150, 105, 0.3)'
          }}>
            {employee.photo
              ? <img src={employee.photo} alt={initials} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : initials}
          </div>

          {/* Identity */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{employee.first_name} {employee.last_name}</h2>
              <span className={`badge ${status.cls}`}>{status.label}</span>
              {employee.is_expat && <span className="badge badge-warning">Expatrié</span>}
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px', fontSize: '1rem' }}>
              {employee.position_title || 'Poste non défini'} · {employee.department_name || 'Sans département'}
            </p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><HiOutlineMail size={14} />{employee.email}</span>
              {employee.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><HiOutlinePhone size={14} />{employee.phone}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><HiOutlineCalendar size={14} />Embauché le {fmtDate(employee.hire_date)}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div className="stat-card">
              <div className="stat-val">{employee.seniority_years ?? '—'}</div>
              <div className="stat-lbl">Ans ancienneté</div>
            </div>
            <div className="stat-card">
              <div className="stat-val" style={{ fontSize: '1.1rem' }}>{employee.contract_type?.toUpperCase()}</div>
              <div className="stat-lbl">Type de contrat</div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Professional Info */}
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader icon={<HiOutlineBriefcase />} title="Informations Professionnelles" />
              <div className="info-row">
                <HiOutlineIdentification className="info-icon" size={18} />
                <div>
                  <div className="info-label">Matricule</div>
                  <div className="info-value" style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{employee.employee_id}</div>
                </div>
              </div>
              <div className="info-row">
                <HiOutlineOfficeBuilding className="info-icon" size={18} />
                <div>
                  <div className="info-label">Département</div>
                  <div className="info-value">{employee.department_name || '—'}</div>
                </div>
              </div>
              <div className="info-row">
                <HiOutlineBriefcase className="info-icon" size={18} />
                <div>
                  <div className="info-label">Poste / Fonction</div>
                  <div className="info-value">{employee.position_title || '—'}</div>
                </div>
              </div>
              <div className="info-row">
                <HiOutlineLocationMarker className="info-icon" size={18} />
                <div>
                  <div className="info-label">Site d&apos;affectation</div>
                  <div className="info-value">{employee.location_name || employee.site_location || 'Non défini'}</div>
                </div>
              </div>
              <div className="info-row">
                <HiOutlineCalendar className="info-icon" size={18} />
                <div>
                  <div className="info-label">Date d&apos;embauche</div>
                  <div className="info-value">{fmtDate(employee.hire_date)}</div>
                </div>
              </div>
              {employee.end_date && (
                <div className="info-row">
                  <HiOutlineCalendar className="info-icon" size={18} />
                  <div>
                    <div className="info-label">Date de fin de contrat</div>
                    <div className="info-value" style={{ color: 'var(--warning)' }}>{fmtDate(employee.end_date)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Fiscal & Salary */}
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader icon={<HiOutlineCurrencyDollar />} title="Informations Fiscales & Salariales" />
              <div className="info-row">
                <HiOutlineCurrencyDollar className="info-icon" size={18} />
                <div>
                  <div className="info-label">Salaire brut mensuel</div>
                  <div className="info-value" style={{ color: 'var(--success)', fontSize: '1.1rem', fontWeight: 700 }}>
                    {fmtCurrency(employee.salary)}
                  </div>
                </div>
              </div>
              <div className="info-row">
                <HiOutlineShieldCheck className="info-icon" size={18} />
                <div>
                  <div className="info-label">Numéro CNSS</div>
                  <div className="info-value" style={{ fontFamily: 'monospace' }}>{employee.cnss_number || 'Non renseigné'}</div>
                </div>
              </div>
              <div className="info-row">
                <HiOutlineUserGroup className="info-icon" size={18} />
                <div>
                  <div className="info-label">Quotient familial IRPP</div>
                  <div className="info-value">{employee.family_parts} part(s)</div>
                </div>
              </div>
              <div className="info-row">
                <HiOutlineGlobe className="info-icon" size={18} />
                <div>
                  <div className="info-label">Nationalité / Statut</div>
                  <div className="info-value">
                    {employee.nationality || 'Gabonaise'}
                    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: employee.is_expat ? 'var(--warning)' : 'var(--success)', fontWeight: 700 }}>
                      ({employee.is_expat ? 'Expatrié' : 'National'})
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Contact */}
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader icon={<HiOutlineMail />} title="Contact" />
              <div className="info-row">
                <HiOutlineMail className="info-icon" size={16} />
                <div>
                  <div className="info-label">Email</div>
                  <div className="info-value" style={{ wordBreak: 'break-all' }}>{employee.email}</div>
                </div>
              </div>
              <div className="info-row">
                <HiOutlinePhone className="info-icon" size={16} />
                <div>
                  <div className="info-label">Téléphone</div>
                  <div className="info-value">{employee.phone || '—'}</div>
                </div>
              </div>
              {employee.address && (
                <div className="info-row">
                  <HiOutlineLocationMarker className="info-icon" size={16} />
                  <div>
                    <div className="info-label">Adresse</div>
                    <div className="info-value" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{employee.address}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader icon={<HiOutlineUserGroup />} title="Contact d'urgence" />
              {employee.emergency_contact_name ? (
                <>
                  <div className="info-row">
                    <div>
                      <div className="info-label">Nom</div>
                      <div className="info-value">{employee.emergency_contact_name}</div>
                    </div>
                  </div>
                  <div className="info-row">
                    <HiOutlinePhone className="info-icon" size={16} />
                    <div>
                      <div className="info-label">Téléphone</div>
                      <div className="info-value">{employee.emergency_contact_phone || '—'}</div>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Aucun contact d&apos;urgence renseigné.</p>
              )}
            </div>

            {/* Notes */}
            {employee.notes && (
              <div className="card" style={{ padding: 24 }}>
                <SectionHeader icon={<HiOutlineDocumentDownload />} title="Notes internes" />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {employee.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Print footer */}
        <div className="print-only" style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af' }}>
          <span>Konggest RH · Document confidentiel</span>
          <span>Généré automatiquement · {new Date().toLocaleString('fr-FR')}</span>
        </div>
      </div>
    </>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid var(--border-color)' }}>
      <span style={{ color: 'var(--primary)', display: 'flex' }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
    </div>
  );
}
