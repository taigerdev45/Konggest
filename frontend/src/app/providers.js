'use client';

/**
 * Konggest — Client Providers
 * Wraps client-side contexts (React Query, Auth).
 */
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from '@/lib/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
