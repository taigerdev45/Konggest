'use client';

import { useState, useEffect } from 'react';
import { HiOutlineChartBar, HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineShieldExclamation, HiOutlineRefresh } from 'react-icons/hi';
import api from '@/lib/api';

export default function StaffDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounts/staff-stats/');
      setStats(data);
    } catch (err) {
      console.error('Error fetching staff stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <div className="p-xl text-center"><div className="skeleton" style={{ height: 400 }} /></div>;
  if (!stats) return <div className="p-xl text-center">Erreur lors du chargement des statistiques.</div>;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Espace Staff — Métriques SaaS</h1>
          <p>Vue globale sur l'utilisation de la plateforme Konggest</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchStats}>
          <HiOutlineRefresh />
        </button>
      </div>

      <div className="grid grid-4 gap-lg">
        <div className="stat-card purple">
          <div className="stat-icon purple"><HiOutlineOfficeBuilding /></div>
          <div className="stat-info">
            <h3>{stats.total_organizations}</h3>
            <p>Organisations totales</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><HiOutlineUsers /></div>
          <div className="stat-info">
            <h3>{stats.total_users}</h3>
            <p>Utilisateurs SaaS</p>
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon cyan"><HiOutlineUsers /></div>
          <div className="stat-info">
            <h3>{stats.total_employees}</h3>
            <p>Employés gérés</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><HiOutlineShieldExclamation /></div>
          <div className="stat-info">
            <h3>{stats.failed_attempts}</h3>
            <p>Tentatives échouées</p>
          </div>
        </div>
      </div>

      <div className="grid grid-2 gap-lg mt-lg">
        <div className="card">
          <h3 className="mb-md">Distribution des Plans</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Nombre</th>
                </tr>
              </thead>
              <tbody>
                {stats.org_distribution.map((item, i) => (
                  <tr key={i}>
                    <td style={{ textTransform: 'capitalize' }}>{item.plan}</td>
                    <td style={{ fontWeight: 600 }}>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3 className="mb-md">Volumes de Données</h3>
          <div className="flex flex-col gap-md">
            <div className="flex justify-between items-center p-md bg-secondary rounded">
              <span>Demandes de congés</span>
              <span className="badge badge-primary">{stats.total_leave_requests}</span>
            </div>
            <div className="flex justify-between items-center p-md bg-secondary rounded">
              <span>Documents stockés</span>
              <span className="badge badge-success">{stats.total_documents}</span>
            </div>
            <div className="flex justify-between items-center p-md bg-secondary rounded">
              <span>Logins récents</span>
              <span className="badge badge-neutral">{stats.recent_logins}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
