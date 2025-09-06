// /app/public/injury/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import InjuryForm from '@/app/components/forms/InjuryForm';

export default function PublicInjuryPage() {
  const searchParams = useSearchParams();
  const division = searchParams.get('division') || '';
  const location = searchParams.get('location') || '';

  const [submitted, setSubmitted] = useState(false);

  const onSubmitSuccess = () => setSubmitted(true);

  if (submitted) {
    return (
      <div className="p-4 text-center">
        <h2>Thank you for your submission.</h2>
        <p>Your injury report has been received.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Public Injury Report Form</h1>
      <InjuryForm
        mode="create"
        formType="US"
        initialData={{
          division,
          location,
        }} // You can safely provide only the fields you want to prefill
        title="Public Injury Report"
        onSuccess={onSubmitSuccess}
      />
    </div>
  );
}
