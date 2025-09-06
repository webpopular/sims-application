// app/(dashboard)/interim-corrective-actions/page.tsx
'use client';

import InterimCorrectiveActionsSection from '@/app/components/forms/sections/InterimCorrectiveActions';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function InterimCorrectiveActionsPage() {
  const searchParams = useSearchParams();
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [formType, setFormType] = useState<'US' | 'Global'>('Global');
  const [recordType, setRecordType] = useState<'INJURY_REPORT' | 'OBSERVATION_REPORT'>('INJURY_REPORT');
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const urlId = searchParams.get('id');
    const detectedFormType = searchParams.get('formType') as 'US' | 'Global' | null;
    const detectedRecordType = searchParams.get('recordType') as 'INJURY_REPORT' | 'OBSERVATION_REPORT' | null;

    if (urlId) {
      setSubmissionId(urlId);
      setId(urlId);
    }

    if (detectedFormType) {
      setFormType(detectedFormType);
    }

    if (detectedRecordType) {
      setRecordType(detectedRecordType);
    } else {
      // Default to INJURY_REPORT if not specified, or determine from submissionId
      setRecordType(urlId?.startsWith('O-') ? 'OBSERVATION_REPORT' : 'INJURY_REPORT');
    }
  }, [searchParams]);

  if (!submissionId || !id) {
    return <div className="text-center text-red-500">Invalid Submission ID</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800">
        {recordType === 'OBSERVATION_REPORT' ? 'Observation' : 'Incident'} Interim Corrective Actions
      </h1>
      <InterimCorrectiveActionsSection
        isExpanded={true}
        onToggle={() => {}}
        onSave={(sectionName, data) => console.log(`Saved ${sectionName}:`, data)}
        submissionId={submissionId}
        existingActions={[]}
      />
    </div>
  );
}
