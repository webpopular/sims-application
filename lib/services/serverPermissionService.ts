// lib/services/serverPermissionService.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

// ✅ Production DynamoDB configuration
const dynamoClient = new DynamoDBClient({
  region: process.env.MY_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

export interface ServerUserPermissions {
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
}

export interface ServerUserAccess {
  email: string;
  name: string;
  roleTitle: string;
  enterprise?: string;
  segment?: string;
  platform?: string;
  division?: string;
  plant?: string;
  hierarchyString: string;
  level: number;
  cognitoGroups: string[];
  isActive: boolean;
  permissions: ServerUserPermissions;
  accessibleHierarchies: string[];
  accessScope: 'ENTERPRISE' | 'SEGMENT' | 'PLATFORM' | 'DIVISION' | 'PLANT';
}

export async function getServerUserAccess(email: string): Promise<ServerUserAccess | null> {
  try {
    console.log('🔍 Getting server user access for:', email);
    
    // ✅ Production table names from environment variables
    const userRoleTableName = process.env.USER_ROLE_TABLE_NAME || 'UserRole-veooqyh5ireufagj7kv3h2ybwm-NONE';
    const rolePermissionTableName = process.env.ROLE_PERMISSION_TABLE_NAME || 'RolePermission-veooqyh5ireufagj7kv3h2ybwm-NONE';
    
    // ✅ Get user role data - NO FALLBACKS
    const userRoleScan = await docClient.send(new ScanCommand({
      TableName: userRoleTableName,
      FilterExpression: 'email = :email AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':email': email,
        ':isActive': true
      }
    }));

    if (!userRoleScan.Items || userRoleScan.Items.length === 0) {
      console.warn('⚠️ No user roles found for:', email);
      return null; // ✅ Return null instead of fallback
    }

    // Get primary role (lowest level = highest authority)
    const primaryRole = userRoleScan.Items.reduce((prev, current) => 
      (current.level || 5) < (prev.level || 5) ? current : prev
    );

    console.log('✅ Primary role found:', {
      email: primaryRole.email,
      roleTitle: primaryRole.roleTitle,
      level: primaryRole.level,
      hierarchyString: primaryRole.hierarchyString
    });

    // Generate accessible hierarchies for all user roles
    const accessibleHierarchies = generateMultiHierarchyAccess(userRoleScan.Items);

    // ✅ Get role permissions - NO FALLBACKS
    const rolePermissionResponse = await docClient.send(new ScanCommand({
      TableName: rolePermissionTableName,
      FilterExpression: 'roleTitle = :roleTitle',
      ExpressionAttributeValues: {
        ':roleTitle': primaryRole.roleTitle
      }
    }));

    if (!rolePermissionResponse.Items || rolePermissionResponse.Items.length === 0) {
      console.error('❌ No permissions found for role:', primaryRole.roleTitle);
      return null; // ✅ Return null instead of fallback permissions
    }

    const rolePermissions = rolePermissionResponse.Items[0];
    const permissions: ServerUserPermissions = {
      canReportInjury: rolePermissions.canReportInjury === 'true' || rolePermissions.canReportInjury === true,
      canReportObservation: rolePermissions.canReportObservation === 'true' || rolePermissions.canReportObservation === true,
      canSafetyRecognition: rolePermissions.canSafetyRecognition === 'true' || rolePermissions.canSafetyRecognition === true,
      canTakeFirstReportActions: rolePermissions.canTakeFirstReportActions === 'true' || rolePermissions.canTakeFirstReportActions === true,
      canViewPII: rolePermissions.canViewPII === 'true' || rolePermissions.canViewPII === true,
      canTakeQuickFixActions: rolePermissions.canTakeQuickFixActions === 'true' || rolePermissions.canTakeQuickFixActions === true,
      canTakeIncidentRCAActions: rolePermissions.canTakeIncidentRCAActions === 'true' || rolePermissions.canTakeIncidentRCAActions === true,
      canPerformApprovalIncidentClosure: rolePermissions.canPerformApprovalIncidentClosure === 'true' || rolePermissions.canPerformApprovalIncidentClosure === true,
      canViewManageOSHALogs: rolePermissions.canViewManageOSHALogs === 'true' || rolePermissions.canViewManageOSHALogs === true,
      canViewOpenClosedReports: rolePermissions.canViewOpenClosedReports === 'true' || rolePermissions.canViewOpenClosedReports === true,
      canViewSafetyAlerts: rolePermissions.canViewSafetyAlerts === 'true' || rolePermissions.canViewSafetyAlerts === true,
      canViewLessonsLearned: rolePermissions.canViewLessonsLearned === 'true' || rolePermissions.canViewLessonsLearned === true,
      canViewDashboard: rolePermissions.canViewDashboard === 'true' || rolePermissions.canViewDashboard === true,
      canSubmitDSATicket: rolePermissions.canSubmitDSATicket === 'true' || rolePermissions.canSubmitDSATicket === true,
      canApproveLessonsLearned: rolePermissions.canApproveLessonsLearned === 'true' || rolePermissions.canApproveLessonsLearned === true,
    };

    console.log('✅ Permissions loaded for', primaryRole.roleTitle, ':', permissions);

    return createUserAccess(primaryRole, permissions, accessibleHierarchies);

  } catch (error) {
    console.error('❌ Error getting server user access:', error);
    return null; // ✅ Return null instead of fallback
  }
}

// ✅ Helper functions remain the same...
function createUserAccess(
  primaryRole: any, 
  permissions: ServerUserPermissions, 
  accessibleHierarchies: string[]
): ServerUserAccess {
  const parsedCognitoGroups = parseCognitoGroups(primaryRole.cognitoGroups);
  
  return {
    email: primaryRole.email || 'Unknown',
    name: primaryRole.name || 'Unknown',
    roleTitle: primaryRole.roleTitle || 'Unknown',
    enterprise: primaryRole.enterprise || undefined,
    segment: primaryRole.segment || undefined,
    platform: primaryRole.platform || undefined,
    division: primaryRole.division || undefined,
    plant: primaryRole.plant || undefined,
    hierarchyString: primaryRole.hierarchyString || '',
    level: primaryRole.level || 5,
    cognitoGroups: parsedCognitoGroups,
    isActive: primaryRole.isActive ?? true,
    permissions,
    accessibleHierarchies,
    accessScope: getAccessScope(primaryRole.level || 5)
  };
}

function parseCognitoGroups(cognitoGroups: any): string[] {
  try {
    if (!cognitoGroups) return [];
    
    if (typeof cognitoGroups === 'string') {
      const parsed = JSON.parse(cognitoGroups);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item: any) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && item.S) return item.S;
            return null;
          })
          .filter((group: string | null): group is string => group !== null);
      }
    }
    
    if (Array.isArray(cognitoGroups)) {
      return cognitoGroups
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && item.S) return item.S;
          return null;
        })
        .filter((group: string | null): group is string => group !== null);
    }
    
    return [];
  } catch (error) {
    console.warn('Error parsing cognitoGroups:', error, cognitoGroups);
    return [];
  }
}

function generateMultiHierarchyAccess(userRoles: any[]): string[] {
  const accessible: string[] = [];
  
  userRoles.forEach(role => {
    if (role.hierarchyString) {
      const hierarchyAccess = generateAccessibleHierarchies(role.hierarchyString, role.level || 5);
      accessible.push(...hierarchyAccess);
    }
  });
  
  return [...new Set(accessible)];
}

function generateAccessibleHierarchies(userHierarchy: string, level: number): string[] {
  const accessible: string[] = [];
  
  switch (level) {
    case 1: // Enterprise - ITW Leadership & ITW Safety Director
      accessible.push("ITW>");
      break;
    case 2: // Segment - Segment Leadership & Segment Safety Director
      accessible.push(userHierarchy);
      break;
    case 3: // Platform - Group President, Platform HR Director
      accessible.push(userHierarchy);
      break;
    case 4: // Division - VP/GM/BUM, Operations Director, etc.
      accessible.push(userHierarchy);
      break;
    case 5: // Plant - Plant Manager, Plant HR Manager, Plant Safety Manager
      accessible.push(userHierarchy);
      break;
    default:
      accessible.push('NO_ACCESS');
  }
  
  return accessible;
}

function getAccessScope(level: number): 'ENTERPRISE' | 'SEGMENT' | 'PLATFORM' | 'DIVISION' | 'PLANT' {
  switch (level) {
    case 1: return 'ENTERPRISE';
    case 2: return 'SEGMENT';
    case 3: return 'PLATFORM';
    case 4: return 'DIVISION';
    case 5: return 'PLANT';
    default: return 'PLANT';
  }
}
