// app/components/forms/sections/InvestigationSections.tsx

'use client';
import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { type Schema } from "@/amplify/data/schema";
import InjuryFormSection from "./InjuryFormSection";
import ObservationFormSection from "./ObservationFormSection";
import Classification from "./Classification";
import DocumentsSection from "./Documents";
import SafetyAlertSection from "./SafetyAlert";
import FinalCorrectiveActionsSection from "./FinalCorrectiveActionsSection";
import InterimCorrectiveActionsSection from './InterimCorrectiveActions';
import RCASection from "./RCASection";
import LessonsLearnedSection from "./LessonsLearnedSection";
import IncidentClosure from "./IncidentClosure";
import ProgressTracker from "../ProgressTracker";
import { InjuryFormData } from "@/app/types";
import toast from 'react-hot-toast';
import type { ReferenceDataItem } from "@/app/types";

interface InvestigationSectionsProps {
  submissionId: string;
  mode?: string;
  formType: 'US' | 'Global';
  recordType?: 'INJURY_REPORT' | 'OBSERVATION_REPORT'; // Add recordType to distinguish between report types
  existingInjuryData?: any;
  existingClassificationData?: any;
  existingDocuments?: any;
  referenceData: {
    recordTypes: ReferenceDataItem[];
    employeeTypes: ReferenceDataItem[];
    ageRanges: ReferenceDataItem[];
    tenureRanges: ReferenceDataItem[];
    experienceLevels: ReferenceDataItem[];
    locationTypes: ReferenceDataItem[];
    activityTypes: ReferenceDataItem[];
    injuryTypes: ReferenceDataItem[];
    injuredBodyParts: ReferenceDataItem[];
    incidentTypes: ReferenceDataItem[];
    whereDidThisOccur: ReferenceDataItem[];
    //obsTypeOfConcern: ReferenceDataItem[];
    //obsPriorityType: ReferenceDataItem[];
    typeOfConcern: ReferenceDataItem[];
    priorityTypes: ReferenceDataItem[];
   };
}

const client = generateClient<Schema>();

export default function InvestigationSections({
  submissionId,
  mode,
  formType,
  recordType = 'INJURY_REPORT', // Default to INJURY_REPORT if not provided
  existingInjuryData,
  existingDocuments = [],
  existingClassificationData,
  referenceData,
}: InvestigationSectionsProps) {
  // Store submission data
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [injuryFormData, setInjuryFormData] = useState<Partial<InjuryFormData> | null>(null);
  const [hasFormChanges, setHasFormChanges] = useState(false);

  // Manage expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    injuryform: false,
    observationform: false, // Add this for observation form
    classification: false,
    documents: false,
    safetyalert: false,
    interimcorrectiveactions: false,
    rca: false,
    finalcorrectiveactions: false,
    lessonslearned: false,
    incidentclosure: false,
  });

  // Existing Injury Data Effect
  useEffect(() => {
    if (existingInjuryData) {
      console.log("Using existing injury data from props:", existingInjuryData);
      setSubmissionData(existingInjuryData);
    }
  }, [existingInjuryData]);

  // Fetch Submission Data Effect
  useEffect(() => {
    if (!submissionId || existingInjuryData) return; // Skip fetch if prop data is passed

    const fetchSubmissionData = async () => {
      try {
        console.log("Fetching submission data for ID:", submissionId);
        const response = await client.models.Submission.list({
          filter: { submissionId: { eq: submissionId } },
        });

        if (response.data?.length > 0) {
          setSubmissionData(response.data[0]);
          const fetchedData = response.data[0];

          console.group("Submission Data Sections Check:");
          console.log("Form Data:", fetchedData);
          console.log("Classification Data:", {
            injuryCategory: fetchedData.injuryCategory,
            estimatedLostWorkDays: fetchedData.estimatedLostWorkDays,
          });
          console.log("Documents:", fetchedData.documents);
          console.log("Interim Corrective Actions:", fetchedData.interimCorrectiveActions);
          console.log("RCA:", fetchedData.rca);
          console.log("Final Corrective Actions:", fetchedData.finalCorrectiveAction);
          console.groupEnd();

        } else {
          console.warn("⚠️ No submission data found.");
        }
      } catch (error) {
        console.error("Error fetching submission data:", error);
      }
    };

    fetchSubmissionData();
  }, [submissionId, existingInjuryData]);

  // Expand Section on Mode Effect
  useEffect(() => {
    if (mode?.startsWith("investigate-")) {
      const sectionKey = mode.replace("investigate-", "");
      setExpandedSections((prev) => ({
        ...prev,
        [sectionKey]: true,
      }));
    }
  }, [mode]);

  // Toggle section visibility
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Determine the actual record type from the submission data if available
  const actualRecordType = submissionData?.recordType || recordType;

  const handleSaveSection = async (sectionName: string, data: any): Promise<void> => {
    try {
      console.log(`🔄 Saving ${sectionName} data...`, data);

      if (!submissionData?.id) {
        const errorMessage = `❌ No submission ID found for updating ${sectionName}`;
        console.error(errorMessage);
        toast.error(errorMessage);
        return;
      }

      switch (sectionName) {
        case "observationform":
          await client.models.Submission.update({
            id: submissionData.id,
            // Add observation form fields here if needed
          });
          toast.success("Observation Form data saved!");
          break;

        case "injuryform":
          await client.models.Submission.update({
            id: submissionData.id,
            // Add injury form fields here if needed
          });
          toast.success("Injury Form data saved!");
          break;

        case "classification":
          await client.models.Submission.update({
            id: submissionData.id,
            injuryCategory: data?.injuryCategory,
            estimatedLostWorkDays: data?.estimatedLostWorkDays,
            OSHArecordableType: data?.OSHArecordableType,
            caseClassification: data?.caseClassification,
            injuryIllness: data?.injuryIllness,
            // No conditional logic for Observation reports
          });
          toast.success("Classification data saved!");
          break;

        case "documents":
          await client.models.Submission.update({
            id: submissionData.id,
            documents: data,
          });
          toast.success("Documents saved!");
          break;

        case "interimCorrectiveActions":
          await client.models.Submission.update({
            id: submissionData.id,
            interimCorrectiveActions: data,
          });
          toast.success("Interim Corrective Actions data saved!");
          break;

 


// InvestigationSections.tsx - Fixed RCA save case with explicit typing
case "rca":
  // ✅ FIXED: Add explicit type declaration
  const currentRCAData: any[] = submissionData?.rca || [];
  
  // Merge new data with existing data instead of replacing
  let mergedRCAData: any[]; // ✅ Explicit type declaration
  
  if (Array.isArray(data)) {
    mergedRCAData = data;
  } else {
    // If single RCA object, merge with existing array
    const existingIndex = currentRCAData.findIndex((rca: any) => rca.rcaId === data.rcaId);
    if (existingIndex >= 0) {
      mergedRCAData = [...currentRCAData];
      mergedRCAData[existingIndex] = { ...mergedRCAData[existingIndex], ...data };
    } else {
      mergedRCAData = [...currentRCAData, data];
    }
  }
  
  await client.models.Submission.update({
    id: submissionData.id,
    rca: mergedRCAData, // ✅ Now properly typed
  });
  
  // ✅ Update local state to reflect changes
  setSubmissionData((prevData: any) => ({
    ...prevData,
    rca: mergedRCAData
  }));
  
  toast.success("RCA data saved!");
  break;

        


        case "finalCorrectiveActions":
          await client.models.Submission.update({
            id: submissionData.id,
            finalCorrectiveAction: data,
          });
          toast.success("Final Corrective Actions saved!");
          break;


        case "lessonslearned":
          await client.models.Submission.update({
            id: submissionData.id,
            lessonsLearned: data,
          });
          toast.success("Lessons Learned saved!");
          break;

        case "incidentclosure":
          const latestClosureData = Array.isArray(data) ? data[data.length - 1] : data;
          await client.models.Submission.update({
            id: submissionData.id,
            eventApprovalStatus: latestClosureData?.eventApprovalStatus ?? submissionData.eventApprovalStatus,
            eventApprovaldueDate: submissionData.eventApprovaldueDate,
            eventApprovalassignedTo: submissionData.eventApprovalassignedTo,
            eventApprovalDescription: latestClosureData?.eventApprovalDescription ?? submissionData.eventApprovalDescription,
            eventApprovalNotes: submissionData.eventApprovalNotes,
            eventApprovaluploadedAt: new Date().toISOString(),
            eventApprovaluploadedBy: submissionData.eventApprovaluploadedBy,
            status: latestClosureData?.status ?? submissionData.status,
            investigationStatus: latestClosureData?.investigationStatus ?? submissionData.investigationStatus,
          });

          // Update local state
          setSubmissionData((prevData: any) => ({
            ...prevData,
            eventApprovalStatus: latestClosureData?.eventApprovalStatus ?? prevData.eventApprovalStatus,
            eventApprovalDescription: latestClosureData?.eventApprovalDescription ?? prevData.eventApprovalDescription,
            eventApprovaluploadedAt: new Date().toISOString(),
            status: latestClosureData?.status ?? prevData.status,
            investigationStatus: latestClosureData?.investigationStatus ?? prevData.investigationStatus,
          }));

          // Use appropriate message based on record type
          toast.success(actualRecordType === 'OBSERVATION_REPORT'
            ? "Observation Closure status updated!"
            : "Incident Closure status updated!");
          break;

        default:
          console.warn(`⚠️ No handler for section: ${sectionName}`);
      }
    } catch (error) {
      console.error(`❌ Error saving ${sectionName}:`, error);
      toast.error(`❌ Error saving ${sectionName}. Check console for details.`);
      throw error;
    }
  };

  return (
    <main className="flex flex-col items-center bg-gray-50 min-h-screen py-6">
    

        {/* Investigation Overview Section */}
        <div className="w-full max-w-5xl bg-white shadow-sm rounded-lg overflow-hidden mb-5">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
            <h2 className="text-base font-semibold text-red-800">Investigation Overview</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
            {/* Title Card */}
            <div className="bg-blue-50 rounded-md border border-blue-100 p-3 flex flex-col">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Title</span>
              <span className="text-sm font-medium text-gray-900 line-clamp-2">{submissionData?.title || "N/A"}</span>
            </div>

            {/* Plant Location Card (from locationOnSite) */}
            <div className="bg-purple-50 rounded-md border border-purple-100 p-3 flex flex-col">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Plant Location</span>
              <span className="text-sm font-medium text-gray-900">{submissionData?.locationOnSite || "N/A"}</span>
            </div>

            {/* Date of Incident Card */}
            <div className="bg-amber-50 rounded-md border border-amber-100 p-3 flex flex-col">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date of Incident</span>
              <span className="text-sm font-medium text-gray-900">
                {submissionData?.dateOfIncident
                  ? new Date(submissionData.dateOfIncident).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                  : "N/A"}
              </span>
            </div>

            {/* Submission ID Card */}
            <div className="bg-green-50 rounded-md border border-green-100 p-3 flex flex-col">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Submission ID</span>
              <span className="text-sm font-medium text-green-600">{submissionData?.submissionId || "N/A"}</span>
            </div>

{/* Status Card */}
<div className="bg-indigo-50 rounded-md border border-indigo-100 p-3 flex flex-col">
  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</span>
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${
    submissionData?.eventApprovalStatus === "ACTION_COMPLETE"
      ? "bg-green-100 text-green-800"
      : submissionData?.status === "Rejected"
        ? "bg-red-100 text-red-700"
        : submissionData?.status === "Pending Review"
          ? "bg-yellow-100 text-yellow-700"
          : (submissionData?.status === "Incident with RCA - Open" || 
             submissionData?.status === "Observation with RCA - Open")   
            ? "bg-yellow-100 text-yellow-800"
          : submissionData?.status === "Completed"
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-700"
  }`}>
    {submissionData?.eventApprovalStatus === "ACTION_COMPLETE"
      ? "Completed"
      : submissionData?.status || "Unknown"}
  </span>
</div>



            {/* Mode Card (for development) */}
            {/*<div className="bg-gray-50 rounded-md border border-gray-100 p-3 flex flex-col">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Mode (for dev.)</span>
              <span className="text-xs font-medium text-blue-600">{mode || "N/A"}</span>
            </div>*/}
          </div>
        </div>
      

      {/* Investigation Sections */}
      <div className="w-full max-w-5xl">
        {/* Conditionally render either InjuryFormSection or ObservationFormSection */}
        {actualRecordType === 'INJURY_REPORT' && (
          <InjuryFormSection
            isExpanded={expandedSections.injuryform}
            onToggle={() => toggleSection("injuryform")}
            submissionId={submissionId}
            existingInjuryData={submissionData}
            formType={formType}
          />
        )}

        {actualRecordType === 'OBSERVATION_REPORT' && (
          <ObservationFormSection
            isExpanded={expandedSections.observationform}
            onToggle={() => toggleSection("observationform")}
            submissionId={submissionId}
            existingObservationData={submissionData}
          />
        )}

        {actualRecordType === 'INJURY_REPORT' && (
          <Classification
            isExpanded={expandedSections.classification}
            onToggle={() => toggleSection("classification")}
            submissionId={submissionId}
            formType={formType}
            id={submissionData?.id}
            onSave={(sectionName, data) => handleSaveSection(sectionName, data)}
            injuryCategory={submissionData?.injuryCategory}
            OSHArecordableType={submissionData?.OSHArecordableType}
            caseClassification={submissionData?.caseClassification}
            injuryIllness={submissionData?.injuryIllness}
            estimatedLostWorkDays={submissionData?.estimatedLostWorkDays}
            status={submissionData?.status}
          />
        )}

        {/* Documents Section - shown for both types */}
        <DocumentsSection
          isExpanded={expandedSections.documents}
          onToggle={() => toggleSection("documents")}
          onSave={(sectionName, docs) => handleSaveSection(sectionName, docs)}
          submissionId={submissionId}
          existingDocuments={existingDocuments}
        />

        {/* Safety Alert Section - shown for both types */}
        <SafetyAlertSection
          isExpanded={expandedSections.safetyalert}
          onToggle={() => toggleSection("safetyalert")}
          formData={injuryFormData}
          setInjuryFormData={setInjuryFormData}
          setHasFormChanges={setHasFormChanges}
          submissionId={submissionId}
        />

        {/* Interim Corrective Actions Section - shown for both types */}
        <InterimCorrectiveActionsSection
          isExpanded={expandedSections.interimcorrectiveactions}
          onToggle={() => toggleSection("interimcorrectiveactions")}
          submissionId={submissionId}
          existingActions={submissionData?.interimCorrectiveActions || []}
          onSave={(sectionName, data) => handleSaveSection(sectionName, data)}
        />

        {/* RCA Section - shown for both types */}
        <RCASection
          isExpanded={expandedSections.rca}
          onToggle={() => toggleSection("rca")}
          submissionId={submissionId}
          existingRCAData={submissionData?.rca || []}
          onSave={(sectionName, data) => handleSaveSection(sectionName, data)}
          //submission={submissionData}
        />

        {/* Final Corrective Actions Section - shown for both types */}
        <FinalCorrectiveActionsSection
          isExpanded={expandedSections.finalcorrectiveactions}
          onToggle={() => toggleSection("finalcorrectiveactions")}
          submissionId={submissionId}
          existingActions={submissionData?.finalCorrectiveAction || []}
          onSave={(sectionName, data) => handleSaveSection(sectionName, data)}
        />

        {/* Lessons Learned Section - shown for both types */}
        <LessonsLearnedSection
          isExpanded={expandedSections.lessonslearned}
          onToggle={() => toggleSection("lessonslearned")}
          submissionId={submissionId}
          existingLessons={submissionData?.lessonsLearned}
          onSave={(section, data) => handleSaveSection(section, data)}
          formData={submissionData}
          referenceData={{
            locationTypes: referenceData.locationTypes.filter(loc => loc.id !== null) as {
              id: string;
              value: string;
              label: string;
            }[]
          }}
          formType={formType}
        />

        {/* Incident/Observation Closure Section - shown for both types with different labels */}
        <IncidentClosure
          isExpanded={expandedSections.incidentclosure}
          onToggle={() => toggleSection("incidentclosure")}
          submissionId={submissionId}
          onSave={(sectionName: string, data: any) => handleSaveSection(sectionName, data)}
          existingClosureData={{
            eventApprovalStatus: submissionData?.eventApprovalStatus || '',
            eventApprovalDescription: submissionData?.eventApprovalDescription || '',
          }}
          recordType={actualRecordType} // Pass record type to display appropriate labels
        />
      </div>
    </main>
  );
}
