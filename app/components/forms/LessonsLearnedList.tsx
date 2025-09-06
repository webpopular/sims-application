// app/components/forms/LessonsLearnedList.tsx - FIXED with proper permissions
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { generateClient } from "aws-amplify/data";
import { type Schema } from "@/amplify/data/schema";
import React from 'react';
import { useUserAccess } from "@/app/hooks/useUserAccess"; // ✅ Added for data-level security
import { PermissionGate } from "../permission/PermissionGate"; // ✅ Added for permissions
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

const statusColors: Record<string, string> = {
  LL_SENT_FOR_APPROVAL: "bg-yellow-100 text-yellow-800",
  LL_APPROVED: "bg-green-100 text-green-800",
  LL_SENT_BACK_FOR_REVISION: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  LL_SENT_FOR_APPROVAL: "Sent for Approval",
  LL_APPROVED: "Approved",
  LL_SENT_BACK_FOR_REVISION: "Sent Back",
};

type SimplifiedLessons = {
  hierarchyString?: string; // ✅ Added for data-level security
  id: string;
  submissionId: string;
  title: string;
  locationOnSite?: string;
  dateOfIncident?: string;
  status: string;
  // Add these fields from LessonsLearnedSection
  llid?: string;
  lessonsLearnedAuthor?: string;
  lessonsLearnedTitle?: string;
  lessonsLearnedSegment?: string;
  lessonsLearnedLocation?: string;
  lessonsLearnedKeyWords?: string;
  lessonsLearnedApprover?: string;
  lessonDescription?: string;
  keyTakeaways?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  lessonsLearnedApprovalStatus?: string;
  lessonsLearnedSentforApprovalBy?: string;
  lessonsLearnedSentforApprovalAt?: string;
  lessonsLearnedSenttoApprover?: string;
  incidentDescription?: string;
};

export default function LessonsLearnedListPage() {
  const [data, setData] = useState<SimplifiedLessons[]>([]);
  const [filteredData, setFilteredData] = useState<SimplifiedLessons[]>([]); // ✅ Added for data-level security
  const [isLoading, setIsLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [locationFilter, setLocationFilter] = useState<string>('');

  const router = useRouter();

  // ✅ Add user access hook for data-level security
  const { userAccess, isReady } = useUserAccess();

  // ✅ Data-level security filtering function
  const applyDataLevelSecurity = (lessons: SimplifiedLessons[], userAccess: any) => {
    if (!userAccess) {
      console.log('⚠️ [DataSecurity] No user access data - showing all records');
      return lessons;
    }

    console.log(`🔍 [DataSecurity] Applying ${userAccess.accessScope} level filtering for user: ${userAccess.email}`);
    console.log(`🔍 [DataSecurity] User hierarchy: ${userAccess.hierarchyString}`);

    switch (userAccess.accessScope) {
      case 'ENTERPRISE':
        console.log(`✅ [DataSecurity] Enterprise access - returning all ${lessons.length} records`);
        return lessons; // Enterprise users see all data
        
      case 'SEGMENT':
      case 'PLATFORM':
      case 'DIVISION':
        const beginsWith = lessons.filter(lesson => 
          lesson.hierarchyString?.startsWith(userAccess.hierarchyString)
        );
        console.log(`✅ [DataSecurity] ${userAccess.accessScope} access - filtered to ${beginsWith.length} records`);
        return beginsWith;
        
      case 'PLANT':
        const exactMatch = lessons.filter(lesson => 
          lesson.hierarchyString === userAccess.hierarchyString
        );
        console.log(`✅ [DataSecurity] Plant access - filtered to ${exactMatch.length} records`);
        return exactMatch;
        
      default:
        console.log(`⚠️ [DataSecurity] Unknown access scope - applying restrictive filtering`);
        return lessons.filter(lesson => 
          lesson.hierarchyString === userAccess.hierarchyString
        );
    }
  };

  const uniqueLocations = useMemo(() => {
    const locations = data
      .map(item => item.locationOnSite)
      .filter((location): location is string => !!location && location.trim() !== '')
      .filter((location, index, array) => array.indexOf(location) === index)
      .sort();
    
    return locations;
  }, [data]);

  
  // ✅ Apply data-level security when data or userAccess changes
  useEffect(() => {
    if (isReady && data.length > 0) {
      console.log('🔍 [DataSecurity] Applying data-level security filtering...');
      const securityFilteredData = applyDataLevelSecurity(data, userAccess);
      setFilteredData(securityFilteredData);
      
      console.log(`📊 [DataSecurity] Security filtering complete:`);
      console.log(`   - Original records: ${data.length}`);
      console.log(`   - After security filtering: ${securityFilteredData.length}`);
      console.log(`   - User access scope: ${userAccess?.accessScope || 'Unknown'}`);
    } else if (data.length > 0) {
      // If user access not ready, show all records temporarily
      setFilteredData(data);
    }
  }, [data, userAccess, isReady]);

  const columnHelper = createColumnHelper<SimplifiedLessons>();
  const columns = [
    // Expansion arrow column
    columnHelper.display({
      id: 'expand',
      header: '',
      cell: info => (
        <div
          className="px-2 py-2 cursor-pointer"
          onClick={() => setExpandedRow(prev => prev === info.row.original.id ? null : info.row.original.id)}
        >
          {expandedRow === info.row.original.id ? '↓' : '→'}
        </div>
      ),
      size: 30
    }),
    // ✅ FIXED: Submission ID column with proper PermissionGate and correct permission check
    columnHelper.accessor('submissionId', {
      header: 'Submission ID',
      cell: info => {
        const lesson = info.row.original;
        
        return (
          <PermissionGate
            record={lesson}
            action="edit"
            checkRecordAccess={true}
            permission="canTakeIncidentRCAActions" // ✅ FIXED: Use investigation permission instead of view permission
            fallback={
              <span className="text-gray-500 font-thin" title="No investigation access">
                {info.getValue()}
              </span>
            }
          >
            <button
              onClick={() => router.push(`/investigate-sections?mode=investigate-lessonslearned&id=${lesson.submissionId}`)}
              className="text-[#cb4154] font-thin hover:underline"
              title="Click to investigate lessons learned"
            >
              {info.getValue()}
            </button>
          </PermissionGate>
        );
      }
    }),
    columnHelper.accessor('title', {
      header: 'Title',
      cell: info => <div className="line-clamp-2">{info.getValue() || 'Untitled'}</div>
    }),
    columnHelper.accessor('locationOnSite', {
      header: 'Location',
      cell: info => <span className="text-gray-700">{info.getValue() || 'N/A'}</span>
    }),
    columnHelper.accessor('dateOfIncident', {
      header: 'Date of Incident',
      cell: info => new Date(info.getValue() || '').toLocaleDateString()
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[info.getValue()] || 'bg-gray-100 text-gray-800'}`}>
          {statusLabels[info.getValue()] || 'Unknown'}
        </span>
      )
    })
  ];

  // ✅ Use security-filtered data for table
  const finalFilteredData = useMemo(() => {
    return filteredData.filter(row => {
      // Apply location filter
      if (locationFilter && row.locationOnSite !== locationFilter) {
        return false;
      }
      
      // Apply global filter
      if (globalFilter === '') {
        return true;
      }
      
      return Object.values(row).some(val =>
        String(val).toLowerCase().includes(globalFilter.toLowerCase())
      );
    });
  }, [filteredData, globalFilter, locationFilter]);
  

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
            row.original.lessonsLearnedTitle,
            row.original.lessonsLearnedAuthor,
            row.original.locationOnSite
        ].join(' ').toLowerCase();
        
        return searchableText.includes(filterValue.toLowerCase());
    },
  });

  useEffect(() => {
    if (table) {
        table.setPageIndex(0);
    }
  }, [globalFilter]);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const { data: submissions } = await client.models.Submission.list({
          selectionSet: [
            'id', 'submissionId', 'title', 'locationOnSite', 'dateOfIncident',
            'incidentDescription',
            'hierarchyString', // ✅ CRITICAL: Added for data-level security
            'lessonsLearned.*' // Include all lessons learned fields
          ]
        });

        const filtered: SimplifiedLessons[] = (submissions ?? [])
          .flatMap(sub => {
            const lessons = sub.lessonsLearned ?? [];
            return lessons
              .filter((ll): ll is NonNullable<typeof ll> =>
                !!ll && ['LL_SENT_FOR_APPROVAL', 'LL_APPROVED', 'LL_SENT_BACK_FOR_REVISION'].includes(ll.lessonsLearnedApprovalStatus || '')
              )
              .map(ll => ({
                id: sub.id!,
                submissionId: sub.submissionId,
                title: sub.title || '',
                locationOnSite: sub.locationOnSite || '',
                dateOfIncident: sub.dateOfIncident || '',
                status: ll.lessonsLearnedApprovalStatus as "LL_SENT_FOR_APPROVAL" | "LL_APPROVED" | "LL_SENT_BACK_FOR_REVISION",
                hierarchyString: sub.hierarchyString || '', // ✅ Map hierarchyString
                // Map the fields from the LessonsLearned custom type
                llid: ll.llid || '',
                lessonsLearnedAuthor: ll.lessonsLearnedAuthor || '',
                lessonsLearnedTitle: ll.lessonsLearnedTitle || '',
                lessonsLearnedSegment: ll.lessonsLearnedSegment || '',
                lessonsLearnedLocation: ll.lessonsLearnedLocation || '',
                lessonsLearnedKeyWords: ll.lessonsLearnedKeyWords || '',
                lessonsLearnedApprover: ll.lessonsLearnedApprover || '',
                lessonDescription: ll.lessonDescription || '',
                keyTakeaways: ll.keyTakeaways || '',
                uploadedAt: ll.uploadedAt || '',
                uploadedBy: ll.uploadedBy || '',
                lessonsLearnedSentforApprovalBy: ll.lessonsLearnedSentforApprovalBy || '',
                lessonsLearnedSentforApprovalAt: ll.lessonsLearnedSentforApprovalAt || '',
                lessonsLearnedSenttoApprover: ll.lessonsLearnedSenttoApprover || '',
                incidentDescription: sub.incidentDescription || '',
              }));
          });

        setData(filtered);
      } catch (err) {
        console.error("Failed to load lessons learned", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessons();
  }, []);

  if (isLoading) return <div className="p-4">Loading lessons learned...</div>;

  return (
    <div className="ml-2 px-2 py-2">
      <div className="flex flex-col">
     

        <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
    {/* Global Search Input */}
    <input
      type="text"
      placeholder="Search..."
      value={globalFilter}
      onChange={(e) => setGlobalFilter(e.target.value)}
      className="px-3 py-2 border rounded-md w-64 bg-white focus:outline-none focus:ring-2 focus:ring-[#cb4154]"
    />
    
    {/* Location Filter Dropdown */}
    <select
      value={locationFilter}
      onChange={(e) => setLocationFilter(e.target.value)}
      className="px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#cb4154] min-w-48"
    >
      <option value="">All Locations</option>
      {uniqueLocations.map(location => (
        <option key={location} value={location}>
          {location}
        </option>
      ))}
    </select>
    
    {/* Clear Filters Button */}
    {(locationFilter || globalFilter) && (
      <button
        onClick={() => {
          setLocationFilter('');
          setGlobalFilter('');
        }}
        className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm whitespace-nowrap"
      >
        Clear Filters
      </button>
    )}
  </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full border-collapse table-fixed text-sm">
            <thead className="bg-[#80000010] text-emerald-700">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none"
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
                  <tr className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-2  py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {expandedRow === row.original.id && (
                    <tr>
                      <td colSpan={columns.length} className="p-4 bg-green-50">
                        {/* ✅ All your existing expanded row content remains the same */}
                        <div className="bg-white rounded-lg shadow-md p-6 space-y-6 text-sm text-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Column 1 - Basic Information */}
                            <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                              <h4 className="text-gray-500 font-semibold mb-2">Basic Information</h4>
                              <p><strong>Author:</strong> {row.original.lessonsLearnedAuthor || 'N/A'}</p>
                              <p><strong>Title:</strong> {row.original.lessonsLearnedTitle || row.original.title || 'N/A'}</p>
                              <p><strong>Segment:</strong> {row.original.lessonsLearnedSegment || 'N/A'}</p>
                              <p><strong>Date:</strong> {row.original.uploadedAt ? new Date(row.original.uploadedAt).toLocaleDateString() : 'N/A'}</p>
                              <p><strong>Location:</strong> {row.original.lessonsLearnedLocation || row.original.locationOnSite || 'N/A'}</p>
                            </div>

                            {/* Column 2 - Incident Description */}
                            <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                              <h4 className="text-gray-500 font-semibold mb-2">Incident Description</h4>
                              <p className="font-semibold text-gray-800 mb-2">{row.original.title || 'No Title'}</p>
                              <p className="text-gray-700 break-words">{row.original.incidentDescription || 'No description available'}</p>
                              <div className="mt-3">
                                <p><strong>Key Words:</strong> {row.original.lessonsLearnedKeyWords || 'N/A'}</p>
                              </div>
                            </div>

                            {/* Column 3 - Approval Information */}
                            <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                              <h4 className="text-gray-500 font-semibold mb-2">Approval Information</h4>
                              <p><strong>Status:</strong> <span className={`text-xs px-2 py-1 rounded-full ${statusColors[row.original.status] || 'bg-gray-100 text-gray-800'}`}>
                                {statusLabels[row.original.status] || 'Unknown'}
                              </span></p>
                              <p><strong>Approver:</strong> {row.original.lessonsLearnedApprover || 'N/A'}</p>
                              <p><strong>Sent By:</strong> {row.original.lessonsLearnedSentforApprovalBy || 'N/A'}</p>
                              <p><strong>Sent At:</strong> {row.original.lessonsLearnedSentforApprovalAt ? new Date(row.original.lessonsLearnedSentforApprovalAt).toLocaleString() : 'N/A'}</p>
                              <p><strong>Sent To:</strong> {row.original.lessonsLearnedSenttoApprover || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Lessons Learned Details */}
                          <div className="mt-6 grid grid-cols-1 gap-6">
                            <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                              <h4 className="text-gray-500 font-semibold mb-2">Lessons Learned Details</h4>

                              <div className="space-y-4">
                                <div>
                                  <h5 className="text-sm font-medium text-gray-600 mb-1">Lesson Description</h5>
                                  <p className="text-gray-700 break-words p-3 bg-white rounded-md shadow-sm">{row.original.lessonDescription || 'N/A'}</p>
                                </div>

                                <div>
                                  <h5 className="text-sm font-medium text-gray-600 mb-1">Key Takeaways</h5>
                                  <p className="text-gray-700 break-words p-3 bg-white rounded-md shadow-sm">{row.original.keyTakeaways || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                    No lessons learned found
                  </td>
                </tr>
              )}
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
    </div>
  );
}
