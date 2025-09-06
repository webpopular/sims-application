// app/components/hierarchy/hierarchy-list.tsx
'use client';
import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '@/amplify/data/schema';

const client = generateClient<Schema>();

const columns = [
  { key: 'enterprise', label: 'Enterprise' },
  { key: 'segment', label: 'Segment' },
  { key: 'platform', label: 'Platform' },
  { key: 'region', label: 'Region' },
  { key: 'division', label: 'Division' },
  { key: 'plant', label: 'Plant' },
  { key: 'country', label: 'Country' },
  { key: 'plantManager', label: 'Plant Manager' },
  { key: 'hrLeader', label: 'HR Leader' },
  { key: 'safetyChampion', label: 'Safety Champion' }
];

export function HierarchyList() {
  const [hierarchyData, setHierarchyData] = useState<any[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHierarchyData();
  }, []);

  const fetchHierarchyData = async () => {
    try {
      const result = await client.models.Level.list();
      if (result.data) {
        setHierarchyData(result.data);
      }
    } catch (error) {
      console.error('Error fetching hierarchy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getFilteredAndSortedData = () => {
    return hierarchyData
      .filter(row => 
        Object.entries(filters).every(([key, value]) => 
          String(row[key])?.toLowerCase().includes(value.toLowerCase())
        )
      )
      .sort((a, b) => {
        if (!sortField) return 0;
        const aValue = String(a[sortField]);
        const bValue = String(b[sortField]);
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
  };

  if (loading) {
    return <div className="p-6">Loading hierarchy data...</div>;
  }

  return (
    <div className="p-6 max-w-full mx-auto">
      <h2 className="text-2xl font-bold mb-6">Organization Hierarchy</h2>
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((column) => (
                <th key={`filter-${column.key}`} className="px-4 py-2">
                  <input
                    type="text"
                    placeholder={`Filter ${column.label}`}
                    className="w-full p-1 text-sm border rounded"
                    onChange={(e) => 
                      setFilters(prev => ({...prev, [column.key]: e.target.value}))
                    }
                  />
                </th>
              ))}
            </tr>
            <tr className="bg-gray-100">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {sortField === column.key && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getFilteredAndSortedData().map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3">{row.enterprise || 'ITW'}</td>
                <td className="px-4 py-3">{row.segment || 'Automotive OEM'}</td>
                <td className="px-4 py-3">{row.platform}</td>
                <td className="px-4 py-3">{row.region || 'Asia'}</td>
                <td className="px-4 py-3">{row.division}</td>
                <td className="px-4 py-3">{row.plant}</td>
                <td className="px-4 py-3">{row.country}</td>
                <td className="px-4 py-3">{row.plantManager}</td>
                <td className="px-4 py-3">{row.hrLeader}</td>
                <td className="px-4 py-3">{row.safetyChampion}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {getFilteredAndSortedData().length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No records found
          </div>
        )}
      </div>
    </div>
  );
}
