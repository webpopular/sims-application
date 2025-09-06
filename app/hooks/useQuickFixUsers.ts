// app/hooks/useQuickFixUsers.ts - Hook for Easy Integration
'use client';

import { useState, useEffect } from 'react';
import { getQuickFixUsers, type QuickFixUsersParams, type QuickFixUsersResult } from '@/lib/services/quickFixUsersService';
import { getCurrentUser } from 'aws-amplify/auth';

export function useQuickFixUsers(params: Omit<QuickFixUsersParams, 'userEmail'> = {}) {
  const [quickFixUsers, setQuickFixUsers] = useState<QuickFixUsersResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await getCurrentUser();
      const userEmail = currentUser?.signInDetails?.loginId;

      const result = await getQuickFixUsers({
        ...params,
        userEmail
      });
      
      setQuickFixUsers(result);
      
      if (!result.success) {
        setError(result.error || 'Failed to load Quick Fix users');
      }
    } catch (error) {
      console.error('❌ [useQuickFixUsers] Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [JSON.stringify(params)]);

  return {
    quickFixUsers,
    users: quickFixUsers?.users || [],
    quickFixRoles: quickFixUsers?.quickFixRoles || [],
    loading,
    error,
    refetch
  };
}
