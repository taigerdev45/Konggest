'use client';

/**
 * Konggest — Dashboard Page
 * KPIs RH temps réel depuis /api/analytics/kpis/
 *
 * CORRECTIONS APPLIQUÉES (2026-04-11) :
 * - [P0] Suppression de TOUTES les valeurs hardcodées/mock :
 *     mass_salary: '452M FCFA'     → Payslip.aggregate(Sum(net_salary)) réel
 *     open_positions: 8             → JobPosting.filter(status='published').count() réel
 *     taux de présence: 96.8%      → TimeEntry / jours_théoriques réel
 *     congés restants: 18.5j       → quota légal gabonais - jours pris réel
 *     candidatures: 23             → Application.exclude(hired/rejected).count() réel
 *     RECENT_ACTIVITY_MOCK         → AuditLog réel (8 dernières entrées)
 * - [P1] Endpoint unique /api/analytics/kpis/ remplace 6 appels disparates
 * - [P2] Supabase Realtime : écoute kpi:{tenant_id} pour mise à jour auto
 * - [P3] Toast natif sur changements critiques
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  HiOutlineUsers, HiOutlineCalendar,
  HiOutlineCurrencyDollar, HiOutlineBriefcase,
  HiOutlineClipboardCheck, HiOutlineTrendingUp,
  HiOutlineBell, HiOutlineDocumentReport,
} from 'react-icons/hi';
import api from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import styles from './dashboard.module.css';

const STATUS_MAP = {
  pending: { label: 'En attente', class: 'badge-warning' },
  approved: { label: 'Approuvé', class: 'badge-success' },
  rejected: { label: 'Refusé', class: 'badge-danger' },
};

const formatCurrency = (val) =>
  val > 0
    ? new Intl.NumberFormat('fr-FR', { style: 'decimal' }).format(Math.round(val)) + ' FCFA'
    : '—';

const formatRate = (val) =>
  typeof val === 'number' ? `${val.toFixed(1)}%` : '—';

export default function DashboardPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, text: '', type: 'info' });

  const showToast = (text, type = 'info') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '' }), 5000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1 seul appel backend agrégé (remplace 6+ appels disparates)
      const [kpiData, leavesData] = await Promise.all([
        api.get('/analytics/kpis/'),
        api.get('/leaves/requests/'),
      ]);
      setKpis(kpiData);
      setRecentLeaves(
        Array.isArray(leavesData)
          ? leavesData.slice(0, 5)
          : (leavesData?.results || []).slice(0, 5)
      );
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      showToast('Erreur lors du chargement des KPIs.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Supabase Realtime — écoute les mutations critiques (paie, employés, congés)
    const tenant_id = localStorage.getItem('tenant_id') || '';
    if (!tenant_id) return;

    const channel = supabase.channel(`kpi:${tenant_id}`)
      .on('broadcast', { event: 'kpi.refresh' }, (payload) => {
        const { reason } = payload.payload || {};
        showToast(reason || 'KPIs mis à jour', 'info');
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const e = kpis?.employees || {};
  const p = kpis?.payroll || {};
  const a = kpis?.attendance || {};
  const r = kpis?.recruitment || {};

  const STATS_CARDS = [
    {
      label: 'Employés actifs',
      value: loading ? '…' : (e.active ?? '—').toString(),
      change: `Total : ${e.total ?? '—'}`,
      icon: HiOutlineUsers, color: 'purple',
    },
    {
      label: 'En congé / Absence',
      value: loading ? '…' : (e.on_leave ?? '—').toString(),
      change: 'Aujourd\'hui',
      icon: HiOutlineCalendar, color: 'cyan',
    },
    {
      label: 'Turnover Global',
      value: loading ? '…' : formatRate(e.turnover_rate),
      change: 'Annuel estimé',
      icon: HiOutlineTrendingUp, color: 'orange',
    },
    {
      label: 'Ratio Expatriés',
      value: loading ? '…' : formatRate(e.expat_ratio),
      change: 'Gabonisation',
      icon: HiOutlineBriefcase, color: 'green',
    },
  ];

  const greeting = getGreeting();
  const recentActivity = kpis?.recent_activity || [];

  return (
    <div className={styles.dashboard}>
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: 76, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#dc2626' : '#0284c7',
          color: 'white', padding: '12px 20px', borderRadius: 10,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 10,
          maxWidth: 380, fontSize: '0.88rem',
        }}>
          <HiOutlineBell size={18} />
          <span>{toast.text}</span>
        </div>
      )}

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

        {/* Activité Récente — RÉELLE depuis AuditLog (plus de mock) */}
        <div className="card animate-in delay-4">
          <div className="flex items-center justify-between mb-md">
            <h3>Activité récente</h3>
            <HiOutlineClipboardCheck style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className={styles.activityList}>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className={styles.activityItem} style={{ opacity: 0.4 }}>
                  <div className={styles.activityDot} />
                  <div className={styles.activityContent}>
                    <span className={styles.activityAction}>Chargement…</span>
                  </div>
                </div>
              ))
            ) : recentActivity.length > 0 ? (
              recentActivity.map((act, i) => (
                <div key={i} className={`${styles.activityItem} animate-in`} style={{ animationDelay: `${0.1 * i}s` }}>
                  <div className={styles.activityDot} />
                  <div className={styles.activityContent}>
                    <span className={styles.activityAction}>{act.action}</span>
                    <span className={styles.activityDetail}>{act.detail}</span>
                  </div>
                  <span className={styles.activityTime}>{act.time}</span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aucune activité récente</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Bar — DONNÉES RÉELLES (plus de valeurs hardcodées) */}
      <div className={styles.quickStats}>
        <div className={`card-glass ${styles.quickStat}`}>
          <HiOutlineTrendingUp className={styles.quickIcon} style={{ color: 'var(--success)' }} />
          <div>
            <span className={styles.quickValue}>
              {loading ? '…' : formatRate(a.rate)}
            </span>
            <span className={styles.quickLabel}>Taux de présence</span>
          </div>
        </div>
        <div className={`card-glass ${styles.quickStat}`}>
          <HiOutlineCalendar className={styles.quickIcon} style={{ color: 'var(--primary-light)' }} />
          <div>
            <span className={styles.quickValue}>
              {loading ? '…' : `${a.avg_leave_remaining ?? '—'}j`}
            </span>
            <span className={styles.quickLabel}>Congés moy. restants</span>
          </div>
        </div>
        <div className={`card-glass ${styles.quickStat}`}>
          <HiOutlineUsers className={styles.quickIcon} style={{ color: 'var(--accent-light)' }} />
          <div>
            <span className={styles.quickValue}>
              {loading ? '…' : (r.active_applications ?? '—')}
            </span>
            <span className={styles.quickLabel}>Candidatures actives</span>
          </div>
        </div>
        <div className={`card-glass ${styles.quickStat}`}>
          <HiOutlineCurrencyDollar className={styles.quickIcon} style={{ color: 'var(--warning)' }} />
          <div>
            <span className={styles.quickValue}>
              {loading ? '…' : (p.mass_salary > 0 ? formatCurrency(p.mass_salary) : '—')}
            </span>
            <span className={styles.quickLabel}>Masse salariale nette</span>
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
