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
    <div className="animate-in dashboard-saas">
      {/* Mesh Background for Staff space */}
      <div className="bg-mesh" style={{ opacity: 0.4 }} />

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* MRR Card (Premium Highlight) */}
            <div className="premium-card bg-indigo-600 text-white animate-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md shadow-lg">
                  <HiOutlineCurrencyDollar size={28} />
                </div>
                <div className="badge bg-white/20 text-white border-0">MRR</div>
              </div>
              <h3 className="text-3xl font-black mb-1 leading-tight">{formatCurrency(stats.mrr || 0)}</h3>
              <p className="text-white/70 text-sm font-bold uppercase tracking-widest">Monthly Recurring Revenue</p>
            </div>

            <div className="glass-card animate-in" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-5 mb-6">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-inner">
                  <HiOutlineOfficeBuilding size={26} />
                </div>
                <div>
                  <h4 className="text-3xl font-black text-slate-800 leading-tight">{stats.total_organizations || 0}</h4>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Organizations</p>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" 
                  style={{ width: `${(stats.active_organizations / (stats.total_organizations || 1)) * 100}%` }} 
                />
              </div>
              <div className="flex justify-between mt-3">
                <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">
                  {stats.active_organizations || 0} Active Units
                </span>
                <span className="text-[10px] text-emerald-600 font-black tracking-widest">HEALTHY</span>
              </div>
            </div>

            <div className="glass-card animate-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-5">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-inner">
                  <HiOutlineUsers size={26} />
                </div>
                <div>
                  <h4 className="text-3xl font-black text-slate-800 leading-tight">{stats.total_employees || 0}</h4>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Managed Talent</p>
                </div>
              </div>
            </div>

            <div className="glass-card animate-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-5">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-inner">
                  <HiOutlineShieldExclamation size={26} />
                </div>
                <div>
                  <h4 className="text-3xl font-black text-slate-800 leading-tight">{stats.failed_attempts || 0}</h4>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Security Events</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plan Distribution */}
            <div className="glass-card animate-in p-8" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
                  <div className="w-2 h-6 bg-primary rounded-full" /> Plan Distribution
                </h3>
              </div>
              <div className="space-y-6">
                {(stats.org_distribution || []).map((item, i) => (
                  <div key={i} className="group">
                    <div className="flex justify-between text-sm mb-2 px-1">
                      <span className="font-bold text-slate-500 uppercase tracking-widest text-[11px] group-hover:text-primary transition-colors">{item.plan}</span>
                      <span className="font-black text-slate-800">{item.count}</span>
                    </div>
                    <div className="h-3 bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          item.plan === 'premium' ? 'bg-indigo-500 shadow-[0_0_15px_var(--staff-glow)]' : 
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
            <div className="glass-card animate-in p-8" style={{ animationDelay: '0.6s' }}>
              <h3 className="font-black text-slate-800 text-lg mb-8 flex items-center gap-3">
                <div className="w-2 h-6 bg-emerald-500 rounded-full" /> System Vitals
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-primary/20 transition-all group">
                  <p className="text-[10px] text-slate-400 mb-1 font-black tracking-widest uppercase">HR Artifacts</p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-primary transition-colors">{stats.total_documents || 0}</p>
                </div>
                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-primary/20 transition-all group">
                  <p className="text-[10px] text-slate-400 mb-1 font-black tracking-widest uppercase">Leave Velocity</p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-primary transition-colors">{stats.total_leave_requests || 0}</p>
                </div>
                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-primary/20 transition-all group">
                  <p className="text-[10px] text-slate-400 mb-1 font-black tracking-widest uppercase">Active Sessions</p>
                  <p className="text-2xl font-black text-slate-800 group-hover:text-primary transition-colors">{stats.recent_logins || 0}</p>
                </div>
                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-primary/20 transition-all group">
                  <p className="text-[10px] text-slate-400 mb-1 font-black tracking-widest uppercase">Latency Avg</p>
                  <p className="text-2xl font-black text-emerald-600">82ms</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
