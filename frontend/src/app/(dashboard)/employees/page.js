'use client';

/**
 * Konggest — Employees List Page
 * Table view with search, filters, and CRUD actions.
 */
import { useState } from 'react';
import Link from 'next/link';
import { HiOutlineSearch, HiOutlinePlus, HiOutlineFilter } from 'react-icons/hi';

const MOCK_EMPLOYEES = [
  { id: 1, employee_id: 'EMP-001', first_name: 'Sophie', last_name: 'Martin', email: 'sophie.martin@company.com', department: 'Marketing', position: 'Directrice Marketing', contract_type: 'CDI', status: 'active', hire_date: '2022-03-15' },
  { id: 2, employee_id: 'EMP-002', first_name: 'Pierre', last_name: 'Durand', email: 'pierre.durand@company.com', department: 'Technologie', position: 'Lead Developer', contract_type: 'CDI', status: 'active', hire_date: '2021-06-01' },
  { id: 3, employee_id: 'EMP-003', first_name: 'Marie', last_name: 'Lefèvre', email: 'marie.lefevre@company.com', department: 'RH', position: 'Responsable RH', contract_type: 'CDI', status: 'on_leave', hire_date: '2020-01-10' },
  { id: 4, employee_id: 'EMP-004', first_name: 'Lucas', last_name: 'Bernard', email: 'lucas.bernard@company.com', department: 'Finance', position: 'Comptable', contract_type: 'CDD', status: 'active', hire_date: '2023-09-01' },
  { id: 5, employee_id: 'EMP-005', first_name: 'Emma', last_name: 'Petit', email: 'emma.petit@company.com', department: 'Technologie', position: 'Designer UX', contract_type: 'CDI', status: 'active', hire_date: '2022-11-20' },
  { id: 6, employee_id: 'EMP-006', first_name: 'Thomas', last_name: 'Moreau', email: 'thomas.moreau@company.com', department: 'Technologie', position: 'Dev Frontend', contract_type: 'CDI', status: 'active', hire_date: '2026-03-20' },
  { id: 7, employee_id: 'EMP-007', first_name: 'Claire', last_name: 'Dubois', email: 'claire.dubois@company.com', department: 'Commercial', position: 'Account Manager', contract_type: 'CDI', status: 'active', hire_date: '2023-02-14' },
  { id: 8, employee_id: 'EMP-008', first_name: 'Antoine', last_name: 'Robert', email: 'antoine.robert@company.com', department: 'Technologie', position: 'DevOps', contract_type: 'CDI', status: 'active', hire_date: '2021-08-25' },
];

const STATUS_MAP = {
  active: { label: 'Actif', class: 'badge-success' },
  on_leave: { label: 'En congé', class: 'badge-warning' },
  suspended: { label: 'Suspendu', class: 'badge-danger' },
  terminated: { label: 'Terminé', class: 'badge-neutral' },
};

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = MOCK_EMPLOYEES.filter((emp) => {
    const matchSearch = `${emp.first_name} ${emp.last_name} ${emp.employee_id} ${emp.email}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus = !statusFilter || emp.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Employés</h1>
          <p>Gérez les employés de votre organisation</p>
        </div>
        <button className="btn btn-primary" id="add-employee-btn">
          <HiOutlinePlus /> Ajouter un employé
        </button>
      </div>

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
            {filtered.map((emp) => (
              <tr key={emp.id}>
                <td style={{ fontWeight: 500, color: 'var(--primary-light)' }}>{emp.employee_id}</td>
                <td>
                  <div className="flex items-center gap-sm">
                    <div className="avatar avatar-sm">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <span style={{ fontWeight: 500 }}>{emp.first_name} {emp.last_name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                <td>{emp.department}</td>
                <td>{emp.position}</td>
                <td><span className="badge badge-primary">{emp.contract_type.toUpperCase()}</span></td>
                <td>
                  <span className={`badge ${STATUS_MAP[emp.status].class}`}>
                    {STATUS_MAP[emp.status].label}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {new Date(emp.hire_date).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
