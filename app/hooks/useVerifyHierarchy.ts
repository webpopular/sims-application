// app/hooks/useVerifyHierarchy.ts - Hook for Easy Integration
'use client';

import { useState, useEffect } from 'react';
import { verifyHierarchyData, type VerifyHierarchyParams, type VerifyHierarchyResult } from '@/lib/services/verifyHierarchyService';
import { getCurrentUser } from 'aws-amplify/auth';

export function useVerifyHierarchy() {
  const [verifyResult, setVerifyResult] = useState<VerifyHierarchyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyForCurrentUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await getCurrentUser();
      if (!currentUser?.signInDetails?.loginId) {
        throw new Error('No user logged in');
      }

      console.log(`🔍 [useVerifyHierarchy] Verifying hierarchy for: ${currentUser.signInDetails.loginId}`);
      
      const params: VerifyHierarchyParams = {
        userEmail: currentUser.signInDetails.loginId
      };

      const result = await verifyHierarchyData(params);
      setVerifyResult(result);
      
      if (!result.success) {
        setError(result.error || 'Failed to verify hierarchy data');
      }
    } catch (error) {
      console.error('❌ [useVerifyHierarchy] Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const verifyForUser = async (userEmail: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 [useVerifyHierarchy] Verifying hierarchy for: ${userEmail}`);
      
      const params: VerifyHierarchyParams = {
        userEmail
      };

      const result = await verifyHierarchyData(params);
      setVerifyResult(result);
      
      if (!result.success) {
        setError(result.error || 'Failed to verify hierarchy data');
      }
    } catch (error) {
      console.error('❌ [useVerifyHierarchy] Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return {
    verifyResult,
    loading,
    error,
    verifyForCurrentUser,
    verifyForUser
  };
}
