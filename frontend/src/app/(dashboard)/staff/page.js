'use client';

import { useState, useEffect } from 'react';
import { HiOutlineChartBar, HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineShieldExclamation, HiOutlineRefresh } from 'react-icons/hi';
import api from '@/lib/api';

export default function StaffDashboardPage() {
  const [stats, setStats] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('metrics'); // 'metrics' or 'organizations'

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, orgsData] = await Promise.all([
        api.get('/accounts/staff-stats/'),
        api.get('/accounts/organizations/'),
      ]);
      setStats(statsData);
      setOrganizations(orgsData);
    } catch (err) {
      console.error('Error fetching staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !stats) return <div className="p-xl text-center"><div className="skeleton" style={{ height: 400 }} /></div>;
  if (!stats) return <div className="p-xl text-center">Erreur lors du chargement des statistiques.</div>;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Espace Staff — Centre de Contrôle SaaS</h1>
          <p>Supervision globale de la plateforme Konggest</p>
        </div>
        <div className="flex gap-sm">
          <button className={`btn ${tab === 'metrics' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('metrics')}>
            Métriques
          </button>
          <button className={`btn ${tab === 'organizations' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('organizations')}>
            Organisations
          </button>
          <button className="btn btn-ghost" onClick={fetchData}>
            <HiOutlineRefresh />
          </button>
        </div>
      </div>

      {tab === 'metrics' ? (
        <>
          <div className="grid grid-4 gap-lg">
            <div className="stat-card purple">
              <div className="stat-icon purple"><HiOutlineOfficeBuilding /></div>
              <div className="stat-info">
                <h3>{stats.total_organizations}</h3>
                <p>Organisations</p>
              </div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon green"><HiOutlineUsers /></div>
              <div className="stat-info">
                <h3>{stats.total_users}</h3>
                <p>Utilisateurs</p>
              </div>
            </div>
            <div className="stat-card cyan">
              <div className="stat-icon cyan"><HiOutlineUsers /></div>
              <div className="stat-info">
                <h3>{stats.total_employees}</h3>
                <p>Employés</p>
              </div>
            </div>
            <div className="stat-card orange">
              <div className="stat-icon orange"><HiOutlineShieldExclamation /></div>
              <div className="stat-info">
                <h3>{stats.failed_attempts}</h3>
                <p>Alertes Sécurité</p>
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
              <h3 className="mb-md">Données Consolidées</h3>
              <div className="flex flex-col gap-md">
                <div className="flex justify-between items-center p-md bg-secondary rounded">
                  <span>Demandes de congés cumulées</span>
                  <span className="badge badge-primary">{stats.total_leave_requests}</span>
                </div>
                <div className="flex justify-between items-center p-md bg-secondary rounded">
                  <span>Documents RH stockés</span>
                  <span className="badge badge-success">{stats.total_documents}</span>
                </div>
                <div className="flex justify-between items-center p-md bg-secondary rounded">
                  <span>Connexions récentes</span>
                  <span className="badge badge-neutral">{stats.recent_logins}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card animate-in">
          <h3 className="mb-md">Liste des Organisations Clients</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nom de l'entreprise</th>
                  <th>Secteur</th>
                  <th>Plan</th>
                  <th>Statut</th>
                  <th>Création</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id}>
                    <td style={{ fontWeight: 600 }}>{org.name}</td>
                    <td>{org.sector || 'N/A'}</td>
                    <td>
                      <span className={`badge ${org.plan === 'enterprise' ? 'badge-purple' : org.plan === 'business' ? 'badge-primary' : 'badge-neutral'}`}>
                        {org.plan.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${org.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {org.is_active ? 'ACTIF' : 'SUSPENDU'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(org.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <button className="btn btn-xs btn-ghost">Gérer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
