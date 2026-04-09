'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { 
  HiOutlineUsers, 
  HiOutlineClock, 
  HiOutlineSearch, 
  HiOutlineChartBar,
  HiOutlineArrowRight,
  HiOutlineLocationMarker,
  HiOutlineBriefcase
} from 'react-icons/hi';
import styles from './page.module.css';

export default function LandingPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Refs for scroll animations
  const revealRefs = useRef([]);
  revealRefs.current = [];

  const addToRefs = (el) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  useEffect(() => {
    fetchPublicJobs();
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    // Intersection Observer for reveal animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    revealRefs.current.forEach((ref) => {
      observer.observe(ref);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      revealRefs.current.forEach((ref) => {
        if(ref) observer.unobserve(ref);
      });
    };
  }, []);

  const fetchPublicJobs = async () => {
    try {
      const response = await fetch('/api/recruitment/public/jobs');
      if (response.ok) setJobs(await response.json());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Navigation Mobile-First */}
      <nav className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ''}`}>
        <div className={styles.navbarContent}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <img src="/logo.png" alt="Konggest Logo" />
            </div>
            <span className={styles.logoText}>Konggest</span>
          </Link>

          <div className={styles.navLinksDesktop}>
            <a href="#features">Fonctionnalités</a>
            <a href="#jobs">Carrières</a>
            {user ? (
              <Link href="/dashboard" className={styles.btnPrimary}>Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className={styles.btnGhost}>Connexion</Link>
                <Link href="/register" className={styles.btnPrimary}>Essai gratuit</Link>
              </>
            )}
          </div>

          <button className={styles.menuButton} onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <span className={`${styles.menuLine} ${isMenuOpen ? styles.menuLineOpen : ''}`} />
            <span className={`${styles.menuLine} ${isMenuOpen ? styles.menuLineOpen : ''}`} />
            <span className={`${styles.menuLine} ${isMenuOpen ? styles.menuLineOpen : ''}`} />
          </button>
        </div>

        <div className={`${styles.navMobile} ${isMenuOpen ? styles.navMobileOpen : ''}`}>
          <Link href="#features" className={styles.navLinkMobile} onClick={() => setIsMenuOpen(false)}>Fonctionnalités</Link>
          <Link href="#jobs" className={styles.navLinkMobile} onClick={() => setIsMenuOpen(false)}>Carrières</Link>
          {user ? (
            <Link href="/dashboard" className={styles.btnPrimaryMobile} onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className={styles.btnGhostMobile} onClick={() => setIsMenuOpen(false)}>Connexion</Link>
              <Link href="/register" className={styles.btnPrimaryMobile} onClick={() => setIsMenuOpen(false)}>Essai gratuit</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`${styles.hero} reveal-up`} ref={addToRefs}>
        <div className={styles.heroBackground}>
          <div className={styles.gradientOrb1} />
          <div className={styles.gradientOrb2} />
        </div>
        
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span>✨</span>
            <span>Nouveau: Recrutement intelligent</span>
          </div>
          
          <h1 className={styles.heroTitle}>
            <span className={styles.titleLine}>Gérez votre</span>
            <span className={styles.titleLineAccent}>entreprise</span>
            <span className={styles.titleLine}>autrement</span>
          </h1>
          
          <p className={styles.heroSubtitle}>
            La plateforme tout-en-un qui révolutionne la gestion RH. 
            Du recrutement à la paie, tout en un seul clic.
          </p>
          
          <div className={styles.heroCta}>
            <Link href={user ? "/dashboard" : "/register"} className={styles.btnHero}>
              {user ? 'Mon espace' : 'Démarrer gratuitement'}
              <span>→</span>
            </Link>
            <a href="#features" className={styles.btnGhostHero}>
              Découvrir
            </a>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>500+</span>
              <span className={styles.statLabel}>Entreprises</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>10k+</span>
              <span className={styles.statLabel}>Employés</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>98%</span>
              <span className={styles.statLabel}>Satisfaction</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={`${styles.features} reveal-up`} ref={addToRefs}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Fonctionnalités</span>
          <h2 className={styles.sectionTitle}>Tout ce dont vous avez besoin</h2>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <HiOutlineUsers className={styles.featureIcon} />
            </div>
            <h3>Gestion RH</h3>
            <p>Employés, contrats, congés et documents.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <HiOutlineClock className={styles.featureIcon} />
            </div>
            <h3>Pointage</h3>
            <p>Temps de travail et paie automatisée.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <HiOutlineSearch className={styles.featureIcon} />
            </div>
            <h3>Recrutement</h3>
            <p>Offres, candidatures et entretiens.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <HiOutlineChartBar className={styles.featureIcon} />
            </div>
            <h3>Rapports</h3>
            <p>Analyses et tableaux de bord.</p>
          </div>
        </div>
      </section>

      {/* Jobs */}
      <section id="jobs" className={`${styles.jobsSection} reveal-up`} ref={addToRefs}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Carrières</span>
          <h2 className={styles.sectionTitle}>Opportunités de carrière</h2>
        </div>

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
                  <span><HiOutlineLocationMarker /> {job.location || 'Remote'}</span>
                  <span><HiOutlineBriefcase /> {job.department || 'RH'}</span>
                </div>
                <p className={styles.jobDescription}>
                  {job.description?.substring(0, 120)}...
                </p>
                <Link href="/careers" className={styles.applyLink}>
                  Postuler <HiOutlineArrowRight />
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className={styles.viewAllJobs}>
          <Link href="/careers" className={styles.btnOutline}>
            Voir toutes les offres <HiOutlineArrowRight />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className={`${styles.ctaSection} reveal-up`} ref={addToRefs}>
        <div className={styles.ctaContent}>
          <h2>Prêt à transformer votre gestion ?</h2>
          <p>Rejoignez plus de 500 entreprises qui font confiance à Konggest pour leur transformation numérique.</p>
          <Link href={user ? "/dashboard" : "/register"} className={styles.btnCta}>
            {user ? 'Mon espace' : 'Commencer gratuitement'}
            <HiOutlineArrowRight />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <div className={styles.logoIconFooter}>
              <img src="/logo.png" alt="Konggest Logo" />
            </div>
            <h3 className={styles.logoTextFooter}>Konggest</h3>
          </div>
          <p>&copy; {new Date().getFullYear()} Konggest. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
