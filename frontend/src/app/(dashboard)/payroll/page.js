'use client';

import { useState, useEffect } from 'react';
import { HiOutlineCurrencyDollar, HiOutlineRefresh, HiOutlinePlus, HiOutlinePrinter, HiOutlineEye } from 'react-icons/hi';
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
  const [showGenModal, setShowGenModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [genData, setGenData] = useState({ period: '' });
  const [submitting, setSubmitting] = useState(false);

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

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!genData.period) return alert('Veuillez sélectionner une période.');
    setSubmitting(true);
    try {
      const res = await api.post('/payroll/payslips/generate/', genData);
      alert(res.status || 'Génération terminée.');
      setShowGenModal(false);
      fetchData();
    } catch (err) {
      console.error('Generation failed:', err);
      alert(err.error || 'Erreur lors de la génération.');
    } finally {
      setSubmitting(false);
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
            <button className="btn btn-primary" onClick={() => setShowGenModal(true)}>
              <HiOutlinePlus /> Générer les fiches
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-4 mb-lg">
        <div className="stat-card blue animate-in delay-1">
          <div className="stat-icon purple"><HiOutlineCurrencyDollar /></div>
          <div className="stat-info">
            <h3>{formatCurrency(stats.mass_salary)}</h3>
            <p>Masse salariale</p>
          </div>
        </div>
        <div className="stat-card purple animate-in delay-2">
          <div className="stat-icon purple"><HiOutlinePlus /></div>
          <div className="stat-info">
            <h3>{stats.to_generate}</h3>
            <p>Fiches à valider</p>
          </div>
        </div>
        <div className="stat-card cyan animate-in delay-3">
          <div className="stat-icon cyan"><HiOutlineTrendingUp /></div>
          <div className="stat-info">
            <h3>{formatCurrency(stats.average_salary)}</h3>
            <p>Salaire moyen</p>
          </div>
        </div>
        <div className="stat-card orange animate-in delay-4">
          <div className="stat-icon orange"><HiOutlineCurrencyDollar /></div>
          <div className="stat-info">
            <h3>{formatCurrency(stats.total_deductions)}</h3>
            <p>Cotisations totales</p>
          </div>
        </div>
      </div>

      <div className="table-container animate-in delay-2">
        <table>
          <thead>
            <tr>
              <th>Collaborateur</th>
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
                    <div className="flex gap-xs">
                      <button 
                        className="btn btn-xs btn-ghost" 
                        title="Prévisualiser"
                        onClick={() => {
                          setSelectedPayslip(p);
                          setShowPreviewModal(true);
                        }}
                      >
                        <HiOutlineEye />
                      </button>
                      <button className="btn btn-xs btn-ghost" title="Imprimer/PDF">
                        <HiOutlinePrinter />
                      </button>
                    </div>
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

      {/* Preview Modal */}
      {showPreviewModal && selectedPayslip && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 850, padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem' }}>Aperçu du Bulletin de Paie</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Période : {selectedPayslip.period_name}</p>
              </div>
              <button className="btn-close" onClick={() => setShowPreviewModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '40px 50px', background: 'white', color: '#1e293b' }}>
              {/* Payslip Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, borderBottom: '2px solid #0f172a', paddingBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.8rem', fontWeight: 800 }}>KONGGEST</h3>
                  <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#64748b' }}>Solutions RH Modernes</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ margin: 0, color: '#0f172a', letterSpacing: '0.1em' }}>BULLETIN DE PAIE</h4>
                  <p style={{ margin: '4px 0', fontWeight: 700, color: 'var(--primary)' }}># {selectedPayslip.id.toString().padStart(6, '0')}</p>
                </div>
              </div>

              {/* Employee Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 40 }}>
                <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>EMPLOYEUR</p>
                  <p style={{ margin: 0, fontWeight: 700 }}>KONGGEST SA</p>
                  <p style={{ margin: '4px 0' }}>SIRET : 123 456 789 00010</p>
                  <p style={{ margin: '4px 0' }}>Code APE : 6201Z</p>
                </div>
                <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>SALARIÉ</p>
                  <p style={{ margin: 0, fontWeight: 700 }}>{selectedPayslip.employee_name}</p>
                  <p style={{ margin: '4px 0' }}>Matricule : {selectedPayslip.employee_id || 'EMP-001'}</p>
                  <p style={{ margin: '4px 0' }}>Poste : {selectedPayslip.position_title || 'Collaborateur'}</p>
                </div>
              </div>

              {/* Table of items */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Désignation</th>
                    <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Nombre / Base</th>
                    <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Taux</th>
                    <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Part Salariale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>Salaire de base</td>
                    <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>151.67 h</td>
                    <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>-</td>
                    <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>{formatCurrency(selectedPayslip.gross_salary)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>Cotisations sociales (est.)</td>
                    <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>-</td>
                    <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>22%</td>
                    <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f1f5f9', color: '#dc2626' }}>- {formatCurrency(selectedPayslip.total_deductions)}</td>
                  </tr>
                  {parseFloat(selectedPayslip.total_bonuses) > 0 && (
                    <tr>
                      <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>Primes exceptionnelles</td>
                      <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>-</td>
                      <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>-</td>
                      <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f1f5f9', color: '#059669' }}>+ {formatCurrency(selectedPayslip.total_bonuses)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#0f172a', color: 'white', padding: '20px 30px', borderRadius: 8, textAlign: 'right', minWidth: 300 }}>
                  <p style={{ margin: '0 0 8px 0', opacity: 0.7, fontSize: '0.85rem' }}>NET À PAYER</p>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(selectedPayslip.net_salary)}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setShowPreviewModal(false)}>Fermer</button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <HiOutlinePrinter /> Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Generation Modal */}
      {showGenModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-in" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Générer les fiches de paie</h2>
              <button className="btn-close" onClick={() => setShowGenModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleGenerate} className="modal-body">
              <div className="form-group mb-lg">
                <label>Période de paie *</label>
                <select 
                  className="input"
                  value={genData.period} 
                  onChange={(e) => setGenData({ period: e.target.value })}
                  required
                >
                  <option value="">Sélectionner une période...</option>
                  {periods.map(p => (
                    <option key={p.id} value={p.id} disabled={p.is_closed}>
                      {p.name} {p.is_closed ? '(Clôturée)' : ''}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  Cela générera des brouillons de fiches de paie pour tous les employés actifs de cette période.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowGenModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !genData.period}>
                  {submitting ? 'Génération...' : 'Lancer la génération'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

