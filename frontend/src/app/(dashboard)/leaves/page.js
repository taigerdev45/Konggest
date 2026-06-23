'use client';

import { useState, useEffect, useRef } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import {
  HiOutlineCalendar, HiOutlinePlus, HiOutlineRefresh, HiOutlineCheck,
  HiOutlineX, HiOutlineDownload, HiOutlineEye, HiOutlineTrash,
  HiOutlineCheckCircle, HiOutlineExclamationCircle
} from 'react-icons/hi';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const STATUS = {
  pending:   { label: 'En attente', cls: 'badge-warning' },
  approved:  { label: 'Approuvé',   cls: 'badge-success' },
  rejected:  { label: 'Refusé',     cls: 'badge-danger'  },
  cancelled: { label: 'Annulé',     cls: 'badge-neutral' },
};

const TH = { padding: '13px 18px', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap', background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' };
const TD = { padding: '13px 18px', verticalAlign: 'middle', borderBottom: '1px solid var(--border-color)' };

export default function LeavesPage() {
  const { user } = useAuth();
  const [requests, setRequests]     = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [me, setMe]                 = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionModal, setRejectionModal] = useState({ show: false, id: null, reason: '' });
  const [toast, setToast]           = useState({ show: false, type: '', text: '' });
  useScrollLock(showModal || rejectionModal.show);

  const [formData, setFormData] = useState({
    leave_type: '', start_date: '', end_date: '', days_count: 0, reason: '',
  });

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false }), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r0, r1, r2] = await Promise.allSettled([
        api.get('/leaves/requests/'),
        api.get('/leaves/types/'),
        api.get('/employees/me/'),
      ]);
      setRequests(r0.status === 'fulfilled' ? (r0.value.results || r0.value || []) : []);
      setLeaveTypes(r1.status === 'fulfilled' ? (r1.value.results || r1.value || []) : []);
      setMe(r2.status === 'fulfilled' ? r2.value : null);
    } catch {
      // handled per-promise
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
    
    // L4: Realtime Listener
    const tenantId = user?.profile?.organization_id;
    if (tenantId) {
      const channel = supabase.channel(`public:konggest_public_leaves`)
        .on(
          'broadcast',
          { event: 'leave.approved' },
          (payload) => {
            if (payload.payload.employee_id === me?.id || ['manager', 'hr', 'admin'].includes(user?.profile?.role)) {
              showToast('success', 'Une demande de congé a été approuvée (Realtime)');
              fetchData();
            }
          }
        )
        .on(
          'broadcast',
          { event: 'leave.rejected' },
          (payload) => {
            if (payload.payload.employee_id === me?.id || ['manager', 'hr', 'admin'].includes(user?.profile?.role)) {
              showToast('error', 'Une demande de congé a été refusée (Realtime)');
              fetchData();
            }
          }
        )
        .subscribe();
      
      return () => { supabase.removeChannel(channel); };
    }
  }, [user, me?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (next.start_date && next.end_date) {
        const diff = Math.ceil(Math.abs(new Date(next.end_date) - new Date(next.start_date)) / 86400000) + 1;
        next.days_count = diff > 0 ? diff : 0;
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!me) { showToast('error', 'Profil employé manquant.'); return; }
    setSubmitting(true);
    try {
      await api.post('/leaves/requests/', { ...formData, employee: me.id });
      setShowModal(false);
      setFormData({ leave_type: '', start_date: '', end_date: '', days_count: 0, reason: '' });
      showToast('success', 'Demande soumise avec succès.');
      fetchData();
    } catch (err) {
      showToast('error', err?.error || 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id, action, data = {}) => {
    try {
      await api.post(`/leaves/requests/${id}/${action}/`, data);
      setRejectionModal({ show: false, id: null, reason: '' });
      showToast('success', action === 'approve' ? 'Congé approuvé.' : 'Congé refusé.');
      fetchData();
    } catch {
      showToast('error', `Erreur lors de l'action.`);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.request('/leaves/requests/export_csv/', { responseType: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([blob]));
      a.setAttribute('download', 'leaves_export.csv');
      document.body.appendChild(a); a.click(); a.remove();
    } catch { showToast('error', "Erreur lors de l'exportation."); }
  };

  const isManager = ['manager', 'hr', 'admin'].includes(user?.profile?.role);
  const today = new Date();
  const onLeaveToday = requests.filter(r =>
    r.status === 'approved' &&
    new Date(r.start_date) <= today &&
    new Date(r.end_date) >= today
  ).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gestion des Congés</h1>
          <p>Demandes, approbations et soldes — Réglementation Gabon</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={fetchData} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            <HiOutlineDownload /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> Nouvelle demande
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-3 mb-lg animate-in">
        <div className="stat-card blue">
          <div className="stat-icon blue"><HiOutlineCalendar /></div>
          <div className="stat-info">
            <h3 style={{ color: 'var(--primary)' }}>{requests.length}</h3>
            <p>Total demandes</p>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple"><HiOutlineCheck /></div>
          <div className="stat-info">
            <h3>{onLeaveToday}</h3>
            <p>En congé aujourd&apos;hui</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><HiOutlineCalendar /></div>
          <div className="stat-info">
            <h3>{requests.filter(r => r.status === 'pending').length}</h3>
            <p>En attente d&apos;approbation</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card animate-in" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Collaborateur</th>
                <th style={TH}>Type de congé</th>
                <th style={TH}>Période</th>
                <th style={{ ...TH, textAlign: 'center' }}>Durée</th>
                <th style={{ ...TH, textAlign: 'center' }}>Statut</th>
                <th style={{ ...TH, textAlign: 'center', width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} style={{ padding: '14px 18px' }}>
                        <div className="skeleton" style={{ height: 16, borderRadius: 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length > 0 ? (
                requests.map(l => (
                  <tr key={l.id}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ ...TD, fontWeight: 600 }}>{l.employee_name}</td>
                    <td style={TD}>
                      <span className="badge badge-primary" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
                        {l.leave_type_name}
                      </span>
                    </td>
                    <td style={TD}>
                      <div style={{ fontSize: '0.84rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Du </span>
                        {new Date(l.start_date).toLocaleDateString('fr-FR')}
                      </div>
                      <div style={{ fontSize: '0.84rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Au </span>
                        {new Date(l.end_date).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{l.days_count}j</span>
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span className={`badge ${STATUS[l.status]?.cls || 'badge-neutral'}`}>
                        {STATUS[l.status]?.label || l.status}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      {l.status === 'pending' && isManager ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 10px', color: 'var(--success)', border: '1px solid var(--success)' }}
                            title="Approuver"
                            onClick={() => { if (confirm('Approuver cette demande ?')) handleAction(l.id, 'approve'); }}
                          >
                            <HiOutlineCheck size={14} /> Approuver
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 10px', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                            title="Refuser"
                            onClick={() => setRejectionModal({ show: true, id: l.id, reason: '' })}
                          >
                            <HiOutlineX size={14} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {STATUS[l.status]?.label}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aucune demande de congé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <h2>Nouvelle demande de congé</h2>
                <p>Renseignez les dates et le motif de votre absence.</p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="input-group">
                  <label>Type de congé *</label>
                  <select className="input" name="leave_type" value={formData.leave_type} onChange={handleInputChange} required>
                    <option value="">Sélectionner un type...</option>
                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label>Date de début *</label>
                    <input className="input" type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} required />
                  </div>
                  <div className="input-group">
                    <label>Date de fin *</label>
                    <input className="input" type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="input-group">
                  <label>Durée calculée</label>
                  <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', cursor: 'default' }}>
                    <HiOutlineCalendar style={{ color: 'var(--primary)' }} />
                    <strong>{formData.days_count} jour(s)</strong>
                  </div>
                </div>
                <div className="input-group">
                  <label>Motif / Justification</label>
                  <textarea className="input" name="reason" value={formData.reason} onChange={handleInputChange} rows={2} placeholder="Ex: Congés annuels, rendez-vous médical..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !me}>
                  {submitting ? 'Envoi...' : 'Soumettre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal.show && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div>
                <h2>Refuser la demande</h2>
                <p>Indiquez le motif du refus.</p>
              </div>
              <button className="btn-modal-close" onClick={() => setRejectionModal({ show: false, id: null, reason: '' })}>✕</button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Motif du refus *</label>
                <textarea
                  className="input"
                  value={rejectionModal.reason}
                  onChange={e => setRejectionModal(p => ({ ...p, reason: e.target.value }))}
                  rows={3}
                  placeholder="Ex: Période de forte activité, solde insuffisant..."
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setRejectionModal({ show: false, id: null, reason: '' })}>Annuler</button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--danger)', color: '#fff' }}
                disabled={!rejectionModal.reason}
                onClick={() => handleAction(rejectionModal.id, 'reject', { reason: rejectionModal.reason })}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 2000, padding: '14px 20px', borderRadius: 10, background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)', color: '#fff', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'center', gap: 10, minWidth: 260 }}>
          {toast.type === 'success' ? <HiOutlineCheckCircle size={20} /> : <HiOutlineExclamationCircle size={20} />}
          <span style={{ fontWeight: 500 }}>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
