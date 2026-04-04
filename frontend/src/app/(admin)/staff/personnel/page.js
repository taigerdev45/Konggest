'use client';

/**
 * Konggest — Platform Staff Management (SaaS Admin)
 * Manage internal team members with 3 specific roles.
 */
import { useState, useEffect } from 'react';
import { 
  HiOutlineUserAdd, HiOutlineRefresh, HiOutlineMail, 
  HiOutlineShieldCheck, HiOutlineSupport, HiOutlineCurrencyDollar,
  HiOutlineTrash, HiOutlineCheckCircle, HiOutlineExclamation
} from 'react-icons/hi';
import api from '@/lib/api';

export default function PersonnelPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'support' });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounts/platform-staff/');
      setAgents(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post('/accounts/platform-staff/invite/', form);
      setSuccessMsg(`Agent ${form.email} invité avec succès !`);
      setForm({ email: '', full_name: '', role: 'support' });
      setTimeout(() => {
          setShowModal(false);
          setSuccessMsg('');
          fetchAgents();
      }, 2000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Erreur lors de l\'invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleIcon = (role) => {
    if (role === 'admin') return <HiOutlineShieldCheck style={{ color: '#8b5cf6' }} />;
    if (role === 'support') return <HiOutlineSupport style={{ color: '#10b981' }} />;
    if (role === 'commercial') return <HiOutlineCurrencyDollar style={{ color: '#f59e0b' }} />;
    return null;
  };

  const getRoleLabel = (role) => {
    if (role === 'admin') return 'Super Admin';
    if (role === 'support') return 'Support Technique';
    if (role === 'commercial') return 'Commercial';
    return role;
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>🛡️ Gestion du Personnel</h1>
          <p>Équipe interne de la plateforme Konggest</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={fetchAgents} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiOutlineUserAdd />
            Ajouter un agent
          </button>
        </div>
      </div>

      {/* Agents Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Membre du Staff</th>
                <th>Email</th>
                <th>Rôle Plateforme</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan="5"><div className="skeleton" style={{ height: 25 }} /></td></tr>
                ))
              ) : agents.length > 0 ? (
                agents.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar-small">{a.full_name?.[0] || 'A'}</div>
                        {a.full_name}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                        <HiOutlineMail fontSize="0.9rem" />
                        {a.email}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {getRoleIcon(a.role)}
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{getRoleLabel(a.role)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${a.is_active ? 'badge-success' : 'badge-neutral'}`}>
                        {a.is_active ? 'ACTIF' : 'INACTIF'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-icon btn-ghost" title="Désactiver" disabled>
                        <HiOutlineTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: 60 }}>
                        <HiOutlineUsers style={{ fontSize: '3rem', color: 'var(--border)', marginBottom: 16 }} />
                        <p style={{ color: 'var(--text-muted)' }}>Aucun agent configuré pour le moment.</p>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in-up" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3>Ajouter un nouvel agent</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleInvite}>
                <div className="modal-body">
                    {successMsg && (
                        <div className="alert alert-success" style={{ marginBottom: 20 }}>
                            <HiOutlineCheckCircle /> {successMsg}
                        </div>
                    )}
                    {errorMsg && (
                        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                            <HiOutlineExclamation /> {errorMsg}
                        </div>
                    )}

                    <div className="form-group">
                        <label>Nom complet</label>
                        <input 
                            className="input" 
                            required 
                            placeholder="ex: Jean Dupont"
                            value={form.full_name}
                            onChange={e => setForm({...form, full_name: e.target.value})}
                        />
                    </div>
                    <div className="form-group">
                        <label>Adresse Email</label>
                        <input 
                            type="email" 
                            className="input" 
                            required 
                            placeholder="agent@konggest.com"
                            value={form.email}
                            onChange={e => setForm({...form, email: e.target.value})}
                        />
                    </div>
                    <div className="form-group">
                        <label>Rôle de la plateforme</label>
                        <select 
                            className="input" 
                            value={form.role}
                            onChange={e => setForm({...form, role: e.target.value})}
                        >
                            <option value="admin">Super Administrateur</option>
                            <option value="support">Support Technique</option>
                            <option value="commercial">Agent Commercial</option>
                        </select>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                            L'agent recevra ses accès par email.
                        </p>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Envoi...' : 'Envoyer l\'invitation'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .avatar-small {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: var(--primary-light);
            color: var(--primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
        }
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .modal-content {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            width: 100%;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .modal-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h3 { margin: 0; font-size: 1.1rem; }
        .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }
        .modal-body { padding: 24px; }
        .modal-footer { padding: 16px 24px; background: var(--bg-body); border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 0.9rem; }
        .alert { padding: 12px 16px; border-radius: 8px; display: flex; alignItems: center; gap: 10px; font-size: 0.9rem; }
        .alert-success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
        .alert-danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
      `}</style>
    </div>
  );
}
