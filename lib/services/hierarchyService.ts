// lib/services/hierarchyService.ts - Complete Client-Side Implementation
'use client';

import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import { getCachedUserAccess } from './userAccessService';

const client = generateClient<Schema>();

export interface HierarchyItem {
  id: string;
  hierarchyString: string;
  level: number;
  levelName: string;
  name: string;
  parentHierarchyString: string;
  plant: string;
  division: string;
  platform: string;
  segment: string;
  enterprise: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface HierarchyParams {
  level?: number;
  parentHierarchy?: string;
  userHierarchy?: string;
  userLevel?: number;
  userEmail?: string;
}

export interface HierarchyResult {
  success: boolean;
  hierarchies: HierarchyItem[];
  count: number;
  debug: {
    processingTime: number;
    queryMethod: string;
    dataSource: string;
    filtersApplied: any;
    totalItems: number;
    filteredItems: number;
  };
  environment: string;
  tableNames: {
    hierarchy: string;
  };
}

// ✅ Preserved original helper functions with same logic
function getAccessibleHierarchies(userHierarchy: string, userLevel: number): string[] {
  switch (userLevel) {
    case 1: // Enterprise
      return ['ITW>'];
    case 2: // Segment
    case 3: // Platform
    case 4: // Division
      return [userHierarchy];
    case 5: // Plant
      return [userHierarchy];
    default:
      return [userHierarchy];
  }
}

function filterByUserAccess(items: any[], userHierarchy: string, userLevel: number): any[] {
  switch (userLevel) {
    case 1: // Enterprise - see all
      return items;
    case 2: // Segment
    case 3: // Platform
    case 4: // Division
      return items.filter(item => 
        (item.hierarchyString || '').startsWith(userHierarchy)
      );
    case 5: // Plant
      return items.filter(item => 
        item.hierarchyString === userHierarchy ||
        userHierarchy.startsWith(item.hierarchyString || '')
      );
    default:
      return items.filter(item => 
        item.hierarchyString === userHierarchy
      );
  }
}

// ✅ Main hierarchy service function - converted to client-side
export async function getHierarchyData(params: HierarchyParams): Promise<HierarchyResult> {
  const startTime = Date.now();
  
  try {
    const {
      level,
      parentHierarchy,
      userHierarchy,
      userLevel,
      userEmail
    } = params;

    console.log('🔍 [HierarchyService] API endpoint called - fetching hierarchy data...');
    console.log(`🔧 [HierarchyService] Using GraphQL client with params:`, params);
    
    // ✅ Build filter based on parameters - EXACT same logic as original
    let filter: any = {
      isActive: { eq: true }
    };

    let filtersApplied: any = { isActive: true };

    if (level) {
      // Get all records at specific level
      console.log(`📊 [HierarchyService] Fetching hierarchy records at level: ${level}`);
      filter.level = { eq: level };
      filtersApplied.level = level;
    } else if (parentHierarchy) {
      // Get children of specific parent
      console.log(`📊 [HierarchyService] Fetching children of parent: ${parentHierarchy}`);
      filter.parentHierarchyString = { eq: parentHierarchy };
      filtersApplied.parentHierarchy = parentHierarchy;
    } else if (userHierarchy && userLevel) {
      // Get accessible hierarchies for user
      console.log(`📊 [HierarchyService] Fetching accessible hierarchies for user: ${userHierarchy} (Level ${userLevel})`);
      filtersApplied.userHierarchy = userHierarchy;
      filtersApplied.userLevel = userLevel;
    } else {
      // Get all active records
      console.log('📊 [HierarchyService] Fetching all active hierarchy records');
    }

    // ✅ Query EnterpriseToPlantHierarchy using GraphQL client
    const { data: hierarchyData, errors } = await client.models.EnterpriseToPlantHierarchy.list({
      filter,
      limit: 1000
    });

    if (errors) {
      console.error('❌ [HierarchyService] Hierarchy query errors:', errors);
      throw new Error('Failed to fetch hierarchy data');
    }

    let items = hierarchyData || [];
    console.log(`📊 [HierarchyService] Found ${items.length} hierarchy records`);

    // ✅ Filter by user access if specified - EXACT same logic
    if (userHierarchy && userLevel) {
      items = filterByUserAccess(items, userHierarchy, userLevel);
      console.log(`📊 [HierarchyService] After user access filtering: ${items.length} records`);
    }

    // ✅ Enhanced user access filtering if email provided
    if (userEmail && !userHierarchy) {
      const userAccess = await getCachedUserAccess(userEmail);
      if (userAccess) {
        console.log(`🔍 [HierarchyService] Applying user access filtering for: ${userAccess.accessScope}`);
        items = filterByUserAccess(items, userAccess.hierarchyString, userAccess.level);
        console.log(`📊 [HierarchyService] After email-based filtering: ${items.length} records`);
        filtersApplied.userAccessScope = userAccess.accessScope;
      }
    }

    // ✅ Sort by level and sortOrder - EXACT same logic
    items.sort((a, b) => {
      if ((a.level || 0) !== (b.level || 0)) return (a.level || 0) - (b.level || 0);
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    // ✅ Process and format items
    const processedItems = items.map(item => ({
      id: item.id || '',
      hierarchyString: item.hierarchyString || '',
      level: item.level || 0,
      levelName: item.levelName || '',
      name: item.name || '',
      parentHierarchyString: item.parentHierarchyString || '',
      plant: item.plant || '',
      division: item.division || '',
      platform: item.platform || '',
      segment: item.segment || '',
      enterprise: item.enterprise || '',
      isActive: item.isActive ?? true,
      sortOrder: item.sortOrder || 0,
      createdAt: item.createdAt || '',
      updatedAt: item.updatedAt || ''
    }));

    const totalTime = Date.now() - startTime;
    console.log(`✅ [HierarchyService] Successfully processed hierarchy data in ${totalTime}ms`);

    return {
      success: true,
      hierarchies: processedItems,
      count: processedItems.length,
      debug: {
        processingTime: totalTime,
        queryMethod: 'GraphQL-Client-Side',
        dataSource: 'EnterpriseToPlantHierarchy',
        filtersApplied,
        totalItems: hierarchyData?.length || 0,
        filteredItems: processedItems.length
      },
      environment: 'client-side',
      tableNames: {
        hierarchy: 'EnterpriseToPlantHierarchy (GraphQL)'
      }
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ [HierarchyService] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      hierarchies: [],
      count: 0,
      debug: {
        processingTime: totalTime,
        queryMethod: 'GraphQL-Client-Side',
        dataSource: 'Error',
        filtersApplied: params,
        totalItems: 0,
        filteredItems: 0
      },
      environment: 'client-side',
      tableNames: {
        hierarchy: 'EnterpriseToPlantHierarchy (GraphQL)'
      }
    };
  }
}

// ✅ Convenience functions for common use cases
export async function getHierarchiesByLevel(level: number, userEmail?: string): Promise<HierarchyItem[]> {
  const result = await getHierarchyData({ level, userEmail });
  return result.hierarchies;
}

export async function getChildrenOfParent(parentHierarchy: string, userEmail?: string): Promise<HierarchyItem[]> {
  const result = await getHierarchyData({ parentHierarchy, userEmail });
  return result.hierarchies;
}

export async function getAccessibleHierarchiesForUser(userHierarchy: string, userLevel: number): Promise<HierarchyItem[]> {
  const result = await getHierarchyData({ userHierarchy, userLevel });
  return result.hierarchies;
}

export async function getAllPlants(userEmail?: string): Promise<HierarchyItem[]> {
  return getHierarchiesByLevel(5, userEmail);
}

export async function getAllDivisions(userEmail?: string): Promise<HierarchyItem[]> {
  return getHierarchiesByLevel(4, userEmail);
}

export async function getAllPlatforms(userEmail?: string): Promise<HierarchyItem[]> {
  return getHierarchiesByLevel(3, userEmail);
}

// ✅ Cached version for performance
const hierarchyCache = new Map<string, HierarchyResult>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function getCachedHierarchyData(params: HierarchyParams): Promise<HierarchyResult> {
  const cacheKey = JSON.stringify(params);
  const cached = hierarchyCache.get(cacheKey);
  
  if (cached && cached.success && (Date.now() - cached.debug.processingTime) < CACHE_DURATION) {
    console.log('🚀 [HierarchyService] Using cached data');
    return cached;
  }
  
  const freshData = await getHierarchyData(params);
  if (freshData.success) {
    hierarchyCache.set(cacheKey, freshData);
    console.log('💾 [HierarchyService] Cached fresh data');
  }
  
  return freshData;
}

// ✅ Clear cache function
export function clearHierarchyCache() {
  hierarchyCache.clear();
  console.log('🗑️ [HierarchyService] Cleared hierarchy cache');
}
