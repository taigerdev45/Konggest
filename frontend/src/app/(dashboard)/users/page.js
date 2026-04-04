'use client';

import { useState, useEffect } from 'react';
import { 
  HiOutlineUserAdd, HiOutlineMail, HiOutlineShieldCheck, 
  HiOutlineDotsVertical, HiOutlineRefresh, HiOutlineSearch,
  HiOutlineTrash, HiOutlineLockClosed, HiOutlineLockOpen,
  HiOutlineFilter
} from 'react-icons/hi';
import api from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', full_name: '', role: 'employee' });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounts/user-profiles/');
      setUsers(data?.results || data || []);
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

  const handleStatusToggle = async (user) => {
    const action = user.is_active ? 'suspend' : 'activate';
    const confirmMsg = user.is_active 
      ? `Suspendre l'accès de ${user.full_name} ?` 
      : `Réactiver l'accès de ${user.full_name} ?`;
    
    if (!confirm(confirmMsg)) return;

    try {
      await api.post(`/accounts/user-profiles/${user.id}/${action}/`);
      fetchUsers();
    } catch (err) {
      alert('Erreur lors du changement de statut.');
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Supprimer définitivement le profil de ${user.full_name} ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/accounts/user-profiles/${user.id}/`);
      fetchUsers();
    } catch (err) {
      alert('Erreur lors de la suppression.');
    }
  };

  const filteredUsers = (Array.isArray(users) ? users : []).filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                         u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' ? u.is_active : !u.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const ROLE_LABELS = {
    admin: 'Administrateur',
    hr: 'RH',
    manager: 'Manager',
    employee: 'Employé',
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1><HiOutlineShieldCheck style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Gestion d'Équipe</h1>
          <p>Supervisez les accès et les permissions de vos collaborateurs</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={fetchUsers} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
            <HiOutlineUserAdd /> Inviter un membre
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card-glass mb-lg animate-in delay-1 overflow-visible">
        <div className="flex flex-wrap gap-md items-center justify-between">
          <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
            <HiOutlineSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Rechercher par nom ou email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-sm items-center">
            <HiOutlineFilter style={{ color: 'var(--text-muted)' }} />
            <select className="input" style={{ width: 'auto', minWidth: '140px' }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateur</option>
              <option value="hr">RH</option>
              <option value="manager">Manager</option>
              <option value="employee">Employé</option>
            </select>
            <select className="input" style={{ width: 'auto', minWidth: '140px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Suspendu</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container animate-in delay-2">
        <table>
          <thead>
            <tr>
              <th>Collaborateur</th>
              <th>Rôle & Accès</th>
              <th>Statut</th>
              <th>Dernière activité</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan="5"><div className="skeleton" style={{ height: 28, margin: '8px 0' }} /></td>
                </tr>
              ))
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user, i) => (
                <tr key={user.id} className={`animate-in delay-${Math.min(i + 1, 4)}`}>
                  <td>
                    <div className="flex items-center gap-md">
                      <div className="avatar" style={{ 
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                        color: 'white',
                        fontWeight: 700,
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                      }}>
                        {user.full_name ? user.full_name[0] : 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.full_name || 'Utilisateur'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      user.role === 'admin' ? 'badge-primary' : 
                      user.role === 'hr' ? 'badge-success' : 
                      user.role === 'manager' ? 'badge-warning' : 'badge-neutral'
                    }`} style={{ fontWeight: 600 }}>
                      {ROLE_LABELS[user.role] || user.role.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-xs">
                      <div style={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        background: user.is_active ? 'var(--success)' : 'var(--danger)',
                        boxShadow: `0 0 8px ${user.is_active ? 'var(--success)' : 'var(--danger)'}44`
                      }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: user.is_active ? 'var(--success)' : 'var(--danger)' }}>
                        {user.is_active ? 'Actif' : 'Suspendu'}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex gap-xs justify-end">
                      <button 
                        className={`btn btn-xs ${user.is_active ? 'btn-ghost' : 'btn-primary'}`} 
                        title={user.is_active ? 'Suspendre l\'accès' : 'Réactiver l\'accès'}
                        onClick={() => handleStatusToggle(user)}
                        style={{ padding: '8px' }}
                      >
                        {user.is_active ? <HiOutlineLockClosed fontSize="1.1rem" /> : <HiOutlineLockOpen fontSize="1.1rem" />}
                      </button>
                      <button 
                        className="btn btn-xs btn-ghost" 
                        title="Supprimer définitivement"
                        onClick={() => handleDelete(user)}
                        style={{ padding: '8px', color: 'var(--danger)' }}
                      >
                        <HiOutlineTrash fontSize="1.1rem" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: 80 }}>
                  <div className="empty-state">
                    <div style={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: '50%', 
                      background: 'var(--bg-secondary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      color: 'var(--text-muted)'
                    }}>
                      <HiOutlineSearch size={32} />
                    </div>
                    <h3 style={{ margin: '0 0 8px 0' }}>Aucun membre trouvé</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto' }}>
                      Ajustez vos filtres ou invitez un nouveau collaborateur sur la plateforme.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invitation Modal */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div>
                <h2>Inviter un collaborateur</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Envoyez une invitation pour rejoindre votre organisation.</p>
              </div>
              <button className="btn-close" onClick={() => setShowInviteModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleInvite} className="modal-body flex flex-col gap-md">
              <div className="input-group">
                <label className="label">Nom complet du membre</label>
                <input 
                  className="input" 
                  value={inviteData.full_name} 
                  onChange={e => setInviteData({...inviteData, full_name: e.target.value})}
                  placeholder="Ex: Jean Dupont"
                  required
                />
              </div>
              <div className="input-group">
                <label className="label">Adresse email professionnelle</label>
                <div style={{ position: 'relative' }}>
                  <HiOutlineMail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', opacity: 0.7 }} />
                  <input 
                    className="input" 
                    style={{ paddingLeft: 42 }}
                    type="email"
                    value={inviteData.email} 
                    onChange={e => setInviteData({...inviteData, email: e.target.value})}
                    placeholder="jean.dupont@entreprise.com"
                    required
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="label">Rôle et Niveau d'accès</label>
                <select 
                  className="input" 
                  value={inviteData.role} 
                  onChange={e => setInviteData({...inviteData, role: e.target.value})}
                >
                  <option value="employee">Employé (Consultation & Congés)</option>
                  <option value="manager">Manager (Approbation & Équipe)</option>
                  <option value="hr">RH (Paie & Gestion complète)</option>
                  <option value="admin">Administrateur (Configuration système)</option>
                </select>
                <div className="helper-text ml-xs" style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, marginTop: 12, border: '1px solid var(--border)' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.4 }}>
                    <HiOutlineShieldCheck style={{ verticalAlign: 'text-bottom', marginRight: 6, color: 'var(--primary)' }} />
                    L'invité recevra un accès sécurisé avec les permissions liées à son rôle.
                  </p>
                </div>
              </div>
              <div className="modal-footer mt-lg">
                <button type="button" className="btn btn-ghost" onClick={() => setShowInviteModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Envoi en cours...' : 'Envoyer l’invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
