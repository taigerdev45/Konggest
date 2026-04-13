'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { HiOutlineClock } from 'react-icons/hi';

export default function ShiftCard({ shift }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shift-${shift.id}`,
    data: {
      type: 'shift',
      shift: shift,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  // Determine color based on time
  const startHour = parseInt(shift.start_time.split(':')[0]);
  let theme = {
    bg: 'bg-blue-50/50',
    border: 'border-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    label: 'Journée'
  };

  if (startHour >= 18 || startHour < 6) {
    theme = {
      bg: 'bg-indigo-50/50',
      border: 'border-indigo-100',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500',
      label: 'Nuit'
    };
  } else if (startHour >= 6 && startHour < 10) {
    theme = {
      bg: 'bg-emerald-50/50',
      border: 'border-emerald-100',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Matin'
    };
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group relative p-3 rounded-2xl border transition-all duration-500 cursor-grab active:cursor-grabbing hover:shadow-xl ${
        isDragging 
          ? 'shadow-2xl ring-4 ring-blue-500/10 scale-105 rotate-1 bg-white/95 backdrop-blur-xl' 
          : 'bg-white/60 backdrop-blur-md border-white/40 shadow-[0_4px_12px_rgba(0,0,0,0.03)]'
      }`}
    >
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-2xl pointer-events-none" />

      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full shadow-sm animate-pulse ${theme.dot}`}></div>
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.text} opacity-80`}>
                {theme.label}
            </span>
        </div>
        {shift.status === 'published' && (
            <div className="w-4 h-4 rounded-full bg-blue-100/50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            </div>
        )}
      </div>
      
      <div className="relative flex flex-col gap-1">
        <div className="flex items-center gap-2 text-slate-900 font-black tracking-[-0.03em] text-[11px]">
            <span className="px-2 py-0.5 bg-slate-100/50 rounded-lg border border-slate-200/30">
                {shift.start_time.substring(0, 5)}
            </span>
            <span className="text-slate-300">—</span>
            <span className="px-2 py-0.5 bg-slate-100/50 rounded-lg border border-slate-200/30">
                {shift.end_time.substring(0, 5)}
            </span>
        </div>
        
        {shift.status === 'draft' && (
          <div className="mt-1 flex items-center justify-center py-1 bg-amber-50/50 border border-amber-100/50 rounded-lg">
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-amber-600">Brouillon</span>
          </div>
        )}
      </div>

      {/* Hover action indicator */}
      <div className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
         <div className="w-5 h-5 rounded-lg bg-blue-600 shadow-lg shadow-blue-500/30 flex items-center justify-center text-white">
            <HiOutlineClock size={10} />
         </div>
      </div>
    </div>
  );
}
