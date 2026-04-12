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
      className={`relative p-2.5 rounded-2xl border-2 transition-all duration-300 cursor-grab active:cursor-grabbing hover:shadow-lg ${theme.bg} ${theme.border} ${theme.text} ${
        isDragging ? 'shadow-2xl ring-4 ring-blue-500/10 scale-105 rotate-1' : 'shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <div className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}></div>
        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{theme.label}</span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <HiOutlineClock size={12} className="opacity-70" />
        <span className="text-[10px] font-black tracking-tight tracking-[-0.02em]">
            {shift.start_time.substring(0, 5)} — {shift.end_time.substring(0, 5)}
        </span>
      </div>

      {shift.status === 'draft' && (
        <div className="mt-2 flex items-center justify-center py-1 bg-white/40 rounded-lg">
            <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60">Brouillon</span>
        </div>
      )}
    </div>
  );
}
