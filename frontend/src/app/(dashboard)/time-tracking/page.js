'use client';

import { useState, useEffect } from 'react';
import { HiOutlineClock, HiOutlineLogin, HiOutlineLogout, HiOutlineRefresh, HiOutlineCheckCircle } from 'react-icons/hi';
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
              <EmployeeScanInfo />
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

function EmployeeScanInfo() {
  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/40 overflow-hidden">
      <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center gap-6">
        <div className="w-20 h-20 bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-blue-500 text-4xl">
          📱
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter mb-2">
            Pointage par QR Code
          </h2>
          <p className="text-gray-400 font-medium max-w-sm mx-auto text-sm">
            Un QR Code unique est affiché à l'entrée de votre établissement.
            Scannez-le avec votre appareil photo pour enregistrer votre présence.
          </p>
        </div>

        <div className="w-full max-w-md grid grid-cols-1 gap-4 text-left">
          {[
            { step: '1', title: 'Ouvrez votre caméra', desc: 'Utilisez l\'appareil photo de votre smartphone ou l\'application de scan.' },
            { step: '2', title: 'Scannez le QR Code affiché', desc: 'Le QR Code se trouve à l\'entrée de vos locaux. Pointez votre caméra dessus.' },
            { step: '3', title: 'Confirme automatiquement', desc: 'Votre pointage est enregistré instantanément et de manière infalsifiable.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4 p-5 rounded-[1.5rem] bg-gray-50/60 border border-gray-100">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0">
                {step}
              </div>
              <div>
                <div className="font-black text-gray-900 text-sm mb-1">{title}</div>
                <div className="text-gray-400 text-xs font-medium">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-widest border border-emerald-100">
          🔒 Cryptographiquement sécurisé — Non falsifiable
        </div>
      </div>
    </div>
  );
}
