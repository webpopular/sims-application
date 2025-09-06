// app/(dashboard)/smartsheet-sync/page.tsx
'use client';

import { useState } from 'react';
import SmartsheetSyncButton from '@/app/components/smartsheet/SyncButton';
import SIMSCopyButton from '@/app/components/smartsheet/SIMSCopyButton';
import { RefreshCw, Database, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

interface SyncStatus {
  [key: string]: {
    smartsheetSync: 'idle' | 'loading' | 'success' | 'error';
    simsSync: 'idle' | 'loading' | 'success' | 'error';
    lastSynced?: string;
  };
}

export default function SmartsheetSyncPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({});
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);

  const sheetConfigs = [
    {
      id: 'SEATS_NA_INJURY',
      title: 'Seats NA - Injury Sheet',
      description: 'Sync injury reports from Seats NA Smartsheet',
      category: 'SEATS',
      type: 'INJURY'
    },
    {
      id: 'SEATS_NA_OBSERVATION',
      title: 'Seats NA - Observation Sheet',
      description: 'Sync observation reports from Seats NA Smartsheet',
      category: 'SEATS',
      type: 'OBSERVATION'
    },
    {
      id: 'SEATS_NA_RECOGNITION',
      title: 'Seats NA - Recognition Sheet',
      description: 'Sync recognition reports from Seats NA Smartsheet',
      category: 'SEATS',
      type: 'RECOGNITION'
    },
    {
      id: 'SHAKEPROOF_NA_INJURY',
      title: 'Shakeproof NA - Injury Sheet',
      description: 'Sync injury reports from Shakeproof NA Smartsheet',
      category: 'SHAKEPROOF',
      type: 'INJURY'
    },
    {
      id: 'SHAKEPROOF_NA_OBSERVATION',
      title: 'Shakeproof NA - Observation Sheet',
      description: 'Sync observation reports from Shakeproof NA Smartsheet',
      category: 'SHAKEPROOF',
      type: 'OBSERVATION'
    },
    {
      id: 'SHAKEPROOF_NA_RECOGNITION',
      title: 'Shakeproof NA - Recognition Sheet',
      description: 'Sync recognition reports from Shakeproof NA Smartsheet',
      category: 'SHAKEPROOF',
      type: 'RECOGNITION'
    }
  ];

  // Helper function to convert sheet type to SIMSCopyButton type
  const getSimsType = (sheetType: string): 'injury' | 'observation' | 'recognition' => {
    switch (sheetType.toUpperCase()) {
      case 'INJURY':
        return 'injury';
      case 'OBSERVATION':
        return 'observation';
      case 'RECOGNITION':
        return 'recognition';
      default:
        return 'injury'; // fallback
    }
  };

  const handleSyncAll = async () => {
    setIsGlobalSyncing(true);
    
    // First, sync all Smartsheet to DynamoDB
    for (const sheet of sheetConfigs) {
      setSyncStatus(prev => ({
        ...prev,
        [sheet.id]: { ...prev[sheet.id], smartsheetSync: 'loading' }
      }));
      
      try {
        const response = await fetch(`/api/smartsheet/sync-to-db?sheetType=${sheet.id}`);
        const result = await response.json();
        
        setSyncStatus(prev => ({
          ...prev,
          [sheet.id]: { 
            ...prev[sheet.id], 
            smartsheetSync: result.success ? 'success' : 'error',
            lastSynced: new Date().toISOString()
          }
        }));
      } catch (error) {
        setSyncStatus(prev => ({
          ...prev,
          [sheet.id]: { ...prev[sheet.id], smartsheetSync: 'error' }
        }));
      }
    }

    // Then, copy all to SIMS
    try {
      const response = await fetch('/api/smartsheet/copy-to-sims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all', skipDuplicates: true })
      });
      
      const result = await response.json();
      
      // Update all SIMS sync statuses
      sheetConfigs.forEach(sheet => {
        setSyncStatus(prev => ({
          ...prev,
          [sheet.id]: { 
            ...prev[sheet.id], 
            simsSync: result.success ? 'success' : 'error'
          }
        }));
      });
    } catch (error) {
      sheetConfigs.forEach(sheet => {
        setSyncStatus(prev => ({
          ...prev,
          [sheet.id]: { ...prev[sheet.id], simsSync: 'error' }
        }));
      });
    }
    
    setIsGlobalSyncing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Database className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Smartsheet Synchronization</h1>
        <p className="text-gray-600">Manage data synchronization between Smartsheet, DynamoDB, and SIMS</p>
      </div>

      {/* Global Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Global Actions</h2>
        <div className="flex gap-4">
          <button
            onClick={handleSyncAll}
            disabled={isGlobalSyncing}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGlobalSyncing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            {isGlobalSyncing ? 'Syncing All...' : 'Sync All Sheets'}
          </button>
          
          <SIMSCopyButton 
            type="all" 
            label="Copy All to SIMS" 
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          />
        </div>
      </div>

      {/* Individual Sheet Sync Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sheetConfigs.map((sheet) => (
          <div key={sheet.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  sheet.category === 'SEATS' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {sheet.category}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  sheet.type === 'INJURY' 
                    ? 'bg-red-100 text-red-800'
                    : sheet.type === 'OBSERVATION'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {sheet.type}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{sheet.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{sheet.description}</p>
            </div>

            {/* Sync Flow Visualization */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Smartsheet</span>
                <span>DynamoDB</span>
                <span>SIMS</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(syncStatus[sheet.id]?.smartsheetSync || 'idle')}
                  <span className="text-xs">
                    {syncStatus[sheet.id]?.smartsheetSync === 'loading' ? 'Syncing...' : 'Sync'}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  {getStatusIcon(syncStatus[sheet.id]?.simsSync || 'idle')}
                  <span className="text-xs">
                    {syncStatus[sheet.id]?.simsSync === 'loading' ? 'Copying...' : 'Copy'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">1. Smartsheet → DynamoDB</span>
                <SmartsheetSyncButton 
                  sheetType={sheet.id as any}
                  onStatusChange={(status) => 
                    setSyncStatus(prev => ({
                      ...prev,
                      [sheet.id]: { ...prev[sheet.id], smartsheetSync: status }
                    }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">2. DynamoDB → SIMS</span>
                <SIMSCopyButton 
                  type={getSimsType(sheet.type)} // ✅ Use helper function
                  sheetId={sheet.id}
                  onStatusChange={(status) => 
                    setSyncStatus(prev => ({
                      ...prev,
                      [sheet.id]: { ...prev[sheet.id], simsSync: status }
                    }))
                  }
                />
              </div>
            </div>

            {/* Last Synced Info */}
            {syncStatus[sheet.id]?.lastSynced && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Last synced: {new Date(syncStatus[sheet.id].lastSynced!).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions Section */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SIMSCopyButton 
            type="injury" 
            label="Copy All Injuries to SIMS"
            className="w-full px-4 py-3 bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
          />
          <SIMSCopyButton 
            type="observation" 
            label="Copy All Observations to SIMS"
            className="w-full px-4 py-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200"
          />
          <SIMSCopyButton 
            type="recognition" 
            label="Copy All Recognitions to SIMS"
            className="w-full px-4 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200"
          />
        </div>
      </div>
    </div>
  );
}
