// app/api/get-user-access-level/route.ts - WORKING DynamoDB Implementation
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";


//TEMP to debug
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
const identity = await new STSClient({}).send(new GetCallerIdentityCommand({}));
console.log("🪪 Running as:", identity.Arn);


// ✅ Use IAM role from your backend.ts configuration
const dynamoClient = new DynamoDBClient({
  region: process.env.MY_AWS_REGION || "us-east-1"
  // ❌ No explicit credentials - let Amplify IAM role handle it
});

const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
    convertClassInstanceToMap: false
  }
});

// ✅ Use exact table names from your environment variables
function getTableName(modelName: string): string {
  const tableNames = {
    'UserRole': 'UserRole-3d7zjk5vgzdlnee7sno3eve6r4-NONE',
    'RolePermission': 'RolePermission-3d7zjk5vgzdlnee7sno3eve6r4-NONE',
    'EnterpriseToPlantHierarchy': 'EnterpriseToPlantHierarchy-3d7zjk5vgzdlnee7sno3eve6r4-NONE'
  };
  
  const tableName = tableNames[modelName as keyof typeof tableNames];
  if (!tableName) {
    throw new Error(`Unknown model: ${modelName}`);
  }
  
  console.log(`📊 Using table name: ${tableName}`);
  return tableName;
}

// ✅ Enhanced permission mapping based on your RBAC spreadsheet
function mapPermissions(rolePermissions: any[], userLevel: number, roleTitle: string) {
  console.log(`🔐 [UserAccess] Mapping permissions for role: ${roleTitle}, level: ${userLevel}`);
  console.log(`🔐 [UserAccess] Found ${rolePermissions.length} role permission records`);
  
  // Find the specific role permission
  const rolePermission = rolePermissions.find(rp => 
    rp.roleTitle === roleTitle || 
    rp.roleTitle?.toLowerCase() === roleTitle?.toLowerCase()
  );
  
  if (!rolePermission) {
    console.warn(`⚠️ [UserAccess] No role permission found for: ${roleTitle}`);
    console.log(`🔐 [UserAccess] Available roles:`, rolePermissions.map(rp => rp.roleTitle));
    return getDefaultPermissions();
  }
  
  console.log(`✅ [UserAccess] Found role permission for: ${roleTitle}`);
  console.log(`🔐 [UserAccess] Permission data:`, rolePermission);
  
  // ✅ Map permissions based on your comprehensive RBAC spreadsheet
  const permissions = {
    canReportInjury: rolePermission?.canReportInjury === true,
    canReportObservation: rolePermission?.canReportObservation === true,
    canSafetyRecognition: rolePermission?.canSafetyRecognition === true,
    canTakeFirstReportActions: rolePermission?.canTakeFirstReportActions === true,
    canViewPII: rolePermission?.canViewPII === true,
    canTakeQuickFixActions: rolePermission?.canTakeQuickFixActions === true,
    canTakeIncidentRCAActions: rolePermission?.canTakeIncidentRCAActions === true,
    canPerformApprovalIncidentClosure: rolePermission?.canPerformApprovalIncidentClosure === true,
    canViewManageOSHALogs: rolePermission?.canViewManageOSHALogs === true,
    canViewOpenClosedReports: rolePermission?.canViewOpenClosedReports === true,
    canViewSafetyAlerts: rolePermission?.canViewSafetyAlerts === true,
    canViewLessonsLearned: rolePermission?.canViewLessonsLearned === true,
    canViewDashboard: rolePermission?.canViewDashboard === true,
    canSubmitDSATicket: rolePermission?.canSubmitDSATicket === true
  };
  
  const enabledPermissions = Object.entries(permissions).filter(([_, value]) => value).map(([key, _]) => key);
  console.log(`✅ [UserAccess] Mapped ${enabledPermissions.length} enabled permissions:`, enabledPermissions);
  
  return permissions;
}

// ✅ Default permissions function
function getDefaultPermissions() {
  return {
    canReportInjury: false,
    canReportObservation: false,
    canSafetyRecognition: false,
    canTakeFirstReportActions: false,
    canViewPII: false,
    canTakeQuickFixActions: false,
    canTakeIncidentRCAActions: false,
    canPerformApprovalIncidentClosure: false,
    canViewManageOSHALogs: false,
    canViewOpenClosedReports: false,
    canViewSafetyAlerts: false,
    canViewLessonsLearned: false,
    canViewDashboard: false,
    canSubmitDSATicket: false
  };
}

// ✅ Enhanced access scope determination
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

// ✅ Enhanced Cognito group mapping based on your RBAC spreadsheet
function mapToCognitoGroups(roleTitle: string, level: number): string[] {
  console.log(`👥 [UserAccess] Mapping Cognito groups for: ${roleTitle}, level: ${level}`);
  
  const roleGroupMapping: Record<string, string[]> = {
    // Level 1 - Enterprise
    'ITW Leadership': ['ENTERPRISE'],
    'ITW Safety Director': ['ENTERPRISE_SAFETY_DIRECTOR'],
    
    // Level 2 - Segment
    'Segment Leadership': ['SEGMENT'],
    'Segment Safety Director': ['SEGMENT_SAFETY_DIRECTOR'],
    
    // Level 3 - Platform
    'Group President': ['PLATFORM_GROUP_PRESIDENT'],
    'Platform HR Director': ['PLATFORM_HR'],
    
    // Level 4 - Division
    'VP/GM/BUM': ['DIVISION_VP_GM_BUM'],
    'Operations Director': ['DIVISION_OPS_DIRECTOR'],
    'Divisional HR Director': ['DIVISION_HR_DIRECTOR'],
    'Divisional Safety Manager': ['DIVISION_SAFETY'],
    
    // Level 5 - Plant
    'Plant Manager': ['DIVISION_PLANT_MANAGER'],
    'Plant HR Manager': ['DIVISION_PLANT_HR'],
    'Plant Safety Manager': ['PLANT_SAFETY_MANAGER'],
    'Plant Safety Champions': ['PLANT_SAFETY_CHAMPIONS'],
    
    // Special case
    'Other': ['ENTERPRISE']
  };
  
  const groups = roleGroupMapping[roleTitle] || ['ENTERPRISE'];
  console.log(`👥 [UserAccess] Mapped to Cognito groups:`, groups);
  return groups;
}

// ✅ Generate accessible hierarchies
function generateAccessibleHierarchies(hierarchyString: string, level: number): string[] {
  if (!hierarchyString) return [];
  
  switch (level) {
    case 1: // Enterprise - can see all
      return ['ITW>'];
    case 2: // Segment
    case 3: // Platform
    case 4: // Division
      // Can see their hierarchy and all children
      return [hierarchyString];
    case 5: // Plant
      // Can only see their specific plant
      return [hierarchyString];
    default:
      return [hierarchyString];
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log(`🚀 [UserAccess] ===== DynamoDB API REQUEST START =====`);
  
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const includeHierarchy = searchParams.get('includeHierarchy') === 'true';
    
    if (!email) {
      console.error(`❌ [UserAccess] No email parameter provided`);
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    console.log(`🔍 [UserAccess] Getting access level for: ${email}`);
    console.log(`🔧 [UserAccess] Using DynamoDB client with IAM role from backend.ts`);
    
    // ✅ Get table names
    const userRoleTableName = getTableName('UserRole');
    const rolePermissionTableName = getTableName('RolePermission');
    
    console.log(`📊 [UserAccess] Using tables: UserRole: ${userRoleTableName}, RolePermission: ${rolePermissionTableName}`);
    
    // ✅ Query UserRole table
    console.log(`🔍 [UserAccess] Querying UserRole with DynamoDB`);
    
    const userRoleQueryStart = Date.now();
    const userRoleResponse = await docClient.send(new ScanCommand({
      TableName: userRoleTableName,
      FilterExpression: 'email = :email AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':email': email,
        ':isActive': true
      }
    }));
    
    const userRoleQueryTime = Date.now() - userRoleQueryStart;
    console.log(`⏱️ [UserAccess] UserRole query completed in ${userRoleQueryTime}ms`);
    console.log(`📊 [UserAccess] UserRole query returned ${userRoleResponse.Items?.length || 0} items`);
    
    if (!userRoleResponse.Items || userRoleResponse.Items.length === 0) {
      console.error(`❌ [UserAccess] No active user found for email: ${email}`);
      return NextResponse.json({ 
        success: false, 
        error: 'User not found or inactive',
        debug: {
          email,
          queryMethod: 'DynamoDB',
          itemsFound: 0
        }
      }, { status: 404 });
    }
    
    // ✅ Enhanced user role processing
    console.log(`👤 [UserAccess] Found ${userRoleResponse.Items.length} user role(s)`);
    userRoleResponse.Items.forEach((item, index) => {
      console.log(`👤 [UserAccess] User role ${index + 1}:`, {
        email: item.email,
        name: item.name,
        roleTitle: item.roleTitle,
        level: item.level,
        plant: item.plant,
        hierarchyString: item.hierarchyString
      });
    });
    
    // Get primary role (lowest level number = highest access)
    const primaryRole = userRoleResponse.Items.reduce((prev, current) => 
      (current.level || 5) < (prev.level || 5) ? current : prev
    );
    
    console.log(`👑 [UserAccess] Primary role selected:`, {
      roleTitle: primaryRole.roleTitle,
      level: primaryRole.level,
      hierarchyString: primaryRole.hierarchyString
    });
    
    // ✅ Query RolePermission table
    console.log(`🔍 [UserAccess] Querying RolePermission with DynamoDB`);
    
    const rolePermissionQueryStart = Date.now();
    const rolePermissionResponse = await docClient.send(new ScanCommand({
      TableName: rolePermissionTableName
    }));
    
    const rolePermissionQueryTime = Date.now() - rolePermissionQueryStart;
    console.log(`⏱️ [UserAccess] RolePermission query completed in ${rolePermissionQueryTime}ms`);
    console.log(`📊 [UserAccess] RolePermission query returned ${rolePermissionResponse.Items?.length || 0} items`);
    
    if (rolePermissionResponse.Items && rolePermissionResponse.Items.length > 0) {
      console.log(`🔐 [UserAccess] Available role permissions:`, 
        rolePermissionResponse.Items.map(item => item.roleTitle).filter(Boolean)
      );
    }
    
    // ✅ Enhanced permission mapping
    const permissions = mapPermissions(
      rolePermissionResponse.Items || [], 
      primaryRole.level || 5, 
      primaryRole.roleTitle || ''
    );
    
    // ✅ Enhanced user access object construction
    const userAccess = {
      email: primaryRole.email || '',
      name: primaryRole.name || '',
      roleTitle: primaryRole.roleTitle || '',
      level: primaryRole.level || 5,
      plant: primaryRole.plant || '',
      division: primaryRole.division || '',
      platform: primaryRole.platform || '',
      segment: primaryRole.segment || '',
      enterprise: primaryRole.enterprise || '',
      hierarchyString: primaryRole.hierarchyString || '',
      accessScope: getAccessScope(primaryRole.level || 5),
      permissions,
      cognitoGroups: mapToCognitoGroups(primaryRole.roleTitle || '', primaryRole.level || 5),
      isActive: primaryRole.isActive ?? true,
      lastUpdated: new Date().toISOString(),
      
      // ✅ Additional plant assignments for multi-plant users
      plantAssignments: userRoleResponse.Items.map(role => ({
        roleTitle: role.roleTitle,
        plant: role.plant,
        division: role.division,
        hierarchyString: role.hierarchyString,
        level: role.level
      })).filter(assignment => assignment.plant),
      
      // ✅ Additional fields for comprehensive user info
      accessibleHierarchies: generateAccessibleHierarchies(
        primaryRole.hierarchyString || '', 
        primaryRole.level || 5
      ),
      
      // ✅ Enhanced metadata
      metadata: {
        totalRoles: userRoleResponse.Items.length,
        primaryRoleEmail: primaryRole.email, // Use email instead of non-existent id
        queryTimestamp: new Date().toISOString(),
        dataSource: 'DynamoDB-Direct'
      }
    };
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ [UserAccess] Successfully processed user access for: ${email} in ${totalTime}ms`);
    console.log(`📊 [UserAccess] Final user access summary:`, {
      email: userAccess.email,
      roleTitle: userAccess.roleTitle,
      level: userAccess.level,
      accessScope: userAccess.accessScope,
      permissionCount: Object.values(permissions).filter(Boolean).length,
      cognitoGroups: userAccess.cognitoGroups,
      plantAssignments: userAccess.plantAssignments.length
    });
    
    console.log(`🏁 [UserAccess] ===== DynamoDB API REQUEST END (SUCCESS) =====`);
    
    return NextResponse.json({ 
      success: true, 
      userAccess,
      debug: {
        processingTime: totalTime,
        queryMethod: 'DynamoDB',
        tablesQueried: ['UserRole', 'RolePermission'],
        environment: 'DynamoDB-Direct',
        userRoleQueryTime,
        rolePermissionQueryTime
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [UserAccess] DynamoDB Error after ${totalTime}ms:`, error);
    
    // ✅ Enhanced error analysis for DynamoDB
    if (error instanceof Error) {
      console.error(`❌ [UserAccess] Error name: ${error.name}`);
      console.error(`❌ [UserAccess] Error message: ${error.message}`);
      console.error(`❌ [UserAccess] Error stack:`, error.stack);
      
      // Check for specific DynamoDB errors
      if (error.message.includes('DynamoDB')) {
        console.error(`🔗 [UserAccess] DYNAMODB ERROR: DynamoDB query failed`);
      } else if (error.message.includes('AWS')) {
        console.error(`🔧 [UserAccess] AWS ERROR: AWS configuration issue`);
      } else if (error.message.includes('Network')) {
        console.error(`🌐 [UserAccess] NETWORK ERROR: Network connectivity issue`);
      }
    }
    
    console.log(`🏁 [UserAccess] ===== DynamoDB API REQUEST END (ERROR) =====`);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get user access level',
      debug: process.env.NODE_ENV === 'development' ? {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : 'Unknown',
        processingTime: totalTime,
        queryMethod: 'DynamoDB'
      } : undefined
    }, { status: 500 });
  }
}
