'use client';

import { useState, useEffect } from 'react';
import { HiOutlineCalendar, HiOutlinePlus, HiOutlineRefresh, HiOutlineCheck, HiOutlineX, HiOutlineDownload } from 'react-icons/hi';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function LeavesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionModal, setRejectionModal] = useState({ show: false, id: null, reason: '' });

  const [formData, setFormData] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    days_count: 0,
    reason: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqData, typesData, meData] = await Promise.all([
        api.get('/leaves/requests/'),
        api.get('/leaves/types/'),
        api.get('/employees/me/').catch(() => null), // If not an employee, might 404
      ]);
      setRequests(reqData);
      setLeaveTypes(typesData);
      setMe(meData);
    } catch (err) {
      console.error('Error fetching leaves data:', err);
      setError('Erreur lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      // Auto-calculate days if start and end are set
      if (newData.start_date && newData.end_date) {
        const start = new Date(newData.start_date);
        const end = new Date(newData.end_date);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        newData.days_count = diffDays > 0 ? diffDays : 0;
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!me) {
      alert("Profil employé manquant. Vous ne pouvez pas soumettre de demande.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/leaves/requests/', {
        ...formData,
        employee: me.id,
      });
      setShowModal(false);
      setFormData({ leave_type: '', start_date: '', end_date: '', days_count: 0, reason: '' });
      fetchData();
    } catch (err) {
      console.error('Error submitting leave request:', err);
      alert(err.error || 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id, action, data = {}) => {
    try {
      await api.post(`/leaves/requests/${id}/${action}/`, data);
      setRejectionModal({ show: false, id: null, reason: '' });
      fetchData();
    } catch (err) {
      console.error(`Error ${action}ing leave:`, err);
      alert(`Erreur lors de l'action ${action}.`);
    }
  };

  const openRejectionModal = (id) => {
    setRejectionModal({ show: true, id, reason: '' });
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/leaves/requests/export_csv/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'leaves_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Erreur lors de l\'exportation.');
    }
  };

  const STATUS = {
    pending: { label: 'En attente', cls: 'badge-warning' },
    approved: { label: 'Approuvé', cls: 'badge-success' },
    rejected: { label: 'Refusé', cls: 'badge-danger' },
    cancelled: { label: 'Annulé', cls: 'badge-neutral' },
  };

  const isManager = user?.profile?.role === 'manager' || user?.profile?.role === 'hr' || user?.profile?.role === 'admin';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gestion des Congés</h1>
          <p>Demandes, approbations et soldes de congés</p>
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

      {/* Summary Stats */}
      <div className="grid grid-3 mb-lg animate-in delay-1">
        <div className="stat-card blue">
          <div className="stat-icon blue"><HiOutlineCalendar /></div>
          <div className="stat-info">
            <h3 style={{ color: 'var(--primary)' }}>18.5j</h3>
            <p>Solde moyen restant</p>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple"><HiOutlineCheck /></div>
          <div className="stat-info">
            <h3>{(Array.isArray(requests) ? requests : []).filter(r => r.status === 'approved' && new Date(r.start_date) <= new Date() && new Date(r.end_date) >= new Date()).length}</h3>
            <p>En congé aujourd&apos;hui</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><HiOutlineCalendar /></div>
          <div className="stat-info">
            <h3>{(Array.isArray(requests) ? requests : []).filter(r => r.status === 'pending').length}</h3>
            <p>Demandes en attente</p>
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="table-container animate-in delay-2">
        <table>
          <thead>
            <tr>
              <th>Collaborateur</th>
              <th>Type de congé</th>
              <th>Période</th>
              <th>Durée</th>
              <th>Statut</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan="6"><div className="skeleton" style={{ height: 20 }} /></td>
                </tr>
              ))
            ) : requests.length > 0 ? (
              requests.map(l => (
                <tr key={l.id} className="animate-in">
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.employee_name}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary-light)' }}>
                      {l.leave_type_name}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Du</span> {new Date(l.start_date).toLocaleDateString('fr-FR')}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Au</span> {new Date(l.end_date).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.days_count} jours</div>
                  </td>
                  <td><span className={`badge ${STATUS[l.status]?.cls || 'badge-neutral'}`}>{STATUS[l.status]?.label || l.status}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    {l.status === 'pending' && isManager ? (
                      <div className="flex gap-xs justify-end">
                        <button className="btn btn-xs btn-primary" onClick={() => { if(confirm('Approuver cette demande ?')) handleAction(l.id, 'approve') }} title="Approuver">
                          <HiOutlineCheck /> Approuver
                        </button>
                        <button className="btn btn-xs btn-danger" onClick={() => openRejectionModal(l.id)} title="Refuser">
                          <HiOutlineX /> Refuser
                        </button>
                      </div>
                    ) : (
                      <button className="btn btn-ghost btn-xs">Détails</button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune demande de congé.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <h2>Nouvelle demande de congé</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Renseignez vos dates et le motif de votre absence.</p>
              </div>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="input-group mb-md">
                <label>Type de congé *</label>
                <select className="input" name="leave_type" value={formData.leave_type} onChange={handleInputChange} required>
                  <option value="">Sélectionner un type...</option>
                  {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-2 gap-md mb-md">
                <div className="input-group">
                  <label>Date de début *</label>
                  <input className="input" type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                  <label>Date de fin *</label>
                  <input className="input" type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="input-group mb-md">
                <label>Durée estimée (jours ouvrés)</label>
                <div className="input flex items-center bg-secondary" style={{ border: '1px dashed var(--border)' }}>
                  <HiOutlineCalendar style={{ marginRight: '8px', color: 'var(--primary)' }} />
                  <span style={{ fontWeight: 600 }}>{formData.days_count} jours</span>
                </div>
              </div>
              <div className="input-group mb-md">
                <label>Motif / Justification</label>
                <textarea className="input" name="reason" value={formData.reason} onChange={handleInputChange} rows="3" placeholder="Ex: Congés annuels, rendez-vous médical..."></textarea>
              </div>
              <div className="modal-footer mt-lg">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !me}>
                  {submitting ? 'Envoi en cours...' : 'Soumettre la demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal.show && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <div>
                <h2 style={{ color: 'var(--danger)' }}>Refuser la demande</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Veuillez indiquer le motif du refus pour le collaborateur.</p>
              </div>
              <button className="btn-close" onClick={() => setRejectionModal({ show: false, id: null, reason: '' })}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="input-group mb-lg">
                <label>Motif du refus *</label>
                <textarea 
                  className="input"
                  value={rejectionModal.reason} 
                  onChange={(e) => setRejectionModal(prev => ({ ...prev, reason: e.target.value }))} 
                  rows="4" 
                  placeholder="Ex: Période de forte activité, solde insuffisant..."
                  required
                ></textarea>
              </div>
              <div className="modal-footer flex gap-sm">
                <button type="button" className="btn btn-ghost flex-1" onClick={() => setRejectionModal({ show: false, id: null, reason: '' })}>Annuler</button>
                <button 
                  type="button" 
                  className="btn btn-danger flex-1" 
                  disabled={!rejectionModal.reason} 
                  onClick={() => handleAction(rejectionModal.id, 'reject', { reason: rejectionModal.reason })}
                >
                  Confirmer le refus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

