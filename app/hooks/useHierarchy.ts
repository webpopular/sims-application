// app/hooks/useHierarchy.ts - Hook for Easy Integration
'use client';

import { useState, useEffect } from 'react';
import { getHierarchyData, type HierarchyParams, type HierarchyResult } from '@/lib/services/hierarchyService';
import { getCurrentUser } from 'aws-amplify/auth';

export function useHierarchy(params: Omit<HierarchyParams, 'userEmail'>) {
  const [hierarchy, setHierarchy] = useState<HierarchyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await getCurrentUser();
      const userEmail = currentUser?.signInDetails?.loginId;

      const result = await getHierarchyData({
        ...params,
        userEmail
      });
      
      setHierarchy(result);
      
      if (!result.success) {
        setError('Failed to load hierarchy data');
      }
    } catch (error) {
      console.error('❌ [useHierarchy] Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [JSON.stringify(params)]);

  return {
    hierarchy,
    hierarchies: hierarchy?.hierarchies || [],
    loading,
    error,
    refetch
  };
}

