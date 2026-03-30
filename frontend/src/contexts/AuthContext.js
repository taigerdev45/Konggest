'use client';

/**
 * Konggest — Auth Context (Supabase + Django)
 * Uses Supabase for authentication, then fetches profile from Django API.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://konggest-backend:8000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileFromDjango = async (session) => {
    if (!session?.access_token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/profile/`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'omit',
      });
      if (res.ok) {
        return await res.json();
      }
      console.warn('Profile fetch failed:', res.status);
      return null;
    } catch (err) {
      console.error('Error fetching Django profile:', err);
      return null;
    }
  };

  const fetchSessionAndProfile = async (sessionUser, session) => {
    if (!sessionUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Fetch profile from Django API (which auto-creates the user if needed)
    const djangoProfile = await fetchProfileFromDjango(session);

    if (djangoProfile) {
      setUser({
        ...sessionUser,
        profile: {
          role: djangoProfile.role || 'admin',
          full_name: djangoProfile.full_name || sessionUser.email,
          is_saas_admin: djangoProfile.is_saas_admin || false,
          redirect_to: djangoProfile.redirect_to || '/dashboard',
          organization: djangoProfile.organization
            ? { id: djangoProfile.organization, name: djangoProfile.organization_name || 'Organisation' }
            : null,
          ...djangoProfile,
        },
      });
    } else {
      // Fallback: use Supabase metadata directly
      const meta = sessionUser.user_metadata || {};
      setUser({
        ...sessionUser,
        profile: {
          role: meta.role || 'admin',
          full_name: meta.full_name || sessionUser.email,
          is_saas_admin: false,
          redirect_to: '/dashboard',
          organization: { name: meta.organization_name || 'Mon Organisation' },
        },
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchSessionAndProfile(session?.user, session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchSessionAndProfile(session?.user, session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Traduire les erreurs Supabase en français
      if (error.message?.includes('email_not_confirmed') || error.code === 'email_not_confirmed') {
        throw new Error('Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception.');
      }
      if (error.message?.includes('invalid_credentials') || error.code === 'invalid_credentials') {
        throw new Error('Email ou mot de passe incorrect.');
      }
      if (error.message?.includes('invalid_login') || error.code === 'invalid_login') {
        throw new Error('Email ou mot de passe incorrect.');
      }
      if (error.message?.includes('user_not_found') || error.code === 'user_not_found') {
        throw new Error('Utilisateur non trouvé.');
      }
      throw error;
    }
    return data;
  }, []);

  const register = useCallback(async (formData) => {
    const { email, password, first_name, last_name, organization_name } = formData;
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: `${first_name} ${last_name}`.trim(),
          role: 'admin',
          organization_name: organization_name,
        }
      }
    });
    if (error) {
      if (error.message?.includes('already registered') || error.code === 'user_already_exists') {
        throw new Error('Cet email est déjà utilisé.');
      }
      throw error;
    }
    // Si confirmation email requise
    if (data?.user && data.user.identities?.length === 0) {
      throw new Error('Un email de confirmation a été envoyé. Vérifiez votre boîte de réception.');
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
