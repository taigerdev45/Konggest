'use client';

/**
 * Konggest — Employees List Page
 * Table view with search, filters, and CRUD actions.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HiOutlineSearch, HiOutlinePlus, HiOutlineFilter, HiOutlineRefresh } from 'react-icons/hi';
import api from '@/lib/api';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    contract_type: 'cdi',
    status: 'active',
    hire_date: new Date().toISOString().split('T')[0],
  });

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empData, deptData, posData] = await Promise.all([
        api.get('/employees/'),
        api.get('/departments/'),
        api.get('/employees/positions/'),
      ]);
      setEmployees(empData);
      setDepartments(deptData);
      setPositions(posData);
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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/employees/', formData);
      setShowModal(false);
      setFormData({
        employee_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        contract_type: 'cdi',
        status: 'active',
        hire_date: new Date().toISOString().split('T')[0],
      });
      fetchInitialData();
    } catch (err) {
      console.error('Error creating employee:', err);
      alert(err.error || 'Erreur lors de la création de l\'employé.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = employees.filter((emp) => {
    const matchSearch = `${emp.first_name} ${emp.last_name} ${emp.employee_id} ${emp.email}`
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
          <p>Gérez les employés de votre organisation</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={fetchInitialData} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-primary" id="add-employee-btn" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> Ajouter un employé
          </button>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Ajouter un employé</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="grid grid-2 gap-md">
                <div className="form-group">
                  <label>Matricule *</label>
                  <input type="text" name="employee_id" value={formData.employee_id} onChange={handleInputChange} required placeholder="EMP-001" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="email@exemple.com" />
                </div>
                <div className="form-group">
                  <label>Prénom *</label>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Date d'embauche *</label>
                  <input type="date" name="hire_date" value={formData.hire_date} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Département</label>
                  <select name="department" value={formData.department} onChange={handleInputChange}>
                    <option value="">Sélectionner...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Poste</label>
                  <select name="position" value={formData.position} onChange={handleInputChange}>
                    <option value="">Sélectionner...</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Type de contrat</label>
                  <select name="contract_type" value={formData.contract_type} onChange={handleInputChange}>
                    <option value="cdi">CDI</option>
                    <option value="cdd">CDD</option>
                    <option value="stage">Stage</option>
                    <option value="apprentissage">Apprentissage</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Statut</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="active">Actif</option>
                    <option value="on_leave">En congé</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
          <style jsx>{`
            .modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
              backdrop-filter: blur(4px);
            }
            .modal-content {
              width: 90%;
              padding: 24px;
            }
            .modal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
            }
            .btn-close {
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: var(--text-muted);
            }
            .form-group label {
              display: block;
              margin-bottom: 6px;
              font-size: 0.9rem;
              font-weight: 500;
            }
          `}</style>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <HiOutlineSearch className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher par nom, matricule, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="employee-search"
            />
          </div>
          <select
            className="input"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            id="status-filter"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="on_leave">En congé</option>
            <option value="suspended">Suspendu</option>
          </select>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </span>
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
                <tr key={emp.id}>
                  <td style={{ fontWeight: 500, color: 'var(--primary-light)' }}>{emp.employee_id}</td>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div className="avatar avatar-sm">
                        {emp.photo ? (
                          <img src={emp.photo} alt={`${emp.first_name} ${emp.last_name}`} />
                        ) : (
                          `${emp.first_name[0]}${emp.last_name[0]}`
                        )}
                      </div>
                      <Link href={`/employees/${emp.id}`} style={{ fontWeight: 500, color: 'inherit', textDecoration: 'none' }} className="hover-link">
                        {emp.first_name} {emp.last_name}
                      </Link>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                  <td>{emp.department_name}</td>
                  <td>{emp.position_title}</td>
                  <td><span className="badge badge-primary">{emp.contract_type.toUpperCase()}</span></td>
                  <td>
                    <span className={`badge ${STATUS_MAP[emp.status]?.class || 'badge-neutral'}`}>
                      {STATUS_MAP[emp.status]?.label || emp.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {new Date(emp.hire_date).toLocaleDateString('fr-FR')}
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
