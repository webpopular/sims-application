// app/components/smartsheet/SIMSCopyButton.tsx
'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SIMSCopyButtonProps {
  type: 'injury' | 'observation' | 'recognition' | 'all';
  sheetId?: string;
  label?: string;
  className?: string;
  onStatusChange?: (status: 'idle' | 'loading' | 'success' | 'error') => void;
}

export default function SIMSCopyButton({ 
  type, 
  sheetId, 
  label, 
  className = '',
  onStatusChange 
}: SIMSCopyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleCopy = async () => {
    setIsLoading(true);
    onStatusChange?.('loading');

    try {
      const response = await fetch('/api/smartsheet/copy-to-sims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: type,
          skipDuplicates: true
        }),
      });

      const result = await response.json();
      setLastResult(result);

      if (result.success) {
        onStatusChange?.('success');
        toast.success(
          `Successfully copied ${result.totalCopied} records to SIMS. ` +
          `Skipped ${result.totalSkipped} duplicates.`
        );
      } else {
        onStatusChange?.('error');
        toast.error(`Copy failed: ${result.details || 'Unknown error'}`);
      }
    } catch (error) {
      onStatusChange?.('error');
      console.error('Copy error:', error);
      toast.error('Failed to copy data to SIMS');
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          Copying...
        </>
      );
    }

    if (lastResult?.success) {
      return (
        <>
          <CheckCircle className="w-4 h-4" />
          {label || `Copy ${type} to SIMS`}
        </>
      );
    }

    if (lastResult && !lastResult.success) {
      return (
        <>
          <AlertCircle className="w-4 h-4" />
          Retry Copy
        </>
      );
    }

    return (
      <>
        <Copy className="w-4 h-4" />
        {label || `Copy ${type} to SIMS`}
      </>
    );
  };

  const getButtonClass = () => {
    if (className) return className;

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
        onClick={handleCopy}
        disabled={isLoading}
        className={getButtonClass()}
        title={lastResult ? `Last result: ${lastResult.totalCopied} copied, ${lastResult.totalSkipped} skipped` : ''}
      >
        {getButtonContent()}
      </button>
      
      {lastResult && (
        <div className="absolute top-full left-0 mt-1 text-xs text-gray-500 whitespace-nowrap">
          {lastResult.success 
            ? `✓ ${lastResult.totalCopied} copied, ${lastResult.totalSkipped} skipped`
            : `✗ ${lastResult.totalErrors || 0} errors`
          }
        </div>
      )}
    </div>
  );
}
