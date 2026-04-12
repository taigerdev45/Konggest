'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HiOutlineDocumentDownload, HiOutlineEye, HiOutlineCalendar, HiOutlineMail } from 'react-icons/hi';
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
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 2 : 1,
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
      className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all group ${isDragging ? 'ring-2 ring-blue-500 shadow-xl' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
            {app.first_name} {app.last_name}
          </h4>
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mt-1 truncate">
            {app.job_title}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
          <HiOutlineEye size={16} />
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <HiOutlineMail className="text-gray-400" />
          <span className="truncate">{app.email}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <HiOutlineCalendar className="text-gray-400" />
          <span>Postulé le {new Date(app.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-50">
        <div className="flex -space-x-1">
            <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                {app.first_name?.[0]}{app.last_name?.[0]}
            </div>
        </div>
        
        {app.resume_url && (
            <a 
                href={getSupabaseFileUrl(app.resume_url)}
                target="_blank" 
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                onClick={(e) => e.stopPropagation()}
                title="Consulter le CV"
            >
                <HiOutlineDocumentDownload size={16} />
            </a>
        )}
      </div>
    </div>
  );
}
