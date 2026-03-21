'use client';

/**
 * Konggest — Dashboard Page
 * KPI stats, charts, and quick overview.
 */
import { useAuth } from '@/contexts/AuthContext';
import {
  HiOutlineUsers, HiOutlineCalendar,
  HiOutlineCurrencyDollar, HiOutlineBriefcase,
  HiOutlineClipboardCheck, HiOutlineTrendingUp,
} from 'react-icons/hi';
import styles from './dashboard.module.css';

// Mock data for demo
const STATS = [
  { label: 'Employés actifs', value: '147', change: '+3', icon: HiOutlineUsers, color: 'purple' },
  { label: 'En congé', value: '12', change: '+2', icon: HiOutlineCalendar, color: 'cyan' },
  { label: 'Masse salariale', value: '€452K', change: '+1.5%', icon: HiOutlineCurrencyDollar, color: 'green' },
  { label: 'Postes ouverts', value: '8', change: '+1', icon: HiOutlineBriefcase, color: 'orange' },
];

const RECENT_LEAVES = [
  { name: 'Sophie Martin', type: 'Congé payé', days: '3j', status: 'pending', date: '22/03' },
  { name: 'Pierre Durand', type: 'Maladie', days: '1j', status: 'approved', date: '21/03' },
  { name: 'Marie Lefèvre', type: 'Congé payé', days: '5j', status: 'approved', date: '20/03' },
  { name: 'Lucas Bernard', type: 'Sans solde', days: '2j', status: 'rejected', date: '19/03' },
  { name: 'Emma Petit', type: 'Congé payé', days: '4j', status: 'pending', date: '19/03' },
];

const RECENT_ACTIVITY = [
  { action: 'Nouvel employé ajouté', detail: 'Thomas Moreau — Dev Frontend', time: 'Il y a 2h' },
  { action: 'Congé approuvé', detail: 'Pierre Durand — 1 jour maladie', time: 'Il y a 3h' },
  { action: 'Fiche de paie générée', detail: 'Mars 2026 — 147 employés', time: 'Il y a 5h' },
  { action: 'Entretien planifié', detail: 'Claire Dubois — Développeur', time: 'Il y a 1j' },
  { action: 'Document uploadé', detail: 'Contrat CDI — Thomas Moreau', time: 'Il y a 1j' },
];

const STATUS_MAP = {
  pending: { label: 'En attente', class: 'badge-warning' },
  approved: { label: 'Approuvé', class: 'badge-success' },
  rejected: { label: 'Refusé', class: 'badge-danger' },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const greeting = getGreeting();

  return (
    <div className={styles.dashboard}>
      {/* Welcome */}
      <div className={styles.welcome}>
        <div>
          <h1>{greeting}, {user?.full_name || 'Admin'} 👋</h1>
          <p>Voici un aperçu de votre organisation aujourd&apos;hui</p>
        </div>
        <div className={styles.dateBox}>
          <span className={styles.dateDay}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}</span>
          <span className={styles.dateNum}>{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-4">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`stat-card ${stat.color} animate-in delay-${i + 1}`}>
              <div className={`stat-icon ${stat.color}`}>
                <Icon />
              </div>
              <div className="stat-info">
                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
              </div>
              <span className={styles.change}>{stat.change}</span>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className={styles.contentGrid}>
        {/* Recent Leaves */}
        <div className="card">
          <div className="flex items-center justify-between mb-md">
            <h3>Demandes de congés récentes</h3>
            <a href="/leaves" className="btn btn-ghost btn-sm">Voir tout →</a>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Employé</th>
                  <th>Type</th>
                  <th>Durée</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_LEAVES.map((leave, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{leave.name}</td>
                    <td>{leave.type}</td>
                    <td>{leave.days}</td>
                    <td>
                      <span className={`badge ${STATUS_MAP[leave.status].class}`}>
                        {STATUS_MAP[leave.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-md">
            <h3>Activité récente</h3>
            <HiOutlineClipboardCheck style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className={styles.activityList}>
            {RECENT_ACTIVITY.map((act, i) => (
              <div key={i} className={styles.activityItem}>
                <div className={styles.activityDot} />
                <div className={styles.activityContent}>
                  <span className={styles.activityAction}>{act.action}</span>
                  <span className={styles.activityDetail}>{act.detail}</span>
                </div>
                <span className={styles.activityTime}>{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className={styles.quickStats}>
        <div className={`card-glass ${styles.quickStat}`}>
          <HiOutlineTrendingUp className={styles.quickIcon} style={{ color: 'var(--success)' }} />
          <div>
            <span className={styles.quickValue}>96.8%</span>
            <span className={styles.quickLabel}>Taux de présence</span>
          </div>
        </div>
        <div className={`card-glass ${styles.quickStat}`}>
          <HiOutlineCalendar className={styles.quickIcon} style={{ color: 'var(--primary-light)' }} />
          <div>
            <span className={styles.quickValue}>18.5j</span>
            <span className={styles.quickLabel}>Congés moy. restants</span>
          </div>
        </div>
        <div className={`card-glass ${styles.quickStat}`}>
          <HiOutlineUsers className={styles.quickIcon} style={{ color: 'var(--accent-light)' }} />
          <div>
            <span className={styles.quickValue}>23</span>
            <span className={styles.quickLabel}>Candidatures actives</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}
