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
      className={`relative p-2.5 h-28 min-w-[180px] border-r border-b border-gray-100 transition-all duration-500 group/cell ${
        isOver 
          ? 'bg-blue-50/40 ring-2 ring-blue-500/10 ring-inset scale-[1.01] z-10 shadow-lg' 
          : 'bg-transparent hover:bg-slate-50/30'
      }`}
    >
      {shift ? (
        <div className="h-full animate-in fade-in zoom-in-95 duration-500">
            <ShiftCard shift={shift} />
        </div>
      ) : (
        <button
          onClick={() => onAdd(employeeId, day)}
          className="absolute inset-2.5 flex items-center justify-center rounded-[1.5rem] border-2 border-dashed border-gray-100 opacity-0 group-hover/cell:opacity-100 hover:border-blue-300 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 hover:scale-[0.98] transition-all duration-500 overflow-hidden group/btn"
        >
          <div className="flex flex-col items-center gap-1.5 transform group-hover/btn:scale-110 transition-transform duration-500">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-all">
                <HiOutlinePlusSmall size={20} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-400 group-hover/btn:text-blue-600">Assigner</span>
          </div>
        </button>
      )}
    </td>
  );
}
