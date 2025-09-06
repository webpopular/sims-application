// app/hooks/useDataAccess.ts - Complete Client-Side Service Implementation
'use client';

import { useState, useEffect } from 'react';
import { useUserAccess } from './useUserAccess';
import { getFilteredIncidents, type FilteredIncidentsParams } from '@/lib/services/filteredIncidentsService';
import { getCurrentUser } from 'aws-amplify/auth';

// ✅ Define proper types for your data based on your RBAC structure
interface SubmissionData {
  id: string;
  submissionId: string;
  recordType: 'INJURY_REPORT' | 'OBSERVATION_REPORT' | 'SAFETY_RECOGNITION';
  status: string;
  hierarchyString: string;
  createdAt: string;
  dateOfIncident?: string;
  location?: string;
  plant?: string;
  division?: string;
  platform?: string;
  segment?: string;
  enterprise?: string;
  severity?: string;
  category?: string;
  description?: string;
  reportedBy?: string;
  [key: string]: any;
}

interface RecognitionData {
  id: string;
  recognitionId: string;
  hierarchyString: string;
  createdAt: string;
  yourName?: string;
  recognizedPersonName?: string;
  plant?: string;
  division?: string;
  platform?: string;
  segment?: string;
  enterprise?: string;
  recognitionType?: string;
  description?: string;
  [key: string]: any;
}

interface DataAccessFilters {
  recordType?: string;
  status?: string;
  plantFilter?: string;
  divisionFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  severityFilter?: string;
  categoryFilter?: string;
  limit?: number;
}

export function useDataAccess() {
  const { userAccess, isReady, loading: userLoading } = useUserAccess();
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [recognitions, setRecognitions] = useState<RecognitionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFilters, setLastFilters] = useState<DataAccessFilters | null>(null);

  const loadUserData = async (filters?: DataAccessFilters) => {
    if (!isReady || !userAccess || userLoading) {
      console.log('🔄 [DataAccess] Waiting for user access to be ready...');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setLastFilters(filters || null);
      
      console.log(`🔍 [DataAccess] Loading data for ${userAccess.accessScope} user:`, userAccess.email);
      console.log(`🏢 [DataAccess] User hierarchy:`, userAccess.hierarchyString);
      console.log(`🔍 [DataAccess] Applied filters:`, filters);
      
      // Get current user email for service call
      const currentUser = await getCurrentUser();
      if (!currentUser?.signInDetails?.loginId) {
        throw new Error('No authenticated user found');
      }

      // ✅ Load submissions using client-side service
      if (!filters?.recordType || filters.recordType !== 'RECOGNITION') {
        console.log('📊 [DataAccess] Loading submissions...');
        
        const submissionParams: FilteredIncidentsParams = {
          userEmail: currentUser.signInDetails.loginId,
          limit: filters?.limit || 100,
          status: filters?.status,
          recordType: filters?.recordType && filters.recordType !== 'RECOGNITION' ? filters.recordType : undefined,
          plantFilter: filters?.plantFilter,
          divisionFilter: filters?.divisionFilter,
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo,
          severityFilter: filters?.severityFilter,
          categoryFilter: filters?.categoryFilter
        };

        const submissionResult = await getFilteredIncidents(submissionParams);
        
        if (submissionResult.success) {
          // ✅ Properly type the data with enhanced type guards
          const submissionData = (submissionResult.data || []).filter((item: any): item is SubmissionData => {
            const isValidSubmission = item && 
              typeof item === 'object' && 
              'id' in item &&
              'recordType' in item &&
              ['INJURY_REPORT', 'OBSERVATION_REPORT', 'SAFETY_RECOGNITION'].includes(item.recordType);
            
            if (!isValidSubmission) {
              console.log(`❌ [DataAccess] Invalid submission filtered out:`, item?.id);
            }
            
            return isValidSubmission;
          });
          
          setSubmissions(submissionData);
          console.log(`✅ [DataAccess] Loaded ${submissionData.length} submissions`);
        } else {
          console.error('❌ [DataAccess] Failed to load submissions:', submissionResult);
          setSubmissions([]);
        }
      }
      
      // ✅ Load recognitions using client-side service
      if (!filters?.recordType || filters.recordType === 'RECOGNITION') {
        console.log('📊 [DataAccess] Loading recognitions...');
        
        const recognitionParams: FilteredIncidentsParams = {
          userEmail: currentUser.signInDetails.loginId,
          recordType: 'RECOGNITION',
          limit: filters?.limit || 100,
          plantFilter: filters?.plantFilter,
          divisionFilter: filters?.divisionFilter,
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo
        };

        const recognitionResult = await getFilteredIncidents(recognitionParams);
        
        if (recognitionResult.success) {
          // ✅ Properly type the recognition data
          const recognitionData = (recognitionResult.data || []).filter((item: any): item is RecognitionData => {
            const isValidRecognition = item && 
              typeof item === 'object' && 
              'id' in item &&
              (item.recognitionId || item.recordType === 'RECOGNITION');
            
            if (!isValidRecognition) {
              console.log(`❌ [DataAccess] Invalid recognition filtered out:`, item?.id);
            }
            
            return isValidRecognition;
          });
          
          setRecognitions(recognitionData);
          console.log(`✅ [DataAccess] Loaded ${recognitionData.length} recognitions`);
        } else {
          console.error('❌ [DataAccess] Failed to load recognitions:', recognitionResult);
          setRecognitions([]);
        }
      }
      
      console.log(`✅ [DataAccess] Data loading completed:`, {
        submissions: submissions.length,
        recognitions: recognitions.length,
        userLevel: userAccess.level,
        accessScope: userAccess.accessScope,
        hierarchy: userAccess.hierarchyString,
        appliedFilters: filters
      });
      
    } catch (err) {
      console.error('❌ [DataAccess] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setSubmissions([]);
      setRecognitions([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Enhanced effect with better dependency management
  useEffect(() => {
    if (isReady && userAccess && !userLoading) {
      console.log('🚀 [DataAccess] User access ready, loading initial data...');
      loadUserData();
    }
  }, [isReady, userAccess?.hierarchyString, userAccess?.email, userLoading]);

  // ✅ Helper methods for specific data types with enhanced filtering
  const getInjuryReports = (additionalFilters?: { status?: string; severity?: string }) => {
    let reports = submissions.filter(s => s.recordType === 'INJURY_REPORT');
    
    if (additionalFilters?.status) {
      reports = reports.filter(r => r.status === additionalFilters.status);
    }
    
    if (additionalFilters?.severity) {
      reports = reports.filter(r => r.severity === additionalFilters.severity);
    }
    
    return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getObservationReports = (additionalFilters?: { status?: string; category?: string }) => {
    let reports = submissions.filter(s => s.recordType === 'OBSERVATION_REPORT');
    
    if (additionalFilters?.status) {
      reports = reports.filter(r => r.status === additionalFilters.status);
    }
    
    if (additionalFilters?.category) {
      reports = reports.filter(r => r.category === additionalFilters.category);
    }
    
    return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getSafetyRecognitions = (additionalFilters?: { recognitionType?: string }) => {
    let safetyRecognitions = submissions.filter(s => s.recordType === 'SAFETY_RECOGNITION');
    
    if (additionalFilters?.recognitionType) {
      safetyRecognitions = safetyRecognitions.filter(r => r.category === additionalFilters.recognitionType);
    }
    
    return safetyRecognitions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // ✅ Enhanced data summary methods
  const getDataSummary = () => {
    const totalSubmissions = submissions.length;
    const totalRecognitions = recognitions.length;
    const injuryReports = getInjuryReports().length;
    const observationReports = getObservationReports().length;
    const safetyRecognitions = getSafetyRecognitions().length;
    
    const statusCounts = submissions.reduce((acc, submission) => {
      acc[submission.status] = (acc[submission.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalSubmissions,
      totalRecognitions,
      injuryReports,
      observationReports,
      safetyRecognitions,
      statusCounts,
      userAccessScope: userAccess?.accessScope,
      userLevel: userAccess?.level,
      userHierarchy: userAccess?.hierarchyString
    };
  };

  // ✅ Enhanced filtering method
  const filterData = (filters: DataAccessFilters) => {
    console.log('🔍 [DataAccess] Applying new filters:', filters);
    loadUserData(filters);
  };

  // ✅ Refresh method that maintains current filters
  const refreshData = () => {
    console.log('🔄 [DataAccess] Refreshing data with current filters...');
    loadUserData(lastFilters || undefined);
  };

  return {
    // ✅ Core data
    submissions,
    recognitions,
    loading: loading || userLoading,
    error,
    userAccess,
    
    // ✅ Data loading methods
    refetch: loadUserData,
    filterData,
    refreshData,
    
    // ✅ Helper methods for specific data types
    getInjuryReports,
    getObservationReports,
    getSafetyRecognitions,
    
    // ✅ Enhanced utility methods
    getDataSummary,
    
    // ✅ Status checks
    isReady: isReady && !userLoading,
    hasData: submissions.length > 0 || recognitions.length > 0,
    
    // ✅ Current filter state
    currentFilters: lastFilters,
    
    // ✅ RBAC-based access checks
    canViewData: userAccess?.permissions?.canViewOpenClosedReports || false,
    canReportIncidents: userAccess?.permissions?.canReportInjury || userAccess?.permissions?.canReportObservation || false,
    canCreateRecognitions: userAccess?.permissions?.canSafetyRecognition || false
  };
}

// ✅ Export types for use in other components
export type { SubmissionData, RecognitionData, DataAccessFilters };
