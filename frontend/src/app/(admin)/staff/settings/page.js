'use client';

/**
 * Konggest — Platform Settings (SaaS Admin)
 */
import { useState } from 'react';
import { HiOutlineCog, HiOutlineSave, HiOutlineShieldCheck, HiOutlineGlobe, HiOutlineMail } from 'react-icons/hi';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    platformName: 'Konggest',
    supportEmail: 'support@konggest.com',
    maxOrganizations: 100,
    defaultPlan: 'free',
    maintenanceMode: false,
    allowRegistration: true,
    forceSSL: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const saveSettings = () => {
    // In a real app, this would call an API endpoint
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>⚙️ Paramètres Plateforme</h1>
          <p>Configuration globale de Konggest</p>
        </div>
        <button className="btn btn-primary" onClick={saveSettings}>
          <HiOutlineSave /> Enregistrer
        </button>
      </div>

      {saved && (
        <div style={{ padding: '12px 20px', marginBottom: 20, background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 12, color: 'var(--success)', fontSize: '0.9rem' }}>
          ✓ Paramètres enregistrés avec succès.
        </div>
      )}

      <div className="grid grid-2 gap-lg">
        {/* General */}
        <div className="card">
          <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineGlobe /> Général
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 500 }}>Nom de la plateforme</label>
              <input className="input" value={settings.platformName} onChange={e => handleChange('platformName', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 500 }}>Email support</label>
              <input className="input" type="email" value={settings.supportEmail} onChange={e => handleChange('supportEmail', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 500 }}>Plan par défaut</label>
              <select className="input" value={settings.defaultPlan} onChange={e => handleChange('defaultPlan', e.target.value)}>
                <option value="free">Gratuit</option>
                <option value="starter">Starter</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 500 }}>Max. organisations</label>
              <input className="input" type="number" value={settings.maxOrganizations} onChange={e => handleChange('maxOrganizations', parseInt(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card">
          <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineShieldCheck /> Sécurité
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
              <div>
                <span style={{ fontWeight: 500 }}>Mode maintenance</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Bloque l'accès aux clients
                </p>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={settings.maintenanceMode} onChange={e => handleChange('maintenanceMode', e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
              <div>
                <span style={{ fontWeight: 500 }}>Inscriptions ouvertes</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Autorise les nouvelles inscriptions
                </p>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={settings.allowRegistration} onChange={e => handleChange('allowRegistration', e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
              <div>
                <span style={{ fontWeight: 500 }}>Forcer SSL</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Exige une connexion chiffrée
                </p>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={settings.forceSSL} onChange={e => handleChange('forceSSL', e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 500 }}>Timeout session (minutes)</label>
              <input className="input" type="number" value={settings.sessionTimeout} onChange={e => handleChange('sessionTimeout', parseInt(e.target.value))} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 500 }}>Tentatives de connexion max</label>
              <input className="input" type="number" value={settings.maxLoginAttempts} onChange={e => handleChange('maxLoginAttempts', parseInt(e.target.value))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
