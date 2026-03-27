'use client';

/**
 * Konggest — Header Component
 * Top bar with search, notifications, and profile.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HiOutlineSearch, HiOutlineBell } from 'react-icons/hi';
import api from '@/lib/api';
import Link from 'next/link';
import styles from './Header.module.css';

export default function Header() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const data = await api.get('/notifications/unread_count/');
        setUnreadCount(data.unread_count);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };
    if (user) {
      fetchUnreadCount();
      // Polling every 2 minutes
      const interval = setInterval(fetchUnreadCount, 120000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <header className={styles.header}>
      {/* Search */}
      <div className={styles.searchBar}>
        <HiOutlineSearch className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Rechercher employés, documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          id="global-search"
        />
      </div>

      {/* Right side */}
      <div className={styles.actions}>
        {/* Notifications */}
        <Link href="/notifications" className={styles.iconBtn} id="notifications-btn" aria-label="Notifications">
          <HiOutlineBell />
          {unreadCount > 0 && <span className={styles.notifBadge}>{unreadCount}</span>}
        </Link>

        {/* Organization */}
        <div className={styles.orgBadge}>
          {user?.profile?.organization?.name || 'Mon entreprise'}
        </div>
      </div>
    </header>
  );
}
