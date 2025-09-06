// app/components/smartsheet/SyncButton.tsx
'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SmartsheetSyncButtonProps {
  sheetType: string;
  onStatusChange?: (status: 'idle' | 'loading' | 'success' | 'error') => void;
}

export default function SmartsheetSyncButton({ sheetType, onStatusChange }: SmartsheetSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleSync = async () => {
    setIsLoading(true);
    onStatusChange?.('loading');

    try {
      const response = await fetch(`/api/smartsheet/sync-to-db?sheetType=${sheetType}`);
      const result = await response.json();
      setLastResult(result);

      if (result.success) {
        onStatusChange?.('success');
        toast.success(
          `Successfully synced ${result.successCount} records from ${sheetType}. ` +
          `${result.errorCount} errors.`
        );
      } else {
        onStatusChange?.('error');
        toast.error(`Sync failed: ${result.details || 'Unknown error'}`);
      }
    } catch (error) {
      onStatusChange?.('error');
      console.error('Sync error:', error);
      toast.error('Failed to sync Smartsheet data');
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          Syncing...
        </>
      );
    }

    if (lastResult?.success) {
      return (
        <>
          <CheckCircle className="w-4 h-4" />
          Sync
        </>
      );
    }

    if (lastResult && !lastResult.success) {
      return (
        <>
          <AlertCircle className="w-4 h-4" />
          Retry
        </>
      );
    }

    return (
      <>
        <Database className="w-4 h-4" />
        Sync
      </>
    );
  };

  const getButtonClass = () => {
    const baseClass = "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    
    if (lastResult?.success) {
      return `${baseClass} bg-green-100 text-green-800 hover:bg-green-200`;
    }
    
    if (lastResult && !lastResult.success) {
      return `${baseClass} bg-red-100 text-red-800 hover:bg-red-200`;
    }
    
    return `${baseClass} bg-blue-600 text-white hover:bg-blue-700`;
  };

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={isLoading}
        className={getButtonClass()}
        title={lastResult ? `Last result: ${lastResult.successCount} synced, ${lastResult.errorCount} errors` : ''}
      >
        {getButtonContent()}
      </button>
      
      {lastResult && (
        <div className="absolute top-full left-0 mt-1 text-xs text-gray-500 whitespace-nowrap">
          {lastResult.success 
            ? `✓ ${lastResult.successCount} synced, ${lastResult.errorCount} errors`
            : `✗ Sync failed`
          }
        </div>
      )}
    </div>
  );
}
