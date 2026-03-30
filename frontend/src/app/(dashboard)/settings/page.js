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
        <div className={`toast animate-in ${message.type === 'success' ? 'toast-success' : 'toast-error'}`} 
             style={{ 
               position: 'fixed', 
               bottom: '30px', 
               right: '30px', 
               zIndex: 1000,
               padding: '16px 24px',
               borderRadius: 'var(--radius-lg)',
               background: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
               color: 'white',
               boxShadow: 'var(--shadow-xl)',
               display: 'flex',
               alignItems: 'center',
               gap: '12px',
               fontWeight: 600
             }}>
          {message.type === 'success' ? <HiOutlineCheckCircle fontSize="1.4rem" /> : <HiOutlineCog fontSize="1.4rem" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-2 gap-lg animate-in delay-1">
        {/* Profile Card */}
        <div className="card shadow-md">
          <div className="flex items-center gap-md mb-lg">
            <div className="avatar avatar-md" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', border: 'none' }}>
              <HiOutlineUser />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Mon Profil</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gérez vos informations personnelles.</p>
            </div>
          </div>
          
          <form onSubmit={handleProfileSave} className="flex flex-col gap-md">
            <div className="input-group">
              <label className="label">Nom complet</label>
              <input 
                className="input" 
                value={profileData.full_name} 
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                placeholder="Ex: Jean Dupont"
                required
              />
            </div>
            <div className="input-group">
              <label className="label">Adresse Email</label>
              <input 
                className="input bg-secondary" 
                value={profileData.email} 
                type="email" 
                disabled 
                style={{ cursor: 'not-allowed' }} 
              />
              <span className="helper-text">L&apos;email est lié à votre compte d&apos;authentification.</span>
            </div>
            <div className="input-group">
              <label className="label">Rôle d&apos;accès</label>
              <div className="input bg-secondary flex items-center gap-sm">
                <span className="badge badge-primary">{user?.profile?.role?.toUpperCase() || 'ADMIN'}</span>
              </div>
            </div>
            <div className="mt-md pt-md border-top">
              <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                {submitting ? 'Mise à jour...' : 'Sauvegarder le profil'}
              </button>
            </div>
          </form>
        </div>

        {/* Organization Card */}
        <div className="card shadow-md">
          <div className="flex items-center gap-md mb-lg">
            <div className="avatar avatar-md" style={{ background: 'var(--accent-light)', color: 'white', border: 'none', backgroundOpacity: 0.1 }}>
              <HiOutlineOfficeBuilding />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Organisation</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Configurez l&apos;identité de votre entreprise.</p>
            </div>
          </div>

          <form onSubmit={handleOrgSave} className="flex flex-col gap-md">
            <div className="input-group">
              <label className="label">Nom de l&apos;entreprise</label>
              <input 
                className="input" 
                value={orgData.name} 
                onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                placeholder="Ex: Konggest Inc."
                required
              />
            </div>
            <div className="input-group">
              <label className="label">Secteur d&apos;activité</label>
              <select 
                className="input"
                value={orgData.sector}
                onChange={(e) => setOrgData({ ...orgData, sector: e.target.value })}
              >
                <option value="Technologie">Technologie & Logiciel</option>
                <option value="Finance">Services Financiers</option>
                <option value="Santé">Santé & Médical</option>
                <option value="Éducation">Éducation & Formation</option>
                <option value="Commerce">Commerce & Retail</option>
                <option value="Industrie">Industrie & Manufacturier</option>
                <option value="Autre">Autre secteur</option>
              </select>
            </div>
            <div className="input-group">
              <label className="label">Abonnement</label>
              <div className="flex items-center justify-between p-md rounded-lg border-dashed" style={{ border: '2px dashed var(--primary-light)', background: 'var(--primary-glow)' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>Business Plan</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Actif jusqu&apos;au 31 Déc. 2026</div>
                </div>
                <button type="button" className="btn btn-sm btn-ghost">Gérer</button>
              </div>
            </div>
            <div className="mt-md pt-md border-top">
              <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                {submitting ? 'Mise à jour...' : 'Mettre à jour l&apos;organisation'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card-glass mt-xl animate-in delay-2" style={{ border: '1px solid var(--primary-glow)', padding: '24px 32px' }}>
        <div className="flex items-center justify-between gap-lg">
          <div>
            <h3 style={{ margin: '0 0 4px 0' }}>Gestion des Accès Équipe</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Gérez les invitations et les rôles de vos administrateurs et managers.</p>
          </div>
          <Link href="/users" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
            Accéder à l&apos;équipe →
          </Link>
        </div>
      </div>
    </div>
  );
}
