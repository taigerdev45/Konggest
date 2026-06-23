'use client';

import { useState, useEffect } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
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

const S = {
  btn: 'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer',
  primary: 'bg-[#2D6A4F] text-white hover:bg-[#245c42] border-0',
  secondary: 'bg-white text-[#0F1A10] border border-[rgba(20,34,24,0.15)] hover:bg-[#F5F7F4]',
  input: 'w-full border border-[rgba(20,34,24,0.15)] bg-[#F5F7F4] rounded-lg px-3 py-2 text-sm text-[#0F1A10] focus:border-[#2D6A4F] focus:ring-2 focus:ring-[rgba(45,106,79,0.1)] outline-none transition-all',
  label: 'block text-[11px] font-semibold text-[#6B7E6D] mb-1.5 uppercase tracking-[0.06em]',
};

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
  useScrollLock(showModal);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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
      const [empRes, tplRes] = await Promise.all([api.get('/employees/'), api.get('/planning/templates/')]);
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
        setToast({ show: true, text: `Planning publié : ${payload.payload.employee}`, type: 'success' });
        setTimeout(() => setToast({ show: false, text: '' }), 5000);
        fetchPlannings();
      })
      .on('broadcast', { event: 'schedule.moved' }, (payload) => {
        const { id, date, employee_id, employee } = payload.payload;
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, date, employee: employee_id } : s));
        setToast({ show: true, text: `Shift de ${employee} déplacé`, type: 'info' });
        setTimeout(() => setToast({ show: false, text: '' }), 4000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentWeekStart]);

  const handleDragStart = (event) => {
    setActiveShift(event.active.data.current.shift);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveShift(null);
    if (!over) return;

    const shift = active.data.current.shift;
    const { employeeId, day } = over.data.current;

    if (shift.date !== day || shift.employee !== employeeId) {
      setSchedules(prev => prev.map(s => s.id === shift.id ? { ...s, date: day, employee: employeeId } : s));
      try {
        await api.patch(`/planning/schedules/${shift.id}/`, { date: day, employee: employeeId });
        setToast({ show: true, text: 'Shift déplacé avec succès', type: 'success' });
        setTimeout(() => setToast({ show: false, text: '' }), 3000);
      } catch {
        setToast({ show: true, text: 'Erreur lors du déplacement', type: 'error' });
        fetchPlannings();
      }
    }
  };

  const handleExport = async () => {
    setToast({ show: true, text: 'Génération du PDF...', type: 'info' });
    const month = currentWeekStart.toISOString().substring(0, 7);
    try {
      await api.get(`/planning/schedules/export-pdf/?month=${month}`);
      setToast({ show: true, text: 'Fichier généré (arrière-plan)', type: 'success' });
    } catch {
      setToast({ show: true, text: "Erreur lors de l'export", type: 'error' });
    }
    setTimeout(() => setToast({ show: false, text: '' }), 4000);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplate || selectedEmployees.length === 0 || !selectedDate) {
      alert('Veuillez remplir tous les champs !');
      return;
    }
    const tpl = templates.find(t => t.id === parseInt(selectedTemplate));
    try {
      await api.post('/planning/schedules/bulk-create/', {
        employee_ids: selectedEmployees.map(id => parseInt(id)),
        date: selectedDate,
        start_time: tpl.start_time,
        end_time: tpl.end_time,
        status: 'published',
      });
      setShowModal(false);
      fetchPlannings();
      setToast({ show: true, text: 'Assignation réussie', type: 'success' });
      setTimeout(() => setToast({ show: false, text: '' }), 3000);
    } catch {
      alert('Erreur');
    }
  };

  const handleQuickAdd = (employeeId, day) => {
    setSelectedEmployees([employeeId]);
    setSelectedDate(day);
    setShowModal(true);
  };

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-[3px] border-[#2D6A4F] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-full flex flex-col bg-[#F5F7F4]">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-[13px] font-medium ${toast.type === 'error' ? 'bg-red-500' : toast.type === 'info' ? 'bg-[#6B7E6D]' : 'bg-[#2D6A4F]'}`}>
          <HiOutlineCalendar className="text-sm" />
          {toast.text}
        </div>
      )}

      {/* Header compact */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-[rgba(20,34,24,0.08)]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-[#2D6A4F] uppercase tracking-[0.12em]">Planification</span>
          <span className="text-[#0F1A10]/20 text-lg leading-none">·</span>
          <h1 className="text-[15px] font-semibold text-[#0F1A10]">Planning RH</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className={`${S.btn} ${S.secondary}`}>
            <HiOutlinePrinter className="text-sm" /> Export PDF
          </button>
          <button onClick={() => setShowModal(true)} className={`${S.btn} ${S.primary}`}>
            <HiOutlinePlus className="text-sm" /> Assigner
          </button>
        </div>
      </header>

      {/* Week nav strip */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-[rgba(20,34,24,0.06)]">
        <button
          onClick={() => { const p = new Date(currentWeekStart); p.setDate(p.getDate() - 7); setCurrentWeekStart(p); }}
          className="w-8 h-8 rounded-lg bg-[#F5F7F4] text-[#6B7E6D] hover:bg-[rgba(45,106,79,0.08)] hover:text-[#2D6A4F] flex items-center justify-center transition-colors font-medium"
          aria-label="Semaine précédente"
        >‹</button>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[11px] font-semibold text-[#6B7E6D] uppercase tracking-[0.08em]">Période active</span>
          <span className="text-[13px] font-semibold text-[#0F1A10]">
            {currentWeekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} — {weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <button
          onClick={() => { const n = new Date(currentWeekStart); n.setDate(n.getDate() + 7); setCurrentWeekStart(n); }}
          className="w-8 h-8 rounded-lg bg-[#F5F7F4] text-[#6B7E6D] hover:bg-[rgba(45,106,79,0.08)] hover:text-[#2D6A4F] flex items-center justify-center transition-colors font-medium"
          aria-label="Semaine suivante"
        >›</button>
      </div>

      {/* Grid */}
      <div className="flex-1 p-6 flex flex-col">
        <div className="bg-white rounded-xl border border-[rgba(20,34,24,0.08)] overflow-hidden flex flex-col flex-1">
          <div className="flex-1 overflow-auto">
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-[30]">
                  <tr className="bg-[#F5F7F4]">
                    <th className="px-4 py-3 border-r border-b border-[rgba(20,34,24,0.06)] min-w-[200px] text-left sticky left-0 z-[35] bg-[#F5F7F4]">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-[#6B7E6D] uppercase tracking-[0.08em]">
                        <HiOutlineUserGroup className="text-[#2D6A4F]" /> Collaborateurs
                      </div>
                    </th>
                    {days.map((d, i) => {
                      const isToday = d.toDateString() === new Date().toDateString();
                      return (
                        <th key={i} className={`px-4 py-3 border-r border-b border-[rgba(20,34,24,0.06)] min-w-[150px] text-center ${isToday ? 'bg-[rgba(45,106,79,0.06)]' : ''}`}>
                          <div className="text-[10px] font-semibold text-[#6B7E6D] uppercase tracking-[0.08em] mb-0.5">
                            {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                          </div>
                          <div className={`text-[13px] font-semibold ${isToday ? 'text-[#2D6A4F]' : 'text-[#0F1A10]'}`}>
                            {d.getDate()} <span className="text-[11px] font-normal text-[#6B7E6D]">{d.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="group hover:bg-[rgba(45,106,79,0.03)] transition-colors">
                      <td className="px-4 py-3 border-r border-b border-[rgba(20,34,24,0.05)] bg-white group-hover:bg-[rgba(45,106,79,0.02)] transition-colors sticky left-0 z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[rgba(45,106,79,0.1)] text-[#2D6A4F] flex items-center justify-center text-xs font-bold flex-shrink-0 group-hover:bg-[#2D6A4F] group-hover:text-white transition-colors">
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#0F1A10] truncate">{emp.first_name} {emp.last_name}</p>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${emp.is_active ? 'bg-[#2D6A4F]' : 'bg-gray-300'}`} />
                              <p className="text-[11px] text-[#6B7E6D] truncate">{emp.department_name || 'Général'}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      {days.map((d, i) => {
                        const dayStr = d.toISOString().split('T')[0];
                        const s = schedules.find(sched => sched.employee === emp.id && sched.date === dayStr);
                        return (
                          <PlanningCell key={i} day={dayStr} employeeId={emp.id} shift={s} onAdd={handleQuickAdd} />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
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

      {/* Modal assignation */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div>
                <h2>Assignation de shift</h2>
                <p>Configurez les horaires de vos ressources.</p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleBulkSubmit} style={{ display: 'contents' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="input-group">
                  <label htmlFor="plan-emps">Collaborateurs <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>(Ctrl+clic pour plusieurs)</span></label>
                  <select
                    id="plan-emps"
                    multiple
                    className="input"
                    style={{ height: 140 }}
                    onChange={e => setSelectedEmployees(Array.from(e.target.selectedOptions, o => o.value))}
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label htmlFor="plan-date">Date d&apos;effet *</label>
                    <input id="plan-date" className="input" type="date" required value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label htmlFor="plan-tpl">Type de Shift *</label>
                    <select id="plan-tpl" className="input" required value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                      <option value="">Choisir un créneau</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} • {t.start_time.substring(0, 5)} - {t.end_time.substring(0, 5)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Confirmer l&apos;Assignation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
