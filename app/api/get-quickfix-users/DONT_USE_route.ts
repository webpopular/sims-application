// app/api/get-quickfix-users/route.ts - COMPLETE DynamoDB Implementation
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

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

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [QuickFixUsers] API endpoint called - fetching ONLY Quick Fix authorized users...');
    console.log('🔧 [QuickFixUsers] Using DynamoDB client with environment variables');
    
    // ✅ Log environment variables for debugging (same as your working APIs)
    console.log('🔑 ENV - MY_AWS_ACCESS_KEY_ID:', process.env.MY_AWS_ACCESS_KEY_ID);
    console.log('🔑 ENV - MY_AWS_REGION:', process.env.MY_AWS_REGION);
    console.log('🔑 ENV - MY_AMPLIFY_APP_ID:', process.env.MY_AMPLIFY_APP_ID);
    console.log('🔑 ENV - MY_AMPLIFY_BRANCH:', process.env.MY_AMPLIFY_BRANCH);
    
    // ✅ DEPLOYMENT-READY: Use dynamic table names with MY_ prefix
    const rolePermissionTableName = getTableName('RolePermission');
    console.log(`📊 [QuickFixUsers] Scanning RolePermission table: ${rolePermissionTableName} for canTakeQuickFixActions = true`);
    
    const rolePermissionQueryStart = Date.now();
    const rolePermissionResponse = await docClient.send(new ScanCommand({
      TableName: rolePermissionTableName,
      // ✅ CRITICAL: Filter ONLY for Quick Fix permissions
      FilterExpression: 'canTakeQuickFixActions = :canQuickFix',
      ExpressionAttributeValues: {
        ':canQuickFix': true  // ✅ Only roles with Quick Fix permission
      }
    }));
    
    const rolePermissionQueryTime = Date.now() - rolePermissionQueryStart;
    console.log(`⏱️ [QuickFixUsers] RolePermission query completed in ${rolePermissionQueryTime}ms`);

    const quickFixRoles = rolePermissionResponse.Items?.map(item => item.roleTitle) || [];
    console.log('✅ [QuickFixUsers] QUICK FIX ONLY roles found:', quickFixRoles);
    console.log('📊 [QuickFixUsers] Quick Fix roles count:', quickFixRoles.length);

    if (quickFixRoles.length === 0) {
      console.warn('⚠️ [QuickFixUsers] NO Quick Fix roles found - check RolePermission table');
      return NextResponse.json({ 
        success: true, 
        users: [],
        count: 0,
        message: 'No Quick Fix authorized roles found in RolePermission table',
        quickFixRoles: []
      });
    }

    // ✅ DEPLOYMENT-READY: Use dynamic table names with MY_ prefix
    const userRoleTableName = getTableName('UserRole');
    console.log(`📊 [QuickFixUsers] Scanning UserRole table: ${userRoleTableName} for Quick Fix roles ONLY: ${quickFixRoles.join(', ')}`);
    
    // ✅ Build dynamic filter expression for Quick Fix roles only
    const filterExpression = 'isActive = :isActive AND (' + 
      quickFixRoles.map((_, index) => `roleTitle = :role${index}`).join(' OR ') + ')';
    
    const expressionAttributeValues = {
      ':isActive': true,
      ...quickFixRoles.reduce((acc, role, index) => {
        acc[`:role${index}`] = role;
        return acc;
      }, {} as Record<string, string>)
    };

    console.log('🔍 [QuickFixUsers] Filter Expression:', filterExpression);
    console.log('🔍 [QuickFixUsers] Expression Values:', expressionAttributeValues);

    const userQueryStart = Date.now();
    const userRoleResponse = await docClient.send(new ScanCommand({
      TableName: userRoleTableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues
    }));
    
    const userQueryTime = Date.now() - userQueryStart;
    console.log(`⏱️ [QuickFixUsers] UserRole query completed in ${userQueryTime}ms`);
    console.log(`📊 [QuickFixUsers] Found ${userRoleResponse.Items?.length || 0} users with Quick Fix roles`);

    const quickFixUsers = (userRoleResponse.Items || [])
      .filter(user => {
        const isValid = user.email && 
                       user.email.includes('@') && 
                       user.name && 
                       user.isActive !== false;
        
        if (!isValid) {
          console.log(`❌ [QuickFixUsers] Filtered out invalid user: ${user.email}`);
        } else {
          console.log(`✅ [QuickFixUsers] Valid Quick Fix user: ${user.name} (${user.email}) - Role: ${user.roleTitle}`);
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
        hierarchyString: user.hierarchyString || '',
        isActive: user.isActive ?? true,
        canTakeQuickFixActions: true  // ✅ Mark as Quick Fix authorized
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`✅ [QuickFixUsers] FINAL Quick Fix authorized users: ${quickFixUsers.length}`);
    console.log('👥 [QuickFixUsers] Quick Fix users:', quickFixUsers.map(u => `${u.name} (${u.roleTitle})`));

    return NextResponse.json({ 
      success: true, 
      users: quickFixUsers,
      count: quickFixUsers.length,
      quickFixRoles: quickFixRoles,
      totalScanned: userRoleResponse.Items?.length || 0,
      permissionFilter: 'canTakeQuickFixActions = true',
      // ✅ Debug info (same as working APIs)
      debug: {
        queryMethod: 'DynamoDB',
        dataSource: 'RolePermission + UserRole',
        rolePermissionQueryTime,
        userQueryTime,
        totalProcessingTime: Date.now() - rolePermissionQueryStart,
        quickFixRolesFound: quickFixRoles.length,
        totalUsersScanned: userRoleResponse.Items?.length || 0,
        finalQuickFixUsers: quickFixUsers.length
      },
      // ✅ Environment info (same as working APIs)
      environment: process.env.MY_AMPLIFY_BRANCH || 'local',
      tableNames: {
        userRole: userRoleTableName,
        rolePermission: rolePermissionTableName
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [QuickFixUsers] DynamoDB Error:', error);
    
    // ✅ Enhanced error logging (same as your working APIs)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: `Failed to fetch Quick Fix users: ${errorMessage}`,
      users: [],
      count: 0,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
