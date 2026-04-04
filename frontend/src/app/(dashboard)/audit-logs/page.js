'use client';

import { useState, useEffect } from 'react';
import { HiOutlineRefresh, HiOutlineSearch, HiOutlineFilter, HiOutlineEye } from 'react-icons/hi';
import api from '@/lib/api';

const TH = { padding: '13px 18px', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap', background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' };
const TD = { padding: '13px 18px', verticalAlign: 'middle', borderBottom: '1px solid var(--border-color)' };

const ACTION_META = {
  create:  { label: 'Création',       cls: 'badge-success' },
  update:  { label: 'Modification',   cls: 'badge-warning' },
  delete:  { label: 'Suppression',    cls: 'badge-danger'  },
  login:   { label: 'Connexion',      cls: 'badge-primary' },
  logout:  { label: 'Déconnexion',    cls: 'badge-neutral' },
  export:  { label: 'Export',         cls: 'badge-neutral' },
};

export default function AuditLogsPage() {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterAction, setFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounts/audit-logs/');
      setLogs(Array.isArray(data) ? data : (data?.results || []));
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter(log => {
    const q = `${log.user_name || ''} ${log.action} ${log.resource_type}`.toLowerCase();
    const matchQ = q.includes(search.toLowerCase());
    const matchA = !filterAction || log.action === filterAction;
    return matchQ && matchA;
  });

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Journal d&apos;Audit</h1>
          <p>Traçabilité complète des actions effectuées sur la plateforme</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchLogs} disabled={loading} title="Rafraîchir">
          <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="card-glass mb-lg" style={{ padding: '14px 20px' }}>
        <div className="flex gap-md items-center" style={{ flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 240 }}>
            <HiOutlineSearch className="search-icon" />
            <input
              type="text"
              placeholder="Filtrer par utilisateur, action ou ressource..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-sm items-center">
            <HiOutlineFilter style={{ color: 'var(--text-muted)' }} />
            <select className="input" style={{ width: 'auto', minWidth: 150 }} value={filterAction} onChange={e => setFilter(e.target.value)}>
              <option value="">Toutes les actions</option>
              <option value="create">Création</option>
              <option value="update">Modification</option>
              <option value="delete">Suppression</option>
              <option value="login">Connexion</option>
              <option value="logout">Déconnexion</option>
              <option value="export">Export</option>
            </select>
            <span className="badge badge-neutral">{filtered.length} entrée{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card animate-in" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Date & Heure</th>
                <th style={TH}>Utilisateur</th>
                <th style={{ ...TH, textAlign: 'center' }}>Action</th>
                <th style={TH}>Ressource</th>
                <th style={{ ...TH, textAlign: 'center' }}>Réf. ID</th>
                <th style={TH}>Adresse IP</th>
                <th style={{ ...TH, textAlign: 'center', width: 80 }}>Détails</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} style={{ padding: '13px 18px' }}>
                        <div className="skeleton" style={{ height: 14, borderRadius: 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map(log => (
                  <tr key={log.id}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ ...TD, fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ ...TD, fontWeight: 600 }}>
                      <div>{log.user_name || 'Système'}</div>
                      {log.user_email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user_email}</div>}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span className={`badge ${ACTION_META[log.action]?.cls || 'badge-neutral'}`}>
                        {ACTION_META[log.action]?.label || log.action}
                      </span>
                    </td>
                    <td style={{ ...TD, fontSize: '0.87rem' }}>
                      <span style={{ fontWeight: 500 }}>{log.resource_type}</span>
                    </td>
                    <td style={{ ...TD, textAlign: 'center', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {log.resource_id || '—'}
                    </td>
                    <td style={{ ...TD, fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {log.ip_address || '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      {log.details && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '5px 8px' }}
                          title="Voir les détails"
                          onClick={() => setSelectedLog(log)}
                        >
                          <HiOutlineEye size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aucun log d&apos;audit trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <h2>Détails de l&apos;action</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {new Date(selectedLog.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              <button className="btn btn-ghost" onClick={() => setSelectedLog(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: 12 }}>
                <InfoRow label="Utilisateur" value={selectedLog.user_name || 'Système'} />
                <InfoRow label="Action" value={<span className={`badge ${ACTION_META[selectedLog.action]?.cls || 'badge-neutral'}`}>{ACTION_META[selectedLog.action]?.label || selectedLog.action}</span>} />
                <InfoRow label="Ressource" value={selectedLog.resource_type} />
                <InfoRow label="ID Ressource" value={selectedLog.resource_id || '—'} mono />
                <InfoRow label="IP" value={selectedLog.ip_address || '—'} mono />
                {selectedLog.details && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Données de l&apos;événement</div>
                    <pre style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14, fontSize: '0.8rem', overflow: 'auto', maxHeight: 200, color: 'var(--text-primary)', margin: 0 }}>
                      {typeof selectedLog.details === 'string' ? selectedLog.details : JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ width: 120, flexShrink: 0, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', paddingTop: 2 }}>{label}</div>
      <div style={{ fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? '0.85rem' : '0.9rem' }}>{value}</div>
    </div>
  );
}
