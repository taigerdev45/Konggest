'use client';
import { HiOutlineBriefcase, HiOutlinePlus } from 'react-icons/hi';

const JOBS = [
  { id: 1, title: 'Développeur Full-Stack', dept: 'Technologie', type: 'CDI', apps: 12, status: 'published' },
  { id: 2, title: 'Designer UX/UI', dept: 'Design', type: 'CDI', apps: 8, status: 'published' },
  { id: 3, title: 'Stagiaire Marketing', dept: 'Marketing', type: 'Stage', apps: 23, status: 'published' },
  { id: 4, title: 'Comptable Senior', dept: 'Finance', type: 'CDI', apps: 5, status: 'draft' },
];

export default function RecruitmentPage() {
  return (
    <div>
      <div className="page-header">
        <div><h1>Recrutement</h1><p>Offres d&apos;emploi, candidatures et pipeline</p></div>
        <button className="btn btn-primary"><HiOutlinePlus /> Nouvelle offre</button>
      </div>
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card purple"><div className="stat-icon purple"><HiOutlineBriefcase /></div><div className="stat-info"><h3>8</h3><p>Postes ouverts</p></div></div>
        <div className="stat-card cyan"><div className="stat-icon cyan"><HiOutlineBriefcase /></div><div className="stat-info"><h3>48</h3><p>Candidatures</p></div></div>
        <div className="stat-card green"><div className="stat-icon green"><HiOutlineBriefcase /></div><div className="stat-info"><h3>6</h3><p>Entretiens planifiés</p></div></div>
      </div>
      <div className="table-container animate-in">
        <table>
          <thead><tr><th>Poste</th><th>Département</th><th>Type</th><th>Candidatures</th><th>Statut</th></tr></thead>
          <tbody>
            {JOBS.map(j => (
              <tr key={j.id}>
                <td style={{fontWeight:500}}>{j.title}</td>
                <td>{j.dept}</td>
                <td><span className="badge badge-primary">{j.type}</span></td>
                <td>{j.apps}</td>
                <td><span className={`badge ${j.status==='published'?'badge-success':'badge-neutral'}`}>{j.status==='published'?'Publié':'Brouillon'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
