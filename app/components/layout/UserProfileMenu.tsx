// app/components/layout/UserProfileMenu.tsx - Enhanced with better user display
'use client';

import { useState } from 'react';
import { LogOut, User } from "lucide-react";
import { AuthEventData } from '@aws-amplify/ui';
import { useUserAccess } from '@/app/hooks/useUserAccess';

interface UserProfileMenuProps {
  signOut: ((data?: AuthEventData | undefined) => void) | undefined;
  userEmail: string;
  userName?: string;
  name?: string;
}

export default function UserProfileMenu({ signOut, userEmail, userName, name }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { userAccess } = useUserAccess();

  const handleSignOut = () => {
    if (signOut) {
      signOut();
    }
  };

  // ✅ Enhanced user display logic
  const displayName = userAccess?.name || name || userName || 'User';
  const displayEmail = userEmail;
  const roleTitle = userAccess?.roleTitle || 'Unknown Role';
  const accessScope = userAccess?.accessScope || 'Unknown';
  const level = userAccess?.level || 'N/A';

  // Get initials for avatar (first letter of first and last name, or first two letters of email)
  const getInitials = () => {
    if (displayName && displayName !== 'User') {
      const nameParts = displayName.split(' ');
      if (nameParts.length >= 2) {
        return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
      }
      return displayName.charAt(0).toUpperCase();
    }
    return userEmail.charAt(0).toUpperCase();
  };

  const avatarInitials = getInitials();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#cb4154] text-white hover:bg-red-700 transition-colors font-medium text-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={`${displayName} (${displayEmail})`}
      >
        {avatarInitials}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-20 py-2">
            {/* ✅ Enhanced User Info Section */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-start space-x-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#cb4154] text-white font-medium">
                  {avatarInitials}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {displayName}
                  </span>
                  <span className="text-xs text-gray-600 truncate">
                    {displayEmail}
                  </span>
                  <div className="mt-1 space-y-1">
  <div className="flex items-center text-xs">
    <span className="text-gray-500">Role:</span>
    <span className="text-gray-700 font-medium truncate ml-2">{roleTitle}</span>
  </div>
</div>

                </div>
              </div>
            </div>
 
            

            {/* ✅ Sign Out Button */}
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
