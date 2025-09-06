// lib/services/verifyHierarchyService.ts - Complete Client-Side Implementation
'use client';

import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import { getCachedUserAccess } from './userAccessService';

const client = generateClient<Schema>();

export interface VerifyHierarchyParams {
  userEmail: string;
}

export interface VerifyHierarchyResult {
  success: boolean;
  message: string;
  totalRecords: number;
  rawDataCounts: {
    submissions: number;
    recognitions: number;
    total: number;
  };
  userAccess: {
    email: string;
    name: string;
    roleTitle: string;
    level: number;
    plant: string;
    division: string;
    platform: string;
    segment: string;
    enterprise: string;
    hierarchyString: string;
    accessScope: string;
  };
  hierarchyAnalysis: {
    allHierarchies: string[];
    underscoreHierarchies: Array<{
      submissionId: string;
      hierarchyString: string;
      createdBy: string;
      recordType: string;
    }>;
    smartComponentsRecords: Array<{
      submissionId: string;
      hierarchyString: string;
      createdBy: string;
    }>;
    hierarchyDistribution: Record<string, number>;
    recordTypeDistribution: Record<string, number>;
    statusDistribution: Record<string, number>;
  };
  appliedFilters: {
    userHierarchy: string;
    userAccessScope: string;
    hierarchyFilterApplied: boolean;
  };
  sampleData: Array<{
    submissionId: string;
    hierarchyString: string;
    recordType: string;
    createdBy: string;
    status: string;
    createdAt: string;
  }>;
  environment: string;
  tableNames: {
    submission: string;
    recognition: string;
    userRole: string;
  };
  error?: string;
}

// ✅ Get access scope helper function
function getAccessScope(level: number): string {
  switch (level) {
    case 1: return 'ENTERPRISE';
    case 2: return 'SEGMENT';
    case 3: return 'PLATFORM';
    case 4: return 'DIVISION';
    case 5: return 'PLANT';
    default: return 'PLANT';
  }
}

// ✅ Main verify hierarchy service function
export async function verifyHierarchyData(params: VerifyHierarchyParams): Promise<VerifyHierarchyResult> {
  try {
    const { userEmail } = params;

    console.log(`🔍 [VerifyHierarchyService] Verifying data for user: ${userEmail}`);
    
    // ✅ Get user access using client-side service
    const serviceUserAccess = await getCachedUserAccess(userEmail);
    if (!serviceUserAccess) {
      throw new Error('User not found or inactive');
    }

    const userAccess = {
      email: serviceUserAccess.email,
      name: serviceUserAccess.name,
      roleTitle: serviceUserAccess.roleTitle,
      level: serviceUserAccess.level,
      plant: serviceUserAccess.plant,
      division: serviceUserAccess.division,
      platform: serviceUserAccess.platform,
      segment: serviceUserAccess.segment,
      enterprise: serviceUserAccess.enterprise,
      hierarchyString: serviceUserAccess.hierarchyString,
      accessScope: serviceUserAccess.accessScope
    };

    console.log(`✅ [VerifyHierarchyService] User access for ${userEmail}:`, userAccess);

    // ✅ Get all submissions data using GraphQL client
    const { data: submissionsData, errors: submissionErrors } = await client.models.Submission.list({
      limit: 10000
    });

    if (submissionErrors) {
      console.error('❌ [VerifyHierarchyService] Submission errors:', submissionErrors);
    }

    // ✅ Get all recognitions data using GraphQL client
    const { data: recognitionsData, errors: recognitionErrors } = await client.models.Recognition.list({
      limit: 10000
    });

    if (recognitionErrors) {
      console.error('❌ [VerifyHierarchyService] Recognition errors:', recognitionErrors);
    }

    const submissions = submissionsData || [];
    const recognitions = recognitionsData || [];
    const allData = [...submissions, ...recognitions];

    console.log(`📊 [VerifyHierarchyService] Found ${submissions.length} submissions and ${recognitions.length} recognitions`);

    // ✅ Apply hierarchy-based filtering based on user access level
    let filteredData = allData;
    
    if (userAccess.accessScope !== 'ENTERPRISE') {
      filteredData = allData.filter(item => {
        if (!item.hierarchyString) return false;
        return item.hierarchyString.startsWith(userAccess.hierarchyString);
      });
    }

    console.log(`📊 [VerifyHierarchyService] After hierarchy filtering: ${filteredData.length} records`);

    // ✅ Analyze the data - EXACT same logic as original
    const hierarchyAnalysis = {
      allHierarchies: [...new Set(filteredData.map((item: any) => item.hierarchyString).filter(Boolean))],
      underscoreHierarchies: filteredData.filter((item: any) => item.hierarchyString?.includes('_')).map((item: any) => ({
        submissionId: item.submissionId || item.recognitionId || item.id,
        hierarchyString: item.hierarchyString || '',
        createdBy: item.createdBy || '',
        recordType: item.recordType || 'RECOGNITION'
      })),
      smartComponentsRecords: filteredData.filter((item: any) => 
        item.hierarchyString?.includes('Smart Components')
      ).map((item: any) => ({
        submissionId: item.submissionId || item.recognitionId || item.id,
        hierarchyString: item.hierarchyString || '',
        createdBy: item.createdBy || ''
      })),
      hierarchyDistribution: filteredData.reduce((acc: any, item: any) => {
        const hierarchy = item.hierarchyString || 'NO_HIERARCHY';
        acc[hierarchy] = (acc[hierarchy] || 0) + 1;
        return acc;
      }, {}),
      recordTypeDistribution: filteredData.reduce((acc: any, item: any) => {
        const recordType = item.recordType || 'RECOGNITION';
        acc[recordType] = (acc[recordType] || 0) + 1;
        return acc;
      }, {}),
      statusDistribution: filteredData.reduce((acc: any, item: any) => {
        const status = item.status || 'NO_STATUS';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {})
    };

    return {
      success: true,
      message: `Data verification for user: ${userEmail}`,
      totalRecords: filteredData.length,
      rawDataCounts: {
        submissions: submissions.length,
        recognitions: recognitions.length,
        total: allData.length
      },
      userAccess,
      hierarchyAnalysis,
      appliedFilters: {
        userHierarchy: userAccess.hierarchyString,
        userAccessScope: userAccess.accessScope,
        hierarchyFilterApplied: userAccess.accessScope !== 'ENTERPRISE'
      },
      sampleData: filteredData.slice(0, 10).map((item: any) => ({
        submissionId: item.submissionId || item.recognitionId || item.id,
        hierarchyString: item.hierarchyString || '',
        recordType: item.recordType || 'RECOGNITION',
        createdBy: item.createdBy || '',
        status: item.status || '',
        createdAt: item.createdAt || ''
      })),
      environment: 'client-side',
      tableNames: {
        submission: 'Submission (GraphQL)',
        recognition: 'Recognition (GraphQL)',
        userRole: 'UserRole (GraphQL)'
      }
    };

  } catch (error) {
    console.error('❌ [VerifyHierarchyService] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      message: `Data verification failed for user: ${params.userEmail}`,
      totalRecords: 0,
      rawDataCounts: {
        submissions: 0,
        recognitions: 0,
        total: 0
      },
      userAccess: {
        email: params.userEmail,
        name: '',
        roleTitle: '',
        level: 5,
        plant: '',
        division: '',
        platform: '',
        segment: '',
        enterprise: '',
        hierarchyString: '',
        accessScope: 'PLANT'
      },
      hierarchyAnalysis: {
        allHierarchies: [],
        underscoreHierarchies: [],
        smartComponentsRecords: [],
        hierarchyDistribution: {},
        recordTypeDistribution: {},
        statusDistribution: {}
      },
      appliedFilters: {
        userHierarchy: '',
        userAccessScope: 'PLANT',
        hierarchyFilterApplied: false
      },
      sampleData: [],
      environment: 'client-side',
      tableNames: {
        submission: 'Submission (GraphQL)',
        recognition: 'Recognition (GraphQL)',
        userRole: 'UserRole (GraphQL)'
      },
      error: `Failed to verify hierarchy data: ${errorMessage}`
    };
  }
}

// ✅ Cached version for performance
const verifyHierarchyCache = new Map<string, VerifyHierarchyResult>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedVerifyHierarchyData(params: VerifyHierarchyParams): Promise<VerifyHierarchyResult> {
  const cacheKey = params.userEmail;
  const cached = verifyHierarchyCache.get(cacheKey);
  
  if (cached && cached.success && (Date.now() - (cached as any).timestamp) < CACHE_DURATION) {
    console.log('🚀 [VerifyHierarchyService] Using cached data');
    return cached;
  }
  
  const freshData = await verifyHierarchyData(params);
  if (freshData.success) {
    (freshData as any).timestamp = Date.now();
    verifyHierarchyCache.set(cacheKey, freshData);
    console.log('💾 [VerifyHierarchyService] Cached fresh data');
  }
  
  return freshData;
}

// ✅ Clear cache function
export function clearVerifyHierarchyCache() {
  verifyHierarchyCache.clear();
  console.log('🗑️ [VerifyHierarchyService] Cleared verify hierarchy cache');
}
