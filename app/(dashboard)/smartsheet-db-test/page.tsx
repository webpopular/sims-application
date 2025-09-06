// app/(dashboard)/smartsheet-db-test/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '@/amplify/data/schema';

export default function SmartsheetDbTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [testId, setTestId] = useState('');

  // Function to test direct insertion
  const handleTestInsert = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/smartsheet/test-db', {
        method: 'POST'
      });
      const data = await response.json();
      setResult(data);
      if (data.recordId) {
        setTestId(data.recordId);
      }
    } catch (error) {
      console.error('Error testing DB:', error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const client = generateClient<Schema>();
      const response = await client.models.SmartsheetInjury.list({
        limit: 10
      });
      setRecords(response.data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">DynamoDB Test</h1>
      
      <div className="mb-6">
        <button 
          onClick={handleTestInsert}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Test Direct Insert'}
        </button>
      </div>

      {result && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">Test Result:</h2>
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="mb-6">
        <button 
          onClick={fetchRecords}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Refresh Records
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Existing Records:</h2>
        {records.length > 0 ? (
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">ID</th>
                <th className="border p-2">Sheet ID</th>
                <th className="border p-2">Row ID</th>
                <th className="border p-2">Created At</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id}>
                  <td className="border p-2">{record.id}</td>
                  <td className="border p-2">{record.sheetId}</td>
                  <td className="border p-2">{record.rowId}</td>
                  <td className="border p-2">{record.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No records found.</p>
        )}
      </div>
    </div>
  );
}
