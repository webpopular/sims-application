// app/(dashboard)/reports/new-injury/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '@/amplify/data/schema';
import { mapApiResponseToInjuryFormData, type InjuryFormData } from '@/app/types';
import type { InjuryFormProps } from '@/app/types';
import InjuryReportModal from "../../../components/modals/InjuryReportModal";
import InjuryForm from "../../../components/forms/InjuryForm";

const client = generateClient<Schema>();

export default function InjuryFormPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [initialData, setInitialData] = useState<InjuryFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 🔹 Extract parameters from URL
  const mode = searchParams.get('mode') || 'create';
  const id = searchParams.get('id');
  const showModal = searchParams.get('showModal') === 'true';
  const urlFormType = searchParams.get('formType') as 'US' | 'Global' | null;

  // 🔹 Derive formType (Default: 'Global')
  const formType: 'US' | 'Global' = urlFormType || (id?.startsWith('US-') ? 'US' : 'Global');

  console.log('[Page] Query Params:', { mode, id, showModal, formType });

  // 🔹 Memoize the submission model for performance
  const submissionModel = useMemo(() => client.models.Submission, []);

  // 🔹 Fetch submission data for `edit` or `investigate-*` modes
  useEffect(() => {
    if ((mode === 'edit' || mode.startsWith('investigate-')) && id) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const response = await submissionModel.list({
            filter: { submissionId: { eq: id } }
          });
          if (response.data?.length > 0) {
            setInitialData(mapApiResponseToInjuryFormData(response.data[0]));
          } else {
            console.warn('[Page] No submission data found for ID:', id);
          }
        } catch (error) {
          console.error('[Page] Error fetching submission:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [mode, id, submissionModel]);

  // 🔹 Function to handle modal form selection
  const handleFormSelect = (type: 'US' | 'Global') => {
    router.push(`/reports/new-injury?formType=${type}&showModal=false`);
  };

  // 🔹 Function to close modal
  const handleCloseModal = () => {
    router.push('/reports/new-injury?showModal=false');
  };

  // 🔹 Return Early for `create` Mode
  if (mode === 'create') {
    console.log('[Page] Rendering in Create Mode');
    return (
      <>
        {showModal && (
          <InjuryReportModal isOpen={true} onClose={handleCloseModal} onFormSelect={handleFormSelect} />
        )}
        <div className="container mx-auto py-2 px-4 max-w-5xl">
          <InjuryForm mode="create" formType={formType} title="New Injury Report" />
        </div>
      </>
    );
  }

  // 🔹 Loading & Error Handling for `edit` / `investigate-*`
  if (!id) return <div>No submission ID provided</div>;
  if (isLoading) return <div>Loading...</div>;
  if (!initialData) return <div>No data found</div>;

  // 🔹 Edit / Investigate Mode
  return (
    <div className="container mx-auto py-2 px-4 max-w-5xl">
      <InjuryForm 
        key={id}
        mode={mode as InjuryFormProps['mode']} 
        formType={formType}
        initialData={initialData}
        title={`Edit ${formType} Report`}
      />
    </div>
  );
}
