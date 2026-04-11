'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import api from '@/lib/api';
import { HiOutlineUserAdd, HiOutlineCheckCircle, HiOutlineClock, HiOutlineDocumentDownload, HiOutlineXCircle } from 'react-icons/hi';

const STAGES = [
  { id: 'new', label: 'Nouveau', color: 'bg-blue-100 border-blue-300 text-blue-800' },
  { id: 'screening', label: 'Présélection', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
  { id: 'interview', label: 'Entretien', color: 'bg-orange-100 border-orange-300 text-orange-800' },
  { id: 'offer', label: 'Offre', color: 'bg-purple-100 border-purple-300 text-purple-800' },
  { id: 'hired', label: 'Embauché', color: 'bg-green-100 border-green-300 text-green-800' },
  { id: 'rejected', label: 'Refusé', color: 'bg-red-100 border-red-300 text-red-800' },
];

export default function RecruitmentDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, text: '' });

  const fetchApplications = async () => {
    try {
      const res = await api.get('/recruitment/applications/');
      setApplications(res.results || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();

    // R6 : Websocket Realtime pour de nouvelles candidatures
    const channel = supabase
      .channel('public:konggest_public_recruitment')
      .on('broadcast', { event: 'new_application' }, (payload) => {
        setToast({ show: true, text: `Nouvelle candidature : ${payload.payload.candidate_name} pour ${payload.payload.job_title} !` });
        setTimeout(() => setToast({ show: false, text: '' }), 5000);
        // Refresh the board
        fetchApplications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStage = async (appId, newStage) => {
    try {
      await api.patch(`/recruitment/applications/${appId}/`, { stage: newStage });
      setApplications(prev => prev.map(app => app.id === appId ? { ...app, stage: newStage } : app));
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    }
  };

  const getSupabaseFileUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path; // Old backward compatibility
    
    // Generates a public URL (if the bucket is public) or we need a signed URL.
    // For now assuming the HR has access through the signed proxy if needed, or we just rely on Supabase link
    const { data } = supabase.storage.from('resumes').getPublicUrl(path);
    return data.publicUrl;
  };

  if (loading) return <div className="p-10 text-center">Chargement du pipeline...</div>;

  return (
    <div className="max-w-full p-4 h-[calc(100vh-80px)] flex flex-col">
      {toast.show && (
        <div className="fixed top-20 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
          <HiOutlineUserAdd className="text-xl" />
          <span className="font-medium">{toast.text}</span>
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Pipeline de Recrutement</h1>
          <p className="text-gray-500 text-sm mt-1">Glissez/Changez le statut des candidats en temps réel.</p>
        </div>
        <button onClick={fetchApplications} className="btn btn-outlineborder border-gray-300 px-4 py-2 rounded-lg bg-white shadow-sm hover:bg-gray-50">
          Rafraîchir
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
        {STAGES.map(stage => {
          const columnApps = applications.filter(a => a.stage === stage.id);
          return (
            <div key={stage.id} className="min-w-[300px] w-[300px] bg-gray-50 rounded-xl border p-3 flex flex-col max-h-full">
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className={`text-sm font-bold px-3 py-1 rounded-full border ${stage.color}`}>
                  {stage.label}
                </h3>
                <span className="text-gray-500 text-xs font-semibold bg-gray-200 px-2 py-1 rounded-full">{columnApps.length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {columnApps.map(app => (
                  <div key={app.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-800 text-sm">{app.first_name} {app.last_name}</h4>
                    </div>
                    <p className="text-xs font-medium text-blue-600 mb-2 truncate" title={app.job_title}>{app.job_title}</p>
                    
                    <div className="text-xs text-gray-500 mb-3 space-y-1">
                      <p className="truncate">{app.email}</p>
                      <p>{new Date(app.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t mt-2">
                      <select 
                        className="text-xs border rounded p-1 bg-gray-50 text-gray-700 outline-none"
                        value={app.stage}
                        onChange={(e) => updateStage(app.id, e.target.value)}
                      >
                        {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      
                      {app.resume_url && (
                        <a 
                          href={getSupabaseFileUrl(app.resume_url)}
                          target="_blank" 
                          rel="noreferrer"
                          className="text-gray-400 hover:text-blue-600 transition"
                          title="Télécharger le CV"
                        >
                          <HiOutlineDocumentDownload size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
