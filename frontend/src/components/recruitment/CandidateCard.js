'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HiOutlineDocumentDownload, HiOutlineEye, HiOutlineCalendar, HiOutlineMail, HiBadgeCheck } from 'react-icons/hi';
import { supabase } from '@/lib/supabase';

export default function CandidateCard({ app }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const getSupabaseFileUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('resumes').getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative p-5 rounded-[2rem] transition-all duration-500 cursor-grab active:cursor-grabbing ${
        isDragging 
          ? 'shadow-2xl ring-2 ring-blue-500/50 bg-white/90 backdrop-blur-xl scale-105 rotate-1' 
          : 'bg-white/70 backdrop-blur-md border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_48px_rgba(59,130,246,0.12)] hover:border-blue-200/50 hover:-translate-y-1.5'
      }`}
    >
      {/* Glossy background element */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-[2rem] pointer-events-none" />

      {/* Top Section */}
      <div className="relative flex justify-between items-start mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
             <h4 className="font-black text-gray-900 text-[0.95rem] tracking-tight group-hover:text-blue-600 transition-colors truncate">
                {app.first_name} {app.last_name}
             </h4>
             {app.stage === 'hired' && (
                <div className="p-0.5 bg-emerald-100 text-emerald-600 rounded-full shadow-sm">
                   <HiBadgeCheck size={14} />
                </div>
             )}
          </div>
          <div className="inline-flex items-center px-2 py-0.5 bg-blue-50/50 rounded-lg border border-blue-100/50">
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest whitespace-nowrap">
                {app.job_title}
            </p>
          </div>
        </div>
        <div className="w-9 h-9 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/80 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
          <HiOutlineEye size={18} />
        </div>
      </div>

      {/* Info Grid */}
      <div className="relative space-y-3 mb-6">
        <div className="flex items-center gap-3 text-[11px] font-bold text-gray-500/80">
          <div className="w-8 h-8 rounded-xl bg-white/50 border border-white flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:border-blue-100 transition-all">
            <HiOutlineMail size={14} />
          </div>
          <span className="truncate">{app.email}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold text-gray-500/80">
          <div className="w-8 h-8 rounded-xl bg-white/50 border border-white flex items-center justify-center text-gray-400 group-hover:text-amber-500 group-hover:border-amber-100 transition-all">
            <HiOutlineCalendar size={14} />
          </div>
          <span>Postulé le {new Date(app.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="relative flex justify-between items-center pt-5 border-t border-gray-100/50">
        <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-white/80 flex items-center justify-center text-[11px] font-black text-slate-600 shadow-sm">
                {app.first_name?.[0]}{app.last_name?.[0]}
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ID-{app.id.toString().slice(-4)}</span>
        </div>
        
        {app.resume_url && (
            <a 
                href={getSupabaseFileUrl(app.resume_url)}
                target="_blank" 
                rel="noreferrer"
                className="w-9 h-9 rounded-2xl bg-white/50 text-slate-400 hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-emerald-500/30 border border-white/80 flex items-center justify-center transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
                title="Consulter le CV"
            >
                <HiOutlineDocumentDownload size={20} />
            </a>
        )}
      </div>
    </div>
  );
}
