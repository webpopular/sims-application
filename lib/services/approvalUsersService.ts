// lib/services/approvalUsersService.ts - Complete Client-Side Implementation
'use client';

import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import { getCachedUserAccess } from './userAccessService';

const client = generateClient<Schema>();

export interface ApprovalUser {
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

export interface ApprovalUsersParams {
  userEmail: string;
  includeAllUsers?: boolean;
  plantFilter?: string;
  levelFilter?: string;
}

export interface ApprovalUsersResult {
  success: boolean;
  users: ApprovalUser[];
  count: number;
  plantSummary: Array<{
    plantName: string;
    userCount: number;
    levels: number[];
    roles: string[];
  }>;
  targetRoles: string[];
  filters: {
    includeAllUsers: boolean;
    plant: string;
    level: string;
  };
  totalScanned: number;
  debug: {
    processingTime: number;
    queryMethod: string;
    dataSource: string;
    userQueryTime: number;
    totalProcessingTime: number;
    approverRolesFound: number;
    totalUsersScanned: number;
    finalFilteredUsers: number;
  };
  environment: string;
  tableNames: {
    userRole: string;
    rolePermission: string;
  };
}

// ✅ Get approval users using client-side service
export async function getApprovalUsers(params: ApprovalUsersParams): Promise<ApprovalUsersResult> {
  const startTime = Date.now();
  
  try {
    const {
      userEmail,
      includeAllUsers = false,
      plantFilter,
      levelFilter
    } = params;

    console.log(`🔍 [ApprovalUsersService] Getting approval users for: ${userEmail}`);
    console.log(`🔍 [ApprovalUsersService] Include all users: ${includeAllUsers}`);

    // Get user access to determine what data they can see
    const userAccess = await getCachedUserAccess(userEmail);
    if (!userAccess) {
      throw new Error('User not found or inactive');
    }
    
    console.log(`🔍 [ApprovalUsersService] User access scope: ${userAccess.accessScope}`);
    console.log(`🔍 [ApprovalUsersService] User hierarchy: ${userAccess.hierarchyString}`);

    let targetRoles: string[] = [];
    
    // ✅ Get roles that can perform approval if not including all users
    if (!includeAllUsers) {
      console.log('📊 [ApprovalUsersService] Getting roles with approval permissions...');
      
      const { data: rolePermissions, errors: permissionErrors } = await client.models.RolePermission.list({});
      
      if (permissionErrors) {
        console.error('❌ [ApprovalUsersService] Permission errors:', permissionErrors);
      } else {
        // Filter roles that can perform approval for incident closure
        targetRoles = (rolePermissions || [])
          .filter(rp => rp.canPerformApprovalIncidentClosure === true)
          .map(rp => rp.roleTitle)
          .filter(Boolean) as string[];
        
        console.log('✅ [ApprovalUsersService] Approver roles found:', targetRoles);
      }
    }
    
    // ✅ Build filter for users
    let filter: any = {
      isActive: { eq: true }
    };
    
    // Add role filter if not including all users
    if (!includeAllUsers && targetRoles.length > 0) {
      // For GraphQL, we need to use 'or' conditions for multiple role titles
      if (targetRoles.length === 1) {
        filter.roleTitle = { eq: targetRoles[0] };
      } else {
        // For multiple roles, we'll filter after the query
        // GraphQL doesn't support complex OR conditions in filters easily
      }
    }
    
    // Add plant filter
    if (plantFilter) {
      filter.plant = { eq: plantFilter };
    }
    
    // Add level filter
    if (levelFilter) {
      filter.level = { eq: parseInt(levelFilter) };
    }
    
    // Apply hierarchy-based filtering based on user's access scope
    switch (userAccess.accessScope) {
      case 'ENTERPRISE':
        // Enterprise users can see all users
        console.log('🌐 [ApprovalUsersService] Enterprise access - showing all users');
        break;
      case 'SEGMENT':
        if (userAccess.segment) {
          filter.segment = { eq: userAccess.segment };
          console.log(`🏭 [ApprovalUsersService] Segment access - showing users in segment: ${userAccess.segment}`);
        }
        break;
      case 'PLATFORM':
        if (userAccess.platform) {
          filter.platform = { eq: userAccess.platform };
          console.log(`🏗️ [ApprovalUsersService] Platform access - showing users in platform: ${userAccess.platform}`);
        }
        break;
      case 'DIVISION':
        if (userAccess.division) {
          filter.division = { eq: userAccess.division };
          console.log(`🏢 [ApprovalUsersService] Division access - showing users in division: ${userAccess.division}`);
        }
        break;
      case 'PLANT':
        if (userAccess.hierarchyString) {
          filter.hierarchyString = { eq: userAccess.hierarchyString };
          console.log(`🏭 [ApprovalUsersService] Plant access - showing only users in same plant: ${userAccess.plant}`);
        }
        break;
    }
    
    console.log('📊 [ApprovalUsersService] Querying UserRole with filters:', filter);
    
    const userQueryStart = Date.now();
    const { data: userRoles, errors: userErrors } = await client.models.UserRole.list({
      filter,
      limit: 1000
    });
    
    const userQueryTime = Date.now() - userQueryStart;
    console.log(`⏱️ [ApprovalUsersService] UserRole query completed in ${userQueryTime}ms`);
    console.log(`📊 [ApprovalUsersService] Found ${userRoles?.length || 0} users`);
    
    if (userErrors) {
      console.error('❌ [ApprovalUsersService] User query errors:', userErrors);
      throw new Error('Failed to fetch users');
    }
    
    // ✅ Filter users based on role if we have multiple target roles
    let filteredUsers = userRoles || [];
    
    if (!includeAllUsers && targetRoles.length > 1) {
      filteredUsers = filteredUsers.filter(user => 
        targetRoles.includes(user.roleTitle || '')
      );
      console.log(`📊 [ApprovalUsersService] After role filtering: ${filteredUsers.length} users`);
    }
    
    // ✅ Process and format users
    const processedUsers = filteredUsers
      .filter(user => {
        const isValid = user.email && 
                       user.email.includes('@') && 
                       user.name;
        
        if (!isValid) {
          console.log(`❌ [ApprovalUsersService] Filtered out user: ${user.email} - Missing required fields`);
        }
        
        return isValid;
      })
      .map(user => ({
        email: user.email || '',
        name: user.name || 'Unknown User',
        roleTitle: user.roleTitle || 'Unknown Role',
        level: user.level || 5,
        plant: user.plant || 'No Plant',
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
        // ✅ Sort by level first, then plant, then name
        if (a.level !== b.level) return a.level - b.level;
        if (a.plant !== b.plant) return a.plant.localeCompare(b.plant);
        return a.name.localeCompare(b.name);
      });

    // ✅ Create plant summary
    const plantSummary: Record<string, any> = {};
    processedUsers.forEach(user => {
      const plant = user.plant || 'No Plant';
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
    
    // ✅ Convert sets to arrays for JSON serialization
    const plantSummaryArray = Object.values(plantSummary).map((summary: any) => ({
        ...summary,
        levels: Array.from(summary.levels as Set<number>).sort((a: number, b: number) => a - b),
        roles: Array.from(summary.roles as Set<string>).sort()
      }));

    const totalTime = Date.now() - startTime;
    console.log(`✅ [ApprovalUsersService] Successfully processed ${processedUsers.length} approval users in ${totalTime}ms`);

    return {
      success: true,
      users: processedUsers,
      count: processedUsers.length,
      plantSummary: plantSummaryArray,
      targetRoles: targetRoles,
      filters: {
        includeAllUsers,
        plant: plantFilter || 'all',
        level: levelFilter || 'all'
      },
      totalScanned: filteredUsers.length,
      debug: {
        processingTime: totalTime,
        queryMethod: 'GraphQL-Client-Side',
        dataSource: 'RolePermission + UserRole',
        userQueryTime,
        totalProcessingTime: totalTime,
        approverRolesFound: targetRoles.length,
        totalUsersScanned: filteredUsers.length,
        finalFilteredUsers: processedUsers.length
      },
      environment: 'client-side',
      tableNames: {
        userRole: 'UserRole (GraphQL)',
        rolePermission: 'RolePermission (GraphQL)'
      }
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ [ApprovalUsersService] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      users: [],
      count: 0,
      plantSummary: [],
      targetRoles: [],
      filters: {
        includeAllUsers: params.includeAllUsers || false,
        plant: params.plantFilter || 'all',
        level: params.levelFilter || 'all'
      },
      totalScanned: 0,
      debug: {
        processingTime: totalTime,
        queryMethod: 'GraphQL-Client-Side',
        dataSource: 'Error',
        userQueryTime: 0,
        totalProcessingTime: totalTime,
        approverRolesFound: 0,
        totalUsersScanned: 0,
        finalFilteredUsers: 0
      },
      environment: 'client-side',
      tableNames: {
        userRole: 'UserRole (GraphQL)',
        rolePermission: 'RolePermission (GraphQL)'
      }
    };
  }
}

// ✅ Cached version for performance
const approvalUsersCache = new Map<string, ApprovalUsersResult>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedApprovalUsers(params: ApprovalUsersParams): Promise<ApprovalUsersResult> {
  const cacheKey = JSON.stringify(params);
  const cached = approvalUsersCache.get(cacheKey);
  
  if (cached && cached.success && (Date.now() - (cached.debug?.processingTime || 0)) < CACHE_DURATION) {
    console.log('🚀 [ApprovalUsersService] Using cached data');
    return cached;
  }
  
  const freshData = await getApprovalUsers(params);
  if (freshData.success) {
    approvalUsersCache.set(cacheKey, freshData);
    console.log('💾 [ApprovalUsersService] Cached fresh data');
  }
  
  return freshData;
}

// ✅ Clear cache function
export function clearApprovalUsersCache() {
  approvalUsersCache.clear();
  console.log('🗑️ [ApprovalUsersService] Cleared approval users cache');
}
