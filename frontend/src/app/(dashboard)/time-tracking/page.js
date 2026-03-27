'use client';

import { useState, useEffect } from 'react';
import { HiOutlineClock, HiOutlineLogin, HiOutlineLogout, HiOutlineRefresh, HiOutlineCheckCircle } from 'react-icons/hi';
import api from '@/lib/api';

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesData, meData] = await Promise.all([
        api.get('/time-tracking/entries/'),
        api.get('/employees/me/').catch(() => null),
      ]);
      setEntries(entriesData);
      setMe(meData);
    } catch (err) {
      console.error('Error fetching time tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const todayEntry = entries.find(e => e.date === new Date().toISOString().split('T')[0]);

  const handlePointer = async () => {
    if (!me) return alert('Profil employé non trouvé.');
    setSubmitting(true);
    try {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
      const dateStr = now.toISOString().split('T')[0];

      if (!todayEntry) {
        // Clock In
        await api.post('/time-tracking/entries/', {
          employee: me.id,
          date: dateStr,
          check_in: timeStr,
        });
        alert('Arrivée enregistrée à ' + timeStr);
      } else if (!todayEntry.check_out) {
        // Clock Out
        await api.patch(`/time-tracking/entries/${todayEntry.id}/`, {
          check_out: timeStr,
        });
        alert('Départ enregistré à ' + timeStr);
      } else {
        alert('Vous avez déjà terminé votre journée.');
      }
      fetchData();
    } catch (err) {
      console.error('Pointer failed:', err);
      alert(err.error || 'Erreur lors du pointage.');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    presence: '96.8%', // Mocked for now or calculate from history
    average: entries.length > 0 
      ? (entries.reduce((acc, e) => acc + (e.worked_hours || 0), 0) / entries.length).toFixed(2) + 'h'
      : '0h',
    overtime: '34h', // Mocked
  };

  return (
    <div className="animate-in">
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
              ) : entries.length > 0 ? (
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
    </div>
  );
}
