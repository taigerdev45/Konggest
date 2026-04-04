'use client';

/**
 * Konggest — Employees List Page
 * Table view with search, filters, and CRUD actions.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HiOutlineSearch, HiOutlinePlus, HiOutlineFilter, HiOutlineRefresh, HiOutlineDownload } from 'react-icons/hi';
import api from '@/lib/api';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    cnss_number: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    location: '',
    site_location: '',
    contract_type: 'cdi',
    is_expat: false,
    salary: 0,
    family_parts: 1.0,
    status: 'active',
    hire_date: new Date().toISOString().split('T')[0],
  });

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await Promise.allSettled([
        api.get('/employees/'),
        api.get('/departments/'),
        api.get('/employees/positions/'),
        api.get('/employees/locations/'),
      ]);
      
      const empData = resp[0].status === 'fulfilled' ? resp[0].value : [];
      const deptData = resp[1].status === 'fulfilled' ? resp[1].value : [];
      const posData = resp[2].status === 'fulfilled' ? resp[2].value : [];
      const locData = resp[3].status === 'fulfilled' ? resp[3].value : [];

      setEmployees(empData.results || empData || []);
      setDepartments(deptData.results || deptData || []);
      setPositions(posData.results || posData || []);
      setLocations(locData.results || locData || []);
      
      if (resp.some(r => r.status === 'rejected')) {
        console.warn('Some requests failed', resp);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.error || 'Erreur lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/employees/', formData);
      setShowModal(false);
      setFormData({
        employee_id: '',
        cnss_number: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        site_location: 'libreville',
        contract_type: 'cdi',
        is_expat: false,
        salary: 0,
        family_parts: 1.0,
        status: 'active',
        hire_date: new Date().toISOString().split('T')[0],
      });
      fetchInitialData();
    } catch (err) {
      console.error('Error creating employee:', err);
      // Format DRF error response
      let errorMsg = 'Une erreur est survenue.';
      if (err.details && typeof err.details === 'object') {
        errorMsg = Object.entries(err.details)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(' ') : msgs}`)
          .join('\n');
      } else if (err.error) {
        errorMsg = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
      }
      alert(`Échec de la création :\n${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/employees/export_csv/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employees_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Erreur lors de l\'exportation.');
    }
  };

  const filtered = (Array.isArray(employees) ? employees : []).filter((emp) => {
    const matchSearch = `${emp.first_name} ${emp.last_name} ${emp.employee_id} ${emp.email} ${emp.cnss_number}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus = !statusFilter || emp.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const STATUS_MAP = {
    active: { label: 'Actif', class: 'badge-success' },
    on_leave: { label: 'En congé', class: 'badge-warning' },
    suspended: { label: 'Suspendu', class: 'badge-danger' },
    terminated: { label: 'Terminé', class: 'badge-neutral' },
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Employés</h1>
          <p>Gérez les employés de votre organisation (Conformité Gabon 2026)</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={fetchInitialData} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            <HiOutlineDownload /> Export CSV
          </button>
          <button className="btn btn-primary" id="add-employee-btn" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> Ajouter un employé
          </button>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <div>
                <h2>Ajouter un collaborateur</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Renseignez les informations de base et fiscales (Réglementation Gabon).</p>
              </div>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="grid grid-2 gap-md">
                <div className="input-group">
                  <label>Matricule *</label>
                  <input className="input" type="text" name="employee_id" value={formData.employee_id} onChange={handleInputChange} required placeholder="Ex: EMP-2026-001" />
                </div>
                <div className="input-group">
                  <label>Numéro CNSS</label>
                  <input className="input" type="text" name="cnss_number" value={formData.cnss_number} onChange={handleInputChange} placeholder="Ex: 123456-A" />
                </div>
                <div className="input-group">
                  <label>Prénom *</label>
                  <input className="input" type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                  <label>Nom de famille *</label>
                  <input className="input" type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                  <label>Email Professionnel *</label>
                  <input className="input" type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="nom@entreprise.com" />
                </div>
                <div className="input-group">
                  <label>Téléphone</label>
                  <input className="input" type="text" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+241 ..." />
                </div>
                <div className="input-group">
                  <label>Site d'affectation</label>
                  <select className="input" name="location" value={formData.location} onChange={handleInputChange}>
                    <option value="">Sélectionner un site...</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Département</label>
                  <select className="input" name="department" value={formData.department} onChange={handleInputChange}>
                    <option value="">Sélectionner un département...</option>
                    {Array.isArray(departments) && departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Type de contrat</label>
                  <select className="input" name="contract_type" value={formData.contract_type} onChange={handleInputChange}>
                    <option value="cdi">CDI</option>
                    <option value="cdd">CDD</option>
                    <option value="stage">Stage</option>
                    <option value="apprentissage">Apprentissage</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Date d'embauche *</label>
                  <input className="input" type="date" name="hire_date" value={formData.hire_date} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                  <label>Salaire Brut Mensuel (XAF) *</label>
                  <input className="input" type="number" name="salary" value={formData.salary} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                  <label>Parts IRPP (Quotient Familial)</label>
                  <input className="input" type="number" step="0.5" name="family_parts" value={formData.family_parts} onChange={handleInputChange} />
                </div>
                <div className="input-group flex items-center gap-md" style={{ gridColumn: 'span 2', padding: '10px 0' }}>
                  <input type="checkbox" name="is_expat" checked={formData.is_expat} onChange={handleInputChange} id="is_expat" />
                  <label htmlFor="is_expat" style={{ marginBottom: 0, cursor: 'pointer' }}>Cet employé est un Expatrié</label>
                </div>
              </div>
              <div className="modal-footer mt-lg">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Enregistrement...' : 'Créer le profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card-glass mb-lg animate-in delay-1">
        <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '300px' }}>
            <HiOutlineSearch className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher par nom, matricule, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="employee-search"
            />
          </div>
          <div className="flex gap-sm items-center">
            <HiOutlineFilter style={{ color: 'var(--text-muted)' }} />
            <select
              className="input"
              style={{ width: 'auto', minWidth: '180px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              id="status-filter"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="on_leave">En congé</option>
              <option value="suspended">Suspendu</option>
            </select>
            <div className="badge badge-neutral">
              {filtered.length} collaborateur{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card" style={{ marginBottom: 20, padding: 20, border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.1)' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 500 }}>{error}</p>
          <button className="btn btn-sm btn-ghost" onClick={fetchInitialData} style={{ marginTop: 10 }}>
            Réessayer
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-container animate-in">
        <table>
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom complet</th>
              <th>Email</th>
              <th>Département</th>
              <th>Poste</th>
              <th>Contrat</th>
              <th>Statut</th>
              <th>Embauche</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan="8" style={{ height: 60 }}>
                    <div className="skeleton" style={{ width: '100%', height: 20 }} />
                  </td>
                </tr>
              ))
            ) : filtered.length > 0 ? (
              filtered.map((emp) => (
                <tr key={emp.id} className="animate-in">
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                      {emp.employee_id}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-md">
                      <div className="avatar avatar-sm" style={{ border: '2px solid var(--bg-secondary)' }}>
                        {emp.photo ? (
                          <img src={emp.photo} alt={`${emp.first_name} ${emp.last_name}`} />
                        ) : (
                          `${emp.first_name[0]}${emp.last_name[0]}`
                        )}
                      </div>
                      <div>
                        <Link href={`/employees/${emp.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }} className="hover-link">
                          {emp.first_name} {emp.last_name}
                        </Link>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{emp.department_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.position_title}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      emp.contract_type === 'cdi' ? 'badge-primary' : 
                      emp.contract_type === 'cdd' ? 'badge-warning' : 'badge-neutral'
                    }`}>
                      {emp.contract_type.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_MAP[emp.status]?.class || 'badge-neutral'}`}>
                      {STATUS_MAP[emp.status]?.label || emp.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {new Date(emp.hire_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <Link href={`/employees/${emp.id}`} className="btn btn-ghost btn-xs">
                      Détails
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  Aucun employé trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
