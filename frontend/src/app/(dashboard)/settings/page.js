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
      <div className="grid grid-2 animate-in delay-1">
        <div className="card-glass">
          <h3 style={{ marginBottom: 20 }}>👤 Mon Profil</h3>
          <div className="flex flex-col gap-md">
            <div className="input-group">
              <label>Nom complet</label>
              <input className="input" defaultValue={user?.full_name || ''} />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input className="input" defaultValue={user?.email || ''} type="email" />
            </div>
            <div className="input-group">
              <label>Rôle</label>
              <input className="input" value={user?.role?.toUpperCase() || 'ADMIN'} disabled style={{ opacity: 0.7 }} />
            </div>
            <button className="btn btn-primary">Sauvegarder les modifications</button>
          </div>
        </div>
        <div className="card-glass">
          <h3 style={{ marginBottom: 20 }}>🏢 Organisation</h3>
          <div className="flex flex-col gap-md">
            <div className="input-group">
              <label>Nom de l&apos;entreprise</label>
              <input className="input" defaultValue={user?.organization || ''} />
            </div>
            <div className="input-group">
              <label>Secteur d&apos;activité</label>
              <select className="input">
                <option>Technologie</option><option>Finance</option><option>Santé</option>
                <option>Éducation</option><option>Commerce</option><option>Industrie</option>
                <option>Autre</option>
              </select>
            </div>
            <div className="input-group">
              <label>Plan actuel</label>
              <div className="flex items-center justify-between p-md bg-secondary rounded border border-dashed border-primary">
                <span className="badge badge-primary" style={{ padding: '6px 12px' }}>Business Plan</span>
                <button className="btn btn-sm btn-ghost">Changer de plan</button>
              </div>
            </div>
            <button className="btn btn-primary">Mettre à jour l&apos;organisation</button>
          </div>
        </div>
      </div>

      <div className="card-glass mt-lg animate-in delay-2" style={{ border: '1px solid var(--primary-glow)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3>👥 Gestion d'équipe</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ajoutez des collaborateurs pour intervenir sur la plateforme.</p>
          </div>
          <Link href="/users" className="btn btn-secondary">Gérer les utilisateurs</Link>
        </div>
      </div>
    </div>
  );
}
