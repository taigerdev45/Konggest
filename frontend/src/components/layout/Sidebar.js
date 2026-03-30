'use client';

/**
 * Konggest — Sidebar Navigation
 * Premium collapsible sidebar with mobile overlay.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  HiOutlineViewGrid, HiOutlineUsers, HiOutlineCalendar,
  HiOutlineCurrencyDollar, HiOutlineDocumentText, HiOutlineClock,
  HiOutlineBriefcase, HiOutlineChartBar, HiOutlineBell,
  HiOutlineCog, HiOutlineLogout, HiOutlineChevronLeft, HiOutlineMenu,
  HiOutlineX, HiOutlineShieldCheck
} from 'react-icons/hi';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { path: '/dashboard', icon: HiOutlineViewGrid, label: 'Dashboard', roles: ['admin', 'hr', 'manager', 'employee'] },
  { path: '/employees', icon: HiOutlineUsers, label: 'Employés', roles: ['admin', 'hr', 'manager'] },
  { path: '/users', icon: HiOutlineUsers, label: 'Utilisateurs', roles: ['admin', 'hr'] },
  { path: '/leaves', icon: HiOutlineCalendar, label: 'Congés', roles: ['admin', 'hr', 'manager', 'employee'] },
  { path: '/payroll', icon: HiOutlineCurrencyDollar, label: 'Paie', roles: ['admin', 'hr', 'employee'] },
  { path: '/documents', icon: HiOutlineDocumentText, label: 'Documents', roles: ['admin', 'hr', 'employee'] },
  { path: '/time-tracking', icon: HiOutlineClock, label: 'Pointage', roles: ['admin', 'hr', 'manager', 'employee'] },
  { path: '/recruitment', icon: HiOutlineBriefcase, label: 'Recrutement', roles: ['admin', 'hr'] },
  { path: '/performance', icon: HiOutlineChartBar, label: 'Performance', roles: ['admin', 'hr', 'manager', 'employee'] },
  { path: '/audit-logs', icon: HiOutlineShieldCheck, label: 'Audit Logs', roles: ['admin', 'hr'] },
];

const BOTTOM_ITEMS = [
  { path: '/notifications', icon: HiOutlineBell, label: 'Notifications', roles: ['admin', 'hr', 'manager', 'employee'] },
  { path: '/settings', icon: HiOutlineCog, label: 'Paramètres', roles: ['admin', 'hr', 'manager', 'employee'] },
  { path: '/staff', icon: HiOutlineChartBar, label: 'Espace Staff', roles: ['admin', 'saas_admin'] },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const userRole = user?.profile?.role || 'employee';

  const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(userRole));
  const filteredBottomItems = BOTTOM_ITEMS.filter(item => item.roles.includes(userRole));

  const initials = user?.profile?.full_name ? user.profile.full_name[0] : (user?.email ? user.email[0] : 'K');

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [pathname, isMobile]);

  // Prevent body scroll when mobile sidebar open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          className={styles.mobileToggle}
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <HiOutlineMenu />
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${collapsed && !isMobile ? styles.collapsed : ''} ${isMobile ? styles.mobile : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <img src="/logo.png" alt="Logo" width={32} height={32} />
          </div>
          {(!collapsed || isMobile) && <span className={styles.logoText}>Konggest</span>}

          {isMobile ? (
            <button
              className={styles.collapseBtn}
              onClick={() => setMobileOpen(false)}
              aria-label="Fermer le menu"
            >
              <HiOutlineX />
            </button>
          ) : (
            <button
              className={styles.collapseBtn}
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Toggle sidebar"
            >
              <HiOutlineChevronLeft className={collapsed ? styles.rotated : ''} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <div className={styles.navSection}>
            {(!collapsed || isMobile) && <span className={styles.sectionLabel}>MENU PRINCIPAL</span>}
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                  title={collapsed && !isMobile ? item.label : undefined}
                >
                  <Icon className={styles.navIcon} />
                  {(!collapsed || isMobile) && <span>{item.label}</span>}
                  {isActive && <div className={styles.activeIndicator} />}
                </Link>
              );
            })}
          </div>

          <div className={styles.navSection}>
            {(!collapsed || isMobile) && <span className={styles.sectionLabel}>SYSTÈME</span>}
            {filteredBottomItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                  title={collapsed && !isMobile ? item.label : undefined}
                >
                  <Icon className={styles.navIcon} />
                  {(!collapsed || isMobile) && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className={styles.userSection}>
          <div className={styles.userAvatar}>{initials}</div>
          {(!collapsed || isMobile) && (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.profile?.full_name || 'Utilisateur'}</span>
              <span className={styles.userRole}>{userRole.toUpperCase()}</span>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={logout} title="Déconnexion">
            <HiOutlineLogout />
          </button>
        </div>
      </aside>
    </>
  );
}
