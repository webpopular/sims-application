// app/providers/AuthProvider.tsx
'use client';

import { createContext, useContext, type ReactNode } from 'react';
import '@/app/amplify-config';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  userGroups: string[];
  username: string | null;
  signOut: () => Promise<void>;
}

// Create context with initial value
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  userGroups: [],
  username: null,
  signOut: async () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={{
    isAuthenticated: false,
    loading: true,
    userGroups: [],
    username: null,
    signOut: async () => {}
  }}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
