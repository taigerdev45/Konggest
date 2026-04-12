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
      className={`group relative bg-white p-5 rounded-3xl border transition-all duration-300 cursor-grab active:cursor-grabbing ${
        isDragging 
          ? 'shadow-2xl ring-2 ring-blue-500 border-blue-200 scale-105 rotate-1' 
          : 'shadow-sm border-gray-100 hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-200 hover:-translate-y-1'
      }`}
    >
      {/* Top Section */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
             <h4 className="font-black text-gray-900 text-sm tracking-tight group-hover:text-blue-600 transition-colors truncate">
                {app.first_name} {app.last_name}
             </h4>
             {app.stage === 'hired' && <HiBadgeCheck className="text-emerald-500" size={16} />}
          </div>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] opacity-80 truncate">
            {app.job_title}
          </p>
        </div>
        <div className="w-8 h-8 rounded-2xl bg-slate-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
          <HiOutlineEye size={16} />
        </div>
      </div>

      {/* Info Grid */}
      <div className="space-y-2.5 mb-5">
        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
          <div className="w-5 h-5 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-blue-400 transition-colors">
            <HiOutlineMail size={12} />
          </div>
          <span className="truncate">{app.email}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
          <div className="w-5 h-5 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-blue-400 transition-colors">
            <HiOutlineCalendar size={12} />
          </div>
          <span>Postulé le {new Date(app.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-50 mt-auto">
        <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-white flex items-center justify-center text-[10px] font-black text-slate-600 shadow-sm">
                {app.first_name?.[0]}{app.last_name?.[0]}
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ID-{app.id.toString().slice(-4)}</span>
        </div>
        
        {app.resume_url && (
            <a 
                href={getSupabaseFileUrl(app.resume_url)}
                target="_blank" 
                rel="noreferrer"
                className="w-8 h-8 rounded-2xl bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 border border-transparent hover:border-emerald-100 flex items-center justify-center transition-all"
                onClick={(e) => e.stopPropagation()}
                title="Consulter le CV"
            >
                <HiOutlineDocumentDownload size={18} />
            </a>
        )}
      </div>
    </div>
  );
}
