'use client';

import { useState, useEffect } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { HiOutlineChartBar, HiOutlinePlus, HiOutlineRefresh, HiOutlineStar, HiOutlineCheckCircle } from 'react-icons/hi';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const S = {
  btn: 'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer',
  primary: 'bg-[#2D6A4F] text-white hover:bg-[#245c42] border-0',
  secondary: 'bg-white text-[#0F1A10] border border-[rgba(20,34,24,0.15)] hover:bg-[#F5F7F4]',
  th: 'px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7E6D] uppercase tracking-[0.08em] whitespace-nowrap',
  input: 'w-full border border-[rgba(20,34,24,0.15)] bg-[#F5F7F4] rounded-lg px-3 py-2 text-sm text-[#0F1A10] focus:border-[#2D6A4F] focus:ring-2 focus:ring-[rgba(45,106,79,0.1)] outline-none transition-all',
  label: 'block text-[11px] font-semibold text-[#6B7E6D] mb-1.5 uppercase tracking-[0.06em]',
};

export default function PerformancePage() {
  const { user } = useAuth();
  const userRole = user?.profile?.role || 'employee';
  const isManager = ['admin', 'hr', 'manager'].includes(userRole);

  const [reviews, setReviews] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [meEmployee, setMeEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'info' });
  useScrollLock(showModal);

  const [formData, setFormData] = useState({
    employee: '',
    reviewer: '',
    period: 'Q1 2026',
    overall_rating: 5,
    strengths: '',
    improvements: '',
    comments: '',
    status: 'completed',
    review_date: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const calls = [api.get('/performance/reviews/'), api.get('/performance/objectives/')];
      if (isManager) calls.push(api.get('/employees/'));
      else calls.push(api.get('/employees/me/').catch(() => null));

      const [reviewsData, objectivesData, empData] = await Promise.all(calls);
      const allReviews = reviewsData.results || reviewsData || [];

      if (isManager) {
        setReviews(allReviews);
        setEmployees(empData?.results || empData || []);
      } else {
        // Employee: only own reviews
        const me = empData;
        setMeEmployee(me);
        const myReviews = me
          ? allReviews.filter(r => r.employee === me.id || r.employee_name === me.full_name)
          : allReviews;
        setReviews(myReviews);
      }
      setObjectives(objectivesData.results || objectivesData || []);
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
    const tenant_id = localStorage.getItem('tenant_id') || '*';
    const channel = supabase.channel(`performance:${tenant_id}`)
      .on('broadcast', { event: 'review.changed' }, (payload) => {
        setToast({ show: true, text: `Évaluation ${payload.action === 'deleted' ? 'supprimée' : 'mise à jour'} : ${payload.employeeName}`, type: 'success' });
        setTimeout(() => setToast({ show: false, text: '' }), 4000);
        fetchData();
      })
      .on('broadcast', { event: 'objective.changed' }, () => { fetchData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
      setFormData({ employee: '', reviewer: '', period: 'Q1 2026', overall_rating: 5, strengths: '', improvements: '', comments: '', status: 'completed', review_date: new Date().toISOString().split('T')[0] });
      setToast({ show: true, text: 'Évaluation enregistrée avec succès.', type: 'success' });
      setTimeout(() => setToast({ show: false, text: '' }), 4000);
    } catch (err) {
      console.error('Error creating review:', err);
      let errMsg = "Erreur lors de la création de l'évaluation.";
      if (err.response?.data) {
        const keys = Object.keys(err.response.data);
        if (keys.length > 0) errMsg = `${keys[0]}: ${err.response.data[keys[0]][0]}`;
      }
      setToast({ show: true, text: errMsg, type: 'error' });
      setTimeout(() => setToast({ show: false, text: '' }), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.overall_rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  const objectivesCompletion = objectives.length > 0
    ? Math.round((objectives.filter(o => o.status === 'completed').length / objectives.length) * 100)
    : 0;
  const isHR = isManager;

  return (
    <div className="min-h-full flex flex-col bg-[#F5F7F4]">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[1000] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-[13px] font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#2D6A4F]'}`}>
          {toast.text}
        </div>
      )}

      {/* Header compact */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-[rgba(20,34,24,0.08)]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-[#2D6A4F] uppercase tracking-[0.12em]">Performance</span>
          <span className="text-[#0F1A10]/20 text-lg leading-none">·</span>
          <h1 className="text-[15px] font-semibold text-[#0F1A10]">Suivi de Performance</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading} className={`${S.btn} ${S.secondary}`}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
          {isHR && (
            <button onClick={() => setShowModal(true)} className={`${S.btn} ${S.primary}`}>
              <HiOutlinePlus />
              Nouvelle évaluation
            </button>
          )}
        </div>
      </header>

      {/* Metric strip */}
      <div className="flex items-center gap-2 px-6 py-2.5 bg-white border-b border-[rgba(20,34,24,0.06)]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(201,168,76,0.1)]">
          <HiOutlineStar className="text-[#8B7035] text-sm" />
          <span className="text-[11px] font-semibold text-[#8B7035]">Note moy.</span>
          <span className="text-sm font-bold text-[#0F1A10]">{averageRating}<span className="text-[#6B7E6D] font-normal">/5</span></span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(45,106,79,0.08)]">
          <HiOutlineCheckCircle className="text-[#2D6A4F] text-sm" />
          <span className="text-[11px] font-semibold text-[#2D6A4F]">Objectifs atteints</span>
          <span className="text-sm font-bold text-[#0F1A10]">{objectivesCompletion}%</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(20,34,24,0.05)]">
          <HiOutlineChartBar className="text-[#6B7E6D] text-sm" />
          <span className="text-[11px] font-semibold text-[#6B7E6D]">Évaluations</span>
          <span className="text-sm font-bold text-[#0F1A10]">{reviews.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-xl border border-[rgba(20,34,24,0.08)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(20,34,24,0.06)]">
            <span className="text-[13px] font-semibold text-[#0F1A10]">Historique des évaluations</span>
            <span className="text-[11px] text-[#6B7E6D]">{reviews.length} entrée{reviews.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F5F7F4]">
                  <th className={S.th}>Collaborateur</th>
                  <th className={S.th}>Période</th>
                  <th className={S.th}>Note</th>
                  <th className={S.th}>Date</th>
                  <th className={S.th}>Statut</th>
                  <th className={S.th}>Objectifs</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  new Array(4).fill(null).map((_, i) => (
                    <tr key={i} className="border-b border-[rgba(20,34,24,0.05)]">
                      {new Array(6).fill(null).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-[#F5F7F4] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : reviews.length > 0 ? (
                  reviews.map(r => (
                    <tr key={r.id} className="border-b border-[rgba(20,34,24,0.05)] hover:bg-[rgba(45,106,79,0.03)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[rgba(45,106,79,0.1)] text-[#2D6A4F] flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {r.employee_name?.substring(0, 2).toUpperCase() || '??'}
                          </div>
                          <span className="text-[13px] font-medium text-[#0F1A10]">{r.employee_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#6B7E6D]">{r.period}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <HiOutlineStar key={star} style={{ fill: star <= r.overall_rating ? '#C9A84C' : 'none', color: star <= r.overall_rating ? '#C9A84C' : '#D1D5DB' }} className="text-sm" />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#6B7E6D]">{new Date(r.review_date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${r.status === 'completed' ? 'bg-[rgba(45,106,79,0.1)] text-[#2D6A4F]' : 'bg-[rgba(201,168,76,0.1)] text-[#8B7035]'}`}>
                          {r.status === 'completed' ? 'Terminé' : 'En cours'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[rgba(20,34,24,0.06)] text-[#6B7E6D] text-xs font-semibold">
                          {r.objectives?.length || 0}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-14 text-center text-[13px] text-[#6B7E6D]">
                      Aucune évaluation. Créez la première évaluation de vos équipes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div>
                <h2>Enregistrer une évaluation</h2>
                <p>Évaluation de performance collaborateur.</p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label htmlFor="perf-emp">Collaborateur évalué *</label>
                    <select id="perf-emp" className="input" name="employee" value={formData.employee} onChange={handleInputChange} required>
                      <option value="">Sélectionner...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label htmlFor="perf-reviewer">Évaluateur</label>
                    <select id="perf-reviewer" className="input" name="reviewer" value={formData.reviewer} onChange={handleInputChange}>
                      <option value="">Sélectionner...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label htmlFor="perf-period">Période *</label>
                    <input id="perf-period" className="input" type="text" name="period" value={formData.period} onChange={handleInputChange} required placeholder="Ex: Q1 2026" />
                  </div>
                  <div className="input-group">
                    <label htmlFor="perf-rating">Note (1–5) *</label>
                    <input id="perf-rating" className="input" type="number" name="overall_rating" min="1" max="5" value={formData.overall_rating} onChange={handleInputChange} required />
                  </div>
                  <div className="input-group">
                    <label htmlFor="perf-status">Statut</label>
                    <select id="perf-status" className="input" name="status" value={formData.status} onChange={handleInputChange}>
                      <option value="completed">Terminé</option>
                      <option value="in_progress">En cours</option>
                      <option value="draft">Brouillon</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label htmlFor="perf-date">Date d'évaluation</label>
                    <input id="perf-date" className="input" type="date" name="review_date" value={formData.review_date} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="input-group">
                  <label htmlFor="perf-strengths">Points forts</label>
                  <textarea id="perf-strengths" className="input" style={{ minHeight: 72, resize: 'none' }} name="strengths" value={formData.strengths} onChange={handleInputChange} placeholder="Qualités observées..." />
                </div>
                <div className="input-group">
                  <label htmlFor="perf-improvements">Axes d&apos;amélioration</label>
                  <textarea id="perf-improvements" className="input" style={{ minHeight: 72, resize: 'none' }} name="improvements" value={formData.improvements} onChange={handleInputChange} placeholder="Compétences à développer..." />
                </div>
                <div className="input-group">
                  <label htmlFor="perf-comments">Commentaires généraux</label>
                  <textarea id="perf-comments" className="input" style={{ minHeight: 72, resize: 'none' }} name="comments" value={formData.comments} onChange={handleInputChange} placeholder="Observations globales, contexte particulier..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
