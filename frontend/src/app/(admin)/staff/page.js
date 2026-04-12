'use client';

/**
 * Konggest — Centre de Contrôle SaaS (Global)
 * Supervision des organisations, MRR et santé plateforme.
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  HiOutlineOfficeBuilding, HiOutlineUsers, 
  HiOutlineShieldExclamation, HiOutlineCurrencyDollar, 
  HiOutlineRefresh, HiOutlineTrendingUp,
  HiOutlineChartBar, HiOutlineBadgeCheck
} from 'react-icons/hi';
import api from '@/lib/api';

const formatCurrency = (val) => 
  new Intl.NumberFormat('fr-FR', { style: 'decimal' }).format(Math.round(val)) + ' FCFA';

export default function StaffDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/accounts/staff-stats/');
      setStats(data);
    } catch (err) {
      console.error('Error fetching staff stats:', err);
      setError('Impossible de charger les statistiques système.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="animate-fade-in dashboard-saas">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">🎛️ Centre de Contrôle</h1>
          <p className="text-slate-500 mt-1">Supervision globale et revenus récurrents (MRR).</p>
        </div>
        <button 
          className={`btn p-3 rounded-full transition-all ${loading ? 'bg-slate-100' : 'bg-white shadow-sm border hover:shadow-md'}`}
          onClick={fetchData} 
          disabled={loading}
        >
          <HiOutlineRefresh className={loading ? 'animate-spin text-primary' : 'text-slate-600'} size={20} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 border border-red-100 flex items-center gap-3">
          <HiOutlineShieldExclamation size={24} />
          <span>{error}</span>
        </div>
      )}

      {loading && !stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Main KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* MRR Card (New) */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl text-white shadow-indigo-200 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-white/20 rounded-xl"><HiOutlineCurrencyDollar size={24} /></div>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">Mensuel</span>
              </div>
              <h3 className="text-2xl font-bold">{formatCurrency(stats.mrr || 0)}</h3>
              <p className="text-white/80 text-sm mt-1">Revenu Récurrent (MRR)</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><HiOutlineOfficeBuilding size={24} /></div>
                <div>
                  <h4 className="text-2xl font-bold text-slate-800">{stats.total_organizations || 0}</h4>
                  <p className="text-slate-500 text-sm">Organisations</p>
                </div>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${(stats.active_organizations / stats.total_organizations) * 100}%` }} 
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-wider">
                {stats.active_organizations || 0} ACTIVES
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><HiOutlineUsers size={24} /></div>
                <div>
                  <h4 className="text-2xl font-bold text-slate-800">{stats.total_employees || 0}</h4>
                  <p className="text-slate-500 text-sm">Employés Gérés</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><HiOutlineShieldExclamation size={24} /></div>
                <div>
                  <h4 className="text-2xl font-bold text-slate-800">{stats.failed_attempts || 0}</h4>
                  <p className="text-slate-500 text-sm">Alertes de Sécurité</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plan Distribution */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <HiOutlineChartBar className="text-primary" /> Distribution des Plans
                </h3>
              </div>
              <div className="space-y-5">
                {(stats.org_distribution || []).map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-slate-600 uppercase tracking-tight">{item.plan}</span>
                      <span className="font-bold text-slate-800">{item.count} orgs</span>
                    </div>
                    <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.plan === 'premium' ? 'bg-indigo-500' : item.plan === 'pro' ? 'bg-blue-500' : 'bg-slate-300'}`}
                        style={{ width: `${(item.count / stats.total_organizations) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health & Usage */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <HiOutlineBadgeCheck className="text-emerald-500" /> État de Santé du Système
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs text-slate-500 mb-1">Documents RH</p>
                  <p className="text-xl font-bold text-slate-800">{stats.total_documents || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs text-slate-500 mb-1">Flux de Congés</p>
                  <p className="text-xl font-bold text-slate-800">{stats.total_leave_requests || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs text-slate-500 mb-1">Connexions (24h)</p>
                  <p className="text-xl font-bold text-slate-800">{stats.recent_logins || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs text-slate-500 mb-1">Temps de Réponse</p>
                  <p className="text-xl font-bold text-emerald-600">82ms</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
