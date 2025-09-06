// app/(dashboard)/incident-closure/page.tsx
'use client';

import IncidentClosure from '@/app/components/forms/sections/IncidentClosure';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function IncidentClosurePage() {
  const searchParams = useSearchParams();
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [recordType, setRecordType] = useState<'INJURY_REPORT' | 'OBSERVATION_REPORT'>('INJURY_REPORT');

  useEffect(() => {
    const urlId = searchParams.get('id');
    const urlRecordType = searchParams.get('recordType') as 'INJURY_REPORT' | 'OBSERVATION_REPORT' | null;
    
    if (urlId) {
      setSubmissionId(urlId);
    }
    
    if (urlRecordType) {
      setRecordType(urlRecordType);
    } else {
      // Default to INJURY_REPORT if not specified, or determine from submissionId
      setRecordType(urlId?.startsWith('O-') ? 'OBSERVATION_REPORT' : 'INJURY_REPORT');
    }
  }, [searchParams]);

  const handleSaveSection = (sectionName: string, data: any): void => {
    console.log(`Saving ${sectionName} data:`, data);
  };

  if (!submissionId) {
    return <div className="text-center text-red-500">Invalid Submission ID</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800">
        {recordType === 'OBSERVATION_REPORT' ? 'Observation' : 'Incident'} Closure
      </h1>
      <IncidentClosure
        isExpanded={true}
        onToggle={() => { }}
        onSave={handleSaveSection}
        submissionId={submissionId}
        recordType={recordType}
      />
    </div>
  );
}
