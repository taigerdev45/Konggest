'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HiOutlineCog, HiOutlineUser, HiOutlineOfficeBuilding, HiOutlineCheckCircle } from 'react-icons/hi';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
  });
  const [orgData, setOrgData] = useState({
    name: '',
    sector: 'Technologie',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.profile?.full_name || '',
        email: user.email || '',
      });
      setOrgData({
        name: user.profile?.organization_name || user.profile?.organization?.name || '',
        sector: user.profile?.organization_sector || 'Technologie',
      });
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch('/auth/profile/', profileData);
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleOrgSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Note: This endpoint should be implemented in backend if not already there
      await api.patch('/accounts/organizations/me/', orgData);
      setMessage({ type: 'success', text: 'Organisation mise à jour.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour de l\'organisation.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><HiOutlineCog style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Paramètres</h1>
          <p>Configuration de l&apos;organisation et du profil</p>
        </div>
      </div>

      {message.text && (
        <div className={`card animate-in mb-md ${message.type === 'success' ? 'border-success' : 'border-danger'}`} 
             style={{ padding: '12px 20px', background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)' }}>
          <p style={{ color: message.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {message.type === 'success' && <HiOutlineCheckCircle />} {message.text}
          </p>
        </div>
      )}

      <div className="grid grid-2 animate-in delay-1">
        {/* Profile Card */}
        <div className="card-glass">
          <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HiOutlineUser /> Mon Profil
          </h3>
          <form onSubmit={handleProfileSave} className="flex flex-col gap-md">
            <div className="input-group">
              <label>Nom complet</label>
              <input 
                className="input" 
                value={profileData.full_name} 
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                placeholder="Votre nom"
                required
              />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input 
                className="input" 
                value={profileData.email} 
                type="email" 
                disabled 
                style={{ opacity: 0.6, cursor: 'not-allowed' }} 
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>L'email ne peut pas être modifié ici.</span>
            </div>
            <div className="input-group">
              <label>Rôle</label>
              <input 
                className="input" 
                value={user?.profile?.role?.toUpperCase() || 'ADMIN'} 
                disabled 
                style={{ opacity: 0.6, cursor: 'not-allowed' }} 
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Sauvegarder les modifications'}
            </button>
          </form>
        </div>

        {/* Organization Card */}
        <div className="card-glass">
          <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HiOutlineOfficeBuilding /> Organisation
          </h3>
          <form onSubmit={handleOrgSave} className="flex flex-col gap-md">
            <div className="input-group">
              <label>Nom de l&apos;entreprise</label>
              <input 
                className="input" 
                value={orgData.name} 
                onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                placeholder="Nom de l'organisation"
                required
              />
            </div>
            <div className="input-group">
              <label>Secteur d&apos;activité</label>
              <select 
                className="input"
                value={orgData.sector}
                onChange={(e) => setOrgData({ ...orgData, sector: e.target.value })}
              >
                <option value="Technologie">Technologie</option>
                <option value="Finance">Finance</option>
                <option value="Santé">Santé</option>
                <option value="Éducation">Éducation</option>
                <option value="Commerce">Commerce</option>
                <option value="Industrie">Industrie</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div className="input-group">
              <label>Plan actuel</label>
              <div className="flex items-center justify-between p-md rounded border border-dashed" style={{ borderColor: 'var(--primary)', background: 'rgba(14, 165, 233, 0.05)' }}>
                <span className="badge badge-primary" style={{ padding: '6px 12px' }}>Business Plan</span>
                <button type="button" className="btn btn-sm btn-ghost">Changer de plan</button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Mettre à jour l\'organisation'}
            </button>
          </form>
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
