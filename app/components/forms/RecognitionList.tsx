// app/components/forms/RecognitionList.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    SortingState,
} from '@tanstack/react-table';
import React from 'react';
import { useRouter } from 'next/navigation';
import type { Recognition } from '@/app/types';
import { getUrl } from 'aws-amplify/storage';
import { getUserInfo } from '@/lib/utils/getUserInfo';
import { initAmplify } from '@/app/amplify-init';
import { callAppSync } from '@/lib/utils/appSync';

initAmplify();

let dataClient: any = null;
async function getDataClient() {
    if (!dataClient) {
        const mod = await import('aws-amplify/data');
        dataClient = mod.generateClient<any>();
    }
    return dataClient;
}

export default function RecognitionList() {
    const [records, setRecords] = useState<Recognition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [recognizedFilter, setRecognizedFilter] = useState('all');
    const [submittedFilter, setSubmittedFilter] = useState('all');
    const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
    const [userGroups, setUserGroups] = useState<string[]>([]);
    const [isHRUser, setIsHRUser] = useState<boolean>(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const router = useRouter();

    useEffect(() => {
        if (table) table.setPageIndex(0);
    }, [recognizedFilter, submittedFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        async function checkUserGroups() {
            try {
                const userInfo = await getUserInfo();
                const groups = Array.isArray(userInfo.groups) ? userInfo.groups : [];
                setIsHRUser(groups.includes('hr'));
                setUserGroups(groups);
            } catch {
                setIsHRUser(false);
                setUserGroups([]);
            }
        }
        checkUserGroups();
    }, []);

    const columnDefs = React.useMemo(
        () => [
            {
                id: 'expand',
                header: '',
                cell: ({ row }: any) => (
                    <div
                        className="cursor-pointer"
                        onClick={e => {
                            e.stopPropagation();
                            setExpandedRow(prev => (prev === row.original.id ? null : row.original.id));
                        }}
                    >
                        {expandedRow === row.original.id ? '↓' : '→'}
                    </div>
                ),
            },
            { accessorKey: 'recognizedPersonName', header: 'Recognized Person' },
            { accessorKey: 'yourName', header: 'Submitted By' },
            {
                accessorKey: 'createdAt',
                header: 'Date',
                cell: (info: any) => {
                    const value = info.getValue();
                    return value ? new Date(value).toLocaleDateString() : '-';
                },
            },
        ],
        [expandedRow]
    );

    const filteredData = useMemo(
        () =>
            records.filter(
                r =>
                    (recognizedFilter === 'all' || r.recognizedPersonName === recognizedFilter) &&
                    (submittedFilter === 'all' || r.createdBy === submittedFilter)
            ),
        [records, recognizedFilter, submittedFilter]
    );

    const table = useReactTable({
        data: filteredData,
        columns: columnDefs,
        state: { sorting },
        initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const fetchRecords = async () => {
        try {
            let items: any[] | null = null;

            try {
                const client = await getDataClient();
                const resp = await client.models.Recognition.list({ authMode: 'userPool' });
                if (resp?.data) items = resp.data as any[];
                if (!items && resp?.errors?.length) throw new Error(resp.errors[0].message);
            } catch {}

            if (!items) {
                const query = `
          query ListRecognitionsForTable {
            listRecognitions(limit: 1000) {
              items {
                id
                recognitionId
                yourName
                yourEmployeeId
                recognizedPersonName
                safetyFocused
                continualImprovement
                focus8020
                entrepreneurialCulture
                attitudeFocused
                peopleFocused
                detailFocused
                employeeStory
                mediaUploadUrl
                thumbnailS3Key
                photoSize
                photoType
                contactRequested
                contactPhoneNumber
                createdAt
                createdBy
                updatedAt
                updatedBy
                metadata
              }
            }
          }`;
                const { data, errors } = await callAppSync(query);
                if (errors?.length) throw new Error(errors[0].message);
                items = data?.listRecognitions?.items ?? [];
            }

            const cleaned: Recognition[] = (items ?? [])
                .filter((item: any) => item.id)
                .map((item: any) => ({
                    id: item.id,
                    recognitionId: item.recognitionId ?? '',
                    yourName: item.yourName ?? '',
                    yourEmployeeId: item.yourEmployeeId ?? '',
                    recognizedPersonName: item.recognizedPersonName ?? '',
                    safetyFocused: !!item.safetyFocused,
                    continualImprovement: !!item.continualImprovement,
                    focus8020: !!item.focus8020,
                    entrepreneurialCulture: !!item.entrepreneurialCulture,
                    attitudeFocused: !!item.attitudeFocused,
                    peopleFocused: !!item.peopleFocused,
                    detailFocused: !!item.detailFocused,
                    employeeStory: item.employeeStory ?? '',
                    mediaUploadUrl: item.mediaUploadUrl ?? '',
                    thumbnailS3Key: item.thumbnailS3Key ?? '',
                    photoSize: item.photoSize ?? '',
                    photoType: item.photoType ?? '',
                    contactRequested: !!item.contactRequested,
                    contactPhoneNumber: item.contactPhoneNumber ?? '',
                    createdAt: item.createdAt ?? '',
                    createdBy: item.createdBy ?? '',
                    updatedAt: item.updatedAt ?? '',
                    updatedBy: item.updatedBy ?? '',
                    metadata: item.metadata ?? null,
                }));

            setRecords(cleaned);
        } catch (err) {
            console.error('Error fetching recognition records:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewPhoto = async (mediaUrl: string) => {
        if (!mediaUrl) return;
        try {
            const { url } = await getUrl({
                path: mediaUrl,
                options: {
                    bucket: { bucketName: 'simsstorage2.0', region: 'us-east-1' },
                    validateObjectExistence: false,
                },
            });
            window.open(url, '_blank');
        } catch (error) {
            console.error('View photo failed:', error);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const uniqueValues = (key: keyof Recognition) =>
        ['all', ...new Set(records.map(r => r[key]).filter(Boolean) as string[])];

    if (isLoading) return <div className="flex justify-center p-8">Loading recognition records...</div>;

    return (
        <div className="ml-2 px-4 py-2">
            <h2 className="text-xl font-bold mb-4 text-blue-700">Employee Recognitions</h2>

            <div className="flex flex-wrap gap-4 mb-4 text-sm">
                <div>
                    <label className="block text-gray-600 mb-1">Recognized Person</label>
                    <select
                        value={recognizedFilter}
                        onChange={e => setRecognizedFilter(e.target.value)}
                        className="px-2 py-1 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {uniqueValues('recognizedPersonName').map(name => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-gray-600 mb-1">Submitted By</label>
                    <select
                        value={submittedFilter}
                        onChange={e => setSubmittedFilter(e.target.value)}
                        className="px-2 py-1 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {uniqueValues('yourName').map(by => (
                            <option key={by} value={by}>
                                {by}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full table-fixed text-sm">
                    <thead className="bg-blue-50 text-blue-800">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th
                                    key={header.id}
                                    className="px-4 py-2 text-left"
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
                                className={`hover:bg-blue-50 cursor-pointer ${i % 2 === 0 ? '' : 'bg-gray-50'}`}
                                onClick={() => setExpandedRow(prev => (prev === row.original.id ? null : row.original.id))}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-4 py-2">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                            {expandedRow === row.original.id && (
                                <tr>
                                    <td colSpan={columnDefs.length} className="p-0 bg-blue-50">
                                        <div className="p-6 bg-white m-2 rounded-lg shadow-md">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <h3 className="text-lg font-semibold text-blue-700 border-b border-blue-100 pb-2">
                                                        Recognition Details
                                                    </h3>
                                                    <div>
                                                        <p className="text-sm text-gray-500">Recognized Person</p>
                                                        <p className="font-medium">{row.original.recognizedPersonName}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-500">Submitted By</p>
                                                        <p className="font-medium">
                                                            {row.original.yourName} (ID: {row.original.yourEmployeeId})
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-500">Date Submitted</p>
                                                        <p className="font-medium">
                                                            {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : '-'}
                                                        </p>
                                                    </div>
                                                    {row.original.contactRequested && (
                                                        <div>
                                                            <p className="text-sm text-gray-500">Contact Phone</p>
                                                            <p className="font-medium">{row.original.contactPhoneNumber || 'Not provided'}</p>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm text-gray-500">Core Values Demonstrated</p>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {row.original.safetyFocused && (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    Safety Focused
                                  </span>
                                                            )}
                                                            {row.original.continualImprovement && (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    Continual Improvement
                                  </span>
                                                            )}
                                                            {row.original.focus8020 && (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    80/20 Focus
                                  </span>
                                                            )}
                                                            {row.original.entrepreneurialCulture && (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    Entrepreneurial Culture
                                  </span>
                                                            )}
                                                            {row.original.attitudeFocused && (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    Attitude Focused
                                  </span>
                                                            )}
                                                            {row.original.peopleFocused && (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    People Focused
                                  </span>
                                                            )}
                                                            {row.original.detailFocused && (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    Detail Focused
                                  </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-center">
                                                    {row.original.mediaUploadUrl ? (
                                                        <div className="w-full">
                                                            <h3 className="text-lg font-semibold text-blue-700 border-b border-blue-100 pb-2 mb-4">
                                                                Photo
                                                            </h3>
                                                            <div
                                                                className="aspect-square max-w-md mx-auto bg-gray-100 rounded-lg overflow-hidden shadow-md cursor-pointer"
                                                                onClick={() =>
                                                                    row.original.mediaUploadUrl ? handleViewPhoto(row.original.mediaUploadUrl) : null
                                                                }
                                                            >
                                                                <img
                                                                    src={
                                                                        row.original.thumbnailS3Key
                                                                            ? `/api/image-preview?key=${encodeURIComponent(row.original.thumbnailS3Key)}`
                                                                            : `/api/image-preview?key=${encodeURIComponent(row.original.mediaUploadUrl)}`
                                                                    }
                                                                    alt="Recognition photo"
                                                                    className="w-full h-full object-cover"
                                                                    onError={e => {
                                                                        e.currentTarget.src =
                                                                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='14' text-anchor='middle' alignment-baseline='middle' fill='%23999999'%3EImage%3C/text%3E%3C/svg%3E";
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="text-center text-sm text-blue-600 mt-2">Click to view full size</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                                                            <p className="text-gray-500">No photo uploaded</p>
                                                        </div>
                                                    )}
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
                            <td colSpan={columnDefs.length} className="px-4 py-8 text-center text-gray-500">
                                No recognition records found
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

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
