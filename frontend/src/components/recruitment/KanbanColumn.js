'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import CandidateCard from './CandidateCard';

export default function KanbanColumn({ stage, applications }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`min-w-[320px] w-[320px] rounded-2xl flex flex-col max-h-full transition-colors duration-200 ${isOver ? 'bg-blue-50/50 ring-2 ring-blue-200 ring-inset' : 'bg-gray-100/50'}`}
    >
      <div className="p-4 flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-t-2xl border-b border-gray-100">
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${stage.color.split(' ')[0].replace('bg-', 'bg-')}`}></span>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tighter">
                {stage.label}
            </h3>
        </div>
        <span className="text-gray-500 text-xs font-bold bg-white px-2.5 py-1 rounded-full border border-gray-100 shadow-sm">
            {applications.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        <SortableContext 
          items={applications.map(a => a.id)} 
          strategy={verticalListSortingStrategy}
        >
          {applications.map(app => (
            <CandidateCard key={app.id} app={app} />
          ))}
        </SortableContext>
        
        {applications.length === 0 && (
            <div className={`h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-gray-300 text-xs transition-colors ${isOver ? 'border-blue-400 text-blue-400' : 'border-gray-200'}`}>
                Déposez ici
            </div>
        )}
      </div>
    </div>
  );
}
