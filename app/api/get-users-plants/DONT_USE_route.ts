// app/api/get-users-plants/route.ts - COMPLETE DynamoDB Implementation
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
    const { searchParams } = new URL(request.url);
    const plantFilter = searchParams.get('plant');
    const levelFilter = searchParams.get('level');
    const divisionFilter = searchParams.get('division');
    
    console.log('🔍 [UsersPlants] API endpoint called - fetching users with plant assignments...');
    console.log('🔧 [UsersPlants] Using DynamoDB client with environment variables');
    
    // ✅ Log environment variables for debugging (same as your working APIs)
    console.log('🔑 ENV - MY_AWS_ACCESS_KEY_ID:', process.env.MY_AWS_ACCESS_KEY_ID);
    console.log('🔑 ENV - MY_AWS_REGION:', process.env.MY_AWS_REGION);
    console.log('🔑 ENV - MY_AMPLIFY_APP_ID:', process.env.MY_AMPLIFY_APP_ID);
    console.log('🔑 ENV - MY_AMPLIFY_BRANCH:', process.env.MY_AMPLIFY_BRANCH);
    
    // ✅ DEPLOYMENT-READY: Use dynamic table names with MY_ prefix
    const userRoleTableName = getTableName('UserRole');
    console.log(`📊 [UsersPlants] Scanning UserRole table: ${userRoleTableName}`);
    
    // ✅ Build filter expression for users
    let filterExpression = 'isActive = :isActive';
    let expressionAttributeValues: any = {
      ':isActive': true
    };
    let expressionAttributeNames: any = {};
    
    if (plantFilter) {
      filterExpression += ' AND plant = :plant';
      expressionAttributeValues[':plant'] = plantFilter;
    }
    
    if (levelFilter) {
      filterExpression += ' AND #level = :level';
      expressionAttributeNames['#level'] = 'level';
      expressionAttributeValues[':level'] = parseInt(levelFilter);
    }
    
    if (divisionFilter) {
      filterExpression += ' AND division = :division';
      expressionAttributeValues[':division'] = divisionFilter;
    }
    
    console.log(`🔍 [UsersPlants] Filter Expression: ${filterExpression}`);
    console.log(`🔍 [UsersPlants] Expression Values:`, expressionAttributeValues);
    
    const scanParams: any = {
      TableName: userRoleTableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues
    };
    
    if (Object.keys(expressionAttributeNames).length > 0) {
      scanParams.ExpressionAttributeNames = expressionAttributeNames;
    }
    
    const userRoleResponse = await docClient.send(new ScanCommand(scanParams));
    
    console.log(`📊 [UsersPlants] Found ${userRoleResponse.Items?.length || 0} users`);

    const usersWithPlants = (userRoleResponse.Items || [])
      .filter(user => {
        const isValid = user.email && 
                       user.email.includes('@') && 
                       user.name;
        
        if (!isValid) {
          console.log(`❌ [UsersPlants] Filtered out user: ${user.email} - Missing required fields`);
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
        cognitoGroups: (user.cognitoGroups || []).filter((group: any): group is string => group !== null),
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
    const plantSummary: Record<string, any> = {};
    usersWithPlants.forEach(user => {
      const plant = user.plant || 'No Plant Assigned';
      if (!plantSummary[plant]) {
        plantSummary[plant] = {
          plantName: plant,
          userCount: 0,
          levels: new Set(),
          roles: new Set()
        };
      }
      plantSummary[plant].userCount++;
      plantSummary[plant].levels.add(user.level);
      plantSummary[plant].roles.add(user.roleTitle);
    });
    
    // ✅ Convert sets to arrays for JSON serialization (preserving original logic)
    const plantSummaryArray = Object.values(plantSummary).map((summary: any) => ({
      ...summary,
      levels: Array.from(summary.levels).sort(),
      roles: Array.from(summary.roles).sort()
    }));

    console.log(`✅ [UsersPlants] Final users count: ${usersWithPlants.length}`);

    return NextResponse.json({ 
      success: true, 
      users: usersWithPlants,
      count: usersWithPlants.length,
      plantSummary: plantSummaryArray,
      filters: {
        plant: plantFilter,
        level: levelFilter,
        division: divisionFilter
      },
      totalScanned: userRoleResponse.Items?.length || 0,
      // ✅ Debug info (same as working APIs)
      debug: {
        queryMethod: 'DynamoDB',
        dataSource: 'UserRole',
        totalUsersScanned: userRoleResponse.Items?.length || 0,
        finalUsersWithPlants: usersWithPlants.length
      },
      // ✅ Environment info (same as working APIs)
      environment: process.env.MY_AMPLIFY_BRANCH || 'local',
      tableNames: {
        userRole: userRoleTableName
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [UsersPlants] DynamoDB Error:', error);
    
    // ✅ Enhanced error logging (same as your working APIs)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: `Failed to fetch users with plants: ${errorMessage}`,
      users: [],
      count: 0,
      plantSummary: [],
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
