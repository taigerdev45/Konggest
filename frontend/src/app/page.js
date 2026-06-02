'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  HiOutlineUsers, HiOutlineCalendar, HiOutlineCurrencyDollar, 
  HiOutlineChartBar, HiOutlineShieldCheck, HiOutlineClock,
  HiOutlineMenu, HiOutlineX, HiOutlineArrowRight
} from 'react-icons/hi';
import api from '@/lib/api';
import styles from './page.module.css';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    
    // Fetch public jobs
    api.get('/public/jobs/').then(res => {
      setJobs(Array.isArray(res) ? res.slice(0, 3) : []);
    }).catch(() => {});

    // Scroll reveal logic
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.isVisible);
        }
      });
    }, observerOptions);

    document.querySelectorAll(`.${styles['reveal-up']}`).forEach(el => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

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
            <a href="#features">Solutions</a>
            <a href="#careers">Carrières</a>
            <a href="#contact">Contact</a>
            <Link href="/login" className={styles.btnGhostHero} style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}>
              Connexion
            </Link>
            <Link href="/register" className={styles.btnHero} style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}>
              Essai Gratuit
            </Link>
          </div>

          <button className={styles.mobileToggle} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <HiOutlineX /> : <HiOutlineMenu />}
          </button>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className={styles.hero}>
        <div className={`${styles.heroContent} ${styles['reveal-up']}`}>
          <div className={styles.heroBadge}>
            <HiOutlineShieldCheck /> Logiciel RH certifié & sécurisé
          </div>
          <h1 className={styles.heroTitle}>
            Pilotez votre <span className={styles.titleLineAccent}>Capital Humain</span> avec excellence
          </h1>
          <p className={styles.heroSubtitle}>
            La plateforme tout-en-un pour automatiser votre gestion RH, engager vos talents et booster la productivité de votre entreprise.
          </p>
          <div className={styles.heroCta}>
            <Link href="/register" className={styles.btnHero}>Démarrer maintenant</Link>
            <Link href="#features" className={styles.btnGhostHero}>Découvrir les solutions</Link>
          </div>
        </div>

        <div className={`${styles.productMockup} ${styles['reveal-up']}`} style={{ transitionDelay: '0.2s' }}>
          <img src="/dashboard-preview.png" alt="Konggest Interface Preview" />
        </div>
      </section>

      {/* ═══ TRUST SECTION (Premium & Anonymous) ═══ */}
      <section className={styles.trustSection}>
        <p className={styles.trustTitle}>Ils nous font confiance pour leur gestion quotidienne</p>
        <div className={styles.trustLogos}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={styles.trustLogoPlaceholder}>
              <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="10" width="20" height="20" rx="4" fill="#E2E8F0" />
                <rect x="40" y="15" width="60" height="10" rx="2" fill="#F1F5F9" />
              </svg>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES / BENEFITS ═══ */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Innovation RH</span>
          <h2 className={styles.sectionTitle}>Une suite complète pour chaque étape du cycle employé</h2>
        </div>

        <div className={styles.benefitsContainer}>
          <div className={`${styles.benefitRow} ${styles['reveal-up']}`}>
            <div className={styles.benefitContent}>
              <div className={styles.featureIconWrapper}><HiOutlineUsers /></div>
              <h3>Gestion du Personnel</h3>
              <p>Centralisez tous les dossiers employés, contrats et documents administratifs dans un espace sécurisé et conforme.</p>
            </div>
            <div className={styles.benefitVisual}>
              <HiOutlineUsers size={120} />
            </div>
          </div>

          <div className={`${styles.benefitRow} ${styles['reveal-up']}`}>
            <div className={styles.benefitContent}>
              <div className={styles.featureIconWrapper}><HiOutlineCalendar /></div>
              <h3>Absences & Congés</h3>
              <p>Simplifiez les demandes de congés avec des workflows de validation automatisés et des compteurs mis à jour en temps réel.</p>
            </div>
            <div className={styles.benefitVisual}>
              <HiOutlineCalendar size={120} />
            </div>
          </div>

          <div className={`${styles.benefitRow} ${styles['reveal-up']}`}>
            <div className={styles.benefitContent}>
              <div className={styles.featureIconWrapper}><HiOutlineCurrencyDollar /></div>
              <h3>Paie Automatisée</h3>
              <p>Générez vos fiches de paie en quelques clics, calculez les cotisations et assurez une conformité totale avec la législation.</p>
            </div>
            <div className={styles.benefitVisual}>
              <HiOutlineCurrencyDollar size={120} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CAREERS SECTION ═══ */}
      <section id="careers" className={styles.jobsSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge} style={{ color: '#60A5FA' }}>Carrières</span>
          <h2 className={styles.sectionTitle}>Rejoignez l&apos;aventure Konggest</h2>
        </div>

        <div className={styles.jobsGrid}>
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} className={styles.jobCard}>
                <div className={styles.jobHeader}>
                  <span className={styles.contractBadge}>{job.contract_type}</span>
                  <h3>{job.title}</h3>
                </div>
                <div className={styles.jobMeta}>
                  <span><HiOutlineClock /> {job.location}</span>
                </div>
                <Link href={`/careers`} className={styles.applyLink}>
                  En savoir plus <HiOutlineArrowRight />
                </Link>
              </div>
            ))
          ) : (
            <div className={styles.jobCard} style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
              <p style={{ color: '#94A3B8' }}>Consultez nos opportunités actuelles sur notre portail dédié.</p>
              <Link href="/careers" className={styles.btnHero} style={{ marginTop: '2rem', display: 'inline-block' }}>
                Voir les offres
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className={styles.ctaSection}>
        <div className={`${styles.ctaContent} ${styles['reveal-up']}`}>
          <h2>Prêt à moderniser vos RH ?</h2>
          <p style={{ fontSize: '1.25rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto' }}>
            Rejoignez des centaines d&apos;entreprises qui font confiance à Konggest pour gérer leur capital humain.
          </p>
          <Link href="/register" className={styles.btnCta}>Commencer l&apos;essai gratuit</Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <h2>Konggest</h2>
            <p>La plateforme RH nouvelle génération pour les entreprises ambitieuses.</p>
          </div>
          <div className={styles.footerCol}>
            <h4>Produit</h4>
            <ul>
              <li><a href="#">Fonctionnalités</a></li>
              <li><a href="#">Tarifs</a></li>
              <li><a href="#">Sécurité</a></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4>Compagnie</h4>
            <ul>
              <li><a href="/careers">Carrières</a></li>
              <li><a href="#">À propos</a></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4>Légal</h4>
            <ul>
              <li><a href="#">Confidentialité</a></li>
              <li><a href="#">CGU</a></li>
              <li><a href="#">Mentions légales</a></li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2026 Konggest. Tous droits réservés.</p>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <a href="#">LinkedIn</a>
            <a href="#">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
