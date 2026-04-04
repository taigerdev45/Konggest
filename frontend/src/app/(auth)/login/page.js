'use client';

/**
 * Konggest — Authentication Page
 * Enhanced login and registration with better UX, icons, and validation.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  HiOutlineMail, 
  HiOutlineLockClosed, 
  HiOutlineEye, 
  HiOutlineEyeOff,
  HiOutlineOfficeBuilding,
  HiOutlineUser,
  HiOutlineExclamationCircle,
  HiOutlineCheck
} from 'react-icons/hi';
import styles from './login.module.css';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [orgName, setOrgName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login, register } = useAuth();
  const router = useRouter();
  
  // Handle intelligent redirection based on profile
  useEffect(() => {
    if (user?.profile?.redirect_to) {
      router.push(user.profile.redirect_to);
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isRegister) {
      if (password !== passwordConfirm) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }
      if (!agreedTerms) {
        setError('Veuillez accepter les conditions d\'utilisation.');
        return;
      }
    }

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
    } catch (err) {
      const msg = err.message || err.error || err.detail || 'Une erreur est survenue.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Animated background elements */}
      <div className={styles.bgGradient} />
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <div className={`${styles.card} ${isRegister ? styles.card_large : ''}`}>
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>
            <img src="/logo.png" alt="Konggest Logo" width={64} height={64} />
          </div>
          <h1 className={styles.logoText}>Konggest</h1>
          <p className={styles.subtitle}>
            {isRegister ? 'Propulsez votre gestion RH au Gabon' : 'Espace de Travail Collaboratif'}
          </p>
        </div>

        {/* Error message with icon */}
        {error && (
          <div className={styles.error}>
            <HiOutlineExclamationCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {isRegister && (
            <>
              {/* Organization and Name fields for registration */}
              <div className={styles.inputGroup}>
                <label htmlFor="org-name">Nom de votre entreprise</label>
                <div className={styles.inputWrapper}>
                  <HiOutlineOfficeBuilding className={styles.inputIcon} />
                  <input
                    id="org-name"
                    type="text"
                    className={styles.authInput}
                    placeholder="Ex: Gabon Logistics SA"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label htmlFor="first-name">Prénom</label>
                  <div className={styles.inputWrapper}>
                    <HiOutlineUser className={styles.inputIcon} />
                    <input
                      id="first-name"
                      type="text"
                      className={styles.authInput}
                      placeholder="Jean"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="last-name">Nom</label>
                  <div className={styles.inputWrapper}>
                    <HiOutlineUser className={styles.inputIcon} />
                    <input
                      id="last-name"
                      type="text"
                      className={styles.authInput}
                      placeholder="Mba"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email">Adresse email</label>
            <div className={styles.inputWrapper}>
              <HiOutlineMail className={styles.inputIcon} />
              <input
                id="email"
                type="email"
                className={styles.authInput}
                placeholder="jean.mba@entreprise.ga"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Mot de passe</label>
            <div className={styles.inputWrapper}>
              <HiOutlineLockClosed className={styles.inputIcon} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={styles.authInput}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button 
                type="button" 
                className={styles.eyeButton} 
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="password-confirm">Confirmer le mot de passe</label>
                <div className={styles.inputWrapper}>
                  <HiOutlineLockClosed className={styles.inputIcon} />
                  <input
                    id="password-confirm"
                    type={showPassword ? "text" : "password"}
                    className={styles.authInput}
                    placeholder="••••••••••••"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
              
              {/* Terms Checkbox */}
              <div className={styles.terms}>
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={agreedTerms} 
                  onChange={(e) => setAgreedTerms(e.target.checked)} 
                />
                <label htmlFor="terms">
                  J&apos;accepte les <a href="#">Conditions d&apos;utilisation</a> et la <a href="#">Politique de confidentialité</a> de Konggest.
                </label>
              </div>
            </>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <span className={styles.btnSpinner} />
            ) : (
              <>
                {isRegister ? "S'inscrire gratuitement" : "Se connecter"}
                <HiOutlineCheck size={18} />
              </>
            )}
          </button>
        </form>

        {/* Switch between Login and Register */}
        <div className={styles.toggle}>
          <span>{isRegister ? 'Vous avez déjà un compte ?' : 'Nouveau sur Konggest ?'}</span>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setShowPassword(false);
            }}
          >
            {isRegister ? 'Connectez-vous' : "Créez un compte"}
          </button>
        </div>
      </div>
    </div>
  );
}
