'use client';

/**
 * Konggest — Login Page
 * Premium auth page with glassmorphism.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './login.module.css';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [orgName, setOrgName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register({
          email,
          password,
          password_confirm: passwordConfirm,
          first_name: firstName,
          last_name: lastName,
          organization_name: orgName,
        });
      } else {
        await login(email, password);
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err.error || err.detail || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Animated background */}
      <div className={styles.bgGradient} />
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>K</div>
          <h1 className={styles.logoText}>Konggest</h1>
          <p className={styles.subtitle}>
            {isRegister ? 'Créez votre espace RH' : 'Connectez-vous à votre espace'}
          </p>
        </div>

        {/* Error */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {isRegister && (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="org-name">Nom de l&apos;entreprise</label>
                <input
                  id="org-name"
                  type="text"
                  className="input"
                  placeholder="Mon entreprise"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label htmlFor="first-name">Prénom</label>
                  <input
                    id="first-name"
                    type="text"
                    className="input"
                    placeholder="Jean"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="last-name">Nom</label>
                  <input
                    id="last-name"
                    type="text"
                    className="input"
                    placeholder="Dupont"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="email@entreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          {isRegister && (
            <div className={styles.inputGroup}>
              <label htmlFor="password-confirm">Confirmer le mot de passe</label>
              <input
                id="password-confirm"
                type="password"
                className="input"
                placeholder="••••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? (
              <span className={styles.btnSpinner} />
            ) : isRegister ? (
              'Créer mon compte'
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className={styles.toggle}>
          <span>{isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}</span>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
          >
            {isRegister ? 'Se connecter' : "S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
}
