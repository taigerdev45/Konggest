'use client';

/**
 * Konggest — Employee Detail Page
 * Professional profile view with single-page PDF export including company name.
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
import { useAuth } from '@/contexts/AuthContext';

const STATUS_MAP = {
  active:     { label: 'Actif',     cls: 'badge-success',  color: '#10b981' },
  on_leave:   { label: 'En congé', cls: 'badge-warning',  color: '#f59e0b' },
  suspended:  { label: 'Suspendu', cls: 'badge-danger',   color: '#ef4444' },
  terminated: { label: 'Terminé',  cls: 'badge-neutral',  color: '#6b7280' },
};

export default function EmployeeDetailPage() {
  const params   = useParams();
  const { user } = useAuth();
  const printRef = useRef(null);
  const { id }   = params;

  const [employee, setEmployee]       = useState(null);
  const [orgName, setOrgName]         = useState('');
  const [loading,  setLoading]        = useState(true);
  const [error,    setError]          = useState(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const [empData, orgData] = await Promise.allSettled([
          api.get(`/employees/${id}/`),
          api.get('/accounts/organizations/me/'),
        ]);
        if (empData.status === 'fulfilled') setEmployee(empData.value);
        else setError(empData.reason?.error || 'Employé non trouvé.');
        if (orgData.status === 'fulfilled') setOrgName(orgData.value?.name || '');
      } catch (err) {
        setError(err?.error || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetch_();
  }, [id]);

  const handlePrintPDF = () => window.print();

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

  const status      = STATUS_MAP[employee.status] || STATUS_MAP.active;
  const fmtCurrency = (n) => new Intl.NumberFormat('fr-GA', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n || 0);
  const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const initials    = `${(employee.first_name || '?')[0]}${(employee.last_name || '?')[0]}`;
  const companyName = orgName || user?.organization || 'Konggest';
  const printDate   = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <>
      <style>{`
        /* ════════════════════════════════════════
           PRINT — Fiche employé sur UNE seule page
           ════════════════════════════════════════ */
        @page {
          size: A4 portrait;
          margin: 12mm 14mm 12mm 14mm;
        }
        @media print {
          /* Afficher uniquement la div d'impression, masquer le reste de la page */
          .no-print { display: none !important; }
          #emp-print-root { display: block !important; }

          /* Reset couleurs pour l'impression */
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { background: #fff !important; color: #1e293b !important; font-family: 'Arial', sans-serif !important; font-size: 9pt !important; }

          /* Cards compactes */
          .pcard {
            border: 1px solid #e2e8f0 !important;
            border-radius: 6px !important;
            background: #fff !important;
            box-shadow: none !important;
            padding: 10px 14px !important;
            break-inside: avoid !important;
          }

          /* Grille 2 colonnes pour l'impression A4 */
          .print-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .print-grid-3 { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 8px !important; }

          /* Typographie compacte */
          .p-title { font-size: 8pt !important; color: #64748b !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.04em !important; margin-bottom: 2px !important; }
          .p-val   { font-size: 9.5pt !important; font-weight: 600 !important; color: #0f172a !important; }
          .p-badge { display: inline-block !important; padding: 2px 8px !important; border-radius: 20px !important; font-size: 7.5pt !important; font-weight: 700 !important; }

          /* En-tête */
          .print-header { border-bottom: 2.5px solid #059669 !important; padding-bottom: 10px !important; margin-bottom: 12px !important; }
          .print-footer { border-top: 1px solid #e2e8f0 !important; padding-top: 6px !important; margin-top: 12px !important; font-size: 7.5pt !important; color: #94a3b8 !important; }

          /* Section titles */
          .p-section { font-size: 7pt !important; font-weight: 800 !important; text-transform: uppercase !important; color: #059669 !important; letter-spacing: 0.08em !important; margin-bottom: 6px !important; padding-bottom: 4px !important; border-bottom: 1px solid #e2e8f0 !important; }

          /* Tableau de données */
          .p-table { width: 100% !important; border-collapse: collapse !important; font-size: 8.5pt !important; }
          .p-table td { padding: 4px 6px !important; border-bottom: 1px solid #f1f5f9 !important; vertical-align: top !important; }
          .p-table td:first-child { color: #64748b !important; font-weight: 600 !important; width: 42% !important; }

          /* Hero compact */
          .p-hero { display: flex !important; align-items: center !important; gap: 14px !important; padding: 10px 14px !important; background: #f8fafc !important; border-radius: 8px !important; border: 1px solid #e2e8f0 !important; margin-bottom: 12px !important; }
          .p-avatar { width: 50px !important; height: 50px !important; border-radius: 50% !important; background: #059669 !important; color: #fff !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 18pt !important; font-weight: 800 !important; flex-shrink: 0 !important; }
        }

        /* Web styles (hidden) */
        .print-show { display: none; }
        .info-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border-color); }
        .info-row:last-child { border-bottom: none; }
        .info-icon { color: var(--primary); flex-shrink: 0; margin-top: 2px; }
        .info-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
        .info-value { font-size: 0.92rem; font-weight: 500; color: var(--text-primary); }
        .stat-card-sm { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 18px; text-align: center; }
        .stat-card-sm .sv { font-size: 1.5rem; font-weight: 800; color: var(--primary); }
        .stat-card-sm .sl { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
      `}</style>

      {/* ═══════════════════════════
          WEB VIEW (normal dashboard)
          ═══════════════════════════ */}
      <div className="no-print">
        {/* Toolbar */}
        <div className="page-header" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/employees" className="btn btn-ghost btn-sm" style={{ padding: '8px 12px' }}>
              <HiOutlineArrowLeft size={18} />
            </Link>
            <div>
              <h1 style={{ marginBottom: 2 }}>{employee.first_name} {employee.last_name}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fiche collaborateur · {employee.employee_id}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handlePrintPDF} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlinePrinter size={16} /> Exporter PDF
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="card animate-in" style={{ marginBottom: 20, padding: 28, display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', boxShadow: '0 4px 20px rgba(5, 150, 105, 0.3)' }}>
            {employee.photo ? <img src={employee.photo} alt={initials} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}
          </div>
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
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div className="stat-card-sm"><div className="sv">{employee.seniority_years ?? '—'}</div><div className="sl">Ancienneté</div></div>
            <div className="stat-card-sm"><div className="sv" style={{ fontSize: '1.1rem' }}>{employee.contract_type?.toUpperCase()}</div><div className="sl">Contrat</div></div>
          </div>
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader icon={<HiOutlineBriefcase />} title="Informations Professionnelles" />
              <InfoItem icon={<HiOutlineIdentification size={16} />} label="Matricule" value={<code style={{ color: 'var(--primary)', fontWeight: 700 }}>{employee.employee_id}</code>} />
              <InfoItem icon={<HiOutlineOfficeBuilding size={16} />} label="Département" value={employee.department_name || '—'} />
              <InfoItem icon={<HiOutlineBriefcase size={16} />} label="Poste" value={employee.position_title || '—'} />
              <InfoItem icon={<HiOutlineLocationMarker size={16} />} label="Site" value={employee.location_name || employee.site_location || '—'} />
              <InfoItem icon={<HiOutlineCalendar size={16} />} label="Date d'embauche" value={fmtDate(employee.hire_date)} />
              {employee.end_date && <InfoItem icon={<HiOutlineCalendar size={16} />} label="Fin de contrat" value={<span style={{ color: 'var(--warning)' }}>{fmtDate(employee.end_date)}</span>} />}
            </div>
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader icon={<HiOutlineCurrencyDollar />} title="Informations Fiscales &amp; Salariales" />
              <InfoItem icon={<HiOutlineCurrencyDollar size={16} />} label="Salaire brut mensuel" value={<span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '1.05rem' }}>{fmtCurrency(employee.salary)}</span>} />
              <InfoItem icon={<HiOutlineShieldCheck size={16} />} label="Numéro CNSS" value={<code>{employee.cnss_number || 'Non renseigné'}</code>} />
              <InfoItem icon={<HiOutlineUserGroup size={16} />} label="Quotient familial IRPP" value={`${employee.family_parts} part(s)`} />
              <InfoItem icon={<HiOutlineGlobe size={16} />} label="Nationalité / Statut" value={`${employee.nationality || 'Gabonaise'} (${employee.is_expat ? 'Expatrié' : 'National'})`} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader icon={<HiOutlineMail />} title="Contact" />
              <InfoItem icon={<HiOutlineMail size={16} />} label="Email" value={employee.email} />
              <InfoItem icon={<HiOutlinePhone size={16} />} label="Téléphone" value={employee.phone || '—'} />
              {employee.address && <InfoItem icon={<HiOutlineLocationMarker size={16} />} label="Adresse" value={employee.address} />}
            </div>
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader icon={<HiOutlineUserGroup />} title="Contact d'urgence" />
              {employee.emergency_contact_name
                ? <><InfoItem label="Nom" value={employee.emergency_contact_name} /><InfoItem icon={<HiOutlinePhone size={16} />} label="Téléphone" value={employee.emergency_contact_phone || '—'} /></>
                : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Aucun contact renseigné.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          PRINT-ONLY VIEW — UNE SEULE PAGE
          ══════════════════════════════════ */}
      <div id="emp-print-root" className="print-show" style={{ display: 'none' }}>
        {/* En-tête */}
        <div className="print-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '18pt', fontWeight: 900, color: '#059669', letterSpacing: '-0.5px', lineHeight: 1 }}>{companyName}</div>
            <div style={{ fontSize: '9pt', color: '#64748b', marginTop: 3 }}>Système de Gestion RH · Konggest · Gabon 2026</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11pt', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em' }}>FICHE COLLABORATEUR</div>
            <div style={{ fontSize: '8pt', color: '#94a3b8', marginTop: 2 }}>Document confidentiel — Généré le {printDate}</div>
          </div>
        </div>

        {/* Hero compact */}
        <div className="p-hero">
          <div className="p-avatar">{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14pt', fontWeight: 800, color: '#0f172a' }}>{employee.first_name} {employee.last_name}</div>
            <div style={{ fontSize: '9pt', color: '#475569', margin: '2px 0' }}>{employee.position_title} · {employee.department_name}</div>
            <div style={{ display: 'flex', gap: 14, fontSize: '8pt', color: '#64748b', marginTop: 4, flexWrap: 'wrap' }}>
              <span>✉ {employee.email}</span>
              {employee.phone && <span>📞 {employee.phone}</span>}
              <span>📅 Embauché le {fmtDate(employee.hire_date)}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '8pt', color: '#64748b' }}>Matricule</div>
            <div style={{ fontSize: '10pt', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>{employee.employee_id}</div>
            <div style={{ marginTop: 6, display: 'inline-block', padding: '2px 10px', borderRadius: 20, background: status.color + '22', border: `1px solid ${status.color}`, color: status.color, fontSize: '7.5pt', fontWeight: 800 }}>
              {status.label}
            </div>
          </div>
        </div>

        {/* 2 colonnes */}
        <div className="print-grid" style={{ marginBottom: 10 }}>

          {/* Colonne Gauche */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Infos Pro */}
            <div className="pcard">
              <div className="p-section">🏢 Informations Professionnelles</div>
              <table className="p-table">
                <tbody>
                  <tr><td>Département</td><td style={{ fontWeight: 600 }}>{employee.department_name || '—'}</td></tr>
                  <tr><td>Poste / Fonction</td><td style={{ fontWeight: 600 }}>{employee.position_title || '—'}</td></tr>
                  <tr><td>Site d'affectation</td><td>{employee.location_name || employee.site_location || '—'}</td></tr>
                  <tr><td>Type de contrat</td><td><span style={{ fontWeight: 700, color: '#0f172a' }}>{employee.contract_type?.toUpperCase()}</span></td></tr>
                  <tr><td>Date d'embauche</td><td>{fmtDate(employee.hire_date)}</td></tr>
                  {employee.end_date && <tr><td>Fin de contrat</td><td style={{ color: '#f59e0b', fontWeight: 600 }}>{fmtDate(employee.end_date)}</td></tr>}
                  <tr><td>Ancienneté</td><td>{employee.seniority_years !== undefined ? `${employee.seniority_years} an(s)` : '—'}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Contact */}
            <div className="pcard">
              <div className="p-section">📞 Contact & Adresse</div>
              <table className="p-table">
                <tbody>
                  <tr><td>Email</td><td>{employee.email}</td></tr>
                  <tr><td>Téléphone</td><td>{employee.phone || '—'}</td></tr>
                  <tr><td>Adresse</td><td style={{ whiteSpace: 'pre-wrap' }}>{employee.address || '—'}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Contact urgence */}
            <div className="pcard">
              <div className="p-section">🚨 Contact d'Urgence</div>
              <table className="p-table">
                <tbody>
                  <tr><td>Nom</td><td style={{ fontWeight: 600 }}>{employee.emergency_contact_name || '—'}</td></tr>
                  <tr><td>Téléphone</td><td>{employee.emergency_contact_phone || '—'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Colonne Droite */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Fiscal & Salaire */}
            <div className="pcard">
              <div className="p-section">💰 Rémunération &amp; Fiscalité (Gabon)</div>
              <table className="p-table">
                <tbody>
                  <tr>
                    <td>Salaire brut mensuel</td>
                    <td style={{ fontWeight: 800, color: '#059669', fontSize: '10pt' }}>{fmtCurrency(employee.salary)}</td>
                  </tr>
                  <tr><td>Numéro CNSS</td><td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{employee.cnss_number || 'Non renseigné'}</td></tr>
                  <tr><td>Quotient familial IRPP</td><td>{employee.family_parts} part(s)</td></tr>
                  <tr><td>Nationalité</td><td>{employee.nationality || 'Gabonaise'}</td></tr>
                  <tr>
                    <td>Statut</td>
                    <td>
                      <span style={{ padding: '1px 8px', borderRadius: 12, background: employee.is_expat ? '#fef3c7' : '#d1fae5', color: employee.is_expat ? '#92400e' : '#065f46', fontWeight: 700, fontSize: '7.5pt' }}>
                        {employee.is_expat ? 'Expatrié' : 'National'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {employee.notes && (
              <div className="pcard">
                <div className="p-section">📝 Notes Internes</div>
                <p style={{ fontSize: '8.5pt', color: '#475569', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{employee.notes}</p>
              </div>
            )}

            {/* Signature box */}
            <div className="pcard" style={{ marginTop: 'auto' }}>
              <div className="p-section">✍️ Validation</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                <div>
                  <div style={{ fontSize: '7pt', color: '#94a3b8', marginBottom: 30 }}>Responsable RH</div>
                  <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 4, fontSize: '7.5pt', color: '#64748b' }}>Signature & Cachet</div>
                </div>
                <div>
                  <div style={{ fontSize: '7pt', color: '#94a3b8', marginBottom: 30 }}>Direction Générale</div>
                  <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 4, fontSize: '7.5pt', color: '#64748b' }}>Signature & Cachet</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="print-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{companyName} — Document Ressources Humaines — Confidentiel</span>
          <span>Konggest RH © {new Date().getFullYear()} · Généré le {printDate}</span>
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

function InfoItem({ icon, label, value }) {
  return (
    <div className="info-row">
      {icon && <span className="info-icon">{icon}</span>}
      <div>
        <div className="info-label">{label}</div>
        <div className="info-value">{value}</div>
      </div>
    </div>
  );
}

