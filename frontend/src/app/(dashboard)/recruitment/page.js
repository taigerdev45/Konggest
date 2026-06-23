'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { HiOutlineUserAdd, HiOutlineRefresh } from 'react-icons/hi';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from '@/components/recruitment/KanbanColumn';
import CandidateCard from '@/components/recruitment/CandidateCard';

const STAGES = [
  { id: 'new',        label: 'Nouveau',      color: 'bg-[rgba(20,34,24,0.06)] text-[#6B7E6D]',      dot: '#6B7E6D' },
  { id: 'screening',  label: 'Présélection', color: 'bg-[rgba(201,168,76,0.1)] text-[#8B7035]',      dot: '#C9A84C' },
  { id: 'interview',  label: 'Entretien',    color: 'bg-[rgba(45,106,79,0.1)] text-[#2D6A4F]',       dot: '#2D6A4F' },
  { id: 'offer',      label: 'Offre',        color: 'bg-[rgba(99,102,241,0.1)] text-indigo-600',     dot: '#6366F1' },
  { id: 'hired',      label: 'Embauché',     color: 'bg-[rgba(45,106,79,0.15)] text-[#1a5238]',      dot: '#145730' },
  { id: 'rejected',   label: 'Refusé',       color: 'bg-[rgba(220,38,38,0.08)] text-red-600',        dot: '#DC2626' },
];

export default function RecruitmentDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [toast, setToast] = useState({ show: false, text: '' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
        setApplications(prev => prev.map(a => a.id === application_id ? { ...a, stage: new_stage } : a));
        setToast({ show: true, text: `${candidate_name} → ${STAGES.find(s => s.id === new_stage)?.label}` });
        setTimeout(() => setToast({ show: false, text: '' }), 4000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDragStart = (event) => { setActiveId(event.active.id); };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    const activeApp = applications.find(a => a.id === active.id);
    const isOverColumn = STAGES.some(s => s.id === over.id);
    if (isOverColumn && activeApp.stage !== over.id) {
      setApplications(prev => prev.map(a => a.id === active.id ? { ...a, stage: over.id } : a));
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const appId = active.id;
    const activeApp = applications.find(a => a.id === appId);
    const overApp = applications.find(a => a.id === over.id);
    const newStage = overApp ? overApp.stage : over.id;

    if (activeApp.stage !== newStage) {
      try {
        await api.patch(`/recruitment/applications/${appId}/`, { stage: newStage });
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, stage: newStage } : a));
      } catch (err) {
        console.error('Failed to update status', err);
        fetchApplications();
      }
    }
  };

  const activeApp = activeId ? applications.find(a => a.id === activeId) : null;

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-[3px] border-[#2D6A4F] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-full flex flex-col bg-[#F5F7F4]">
      {toast.show && (
        <div className="fixed top-4 right-4 z-[100] bg-[#2D6A4F] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-[13px] font-medium">
          <HiOutlineUserAdd className="text-sm" />
          {toast.text}
        </div>
      )}

      {/* Header compact */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-[rgba(20,34,24,0.08)]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-[#2D6A4F] uppercase tracking-[0.12em]">Talents</span>
          <span className="text-[#0F1A10]/20 text-lg leading-none">·</span>
          <h1 className="text-[15px] font-semibold text-[#0F1A10]">Recrutement</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchApplications} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-white text-[#0F1A10] border border-[rgba(20,34,24,0.15)] hover:bg-[#F5F7F4] transition-colors cursor-pointer">
            <HiOutlineRefresh className="text-sm" /> Rafraîchir
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[#2D6A4F] text-white hover:bg-[#245c42] transition-colors cursor-pointer">
            <HiOutlineUserAdd className="text-sm" /> Nouveau candidat
          </button>
        </div>
      </header>

      {/* Stage stats strip */}
      <div className="flex items-center gap-2 px-6 py-2.5 bg-white border-b border-[rgba(20,34,24,0.06)] overflow-x-auto">
        {STAGES.map(s => {
          const count = applications.filter(a => a.stage === s.id).length;
          return (
            <div key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5F7F4] whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
              <span className="text-[11px] font-semibold text-[#6B7E6D]">{s.label}</span>
              <span className="text-[11px] font-bold text-[#0F1A10]">{count}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(45,106,79,0.08)] ml-auto whitespace-nowrap">
          <span className="text-[11px] font-semibold text-[#2D6A4F]">Total</span>
          <span className="text-[11px] font-bold text-[#0F1A10]">{applications.length}</span>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto px-6 py-6 flex gap-4 items-start">
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
              <div className="rotate-3 cursor-grabbing scale-105 z-50">
                <CandidateCard app={activeApp} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <div className="min-w-[1px] h-full" />
      </div>
    </div>
  );
}
