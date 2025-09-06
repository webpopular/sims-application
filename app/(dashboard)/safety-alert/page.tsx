//app/(dashboard)/safety-alert/page.tsx
'use client';

import SafetyAlertSection from '@/app/components/forms/sections/SafetyAlert';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InjuryFormData } from '@/app/types';


export default function SafetyAlertPage() {
  const searchParams = useSearchParams();
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [formType, setFormType] = useState<'US' | 'Global'>('Global');
  const [isLoading, setIsLoading] = useState(true);
  const [injuryFormData, setInjuryFormData] = useState<Partial<InjuryFormData> | null>(null);
  const [hasFormChanges, setHasFormChanges] = useState(false);

  useEffect(() => {
    const urlId = searchParams.get('id');
    const detectedFormType = searchParams.get('formType') as 'US' | 'Global' | null;

    if (urlId) {
      setSubmissionId(urlId);
    }

    if (detectedFormType === 'US' || detectedFormType === 'Global') {
      setFormType(detectedFormType);
    }

    setIsLoading(false);
  }, [searchParams]);

  if (isLoading) {
    return <div className="text-center">Loading...</div>;
  }

  if (!submissionId) {
    return <div className="text-center text-red-500" role="alert">Invalid Submission ID</div>;
  }

  const handleSave = async (sectionName: string, data: Partial<InjuryFormData>) => {
    console.log(`🔄 Saving ${sectionName} data...`, data);
    try {
      // Handle API save logic
      console.log("✅ Safety Alert data saved!");
    } catch (error) {
      console.error(`❌ Error saving ${sectionName}:`, error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800">Injury Safety Alert</h1>
      
      <SafetyAlertSection
  isExpanded={true}
  onToggle={() => {}}
  submissionId={submissionId}
  formType={formType}
  formData={injuryFormData}
  setInjuryFormData={setInjuryFormData}
  setHasFormChanges={setHasFormChanges}
  //onSave={handleSave}
/>


    </div>
  );
}
