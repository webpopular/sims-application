// hooks/useSmartSheetData.ts
import { useState, useEffect } from 'react';
import type { SmartSheetResponse } from '../types/smartsheet';


export function useSmartSheetData() {
    const [data, setData] = useState<SmartSheetResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    async function fetchSmartSheetData() {
        try {
            const response = await fetch('/api/smartsheet');
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch SmartSheet data'));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSmartSheetData();
    }, []);

    return { data, loading, error, refetch: fetchSmartSheetData };
}