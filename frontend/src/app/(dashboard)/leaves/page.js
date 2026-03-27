'use client';

import { useState, useEffect } from 'react';
import { HiOutlineCalendar, HiOutlinePlus, HiOutlineRefresh, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
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

  const handleAction = async (id, action) => {
    try {
      await api.post(`/leaves/requests/${id}/${action}/`);
      fetchData();
    } catch (err) {
      console.error(`Error ${action}ing leave:`, err);
      alert(`Erreur lors de l'action ${action}.`);
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
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> Nouvelle demande
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-icon green"><HiOutlineCalendar /></div>
          <div className="stat-info">
            <h3>18.5j</h3>
            <p>Solde moyen restant</p>
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon cyan"><HiOutlineCalendar /></div>
          <div className="stat-info">
            <h3>{requests.filter(r => r.status === 'approved' && new Date(r.start_date) <= new Date() && new Date(r.end_date) >= new Date()).length}</h3>
            <p>En congé aujourd&apos;hui</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><HiOutlineCalendar /></div>
          <div className="stat-info">
            <h3>{requests.filter(r => r.status === 'pending').length}</h3>
            <p>Demandes en attente</p>
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="table-container animate-in">
        <table>
          <thead>
            <tr>
              <th>Employé</th>
              <th>Type</th>
              <th>Début</th>
              <th>Fin</th>
              <th>Jours</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan="7"><div className="skeleton" style={{ height: 20 }} /></td>
                </tr>
              ))
            ) : requests.length > 0 ? (
              requests.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.employee_name}</td>
                  <td>{l.leave_type_name}</td>
                  <td>{new Date(l.start_date).toLocaleDateString('fr-FR')}</td>
                  <td>{new Date(l.end_date).toLocaleDateString('fr-FR')}</td>
                  <td>{l.days_count}j</td>
                  <td><span className={`badge ${STATUS[l.status]?.cls || 'badge-neutral'}`}>{STATUS[l.status]?.label || l.status}</span></td>
                  <td>
                    {l.status === 'pending' && isManager && (
                      <div className="flex gap-xs">
                        <button className="btn btn-xs btn-primary" onClick={() => handleAction(l.id, 'approve')} title="Approuver">
                          <HiOutlineCheck />
                        </button>
                        <button className="btn btn-xs btn-danger" onClick={() => handleAction(l.id, 'reject')} title="Refuser">
                          <HiOutlineX />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune demande de congé.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Nouvelle demande de congé</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group mb-md">
                <label>Type de congé *</label>
                <select name="leave_type" value={formData.leave_type} onChange={handleInputChange} required>
                  <option value="">Sélectionner...</option>
                  {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-2 gap-md mb-md">
                <div className="form-group">
                  <label>Date de début *</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Date de fin *</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="form-group mb-md">
                <label>Nombre de jours (estimé)</label>
                <input type="number" value={formData.days_count} readOnly style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed' }} />
              </div>
              <div className="form-group mb-md">
                <label>Motif / Notes</label>
                <textarea name="reason" value={formData.reason} onChange={handleInputChange} rows="3" placeholder="Optionnel..."></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !me}>
                  {submitting ? 'Envoi...' : 'Soumettre la demande'}
                </button>
              </div>
            </form>
          </div>
          <style jsx>{`
            .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
            .modal-content { width: 90%; padding: 24px; }
            .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .btn-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-muted); }
            .form-group label { display: block; margin-bottom: 6px; font-size: 0.9rem; font-weight: 500; }
          `}</style>
        </div>
      )}
    </div>
  );
}

