'use client';

/**
 * Konggest — Employees List Page
 * Version finale sprint P1+P2 (2026-04-11)
 *
 * T6  : Pagination (count, next, previous, page)
 * T11 : Filtres backend (search, status, contract_type, is_expat)
 * T12 : Import CSV avec modal upload
 * T14 : Champ position dans le formulaire modal
 * T15 : Validation CNSS, matricule, téléphone
 * T16 : Realtime Supabase — refresh auto sur employee.created / employee.deleted
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import Link from 'next/link';
import {
  HiOutlineSearch, HiOutlinePlus, HiOutlineFilter, HiOutlineRefresh,
  HiOutlineDownload, HiOutlinePencil, HiOutlineTrash, HiOutlineEye,
  HiOutlineExclamationCircle, HiOutlineCheckCircle, HiOutlineUpload,
  HiOutlineChevronLeft, HiOutlineChevronRight,
} from 'react-icons/hi';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';

// ─── Constantes ───

const STATUS_MAP = {
  active:     { label: 'Actif',     cls: 'badge-success' },
  on_leave:   { label: 'En congé', cls: 'badge-warning'  },
  suspended:  { label: 'Suspendu', cls: 'badge-danger'   },
  terminated: { label: 'Terminé',  cls: 'badge-neutral'  },
};

const CONTRACT_COLORS = {
  cdi: 'badge-primary',
  cdd: 'badge-warning',
  interim: 'badge-neutral',
  stage: 'badge-neutral',
  apprentissage: 'badge-neutral',
  freelance: 'badge-neutral',
};

const EMPTY_FORM = {
  employee_id: '', cnss_number: '', first_name: '', last_name: '',
  email: '', phone: '', gender: '', department: '', position_text: '',
  location: '', contract_type: 'cdi', is_expat: false,
  salary: 0, family_parts: 1.0, status: 'active',
  hire_date: new Date().toISOString().split('T')[0],
};

// ─── Validation ───

const validate = (form) => {
  const errors = {};
  if (!form.employee_id.trim()) errors.employee_id = 'Matricule requis.';
  else if (!/^[A-Z0-9\-_.]{2,20}$/i.test(form.employee_id))
    errors.employee_id = 'Format invalide (ex: EMP-2026-001).';

  if (!form.first_name.trim()) errors.first_name = 'Prénom requis.';
  if (!form.last_name.trim()) errors.last_name = 'Nom requis.';

  if (!form.email.trim()) errors.email = 'Email requis.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Format email invalide.';

  if (form.phone && !/^\+?[\d\s\-().]{7,20}$/.test(form.phone))
    errors.phone = 'Format téléphone invalide (ex: +241 01 23 45 67).';

  if (form.cnss_number && !/^[\d\-A-Z]{4,20}$/i.test(form.cnss_number))
    errors.cnss_number = 'Format CNSS invalide (ex: 123456-A).';

  if (!form.hire_date) errors.hire_date = "Date d'embauche requise.";

  if (form.salary < 0) errors.salary = 'Le salaire ne peut pas être négatif.';

  return errors;
};

// ─── Composant principal ───

export default function EmployeesPage() {
  const [employees, setEmployees]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions]     = useState([]);
  const [locations, setLocations]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  // Filtres — envoyés au backend
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [isExpatFilter, setIsExpatFilter]   = useState('');

  // Pagination
  const [pagination, setPagination]   = useState({ count: 0, next: null, previous: null, page: 1 });

  // Debounce search
  const searchTimer = useRef(null);

  // Modal CRUD
  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState(null);
  const [formData, setFormData]     = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Modal suppression
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]     = useState(false);

  // Modal import CSV
  const [showImport, setShowImport] = useState(false);
  useScrollLock(showModal || !!deleteTarget || showImport);
  const [csvFile, setCsvFile]       = useState(null);
  const [importing, setImporting]   = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, type: '', text: '' });
  // T16 : indicateur de connexion Realtime
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // ── Helpers ──

  const showToast = useCallback((type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false, type: '', text: '' }), 4000);
  }, []);

  // ── FIX T11 : fetch avec paramètres API (filtrage côté backend) ──
  const fetchEmployees = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search)         params.set('search', search);
      if (statusFilter)   params.set('status', statusFilter);
      if (contractFilter) params.set('contract_type', contractFilter);
      if (isExpatFilter)  params.set('is_expat', isExpatFilter);
      params.set('page', page);

      const data = await api.get(`/employees/?${params.toString()}`);
      // Gère les deux formats : paginé ({count, results}) et liste simple
      if (data && data.results !== undefined) {
        setEmployees(data.results || []);
        setPagination({
          count: data.count || 0,
          next: data.next,
          previous: data.previous,
          page,
        });
      } else {
        setEmployees(Array.isArray(data) ? data : []);
        setPagination({ count: Array.isArray(data) ? data.length : 0, next: null, previous: null, page: 1 });
      }
    } catch (err) {
      setError('Erreur lors du chargement des employés.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, contractFilter, isExpatFilter]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [deptR, posR, locR] = await Promise.allSettled([
        api.get('/departments/'),
        api.get('/employees/positions/'),
        api.get('/employees/locations/'),
      ]);
      setDepartments(deptR.status === 'fulfilled' ? (deptR.value.results || deptR.value || []) : []);
      setPositions(posR.status === 'fulfilled'    ? (posR.value.results  || posR.value  || []) : []);
      setLocations(locR.status === 'fulfilled'    ? (locR.value.results  || locR.value  || []) : []);
    } catch (e) {
      console.warn('Erreur chargement données de référence:', e);
    }
  }, []);

  // Debounce search pour éviter les appels API à chaque frappe
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchEmployees(1);
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search, statusFilter, contractFilter, isExpatFilter, fetchEmployees]);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  // ── T16 : Realtime Supabase — refresh auto sur events employés ──
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;

    // Récupérer le tenant_id depuis le JWT déjà stocké dans le localStorage par le contexte Auth
    let tenantId = null;
    try {
      const raw = localStorage.getItem('konggest_user');
      if (raw) tenantId = JSON.parse(raw)?.user_metadata?.tenant_id;
    } catch {}

    if (!tenantId) return;

    const channel = supabase.channel(`employees:${tenantId}`)
      .on('broadcast', { event: 'employee.created' }, () => {
        fetchEmployees(pagination.page);
        showToast('success', '🟢 Nouvel employé ajouté en temps réel.');
      })
      .on('broadcast', { event: 'employee.deleted' }, () => {
        fetchEmployees(pagination.page);
        showToast('success', '🟡 Employé supprimé — liste rafraîchie.');
      })
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filtrage de positions par département sélectionné ──
  const filteredPositions = formData.department
    ? positions.filter(p => String(p.department) === String(formData.department))
    : positions;

  // ── Formulaire ──

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const openCreate = () => {
    setEditId(null);
    setFormData(EMPTY_FORM);
    setFormError('');
    setFieldErrors({});
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
      gender:        emp.gender        || '',
      department:    emp.department    || '',
      position_text: emp.position_title || '',
      location:      emp.location      || '',
      contract_type: emp.contract_type || 'cdi',
      is_expat:      emp.is_expat      || false,
      salary:        emp.salary        || 0,
      family_parts:  emp.family_parts  || 1.0,
      status:        emp.status        || 'active',
      hire_date:     emp.hire_date     || new Date().toISOString().split('T')[0],
    });
    setFormError('');
    setFieldErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // FIX T15 : validation locale avant envoi API
    const errors = validate(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      if (editId) {
        await api.patch(`/employees/${editId}/`, formData);
        showToast('success', 'Collaborateur mis à jour avec succès.');
      } else {
        await api.post('/employees/', formData);
        showToast('success', 'Collaborateur créé avec succès.');
      }
      setShowModal(false);
      fetchEmployees(pagination.page);
    } catch (err) {
      let msg = 'Une erreur est survenue.';
      if (err && typeof err === 'object') {
        const entries = Object.entries(err).filter(([k]) => !['status', 'status_code'].includes(k));
        if (entries.length > 0) {
          msg = entries.map(([f, msgs]) =>
            `${f}: ${Array.isArray(msgs) ? msgs.join(' ') : msgs}`
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
      showToast('success', `${deleteTarget.first_name} ${deleteTarget.last_name} supprimé(e) et archivé(e).`);
      setDeleteTarget(null);
      fetchEmployees(pagination.page);
    } catch {
      showToast('error', 'Impossible de supprimer ce collaborateur.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.request('/employees/export_csv/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `employes_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('error', "Erreur lors de l'exportation.");
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      const result = await api.request('/employees/import_csv/', {
        method: 'POST',
        body: fd,
        headers: {}, // laisser le navigateur gérer Content-Type multipart
      });
      const msg = `${result.created} employé(s) importé(s).${result.total_errors > 0 ? ` ${result.total_errors} erreur(s).` : ''}`;
      showToast(result.total_errors > 0 ? 'error' : 'success', msg);
      setShowImport(false);
      setCsvFile(null);
      fetchEmployees(1);
    } catch {
      showToast('error', "Erreur lors de l'importation CSV.");
    } finally {
      setImporting(false);
    }
  };

  // ── Rendu ──

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Employés</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Gestion des collaborateurs — Conformité Gabon 2026
            {/* T16 : indicateur Realtime */}
            <span title={realtimeConnected ? 'Realtime actif' : 'Realtime inactif'} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: '0.72rem', color: realtimeConnected ? 'var(--success)' : 'var(--text-muted)',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: realtimeConnected ? 'var(--success)' : 'var(--text-muted)',
                display: 'inline-block',
                animation: realtimeConnected ? 'pulse 2s infinite' : 'none',
              }} />
              {realtimeConnected ? 'Live' : 'Offline'}
            </span>
          </p>
        </div>
        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => fetchEmployees(pagination.page)} disabled={loading} title="Rafraîchir">
            <HiOutlineRefresh className={loading ? 'spin' : ''} />
          </button>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            <HiOutlineUpload /> Import CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            <HiOutlineDownload /> Export CSV
          </button>
          <button className="btn btn-primary" id="add-employee-btn" onClick={openCreate}>
            <HiOutlinePlus /> Ajouter
          </button>
        </div>
      </div>

      {/* Filtres — FIX T11 : envoyés au backend */}
      <div className="card-glass mb-lg animate-in" style={{ padding: '16px 20px' }}>
        <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 240 }}>
            <HiOutlineSearch className="search-icon" />
            <input
              type="text"
              placeholder="Nom, matricule, email, CNSS..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="employee-search"
            />
          </div>
          <div className="flex gap-sm items-center" style={{ flexWrap: 'wrap' }}>
            <HiOutlineFilter style={{ color: 'var(--text-muted)' }} />
            <select className="input" style={{ width: 'auto', minWidth: 160 }}
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="on_leave">En congé</option>
              <option value="suspended">Suspendu</option>
              <option value="terminated">Terminé</option>
            </select>
            <select className="input" style={{ width: 'auto', minWidth: 140 }}
              value={contractFilter} onChange={e => setContractFilter(e.target.value)}>
              <option value="">Tous contrats</option>
              <option value="cdi">CDI</option>
              <option value="cdd">CDD</option>
              <option value="interim">Intérim</option>
              <option value="stage">Stage</option>
              <option value="freelance">Freelance</option>
            </select>
            <select className="input" style={{ width: 'auto', minWidth: 140 }}
              value={isExpatFilter} onChange={e => setIsExpatFilter(e.target.value)}>
              <option value="">Tous profils</option>
              <option value="true">Expatriés</option>
              <option value="false">Nationaux</option>
            </select>
            <span className="badge badge-neutral">
              {pagination.count} collaborateur{pagination.count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Erreur */}
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
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                <th style={TH}>Matricule</th>
                <th style={TH}>Collaborateur</th>
                <th style={TH}>Département / Poste</th>
                <th style={TH}>Site</th>
                <th style={{ ...TH, textAlign: 'center' }}>Contrat</th>
                <th style={{ ...TH, textAlign: 'center' }}>Statut</th>
                <th style={{ ...TH, textAlign: 'center' }}>Embauche</th>
                <th style={{ ...TH, textAlign: 'center', width: 130 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} style={{ padding: '16px 18px' }}>
                        <div className="skeleton" style={{ height: 14, borderRadius: 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : employees.length > 0 ? (
                employees.map(emp => (
                  <tr key={emp.id}
                    style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={TD}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '0.83rem' }}>
                          {emp.employee_id}
                        </span>
                        {emp.is_expat && (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                            Expatrié
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm" style={{ flexShrink: 0, fontSize: '0.78rem', fontWeight: 700 }}>
                          {emp.photo
                            ? <img src={emp.photo} alt={emp.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : `${(emp.first_name || '?')[0]}${(emp.last_name || '?')[0]}`}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={TD}>
                      <div style={{ fontWeight: 500, fontSize: '0.87rem' }}>{emp.department_name || '—'}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{emp.position_title || '—'}</div>
                    </td>
                    <td style={TD}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {emp.location_name || '—'}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span className={`badge ${CONTRACT_COLORS[emp.contract_type] || 'badge-neutral'}`}>
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
                        <Link href={`/employees/${emp.id}`} className="btn btn-ghost btn-sm" title="Voir le profil" style={{ padding: '5px 7px' }}>
                          <HiOutlineEye size={15} />
                        </Link>
                        <button className="btn btn-ghost btn-sm" title="Modifier" style={{ padding: '5px 7px', color: 'var(--primary)' }}
                          onClick={() => openEdit(emp)}>
                          <HiOutlinePencil size={15} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Supprimer" style={{ padding: '5px 7px', color: 'var(--danger)' }}
                          onClick={() => setDeleteTarget(emp)}>
                          <HiOutlineTrash size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aucun collaborateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(pagination.next || pagination.previous) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
              Page {pagination.page} — {pagination.count} résultat{pagination.count !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" disabled={!pagination.previous}
                onClick={() => fetchEmployees(pagination.page - 1)}>
                <HiOutlineChevronLeft /> Précédent
              </button>
              <button className="btn btn-ghost btn-sm" disabled={!pagination.next}
                onClick={() => fetchEmployees(pagination.page + 1)}>
                Suivant <HiOutlineChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Créer / Modifier ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 800, width: '95%' }}>
            <div className="modal-header">
              <div>
                <h2>{editId ? 'Modifier le collaborateur' : 'Ajouter un collaborateur'}</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {editId ? 'Mettez à jour les informations du profil.' : 'Réglementation Gabon 2026 — Tous les champs * sont requis.'}
                </p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid var(--danger)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <HiOutlineExclamationCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
                <pre style={{ margin: 0, fontSize: '0.8rem', color: 'var(--danger)', whiteSpace: 'pre-wrap' }}>{formError}</pre>
              </div>
            )}
              {/* Identité */}
              <SectionTitle>Identité</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' }}>
                <Field label="Matricule *" error={fieldErrors.employee_id}>
                  <input className="input" name="employee_id" value={formData.employee_id}
                    onChange={handleInputChange} required placeholder="EMP-2026-001" />
                </Field>
                <Field label="Numéro CNSS" error={fieldErrors.cnss_number}>
                  <input className="input" name="cnss_number" value={formData.cnss_number}
                    onChange={handleInputChange} placeholder="123456-A" />
                </Field>
                <Field label="Genre">
                  <select className="input" name="gender" value={formData.gender} onChange={handleInputChange}>
                    <option value="">Non spécifié</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="O">Autre</option>
                  </select>
                </Field>
                <Field label="Prénom *" error={fieldErrors.first_name}>
                  <input className="input" name="first_name" value={formData.first_name}
                    onChange={handleInputChange} required />
                </Field>
                <Field label="Nom de famille *" error={fieldErrors.last_name}>
                  <input className="input" name="last_name" value={formData.last_name}
                    onChange={handleInputChange} required />
                </Field>
                <Field label="Téléphone" error={fieldErrors.phone}>
                  <input className="input" name="phone" value={formData.phone}
                    onChange={handleInputChange} placeholder="+241 01 23 45 67" />
                </Field>
              </div>
              <Field label="Email professionnel *" error={fieldErrors.email}>
                <input className="input" type="email" name="email" value={formData.email}
                  onChange={handleInputChange} required />
              </Field>

              {/* Organisation */}
              <SectionTitle>Organisation</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' }}>
                <Field label="Département">
                  <select className="input" name="department" value={formData.department} onChange={handleInputChange}>
                    <option value="">Département...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="Poste">
                  <input className="input" type="text" name="position_text" value={formData.position_text} onChange={handleInputChange} placeholder="Ex: Comptable, Ingénieur RH..." />
                </Field>
                <Field label="Site / Lieu">
                  <select className="input" name="location" value={formData.location} onChange={handleInputChange}>
                    <option value="">Site...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </Field>
                <Field label="Contrat">
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
                <Field label="Date d'embauche *" error={fieldErrors.hire_date}>
                  <input className="input" type="date" name="hire_date" value={formData.hire_date}
                    onChange={handleInputChange} required />
                </Field>
              </div>

              {/* Fiscal */}
              <SectionTitle>Fiscal (Gabon)</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
                <Field label="Salaire brut mensuel (XAF)" error={fieldErrors.salary}>
                  <input className="input" type="number" name="salary" value={formData.salary}
                    onChange={handleInputChange} min={0} step={1000} />
                </Field>
                <Field label="Parts IRPP">
                  <input className="input" type="number" step="0.5" min="1" name="family_parts"
                    value={formData.family_parts} onChange={handleInputChange} />
                </Field>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem', color: '#475569' }}>
                <input type="checkbox" id="is_expat" name="is_expat"
                  checked={formData.is_expat} onChange={handleInputChange}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                Cet employé est un expatrié
              </label>

            </div>{/* end modal-body */}
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting
                  ? (editId ? 'Mise à jour...' : 'Création...')
                  : (editId ? 'Enregistrer les modifications' : 'Créer le profil')}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Suppression ── */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 440 }}>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <HiOutlineTrash size={24} style={{ color: 'var(--danger)' }} />
              </div>
              <h2 style={{ marginBottom: 8 }}>Confirmer la suppression</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
                Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong> ?
                L'employé sera archivé et son accès révoqué.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}
                style={{ background: 'var(--danger)', color: '#fff' }}>
                {deleting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Import CSV ── */}
      {showImport && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div>
                <h2>Importer des employés</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Fichier CSV UTF-8, colonnes requises : employee_id, first_name, last_name, email, hire_date
                </p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowImport(false)}>✕</button>
            </div>
            <form onSubmit={handleImportSubmit} style={{ display: 'contents' }}>
              <div className="modal-body">
                <div className="input-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Fichier CSV *
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    className="input"
                    onChange={e => setCsvFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, marginTop: 12, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <strong>Colonnes CSV supportées :</strong><br />
                  employee_id, first_name, last_name, email, phone, hire_date, contract_type
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowImport(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={importing || !csvFile}>
                  {importing ? 'Importation...' : 'Lancer l\'import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast.show && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
          padding: '14px 20px', borderRadius: 10,
          background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
          color: '#fff', boxShadow: 'var(--shadow-xl)',
          display: 'flex', alignItems: 'center', gap: 10, minWidth: 280,
          animation: 'fadeInUp 0.3s ease',
        }}>
          {toast.type === 'success'
            ? <HiOutlineCheckCircle size={20} />
            : <HiOutlineExclamationCircle size={20} />}
          <span style={{ fontWeight: 500 }}>{toast.text}</span>
        </div>
      )}

      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

// ─── Helpers visuels ───

const TH = {
  padding: '13px 18px',
  textAlign: 'left',
  fontSize: '0.76rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
};

const TD = { padding: '13px 18px', verticalAlign: 'middle' };

function SectionTitle({ children }) {
  return (
    <div style={{
      margin: '20px 0 12px',
      paddingBottom: 8,
      borderBottom: '1px solid var(--border)',
      fontWeight: 700,
      fontSize: '0.78rem',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--primary)',
    }}>
      {children}
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div className="input-group">
      <label style={{
        fontSize: '0.82rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: 6,
        display: 'block',
      }}>
        {label}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: '0.76rem', color: 'var(--danger)', marginTop: 4, display: 'block' }}>
          {error}
        </span>
      )}
    </div>
  );
}
