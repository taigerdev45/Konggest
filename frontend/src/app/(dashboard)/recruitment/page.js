'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { HiOutlineUserAdd } from 'react-icons/hi';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from '@/components/recruitment/KanbanColumn';
import CandidateCard from '@/components/recruitment/CandidateCard';

const STAGES = [
  { id: 'new', label: 'Nouveau', color: 'bg-blue-500 border-blue-100 text-blue-700' },
  { id: 'screening', label: 'Présélection', color: 'bg-amber-500 border-amber-100 text-amber-700' },
  { id: 'interview', label: 'Entretien', color: 'bg-indigo-500 border-indigo-100 text-indigo-700' },
  { id: 'offer', label: 'Offre', color: 'bg-purple-500 border-purple-100 text-purple-700' },
  { id: 'hired', label: 'Embauché', color: 'bg-emerald-500 border-emerald-100 text-emerald-700' },
  { id: 'rejected', label: 'Refusé', color: 'bg-rose-500 border-rose-100 text-rose-700' },
];

export default function RecruitmentDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [toast, setToast] = useState({ show: false, text: '' });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchApplications = async () => {
    try {
      const res = await api.get('/recruitment/applications/');
      const data = Array.isArray(res.results) ? res.results : (Array.isArray(res) ? res : []);
      setApplications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();

    const channel = supabase
      .channel('public:konggest_public_recruitment')
      .on('broadcast', { event: 'new_application' }, (payload) => {
        setToast({ show: true, text: `Nouvelle candidature : ${payload.payload.candidate_name} !` });
        setTimeout(() => setToast({ show: false, text: '' }), 5000);
        fetchApplications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeApp = applications.find(a => a.id === active.id);
    const overId = over.id;

    // Is it dropping over a column?
    const isOverAColumn = STAGES.some(s => s.id === overId);
    
    if (isOverAColumn && activeApp.stage !== overId) {
      setApplications(prev => prev.map(a => a.id === active.id ? { ...a, stage: overId } : a));
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const appId = active.id;
    const activeApp = applications.find(a => a.id === appId);
    
    // Determine the new stage
    let newStage = over.id;
    // If we dropped over another card, get its stage
    const overApp = applications.find(a => a.id === over.id);
    if (overApp) {
      newStage = overApp.stage;
    }

    if (activeApp.stage !== newStage) {
      // Update in base
      try {
        await api.patch(`/recruitment/applications/${appId}/`, { stage: newStage });
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, stage: newStage } : a));
      } catch (err) {
        console.error("Failed to update status", err);
        fetchApplications(); // Revert
      }
    }
  };

  const activeApp = activeId ? applications.find(a => a.id === activeId) : null;

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium">Chargement du pipeline...</p>
        </div>
    </div>
  );

  return (
    <div className="max-w-full h-full flex flex-col bg-white">
      {toast.show && (
        <div className="fixed bottom-8 right-8 z-50 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 border border-white/10">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <HiOutlineUserAdd className="text-xl" />
          </div>
          <div>
            <p className="text-sm font-bold">Nouvelle de Konggest</p>
            <p className="text-xs text-gray-400">{toast.text}</p>
          </div>
        </div>
      )}

      <div className="px-8 pt-8 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Recrutement</h1>
          <p className="text-gray-500 font-medium mt-1">Gérez vos talents par glisser-déposer.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchApplications} className="btn bg-gray-50 text-gray-700 border border-gray-200 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-100 transition shadow-sm">
            Rafraîchir
          </button>
          <button className="btn bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-200">
            Nouveau Candidat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto px-8 pb-8 flex gap-6 items-start scroll-smooth">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {STAGES.map(stage => (
            <KanbanColumn 
              key={stage.id} 
              stage={stage} 
              applications={applications.filter(a => a.stage === stage.id)} 
            />
          ))}

          <DragOverlay>
            {activeId ? (
              <div className="rotate-3 cursor-grabbing scale-105 transition-transform">
                <CandidateCard app={activeApp} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        
        {/* Fill space at the end */}
        <div className="min-w-[40px] h-full" />
      </div>
    </div>
  );
}
