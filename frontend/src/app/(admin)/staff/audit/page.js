'use client';

/**
 * Konggest — Audit Logs (SaaS Admin)
 * Global audit trail for platform-wide actions.
 */
import { useState, useEffect } from 'react';
import { HiOutlineShieldCheck, HiOutlineRefresh, HiOutlineSearch, HiOutlineFilter } from 'react-icons/hi';
import api from '@/lib/api';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounts/audit-logs/');
      setLogs(Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []));
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const actionTypes = [...new Set(logs.map(l => l.action).filter(Boolean))];

  const filtered = logs.filter(l => {
    if (search) {
      const s = search.toLowerCase();
      if (!l.user_name?.toLowerCase().includes(s) &&
          !l.action?.toLowerCase().includes(s) &&
          !l.resource_type?.toLowerCase().includes(s)) return false;
    }
    if (filterAction && l.action !== filterAction) return false;
    return true;
  });

  const getActionColor = (action) => {
    if (!action) return 'badge-neutral';
    if (action.includes('create') || action.includes('add')) return 'badge-success';
    if (action.includes('delete') || action.includes('remove')) return 'badge-danger';
    if (action.includes('update') || action.includes('edit')) return 'badge-warning';
    if (action.includes('login')) return 'badge-primary';
    return 'badge-neutral';
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>🛡️ Journal d'Audit Global</h1>
          <p>Traçabilité des actions sur la plateforme</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchLogs} disabled={loading}>
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
              placeholder="Rechercher par utilisateur, action..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select className="input" value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
            <option value="">Toutes les actions</option>
            {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <HiOutlineFilter style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {filtered.length} entrée(s)
          </span>
        </div>
      </div>

      {/* Logs */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Ressource</th>
                <th>Détails</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}><td colSpan="6"><div className="skeleton" style={{ height: 18 }} /></td></tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ fontWeight: 500 }}>{log.user_name || `User #${log.user}`}</td>
                    <td>
                      <span className={`badge ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{log.resource_type}{log.resource_id ? ` #${log.resource_id}` : ''}</td>
                    <td style={{ fontSize: '0.82rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '—')}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{log.ip_address || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 40 }}>
                    <HiOutlineShieldCheck style={{ fontSize: '2rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Aucun log d'audit trouvé.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
