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
      const data = await api.get('/accounts/platform-users/');
      setUsers(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u => {
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) &&
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

      {/* Info removed as it's now accurate */}

      {/* Organizations as user groups */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Utilisateurs</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Organisation</th>
                <th>Statut</th>
                <th>Créé le</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan="6"><div className="skeleton" style={{ height: 20 }} /></td></tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineUsers style={{ color: 'var(--primary)' }} />
                        {u.full_name}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HiOutlineMail style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }} />
                        {u.email}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-neutral`}>
                        {(u.role || '').toUpperCase()}
                      </span>
                    </td>
                    <td>{u.organization_name || `ID: ${u.organization}`}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'ACTIF' : 'INACTIF'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
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
