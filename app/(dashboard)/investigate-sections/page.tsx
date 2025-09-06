// app/(dashboard)/investigate-sections/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import InvestigationSections from '@/app/components/forms/sections/InvestigationSections';
import { fetchSubmissionData } from '@/app/api/fetchSubmissionData';
import { useLookupData } from '@/app/utils/useLookupData';

export default function InvestigationSectionPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode')?.toLowerCase() || '';
  const submissionId = searchParams.get('id') || '';
  const formType = searchParams.get('formType') as 'US' | 'Global' || 'Global';
  const recordType = searchParams.get('recordType') as 'INJURY_REPORT' | 'OBSERVATION_REPORT' || 'INJURY_REPORT';

  const { referenceData } = useLookupData();
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (submissionId) {
        const data = await fetchSubmissionData(submissionId);
        setSubmissionData(data);
      }
      setLoading(false);
    };

    loadData();
  }, [submissionId]);

  if (loading || !referenceData?.locationTypes?.length) {
    return <div className="text-center py-10 text-gray-600">Loading investigation details...</div>;
  }

  return (
    <InvestigationSections 
      submissionId={submissionId} 
      mode={mode} 
      formType={formType}
      recordType={recordType}
      existingInjuryData={submissionData}
      existingClassificationData={submissionData?.classification}
      existingDocuments={submissionData?.documents || []}
      referenceData={referenceData}
    />
  );
}
