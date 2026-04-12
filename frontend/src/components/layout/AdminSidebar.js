'use client';

/**
 * Konggest — Admin Sidebar
 * Premium sidebar for SaaS platform administrators.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  HiOutlineChartBar, HiOutlineOfficeBuilding, HiOutlineUsers,
  HiOutlineShieldCheck, HiOutlineCog, HiOutlineLogout,
  HiOutlineMenu, HiOutlineX
} from 'react-icons/hi';
import styles from './AdminSidebar.module.css';

const ADMIN_NAV = [
  { path: '/staff', icon: HiOutlineChartBar, label: 'Dashboard', exact: true },
  { path: '/staff/organizations', icon: HiOutlineOfficeBuilding, label: 'Organisations' },
  { path: '/staff/users', icon: HiOutlineUsers, label: 'Utilisateurs' },
  { path: '/staff/personnel', icon: HiOutlineShieldCheck, label: 'Gestion Personnel' },
  { path: '/staff/audit', icon: HiOutlineShieldCheck, label: 'Journal d\'Audit' },
  { path: '/staff/settings', icon: HiOutlineCog, label: 'Paramètres' },
];

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [pathname, isMobile]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (item) => {
    if (item.exact) return pathname === item.path;
    return pathname.startsWith(item.path);
  };

  const initials = user?.profile?.full_name?.[0] || user?.email?.[0] || 'A';

  return (
    <>
      {isMobile && (
        <div className={styles.mobileTopNav}>
          <div className={styles.mobileLogo}>
            <img src="/logo.png" alt="Logo" width={24} height={24} />
            <span className={styles.mobileBrand}>Konggest</span>
          </div>
          <button className={styles.mobileToggle} onClick={() => setMobileOpen(true)} aria-label="Menu">
            <HiOutlineMenu />
          </button>
        </div>
      )}

      {isMobile && mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${isMobile ? styles.mobile : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
        {/* Header / Brand */}
        <div className={styles.header}>
          <div className={styles.logoArea}>
            <div className={styles.logoIcon}>
              <img src="/logo.png" alt="Konggest Logo" />
            </div>
            <div className={styles.logoText}>
              <span className={styles.brand}>Konggest</span>
              <span className={styles.badge}>CONTROL CENTER</span>
            </div>
          </div>
          {isMobile && (
            <button className={styles.closeBtn} onClick={() => setMobileOpen(false)}>
              <HiOutlineX />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <nav className={styles.nav}>
          <span className={styles.sectionLabel}>SYSTEM CONTROL</span>
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`${styles.navItem} ${active ? styles.active : ''}`}
              >
                <Icon className={styles.navIcon} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className={styles.divider} />
          <span className={styles.sectionLabel}>SHORTCUTS</span>
          <Link href="/dashboard" className={styles.navItem}>
            <HiOutlineChartBar className={styles.navIcon} />
            <span>Vue Entreprise</span>
          </Link>
        </nav>

        {/* Staff User Section */}
        <div className={styles.userSection}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.profile?.full_name || 'Staff User'}</span>
            <span className={styles.userRole}>SYSTEM ADMIN</span>
          </div>
          <button className={styles.logoutBtn} onClick={logout} title="Déconnexion">
            <HiOutlineLogout />
          </button>
        </div>
      </aside>
    </>
  );
}
