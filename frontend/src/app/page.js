'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HiOutlineUsers, HiOutlineCalendar, HiOutlineCurrencyDollar,
  HiOutlineChartBar, HiOutlineShieldCheck, HiOutlineClock,
  HiOutlineMenu, HiOutlineX, HiOutlineQrcode, HiOutlineDocumentText,
  HiOutlineBriefcase, HiOutlineAcademicCap, HiOutlineLocationMarker,
  HiOutlineCheck, HiOutlineCheckCircle, HiOutlineXCircle,
} from 'react-icons/hi';
import styles from './page.module.css';

const QR_CELLS = [
  1,0,1,1,0,0,1,0,1,0,
  0,1,0,0,1,1,0,1,0,1,
  1,1,0,1,0,0,1,1,0,0,
  0,0,1,0,1,1,0,0,1,1,
  1,0,0,1,1,0,1,0,0,1,
];

const MODULES = [
  { icon: <HiOutlineUsers />, label: 'Employés' },
  { icon: <HiOutlineQrcode />, label: 'Pointage QR' },
  { icon: <HiOutlineCalendar />, label: 'Congés' },
  { icon: <HiOutlineCurrencyDollar />, label: 'Dépenses' },
  { icon: <HiOutlineBriefcase />, label: 'Recrutement' },
  { icon: <HiOutlineClock />, label: 'Planning' },
  { icon: <HiOutlineAcademicCap />, label: 'Performance' },
  { icon: <HiOutlineDocumentText />, label: 'Paie' },
  { icon: <HiOutlineChartBar />, label: 'Analytics' },
  { icon: <HiOutlineDocumentText />, label: 'Documents' },
  { icon: <HiOutlineShieldCheck />, label: 'Admin SaaS' },
];

const PROBLEMS = [
  "Listes d'employés sur Excel non sécurisé",
  "Demandes de congés sur WhatsApp et SMS",
  "Bulletins de paie calculés à la main",
  "Pointage sur cahier ou appels téléphoniques",
  "Recrutement sans pipeline structuré",
];

const PLANS = [
  {
    name: 'Starter', price: '3 500', min: '30 000', hot: false,
    features: ["Gestion des employés","Congés & absences","Pointage QR","Dépenses adaptatives","Libre-service employé","KPI de base"],
  },
  {
    name: 'Pro', price: '7 500', min: '65 000', hot: true,
    features: ["Tout Starter +","Recrutement public","Planning RH","Performance & objectifs","Analytics avancés","Automatisations RH"],
  },
  {
    name: 'Premium', price: '11 000', min: '130 000', hot: false,
    features: ["Tout Pro +","Paie complète & DSN","RBAC avancé","API publique","Multi-agences","Support dédié"],
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState({ orgs: 0, modules: 0 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);

    let frame = 0;
    const total = 50;
    const id = setInterval(() => {
      frame++;
      const e = 1 - Math.pow(1 - frame / total, 3);
      setCounts({ orgs: Math.round(50 * e), modules: Math.round(11 * e) });
      if (frame >= total) clearInterval(id);
    }, 40);

    const obs = new IntersectionObserver(
      (entries) => entries.forEach(en => { if (en.isIntersecting) en.target.classList.add(styles.visible); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(`.${styles.reveal}`).forEach(el => obs.observe(el));

    return () => { window.removeEventListener('scroll', onScroll); clearInterval(id); obs.disconnect(); };
  }, []);

  return (
    <div className={styles.page}>

      {/* NAV */}
      <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            <img src="/logo.png" alt="Konggest" />
            <span>Konggest</span>
          </Link>
          <div className={styles.navLinks}>
            <a href="#modules">Modules</a>
            <a href="#tarifs">Tarifs</a>
            <Link href="/careers">Carrières</Link>
            <Link href="/login" className={styles.navLogin}>Connexion</Link>
            <Link href="/register" className={styles.navCta}>Démarrer →</Link>
          </div>
          <button className={styles.burger} onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <HiOutlineX /> : <HiOutlineMenu />}
          </button>
        </div>
        {mobileOpen && (
          <div className={styles.mobileMenu}>
            <a href="#modules" onClick={() => setMobileOpen(false)}>Modules</a>
            <a href="#tarifs" onClick={() => setMobileOpen(false)}>Tarifs</a>
            <Link href="/careers">Carrières</Link>
            <Link href="/login">Connexion</Link>
            <Link href="/register" className={styles.navCta}>Démarrer →</Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <span className={styles.eyebrow}>
              <HiOutlineShieldCheck /> RH &amp; Paie · PME Afrique francophone
            </span>
            <h1 className={styles.h1}>
              Centralisez vos RH.<br />
              Restez conformes.<br />
              <span className={styles.h1Gold}>Avancez vite.</span>
            </h1>
            <p className={styles.heroDesc}>
              Pointage QR en 100&nbsp;ms, paie conforme CNSS/Gabon, gestion des congés automatisée,
              analytics temps réel — tout centralisé dans une seule plateforme conçue pour
              les PME d'Afrique francophone.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/register" className={styles.btnGold}>Essai gratuit · 14 jours</Link>
              <a href="#modules" className={styles.btnGhost}>Voir les modules</a>
            </div>
            <p className={styles.heroFine}>
              Aucune carte bancaire requise · Données hébergées en Europe · Support francophone
            </p>
          </div>

          <div className={styles.heroRight}>
            {/* Card 1 — Attendance */}
            <div className={`${styles.uiCard} ${styles.cardAtt}`}>
              <div className={styles.cardHead}>
                <HiOutlineQrcode /> Pointage du jour
                <span className={styles.live}><span />LIVE</span>
              </div>
              <div className={styles.attList}>
                {[
                  { name: 'Koumba Assoumou', time: '07:58', ok: true },
                  { name: 'Pierre Moussavou', time: '08:14', ok: true },
                  { name: 'Adrienne Ndong',   time: '09:31', ok: false },
                ].map((r, i) => (
                  <div key={i} className={styles.attRow}>
                    <span className={styles.attDot} data-ok={r.ok ? '1' : '0'} />
                    <span className={styles.attName}>{r.name}</span>
                    <span className={styles.attTime}>{r.time}</span>
                  </div>
                ))}
              </div>
              <div className={styles.cardFoot}>32 pointages · 3 retards</div>
            </div>

            {/* Card 2 — Payslip */}
            <div className={`${styles.uiCard} ${styles.cardPay}`}>
              <div className={styles.cardHead}><HiOutlineCurrencyDollar /> Bulletin Juin 2026</div>
              <table className={styles.payTable}>
                <tbody>
                  <tr><td>Salaire brut</td><td>650 000</td></tr>
                  <tr className={styles.deductRow}><td>CNSS (5%)</td><td>−32 500</td></tr>
                  <tr className={styles.deductRow}><td>TCS</td><td>−25 000</td></tr>
                  <tr className={styles.netRow}><td><strong>Net</strong></td><td><strong>558 750 FCFA</strong></td></tr>
                </tbody>
              </table>
            </div>

            {/* Card 3 — Leave approval */}
            <div className={`${styles.uiCard} ${styles.cardLeave}`}>
              <div className={styles.cardHead}><HiOutlineCalendar /> Demande de congé</div>
              <div className={styles.leaveReq}>
                <span className={styles.leaveName}>Régis Obame</span>
                <span className={styles.leavePeriod}>12 – 21 juillet · 8 jours</span>
              </div>
              <div className={styles.approvalBtns}>
                <button className={styles.approveBtn}><HiOutlineCheckCircle /> Approuver</button>
                <button className={styles.rejectBtn}><HiOutlineXCircle /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className={styles.statsBar}>
        <div className={styles.stat}><strong>{counts.orgs}+</strong><span>entreprises au Gabon</span></div>
        <div className={styles.statSep} />
        <div className={styles.stat}><strong>{counts.modules}</strong><span>modules RH</span></div>
        <div className={styles.statSep} />
        <div className={styles.stat}><strong>&lt; 100ms</strong><span>latence pointage QR</span></div>
        <div className={styles.statSep} />
        <div className={styles.stat}><strong>CNSS 2026</strong><span>conformité gabonaise</span></div>
      </div>

      {/* PROBLEM */}
      <section className={styles.problem}>
        <div className={styles.problemInner}>
          <div className={`${styles.probLeft} ${styles.reveal}`}>
            <span className={styles.eyebrowDark}>Le problème</span>
            <h2 className={styles.h2}>Vos outils RH vous coûtent plus qu'ils ne vous rapportent.</h2>
            <p className={styles.body}>
              La majorité des PME africaines gèrent encore leurs RH avec des outils non prévus pour ça.
              Résultat : erreurs de paie, données perdues, décisions sans visibilité.
            </p>
          </div>
          <div className={`${styles.probRight} ${styles.reveal}`}>
            {PROBLEMS.map((p, i) => (
              <div key={i} className={styles.probItem}>
                <HiOutlineXCircle className={styles.xIcon} /><span>{p}</span>
              </div>
            ))}
            <div className={styles.solutionItem}>
              <HiOutlineCheckCircle className={styles.checkIcon} />
              <strong>Konggest centralise tout — une seule application.</strong>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className={styles.modules}>
        <div className={styles.secHead}>
          <span className={styles.eyebrow}>Suite complète</span>
          <h2 className={styles.h2Light}>11 modules. Tout le cycle employé.</h2>
        </div>
        <div className={styles.moduleGrid}>
          {MODULES.map((m, i) => (
            <div key={i} className={`${styles.moduleItem} ${styles.reveal}`}>
              <span className={styles.moduleIco}>{m.icon}</span>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SPOTLIGHT — QR */}
      <section className={styles.spot}>
        <div className={`${styles.spotRow} ${styles.reveal}`}>
          <div className={styles.spotText}>
            <span className={styles.eyebrowDark}>Module Pointage</span>
            <h3 className={styles.h3}>Scan → pointage en moins de 100&nbsp;ms.</h3>
            <p className={styles.body}>
              L'employé scanne un QR code depuis son smartphone. Le pointage est enregistré,
              vérifié (token HMAC anti-fraude) et visible en temps réel sur le dashboard RH.
            </p>
            <ul className={styles.checkList}>
              <li><HiOutlineCheck />Token QR cryptographique — infalsifiable</li>
              <li><HiOutlineCheck />Détection anomalies automatique</li>
              <li><HiOutlineCheck />Fonctionne hors connexion (PWA)</li>
            </ul>
          </div>
          <div className={styles.spotVis}>
            <div className={styles.qrBox}>
              <div className={styles.qrGrid}>
                {QR_CELLS.map((on, i) => (
                  <div key={i} className={styles.qrCell} data-on={on ? '1' : '0'} />
                ))}
              </div>
              <div className={styles.qrScan} />
              <div className={styles.qrLabel}>✓ Pointé · 08:02</div>
            </div>
          </div>
        </div>
      </section>

      {/* SPOTLIGHT — Paie */}
      <section className={styles.spotAlt}>
        <div className={`${styles.spotRow} ${styles.spotReverse} ${styles.reveal}`}>
          <div className={styles.spotText}>
            <span className={styles.eyebrowDark}>Module Paie Premium</span>
            <h3 className={styles.h3}>CNSS, TCS, IRPP — calculés automatiquement.</h3>
            <p className={styles.body}>
              Moteur 100% conforme au Code du Travail gabonais 2026. Cotisations CNSS (5%/18%),
              CNAMGS, TCS, barème IRPP progressif avec quotient familial. Export DSN en un clic.
            </p>
            <ul className={styles.checkList}>
              <li><HiOutlineCheck />Distinction nationaux / expatriés</li>
              <li><HiOutlineCheck />Génération PDF async — zéro timeout</li>
              <li><HiOutlineCheck />Historique paie par période</li>
            </ul>
          </div>
          <div className={styles.spotVis}>
            <div className={styles.payBox}>
              <div className={styles.payTitle}>Bulletin · Mai 2026</div>
              <div className={styles.payRow}><span>Salaire de base</span><span>650 000</span></div>
              <div className={styles.payRow}><span>Primes</span><span>+ 50 000</span></div>
              <hr className={styles.paySep} />
              <div className={`${styles.payRow} ${styles.payRed}`}><span>CNSS (5%)</span><span>−32 500</span></div>
              <div className={`${styles.payRow} ${styles.payRed}`}><span>TCS</span><span>−25 000</span></div>
              <div className={`${styles.payRow} ${styles.payRed}`}><span>IRPP</span><span>−28 250</span></div>
              <hr className={styles.paySep} />
              <div className={`${styles.payRow} ${styles.payNet}`}><span>Net à payer</span><span>614 250 FCFA</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* SPOTLIGHT — Analytics */}
      <section className={styles.spot}>
        <div className={`${styles.spotRow} ${styles.reveal}`}>
          <div className={styles.spotText}>
            <span className={styles.eyebrowDark}>Module Analytics</span>
            <h3 className={styles.h3}>Des KPIs réels. Aucune valeur inventée.</h3>
            <p className={styles.body}>
              Taux de présence, turnover, masse salariale, ratio expatriés — calculés sur vos
              données réelles, mis à jour via WebSocket. Zéro valeur codée en dur.
            </p>
            <ul className={styles.checkList}>
              <li><HiOutlineCheck />Realtime via Supabase WebSocket</li>
              <li><HiOutlineCheck />Export PDF + CSV automatisé</li>
              <li><HiOutlineCheck />KPIs spécifiques Gabon (turnover, expatriés)</li>
            </ul>
          </div>
          <div className={styles.spotVis}>
            <div className={styles.analyticsBox}>
              <div className={styles.kpiRow}>
                {[['87%','Présence'],['4.2%','Turnover'],['24j','Congés moy.'],['12%','Expatriés']].map(([v,l],i) => (
                  <div key={i} className={styles.kpi}>
                    <span className={styles.kpiN}>{v}</span>
                    <span className={styles.kpiL}>{l}</span>
                  </div>
                ))}
              </div>
              <div className={styles.bars}>
                {[65,80,55,90,70,85,75].map((h, i) => (
                  <div key={i} className={styles.barWrap}>
                    <div className={styles.bar} style={{ height: `${h}%` }} />
                    <span>{['L','M','M','J','V','S','D'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="tarifs" className={styles.pricing}>
        <div className={styles.secHead}>
          <span className={styles.eyebrow}>Tarification</span>
          <h2 className={styles.h2Light}>Simple. Prévisible. En FCFA.</h2>
          <p className={styles.pricingSub}>Par employé / mois · Annulation à tout moment</p>
        </div>
        <div className={styles.pricingRow}>
          {PLANS.map((plan, i) => (
            <div key={i} className={`${styles.planCard} ${plan.hot ? styles.planHot : ''} ${styles.reveal}`}>
              {plan.hot && <div className={styles.planBadge}>Recommandé</div>}
              <div className={styles.planName}>{plan.name}</div>
              <div className={styles.planPrice}>{plan.price} <span>FCFA</span><small>/employé/mois</small></div>
              <div className={styles.planMin}>min. {plan.min} FCFA/mois</div>
              <ul className={styles.planFeats}>
                {plan.features.map((f, j) => <li key={j}><HiOutlineCheck />{f}</li>)}
              </ul>
              <Link
                href={`/register?plan=${plan.name.toLowerCase()}`}
                className={plan.hot ? styles.planBtnHot : styles.planBtn}
              >
                Commencer
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSec}>
        <div className={`${styles.ctaInner} ${styles.reveal}`}>
          <h2>Votre équipe mérite mieux qu'Excel.</h2>
          <p>14 jours d'essai gratuit. Sans carte bancaire. Support francophone inclus.</p>
          <Link href="/register" className={styles.btnGold}>Créer mon espace gratuitement</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <img src="/logo.png" alt="Konggest" />
            <p>La plateforme RH &amp; Paie<br />des PME africaines francophones.</p>
            <span className={styles.footerGeo}>Gabon · Cameroun · Côte d'Ivoire</span>
          </div>
          <div className={styles.footerCol}>
            <h4>Produit</h4>
            <ul>
              <li><a href="#modules">Modules</a></li>
              <li><a href="#tarifs">Tarifs</a></li>
              <li><a href="#">Sécurité</a></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4>Compagnie</h4>
            <ul>
              <li><Link href="/careers">Carrières</Link></li>
              <li><a href="#">À propos</a></li>
              <li><a href="#">Contact</a></li>
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
        <div className={styles.footerBot}>
          <span>© 2026 Konggest</span>
          <span>Hébergé en Europe · Données sécurisées</span>
        </div>
      </footer>
    </div>
  );
}
