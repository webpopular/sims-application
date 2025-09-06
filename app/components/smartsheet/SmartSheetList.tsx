'use client';

import { useSmartSheetData } from "@/app/hooks/useSmartSheetData";
import { SmartSheetDisplayRow } from "@/app/types/smartsheet";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

export default function SmartSheetList() {
  const { data, loading, error } = useSmartSheetData();
  const columnHelper = createColumnHelper<SmartSheetDisplayRow>();

  const columns = [
    columnHelper.accessor('autoNumber', {
      header: 'Auto #',
      cell: info => <span className="font-medium">{info.getValue()}</span>
    }),
    columnHelper.accessor('employeeId', {
      header: 'Employee ID'
    }),
    columnHelper.accessor('firstName', {
      header: 'First Name'
    }),
    columnHelper.accessor('lastName', {
      header: 'Last Name'
    }),
    columnHelper.accessor('employeeType', {
      header: 'Employee Type'
    }),
    columnHelper.accessor('dateOfInjury', {
      header: 'Date of Injury',
      cell: info => new Date(info.getValue()).toLocaleDateString()
    }),
    columnHelper.accessor('bodyPartInjured', {
      header: 'Body Part'
    }),
    columnHelper.accessor('injuryCategory', {
      header: 'Injury Category'
    }),
    columnHelper.accessor('supervisorNotified', {
      header: 'Supervisor Notified',
      cell: info => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          info.getValue() === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {info.getValue()}
        </span>
      )
    })
  ];

  const transformedData: SmartSheetDisplayRow[] = data?.rows.map(row => ({
    id: row.id.toString(),
    autoNumber: row.cells[1]?.displayValue || '',
    emergency: row.cells[2]?.displayValue || '',
    employeeId: row.cells[3]?.displayValue || '',
    firstName: row.cells[4]?.displayValue || '',
    lastName: row.cells[5]?.displayValue || '',
    employeeType: row.cells[14]?.displayValue || '',
    dateOfInjury: row.cells[15]?.displayValue || '',
    bodyPartInjured: row.cells[24]?.displayValue || '',
    injuryCategory: row.cells[25]?.displayValue || '',
    supervisorNotified: row.cells[36]?.displayValue || ''
  })) || [];

  const table = useReactTable({
    data: transformedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading) return <div>Loading SmartSheet data...</div>;
  if (error) return <div>Error loading SmartSheet data</div>;
  if (!data?.rows) return <div>No data available</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-medium text-gray-800">Smartsheet Injury Sheet (US)</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row, i) => (
              <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-2 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
