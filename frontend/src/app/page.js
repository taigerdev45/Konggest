'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function LandingPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicJobs();
  }, []);

  const fetchPublicJobs = async () => {
    try {
      const response = await fetch('/api/recruitment/public/jobs/');
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎯</span>
          <span className={styles.logoText}>Konggest</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#features">Fonctionnalités</a>
          <a href="#jobs">Offres</a>
          {user ? (
            <Link href="/dashboard" className={styles.btnPrimary}>Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className={styles.btnSecondary}>Connexion</Link>
              <Link href="/register" className={styles.btnPrimary}>Essai gratuit</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Gérez votre entreprise <span className={styles.highlight}>simplement</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Konggest est la solution SaaS tout-en-un pour la gestion RH, 
            le recrutement, le pointage et la paie.
          </p>
          <div className={styles.heroCta}>
            <Link href={user ? "/dashboard" : "/register"} className={styles.btnLarge}>
              {user ? 'Dashboard' : 'Commencer gratuitement'}
            </Link>
            <a href="#jobs" className={styles.btnOutlineLarge}>Voir les offres</a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>Tout ce dont vous avez besoin</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>👥</div>
            <h3>Gestion RH</h3>
            <p>Employés, contrats, congés et documents.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🎯</div>
            <h3>Recrutement</h3>
            <p>Offres, candidatures et entretiens.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⏱️</div>
            <h3>Pointage</h3>
            <p>Temps de travail et paie automatisée.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Rapports</h3>
            <p>Analyses et tableaux de bord.</p>
          </div>
        </div>
      </section>

      {/* Job Offers */}
      <section id="jobs" className={styles.jobsSection}>
        <h2 className={styles.sectionTitle}>Opportunités de carrière</h2>
        {loading ? (
          <div className={styles.loading}>Chargement...</div>
        ) : jobs.length === 0 ? (
          <div className={styles.noJobs}>
            <p>Aucune offre disponible pour le moment.</p>
          </div>
        ) : (
          <div className={styles.jobsGrid}>
            {jobs.slice(0, 6).map((job) => (
              <div key={job.id} className={styles.jobCard}>
                <div className={styles.jobHeader}>
                  <h3>{job.title}</h3>
                  <span className={styles.contractBadge}>{job.contract_type}</span>
                </div>
                <div className={styles.jobMeta}>
                  <span>📍 {job.location || 'Remote'}</span>
                  {job.salary_range && <span>💰 {job.salary_range}</span>}
                </div>
                <p className={styles.jobDescription}>
                  {job.description?.substring(0, 100)}...
                </p>
                <Link href="/careers" className={styles.applyLink}>Postuler →</Link>
              </div>
            ))}
          </div>
        )}
        <div className={styles.viewAllJobs}>
          <Link href="/careers" className={styles.btnOutline}>Voir toutes les offres</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <span className={styles.logoIcon}>🎯</span>
            <span className={styles.logoText}>Konggest</span>
          </div>
          <p>&copy; 2026 Konggest. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
