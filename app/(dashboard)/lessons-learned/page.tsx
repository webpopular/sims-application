// app/(dashboard)/lessons-learned/page.tsx
'use client';

import LessonsLearnedSection from '@/app/components/forms/sections/LessonsLearnedSection';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InjuryFormData } from '@/app/types';
import { useLookupData } from "@/app/utils/useLookupData";
import type { ReferenceDataItem } from '@/app/types'; 

export default function LessonsLearnedPage() {
  const searchParams = useSearchParams();
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [formType, setFormType] = useState<'US' | 'Global'>('Global');
  const [recordType, setRecordType] = useState<'INJURY_REPORT' | 'OBSERVATION_REPORT'>('INJURY_REPORT');
  const [isLoading, setIsLoading] = useState(true);
  const [injuryFormData, setInjuryFormData] = useState<Partial<InjuryFormData> | null>(null);
  const [hasFormChanges, setHasFormChanges] = useState(false);

  const { lookupValues } = useLookupData();

  const [referenceData, setReferenceData] = useState<{
    locationTypes: { id: string; value: string; label: string }[];
  }>({ locationTypes: [] });

  useEffect(() => {
    if (Object.keys(lookupValues).length === 0) return;

    setReferenceData({
      locationTypes: (lookupValues["Plant Location"] || []).filter(
        (item: ReferenceDataItem) => item.id !== null
      ) as { id: string; value: string; label: string }[]
    });
  }, [lookupValues]);

  useEffect(() => {
    const urlId = searchParams.get('id');
    const detectedFormType = searchParams.get('formType') as 'US' | 'Global' | null;
    const detectedRecordType = searchParams.get('recordType') as 'INJURY_REPORT' | 'OBSERVATION_REPORT' | null;

    if (urlId) {
      setSubmissionId(urlId);
    }

    if (detectedFormType === 'US' || detectedFormType === 'Global') {
      setFormType(detectedFormType);
    }

    if (detectedRecordType) {
      setRecordType(detectedRecordType);
    } else {
      // Default to INJURY_REPORT if not specified, or determine from submissionId
      setRecordType(urlId?.startsWith('O-') ? 'OBSERVATION_REPORT' : 'INJURY_REPORT');
    }

    setIsLoading(false);
  }, [searchParams]);

  if (isLoading) {
    return <div className="text-center">Loading...</div>;
  }

  if (!submissionId) {
    return <div className="text-center text-red-500" role="alert">Invalid Submission ID</div>;
  }

  const handleSave = async (sectionName: string, data: any) => {
    console.log(`🔄 Saving ${sectionName} data...`, data);
    try {
      // Handle API save logic
      console.log("✅ Lessons Learned data saved!");
    } catch (error) {
      console.error(`❌ Error saving ${sectionName}:`, error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800">
        {recordType === 'OBSERVATION_REPORT' ? 'Observation' : 'Incident'} Lessons Learned
      </h1>
      
      <LessonsLearnedSection
        isExpanded={true}
        onToggle={() => {}}
        submissionId={submissionId}
        formType={formType}
        formData={injuryFormData}
        setInjuryFormData={setInjuryFormData}
        setHasFormChanges={setHasFormChanges}
        onSave={handleSave}
        referenceData={referenceData}
      />
    </div>
  );
}
