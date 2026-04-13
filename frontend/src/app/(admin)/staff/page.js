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
    <div className="animate-in dashboard-saas min-h-screen bg-slate-50/50 p-6 md:p-10">
      {/* Clean, Senior aesthetic - No background images */}

      {/* Header Section */}
      <div className="flex justify-between items-end mb-10 relative z-10">
        <div>
          <span className="badge badge-primary mb-2 animate-fade-in">SYSTEM MONITORING</span>
          <h1 className="text-4xl font-black tracking-tight text-slate-800">Command Center</h1>
          <p className="text-slate-500 mt-1 font-medium">Real-time platform analytics & revenue tracking.</p>
        </div>
        <button 
          className={`iconBtn ${loading ? 'animate-glow' : ''}`}
          onClick={fetchData} 
          disabled={loading}
          title="Actualiser les données"
        >
          <HiOutlineRefresh className={loading ? 'animate-spin text-primary' : ''} />
        </button>
      </div>

      {error && (
        <div className="glass-card border-red-200 text-red-600 p-5 mb-8 flex items-center gap-4 animate-in">
          <div className="p-3 bg-red-100 rounded-xl"><HiOutlineShieldExclamation size={24} /></div>
          <span className="font-bold">{error}</span>
        </div>
      )}

      {loading && !stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 w-full" />
          ))}
        </div>
      ) : stats ? (
        <div className="relative z-10">
          {/* Main KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* MRR Card (Premium Highlight) */}
            <div className="relative overflow-hidden p-8 rounded-[2rem] bg-[#020617] text-white shadow-2xl shadow-indigo-500/10 group animate-in" style={{ animationDelay: '0.1s' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-[60px] rounded-full -mr-10 -mt-10" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="p-3.5 bg-indigo-500/20 text-indigo-400 rounded-2xl backdrop-blur-md border border-white/5">
                    <HiOutlineCurrencyDollar size={28} />
                  </div>
                  <span className="text-[10px] font-black tracking-[0.2em] text-indigo-400/80 uppercase">Flux Mensuel</span>
                </div>
                <h3 className="text-3xl font-black mb-1 leading-tight tracking-tighter">{formatCurrency(stats.mrr || 0)}</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">Revenue Récurrent (MRR)</p>
              </div>
            </div>

            <div className="glass-card p-8 rounded-[2rem] border-white/40 shadow-xl shadow-slate-200/40 hover:shadow-2xl transition-all duration-500 animate-in" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-5 mb-8">
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                  <HiOutlineOfficeBuilding size={26} />
                </div>
                <div>
                  <h4 className="text-3xl font-black text-slate-900 leading-tight tracking-tighter">{stats.total_organizations || 0}</h4>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Entreprises</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${(stats.active_organizations / (stats.total_organizations || 1)) * 100}%` }} 
                  />
                </div>
                <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{stats.active_organizations || 0} Actives</span>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase">Optimal</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 rounded-[2rem] border-white/40 shadow-xl shadow-slate-200/40 animate-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-5">
                <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                  <HiOutlineUsers size={26} />
                </div>
                <div>
                  <h4 className="text-3xl font-black text-slate-900 leading-tight tracking-tighter">{stats.total_employees || 0}</h4>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Collab. Gérés</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 rounded-[2rem] border-white/40 shadow-xl shadow-slate-200/40 animate-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-5">
                <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                  <HiOutlineShieldExclamation size={26} />
                </div>
                <div>
                  <h4 className="text-3xl font-black text-slate-900 leading-tight tracking-tighter">{stats.failed_attempts || 0}</h4>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Incidents Sécu.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-8 rounded-[2rem] border-white shadow-xl shadow-slate-200/40 animate-in" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-3 tracking-tighter uppercase">
                  <div className="w-1.5 h-6 bg-indigo-500 rounded-full" /> Distribution Plans
                </h3>
              </div>
              <div className="space-y-6">
                {(stats.org_distribution || []).map((item, i) => (
                  <div key={i} className="group">
                    <div className="flex justify-between text-sm mb-2 px-1">
                      <span className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px] group-hover:text-indigo-600 transition-colors">{item.plan}</span>
                      <span className="font-black text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          item.plan === 'premium' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 
                          item.plan === 'pro' ? 'bg-blue-500' : 'bg-slate-300'
                        }`}
                        style={{ width: `${(item.count / (stats.total_organizations || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health & Usage */}
            <div className="glass-card p-8 rounded-[2rem] border-white shadow-xl shadow-slate-200/40 animate-in" style={{ animationDelay: '0.6s' }}>
              <h3 className="font-black text-slate-900 text-lg mb-8 flex items-center gap-3 tracking-tighter uppercase">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" /> Santé Système
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50/50 rounded-2xl border border-white hover:border-indigo-100 transition-all group">
                  <p className="text-[10px] text-slate-400 mb-1 font-black tracking-widest uppercase">Documents HR</p>
                  <p className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tighter">{stats.total_documents || 0}</p>
                </div>
                <div className="p-5 bg-slate-50/50 rounded-2xl border border-white hover:border-indigo-100 transition-all group">
                  <p className="text-[10px] text-slate-400 mb-1 font-black tracking-widest uppercase">Demandes Congés</p>
                  <p className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tighter">{stats.total_leave_requests || 0}</p>
                </div>
                <div className="p-5 bg-slate-50/50 rounded-2xl border border-white hover:border-indigo-100 transition-all group">
                  <p className="text-[10px] text-slate-400 mb-1 font-black tracking-widest uppercase">Sessions Actives</p>
                  <p className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tighter">{stats.recent_logins || 0}</p>
                </div>
                <div className="p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 group">
                  <p className="text-[10px] text-emerald-600/60 mb-1 font-black tracking-widest uppercase">Latence Moy.</p>
                  <p className="text-2xl font-black text-emerald-600 tracking-tighter">82ms</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
