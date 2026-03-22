/**
 * Konggest — API Client
 * Secure fetch wrapper. Uses Supabase Auth to get active JWTs and attaches them to Django API calls.
 */
import { supabase } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://konggest-backend:8000/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    // Get valid session from Supabase (auto-refreshes if needed)
    const { data: { session } } = await supabase.auth.getSession();
    const access = session?.access_token;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (access) {
      headers['Authorization'] = `Bearer ${access}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'omit', // Standard cross-origin JWT bearer approach
      });

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch {
          // If response is not JSON
        }
        throw { status: response.status, ...errorData };
      }

      if (response.status === 204) return null;
      return await response.json();
    } catch (error) {
      if (error.status) throw error;
      throw { status: 0, error: 'Erreur réseau. Vérifiez votre connexion.' };
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
