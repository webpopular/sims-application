// app/admin/profile/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';

interface MenuAccess {
  [key: string]: boolean;
}

export default function ProfileSettings() {
  const { isAdmin } = useAuth();
  
  // Initialize access settings for all menu items
  const [menuAccess, setMenuAccess] = useState<MenuAccess>({
    'Review QR Code Submissions': true,
    'Report a New Injury': true,
    'Report a New Observation': true,
    'Injury Reports': true,
    'Observation Reports': true,
    'Open & Closed Incidents': true,
    'Safety Alerts': true,
    'Lessons Learned': true
  });

  const handleAccessToggle = (menuItem: string) => {
    setMenuAccess(prev => ({
      ...prev,
      [menuItem]: !prev[menuItem]
    }));
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-medium text-gray-800 mb-6">Your Profile & Settings</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-700 mb-4">Menu Access Control</h2>
          
          {/* QR Codes Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Employee Self Reporting</h3>
            <div className="space-y-2">
              <AccessToggle
                title="Review QR Code Submissions"
                enabled={menuAccess['Review QR Code Submissions']}
                onChange={() => handleAccessToggle('Review QR Code Submissions')}
              />
            </div>
          </div>

          {/* First Reporting Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Draft a First Report via SIMS</h3>
            <div className="space-y-2">
              <AccessToggle
                title="Report a New Injury"
                enabled={menuAccess['Report a New Injury']}
                onChange={() => handleAccessToggle('Report a New Injury')}
              />
              <AccessToggle
                title="Report a New Observation"
                enabled={menuAccess['Report a New Observation']}
                onChange={() => handleAccessToggle('Report a New Observation')}
              />
            </div>
          </div>

          {/* Continue with other sections... */}
        </div>
      </div>
    </div>
  );
}

// Toggle Switch Component
function AccessToggle({ 
  title, 
  enabled, 
  onChange 
}: { 
  title: string; 
  enabled: boolean; 
  onChange: () => void; 
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{title}</span>
      <button
        onClick={onChange}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          ${enabled ? 'bg-[#b22222]' : 'bg-gray-200'}
          transition-colors duration-200
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}