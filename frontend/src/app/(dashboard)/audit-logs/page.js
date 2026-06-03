'use client';

import { useState, useEffect } from 'react';
import { HiOutlineRefresh, HiOutlineSearch, HiOutlineFilter, HiOutlineEye } from 'react-icons/hi';
import api from '@/lib/api';

const ACTION_META = {
  create:  { label: 'Création',       cls: 'bg-emerald-50 text-emerald-700' },
  update:  { label: 'Modification',   cls: 'bg-amber-50 text-amber-700' },
  delete:  { label: 'Suppression',    cls: 'bg-red-50 text-red-700' },
  login:   { label: 'Connexion',      cls: 'bg-blue-50 text-blue-700' },
  logout:  { label: 'Déconnexion',    cls: 'bg-gray-50 text-gray-700' },
  export:  { label: 'Export',         cls: 'bg-purple-50 text-purple-700' },
};

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100">
      <div className="w-32 flex-shrink-0 text-[10px] font-black uppercase text-gray-400 pt-1">{label}</div>
      <div className="flex-1 font-medium text-gray-800 text-sm" style={{ fontFamily: mono ? 'monospace' : 'inherit' }}>
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
    const matchQ = q.includes(search.toLowerCase());
    const matchA = !filterAction || log.action === filterAction;
    return matchQ && matchA;
  });

  return (
    <div className="min-h-full flex flex-col bg-[#FDFDFF]">
      {/* Page Header */}
      <div className="px-6 md:px-12 pt-8 md:pt-12 pb-8 md:pb-10 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div className="animate-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-1 bg-purple-500 rounded-full"></div>
            <span className="text-[10px] font-black text-purple-600 uppercase tracking-[0.3em]">SUIVI D'ACTIVITÉ</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-3">
            Journal d'Audit
          </h1>
          <p className="text-gray-400 font-medium text-sm md:text-base max-w-lg">
            Traçabilité complète des actions effectuées sur la plateforme.
          </p>
        </div>
        <div className="flex gap-3 animate-in slide-in-from-right-4 duration-700">
          <button 
            onClick={fetchLogs} 
            disabled={loading}
            className="flex-1 md:flex-none bg-white text-gray-900 border border-gray-100 px-6 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
          >
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 md:px-12 pb-8">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-md shadow-gray-200/20 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative w-full lg:flex-1 max-w-xl">
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrer par utilisateur, action ou ressource..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-[1.5rem] border-2 border-gray-100 bg-gray-50/50 text-gray-800 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/5 outline-none transition-all font-bold text-sm"
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <HiOutlineFilter className="text-gray-400" />
              <select 
                value={filterAction} 
                onChange={e => setFilter(e.target.value)} 
                className="flex-1 lg:w-auto border-2 border-gray-100 bg-gray-50/50 rounded-[1.5rem] px-5 py-3.5 font-black text-sm text-gray-700 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/5 outline-none transition-all"
              >
                <option value="">Toutes les actions</option>
                <option value="create">Création</option>
                <option value="update">Modification</option>
                <option value="delete">Suppression</option>
                <option value="login">Connexion</option>
                <option value="logout">Déconnexion</option>
                <option value="export">Export</option>
              </select>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600">
                {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="px-6 md:px-12 pb-12 flex-1">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/30 sticky top-0 z-10">
                <tr>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Date & Heure</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Utilisateur</th>
                  <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Action</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Ressource</th>
                  <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Réf. ID</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Adresse IP</th>
                  <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100" style={{ width: '100px' }}>Détails</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-8 py-6 border-b border-gray-50">
                          <div className="skeleton" style={{ height: '16px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length > 0 ? (
                  filtered.map(log => (
                    <tr key={log.id} className="group hover:bg-purple-50/30 transition-all duration-300">
                      <td className="px-8 py-6 border-b border-gray-50 text-gray-500 font-medium text-sm whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50">
                        <div className="flex flex-col gap-1">
                          <span className="font-black text-gray-900">{log.user_name || 'Système'}</span>
                          {log.user_email && <span className="text-xs text-gray-400">{log.user_email}</span>}
                        </div>
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${ACTION_META[log.action]?.cls || ACTION_META.export.cls}`}>
                          {ACTION_META[log.action]?.label || log.action}
                        </span>
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50 text-gray-700 font-medium text-sm">
                        {log.resource_type}
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50 text-center font-mono text-xs text-gray-500">
                        {log.resource_id || '—'}
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50 font-mono text-xs text-gray-500">
                        {log.ip_address || '—'}
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50 text-center">
                        {log.details && (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="w-10 h-10 rounded-[1.25rem] bg-gray-50 text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-all flex items-center justify-center"
                            title="Voir les détails"
                          >
                            <HiOutlineEye size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center">
                      <div className="text-gray-400 font-medium">Aucun journal d'audit trouvé.</div>
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
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] max-w-2xl w-full p-8 md:p-12 relative shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="absolute top-8 right-8">
              <button onClick={() => setSelectedLog(null)} className="w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center font-black">✕</button>
            </div>
            
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-1 bg-purple-500 rounded-full"></div>
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">DÉTAILS DE L'ACTION</span>
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Journal d'événement</h2>
              <p className="text-gray-400 text-sm font-medium mt-1">{new Date(selectedLog.created_at).toLocaleString('fr-FR')}</p>
            </div>
            
            <div className="pt-2">
              <InfoRow label="Utilisateur" value={selectedLog.user_name || 'Système'} />
              {selectedLog.user_email && <InfoRow label="Email" value={selectedLog.user_email} />}
              <InfoRow label="Action" value={
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${ACTION_META[selectedLog.action]?.cls || ACTION_META.export.cls}`}>
                  {ACTION_META[selectedLog.action]?.label || selectedLog.action}
                </span>
              } />
              <InfoRow label="Ressource" value={selectedLog.resource_type} />
              <InfoRow label="ID Ressource" value={selectedLog.resource_id || '—'} mono />
              <InfoRow label="Adresse IP" value={selectedLog.ip_address || '—'} mono />
              
              {selectedLog.details && (
                <div className="pt-4">
                  <div className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Données de l'événement</div>
                  <pre className="bg-gray-50 rounded-[1.25rem] p-5 text-xs overflow-auto max-h-52 text-gray-800 m-0 border border-gray-100">
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
