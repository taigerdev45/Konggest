'use client';

/**
 * Konggest — Organizations Management (SaaS Admin)
 */
import { useState, useEffect } from 'react';
import { HiOutlineOfficeBuilding, HiOutlineRefresh, HiOutlineSearch, HiOutlinePencil, HiOutlineBan, HiOutlineCheck } from 'react-icons/hi';
import api from '@/lib/api';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounts/organizations/');
      setOrgs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const toggleStatus = async (org) => {
    try {
      await api.patch(`/accounts/organizations/${org.id}/`, { is_active: !org.is_active });
      fetchOrgs();
    } catch (err) {
      alert('Erreur lors de la mise à jour.');
    }
  };

  const changePlan = async (org, plan) => {
    try {
      await api.patch(`/accounts/organizations/${org.id}/`, { plan });
      fetchOrgs();
    } catch (err) {
      alert('Erreur lors du changement de plan.');
    }
  };

  const filtered = orgs.filter(o => {
    if (search && !o.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlan && o.plan !== filterPlan) return false;
    return true;
  });

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>🏢 Organisations Clientes</h1>
          <p>Gestion des entreprises inscrites sur la plateforme</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchOrgs} disabled={loading}>
          <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <HiOutlineSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Rechercher une organisation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select className="input" value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
            <option value="">Tous les plans</option>
            <option value="free">Gratuit</option>
            <option value="starter">Starter</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{filtered.length} résultat(s)</span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Secteur</th>
                <th>Plan</th>
                <th>Employés max</th>
                <th>Statut</th>
                <th>Créée le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan="7"><div className="skeleton" style={{ height: 20 }} /></td></tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map(org => (
                  <tr key={org.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineOfficeBuilding style={{ color: 'var(--primary)' }} />
                        {org.name}
                      </div>
                    </td>
                    <td>{org.sector || '—'}</td>
                    <td>
                      <select
                        className="input"
                        value={org.plan}
                        onChange={e => changePlan(org, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                      >
                        <option value="free">Gratuit</option>
                        <option value="starter">Starter</option>
                        <option value="business">Business</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td>{org.max_employees || 10}</td>
                    <td>
                      <span className={`badge ${org.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {org.is_active ? 'ACTIF' : 'SUSPENDU'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(org.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <button
                        className={`btn btn-xs ${org.is_active ? 'btn-danger' : 'btn-primary'}`}
                        onClick={() => toggleStatus(org)}
                        title={org.is_active ? 'Suspendre' : 'Activer'}
                      >
                        {org.is_active ? <HiOutlineBan /> : <HiOutlineCheck />}
                        {org.is_active ? ' Suspendre' : ' Activer'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune organisation trouvée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
