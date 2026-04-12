'use client';

/**
 * Konggest — Admin Layout
 * Dedicated layout for SaaS administrators with access control.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from '@/components/layout/AdminSidebar';
import styles from './layout.module.css';

export default function AdminLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
    if (!loading && user && !user.profile?.is_saas_admin) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user || !user.profile?.is_saas_admin) return null;

  return (
    <div className={styles.layout}>
      <AdminSidebar />
      <main className={styles.main}>
        <div className="animate-in">
          {children}
        </div>
      </main>
    </div>
  );
}
