// app/admin/profile/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useUserAccess } from '@/app/hooks/useUserAccess';

type MenuAccess = Record<string, boolean>;

const MENU_KEYS = {
  REVIEW_QR: 'Review QR Code Submissions',
  DRAFT_FIRST_REPORT: 'Create First Report Drafts',          // ← new
  REPORT_INJURY: 'Report a New Injury',
  REPORT_OBS: 'Report a New Observation',
  INJURY_REPORTS: 'Injury Reports',
  OBS_REPORTS: 'Observation Reports',
  OPEN_CLOSED: 'Open & Closed Incidents',
  SAFETY_ALERTS: 'Safety Alerts',
  LESSONS_LEARNED: 'Lessons Learned',
  DASHBOARD: 'Dashboard',
} as const;

export default function ProfileSettings() {
  const { isAdmin } = useAuth();
  const { userAccess, isReady } = useUserAccess();

  // Map menu items to permission flags (used as defaults)
  const permissionMap = useMemo(() => ({
    [MENU_KEYS.DRAFT_FIRST_REPORT]:  userAccess?.permissions?.canTakeFirstReportActions ?? false,
    [MENU_KEYS.REPORT_INJURY]:       userAccess?.permissions?.canReportInjury ?? false,
    [MENU_KEYS.REPORT_OBS]:          userAccess?.permissions?.canReportObservation ?? false,
    [MENU_KEYS.INJURY_REPORTS]:      userAccess?.permissions?.canViewOpenClosedReports ?? false,
    [MENU_KEYS.OBS_REPORTS]:         userAccess?.permissions?.canViewOpenClosedReports ?? false,
    [MENU_KEYS.OPEN_CLOSED]:         userAccess?.permissions?.canViewOpenClosedReports ?? false,
    [MENU_KEYS.SAFETY_ALERTS]:       userAccess?.permissions?.canViewSafetyAlerts ?? false,
    [MENU_KEYS.LESSONS_LEARNED]:     userAccess?.permissions?.canViewLessonsLearned ?? false,
    [MENU_KEYS.DASHBOARD]:           userAccess?.permissions?.canViewDashboard ?? false,
    [MENU_KEYS.REVIEW_QR]:           true, // QR review is an app choice; keep enabled by default
  }), [userAccess]);

  const [menuAccess, setMenuAccess] = useState<MenuAccess>({});

  // Load from localStorage, else derive from permissions
  useEffect(() => {
    const saved = typeof window !== 'undefined'
        ? window.localStorage.getItem('menuAccess')
        : null;

    if (saved) {
      try {
        setMenuAccess(JSON.parse(saved));
        return;
      } catch {}
    }

    if (isReady) {
      setMenuAccess(permissionMap);
    }
  }, [isReady, permissionMap]);

  // Persist on change
  useEffect(() => {
    if (Object.keys(menuAccess).length) {
      window.localStorage.setItem('menuAccess', JSON.stringify(menuAccess));
    }
  }, [menuAccess]);

  const handleAccessToggle = (menuItem: string) => {
    if (!isAdmin) return; // non-admins can’t change
    setMenuAccess(prev => ({ ...prev, [menuItem]: !prev[menuItem] }));
  };

  return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-medium text-gray-800 mb-6">Your Profile & Settings</h1>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-700 mb-4">
              Menu Access Control
              {!isAdmin && (
                  <span className="ml-2 text-xs text-gray-500">(view only — managed by admin)</span>
              )}
            </h2>

            {/* Employee Self Reporting */}
            <Section title="Employee Self Reporting">
              <AccessToggle
                  title={MENU_KEYS.REVIEW_QR}
                  enabled={!!menuAccess[MENU_KEYS.REVIEW_QR]}
                  onChange={() => handleAccessToggle(MENU_KEYS.REVIEW_QR)}
                  disabled={!isAdmin}
              />
            </Section>

            {/* First Reporting */}
            <Section title="Draft a First Report via SIMS">
              <AccessToggle
                  title={MENU_KEYS.DRAFT_FIRST_REPORT} // ← new toggle
                  enabled={!!menuAccess[MENU_KEYS.DRAFT_FIRST_REPORT]}
                  onChange={() => handleAccessToggle(MENU_KEYS.DRAFT_FIRST_REPORT)}
                  disabled={!isAdmin}
                  hint="Allows saving First Reports as drafts (role: canTakeFirstReportActions)."
              />
              <AccessToggle
                  title={MENU_KEYS.REPORT_INJURY}
                  enabled={!!menuAccess[MENU_KEYS.REPORT_INJURY]}
                  onChange={() => handleAccessToggle(MENU_KEYS.REPORT_INJURY)}
                  disabled={!isAdmin}
              />
              <AccessToggle
                  title={MENU_KEYS.REPORT_OBS}
                  enabled={!!menuAccess[MENU_KEYS.REPORT_OBS]}
                  onChange={() => handleAccessToggle(MENU_KEYS.REPORT_OBS)}
                  disabled={!isAdmin}
              />
            </Section>

            {/* Reports */}
            <Section title="Reports & Views">
              <AccessToggle
                  title={MENU_KEYS.INJURY_REPORTS}
                  enabled={!!menuAccess[MENU_KEYS.INJURY_REPORTS]}
                  onChange={() => handleAccessToggle(MENU_KEYS.INJURY_REPORTS)}
                  disabled={!isAdmin}
              />
              <AccessToggle
                  title={MENU_KEYS.OBS_REPORTS}
                  enabled={!!menuAccess[MENU_KEYS.OBS_REPORTS]}
                  onChange={() => handleAccessToggle(MENU_KEYS.OBS_REPORTS)}
                  disabled={!isAdmin}
              />
              <AccessToggle
                  title={MENU_KEYS.OPEN_CLOSED}
                  enabled={!!menuAccess[MENU_KEYS.OPEN_CLOSED]}
                  onChange={() => handleAccessToggle(MENU_KEYS.OPEN_CLOSED)}
                  disabled={!isAdmin}
              />
              <AccessToggle
                  title={MENU_KEYS.SAFETY_ALERTS}
                  enabled={!!menuAccess[MENU_KEYS.SAFETY_ALERTS]}
                  onChange={() => handleAccessToggle(MENU_KEYS.SAFETY_ALERTS)}
                  disabled={!isAdmin}
              />
              <AccessToggle
                  title={MENU_KEYS.LESSONS_LEARNED}
                  enabled={!!menuAccess[MENU_KEYS.LESSONS_LEARNED]}
                  onChange={() => handleAccessToggle(MENU_KEYS.LESSONS_LEARNED)}
                  disabled={!isAdmin}
              />
              <AccessToggle
                  title={MENU_KEYS.DASHBOARD}
                  enabled={!!menuAccess[MENU_KEYS.DASHBOARD]}
                  onChange={() => handleAccessToggle(MENU_KEYS.DASHBOARD)}
                  disabled={!isAdmin}
              />
            </Section>
          </div>
        </div>
      </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
        <div className="space-y-2">{children}</div>
      </div>
  );
}

function AccessToggle({
                        title,
                        enabled,
                        onChange,
                        disabled = false,
                        hint,
                      }: {
  title: string;
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
      <div className="flex items-center justify-between py-2">
        <div className="flex flex-col">
          <span className="text-sm text-gray-700">{title}</span>
          {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
        </div>
        <button
            onClick={onChange}
            disabled={disabled}
            className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
          ${enabled ? 'bg-[#b22222]' : 'bg-gray-200'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
            aria-pressed={enabled}
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
