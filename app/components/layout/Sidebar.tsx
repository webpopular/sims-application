// app/components/layout/Sidebar.tsx - Your original design with RBAC and restored features
'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useUserAccess } from '@/app/hooks/useUserAccess';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image'; 
import InjuryReportModal from '../modals/InjuryReportModal';

// ✅ Simple icons only
const Icons = {
  Injury: () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Observation: () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Safety: () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Actions: () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Approval: () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Dashboard: () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Reports: () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Alert: () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.966-.833-2.736 0L3.77 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  Learn: () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
};

type MenuItem = {
  title: string;
  path?: string;
  isHeader?: boolean;
  adminOnly?: boolean;
  permission?: string;
  fallbackToGroups?: string[];
  icon?: keyof typeof Icons;
};

const menuItems: MenuItem[] = [
  { title: 'Draft a First Report', isHeader: true },
  { 
    title: 'Report a New Injury', 
    path: '/reports/new-injury',
    permission: 'canReportInjury',
    icon: 'Injury',
    fallbackToGroups: ['admin', 'hr', 'ENTERPRISE', 'SEGMENT', 'PLATFORM_GROUP_PRESIDENT', 'PLATFORM_HR', 'DIVISION_VP_GM_BUM', 'DIVISION_OPS_DIRECTOR', 'DIVISION_HR_DIRECTOR', 'DIVISION_SAFETY', 'DIVISION_PLANT_MANAGER', 'DIVISION_PLANT_HR', 'PLANT_SAFETY_MANAGER', 'PLANT_SAFETY_CHAMPIONS']
  },
  { 
    title: 'Report a New Observation', 
    path: '/reports/new-observation',
    permission: 'canReportObservation',
    icon: 'Observation',
    fallbackToGroups: ['admin', 'hr', 'ENTERPRISE', 'SEGMENT', 'PLATFORM_GROUP_PRESIDENT', 'PLATFORM_HR', 'DIVISION_VP_GM_BUM', 'DIVISION_OPS_DIRECTOR', 'DIVISION_HR_DIRECTOR', 'DIVISION_SAFETY', 'DIVISION_PLANT_MANAGER', 'DIVISION_PLANT_HR', 'PLANT_SAFETY_MANAGER', 'PLANT_SAFETY_CHAMPIONS']
  },
  { 
    title: 'Safety Recognition', 
    path: '/reports/new-safety-recognition',
    permission: 'canSafetyRecognition',
    icon: 'Safety',
    fallbackToGroups: ['admin', 'hr', 'ENTERPRISE', 'SEGMENT', 'PLATFORM_GROUP_PRESIDENT', 'PLATFORM_HR', 'DIVISION_VP_GM_BUM', 'DIVISION_OPS_DIRECTOR', 'DIVISION_HR_DIRECTOR', 'DIVISION_SAFETY', 'DIVISION_PLANT_MANAGER', 'DIVISION_PLANT_HR', 'PLANT_SAFETY_MANAGER', 'PLANT_SAFETY_CHAMPIONS']
  },

  { title: 'Actions', isHeader: true },
  { 
    title: 'First Report Actions', 
    path: '/first-reports/injury',
    permission: 'canTakeFirstReportActions',
    icon: 'Actions',
    fallbackToGroups: ['admin', 'hr', 'ENTERPRISE_SAFETY_DIRECTOR', 'SEGMENT_SAFETY_DIRECTOR', 'DIVISION_VP_GM_BUM', 'DIVISION_OPS_DIRECTOR', 'DIVISION_HR_DIRECTOR', 'DIVISION_SAFETY', 'PLANT_SAFETY_MANAGER', 'DIVISION_PLANT_MANAGER']
  },
  { 
    title: 'Quick Fix', 
    path: '/quick-fix',
    permission: 'canTakeQuickFixActions',
    icon: 'Actions',
    fallbackToGroups: ['admin', 'hr', 'ENTERPRISE_SAFETY_DIRECTOR', 'SEGMENT_SAFETY_DIRECTOR', 'PLATFORM_HR', 'DIVISION_HR_DIRECTOR', 'DIVISION_SAFETY', 'DIVISION_OPS_DIRECTOR', 'PLANT_SAFETY_MANAGER', 'PLANT_SAFETY_CHAMPIONS', 'DIVISION_PLANT_MANAGER', 'DIVISION_PLANT_HR']
  },
  { 
    title: 'Incident with RCA', 
    path: '/incident-investigations',
    permission: 'canTakeIncidentRCAActions',
    icon: 'Actions',
    fallbackToGroups: ['admin', 'hr', 'ENTERPRISE_SAFETY_DIRECTOR', 'SEGMENT_SAFETY_DIRECTOR', 'DIVISION_HR_DIRECTOR', 'DIVISION_SAFETY','DIVISION_OPS_DIRECTOR',  'PLANT_SAFETY_MANAGER', 'DIVISION_PLANT_MANAGER', 'DIVISION_PLANT_HR']
  },
  { 
    title: 'Approvals', 
    path: '/approvals',
    permission: 'canPerformApprovalIncidentClosure',
    icon: 'Approval',
    fallbackToGroups: ['admin', 'hr', 'ENTERPRISE_SAFETY_DIRECTOR', 'SEGMENT_SAFETY_DIRECTOR', 'DIVISION_OPS_DIRECTOR', 'DIVISION_PLANT_MANAGER']
  },
  { 
    title: 'Dashboard', 
    path: '/dashboard',
    permission: 'canViewDashboard',
    icon: 'Dashboard',
    fallbackToGroups: ['admin', 'hr', 'ENTERPRISE', 'ENTERPRISE_SAFETY_DIRECTOR', 'SEGMENT', 'SEGMENT_SAFETY_DIRECTOR', 'PLATFORM_GROUP_PRESIDENT', 'PLATFORM_HR', 'DIVISION_VP_GM_BUM', 'DIVISION_OPS_DIRECTOR', 'DIVISION_HR_DIRECTOR', 'DIVISION_SAFETY', 'PLANT_SAFETY_MANAGER', 'PLANT_SAFETY_CHAMPIONS', 'DIVISION_PLANT_MANAGER', 'DIVISION_PLANT_HR']
  },
  { 
    title: 'Recognition', 
    path: '/recognition',
    permission: 'canSafetyRecognition',
    icon: 'Safety',
    fallbackToGroups: ['admin', 'hr', 'ENTERPRISE', 'SEGMENT', 'PLATFORM_GROUP_PRESIDENT', 'PLATFORM_HR', 'DIVISION_VP_GM_BUM', 'DIVISION_OPS_DIRECTOR', 'DIVISION_HR_DIRECTOR', 'DIVISION_SAFETY', 'DIVISION_PLANT_MANAGER', 'DIVISION_PLANT_HR', 'PLANT_SAFETY_MANAGER', 'PLANT_SAFETY_CHAMPIONS']
  },

  { title: 'View', isHeader: true },
  { 
    title: 'Open and Closed Reports', 
    path: '/view/incidents',
    permission: 'canViewOpenClosedReports',
    icon: 'Reports',
    fallbackToGroups: ['admin', 'hr', 'ENTERPRISE', 'ENTERPRISE_SAFETY_DIRECTOR', 'SEGMENT', 'SEGMENT_SAFETY_DIRECTOR', 'PLATFORM_GROUP_PRESIDENT', 'PLATFORM_HR', 'DIVISION_VP_GM_BUM', 'DIVISION_OPS_DIRECTOR', 'DIVISION_HR_DIRECTOR', 'DIVISION_SAFETY', 'PLANT_SAFETY_MANAGER', 'PLANT_SAFETY_CHAMPIONS', 'DIVISION_PLANT_MANAGER', 'DIVISION_PLANT_HR']
  },
  { 
    title: 'Safety Alerts', 
    path: '/view/safety-alert',
    permission: 'canViewSafetyAlerts',
    icon: 'Alert',
    fallbackToGroups: ['admin', 'hr', 'ENTERPRISE', 'ENTERPRISE_SAFETY_DIRECTOR', 'SEGMENT', 'SEGMENT_SAFETY_DIRECTOR', 'PLATFORM_GROUP_PRESIDENT', 'PLATFORM_HR', 'DIVISION_VP_GM_BUM', 'DIVISION_OPS_DIRECTOR', 'DIVISION_HR_DIRECTOR', 'DIVISION_SAFETY', 'PLANT_SAFETY_MANAGER', 'PLANT_SAFETY_CHAMPIONS', 'DIVISION_PLANT_MANAGER', 'DIVISION_PLANT_HR']
  },
  { 
    title: 'Lessons Learned', 
    path: '/view/lessons-learned-list',
    permission: 'canViewLessonsLearned',
    icon: 'Learn',
    fallbackToGroups: ['admin', 'hr', 'ENTERPRISE', 'ENTERPRISE_SAFETY_DIRECTOR', 'SEGMENT', 'SEGMENT_SAFETY_DIRECTOR', 'PLATFORM_GROUP_PRESIDENT', 'PLATFORM_HR', 'DIVISION_VP_GM_BUM', 'DIVISION_OPS_DIRECTOR', 'DIVISION_HR_DIRECTOR', 'DIVISION_SAFETY', 'PLANT_SAFETY_MANAGER', 'PLANT_SAFETY_CHAMPIONS', 'DIVISION_PLANT_MANAGER', 'DIVISION_PLANT_HR']
  },

  //{ title: 'Testing', isHeader: true },
  //{ 
  //  title: 'RBAC Permission Test', 
  //  path: '/rbac-test',
  //  adminOnly: true,
  //  icon: 'Dashboard'
  //}
];

export default function Sidebar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin } = useAuth();
  
  // ✅ Use the permission hook
  const { userAccess, loading } = useUserAccess();

  const canAccessMenuItem = (item: MenuItem): boolean => {
    if (item.isHeader) return true;
    if (item.adminOnly && !isAdmin) return false;

    // Permission-based visibility
    if (item.permission && userAccess?.permissions) {
      const value = userAccess.permissions[item.permission as keyof typeof userAccess.permissions];
      if (value) return true;
    }

    // Group-based fallback
    if (item.fallbackToGroups && userAccess?.cognitoGroups) {
      return item.fallbackToGroups.some(group => userAccess.cognitoGroups.includes(group));
    }

    return isAdmin;
  };

  const handleMenuClick = (item: MenuItem) => {
    if (!item.path) return;
    
    if (item.title === 'Report a New Injury') {
      setSelectedMenuItem(item.title);
      setIsModalOpen(true);
    } else {
      router.push(item.path);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMenuItem(null);
  };
  console.log('[Sidebar] Permissions:', userAccess?.permissions);
  console.log('[Sidebar] canReportInjury:', userAccess?.permissions?.canReportInjury);

  // ✅ Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter(canAccessMenuItem);

  return (
    <>
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
        {/* ✅ UPDATED: Header with ITW logo */}
        <div className="p-4 border-b border-gray-200">
          {/* ✅ ADDED: ITW Logo as clickable home link */}
          <Link href="/" className="block mb-6">
            <div className="flex items-center gap-5 hover:opacity-80 transition-opacity">
            <Image
              src="/images/ITW-logo---dk-gray.svg"
              alt="ITW Logo"
              width={200}
              height={60}
              className="h-12 w-auto max-w-full object-contain"
              priority
            />
              
            </div>
          </Link> 
        </div>

        {/* ✅ UNCHANGED: Keep all your existing menu items code */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-2">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-gray-200 animate-pulse rounded"></div>
                ))}
              </div>
            ) : visibleMenuItems.length === 0 ? (
              <div className="p-4 text-gray-500 text-sm text-center">
                No menu items available for your role.
              </div>
            ) : (
              <div className="space-y-1">
                {visibleMenuItems.map((item, index) => {
                  if (item.isHeader) {
                    return (
                      <div key={index} className="px-2 py-2 mt-4 first:mt-0">
                        <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                          {item.title}
                        </h3>
                      </div>
                    );
                  }

                  const isActive = pathname === item.path;
                  const IconComponent = item.icon ? Icons[item.icon] : null;

                  return (
                    <button
                      key={index}
                      onClick={() => handleMenuClick(item)}
                      className={`
                        w-full flex items-center px-3 py-2 text-sm text-left rounded-md transition-colors duration-150
                        ${isActive 
                          ? 'bg-grey-50 text-red-700 border-l-4 border-red-500' 
                          : 'text-gray-700 hover:bg-red-50 hover:text-red-700'
                        }
                      `}
                    >
                      {IconComponent && <IconComponent />}
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        {/* ✅ UNCHANGED: Keep your existing debug info and modal */}
        {process.env.NODE_ENV === 'development' && userAccess && (
          <div className="p-2 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500">
              <div>Visible: {visibleMenuItems.filter(item => !item.isHeader).length}</div>
              <div>Scope: {userAccess.accessScope}</div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ UNCHANGED: Keep your existing modal */}
      {isModalOpen && selectedMenuItem === 'Report a New Injury' && (
        <InjuryReportModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            console.log('Closing modal from sidebar');
          }}
          onFormSelect={(type) => {
            console.log('Form type selected in sidebar:', type);
            router.push(`/reports/new-injury?formType=${type}`);
            setIsModalOpen(false);
          }}
        />
      )}
    </>
  );
}
