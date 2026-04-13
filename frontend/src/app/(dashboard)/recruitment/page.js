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
      .on('broadcast', { event: 'application_moved' }, (payload) => {
        const { application_id, new_stage, candidate_name } = payload.payload;
        // Optimization: only refresh if we don't have the update locally already
        // (but since this is for OTHER users, we should update local state)
        setApplications(prev => prev.map(a => a.id === application_id ? { ...a, stage: new_stage } : a));
        setToast({ show: true, text: `${candidate_name} déplacé vers ${STAGES.find(s => s.id === new_stage)?.label}` });
        setTimeout(() => setToast({ show: false, text: '' }), 4000);
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
    <div className="min-h-full flex flex-col bg-[#FDFDFF]">
      {toast.show && (
        <div className="fixed bottom-8 right-8 z-[100] bg-gray-900/95 backdrop-blur-md text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 border border-white/10 ring-1 ring-white/20">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <HiOutlineUserAdd className="text-xl" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-0.5">Notification Elite</p>
            <p className="text-sm font-bold opacity-90">{toast.text}</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="px-6 md:px-12 pt-8 md:pt-12 pb-8 md:pb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div className="animate-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-1 bg-blue-600 rounded-full"></div>
             <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Gestion Talents</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-3">
            Recrutement
          </h1>
          <p className="text-gray-400 font-medium text-sm md:text-base max-w-md">
            Pilotez votre pipeline de recrutement avec une précision chirurgicale.
          </p>
        </div>
        <div className="flex gap-3 animate-in slide-in-from-right-4 duration-700">
          <button 
            onClick={fetchApplications} 
            className="flex-1 md:flex-none btn bg-white text-gray-900 border border-gray-100 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition shadow-sm"
          >
            Rafraîchir
          </button>
          <button className="flex-1 md:flex-none btn bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 ring-1 ring-blue-400/50">
            Nouveau Candidat
          </button>
        </div>
      </div>

      {/* Dynamic Summary Stats */}
      <div className="px-6 md:px-12 mb-8 hidden md:flex items-center gap-6 overflow-x-auto no-scrollbar">
        {STAGES.map(s => {
          const count = applications.filter(a => a.stage === s.id).length;
          return (
            <div key={s.id} className="flex items-center gap-2 whitespace-nowrap bg-white py-2 px-4 rounded-xl border border-gray-50 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${s.color.split(' ')[0]}`} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
              <span className="ml-1 font-black text-slate-800">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto px-6 md:px-12 pb-12 flex gap-8 items-start scroll-smooth custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {STAGES.map(stage => (
            <div key={stage.id} className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <KanbanColumn 
                stage={stage} 
                applications={applications.filter(a => a.stage === stage.id)} 
                />
            </div>
          ))}

          <DragOverlay>
            {activeId ? (
              <div className="rotate-3 cursor-grabbing scale-105 transition-transform z-50">
                <CandidateCard app={activeApp} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        
        {/* Visual Spacer */}
        <div className="min-w-[40px] h-full" />
      </div>
    </div>
  );
}
