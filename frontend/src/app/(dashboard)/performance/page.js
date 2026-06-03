'use client';

import { useState, useEffect } from 'react';
import { HiOutlineChartBar, HiOutlinePlus, HiOutlineRefresh, HiOutlineStar, HiOutlineCheckCircle, HiOutlineBell } from 'react-icons/hi';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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
          text: `Évaluation ${payload.action === 'deleted' ? 'supprimée' : 'mise à jour'} : ${payload.employeeName}`, 
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
    <div className="animate-in min-h-full flex flex-col bg-[#FDFDFF]">
      {toast.show && (
        <div className={`fixed top-4 right-8 z-[1000] px-6 py-4 rounded-[2rem] shadow-xl flex items-center gap-3 text-white animate-in slide-in-from-right-10 ${toast.type === 'error' ? 'bg-red-500/95' : 'bg-emerald-500/95'}`}>
          <HiOutlineBell className="text-xl" />
          <span className="font-bold">{toast.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="px-6 md:px-12 pt-8 md:pt-12 pb-8 md:pb-10 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div className="animate-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-1 bg-emerald-500 rounded-full"></div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">PERFORMANCE</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-3">
            Suivi de Performance
          </h1>
          <p className="text-gray-400 font-medium text-sm md:text-base max-w-lg">
            Évaluations, objectifs et suivi de performance de vos équipes.
          </p>
        </div>
        <div className="flex gap-3 animate-in slide-in-from-right-4 duration-700">
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="flex-1 md:flex-none bg-white text-gray-900 border border-gray-100 px-6 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
          >
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
          {isHR && (
            <button 
              onClick={() => setShowModal(true)} 
              className="flex-1 md:flex-none bg-emerald-600 text-white px-8 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition shadow-xl shadow-emerald-500/20 ring-1 ring-emerald-400/50 flex items-center gap-2"
            >
              <HiOutlinePlus size={18} />
              Nouvelle Évaluation
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 md:px-12 pb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="stat-icon purple">
            <HiOutlineStar />
          </div>
          <div className="stat-info">
            <h3>{averageRating}/5</h3>
            <p>Note Moyenne</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <HiOutlineCheckCircle />
          </div>
          <div className="stat-info">
            <h3>{objectivesCompletion}%</h3>
            <p>Objectifs Atteints</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon cyan">
            <HiOutlineChartBar />
          </div>
          <div className="stat-info">
            <h3>{reviews.length}</h3>
            <p>Évaluations Totales</p>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="px-6 md:px-12 pb-12 flex-1">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50/30">
            <h3 className="text-lg font-black text-gray-900 mb-2">Historique des Évaluations</h3>
            <p className="text-sm text-gray-400">Suivi de performance de l'ensemble des collaborateurs.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <tr>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    Collaborateur
                  </th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    Période
                  </th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    Note
                  </th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    Date
                  </th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    Statut
                  </th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    Objectifs
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan="6" className="px-8 py-6">
                        <div className="skeleton" style={{ height: '24px' }} />
                      </td>
                    </tr>
                  ))
                ) : reviews.length > 0 ? (
                  reviews.map(r => (
                    <tr key={r.id} className="group hover:bg-emerald-50/30 transition-all duration-300">
                      <td className="px-8 py-6 border-b border-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 flex items-center justify-center font-black shadow-sm border border-white">
                            {r.employee_name?.substring(0,2).toUpperCase() || '??'}
                          </div>
                          <span className="font-black text-gray-900">{r.employee_name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50 text-gray-600 font-medium">
                        {r.period}
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <HiOutlineStar 
                              key={star} 
                              style={{ 
                                fill: star <= r.overall_rating ? '#eab308' : 'none', 
                                color: star <= r.overall_rating ? '#eab308' : '#d1d5db',
                                opacity: star <= r.overall_rating ? 1 : 0.4
                              }} 
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50 text-gray-500 font-medium">
                        {new Date(r.review_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${r.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {r.status === 'completed' ? 'Terminé' : 'En cours'}
                        </span>
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600">
                          {r.objectives?.length || 0}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-8 py-20 text-center">
                      <div className="text-gray-400 font-medium">Aucune évaluation trouvée.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Review Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] max-w-2xl w-full p-8 md:p-12 relative shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="absolute top-8 right-8">
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center font-black">✕</button>
            </div>
            
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-1 bg-emerald-500 rounded-full"></div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Nouvelle Évaluation</span>
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Ajouter une Évaluation</h2>
              <p className="text-gray-400 text-sm font-medium mt-1">Enregistrez les performances de vos collaborateurs.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Collaborateur</label>
                <select 
                  className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm"
                  name="employee" 
                  value={formData.employee} 
                  onChange={handleInputChange} 
                  required
                >
                  <option value="">Sélectionner un employé...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Période</label>
                  <input 
                    className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm text-gray-600"
                    type="text" 
                    name="period" 
                    value={formData.period} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="Ex: Q1 2026" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Note (1-5)</label>
                  <input 
                    className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm text-gray-600"
                    type="number" 
                    name="overall_rating" 
                    min="1" 
                    max="5" 
                    value={formData.overall_rating} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Points Forts</label>
                <textarea 
                  className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm text-gray-600 min-h-[100px]"
                  name="strengths" 
                  value={formData.strengths} 
                  onChange={handleInputChange} 
                  placeholder="Qualités observées..."
                ></textarea>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Axes d'Amélioration</label>
                <textarea 
                  className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm text-gray-600 min-h-[100px]"
                  name="improvements" 
                  value={formData.improvements} 
                  onChange={handleInputChange} 
                  placeholder="Compétences à développer..."
                ></textarea>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={submitting} className="bg-emerald-600 text-white font-black px-10 py-4 rounded-[1.5rem] shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all hover:-translate-y-1 text-[11px] uppercase tracking-widest ring-1 ring-emerald-400">
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
