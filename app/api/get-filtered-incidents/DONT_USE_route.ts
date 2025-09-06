// app/api/get-filtered-incidents/route.ts - COMPLETE DynamoDB Implementation with FIXED Types
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { buildServerHierarchyFilter } from '@/lib/services/serverDataFiltering';

// ✅ Use same DynamoDB client pattern as your working APIs
const dynamoClient = new DynamoDBClient({
  region: process.env.MY_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
    convertClassInstanceToMap: false
  }
});

// ✅ Dynamic table name resolution using MY_ prefixed env vars
function getTableName(modelName: string): string {
  const envTableName = process.env[`MY_AMPLIFY_TABLE_${modelName.toUpperCase()}`];
  if (envTableName) {
    console.log(`📊 Using environment table name: ${envTableName}`);
    return envTableName;
  }
  
  const appId = process.env.MY_AMPLIFY_APP_ID || '3d7zjk5vgzdlnee7sno3eve6r4';
  const branch = process.env.MY_AMPLIFY_BRANCH || 'NONE';
  
  const tableName = `${modelName}-${appId}-${branch}`;
  console.log(`📊 Generated table name: ${tableName}`);
  return tableName;
}

// ✅ FIXED: Proper TypeScript type for accessScope with specific union type
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

// ✅ Generate accessible hierarchies function
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

// ✅ Enhanced permission mapping based on your RBAC spreadsheet
function mapPermissions(rolePermissions: any[], userLevel: number, roleTitle: string) {
  console.log(`🔐 [FilteredIncidents] Mapping permissions for role: ${roleTitle}, level: ${userLevel}`);
  console.log(`🔐 [FilteredIncidents] Found ${rolePermissions.length} role permission records`);
  
  // Find the specific role permission
  const rolePermission = rolePermissions.find(rp => 
    rp.roleTitle === roleTitle || 
    rp.roleTitle?.toLowerCase() === roleTitle?.toLowerCase()
  );
  
  if (!rolePermission) {
    console.warn(`⚠️ [FilteredIncidents] No role permission found for: ${roleTitle}`);
    console.log(`🔐 [FilteredIncidents] Available roles:`, rolePermissions.map(rp => rp.roleTitle));
    return getDefaultPermissions();
  }
  
  console.log(`✅ [FilteredIncidents] Found role permission for: ${roleTitle}`);
  console.log(`🔐 [FilteredIncidents] Permission data:`, rolePermission);
  
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
    canSubmitDSATicket: rolePermission?.canSubmitDSATicket === true,
    canApproveLessonsLearned: rolePermission?.canApproveLessonsLearned === true,
  };
  
  const enabledPermissions = Object.entries(permissions).filter(([_, value]) => value).map(([key, _]) => key);
  console.log(`✅ [FilteredIncidents] Mapped ${enabledPermissions.length} enabled permissions:`, enabledPermissions);
  
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
    canSubmitDSATicket: false,
    canApproveLessonsLearned: false,
  };
}

// ✅ FIXED: Server-side user access function using DynamoDB with proper type handling
async function getServerUserAccess(email: string) {
  try {
    console.log(`🔍 [FilteredIncidents] Getting access for: ${email}`);
    console.log('🔧 [FilteredIncidents] Using DynamoDB client with environment variables');
    
    // ✅ Log environment variables for debugging (same as your working APIs)
    console.log('🔑 ENV - MY_AWS_ACCESS_KEY_ID:', process.env.MY_AWS_ACCESS_KEY_ID);
    console.log('🔑 ENV - MY_AWS_REGION:', process.env.MY_AWS_REGION);
    console.log('🔑 ENV - MY_AMPLIFY_APP_ID:', process.env.MY_AMPLIFY_APP_ID);
    console.log('🔑 ENV - MY_AMPLIFY_BRANCH:', process.env.MY_AMPLIFY_BRANCH);
    
    const userRoleTableName = getTableName('UserRole');
    const rolePermissionTableName = getTableName('RolePermission');
    
    const userRoleResponse = await docClient.send(new ScanCommand({
      TableName: userRoleTableName,
      FilterExpression: 'email = :email AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':email': email,
        ':isActive': true
      }
    }));

    if (!userRoleResponse.Items || userRoleResponse.Items.length === 0) {
      console.log(`❌ [FilteredIncidents] No user found for: ${email}`);
      return null;
    }

    // Get primary role (lowest level = highest access)
    const primaryRole = userRoleResponse.Items.reduce((prev, current) => 
      (current.level || 5) < (prev.level || 5) ? current : prev
    );

    // Get role permissions
    const rolePermissionResponse = await docClient.send(new ScanCommand({
      TableName: rolePermissionTableName
    }));

    // Enhanced permission mapping
    const permissions = mapPermissions(
      rolePermissionResponse.Items || [], 
      primaryRole.level || 5, 
      primaryRole.roleTitle || ''
    );

    // ✅ FIXED: Proper type annotation with explicit accessScope type
    const accessScope = getAccessScope(primaryRole.level || 5);
    const accessibleHierarchies = generateAccessibleHierarchies(
      primaryRole.hierarchyString || '', 
      primaryRole.level || 5
    );

    // ✅ FIXED: Complete userAccess object with proper types
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
      accessScope, // ✅ FIXED: Now properly typed as union type
      permissions,
      cognitoGroups: (primaryRole.cognitoGroups || []).filter((group: any): group is string => group !== null),
      isActive: primaryRole.isActive ?? true,
      lastUpdated: new Date().toISOString(),
      accessibleHierarchies // ✅ FIXED: Added missing required property
    };

    console.log(`✅ [FilteredIncidents] User access retrieved for: ${email}`);
    return userAccess;

  } catch (error) {
    console.error(`❌ [FilteredIncidents] Error getting user access for ${email}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '100');
    const status = searchParams.get('status');
    const recordType = searchParams.get('recordType');
    const plantFilter = searchParams.get('plant');
    const divisionFilter = searchParams.get('division');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const severityFilter = searchParams.get('severity');
    const categoryFilter = searchParams.get('category');
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    console.log(`🔍 [FilteredIncidents] Getting filtered incidents for: ${email}`);
    console.log('🔧 [FilteredIncidents] Using DynamoDB client with environment variables');
    
    // Get user access data using DynamoDB
    const userAccess = await getServerUserAccess(email);
    if (!userAccess) {
      return NextResponse.json({ 
        success: false,
        error: 'User not found or inactive',
        data: [],
        incidents: []
      }, { status: 404 });
    }
    
    console.log(`🔍 [FilteredIncidents] Loading data for ${userAccess.accessScope} user:`, email);
    console.log(`🔍 [FilteredIncidents] User hierarchy:`, userAccess.hierarchyString);

    // ✅ Build hierarchy filter using server-side function
    const hierarchyFilter = buildServerHierarchyFilter(userAccess);

    let data: any[] = [];

    if (recordType === 'RECOGNITION') {
      try {
        const recognitionTableName = getTableName('Recognition');
        
        let filterExpression = 'isActive = :isActive';
        let expressionAttributeValues: any = {
          ':isActive': true
        };
        
        if (userAccess.accessScope !== 'ENTERPRISE') {
          filterExpression += ' AND begins_with(hierarchyString, :hierarchy)';
          expressionAttributeValues[':hierarchy'] = userAccess.hierarchyString;
        }
        
        const recognitionResponse = await docClient.send(new ScanCommand({
          TableName: recognitionTableName,
          FilterExpression: filterExpression,
          ExpressionAttributeValues: expressionAttributeValues
        }));
        
        data = recognitionResponse.Items || [];
        console.log(`✅ [FilteredIncidents] Found ${data.length} recognitions`);
      } catch (error) {
        console.error('❌ [FilteredIncidents] Error fetching recognitions:', error);
        data = [];
      }
    } else {
      try {
        const submissionTableName = getTableName('Submission');
        
        let filterExpression = 'isActive = :isActive';
        let expressionAttributeValues: any = {
          ':isActive': true
        };
        let expressionAttributeNames: any = {};
        
        // Add hierarchy filter
        if (userAccess.accessScope !== 'ENTERPRISE') {
          filterExpression += ' AND begins_with(hierarchyString, :hierarchy)';
          expressionAttributeValues[':hierarchy'] = userAccess.hierarchyString;
        }
        
        // Add record type filter
        if (recordType && recordType !== 'RECOGNITION') {
          filterExpression += ' AND recordType = :recordType';
          expressionAttributeValues[':recordType'] = recordType;
        }
        
        // Add status filter
        if (status) {
          filterExpression += ' AND #status = :status';
          expressionAttributeNames['#status'] = 'status';
          expressionAttributeValues[':status'] = status;
        }
        
        // Add plant filter
        if (plantFilter) {
          filterExpression += ' AND plant = :plant';
          expressionAttributeValues[':plant'] = plantFilter;
        }
        
        // Add division filter
        if (divisionFilter) {
          filterExpression += ' AND division = :division';
          expressionAttributeValues[':division'] = divisionFilter;
        }
        
        // Add severity filter
        if (severityFilter) {
          filterExpression += ' AND severity = :severity';
          expressionAttributeValues[':severity'] = severityFilter;
        }
        
        // Add category filter
        if (categoryFilter) {
          filterExpression += ' AND category = :category';
          expressionAttributeValues[':category'] = categoryFilter;
        }
        
        // Add date filters
        if (dateFrom) {
          filterExpression += ' AND createdAt >= :dateFrom';
          expressionAttributeValues[':dateFrom'] = dateFrom;
        }
        if (dateTo) {
          filterExpression += ' AND createdAt <= :dateTo';
          expressionAttributeValues[':dateTo'] = dateTo;
        }
        
        const scanParams: any = {
          TableName: submissionTableName,
          FilterExpression: filterExpression,
          ExpressionAttributeValues: expressionAttributeValues
        };
        
        if (Object.keys(expressionAttributeNames).length > 0) {
          scanParams.ExpressionAttributeNames = expressionAttributeNames;
        }
        
        const submissionResponse = await docClient.send(new ScanCommand(scanParams));
        
        data = submissionResponse.Items || [];
        console.log(`✅ [FilteredIncidents] Found ${data.length} submissions`);
      } catch (error) {
        console.error('❌ [FilteredIncidents] Error fetching submissions:', error);
        data = [];
      }
    }

    // Sort by creation date (newest first)
    const sortedSubmissions = data.sort((a, b) => {
      const dateA = new Date(a.createdAt || '').getTime();
      const dateB = new Date(b.createdAt || '').getTime();
      return dateB - dateA;
    });
    
    // Apply limit
    const limitedSubmissions = sortedSubmissions.slice(0, limit);

    console.log(`✅ [FilteredIncidents] Returning ${limitedSubmissions.length} records for user`);

    return NextResponse.json({
      success: true,
      data: limitedSubmissions,
      userAccess: {
        email: userAccess.email,
        accessScope: userAccess.accessScope,
        hierarchyString: userAccess.hierarchyString,
        level: userAccess.level
      },
      totalCount: limitedSubmissions.length,
      filters: {
        recordType: recordType || 'all',
        status: status || 'all',
        plant: plantFilter || 'all',
        division: divisionFilter || 'all',
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        severity: severityFilter || 'all',
        category: categoryFilter || 'all',
        appliedHierarchyFilter: hierarchyFilter,
        userAccessScope: userAccess.accessScope
      },
      debug: {
        queryMethod: 'DynamoDB',
        dataSource: recordType === 'RECOGNITION' ? 'Recognition' : 'Submission',
        userAccessScope: userAccess.accessScope,
        totalRecordsFound: data.length,
        recordsAfterLimit: limitedSubmissions.length
      },
      // ✅ Environment info (same as working APIs)
      environment: process.env.MY_AMPLIFY_BRANCH || 'local',
      tableNames: {
        submission: getTableName('Submission'),
        recognition: getTableName('Recognition'),
        userRole: getTableName('UserRole'),
        rolePermission: getTableName('RolePermission')
      }
    });

  } catch (error) {
    console.error('❌ [FilteredIncidents] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch filtered incidents',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
