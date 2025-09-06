// app/components/forms/InjuryList.tsx
'use client';

import { type Schema } from "@/amplify/data/schema";
import { generateClient } from "aws-amplify/api";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from 'next/navigation';
import React from "react";
import { getUrl } from 'aws-amplify/storage';
import { getUserInfo } from '@/lib/utils/getUserInfo';
//import { permissionService } from '@/lib/utils/PermissionService'; 

import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  getFilteredRowModel,
  SortingState,
  getSortedRowModel,
  ExpandedState,
  getExpandedRowModel,
} from "@tanstack/react-table";
import { useUserAccess } from "@/app/hooks/useUserAccess";
import { PermissionGate } from "../permission/PermissionGate";

const client = generateClient<Schema>();

interface InjuryReport {
  hierarchyString?: any;
  id: string;
  //formType?: 'US' | 'Global'; 
  submissionId: string;
  autoNumber: string | null | undefined;
  recordType: string;
  division?: string;
  platform?: string;
  createdAt: string | null;
  title: string | null;
  activityType: string | null;
  status: string;
  location: string;
  incidentType: string;
  submissionType: string;
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  documents?: Document[];
  injuryType?: string[];
  injuredBodyPart?: string[];


  // Additional fields from Submission model
  dateOfIncident?: string;
  timeOfIncident?: string;
  timeOfIncidentHour?: string;
  timeOfIncidentMinute?: string;
  timeOfInjuryAmPm?: string;
  timeEmployeeBegan?: string;
  timeEmployeeBeganAmPm?: string;

  // Employee information
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  sex?: string;
  dateHired?: string;
  priorActivity?: string;

  // Location and division
  incidentLocation?: string;

  // Employee classification
  employeeType?: string;
  ageRange?: string;
  tenure?: string;
  experience?: string;

  // Incident details
  locationOnSite?: string;
  whereDidThisOccur?: string;
  workAreaDescription?: string;
  workActivityCategory?: string;
  incidentDescription?: string;
  injuryDescription?: string;


  // Status fields
  estimatedLostWorkDays?: number;
  injuryCategory?: string;
  incidentCategory?: string;
  isCovidRelated?: string;
  isRestrictedWork?: string;
  isJobTransfer?: string;
  finalDaysAway?: number;

  // Metadata
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  owner?: string;
  investigationStatus?: string;
  OSHArecordableType?: string;
  caseClassification?: string;
  injuryIllness?: string;

  obsTypeOfConcern?: string;
  obsPriorityType?: string;
  obsCorrectiveAction?: string;

  quickFixStatus: any;


}

interface Document {
  fileName: string;
  s3Key: string;
  uploadedAt: string;
  uploadedBy: string;
  size: number;
  type: string;
}

export default function InjuryReportList() {
  const [reports, setReports] = useState<InjuryReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<InjuryReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [submissionTypeFilter, setsubmissionTypeFilter] = useState<string>('all');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const router = useRouter();
 
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const columnHelper = createColumnHelper<InjuryReport>();

  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [isHRUser, setIsHRUser] = useState<boolean>(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<InjuryReport | null>(null);
  const isUSForm = (submissionId: string) => submissionId.startsWith('US-');
  const [columnVisibility, setColumnVisibility] = useState<{
    [key: string]: boolean
  }>({
    submissionType: false,
    incidentType: false
  });



 //=======

 // ✅ Add user access hook for data-level security
 const { userAccess, isReady } = useUserAccess();

 // ✅ Data-level security filtering function
 const applyDataLevelSecurity = (reports: InjuryReport[], userAccess: any) => {
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

 // ✅ Hierarchy verification function
 const verifyHierarchyData = (reports: InjuryReport[]) => {
   console.log('🔍 [HierarchyVerification] Starting hierarchy string analysis...');
   
   // Check hierarchy string formats in existing data
   console.log('Total records in InjuryList:', reports.length);
   console.log('Sample records with hierarchy strings:', 
     reports.slice(0, 5).map(r => ({
       submissionId: r.submissionId,
       hierarchyString: r.hierarchyString,
       recordType: r.recordType,
       createdBy: r.createdBy
     }))
   );

   // Analyze hierarchy string formats
   const hierarchyAnalysis = {
     withUnderscore: reports.filter(r => r.hierarchyString?.includes('_')).length,
     withAngleBracket: reports.filter(r => r.hierarchyString?.includes('>')).length,
     withITW: reports.filter(r => r.hierarchyString?.startsWith('ITW')).length,
     empty: reports.filter(r => !r.hierarchyString).length,
     total: reports.length
   };

   console.log('Hierarchy string analysis:', hierarchyAnalysis);
   console.log('All unique hierarchy strings:', 
     [...new Set(reports.map(r => r.hierarchyString).filter(Boolean))]
   );

   // Additional analysis for debugging
   console.log('Records by hierarchy format:');
   console.log('- With underscore (_):', reports.filter(r => r.hierarchyString?.includes('_')).map(r => ({
     submissionId: r.submissionId,
     hierarchyString: r.hierarchyString
   })));
   console.log('- With angle bracket (>):', reports.filter(r => r.hierarchyString?.includes('>')).map(r => ({
     submissionId: r.submissionId,
     hierarchyString: r.hierarchyString
   })));
   console.log('- Empty hierarchy:', reports.filter(r => !r.hierarchyString).map(r => ({
     submissionId: r.submissionId,
     hierarchyString: r.hierarchyString
   })));

   return hierarchyAnalysis;
 };


 //========


  const columns = [
    columnHelper.display({
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <div className="cursor-pointer" onClick={row.getToggleExpandedHandler()}>
          {row.getIsExpanded() ? '↓' : '→'}
        </div>
      ),
      size: 30
    }),
    columnHelper.accessor('submissionId', {
      header: ({ column }) => (
        <div
          className="cursor-pointer select-none text-rose-800 font-semibold"
          onClick={() => column.toggleSorting()}
        >
          ID {column.getIsSorted() && (column.getIsSorted() === "asc" ? " ↑" : " ↓")}
        </div>
      ),
      cell: info => {
        const report = info.row.original;
        
        return (
          <PermissionGate 
            record={report} 
            action="edit"
            checkRecordAccess={true}
            permission="canTakeFirstReportActions" // ✅ Check edit permission
            fallback={
              <div className="text-gray-600 font-medium" title="View only - no edit permission">
                {info.getValue()}
              </div>
            }
          >
            <div
              onClick={() => handleIdClick(report)}
              className="text-[#cb4154] font-medium cursor-pointer hover:underline"
              title="Click to edit"
            >
              {info.getValue()}
            </div>
          </PermissionGate>
        );
      }
    }),

    columnHelper.accessor('locationOnSite', {
      header: ({ column }) => (
        <div
          className="cursor-pointer select-none text-rose-800 font-semibold"
          onClick={() => column.toggleSorting()}
        >
          Location {column.getIsSorted() && (column.getIsSorted() === "asc" ? " ↑" : " ↓")}
        </div>
      ),
      cell: info => {
        const value = info.getValue();
        return (
          <div className="break-words">
            {value || 'N/A'}
          </div>
        );
      }
    }),
    columnHelper.accessor('incidentType', {
      header: ({ column }) => (
        <div
          className="cursor-pointer select-none text-rose-800 font-semibold"
          onClick={() => column.toggleSorting()}
        >
          Incident Type {column.getIsSorted() && (column.getIsSorted() === "asc" ? " ↑" : " ↓")}
        </div>
      )
    }),
    columnHelper.accessor('submissionType', {
      header: ({ column }) => (
        <div
          className="cursor-pointer select-none text-rose-800 font-semibold"
          onClick={() => column.toggleSorting()}
        >
          Submission Type {column.getIsSorted() && (column.getIsSorted() === "asc" ? " ↑" : " ↓")}
        </div>
      )
    }),
    columnHelper.accessor('title', {
      header: ({ column }) => (
        <div
          className="cursor-pointer select-none text-rose-800 font-semibold"
          onClick={() => column.toggleSorting()}
        >
          Title {column.getIsSorted() && (column.getIsSorted() === "asc" ? " ↑" : " ↓")}
        </div>
      )
    }),
    columnHelper.accessor('createdAt', {
      header: ({ column }) => (
        <div
          className="cursor-pointer select-none text-rose-800 font-semibold"
          onClick={() => column.toggleSorting()}
        >
          Date/Time {column.getIsSorted() && (column.getIsSorted() === "asc" ? " ↑" : " ↓")}
        </div>
      ),
      cell: info => {
        const value = info.getValue();
        if (!value) return '-';
        try {
          return new Date(value).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
        } catch (error) {
          return '-';
        }
      },
      sortingFn: 'datetime',
      sortDescFirst: true
    }),
    columnHelper.accessor('status', {
      header: ({ column }) => (
        <div
          className="cursor-pointer select-none text-[#800000] font-semibold"
          onClick={() => column.toggleSorting()}
        >
          Status {column.getIsSorted() && (column.getIsSorted() === "asc" ? " ↑" : " ↓")}
        </div>
      ),
      cell: info => {
        const status = info.getValue();
        let colorClass = '';

        switch (status) {
          case 'Not Viewed':
            colorClass = 'bg-gray-100 text-gray-800';
            break;
          case 'Open Investigation':
            colorClass = 'bg-blue-100 text-blue-800';
            break;
          case 'Quick Fix Action - Open':
            colorClass = 'bg-orange-100 text-orange-800';
            break;
          case 'Incident with RCA - Open':
            colorClass = 'bg-yellow-100 text-yellow-800';
            break;
          case 'Pending Review':
            colorClass = 'bg-purple-100 text-purple-800';
            break;
          case 'Rejected':
            colorClass = 'bg-red-100 text-red-800';
            break;
          case 'Quick Fix - Open':
            colorClass = 'bg-teal-100 text-teal-800';
            break;
          case 'Quick Fix - Close':
            colorClass = 'bg-green-100 text-green-800';
            break;
          case 'Open':
            colorClass = 'bg-amber-100 text-amber-800';
            break;
          case 'Close':
            colorClass = 'bg-emerald-100 text-emerald-800';
            break;
          default:
            colorClass = 'bg-gray-100 text-gray-800';
        }

        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
            {status}
          </span>
        );
      }
    }),

  ];

  //useEffect to check user permissions
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

 


  const handleIdClick = (report: InjuryReport) => {
    let formType: 'US' | 'Global';
    if (report.submissionId.startsWith('US-')) {
      formType = 'US';
    } else {
      formType = 'Global';
    }

    // Check the record type and route to the appropriate form
    if (report.recordType === 'OBSERVATION_REPORT') {
      console.log('Routing to Observation Report:', `/reports/new-observation?mode=edit&id=${report.submissionId}`);
      router.push(`/reports/new-observation?mode=edit&id=${report.submissionId}`);
    } else {
      // Default to injury report
      console.log('Routing to Injury Report:', `/reports/new-injury?mode=edit&id=${report.submissionId}&formType=${formType}`);
      router.push(`/reports/new-injury?mode=edit&id=${report.submissionId}&formType=${formType}`);
    }
  };



  const getUniqueValues = (data: InjuryReport[], key: keyof InjuryReport) => {
    return ['all', ...new Set(data.map(item => item[key] as string))];
  };

  const finalFilteredReports = useMemo(() => {
    return filteredReports // ✅ Use filteredReports as the base
      .filter(report => statusFilter === 'all' || report.status === statusFilter)
      .filter(report => incidentTypeFilter === 'all' || report.recordType === incidentTypeFilter)
      .filter(report => locationFilter === 'all' || report.locationOnSite === locationFilter)
      .filter(report => submissionTypeFilter === 'all' || report.submissionType === submissionTypeFilter)
      .filter(report => {
        // Global text search filter
        if (!globalFilter) return true;
        const search = globalFilter.toLowerCase();
        return (
          (report.submissionId || '').toLowerCase().includes(search) ||
          (report.title || '').toLowerCase().includes(search) ||
          (report.locationOnSite || '').toLowerCase().includes(search) ||
          (report.status || '').toLowerCase().includes(search)
        );
      });
  }, [filteredReports, statusFilter, incidentTypeFilter, locationFilter, submissionTypeFilter, globalFilter]);
  


  const table = useReactTable({
    data: filteredReports, // ✅ Use filteredReports instead 
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    initialState: {
      sorting: [{ id: 'createdAt', desc: true }],
      columnVisibility: {
        submissionType: false,
        incidentType: false
      },
      pagination: {
        pageSize: 10,
        pageIndex: 0,
      }
    },
    state: {
      globalFilter,
      sorting,
      expanded,
      columnVisibility
    },
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
  });


  useEffect(() => {
    table.setPageIndex(0);
  }, [filteredReports]);

  useEffect(() => {
    fetchReports();
  }, []);




  async function fetchReports() {
    try {
      // Store Smartsheet data first
      //const smartsheetResponse = await fetch('/api/smartsheet');
      //const smartsheetData = await smartsheetResponse.json(); 

      /*** Step 2: Fetch Data from Submission Table ***/
      console.log("Fetching data from Submission table...");


      const response = await client.models.Submission.list({
        selectionSet: [
          'id', 'submissionId', 'autoNumber', 'recordType', 'division', 'platform',
          'location', 'incidentType', 'submissionType', 'title', 'createdAt',
          'status', 'activityType', 'documents.*',
          'rejectionReason', 'rejectedAt', 'rejectedBy',
          // Time and date fields
          'dateOfIncident', 'timeOfIncident', 'timeOfIncidentHour', 'timeOfIncidentMinute',
          'timeOfInjuryAmPm', 'timeEmployeeBegan', 'timeEmployeeBeganAmPm',
          // Employee information
          'employeeId', 'firstName', 'lastName', 'streetAddress', 'city', 'state',
          'zipCode', 'phoneNumber', 'dateOfBirth', 'sex', 'dateHired', 'priorActivity',
          // Location and division
          'incidentLocation',
          // Employee classification
          'employeeType', 'ageRange', 'tenure', 'experience',
          // Incident details
          'locationOnSite', 'whereDidThisOccur', 'workAreaDescription', 'workActivityCategory',
          'incidentDescription', 'injuryDescription', 'injuryType', 'injuredBodyPart',
          // Status fields
          'estimatedLostWorkDays', 'injuryCategory', 'incidentCategory',
          'isCovidRelated', 'isRestrictedWork', 'isJobTransfer', 'finalDaysAway',
          // Metadata
          'updatedAt', 'createdBy', 'updatedBy', 'owner', 'investigationStatus',
          'OSHArecordableType', 'caseClassification', 'injuryIllness',
          //Observation
          'obsCorrectiveAction', 'obsPriorityType', 'obsTypeOfConcern',
          //Quick Fix
          'quickFixStatus',
          'hierarchyString'
        ]
      })


      console.log("Submission Table Response:", response);


      if (!response || !response.data) {
        console.error("Error Fetching Submission Data: No data returned.");
        return;
      }


      const data = response.data;
      console.log('Data from Submission for List', data);

      if (data && data.length > 0) {
        const mappedData: InjuryReport[] = data.map((item: any) => ({
          id: item.id || '',
          submissionId: item.submissionId,
          autoNumber: item.autoNumber ?? undefined,
          recordType: item.recordType || "Injury",
          division: item.division || '',
          platform: item.platform || '',
          location: item.location || '',
          incidentType: item.incidentType || 'Injury',
          submissionType: item.submissionType || 'Direct',
          title: item.title || '',
          createdAt: item.createdAt || null,
          status: item.status || 'Not Viewed',
          activityType: item.activityType || '',
          documents: item.documents?.filter((doc: any): doc is any => doc !== null) || [],
          rejectionReason: item.rejectionReason || null,
          rejectedAt: item.rejectedAt || null,
          rejectedBy: item.rejectedBy || null,

          // Additional fields ✅
          dateOfIncident: item.dateOfIncident || '',
          timeOfIncident: item.timeOfIncident || '',
          timeOfIncidentHour: item.timeOfIncidentHour || '',
          timeOfIncidentMinute: item.timeOfIncidentMinute || '',
          timeOfInjuryAmPm: item.timeOfInjuryAmPm || '',
          timeEmployeeBegan: item.timeEmployeeBegan || '',
          timeEmployeeBeganAmPm: item.timeEmployeeBeganAmPm || '',
          employeeId: item.employeeId || '',
          firstName: item.firstName || '',
          lastName: item.lastName || '',
          streetAddress: item.streetAddress || '',
          city: item.city || '',
          state: item.state || '',
          zipCode: item.zipCode || '',
          phoneNumber: item.phoneNumber || '',
          dateOfBirth: item.dateOfBirth || '',
          sex: item.sex || '',
          dateHired: item.dateHired || '',
          priorActivity: item.priorActivity || '',
          incidentLocation: item.incidentLocation || '',
          employeeType: item.employeeType || '',
          ageRange: item.ageRange || '',
          tenure: item.tenure || '',
          experience: item.experience || '',
          locationOnSite: item.locationOnSite || '',
          whereDidThisOccur: item.whereDidThisOccur || '',
          workAreaDescription: item.workAreaDescription || '',
          workActivityCategory: item.workActivityCategory || '',
          incidentDescription: item.incidentDescription || '',
          injuryDescription: item.injuryDescription || '',
          injuryType: item.injuryType || [],
          injuredBodyPart: item.injuredBodyPart || [],
          estimatedLostWorkDays: item.estimatedLostWorkDays || 0,
          injuryCategory: item.injuryCategory || '',
          incidentCategory: item.incidentCategory || '',
          isCovidRelated: item.isCovidRelated || '',
          isRestrictedWork: item.isRestrictedWork || '',
          isJobTransfer: item.isJobTransfer || '',
          finalDaysAway: item.finalDaysAway || 0,
          updatedAt: item.updatedAt || '',
          createdBy: item.createdBy || '',
          updatedBy: item.updatedBy || '',
          owner: item.owner || '',
          investigationStatus: item.investigationStatus || '',
          OSHArecordableType: item.OSHArecordableType || '',
          caseClassification: item.caseClassification || '',
          injuryIllness: item.injuryIllness || '',

          obsTypeOfConcern: item.obsTypeOfConcern || '',
          obsPriorityType: item.obsPriorityType || '',
          obsCorrectiveAction: item.obsCorrectiveAction || '',

          quickFixStatus: item.quickFixStatus || '',
          hierarchyString: item.hierarchyString || '', 

        })) as InjuryReport[];

        // **Filter out "Incident with RCA - Open" reports AND any records with quickFixStatus**
        /* const filteredReports = mappedData.filter(report =>
           report.status !== "Incident with RCA - Open" &&
           report.status !== "Completed" &&
           !report.quickFixStatus // Filter out any records with a non-null quickFixStatus
         );*/


        const filteredReports = mappedData.filter(report => {
          // Filter out "Incident with RCA - Open" reports and "Completed" reports
          if (report.status === "Incident with RCA - Open" || report.status === "Completed") {
            return false;
          }

          // Filter out any records with a non-null quickFixStatus
          if (report.quickFixStatus) {
            return false;
          }

          // For OBSERVATION_REPORT records, filter out those that have been processed
          if (report.recordType === "OBSERVATION_REPORT") {
            // Filter out observations that have been resolved immediately (status = "Completed")
            if (report.status === "Completed") {
              return false;
            }

            // Filter out observations that have specific investigation statuses indicating they've been processed
            if (report.investigationStatus === "Resolved Immediately" ||
              report.investigationStatus === "Quick Fix Completed" ||
              report.investigationStatus?.startsWith("RCA")) {
              return false;
            }

            // Filter out observations with specific statuses that indicate they've moved to other workflows
            if (report.status === "Quick Fix - Open" ||
              report.status === "Quick Fix - Close" ||
              report.status === "Open Investigation") {
              return false;
            }
          }

          return true;
        });


        console.log("Filtered Reports (Excluding RCA-Open):", filteredReports);

        console.log("Mapped Data for UI:", mappedData);

        setReports(filteredReports);

      }
      else {
        console.warn("No reports found in Submission table!");
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoading(false);
    }
  }



  if (isLoading) {
    return <div className="ml-2 p-4">Loading reports...</div>;
  }





  return (
    <div className="ml-2 px-4 py-2">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-[#cb4154]">First Report Actions</h2>

        <div className="bg-slate-50 p-4 rounded-lg shadow-md">
          <div className="flex flex-wrap gap-4 mb-4">
            <input
              type="text"
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search reports..."
              className="px-4 py-2 border rounded-md bg-white w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
            />

            <select
              value={statusFilter ?? ""}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 border rounded-md text-sm bg-white w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
            >
              {getUniqueValues(reports, 'status').map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Status' : status}
                </option>
              ))}
            </select>

            <select
              value={submissionTypeFilter ?? ""}
              onChange={(e) => setsubmissionTypeFilter(e.target.value)}
              className="px-2 py-1 border rounded-md text-sm bg-white w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
            >
              {getUniqueValues(reports, 'submissionType').map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Submission Types' : type}
                </option>
              ))}
            </select>

            <select
              value={incidentTypeFilter}
              onChange={(e) => setIncidentTypeFilter(e.target.value)}
              className="px-2 py-1 border rounded-md text-sm bg-white w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
            >
              <option value="all">All Types</option>
              <option value="INJURY_REPORT">Injury</option>
              <option value="OBSERVATION_REPORT">Observation</option>
              <option value="RECOGNITION">Recognition</option>
            </select>


            <select
              value={locationFilter ?? ""}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-2 py-1 border rounded-md text-sm bg-white w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
            >
              {getUniqueValues(reports, 'locationOnSite').map(location => (
                <option key={location} value={location}>
                  {location === 'all' ? 'All Locations' : location}
                </option>
              ))}
            </select>


          </div>
        </div>
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          {/*   filter controls */}
        </div>

        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full border-collapse table-fixed text-sm">
              <thead className="bg-[#f8f0f0] text-[#800000]">
                {/* Table header */}

                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}


              </thead>
              {/* Table body */}

              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {table.getRowModel().rows.map((row, i) => (
                  <React.Fragment key={row.id}>
                    {/* Main Row */}
                    <tr className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-2 whitespace-nowrap text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>

                    {/* Expanded Row */}
                    {row.getIsExpanded() && (
                      <tr className="bg-red-50">
                        <td colSpan={row.getVisibleCells().length} className="p-4">

                          {row.original.recordType === "INJURY_REPORT" ? (
                            /* Main Card - Injury */
                            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
                              {/* Row 1: 3 Columns */}
                              <div className="grid grid-cols-3 gap-6 text-sm text-gray-700">
                                {/* Incident Information */}
                                <div className="bg-gray-50 rounded-md shadow-sm p-4">
                                  <h4 className="font-medium text-gray-500 mb-2 font-mono">Incident Information</h4>
                                  <p className="break-words"><strong>Date:</strong> {row.original.dateOfIncident || 'N/A'}</p>
                                  <p className="break-words"><strong>Time:</strong> {row.original.timeOfIncidentHour}:{row.original.timeOfIncidentMinute} {row.original.timeOfInjuryAmPm}</p>
                                  <p className="break-words"><strong>Location On Site:</strong> {row.original.locationOnSite || 'N/A'}</p>
                                  <p className="break-words"><strong>Division:</strong> {row.original.division || 'N/A'}</p>
                                  <p className="break-words"><strong>Platform:</strong> {row.original.platform || 'N/A'}</p>
                                  <p className="break-words"><strong>Reported By:</strong> {row.original.createdBy || 'N/A'}</p>
                                  <p className="break-words"><strong>Where did this Occur?:</strong> {row.original.whereDidThisOccur || 'N/A'}</p>
                                  <p className="break-words"><strong>Additional Location Detail:</strong> {row.original.workAreaDescription || 'N/A'}</p>
                                  <p className="break-words"><strong>Is COVID Related?:</strong> {row.original.isCovidRelated || 'N/A'}</p>
                                </div>

                                {/* Details & Classifications */}
                                <div className="bg-gray-50 rounded-md shadow-sm p-4">
                                  <h4 className="font-medium text-gray-500 mb-2 font-mono">Details & Classifications</h4>
                                  <p><strong>Status:</strong> {row.original.status || 'N/A'}</p>
                                  <p><strong>Investigation Status:</strong> {row.original.investigationStatus || 'N/A'}</p>
                                  <p><strong>OSHA Recordable Type:</strong> {row.original.OSHArecordableType || 'N/A'}</p>
                                  <p><strong>Case Classification:</strong> {row.original.caseClassification || 'N/A'}</p>
                                  <p><strong>Injury/Illness:</strong> {row.original.injuryIllness || 'N/A'}</p>
                                  <p><strong>Estimated Lost Workdays:</strong> {row.original.estimatedLostWorkDays || 'N/A'}</p>

                                  {/* Injury Types */}
                                  {Array.isArray(row.original.injuryType) && row.original.injuryType.length > 0 && (
                                    <div className="mt-3">
                                      <h4 className="font-semibold text-gray-600 mb-1">Injury Types</h4>
                                      <ul className="list-disc list-inside text-gray-700">
                                        {row.original.injuryType.map((type, idx) => (
                                          <li key={idx}>{type}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Injured Body Parts */}
                                  {Array.isArray(row.original.injuredBodyPart) && row.original.injuredBodyPart.length > 0 && (
                                    <div className="mt-3">
                                      <h4 className="font-semibold text-gray-600 mb-1">Injured Body Parts</h4>
                                      <ul className="list-disc list-inside text-gray-700">
                                        {row.original.injuredBodyPart.map((part, idx) => (
                                          <li key={idx}>{part}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                {/* Descriptions */}
                                <div className="bg-gray-50 rounded-md shadow-sm p-4 space-y-3">
                                  <h4 className="font-medium text-gray-500 mb-2 font-mono">Descriptions</h4>

                                  {/* Incident Description */}
                                  <div className="p-3 bg-white rounded-md shadow-sm">
                                    <h5 className="text-sm font-medium text-gray-500 mb-1 font-mono">Incident</h5>
                                    <p className="text-sm text-gray-700 break-words">{row.original.incidentDescription || 'No description available.'}</p>
                                  </div>

                                  {/* Injury Description */}
                                  <div className="p-3 bg-white rounded-md shadow-sm">
                                    <h5 className="text-sm font-medium text-gray-500 mb-1 font-mono">Injury</h5>
                                    <p className="text-sm text-gray-700 break-words">{row.original.injuryDescription || 'No description available.'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Row 2: Employee Information (Full width) */}
                              {isUSForm(row.original.submissionId) && (
                                <div className="bg-gray-50 rounded-md shadow-sm p-4 text-sm text-gray-700">
                                  <h4 className="font-medium text-gray-500 mb-2 font-mono">Employee Information</h4>
                                  <p><strong>ID:</strong> {row.original.employeeId || 'N/A'}</p>
                                  <p><strong>Name:</strong> {row.original.firstName} {row.original.lastName}</p>
                                  <p><strong>Phone:</strong> {row.original.phoneNumber || 'N/A'}</p>
                                  <p><strong>Address:</strong> {row.original.streetAddress}, {row.original.city}, {row.original.state} {row.original.zipCode}</p>
                                </div>
                              )}

                              {/* Documents Section */}
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


                              {/* Row 3: Rejection Details (Full width) */}
                              {row.original.status === 'Rejected' && (
                                <div className="border-t border-red-200 pt-4 mt-4 text-sm text-gray-700">
                                  <p className="text-red-600 font-mono">Reject Reason: {row.original.rejectionReason || 'N/A'}</p>
                                  <p className="text-gray-500 text-sm font-mono">
                                    Rejected by: {row.original.rejectedBy || 'Unknown'} on: {row.original.rejectedAt ? new Date(row.original.rejectedAt).toLocaleString() : 'Unknown date'}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : row.original.recordType === "OBSERVATION_REPORT" ? (
                            /* Main Card - Observation */
                            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
                              {/* Row 1: 3 Columns */}
                              <div className="grid grid-cols-3 gap-6 text-sm text-gray-700">
                                {/* Observation Information */}
                                <div className="bg-gray-50 rounded-md shadow-sm p-4">
                                  <h4 className="font-medium text-gray-500 mb-2 font-mono">Observation Information</h4>
                                  <div className="p-3 bg-white rounded-md shadow-sm">

                                    <p className="break-words"><strong>Date:</strong> {row.original.dateOfIncident || 'N/A'}</p>
                                    <p className="break-words"><strong>Time:</strong> {row.original.timeOfIncidentHour}:{row.original.timeOfIncidentMinute} {row.original.timeOfInjuryAmPm}</p>
                                    <p className="break-words"><strong>Location On Site:</strong> {row.original.locationOnSite || 'N/A'}</p>
                                    <p className="break-words"><strong>Reported By:</strong> {row.original.createdBy || 'N/A'}</p>
                                    <p className="break-words"><strong>Where did this Occur?:</strong> {row.original.whereDidThisOccur || 'N/A'}</p>
                                    <p className="break-words"><strong>Additional Work Area Details:</strong> {row.original.workAreaDescription || 'N/A'}</p>
                                    <p className="break-words"><strong>Employee ID:</strong> {row.original.employeeId || 'N/A'}</p>
                                    <p className="break-words"><strong>Employee Name:</strong> {row.original.firstName} {row.original.lastName}</p>
                                  </div>


                                </div>

                                {/* Observation Details */}
                                <div className="bg-gray-50 rounded-md shadow-sm p-4">
                                  <h4 className="font-medium text-gray-500 mb-2 font-mono">Observation Details</h4>
                                  <div className="p-3 bg-white rounded-md shadow-sm">
                                    <p><strong>Status:</strong> {row.original.status || 'N/A'}</p>
                                    <p><strong>Type of Concern:</strong> {row.original.obsTypeOfConcern || 'N/A'}</p>
                                    <p><strong>Priority Type:</strong> {row.original.obsPriorityType || 'N/A'}</p>
                                    <p><strong>Work Activity Type:</strong> {row.original.activityType || 'N/A'}</p>
                                    <p><strong>Created At:</strong> {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : 'N/A'}</p>
                                    <p><strong>Updated At:</strong> {row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleDateString() : 'N/A'}</p>
                                  </div>
                                </div>

                                {/* Descriptions */}
                                <div className="bg-gray-50 rounded-md shadow-sm p-4 space-y-3">
                                  <h4 className="font-medium text-gray-500 mb-2 font-mono">Descriptions</h4>

                                  {/* Problem Description */}
                                  <div className="p-3 bg-white rounded-md shadow-sm">
                                    <h5 className="text-sm font-medium text-gray-500 mb-1 font-mono">Problem or Issue</h5>
                                    <p className="text-sm text-gray-700 break-words">{row.original.incidentDescription || 'No description available.'}</p>
                                  </div>

                                  {/* Corrective Action */}
                                  <div className="p-3 bg-white rounded-md shadow-sm">
                                    <h5 className="text-sm font-medium text-gray-500 mb-1 font-mono">Corrective Action</h5>
                                    <p className="text-sm text-gray-700 break-words">{row.original.obsCorrectiveAction || 'No corrective action specified.'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Documents Section */}
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




                              {/* Row 2: Rejection Details (Full width) */}
                              {row.original.status === 'Rejected' && (
                                <div className="border-t border-red-200 pt-4 mt-4 text-sm text-gray-700">
                                  <p className="text-red-600 font-medium">Reject Reason: {row.original.rejectionReason || 'N/A'}</p>
                                  <p className="text-gray-500 text-sm">
                                    Rejected by: {row.original.rejectedBy || 'Unknown'} on: {row.original.rejectedAt ? new Date(row.original.rejectedAt).toLocaleString() : 'Unknown date'}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Default Card for other record types */
                            <div className="bg-white rounded-lg shadow-md p-6">
                              <p className="text-center text-gray-500">Details not available for this record type.</p>
                            </div>
                          )}



                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>


            </table>
          </div>


        )}
        <div className="flex items-center justify-between mt-4">
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="px-2 py-1 border rounded-md text-sm"
          >
            {[2, 10, 20, 30, 50].map(size => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );











}