'use client';
import { HiOutlineBell } from 'react-icons/hi';

const NOTIFS = [
  { id: 1, title: 'Demande de congé', message: 'Sophie Martin a demandé 3 jours de congé payé.', type: 'leave', time: 'Il y a 2h', read: false },
  { id: 2, title: 'Fiche de paie', message: 'Les fiches de paie de mars 2026 ont été générées.', type: 'payroll', time: 'Il y a 5h', read: false },
  { id: 3, title: 'Nouveau candidat', message: 'Claire Dubois a postulé pour Développeur Full-Stack.', type: 'info', time: 'Il y a 1j', read: false },
  { id: 4, title: 'Contrat expirant', message: 'Le contrat CDD de Lucas Bernard expire dans 30 jours.', type: 'warning', time: 'Il y a 2j', read: true },
  { id: 5, title: 'Évaluation complétée', message: 'Pierre Durand a complété son auto-évaluation Q1.', type: 'success', time: 'Il y a 3j', read: true },
];

const TYPE_STYLES = {
  leave: { bg: 'var(--primary-glow)', color: 'var(--primary-light)' },
  payroll: { bg: 'var(--success-bg)', color: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  info: { bg: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-light)' },
  success: { bg: 'var(--success-bg)', color: 'var(--success)' },
};

export default function NotificationsPage() {
  return (
    <div>
      <div className="page-header">
        <div><h1>Notifications</h1><p>Alertes et rappels</p></div>
        <button className="btn btn-secondary">Tout marquer comme lu</button>
      </div>
      <div className="card">
        {NOTIFS.map(n => (
          <div key={n.id} className="flex items-center gap-md" style={{
            padding: '16px 0', borderBottom: '1px solid var(--border)',
            opacity: n.read ? 0.6 : 1,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: TYPE_STYLES[n.type]?.bg, color: TYPE_STYLES[n.type]?.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
            }}><HiOutlineBell /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{n.title}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>{n.message}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
