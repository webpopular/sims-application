// lib/services/usersPlantsService.ts - Complete Client-Side Implementation
'use client';

import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import { getCachedUserAccess } from './userAccessService';

const client = generateClient<Schema>();

export interface UserWithPlant {
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
  cognitoGroups: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlantSummary {
  plantName: string;
  userCount: number;
  levels: number[];
  roles: string[];
}

export interface UsersPlantsParams {
  plantFilter?: string;
  levelFilter?: string;
  divisionFilter?: string;
  userEmail?: string;
}

export interface UsersPlantsResult {
  success: boolean;
  users: UserWithPlant[];
  count: number;
  plantSummary: PlantSummary[];
  filters: {
    plant?: string;
    level?: string;
    division?: string;
  };
  totalScanned: number;
  debug: {
    queryMethod: string;
    dataSource: string;
    totalUsersScanned: number;
    finalUsersWithPlants: number;
    processingTime: number;
    userAccessScope?: string;
  };
  environment: string;
  tableNames: {
    userRole: string;
  };
  error?: string;
}

// ✅ Get users with plant assignments using client-side service
export async function getUsersWithPlants(params: UsersPlantsParams): Promise<UsersPlantsResult> {
  const startTime = Date.now();
  
  try {
    const {
      plantFilter,
      levelFilter,
      divisionFilter,
      userEmail
    } = params;

    console.log('🔍 [UsersPlantsService] API endpoint called - fetching users with plant assignments...');
    console.log('🔧 [UsersPlantsService] Using GraphQL client');
    console.log('🔍 [UsersPlantsService] Filters:', { plantFilter, levelFilter, divisionFilter });
    
    // Get user access for filtering if email provided
    let userAccess = null;
    if (userEmail) {
      userAccess = await getCachedUserAccess(userEmail);
      console.log(`🔍 [UsersPlantsService] User access scope: ${userAccess?.accessScope}`);
    }
    
    // ✅ Build filter for users
    let filter: any = {
      isActive: { eq: true }
    };
    
    if (plantFilter) {
      filter.plant = { eq: plantFilter };
    }
    
    if (levelFilter) {
      filter.level = { eq: parseInt(levelFilter) };
    }
    
    if (divisionFilter) {
      filter.division = { eq: divisionFilter };
    }
    
    // Apply user access filtering if provided
    if (userAccess && userAccess.accessScope !== 'ENTERPRISE') {
      switch (userAccess.accessScope) {
        case 'SEGMENT':
          if (userAccess.segment) {
            filter.segment = { eq: userAccess.segment };
          }
          break;
        case 'PLATFORM':
          if (userAccess.platform) {
            filter.platform = { eq: userAccess.platform };
          }
          break;
        case 'DIVISION':
          if (userAccess.division) {
            filter.division = { eq: userAccess.division };
          }
          break;
        case 'PLANT':
          if (userAccess.hierarchyString) {
            filter.hierarchyString = { eq: userAccess.hierarchyString };
          }
          break;
      }
    }
    
    console.log(`🔍 [UsersPlantsService] Final filter:`, filter);
    
    const { data: userRoles, errors } = await client.models.UserRole.list({
      filter,
      limit: 1000
    });
    
    if (errors) {
      console.error('❌ [UsersPlantsService] UserRole query errors:', errors);
      throw new Error('Failed to fetch users with plants');
    }
    
    console.log(`📊 [UsersPlantsService] Found ${userRoles?.length || 0} users`);

    const usersWithPlants = (userRoles || [])
      .filter(user => {
        const isValid = user.email && 
                       user.email.includes('@') && 
                       user.name;
        
        if (!isValid) {
          console.log(`❌ [UsersPlantsService] Filtered out user: ${user.email} - Missing required fields`);
        }
        
        return isValid;
      })
      .map(user => ({
        email: user.email || '',
        name: user.name || 'Unknown User',
        roleTitle: user.roleTitle || 'Unknown Role',
        level: user.level || 5,
        plant: user.plant || 'No Plant Assigned',
        division: user.division || '',
        platform: user.platform || '',
        segment: user.segment || '',
        enterprise: user.enterprise || '',
        hierarchyString: user.hierarchyString || '',
        cognitoGroups: (user.cognitoGroups || []).filter((group): group is string => group !== null),
        isActive: user.isActive ?? true,
        createdAt: user.createdAt || '',
        updatedAt: user.updatedAt || ''
      }))
      .sort((a, b) => {
        // ✅ Preserve original sorting logic
        if (a.level !== b.level) return a.level - b.level;
        if (a.plant !== b.plant) return a.plant.localeCompare(b.plant);
        return a.name.localeCompare(b.name);
      });

    // ✅ Create plant summary (preserving original logic)
    interface PlantSummaryItem {
      plantName: string;
      userCount: number;
      levels: Set<number>;
      roles: Set<string>;
    }

    const plantSummary: Record<string, PlantSummaryItem> = {};
    usersWithPlants.forEach(user => {
      const plant = user.plant || 'No Plant Assigned';
      if (!plantSummary[plant]) {
        plantSummary[plant] = {
          plantName: plant,
          userCount: 0,
          levels: new Set<number>(),
          roles: new Set<string>()
        };
      }
      plantSummary[plant].userCount++;
      plantSummary[plant].levels.add(user.level);
      plantSummary[plant].roles.add(user.roleTitle);
    });
    
    // ✅ Convert sets to arrays for JSON serialization (preserving original logic)
    const plantSummaryArray = Object.values(plantSummary).map((summary: PlantSummaryItem) => ({
      plantName: summary.plantName,
      userCount: summary.userCount,
      levels: Array.from(summary.levels).sort((a: number, b: number) => a - b),
      roles: Array.from(summary.roles).sort((a: string, b: string) => a.localeCompare(b))
    }));

    const totalTime = Date.now() - startTime;
    console.log(`✅ [UsersPlantsService] Final users count: ${usersWithPlants.length} in ${totalTime}ms`);

    return { 
      success: true, 
      users: usersWithPlants,
      count: usersWithPlants.length,
      plantSummary: plantSummaryArray,
      filters: {
        plant: plantFilter,
        level: levelFilter,
        division: divisionFilter
      },
      totalScanned: userRoles?.length || 0,
      debug: {
        queryMethod: 'GraphQL-Client-Side',
        dataSource: 'UserRole',
        totalUsersScanned: userRoles?.length || 0,
        finalUsersWithPlants: usersWithPlants.length,
        processingTime: totalTime,
        userAccessScope: userAccess?.accessScope
      },
      environment: 'client-side',
      tableNames: {
        userRole: 'UserRole (GraphQL)'
      }
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ [UsersPlantsService] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return { 
      success: false, 
      error: `Failed to fetch users with plants: ${errorMessage}`,
      users: [],
      count: 0,
      plantSummary: [],
      filters: {
        plant: params.plantFilter,
        level: params.levelFilter,
        division: params.divisionFilter
      },
      totalScanned: 0,
      debug: {
        queryMethod: 'GraphQL-Client-Side',
        dataSource: 'Error',
        totalUsersScanned: 0,
        finalUsersWithPlants: 0,
        processingTime: totalTime
      },
      environment: 'client-side',
      tableNames: {
        userRole: 'UserRole (GraphQL)'
      }
    };
  }
}

// ✅ Cached version for performance
const usersPlantsCache = new Map<string, UsersPlantsResult>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedUsersWithPlants(params: UsersPlantsParams): Promise<UsersPlantsResult> {
  const cacheKey = JSON.stringify(params);
  const cached = usersPlantsCache.get(cacheKey);
  
  if (cached && cached.success && (Date.now() - cached.debug.processingTime) < CACHE_DURATION) {
    console.log('🚀 [UsersPlantsService] Using cached data');
    return cached;
  }
  
  const freshData = await getUsersWithPlants(params);
  if (freshData.success) {
    usersPlantsCache.set(cacheKey, freshData);
    console.log('💾 [UsersPlantsService] Cached fresh data');
  }
  
  return freshData;
}

// ✅ Clear cache function
export function clearUsersPlantsCache() {
  usersPlantsCache.clear();
  console.log('🗑️ [UsersPlantsService] Cleared users plants cache');
}

// ✅ Convenience functions for specific use cases
export async function getUsersByPlant(plant: string, userEmail?: string): Promise<UserWithPlant[]> {
  const result = await getUsersWithPlants({ plantFilter: plant, userEmail });
  return result.users;
}

export async function getUsersByLevel(level: number, userEmail?: string): Promise<UserWithPlant[]> {
  const result = await getUsersWithPlants({ levelFilter: level.toString(), userEmail });
  return result.users;
}

export async function getUsersByDivision(division: string, userEmail?: string): Promise<UserWithPlant[]> {
  const result = await getUsersWithPlants({ divisionFilter: division, userEmail });
  return result.users;
}

export async function getPlantSummary(userEmail?: string): Promise<PlantSummary[]> {
  const result = await getUsersWithPlants({ userEmail });
  return result.plantSummary;
}
