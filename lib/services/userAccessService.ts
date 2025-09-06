// lib/services/userAccessService.ts - FIXED TypeScript issues
'use client';

import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";

const client = generateClient<Schema>();

export interface UserAccess {
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
  accessScope: 'ENTERPRISE' | 'SEGMENT' | 'PLATFORM' | 'DIVISION' | 'PLANT';
  cognitoGroups: string[]; // ✅ FIXED: Must be string[], not Nullable<string>[]
  isActive: boolean;
  permissions: {
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

// ✅ FIXED: Add debug logging to getUserAccess function with proper variable handling
export async function getUserAccess(email: string): Promise<UserAccess | null> {
  try {
    console.log(`🔍 [UserAccessService] Looking for user: "${email}"`);
    
    // ✅ FIXED: Use let instead of const to allow reassignment
    let { data: userData, errors } = await client.models.UserRole.get({
      email: email
    });
    
    console.log(`📊 [UserAccessService] GraphQL response:`, {
      userData: userData,
      errors: errors,
      email: email,
      userDataExists: !!userData,
      userDataEmail: userData?.email,
      userDataName: userData?.name,
      userDataRole: userData?.roleTitle
    });
    
    if (errors) {
      console.error('❌ [UserAccessService] GraphQL errors:', errors);
      return null;
    }
    
    if (!userData) {
      console.error(`❌ [UserAccessService] No user found for email: "${email}"`);
      
      // ✅ Try scanning to see if user exists with different email format
      console.log(`🔍 [UserAccessService] Attempting scan to find similar emails...`);
      const { data: allUsers } = await client.models.UserRole.list({
        limit: 1000
      });
      
      const matchingUsers = allUsers?.filter(user => 
        user.email?.toLowerCase().includes(email.toLowerCase()) ||
        email.toLowerCase().includes(user.email?.toLowerCase() || '')
      );
      
      console.log(`🔍 [UserAccessService] Similar emails found:`, matchingUsers?.map(u => ({
        email: u.email,
        name: u.name,
        role: u.roleTitle
      })));
      
      // ✅ FIXED: Check for exact matches with different casing
      const exactMatch = allUsers?.find(user => 
        user.email?.toLowerCase() === email.toLowerCase()
      );
      
      if (exactMatch) {
        console.log(`✅ [UserAccessService] Found exact match with different casing:`, exactMatch.email);
        userData = exactMatch; // ✅ FIXED: Now userData is let, so this works
      } else {
        return null;
      }
    }
    
    console.log(`✅ [UserAccessService] Found user data:`, {
      email: userData.email,
      name: userData.name,
      roleTitle: userData.roleTitle,
      plant: userData.plant,
      level: userData.level,
      cognitoGroups: userData.cognitoGroups,
      hierarchyString: userData.hierarchyString,
      isActive: userData.isActive
    });

    // ✅ Determine access scope based on level
    let accessScope: UserAccess['accessScope'];
    switch (userData.level) {
      case 1:
        accessScope = 'ENTERPRISE';
        break;
      case 2:
        accessScope = 'SEGMENT';
        break;
      case 3:
        accessScope = 'PLATFORM';
        break;
      case 4:
        accessScope = 'DIVISION';
        break;
      case 5:
      default:
        accessScope = 'PLANT';
        break;
    }

    console.log(`🏢 [UserAccessService] Determined access scope: ${accessScope} (Level ${userData.level})`);

    // ✅ Get permissions based on role
    const permissions = await getPermissionsForRole(userData.roleTitle);
    console.log(`🛡️ [UserAccessService] Permissions for role "${userData.roleTitle}":`, permissions);

    // ✅ FIXED: Properly handle cognitoGroups with null filtering
    const safeCognitoGroups: string[] = (userData.cognitoGroups || [])
      .filter((group): group is string => group !== null && group !== undefined);

    // ✅ Build final UserAccess object
    const userAccess: UserAccess = {
      email: userData.email,
      name: userData.name || userData.email.split('@')[0],
      roleTitle: userData.roleTitle || 'Unknown Role',
      level: userData.level || 5,
      plant: userData.plant || '',
      division: userData.division || '',
      platform: userData.platform || '',
      segment: userData.segment || '',
      enterprise: userData.enterprise || 'ITW',
      hierarchyString: userData.hierarchyString || '',
      accessScope,
      cognitoGroups: safeCognitoGroups, // ✅ FIXED: Now properly typed as string[]
      isActive: userData.isActive !== false,
      permissions
    };

    console.log(`✅ [UserAccessService] Final UserAccess object:`, {
      email: userAccess.email,
      roleTitle: userAccess.roleTitle,
      accessScope: userAccess.accessScope,
      plant: userAccess.plant,
      cognitoGroupsCount: userAccess.cognitoGroups.length,
      cognitoGroups: userAccess.cognitoGroups,
      permissionsCount: Object.keys(userAccess.permissions).length,
      hasReportInjury: userAccess.permissions.canReportInjury,
      hasViewPII: userAccess.permissions.canViewPII
    });

    return userAccess;
    
  } catch (error) {
    console.error('❌ [UserAccessService] Error:', error);
    console.error('❌ [UserAccessService] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      email: email
    });
    return null;
  }
}

// ✅ Get permissions based on role title
async function getPermissionsForRole(roleTitle: string): Promise<UserAccess['permissions']> {
  try {
    console.log(`🛡️ [UserAccessService] Getting permissions for role: "${roleTitle}"`);

    // ✅ Query RolePermission table
    const { data: rolePermissions, errors } = await client.models.RolePermission.list({
      filter: {
        roleTitle: { eq: roleTitle }
      }
    });

    if (errors) {
      console.error('❌ [UserAccessService] RolePermission query errors:', errors);
    }

    if (!rolePermissions || rolePermissions.length === 0) {
      console.warn(`⚠️ [UserAccessService] No permissions found for role: "${roleTitle}"`);
      
      // ✅ Fallback: Default permissions based on role patterns
      return getDefaultPermissionsForRole(roleTitle);
    }

    const rolePermission = rolePermissions[0];
    console.log(`✅ [UserAccessService] Found role permissions:`, {
      roleTitle: rolePermission.roleTitle,
      canReportInjury: rolePermission.canReportInjury,
      canViewPII: rolePermission.canViewPII,
      canTakeFirstReportActions: rolePermission.canTakeFirstReportActions
    });

    return {
      canReportInjury: rolePermission.canReportInjury || false,
      canReportObservation: rolePermission.canReportObservation || false,
      canSafetyRecognition: rolePermission.canSafetyRecognition || false,
      canTakeFirstReportActions: rolePermission.canTakeFirstReportActions || false,
      canViewPII: rolePermission.canViewPII || false,
      canTakeQuickFixActions: rolePermission.canTakeQuickFixActions || false,
      canTakeIncidentRCAActions: rolePermission.canTakeIncidentRCAActions || false,
      canPerformApprovalIncidentClosure: rolePermission.canPerformApprovalIncidentClosure || false,
      canViewManageOSHALogs: rolePermission.canViewManageOSHALogs || false,
      canViewOpenClosedReports: rolePermission.canViewOpenClosedReports || false,
      canViewSafetyAlerts: rolePermission.canViewSafetyAlerts || false,
      canViewLessonsLearned: rolePermission.canViewLessonsLearned || false,
      canViewDashboard: rolePermission.canViewDashboard || false,
      canSubmitDSATicket: rolePermission.canSubmitDSATicket || false,
      canApproveLessonsLearned: rolePermission.canApproveLessonsLearned || false,
    };

  } catch (error) {
    console.error('❌ [UserAccessService] Error getting permissions:', error);
    return getDefaultPermissionsForRole(roleTitle);
  }
}

// ✅ Default permissions based on role patterns from your RBAC Excel data
function getDefaultPermissionsForRole(roleTitle: string): UserAccess['permissions'] {
  console.log(`🛡️ [UserAccessService] Using default permissions for role: "${roleTitle}"`);
  
  const roleLower = roleTitle.toLowerCase();
  
  // ✅ Default permissions based on role patterns from your RBAC Excel data
  if (roleLower.includes('plant safety manager')) {
    return {
      canReportInjury: true,
      canReportObservation: true,
      canSafetyRecognition: true,
      canTakeFirstReportActions: true,
      canViewPII: true,
      canTakeQuickFixActions: true,
      canTakeIncidentRCAActions: true,
      canPerformApprovalIncidentClosure: false, // Plant level can't approve
      canViewManageOSHALogs: true,
      canViewOpenClosedReports: true,
      canViewSafetyAlerts: true,
      canViewLessonsLearned: true,
      canViewDashboard: true,
      canSubmitDSATicket: true,
      canApproveLessonsLearned: false,
    };
  }
  
  if (roleLower.includes('plant manager')) {
    return {
      canReportInjury: true,
      canReportObservation: true,
      canSafetyRecognition: true,
      canTakeFirstReportActions: true,
      canViewPII: false,
      canTakeQuickFixActions: true,
      canTakeIncidentRCAActions: true,
      canPerformApprovalIncidentClosure: true, // Plant managers can approve
      canViewManageOSHALogs: true,
      canViewOpenClosedReports: true,
      canViewSafetyAlerts: true,
      canViewLessonsLearned: true,
      canViewDashboard: true,
      canSubmitDSATicket: true,
      canApproveLessonsLearned: false,
    };
  }
  
  if (roleLower.includes('plant hr manager')) {
    return {
      canReportInjury: true,
      canReportObservation: true,
      canSafetyRecognition: true,
      canTakeFirstReportActions: true,
      canViewPII: true,
      canTakeQuickFixActions: true,
      canTakeIncidentRCAActions: true,
      canPerformApprovalIncidentClosure: false,
      canViewManageOSHALogs: true,
      canViewOpenClosedReports: true,
      canViewSafetyAlerts: true,
      canViewLessonsLearned: true,
      canViewDashboard: true,
      canSubmitDSATicket: true,
      canApproveLessonsLearned: false,
    };
  }
  
  // ✅ Default for unknown roles
  return {
    canReportInjury: true,
    canReportObservation: true,
    canSafetyRecognition: true,
    canTakeFirstReportActions: false,
    canViewPII: false,
    canTakeQuickFixActions: false,
    canTakeIncidentRCAActions: false,
    canPerformApprovalIncidentClosure: false,
    canViewManageOSHALogs: false,
    canViewOpenClosedReports: true,
    canViewSafetyAlerts: true,
    canViewLessonsLearned: true,
    canViewDashboard: false,
    canSubmitDSATicket: false,
    canApproveLessonsLearned: false,
  };
}

// ✅ Cache for performance
const userAccessCache = new Map<string, UserAccess>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function getCachedUserAccess(email: string): Promise<UserAccess | null> {
  const cached = userAccessCache.get(email);
  
  if (cached && (Date.now() - (cached as any).timestamp) < CACHE_DURATION) {
    console.log(`🚀 [UserAccessService] Using cached data for: ${email}`);
    return cached;
  }
  
  const freshData = await getUserAccess(email);
  if (freshData) {
    (freshData as any).timestamp = Date.now();
    userAccessCache.set(email, freshData);
    console.log(`💾 [UserAccessService] Cached fresh data for: ${email}`);
  }
  
  return freshData;
}

// ✅ Clear cache function
export function clearUserAccessCache() {
  userAccessCache.clear();
  console.log('🗑️ [UserAccessService] Cleared user access cache');
}
