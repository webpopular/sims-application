//app/(dashboard)/classification/page.tsx
'use client';

import Classification from '@/app/components/forms/sections/Classification';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ClassificationPage() {
  const searchParams = useSearchParams();
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [formType, setFormType] = useState<'US' | 'Global'>('Global');
  const [id, setId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const urlId = searchParams.get('id');
    const mode = searchParams.get('mode');
    const detectedFormType = searchParams.get('formType');
    
    console.log('URL parameters:', { urlId, mode, detectedFormType });
    
    if (urlId) {
      setSubmissionId(urlId);
      setId(urlId);
    }
    
    if (detectedFormType === 'US' || detectedFormType === 'Global') {
      console.log('Setting formType to:', detectedFormType);
      setFormType(detectedFormType);
    } else {
      console.log('Using default formType: Global');
      setFormType('Global');
    }
    
    setIsReady(true);
  }, [searchParams]);

  useEffect(() => {
    console.log('Classification page - formType state changed to:', formType);
  }, [formType]);

  if (!isReady || !submissionId || !id) {
    return <div className="text-center text-red-500">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800">Injury Classification</h1>
      <div className="mb-4 text-sm text-gray-600">
        Form Type: <span className="font-semibold">{formType}</span>
      </div>
      <Classification 
        key={`classification-${submissionId}-${formType}`}
        isExpanded={true} 
        onToggle={() => {}} 
        onSave={(sectionName, data) => console.log(`Saved ${sectionName}:`, data)}
        submissionId={submissionId}
        formType={formType}
        id={id}
      />
    </div>
  );
}
