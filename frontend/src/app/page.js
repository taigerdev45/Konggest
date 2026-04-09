'use client';

/**
 * Konggest — Public Landing Page
 * Ultra-premium design with dynamic animations, gradients, and responsive layout.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  HiOutlineUsers, 
  HiOutlineClock, 
  HiOutlineSearch, 
  HiOutlineChartBar,
  HiOutlineArrowRight,
  HiOutlineLocationMarker,
  HiOutlineBriefcase,
  HiOutlineShieldCheck,
  HiOutlineDocumentText
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

  const addToRefs = useCallback((el) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  }, []);

  useEffect(() => {
    fetchPublicJobs();

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // IntersectionObserver for reveal animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    // Observe after a microtask to ensure all refs are collected
    requestAnimationFrame(() => {
      revealRefs.current.forEach((ref) => observer.observe(ref));
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      revealRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
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

  const features = [
    {
      icon: HiOutlineUsers,
      title: 'Gestion RH Complète',
      desc: 'Centralisez employés, contrats, congés et documents dans un seul espace intelligent.',
    },
    {
      icon: HiOutlineClock,
      title: 'Pointage & Paie',
      desc: 'Automatisez le suivi du temps de travail et le calcul de la paie en temps réel.',
    },
    {
      icon: HiOutlineSearch,
      title: 'Recrutement Intelligent',
      desc: 'Publiez des offres, gérez les candidatures et planifiez les entretiens facilement.',
    },
    {
      icon: HiOutlineChartBar,
      title: 'Tableaux de Bord',
      desc: 'Visualisez les KPI de votre entreprise avec des rapports interactifs précis.',
    },
  ];

  return (
    <div className={styles.container}>
      {/* ═══ NAVIGATION ═══ */}
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

          <button className={styles.menuButton} onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Menu">
            <span className={`${styles.menuLine} ${isMenuOpen ? styles.menuLineOpen : ''}`} />
            <span className={`${styles.menuLine} ${isMenuOpen ? styles.menuLineOpen : ''}`} />
            <span className={`${styles.menuLine} ${isMenuOpen ? styles.menuLineOpen : ''}`} />
          </button>
        </div>

        {/* Mobile Nav */}
        <div className={`${styles.navMobile} ${isMenuOpen ? styles.navMobileOpen : ''}`}>
          <a href="#features" className={styles.navLinkMobile} onClick={() => setIsMenuOpen(false)}>Fonctionnalités</a>
          <a href="#jobs" className={styles.navLinkMobile} onClick={() => setIsMenuOpen(false)}>Carrières</a>
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

      {/* ═══ HERO ═══ */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.gradientOrb1} />
          <div className={styles.gradientOrb2} />
        </div>
        
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span>✨</span>
            <span>Plateforme RH #1 au Gabon</span>
          </div>
          
          <h1 className={styles.heroTitle}>
            <span className={styles.titleLine}>Gérez votre</span>
            <span className={styles.titleLineAccent}>Capital Humain</span>
            <span className={styles.titleLine}>sans effort</span>
          </h1>
          
          <p className={styles.heroSubtitle}>
            La plateforme SaaS tout-en-un qui simplifie la gestion RH. 
            Du recrutement à la paie, tout en un seul clic.
          </p>
          
          <div className={styles.heroCta}>
            <Link href={user ? "/dashboard" : "/register"} className={styles.btnHero}>
              {user ? 'Mon espace' : 'Démarrer gratuitement'}
              <span>→</span>
            </Link>
            <a href="#features" className={styles.btnGhostHero}>
              Découvrir la plateforme
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

      {/* ═══ FEATURES ═══ */}
      <section id="features" className={`${styles.features} reveal-up`} ref={addToRefs}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Fonctionnalités</span>
          <h2 className={styles.sectionTitle}>Tout ce dont votre entreprise a besoin</h2>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((feat, idx) => (
            <div 
              key={idx} 
              className={`${styles.featureCard} reveal-up ${styles[`delay-${idx + 1}`]}`} 
              ref={addToRefs}
            >
              <div className={styles.featureIconWrapper}>
                <feat.icon className={styles.featureIcon} />
              </div>
              <h3>{feat.title}</h3>
              <p>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ JOBS ═══ */}
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
            {jobs.slice(0, 6).map((job, idx) => (
              <div 
                key={job.id} 
                className={`${styles.jobCard} reveal-up ${styles[`delay-${(idx % 4) + 1}`]}`} 
                ref={addToRefs}
              >
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

      {/* ═══ CTA ═══ */}
      <section className={`${styles.ctaSection} reveal-up`} ref={addToRefs}>
        <div className={styles.ctaContent}>
          <h2>Prêt à transformer votre gestion RH ?</h2>
          <p>Rejoignez plus de 500 entreprises qui font confiance à Konggest pour leur transformation numérique au Gabon.</p>
          <Link href={user ? "/dashboard" : "/register"} className={styles.btnCta}>
            {user ? 'Mon espace' : 'Commencer gratuitement'}
            <HiOutlineArrowRight />
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
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
