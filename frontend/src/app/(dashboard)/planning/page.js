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
    <div className="max-w-full p-8 animate-in bg-white min-h-full">
      {toast.show && (
        <div className={`fixed bottom-8 right-8 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-right-10 ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900 border border-white/10'}`}>
          <HiOutlineCalendar className="text-xl text-blue-400" />
          <span className="font-bold text-sm tracking-tight">{toast.text}</span>
        </div>
      )}

      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Planning</h1>
          <p className="text-gray-500 font-medium mt-1">Gérez les rotations d'équipes et les shifts par glisser-déposer.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="btn bg-gray-50 text-gray-700 font-bold border border-gray-200 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-gray-100 transition shadow-sm">
            <HiOutlinePrinter size={18} /> Export PDF
          </button>
          <button onClick={() => setShowModal(true)} className="btn bg-blue-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 flex items-center gap-2 transition">
            <HiOutlinePlus size={18} /> Assigner Shift
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50 backdrop-blur-sm">
          <button 
            onClick={() => {
              const prev = new Date(currentWeekStart);
              prev.setDate(prev.getDate() - 7);
              setCurrentWeekStart(prev);
            }}
            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-900"
          >
            ←
          </button>
          <div className="text-center">
            <span className="block text-[10px] uppercase font-black text-blue-500 tracking-widest mb-1">Période Actuelle</span>
            <span className="text-lg font-black text-gray-900 leading-none">
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
            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-900"
          >
            →
          </button>
        </div>

        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-6 border-r min-w-[280px] text-left">
                    <div className="flex items-center gap-2 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                        <HiOutlineUserGroup /> Staff de l'Organisation
                    </div>
                  </th>
                  {days.map((d, i) => (
                    <th key={i} className={`p-4 border-r ${d.toDateString() === new Date().toDateString() ? 'bg-blue-50/30' : ''}`}>
                      <div className="block text-[10px] uppercase font-black text-gray-400 tracking-wider mb-1">
                        {d.toLocaleDateString('fr-FR', { weekday: 'long' })}
                      </div>
                      <div className={`text-sm font-black ${d.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-900'}`}>
                        {d.getDate()} {d.toLocaleDateString('fr-FR', { month: 'short' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b group hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-left border-r bg-white/50">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold shadow-md shadow-blue-100">
                           {emp.first_name[0]}{emp.last_name[0]}
                         </div>
                         <div className="min-w-0">
                           <p className="font-bold text-gray-900 truncate uppercase tracking-tighter text-xs">{emp.first_name} {emp.last_name}</p>
                           <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest leading-none mt-1 opacity-70">
                                {emp.department_name || 'Personnel'}
                            </p>
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
                            opacity: '0.5',
                        },
                    },
                }),
            }}>
              {activeShift ? (
                <div className="rotate-3 scale-105 pointer-events-none w-[120px]">
                  <ShiftCard shift={activeShift} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {showModal && (
         <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Assignation de Shift</h2>
            <p className="text-gray-500 text-sm mb-8 font-medium">Définissez l'horaire pour vos collaborateurs.</p>
            
            <form onSubmit={handleBulkSubmit} className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] uppercase font-black text-gray-400 mb-2 tracking-widest">Collaborateurs</label>
                        <select multiple className="w-full border border-gray-200 rounded-xl p-3 h-32 focus:ring-2 focus:ring-blue-500 outline-none transition" onChange={e => setSelectedEmployees(Array.from(e.target.selectedOptions, option => option.value))}>
                            {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] uppercase font-black text-gray-400 mb-2 tracking-widest">Date</label>
                            <input type="date" required value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-black text-gray-400 mb-2 tracking-widest">Template Shift</label>
                            <select required value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-sm">
                                <option value="">Choisir un horaire</option>
                                {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.start_time} - {t.end_time})</option>
                                ))}
                            </select>
                        </div>
                    </div>
               </div>
               
               <div className="flex justify-end pt-4 gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 font-bold text-gray-400 hover:text-gray-600 transition">Annuler</button>
                  <button type="submit" className="bg-blue-600 text-white font-black px-8 py-3 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition">Confirmer l'Assignation</button>
               </div>
            </form>
          </div>
         </div>
      )}
    </div>
  );
}
