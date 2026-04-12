'use client';

import { useState, useEffect } from 'react';
import { HiOutlineClock, HiOutlineLogin, HiOutlineLogout, HiOutlineRefresh, HiOutlineCheckCircle } from 'react-icons/hi';
import api from '@/lib/api';
import AttendanceQR from '@/components/attendance/AttendanceQR';

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'qr'

  const [toast, setToast] = useState({ show: false, type: '', text: '' });
  const [statsData, setStatsData] = useState(null);

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false }), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesData, meData, statsRes] = await Promise.all([
        api.get('/time-tracking/entries/').then(res => res.results || res),
        api.get('/employees/me/').catch(() => null),
        api.get('/time-tracking/entries/stats/').catch(() => null),
      ]);
      const entriesArr = Array.isArray(entriesData) ? entriesData : [];
      setEntries(entriesArr);
      setMe(meData);
      setStatsData(statsRes);
    } catch (err) {
      console.error('Error fetching time tracking data:', err);
      // Show user-friendly error
      if (err.status === 401) {
        showToast('error', 'Session expirée. Veuillez vous reconnecter.');
      } else {
        showToast('error', 'Erreur lors du chargement des données.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get today's date in local timezone (YYYY-MM-DD)
  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayEntry = Array.isArray(entries) ? entries.find(e => e.date === getLocalDateString()) : null;

  const handlePointer = async () => {
    if (!me?.id) {
      showToast('error', 'Profil employé non trouvé. Veuillez vérifier votre profil.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/time-tracking/entries/toggle/');
      showToast('success', res.message || 'Pointage enregistré avec succès');
      fetchData();
    } catch (err) {
      console.error('Pointer failed:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.error || 'Erreur lors du pointage.';
      showToast('error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const userRole = me?.profile?.role || 'employee';
  const canManageQR = ['admin', 'hr', 'manager'].includes(userRole);

  const stats = {
    presence: statsData?.today?.presence_rate || '0%',
    average: statsData?.month?.avg_daily_hours || '0h',
    overtime: statsData?.month?.total_overtime_hours || '0h',
  };

  return (
    <div className="min-h-full flex flex-col bg-[#FDFDFF]">
      {toast.show && (
        <div className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-right-10 backdrop-blur-md ${toast.type === 'error' ? 'bg-red-500/95' : 'bg-gray-900/95 border border-white/10 ring-1 ring-white/20'}`}>
          <HiOutlineClock className="text-xl text-blue-400" />
          <span className="font-black text-xs uppercase tracking-widest">{toast.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="px-6 md:px-12 pt-8 md:pt-12 pb-8 md:pb-10 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div className="animate-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-1 bg-blue-600 rounded-full"></div>
             <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Présence & Pointage</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-3">
            Suivi du Temps
          </h1>
          <p className="text-gray-400 font-medium text-sm md:text-base max-w-lg">
            Gérez vos entrées, sorties et heures de travail avec précision.
          </p>
        </div>
        
        <div className="flex gap-3 animate-in slide-in-from-right-4 duration-700">
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="w-14 h-14 flex items-center justify-center bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition shadow-sm text-gray-400"
          >
            <HiOutlineRefresh className={`text-xl ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button 
            onClick={handlePointer}
            disabled={submitting || (todayEntry && todayEntry.check_out)}
            className={`flex-1 md:flex-none btn px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-xl ring-1 flex items-center gap-3 ${
                todayEntry?.check_out 
                  ? 'bg-gray-50 text-gray-400 border-gray-100 ring-transparent' 
                  : todayEntry 
                    ? 'bg-rose-500 text-white shadow-rose-500/20 ring-rose-400/50 hover:bg-rose-600' 
                    : 'bg-blue-600 text-white shadow-blue-500/20 ring-blue-400/50 hover:bg-blue-700'
            }`}
          >
            {todayEntry?.check_out ? (
              <><HiOutlineCheckCircle size={18} /> Cycle Terminé</>
            ) : todayEntry ? (
              <><HiOutlineLogout size={18} /> Pointer Sortie</>
            ) : (
              <><HiOutlineLogin size={18} /> Pointer Entrée</>
            )}
          </button>
        </div>
      </div>

      <div className="px-6 md:px-12 pb-12 flex-1 flex flex-col gap-8">
        {/* Modern Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
                { label: 'Taux de présence', val: stats.presence, icon: HiOutlineCheckCircle, color: 'emerald' },
                { label: 'Moyenne Journalière', val: stats.average, icon: HiOutlineClock, color: 'blue' },
                { label: 'Heures supplémentaires', val: stats.overtime, icon: HiOutlineClock, color: 'orange' }
            ].map((s, i) => (
                <div key={i} className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 flex items-center justify-between group hover:-translate-y-1 transition-all duration-300">
                    <div>
                        <span className="block text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1.5">{s.label}</span>
                        <div className="text-3xl font-black text-gray-900 tracking-tighter">{s.val}</div>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl bg-${s.color}-50 text-${s.color}-500 flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner`}>
                        <s.icon size={28} />
                    </div>
                </div>
            ))}
        </div>

        {/* Tab System */}
        {canManageQR && (
          <div className="flex gap-2 p-1.5 bg-gray-100/50 rounded-[1.5rem] w-fit border border-gray-100 mb-2">
            <button 
                onClick={() => setActiveTab('history')}
                className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    activeTab === 'history' 
                    ? 'bg-white text-gray-900 shadow-xl shadow-gray-200/50' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
            >
                Historique
            </button>
            <button 
                onClick={() => setActiveTab('qr')}
                className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    activeTab === 'qr' 
                    ? 'bg-white text-gray-900 shadow-xl shadow-gray-200/50' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
            >
                Station QR Code
            </button>
          </div>
        )}

        <div className="flex-1">
          {activeTab === 'qr' && canManageQR ? (
            <AttendanceQR organizationName={me?.organization_name || 'Votre Organisation'} />
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/40 overflow-hidden flex flex-col h-full">
              <div className="p-8 md:p-10 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Activité Récente</h3>
                    <p className="text-gray-400 text-sm font-medium mt-1">Listing complet des pointages enregistrés.</p>
                 </div>
                 {todayEntry && (
                   <div className="flex items-center gap-3 px-6 py-3 bg-blue-50/50 rounded-2xl border border-blue-100/50 ring-1 ring-blue-100">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        Aujourd'hui : {todayEntry.check_in} {todayEntry.check_out ? `- ${todayEntry.check_out}` : '(En cours)'}
                      </span>
                   </div>
                 )}
              </div>

              <div className="overflow-auto custom-scrollbar">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 text-left border-b border-gray-100">
                      <th className="p-6 md:px-10 font-black text-[10px] text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="p-6 font-black text-[10px] text-gray-400 uppercase tracking-widest">Arrivée</th>
                      <th className="p-6 font-black text-[10px] text-gray-400 uppercase tracking-widest">Départ</th>
                      <th className="p-6 font-black text-[10px] text-gray-400 uppercase tracking-widest">Pause</th>
                      <th className="p-6 font-black text-[10px] text-gray-400 uppercase tracking-widest">Total</th>
                      <th className="p-6 md:pr-10 font-black text-[10px] text-gray-400 uppercase tracking-widest">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan="6" className="p-8 border-b border-gray-50"><div className="h-4 bg-slate-50 rounded-full w-3/4"></div></td>
                        </tr>
                      ))
                    ) : Array.isArray(entries) && entries.length > 0 ? (
                      entries.map(e => (
                        <tr key={e.id} className="group hover:bg-slate-50/50 transition-colors border-b border-gray-50">
                          <td className="p-6 md:px-10 font-black text-gray-900 text-sm tracking-tighter">
                            {new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-6 font-bold text-gray-600 text-sm">{e.check_in}</td>
                          <td className="p-6 font-bold text-gray-600 text-sm">{e.check_out || '--:--'}</td>
                          <td className="p-6 text-gray-400 text-sm font-medium">{e.break_minutes} min</td>
                          <td className="p-6">
                             <div className="text-base font-black text-gray-900 tracking-tighter">
                                {e.worked_hours ? `${e.worked_hours}h` : '-'}
                             </div>
                          </td>
                          <td className="p-6 md:pr-10">
                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                e.check_out 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-blue-100 text-blue-700 ring-2 ring-blue-50'
                            }`}>
                              {e.check_out ? 'Cycle Complet' : 'En session'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-20 text-center">
                           <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <HiOutlineClock size={32} />
                           </div>
                           <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Aucun historique</h3>
                           <p className="text-gray-400 font-medium">Vos pointages apparaîtront ici dès que vous commencerez à pointer.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
