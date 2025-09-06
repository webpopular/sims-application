//app/components/forms/SafetyAlertList.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { generateClient } from "aws-amplify/data";
import { getUrl } from "aws-amplify/storage";
import { type Schema } from "@/amplify/data/schema";
import React from 'react';
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
import { PermissionGate } from "../permission/PermissionGate";

const client = generateClient<Schema>();

const statusColors: Record<string, string> = {
  SAFETY_ALERT_NOT_CREATED: "bg-gray-100 text-gray-800",
  SAFETY_ALERT_OPEN: "bg-blue-100 text-blue-800",
  SAFETY_ALERT_CREATED: "bg-green-100 text-green-800",
};

const statusLabels: Record<string, string> = {
  SAFETY_ALERT_NOT_CREATED: "Not Created",
  SAFETY_ALERT_OPEN: "Open",
  SAFETY_ALERT_CREATED: "Created",
};

type SimplifiedSafetyAlert = {
  id: string;
  submissionId: string;
  locationOnSite?: string;
  dateOfIncident?: string;
  saPDF?: string;
  saInjuryFlag?: boolean;
  saPropertyDamageFlag?: boolean;
  saNumber?: string;
  saWhereInPlant?: string;
  saActionAndNextSteps?: string;
  saStatus?: string;
  saAuthor?: string;
  saCreateDate?: string;
  saUpdateDate?: string;
  title?: string;
  incidentDescription?: string;
};

export default function SafetyAlertListPage() {
  const [data, setData] = useState<SimplifiedSafetyAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  //const [pageSize, setPageSize] = useState(10);
  //const [pageIndex, setPageIndex] = useState(0);
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [locationFilter, setLocationFilter] = useState<string>('');

  const router = useRouter();

  const columnHelper = createColumnHelper<SimplifiedSafetyAlert>();

 const uniqueLocations = useMemo(() => {
  const locations = data
    .map(item => item.locationOnSite)
    .filter((location): location is string => !!location && location.trim() !== '')
    .filter((location, index, array) => array.indexOf(location) === index)
    .sort();
  
  return locations;
}, [data]);



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
    columnHelper.accessor('submissionId', {
      header: 'Submission ID',
      cell: info => {
        const alert = info.row.original;
        
        return (
          <PermissionGate
            record={alert}
            action="edit"
            checkRecordAccess={true}
            permission="canTakeIncidentRCAActions"
            fallback={
              <span className="text-gray-500 font-thin" title="No investigation access">
                {info.getValue()}
              </span>
            }
          >
            <button
              onClick={() => router.push(`/investigate-sections?mode=investigate-safetyalert&id=${info.row.original.submissionId}`)}
              className="text-[#cb4154] font-thin hover:underline"
              title="Click to investigate safety alert"
            >
              {info.getValue()}
            </button>
          </PermissionGate>
        );
      }
    }),
    columnHelper.accessor('locationOnSite', {
      header: 'Location',
      cell: info => <span className="text-gray-700">{info.getValue() || 'N/A'}</span>
    }),
    columnHelper.accessor('dateOfIncident', {
      header: 'Date of Incident',
      cell: info => info.getValue() ? new Date(info.getValue() || '').toLocaleDateString() : 'N/A'
    }),
    columnHelper.accessor('saPDF', {
      header: 'PDF',
      cell: info => {
        const pdfKey = info.getValue();
        if (!pdfKey) return <span className="text-gray-400">No PDF</span>;
    
        const pdfUrl = pdfUrls[pdfKey];
        if (!pdfUrl) return <span className="text-gray-400">Loading...</span>;
    
        return (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            View PDF
          </a>
        );
      }
    }),
    
    columnHelper.accessor(row => ({ injury: row.saInjuryFlag, property: row.saPropertyDamageFlag }), {
      id: 'type',
      header: 'Type',
      cell: info => {
        const { injury, property } = info.getValue();
        return (
          <div className="flex gap-1">
            {injury && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                Injury
              </span>
            )}
            {property && (
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                Property
              </span>
            )}
            {!injury && !property && <span className="text-gray-400">None</span>}
          </div>
        );
      }
    })
  ];

 
const filteredData = useMemo(() => {
  return data.filter(item => {
    // Apply location filter
    if (locationFilter && item.locationOnSite !== locationFilter) {
      return false;
    }
    return true;
  });
}, [data, locationFilter]);


const table = useReactTable({
  data: filteredData,
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
          row.original.saNumber,
          row.original.saAuthor,
          row.original.saWhereInPlant,
          row.original.submissionId,
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
    const fetchSafetyAlerts = async () => {
      try {
        const { data: submissions } = await client.models.Submission.list();

        const filtered: SimplifiedSafetyAlert[] = (submissions ?? [])
          .filter(sub => sub.saStatus && sub.saStatus !== "SAFETY_ALERT_NOT_CREATED")
          .map(sub => ({
            id: sub.id!,
            submissionId: sub.submissionId,
            locationOnSite: sub.locationOnSite || '',
            dateOfIncident: sub.dateOfIncident || '',
            saPDF: sub.saPDF || '',
            saInjuryFlag: sub.saInjuryFlag || false,
            saPropertyDamageFlag: sub.saPropertyDamageFlag || false,
            saNumber: sub.saNumber || '',
            saWhereInPlant: sub.saWhereInPlant || '',
            saActionAndNextSteps: sub.saActionAndNextSteps || '',
            saStatus: sub.saStatus || '',
            saAuthor: sub.saAuthor || '',
            saCreateDate: sub.saCreateDate || '',
            saUpdateDate: sub.saUpdateDate || '',
            title: sub.title || '',
            incidentDescription: sub.incidentDescription || '',
          }));

        setData(filtered);

        // Generate presigned URLs for PDFs
        const pdfKeys = filtered
          .map(item => item.saPDF)
          .filter((key): key is string => !!key);

        const urlMap: Record<string, string> = {};
        await Promise.all(
          pdfKeys.map(async (key) => {
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
        console.error("Failed to load safety alerts", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSafetyAlerts();
  }, []);

  if (isLoading) return <div className="p-4">Loading safety alerts...</div>;

  return (
    <div className="ml-2 px-2 py-2">
      <div className="flex flex-col">

      <div className="flex items-center gap-3">
    {/* Global Search Input */}
    <input
      type="text"
      placeholder="Search..."
      value={globalFilter}
      onChange={(e) => setGlobalFilter(e.target.value)}
      className="px-3 py-2 border rounded-md w-64 bg-white focus:outline-none focus:ring-1 focus:ring-[#cb4154]"
    />
  
  {/* Location Filter Dropdown */}
  <select
      value={locationFilter}
      onChange={(e) => setLocationFilter(e.target.value)}
      className="px- py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#cb4154] min-w-48"
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


        <div className="bg-white rounded-lg shadow overflow-x-auto mt-2">
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
                      <td key={cell.id} className="px-2 py-2 break-words">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {expandedRow === row.original.id && (
                    <tr>
                      <td colSpan={columns.length} className="p-4 bg-red-50">
                        <div className="bg-white rounded-lg shadow-md p-6 space-y-6 text-sm text-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Column 1 - Safety Alert Info */}
                            <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                              <h4 className="text-gray-500 font-semibold mb-2">Safety Alert Info</h4>
                              {/*<p><strong>Alert Number:</strong> {row.original.saNumber || 'N/A'}</p>*/}
                              <p><strong>Location:</strong> {row.original.locationOnSite || 'N/A'}</p>
                              <p><strong>Where in Plant:</strong> {row.original.saWhereInPlant || 'N/A'}</p>

                              {/*<p><strong>Status:</strong> {statusLabels[row.original.saStatus || ''] || 'N/A'}</p>*/}
                              <p><strong>Type:</strong>
                                <span className="ml-2">
                                  {row.original.saInjuryFlag && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mr-1">Injury</span>}
                                  {row.original.saPropertyDamageFlag && <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Property</span>}
                                  {!row.original.saInjuryFlag && !row.original.saPropertyDamageFlag && 'None'}
                                </span>
                              </p>

                              <p><strong>Author:</strong> {row.original.saAuthor || 'N/A'}</p>
                              <p><strong>Created:</strong> {row.original.saCreateDate ? new Date(row.original.saCreateDate).toLocaleString() : 'N/A'}</p>
                              <p><strong>Updated:</strong> {row.original.saUpdateDate ? new Date(row.original.saUpdateDate).toLocaleString() : 'N/A'}</p>

                            </div>

                            {/* Column 2 - Incident Description */}
                            <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                              <h4 className="text-gray-500 font-semibold mb-2">Incident Description</h4>
                              <p className="font-semibold text-gray-800 mb-2">{row.original.title || 'No Title'}</p>
                              <p className="text-gray-700 break-words">{row.original.incidentDescription || 'No description available'}</p>
                            </div>

                            {/* Column 3 - Actions */}
                            <div className="bg-gray-50 p-4 rounded-md shadow-sm space-y-4">
                              <div>
                                <h4 className="text-gray-500 font-semibold mb-1">Actions and Next Steps</h4>
                                <p className="text-gray-700 break-words">{row.original.saActionAndNextSteps || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          {/* PDF Link */}
                          {row.original.saPDF && pdfUrls[row.original.saPDF] && (
                            <div className="mt-4 flex justify-center">
                              <a
                                href={pdfUrls[row.original.saPDF]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                View Full Safety Alert PDF
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                    No safety alerts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

{/* Pagination */}
<div className="flex items-center justify-between mb-6 text-sm">
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
