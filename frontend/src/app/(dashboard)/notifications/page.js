'use client';

import { useState, useEffect, useCallback } from 'react';
import { HiOutlineBell, HiOutlineRefresh, HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineInformationCircle } from 'react-icons/hi';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

const TYPE_CONFIG = {
  leave: { bg: 'rgba(56, 189, 248, 0.1)', color: '#0ea5e9', icon: HiOutlineBell },
  payroll: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', icon: HiOutlineCheckCircle },
  warning: { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308', icon: HiOutlineExclamationCircle },
  info: { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b', icon: HiOutlineInformationCircle },
  success: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', icon: HiOutlineCheckCircle },
  task: { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', icon: HiOutlineBell },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, text: '', type: 'info' });

  const showToast = (text, type = 'info') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '' }), 5000);
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/notifications/');
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialization & Realtime
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    // Setup Supabase Realtime Listener
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('broadcast', { event: 'new_notification' }, ({ payload }) => {
        // 1. Show dynamic toast
        showToast(payload.message, payload.type);
        
        // 2. Fetch fresh data (or we could prepend manually if payload has all fields)
        fetchNotifications();
        
        // 3. Play subtle sound if possible (optional)
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark_all_read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast('Toutes les notifications ont été marquées comme lues', 'success');
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/mark_read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type} fixed top-4 right-4 z-50 animate-slide-in shadow-xl`} style={{
          backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)',
          padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <HiOutlineBell style={{ color: TYPE_CONFIG[toast.type]?.color || 'var(--primary)' }} />
          <span className="text-sm font-medium">{toast.text}</span>
        </div>
      )}

      <div className="page-header flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-slate-500">Alertes, rappels et mises à jour en temps réel.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost p-2" onClick={fetchNotifications} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium" onClick={markAllAsRead}>
            Tout marquer comme lu
          </button>
        </div>
      </div>

      <div className="card shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)' }}>
        {loading && notifications.length === 0 ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map(n => {
              const config = TYPE_CONFIG[n.notification_type] || TYPE_CONFIG.info;
              const Icon = config.icon;
              
              return (
                <div key={n.id} 
                  className={`flex items-start gap-4 p-5 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 ${!n.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  style={{ cursor: n.is_read ? 'default' : 'pointer' }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" 
                    style={{ backgroundColor: config.bg, color: config.color }}>
                    <Icon size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-sm font-semibold truncate ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                        {n.title}
                      </h3>
                      <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                        {new Date(n.created_at).toLocaleDateString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${!n.is_read ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}>
                      {n.message}
                    </p>
                    {n.link && (
                      <a href={n.link} className="text-xs font-semibold text-blue-500 hover:text-blue-600 mt-2 inline-block">
                        Voir le détail
                      </a>
                    )}
                  </div>
                  
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiOutlineBell className="text-slate-400" size={32} />
            </div>
            <h3 className="text-slate-900 dark:text-white font-medium">Aucune notification</h3>
            <p className="text-slate-500 text-sm mt-1">Vous êtes à jour ! Toutes les alertes apparaîtront ici.</p>
          </div>
        )}
      </div>
    </div>
  );
}
