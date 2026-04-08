'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  HiOutlineLocationMarker, 
  HiOutlineBriefcase, 
  HiOutlineCurrencyDollar, 
  HiOutlineCalendar, 
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineX,
  HiOutlinePaperAirplane,
  HiOutlineIdentification,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineLink,
  HiOutlineAnnotation
} from 'react-icons/hi';
import styles from './page.module.css';

function CareersContent() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org'); // Organization ID from URL
  
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Application form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    cover_letter: '',
    resume_url: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [orgId]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      // Public API - no auth required
      const url = orgId 
        ? `/api/recruitment/public/jobs/?org=${orgId}`
        : '/api/recruitment/public/jobs/';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erreur lors du chargement des offres');
      
      const data = await response.json();
      setJobs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (job) => {
    setSelectedJob(job);
    setShowForm(true);
    setSubmitSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/recruitment/public/jobs/${selectedJob.id}/apply/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la candidature');
      }

      setSubmitSuccess(true);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        cover_letter: '',
        resume_url: ''
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.loading}>Chargement...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.backHome}>
            <HiOutlineArrowLeft /> Retour à l'accueil
          </Link>
          <h1>Carrières chez Konggest</h1>
          <p>Rejoignez une équipe passionnée et aidez-nous à révolutionner la gestion des ressources humaines.</p>
        </div>
      </header>

      {submitSuccess && (
        <div className={styles.success}>
          <HiOutlineCheckCircle size={24} />
          <span>Votre candidature a été soumise avec succès ! Nous vous contacterons bientôt.</span>
        </div>
      )}

      {showForm && selectedJob && (
        <div className={styles.modal} onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className={styles.modalContent}>
            <button className={styles.closeBtn} onClick={() => setShowForm(false)}>
              <HiOutlineX />
            </button>
            <h2>Postuler : {selectedJob.title}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.row}>
                <div className={styles.inputWrapper}>
                  <HiOutlineIdentification className={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Prénom *"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  />
                </div>
                <div className={styles.inputWrapper}>
                  <HiOutlineIdentification className={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Nom *"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  />
                </div>
              </div>
              <div className={styles.inputWrapper}>
                <HiOutlineMail className={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="Email *"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className={styles.inputWrapper}>
                <HiOutlinePhone className={styles.inputIcon} />
                <input
                  type="tel"
                  placeholder="Téléphone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className={styles.inputWrapper}>
                <HiOutlineLink className={styles.inputIcon} />
                <input
                  type="url"
                  placeholder="Lien CV (Google Drive, Dropbox, etc.)"
                  value={formData.resume_url}
                  onChange={(e) => setFormData({...formData, resume_url: e.target.value})}
                />
              </div>
              <div className={styles.inputWrapper}>
                <HiOutlineAnnotation className={styles.inputIcon} style={{ top: '1.25rem' }} />
                <textarea
                  placeholder="Parlez-nous de vous..."
                  rows={4}
                  value={formData.cover_letter}
                  onChange={(e) => setFormData({...formData, cover_letter: e.target.value})}
                />
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setShowForm(false)} className={styles.cancel}>
                  Annuler
                </button>
                <button type="submit" disabled={submitting} className={styles.submit}>
                  {submitting ? 'Envoi...' : (
                    <>
                      Envoyer ma candidature <HiOutlinePaperAirplane style={{ transform: 'rotate(45deg)' }} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.jobsGrid}>
        {jobs.length === 0 ? (
          <div className={styles.noJobs}>
            <p>Aucune offre d'emploi disponible pour le moment.</p>
            <Link href="/" className={styles.backLink}>
              <HiOutlineArrowLeft /> Retour à l'accueil
            </Link>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className={styles.jobCard}>
              <div className={styles.jobHeader}>
                <h3>{job.title}</h3>
                <span className={styles.badge}>{job.contract_type}</span>
              </div>
              
              <div className={styles.jobMeta}>
                <span><HiOutlineLocationMarker /> {job.location || 'Remote'}</span>
                <span><HiOutlineBriefcase /> {job.department || 'RH'}</span>
                {job.salary_range && <span><HiOutlineCurrencyDollar /> {job.salary_range}</span>}
              </div>

              <p className={styles.description}>{job.description}</p>

              {job.requirements && (
                <div className={styles.requirements}>
                  <h4>Prérequis :</h4>
                  <p>{job.requirements}</p>
                </div>
              )}

              <div className={styles.jobFooter}>
                <span className={styles.date}>
                  <HiOutlineCalendar /> Clôture : {job.closes_at ? new Date(job.closes_at).toLocaleDateString('fr-FR') : 'Non définie'}
                </span>
                <button 
                  onClick={() => handleApply(job)} 
                  className={styles.applyBtn}
                >
                  Postuler maintenant
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <footer className={styles.footer}>
        <Link href="/login" className={styles.adminLink}>
          Espace Administrateur <HiOutlineArrowRight />
        </Link>
      </footer>
    </div>
  );
}

// Main export with Suspense boundary for useSearchParams
export default function CareersPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Chargement...</div>}>
      <CareersContent />
    </Suspense>
  );
}
