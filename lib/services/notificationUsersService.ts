// lib/services/notificationUsersService.ts - FIXED TypeScript Interface
'use client';

import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";

const client = generateClient<Schema>();

export interface NotificationUser {
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
  cognitoGroups: string[];
  createdAt: string;
  updatedAt: string;
  permissions?: {
    canReportInjury: boolean;
    canReportObservation: boolean;
    canSafetyRecognition: boolean;
    canTakeFirstReportActions: boolean;
    canViewPII: boolean;
    canTakeQuickFixActions: boolean;
    canTakeIncidentRCAActions: boolean;
    canPerformApprovalIncidentClosure: boolean;
    canViewManageOSHALogs: boolean;
    canViewOpenClosedReports: boolean;
    canViewSafetyAlerts: boolean;
    canViewLessonsLearned: boolean;
    canViewDashboard: boolean;
    canSubmitDSATicket: boolean;
    canApproveLessonsLearned: boolean;  
  };
}

// ✅ FIXED: Updated interface to include optional error property
export interface NotificationUsersResult {
  success: boolean;
  users: NotificationUser[];
  count: number;
  totalScanned: number;
  error?: string; // ✅ FIXED: Added optional error property
  debug: {
    processingTime: number;
    queryMethod: string;
    dataSource: string;
    userQueryTime: number;
    totalProcessingTime: number;
    totalUsersScanned: number;
    finalNotificationUsers: number;
  };
  environment: string;
  tableNames: {
    userRole: string;
  };
}

// ✅ Get all notification users using client-side service
export async function getAllNotificationUsersxx(): Promise<NotificationUsersResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 [NotificationUsersService] API endpoint called - fetching all notification users...');
    console.log('🔧 [NotificationUsersService] Using GraphQL client');
    
    const userQueryStart = Date.now();
    const { data: userRoles, errors } = await client.models.UserRole.list({
      filter: {
        isActive: { eq: true }
      },
      limit: 1000
    });
    
    const userQueryTime = Date.now() - userQueryStart;
    console.log(`⏱️ [NotificationUsersService] UserRole query completed in ${userQueryTime}ms`);
    console.log(`📊 [NotificationUsersService] Found ${userRoles?.length || 0} active users`);

    if (errors) {
      console.error('❌ [NotificationUsersService] UserRole query errors:', errors);
      throw new Error('Failed to fetch notification users');
    }

    // ✅ Process and filter users (preserving ALL original logic)
    const allUsers = (userRoles || [])
      .filter(user => {
        const isValid = user.email && 
                       user.email.includes('@') && 
                       user.name && 
                       user.isActive !== false;
        
        if (!isValid) {
          console.log(`❌ [NotificationUsersService] Filtered out user: ${user.email} - Missing required fields`);
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
        // ✅ Additional notification-relevant fields (preserving original logic)
        cognitoGroups: (user.cognitoGroups || []).filter((group): group is string => group !== null),
        createdAt: user.createdAt || '',
        updatedAt: user.updatedAt || ''
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // ✅ Preserve original sorting

    const totalTime = Date.now() - startTime;
    console.log(`✅ [NotificationUsersService] Successfully processed ${allUsers.length} notification users in ${totalTime}ms`);
    console.log('👥 [NotificationUsersService] Sample notification users:', allUsers.slice(0, 3));

    return { 
      success: true, 
      users: allUsers,
      count: allUsers.length,
      totalScanned: userRoles?.length || 0,
      // ✅ FIXED: No error property when successful
      debug: {
        processingTime: totalTime,
        queryMethod: 'GraphQL-Client-Side',
        dataSource: 'UserRole',
        userQueryTime,
        totalProcessingTime: totalTime,
        totalUsersScanned: userRoles?.length || 0,
        finalNotificationUsers: allUsers.length
      },
      environment: 'client-side',
      tableNames: {
        userRole: 'UserRole (GraphQL)'
      }
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [NotificationUsersService] Error after ${totalTime}ms:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // ✅ FIXED: Now includes error property which is allowed by interface
    return { 
      success: false,
      users: [],
      count: 0,
      totalScanned: 0,
      error: `Failed to fetch notification users: ${errorMessage}`, // ✅ FIXED: Now properly typed
      debug: {
        processingTime: totalTime,
        queryMethod: 'GraphQL-Client-Side',
        dataSource: 'Error',
        userQueryTime: 0,
        totalProcessingTime: totalTime,
        totalUsersScanned: 0,
        finalNotificationUsers: 0
      },
      environment: 'client-side',
      tableNames: {
        userRole: 'UserRole (GraphQL)'
      }
    };
  }
}


export async function getAllNotificationUsers(): Promise<NotificationUsersResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 [NotificationUsersService] API endpoint called - fetching all notification users...');
    console.log('🔧 [NotificationUsersService] Using GraphQL client');
    
    const userQueryStart = Date.now();
    const { data: userRoles, errors } = await client.models.UserRole.list({
      filter: {
        isActive: { eq: true }
      },
      limit: 1000
    });
    
    const userQueryTime = Date.now() - userQueryStart;
    console.log(`⏱️ [NotificationUsersService] UserRole query completed in ${userQueryTime}ms`);
    console.log(`📊 [NotificationUsersService] Found ${userRoles?.length || 0} active users`);

    if (errors) {
      console.error('❌ [NotificationUsersService] UserRole query errors:', errors);
      throw new Error('Failed to fetch notification users');
    }

    // ✅ Enhanced: Process users with permissions
    const usersWithPermissions = await Promise.all(
      (userRoles || [])
        .filter(user => {
          const isValid = user.email && 
                         user.email.includes('@') && 
                         user.name && 
                         user.isActive !== false;
          
          if (!isValid) {
            console.log(`❌ [NotificationUsersService] Filtered out user: ${user.email} - Missing required fields`);
          }
          
          return isValid;
        })
        .map(async (user) => {
          // Get role permissions for this user
          const { data: rolePermissions } = await client.models.RolePermission.list({
            filter: {
              roleTitle: { eq: user.roleTitle }
            }
          });

          const permissions = rolePermissions?.[0] ? {
            canReportInjury: rolePermissions[0].canReportInjury || false,
            canReportObservation: rolePermissions[0].canReportObservation || false,
            canSafetyRecognition: rolePermissions[0].canSafetyRecognition || false,
            canTakeFirstReportActions: rolePermissions[0].canTakeFirstReportActions || false,
            canViewPII: rolePermissions[0].canViewPII || false,
            canTakeQuickFixActions: rolePermissions[0].canTakeQuickFixActions || false,
            canTakeIncidentRCAActions: rolePermissions[0].canTakeIncidentRCAActions || false,
            canPerformApprovalIncidentClosure: rolePermissions[0].canPerformApprovalIncidentClosure || false,
            canViewManageOSHALogs: rolePermissions[0].canViewManageOSHALogs || false,
            canViewOpenClosedReports: rolePermissions[0].canViewOpenClosedReports || false,
            canViewSafetyAlerts: rolePermissions[0].canViewSafetyAlerts || false,
            canViewLessonsLearned: rolePermissions[0].canViewLessonsLearned || false,
            canViewDashboard: rolePermissions[0].canViewDashboard || false,
            canSubmitDSATicket: rolePermissions[0].canSubmitDSATicket || false,
            canApproveLessonsLearned: rolePermissions[0].canApproveLessonsLearned || false,
          } : undefined;

          return {
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
            cognitoGroups: (user.cognitoGroups || []).filter((group): group is string => group !== null),
            createdAt: user.createdAt || '',
            updatedAt: user.updatedAt || '',
            permissions // ✅ Include permissions
          };
        })
    );

    const allUsers = usersWithPermissions.sort((a, b) => a.name.localeCompare(b.name));

    const totalTime = Date.now() - startTime;
    console.log(`✅ [NotificationUsersService] Successfully processed ${allUsers.length} notification users with permissions in ${totalTime}ms`);
    console.log('👥 [NotificationUsersService] Sample notification users:', allUsers.slice(0, 3));

    return { 
      success: true, 
      users: allUsers,
      count: allUsers.length,
      totalScanned: userRoles?.length || 0,
      debug: {
        processingTime: totalTime,
        queryMethod: 'GraphQL-Client-Side-With-Permissions',
        dataSource: 'UserRole + RolePermission',
        userQueryTime,
        totalProcessingTime: totalTime,
        totalUsersScanned: userRoles?.length || 0,
        finalNotificationUsers: allUsers.length
      },
      environment: 'client-side',
      tableNames: {
        userRole: 'UserRole (GraphQL)'
      }
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [NotificationUsersService] Error after ${totalTime}ms:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return { 
      success: false,
      users: [],
      count: 0,
      totalScanned: 0,
      error: `Failed to fetch notification users: ${errorMessage}`,
      debug: {
        processingTime: totalTime,
        queryMethod: 'GraphQL-Client-Side-With-Permissions',
        dataSource: 'Error',
        userQueryTime: 0,
        totalProcessingTime: totalTime,
        totalUsersScanned: 0,
        finalNotificationUsers: 0
      },
      environment: 'client-side',
      tableNames: {
        userRole: 'UserRole (GraphQL)'
      }
    };
  }
}






// ✅ Cached version for performance
const notificationUsersCache = new Map<string, NotificationUsersResult>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedNotificationUsers(): Promise<NotificationUsersResult> {
  const cacheKey = 'ALL_NOTIFICATION_USERS';
  const cached = notificationUsersCache.get(cacheKey);
  
  if (cached && cached.success && (Date.now() - cached.debug.processingTime) < CACHE_DURATION) {
    console.log('🚀 [NotificationUsersService] Using cached data');
    return cached;
  }
  
  const freshData = await getAllNotificationUsers();
  if (freshData.success) {
    notificationUsersCache.set(cacheKey, freshData);
    console.log('💾 [NotificationUsersService] Cached fresh data');
  }
  
  return freshData;
}

// ✅ Clear cache function
export function clearNotificationUsersCache() {
  notificationUsersCache.clear();
  console.log('🗑️ [NotificationUsersService] Cleared notification users cache');
}

// ✅ Filter functions for specific use cases
export async function getNotificationUsersByRole(roleTitle: string): Promise<NotificationUser[]> {
  const result = await getCachedNotificationUsers();
  return result.users.filter(user => 
    user.roleTitle.toLowerCase() === roleTitle.toLowerCase()
  );
}

export async function getNotificationUsersByPlant(plant: string): Promise<NotificationUser[]> {
  const result = await getCachedNotificationUsers();
  return result.users.filter(user => user.plant === plant);
}

export async function getNotificationUsersByHierarchy(hierarchyString: string): Promise<NotificationUser[]> {
  const result = await getCachedNotificationUsers();
  return result.users.filter(user => 
    user.hierarchyString.startsWith(hierarchyString)
  );
}

// ✅ New function: Get users with specific permission
export async function getNotificationUsersByPermission(permission: keyof NotificationUser['permissions']): Promise<NotificationUser[]> {
  const result = await getCachedNotificationUsers();
  return result.users.filter(user => 
    user.permissions?.[permission] === true
  );
}

// ✅ Specific function for lessons learned approvers
export async function getLessonsLearnedApprovers(): Promise<NotificationUser[]> {
  const result = await getCachedNotificationUsers();
  return result.users.filter(user => 
    user.permissions?.canApproveLessonsLearned === true
  );
}

