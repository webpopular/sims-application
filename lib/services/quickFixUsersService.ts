// lib/services/quickFixUsersService.ts - Complete Client-Side Implementation
'use client';

import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import { getCachedUserAccess } from './userAccessService';

const client = generateClient<Schema>();

export interface QuickFixUser {
  email: string;
  name: string;
  roleTitle: string;
  level: string;
  plant: string;
  division: string;
  platform: string;
  segment: string;
  enterprise: string;
  hierarchyString: string;
  isActive: boolean;
  canTakeQuickFixActions: boolean;
  cognitoGroups: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuickFixUsersParams {
  userEmail?: string;
  plantFilter?: string;
  levelFilter?: string;
  divisionFilter?: string;
}

export interface QuickFixUsersResult {
  success: boolean;
  users: QuickFixUser[];
  count: number;
  quickFixRoles: string[];
  totalScanned: number;
  permissionFilter: string;
  debug: {
    queryMethod: string;
    dataSource: string;
    rolePermissionQueryTime: number;
    userQueryTime: number;
    totalProcessingTime: number;
    quickFixRolesFound: number;
    totalUsersScanned: number;
    finalQuickFixUsers: number;
    userAccessScope?: string;
  };
  environment: string;
  tableNames: {
    userRole: string;
    rolePermission: string;
  };
  error?: string;
}

// ✅ Get Quick Fix authorized users using client-side service
export async function getQuickFixUsers(params: QuickFixUsersParams = {}): Promise<QuickFixUsersResult> {
  const startTime = Date.now();
  
  try {
    const {
      userEmail,
      plantFilter,
      levelFilter,
      divisionFilter
    } = params;

    console.log('🔍 [QuickFixUsersService] API endpoint called - fetching ONLY Quick Fix authorized users...');
    console.log('🔧 [QuickFixUsersService] Using GraphQL client');
    
    // Get user access for filtering if email provided
    let userAccess = null;
    if (userEmail) {
      userAccess = await getCachedUserAccess(userEmail);
      console.log(`🔍 [QuickFixUsersService] User access scope: ${userAccess?.accessScope}`);
    }
    
    // ✅ First, get roles that can perform Quick Fix actions
    console.log('📊 [QuickFixUsersService] Getting roles with Quick Fix permissions...');
    
    const rolePermissionQueryStart = Date.now();
    const { data: rolePermissions, errors: permissionErrors } = await client.models.RolePermission.list({
      filter: {
        canTakeQuickFixActions: { eq: true }
      }
    });
    
    const rolePermissionQueryTime = Date.now() - rolePermissionQueryStart;
    console.log(`⏱️ [QuickFixUsersService] RolePermission query completed in ${rolePermissionQueryTime}ms`);

    if (permissionErrors) {
      console.error('❌ [QuickFixUsersService] Permission errors:', permissionErrors);
      throw new Error('Failed to fetch Quick Fix role permissions');
    }

    const quickFixRoles = (rolePermissions || [])
      .map(item => item.roleTitle)
      .filter(Boolean) as string[];
    
    console.log('✅ [QuickFixUsersService] QUICK FIX ONLY roles found:', quickFixRoles);
    console.log('📊 [QuickFixUsersService] Quick Fix roles count:', quickFixRoles.length);

    if (quickFixRoles.length === 0) {
      console.warn('⚠️ [QuickFixUsersService] NO Quick Fix roles found - check RolePermission table');
      return {
        success: true,
        users: [],
        count: 0,
        quickFixRoles: [],
        totalScanned: 0,
        permissionFilter: 'canTakeQuickFixActions = true',
        debug: {
          queryMethod: 'GraphQL-Client-Side',
          dataSource: 'RolePermission + UserRole',
          rolePermissionQueryTime,
          userQueryTime: 0,
          totalProcessingTime: Date.now() - startTime,
          quickFixRolesFound: 0,
          totalUsersScanned: 0,
          finalQuickFixUsers: 0
        },
        environment: 'client-side',
        tableNames: {
          userRole: 'UserRole (GraphQL)',
          rolePermission: 'RolePermission (GraphQL)'
        }
      };
    }

    // ✅ Build filter for users with Quick Fix roles
    let filter: any = {
      isActive: { eq: true }
    };

    // Add role filter for Quick Fix roles
    if (quickFixRoles.length === 1) {
      filter.roleTitle = { eq: quickFixRoles[0] };
    } else {
      // For multiple roles, we'll filter after the query
      // GraphQL doesn't support complex OR conditions in filters easily
    }

    // Add additional filters
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

    console.log(`📊 [QuickFixUsersService] Querying UserRole with filter:`, filter);
    
    const userQueryStart = Date.now();
    const { data: userRoles, errors: userErrors } = await client.models.UserRole.list({
      filter,
      limit: 1000
    });
    
    const userQueryTime = Date.now() - userQueryStart;
    console.log(`⏱️ [QuickFixUsersService] UserRole query completed in ${userQueryTime}ms`);
    console.log(`📊 [QuickFixUsersService] Found ${userRoles?.length || 0} users`);

    if (userErrors) {
      console.error('❌ [QuickFixUsersService] User query errors:', userErrors);
      throw new Error('Failed to fetch Quick Fix users');
    }

    // ✅ Filter users for Quick Fix roles if we have multiple target roles
    let filteredUsers = userRoles || [];
    
    if (quickFixRoles.length > 1) {
      filteredUsers = filteredUsers.filter(user => 
        quickFixRoles.includes(user.roleTitle || '')
      );
      console.log(`📊 [QuickFixUsersService] After role filtering: ${filteredUsers.length} users`);
    }

    const quickFixUsers = filteredUsers
      .filter(user => {
        const isValid = user.email && 
                       user.email.includes('@') && 
                       user.name && 
                       user.isActive !== false;
        
        if (!isValid) {
          console.log(`❌ [QuickFixUsersService] Filtered out invalid user: ${user.email}`);
        } else {
          console.log(`✅ [QuickFixUsersService] Valid Quick Fix user: ${user.name} (${user.email}) - Role: ${user.roleTitle}`);
        }
        
        return isValid;
      })
      .map(user => ({
        email: user.email || '',
        name: user.name || 'Unknown User',
        roleTitle: user.roleTitle || 'Unknown Role',
        level: user.level?.toString() || '5',
        plant: user.plant || '',
        division: user.division || '',
        platform: user.platform || '',
        segment: user.segment || '',
        enterprise: user.enterprise || '',
        hierarchyString: user.hierarchyString || '',
        isActive: user.isActive ?? true,
        canTakeQuickFixActions: true, // ✅ Mark as Quick Fix authorized
        cognitoGroups: (user.cognitoGroups || []).filter((group): group is string => group !== null),
        createdAt: user.createdAt || '',
        updatedAt: user.updatedAt || ''
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const totalTime = Date.now() - startTime;
    console.log(`✅ [QuickFixUsersService] FINAL Quick Fix authorized users: ${quickFixUsers.length} in ${totalTime}ms`);
    console.log('👥 [QuickFixUsersService] Quick Fix users:', quickFixUsers.map(u => `${u.name} (${u.roleTitle})`));

    return {
      success: true,
      users: quickFixUsers,
      count: quickFixUsers.length,
      quickFixRoles: quickFixRoles,
      totalScanned: filteredUsers.length,
      permissionFilter: 'canTakeQuickFixActions = true',
      debug: {
        queryMethod: 'GraphQL-Client-Side',
        dataSource: 'RolePermission + UserRole',
        rolePermissionQueryTime,
        userQueryTime,
        totalProcessingTime: totalTime,
        quickFixRolesFound: quickFixRoles.length,
        totalUsersScanned: filteredUsers.length,
        finalQuickFixUsers: quickFixUsers.length,
        userAccessScope: userAccess?.accessScope
      },
      environment: 'client-side',
      tableNames: {
        userRole: 'UserRole (GraphQL)',
        rolePermission: 'RolePermission (GraphQL)'
      }
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ [QuickFixUsersService] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: `Failed to fetch Quick Fix users: ${errorMessage}`,
      users: [],
      count: 0,
      quickFixRoles: [],
      totalScanned: 0,
      permissionFilter: 'canTakeQuickFixActions = true',
      debug: {
        queryMethod: 'GraphQL-Client-Side',
        dataSource: 'Error',
        rolePermissionQueryTime: 0,
        userQueryTime: 0,
        totalProcessingTime: totalTime,
        quickFixRolesFound: 0,
        totalUsersScanned: 0,
        finalQuickFixUsers: 0
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
const quickFixUsersCache = new Map<string, QuickFixUsersResult>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedQuickFixUsers(params: QuickFixUsersParams = {}): Promise<QuickFixUsersResult> {
  const cacheKey = JSON.stringify(params);
  const cached = quickFixUsersCache.get(cacheKey);
  
  if (cached && cached.success && (Date.now() - cached.debug.totalProcessingTime) < CACHE_DURATION) {
    console.log('🚀 [QuickFixUsersService] Using cached data');
    return cached;
  }
  
  const freshData = await getQuickFixUsers(params);
  if (freshData.success) {
    quickFixUsersCache.set(cacheKey, freshData);
    console.log('💾 [QuickFixUsersService] Cached fresh data');
  }
  
  return freshData;
}

// ✅ Clear cache function
export function clearQuickFixUsersCache() {
  quickFixUsersCache.clear();
  console.log('🗑️ [QuickFixUsersService] Cleared Quick Fix users cache');
}

// ✅ Convenience functions for specific use cases
export async function getQuickFixUsersByPlant(plant: string, userEmail?: string): Promise<QuickFixUser[]> {
  const result = await getQuickFixUsers({ plantFilter: plant, userEmail });
  return result.users;
}

export async function getQuickFixUsersByLevel(level: number, userEmail?: string): Promise<QuickFixUser[]> {
  const result = await getQuickFixUsers({ levelFilter: level.toString(), userEmail });
  return result.users;
}

export async function getQuickFixUsersByDivision(division: string, userEmail?: string): Promise<QuickFixUser[]> {
  const result = await getQuickFixUsers({ divisionFilter: division, userEmail });
  return result.users;
}

export async function getQuickFixRoles(): Promise<string[]> {
  const result = await getQuickFixUsers();
  return result.quickFixRoles;
}
