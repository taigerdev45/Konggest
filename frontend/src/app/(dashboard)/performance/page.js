'use client';

import { useState, useEffect } from 'react';
import { HiOutlineChartBar, HiOutlinePlus, HiOutlineRefresh, HiOutlineStar, HiOutlineCheckCircle, HiOutlineBell } from 'react-icons/hi';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function PerformancePage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'info' });

  const [formData, setFormData] = useState({
    employee: '',
    period: 'Q1 2026',
    overall_rating: 5,
    strengths: '',
    improvements: '',
    status: 'completed',
    review_date: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reviewsData, objectivesData, employeesData] = await Promise.all([
        api.get('/performance/reviews/'),
        api.get('/performance/objectives/'),
        api.get('/employees/'),
      ]);
      setReviews(reviewsData.results || reviewsData || []);
      setObjectives(objectivesData.results || objectivesData || []);
      setEmployees(employeesData.results || employeesData || []);
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setToast({ show: true, text: 'Erreur lors du chargement des données.', type: 'error' });
      setTimeout(() => setToast({ show: false, text: '' }), 4000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Supabase Realtime Listener
    const tenant_id = localStorage.getItem('tenant_id') || '*';
    const channel = supabase.channel(`performance:${tenant_id}`)
      .on('broadcast', { event: 'review.changed' }, (payload) => {
        setToast({ 
          show: true, 
          text: `Évaluation ${payload.payload.action === 'deleted' ? 'supprimée' : 'mise à jour'} : ${payload.payload.employeeName}`, 
          type: 'success' 
        });
        setTimeout(() => setToast({ show: false, text: '' }), 4000);
        fetchData();
      })
      .on('broadcast', { event: 'objective.changed' }, (payload) => {
        fetchData(); // Silently refresh objectives
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/performance/reviews/', formData);
      setShowModal(false);
      setFormData({
        employee: '', period: 'Q1 2026', overall_rating: 5,
        strengths: '', improvements: '', status: 'completed',
        review_date: new Date().toISOString().split('T')[0]
      });
      // fetchData() is handled by the WebSocket automatically!
      setToast({ show: true, text: 'Évaluation enregistrée avec succès.', type: 'success' });
      setTimeout(() => setToast({ show: false, text: '' }), 4000);
    } catch (err) {
      console.error('Error creating review:', err);
      // Parsing DRF Error
      let errMsg = "Erreur lors de la création de l'évaluation.";
      if (err.response && err.response.data) {
          const keys = Object.keys(err.response.data);
          if (keys.length > 0) {
              errMsg = `${keys[0]}: ${err.response.data[keys[0]][0]}`;
          }
      }
      setToast({ show: true, text: errMsg, type: 'error' });
      setTimeout(() => setToast({ show: false, text: '' }), 5000);
      setSubmitting(false); // Reset on error
    }
    // Submitting reset handled by WebSocket reload or finally block alternative
    setSubmitting(false);
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.overall_rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const objectivesCompletion = objectives.length > 0
    ? Math.round((objectives.filter(o => o.status === 'completed').length / objectives.length) * 100)
    : 0;

  const isHR = user?.profile?.role === 'hr' || user?.profile?.role === 'admin';

  return (
    <div className="animate-in relative">
      {toast.show && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-2xl flex items-center gap-3 text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
          <HiOutlineBell className="text-xl" />
          <span className="font-medium">{toast.text}</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Performance & Évaluations</h1>
          <p>Entretiens, objectifs et suivi de performance</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={fetchData} disabled={loading} title="Rafraîchir manuellement">
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          {isHR && (
            <button className="btn btn-primary shadow" onClick={() => setShowModal(true)}>
              <HiOutlinePlus /> Nouvelle évaluation
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card purple relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10 text-6xl"><HiOutlineStar /></div>
          <div className="stat-icon purple"><HiOutlineStar /></div>
          <div className="stat-info">
            <h3>{averageRating}/5</h3>
            <p>Note moyenne</p>
          </div>
        </div>
        <div className="stat-card green relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10 text-6xl"><HiOutlineCheckCircle /></div>
          <div className="stat-icon green"><HiOutlineCheckCircle /></div>
          <div className="stat-info">
            <h3>{objectivesCompletion}%</h3>
            <p>Objectifs atteints</p>
          </div>
        </div>
        <div className="stat-card cyan relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10 text-6xl"><HiOutlineChartBar /></div>
          <div className="stat-icon cyan"><HiOutlineChartBar /></div>
          <div className="stat-info">
            <h3>{reviews.length}</h3>
            <p>Évaluations totales</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employé</th>
                <th>Période</th>
                <th>Note</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Objectifs</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td colSpan="6"><div className="skeleton" style={{ height: 20 }} /></td>
                  </tr>
                ))
              ) : reviews.length > 0 ? (
                reviews.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div className="flex items-center gap-xs">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                           {r.employee_name.substring(0,2).toUpperCase()}
                        </span>
                        {r.employee_name}
                      </div>
                    </td>
                    <td>{r.period}</td>
                    <td>
                      <div className="flex items-center gap-xs" style={{ color: 'var(--warning)' }}>
                        {[...Array(5)].map((_, i) => (
                          <HiOutlineStar key={i} style={{ fill: i < r.overall_rating ? 'currentColor' : 'none', opacity: i < r.overall_rating ? 1 : 0.3 }} />
                        ))}
                      </div>
                    </td>
                    <td>{new Date(r.review_date).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                        {r.status === 'completed' ? 'Terminé' : 'En cours'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{r.objectives?.length || 0}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune évaluation trouvée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Review Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Nouvelle évaluation</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group mb-md">
                <label>Employé *</label>
                <select className="select-input" name="employee" value={formData.employee} onChange={handleInputChange} required>
                  <option value="">Sélectionner un employé...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-2 gap-md mb-md">
                <div className="form-group">
                  <label>Période *</label>
                  <input className="text-input" type="text" name="period" value={formData.period} onChange={handleInputChange} required placeholder="Ex: Q1 2026" />
                </div>
                <div className="form-group">
                  <label>Note (1-5) *</label>
                  <input className="text-input" type="number" name="overall_rating" min="1" max="5" value={formData.overall_rating} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="form-group mb-md">
                <label>Points forts</label>
                <textarea className="text-input" name="strengths" value={formData.strengths} onChange={handleInputChange} rows="2" placeholder="Qualités observées..."></textarea>
              </div>
              <div className="form-group mb-md">
                <label>Axes d'amélioration</label>
                <textarea className="text-input" name="improvements" value={formData.improvements} onChange={handleInputChange} rows="2" placeholder="Compétences à développer..."></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
          <style jsx>{`
            .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
            .modal-content { width: 90%; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
            .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .btn-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-muted); }
            .form-group label { display: block; margin-bottom: 6px; font-size: 0.9rem; font-weight: 500; }
            .text-input, .select-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.95rem; }
          `}</style>
        </div>
      )}
    </div>
  );
}
