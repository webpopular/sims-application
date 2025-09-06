// app/api/verify-hierarchy-data/route.ts - FIXED with dynamic table names and MY_ prefix
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// ✅ Dynamic table name resolution using MY_ prefixed env vars
function getTableName(modelName: string): string {
  // Check for specific table name override first (with MY_ prefix)
  const envTableName = process.env[`MY_AMPLIFY_TABLE_${modelName.toUpperCase()}`];
  if (envTableName) {
    console.log(`📊 Using environment table name: ${envTableName}`);
    return envTableName;
  }
  
  // Generate from MY_AMPLIFY_APP_ID and MY_AMPLIFY_BRANCH
  const appId = process.env.MY_AMPLIFY_APP_ID || 'veooqyh5ireufagj7kv3h2ybwm';
  const branch = process.env.MY_AMPLIFY_BRANCH || 'NONE';
  
  const tableName = `${modelName}-${appId}-${branch}`;
  console.log(`📊 Generated table name: ${tableName}`);
  return tableName;
}

// ✅ Use same DynamoDB client pattern as your working APIs
const dynamoClient = new DynamoDBClient({
  region: process.env.MY_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const parentHierarchy = searchParams.get('parent');
    const userHierarchy = searchParams.get('userHierarchy');
    const userLevel = searchParams.get('userLevel');
    
    console.log('🔍 API endpoint called - fetching hierarchy data...');
    
    // ✅ DEPLOYMENT-READY: Use dynamic table names with MY_ prefix
    const tableName = getTableName('EnterpriseToPlantHierarchy');
    console.log(`📊 Using hierarchy table: ${tableName}`);
    
    // ✅ Log environment variables for debugging (same as your working APIs)
    console.log('🔑 ENV - MY_AWS_ACCESS_KEY_ID:', process.env.MY_AWS_ACCESS_KEY_ID);
    console.log('🔑 ENV - MY_AWS_REGION:', process.env.MY_AWS_REGION);
    console.log('🔑 ENV - MY_AMPLIFY_APP_ID:', process.env.MY_AMPLIFY_APP_ID);
    console.log('🔑 ENV - MY_AMPLIFY_BRANCH:', process.env.MY_AMPLIFY_BRANCH);
    
    let command;
    
    if (level) {
      // Get all records at specific level
      console.log(`📊 Fetching hierarchy records at level: ${level}`);
      command = new ScanCommand({
        TableName: tableName,
        FilterExpression: '#level = :level AND isActive = :isActive',
        ExpressionAttributeNames: {
          '#level': 'level'
        },
        ExpressionAttributeValues: {
          ':level': parseInt(level),
          ':isActive': true
        }
      });
    } else if (parentHierarchy) {
      // Get children of specific parent
      console.log(`📊 Fetching children of parent: ${parentHierarchy}`);
      command = new ScanCommand({
        TableName: tableName,
        FilterExpression: 'parentHierarchyString = :parent AND isActive = :isActive',
        ExpressionAttributeValues: {
          ':parent': parentHierarchy,
          ':isActive': true
        }
      });
    } else if (userHierarchy && userLevel) {
      // Get accessible hierarchies for user
      console.log(`📊 Fetching accessible hierarchies for user: ${userHierarchy} (Level ${userLevel})`);
      const accessibleHierarchies = getAccessibleHierarchies(userHierarchy, parseInt(userLevel));
      
      command = new ScanCommand({
        TableName: tableName,
        FilterExpression: 'isActive = :isActive',
        ExpressionAttributeValues: {
          ':isActive': true
        }
      });
    } else {
      // Get all active records
      console.log('📊 Fetching all active hierarchy records');
      command = new ScanCommand({
        TableName: tableName,
        FilterExpression: 'isActive = :isActive',
        ExpressionAttributeValues: {
          ':isActive': true
        }
      });
    }
    
    const response = await docClient.send(command);
    let items = response.Items || [];
    
    console.log(`📊 Found ${items.length} hierarchy records`);
    
    // Filter by user access if specified
    if (userHierarchy && userLevel) {
      items = filterByUserAccess(items, userHierarchy, parseInt(userLevel));
      console.log(`📊 After user access filtering: ${items.length} records`);
    }
    
    // Sort by level and sortOrder
    items.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
    
    console.log(`✅ Successfully processed hierarchy data`);
    
    return NextResponse.json({
      success: true,
      hierarchies: items,
      count: items.length,
      // ✅ Debug info
      environment: process.env.MY_AMPLIFY_BRANCH || 'local',
      tableNames: {
        hierarchy: tableName
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching hierarchy data:', error);
    
    // ✅ Enhanced error logging (same as your working APIs)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch hierarchy data',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

function getAccessibleHierarchies(userHierarchy: string, userLevel: number): string[] {
  switch (userLevel) {
    case 1: // Enterprise
      return ['ITW>'];
    case 2: // Segment
    case 3: // Platform
    case 4: // Division
      return [userHierarchy];
    case 5: // Plant
      return [userHierarchy];
    default:
      return [userHierarchy];
  }
}

function filterByUserAccess(items: any[], userHierarchy: string, userLevel: number): any[] {
  switch (userLevel) {
    case 1: // Enterprise - see all
      return items;
    case 2: // Segment
    case 3: // Platform
    case 4: // Division
      return items.filter(item => 
        item.hierarchyString.startsWith(userHierarchy)
      );
    case 5: // Plant
      return items.filter(item => 
        item.hierarchyString === userHierarchy ||
        userHierarchy.startsWith(item.hierarchyString)
      );
    default:
      return items.filter(item => 
        item.hierarchyString === userHierarchy
      );
  }
}

/// Usage in components
//const { data } = await fetch('/api/hierarchy?level=5'); // Get all plants
//const { data } = await fetch('/api/hierarchy?parent=ITW>Automotive OEM>TFM & Metals>TFM EU>'); // Get TFM EU plants
//const { data } = await fetch('/api/hierarchy?userHierarchy=ITW>Automotive OEM>TFM & Metals>TFM EU>&userLevel=4'); // Get accessible hierarchies for division user
