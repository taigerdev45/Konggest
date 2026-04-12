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
    <div className="animate-in">
      {toast.show && (
        <div className={`toast toast-${toast.type} fixed top-4 right-4 z-50 p-4 rounded shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.text}
        </div>
      )}
      <div className="page-header">
        <div>
          <h1>Suivi du Temps</h1>
          <p>Pointage, présences et heures supplémentaires</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={fetchData} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            className={`btn ${todayEntry?.check_out ? 'btn-neutral' : todayEntry ? 'btn-danger' : 'btn-primary'}`} 
            onClick={handlePointer}
            disabled={submitting || (todayEntry && todayEntry.check_out)}
          >
            {todayEntry?.check_out ? (
              <><HiOutlineCheckCircle /> Terminé</>
            ) : todayEntry ? (
              <><HiOutlineLogout /> Sortie</>
            ) : (
              <><HiOutlineLogin /> Entrée</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-icon green"><HiOutlineClock /></div>
          <div className="stat-info">
            <h3>{stats.presence}</h3>
            <p>Taux de présence</p>
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon cyan"><HiOutlineClock /></div>
          <div className="stat-info">
            <h3>{stats.average}</h3>
            <p>Moyenne journalière</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><HiOutlineClock /></div>
          <div className="stat-info">
            <h3>{stats.overtime}</h3>
            <p>Heures sup. ce mois</p>
          </div>
        </div>
      </div>

      {canManageQR && (
        <div className="flex gap-4 mb-6 border-b">
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 font-bold text-sm transition ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400 font-medium'}`}
          >
            HISTORIQUE
          </button>
          <button 
            onClick={() => setActiveTab('qr')}
            className={`pb-3 px-4 font-bold text-sm transition ${activeTab === 'qr' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400 font-medium'}`}
          >
            STATION QR CODE
          </button>
        </div>
      )}

      {activeTab === 'qr' && canManageQR ? (
        <AttendanceQR organizationName={me?.organization_name || 'Votre Organisation'} />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="p-lg border-b flex justify-between items-center">
            <h3 style={{ margin: 0 }}>Historique récent</h3>
            {todayEntry && (
              <div className="badge badge-primary">
                Aujourd&apos;hui : {todayEntry.check_in} {todayEntry.check_out ? `- ${todayEntry.check_out}` : '(En cours)'}
              </div>
            )}
          </div>
          <div className="table-container">
            <table style={{ margin: 0 }}>
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
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="skeleton-row">
                      <td colSpan="6"><div className="skeleton" style={{ height: 20 }} /></td>
                    </tr>
                  ))
                ) : Array.isArray(entries) && entries.length > 0 ? (
                  entries.map(e => (
                    <tr key={e.id}>
                      <td>{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                      <td>{e.check_in}</td>
                      <td>{e.check_out || '--:--'}</td>
                      <td>{e.break_minutes} min</td>
                      <td style={{ fontWeight: 600 }}>{e.worked_hours ? `${e.worked_hours}h` : '-'}</td>
                      <td>
                        <span className={`badge ${e.check_out ? 'badge-success' : 'badge-warning'}`}>
                          {e.check_out ? 'Complet' : 'En cours'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      Aucun historique disponible.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
