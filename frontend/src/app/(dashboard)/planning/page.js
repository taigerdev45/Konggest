'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { HiOutlineCalendar, HiOutlinePrinter, HiOutlinePlus, HiOutlineUserGroup } from 'react-icons/hi';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import ShiftCard from '@/components/planning/ShiftCard';
import PlanningCell from '@/components/planning/PlanningCell';

export default function PlanningPage() {
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState(null);
  const [toast, setToast] = useState({ show: false, text: '', type: 'info' });
  
  const today = new Date();
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date(today.setDate(today.getDate() - today.getDay() + 1)));

  const [showModal, setShowModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchPlannings = async () => {
    try {
      const start = currentWeekStart.toISOString().split('T')[0];
      const endObj = new Date(currentWeekStart);
      endObj.setDate(endObj.getDate() + 6);
      const end = endObj.toISOString().split('T')[0];
      
      const res = await api.get(`/planning/schedules/?start_date=${start}&end_date=${end}`);
      setSchedules(res.results || res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [empRes, tplRes] = await Promise.all([
        api.get('/employees/'),
        api.get('/planning/templates/')
      ]);
      setEmployees(empRes.results || empRes || []);
      setTemplates(tplRes.results || tplRes || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
    fetchPlannings();

    const tenant_id = localStorage.getItem('tenant_id') || '*'; 
    const channel = supabase
      .channel(`planning:${tenant_id}`)
      .on('broadcast', { event: 'schedule.published' }, (payload) => {
        setToast({ 
          show: true, 
          text: `Planning publié : ${payload.payload.employee}`,
          type: 'success'
        });
        setTimeout(() => setToast({ show: false, text: '' }), 5000);
        fetchPlannings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWeekStart]);

  const handleDragStart = (event) => {
    const { active } = event;
    const shift = active.data.current.shift;
    setActiveShift(shift);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveShift(null);

    if (!over) return;

    const shift = active.data.current.shift;
    const { employeeId, day } = over.data.current;

    const oldDay = shift.date;
    const oldEmp = shift.employee;

    if (oldDay !== day || oldEmp !== employeeId) {
      setSchedules(prev => prev.map(s => s.id === shift.id ? { ...s, date: day, employee: employeeId } : s));

      try {
        await api.patch(`/planning/schedules/${shift.id}/`, {
          date: day,
          employee: employeeId
        });
        setToast({ show: true, text: "Shift déplacé avec succès", type: "success" });
        setTimeout(() => setToast({ show: false, text: '' }), 3000);
      } catch (err) {
        setToast({ show: true, text: "Erreur lors du déplacement", type: "error" });
        fetchPlannings();
      }
    }
  };

  const handleExport = async () => {
    try {
      setToast({ show: true, text: "Génération du PDF...", type: "info" });
      const month = currentWeekStart.toISOString().substring(0, 7);
      await api.get(`/planning/schedules/export-pdf/?month=${month}`);
      setToast({ show: true, text: "Fichier généré (Processus en arrière-plan)", type: "success" });
      setTimeout(() => setToast({ show: false, text: '' }), 4000);
    } catch (error) {
      setToast({ show: true, text: "Erreur lors de l'export", type: "error" });
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplate || selectedEmployees.length === 0 || !selectedDate) {
      alert("Veuillez remplir tous les champs !");
      return;
    }
    
    const tpl = templates.find(t => t.id === parseInt(selectedTemplate));
    
    try {
      await api.post('/planning/schedules/bulk-create/', {
        employee_ids: selectedEmployees.map(id => parseInt(id)),
        date: selectedDate,
        start_time: tpl.start_time,
        end_time: tpl.end_time,
        status: 'published'
      });
      setShowModal(false);
      fetchPlannings();
      setToast({ show: true, text: "Assignation réussie", type: "success" });
      setTimeout(() => setToast({ show: false, text: '' }), 3000);
    } catch (err) {
      alert("Erreur");
    }
  };

  const handleQuickAdd = (employeeId, day) => {
    setSelectedEmployees([employeeId]);
    setSelectedDate(day);
    setShowModal(true);
  };

  const days = Array.from({length: 7}).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-full flex flex-col bg-[#FDFDFF]">
      {toast.show && (
        <div className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-right-10 backdrop-blur-md ${toast.type === 'error' ? 'bg-red-500/95' : 'bg-gray-900/95 border border-white/10 ring-1 ring-white/20'}`}>
          <HiOutlineCalendar className="text-xl text-blue-400" />
          <span className="font-black text-xs uppercase tracking-widest">{toast.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="px-6 md:px-12 pt-8 md:pt-12 pb-8 md:pb-10 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div className="animate-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-1 bg-blue-600 rounded-full"></div>
             <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Rotations & Shifts</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-3">
            Planning RH
          </h1>
          <p className="text-gray-400 font-medium text-sm md:text-base max-w-lg">
            Orchestrez vos équipes avec une vue panoramique et agile.
          </p>
        </div>
        <div className="flex gap-3 animate-in slide-in-from-right-4 duration-700">
          <button 
            onClick={handleExport} 
            className="flex-1 md:flex-none btn bg-white text-gray-900 border border-gray-100 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
          >
            <HiOutlinePrinter size={18} /> Export PDF
          </button>
          <button 
            onClick={() => setShowModal(true)} 
            className="flex-1 md:flex-none btn bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 ring-1 ring-blue-400/50 flex items-center gap-2"
          >
            <HiOutlinePlus size={18} /> Assigner
          </button>
        </div>
      </div>

      <div className="px-6 md:px-12 pb-12 flex-1 flex flex-col">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/40 overflow-hidden flex flex-col flex-1">
          {/* Week Selector */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-6 md:p-8 border-b bg-gray-50/30 gap-4">
            <button 
                onClick={() => {
                const prev = new Date(currentWeekStart);
                prev.setDate(prev.getDate() - 7);
                setCurrentWeekStart(prev);
                }}
                className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition text-gray-400 hover:text-blue-600 shadow-sm"
            >
                <span className="text-xl font-bold">←</span>
            </button>
            <div className="text-center group">
                <span className="block text-[10px] uppercase font-black text-blue-500 tracking-[0.4em] mb-2 transition-transform group-hover:scale-110">Période Active</span>
                <span className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-none bg-gradient-to-r from-gray-900 to-gray-500 bg-clip-text text-transparent">
                    {currentWeekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} — {(() => {
                        const end = new Date(currentWeekStart);
                        end.setDate(end.getDate() + 6);
                        return end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                    })()}
                </span>
            </div>
            <button 
                onClick={() => {
                const next = new Date(currentWeekStart);
                next.setDate(next.getDate() + 7);
                setCurrentWeekStart(next);
                }}
                className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition text-gray-400 hover:text-blue-600 shadow-sm"
            >
                <span className="text-xl font-bold">→</span>
            </button>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-white">
                    <th className="p-6 md:p-8 border-r border-b border-gray-50 min-w-[300px] text-left">
                      <div className="flex items-center gap-3 text-slate-400 uppercase text-[10px] font-black tracking-[0.2em] mb-1">
                          <HiOutlineUserGroup size={14} className="text-blue-500" /> Collaborateurs
                      </div>
                      <div className="text-xs font-bold text-slate-300">Organisation Active</div>
                    </th>
                    {days.map((d, i) => (
                      <th key={i} className={`p-4 md:p-6 border-r border-b border-gray-50 min-w-[160px] text-center ${d.toDateString() === new Date().toDateString() ? 'bg-blue-50/20' : ''}`}>
                        <div className="block text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1.5 leading-none">
                          {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                        </div>
                        <div className={`text-base md:text-lg font-black tracking-tighter leading-none ${d.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-900'}`}>
                          {d.getDate()} <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                      <td className="p-6 md:p-8 text-left border-r border-b border-gray-50 bg-white group-hover:bg-slate-50 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center font-black shadow-sm border border-white group-hover:from-blue-600 group-hover:to-blue-700 group-hover:text-white transition-all duration-500">
                             {emp.first_name[0]}{emp.last_name[0]}
                           </div>
                           <div className="min-w-0">
                             <p className="font-black text-gray-900 truncate uppercase tracking-tighter text-sm leading-tight mb-1">{emp.first_name} {emp.last_name}</p>
                             <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <p className="text-[9px] text-blue-500 font-black uppercase tracking-[0.15em] opacity-70">
                                    {emp.department_name || 'Général'}
                                </p>
                             </div>
                           </div>
                        </div>
                      </td>
                      {days.map((d, i) => {
                        const dayStr = d.toISOString().split('T')[0];
                        const s = schedules.find(sched => sched.employee === emp.id && sched.date === dayStr);
                        return (
                          <PlanningCell 
                              key={i} 
                              day={dayStr} 
                              employeeId={emp.id} 
                              shift={s} 
                              onAdd={handleQuickAdd}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <DragOverlay dropAnimation={{
                  sideEffects: defaultDropAnimationSideEffects({
                      styles: {
                          active: {
                              opacity: '0.4',
                          },
                      },
                  }),
              }}>
                {activeShift ? (
                  <div className="rotate-3 scale-110 pointer-events-none w-[140px] z-[1000]">
                    <ShiftCard shift={activeShift} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>

      {showModal && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] max-w-xl w-full p-8 md:p-12 relative shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="absolute top-8 right-8">
                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center font-bold">×</button>
            </div>
            
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-1 bg-blue-600 rounded-full"></div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Opérationnel</span>
                </div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Assignation Mobile</h2>
                <p className="text-slate-400 text-sm font-medium mt-1">Configurez les horaires de vos ressources.</p>
            </div>
            
            <form onSubmit={handleBulkSubmit} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col">
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-3 tracking-[0.2em] ml-1">Collaborateurs</label>
                        <select multiple className="w-full border-2 border-slate-50 bg-slate-50/50 rounded-3xl p-4 h-44 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm custom-scrollbar" onChange={e => setSelectedEmployees(Array.from(e.target.selectedOptions, option => option.value))}>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id} className="py-2 px-1 rounded-xl mb-1">{emp.first_name} {emp.last_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] uppercase font-black text-slate-400 mb-3 tracking-[0.2em] ml-1">Date d'effet</label>
                            <input type="date" required value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50/50 rounded-2xl p-4 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-black text-sm text-slate-600" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-black text-slate-400 mb-3 tracking-[0.2em] ml-1">Type de Shift</label>
                            <select required value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50/50 rounded-2xl p-4 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-black text-sm text-slate-600">
                                <option value="">Choisir un créneau</option>
                                {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} • {t.start_time.substring(0,5)} - {t.end_time.substring(0,5)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
               </div>
               
               <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Ignorer</button>
                  <button type="submit" className="bg-blue-600 text-white font-black px-10 py-4 rounded-[1.5rem] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all hover:-translate-y-1 text-[11px] uppercase tracking-widest ring-1 ring-blue-400">Confirmer l'Assignation</button>
               </div>
            </form>
          </div>
         </div>
      )}
    </div>
  );
}
