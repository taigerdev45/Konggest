'use client';

/**
 * Konggest — Organizations Management (SaaS Admin)
 * Logic preserved: toggleStatus and changePlan patch API calls intact.
 */
import { useState, useEffect } from 'react';
import {
  HiOutlineOfficeBuilding, HiOutlineRefresh, HiOutlineSearch,
  HiOutlineBan, HiOutlineCheck, HiOutlineUsers, HiOutlinePencil,
  HiOutlineFilter, HiOutlineCheckCircle, HiOutlineExclamationCircle
} from 'react-icons/hi';
import api from '@/lib/api';

const TH = { padding: '13px 18px', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap', background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' };
const TD = { padding: '13px 18px', verticalAlign: 'middle', borderBottom: '1px solid var(--border-color)' };

const PLAN_CLS = {
  enterprise: 'badge-primary',
  business:   'badge-success',
  starter:    'badge-warning',
  free:       'badge-neutral',
};
const PLAN_LABELS = { enterprise: 'Enterprise', business: 'Business', starter: 'Starter', free: 'Gratuit' };

export default function OrganizationsPage() {
  const [orgs, setOrgs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [toast, setToast]         = useState({ show: false, type: '', text: '' });

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false }), 4000);
  };

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounts/organizations/');
      setOrgs(data?.results || data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const toggleStatus = async (org) => {
    const action = org.is_active ? 'Suspendre' : 'Activer';
    if (!confirm(`${action} l'organisation "${org.name}" ?`)) return;
    try {
      await api.patch(`/accounts/organizations/${org.id}/`, { is_active: !org.is_active });
      showToast('success', `Organisation ${org.is_active ? 'suspendue' : 'activée'}.`);
      fetchOrgs();
    } catch { showToast('error', 'Erreur lors de la mise à jour.'); }
  };

  const changePlan = async (org, plan) => {
    try {
      await api.patch(`/accounts/organizations/${org.id}/`, { plan });
      showToast('success', `Plan mis à jour : ${PLAN_LABELS[plan]}.`);
      fetchOrgs();
    } catch { showToast('error', 'Erreur lors du changement de plan.'); }
  };

  const filtered = orgs.filter(o => {
    if (search && !o.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlan && o.plan !== filterPlan) return false;
    if (filterStatus === 'active' && !o.is_active) return false;
    if (filterStatus === 'suspended' && o.is_active) return false;
    return true;
  });

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>🏢 Organisations Clientes</h1>
          <p>Gestion des entreprises inscrites sur la plateforme</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchOrgs} disabled={loading} title="Rafraîchir">
          <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="card-glass mb-lg" style={{ padding: '14px 20px' }}>
        <div className="flex gap-md items-center" style={{ flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
            <HiOutlineSearch className="search-icon" />
            <input
              className="input"
              placeholder="Rechercher une organisation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
            />
          </div>
          <div className="flex gap-sm items-center">
            <HiOutlineFilter style={{ color: 'var(--text-muted)' }} />
            <select className="input" value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
              <option value="">Tous les plans</option>
              <option value="free">Gratuit</option>
              <option value="starter">Starter</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', minWidth: 130 }}>
              <option value="">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="suspended">Suspendues</option>
            </select>
            <span className="badge badge-neutral">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card animate-in" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Organisation</th>
                <th style={TH}>Secteur</th>
                <th style={{ ...TH, textAlign: 'center' }}>Plan</th>
                <th style={{ ...TH, textAlign: 'center' }}>Effectif max</th>
                <th style={{ ...TH, textAlign: 'center' }}>Statut</th>
                <th style={{ ...TH, textAlign: 'center' }}>Créée le</th>
                <th style={{ ...TH, textAlign: 'center', width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} style={{ padding: '13px 18px' }}>
                        <div className="skeleton" style={{ height: 16, borderRadius: 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map(org => (
                  <tr key={org.id}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <HiOutlineOfficeBuilding size={18} style={{ color: 'var(--primary)' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{org.name}</div>
                          {org.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{org.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '0.87rem' }}>
                      {org.sector || '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <select
                        className="input"
                        value={org.plan}
                        onChange={e => changePlan(org, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '0.78rem', width: 'auto', cursor: 'pointer', minWidth: 100 }}
                      >
                        <option value="free">Gratuit</option>
                        <option value="starter">Starter</option>
                        <option value="business">Business</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <HiOutlineUsers size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontWeight: 600 }}>{org.max_employees || 10}</span>
                      </div>
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span className={`badge ${org.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {org.is_active ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'center', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                      {org.created_at ? new Date(org.created_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <button
                        className="btn btn-sm"
                        style={{
                          padding: '6px 14px',
                          background: org.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: org.is_active ? 'var(--danger)' : 'var(--success)',
                          border: `1px solid ${org.is_active ? 'var(--danger)' : 'var(--success)'}`,
                          borderRadius: 8,
                          display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto'
                        }}
                        onClick={() => toggleStatus(org)}
                      >
                        {org.is_active ? <HiOutlineBan size={14} /> : <HiOutlineCheck size={14} />}
                        {org.is_active ? 'Suspendre' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aucune organisation trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
