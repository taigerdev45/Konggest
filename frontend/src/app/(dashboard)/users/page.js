'use client';

import { useState, useEffect } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import {
  HiOutlineShieldCheck, HiOutlineRefresh, HiOutlineSearch, HiOutlineFilter,
  HiOutlineUserAdd, HiOutlineMail, HiOutlineTrash, HiOutlineLockClosed,
  HiOutlineLockOpen, HiOutlinePencil, HiOutlineCheckCircle, HiOutlineExclamationCircle
} from 'react-icons/hi';
import api from '@/lib/api';

const TH = { padding: '13px 18px', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap', background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' };
const TD = { padding: '13px 18px', verticalAlign: 'middle', borderBottom: '1px solid var(--border-color)' };

const ROLE_LABELS = { admin: 'Administrateur', hr: 'RH', manager: 'Manager', employee: 'Employé' };
const ROLE_CLS    = { admin: 'badge-primary', hr: 'badge-success', manager: 'badge-warning', employee: 'badge-neutral' };

export default function UsersPage() {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterRole, setFilterRole]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  useScrollLock(showInviteModal || !!deleteTarget || !!inviteResult);
  const [inviteData, setInviteData]     = useState({ email: '', full_name: '', role: 'employee' });
  const [submitting, setSubmitting]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast]               = useState({ show: false, type: '', text: '' });
  const [inviteResult, setInviteResult] = useState(null); // { email, role, temp_password, email_sent }

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false }), 5000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounts/user-profiles/');
      setUsers(data?.results || data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/accounts/user-profiles/', inviteData);
      setShowInviteModal(false);
      setInviteData({ email: '', full_name: '', role: 'employee' });
      // Show credentials modal
      setInviteResult({
        email: res.email || inviteData.email,
        role: res.role || inviteData.role,
        temp_password: res.temp_password,
        email_sent: res.email_sent,
      });
      fetchUsers();
    } catch (err) {
      const errMsg = err?.email?.[0] || err?.error || "Erreur lors de l'invitation.";
      showToast('error', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (user) => {
    const action = user.is_active ? 'suspend' : 'activate';
    const label  = user.is_active ? `Suspendre l'accès de ${user.full_name} ?` : `Réactiver l'accès de ${user.full_name} ?`;
    if (!confirm(label)) return;
    try {
      await api.post(`/accounts/user-profiles/${user.id}/${action}/`);
      showToast('success', user.is_active ? 'Accès suspendu.' : 'Accès réactivé.');
      fetchUsers();
    } catch {
      showToast('error', 'Erreur lors du changement de statut.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/accounts/user-profiles/${deleteTarget.id}/`);
      showToast('success', `${deleteTarget.full_name} supprimé(e).`);
      setDeleteTarget(null);
      fetchUsers();
    } catch {
      showToast('error', 'Erreur lors de la suppression.');
      setDeleteTarget(null);
    }
  };

  const filtered = (Array.isArray(users) ? users : []).filter(u => {
    const q = `${u.full_name || ''} ${u.email || ''}`.toLowerCase();
    const matchRole   = filterRole   === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.is_active : !u.is_active);
    return q.includes(search.toLowerCase()) && matchRole && matchStatus;
  });

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Gestion d&apos;Équipe</h1>
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

      {/* Filters */}
      <div className="card-glass mb-lg animate-in" style={{ padding: '14px 20px' }}>
        <div className="flex gap-md items-center" style={{ flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 240 }}>
            <HiOutlineSearch className="search-icon" />
            <input type="text" placeholder="Rechercher par nom ou email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-sm items-center">
            <HiOutlineFilter style={{ color: 'var(--text-muted)' }} />
            <select className="input" style={{ width: 'auto', minWidth: 140 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateur</option>
              <option value="hr">RH</option>
              <option value="manager">Manager</option>
              <option value="employee">Employé</option>
            </select>
            <select className="input" style={{ width: 'auto', minWidth: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Suspendu</option>
            </select>
            <span className="badge badge-neutral">{filtered.length} membre{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card animate-in" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Collaborateur</th>
                <th style={TH}>Rôle & Accès</th>
                <th style={{ ...TH, textAlign: 'center' }}>Statut</th>
                <th style={{ ...TH, textAlign: 'center' }}>Membre depuis</th>
                <th style={{ ...TH, textAlign: 'center', width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} style={{ padding: '14px 18px' }}>
                        <div className="skeleton" style={{ height: 16, borderRadius: 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map(u => (
                  <tr key={u.id}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', fontWeight: 700, border: 'none', flexShrink: 0 }}>
                          {u.full_name ? u.full_name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.full_name || 'Utilisateur'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={TD}>
                      <span className={`badge ${ROLE_CLS[u.role] || 'badge-neutral'}`} style={{ fontWeight: 600 }}>
                        {ROLE_LABELS[u.role] || u.role?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: u.is_active ? 'var(--success)' : 'var(--danger)', boxShadow: `0 0 6px ${u.is_active ? 'var(--success)' : 'var(--danger)'}66` }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: u.is_active ? 'var(--success)' : 'var(--danger)' }}>
                          {u.is_active ? 'Actif' : 'Suspendu'}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...TD, textAlign: 'center', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '6px 8px', color: u.is_active ? 'var(--warning)' : 'var(--success)' }}
                          title={u.is_active ? 'Suspendre' : 'Réactiver'}
                          onClick={() => handleStatusToggle(u)}
                        >
                          {u.is_active ? <HiOutlineLockClosed size={15} /> : <HiOutlineLockOpen size={15} />}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '6px 8px', color: 'var(--danger)' }}
                          title="Supprimer"
                          onClick={() => setDeleteTarget(u)}
                        >
                          <HiOutlineTrash size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '56px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aucun membre trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div>
                <h2>Inviter un collaborateur</h2>
                <p>Rejoindre votre organisation.</p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowInviteModal(false)}>✕</button>
            </div>
            <form onSubmit={handleInvite} style={{ display: 'contents' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="input-group">
                  <label>Nom complet *</label>
                  <input className="input" value={inviteData.full_name} onChange={e => setInviteData({ ...inviteData, full_name: e.target.value })} placeholder="Jean Dupont" required />
                </div>
                <div className="input-group">
                  <label>Email professionnel *</label>
                  <div style={{ position: 'relative' }}>
                    <HiOutlineMail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                    <input className="input" style={{ paddingLeft: 38 }} type="email" value={inviteData.email} onChange={e => setInviteData({ ...inviteData, email: e.target.value })} placeholder="jean@entreprise.com" required />
                  </div>
                </div>
                <div className="input-group">
                  <label>Rôle et accès</label>
                  <select className="input" value={inviteData.role} onChange={e => setInviteData({ ...inviteData, role: e.target.value })}>
                    <option value="employee">Employé</option>
                    <option value="manager">Manager</option>
                    <option value="hr">Responsable RH</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowInviteModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Envoi..." : "Inviter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 400 }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '28px 24px 20px' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <HiOutlineTrash size={22} style={{ color: 'var(--danger)' }} />
              </div>
              <h2 style={{ marginBottom: 8, fontSize: '1.1rem' }}>Supprimer le membre ?</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                <strong>{deleteTarget.full_name}</strong> sera définitivement retiré(e) de la plateforme.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Annuler</button>
              <button className="btn" style={{ background: 'var(--danger)', color: '#fff' }} onClick={confirmDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {inviteResult && (
        <div className="modal-overlay" style={{ zIndex: 2100 }}>
          <div className="modal-content animate-in" style={{ maxWidth: 480 }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HiOutlineCheckCircle size={20} style={{ color: 'var(--success)' }} />
                </div>
                <div>
                  <h2>Invitation créée</h2>
                  <p>{inviteResult.email_sent ? 'Email envoyé automatiquement.' : 'Transmettez les identifiants manuellement.'}</p>
                </div>
              </div>
              <button className="btn-modal-close" onClick={() => setInviteResult(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Identifiants de connexion
                </p>
                <CredentialRow label="Email" value={inviteResult.email} />
                <CredentialRow label="Rôle" value={ROLE_LABELS[inviteResult.role] || inviteResult.role} badge />
                <CredentialRow label="Mot de passe temporaire" value={inviteResult.temp_password} secret />
              </div>
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#92400E' }}>
                ⚠️ Transmettez ce mot de passe de façon sécurisée. L&apos;utilisateur devra le changer à sa première connexion.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setInviteResult(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 2000, padding: '14px 20px', borderRadius: 10, background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)', color: '#fff', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'center', gap: 10, minWidth: 260 }}>
          {toast.type === 'success' ? <HiOutlineCheckCircle size={20} /> : <HiOutlineExclamationCircle size={20} />}
          <span style={{ fontWeight: 500 }}>{toast.text}</span>
        </div>
      )}
    </div>
  );
}

// Composant affichage d'un identifiant avec copie
function CredentialRow({ label, value, secret, badge }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: 140 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {badge ? (
          <span className="badge badge-primary" style={{ fontWeight: 700 }}>{value}</span>
        ) : (
          <code style={{ fontSize: secret ? '0.9rem' : '0.85rem', fontWeight: secret ? 800 : 500, letterSpacing: secret ? '0.05em' : 0, color: secret ? 'var(--primary)' : 'var(--text-primary)', wordBreak: 'break-all', textAlign: 'right' }}>
            {value}
          </code>
        )}
        {!badge && (
          <button
            onClick={copy}
            title="Copier"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--success)' : 'var(--text-muted)', padding: '2px 4px', flexShrink: 0 }}
          >
            {copied ? '✓' : '⎘'}
          </button>
        )}
      </div>
    </div>
  );
}
