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
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  // Determine color based on time
  const startHour = parseInt(shift.start_time.split(':')[0]);
  let colorClass = 'bg-blue-100 text-blue-800 border-blue-200'; // Day
  if (startHour >= 18 || startHour < 6) colorClass = 'bg-indigo-900/10 text-indigo-900 border-indigo-200'; // Night/Evening
  if (startHour >= 6 && startHour < 10) colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200'; // Morning

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 rounded-lg text-[10px] font-bold border shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${colorClass} ${isDragging ? 'scale-105 rotate-2 shadow-xl ring-2 ring-blue-400' : ''}`}
    >
      <div className="flex items-center gap-1">
        <HiOutlineClock size={10} className="shrink-0" />
        <span>{shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}</span>
      </div>
      {shift.status === 'draft' && (
        <div className="mt-1 flex items-center gap-1 opacity-70 italic text-[9px]">
            <span className="w-1 h-1 rounded-full bg-current"></span>
            Brouillon
        </div>
      )}
    </div>
  );
}
