// app/components/forms/ObservationReportForm.tsx
// app/components/forms/ObservationReportForm.tsx
'use client';

import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { toast } from 'react-hot-toast';
import { getUserInfo } from '@/lib/utils/getUserInfo';
import { useLookupData } from "@/app/utils/useLookupData";
import SaveSuccessModal from '../modals/SaveSuccessModal';
import DocumentsModal from '../modals/DocumentUploadModal';
import type { Document, ReferenceDataItem } from "@/app/types";
import RejectModal from "@/app/components/modals/RejectModal";
//import FirstAidQuickFixModal from "@/app/components/modals/FirstAidQuickFixModal";
import QuickFixActionsObservationModal from "@/app/components/modals/QuickFixActionsObservationModal";
//import { usePermissions } from '@/lib/utils/PermissionService';
import { useUserAccess } from '@/app/hooks/useUserAccess';
import { PermissionGate } from '@/app/components/permission/PermissionGate';


import StatusChoiceModal from "@/app/components/modals/StatusChoiceModal";
//import { getUserDataAccess } from '@/app/utils/dataAccessControl';
import { callAppSync } from '@/lib/utils/appSync';
import { initAmplify } from '@/app/amplify-init';
initAmplify();
let dataClient: any = null;
async function getDataClient() {
  if (!dataClient) {
    const mod = await import('aws-amplify/data');
    dataClient = mod.generateClient<any>();
  }
  return dataClient;
}

// Define interfaces for the component props and form data
interface ObservationFormData {
  submissionId: string;
  recordType: string;
  title: string;
  locationOnSite: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  dateOfIncident: string;
  timeOfIncidentHour: string;
  timeOfIncidentMinute: string;
  timeOfInjuryAmPm: string;
  obsTypeOfConcern: string;
  obsPriorityType: string;
  whereDidThisOccur: string;
  workAreaDescription: string;
  activityType: string;
  incidentDescription: string;
  obsCorrectiveAction: string;
  documents: Document[];
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  id?: string;
  location?: string;
  submissionType?: string;
  owner?: string;
  // Add this index signature to allow string indexing:
  [key: string]: any;

}

interface ObservationFormProps {
  mode?: 'create' | 'edit' | 'readonly';
  initialData?: Partial<ObservationFormData> | null;
  title?: string;
}

interface SubmissionResult {
  success: boolean;
  reportId?: string;
}

// Helper function to generate report ID with format O-YYMMDD-HHMMSS
const generateReportId = (): string => {
  const now = new Date();
  const prefix = 'O-';
  return prefix +
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    '-' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
};

// Default form state
const defaultFormState: ObservationFormData = {
  submissionId: '',
  recordType: 'OBSERVATION_REPORT',
  title: '',
  locationOnSite: '',
  firstName: '',
  lastName: '',
  employeeId: '',
  dateOfIncident: '',
  timeOfIncidentHour: '',
  timeOfIncidentMinute: '',
  timeOfInjuryAmPm: 'AM',
  obsTypeOfConcern: '',
  obsPriorityType: '',
  whereDidThisOccur: '',
  workAreaDescription: '',
  activityType: '',
  incidentDescription: '',
  obsCorrectiveAction: '',
  documents: [],
  status: 'Draft',
  createdAt: '',
  updatedAt: '',
  createdBy: '',
  updatedBy: '',
};

export default function ObservationReportForm({
  mode = 'create',
  initialData = null,
  title = 'Observation Report'
}: ObservationFormProps) {

  const { userAccess, hasPermission, canPerformAction, loading, isReady } = useUserAccess();  
  //const { canAccess, userRole, loading: permissionsLoading } = usePermissions();
  //const { userAccess, hasPermission, canPerformAction, isReady } = useUserAccess();
  const { referenceData } = useLookupData();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ ALL useState hooks together
  const [formData, setFormData] = useState<ObservationFormData>(defaultFormState);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasFormChanges, setHasFormChanges] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showDocsModal, setShowDocsModal] = useState<boolean>(false);
  const [submission, setSubmission] = useState<SubmissionResult>({ success: false });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showQuickFixModal, setShowQuickFixModal] = useState(false);
  const [showStatusChoiceModal, setShowStatusChoiceModal] = useState(false);
  const [showRejectSuccessModal, setShowRejectSuccessModal] = useState(false);
  const [showResolvedModal, setShowResolvedModal] = useState(false);
  const [createdBy, setCreatedBy] = useState<string>('Unknown');

  const currentMode = searchParams.get('mode') as string || mode;
  const isReadOnly = currentMode === "readonly";
  const canTakeFirstReportActions = hasPermission('canTakeFirstReportActions');
  const canPerformApprovalIncidentClosure = hasPermission('canPerformApprovalIncidentClosure');
  const isSubmitter = (formData as any).createdBy === createdBy || createdBy === 'Unknown';




  const fetchObservationData = async () => {
    const submissionIdFromUrl = searchParams.get('id');

    if ((currentMode === 'edit' || currentMode.startsWith('investigate')) && submissionIdFromUrl && !initialData) {
      try {
        console.log("Fetching observation data for ID:", submissionIdFromUrl);

        const client = await getDataClient();
        const response = await client.models.Submission.list({
          filter: {
            or: [
              { submissionId: { eq: submissionIdFromUrl } },
              { id: { eq: submissionIdFromUrl } }
            ]
          }
        }, { authMode: 'userPool' });

        const record = response.data?.[0];

        if (record) {
          console.log("Raw record from database:", record);
          console.log("Record ID:", record.id);
          console.log("Record submissionId:", record.submissionId);

          const newFormData: ObservationFormData = {
            ...defaultFormState,
            id: record.id || record.submissionId || submissionIdFromUrl,
            submissionId: record.submissionId || submissionIdFromUrl,
            recordType: record.recordType || 'OBSERVATION_REPORT',
            title: record.title || '',
            locationOnSite: record.locationOnSite || '',
            firstName: record.firstName || '',
            lastName: record.lastName || '',
            employeeId: record.employeeId || '',
            dateOfIncident: record.dateOfIncident || '',
            timeOfIncidentHour: record.timeOfIncidentHour || '',
            timeOfIncidentMinute: record.timeOfIncidentMinute || '',
            timeOfInjuryAmPm: record.timeOfInjuryAmPm || 'AM',
            obsTypeOfConcern: record.obsTypeOfConcern || '',
            obsPriorityType: record.obsPriorityType || '',
            whereDidThisOccur: record.whereDidThisOccur || '',
            workAreaDescription: record.workAreaDescription || '',
            activityType: record.activityType || '',
            incidentDescription: record.incidentDescription || '',
            obsCorrectiveAction: record.obsCorrectiveAction || '',
            documents: Array.isArray(record.documents)
                ? (record.documents as unknown[])
                    .filter((doc): doc is Document => !!doc)
                : [],
            status: record.status || 'Draft',
            createdAt: record.createdAt || '',
            updatedAt: record.updatedAt || '',
            createdBy: record.createdBy || '',
            updatedBy: record.updatedBy || '',
            location: record.location || '',
            submissionType: record.submissionType || '',
            owner: record.owner || ''
          };

          console.log("Setting form data with ID:", newFormData.id);
          setFormData(newFormData);
        } else {
          console.error('No observation report found with the given ID:', submissionIdFromUrl);
          toast.error('No observation report found with the given ID.');
        }
      } catch (error) {
        console.error('Error fetching observation data:', error);
        toast.error('Failed to load observation data');
      }
    } else if (initialData) {
      const newFormData: ObservationFormData = {
        ...defaultFormState,
        ...initialData,
        id: initialData.id || initialData.submissionId || '',
        submissionId: initialData.submissionId || initialData.id || '',
        obsTypeOfConcern: initialData.obsTypeOfConcern || '',
        obsPriorityType: initialData.obsPriorityType || '',
        whereDidThisOccur: initialData.whereDidThisOccur || '',
        workAreaDescription: initialData.workAreaDescription || '',
        incidentDescription: initialData.incidentDescription || '',
        obsCorrectiveAction: initialData.obsCorrectiveAction || '',
        title: initialData.title || '',
        locationOnSite: initialData.locationOnSite || '',
      };

      console.log("Setting form data from initialData with ID:", newFormData.id);
      setFormData(newFormData);
    }
  };
  
 
  useEffect(() => {
    if (initialData) {
      console.log("Initial data detected, updating form:", initialData);
      console.log("obsTypeOfConcern:", initialData.obsTypeOfConcern);
      console.log("obsPriorityType:", initialData.obsPriorityType);
      console.log("whereDidThisOccur:", initialData.whereDidThisOccur);

      const transformedData = {
        ...defaultFormState,
        ...initialData,
        obsTypeOfConcern: initialData.obsTypeOfConcern || '',
        obsPriorityType: initialData.obsPriorityType || '',
        whereDidThisOccur: initialData.whereDidThisOccur || '',
        workAreaDescription: initialData.workAreaDescription || '',
        incidentDescription: initialData.incidentDescription || '',
        obsCorrectiveAction: initialData.obsCorrectiveAction || '',
        title: initialData.title || '',
        locationOnSite: initialData.locationOnSite || '',
      };

      setFormData(transformedData);
      console.log("Transformed data set:", transformedData);
    }
  }, [initialData]);

  useEffect(() => {
    fetchObservationData();
  }, [currentMode, initialData, searchParams]);

  useEffect(() => {
    // Log the available options
    console.log("Type of Concern options:", referenceData.typeOfConcern.map(item => item.value));
    console.log("Priority Type options:", referenceData.priorityTypes.map(item => item.value));

    // Log the current form data values
    console.log("Current obsTypeOfConcern value:", formData.obsTypeOfConcern);
    console.log("Current obsPriorityType value:", formData.obsPriorityType);

    // Check if the values match any options
    const typeOfConcernMatch = referenceData.typeOfConcern.some(item => item.value === formData.obsTypeOfConcern);
    const priorityTypeMatch = referenceData.priorityTypes.some(item => item.value === formData.obsPriorityType);

    console.log("Type of Concern matches an option:", typeOfConcernMatch);
    console.log("Priority Type matches an option:", priorityTypeMatch);
  }, [formData.obsTypeOfConcern, formData.obsPriorityType, referenceData]);

  useEffect(() => {
    console.log("Mode changed to:", currentMode);
    if (currentMode.startsWith('investigate')) {
      fetchObservationData();
    }
  }, [currentMode]);

 
    
  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading permissions...</div>;
  }



  // ✅ ALL function definitions AFTER hooks
  async function getIdentityId(): Promise<string | undefined> {
    try {
      const session = await fetchAuthSession();
      return session.identityId;
    } catch (error) {
      console.error('Error getting identity ID:', error);
      return undefined;
    }
  }



  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await getCurrentUser();
      const identityId = await getIdentityId();
      const newSubmissionId = generateReportId();

      if (!userAccess) {
        throw new Error('User access data not available. Please refresh the page.');
      }

      console.log('[ObservationForm] Creating submission with hierarchy:', userAccess.hierarchyString);

      const submissionData = {
        submissionId: newSubmissionId,
        recordType: 'OBSERVATION_REPORT',
        hierarchyString: userAccess.hierarchyString,
        status: 'Draft',
        title: formData.title || '',
        locationOnSite: formData.locationOnSite || '',
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        employeeId: formData.employeeId || '',
        dateOfIncident: formData.dateOfIncident || '',
        timeOfIncidentHour: formData.timeOfIncidentHour || '00',
        timeOfIncidentMinute: formData.timeOfIncidentMinute || '00',
        timeOfInjuryAmPm: formData.timeOfInjuryAmPm || 'AM',
        obsTypeOfConcern: formData.obsTypeOfConcern || '',
        obsPriorityType: formData.obsPriorityType || '',
        whereDidThisOccur: formData.whereDidThisOccur || '',
        workAreaDescription: formData.workAreaDescription || '',
        activityType: formData.activityType || '',
        incidentDescription: formData.incidentDescription || '',
        obsCorrectiveAction: formData.obsCorrectiveAction || '',
        createdBy: createdBy,
        owner: user.username || userAccess.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        documents: [],
        location: 'TBD',
        submissionType: 'Direct',
      };

      const mutation = `
      mutation CreateSubmission($input: CreateSubmissionInput!) {
        createSubmission(input: $input) {
          id
          submissionId
          title
        }
      }
    `;

      const response = await callAppSync(mutation, { input: submissionData });

      if (!response?.data?.createSubmission) {
        throw new Error('Submission failed: No data returned.');
      }

      console.log('✅ Observation created successfully:', response.data.createSubmission);

      setFormData((prev) => ({
        ...prev,
        id: response.data.createSubmission.id,
        submissionId: newSubmissionId,
        status: 'Draft',
        documents: [],
      }));

      setSubmission({
        success: true,
        reportId: newSubmissionId,
      });

      setHasFormChanges(false);
      setShowSuccessModal(true);
      setShowDocsModal(true);
    } catch (error) {
      console.error('[ObservationReportForm] Submission Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to submit observation report: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };


  const handleSaveChanges = async (saveAsDraft: boolean = false) => {
    try {
      setIsLoading(true);
      const userInfo = await getUserInfo();
      const updatedBy = userInfo.email || userInfo.username || 'Unknown';

      let recordId = formData.id || formData.submissionId || searchParams.get('id');
      if (!recordId) {
        throw new Error('No record ID found. Cannot update record without an ID.');
      }

      const allowedFields: (keyof ObservationFormData)[] = [
        'title', 'locationOnSite', 'firstName', 'lastName', 'employeeId',
        'dateOfIncident', 'timeOfIncidentHour', 'timeOfIncidentMinute', 'timeOfInjuryAmPm',
        'obsTypeOfConcern', 'obsPriorityType', 'whereDidThisOccur', 'workAreaDescription',
        'activityType', 'incidentDescription', 'obsCorrectiveAction'
      ];

      const updateData: any = {
        id: recordId,
        updatedBy,
        updatedAt: new Date().toISOString(),
      };

      allowedFields.forEach(field => {
        if (formData[field] !== undefined) {
          updateData[field] = formData[field];
        }
      });

      if (saveAsDraft) updateData.status = 'Draft';

      const mutation = `
      mutation UpdateSubmission($input: UpdateSubmissionInput!) {
        updateSubmission(input: $input) {
          id
          submissionId
          status
          updatedAt
        }
      }
    `;

      const response = await callAppSync(mutation, { input: updateData });

      if (!response?.data?.updateSubmission) {
        throw new Error('No data returned from update.');
      }

      console.log('✅ Observation updated successfully:', response.data.updateSubmission);
      toast.success(saveAsDraft ? 'Draft saved successfully!' : 'Changes saved successfully!');
      setHasFormChanges(false);
    } catch (error) {
      console.error('[ObservationReportForm] Error saving changes:', error);
      if (error instanceof Error) {
        toast.error(`Failed to save changes: ${error.message}`);
      } else {
        toast.error('Failed to save changes.');
      }
    } finally {
      setIsLoading(false);
    }
  };


  const saveChangesAndContinue = async (callback: () => void) => {
    if (callback === (() => setShowStatusChoiceModal(true)) && !canTakeFirstReportActions) {
      toast.error('You do not have permission to take first report actions.');
      return;
    }

    if (callback === (() => setShowRejectModal(true)) && !canTakeFirstReportActions) {
      toast.error('You do not have permission to reject submissions.');
      return;
    }

    try {
      setIsLoading(true);
      await handleSaveChanges();
      callback();
    } catch (error) {
      console.error('[ObservationReportForm] Error saving changes before continuing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    router.push('/');
  };



  // Alternative approach - Update only documents field
  const handleDocumentsSave = async (sectionName: string, docs: Document[]) => {
    try {
      const recordId = formData.id || formData.submissionId;
      if (!recordId) throw new Error('No record ID available for document update');

      const updateInput = {
        id: recordId,
        documents: docs.map(doc => ({
          docId: doc.docId || '',
          fileName: doc.fileName || '',
          s3Key: doc.s3Key || '',
          uploadedAt: doc.uploadedAt || new Date().toISOString(),
          uploadedBy: doc.uploadedBy || userAccess?.email || 'Unknown',
          size: doc.size || 0,
          type: doc.type || 'application/octet-stream',
          hasPII: doc.hasPII || false,
        })),
      };

      const mutation = `
      mutation UpdateSubmission($input: UpdateSubmissionInput!) {
        updateSubmission(input: $input) {
          id
          submissionId
          documents {
            fileName
            s3Key
          }
        }
      }
    `;

      const response = await callAppSync(mutation, { input: updateInput });

      if (response?.data?.updateSubmission) {
        console.log('✅ Documents updated successfully:', response.data.updateSubmission);
        toast.success('Documents updated successfully!');
      } else {
        throw new Error('No data returned from update.');
      }
    } catch (error) {
      console.error('[handleDocumentsSave] Failed to update documents:', error);
      toast.error('Failed to update documents. Please try again.');
    }
  };


  const handleReject = async (reason: string) => {
    const recordId = formData.id || formData.submissionId;

    if (!recordId) {
      toast.error("No record ID found");
      return;
    }

    try {
      const userInfo = await getUserInfo();
      const rejectedBy = userInfo.email || userInfo.username || 'Unknown';
      const client = await getDataClient();
      await client.models.Submission.update({
        id: recordId,
        status: "Rejected",
        rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
        rejectedBy: rejectedBy
      }, { authMode: 'userPool' });

      setShowRejectModal(false);
      setShowRejectSuccessModal(true);
    } catch (error) {
      console.error("Error rejecting submission:", error);
      toast.error("Failed to reject submission");
    }
  };

  const handleResolvedImmediately = async () => {
    const recordId = formData.id || formData.submissionId;

    if (!recordId) {
      toast.error("No record ID found");
      return;
    }

    try {
      const client = await getDataClient();
      await client.models.Submission.update({
        id: recordId,
        status: "Completed",
        investigationStatus: "Resolved Immediately"
      }, { authMode: 'userPool' });

      setShowStatusChoiceModal(false);
      toast.success("Observation marked as resolved immediately!");
      router.push('/view/incidents');
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update observation status");
    }
  };

  const handleQuickFix = async () => {
    const recordId = formData.id || formData.submissionId;

    if (!recordId) {
      toast.error("No record ID found");
      return;
    }

    try {
      const client = await getDataClient();
      await client.models.Submission.update({
        id: recordId,
        status: "Open",
        investigationStatus: "Quick Fix Action Needed"
      }, { authMode: 'userPool' });

      setShowStatusChoiceModal(false);
      toast.success("Observation marked for quick fix!");
      router.push('/quick-fix');
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update observation status");
    }
  };

  const handleNeedsAction = async () => {
    const recordId = formData.id || formData.submissionId;

    if (!recordId) {
      toast.error("No record ID found");
      return;
    }

    try {
      const client = await getDataClient();
      await client.models.Submission.update({
        id: recordId,
        status: "Observation with RCA - Open",
        investigationStatus: "RCA YET_TO_START"
      }, { authMode: 'userPool' });

      setShowStatusChoiceModal(false);
      toast.success("Observation marked for further action!");
      router.push('/incident-investigations');
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update observation status");
    }
  };

  // ✅ ONLY AFTER all hooks and functions, then conditional returns
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-800"></div>
        <span className="ml-2">Loading permissions...</span>
      </div>
    );
  }

  return (
    <main className="flex justify-center items-start bg-gray-50">
      <div className="w-full max-w-5xl">
        <h1 className="text-xl font-semibold text-[#b22222] border-l-4 border-[#b22222] pl-3">
          Observation Report Form
        </h1>
  
        <div className="w-full max-w-5xl bg-white shadow-lg rounded-lg p-6">
          {/* Header with Report ID */}
          <div className="bg-gray-100 p-4 rounded-t-lg border-b border-gray-200">
            <div className="flex justify-between items-center max-w-7xl mx-auto">
              <div className="flex items-center">
                {/* ✅ Show user's permission level */}
                {/*{userAccess && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {userAccess.roleTitle} (Level {userAccess.level})
                    </span>
                )}*/}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-mono text-gray-600">
                Report ID#{" "}
                {(() => {
                  // Priority order for displaying Report ID
                  if (formData.submissionId) return formData.submissionId;
                  //if (submission?.submissionId) return submission.submissionId;
                  if (submission?.reportId) return submission.reportId;
                  if (mode === "create") return "Will be generated on submit";
                  return "Loading...";
                })()}

                  {/*Report ID#{" "} {(mode === "edit" || mode === "readonly" || mode.startsWith("investigate-")) ? formData.submissionId : submission.reportId}*/}
                </div>
              </div>
            </div>
          </div>
  
          <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-lg shadow-sm p-1">
            <div className="grid grid-cols-2 gap-12">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Plant Location */}
                <div className="mb-4">
                  <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">
                    Plant Location
                  </label>
                  <select
                    value={formData.locationOnSite}
                    onChange={(e) => {
                      if (isReadOnly) return;
                      setHasFormChanges(true);
                      setFormData((prev) => ({ ...prev, locationOnSite: e.target.value }));
                    }}
                    className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#b22222]"
                  >
                    <option value="">Select</option>
                    {referenceData.locationTypes.map((item) => (
                      <option key={item.id} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
  
                {/* Date of Incident */}
                <div>
                  <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Date of Incident/Inspection</label>
                  <input
                    type="date"
                    name="dateOfIncident"
                    value={formData.dateOfIncident}
                    onChange={(e) => {
                      if (isReadOnly) return;
                      setHasFormChanges(true);
                      setFormData((prev) => ({
                        ...prev,
                        dateOfIncident: e.target.value
                      }));
                    }}
                    disabled={isReadOnly}
                    className={`block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white ${isReadOnly ? 'cursor-not-allowed bg-gray-100' : 'focus:border-[#cb4154] focus:ring-[#cb4154]'}`}
                  />
                </div>
  
                {/* Time of Incident */}
                <div>
                  <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Time of Incident</label>
                  <div className="flex items-center gap-2 w-full">
                    <select
                      value={formData.timeOfIncidentHour}
                      onChange={(e) => {
                        setHasFormChanges(true);
                        setFormData((prev) => ({
                          ...prev,
                          timeOfIncidentHour: e.target.value
                        }));
                      }}
                      className="block flex-1 bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#b22222]"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i} value={(i + 1).toString().padStart(2, '0')}>
                          {(i + 1).toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-700 font-bold">:</span>
                    <select
                      value={formData.timeOfIncidentMinute}
                      onChange={(e) => {
                        setHasFormChanges(true);
                        setFormData((prev) => ({
                          ...prev,
                          timeOfIncidentMinute: e.target.value
                        }));
                      }}
                      className="block flex-1 bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#cb4154]"
                    >
                      {[...Array(60)].map((_, i) => (
                        <option key={i} value={i.toString().padStart(2, '0')}>
                          {i.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <select
                      value={formData.timeOfInjuryAmPm}
                      onChange={(e) => {
                        setHasFormChanges(true);
                        setFormData((prev) => ({
                          ...prev,
                          timeOfInjuryAmPm: e.target.value
                        }));
                      }}
                      className="block flex-1 bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#cb4154]"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
  
                {/* Employee Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Your First Name</label>
                    <input
                      type="text"
                      value={formData.firstName || ""}
                      onChange={(e) => {
                        setHasFormChanges(true);
                        setFormData(prev => ({ ...prev, firstName: e.target.value }));
                      }}
                      className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                    />
                  </div>
                  <div>
                    <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Your Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName || ""}
                      onChange={(e) => {
                        setHasFormChanges(true);
                        setFormData(prev => ({ ...prev, lastName: e.target.value }));
                      }}
                      className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                    />
                  </div>
                </div>
  
                {/* Employee ID */}
                <div>
                  <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Your Employee ID</label>
                  <input
                    type="text"
                    value={formData.employeeId || ""}
                    onChange={(e) => {
                      setHasFormChanges(true);
                      setFormData(prev => ({ ...prev, employeeId: e.target.value }));
                    }}
                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154]"
                  />
                </div>
              </div>
  
              {/* Right Column */}
              <div className="space-y-6">
                {/* Title Field */}
                <div>
                  <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Title</label>
                  <textarea
                    placeholder="Short Event Description (<40 characters)"
                    value={formData.title || ""}
                    onChange={(e) => {
                      setHasFormChanges(true);
                      setFormData((prev) => ({ ...prev, title: e.target.value }));
                    }}
                    maxLength={40}
                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] height: 60px placeholder:text-xs placeholder:font-mono"
                  />
                </div>
  
                {/* Type of Concern */}
                <div className="mb-4">
                  <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">
                    Type of Concern
                  </label>
                  <select
                    value={formData.obsTypeOfConcern || ""}
                    onChange={(e) => {
                      if (isReadOnly) return;
                      setHasFormChanges(true);
                      setFormData((prev) => ({ ...prev, obsTypeOfConcern: e.target.value }));
                    }}
                    className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#b22222]"
                  >
                    <option value="">Select</option>
                    {referenceData.typeOfConcern.map((item) => (
                      <option key={item.id} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
  
                {/* Priority Type */}
                <div className="mb-4">
                  <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">
                    Priority Type
                  </label>
                  <select
                    value={formData.obsPriorityType || ""}
                    onChange={(e) => {
                      if (isReadOnly) return;
                      setHasFormChanges(true);
                      setFormData((prev) => ({ ...prev, obsPriorityType: e.target.value }));
                    }}
                    className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#b22222]"
                  >
                    <option value="">Select</option>
                    {referenceData.priorityTypes.map((item) => (
                      <option key={item.id} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
  
                {/* Where Did this Occur? */}
                <div className="mb-4">
                  <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">
                    Where Did This Occur?
                  </label>
                  <select
                    value={formData.whereDidThisOccur || ""}
                    onChange={(e) => {
                      if (isReadOnly) return;
                      setHasFormChanges(true);
                      setFormData((prev) => ({ ...prev, whereDidThisOccur: e.target.value }));
                    }}
                    className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#b22222]"
                  >
                    <option value="">Select</option>
                    {referenceData.whereDidThisOccur.map((item) => (
                      <option key={item.id} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
  
                {/* Additional Work Area Details */}
                <div>
                  <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Additional Work Area Details (Optional)</label>
                  <textarea
                    placeholder="Specific details about the work area where the incident occurred (<200 characters)"
                    value={formData.workAreaDescription || ""}
                    onChange={(e) => {
                      if (isReadOnly) return;
                      setHasFormChanges(true);
                      setFormData((prev) => ({ ...prev, workAreaDescription: e.target.value }));
                    }}
                    readOnly={isReadOnly}
                    maxLength={200}
                    className={`appearance-none block w-full text-gray-700 border border-gray-300 rounded py-6 px-4 leading-tight placeholder:text-xs placeholder:font-mono ${isReadOnly
                      ? 'bg-gray-100 focus:outline-none focus:border-gray-300 focus:ring-0 resize-y'
                      : 'bg-gray-50 focus:outline-none focus:bg-white focus:border-[#b22222] resize-y'
                      }`}
                    rows={3}
                  />
                </div>
              </div>
            </div>
  
            {/* Second Row */}
            <div className="h-1 w-full bg-red-50 rounded-md my-6"></div>
  
            <div className="grid grid-cols-1 gap-6">
              {/* Work Activity Type */}
              <div>
                <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">Work Activity Type</label>
                <select
                  value={formData.activityType || ""}
                  onChange={(e) => {
                    setHasFormChanges(true);
                    setFormData((prev) => ({ ...prev, activityType: e.target.value }));
                  }}
                  className="block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded-md py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] focus:ring-[#cb4154]"
                >
                  <option value="">Select</option>
                  {referenceData.activityTypes.map((item) => (
                    <option key={item.id} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
  
              {/* Describe Problem or Issue */}
              <div className="mb-4">
                <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">
                  Describe Problem or Issue
                </label>
                <textarea
                  placeholder="Describe the problem or issue in detail (<500 characters)"
                  value={formData.incidentDescription || ""}
                  onChange={(e) => {
                    setHasFormChanges(true);
                    setFormData((prev) => ({ ...prev, incidentDescription: e.target.value }));
                  }}
                  maxLength={500}
                  className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] placeholder:text-xs placeholder:font-mono"
                  rows={4}
                />
              </div>
  
              {/* Describe Corrective Action */}
              <div className="mb-4">
                <label className="block tracking-wide text-gray-700 text-xs font-bold mb-2">
                  Describe Corrective Action
                </label>
                <textarea
                  placeholder="Describe the corrective action taken or recommended (<500 characters)"
                  value={formData.obsCorrectiveAction || ""}
                  onChange={(e) => {
                    setHasFormChanges(true);
                    setFormData((prev) => ({ ...prev, obsCorrectiveAction: e.target.value }));
                  }}
                  maxLength={500}
                  className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-300 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-[#cb4154] placeholder:text-xs placeholder:font-mono"
                  rows={4}
                />
              </div>
            </div>
  
            {/* ✅ Permission-based button rendering */}
 {!isReadOnly && (
  currentMode === 'create' ? (
    <div className="flex justify-end gap-4 pt-6">
      <button className="modal-button-primary" type="submit">
        Submit Observation Report
      </button>
    </div>
  ) : currentMode.startsWith('investigate') ? (
    <div className="flex justify-end gap-4 pt-6">
      <button
        type="button"
        onClick={() => handleSaveChanges()}
        className="modal-button-primary"
      >
        Update Observation Form
      </button>
    </div>
  ) : (
    <div className="pt-6">
      {/* ✅ Buttons Row */}
      <div className="flex justify-end gap-4">
        {/* ✅ Save as Draft - EVERYONE can save draft */}
        <button
          type="button"
          className="modal-button-update"
          onClick={() => handleSaveChanges(true)}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save as Draft"}
        </button>

        {/* ✅ Reject & Next Step - ONLY for users with canTakeFirstReportActions */}
        {canTakeFirstReportActions && (
          <>
            <button
              type="button"
              onClick={() => saveChangesAndContinue(() => setShowRejectModal(true))}
              className="modal-button-reject"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Reject"}
            </button>
            <button
              type="button"
              className="modal-button-primary"
              onClick={() => saveChangesAndContinue(() => setShowStatusChoiceModal(true))}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Next Step"}
            </button>
          </>
        )}
      </div>

      {/* ✅ Show message below buttons for users who can't take actions */}
      {!canTakeFirstReportActions && (
        <div className="mt-3 text-center">
          <div className="inline-flex items-center px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
            <svg className="w-4 h-4 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-amber-800 font-medium">
              You can save drafts but cannot take first report actions
            </span>
          </div>
        </div>
      )}
    </div>
  )
)}

          </form>
        </div>
      </div>
  
      {/* Save Confirmation Modal */}
      <SaveSuccessModal isOpen={showSuccessModal} onClose={handleCloseModal} />
  
      {/* Documents Modal */}
      <DocumentsModal
        isOpen={showDocsModal}
        onClose={() => setShowDocsModal(false)}
        submissionId={formData.submissionId}
        existingDocuments={formData.documents}
        onSave={handleDocumentsSave}
      />
  
      <RejectModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onReject={handleReject}
        reportId={formData.submissionId}
      />
  
      {showRejectSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Rejection Successful</h3>
            <p className="mb-4">
              Report <span className="font-medium">{formData.submissionId}</span> has been rejected successfully.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowRejectSuccessModal(false);
                  router.push('/first-reports/injury');
                }}
                className="modal-button-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
  
      <QuickFixActionsObservationModal
        isOpen={showQuickFixModal}
        onClose={() => setShowQuickFixModal(false)}
        submissionId={formData.submissionId}
        onSuccess={fetchObservationData}
        existingData={formData}
      />
  
      <StatusChoiceModal
        isOpen={showStatusChoiceModal}
        onClose={() => setShowStatusChoiceModal(false)}
        onChoice={(choice) => {
          if (choice === 'obsResolved') {
            handleResolvedImmediately();
          } else if (choice === 'obsquickFix') {
            handleQuickFix();
          } else if (choice === 'obsNeedsAction') {
            handleNeedsAction();
          }
        }}
      />
    </main>
  );

  

}
