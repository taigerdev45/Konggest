'use client';

import { useState, useEffect } from 'react';
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
      setFormData({ employee: '', period: 'Q1 2026', overall_rating: 5, strengths: '', improvements: '', status: 'completed', review_date: new Date().toISOString().split('T')[0] });
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
  const isHR = user?.profile?.role === 'hr' || user?.profile?.role === 'admin';

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
        <div className="fixed inset-0 bg-[#0F1A10]/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-5">
              <div>
                <span className="text-[11px] font-semibold text-[#2D6A4F] uppercase tracking-[0.1em]">Nouvelle évaluation</span>
                <h2 className="text-[17px] font-semibold text-[#0F1A10] mt-0.5">Enregistrer une évaluation</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-[#F5F7F4] text-[#6B7E6D] hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center text-base">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={S.label}>Collaborateur</label>
                <select className={S.input} name="employee" value={formData.employee} onChange={handleInputChange} required>
                  <option value="">Sélectionner un employé...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={S.label}>Période</label>
                  <input className={S.input} type="text" name="period" value={formData.period} onChange={handleInputChange} required placeholder="Ex: Q1 2026" />
                </div>
                <div>
                  <label className={S.label}>Note (1–5)</label>
                  <input className={S.input} type="number" name="overall_rating" min="1" max="5" value={formData.overall_rating} onChange={handleInputChange} required />
                </div>
              </div>
              <div>
                <label className={S.label}>Points forts</label>
                <textarea className={`${S.input} min-h-[80px] resize-none`} name="strengths" value={formData.strengths} onChange={handleInputChange} placeholder="Qualités observées..." />
              </div>
              <div>
                <label className={S.label}>Axes d'amélioration</label>
                <textarea className={`${S.input} min-h-[80px] resize-none`} name="improvements" value={formData.improvements} onChange={handleInputChange} placeholder="Compétences à développer..." />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[rgba(20,34,24,0.06)]">
                <button type="button" onClick={() => setShowModal(false)} className={`${S.btn} ${S.secondary}`}>Annuler</button>
                <button type="submit" disabled={submitting} className={`${S.btn} ${S.primary}`}>
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
