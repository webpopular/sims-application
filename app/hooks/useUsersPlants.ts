// app/hooks/useUsersPlants.ts - Hook for Easy Integration
'use client';

import { useState, useEffect } from 'react';
import { getUsersWithPlants, type UsersPlantsParams, type UsersPlantsResult } from '@/lib/services/usersPlantsService';
import { getCurrentUser } from 'aws-amplify/auth';

export function useUsersPlants(params: Omit<UsersPlantsParams, 'userEmail'>) {
  const [usersPlants, setUsersPlants] = useState<UsersPlantsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await getCurrentUser();
      const userEmail = currentUser?.signInDetails?.loginId;

      const result = await getUsersWithPlants({
        ...params,
        userEmail
      });
      
      setUsersPlants(result);
      
      if (!result.success) {
        setError(result.error || 'Failed to load users with plants');
      }
    } catch (error) {
      console.error('❌ [useUsersPlants] Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [JSON.stringify(params)]);

  return {
    usersPlants,
    users: usersPlants?.users || [],
    plantSummary: usersPlants?.plantSummary || [],
    loading,
    error,
    refetch
  };
}
