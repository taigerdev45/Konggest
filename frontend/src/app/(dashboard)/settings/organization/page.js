'use client';

import { useState, useEffect } from 'react';
import { 
  HiOutlineOfficeBuilding, 
  HiOutlineMap, 
  HiOutlineCalendar, 
  HiOutlineCube, 
  HiOutlinePlus, 
  HiOutlineTrash, 
  HiOutlinePencil,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineRefresh
} from 'react-icons/hi';
import api from '@/lib/api';

export default function OrganizationSettingsPage() {
  const [activeTab, setActiveTab] = useState('departments');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'info' });
  
  // Data states
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'department', 'location', 'leaveType', 'payrollPeriod'
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({});

  const fetchData = async (tab = activeTab) => {
    setLoading(true);
    try {
      let endpoint = '';
      switch (tab) {
        case 'departments': endpoint = '/departments/'; break;
        case 'locations': endpoint = '/employees/locations/'; break;
        case 'leaves': endpoint = '/leaves/types/'; break;
        case 'payroll': endpoint = '/payroll/periods/'; break;
      }
      
      const data = await api.get(endpoint);
      const results = data.results || data || [];
      
      if (tab === 'departments') setDepartments(results);
      else if (tab === 'locations') setLocations(results);
      else if (tab === 'leaves') setLeaveTypes(results);
      else if (tab === 'payroll') setPayrollPeriods(results);
      
    } catch (err) {
      console.error(`Error fetching ${tab}:`, err);
      setToast({ show: true, text: 'Erreur lors de la récupération des données.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    if (item) {
      setEditId(item.id);
      setFormData(item);
    } else {
      setEditId(null);
      // Default values
      if (type === 'department') setFormData({ name: '', description: '' });
      else if (type === 'location') setFormData({ name: '', address: '', city: '' });
      else if (type === 'leaveType') setFormData({ name: '', code: '', days_per_year: 24, is_paid: true, color: '#059669' });
      else if (type === 'payrollPeriod') setFormData({ name: '', start_date: '', end_date: '', is_closed: false });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let endpoint = '';
      if (activeTab === 'departments') endpoint = '/departments/';
      else if (activeTab === 'locations') endpoint = '/employees/locations/';
      else if (activeTab === 'leaves') endpoint = '/leaves/types/';
      else if (activeTab === 'payroll') endpoint = '/payroll/periods/';

      if (editId) {
        await api.patch(`${endpoint}${editId}/`, formData);
        setToast({ show: true, text: 'Élément mis à jour avec succès.', type: 'success' });
      } else {
        await api.post(endpoint, formData);
        setToast({ show: true, text: 'Nouvel élément créé avec succès.', type: 'success' });
      }
      
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Save error:', err);
      // Format DRF Error response
      let errorMsg = 'Une erreur est survenue.';
      if (err.details && typeof err.details === 'object') {
        errorMsg = Object.entries(err.details)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(' ') : msgs}`)
          .join('\n');
      } else if (err.error) {
        errorMsg = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
      }
      setToast({ show: true, text: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    
    setLoading(true);
    try {
      let endpoint = '';
      if (activeTab === 'departments') endpoint = '/departments/';
      else if (activeTab === 'locations') endpoint = '/employees/locations/';
      else if (activeTab === 'leaves') endpoint = '/leaves/types/';
      else if (activeTab === 'payroll') endpoint = '/payroll/periods/';

      await api.delete(`${endpoint}${id}/`);
      setToast({ show: true, text: 'Élément supprimé.', type: 'success' });
      fetchData();
    } catch (err) {
      setToast({ show: true, text: 'Impossible de supprimer cet élément.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { id: 'departments', label: 'Départements', singularLabel: 'Département', modalType: 'department', icon: <HiOutlineOfficeBuilding />, color: 'blue' },
    { id: 'locations', label: 'Lieux / Sites', singularLabel: 'Lieu / Site', modalType: 'location', icon: <HiOutlineMap />, color: 'purple' },
    { id: 'leaves', label: 'Types de Congés', singularLabel: 'Type de Congé', modalType: 'leaveType', icon: <HiOutlineCalendar />, color: 'emerald' },
    { id: 'payroll', label: 'Périodes de Paie', singularLabel: 'Période de Paie', modalType: 'payrollPeriod', icon: <HiOutlineCube />, color: 'indigo' },
  ];

  const activeTabData = TABS.find(tab => tab.id === activeTab);
  const COLORS = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
  };

  return (
    <div className="min-h-full flex flex-col bg-[#FDFDFF]">
      {toast.show && (
        <div className={`fixed bottom-8 right-8 z-[1000] px-6 py-4 rounded-[2rem] shadow-xl flex items-center gap-3 text-white animate-in slide-in-from-right-10 ${toast.type === 'error' ? 'bg-red-500/95' : 'bg-emerald-500/95'}`}>
          {toast.type === 'success' ? <HiOutlineCheckCircle className="text-xl" /> : <HiOutlineExclamation className="text-xl" />}
          <span className="font-bold">{toast.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="px-6 md:px-12 pt-8 md:pt-12 pb-8 md:pb-10 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div className="animate-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-1 bg-blue-500 rounded-full"></div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">CONFIGURATION</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-3">
            Organisation
          </h1>
          <p className="text-gray-400 font-medium text-sm md:text-base max-w-lg">
            Gérer les structures et les paramètres de votre entreprise.
          </p>
        </div>
        <div className="flex gap-3 animate-in slide-in-from-right-4 duration-700">
          <button 
            onClick={() => fetchData()} 
            disabled={loading}
            className="flex-1 md:flex-none bg-white text-gray-900 border border-gray-100 px-6 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
          >
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
          <button 
            onClick={() => handleOpenModal(activeTabData.modalType)}
            className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 ring-1 ring-blue-400/50 flex items-center gap-2"
          >
            <HiOutlinePlus size={18} />
            Ajouter {activeTabData.singularLabel}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 md:px-12 pb-8">
        <div className="flex gap-2 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                activeTab === tab.id 
                  ? `${COLORS[tab.color].bg} ${COLORS[tab.color].text} border-2 ${COLORS[tab.color].border} shadow-md shadow-${tab.color}-500/10` 
                  : 'bg-white text-gray-400 border-2 border-transparent hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-12 pb-12 flex-1">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
          {loading && !showModal ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/30 sticky top-0 z-10">
                  {activeTab === 'departments' && (
                    <tr>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Nom</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Description</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Collaborateurs</th>
                      <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100" style={{ width: '120px' }}>Actions</th>
                    </tr>
                  )}
                  {activeTab === 'locations' && (
                    <tr>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Lieu / Site</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Adresse</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Ville</th>
                      <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100" style={{ width: '120px' }}>Actions</th>
                    </tr>
                  )}
                  {activeTab === 'leaves' && (
                    <tr>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Désignation</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Code</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Droit Annuel</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Statut</th>
                      <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100" style={{ width: '120px' }}>Actions</th>
                    </tr>
                  )}
                  {activeTab === 'payroll' && (
                    <tr>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Période</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Du</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Au</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">Statut</th>
                      <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100" style={{ width: '120px' }}>Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {/* Departments List */}
                  {activeTab === 'departments' && departments.map(item => (
                    <tr key={item.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                      <td className="px-8 py-6 border-b border-gray-50 font-black text-gray-900">{item.name}</td>
                      <td className="px-8 py-6 border-b border-gray-50 text-gray-500 font-medium">{item.description || '—'}</td>
                      <td className="px-8 py-6 border-b border-gray-50">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600">{item.employee_count || 0}</span>
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50">
                        <div className="flex items-center justify-center gap-2">
                          <button className="w-10 h-10 rounded-[1.25rem] bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center" onClick={() => handleOpenModal('department', item)}>
                            <HiOutlinePencil />
                          </button>
                          <button className="w-10 h-10 rounded-[1.25rem] bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center" onClick={() => handleDelete(item.id)}>
                            <HiOutlineTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Locations List */}
                  {activeTab === 'locations' && locations.map(item => (
                    <tr key={item.id} className="group hover:bg-purple-50/30 transition-all duration-300">
                      <td className="px-8 py-6 border-b border-gray-50 font-black text-gray-900">{item.name}</td>
                      <td className="px-8 py-6 border-b border-gray-50 text-gray-500 font-medium">{item.address || '—'}</td>
                      <td className="px-8 py-6 border-b border-gray-50 text-gray-500 font-medium">{item.city || '—'}</td>
                      <td className="px-8 py-6 border-b border-gray-50">
                        <div className="flex items-center justify-center gap-2">
                          <button className="w-10 h-10 rounded-[1.25rem] bg-gray-50 text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-all flex items-center justify-center" onClick={() => handleOpenModal('location', item)}>
                            <HiOutlinePencil />
                          </button>
                          <button className="w-10 h-10 rounded-[1.25rem] bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center" onClick={() => handleDelete(item.id)}>
                            <HiOutlineTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Leaves List */}
                  {activeTab === 'leaves' && leaveTypes.map(item => (
                    <tr key={item.id} className="group hover:bg-emerald-50/30 transition-all duration-300">
                      <td className="px-8 py-6 border-b border-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="font-black text-gray-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50 font-mono text-gray-600 font-bold">{item.code}</td>
                      <td className="px-8 py-6 border-b border-gray-50 text-gray-600 font-medium">{item.days_per_year} jours</td>
                      <td className="px-8 py-6 border-b border-gray-50">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.is_paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {item.is_paid ? 'Payé' : 'Non payé'}
                        </span>
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50">
                        <div className="flex items-center justify-center gap-2">
                          <button className="w-10 h-10 rounded-[1.25rem] bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all flex items-center justify-center" onClick={() => handleOpenModal('leaveType', item)}>
                            <HiOutlinePencil />
                          </button>
                          <button className="w-10 h-10 rounded-[1.25rem] bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center" onClick={() => handleDelete(item.id)}>
                            <HiOutlineTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Payroll Periods List */}
                  {activeTab === 'payroll' && payrollPeriods.map(item => (
                    <tr key={item.id} className="group hover:bg-indigo-50/30 transition-all duration-300">
                      <td className="px-8 py-6 border-b border-gray-50 font-black text-gray-900">{item.name}</td>
                      <td className="px-8 py-6 border-b border-gray-50 text-gray-500 font-medium">{new Date(item.start_date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-8 py-6 border-b border-gray-50 text-gray-500 font-medium">{new Date(item.end_date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-8 py-6 border-b border-gray-50">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.is_closed ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'}`}>
                          {item.is_closed ? 'Clôturée' : 'Ouverte'}
                        </span>
                      </td>
                      <td className="px-8 py-6 border-b border-gray-50">
                        <div className="flex items-center justify-center gap-2">
                          <button className="w-10 h-10 rounded-[1.25rem] bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center" onClick={() => handleOpenModal('payrollPeriod', item)}>
                            <HiOutlinePencil />
                          </button>
                          <button className="w-10 h-10 rounded-[1.25rem] bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center" onClick={() => handleDelete(item.id)}>
                            <HiOutlineTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!loading && (
                    ((activeTab === 'departments' && departments.length === 0) ||
                    (activeTab === 'locations' && locations.length === 0) ||
                    (activeTab === 'leaves' && leaveTypes.length === 0) ||
                    (activeTab === 'payroll' && payrollPeriods.length === 0))
                  ) && (
                    <tr>
                      <td colSpan={activeTab === 'departments' || activeTab === 'locations' || activeTab === 'payroll' ? 4 : 5} className="px-8 py-20 text-center">
                        <div className="text-gray-400 font-medium">Aucun élément trouvé. Cliquez sur "Ajouter" pour commencer.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] max-w-2xl w-full p-8 md:p-12 relative shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="absolute top-8 right-8">
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center font-black">✕</button>
            </div>
            
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-1 bg-blue-500 rounded-full"></div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{editId ? 'MODIFICATION' : 'NOUVEAU'}</span>
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{editId ? 'Modifier' : 'Ajouter'} {activeTabData.singularLabel}</h2>
              <p className="text-gray-400 text-sm font-medium mt-1">Enregistrez les paramètres de votre organisation.</p>
            </div>
            
            <form onSubmit={handleSave} className="space-y-6">
              {/* Department Form */}
              {modalType === 'department' && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Nom du Département</label>
                    <input className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Ressources Humaines" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Description (Optionnel)</label>
                    <textarea className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm min-h-[100px]" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Courte description..." ></textarea>
                  </div>
                </>
              )}

              {/* Location Form */}
              {modalType === 'location' && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Nom du Site</label>
                    <input className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/5 outline-none transition-all font-bold text-sm" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Siège Social / Site POG" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Adresse</label>
                    <input className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/5 outline-none transition-all font-bold text-sm" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Rue, Quartier..." />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Ville</label>
                    <input className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/5 outline-none transition-all font-bold text-sm" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Ex: Libreville" />
                  </div>
                </>
              )}

              {/* Leave Type Form */}
              {modalType === 'leaveType' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Désignation</label>
                      <input className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Congé Annuel" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Code (Court)</label>
                      <input className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} required placeholder="Ex: CA" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Jours par an</label>
                      <input className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm" type="number" value={formData.days_per_year || ''} onChange={e => setFormData({...formData, days_per_year: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Couleur</label>
                      <input className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-2 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all" type="color" value={formData.color || '#059669'} onChange={e => setFormData({...formData, color: e.target.value})} style={{ height: '56px' }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <input type="checkbox" id="is_paid" className="w-5 h-5 rounded-lg text-emerald-600" checked={formData.is_paid || false} onChange={e => setFormData({...formData, is_paid: e.target.checked})} />
                    <label htmlFor="is_paid" className="text-sm font-bold text-gray-700 cursor-pointer">Congé rémunéré (Payé)</label>
                  </div>
                </>
              )}

              {/* Payroll Period Form */}
              {modalType === 'payrollPeriod' && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Nom de la Période</label>
                    <input className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-bold text-sm" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Mars 2026" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Début</label>
                      <input className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-bold text-sm" type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Fin</label>
                      <input className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-2xl p-4 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-bold text-sm" type="date" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} required />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <input type="checkbox" id="is_closed" className="w-5 h-5 rounded-lg text-indigo-600" checked={formData.is_closed || false} onChange={e => setFormData({...formData, is_closed: e.target.checked})} />
                    <label htmlFor="is_closed" className="text-sm font-bold text-gray-700 cursor-pointer">Considérer comme clôturée</label>
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="bg-blue-600 text-white font-black px-10 py-4 rounded-[1.5rem] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all hover:-translate-y-1 text-[11px] uppercase tracking-widest ring-1 ring-blue-400">
                  {loading ? 'Enregistrement...' : editId ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
