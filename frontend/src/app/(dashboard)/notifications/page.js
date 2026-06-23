'use client';

import { useState, useEffect, useCallback } from 'react';
import { HiOutlineBell, HiOutlineCheckCircle, HiOutlineX, HiOutlineTrash } from 'react-icons/hi';
import api from '@/lib/api';

function NotificationItem({ notif, onMarkRead, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const isUnread = !notif.is_read;

  return (
    <div className={`flex gap-4 p-6 rounded-[2rem] transition-all duration-300 hover:bg-gray-50/50 group ${isUnread ? 'bg-blue-50/30' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
        notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
        notif.type === 'warning' ? 'bg-amber-100 text-amber-600' : 
        notif.type === 'error' ? 'bg-red-100 text-red-600' :
        'bg-blue-100 text-blue-600'
      }`}>
        <HiOutlineBell size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-black text-gray-900 text-sm">{notif.title}</h3>
          <div className="flex items-center gap-2">
            {isUnread && (
              <button
                onClick={() => onMarkRead(notif.id)}
                className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center"
                title="Marquer comme lu"
              >
                <HiOutlineCheckCircle size={16} />
              </button>
            )}
            <button
              onClick={() => onDelete(notif.id)}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center"
              title="Supprimer"
              disabled={deleting}
            >
              <HiOutlineTrash size={16} />
            </button>
          </div>
        </div>
        <p className="text-gray-500 font-medium text-xs mb-2">{notif.message}</p>
        <div className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">
          {new Date(notif.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/notifications/items/');
      setNotifications(Array.isArray(data) ? data : (data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markAsRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/items/${id}/`, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* silent */ }
  }, []);

  const deleteNotif = useCallback(async (id) => {
    if (!confirm('Supprimer cette notification ?')) return;
    try {
      await api.delete(`/notifications/items/${id}/`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { /* silent */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/items/mark-all-read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* silent */ }
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-full flex flex-col bg-[#FDFDFF]">
      {/* Page Header */}
      <div className="px-6 md:px-12 pt-8 md:pt-12 pb-8 md:pb-10 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div className="animate-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-1 bg-blue-500 rounded-full"></div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">CENTRE DE NOTIFICATIONS</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-3">
            Notifications
          </h1>
          <p className="text-gray-400 font-medium text-sm md:text-base max-w-lg">
            Gérez vos alertes et notifications en temps réel.
          </p>
        </div>
        <div className="flex gap-3 animate-in slide-in-from-right-4 duration-700">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex-1 md:flex-none bg-white text-gray-900 border border-gray-100 px-6 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition shadow-sm flex items-center gap-2">
              <HiOutlineCheckCircle size={16} />
              Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 pb-12 flex-1">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4 p-6">
                    <div className="w-10 h-10 skeleton rounded-full" />
                    <div className="flex-1 space-y-3">
                      <div className="skeleton" style={{ height: '16px', width: '50%' }} />
                      <div className="skeleton" style={{ height: '12px', width: '80%' }} />
                      <div className="skeleton" style={{ height: '10px', width: '30%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {notifications.map(notif => (
                <div key={notif.id} className="animate-in slide-in-from-left-4 duration-700">
                    <NotificationItem 
                      notif={notif} 
                      onMarkRead={markAsRead} 
                      onDelete={deleteNotif} 
                    />
                </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center mx-auto mb-4">
                  <HiOutlineBell size={32} />
                </div>
                <div className="text-gray-400 font-medium">Aucune notification pour le moment.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
