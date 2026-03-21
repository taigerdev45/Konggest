'use client';
import { HiOutlineCog } from 'react-icons/hi';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <div>
      <div className="page-header">
        <div><h1>Paramètres</h1><p>Configuration de l&apos;organisation et du profil</p></div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>👤 Mon Profil</h3>
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label>Nom complet</label>
            <input className="input" defaultValue={user?.full_name || ''} />
          </div>
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label>Email</label>
            <input className="input" defaultValue={user?.email || ''} type="email" />
          </div>
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label>Rôle</label>
            <input className="input" value={user?.role || 'Admin'} disabled />
          </div>
          <button className="btn btn-primary">Sauvegarder</button>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>🏢 Organisation</h3>
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label>Nom de l&apos;entreprise</label>
            <input className="input" defaultValue={user?.organization || ''} />
          </div>
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label>Secteur d&apos;activité</label>
            <select className="input">
              <option>Technologie</option><option>Finance</option><option>Santé</option>
              <option>Éducation</option><option>Commerce</option><option>Industrie</option>
              <option>Autre</option>
            </select>
          </div>
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label>Plan</label>
            <span className="badge badge-primary" style={{ padding: '6px 12px' }}>Business</span>
          </div>
          <button className="btn btn-primary">Mettre à jour</button>
        </div>
      </div>
    </div>
  );
}
