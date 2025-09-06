//app/(dashboard)/view/incidents/page.tsx

'use client';

import OpenClosedReportList from '@/app/components/forms/OpenClosedReportList';


export default function IncidentsPage() {
  return (
    <div className="p-2">
      <div className="max-w-8xl mx-auto">
        <h2 className="text-lg font-bold mb-4 text-emerald-700">Open & Closed Reports</h2>

        <OpenClosedReportList />
      </div>
    </div>
  );
}


