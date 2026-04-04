'use client';

/**
 * Konggest — Employees List Page
 * Table with fixed alignment, edit/delete actions, and CRUD modal.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HiOutlineSearch, HiOutlinePlus, HiOutlineFilter, HiOutlineRefresh,
  HiOutlineDownload, HiOutlinePencil, HiOutlineTrash, HiOutlineEye,
  HiOutlineExclamationCircle, HiOutlineCheckCircle
} from 'react-icons/hi';
import api from '@/lib/api';

const STATUS_MAP = {
  active:     { label: 'Actif',     cls: 'badge-success' },
  on_leave:   { label: 'En congé', cls: 'badge-warning' },
  suspended:  { label: 'Suspendu', cls: 'badge-danger'  },
  terminated: { label: 'Terminé',  cls: 'badge-neutral' },
};

const EMPTY_FORM = {
  employee_id: '', cnss_number: '', first_name: '', last_name: '',
  email: '', phone: '', department: '', position: '', location: '',
  site_location: '', contract_type: 'cdi', is_expat: false,
  salary: 0, family_parts: 1.0, status: 'active',
  hire_date: new Date().toISOString().split('T')[0],
};

export default function EmployeesPage() {
  const [employees, setEmployees]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions]   = useState([]);
  const [locations, setLocations]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState(null); // null = create, number = edit
  const [formData, setFormData]     = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]     = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, type: '', text: '' });

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false, type: '', text: '' }), 4000);
  };

  const fetchInitialData = async () => {
    setLoading(true); setError(null);
    try {
      const [empR, deptR, posR, locR] = await Promise.allSettled([
        api.get('/employees/'),
        api.get('/departments/'),
        api.get('/employees/positions/'),
        api.get('/employees/locations/'),
      ]);
      setEmployees(empR.status === 'fulfilled'  ? (empR.value.results  || empR.value  || []) : []);
      setDepartments(deptR.status === 'fulfilled' ? (deptR.value.results || deptR.value || []) : []);
      setPositions(posR.status === 'fulfilled'   ? (posR.value.results  || posR.value  || []) : []);
      setLocations(locR.status === 'fulfilled'   ? (locR.value.results  || locR.value  || []) : []);
    } catch (err) {
      setError('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInitialData(); }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreate = () => {
    setEditId(null);
    setFormData(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (emp) => {
    setEditId(emp.id);
    setFormData({
      employee_id:   emp.employee_id   || '',
      cnss_number:   emp.cnss_number   || '',
      first_name:    emp.first_name    || '',
      last_name:     emp.last_name     || '',
      email:         emp.email         || '',
      phone:         emp.phone         || '',
      department:    emp.department    || '',
      position:      emp.position      || '',
      location:      emp.location      || '',
      site_location: emp.site_location || '',
      contract_type: emp.contract_type || 'cdi',
      is_expat:      emp.is_expat      || false,
      salary:        emp.salary        || 0,
      family_parts:  emp.family_parts  || 1.0,
      status:        emp.status        || 'active',
      hire_date:     emp.hire_date     || new Date().toISOString().split('T')[0],
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFormError('');
    try {
      if (editId) {
        await api.patch(`/employees/${editId}/`, formData);
        showToast('success', 'Employé mis à jour avec succès.');
      } else {
        await api.post('/employees/', formData);
        showToast('success', 'Employé créé avec succès.');
      }
      setShowModal(false);
      fetchInitialData();
    } catch (err) {
      let msg = 'Une erreur est survenue.';
      if (err && typeof err === 'object') {
        const entries = Object.entries(err).filter(([k]) => !['status', 'status_code'].includes(k));
        if (entries.length > 0) {
          msg = entries.map(([field, msgs]) =>
            `${field}: ${Array.isArray(msgs) ? msgs.join(' ') : msgs}`
          ).join('\n');
        }
      }
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/employees/${deleteTarget.id}/`);
      showToast('success', `${deleteTarget.first_name} ${deleteTarget.last_name} supprimé(e).`);
      setDeleteTarget(null);
      fetchInitialData();
    } catch {
      showToast('error', 'Impossible de supprimer cet employé.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.request('/employees/export_csv/', { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([blob]));
      const a    = document.createElement('a');
      a.href = url; a.setAttribute('download', 'employees_export.csv');
      document.body.appendChild(a); a.click(); a.remove();
    } catch { showToast('error', "Erreur lors de l'exportation."); }
  };

  const filtered = (Array.isArray(employees) ? employees : []).filter(emp => {
    const q = `${emp.first_name} ${emp.last_name} ${emp.employee_id} ${emp.email}`.toLowerCase();
    return q.includes(search.toLowerCase()) && (!statusFilter || emp.status === statusFilter);
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Employés</h1>
          <p>Gestion des collaborateurs — Conformité Gabon 2026</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={fetchInitialData} disabled={loading} title="Rafraîchir">
            <HiOutlineRefresh className={loading ? 'spin' : ''} />
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            <HiOutlineDownload /> Export CSV
          </button>
          <button className="btn btn-primary" id="add-employee-btn" onClick={openCreate}>
            <HiOutlinePlus /> Ajouter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-glass mb-lg animate-in" style={{ padding: '16px 20px' }}>
        <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 260 }}>
            <HiOutlineSearch className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher par nom, matricule, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="employee-search"
            />
          </div>
          <div className="flex gap-sm items-center">
            <HiOutlineFilter style={{ color: 'var(--text-muted)' }} />
            <select
              className="input"
              style={{ width: 'auto', minWidth: 180 }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="on_leave">En congé</option>
              <option value="suspended">Suspendu</option>
              <option value="terminated">Terminé</option>
            </select>
            <span className="badge badge-neutral">
              {filtered.length} collaborateur{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card mb-lg" style={{ padding: 16, border: '1px solid var(--danger)', background: 'rgba(239,68,68,0.08)' }}>
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="card animate-in" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                <th style={TH}>Matricule</th>
                <th style={TH}>Collaborateur</th>
                <th style={TH}>Département / Poste</th>
                <th style={{ ...TH, textAlign: 'center' }}>Contrat</th>
                <th style={{ ...TH, textAlign: 'center' }}>Statut</th>
                <th style={{ ...TH, textAlign: 'center' }}>Embauche</th>
                <th style={{ ...TH, textAlign: 'center', width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} style={{ padding: '16px 20px' }}>
                        <div className="skeleton" style={{ height: 16, borderRadius: 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={TD}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>
                        {emp.employee_id}
                      </span>
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar avatar-sm" style={{ flexShrink: 0, fontSize: '0.8rem', fontWeight: 700 }}>
                          {emp.photo
                            ? <img src={emp.photo} alt={`${emp.first_name}`} />
                            : `${(emp.first_name||'?')[0]}${(emp.last_name||'?')[0]}`}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={TD}>
                      <div style={{ fontWeight: 500, fontSize: '0.87rem' }}>{emp.department_name || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.position_title || '—'}</div>
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span className={`badge ${emp.contract_type === 'cdi' ? 'badge-primary' : emp.contract_type === 'cdd' ? 'badge-warning' : 'badge-neutral'}`}>
                        {emp.contract_type?.toUpperCase() || '—'}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span className={`badge ${STATUS_MAP[emp.status]?.cls || 'badge-neutral'}`}>
                        {STATUS_MAP[emp.status]?.label || emp.status}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <Link href={`/employees/${emp.id}`} className="btn btn-ghost btn-sm" title="Voir le profil" style={{ padding: '6px 8px' }}>
                          <HiOutlineEye size={16} />
                        </Link>
                        <button className="btn btn-ghost btn-sm" title="Modifier" style={{ padding: '6px 8px', color: 'var(--primary)' }}
                          onClick={() => openEdit(emp)}>
                          <HiOutlinePencil size={16} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Supprimer" style={{ padding: '6px 8px', color: 'var(--danger)' }}
                          onClick={() => setDeleteTarget(emp)}>
                          <HiOutlineTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aucun employé trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 780, width: '95%' }}>
            <div className="modal-header">
              <div>
                <h2>{editId ? 'Modifier le collaborateur' : 'Ajouter un collaborateur'}</h2>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                  {editId ? 'Mettez à jour les informations du profil.' : 'Renseignez les informations — Réglementation Gabon 2026.'}
                </p>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {formError && (
              <div style={{ margin: '0 24px 8px', padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <HiOutlineExclamationCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                <pre style={{ margin: 0, fontSize: '0.82rem', color: 'var(--danger)', whiteSpace: 'pre-wrap' }}>{formError}</pre>
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-body">
              {/* Section : Identité */}
              <SectionTitle>Identité professionnelle</SectionTitle>
              <div className="grid grid-2 gap-md">
                <Field label="Matricule *"><input className="input" name="employee_id" value={formData.employee_id} onChange={handleInputChange} required placeholder="EMP-2026-001" /></Field>
                <Field label="Numéro CNSS"><input className="input" name="cnss_number" value={formData.cnss_number} onChange={handleInputChange} placeholder="123456-A" /></Field>
                <Field label="Prénom *"><input className="input" name="first_name" value={formData.first_name} onChange={handleInputChange} required /></Field>
                <Field label="Nom de famille *"><input className="input" name="last_name" value={formData.last_name} onChange={handleInputChange} required /></Field>
                <Field label="Email professionnel *"><input className="input" type="email" name="email" value={formData.email} onChange={handleInputChange} required /></Field>
                <Field label="Téléphone"><input className="input" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+241 ..." /></Field>
              </div>

              {/* Section : Organisation */}
              <SectionTitle>Organisation</SectionTitle>
              <div className="grid grid-2 gap-md">
                <Field label="Département">
                  <select className="input" name="department" value={formData.department} onChange={handleInputChange}>
                    <option value="">Sélectionner...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="Site / Lieu">
                  <select className="input" name="location" value={formData.location} onChange={handleInputChange}>
                    <option value="">Sélectionner un site...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </Field>
                <Field label="Type de contrat">
                  <select className="input" name="contract_type" value={formData.contract_type} onChange={handleInputChange}>
                    <option value="cdi">CDI</option>
                    <option value="cdd">CDD</option>
                    <option value="interim">Intérim</option>
                    <option value="stage">Stage</option>
                    <option value="apprentissage">Apprentissage</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </Field>
                <Field label="Statut">
                  <select className="input" name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="active">Actif</option>
                    <option value="on_leave">En congé</option>
                    <option value="suspended">Suspendu</option>
                    <option value="terminated">Terminé</option>
                  </select>
                </Field>
                <Field label="Date d'embauche *"><input className="input" type="date" name="hire_date" value={formData.hire_date} onChange={handleInputChange} required /></Field>
              </div>

              {/* Section : Fiscal */}
              <SectionTitle>Informations fiscales (Gabon)</SectionTitle>
              <div className="grid grid-2 gap-md">
                <Field label="Salaire brut mensuel (XAF) *"><input className="input" type="number" name="salary" value={formData.salary} onChange={handleInputChange} required min={0} /></Field>
                <Field label="Parts IRPP (Quotient familial)"><input className="input" type="number" step="0.5" name="family_parts" value={formData.family_parts} onChange={handleInputChange} /></Field>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <input type="checkbox" id="is_expat" name="is_expat" checked={formData.is_expat} onChange={handleInputChange} />
                <label htmlFor="is_expat" style={{ margin: 0, cursor: 'pointer', fontSize: '0.9rem' }}>Cet employé est un expatrié</label>
              </div>

              <div className="modal-footer mt-lg">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (editId ? 'Mise à jour...' : 'Création...') : (editId ? 'Enregistrer les modifications' : 'Créer le profil')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 440 }}>
            <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <HiOutlineTrash size={24} style={{ color: 'var(--danger)' }} />
              </div>
              <h2 style={{ marginBottom: 8 }}>Confirmer la suppression</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
                Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong> ?
                Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-sm" style={{ justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}
                style={{ background: 'var(--danger)', color: '#fff' }}>
                {deleting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
          padding: '14px 20px', borderRadius: 10, background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
          color: '#fff', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'center', gap: 10, minWidth: 280
        }}>
          {toast.type === 'success' ? <HiOutlineCheckCircle size={20} /> : <HiOutlineExclamationCircle size={20} />}
          <span style={{ fontWeight: 500 }}>{toast.text}</span>
        </div>
      )}

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// Helpers
const TH = { padding: '14px 20px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' };
const TD = { padding: '14px 20px', verticalAlign: 'middle' };

function SectionTitle({ children }) {
  return (
    <div style={{ margin: '20px 0 12px', paddingBottom: 8, borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="input-group">
      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>{label}</label>
      {children}
    </div>
  );
}
