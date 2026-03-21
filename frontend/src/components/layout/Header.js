'use client';

/**
 * Konggest — Header Component
 * Top bar with search, notifications, and profile.
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HiOutlineSearch, HiOutlineBell } from 'react-icons/hi';
import styles from './Header.module.css';

export default function Header() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

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
        <button className={styles.iconBtn} id="notifications-btn" aria-label="Notifications">
          <HiOutlineBell />
          <span className={styles.notifBadge}>3</span>
        </button>

        {/* Organization */}
        <div className={styles.orgBadge}>
          {user?.organization || 'Mon entreprise'}
        </div>
      </div>
    </header>
  );
}
