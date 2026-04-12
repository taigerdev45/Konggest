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
      className="flex flex-col h-full min-w-[320px] w-[320px]"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${stage.color.split(' ')[0]}`}></div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                {stage.label}
            </h3>
            <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                {applications.length}
            </span>
        </div>
      </div>

      {/* Column Body */}
      <div 
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-4 p-4 rounded-[2rem] border-2 transition-all duration-300 min-h-[500px] ${isOver 
            ? 'bg-blue-50/50 border-blue-400/50 ring-4 ring-blue-500/5' 
            : 'bg-slate-50/50 border-gray-100/50 hover:border-gray-200'}`}
      >
        <SortableContext 
          items={applications.map(a => a.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-4">
            {applications.map(app => (
              <CandidateCard key={app.id} app={app} />
            ))}
          </div>
        </SortableContext>
        
        {applications.length === 0 && (
            <div className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-[1.5rem] transition-colors p-8 text-center ${isOver ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-transparent'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${isOver ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-300'}`}>
                    <span className="text-xl font-bold">+</span>
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest leading-tight ${isOver ? 'text-blue-500' : 'text-gray-400'}`}>
                    {isOver ? 'Relâcher pour ajouter' : 'Déposez ici'}
                </p>
            </div>
        )}
      </div>
    </div>
  );
}
