'use client';

import { useDroppable } from '@dnd-kit/core';
import ShiftCard from './ShiftCard';
import { HiOutlinePlus } from 'react-icons/hi';

export default function PlanningCell({ day, employeeId, shift, onAdd }) {
  const cellId = `cell-${employeeId}-${day}`;
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: {
      employeeId,
      day,
    },
  });

  return (
    <td 
      ref={setNodeRef}
      className={`p-1.5 border-r relative min-h-[60px] transition-colors duration-150 ${isOver ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : ''}`}
    >
      <div className="flex flex-col gap-1 min-h-[44px]">
        {shift ? (
          <ShiftCard shift={shift} />
        ) : (
          <div className="flex-1 flex items-center justify-center group">
            <button 
              onClick={() => onAdd(employeeId, day)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-gray-100 text-gray-400 hover:bg-blue-600 hover:text-white"
            >
              <HiOutlinePlus size={12} />
            </button>
          </div>
        )}
      </div>
    </td>
  );
}
