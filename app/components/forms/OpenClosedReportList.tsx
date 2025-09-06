//app/components/forms/OpenClosedReportList.tsx

'use client';

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { generateClient } from "aws-amplify/data";
import { type Schema } from "@/amplify/data/schema";
import Papa from "papaparse";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { getUrl } from 'aws-amplify/storage';
import { getUserInfo } from '@/lib/utils/getUserInfo';
import { useUserAccess } from "@/app/hooks/useUserAccess"; // ✅ Added for data-level security
import { PermissionGate } from "../permission/PermissionGate"; // ✅ Added for permissions

import { Download, DownloadIcon } from "lucide-react";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    createColumnHelper,
} from "@tanstack/react-table";
import React from "react";

const client = generateClient<Schema>();


interface Report {
    hierarchyString?: string;
    id: string;
    submissionId: string;
    recordType: string;
    locationOnSite: string;
    title: string;
    dateOfIncident?: string;
    eventApprovalStatus?: string;
    investigationStatus?: string;
    status?: string;

    // Safety Alert fields
    saPDF?: string;
    saNumber?: string;
    saWhereInPlant?: string;
    saActionAndNextSteps?: string;
    saStatus?: string;
    saAuthor?: string;
    saCreateDate?: string;
    saUpdateDate?: string;
    saInjuryFlag?: boolean;
    saPropertyDamageFlag?: boolean;

    // Classification fields
    injuryCategory?: string;
    estimatedLostWorkDays?: number;
    OSHArecordableType?: string;
    caseClassification?: string;
    injuryIllness?: string;

    interimCorrectiveActions?: {
        icaId: string;
        dueDate?: string;
        assignedTo?: string;
        icaStatus?: string;
        actionDescription?: string;
        uploadedAt: string;
        uploadedBy?: string;
    }[];


    // RCA fields
    rca?: {
        rcaId?: string;
        isRCAComplete?: string;
        uploadedAt: string;
        rcaDirectCauseWhat?: string;
        rcaRootCauseWhy1?: string;
        rcaDirectCauseWho?: string;
        rcaDirectCauseWhen?: string;
        rcaDirectCauseWhere?: string;
        rcaDirectCauseHow?: string;
    }[];

    // Final Corrective Action fields
    finalCorrectiveAction?: {
        fcaId?: string;
        dueDate?: string;
        assignedTo?: string;
        fcaStatus?: string;
        actionDescription?: string;
        uploadedAt: string;
        uploadedBy?: string;
    }[];

    // Lessons Learned fields
    lessonsLearned?: {
        llid?: string;
        lessonsLearnedAuthor?: string;
        lessonsLearnedTitle?: string;
        lessonsLearnedApprovalStatus?: string;
        lessonDescription?: string;
        keyTakeaways?: string;
        uploadedAt?: string;
    }[];


    documents?: {
        fileName: string;
        s3Key: string;
        uploadedAt: string;
        uploadedBy: string;
        size: number;
        type: string;
        hasPII?: boolean;
    }[];
}


export default function OpenClosedReportList() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [filteredReports, setFilteredReports] = useState<Report[]>([]); // ✅ Added for data-level security
    const [globalFilter, setGlobalFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    //const [pageSize, setPageSize] = useState(10);
    //const [pageIndex, setPageIndex] = useState(0);
    const [sorting, setSorting] = useState<any>([{ id: 'dateOfIncident', desc: true }]);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [overallStatusFilter, setOverallStatusFilter] = useState<string>('all');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});
    const [locationFilter, setLocationFilter] = useState<string>('all');
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    const [userGroups, setUserGroups] = useState<string[]>([]);
    const [isHRUser, setIsHRUser] = useState<boolean>(false);

  // ✅ Add user access hook for data-level security
  const { userAccess, isReady } = useUserAccess();

  const columnHelper = createColumnHelper<Report>();

  // ✅ Data-level security filtering function
  const applyDataLevelSecurity = (reports: Report[], userAccess: any) => {
      if (!userAccess) {
          console.log('⚠️ [DataSecurity] No user access data - showing all records');
          return reports;
      }

      console.log(`🔍 [DataSecurity] Applying ${userAccess.accessScope} level filtering for user: ${userAccess.email}`);
      console.log(`🔍 [DataSecurity] User hierarchy: ${userAccess.hierarchyString}`);

      switch (userAccess.accessScope) {
          case 'ENTERPRISE':
              console.log(`✅ [DataSecurity] Enterprise access - returning all ${reports.length} records`);
              return reports; // Enterprise users see all data
              
          case 'SEGMENT':
          case 'PLATFORM':
          case 'DIVISION':
              const beginsWith = reports.filter(report => 
                  report.hierarchyString?.startsWith(userAccess.hierarchyString)
              );
              console.log(`✅ [DataSecurity] ${userAccess.accessScope} access - filtered to ${beginsWith.length} records`);
              return beginsWith;
              
          case 'PLANT':
              const exactMatch = reports.filter(report => 
                  report.hierarchyString === userAccess.hierarchyString
              );
              console.log(`✅ [DataSecurity] Plant access - filtered to ${exactMatch.length} records`);
              return exactMatch;
              
          default:
              console.log(`⚠️ [DataSecurity] Unknown access scope - applying restrictive filtering`);
              return reports.filter(report => 
                  report.hierarchyString === userAccess.hierarchyString
              );
      }
  };

  // ✅ Apply data-level security when reports or userAccess changes
  useEffect(() => {
      if (isReady && reports.length > 0) {
          console.log('🔍 [DataSecurity] Applying data-level security filtering...');
          const securityFilteredReports = applyDataLevelSecurity(reports, userAccess);
          setFilteredReports(securityFilteredReports);
          
          console.log(`📊 [DataSecurity] Security filtering complete:`);
          console.log(`   - Original records: ${reports.length}`);
          console.log(`   - After security filtering: ${securityFilteredReports.length}`);
          console.log(`   - User access scope: ${userAccess?.accessScope || 'Unknown'}`);
      } else if (reports.length > 0) {
          // If user access not ready, show all records temporarily
          setFilteredReports(reports);
      }
  }, [reports, userAccess, isReady]);

  // ✅ Updated columns with PermissionGate
  const columns = [
      // Expansion arrow column
      columnHelper.display({
          id: 'expand',
          header: '',
          cell: info => (
              <div
                  className={`px-4 py-2 cursor-pointer ${expandedRow === info.row.original.id ? 'text-red-600 font-bold' : ''}`}
                  onClick={(e) => {
                      e.stopPropagation();
                      setExpandedRow(prev => prev === info.row.original.id ? null : info.row.original.id);
                  }}
              >
                  {expandedRow === info.row.original.id ? '↓' : '→'}
              </div>
          ),
          size: 30
      }),

columnHelper.accessor('submissionId', {
    header: 'Submission ID',
    cell: info => {
        const status = info.row.original.status;
        const isClosedStatus = status === 'Completed' || 
              status === 'Close' || 
              status === 'Quick Fix - Close' ||
              status === 'Resolved Immediately';

        // If record is closed, show as plain text regardless of permissions
        if (isClosedStatus) {
            return (
                <span className="text-gray-600 font-thin">
                    {info.getValue()}
                </span>
            );
        }

        // For open records, check investigation permissions
        return (
            <PermissionGate 
                record={info.row.original} 
                action="edit"
                checkRecordAccess={true}
                permission="canTakeIncidentRCAActions"
                fallback={
                    // ✅ COMPLETELY NON-INTERACTIVE - no click, no hover, no indication of functionality
                    <span className="text-gray-500 font-normal" title="No investigation access">
                        {info.getValue()}
                    </span>
                }
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(info.row.original);
                    }}
                    className="text-[#cb4154] font-thin hover:underline focus:outline-none focus:underline"
                    title="Click to investigate"
                >
                    {info.getValue()}
                </button>
            </PermissionGate>
        );
    },
}),



      columnHelper.accessor('title', {
          header: 'Title',
          cell: info => (
              <div className="line-clamp-2">
                  {info.getValue()}
              </div>
          ),
      }),

      columnHelper.accessor('locationOnSite', {
          header: 'Location',
          cell: info => (
              <span className="text-gray-700">{info.getValue() || 'N/A'}</span>
          ),
      }),

      columnHelper.accessor('dateOfIncident', {
          header: 'Date of Incident',
          cell: info => formatDate(info.getValue()),
      }),
      /*columnHelper.accessor('eventApprovalStatus', {
          header: 'Approval Status',
          cell: info => formatStatusBadge(info.getValue()),
      }),*/
      columnHelper.accessor('status', {
          header: 'Overall Status',
          cell: info => formatOverallStatusBadge(info.getValue()),
      }),
  ];

  // ✅ Updated filtered data to use security-filtered reports
  const finalFilteredData = useMemo(() => {
      return filteredReports
          .filter(report => statusFilter === 'all' || report.eventApprovalStatus === statusFilter)
          .filter(report => overallStatusFilter === 'all' || report.status === overallStatusFilter)
          .filter(report => locationFilter === 'all' || report.locationOnSite === locationFilter);
  }, [filteredReports, statusFilter, overallStatusFilter, locationFilter]);

  const table = useReactTable({
      data: finalFilteredData, // ✅ Use security-filtered data
      columns,
      state: {
          globalFilter,
          sorting,
      },
      initialState: {
          pagination: {
              pageSize: 10,
              pageIndex: 0,
          },
      },
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      onSortingChange: setSorting,
      onGlobalFilterChange: setGlobalFilter,
      globalFilterFn: (row, columnId, filterValue) => {
          const searchableText = [
              row.original.submissionId,
              row.original.title,
              row.original.locationOnSite,
              row.original.status,
              row.original.eventApprovalStatus
          ].join(' ').toLowerCase();
          
          return searchableText.includes(filterValue.toLowerCase());
      },
  });

  useEffect(() => {
      async function checkUserGroups() {
          try {
              const userInfo = await getUserInfo();
              console.log('✅ User groups:', userInfo.groups);
              const groups = Array.isArray(userInfo.groups) ? userInfo.groups : [];
              const isHR = groups.includes('hr');

              setIsHRUser(isHR);
              setUserGroups(groups);
          } catch (error) {
              console.error('Error checking user groups:', error);
              setIsHRUser(false);
              setUserGroups([]);
          }
      }

      checkUserGroups();
  }, []);

  useEffect(() => {
      fetchReports();
  }, []);

  // ✅ Updated useEffect to reset pagination when filters change
  useEffect(() => {
      if (table) {
          table.setPageIndex(0);
      }
  }, [statusFilter, overallStatusFilter, locationFilter, globalFilter]);

  // ✅ Updated fetchReports function with hierarchyString field
  async function fetchReports() {
      try {
          const response = await client.models.Submission.list({
              selectionSet: [
                  'id', 'submissionId', 'recordType', 'locationOnSite', 'title',
                  'dateOfIncident', 'eventApprovalStatus', 'investigationStatus', 'status',
                  'documents.*', // Include all document fields
                  'saPDF', 'saNumber', 'saWhereInPlant', 'saActionAndNextSteps', 'saStatus',
                  'saAuthor', 'saCreateDate', 'saUpdateDate', 'saInjuryFlag', 'saPropertyDamageFlag',
                  'injuryCategory', 'estimatedLostWorkDays', 'OSHArecordableType',
                  'caseClassification', 'injuryIllness',
                  'interimCorrectiveActions.*', 'rca.*', 'finalCorrectiveAction.*', 'lessonsLearned.*',
                  'hierarchyString' // ✅ CRITICAL: Added for data-level security
              ]
          });

          if (!response.data) return;

          const mapped: Report[] = response.data.map(item => ({
              id: item.id ?? '',
              submissionId: item.submissionId,
              recordType: item.recordType,
              locationOnSite: item.locationOnSite || '',
              title: item.title || '',
              dateOfIncident: item.dateOfIncident ?? '',
              eventApprovalStatus: item.eventApprovalStatus ?? '',
              investigationStatus: item.investigationStatus ?? '',
              status: item.status ?? '',
              hierarchyString: item.hierarchyString || '', // ✅ Map hierarchyString
              documents: item.documents?.filter((doc: any): doc is any => doc !== null) || [],
              saPDF: item.saPDF || '',
              saNumber: item.saNumber || '',
              saWhereInPlant: item.saWhereInPlant || '',
              saActionAndNextSteps: item.saActionAndNextSteps || '',
              saStatus: item.saStatus || '',
              saAuthor: item.saAuthor || '',
              saCreateDate: item.saCreateDate || '',
              saUpdateDate: item.saUpdateDate || '',
              saInjuryFlag: item.saInjuryFlag || false,
              saPropertyDamageFlag: item.saPropertyDamageFlag || false,
              // Classification fields
              injuryCategory: item.injuryCategory || '',
              estimatedLostWorkDays: item.estimatedLostWorkDays || 0,
              OSHArecordableType: item.OSHArecordableType || '',
              caseClassification: item.caseClassification || '',
              injuryIllness: item.injuryIllness || '',

              interimCorrectiveActions: (item.interimCorrectiveActions ?? []).filter(Boolean).map(action => ({
                  icaId: action?.icaId ?? '',
                  dueDate: action?.dueDate ?? '',
                  assignedTo: action?.assignedTo ?? '',
                  icaStatus: action?.icaStatus ?? '',
                  actionDescription: action?.actionDescription ?? '',
                  uploadedAt: action?.uploadedAt ?? '',
                  uploadedBy: action?.uploadedBy ?? '',
              })),

              rca: (item.rca ?? []).filter(Boolean).map(rcaItem => ({
                  rcaId: rcaItem?.rcaId ?? '',
                  isRCAComplete: rcaItem?.isRCAComplete ?? '',
                  uploadedAt: rcaItem?.uploadedAt ?? '',
                  rcaDirectCauseWhat: rcaItem?.rcaDirectCauseWhat ?? '',
                  rcaRootCauseWhy1: rcaItem?.rcaRootCauseWhy1 ?? '',
                  rcaDirectCauseWho: rcaItem?.rcaDirectCauseWho ?? '',
                  rcaDirectCauseWhen: rcaItem?.rcaDirectCauseWhen ?? '',
                  rcaDirectCauseWhere: rcaItem?.rcaDirectCauseWhere ?? '',
                  rcaDirectCauseHow: rcaItem?.rcaDirectCauseHow ?? '',
              })),
              finalCorrectiveAction: (item.finalCorrectiveAction ?? []).filter(Boolean).map(fcaItem => ({
                  fcaId: fcaItem?.fcaId ?? '',
                  dueDate: fcaItem?.dueDate ?? '',
                  assignedTo: fcaItem?.assignedTo ?? '',
                  fcaStatus: fcaItem?.fcaStatus ?? '',
                  actionDescription: fcaItem?.actionDescription ?? '',
                  uploadedAt: fcaItem?.uploadedAt ?? '',
                  uploadedBy: fcaItem?.uploadedBy ?? '',
              })),

              lessonsLearned: (item.lessonsLearned ?? []).filter(Boolean).map(lesson => ({
                  llid: lesson?.llid || '',
                  lessonsLearnedAuthor: lesson?.lessonsLearnedAuthor || '',
                  lessonsLearnedTitle: lesson?.lessonsLearnedTitle || '',
                  lessonsLearnedApprovalStatus: lesson?.lessonsLearnedApprovalStatus || '',
                  lessonDescription: lesson?.lessonDescription || '',
                  keyTakeaways: lesson?.keyTakeaways || '',
                  uploadedAt: lesson?.uploadedAt || '',
              })),
          }));

          setReports(mapped);

          // Generate presigned URLs for PDFs
          const pdfKeys = mapped
              .map(item => item.saPDF)
              .filter((key): key is string => !!key);
          const urlMap: Record<string, string> = {};
          await Promise.all(
              pdfKeys.map(async (key: string) => {
                  try {
                      const result = await getUrl({
                          path: key,
                          options: {
                              bucket: 'safetyAlertStorage',
                              validateObjectExistence: false,
                              expiresIn: 3600 // 1 hour
                          }
                      });
                      urlMap[key] = result.url.toString();
                  } catch (error) {
                      console.error(`Failed to get URL for ${key}:`, error);
                  }
              })
          );

          setPdfUrls(urlMap);

      } catch (err) {
          console.error('Error fetching reports:', err);
      } finally {
          setIsLoading(false);
      }
  }

  // ✅ All your existing functions remain the same
  function formatDate(date?: string) {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString();
  }

  function formatStatusBadge(status?: string) {
      let color = 'bg-gray-100 text-gray-800';
      let text = 'Not Created';

      switch (status) {
          case 'ACTION_IN_PROGRESS':
              color = 'bg-yellow-100 text-yellow-800';
              text = 'In Progress';
              break;
          case 'ACTION_COMPLETE':
              color = 'bg-green-100 text-green-800';
              text = 'Completed';
              break;
          case 'SEND_BACK':
              color = 'bg-yellow-100 text-amber-800';
              text = 'Sent Back';
              break;
          default:
              color = 'bg-gray-100 text-gray-800';
              text = 'Not Created';
      }

      return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
              {text}
          </span>
      );
  }

  function formatOverallStatusBadge(status?: string) {
      let color = 'bg-gray-100 text-gray-800';
      let text = status || 'Not Created';

      switch (status) {
          case 'Incident with RCA - Open':
              color = 'bg-yellow-100 text-yellow-800';
              break;
          case 'Observation with RCA - Open':
              color = 'bg-yellow-100 text-yellow-800';
              break;                
          case 'Quick Fix - Open':
              color = 'bg-blue-100 text-blue-800';
              break;
          case 'Completed':
              color = 'bg-green-100 text-green-800';
              break;
          case 'Sent Back':
              color = 'bg-amber-100 text-amber-800';
              break;
          default:
              color = 'bg-gray-100 text-gray-800';
      }

      return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
              {text}
          </span>
      );
  }

  function formatICAStatus(report: Report) {
      const actions = report.interimCorrectiveActions ?? [];
      if (!actions.length) return 'Not Created';

      const inProgress = actions.filter(a => a.icaStatus === 'ACTION_IN_PROGRESS').length;
      const complete = actions.filter(a => ['ACTION_COMPLETE_AND_FINAL', 'ACTION_COMPLETE_STOP_GAP'].includes(a.icaStatus ?? '')).length;
      return inProgress > 0 ? `In Progress (${inProgress})` : complete > 0 ? `Completed (${complete})` : 'Not Created';
  }

  function formatRCAStatus(report: Report) {
      const rcas = report.rca ?? [];
      if (!rcas.length) return 'Not Created';

      const inProgress = rcas.filter(r => r.isRCAComplete === 'In Progress').length;
      const complete = rcas.filter(r => r.isRCAComplete === 'Complete').length;
      return inProgress > 0 ? `In Progress (${inProgress})` : complete > 0 ? `Completed (${complete})` : 'Not Created';
  }

  function formatFCAStatus(report: Report) {
      const fcas = report.finalCorrectiveAction ?? [];
      if (!fcas.length) return 'Not Created';

      const inProgress = fcas.filter(f => f.fcaStatus === 'ACTION_IN_PROGRESS').length;
      const complete = fcas.filter(f => f.fcaStatus === 'ACTION_COMPLETE').length;
      return inProgress > 0 ? `In Progress (${inProgress})` : complete > 0 ? `Completed (${complete})` : 'Not Created';
  }

  function handleRowClick(report: Report) {
      router.push(`/investigate-sections?mode=investigate-incidentclosure&id=${report.submissionId}`);
  }

  function getUniqueValues<T extends keyof Report>(data: Report[], key: T) {
      return ['all', ...Array.from(new Set(data.map(item => item[key] || '')))];
  }

  // ✅ Convert data to CSV
  function downloadCSV() {
      const csv = Papa.unparse(filteredReports.map(flattenReport)); // ✅ Use filtered reports
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'OpenClosedReports.csv');
  }

  // ✅ Convert data to Excel
  function downloadExcel() {
      const worksheet = XLSX.utils.json_to_sheet(filteredReports.map(flattenReport)); // ✅ Use filtered reports
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, 'OpenClosedReports.xlsx');
  }

  // ✅ Flatten nested data for export
  function flattenReport(report: Report) {
      return {
          ID: report.submissionId,
          RecordType: report.recordType,
          Location: report.locationOnSite,
          Title: report.title,
          DateOfIncident: report.dateOfIncident,
          ApprovalStatus: report.eventApprovalStatus,
          OverallStatus: report.status,
          InvestigationStatus: report.investigationStatus,
          ICAStatus: formatICAStatus(report),
          RCAStatus: formatRCAStatus(report),
          FCAStatus: formatFCAStatus(report),
      };
  }

  function formatRecordType(type?: string) {
      switch (type) {
          case 'INJURY_REPORT': return 'Injury';
          case 'LESSONS_LEARNED': return 'Lessons Learned';
          case 'EVENT_REPORT': return 'Event';
          case 'OBSERVATION': return 'Observation';
          default: return type || 'N/A';
      }
  }

  function formatICAStatusLabel(status?: string) {
      switch (status) {
          case 'ACTION_IN_PROGRESS': return 'In Progress';
          case 'ACTION_COMPLETE_AND_FINAL': return 'Complete and Final';
          case 'ACTION_COMPLETE_STOP_GAP': return 'Complete Stop Gap';
          default: return status || 'N/A';
      }
  }

  function formatFCAStatusLabel(status?: string) {
      switch (status) {
          case 'ACTION_IN_PROGRESS': return 'In Progress';
          case 'ACTION_COMPLETE': return 'Complete';
          default: return status || 'N/A';
      }
  }

  if (isLoading) {
      return <div className="ml-2 p-4">Loading open/closed reports...</div>;
  }


  return (
    <div className="ml-2 px-2 py-2">
 

        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4 flex gap-4 relative">
            {/* Search */}
            <input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search reports..."
                className="px-4 py-2 border rounded-md w-64 bg-white focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
            />

            {/* Filters */}
            {/*<select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
            >
                {getUniqueValues(filteredReports, 'eventApprovalStatus').map(status => (
                    <option key={status} value={status}>
                        {status === 'all' ? 'All Event Approval Status' : status || 'Not Created'}
                    </option>
                ))}
            </select>*/}

            <select
                value={overallStatusFilter}
                onChange={(e) => setOverallStatusFilter(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
            >
                {getUniqueValues(filteredReports, 'status').map(status => (
                    <option key={status} value={status}>
                        {status === 'all' ? 'Overall Status' : status || 'Not Created'}
                    </option>
                ))}
            </select>

            <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
            >
                {getUniqueValues(filteredReports, 'locationOnSite').map(location => (
                    <option key={location} value={location}>
                        {location === 'all' ? 'All Locations' : location}
                    </option>
                ))}
            </select>

            {/* Download Button */}
            <div className="relative ml-auto">
                <button
                    onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                    className="p-2 bg-red-100 border rounded-md hover:bg-red-200"
                    title="Download options"
                >
                    <span className="text-lg bfont-extrabold text-[#800000] ">↓</span>
                </button>

                {showDownloadOptions && (
                    <div
                        className="absolute top-full right-0 mt-2 w-40 bg-white border rounded-md shadow-lg flex flex-col items-start p-2 space-y-2 z-50"
                        onMouseLeave={() => setShowDownloadOptions(false)}
                    >
                        <button
                            onClick={() => { downloadCSV(); setShowDownloadOptions(false); }}
                            className="w-full text-left text-sm text-[#800000] hover:bg-red-50 px-2 py-1 rounded"
                        >
                            Download CSV
                        </button>
                        <button
                            onClick={() => { downloadExcel(); setShowDownloadOptions(false); }}
                            className="w-full text-left text-sm text-[#800000] hover:bg-red-50 px-2 py-1 rounded"
                        >
                            Download Excel
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full border-collapse table-fixed text-sm">
                <thead className="bg-[#80000010] text-emerald-700">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th
                                    key={header.id}
                                    className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none"
                                    onClick={header.column.getToggleSortingHandler()}
                                >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                    {header.column.getIsSorted() === 'asc' && ' ↑'}
                                    {header.column.getIsSorted() === 'desc' && ' ↓'}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {table.getRowModel().rows.map((row, i) => (
                        <React.Fragment key={row.id}>

                            
<tr
    className={`${i % 2 === 0 ? '' : 'bg-gray-50'} ${expandedRow === row.original.id ? 'bg-red-100 border-l-4 border-red-500' : ''}`}
    onClick={(e) => {
        // ✅ Prevent event bubbling from child elements
        e.stopPropagation();
        
        const status = row.original.status;
        const isClosedStatus = status === 'Completed' || 
              status === 'Close' || 
              status === 'Quick Fix - Close' ||
              status === 'Resolved Immediately';
        
        // ✅ FIXED: Check BOTH status AND permissions before allowing navigation
        if (!isClosedStatus && userAccess?.permissions?.canTakeIncidentRCAActions) {
            handleRowClick(row.original);
        }
        // If no permission or closed status, do nothing (no navigation)
    }}
    style={{
        cursor: (() => {
            const status = row.original.status;
            const isClosedStatus = status === 'Completed' || 
                  status === 'Close' || 
                  status === 'Quick Fix - Close' ||
                  status === 'Resolved Immediately';
            
            // ✅ FIXED: Only show pointer cursor if user has investigation permissions AND record is not closed
            if (!isClosedStatus && userAccess?.permissions?.canTakeIncidentRCAActions) {
                return 'pointer';
            }
            return 'default'; // No pointer cursor for unauthorized users or closed records
        })()
    }}
>
    {row.getVisibleCells().map(cell => (
        <td key={cell.id} className="px-1 py-2">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
    ))}
</tr>




                            {expandedRow === row.original.id && (
                                <tr>
                                    <td colSpan={columns.length} className="p-1 bg-red-50">
                                        <div className="bg-white rounded-lg shadow-md p-6 space-y-6 text-sm text-gray-700">
                                            {/* First row of cards */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {/* Injury Details */}
                                                <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                                                    <h4 className="text-gray-500 font-semibold mb-2">Injury Details</h4>
                                                    <p><strong>ID:</strong> {row.original.submissionId}</p>
                                                    <p><strong>Record Type:</strong> {formatRecordType(row.original.recordType)}</p>
                                                    <p><strong>Location:</strong> {row.original.locationOnSite || 'N/A'}</p>
                                                    <p><strong>Date of Incident:</strong> {formatDate(row.original.dateOfIncident)}</p>
                                                    <p><strong>Title:</strong> {row.original.title || 'N/A'}</p>
                                                    <p><strong>Overall Status:</strong> {row.original.status || 'N/A'}</p>
                                                    <p><strong>Investigation Status:</strong> {row.original.investigationStatus || 'N/A'}</p>
                                                    <p><strong>Approval Status:</strong> {row.original.eventApprovalStatus || 'N/A'}</p>
                                                </div>

                                                {/* Classification Details */}
                                                <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                                                    <h4 className="text-gray-500 font-semibold mb-2">Classification Details</h4>
                                                    <p><strong>Injury Category:</strong> {row.original.injuryCategory || 'Not Classified'}</p>

                                                    {row.original.injuryCategory === "Medically Treated with Lost Time (LTA)" && (
                                                        <p><strong>Estimated Lost Work Days:</strong> {row.original.estimatedLostWorkDays || '0'}</p>
                                                    )}

                                                    {/* OSHA Classification (US Only) */}
                                                    {row.original.OSHArecordableType && (
                                                        <>
                                                            <p className="mt-2"><strong>OSHA Recordable Type:</strong> {row.original.OSHArecordableType}</p>

                                                            {row.original.OSHArecordableType === "Is an OSHA Recordable" && (
                                                                <>
                                                                    <p><strong>Case Classification:</strong> {row.original.caseClassification || 'Not Specified'}</p>
                                                                    <p><strong>Injury/Illness:</strong> {row.original.injuryIllness || 'Not Specified'}</p>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                {/* Safety Report */}
                                                <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                                                    <h4 className="text-gray-500 font-semibold mb-2">Safety Alert</h4>
                                                    {row.original.saPDF ? (
                                                        <div className="space-y-4">
                                                            {/* Safety Alert Details */}
                                                            <div className="bg-white p-3 rounded-md shadow-sm">
                                                                <p><strong>Alert Number:</strong> {row.original.saNumber || 'N/A'}</p>
                                                                <p><strong>Where in Plant:</strong> {row.original.saWhereInPlant || 'N/A'}</p>
                                                                <p><strong>Author:</strong> {row.original.saAuthor || 'N/A'}</p>
                                                                <p><strong>Created:</strong> {row.original.saCreateDate ? new Date(row.original.saCreateDate).toLocaleString() : 'N/A'}</p>
                                                                <p><strong>Type:</strong>
                                                                    <span className="ml-2">
                                                                        {row.original.saInjuryFlag && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mr-1">Injury</span>}
                                                                        {row.original.saPropertyDamageFlag && <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Property</span>}
                                                                        {!row.original.saInjuryFlag && !row.original.saPropertyDamageFlag && 'None'}
                                                                    </span>
                                                                </p>
                                                            </div>

                                                            {/* Actions and Next Steps */}
                                                            {row.original.saActionAndNextSteps && (
                                                                <div className="bg-white p-3 rounded-md shadow-sm">
                                                                    <h5 className="text-sm font-medium text-gray-600 mb-1">Actions and Next Steps</h5>
                                                                    <p className="text-gray-700 break-words">{row.original.saActionAndNextSteps}</p>
                                                                </div>
                                                            )}

                                                            {/* PDF Link */}
                                                            {pdfUrls[row.original.saPDF] ? (
                                                                <a
                                                                    href={pdfUrls[row.original.saPDF]}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center justify-center px-4 py-2 bg-red-100 text-grey rounded-md hover:bg-red-300 w-full"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                    </svg>
                                                                    View Safety Alert PDF
                                                                </a>
                                                            ) : (
                                                                <span className="text-gray-400">Loading PDF link...</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p>No safety alert available</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Second row of cards */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {/* Interim Corrective Actions */}
                                                <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                                                    <h4 className="text-gray-500 font-semibold mb-2">Interim Corrective Actions</h4>
                                                    {(row.original.interimCorrectiveActions || []).length > 0 ? (
                                                        <div className="space-y-3">
                                                            {(row.original.interimCorrectiveActions || []).map((ica, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`p-3 rounded-md border ${ica.icaStatus === "ACTION_COMPLETE_AND_FINAL" ? "bg-green-50 border-green-200" :
                                                                        ica.icaStatus === "ACTION_COMPLETE_STOP_GAP" ? "bg-yellow-50 border-yellow-200" :
                                                                            ica.icaStatus === "ACTION_IN_PROGRESS" ? "bg-blue-50 border-blue-200" :
                                                                                "bg-gray-50 border-gray-200"
                                                                        }`}
                                                                >
                                                                    <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                                                                        <div>
                                                                            <span className="text-gray-700 text-xs font-bold">Due Date:</span> {ica.dueDate || 'N/A'}
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-700 text-xs font-bold">Assigned To:</span> {ica.assignedTo || 'N/A'}
                                                                        </div>
                                                                    </div>

                                                                    <div className="mb-2">
                                                                        <span className="text-gray-700 text-xs font-bold">Status:</span>
                                                                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${ica.icaStatus === "ACTION_COMPLETE_AND_FINAL" ? "bg-green-100 text-green-800" :
                                                                            ica.icaStatus === "ACTION_COMPLETE_STOP_GAP" ? "bg-yellow-100 text-yellow-800" :
                                                                                ica.icaStatus === "ACTION_IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                                                                                    "bg-gray-100 text-gray-800"
                                                                            }`}>
                                                                            {ica.icaStatus === "YET_TO_BEGIN" ? "Yet to Begin" :
                                                                                ica.icaStatus === "ACTION_IN_PROGRESS" ? "Action In Progress" :
                                                                                    ica.icaStatus === "ACTION_COMPLETE_AND_FINAL" ? "Complete (Final)" :
                                                                                        ica.icaStatus === "ACTION_COMPLETE_STOP_GAP" ? "Complete (Stop Gap)" :
                                                                                            ica.icaStatus}
                                                                        </span>
                                                                    </div>

                                                                    <div className="text-sm">
                                                                        <span className="text-gray-700 text-xs font-bold">Description:</span>
                                                                        <p className="mt-1 text-gray-600">{ica.actionDescription || 'No description provided.'}</p>
                                                                    </div>

                                                                    <div className="text-xs text-gray-500 mt-2">
                                                                        Updated: {ica.uploadedAt ? new Date(ica.uploadedAt).toLocaleString() : 'N/A'}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p>No interim corrective actions recorded</p>
                                                    )}
                                                </div>

                                                {/* RCA Details */}
                                                <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                                                    <h4 className="text-gray-500 font-semibold mb-2">Root Cause Analysis</h4>
                                                    {(row.original.rca || []).length > 0 ? (
                                                        <div className="space-y-3">
                                                            {(row.original.rca || []).map((rcaItem, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`p-3 rounded-md border ${rcaItem.isRCAComplete === "Complete" ? "bg-green-50 border-green-200" :
                                                                        rcaItem.isRCAComplete === "In Progress" ? "bg-blue-50 border-blue-200" :
                                                                            "bg-gray-50 border-gray-200"
                                                                        }`}
                                                                >
                                                                    <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                                                                        <div>
                                                                            <span className="text-gray-700 text-xs font-bold">Status:</span>
                                                                            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${rcaItem.isRCAComplete === "Complete" ? "bg-green-100 text-green-800" :
                                                                                rcaItem.isRCAComplete === "In Progress" ? "bg-blue-100 text-blue-800" :
                                                                                    "bg-gray-100 text-gray-800"
                                                                                }`}>
                                                                                {rcaItem.isRCAComplete || 'Yet to Begin'}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-700 text-xs font-bold">Date:</span> {rcaItem.uploadedAt ? new Date(rcaItem.uploadedAt).toLocaleDateString() : 'N/A'}
                                                                        </div>
                                                                    </div>

                                                                    {rcaItem.rcaDirectCauseWhat && (
                                                                        <div className="text-sm mt-2">
                                                                            <span className="text-gray-700 text-xs font-bold">Direct Cause:</span>
                                                                            <p className="mt-1 text-gray-600">{rcaItem.rcaDirectCauseWhat}</p>
                                                                        </div>
                                                                    )}

                                                                    {rcaItem.rcaRootCauseWhy1 && (
                                                                        <div className="text-sm mt-2">
                                                                            <span className="text-gray-700 text-xs font-bold">Root Cause:</span>
                                                                            <p className="mt-1 text-gray-600">{rcaItem.rcaRootCauseWhy1}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p>No root cause analysis recorded</p>
                                                    )}
                                                </div>

                                                {/* Final Corrective Actions */}
                                                <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                                                    <h4 className="text-gray-500 font-semibold mb-2">Final Corrective Actions</h4>
                                                    {(row.original.finalCorrectiveAction || []).length > 0 ? (
                                                        <div className="space-y-3">
                                                            {(row.original.finalCorrectiveAction || []).map((fca, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`p-3 rounded-md border ${fca.fcaStatus === "ACTION_COMPLETE" ? "bg-green-50 border-green-200" :
                                                                        fca.fcaStatus === "ACTION_IN_PROGRESS" ? "bg-blue-50 border-blue-200" :
                                                                            fca.fcaStatus === "YET_TO_BEGIN" ? "bg-gray-50 border-gray-200" :
                                                                                "bg-gray-50 border-gray-200"
                                                                        }`}
                                                                >
                                                                    <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                                                                        <div>
                                                                            <span className="text-gray-700 text-xs font-bold">Due Date:</span> {fca.dueDate || 'N/A'}
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-700 text-xs font-bold">Assigned To:</span> {fca.assignedTo || 'N/A'}
                                                                        </div>
                                                                    </div>

                                                                    <div className="mb-2">
                                                                        <span className="text-gray-700 text-xs font-bold">Status:</span>
                                                                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${fca.fcaStatus === "ACTION_COMPLETE" ? "bg-green-100 text-green-800" :
                                                                            fca.fcaStatus === "ACTION_IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                                                                                fca.fcaStatus === "YET_TO_BEGIN" ? "bg-gray-100 text-gray-800" :
                                                                                    "bg-gray-100 text-gray-800"
                                                                            }`}>
                                                                            {fca.fcaStatus === "ACTION_COMPLETE" ? "Complete" :
                                                                                fca.fcaStatus === "ACTION_IN_PROGRESS" ? "In Progress" :
                                                                                    fca.fcaStatus === "YET_TO_BEGIN" ? "Yet to Begin" :
                                                                                        fca.fcaStatus || 'Unknown'}
                                                                        </span>
                                                                    </div>

                                                                    <div className="text-sm">
                                                                        <span className="text-gray-700 text-xs font-bold">Description:</span>
                                                                        <p className="mt-1 text-gray-600">{fca.actionDescription || 'No description provided.'}</p>
                                                                    </div>

                                                                    <div className="text-xs text-gray-500 mt-2">
                                                                        Updated: {fca.uploadedAt ? new Date(fca.uploadedAt).toLocaleString() : 'N/A'}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p>No final corrective actions recorded</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Third row - Lessons Learned (full width) */}
                                            <div className="grid grid-cols-1 gap-6">
                                                {/* Lessons Learned */}
                                                <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                                                    <h4 className="text-gray-500 font-semibold mb-2">Lessons Learned</h4>
                                                    {(row.original.lessonsLearned || []).length > 0 ? (
                                                        <div className="space-y-3">
                                                            {(row.original.lessonsLearned || []).map((lesson, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`p-3 rounded-md border ${lesson.lessonsLearnedApprovalStatus === "LL_APPROVED" ? "bg-green-50 border-green-200" :
                                                                        lesson.lessonsLearnedApprovalStatus === "LL_SENT_FOR_APPROVAL" ? "bg-yellow-50 border-yellow-200" :
                                                                            lesson.lessonsLearnedApprovalStatus === "LL_SENT_BACK_FOR_REVISION" ? "bg-red-50 border-red-200" :
                                                                                "bg-gray-50 border-gray-200"
                                                                        }`}
                                                                >
                                                                    <div className="flex justify-between mb-2">
                                                                        <div>
                                                                            <span className="text-gray-700 text-xs font-bold">Title:</span> {lesson.lessonsLearnedTitle || 'Untitled'}
                                                                        </div>
                                                                        <span className={`px-2 py-0.5 rounded-full text-xs ${lesson.lessonsLearnedApprovalStatus === "LL_APPROVED" ? "bg-green-100 text-green-800" :
                                                                            lesson.lessonsLearnedApprovalStatus === "LL_SENT_FOR_APPROVAL" ? "bg-yellow-100 text-yellow-800" :
                                                                                lesson.lessonsLearnedApprovalStatus === "LL_SENT_BACK_FOR_REVISION" ? "bg-red-100 text-red-800" :
                                                                                    "bg-gray-100 text-gray-800"
                                                                            }`}>
                                                                            {lesson.lessonsLearnedApprovalStatus === "LL_APPROVED" ? "Approved" :
                                                                                lesson.lessonsLearnedApprovalStatus === "LL_SENT_FOR_APPROVAL" ? "Sent for Approval" :
                                                                                    lesson.lessonsLearnedApprovalStatus === "LL_SENT_BACK_FOR_REVISION" ? "Sent Back for Revision" :
                                                                                        "Not Sent"}
                                                                        </span>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                                                                        <div>
                                                                            <span className="text-gray-700 text-xs font-bold">Author:</span> {lesson.lessonsLearnedAuthor || 'N/A'}
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-700 text-xs font-bold">Date:</span> {lesson.uploadedAt ? new Date(lesson.uploadedAt).toLocaleDateString() : 'N/A'}
                                                                        </div>
                                                                    </div>

                                                                    {lesson.lessonDescription && (
                                                                        <div className="text-sm mt-2">
                                                                            <span className="text-gray-700 text-xs font-bold">Description:</span>
                                                                            <p className="mt-1 text-gray-600">{lesson.lessonDescription}</p>
                                                                        </div>
                                                                    )}

                                                                    {lesson.keyTakeaways && (
                                                                        <div className="text-sm mt-2">
                                                                            <span className="text-gray-700 text-xs font-bold">Key Takeaways:</span>
                                                                            <p className="mt-1 text-gray-600">{lesson.keyTakeaways}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p>No lessons learned recorded</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Documents Section */}
                                            {Array.isArray(row.original.documents) && row.original.documents.length > 0 && (
                                                <div className="bg-gray-50 rounded-md shadow-sm p-4 text-sm text-gray-700 mt-4">
                                                    <h4 className="font-medium text-gray-500 mb-2 font-mono">
                                                        Documents ({row.original.documents.filter(doc => isHRUser || !doc.s3Key.includes('/pii/')).length})
                                                        <span className="text-xs text-gray-500 ml-2">
                                                            (Total: {row.original.documents.length}, Showing: {row.original.documents.filter(doc => isHRUser || !doc.s3Key.includes('/pii/')).length})
                                                        </span>
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {row.original.documents
                                                            .filter(doc => isHRUser || !doc.s3Key.includes('/pii/'))
                                                            .map((doc, idx) => (
                                                                <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm">
                                                                    <div className="flex items-center">
                                                                        <span className="text-gray-700 font-medium">{doc.fileName}</span>
                                                                        <span className="ml-2 text-xs text-gray-500">
                                                                            {new Date(doc.uploadedAt).toLocaleDateString()} • {(doc.size / 1024).toFixed(2)} KB
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                let filePath = doc.s3Key;
                                                                                if (filePath.startsWith('public/')) {
                                                                                    filePath = filePath.substring(7);
                                                                                }

                                                                                const { url } = await getUrl({
                                                                                    key: filePath,
                                                                                    options: {
                                                                                        bucket: { bucketName: "simsstorage2.0", region: "us-east-1" },
                                                                                        validateObjectExistence: true,
                                                                                    },
                                                                                });
                                                                                window.open(url, '_blank');
                                                                            } catch (error) {
                                                                                console.error("Download failed:", error);
                                                                            }
                                                                        }}
                                                                        className="text-blue-600 hover:text-blue-800 flex items-center"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                        </svg>
                                                                        Download
                                                                    </button>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}

  
 <div className="flex justify-center mt-4">
    {(() => {
        const status = row.original.status;
        const isClosedStatus = status === 'Completed' || 
              status === 'Close' || 
              status === 'Quick Fix - Close' ||
              status === 'Resolved Immediately';
        
        // If record is closed, show "Record Closed" message
        if (isClosedStatus) {
            return (
                <span className="px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed">
                    Record Closed
                </span>
            );
        }

        // For open records, check investigation permissions
        return (
            <PermissionGate 
                record={row.original} 
                action="edit"
                checkRecordAccess={true}
                permission="canTakeIncidentRCAActions"
                fallback={null} // ✅ COMPLETELY HIDE - no button, no message, nothing
            >
                <button
                    onClick={() => handleRowClick(row.original)}
                    className="px-4 py-2 bg-[#800000] text-white rounded-md hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-[#800000]"
                    title="Investigate and manage this record"
                >
                    View Details
                </button>
            </PermissionGate>
        );
    })()}
</div>




                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-sm">
            <select
                value={table.getState().pagination.pageSize}
                onChange={e => {
                    table.setPageSize(Number(e.target.value));
                }}
                className="px-2 py-1 border rounded-md text-sm"
            >
                {[2, 10, 20, 30, 50].map(size => (
                    <option key={size} value={size}>
                        Show {size}
                    </option>
                ))}
            </select>

            <div className="flex items-center gap-2">
                <span>
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>
                <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
        </div>
    </div>
);

    



}
