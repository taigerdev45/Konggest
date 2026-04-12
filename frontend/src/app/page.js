'use client';

/**
 * Konggest — Public Landing Page (Senior Elite Redesign)
 * High-end professional Corporate SaaS experience.
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
  HiOutlineCheckCircle
} from 'react-icons/hi';
import styles from './page.module.css';

export default function LandingPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  
  const revealRefs = useRef([]);
  revealRefs.current = [];

  const addToRefs = useCallback((el) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  }, []);

  useEffect(() => {
    fetchPublicJobs();
    fetchPublicPartners();

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.isVisible);
        }
      });
    }, { threshold: 0.1 });

    requestAnimationFrame(() => {
      revealRefs.current.forEach((ref) => {
        if (ref) observer.observe(ref);
      });
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

  const fetchPublicPartners = async () => {
    try {
      const response = await fetch('/api/accounts/public-partners/');
      if (response.ok) setPartners(await response.json());
    } catch (error) {
      console.error('Partners Error:', error);
    }
  };

  const benefits = [
    {
      icon: HiOutlineUsers,
      title: 'Gestion Centralisée du Capital Humain',
      desc: 'Dites adieu aux feuilles Excel éparpillées. Gérez tout le cycle de vie de vos employés, des contrats aux congés, dans un unique point de vérité sécurisé.',
      image: '/benefit-1.png' // Placeholder visual
    },
    {
      icon: HiOutlineClock,
      title: 'Automatisation de la Paie & Présences',
      desc: 'Réduisez les erreurs humaines de 95%. Notre moteur de paie intégré synchronise les heures travaillées, les primes et les absences pour des fiches de paie irréprochables.',
      image: '/benefit-2.png'
    },
    {
      icon: HiOutlineChartBar,
      title: 'Décisions Basées sur la Data',
      desc: 'Transformez vos données RH en avantages stratégiques. Nos tableaux de bord interactifs vous fournissent une visibilité complète sur le turnover, la productivité et les coûts salariaux.',
      image: '/benefit-3.png'
    }
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
            <a href="#features">Produit</a>
            <a href="#jobs">Carrières</a>
            <a href="#about">À propos</a>
            {user ? (
              <Link href="/dashboard" className={styles.btnHero} style={{ padding: '8px 20px', fontSize: '0.9rem' }}>Dashboard</Link>
            ) : (
              <Link href="/register" className={styles.btnHero} style={{ padding: '8px 20px', fontSize: '0.9rem' }}>Essai Gratuit</Link>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <header className={styles.hero}>
        <div className={styles.heroBadge}>
          <HiOutlineCheckCircle />
          <span>Élu meilleure plateforme RH 2024 au Gabon</span>
        </div>
        
        <h1 className={styles.heroTitle}>
          Optimisez votre gestion RH avec la plateforme <span className={styles.titleLineAccent}>tout-en-un</span> conçue pour la croissance.
        </h1>
        
        <p className={styles.heroSubtitle}>
          Konggest simplifie chaque aspect de vos ressources humaines. Du recrutement à la paie, 
          donnez à votre équipe les outils qu'elle mérite.
        </p>
        
        <div className={styles.heroCta}>
          <Link href="/register" className={styles.btnHero}>
            Démarrer un essai gratuit
          </Link>
          <a href="#features" className={styles.btnGhostHero}>
            Voir la démo
          </a>
        </div>

        <div className={`${styles.productMockup} reveal-up`} ref={addToRefs}>
          <img src="/dashboard-mockup.png" alt="Konggest Dashboard Overview" />
        </div>
      </header>

      {/* ═══ TRUST BAR ═══ */}
      <section className={styles.trustSection}>
        <p className={styles.trustTitle}>Ils nous font confiance pour leur gestion quotidienne</p>
        <div className={styles.trustLogos}>
          {partners.length > 0 ? (
            partners.map((partner, idx) => (
              <span key={idx} className={styles.partnerName}>
                {partner.name?.toUpperCase()}
              </span>
            ))
          ) : (
            <>
              <span>COMILOG</span>
              <span>SETRAG</span>
              <span>BGFIBank</span>
              <span>TotalEnergies</span>
              <span>ERAMET</span>
            </>
          )}
        </div>
      </section>

      {/* ═══ FEATURES / BENEFITS ═══ */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Pourquoi Konggest ?</span>
          <h2 className={styles.sectionTitle}>Une plateforme robuste pour vos ambitions</h2>
        </div>

        <div className={styles.benefitsContainer}>
          {benefits.map((benefit, idx) => (
            <div key={idx} className={`${styles.benefitRow} reveal-up`} ref={addToRefs}>
              <div className={styles.benefitContent}>
                <div className={styles.featureIconWrapper}>
                  <benefit.icon />
                </div>
                <h3>{benefit.title}</h3>
                <p>{benefit.desc}</p>
              </div>
              <div className={styles.benefitVisual}>
                {/* Visual placeholder for features */}
                <benefit.icon style={{ fontSize: '5rem', opacity: 0.2 }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ JOBS SECTION ═══ */}
      <section id="jobs" className={styles.jobsSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge} style={{ color: '#60A5FA' }}>Carrières</span>
          <h2 className={styles.sectionTitle}>Rejoignez l&apos;aventure Konggest</h2>
        </div>

        <div className={styles.jobsGrid}>
          {loading ? (
            <div className={styles.loading}>Chargement des opportunités...</div>
          ) : jobs.length === 0 ? (
            <div className={styles.noJobs}>Aucun poste ouvert pour le moment.</div>
          ) : (
            jobs.slice(0, 3).map((job) => (
              <div key={job.id} className={`${styles.jobCard} reveal-up`} ref={addToRefs}>
                <div className={styles.jobHeader}>
                  <span className={styles.contractBadge}>{job.contract_type}</span>
                  <h3>{job.title}</h3>
                </div>
                <div className={styles.jobMeta}>
                  <span><HiOutlineLocationMarker /> {job.location}</span>
                  <span><HiOutlineBriefcase /> {job.department}</span>
                </div>
                <Link href="/careers" className={styles.applyLink}>
                  En savoir plus <HiOutlineArrowRight />
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2>Prêt à passer à la vitesse supérieure ?</h2>
          <p>Rejoignez les leaders du marché et transformez votre département RH en centre de profit.</p>
          <Link href="/register" className={styles.btnCta}>
            Essayer Konggest Gratuitement
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <span className={styles.logoText}>Konggest</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Konggest. Développé pour les entreprises gabonaises.</p>
        </div>
      </footer>
    </div>
  );
}
