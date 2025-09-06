// app/(dashboard)/layout.tsx
'use client';

import { usePathname } from 'next/navigation';

type PathMap = {
  [key: string]: string;
} & {
  '/qr-codes/review': string;
  '/reports/new-injury': string;
  '/reports/new-observation': string;
};

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const getPageTitle = () => {
    const paths: PathMap = {
      '/qr-codes/review': 'Review QR Code Submissions',
      '/reports/new-injury': 'Report a New Injury',
      '/reports/new-observation': 'Report a New Observation',
      '/first-reports/injury': 'Injury Reports',
      '/reports/observation': 'Observation Reports',
      '/incidents/injury': 'Injury Incidents',
      '/incidents/observation': 'Observation Incidents',
      '/view/incidents': 'Open & Closed Incidents',
      '/view/safety-alert': 'Safety Alerts',
      '/view/lessons-learned-list': 'Lessons Learned',
      '/admin/profile': 'Your Profile & Settings'
    };

    return pathname ? paths[pathname] || 'Dashboard' : 'Dashboard';
  };

  
  return (
    <div className="p-0"> {/* Reduced from p-6 */}
        {/*<div className="bg-white shadow rounded-lg p-2"> */} 
        {/*<h2 className="text-xl font-semibold text-gray-500 mb-2"> */}
         {/*getPageTitle()*/}
        {/*</h2>*/}
        {children}
       
    </div>
  );
  

   

}