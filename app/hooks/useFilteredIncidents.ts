// app/hooks/useFilteredIncidents.ts - Hook for Easy Integration
'use client';

import { useState, useEffect } from 'react';
import { getFilteredIncidents, type FilteredIncidentsParams, type FilteredIncidentsResult } from '@/lib/services/filteredIncidentsService';
import { getCurrentUser } from 'aws-amplify/auth';

export function useFilteredIncidents(params: Omit<FilteredIncidentsParams, 'userEmail'>) {
  const [incidents, setIncidents] = useState<FilteredIncidentsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await getCurrentUser();
      if (!currentUser?.signInDetails?.loginId) {
        throw new Error('No user logged in');
      }

      const result = await getFilteredIncidents({
        ...params,
        userEmail: currentUser.signInDetails.loginId
      });
      
      setIncidents(result);
      
      if (!result.success) {
        setError('Failed to load incidents');
      }
    } catch (error) {
      console.error('❌ [useFilteredIncidents] Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [JSON.stringify(params)]);

  return {
    incidents,
    loading,
    error,
    refetch
  };
}
