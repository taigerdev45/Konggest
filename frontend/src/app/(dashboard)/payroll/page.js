'use client';
import { HiOutlineCurrencyDollar } from 'react-icons/hi';

export default function PayrollPage() {
  return (
    <div>
      <div className="page-header">
        <div><h1>Gestion de la Paie</h1><p>Fiches de paie, primes et cotisations</p></div>
        <button className="btn btn-primary">Générer les fiches</button>
      </div>
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card green"><div className="stat-icon green"><HiOutlineCurrencyDollar /></div><div className="stat-info"><h3>€452K</h3><p>Masse salariale</p></div></div>
        <div className="stat-card purple"><div className="stat-icon purple"><HiOutlineCurrencyDollar /></div><div className="stat-info"><h3>147</h3><p>Fiches à générer</p></div></div>
        <div className="stat-card cyan"><div className="stat-icon cyan"><HiOutlineCurrencyDollar /></div><div className="stat-info"><h3>€3,076</h3><p>Salaire moyen</p></div></div>
        <div className="stat-card orange"><div className="stat-icon orange"><HiOutlineCurrencyDollar /></div><div className="stat-info"><h3>€89K</h3><p>Cotisations totales</p></div></div>
      </div>
      <div className="card"><div className="empty-state"><h3>Module Paie</h3><p>Les fiches de paie seront générées ici. Connectez le backend pour activer.</p></div></div>
    </div>
  );
}
