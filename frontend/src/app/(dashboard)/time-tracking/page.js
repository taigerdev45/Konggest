'use client';
import { HiOutlineClock } from 'react-icons/hi';

export default function TimeTrackingPage() {
  return (
    <div>
      <div className="page-header">
        <div><h1>Suivi du Temps</h1><p>Pointage, présences et heures supplémentaires</p></div>
        <button className="btn btn-primary"><HiOutlineClock /> Pointer</button>
      </div>
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card green"><div className="stat-icon green"><HiOutlineClock /></div><div className="stat-info"><h3>96.8%</h3><p>Taux de présence</p></div></div>
        <div className="stat-card cyan"><div className="stat-icon cyan"><HiOutlineClock /></div><div className="stat-info"><h3>7h42</h3><p>Moyenne journalière</p></div></div>
        <div className="stat-card orange"><div className="stat-icon orange"><HiOutlineClock /></div><div className="stat-info"><h3>34h</h3><p>Heures sup. ce mois</p></div></div>
      </div>
      <div className="card"><div className="empty-state"><h3>Pointeuse</h3><p>Le module de pointage sera activé après connexion au backend.</p></div></div>
    </div>
  );
}
