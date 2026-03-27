'use client';

import { useState, useEffect } from 'react';
import { HiOutlineBell, HiOutlineRefresh } from 'react-icons/hi';
import api from '@/lib/api';

const TYPE_STYLES = {
  leave: { bg: 'var(--primary-glow)', color: 'var(--primary-light)' },
  payroll: { bg: 'var(--success-bg)', color: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  info: { bg: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-light)' },
  success: { bg: 'var(--success-bg)', color: 'var(--success)' },
  task: { bg: 'var(--purple-bg)', color: 'var(--purple)' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get('/notifications/');
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark_all_read/');
      fetchNotifications();
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
    <div>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Alertes et rappels</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={fetchNotifications} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-secondary" onClick={markAllAsRead}>Tout marquer comme lu</button>
        </div>
      </div>
      <div className="card">
        {loading ? (
          <div className="p-xl text-center"><div className="skeleton" style={{ height: 100 }} /></div>
        ) : notifications.length > 0 ? (
          notifications.map(n => (
            <div key={n.id} className="flex items-center gap-md" style={{
              padding: '16px 0', borderBottom: '1px solid var(--border)',
              opacity: n.is_read ? 0.6 : 1,
              cursor: 'pointer',
            }} onClick={() => !n.is_read && markAsRead(n.id)}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: TYPE_STYLES[n.notification_type]?.bg || TYPE_STYLES.info.bg, 
                color: TYPE_STYLES[n.notification_type]?.color || TYPE_STYLES.info.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
              }}><HiOutlineBell /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{n.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>{n.message}</div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                {new Date(n.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Aucune notification.
          </div>
        )}
      </div>
    </div>
  );
}
