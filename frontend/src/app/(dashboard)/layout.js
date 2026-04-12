'use client';

/**
 * Konggest — Dashboard Layout
 * Wraps all authenticated pages with Sidebar + Header.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import styles from './layout.module.css';

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
    // Strict redirect for SaaS Admins to their specific area
    if (!loading && user && user.profile?.is_saas_admin) {
      router.replace('/staff');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.layout}>
      {/* Dynamic Background */}
      <div className="bg-mesh" />
      
      <Sidebar />
      <Header />
      
      <main className={styles.main}>
        <div className="animate-in">
          {children}
        </div>
      </main>
    </div>
  );
}
