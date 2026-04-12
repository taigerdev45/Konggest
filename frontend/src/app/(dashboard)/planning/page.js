'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { HiOutlineCalendar, HiOutlinePrinter, HiOutlinePlus, HiOutlineUserGroup } from 'react-icons/hi';

export default function PlanningPage() {
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, text: '', type: 'info' });
  
  // Date states (simple week view mock logic)
  const today = new Date();
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date(today.setDate(today.getDate() - today.getDay() + 1)));

  // Bulk Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const fetchPlannings = async () => {
    try {
      // Fetch current week basically
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
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDependencies();
    fetchPlannings();

    // R6 : Websocket Realtime
    // NOTE: This usually listens to a specific organization channel but for brevity we use public
    const tenant_id = localStorage.getItem('tenant_id') || '*'; 
    const channel = supabase
      .channel(`planning:${tenant_id}`)
      .on('broadcast', { event: 'schedule.published' }, (payload) => {
        setToast({ 
          show: true, 
          text: `Planning publié : ${payload.payload.employee} le ${payload.payload.date} (${payload.payload.start}-${payload.payload.end})`,
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

  const handleExport = async () => {
    try {
      setToast({ show: true, text: "Génération du PDF en cours...", type: "info" });
      const month = selectedDate ? selectedDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
      await api.get(`/planning/schedules/export-pdf/?month=${month}`);
      setToast({ show: true, text: "Génération lancée asynchronement via Celery.", type: "success" });
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
        status: 'published' // Publish immediately for the demo
      });
      setShowModal(false);
      fetchPlannings();
      setToast({ show: true, text: "Assignation réussie", type: "success" });
      setTimeout(() => setToast({ show: false, text: '' }), 3000);
    } catch (err) {
      alert("Erreur");
    }
  };

  // Generate 7 days headers
  const days = Array.from({length: 7}).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 animate-in">
      {toast.show && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-2xl flex items-center gap-3 text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-blue-600'}`}>
          <HiOutlineCalendar className="text-xl" />
          <span className="font-medium">{toast.text}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Planning & Rotations</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez les horaires d'équipes et les shifts.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 border">
            <HiOutlinePrinter /> Export PDF Mensuel
          </button>
          <button onClick={() => setShowModal(true)} className="btn bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center gap-2">
            <HiOutlinePlus /> Assigner Shift
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <button 
            onClick={() => {
              const prev = new Date(currentWeekStart);
              prev.setDate(prev.getDate() - 7);
              setCurrentWeekStart(prev);
            }}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-100"
          >
            Semaine Précédente
          </button>
          <span className="font-semibold text-gray-700">
            Semaine du {currentWeekStart.toLocaleDateString()}
          </span>
          <button 
            onClick={() => {
              const next = new Date(currentWeekStart);
              next.setDate(next.getDate() + 7);
              setCurrentWeekStart(next);
            }}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-100"
          >
            Semaine Suivante
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 border-r min-w-[200px] text-left text-gray-500 uppercase text-xs tracking-wider">Employé</th>
                {days.map((d, i) => (
                  <th key={i} className="p-3 border-r text-gray-500 uppercase text-xs tracking-wider">
                    {d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, 10).map(emp => (
                <tr key={emp.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-left border-r font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                       <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                         {emp.first_name[0]}{emp.last_name[0]}
                       </span>
                       <div>
                         <p>{emp.first_name} {emp.last_name}</p>
                         <p className="text-xs text-gray-400">{emp.department_name || 'Sans dépt'}</p>
                       </div>
                    </div>
                  </td>
                  {days.map((d, i) => {
                    // Trouver le planning pour ce jour et cet employé
                    const s = schedules.find(sched => sched.employee === emp.id && sched.date === d.toISOString().split('T')[0]);
                    return (
                      <td key={i} className="p-2 border-r relative">
                        {s ? (
                          <div className={`p-2 rounded-lg text-xs font-semibold ${s.status === 'published' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-yellow-100 text-yellow-800 border border-yellow-300'}`}>
                             {s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}
                          </div>
                        ) : (
                          <div className="text-gray-300 text-xs">-</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 relative">
            <h2 className="text-xl font-bold mb-4">Assignation Multiple (Shifts)</h2>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium mb-1">Employés</label>
                  <select multiple className="w-full border rounded p-2" onChange={e => setSelectedEmployees(Array.from(e.target.selectedOptions, option => option.value))}>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Maintenez Ctrl/Cmd pour sélectionner plusieurs employés.</p>
               </div>
               
               <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" required value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full border rounded p-2" />
               </div>

               <div>
                  <label className="block text-sm font-medium mb-1">Template de Rotation</label>
                  <select required value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="w-full border rounded p-2">
                    <option value="">Sélectionnez un horaire (Shift)</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.start_time} - {t.end_time})</option>
                    ))}
                  </select>
               </div>
               
               <div className="flex justify-end pt-4 gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn px-4 py-2 border rounded hover:bg-gray-100">Annuler</button>
                  <button type="submit" className="btn bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700">Assigner & Publier</button>
               </div>
            </form>
          </div>
         </div>
      )}
    </div>
  );
}
