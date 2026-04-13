'use client';

/**
 * Konggest — Centre de Contrôle SaaS (Global)
 * Supervision des organisations, MRR et santé plateforme.
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  HiOutlineOfficeBuilding, HiOutlineUsers, 
  HiOutlineShieldExclamation, HiOutlineCurrencyDollar, 
  HiOutlineRefresh
} from 'react-icons/hi';
import api from '@/lib/api';
import styles from './page.module.css';

const formatCurrency = (val) => 
  new Intl.NumberFormat('fr-FR', { style: 'decimal' }).format(Math.round(val)) + ' FCFA';

export default function StaffDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/accounts/staff-stats/');
      setStats(data);
    } catch (err) {
      console.error('Error fetching staff stats:', err);
      setError('Impossible de charger les statistiques système.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className="badge badge-primary">SYSTEM MONITORING</span>
          <h1>Command Center</h1>
          <p className={styles.subtitle}>Real-time platform analytics & revenue tracking.</p>
        </div>
        <button 
          className="iconBtn"
          onClick={fetchData} 
          disabled={loading}
          title="Actualiser les données"
        >
          <HiOutlineRefresh className={loading ? 'animate-spin text-primary' : ''} />
        </button>
      </div>

      {error && (
        <div className="glass-card border-red-200 text-red-600 p-5 mb-8 flex items-center gap-4 animate-in">
          <div className="p-3 bg-red-100 rounded-xl"><HiOutlineShieldExclamation size={24} /></div>
          <span className="font-bold">{error}</span>
        </div>
      )}

      {loading && !stats ? (
        <div className={styles.kpiGrid}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '160px', borderRadius: '24px' }} />
          ))}
        </div>
      ) : stats ? (
        <div className={styles.content}>
          {/* Main KPI Grid */}
          <div className={styles.kpiGrid}>
            {/* MRR Card (Premium Highlight) */}
            <div className={`${styles.card} ${styles.mrrCard}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <HiOutlineCurrencyDollar />
                </div>
                <span className={styles.cardLabel}>Flux Mensuel</span>
              </div>
              <h3 className={styles.cardValue}>{formatCurrency(stats.mrr || 0)}</h3>
              <p className={styles.cardLabel}>Revenue Récurrent (MRR)</p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon} style={{ color: '#10B981', background: '#ECFDF5' }}>
                  <HiOutlineOfficeBuilding />
                </div>
                <span className={styles.cardLabel}>Entreprises</span>
              </div>
              <h4 className={styles.cardValue}>{stats.total_organizations || 0}</h4>
              <div className={styles.healthTrack}>
                <div 
                  className={styles.healthBar} 
                  style={{ width: `${(stats.active_organizations / (stats.total_organizations || 1)) * 100}%`, background: '#10B981' }} 
                />
              </div>
              <div className={styles.healthMeta}>
                <span>{stats.active_organizations || 0} Actives</span>
                <span>Optimal</span>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon} style={{ color: '#3B82F6', background: '#EFF6FF' }}>
                  <HiOutlineUsers />
                </div>
                <span className={styles.cardLabel}>Collab. Gérés</span>
              </div>
              <h4 className={styles.cardValue}>{stats.total_employees || 0}</h4>
              <p className={styles.cardLabel} style={{ marginTop: '16px' }}>Total Utilisateurs</p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon} style={{ color: '#EF4444', background: '#FEF2F2' }}>
                  <HiOutlineShieldExclamation />
                </div>
                <span className={styles.cardLabel}>Incidents Sécu.</span>
              </div>
              <h4 className={styles.cardValue}>{stats.failed_attempts || 0}</h4>
              <p className={styles.cardLabel} style={{ marginTop: '16px' }}>Dernières 24h</p>
            </div>
          </div>

          <div className={styles.secondaryGrid}>
            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>Distribution Plans</h3>
              <div className={styles.planList}>
                {(stats.org_distribution || []).map((item, i) => (
                  <div key={i} className={styles.planRow}>
                    <div className={styles.planInfo}>
                      <span className={styles.planName}>{item.plan}</span>
                      <span className={styles.planCount}>{item.count}</span>
                    </div>
                    <div className={styles.healthTrack}>
                      <div 
                        className={styles.healthBar}
                        style={{ 
                          width: `${(item.count / (stats.total_organizations || 1)) * 100}%`,
                          background: item.plan === 'premium' ? '#6366F1' : item.plan === 'pro' ? '#3B82F6' : '#94A3B8'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>Santé Système</h3>
              <div className={styles.vitalsGrid}>
                <div className={styles.vitalBox}>
                  <p className={styles.vitalLabel}>Documents HR</p>
                  <p className={styles.vitalValue}>{stats.total_documents || 0}</p>
                </div>
                <div className={styles.vitalBox}>
                  <p className={styles.vitalLabel}>Demandes Congés</p>
                  <p className={styles.vitalValue}>{stats.total_leave_requests || 0}</p>
                </div>
                <div className={styles.vitalBox}>
                  <p className={styles.vitalLabel}>Sessions Actives</p>
                  <p className={styles.vitalValue}>{stats.recent_logins || 0}</p>
                </div>
                <div className={styles.vitalBox} style={{ background: '#ECFDF5' }}>
                  <p className={styles.vitalLabel}>Latence Moy.</p>
                  <p className={styles.vitalValue} style={{ color: '#059669' }}>82ms</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
