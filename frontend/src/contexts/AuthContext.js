'use client';

/**
 * Konggest — Auth Context
 * Manages authentication state, login, register, logout.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const { access } = api.getTokens();
    if (access) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await api.get('/auth/profile/');
      setUser(data);
    } catch {
      api.clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login/', { email, password });
    api.setTokens(data.tokens.access, data.tokens.refresh);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (formData) => {
    const data = await api.post('/auth/register/', formData);
    api.setTokens(data.tokens.access, data.tokens.refresh);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    api.clearTokens();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
