// app/components/forms/QuickFix.tsx

'use client';

import { useEffect, useState, useMemo } from 'react';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '@/amplify/data/schema';
import React from 'react';
import { useUserAccess } from "@/app/hooks/useUserAccess"; // ✅ Added for data-level security
import { PermissionGate } from "../permission/PermissionGate"; // ✅ Added for permissions
import QuickFixActionCompleteModal from '../modals/QuickFixActionCompleteModal';
import {
  flexRender,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
  SortingState,
  getFilteredRowModel,
} from "@tanstack/react-table";

const client = generateClient<Schema>();

interface QuickFixRecord {
  quickFixUpdatedAt: any;
  employeeId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  dateOfBirth: string;
  dateHired: string;
  sex: string;
  quickFixUpdatedBy: string;
  quickFixWasthisIncidentIventigated: boolean;
  id: string | null;
  submissionId: string;
  recordType: string;
  locationOnSite: string;
  submissionType: string;
  title?: string | null;
  investigationStatus?: string | null;
  dateOfIncident?: string | null;
  createdAt: string | null;
  quickFixRootCause?: string;
  quickFixDirectCauseGroup?: string;
  quickFixSubGroup?: string;
  quickFixDescribeCorrectiveActions?: string;
  quickFixStatus?: string;
  quickFixDueDate?: string;
  quickFixAssignTo?: string;
  quickFixNotes?: string;
  incidentDescription?: string;
  obsCorrectiveAction?: string;
  hierarchyString?: string; // ✅ ONLY addition for security
}

export default function QuickFix() {
  const [records, setRecords] = useState<QuickFixRecord[]>([]);
  const [filteredData, setFilteredData] = useState<QuickFixRecord[]>([]); // ✅ Added for data-level security
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<QuickFixRecord | null>(null);
  const [filters, setFilters] = useState({
    location: 'all',
    submissionType: 'all',
    recordType: 'all',
    status: 'all',
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const columnHelper = createColumnHelper<QuickFixRecord>();

  // ✅ Add user access hook for data-level security
  const { userAccess, isReady } = useUserAccess();

  // ✅ Data-level security filtering function (borrowed from LessonsLearnedList)
  const applyDataLevelSecurity = (quickFixes: QuickFixRecord[], userAccess: any) => {
    if (!userAccess) {
      console.log('⚠️ [DataSecurity] No user access data - showing all records');
      return quickFixes;
    }

    console.log(`🔍 [DataSecurity] Applying ${userAccess.accessScope} level filtering for user: ${userAccess.email}`);
    console.log(`🔍 [DataSecurity] User hierarchy: ${userAccess.hierarchyString}`);

    switch (userAccess.accessScope) {
      case 'ENTERPRISE':
        console.log(`✅ [DataSecurity] Enterprise access - returning all ${quickFixes.length} records`);
        return quickFixes; // Enterprise users see all data
        
      case 'SEGMENT':
      case 'PLATFORM':
      case 'DIVISION':
        const beginsWith = quickFixes.filter(quickFix => 
          quickFix.hierarchyString?.startsWith(userAccess.hierarchyString)
        );
        console.log(`✅ [DataSecurity] ${userAccess.accessScope} access - filtered to ${beginsWith.length} records`);
        return beginsWith;
        
      case 'PLANT':
        const exactMatch = quickFixes.filter(quickFix => 
          quickFix.hierarchyString === userAccess.hierarchyString
        );
        console.log(`✅ [DataSecurity] Plant access - filtered to ${exactMatch.length} records`);
        return exactMatch;
        
      default:
        console.log(`⚠️ [DataSecurity] Unknown access scope - applying restrictive filtering`);
        return quickFixes.filter(quickFix => 
          quickFix.hierarchyString === userAccess.hierarchyString
        );
    }
  };

  // ✅ Apply data-level security when data or userAccess changes (borrowed from LessonsLearnedList)
  useEffect(() => {
    if (isReady && records.length > 0) {
      console.log('🔍 [DataSecurity] Applying data-level security filtering...');
      const securityFilteredData = applyDataLevelSecurity(records, userAccess);
      setFilteredData(securityFilteredData);
      
      console.log(`📊 [DataSecurity] Security filtering complete:`);
      console.log(`   - Original records: ${records.length}`);
      console.log(`   - After security filtering: ${securityFilteredData.length}`);
      console.log(`   - User access scope: ${userAccess?.accessScope || 'Unknown'}`);
    } else if (records.length > 0) {
      // If user access not ready, show all records temporarily
      setFilteredData(records);
    }
  }, [records, userAccess, isReady]);

  useEffect(() => {
    fetchQuickFixRecords();
  }, []);

  const columns = [
    columnHelper.display({
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <button 
          onClick={() => setExpandedRow(prev => prev === row.original.id ? null : row.original.id)}
          className="cursor-pointer"
        >
          {expandedRow === row.original.id ? '↓' : '→'}
        </button>
      ),
      size: 40,
    }),
    columnHelper.accessor('submissionId', {
      header: 'Submission ID',
      cell: info => {
        const record = info.row.original;
        
        return (
          <PermissionGate
            record={record}
            action="edit"
            checkRecordAccess={true}
            permission="canTakeQuickFixActions"
            fallback={
              <span className="text-gray-500 font-thin" title="No quick fix access">
                {info.getValue()}
              </span>
            }
          >
            {isObservationRecord(record) && record.quickFixStatus !== 'Completed' ? (
              <span 
                className="font-medium text-red-600 hover:text-red-800 cursor-pointer hover:underline"
                onClick={() => handleObservationClick(record)}
              >
                {info.getValue()}
              </span>
            ) : (
              <span className="text-[#2c2c2c] font-medium">{info.getValue()}</span>
            )}
          </PermissionGate>
        );
      },
      size: 150,
    }),
    columnHelper.accessor('locationOnSite', {
      header: 'Location',
      size: 120,
    }),
    columnHelper.accessor('quickFixUpdatedBy', {
      header: 'Quick Fix Completed By',
      cell: info => info.getValue() || '-',
      size: 150,
    }),
    columnHelper.accessor('incidentDescription', {
      header: 'Problem Description',
      cell: info => (
        <div className="whitespace-normal line-clamp-2 text-sm">
          {info.getValue() || 'N/A'}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'correctiveAction',
      header: 'Corrective Action',
      cell: ({ row }) => (
        <div className="whitespace-normal line-clamp-2 text-sm">
          {row.original.recordType === 'OBSERVATION_REPORT' 
            ? row.original.obsCorrectiveAction 
            : row.original.quickFixDescribeCorrectiveActions || 'N/A'}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(row.original.quickFixStatus || row.original.investigationStatus)}`}>
          {row.original.quickFixStatus || row.original.investigationStatus || 'N/A'}
        </span>
      ),
      size: 100,
    }),
  ];

  const filteredRecords = useMemo(() => {
    return filteredData.filter(r => // ✅ Use filteredData instead of records
      (filters.location === 'all' || r.locationOnSite === filters.location) &&
      (filters.submissionType === 'all' || r.submissionType === filters.submissionType) &&
      (filters.recordType === 'all' || r.recordType === filters.recordType) &&
      (filters.status === 'all' || 
       (filters.status === 'Completed' && 
        (r.quickFixStatus === 'Completed' || r.investigationStatus === 'Quick Fix Action Needed')) ||
       (filters.status === 'Assigned' && r.quickFixStatus === 'Assigned'))
    );
  }, [filteredData, filters]); // ✅ Use filteredData instead of records

  const table = useReactTable({
    data: filteredRecords,
    columns,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 10,
        pageIndex: 0,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  
  useEffect(() => {
    if (table) {
      table.setPageIndex(0);
    }
  }, [filters]);

  const fetchQuickFixRecords = async () => {
    try {
      const response = await client.models.Submission.list({
        selectionSet: [
          // All your original fields
          'id', 'submissionId', 'recordType', 'locationOnSite', 'submissionType',
          'title', 'investigationStatus', 'dateOfIncident', 'createdAt',
          'quickFixRootCause', 'quickFixDirectCauseGroup', 'quickFixSubGroup',
          'quickFixDescribeCorrectiveActions', 'quickFixWasthisIncidentIventigated',
          'quickFixUpdatedBy', 'quickFixUpdatedAt', 'quickFixStatus',
          'quickFixDueDate', 'quickFixAssignTo', 'quickFixNotes',
          'incidentDescription', 'obsCorrectiveAction',
          'employeeId', 'firstName', 'lastName', 'phoneNumber',
          'streetAddress', 'city', 'state', 'zipCode', 'dateOfBirth', 'sex', 'dateHired',
          'hierarchyString', // ✅ ONLY addition for security
        ],
        filter: {
          or: [
            { quickFixStatus: { eq: 'Assigned' } },
            { quickFixStatus: { eq: 'Completed' } },
            { quickFixStatus: { eq: 'Open' } },
            { investigationStatus: { eq: 'Quick Fix Action Needed' } }
          ]
        }
      });

      if (response.data) {
        const mapped: QuickFixRecord[] = response.data.map(item => ({
          id: item.id ?? null,
          submissionId: item.submissionId ?? '',
          recordType: item.recordType ?? '',
          locationOnSite: item.locationOnSite ?? '',
          submissionType: item.submissionType ?? '',
          title: item.title ?? '',
          investigationStatus: item.investigationStatus ?? '',
          dateOfIncident: item.dateOfIncident ?? '',
          createdAt: item.createdAt ?? '',
        
          // Quick Fix fields
          quickFixRootCause: item.quickFixRootCause ?? '',
          quickFixDirectCauseGroup: item.quickFixDirectCauseGroup ?? '',
          quickFixSubGroup: item.quickFixSubGroup ?? '',
          quickFixDescribeCorrectiveActions: item.quickFixDescribeCorrectiveActions ?? '',
          quickFixWasthisIncidentIventigated: item.quickFixWasthisIncidentIventigated ?? false,
          quickFixUpdatedBy: item.quickFixUpdatedBy ?? '',
          quickFixUpdatedAt: item.quickFixUpdatedAt ?? '',
          quickFixStatus: item.quickFixStatus ?? '',
          quickFixDueDate: item.quickFixDueDate ?? '',
          quickFixAssignTo: item.quickFixAssignTo ?? '',
          quickFixNotes: item.quickFixNotes ?? '',
          incidentDescription: item.incidentDescription ?? '',
          obsCorrectiveAction: item.obsCorrectiveAction ?? '',
        
          // Employee fields
          employeeId: item.employeeId ?? '',
          firstName: item.firstName ?? '',
          lastName: item.lastName ?? '',
          phoneNumber: item.phoneNumber ?? '',
          streetAddress: item.streetAddress ?? '',
          city: item.city ?? '',
          state: item.state ?? '',
          zipCode: item.zipCode ?? '',
          dateOfBirth: item.dateOfBirth ?? '',
          sex: item.sex ?? '',
          dateHired: item.dateHired ?? '',
          
          hierarchyString: item.hierarchyString ?? '', // ✅ ONLY addition for security
        }));
        
        setRecords(mapped);
      }
    } catch (error) {
      console.error("Error fetching Quick Fix records:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get status badge color
  const getStatusBadgeClass = (status: string | null | undefined) => {
    if (!status) return "bg-gray-100 text-gray-800";
    
    if (status === "Completed" || status === "Quick Fix Action Needed") 
      return "bg-green-100 text-green-800";
    else if (status === "Assigned") 
      return "bg-blue-100 text-blue-800";
    else 
      return "bg-yellow-100 text-yellow-800";
  };

  // Function to handle clicking on an Observation submission ID
  const handleObservationClick = (record: QuickFixRecord) => {
    setSelectedRecord(record);
    setShowCompleteModal(true);
  };

  // Check if a record is an Observation record
  const isObservationRecord = (record: QuickFixRecord) => {
    return record.recordType === 'OBSERVATION_REPORT' && record.submissionId.startsWith('O-');
  };

  return (
    <div className="ml-2 px-4 py-2">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-[#cb4154]">Quick Fix Records</h2>

        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          {/* Your original filters */}
          <div>
            <label className="block text-gray-600 mb-1">Location</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="px-2 py-1 border rounded bg-white"
            >
              <option value="all">All</option>
              {Array.from(new Set(filteredData.map(r => r.locationOnSite).filter(Boolean))).map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Submission Type</label>
            <select
              value={filters.submissionType}
              onChange={(e) => setFilters(prev => ({ ...prev, submissionType: e.target.value }))}
              className="px-2 py-1 border rounded bg-white"
            >
              <option value="all">All</option>
              {Array.from(new Set(filteredData.map(r => r.submissionType).filter(Boolean))).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Record Type</label>
            <select
              value={filters.recordType}
              onChange={(e) => setFilters(prev => ({ ...prev, recordType: e.target.value }))}
              className="px-2 py-1 border rounded bg-white"
            >
              <option value="all">All</option>
              <option value="OBSERVATION_REPORT">Observation</option>
              <option value="INJURY_REPORT">Injury</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-2 py-1 border rounded bg-white"
            >
              <option value="all">All</option>
              <option value="Assigned">Assigned</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow">
              <table className="min-w-full border-collapse table-fixed text-sm">
                <thead className="bg-[#80000010] text-rose-700">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th 
                          key={header.id}
                          className="px-4 py-2 text-left cursor-pointer select-none"
                          onClick={header.column.getToggleSortingHandler()}
                          style={{ width: header.getSize() }}
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
                      <tr className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-4 py-2">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                      {expandedRow === row.original.id && (
                        <tr>
                          <td colSpan={columns.length} className="p-4 bg-red-50">
                            {/* Your existing expanded row content */}
                            <div className="bg-white rounded-lg shadow-md p-6 space-y-6 text-sm text-gray-700">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                                  <h4 className="text-gray-500 font-semibold mb-2">Quick Fix Info</h4>
                                  <p><strong>Submission ID:</strong> {row.original.submissionId}</p>
                                  <p><strong>Title:</strong> {row.original.title || 'N/A'}</p>
                                  <p><strong>Location On Site:</strong> {row.original.locationOnSite || 'N/A'}</p>
                                  <p><strong>Due Date:</strong> {row.original.quickFixDueDate ? new Date(row.original.quickFixDueDate).toLocaleDateString() : 'N/A'}</p>
                                  <p><strong>Quick Fix Completed By:</strong> {row.original.quickFixUpdatedBy || 'N/A'}</p>
                                  <p><strong>Status:</strong> {row.original.quickFixStatus || row.original.investigationStatus || 'N/A'}</p>
                                  <p><strong>Record Type:</strong> {row.original.recordType === 'OBSERVATION_REPORT' ? 'Observation' : 'Injury'}</p>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                                  <h4 className="text-gray-500 font-semibold mb-2">Problem Description (Full)</h4>
                                  <p className="text-gray-700 whitespace-pre-wrap">{row.original.incidentDescription || 'N/A'}</p>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                                  <h4 className="text-gray-500 font-semibold mb-2">Corrective Action (Full)</h4>
                                  <p className="text-gray-700 whitespace-pre-wrap">
                                    {row.original.recordType === 'OBSERVATION_REPORT' 
                                      ? row.original.obsCorrectiveAction 
                                      : row.original.quickFixDescribeCorrectiveActions || 'N/A'}
                                  </p>
                                </div>
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

            {/* Your original pagination */}
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
          </>
        )}
      </div>

      {/* Your original modal */}
      <QuickFixActionCompleteModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        record={selectedRecord}
        onSuccess={fetchQuickFixRecords}
      />
    </div>
  );
}
