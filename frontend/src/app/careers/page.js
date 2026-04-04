'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
        <h1>🎯 Offres d'Emploi</h1>
        <p>Rejoignez notre équipe ! Découvrez nos postes ouverts et postulez en ligne.</p>
      </header>

      {submitSuccess && (
        <div className={styles.success}>
          ✅ Votre candidature a été soumise avec succès ! Nous vous contacterons bientôt.
        </div>
      )}

      {showForm && selectedJob && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Postuler : {selectedJob.title}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.row}>
                <input
                  type="text"
                  placeholder="Prénom *"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Nom *"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                />
              </div>
              <input
                type="email"
                placeholder="Email *"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
              <input
                type="url"
                placeholder="Lien CV (URL)"
                value={formData.resume_url}
                onChange={(e) => setFormData({...formData, resume_url: e.target.value})}
              />
              <textarea
                placeholder="Lettre de motivation"
                rows={4}
                value={formData.cover_letter}
                onChange={(e) => setFormData({...formData, cover_letter: e.target.value})}
              />
              <div className={styles.formActions}>
                <button type="button" onClick={() => setShowForm(false)} className={styles.cancel}>
                  Annuler
                </button>
                <button type="submit" disabled={submitting} className={styles.submit}>
                  {submitting ? 'Envoi...' : 'Postuler'}
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
              ← Retour à l'accueil
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
                <span>📍 {job.location || 'Non spécifié'}</span>
                <span>🏢 {job.department || 'Non spécifié'}</span>
                {job.salary_range && <span>💰 {job.salary_range}</span>}
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
                  Clôture : {job.closes_at ? new Date(job.closes_at).toLocaleDateString('fr-FR') : 'Non définie'}
                </span>
                <button 
                  onClick={() => handleApply(job)} 
                  className={styles.applyBtn}
                >
                  Postuler
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <footer className={styles.footer}>
        <Link href="/login" className={styles.adminLink}>
          Espace Administrateur →
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
