'use client';

import { useState, useEffect, useRef } from 'react';
import { HiOutlineClock, HiOutlineLogin, HiOutlineLogout, HiOutlineRefresh, HiOutlineCheckCircle } from 'react-icons/hi';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '@/lib/api';
import AttendanceQR from '@/components/attendance/AttendanceQR';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function TimeTrackingPage() {
  const { user } = useAuth();
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

  const userRole = user?.profile?.role || me?.profile?.role || 'employee';
  const canManageQR = ['admin', 'hr', 'manager'].includes(userRole);

  const stats = {
    presence: statsData?.today?.presence_rate || '0%',
    average: statsData?.month?.avg_daily_hours || '0h',
    overtime: statsData?.month?.total_overtime_hours || '0h',
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
           <span className="badge badge-primary">Présence & Pointage</span>
           <h1>Suivi du Temps</h1>
           <p className={styles.subtitle}>
             Gérez vos entrées, sorties et heures de travail avec précision.
           </p>
        </div>
        
        <div className={styles.actions}>
          <button 
            onClick={fetchData} 
            disabled={loading}
            className={styles.refreshBtn}
            title="Rafraîchir"
          >
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button 
            onClick={handlePointer}
            disabled={submitting || (todayEntry && todayEntry.check_out)}
            className={`${styles.pointerBtn} ${
                todayEntry?.check_out 
                  ? styles.pointerDisabled 
                  : todayEntry 
                    ? styles.pointerOut 
                    : styles.pointerIn
            }`}
          >
            {todayEntry?.check_out ? (
              <><HiOutlineCheckCircle /> Cycle Terminé</>
            ) : todayEntry ? (
              <><HiOutlineLogout /> Pointer Sortie</>
            ) : (
              <><HiOutlineLogin /> Pointer Entrée</>
            )}
          </button>
        </div>
      </div>

      <div className="px-6 md:px-12 pb-12 flex-1 flex flex-col gap-8">
        {/* Modern Stats Grid */}
      <div className={styles.statsGrid}>
          {[
              { label: 'Taux de présence', val: stats.presence, icon: HiOutlineCheckCircle, color: styles.emerald },
              { label: 'Moyenne Journalière', val: stats.average, icon: HiOutlineClock, color: styles.blue },
              { label: 'Heures supplémentaires', val: stats.overtime, icon: HiOutlineClock, color: styles.orange }
          ].map((s, i) => (
              <div key={i} className={`${styles.statCard} ${s.color}`}>
                  <div>
                      <span className={styles.statLabel}>{s.label}</span>
                      <div className={styles.statValue}>{s.val}</div>
                  </div>
                  <div className={styles.statIcon}>
                      <s.icon />
                  </div>
              </div>
          ))}
      </div>

        {/* Tab System — visible à tous */}
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
            {canManageQR ? 'Station QR Code' : 'Scanner QR'}
          </button>
        </div>

        <div className="flex-1">
          {activeTab === 'qr' ? (
            canManageQR ? (
              <AttendanceQR organizationName={me?.organization_name || user?.organization_name || 'Votre Organisation'} />
            ) : (
              <EmployeeScanner />
            )
          ) : (
            <div className={styles.contentCard}>
              <div className={styles.cardHeader}>
                 <div className={styles.cardTitle}>
                    <h3>Activité Récente</h3>
                    <p>Listing complet des pointages enregistrés.</p>
                 </div>
                 {todayEntry && (
                   <div className="badge badge-success">
                      Aujourd'hui : {todayEntry.check_in} {todayEntry.check_out ? `- ${todayEntry.check_out}` : '(En cours)'}
                   </div>
                 )}
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Arrivée</th>
                      <th>Départ</th>
                      <th>Pause</th>
                      <th>Total</th>
                      <th>Statut</th>
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
                        <tr key={e.id}>
                          <td className={styles.dateCell}>
                            {new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td>{e.check_in}</td>
                          <td>{e.check_out || '--:--'}</td>
                          <td>{e.break_minutes} min</td>
                          <td className={styles.dateCell}>
                             {e.worked_hours ? `${e.worked_hours}h` : '-'}
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${e.check_out ? styles.complete : styles.active}`}>
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

function EmployeeScanner() {
  const [scanType, setScanType] = useState('in');
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', text: '' });
  const processingRef = useRef(false);

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false }), 4000);
  };

  useEffect(() => {
    if (done) return;
    const scanner = new Html5QrcodeScanner('tt-reader', {
      qrbox: { width: 240, height: 240 },
      fps: 5,
      rememberLastUsedCamera: true,
    });

    scanner.render(async (decodedText) => {
      if (processingRef.current) return;
      processingRef.current = true;
      try {
        const res = await api.post('/time-tracking/entries/scan/', {
          token: decodedText,
          scan_type: scanType,
        });
        showToast('success', res.message || 'Pointage enregistré');
        setDone(true);
        scanner.clear();
      } catch (err) {
        const msg = err?.error || err?.response?.data?.error || 'QR invalide ou expiré.';
        showToast('error', msg);
        setTimeout(() => { processingRef.current = false; }, 3000);
      }
    }, () => {});

    return () => { scanner.clear().catch(() => {}); };
  }, [scanType, done]);

  if (done) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
        <div className="p-12 flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center">
            <HiOutlineCheckCircle className="text-white text-4xl" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter mb-2">Pointage validé</h2>
            <p className="text-gray-400 text-sm font-medium">Votre présence a été enregistrée.</p>
          </div>
          <button
            onClick={() => { setDone(false); processingRef.current = false; }}
            className="px-6 py-3 rounded-2xl bg-gray-100 text-gray-700 font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
          >
            Nouveau pointage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/40 overflow-hidden">
      {toast.show && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 text-white z-[200] ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900'}`}>
          <span className="font-black text-xs uppercase tracking-widest">{toast.text}</span>
        </div>
      )}

      <div className="p-6 pb-0 text-center">
        <h2 className="text-xl font-black text-gray-900 tracking-tighter mb-1">Scanner QR Code</h2>
        <p className="text-gray-400 text-xs font-medium mb-4">Pointez la caméra sur le QR Code de votre établissement.</p>

        <div className="flex gap-3 p-1.5 bg-gray-100/60 rounded-[1.5rem] w-fit mx-auto mb-5">
          <button
            onClick={() => { setScanType('in'); processingRef.current = false; }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${scanType === 'in' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <HiOutlineLogin size={14} /> Arrivée
          </button>
          <button
            onClick={() => { setScanType('out'); processingRef.current = false; }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${scanType === 'out' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <HiOutlineLogout size={14} /> Départ
          </button>
        </div>
      </div>

      <div className="relative">
        <div id="tt-reader" className="w-full" />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-52 h-52 relative">
            <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
          </div>
        </div>
      </div>

      <div className="p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
          {scanType === 'in' ? 'Prêt — Arrivée' : 'Prêt — Départ'}
        </p>
      </div>
    </div>
  );
}
