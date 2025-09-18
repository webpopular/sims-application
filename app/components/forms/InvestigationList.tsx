// app/components/forms/InvestigationList.tsx - ORIGINAL CODE with ONLY RBAC filtering added
'use client';

import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '@/amplify/data/schema';
import { useUserAccess } from '@/app/hooks/useUserAccess';
import Link from 'next/link';
import {initAmplify} from "@/app/amplify-init";
import {callAppSync} from "@/lib/utils/appSync";

initAmplify();

let dataClient: ReturnType<typeof import('aws-amplify/data').generateClient<Schema>> | null = null;
async function getDataClient() {
  if (!dataClient) {
    const { generateClient } = await import('aws-amplify/data');
    dataClient = generateClient<Schema>();
  }
  return dataClient;
}

interface Investigation {
  id: string | null;
  submissionId: string;
  recordType: string;
  division: string | null;
  platform: string | null;
  status: string;
  location: string;
  submissionType: string;
  dateOfIncident?: string | null;
  title?: string | null;
  createdAt: string | null;
  documents?: Document[];
  interimCorrectiveActions?: InterimCorrectiveAction[];
  rca?: RCA[];
  finalCorrectiveAction?: FinalCorrectiveAction[];
  updatedAt?: string;
  injuryCategory?: string | null;
  estimatedLostWorkDays?: number | null;
  lessonsLearned?: { uploadedAt: string }[];
  eventApprovalStatus?: 'YET_TO_START' | 'ACTION_IN_PROGRESS' | 'ACTION_COMPLETE' | 'SEND_BACK';
  eventApprovaluploadedAt?: string;
  locationOnSite: string | null;
  injuryDescription: string | null;
  incidentDescription?: string | null;
  investigationStatus?: string | null;
  saStatus?: string | null;
  saUpdateDate?: string | null;
}

interface Document {
  fileName: string;
  s3Key: string;
  uploadedAt: string;
  uploadedBy: string;
  size: number;
  type: string;
}

interface InterimCorrectiveAction {
  icaStatus?: string;
  uploadedAt: string;
}

interface RCA {
  isRCAComplete?: string;
  rcaStatus?: string;
  uploadedAt: string;
}

interface FinalCorrectiveAction {
  fcaStatus?: string;
  uploadedAt: string;
}

const client = generateClient<Schema>();

export default function InvestigationList() {
  const { userAccess, loading: userLoading } = useUserAccess(); // ✅ ONLY ADD: This line
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [locationFilter, setLocationFilter] = useState('all');
  const [submissionTypeFilter, setSubmissionTypeFilter] = useState('all');
  const [recordTypeFilter, setRecordTypeFilter] = useState('all');

  // ✅ KEEP YOUR ORIGINAL getFormType FUNCTION EXACTLY AS IS
  const getFormType = (submissionId: string, recordType: string) => {
    // Explicit check for Observation reports
    if (recordType === "OBSERVATION_REPORT") {
      return "Observation";
    }
    // Explicit check for Injury reports
    else if (recordType === "INJURY_REPORT") {
      // Determine US or Global based on prefix
      return submissionId.startsWith("US-") ? "US" : "Global";
    }
    // Handle any future record types by defaulting to a safe value
    else {
      console.warn(`Unknown record type: ${recordType}. Defaulting to "Unknown".`);
      return "Unknown";
    }
  };

  // ✅ ONLY MODIFY: Your existing useEffect - ADD user access dependency
  useEffect(() => {
    if (!userLoading && userAccess?.email) { // ✅ ONLY ADD: Check if user access is ready
      fetchInvestigations();
    }
  }, [userLoading, userAccess?.email]); // ✅ ONLY MODIFY: Add dependencies

  // ✅ ONLY MODIFY: Your existing fetchInvestigations function - ADD RBAC filter
  const fetchInvestigationsxxx = async () => {
    // ✅ ONLY ADD: User access check at the beginning
    if (!userAccess?.email) {
      console.log('⚠️ [InvestigationList] No user access available');
      return;
    }

    try {
      console.log(`🔍 [InvestigationList] Fetching investigations for: ${userAccess.email}`);
      console.log(`🏢 [InvestigationList] User access scope: ${userAccess.accessScope}`);
      
      // ✅ KEEP YOUR ORIGINAL FILTER LOGIC - ONLY ADD RBAC filtering
      let filter: any = {
        or: [
          { status: { eq: 'Incident with RCA - Open' } },
          { status: { eq: 'Observation with RCA - Open' } },            
          { investigationStatus: { eq: 'RCA YET_TO_START' } }
        ]
      };
      
      // ✅ ONLY ADD: RBAC hierarchy filtering based on user access scope
      let rbacFilter: any = {};
      
      switch (userAccess.accessScope) {
        case 'ENTERPRISE':
          console.log(`🌐 [InvestigationList] Enterprise access - showing all investigations`);
          // No additional filtering needed
          break;
          
        case 'SEGMENT':
          console.log(`🏭 [InvestigationList] Segment access - filtering by segment: ${userAccess.segment}`);
          if (userAccess.segment) {
            rbacFilter.segment = { eq: userAccess.segment.replace(/>/g, '') };
          }
          break;
          
        case 'PLATFORM':
          console.log(`🏗️ [InvestigationList] Platform access - filtering by platform: ${userAccess.platform}`);
          if (userAccess.platform) {
            rbacFilter.platform = { eq: userAccess.platform.replace(/>/g, '') };
          }
          break;
          
        case 'DIVISION':
          console.log(`🏢 [InvestigationList] Division access - filtering by division: ${userAccess.division}`);
          if (userAccess.division) {
            rbacFilter.division = { eq: userAccess.division.replace(/>/g, '') };
          }
          break;
          
        case 'PLANT':
          console.log(`🏭 [InvestigationList] Plant access - filtering by plant: ${userAccess.plant}`);
          if (userAccess.plant) {
            rbacFilter.plant = { eq: userAccess.plant };
          }
          break;
      }
      
      // ✅ ONLY ADD: Combine original filter with RBAC filter
      if (Object.keys(rbacFilter).length > 0) {
        filter = {
          and: [
            filter,
            rbacFilter
          ]
        };
      }
      
      console.log(`🔍 [InvestigationList] Applied filter:`, filter);

      // ✅ KEEP YOUR ORIGINAL GRAPHQL QUERY - ONLY ADD the filter
      const response = await client.models.Submission.list({
        filter // ✅ ONLY MODIFY: Use the combined filter
      });

      // ✅ KEEP ALL YOUR ORIGINAL DATA PROCESSING EXACTLY AS IS
      if (response.data) {
        // Create a type guard for Document
        function isDocument(doc: any): doc is Document {
          return doc !== null &&
            typeof doc === 'object' &&
            'fileName' in doc &&
            's3Key' in doc &&
            'uploadedAt' in doc &&
            'uploadedBy' in doc &&
            'size' in doc &&
            'type' in doc;
        }

        function isInterimCorrectiveAction(item: any): item is InterimCorrectiveAction {
          return item !== null && typeof item === 'object' && 'uploadedAt' in item;
        }

        function isRCA(item: any): item is RCA {
          return item !== null && typeof item === 'object' && 'uploadedAt' in item;
        }

        function isFinalCorrectiveAction(item: any): item is FinalCorrectiveAction {
          return item !== null && typeof item === 'object' && 'uploadedAt' in item;
        }

        const mappedData: Investigation[] = response.data.map(item => {
          // Determine if status should be updated to "Complete"
          let updatedStatus = item.status;
          if (item.eventApprovalStatus === "ACTION_COMPLETE") {
            updatedStatus = "Complete";
          }

          return {
            id: item.id || null,
            submissionId: item.submissionId,
            recordType: item.recordType,
            division: item.division || null,
            platform: item.platform || null,
            status: updatedStatus,
            location: item.location || '',
            locationOnSite: item.locationOnSite || '',
            injuryDescription: item.injuryDescription || '',
            submissionType: item.submissionType,
            dateOfIncident: item.dateOfIncident || null,
            title: item.title || null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt ?? undefined,
            injuryCategory: item.injuryCategory || null,
            estimatedLostWorkDays: item.estimatedLostWorkDays ?? null,
            incidentDescription: item.incidentDescription || '',
            investigationStatus: item.investigationStatus || null,
            documents: (item.documents?.filter(isDocument) || []) as Document[],
            interimCorrectiveActions: (item.interimCorrectiveActions?.filter(isInterimCorrectiveAction) || []) as InterimCorrectiveAction[],
            rca: (item.rca?.filter(isRCA) || []) as RCA[],
            finalCorrectiveAction: (item.finalCorrectiveAction?.filter(isFinalCorrectiveAction) || []) as FinalCorrectiveAction[],
            lessonsLearned: (item.lessonsLearned || []) as { uploadedAt: string }[],

            eventApprovalStatus: item.eventApprovalStatus === undefined || item.eventApprovalStatus === null
              ? 'YET_TO_START'
              : item.eventApprovalStatus,

            eventApprovaluploadedAt: item.eventApprovaluploadedAt ?? undefined,
            saStatus: item.saStatus || '',
            saUpdateDate: item.saUpdateDate || '',
          };
        });

        setInvestigations(mappedData);
        console.log(`✅ [InvestigationList] Loaded ${mappedData.length} investigations for user`);
      }
    } catch (error) {
      console.error('Error fetching investigations:', error);
    }
  };

// ✅ FIXED: Fetch investigations with corrected RBAC filtering
  const fetchInvestigations = async () => {
    if (!userAccess?.email) {
      console.log('⚠️ [InvestigationList] No user access available');
      return;
    }

    try {
      console.log(`🔍 [InvestigationList] Fetching investigations for: ${userAccess.email}`);
      console.log(`🏢 [InvestigationList] Scope: ${userAccess.accessScope}`);
      console.log(`🏷️ [InvestigationList] Hierarchy: ${userAccess.hierarchyString}`);

      // Original business filter
      let businessFilter: any = {
        or: [
          { status: { eq: 'Incident with RCA - Open' } },
          { status: { eq: 'Observation with RCA - Open' } },
          { investigationStatus: { eq: 'RCA YET_TO_START' } },
        ],
      };

      // RBAC filter on hierarchyString
      let rbacFilter: any = {};
      switch (userAccess.accessScope) {
        case 'ENTERPRISE':
          break;
        case 'SEGMENT':
          if (userAccess.segment) {
            rbacFilter.hierarchyString = {
              beginsWith: `ITW>${userAccess.segment.replace(/>/g, '')}>`,
            };
          }
          break;
        case 'PLATFORM':
          if (userAccess.segment && userAccess.platform) {
            rbacFilter.hierarchyString = {
              beginsWith: `ITW>${userAccess.segment.replace(/>/g, '')}>${userAccess.platform.replace(/>/g, '')}>`,
            };
          }
          break;
        case 'DIVISION':
          if (userAccess.segment && userAccess.platform && userAccess.division) {
            rbacFilter.hierarchyString = {
              beginsWith: `ITW>${userAccess.segment.replace(/>/g, '')}>${userAccess.platform.replace(/>/g, '')}>${userAccess.division.replace(/>/g, '')}>`,
            };
          }
          break;
        case 'PLANT':
          if (userAccess.hierarchyString) {
            // exact plant hierarchy
            rbacFilter.hierarchyString = { eq: userAccess.hierarchyString };
          }
          break;
      }

      const filter = Object.keys(rbacFilter).length ? { and: [businessFilter, rbacFilter] } : businessFilter;
      console.log('[InvestigationList] Applied filter:', filter);

      let rows: any[] | null = null;
      try {
        const client = await getDataClient();
        const resp = await client.models.Submission.list({
          authMode: 'userPool', // important when your default is userPool
          filter
        });

        if (resp?.data) {
          rows = resp.data;
        } else if (resp?.errors?.length) {
          throw new Error(resp.errors[0].message ?? 'Unknown Data error');
        }
      } catch (e) {
        console.warn('[InvestigationList] Data client not available, falling back to GraphQL:', e);
      }

      // Fallback to raw GraphQL (same AppSync the old app uses)
            if (!rows) {
              const query = /* GraphQL */ `
          query List($filter: ModelSubmissionFilterInput) {
            listSubmissions(filter: $filter, limit: 200) {
              items {
                id
                submissionId
                recordType
                division
                platform
                status
                location
                locationOnSite
                injuryDescription
                submissionType
                dateOfIncident
                title
                createdAt
                updatedAt
                injuryCategory
                estimatedLostWorkDays
                incidentDescription
                investigationStatus
                documents { fileName s3Key uploadedAt uploadedBy size type }
                interimCorrectiveActions { icaStatus uploadedAt }
                rca { isRCAComplete rcaStatus uploadedAt }
                finalCorrectiveAction { fcaStatus uploadedAt }
                lessonsLearned { uploadedAt }
                eventApprovalStatus
                eventApprovaluploadedAt
                saStatus
                saUpdateDate
                hierarchyString
              }
            }
          }`;
        const { data, errors } = await callAppSync(query, { filter });
        if (errors?.length) throw new Error(errors[0].message);
        rows = data?.listSubmissions?.items ?? [];
      }

      if (rows) {
        const isDocument = (doc: any): doc is Document =>
            doc && typeof doc === 'object' &&
            'fileName' in doc && 's3Key' in doc && 'uploadedAt' in doc && 'uploadedBy' in doc && 'size' in doc && 'type' in doc;

        const isInterimCorrectiveAction = (x: any): x is InterimCorrectiveAction =>
            x && typeof x === 'object' && 'uploadedAt' in x;

        const isRCA = (x: any): x is RCA => x && typeof x === 'object' && 'uploadedAt' in x;

        const isFinalCorrectiveAction = (x: any): x is FinalCorrectiveAction =>
            x && typeof x === 'object' && 'uploadedAt' in x;

        const mapped = rows.map((item: any) => {
          let updatedStatus = item.status;
          if (item.eventApprovalStatus === 'ACTION_COMPLETE') updatedStatus = 'Complete';

          return {
            id: item.id || null,
            submissionId: item.submissionId,
            recordType: item.recordType,
            division: item.division || null,
            platform: item.platform || null,
            status: updatedStatus,
            location: item.location || '',
            locationOnSite: item.locationOnSite || '',
            injuryDescription: item.injuryDescription || '',
            submissionType: item.submissionType,
            dateOfIncident: item.dateOfIncident || null,
            title: item.title || null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt ?? undefined,
            injuryCategory: item.injuryCategory || null,
            estimatedLostWorkDays: item.estimatedLostWorkDays ?? null,
            incidentDescription: item.incidentDescription || '',
            investigationStatus: item.investigationStatus || null,
            documents: (item.documents?.filter(isDocument) || []) as Document[],
            interimCorrectiveActions: (item.interimCorrectiveActions?.filter(isInterimCorrectiveAction) || []) as InterimCorrectiveAction[],
            rca: (item.rca?.filter(isRCA) || []) as RCA[],
            finalCorrectiveAction: (item.finalCorrectiveAction?.filter(isFinalCorrectiveAction) || []) as FinalCorrectiveAction[],
            lessonsLearned: (item.lessonsLearned || []) as { uploadedAt: string }[],
            eventApprovalStatus:
                item.eventApprovalStatus === undefined || item.eventApprovalStatus === null
                    ? 'YET_TO_START'
                    : item.eventApprovalStatus,
            eventApprovaluploadedAt: item.eventApprovaluploadedAt ?? undefined,
            saStatus: item.saStatus || '',
            saUpdateDate: item.saUpdateDate || '',
          } as Investigation;
        });

        setInvestigations(mapped);
        console.log(`✅ [InvestigationList] Loaded ${mapped.length} investigations`);
      }
    } catch (err) {
      console.error('[InvestigationList] Error fetching investigations:', err);
    }
  };



  // ✅ KEEP ALL YOUR ORIGINAL UTILITY FUNCTIONS EXACTLY AS IS
  const formatClassification = (investigation: Investigation) => {
    if (investigation.recordType === 'OBSERVATION_REPORT') {
      return investigation.investigationStatus || "Not Classified";
    }

    if (!investigation.injuryCategory) return "Not Classified";
    if (investigation.injuryCategory === "Medically Treated with Lost Time (LTA)" && investigation.estimatedLostWorkDays) {
      return `${investigation.injuryCategory} (${investigation.estimatedLostWorkDays} days)`;
    }
    return investigation.injuryCategory;
  };

  // Utility function for latest status
  function getLatestStatus<T extends { uploadedAt: string }>(items: T[] | undefined, statusKey: keyof T): string {
    if (!items?.length) return 'Pending';
    const latestItem = items.reduce((latest, item) =>
      new Date(item.uploadedAt) > new Date(latest.uploadedAt) ? item : latest
    );
    return (latestItem[statusKey] as string) || 'Pending';
  }

  // Utility function for latest date
  function getLastUpdatedDate(dates: string[]): string {
    const validDates = dates
      .map(date => new Date(date))
      .filter(d => !isNaN(d.getTime()));

    if (!validDates.length) return 'N/A';

    const latestDate = new Date(Math.max(...validDates.map(date => date.getTime())));
    return formatDate(latestDate.toISOString());
  }

  // Utility function for formatting dates nicely
  function formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  // ✅ KEEP ALL YOUR ORIGINAL getSectionStatusAndDate FUNCTION EXACTLY AS IS
  const getSectionStatusAndDate = (investigation: Investigation, section: string) => {
    // Special handling for sections that differ between record types
    if (section === 'First Report - Accepted' || section === 'Observation Report') {
      return {
        status: investigation.submissionId,
        date: formatDate(investigation.updatedAt),
      };
    }

    // For Injury Form section, don't show for Observation records
    if (section === 'Injury Form' && investigation.recordType === 'OBSERVATION_REPORT') {
      return {
        status: 'Not Applicable',
        date: 'N/A',
      };
    }

    // For Classification, handle differently for Observation records
    if (section === 'Classification') {
      if (investigation.recordType === 'OBSERVATION_REPORT') {
        return {
          status: investigation.investigationStatus || 'Not Classified',
          date: formatDate(investigation.updatedAt),
        };
      } else {
        return {
          status: formatClassification(investigation),
          date: formatDate(investigation.updatedAt),
        };
      }
    }

    const formatICAStatus = () => {
      const actions = investigation.interimCorrectiveActions ?? [];
      if (!actions.length) return <span className="status-pill status-yet-to-begin">Not Created</span>;

      const yetToBeginCount = actions.filter(action => action.icaStatus === "YET_TO_BEGIN").length;
      const inProgressCount = actions.filter(action => action.icaStatus === "ACTION_IN_PROGRESS").length;
      const completedCount = actions.filter(action =>
        action.icaStatus === "ACTION_COMPLETE_AND_FINAL" ||
        action.icaStatus === "ACTION_COMPLETE_STOP_GAP"
      ).length;

      const statusPills = [];

      if (yetToBeginCount > 0) {
        statusPills.push(
          <span key="yet-to-begin" className="status-pill status-yet-to-begin">
            Yet to Begin ({yetToBeginCount})
          </span>
        );
      }

      if (inProgressCount > 0) {
        statusPills.push(
          <span key="in-progress" className="status-pill status-in-progress">
            In Progress ({inProgressCount})
          </span>
        );
      }

      if (completedCount > 0) {
        statusPills.push(
          <span key="completed" className="status-pill status-completed">
            Completed ({completedCount})
          </span>
        );
      }

      return statusPills.length > 0 ? (
        <div className="status-group">
          {statusPills}
        </div>
      ) : (
        <span className="status-pill status-yet-to-begin">Not Created</span>
      );
    };

    const formatRCAStatus = () => {
      const rcaActions = investigation.rca ?? [];
      if (!rcaActions.length) return <span className="status-pill status-yet-to-begin">Not Created</span>;

      const yetToBeginCount = rcaActions.filter(action => !action.isRCAComplete || action.isRCAComplete === "").length;
      const inProgressCount = rcaActions.filter(action => action.isRCAComplete === "In Progress").length;
      const completedCount = rcaActions.filter(action => action.isRCAComplete === "Complete").length;

      const statusPills = [];

      if (yetToBeginCount > 0) {
        statusPills.push(
          <span key="yet-to-begin" className="status-pill status-yet-to-begin">
            Yet to Begin ({yetToBeginCount})
          </span>
        );
      }

      if (inProgressCount > 0) {
        statusPills.push(
          <span key="in-progress" className="status-pill status-in-progress">
            In Progress ({inProgressCount})
          </span>
        );
      }

      if (completedCount > 0) {
        statusPills.push(
          <span key="completed" className="status-pill status-completed">
            Completed ({completedCount})
          </span>
        );
      }

      return statusPills.length > 0 ? (
        <div className="status-group">
          {statusPills}
        </div>
      ) : (
        <span className="status-pill status-yet-to-begin">Not Created</span>
      );
    };

    const formatFCAStatus = () => {
      const fcaActions = investigation.finalCorrectiveAction ?? [];
      if (!fcaActions.length) return <span className="status-pill status-yet-to-begin">Not Created</span>;

      const yetToBeginCount = fcaActions.filter(action => action.fcaStatus === "YET_TO_BEGIN").length;
      const inProgressCount = fcaActions.filter(action => action.fcaStatus === "ACTION_IN_PROGRESS").length;
      const completedCount = fcaActions.filter(action => action.fcaStatus === "ACTION_COMPLETE").length;

      const statusPills = [];

      if (yetToBeginCount > 0) {
        statusPills.push(
          <span key="yet-to-begin" className="status-pill status-yet-to-begin">
            Yet to Begin ({yetToBeginCount})
          </span>
        );
      }

      if (inProgressCount > 0) {
        statusPills.push(
          <span key="in-progress" className="status-pill status-in-progress">
            In Progress ({inProgressCount})
          </span>
        );
      }

      if (completedCount > 0) {
        statusPills.push(
          <span key="completed" className="status-pill status-completed">
            Completed ({completedCount})
          </span>
        );
      }

      return statusPills.length > 0 ? (
        <div className="status-group">
          {statusPills}
        </div>
      ) : (
        <span className="status-pill status-yet-to-begin">Not Created</span>
      );
    };

    const formatLessonsLearnedStatus = () => {
      const lessons = investigation.lessonsLearned ?? [];
      if (!lessons.length) return <span className="status-pill status-yet-to-begin">Not Created</span>;

      return <span className="status-pill status-completed">Created ({lessons.length})</span>;
    };

    switch (section) {
      case 'Documents':
        return {
          status: `(${investigation.documents?.length || 0})`,
          date: getLastUpdatedDate(investigation.documents?.map(doc => doc.uploadedAt) || []),
        };

        case 'Safety Alert':
          return {
            status: investigation.saStatus 
              ? investigation.saStatus === "SAFETY_ALERT_NOT_CREATED"
                ? <span className="status-pill status-yet-to-begin">Not Created</span>
                : investigation.saStatus === "SAFETY_ALERT_OPEN"
                  ? <span className="status-pill status-in-progress">Open</span>
                  : investigation.saStatus === "SAFETY_ALERT_CREATED"
                    ? <span className="status-pill status-completed">Created</span>
                    : <span className="status-pill status-unknown">Unknown</span>
              : <span className="status-pill status-not-created">Not Created</span>,
            date: investigation.saUpdateDate
              ? formatDate(investigation.saUpdateDate)
              : "N/A",
          };        

      case 'Interim Corrective Actions':
        return {
          status: formatICAStatus(),
          date: getLastUpdatedDate(investigation.interimCorrectiveActions?.map(item => item.uploadedAt) || []),
        };

      case 'RCA':
        return {
          status: formatRCAStatus(),
          date: getLastUpdatedDate(investigation.rca?.map(item => item.uploadedAt) || []),
        };

      case 'Final Corrective Actions':
        return {
          status: formatFCAStatus(),
          date: getLastUpdatedDate(investigation.finalCorrectiveAction?.map(item => item.uploadedAt) || []),
        };

      case 'Lessons Learned':
        return {
          status: formatLessonsLearnedStatus(),
          date: getLastUpdatedDate(investigation.lessonsLearned?.map(item => item.uploadedAt) || []),
        };

      case 'Incident Closure':
      case 'Observation Closure':
        return {
          status: investigation.eventApprovalStatus
            ? investigation.eventApprovalStatus === "YET_TO_START"
              ? <span className="status-pill status-yet-to-start">Not Started</span>
              : investigation.eventApprovalStatus === "ACTION_IN_PROGRESS"
                ? <span className="status-pill status-in-progress">In Progress</span>
                : investigation.eventApprovalStatus === "ACTION_COMPLETE"
                  ? <span className="status-pill status-completed">Completed</span>
                  : investigation.eventApprovalStatus === "SEND_BACK"
                    ? <span className="status-pill status-sent-back">Sent back to Author</span>
                    : <span className="status-pill status-unknown">Unknown</span>
            : <span className="status-pill status-not-created">Not Created</span>,
          date: investigation.eventApprovaluploadedAt
            ? formatDate(investigation.eventApprovaluploadedAt)
            : "N/A",
        };

      default:
        return { status: '', date: '' };
    }
  };

  // ✅ ONLY ADD: Loading state for user access
  if (userLoading) {
    return (
      <div className="ml-2 px-4 py-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold mb-4 text-rose-700">Incidents with RCA</h2>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Loading user access...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ ONLY ADD: No access state
  if (!userAccess) {
    return (
      <div className="ml-2 px-4 py-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold mb-4 text-rose-700">Incidents with RCA</h2>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Required</h3>
            <p className="text-gray-600">Please log in to view investigations.</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ KEEP YOUR ENTIRE ORIGINAL RETURN JSX EXACTLY AS IS
  return (
    <div className="ml-2 px-4 py-2">
      <div className="flex flex-col">
        <h2 className="text-lg font-bold mb-4 text-rose-700">Incidents with RCA</h2>
        

        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          {/* Location Filter */}
          <div>
            <label className="block text-gray-600 mb-1">Location</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-2 py-1 border rounded bg-white"
            >
              <option value="all">All</option>
              {Array.from(new Set(investigations.map(r => r.locationOnSite).filter(Boolean))).map(loc => (
                <option key={loc} value={loc ?? ''}>{loc ?? 'N/A'}</option>
              ))}
            </select>
          </div>

          {/* Submission Type Filter */}
          <div>
            <label className="block text-gray-600 mb-1">Submission Type</label>
            <select
              value={submissionTypeFilter}
              onChange={(e) => setSubmissionTypeFilter(e.target.value)}
              className="px-2 py-1 border rounded bg-white"
            >
              <option value="all">All</option>
              {Array.from(new Set(investigations.map(r => r.submissionType).filter(Boolean))).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Record Type Filter */}
          <div>
            <label className="block text-gray-600 mb-1">Record Type</label>
            <select
              value={recordTypeFilter}
              onChange={(e) => setRecordTypeFilter(e.target.value)}
              className="px-2 py-1 border rounded bg-white"
            >
              <option value="all">All</option>
              <option value="INJURY_REPORT">Injury</option>
              <option value="OBSERVATION_REPORT">Observation</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <table className="min-w-full border-collapse table-fixed">
            <thead className="bg-red-50 border-b border-red-100">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-[#800000] uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-2 text-sm font-semibold text-[#800000] uppercase tracking-wider">
                  <div className="flex justify-between w-full">
                    <span>Tasks</span>
                    <span className="text-right">Status | Last Update Date</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {investigations
                .filter(r =>
                  (locationFilter === 'all' || r.locationOnSite === locationFilter) &&
                  (submissionTypeFilter === 'all' || r.submissionType === submissionTypeFilter) &&
                  (recordTypeFilter === 'all' || r.recordType === recordTypeFilter)
                )
                .map((investigation, i) => (
                  <tr key={investigation.submissionId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 border align-top">
                      <div className="bg-white rounded-lg shadow-md p-4 text-sm text-gray-700">
                        <h4 className="font-semibold text-gray-800 text-base mb-2 leading-snug line-clamp-2" title={investigation.title || 'No Title'}>
                          {investigation.title || 'No Title'}
                        </h4>

                        <div className="bg-gray-50 rounded-md shadow-sm p-4 space-y-1">
                          <p><span className="font-medium text-gray-500">Location:</span> {investigation.locationOnSite || 'N/A'}</p>
                          <p><span className="font-medium text-gray-500">Date of Incident:</span> {investigation.dateOfIncident ? formatDate(investigation.dateOfIncident) : 'N/A'}</p>
                          <p><span className="font-medium text-gray-500">Status:</span> {investigation.status || 'N/A'}</p>
                          <p><span className="font-medium text-gray-500">Type:</span> {investigation.recordType === 'INJURY_REPORT' ? 'Injury' : 'Observation'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-2 border text-sm">
                      <div className="space-y-0.5 text-xs">
                        {[
                          // First item changes based on record type
                          {
                            label: (investigation.recordType === 'OBSERVATION_REPORT')
                              ? 'Observation Report'
                              : 'Injury Form First Report - Accepted',
                            mode: (investigation.recordType === 'OBSERVATION_REPORT')
                              ? 'investigate-observationform'
                              : 'investigate-injuryform',
                          },

                          // Only show Classification for INJURY_REPORT
                          ...(investigation.recordType === 'INJURY_REPORT'
                            ? [{ label: 'Classification', mode: 'investigate-classification' }]
                            : []
                          ),

                          // Rest of the sections remain the same for both types
                          { label: 'Documents', mode: 'investigate-documents' },
                          { label: 'Safety Alert', mode: 'investigate-safetyalert' },
                          { label: 'Interim Corrective Actions', mode: 'investigate-interimcorrectiveactions' },
                          { label: 'RCA', mode: 'investigate-rca' },
                          { label: 'Final Corrective Actions', mode: 'investigate-finalcorrectiveactions' },
                          { label: 'Lessons Learned', mode: 'investigate-lessonslearned' },
                          { label: 'Incident Closure', mode: 'investigate-incidentclosure' },
                        ].map((task, index) => {
                          const { status, date } = getSectionStatusAndDate(investigation, task.label);
                          return (
                            <Link
                              key={`${task.mode}-${index}`} // index to make the key unique
                              href={`/investigate-sections?mode=${encodeURIComponent(task.mode)}&id=${investigation.submissionId}&formType=${getFormType(investigation.submissionId, investigation.recordType)}&recordType=${investigation.recordType}`}
                              className={`block px-3 py-1.5 text-sm transition-all duration-200 border-b border-gray-200 last:border-b-0
                                ${index % 1 === 0 ? 'bg-gray-50' : 'bg-white'}
                                hover:bg-red-200 hover:text-sm rounded-md`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-gray-700">{index + 1}. {task.label}</span>
                                <div className="flex items-center">
                                  {status}
                                  <span className="status-date ml-2">{date}</span>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ KEEP ALL YOUR ORIGINAL STYLES EXACTLY AS IS */}
      <style jsx>{`
        .status-pill {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          margin-right: 4px;
          margin-bottom: 2px;
        }

        .status-yet-to-begin {
          background-color: #ffebee;
          color: #c62828;
        }

        .status-in-progress {
          background-color: #fff3e0;
          color: #f57c00;
        }

        .status-completed {
          background-color: #e8f5e8;
          color: #2e7d32;
        }

        .status-yet-to-start {
          background-color: #ffebee;
          color: #c62828;
        }

        .status-sent-back {
          background-color: #fce4ec;
          color: #ad1457;
        }

        .status-unknown {
          background-color: #f5f5f5;
          color: #616161;
        }

        .status-not-created {
          background-color: #ffebee;
          color: #c62828;
        }

        .status-group {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
        }

        .status-date {
          font-size: 9px;
          color: #666;
          font-style: italic;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
