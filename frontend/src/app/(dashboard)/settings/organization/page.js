'use client';

import { useState, useEffect } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
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

const S = {
  btn: 'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer',
  primary: 'bg-[#2D6A4F] text-white hover:bg-[#245c42] border-0',
  secondary: 'bg-white text-[#0F1A10] border border-[rgba(20,34,24,0.15)] hover:bg-[#F5F7F4]',
  th: 'px-4 py-2.5 text-left text-[11px] font-semibold text-[#6B7E6D] uppercase tracking-[0.08em] whitespace-nowrap',
  input: 'w-full border border-[rgba(20,34,24,0.15)] bg-[#F5F7F4] rounded-lg px-3 py-2 text-sm text-[#0F1A10] focus:border-[#2D6A4F] focus:ring-2 focus:ring-[rgba(45,106,79,0.1)] outline-none transition-all',
  label: 'block text-[11px] font-semibold text-[#6B7E6D] mb-1.5 uppercase tracking-[0.06em]',
  iconBtn: 'w-8 h-8 rounded-lg bg-[#F5F7F4] flex items-center justify-center text-[#6B7E6D] transition-colors',
};

const TABS = [
  { id: 'departments', label: 'Départements', singularLabel: 'Département', modalType: 'department', icon: <HiOutlineOfficeBuilding /> },
  { id: 'locations',   label: 'Sites',         singularLabel: 'Site',         modalType: 'location',   icon: <HiOutlineMap /> },
  { id: 'leaves',      label: 'Types Congés',  singularLabel: 'Type de Congé', modalType: 'leaveType', icon: <HiOutlineCalendar /> },
  { id: 'payroll',     label: 'Périodes Paie', singularLabel: 'Période de Paie', modalType: 'payrollPeriod', icon: <HiOutlineCube /> },
];

export default function OrganizationSettingsPage() {
  const [activeTab, setActiveTab] = useState('departments');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'info' });

  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [payrollPeriods, setPayrollPeriods] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({});
  useScrollLock(showModal);

  const fetchData = async (tab = activeTab) => {
    setLoading(true);
    try {
      const map = { departments: '/departments/', locations: '/employees/locations/', leaves: '/leaves/types/', payroll: '/payroll/periods/' };
      const data = await api.get(map[tab]);
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

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    if (item) {
      setEditId(item.id);
      setFormData(item);
    } else {
      setEditId(null);
      const defaults = {
        department: { name: '', description: '' },
        location: { name: '', address: '', city: '' },
        leaveType: { name: '', code: '', days_per_year: 24, is_paid: true, color: '#2D6A4F' },
        payrollPeriod: { name: '', start_date: '', end_date: '', is_closed: false },
      };
      setFormData(defaults[type] || {});
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const map = { departments: '/departments/', locations: '/employees/locations/', leaves: '/leaves/types/', payroll: '/payroll/periods/' };
      const endpoint = map[activeTab];
      if (editId) {
        await api.patch(`${endpoint}${editId}/`, formData);
        setToast({ show: true, text: 'Élément mis à jour avec succès.', type: 'success' });
      } else {
        await api.post(endpoint, formData);
        setToast({ show: true, text: 'Élément créé avec succès.', type: 'success' });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Save error:', err);
      let errorMsg = 'Une erreur est survenue.';
      if (err.details && typeof err.details === 'object') {
        errorMsg = Object.entries(err.details).map(([f, msgs]) => `${f}: ${Array.isArray(msgs) ? msgs.join(' ') : msgs}`).join('\n');
      } else if (err.error) {
        errorMsg = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
      }
      setToast({ show: true, text: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet élément ?')) return;
    setLoading(true);
    try {
      const map = { departments: '/departments/', locations: '/employees/locations/', leaves: '/leaves/types/', payroll: '/payroll/periods/' };
      await api.delete(`${map[activeTab]}${id}/`);
      setToast({ show: true, text: 'Élément supprimé.', type: 'success' });
      fetchData();
    } catch {
      setToast({ show: true, text: 'Impossible de supprimer cet élément.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const activeTabData = TABS.find(t => t.id === activeTab);

  const currentData = { departments, locations, leaves: leaveTypes, payroll: payrollPeriods }[activeTab] || [];

  const colSpanMap = { departments: 4, locations: 4, leaves: 5, payroll: 5 };

  return (
    <div className="min-h-full flex flex-col bg-[#F5F7F4]">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[1000] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-[13px] font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#2D6A4F]'}`}>
          {toast.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamation />}
          {toast.text}
        </div>
      )}

      {/* Header compact */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-[rgba(20,34,24,0.08)]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-[#2D6A4F] uppercase tracking-[0.12em]">Paramètres</span>
          <span className="text-[#0F1A10]/20 text-lg leading-none">·</span>
          <h1 className="text-[15px] font-semibold text-[#0F1A10]">Organisation</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData()} disabled={loading} className={`${S.btn} ${S.secondary}`}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
          <button onClick={() => handleOpenModal(activeTabData.modalType)} className={`${S.btn} ${S.primary}`}>
            <HiOutlinePlus />
            Ajouter {activeTabData.singularLabel}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2.5 bg-white border-b border-[rgba(20,34,24,0.06)] overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[rgba(45,106,79,0.1)] text-[#2D6A4F]'
                : 'text-[#6B7E6D] hover:bg-[#F5F7F4] hover:text-[#0F1A10]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-xl border border-[rgba(20,34,24,0.08)] overflow-hidden">
          {loading && !showModal ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-[3px] border-[#2D6A4F] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F5F7F4]">
                    {activeTab === 'departments' && <>
                      <th className={S.th}>Nom</th>
                      <th className={S.th}>Description</th>
                      <th className={S.th}>Effectif</th>
                      <th className={`${S.th} text-center`} style={{ width: 100 }}>Actions</th>
                    </>}
                    {activeTab === 'locations' && <>
                      <th className={S.th}>Site</th>
                      <th className={S.th}>Adresse</th>
                      <th className={S.th}>Ville</th>
                      <th className={`${S.th} text-center`} style={{ width: 100 }}>Actions</th>
                    </>}
                    {activeTab === 'leaves' && <>
                      <th className={S.th}>Désignation</th>
                      <th className={S.th}>Code</th>
                      <th className={S.th}>Droit annuel</th>
                      <th className={S.th}>Statut</th>
                      <th className={`${S.th} text-center`} style={{ width: 100 }}>Actions</th>
                    </>}
                    {activeTab === 'payroll' && <>
                      <th className={S.th}>Période</th>
                      <th className={S.th}>Du</th>
                      <th className={S.th}>Au</th>
                      <th className={S.th}>Statut</th>
                      <th className={`${S.th} text-center`} style={{ width: 100 }}>Actions</th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'departments' && departments.map(item => (
                    <tr key={item.id} className="border-b border-[rgba(20,34,24,0.05)] hover:bg-[rgba(45,106,79,0.03)] transition-colors">
                      <td className="px-4 py-3 text-[13px] font-medium text-[#0F1A10]">{item.name}</td>
                      <td className="px-4 py-3 text-[13px] text-[#6B7E6D]">{item.description || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[rgba(20,34,24,0.06)] text-[#6B7E6D] text-xs font-semibold">{item.employee_count || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button className={`${S.iconBtn} hover:bg-[rgba(45,106,79,0.1)] hover:text-[#2D6A4F]`} onClick={() => handleOpenModal('department', item)}><HiOutlinePencil className="text-sm" /></button>
                          <button className={`${S.iconBtn} hover:bg-red-50 hover:text-red-500`} onClick={() => handleDelete(item.id)}><HiOutlineTrash className="text-sm" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {activeTab === 'locations' && locations.map(item => (
                    <tr key={item.id} className="border-b border-[rgba(20,34,24,0.05)] hover:bg-[rgba(45,106,79,0.03)] transition-colors">
                      <td className="px-4 py-3 text-[13px] font-medium text-[#0F1A10]">{item.name}</td>
                      <td className="px-4 py-3 text-[13px] text-[#6B7E6D]">{item.address || '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-[#6B7E6D]">{item.city || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button className={`${S.iconBtn} hover:bg-[rgba(45,106,79,0.1)] hover:text-[#2D6A4F]`} onClick={() => handleOpenModal('location', item)}><HiOutlinePencil className="text-sm" /></button>
                          <button className={`${S.iconBtn} hover:bg-red-50 hover:text-red-500`} onClick={() => handleDelete(item.id)}><HiOutlineTrash className="text-sm" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {activeTab === 'leaves' && leaveTypes.map(item => (
                    <tr key={item.id} className="border-b border-[rgba(20,34,24,0.05)] hover:bg-[rgba(45,106,79,0.03)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-[13px] font-medium text-[#0F1A10]">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] text-[#6B7E6D]">{item.code}</td>
                      <td className="px-4 py-3 text-[13px] text-[#6B7E6D]">{item.days_per_year} jours</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${item.is_paid ? 'bg-[rgba(45,106,79,0.1)] text-[#2D6A4F]' : 'bg-[rgba(201,168,76,0.1)] text-[#8B7035]'}`}>
                          {item.is_paid ? 'Payé' : 'Non payé'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button className={`${S.iconBtn} hover:bg-[rgba(45,106,79,0.1)] hover:text-[#2D6A4F]`} onClick={() => handleOpenModal('leaveType', item)}><HiOutlinePencil className="text-sm" /></button>
                          <button className={`${S.iconBtn} hover:bg-red-50 hover:text-red-500`} onClick={() => handleDelete(item.id)}><HiOutlineTrash className="text-sm" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {activeTab === 'payroll' && payrollPeriods.map(item => (
                    <tr key={item.id} className="border-b border-[rgba(20,34,24,0.05)] hover:bg-[rgba(45,106,79,0.03)] transition-colors">
                      <td className="px-4 py-3 text-[13px] font-medium text-[#0F1A10]">{item.name}</td>
                      <td className="px-4 py-3 text-[13px] text-[#6B7E6D]">{new Date(item.start_date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3 text-[13px] text-[#6B7E6D]">{new Date(item.end_date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${item.is_closed ? 'bg-[rgba(20,34,24,0.06)] text-[#6B7E6D]' : 'bg-[rgba(45,106,79,0.1)] text-[#2D6A4F]'}`}>
                          {item.is_closed ? 'Clôturée' : 'Ouverte'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button className={`${S.iconBtn} hover:bg-[rgba(45,106,79,0.1)] hover:text-[#2D6A4F]`} onClick={() => handleOpenModal('payrollPeriod', item)}><HiOutlinePencil className="text-sm" /></button>
                          <button className={`${S.iconBtn} hover:bg-red-50 hover:text-red-500`} onClick={() => handleDelete(item.id)}><HiOutlineTrash className="text-sm" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!loading && currentData.length === 0 && (
                    <tr>
                      <td colSpan={colSpanMap[activeTab]} className="px-4 py-14 text-center text-[13px] text-[#6B7E6D]">
                        Aucun élément. Cliquez sur &quot;Ajouter&quot; pour commencer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <h2>{editId ? 'Modifier' : 'Ajouter'} {activeTabData.singularLabel}</h2>
                <p>{editId ? 'Modifier les informations existantes.' : 'Créer un nouvel élément.'}</p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'contents' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Department */}
                {modalType === 'department' && <>
                  <div className="input-group">
                    <label htmlFor="org-name">Nom du Département *</label>
                    <input id="org-name" className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Ressources Humaines" />
                  </div>
                  <div className="input-group">
                    <label htmlFor="org-desc">Description (optionnel)</label>
                    <textarea id="org-desc" className="input" style={{ minHeight: 80, resize: 'none' }} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Courte description..." />
                  </div>
                </>}

                {/* Location */}
                {modalType === 'location' && <>
                  <div className="input-group">
                    <label htmlFor="loc-name">Nom du Site *</label>
                    <input id="loc-name" className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Siège Social" />
                  </div>
                  <div className="input-group">
                    <label htmlFor="loc-addr">Adresse</label>
                    <input id="loc-addr" className="input" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Rue, Quartier..." />
                  </div>
                  <div className="input-group">
                    <label htmlFor="loc-city">Ville</label>
                    <input id="loc-city" className="input" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Ex: Libreville" />
                  </div>
                </>}

                {/* Leave Type */}
                {modalType === 'leaveType' && <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="input-group">
                      <label htmlFor="lt-name">Désignation *</label>
                      <input id="lt-name" className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Congé Annuel" />
                    </div>
                    <div className="input-group">
                      <label htmlFor="lt-code">Code *</label>
                      <input id="lt-code" className="input" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} required placeholder="Ex: CA" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="input-group">
                      <label htmlFor="lt-days">Jours par an *</label>
                      <input id="lt-days" className="input" type="number" value={formData.days_per_year || ''} onChange={e => setFormData({...formData, days_per_year: e.target.value})} required />
                    </div>
                    <div className="input-group">
                      <label htmlFor="lt-color">Couleur</label>
                      <input id="lt-color" className="input" style={{ height: 40, padding: 4 }} type="color" value={formData.color || '#2D6A4F'} onChange={e => setFormData({...formData, color: e.target.value})} />
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" style={{ width: 16, height: 16 }} checked={formData.is_paid || false} onChange={e => setFormData({...formData, is_paid: e.target.checked})} />
                    <span style={{ fontSize: '0.87rem', color: 'var(--text-primary)' }}>Congé rémunéré (payé)</span>
                  </label>
                </>}

                {/* Payroll Period */}
                {modalType === 'payrollPeriod' && <>
                  <div className="input-group">
                    <label htmlFor="pp-name">Nom de la Période *</label>
                    <input id="pp-name" className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Mars 2026" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="input-group">
                      <label htmlFor="pp-start">Début *</label>
                      <input id="pp-start" className="input" type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
                    </div>
                    <div className="input-group">
                      <label htmlFor="pp-end">Fin *</label>
                      <input id="pp-end" className="input" type="date" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} required />
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" style={{ width: 16, height: 16 }} checked={formData.is_closed || false} onChange={e => setFormData({...formData, is_closed: e.target.checked})} />
                    <span style={{ fontSize: '0.87rem', color: 'var(--text-primary)' }}>Considérer comme clôturée</span>
                  </label>
                </>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
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
