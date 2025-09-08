// app/layout-client.tsx

'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './globals.css';
import { Amplify } from 'aws-amplify';
import config from '@/amplify_outputs.json';
import Sidebar from './components/layout/Sidebar';
import UserProfileMenu from './components/layout/UserProfileMenu';
import { useEffect, useState } from 'react';
import { useUserAccess } from './hooks/useUserAccess';

Amplify.configure({
  ...config,
  API: {
    GraphQL: {
      endpoint: config.data.url,
      region: config.data.aws_region,
      defaultAuthMode: 'userPool',
     }
  }
});

interface UserAttributes {
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

// ✅ ADDED: User info component to display name and email
function UserInfo({ user }: { user: any }) {
  const { userAccess, isReady } = useUserAccess();
  const [displayName, setDisplayName] = useState('');
  const [displayEmail, setDisplayEmail] = useState('');

  useEffect(() => {
    if (isReady && userAccess) {
      // Use userAccess data first, then fallback to user data
      setDisplayName(userAccess.name || user?.username || 'Unknown User');
      setDisplayEmail(userAccess.email || user?.signInDetails?.loginId || user?.username || '');
    } else if (user) {
      // Fallback to user data if userAccess not ready
      setDisplayName(user.username || 'Unknown User');
      setDisplayEmail(user.signInDetails?.loginId || user.username || '');
    }
  }, [userAccess, isReady, user]);

  if (!displayName && !displayEmail) {
    return (
      <div className="text-sm text-gray-500">
        Loading user info...
      </div>
    );
  }

  return (
    <div className="flex flex-col text-sm">
       {/*<span className="text-gray-900 font-medium">{displayName}</span>*/}
       {/*<span className="text-gray-500 text-xs">{displayEmail}</span>*/}
    </div>
  );
}

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    console.log('=== AMPLIFY CONFIGURATION ===');
    console.log('AppSync API Endpoint:', process.env.NEXT_PUBLIC_APPSYNC_API_URL);
    console.log('Cognito User Pool ID:', process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID);
    console.log('Environment:', process.env.NEXT_PUBLIC_ENV || 'local');
    console.log('=========================');
  }, []);
  
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="flex bg-[var(--background)] min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen">
            <header className="fixed top-0 left-64 right-0 bg-white border-b border-gray-200 z-10">
              <div className="flex items-center justify-between px-6 py-2">
                {/* ✅ ENHANCED: Added logo and improved title layout */}
                <div className="flex items-center gap-3">
             
                  <h1 className="text-lg font-semibold text-gray-900">
                    Safety Information Management System
                  </h1>
                </div>
                
                {/* ✅ MODIFIED: Replaced Plant Name with User Info */}
                <div className="flex items-center gap-6">
                  <UserInfo user={user} />
                  <UserProfileMenu
                    signOut={signOut}
                    userEmail={user?.signInDetails?.loginId || user?.username || ''}
                    userName={user?.username}
                  />
                </div>
              </div>
            </header>
            <main className="flex-1 pt-14">
              <div className="p-2">
                {children}
              </div>
            </main>
            <footer className="text-center py-3 text-xs text-gray-400">
              © 2025 Safety Information Management System
            </footer>
          </div>
        </div>
      )}
    </Authenticator>
  );
}
