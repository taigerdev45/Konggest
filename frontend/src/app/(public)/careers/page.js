'use client';

import { useState, useEffect } from 'react';
import { HiOutlineBriefcase, HiOutlineLocationMarker, HiOutlineCash, HiOutlineUpload, HiOutlineX } from 'react-icons/hi';
import api from '@/lib/api';

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
        setJobs(res.results || res || []);
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
      // Reset
      setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setCoverLetter(''); setResumeFile(null);
    } catch (err) {
      showToast('error', 'Erreur lors de la candidature.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Chargement des offres...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 animate-in">
      {toast.show && (
        <div className={`toast toast-${toast.type} fixed top-4 right-4 z-50 p-4 rounded shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.text}
        </div>
      )}

      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4">Rejoignez-nous</h1>
        <p className="text-lg text-gray-600">Découvrez nos offres d'emploi et construisez votre carrière parmi nous.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {jobs.length === 0 ? (
          <div className="col-span-2 text-center text-gray-500 p-10 bg-gray-50 rounded-lg border">
            Aucune offre disponible pour le moment. Revenez plus tard !
          </div>
        ) : (
          jobs.map(job => (
            <div key={job.id} className="card p-6 border rounded-xl hover:shadow-lg transition bg-white flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
                  <p className="text-gray-500 text-sm mt-1">{job.department}</p>
                </div>
                <span className="badge badge-primary bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                  {CONTRACT_MAP[job.contract_type]}
                </span>
              </div>
              
              <div className="flex flex-col gap-2 text-sm text-gray-600 mb-6">
                <span className="flex items-center gap-2"><HiOutlineLocationMarker /> {job.location || 'Non spécifié'}</span>
                <span className="flex items-center gap-2"><HiOutlineCash /> {job.salary_range || 'À négocier'}</span>
                <span className="flex items-center gap-2"><HiOutlineBriefcase /> Publié le : {new Date(job.published_at).toLocaleDateString()}</span>
              </div>
              
              <div className="mt-auto pt-4 border-t">
                <button 
                  onClick={() => setSelectedJob(job)}
                  className="w-full btn btn-primary py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  Postuler
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-8 relative my-8">
            <button 
              onClick={() => setSelectedJob(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <HiOutlineX size={24} />
            </button>
            
            <h2 className="text-2xl font-bold mb-2">Candidater pour : {selectedJob.title}</h2>
            <p className="text-gray-500 mb-6 border-b pb-4">{selectedJob.department} - {selectedJob.location}</p>
            
            <form onSubmit={handleApply} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Prénom *</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border rounded p-2" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border rounded p-2" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">CV (PDF ou Image) *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition">
                  <input 
                    type="file" 
                    required 
                    onChange={e => setResumeFile(e.target.files[0])} 
                    accept=".pdf,image/*" 
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-400 mt-2">Maximum 5 Mo.</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Lettre de motivation</label>
                <textarea rows="4" value={coverLetter} onChange={e => setCoverLetter(e.target.value)} className="w-full border rounded p-2" placeholder="Exprimez votre motivation ici..."></textarea>
              </div>
              
              <div className="flex justify-end pt-4">
                <button type="submit" disabled={submitting} className="btn bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                  {submitting ? 'Envoi en cours...' : <><HiOutlineUpload /> Valider ma candidature</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
