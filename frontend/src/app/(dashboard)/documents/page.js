'use client';
import { HiOutlineDocumentText, HiOutlineUpload } from 'react-icons/hi';

export default function DocumentsPage() {
  return (
    <div>
      <div className="page-header">
        <div><h1>Gestion Documentaire</h1><p>Contrats, attestations et documents RH</p></div>
        <button className="btn btn-primary"><HiOutlineUpload /> Upload document</button>
      </div>
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card purple"><div className="stat-icon purple"><HiOutlineDocumentText /></div><div className="stat-info"><h3>342</h3><p>Documents stockés</p></div></div>
        <div className="stat-card cyan"><div className="stat-icon cyan"><HiOutlineDocumentText /></div><div className="stat-info"><h3>24</h3><p>Contrats actifs</p></div></div>
        <div className="stat-card orange"><div className="stat-icon orange"><HiOutlineDocumentText /></div><div className="stat-info"><h3>3</h3><p>Expirent bientôt</p></div></div>
      </div>
      <div className="card"><div className="empty-state"><h3>Gestionnaire de documents</h3><p>Uploadez et gérez vos documents RH. Connectez Supabase Storage pour activer.</p></div></div>
    </div>
  );
}
