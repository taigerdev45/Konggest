'use client';

/**
 * Konggest — Organization Configuration Page
 * Centralized dashboard for managing departments, leave types, locations, and pay periods.
 */
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
  HiOutlineRefresh,
  HiOutlineSearch
} from 'react-icons/hi';
import api from '@/lib/api';

export default function OrganizationSettingsPage() {
  const [activeTab, setActiveTab] = useState('departments');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
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

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

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
      showToast('error', 'Erreur lors de la récupération des données.');
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
        showToast('success', 'Élément mis à jour avec succès.');
      } else {
        await api.post(endpoint, formData);
        showToast('success', 'Nouvel élément créé avec succès.');
      }
      
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Save error:', err);
      showToast('error', err.error || 'Une erreur est survenue lors de l\'enregistrement.');
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
      showToast('success', 'Élément supprimé.');
      fetchData();
    } catch (err) {
      showToast('error', 'Impossible de supprimer cet élément.');
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { id: 'departments', label: 'Départements', icon: <HiOutlineOfficeBuilding /> },
    { id: 'locations', label: 'Lieux / Sites', icon: <HiOutlineMap /> },
    { id: 'leaves', label: 'Types de Congés', icon: <HiOutlineCalendar /> },
    { id: 'payroll', label: 'Périodes de Paie', icon: <HiOutlineCube /> },
  ];

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Configuration Entreprise</h1>
          <p>Personnalisez les structures et règles de votre organisation.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => handleOpenModal(activeTab.slice(0, -1))}
        >
          <HiOutlinePlus /> Ajouter {TABS.find(t => t.id === activeTab).label.slice(0, -1)}
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-md mb-lg border-bottom pb-sm" style={{ overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn btn-ghost ${activeTab === tab.id ? 'btn-active' : ''}`}
            style={{ 
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : 'none',
              borderRadius: 0,
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              padding: '12px 16px'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="card shadow-sm animate-in delay-1">
        {loading && !showModal ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                {activeTab === 'departments' && (
                  <tr>
                    <th>Nom</th>
                    <th>Description</th>
                    <th>Collaborateurs</th>
                    <th style={{ width: 100 }}>Actions</th>
                  </tr>
                )}
                {activeTab === 'locations' && (
                  <tr>
                    <th>Lieu / Site</th>
                    <th>Adresse</th>
                    <th>Ville</th>
                    <th style={{ width: 100 }}>Actions</th>
                  </tr>
                )}
                {activeTab === 'leaves' && (
                  <tr>
                    <th>Désignation</th>
                    <th>Code</th>
                    <th>Droit Annuel</th>
                    <th>Statut</th>
                    <th style={{ width: 100 }}>Actions</th>
                  </tr>
                )}
                {activeTab === 'payroll' && (
                  <tr>
                    <th>Période</th>
                    <th>Du</th>
                    <th>Au</th>
                    <th>Statut</th>
                    <th style={{ width: 100 }}>Actions</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {/* Departments List */}
                {activeTab === 'departments' && departments.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.description || '—'}</td>
                    <td><span className="badge badge-neutral">{item.employee_count || 0}</span></td>
                    <td>
                      <div className="flex gap-sm">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleOpenModal('department', item)}><HiOutlinePencil /></button>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(item.id)}><HiOutlineTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Locations List */}
                {activeTab === 'locations' && locations.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.address || '—'}</td>
                    <td>{item.city || '—'}</td>
                    <td>
                      <div className="flex gap-sm">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleOpenModal('location', item)}><HiOutlinePencil /></button>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(item.id)}><HiOutlineTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Leaves List */}
                {activeTab === 'leaves' && leaveTypes.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="flex items-center gap-sm">
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color }}></div>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{item.code}</td>
                    <td>{item.days_per_year} jours</td>
                    <td><span className={`badge ${item.is_paid ? 'badge-success' : 'badge-warning'}`}>{item.is_paid ? 'Payé' : 'Non payé'}</span></td>
                    <td>
                      <div className="flex gap-sm">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleOpenModal('leaveType', item)}><HiOutlinePencil /></button>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(item.id)}><HiOutlineTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Payroll List */}
                {activeTab === 'payroll' && payrollPeriods.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{new Date(item.start_date).toLocaleDateString('fr-FR')}</td>
                    <td>{new Date(item.end_date).toLocaleDateString('fr-FR')}</td>
                    <td><span className={`badge ${item.is_closed ? 'badge-neutral' : 'badge-success'}`}>{item.is_closed ? 'Clôturée' : 'Ouverte'}</span></td>
                    <td>
                      <div className="flex gap-sm">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleOpenModal('payrollPeriod', item)}><HiOutlinePencil /></button>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(item.id)}><HiOutlineTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && (
                   (activeTab === 'departments' && departments.length === 0) ||
                   (activeTab === 'locations' && locations.length === 0) ||
                   (activeTab === 'leaves' && leaveTypes.length === 0) ||
                   (activeTab === 'payroll' && payrollPeriods.length === 0)
                ) && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                      Aucun élément trouvé. Cliquez sur Ajouter pour commencer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>{editId ? 'Modifier' : 'Ajouter'} {modalType === 'department' ? 'un département' : modalType === 'location' ? 'un lieu' : modalType === 'leaveType' ? 'un type de congé' : 'une période'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-md">
              {/* Department Form */}
              {modalType === 'department' && (
                <>
                  <div className="input-group">
                    <label>Nom du département</label>
                    <input className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Ressources Humaines" />
                  </div>
                  <div className="input-group">
                    <label>Description (Optionnel)</label>
                    <textarea className="input" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Courte description..." />
                  </div>
                </>
              )}

              {/* Location Form */}
              {modalType === 'location' && (
                <>
                  <div className="input-group">
                    <label>Nom du site</label>
                    <input className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Siège Social / Site POG" />
                  </div>
                  <div className="input-group">
                    <label>Adresse</label>
                    <input className="input" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Rue, Quartier..." />
                  </div>
                  <div className="input-group">
                    <label>Ville</label>
                    <input className="input" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Ex: Libreville" />
                  </div>
                </>
              )}

              {/* Leave Type Form */}
              {modalType === 'leaveType' && (
                <>
                  <div className="grid grid-2 gap-md">
                    <div className="input-group">
                      <label>Dénomination</label>
                      <input className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Congé Annuel" />
                    </div>
                    <div className="input-group">
                      <label>Code (Court)</label>
                      <input className="input" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} required placeholder="Ex: CA" />
                    </div>
                  </div>
                  <div className="grid grid-2 gap-md">
                    <div className="input-group">
                      <label>Jours par an</label>
                      <input className="input" type="number" value={formData.days_per_year || ''} onChange={e => setFormData({...formData, days_per_year: e.target.value})} required />
                    </div>
                    <div className="input-group">
                      <label>Couleur</label>
                      <input className="input" type="color" value={formData.color || '#059669'} onChange={e => setFormData({...formData, color: e.target.value})} style={{ height: 42, padding: 2 }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-sm mt-sm">
                    <input type="checkbox" id="is_paid" checked={formData.is_paid || false} onChange={e => setFormData({...formData, is_paid: e.target.checked})} />
                    <label htmlFor="is_paid" style={{ margin: 0, cursor: 'pointer' }}>Congé rémunéré (Payé)</label>
                  </div>
                </>
              )}

              {/* Payroll Period Form */}
              {modalType === 'payrollPeriod' && (
                <>
                  <div className="input-group">
                    <label>Nom de la période</label>
                    <input className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Mars 2026" />
                  </div>
                  <div className="grid grid-2 gap-md">
                    <div className="input-group">
                      <label>Début</label>
                      <input className="input" type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
                    </div>
                    <div className="input-group">
                      <label>Fin</label>
                      <input className="input" type="date" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} required />
                    </div>
                  </div>
                  <div className="flex items-center gap-sm mt-sm">
                    <input type="checkbox" id="is_closed" checked={formData.is_closed || false} onChange={e => setFormData({...formData, is_closed: e.target.checked})} />
                    <label htmlFor="is_closed" style={{ margin: 0, cursor: 'pointer' }}>Considérer comme clôturée</label>
                  </div>
                </>
              )}

              <div className="modal-footer flex justify-between mt-lg pt-md border-top">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Enregistrement...' : editId ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {message.text && (
        <div className={`toast animate-in ${message.type === 'success' ? 'toast-success' : 'toast-error'}`} 
             style={{ 
               position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000,
               padding: '16px 24px', borderRadius: 'var(--radius-lg)',
               background: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
               color: 'white', boxShadow: 'var(--shadow-xl)', display: 'flex', alignItems: 'center', gap: '12px'
             }}>
          {message.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamation />}
          {message.text}
        </div>
      )}

      <style jsx>{`
        .btn-active {
          background: var(--primary-glow) !important;
          font-weight: 700 !important;
        }
        .text-danger {
          color: var(--danger) !important;
        }
        .border-bottom { border-bottom: 2px solid var(--border-light); }
        .border-top { border-top: 1px solid var(--border-light); }
      `}</style>
    </div>
  );
}
