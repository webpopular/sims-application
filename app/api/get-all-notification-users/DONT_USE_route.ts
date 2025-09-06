// app/api/get-all-notification-users/route.ts - COMPLETE DynamoDB Implementation
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
  const startTime = Date.now();
  console.log(`🚀 [NotificationUsers] ===== DynamoDB API REQUEST START =====`);
  
  try {
    console.log('🔍 [NotificationUsers] API endpoint called - fetching all notification users...');
    console.log('🔧 [NotificationUsers] Using DynamoDB client with environment variables');
    
    // ✅ Log environment variables for debugging (same as your working APIs)
    console.log('🔑 ENV - MY_AWS_ACCESS_KEY_ID:', process.env.MY_AWS_ACCESS_KEY_ID);
    console.log('🔑 ENV - MY_AWS_REGION:', process.env.MY_AWS_REGION);
    console.log('🔑 ENV - MY_AMPLIFY_APP_ID:', process.env.MY_AMPLIFY_APP_ID);
    console.log('🔑 ENV - MY_AMPLIFY_BRANCH:', process.env.MY_AMPLIFY_BRANCH);
    
    // ✅ DEPLOYMENT-READY: Use dynamic table names with MY_ prefix
    const userRoleTableName = getTableName('UserRole');
    console.log(`📊 [NotificationUsers] Scanning UserRole table: ${userRoleTableName}`);
    
    const userQueryStart = Date.now();
    const userRoleResponse = await docClient.send(new ScanCommand({
      TableName: userRoleTableName,
      FilterExpression: 'isActive = :isActive',
      ExpressionAttributeValues: {
        ':isActive': true
      }
    }));
    
    const userQueryTime = Date.now() - userQueryStart;
    console.log(`⏱️ [NotificationUsers] UserRole query completed in ${userQueryTime}ms`);
    console.log(`📊 [NotificationUsers] Found ${userRoleResponse.Items?.length || 0} active users`);

    // ✅ Process and filter users (preserving ALL original logic)
    const allUsers = (userRoleResponse.Items || [])
      .filter(user => {
        const isValid = user.email && 
                       user.email.includes('@') && 
                       user.name && 
                       user.isActive !== false;
        
        if (!isValid) {
          console.log(`❌ [NotificationUsers] Filtered out user: ${user.email} - Missing required fields`);
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
        cognitoGroups: (user.cognitoGroups || []).filter((group: any): group is string => group !== null),
        createdAt: user.createdAt || '',
        updatedAt: user.updatedAt || ''
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // ✅ Preserve original sorting

    const totalTime = Date.now() - startTime;
    console.log(`✅ [NotificationUsers] Successfully processed ${allUsers.length} notification users in ${totalTime}ms`);
    console.log('👥 [NotificationUsers] Sample notification users:', allUsers.slice(0, 3));

    return NextResponse.json({ 
      success: true, 
      users: allUsers,
      count: allUsers.length,
      totalScanned: userRoleResponse.Items?.length || 0,
      // ✅ Debug info (preserving original structure)
      debug: {
        processingTime: totalTime,
        queryMethod: 'DynamoDB',
        dataSource: 'UserRole',
        userQueryTime,
        totalProcessingTime: totalTime,
        totalUsersScanned: userRoleResponse.Items?.length || 0,
        finalNotificationUsers: allUsers.length
      },
      // ✅ Environment info (same as working APIs)
      environment: process.env.MY_AMPLIFY_BRANCH || 'local',
      tableNames: {
        userRole: userRoleTableName
      }
    }, { status: 200 });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [NotificationUsers] DynamoDB Error after ${totalTime}ms:`, error);
    
    // ✅ Enhanced error analysis for DynamoDB (same as working APIs)
    if (error instanceof Error) {
      console.error(`❌ [NotificationUsers] Error name: ${error.name}`);
      console.error(`❌ [NotificationUsers] Error message: ${error.message}`);
      
      // Check for specific DynamoDB errors
      if (error.message.includes('DynamoDB')) {
        console.error(`🔗 [NotificationUsers] DYNAMODB ERROR: DynamoDB query failed`);
      } else if (error.message.includes('AWS')) {
        console.error(`🔧 [NotificationUsers] AWS ERROR: AWS configuration issue`);
      } else if (error.message.includes('Network')) {
        console.error(`🌐 [NotificationUsers] NETWORK ERROR: Network connectivity issue`);
      }
    }
    
    console.log(`🏁 [NotificationUsers] ===== DynamoDB API REQUEST END (ERROR) =====`);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: `Failed to fetch notification users: ${errorMessage}`,
      users: [],
      count: 0,
      totalScanned: 0,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
