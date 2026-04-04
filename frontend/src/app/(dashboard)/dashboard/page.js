'use client';

/**
 * Konggest — Dashboard Page
 * KPI stats, charts, and quick overview.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  HiOutlineUsers, HiOutlineCalendar,
  HiOutlineCurrencyDollar, HiOutlineBriefcase,
  HiOutlineClipboardCheck, HiOutlineTrendingUp,
} from 'react-icons/hi';
import api from '@/lib/api';
import styles from './dashboard.module.css';

const RECENT_ACTIVITY_MOCK = [
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
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    on_leave: 0,
    turnover_rate: 0,
    expat_ratio: 0,
    mass_salary: '0 FCFA',
    open_positions: 0,
  });
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsData, leavesData] = await Promise.all([
          api.get('/employees/stats/'),
          api.get('/leaves/requests/'),
        ]);
        
        setStats({
          ...statsData,
          mass_salary: '452M FCFA', // Mock for now, requires total sum in API
          open_positions: 8,
        });
        setRecentLeaves(Array.isArray(leavesData) ? leavesData.slice(0, 5) : []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const STATS_CARDS = [
    { label: 'Employés actifs', value: stats.active.toString(), change: 'Cible : 100%', icon: HiOutlineUsers, color: 'purple' },
    { label: 'En congé / Absence', value: stats.on_leave.toString(), change: 'Aujourd\'hui', icon: HiOutlineCalendar, color: 'cyan' },
    { label: 'Turnover Global', value: `${stats.turnover_rate}%`, change: 'Annuel est.', icon: HiOutlineTrendingUp, color: 'orange' },
    { label: 'Ratio Expatriés', value: `${stats.expat_ratio}%`, change: 'Gabonisation', icon: HiOutlineBriefcase, color: 'green' },
  ];

  const greeting = getGreeting();

  return (
    <div className={styles.dashboard}>
      {/* Welcome */}
      <div className={styles.welcome}>
        <div>
          <h1>{greeting}, {user?.profile?.full_name || user?.email || 'Admin'} 👋</h1>
          <p>Voici un aperçu de votre organisation aujourd&apos;hui</p>
        </div>
        <div className={styles.dateBox}>
          <span className={styles.dateDay}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}</span>
          <span className={styles.dateNum}>{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="stat-card skeleton" style={{ height: 120 }} />
          ))
        ) : (
          STATS_CARDS.map((stat, i) => {
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
          })
        )}
      </div>

      {/* Content Grid */}
      <div className={styles.contentGrid}>
        {/* Recent Leaves */}
        <div className="card animate-in delay-3">
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
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentLeaves.length > 0 ? (
                  recentLeaves.map((leave, i) => (
                    <tr key={i} className={`animate-in delay-${Math.min(i + 1, 4)}`}>
                      <td style={{ fontWeight: 500 }}>{leave.employee_name || 'Employé'}</td>
                      <td>{leave.leave_type_name || 'Congé'}</td>
                      <td>
                        <span className={`badge ${STATUS_MAP[leave.status]?.class || 'badge-neutral'}`}>
                          {STATUS_MAP[leave.status]?.label || leave.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: 20 }}>Aucun congé récent</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card animate-in delay-4">
          <div className="flex items-center justify-between mb-md">
            <h3>Activité récente</h3>
            <HiOutlineClipboardCheck style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className={styles.activityList}>
            {RECENT_ACTIVITY_MOCK.map((act, i) => (
              <div key={i} className={`${styles.activityItem} animate-in`} style={{ animationDelay: `${0.1 * i}s` }}>
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
