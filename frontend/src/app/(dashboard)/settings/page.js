'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HiOutlineCog, HiOutlineUser, HiOutlineOfficeBuilding, HiOutlineCheckCircle, HiOutlineUsers, HiOutlineKey, HiOutlineGlobe } from 'react-icons/hi';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const userRole = user?.profile?.role || 'employee';
  const isEmployee = userRole === 'employee';
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
  });
  const [orgData, setOrgData] = useState({
    name: '',
    sector: 'Technologie',
  });
  const [pwData, setPwData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'info' });

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
      setToast({ show: true, text: 'Profil mis à jour avec succès.', type: 'success' });
    } catch (err) {
      setToast({ show: true, text: 'Erreur lors de la mise à jour du profil.', type: 'error' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast({ show: false, text: '', type: 'info' }), 3000);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwData.new_password !== pwData.confirm_password) {
      setToast({ show: true, text: 'Les nouveaux mots de passe ne correspondent pas.', type: 'error' });
      setTimeout(() => setToast({ show: false, text: '', type: 'info' }), 3000);
      return;
    }
    setPwSubmitting(true);
    try {
      await api.post('/auth/change-password/', pwData);
      setToast({ show: true, text: 'Mot de passe modifié avec succès.', type: 'success' });
      setPwData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      const msg = err?.error || 'Erreur lors du changement de mot de passe.';
      setToast({ show: true, text: msg, type: 'error' });
    } finally {
      setPwSubmitting(false);
      setTimeout(() => setToast({ show: false, text: '', type: 'info' }), 4000);
    }
  };

  const handleOrgSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch('/accounts/organizations/me/', orgData);
      setToast({ show: true, text: 'Organisation mise à jour.', type: 'success' });
    } catch (err) {
      setToast({ show: true, text: 'Erreur lors de la mise à jour de l\'organisation.', type: 'error' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast({ show: false, text: '', type: 'info' }), 3000);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-[#FDFDFF]">
      {toast.show && (
        <div className={`fixed bottom-8 right-8 z-[1000] px-6 py-4 rounded-[2rem] shadow-xl flex items-center gap-3 text-white animate-in slide-in-from-right-10 ${toast.type === 'error' ? 'bg-red-500/95' : 'bg-emerald-500/95'}`}>
          {toast.type === 'success' ? <HiOutlineCheckCircle className="text-xl" /> : <HiOutlineCog className="text-xl" />}
          <span className="font-black">{toast.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="px-6 md:px-12 pt-8 md:pt-12 pb-8 md:pb-10 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div className="animate-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-1 bg-blue-500 rounded-full"></div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">PRÉFÉRENCES</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-3">
            Paramètres
          </h1>
          <p className="text-gray-400 font-medium text-sm md:text-base max-w-lg">
            Gérez votre profil, l'organisation et les configurations système.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-12 pb-12 flex-1">
        <div className={`grid gap-8 ${isEmployee ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {/* Profile Card */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8 animate-in slide-in-from-left-4 duration-700">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-[1.5rem] bg-blue-100 text-blue-600 flex items-center justify-center">
                <HiOutlineUser size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Mon Profil</h3>
                <p className="text-xs text-gray-400 font-medium">Gérez vos informations personnelles.</p>
              </div>
            </div>
            
            <form onSubmit={handleProfileSave} className="flex flex-col gap-5">
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Nom complet</label>
                <input 
                  className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-[1.5rem] px-5 py-4 text-sm text-gray-800 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold" 
                  value={profileData.full_name} 
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  placeholder="Ex: Régis Obame"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Adresse Email</label>
                <input 
                  className="w-full border-2 border-gray-100 bg-gray-100 rounded-[1.5rem] px-5 py-4 text-sm text-gray-600 font-bold cursor-not-allowed" 
                  value={profileData.email} 
                  type="email" 
                  disabled 
                />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-2">L&apos;email est lié à votre compte d&apos;authentification.</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Rôle d&apos;accès</label>
                <div className="border-2 border-gray-100 bg-gray-50/50 rounded-[1.5rem] px-5 py-4 flex items-center gap-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-600">
                    {user?.profile?.role?.toUpperCase() || 'ADMIN'}
                  </span>
                </div>
              </div>
              <button type="submit" className="mt-2 bg-blue-600 text-white font-black px-6 py-4 rounded-[1.5rem] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all hover:-translate-y-1 text-xs uppercase tracking-widest ring-1 ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0" disabled={submitting}>
                {submitting ? 'Mise à jour...' : 'Sauvegarder le profil'}
              </button>
            </form>
          </div>

          {/* Organization Card — masqué pour les employés */}
          {!isEmployee && <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8 animate-in slide-in-from-right-4 duration-700">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-[1.5rem] bg-purple-100 text-purple-600 flex items-center justify-center">
                <HiOutlineOfficeBuilding size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Organisation</h3>
                <p className="text-xs text-gray-400 font-medium">Configurez l&apos;identité de votre entreprise.</p>
              </div>
            </div>

            <form onSubmit={handleOrgSave} className="flex flex-col gap-5">
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Nom de l&apos;entreprise</label>
                <input 
                  className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-[1.5rem] px-5 py-4 text-sm text-gray-800 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/5 outline-none transition-all font-bold" 
                  value={orgData.name} 
                  onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                  placeholder="Ex: Konggest Inc."
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Secteur d&apos;activité</label>
                <select 
                  className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-[1.5rem] px-5 py-4 text-sm text-gray-800 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/5 outline-none transition-all font-bold"
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
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Abonnement</label>
                <div className="flex items-center justify-between p-5 rounded-[1.5rem] bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-dashed border-blue-100">
                  <div>
                    <div className="font-black text-blue-700">Business Plan</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Actif jusqu&apos;au 31 Déc. 2026</div>
                  </div>
                  <button type="button" className="bg-white text-blue-600 border border-blue-100 px-4 py-2 rounded-[1rem] text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all">Gérer</button>
                </div>
              </div>
              <button type="submit" className="mt-2 bg-purple-600 text-white font-black px-6 py-4 rounded-[1.5rem] shadow-xl shadow-purple-500/20 hover:bg-purple-700 transition-all hover:-translate-y-1 text-xs uppercase tracking-widest ring-1 ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0" disabled={submitting}>
                {submitting ? 'Mise à jour...' : 'Mettre à jour l&apos;organisation'}
              </button>
            </form>
          </div>}
        </div>

        {/* Security Card */}
        <div className="mt-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8 animate-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-[1.5rem] bg-amber-100 text-amber-600 flex items-center justify-center">
              <HiOutlineKey size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Sécurité — Changer le mot de passe</h3>
              <p className="text-xs text-gray-400 font-medium">Modifiez votre mot de passe de connexion.</p>
            </div>
          </div>
          <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Mot de passe actuel</label>
              <input
                type="password"
                className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-[1.5rem] px-5 py-4 text-sm text-gray-800 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/5 outline-none transition-all font-bold"
                value={pwData.old_password}
                onChange={(e) => setPwData({ ...pwData, old_password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Nouveau mot de passe</label>
              <input
                type="password"
                className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-[1.5rem] px-5 py-4 text-sm text-gray-800 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/5 outline-none transition-all font-bold"
                value={pwData.new_password}
                onChange={(e) => setPwData({ ...pwData, new_password: e.target.value })}
                placeholder="Min. 8 caractères"
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-gray-400 mb-3 tracking-[0.2em] ml-1">Confirmer le nouveau</label>
              <input
                type="password"
                className="w-full border-2 border-gray-100 bg-gray-50/50 rounded-[1.5rem] px-5 py-4 text-sm text-gray-800 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/5 outline-none transition-all font-bold"
                value={pwData.confirm_password}
                onChange={(e) => setPwData({ ...pwData, confirm_password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="bg-amber-500 text-white font-black px-6 py-4 rounded-[1.5rem] shadow-xl shadow-amber-500/20 hover:bg-amber-600 transition-all hover:-translate-y-1 text-xs uppercase tracking-widest ring-1 ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0" disabled={pwSubmitting}>
                {pwSubmitting ? 'Mise à jour...' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>
        </div>

        {/* Quick Links Section — masqué pour les employés */}
        {!isEmployee && <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5 animate-in slide-in-from-bottom-4 duration-700">
          <Link href="/settings/organization" className="group bg-white rounded-[2rem] border border-gray-100 shadow-lg shadow-gray-200/30 p-6 hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-[1.25rem] bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
              <HiOutlineOfficeBuilding size={24} />
            </div>
            <h4 className="font-black text-gray-900 mb-1">Organisation</h4>
            <p className="text-xs text-gray-400 font-medium">Départements, lieux & congés</p>
          </Link>
          
          <Link href="/users" className="group bg-white rounded-[2rem] border border-gray-100 shadow-lg shadow-gray-200/30 p-6 hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-[1.25rem] bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
              <HiOutlineUsers size={24} />
            </div>
            <h4 className="font-black text-gray-900 mb-1">Gestion des Accès</h4>
            <p className="text-xs text-gray-400 font-medium">Équipe, rôles & permissions</p>
          </Link>

          <Link href="/audit-logs" className="group bg-white rounded-[2rem] border border-gray-100 shadow-lg shadow-gray-200/30 p-6 hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-[1.25rem] bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
              <HiOutlineKey size={24} />
            </div>
            <h4 className="font-black text-gray-900 mb-1">Audit Logs</h4>
            <p className="text-xs text-gray-400 font-medium">Traçabilité & sécurité</p>
          </Link>
        </div>}
      </div>
    </div>
  );
}
