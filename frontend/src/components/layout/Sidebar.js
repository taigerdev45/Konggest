'use client';

/**
 * Konggest — Sidebar Navigation
 * Premium collapsible sidebar with animated icons.
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  HiOutlineViewGrid, HiOutlineUsers, HiOutlineCalendar,
  HiOutlineCurrencyDollar, HiOutlineDocumentText, HiOutlineClock,
  HiOutlineBriefcase, HiOutlineChartBar, HiOutlineBell,
  HiOutlineCog, HiOutlineLogout, HiOutlineChevronLeft,
} from 'react-icons/hi';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { path: '/dashboard', icon: HiOutlineViewGrid, label: 'Dashboard' },
  { path: '/employees', icon: HiOutlineUsers, label: 'Employés' },
  { path: '/leaves', icon: HiOutlineCalendar, label: 'Congés' },
  { path: '/payroll', icon: HiOutlineCurrencyDollar, label: 'Paie' },
  { path: '/documents', icon: HiOutlineDocumentText, label: 'Documents' },
  { path: '/time-tracking', icon: HiOutlineClock, label: 'Pointage' },
  { path: '/recruitment', icon: HiOutlineBriefcase, label: 'Recrutement' },
  { path: '/performance', icon: HiOutlineChartBar, label: 'Performance' },
];

const BOTTOM_ITEMS = [
  { path: '/notifications', icon: HiOutlineBell, label: 'Notifications' },
  { path: '/settings', icon: HiOutlineCog, label: 'Paramètres' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user ? `${(user.full_name || user.email || '')[0] || 'K'}` : 'K';

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>K</div>
        {!collapsed && <span className={styles.logoText}>Konggest</span>}
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          <HiOutlineChevronLeft className={collapsed ? styles.rotated : ''} />
        </button>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navSection}>
          {!collapsed && <span className={styles.sectionLabel}>MENU PRINCIPAL</span>}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={styles.navIcon} />
                {!collapsed && <span>{item.label}</span>}
                {isActive && <div className={styles.activeIndicator} />}
              </Link>
            );
          })}
        </div>

        <div className={styles.navSection}>
          {!collapsed && <span className={styles.sectionLabel}>SYSTÈME</span>}
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={styles.navIcon} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className={styles.userSection}>
        <div className={styles.userAvatar}>{initials}</div>
        {!collapsed && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.full_name || 'Utilisateur'}</span>
            <span className={styles.userRole}>{user?.role || 'Admin'}</span>
          </div>
        )}
        <button className={styles.logoutBtn} onClick={logout} title="Déconnexion">
          <HiOutlineLogout />
        </button>
      </div>
    </aside>
  );
}
