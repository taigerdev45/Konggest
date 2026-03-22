'use client';

/**
 * Konggest — Supabase Auth Context
 * Pure BaaS authentication using Supabase.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSessionAndProfile = async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    // Fetch profile and organization data securely via RLS
    const { data: profile, error } = await supabase
      .from('accounts_userprofile')
      .select('*, organization:accounts_organization(id, name, slug)')
      .eq('id', sessionUser.id)
      .single();

    if (error) {
      console.error('Error fetching Supabase profile:', error);
      // Still set user to avoid infinite loading loops
      setUser({ ...sessionUser, profile: null });
    } else {
      setUser({ ...sessionUser, profile });
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchSessionAndProfile(session?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchSessionAndProfile(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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
    if (error) throw error;
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
