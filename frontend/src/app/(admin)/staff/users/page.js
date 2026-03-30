'use client';

/**
 * Konggest — Platform Users Management (SaaS Admin)
 */
import { useState, useEffect } from 'react';
import { HiOutlineUsers, HiOutlineRefresh, HiOutlineSearch, HiOutlineMail } from 'react-icons/hi';
import api from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Use the staff-stats endpoint to get user count, and organizations for user listing
      // For a full user list, we'd need a dedicated endpoint
      const orgs = await api.get('/accounts/organizations/');
      // Flatten all org data into a simple user-like list
      setUsers(Array.isArray(orgs) ? orgs : []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u => {
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) &&
        !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>👥 Utilisateurs Plateforme</h1>
          <p>Tous les utilisateurs inscrits sur Konggest</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchUsers} disabled={loading}>
          <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <HiOutlineSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px', background: 'var(--primary-glow)', border: '1px solid var(--primary)', borderRadius: 12 }}>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          <strong>💡 Note :</strong> Cette vue affiche les organisations et leurs membres. Pour une liste complète des utilisateurs individuels,
          un endpoint dédié sera nécessaire dans l'API backend.
        </p>
      </div>

      {/* Organizations as user groups */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Statut</th>
                <th>Max Employés</th>
                <th>Créée le</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan="6"><div className="skeleton" style={{ height: 20 }} /></td></tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map(org => (
                  <tr key={org.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineUsers style={{ color: 'var(--primary)' }} />
                        {org.name}
                      </div>
                    </td>
                    <td>
                      {org.email ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <HiOutlineMail style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }} />
                          {org.email}
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${org.plan === 'enterprise' ? 'badge-purple' : org.plan === 'business' ? 'badge-primary' : 'badge-neutral'}`}>
                        {(org.plan || '').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${org.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {org.is_active ? 'ACTIF' : 'INACTIF'}
                      </span>
                    </td>
                    <td>{org.max_employees || 10}</td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(org.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun utilisateur trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
