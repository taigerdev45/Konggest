'use client';

import { useDroppable } from '@dnd-kit/core';
import ShiftCard from './ShiftCard';
import { HiOutlinePlusSmall } from 'react-icons/hi2';

export default function PlanningCell({ day, employeeId, shift, onAdd }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${employeeId}-${day}`,
    data: { day, employeeId },
  });

  return (
    <td
      ref={setNodeRef}
      className={`relative p-2 h-24 min-w-[160px] border-r border-b border-gray-50 transition-all duration-300 group/cell ${
        isOver ? 'bg-blue-50/50 ring-2 ring-blue-500/20 ring-inset' : 'bg-transparent'
      }`}
    >
      {shift ? (
        <div className="h-full animate-in fade-in zoom-in-95 duration-300">
            <ShiftCard shift={shift} />
        </div>
      ) : (
        <button
          onClick={() => onAdd(employeeId, day)}
          className="absolute inset-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 opacity-0 group-hover/cell:opacity-100 hover:border-blue-400 hover:bg-blue-50/50 hover:scale-[0.98] transition-all duration-300 overflow-hidden"
        >
          <div className="flex flex-col items-center gap-1">
            <HiOutlinePlusSmall className="text-blue-500 text-xl" />
            <span className="text-[8px] font-black uppercase tracking-widest text-blue-400">Shift</span>
          </div>
        </button>
      )}
    </td>
  );
}
