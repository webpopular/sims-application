// app/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, fetchAuthSession, signOut as amplifySignOut } from 'aws-amplify/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  userGroups: string[];
  loading: boolean;
  isAdmin: boolean;
  username: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userGroups: [] as string[],
  loading: true,
  isAdmin: false,
  username: null,
  signOut: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userGroups: [] as string[],
    loading: true,
    isAdmin: false,
    username: null as string | null
  });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];
      console.log('User groups:', groups);

      setAuthState({
        isAuthenticated: true,
        userGroups: groups,
        loading: false,
        isAdmin: groups.includes('admin'),
        username: user.username
      });
    } catch {
      setAuthState({
        isAuthenticated: false,
        userGroups: [],
        loading: false,
        isAdmin: false,
        username: null
      });
    }
  }

  async function signOut() {
    try {
      await amplifySignOut();
      setAuthState({
        isAuthenticated: false,
        userGroups: [],
        loading: false,
        isAdmin: false,
        username: null
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  return (
    <AuthContext.Provider value={{
      ...authState,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);