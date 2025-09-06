// app/public/observation/page.tsx - FIXED to match current ObservationReportForm
'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import ObservationReportForm from '@/app/components/forms/ObservationReportForm';

export default function PublicObservationPage() {
  const searchParams = useSearchParams();
  const division = searchParams.get('division') || '';
  const location = searchParams.get('location') || '';

  const [submitted, setSubmitted] = useState(false);

  const onSubmitSuccess = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-2xl font-bold text-green-600 mb-4">Thank you for your submission!</h2>
        <p className="text-gray-700 mb-4">Your observation report has been received and will be reviewed by our safety team.</p>
        <button 
          onClick={() => setSubmitted(false)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Public Observation Report Form</h1>
      <p className="text-gray-600 mb-6">
        Help us maintain a safe workplace by reporting safety observations, near misses, or potential hazards.
      </p>
      
      <ObservationReportForm
        mode="create"
        title="Public Safety Observation Report"
        initialData={{
          division,
          location,
          createdBy: 'Public User',
          owner: 'Public Submission'
        }}
      />
    </div>
  );
}
