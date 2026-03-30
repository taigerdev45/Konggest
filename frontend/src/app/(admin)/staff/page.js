'use client';

/**
 * Konggest — SaaS Admin Dashboard
 * Global platform metrics and overview.
 */
import { useState, useEffect } from 'react';
import { HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineShieldExclamation, HiOutlineDocumentText, HiOutlineRefresh, HiOutlineTrendingUp } from 'react-icons/hi';
import api from '@/lib/api';

export default function StaffDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/accounts/staff-stats/');
      setStats(data);
    } catch (err) {
      console.error('Error fetching staff stats:', err);
      setError('Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>🎛️ Centre de Contrôle SaaS</h1>
          <p>Supervision globale de la plateforme Konggest</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchData} disabled={loading}>
          <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <div className="card" style={{ padding: 20, color: 'var(--danger)', textAlign: 'center' }}>{error}</div>}

      {loading && !stats ? (
        <div className="grid grid-4 gap-lg">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-4 gap-lg">
            <div className="stat-card purple">
              <div className="stat-icon purple"><HiOutlineOfficeBuilding /></div>
              <div className="stat-info">
                <h3>{stats.total_organizations || 0}</h3>
                <p>Organisations</p>
              </div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon green"><HiOutlineUsers /></div>
              <div className="stat-info">
                <h3>{stats.total_users || 0}</h3>
                <p>Utilisateurs</p>
              </div>
            </div>
            <div className="stat-card cyan">
              <div className="stat-icon cyan"><HiOutlineUsers /></div>
              <div className="stat-info">
                <h3>{stats.total_employees || 0}</h3>
                <p>Employés</p>
              </div>
            </div>
            <div className="stat-card orange">
              <div className="stat-icon orange"><HiOutlineShieldExclamation /></div>
              <div className="stat-info">
                <h3>{stats.failed_attempts || 0}</h3>
                <p>Alertes Sécurité</p>
              </div>
            </div>
          </div>

          {/* Detail Cards */}
          <div className="grid grid-2 gap-lg" style={{ marginTop: 24 }}>
            <div className="card">
              <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HiOutlineTrendingUp /> Distribution des Plans
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Plan</th><th>Organisations</th><th>Part</th></tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(stats.org_distribution) ? stats.org_distribution : []).map((item, i) => (
                      <tr key={i}>
                        <td>
                          <span className={`badge ${item.plan === 'enterprise' ? 'badge-purple' : item.plan === 'business' ? 'badge-primary' : item.plan === 'starter' ? 'badge-warning' : 'badge-neutral'}`}>
                            {(item.plan || '').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.count}</td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {stats.total_organizations > 0 ? Math.round((item.count / stats.total_organizations) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HiOutlineDocumentText /> Données Consolidées
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <span>Organisations actives</span>
                  <span className="badge badge-success">{stats.active_organizations || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <span>Demandes de congés</span>
                  <span className="badge badge-primary">{stats.total_leave_requests || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <span>Documents RH stockés</span>
                  <span className="badge badge-neutral">{stats.total_documents || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <span>Connexions récentes</span>
                  <span className="badge badge-neutral">{stats.recent_logins || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
