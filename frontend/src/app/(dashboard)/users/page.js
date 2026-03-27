'use client';

import { useState, useEffect } from 'react';
import { HiOutlineUserAdd, HiOutlineMail, HiOutlineShieldCheck, HiOutlineDotsVertical, HiOutlineRefresh, HiOutlineSearch } from 'react-icons/hi';
import api from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', full_name: '', role: 'employee' });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounts/user-profiles/');
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/accounts/user-profiles/', inviteData);
      setShowInviteModal(false);
      setInviteData({ email: '', full_name: '', role: 'employee' });
      fetchUsers();
    } catch (err) {
      alert(err.error || 'Erreur lors de l’invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.user_full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.user_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Utilisateurs Plateforme</h1>
          <p>Gérez les accès et les rôles de votre équipe Konggest</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={fetchUsers} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
            <HiOutlineUserAdd /> Inviter un collaborateur
          </button>
        </div>
      </div>

      <div className="card-glass mb-lg animate-in delay-1">
        <div className="search-bar">
          <HiOutlineSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container animate-in delay-2">
        <table>
          <thead>
            <tr>
              <th>Collaborateur</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Dernière connexion</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan="6"><div className="skeleton" style={{ height: 24, margin: '8px 0' }} /></td>
                </tr>
              ))
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user, i) => (
                <tr key={user.id} className={`animate-in delay-${Math.min(i + 1, 4)}`}>
                  <td>
                    <div className="flex items-center gap-md">
                      <div className="avatar avatar-sm">
                        {user.user_full_name ? user.user_full_name[0] : 'U'}
                      </div>
                      <span style={{ fontWeight: 600 }}>{user.user_full_name || 'Utilisateur'}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{user.user_email}</td>
                  <td>
                    <span className={`badge ${
                      user.role === 'admin' ? 'badge-primary' : 
                      user.role === 'hr' ? 'badge-success' : 
                      user.role === 'manager' ? 'badge-warning' : 'badge-neutral'
                    }`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {user.is_active ? 'ACTIF' : 'SUSPENDU'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Jamais'}
                  </td>
                  <td>
                    <button className="btn btn-xs btn-ghost"><HiOutlineDotsVertical /></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invitation Modal */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal-content card-glass animate-in">
            <div className="modal-header">
              <h2>Inviter un collaborateur</h2>
              <button className="btn-close" onClick={() => setShowInviteModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleInvite} className="modal-body flex flex-col gap-md">
              <div className="input-group">
                <label>Nom complet</label>
                <input 
                  className="input" 
                  value={inviteData.full_name} 
                  onChange={e => setInviteData({...inviteData, full_name: e.target.value})}
                  placeholder="Jean Dupont"
                  required
                />
              </div>
              <div className="input-group">
                <label>Adresse email</label>
                <div style={{ position: 'relative' }}>
                  <HiOutlineMail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    className="input" 
                    style={{ paddingLeft: 38 }}
                    type="email"
                    value={inviteData.email} 
                    onChange={e => setInviteData({...inviteData, email: e.target.value})}
                    placeholder="jean.dupont@entreprise.com"
                    required
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Rôle assigné</label>
                <select 
                  className="input" 
                  value={inviteData.role} 
                  onChange={e => setInviteData({...inviteData, role: e.target.value})}
                >
                  <option value="employee">Employé (Lecture seule)</option>
                  <option value="manager">Manager (Validation)</option>
                  <option value="hr">RH (Gestion complète)</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div className="modal-footer mt-lg flex justify-end gap-sm">
                <button type="button" className="btn btn-ghost" onClick={() => setShowInviteModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Envoi...' : 'Envoyer l’invitation'}
                </button>
              </div>
            </form>
          </div>
          <style jsx>{`
            .btn-close { background: none; border: none; font-size: 24px; color: var(--text-muted); cursor: pointer; }
            .modal-content { max-width: 480px; width: 100%; }
          `}</style>
        </div>
      )}
    </div>
  );
}
