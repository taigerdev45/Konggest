'use client';
import { HiOutlineCalendar, HiOutlinePlus } from 'react-icons/hi';

const LEAVES = [
  { id: 1, employee: 'Sophie Martin', type: 'Congé payé', start: '2026-03-25', end: '2026-03-28', days: 3, status: 'pending' },
  { id: 2, employee: 'Pierre Durand', type: 'Maladie', start: '2026-03-21', end: '2026-03-21', days: 1, status: 'approved' },
  { id: 3, employee: 'Marie Lefèvre', type: 'Congé payé', start: '2026-03-17', end: '2026-03-21', days: 5, status: 'approved' },
  { id: 4, employee: 'Lucas Bernard', type: 'Sans solde', start: '2026-03-19', end: '2026-03-20', days: 2, status: 'rejected' },
  { id: 5, employee: 'Emma Petit', type: 'Congé payé', start: '2026-04-01', end: '2026-04-04', days: 4, status: 'pending' },
];

const STATUS = {
  pending: { label: 'En attente', cls: 'badge-warning' },
  approved: { label: 'Approuvé', cls: 'badge-success' },
  rejected: { label: 'Refusé', cls: 'badge-danger' },
};

export default function LeavesPage() {
  return (
    <div>
      <div className="page-header">
        <div><h1>Gestion des Congés</h1><p>Demandes, approbations et soldes de congés</p></div>
        <button className="btn btn-primary"><HiOutlinePlus /> Nouvelle demande</button>
      </div>
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card green"><div className="stat-icon green"><HiOutlineCalendar /></div><div className="stat-info"><h3>18.5j</h3><p>Solde moyen restant</p></div></div>
        <div className="stat-card cyan"><div className="stat-icon cyan"><HiOutlineCalendar /></div><div className="stat-info"><h3>12</h3><p>En congé aujourd&apos;hui</p></div></div>
        <div className="stat-card orange"><div className="stat-icon orange"><HiOutlineCalendar /></div><div className="stat-info"><h3>5</h3><p>Demandes en attente</p></div></div>
      </div>
      <div className="table-container animate-in">
        <table>
          <thead><tr><th>Employé</th><th>Type</th><th>Début</th><th>Fin</th><th>Jours</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {LEAVES.map(l => (
              <tr key={l.id}>
                <td style={{ fontWeight: 500 }}>{l.employee}</td>
                <td>{l.type}</td>
                <td>{new Date(l.start).toLocaleDateString('fr-FR')}</td>
                <td>{new Date(l.end).toLocaleDateString('fr-FR')}</td>
                <td>{l.days}j</td>
                <td><span className={`badge ${STATUS[l.status].cls}`}>{STATUS[l.status].label}</span></td>
                <td>{l.status === 'pending' && (<><button className="btn btn-sm btn-primary" style={{marginRight:4}}>Approuver</button><button className="btn btn-sm btn-danger">Refuser</button></>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
