'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '@/amplify/data/schema';
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

type EventApprovalStatusType = "YET_TO_START" | "ACTION_IN_PROGRESS" | "ACTION_COMPLETE" | "SEND_BACK";
type LessonsStatusType = "LL_SENT_FOR_APPROVAL" | "LL_SENT_BACK_FOR_REVISION" | "LL_APPROVED";

interface EventRecord {
  id: string;
  submissionId: string;
  location: string;
  title: string;
  dateOfIncident?: string | null;
  recordType: "Injury" | "Lessons Learned";
  status: EventApprovalStatusType | LessonsStatusType;
  createdBy: string;
}

export default function EventApprovals() {
  const [records, setRecords] = useState<EventRecord[]>([]);
  const [filters, setFilters] = useState({
    location: 'all',
    recordType: 'all',
    status: 'all'
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const injuryStatusList: EventApprovalStatusType[] = ["ACTION_IN_PROGRESS", "SEND_BACK"];
  const lessonsStatusList: LessonsStatusType[] = ["LL_SENT_FOR_APPROVAL", "LL_SENT_BACK_FOR_REVISION"];

  const statusLabels: Record<string, string> = {
    ACTION_IN_PROGRESS: "Injury: In Progress",
    SEND_BACK: "Injury: Sent Back",
    LL_SENT_FOR_APPROVAL: "Lessons: Sent for Approval",
    LL_SENT_BACK_FOR_REVISION: "Lessons: Sent Back",
    LL_APPROVED: "Lessons: Approved",
  };

  const statusClasses: Record<string, string> = {
    ACTION_IN_PROGRESS: "bg-blue-100 text-blue-800",
    SEND_BACK: "bg-yellow-100 text-yellow-800",
    LL_SENT_FOR_APPROVAL: "bg-yellow-100 text-yellow-800",
    LL_SENT_BACK_FOR_REVISION: "bg-red-100 text-red-800",
    LL_APPROVED: "bg-green-100 text-green-800",
  };

  // Create column definitions
  const columnHelper = createColumnHelper<EventRecord>();

  const columns = [
    columnHelper.accessor('submissionId', {
      header: 'Submission ID',
      size: 150,
    }),
    columnHelper.accessor('location', {
      header: 'Location',
      size: 120,
    }),
    columnHelper.accessor('title', {
      header: 'Title',
    }),
    columnHelper.accessor('dateOfIncident', {
      header: 'Date',
      cell: info => info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : 'N/A',
      size: 100,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <span className={`text-xs px-2 py-1 rounded-full ${statusClasses[info.getValue()] || 'bg-gray-200 text-gray-800'}`}>
          {statusLabels[info.getValue()] || info.getValue()}
        </span>
      ),
      size: 180,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Link
          href={`/investigate-sections?mode=readonly&id=${row.original.submissionId}`}
          className="px-2 py-1 text-xs rounded bg-red-100 text-gray-700 hover:bg-red-300 transition"
        >
          View Details
        </Link>
      ),
      size: 100,
    }),
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await client.models.Submission.list();
        const result: EventRecord[] = [];

        for (const item of data ?? []) {
          const submissionId = item.submissionId;
          const location = item.locationOnSite || 'N/A';
          const title = item.title || 'Untitled';
          const date = item.dateOfIncident || null;
          const createdBy = 'email of ?'; // TODO: replace with actual mapping

          // Injury Status
          if (injuryStatusList.includes(item.eventApprovalStatus as EventApprovalStatusType)) {
            result.push({
              id: item.id!,
              submissionId,
              location,
              title,
              dateOfIncident: date,
              createdBy,
              recordType: 'Injury',
              status: item.eventApprovalStatus as EventApprovalStatusType
            });
          }

          // Lessons Learned Statuses
          for (const lesson of item.lessonsLearned ?? []) {
            if (
              lesson?.lessonsLearnedApprovalStatus &&
              lessonsStatusList.includes(lesson.lessonsLearnedApprovalStatus as LessonsStatusType)
            ) {
              result.push({
                id: item.id!,
                submissionId,
                location,
                title,
                dateOfIncident: date,
                createdBy,
                recordType: 'Lessons Learned',
                status: lesson.lessonsLearnedApprovalStatus as LessonsStatusType
              });
            }
          }
        }

        setRecords(result);
      } catch (err) {
        console.error("Error loading records", err);
      }
    };

    fetchData();
  }, []);

  // Create filtered data with useMemo
  const filteredRecords = useMemo(() => {
    return records.filter(r =>
      (filters.location === 'all' || r.location === filters.location) &&
      (filters.recordType === 'all' || r.recordType === filters.recordType) &&
      (filters.status === 'all' || r.status === filters.status)
    );
  }, [records, filters]);

  // Create table configuration
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

  // Reset pagination when filters change
  useEffect(() => {
    if (table) {
      table.setPageIndex(0);
    }
  }, [filters]);

  return (
    <div className="ml-2 px-4 py-2">
      <div className="flex flex-col">
        <h2 className="text-lg font-bold mb-4 text-rose-700">Approval - Event Status and Closure</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          {/* Location */}
          <div>
            <label className="block text-gray-600 mb-1">Location</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="px-2 py-1 border rounded bg-white"
            >
              <option value="all">All</option>
              {Array.from(new Set(records.map(r => r.location))).map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Record Type */}
          <div>
            <label className="block text-gray-600 mb-1">Submission Type</label>
            <select
              value={filters.recordType}
              onChange={(e) => setFilters(prev => ({ ...prev, recordType: e.target.value }))}
              className="px-2 py-1 border rounded bg-white"
            >
              <option value="all">All</option>
              <option value="Injury">Injury</option>
              <option value="Lessons Learned">Lessons Learned</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-gray-600 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-2 py-1 border rounded bg-white"
            >
              <option value="all">All</option>
              {[...injuryStatusList, ...lessonsStatusList].map(s => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
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
                <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="text-center px-4 py-4 text-gray-500">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
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
