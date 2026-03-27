'use client';

import { useState, useEffect } from 'react';
import { HiOutlineBriefcase, HiOutlinePlus, HiOutlineRefresh, HiOutlineUsers, HiOutlineCalendar } from 'react-icons/hi';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function RecruitmentPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    contract_type: 'cdi',
    description: '',
    requirements: '',
    salary_range: '',
    status: 'published',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsData, appsData, interviewsData] = await Promise.all([
        api.get('/recruitment/jobs/'),
        api.get('/recruitment/applications/'),
        api.get('/recruitment/interviews/'),
      ]);
      setJobs(jobsData);
      setApplications(appsData);
      setInterviews(interviewsData);
    } catch (err) {
      console.error('Error fetching recruitment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/recruitment/jobs/', formData);
      setShowModal(false);
      setFormData({
        title: '', department: '', location: '', contract_type: 'cdi',
        description: '', requirements: '', salary_range: '', status: 'published'
      });
      fetchData();
    } catch (err) {
      console.error('Error creating job:', err);
      alert('Erreur lors de la création de l\'offre.');
    } finally {
      setSubmitting(false);
    }
  };

  const STATUS_MAP = {
    published: { label: 'Publié', cls: 'badge-success' },
    draft: { label: 'Brouillon', cls: 'badge-neutral' },
    closed: { label: 'Clôturé', cls: 'badge-danger' },
  };

  const isHR = user?.profile?.role === 'hr' || user?.profile?.role === 'admin';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Recrutement</h1>
          <p>Offres d&apos;emploi, candidatures et pipeline</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={fetchData} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          {isHR && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <HiOutlinePlus /> Nouvelle offre
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card purple">
          <div className="stat-icon purple"><HiOutlineBriefcase /></div>
          <div className="stat-info">
            <h3>{jobs.filter(j => j.status === 'published').length}</h3>
            <p>Postes ouverts</p>
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon cyan"><HiOutlineUsers /></div>
          <div className="stat-info">
            <h3>{applications.length}</h3>
            <p>Candidatures</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><HiOutlineCalendar /></div>
          <div className="stat-info">
            <h3>{interviews.length}</h3>
            <p>Entretiens planifiés</p>
          </div>
        </div>
      </div>

      <div className="table-container animate-in">
        <table>
          <thead>
            <tr>
              <th>Poste</th>
              <th>Département</th>
              <th>Type</th>
              <th>Candidatures</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan="6"><div className="skeleton" style={{ height: 20 }} /></td>
                </tr>
              ))
            ) : jobs.length > 0 ? (
              jobs.map(j => (
                <tr key={j.id}>
                  <td style={{ fontWeight: 500 }}>{j.title}</td>
                  <td>{j.department || 'N/A'}</td>
                  <td><span className="badge badge-primary">{j.contract_type.toUpperCase()}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-neutral" style={{ minWidth: 24 }}>{j.application_count}</span>
                  </td>
                  <td><span className={`badge ${STATUS_MAP[j.status]?.cls || 'badge-neutral'}`}>{STATUS_MAP[j.status]?.label || j.status}</span></td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(j.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune offre d&apos;emploi trouvée.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Job Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Nouvelle offre d&apos;emploi</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="grid grid-2 gap-md">
                <div className="form-group">
                  <label>Titre de l&apos;offre *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleInputChange} required placeholder="Ex: Développeur Full-Stack" />
                </div>
                <div className="form-group">
                  <label>Département</label>
                  <input type="text" name="department" value={formData.department} onChange={handleInputChange} placeholder="Ex: Technologie" />
                </div>
                <div className="form-group">
                  <label>Lieu</label>
                  <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="Ex: Paris, Télétravail" />
                </div>
                <div className="form-group">
                  <label>Type de contrat</label>
                  <select name="contract_type" value={formData.contract_type} onChange={handleInputChange}>
                    <option value="cdi">CDI</option>
                    <option value="cdd">CDD</option>
                    <option value="stage">Stage</option>
                    <option value="alternance">Alternance</option>
                  </select>
                </div>
              </div>
              <div className="form-group mt-md">
                <label>Description *</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" required></textarea>
              </div>
              <div className="form-group mt-md">
                <label>Exigences</label>
                <textarea name="requirements" value={formData.requirements} onChange={handleInputChange} rows="3"></textarea>
              </div>
              <div className="modal-footer mt-lg">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Publication...' : 'Publier l\'offre'}
                </button>
              </div>
            </form>
          </div>
          <style jsx>{`
            .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
            .modal-content { width: 90%; padding: 24px; max-height: 90vh; overflow-y: auto; }
            .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .btn-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-muted); }
            .form-group label { display: block; margin-bottom: 6px; font-size: 0.9rem; font-weight: 500; }
          `}</style>
        </div>
      )}
    </div>
  );
}
