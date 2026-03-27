'use client';

import { useState, useEffect } from 'react';
import { HiOutlineShieldCheck, HiOutlineRefresh, HiOutlineSearch } from 'react-icons/hi';
import api from '@/lib/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounts/audit-logs/');
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.resource_type.toLowerCase().includes(search.toLowerCase())
  );

  const ACTION_COLORS = {
    create: 'badge-success',
    update: 'badge-warning',
    delete: 'badge-danger',
    login: 'badge-primary',
    logout: 'badge-neutral',
    export: 'badge-purple',
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Journal d'Audit</h1>
          <p>Historique des actions effectuées sur la plateforme</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchLogs} disabled={loading}>
          <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="search-bar">
          <HiOutlineSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Filtrer par utilisateur, action ou ressource..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date & Heure</th>
              <th>Utilisateur</th>
              <th>Action</th>
              <th>Ressource</th>
              <th>ID</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan="6"><div className="skeleton" style={{ height: 20 }} /></td>
                </tr>
              ))
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td style={{ fontWeight: 500 }}>{log.user_name || 'Système'}</td>
                  <td>
                    <span className={`badge ${ACTION_COLORS[log.action] || 'badge-neutral'}`}>
                      {log.action.toUpperCase()}
                    </span>
                  </td>
                  <td>{log.resource_type}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.resource_id || '-'}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{log.ip_address}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun log trouvé.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
