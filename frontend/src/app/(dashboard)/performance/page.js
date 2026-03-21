'use client';
import { HiOutlineChartBar } from 'react-icons/hi';

export default function PerformancePage() {
  return (
    <div>
      <div className="page-header">
        <div><h1>Performance & Évaluations</h1><p>Entretiens, objectifs et suivi de performance</p></div>
        <button className="btn btn-primary">Nouvelle évaluation</button>
      </div>
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card purple"><div className="stat-icon purple"><HiOutlineChartBar /></div><div className="stat-info"><h3>4.2/5</h3><p>Note moyenne</p></div></div>
        <div className="stat-card green"><div className="stat-icon green"><HiOutlineChartBar /></div><div className="stat-info"><h3>89%</h3><p>Objectifs atteints</p></div></div>
        <div className="stat-card cyan"><div className="stat-icon cyan"><HiOutlineChartBar /></div><div className="stat-info"><h3>32</h3><p>Évaluations Q1</p></div></div>
      </div>
      <div className="card"><div className="empty-state"><h3>Évaluations de performance</h3><p>Créez et gérez les évaluations de vos employés. Connectez le backend pour activer.</p></div></div>
    </div>
  );
}
