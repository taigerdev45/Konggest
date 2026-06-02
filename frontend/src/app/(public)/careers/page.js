'use client';

import { useState, useEffect } from 'react';
import { HiOutlineBriefcase, HiOutlineLocationMarker, HiOutlineCash, HiOutlineUpload, HiOutlineX } from 'react-icons/hi';
import api from '@/lib/api';
import styles from './careers.module.css';

const CONTRACT_MAP = {
  cdi: 'CDI',
  cdd: 'CDD',
  stage: 'Stage',
  alternance: 'Alternance'
};

export default function CareersPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  
  // Application Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', text: '' });

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false }), 4000);
  };

  useEffect(() => {
    api.get('/public/jobs/')
      .then(res => {
        setJobs(Array.isArray(res) ? res : []);
      })
      .catch(err => {
        console.error(err);
        showToast('error', 'Erreur de chargement des offres.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      showToast('error', 'Le CV (fichier) est obligatoire.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('cover_letter', coverLetter);
      formData.append('resume', resumeFile);

      await api.post(`/public/jobs/${selectedJob.id}/apply/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      showToast('success', 'Votre candidature a été envoyée avec succès !');
      setSelectedJob(null);
      setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setCoverLetter(''); setResumeFile(null);
    } catch (err) {
      showToast('error', 'Erreur lors de la candidature.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.container} style={{ textAlign: 'center' }}>Chargement...</div>;

  return (
    <div className={styles.container}>
      {toast.show && (
        <div className={`toast fixed top-4 right-4 z-50 p-4 rounded shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.text}
        </div>
      )}

      <div className={styles.header}>
        <h1 className={styles.title}>Rejoignez l&apos;aventure</h1>
        <p className={styles.subtitle}>Découvrez nos offres d&apos;emploi et construisez le futur des RH avec nous.</p>
      </div>

      <div className={styles.grid}>
        {jobs.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Aucune offre disponible pour le moment. Revenez bientôt !</p>
          </div>
        ) : (
          jobs.map(job => (
            <div key={job.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.jobTitle}>{job.title}</h2>
                  <p className={styles.department}>{job.department}</p>
                </div>
                <span className={styles.contractBadge}>
                  {CONTRACT_MAP[job.contract_type] || job.contract_type}
                </span>
              </div>
              
              <div className={styles.metaList}>
                <span className={styles.metaItem}><HiOutlineLocationMarker /> {job.location || 'Remote'}</span>
                <span className={styles.metaItem}><HiOutlineCash /> {job.salary_range || 'À discuter'}</span>
                <span className={styles.metaItem}><HiOutlineBriefcase /> Publié le {new Date(job.published_at || job.created_at).toLocaleDateString()}</span>
              </div>
              
              <button onClick={() => setSelectedJob(job)} className={styles.applyBtn}>
                Postuler maintenant
              </button>
            </div>
          ))
        )}
      </div>

      {selectedJob && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button onClick={() => setSelectedJob(null)} className={styles.closeBtn}>
              <HiOutlineX size={20} />
            </button>
            
            <h2 style={{ fontSize: '1.75rem', fontWeight: 850, marginBottom: '0.5rem' }}>Candidater</h2>
            <p style={{ color: '#64748B', marginBottom: '2rem' }}>{selectedJob.title} — {selectedJob.location}</p>
            
            <form onSubmit={handleApply} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Prénom *</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nom *</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className={styles.input} />
                </div>
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email *</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Téléphone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={styles.input} />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>CV (PDF) *</label>
                <div className={styles.fileUpload}>
                  <input 
                    type="file" 
                    required 
                    onChange={e => setResumeFile(e.target.files[0])} 
                    accept=".pdf" 
                    style={{ display: 'none' }}
                    id="resume-input"
                  />
                  <label htmlFor="resume-input" style={{ cursor: 'pointer' }}>
                    {resumeFile ? resumeFile.name : 'Cliquez pour uploader votre CV'}
                  </label>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Lettre de motivation</label>
                <textarea rows="4" value={coverLetter} onChange={e => setCoverLetter(e.target.value)} className={styles.textarea} placeholder="Pourquoi vous ?"></textarea>
              </div>
              
              <button type="submit" disabled={submitting} className={styles.submitBtn}>
                {submitting ? 'Envoi...' : <><HiOutlineUpload /> Envoyer ma candidature</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
