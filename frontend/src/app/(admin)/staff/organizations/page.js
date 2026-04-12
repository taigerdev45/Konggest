'use client';

/**
 * Konggest — Organizations Management (SaaS Admin)
 * Logic preserved: toggleStatus and changePlan patch API calls intact.
 */
import { useState, useEffect } from 'react';
import {
  HiOutlineOfficeBuilding, HiOutlineRefresh, HiOutlineSearch,
    HiOutlineBan, HiOutlineCheck, HiOutlineUsers, HiOutlinePencil,
    HiOutlineFilter, HiOutlineCheckCircle, HiOutlineExclamationCircle,
    HiOutlineStar
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

  const toggleTrust = async (org) => {
    try {
      await api.patch(`/accounts/organizations/${org.id}/`, { is_trusted_partner: !org.is_trusted_partner });
      showToast('success', org.is_trusted_partner ? 'Partenaire retiré.' : 'Partenaire ajouté !');
      fetchOrgs();
    } catch { showToast('error', 'Erreur lors de la mise à jour partenaire.'); }
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
      <div className="card mb-lg">
        <div className="flex gap-md items-center" style={{ flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
            <HiOutlineSearch className="search-icon" />
            <input
              placeholder="Rechercher une organisation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-sm items-center">
            <HiOutlineFilter style={{ color: 'var(--text-muted)' }} />
            <select className="input" value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ width: 'auto' }}>
              <option value="">Tous les plans</option>
              <option value="free">Gratuit</option>
              <option value="starter">Starter</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto' }}>
              <option value="">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="suspended">Suspendues</option>
            </select>
            <span className="badge badge-neutral">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container animate-in">
        <table>
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Secteur</th>
              <th style={{ textAlign: 'center' }}>Plan</th>
              <th style={{ textAlign: 'center' }}>Effectif</th>
              <th style={{ textAlign: 'center' }}>Statut</th>
              <th style={{ textAlign: 'center' }}>Créée le</th>
              <th style={{ textAlign: 'center' }}>Vitrine</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j}>
                      <div className="skeleton" style={{ height: 16, borderRadius: 4 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length > 0 ? (
              filtered.map(org => (
                <tr key={org.id}>
                  <td>
                    <div className="flex items-center" style={{ gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <HiOutlineOfficeBuilding size={20} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <div className="flex items-center" style={{ gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{org.name}</span>
                          {org.is_trusted_partner && <HiOutlineStar size={14} style={{ color: '#F59E0B' }} />}
                        </div>
                        {org.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{org.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {org.sector || '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
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
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex items-center justify-center" style={{ gap: 6 }}>
                      <HiOutlineUsers size={14} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 600 }}>{org.max_employees || 10}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${org.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {org.is_active ? 'Actif' : 'Suspendu'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {org.created_at ? new Date(org.created_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => toggleTrust(org)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: org.is_trusted_partner ? '#F59E0B' : 'var(--text-muted)',
                        padding: 8, display: 'inline-flex', alignItems: 'center',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      title={org.is_trusted_partner ? "Retirer de la vitrine" : "Ajouter à la vitrine"}
                    >
                      {org.is_trusted_partner ? <HiOutlineStar size={22} /> : <HiOutlineStar size={22} style={{ opacity: 0.2 }} />}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-sm"
                      style={{
                        background: org.is_active ? '#FEF2F2' : '#F0FDF4',
                        color: org.is_active ? '#DC2626' : '#16A34A',
                        border: `1px solid ${org.is_active ? '#FCA5A5' : '#86EFAC'}`,
                        margin: '0 auto'
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
                <td colSpan={8} style={{ padding: '48px 0', textAlign: 'center' }}>
                  <div className="empty-state">
                    <HiOutlineOfficeBuilding size={48} />
                    <h3>Aucune organisation</h3>
                    <p>Essayez d'ajuster vos filtres de recherche.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast.show && (
        <div className={`animate-in`} style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 2000, padding: '16px 24px', borderRadius: 12, background: toast.type === 'success' ? '#10B981' : '#EF4444', color: '#fff', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'center', gap: 12, minWidth: 280 }}>
          {toast.type === 'success' ? <HiOutlineCheckCircle size={22} /> : <HiOutlineExclamationCircle size={22} />}
          <span style={{ fontWeight: 600 }}>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
