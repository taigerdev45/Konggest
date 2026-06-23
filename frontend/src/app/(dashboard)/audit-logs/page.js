'use client';

import { useState, useEffect } from 'react';
import { HiOutlineRefresh, HiOutlineSearch, HiOutlineFilter, HiOutlineEye, HiOutlineShieldCheck } from 'react-icons/hi';
import api from '@/lib/api';

const ACTION_META = {
  create:  { label: 'Création',      cls: 'bg-[rgba(45,106,79,0.1)] text-[#2D6A4F]',   bar: '#2D6A4F' },
  update:  { label: 'Modification',  cls: 'bg-[rgba(201,168,76,0.1)] text-[#8B7035]',   bar: '#C9A84C' },
  delete:  { label: 'Suppression',   cls: 'bg-[rgba(220,38,38,0.08)] text-red-600',      bar: '#DC2626' },
  login:   { label: 'Connexion',     cls: 'bg-[rgba(20,34,24,0.06)] text-[#6B7E6D]',    bar: '#6B7E6D' },
  logout:  { label: 'Déconnexion',   cls: 'bg-[rgba(20,34,24,0.06)] text-[#6B7E6D]',    bar: '#6B7E6D' },
  export:  { label: 'Export',        cls: 'bg-[rgba(99,102,241,0.1)] text-indigo-600',   bar: '#6366F1' },
};

const S = {
  th: 'px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7E6D] uppercase tracking-[0.08em] whitespace-nowrap',
  input: 'w-full border border-[rgba(20,34,24,0.15)] bg-[#F5F7F4] rounded-lg px-3 py-2 text-sm text-[#0F1A10] focus:border-[#2D6A4F] focus:ring-2 focus:ring-[rgba(45,106,79,0.1)] outline-none transition-all',
  label: 'block text-[11px] font-semibold text-[#6B7E6D] mb-1.5 uppercase tracking-[0.06em]',
  btn: 'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer',
};

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-[rgba(20,34,24,0.06)]">
      <div className="w-28 flex-shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7E6D] pt-0.5">{label}</div>
      <div className="flex-1 text-[13px] font-medium text-[#0F1A10]" style={{ fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value}
      </div>
    </div>
  );
}

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
      setLogs(Array.isArray(data) ? data : (data.results || []));
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter(log => {
    const q = `${log.user_name || ''} ${log.action} ${log.resource_type}`.toLowerCase();
    return q.includes(search.toLowerCase()) && (!filterAction || log.action === filterAction);
  });

  return (
    <div className="min-h-full flex flex-col bg-[#F5F7F4]">
      {/* Header compact */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-[rgba(20,34,24,0.08)]">
        <div className="flex items-center gap-3">
          <HiOutlineShieldCheck className="text-[#2D6A4F] text-base" />
          <span className="text-[11px] font-semibold text-[#2D6A4F] uppercase tracking-[0.12em]">Audit</span>
          <span className="text-[#0F1A10]/20 text-lg leading-none">·</span>
          <h1 className="text-[15px] font-semibold text-[#0F1A10]">Journal d'Audit</h1>
        </div>
        <button onClick={fetchLogs} disabled={loading} className={`${S.btn} bg-white text-[#0F1A10] border border-[rgba(20,34,24,0.15)] hover:bg-[#F5F7F4]`}>
          <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          Rafraîchir
        </button>
      </header>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-[rgba(20,34,24,0.06)]">
        <div className="relative flex-1 max-w-sm">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7E6D] text-sm" />
          <input
            type="text"
            placeholder="Utilisateur, action, ressource..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-[rgba(20,34,24,0.15)] bg-[#F5F7F4] rounded-lg text-sm text-[#0F1A10] focus:border-[#2D6A4F] focus:ring-2 focus:ring-[rgba(45,106,79,0.1)] outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <HiOutlineFilter className="text-[#6B7E6D] text-sm" />
          <select
            value={filterAction}
            onChange={e => setFilter(e.target.value)}
            className="border border-[rgba(20,34,24,0.15)] bg-[#F5F7F4] rounded-lg px-3 py-2 text-sm text-[#0F1A10] focus:border-[#2D6A4F] outline-none"
          >
            <option value="">Toutes les actions</option>
            <option value="create">Création</option>
            <option value="update">Modification</option>
            <option value="delete">Suppression</option>
            <option value="login">Connexion</option>
            <option value="logout">Déconnexion</option>
            <option value="export">Export</option>
          </select>
        </div>
        <span className="inline-flex items-center px-2 py-1 rounded bg-[rgba(20,34,24,0.06)] text-[#6B7E6D] text-[11px] font-semibold">
          {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-xl border border-[rgba(20,34,24,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F5F7F4]">
                  <th className={S.th}>Date & Heure</th>
                  <th className={S.th}>Utilisateur</th>
                  <th className={`${S.th} text-center`}>Action</th>
                  <th className={S.th}>Ressource</th>
                  <th className={`${S.th} text-center`}>Réf. ID</th>
                  <th className={S.th}>Adresse IP</th>
                  <th className={`${S.th} text-center`} style={{ width: 80 }}>Détail</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  new Array(6).fill(null).map((_, i) => (
                    <tr key={i} className="border-b border-[rgba(20,34,24,0.05)]">
                      {new Array(7).fill(null).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-[#F5F7F4] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length > 0 ? (
                  filtered.map(log => {
                    const meta = ACTION_META[log.action] || ACTION_META.export;
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-[rgba(20,34,24,0.05)] hover:bg-[rgba(45,106,79,0.03)] transition-colors"
                        style={{ borderLeft: `3px solid ${meta.bar}` }}
                      >
                        <td className="px-4 py-3 text-[13px] text-[#6B7E6D] whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[13px] font-medium text-[#0F1A10]">{log.user_name || 'Système'}</span>
                            {log.user_email && <span className="text-[11px] text-[#6B7E6D]">{log.user_email}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#0F1A10]">{log.resource_type}</td>
                        <td className="px-4 py-3 text-center font-mono text-[12px] text-[#6B7E6D]">{log.resource_id || '—'}</td>
                        <td className="px-4 py-3 font-mono text-[12px] text-[#6B7E6D]">{log.ip_address || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {log.details && (
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="w-8 h-8 rounded-lg bg-[#F5F7F4] text-[#6B7E6D] hover:bg-[rgba(45,106,79,0.08)] hover:text-[#2D6A4F] transition-colors flex items-center justify-center mx-auto"
                            >
                              <HiOutlineEye className="text-sm" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-[13px] text-[#6B7E6D]">
                      Aucun journal d'audit trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-[#0F1A10]/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-5">
              <div>
                <span className="text-[11px] font-semibold text-[#2D6A4F] uppercase tracking-[0.1em]">Détails de l'action</span>
                <h2 className="text-[17px] font-semibold text-[#0F1A10] mt-0.5">Journal d'événement</h2>
                <p className="text-[12px] text-[#6B7E6D] mt-0.5">{new Date(selectedLog.created_at).toLocaleString('fr-FR')}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="w-8 h-8 rounded-lg bg-[#F5F7F4] text-[#6B7E6D] hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center text-base">✕</button>
            </div>
            <div>
              <InfoRow label="Utilisateur" value={selectedLog.user_name || 'Système'} />
              {selectedLog.user_email && <InfoRow label="Email" value={selectedLog.user_email} />}
              <InfoRow label="Action" value={
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${ACTION_META[selectedLog.action]?.cls || ACTION_META.export.cls}`}>
                  {ACTION_META[selectedLog.action]?.label || selectedLog.action}
                </span>
              } />
              <InfoRow label="Ressource" value={selectedLog.resource_type} />
              <InfoRow label="ID Ressource" value={selectedLog.resource_id || '—'} mono />
              <InfoRow label="Adresse IP" value={selectedLog.ip_address || '—'} mono />
              {selectedLog.details && (
                <div className="pt-4">
                  <div className={S.label}>Données de l'événement</div>
                  <pre className="bg-[#F5F7F4] rounded-xl p-4 text-xs overflow-auto max-h-52 text-[#0F1A10] border border-[rgba(20,34,24,0.08)] mt-1.5">
                    {typeof selectedLog.details === 'string' ? selectedLog.details : JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
