/**
 * Konggest — API Client
 * Secure fetch wrapper with JWT and CSRF support.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://localhost/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
    this.accessToken = null;
    this.refreshToken = null;
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('konggest_access', access);
      localStorage.setItem('konggest_refresh', refresh);
    }
  }

  getTokens() {
    if (typeof window !== 'undefined' && !this.accessToken) {
      this.accessToken = localStorage.getItem('konggest_access');
      this.refreshToken = localStorage.getItem('konggest_refresh');
    }
    return { access: this.accessToken, refresh: this.refreshToken };
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('konggest_access');
      localStorage.removeItem('konggest_refresh');
    }
  }

  async request(endpoint, options = {}) {
    const { access } = this.getTokens();
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (access) {
      headers['Authorization'] = `Bearer ${access}`;
    }

    try {
      let response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      // Auto-refresh on 401
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(url, { ...options, headers, credentials: 'include' });
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw { status: response.status, ...error };
      }

      if (response.status === 204) return null;
      return await response.json();
    } catch (error) {
      if (error.status) throw error;
      throw { status: 0, error: 'Erreur réseau. Vérifiez votre connexion.' };
    }
  }

  async refreshAccessToken() {
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        this.setTokens(data.access, data.refresh || this.refreshToken);
        return true;
      }
      this.clearTokens();
      return false;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // Convenience methods
  get(endpoint) { return this.request(endpoint); }
  post(endpoint, data) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }); }
  put(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }); }
  patch(endpoint, data) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }); }
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}

const api = new ApiClient();
export default api;
