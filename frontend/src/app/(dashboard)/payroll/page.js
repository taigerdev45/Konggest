'use client';

import { useState, useEffect } from 'react';
import { HiOutlineCurrencyDollar, HiOutlineRefresh, HiOutlinePlus, HiOutlinePrinter } from 'react-icons/hi';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function PayrollPage() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mass_salary: 0,
    average_salary: 0,
    total_deductions: 0,
    to_generate: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payslipData, periodData] = await Promise.all([
        api.get('/payroll/payslips/'),
        api.get('/payroll/periods/'),
      ]);
      setPayslips(payslipData);
      setPeriods(periodData);
      
      // Calculate summary stats
      if (payslipData.length > 0) {
        const totalGross = payslipData.reduce((acc, p) => acc + parseFloat(p.gross_salary), 0);
        const totalDeductions = payslipData.reduce((acc, p) => acc + parseFloat(p.total_deductions), 0);
        setStats({
          mass_salary: totalGross,
          total_deductions: totalDeductions,
          average_salary: totalGross / payslipData.length,
          to_generate: payslipData.filter(p => p.status === 'draft').length,
        });
      }
    } catch (err) {
      console.error('Error fetching payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const isHR = user?.profile?.role === 'hr' || user?.profile?.role === 'admin';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gestion de la Paie</h1>
          <p>Fiches de paie, primes et cotisations</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={fetchData} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'animate-spin' : ''} />
          </button>
          {isHR && (
            <button className="btn btn-primary">
              <HiOutlinePlus /> Générer les fiches
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-icon green"><HiOutlineCurrencyDollar /></div>
          <div className="stat-info">
            <h3>{formatCurrency(stats.mass_salary)}</h3>
            <p>Masse salariale</p>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple"><HiOutlineCurrencyDollar /></div>
          <div className="stat-info">
            <h3>{stats.to_generate}</h3>
            <p>Fiches à valider</p>
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon cyan"><HiOutlineCurrencyDollar /></div>
          <div className="stat-info">
            <h3>{formatCurrency(stats.average_salary)}</h3>
            <p>Salaire moyen</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><HiOutlineCurrencyDollar /></div>
          <div className="stat-info">
            <h3>{formatCurrency(stats.total_deductions)}</h3>
            <p>Cotisations totales</p>
          </div>
        </div>
      </div>

      <div className="table-container animate-in">
        <table>
          <thead>
            <tr>
              <th>Employé</th>
              <th>Période</th>
              <th>Salaire Brut</th>
              <th>Net à Payer</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan="6"><div className="skeleton" style={{ height: 20 }} /></td>
                </tr>
              ))
            ) : payslips.length > 0 ? (
              payslips.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.employee_name}</td>
                  <td>{p.period_name}</td>
                  <td>{formatCurrency(p.gross_salary)}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(p.net_salary)}</td>
                  <td>
                    <span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'validated' ? 'badge-primary' : 'badge-warning'}`}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-xs btn-ghost" title="Imprimer/PDF">
                      <HiOutlinePrinter />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Aucune fiche de paie trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

