// lib/services/filteredIncidentsService.ts - Complete Client-Side Implementation
'use client';

import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import { getCachedUserAccess } from './userAccessService';

const client = generateClient<Schema>();

export interface FilteredIncidentsParams {
  userEmail: string;
  limit?: number;
  status?: string;
  recordType?: string;
  plantFilter?: string;
  divisionFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  severityFilter?: string;
  categoryFilter?: string;
}

export interface FilteredIncidentsResult {
  success: boolean;
  data: any[];
  userAccess: {
    email: string;
    accessScope: string;
    hierarchyString: string;
    level: number;
  };
  totalCount: number;
  filters: {
    recordType: string;
    status: string;
    plant: string;
    division: string;
    dateFrom: string | null;
    dateTo: string | null;
    severity: string;
    category: string;
    appliedHierarchyFilter: any;
    userAccessScope: string;
  };
  debug: {
    queryMethod: string;
    dataSource: string;
    userAccessScope: string;
    totalRecordsFound: number;
    recordsAfterLimit: number;
  };
  environment: string;
}

// ✅ Get filtered incidents using client-side service
export async function getFilteredIncidents(params: FilteredIncidentsParams): Promise<FilteredIncidentsResult> {
  try {
    const {
      userEmail,
      limit = 100,
      status,
      recordType,
      plantFilter,
      divisionFilter,
      dateFrom,
      dateTo,
      severityFilter,
      categoryFilter
    } = params;

    console.log(`🔍 [FilteredIncidentsService] Getting filtered incidents for: ${userEmail}`);
    
    // Get user access first
    const userAccess = await getCachedUserAccess(userEmail);
    if (!userAccess) {
      throw new Error('User not found or inactive');
    }
    
    console.log(`🔍 [FilteredIncidentsService] Loading data for ${userAccess.accessScope} user:`, userEmail);
    console.log(`🔍 [FilteredIncidentsService] User hierarchy:`, userAccess.hierarchyString);

    let data: any[] = [];

    if (recordType === 'RECOGNITION') {
      try {
        console.log('📊 [FilteredIncidentsService] Fetching recognitions...');
        
        // ✅ Build filter for recognitions
        let filter: any = {
          isActive: { eq: true }
        };
        
        // Apply hierarchy-based filtering
        if (userAccess.accessScope !== 'ENTERPRISE') {
          filter.hierarchyString = { beginsWith: userAccess.hierarchyString };
        }
        
        const { data: recognitionData, errors } = await client.models.Recognition.list({
          filter,
          limit: 1000
        });
        
        if (errors) {
          console.error('❌ [FilteredIncidentsService] Recognition errors:', errors);
          data = [];
        } else {
          data = recognitionData || [];
          console.log(`✅ [FilteredIncidentsService] Found ${data.length} recognitions`);
        }
      } catch (error) {
        console.error('❌ [FilteredIncidentsService] Error fetching recognitions:', error);
        data = [];
      }
    } else {
      try {
        console.log('📊 [FilteredIncidentsService] Fetching submissions...');
        
        // ✅ Build filter for submissions
        let filter: any = {
          isActive: { eq: true }
        };
        
        // Add hierarchy filter
        if (userAccess.accessScope !== 'ENTERPRISE') {
          filter.hierarchyString = { beginsWith: userAccess.hierarchyString };
        }
        
        // Add record type filter
        if (recordType && recordType !== 'RECOGNITION') {
          filter.recordType = { eq: recordType };
        }
        
        // Add status filter
        if (status) {
          filter.status = { eq: status };
        }
        
        // Add plant filter
        if (plantFilter) {
          filter.plant = { eq: plantFilter };
        }
        
        // Add division filter
        if (divisionFilter) {
          filter.division = { eq: divisionFilter };
        }
        
        // Add severity filter
        if (severityFilter) {
          filter.severity = { eq: severityFilter };
        }
        
        // Add category filter
        if (categoryFilter) {
          filter.category = { eq: categoryFilter };
        }
        
        // Add date filters
        if (dateFrom) {
          filter.createdAt = { ...filter.createdAt, ge: dateFrom };
        }
        if (dateTo) {
          filter.createdAt = { ...filter.createdAt, le: dateTo };
        }
        
        const { data: submissionData, errors } = await client.models.Submission.list({
          filter,
          limit: 1000
        });
        
        if (errors) {
          console.error('❌ [FilteredIncidentsService] Submission errors:', errors);
          data = [];
        } else {
          data = submissionData || [];
          console.log(`✅ [FilteredIncidentsService] Found ${data.length} submissions`);
        }
      } catch (error) {
        console.error('❌ [FilteredIncidentsService] Error fetching submissions:', error);
        data = [];
      }
    }

    // Sort by creation date (newest first)
    const sortedData = data.sort((a, b) => {
      const dateA = new Date(a.createdAt || '').getTime();
      const dateB = new Date(b.createdAt || '').getTime();
      return dateB - dateA;
    });
    
    // Apply limit
    const limitedData = sortedData.slice(0, limit);

    console.log(`✅ [FilteredIncidentsService] Returning ${limitedData.length} records for user`);

    return {
      success: true,
      data: limitedData,
      userAccess: {
        email: userAccess.email,
        accessScope: userAccess.accessScope,
        hierarchyString: userAccess.hierarchyString,
        level: userAccess.level
      },
      totalCount: limitedData.length,
      filters: {
        recordType: recordType || 'all',
        status: status || 'all',
        plant: plantFilter || 'all',
        division: divisionFilter || 'all',
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        severity: severityFilter || 'all',
        category: categoryFilter || 'all',
        appliedHierarchyFilter: userAccess.hierarchyString,
        userAccessScope: userAccess.accessScope
      },
      debug: {
        queryMethod: 'GraphQL-Client-Side',
        dataSource: recordType === 'RECOGNITION' ? 'Recognition' : 'Submission',
        userAccessScope: userAccess.accessScope,
        totalRecordsFound: data.length,
        recordsAfterLimit: limitedData.length
      },
      environment: 'client-side'
    };

  } catch (error) {
    console.error('❌ [FilteredIncidentsService] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      data: [],
      userAccess: {
        email: params.userEmail,
        accessScope: 'UNKNOWN',
        hierarchyString: '',
        level: 5
      },
      totalCount: 0,
      filters: {
        recordType: params.recordType || 'all',
        status: params.status || 'all',
        plant: params.plantFilter || 'all',
        division: params.divisionFilter || 'all',
        dateFrom: params.dateFrom || null,
        dateTo: params.dateTo || null,
        severity: params.severityFilter || 'all',
        category: params.categoryFilter || 'all',
        appliedHierarchyFilter: null,
        userAccessScope: 'UNKNOWN'
      },
      debug: {
        queryMethod: 'GraphQL-Client-Side',
        dataSource: 'Error',
        userAccessScope: 'UNKNOWN',
        totalRecordsFound: 0,
        recordsAfterLimit: 0
      },
      environment: 'client-side'
    };
  }
}

// ✅ Cached version for performance
const filteredIncidentsCache = new Map<string, any>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedFilteredIncidents(params: FilteredIncidentsParams): Promise<FilteredIncidentsResult> {
  const cacheKey = JSON.stringify(params);
  const cached = filteredIncidentsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('🚀 [FilteredIncidentsService] Using cached data');
    return cached.data;
  }
  
  const freshData = await getFilteredIncidents(params);
  filteredIncidentsCache.set(cacheKey, {
    data: freshData,
    timestamp: Date.now()
  });
  
  console.log('💾 [FilteredIncidentsService] Cached fresh data');
  return freshData;
}

// ✅ Clear cache function
export function clearFilteredIncidentsCache() {
  filteredIncidentsCache.clear();
  console.log('🗑️ [FilteredIncidentsService] Cleared filtered incidents cache');
}
