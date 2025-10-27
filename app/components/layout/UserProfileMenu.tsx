'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { AuthEventData } from '@aws-amplify/ui';
import { useUserAccess } from '@/app/hooks/useUserAccess';

interface UserProfileMenuProps {
  signOut?: (data?: AuthEventData | undefined) => void;
  userEmail: string;
  userName?: string;
  name?: string;
}

export default function UserProfileMenu({ signOut, userEmail, userName, name }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { userAccess, loading } = useUserAccess();

  const handleSignOut = () => {
    if (signOut) signOut();
  };

  // Wait until data is loaded and userAccess is available
  if (loading || !userAccess) {
    return null;
  }

  const displayName = userAccess.name || name || userName || '';
  const displayEmail = userAccess.email || userEmail || '';
  const roleTitle = userAccess.roleTitle || '';
  const avatarInitials = displayName
      ? displayName
          .split(' ')
          .map(n => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase()
      : (displayEmail.charAt(0) || '').toUpperCase();

  return (
      <div className="relative">
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[#cb4154] text-white hover:bg-red-700 transition-colors font-medium text-sm"
            aria-expanded={isOpen}
            aria-haspopup="true"
            title={displayName && displayEmail ? `${displayName} (${displayEmail})` : ''}
        >
          {avatarInitials}
        </button>

        {isOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-20 py-2">
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#cb4154] text-white font-medium">
                      {avatarInitials}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      {displayName && (
                          <span className="text-sm font-semibold text-gray-900 truncate">
                      {displayName}
                    </span>
                      )}
                      {displayEmail && (
                          <span className="text-xs text-gray-600 truncate">{displayEmail}</span>
                      )}
                      {roleTitle && (
                          <div className="mt-1 flex items-center text-xs">
                            <span className="text-gray-500">Role:</span>
                            <span className="text-gray-700 font-medium truncate ml-2">{roleTitle}</span>
                          </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-3 text-left text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </>
        )}
      </div>
  );
}
