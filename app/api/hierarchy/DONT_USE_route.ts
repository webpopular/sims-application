// app/api/hierarchy/route.ts - COMPLETE DynamoDB Implementation
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
    const level = searchParams.get('level');
    const parentHierarchy = searchParams.get('parent');
    const userHierarchy = searchParams.get('userHierarchy');
    const userLevel = searchParams.get('userLevel');
    
    console.log('🔍 [Hierarchy] API endpoint called - fetching hierarchy data...');
    console.log('🔧 [Hierarchy] Using DynamoDB client with environment variables');
    
    // ✅ Log environment variables for debugging (same as your working APIs)
    console.log('🔑 ENV - MY_AWS_ACCESS_KEY_ID:', process.env.MY_AWS_ACCESS_KEY_ID);
    console.log('🔑 ENV - MY_AWS_REGION:', process.env.MY_AWS_REGION);
    console.log('🔑 ENV - MY_AMPLIFY_APP_ID:', process.env.MY_AMPLIFY_APP_ID);
    console.log('🔑 ENV - MY_AMPLIFY_BRANCH:', process.env.MY_AMPLIFY_BRANCH);
    
    // ✅ DEPLOYMENT-READY: Use dynamic table names with MY_ prefix
    const tableName = getTableName('EnterpriseToPlantHierarchy');
    console.log(`📊 [Hierarchy] Using hierarchy table: ${tableName}`);
    
    let filterExpression = 'isActive = :isActive';
    let expressionAttributeValues: any = {
      ':isActive': true
    };
    let expressionAttributeNames: any = {};
    
    if (level) {
      // Get all records at specific level
      console.log(`📊 [Hierarchy] Fetching hierarchy records at level: ${level}`);
      filterExpression += ' AND #level = :level';
      expressionAttributeNames['#level'] = 'level';
      expressionAttributeValues[':level'] = parseInt(level);
    } else if (parentHierarchy) {
      // Get children of specific parent
      console.log(`📊 [Hierarchy] Fetching children of parent: ${parentHierarchy}`);
      filterExpression += ' AND parentHierarchyString = :parent';
      expressionAttributeValues[':parent'] = parentHierarchy;
    } else if (userHierarchy && userLevel) {
      // Get accessible hierarchies for user
      console.log(`📊 [Hierarchy] Fetching accessible hierarchies for user: ${userHierarchy} (Level ${userLevel})`);
      // Filter will be applied after query based on user access
    } else {
      // Get all active records
      console.log('📊 [Hierarchy] Fetching all active hierarchy records');
    }
    
    const scanParams: any = {
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues
    };
    
    if (Object.keys(expressionAttributeNames).length > 0) {
      scanParams.ExpressionAttributeNames = expressionAttributeNames;
    }
    
    const response = await docClient.send(new ScanCommand(scanParams));
    let items = response.Items || [];
    
    console.log(`📊 [Hierarchy] Found ${items.length} hierarchy records`);
    
    // Filter by user access if specified (preserving original logic)
    if (userHierarchy && userLevel) {
      items = filterByUserAccess(items, userHierarchy, parseInt(userLevel));
      console.log(`📊 [Hierarchy] After user access filtering: ${items.length} records`);
    }
    
    // Sort by level and sortOrder (preserving original logic)
    items.sort((a, b) => {
      if ((a.level || 0) !== (b.level || 0)) return (a.level || 0) - (b.level || 0);
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
    
    console.log(`✅ [Hierarchy] Successfully processed hierarchy data`);
    
    return NextResponse.json({
      success: true,
      hierarchies: items,
      count: items.length,
      // ✅ Debug info (same as working APIs)
      debug: {
        processingTime: Date.now(),
        queryMethod: 'DynamoDB',
        dataSource: 'EnterpriseToPlantHierarchy',
        filtersApplied: { level, parentHierarchy, userHierarchy, userLevel },
        totalItems: response.Items?.length || 0,
        filteredItems: items.length
      },
      // ✅ Environment info (same as working APIs)
      environment: process.env.MY_AMPLIFY_BRANCH || 'local',
      tableNames: {
        hierarchy: tableName
      }
    });
    
  } catch (error) {
    console.error('❌ [Hierarchy] Error fetching hierarchy data:', error);
    
    // ✅ Enhanced error logging for DynamoDB (same as working APIs)
    if (error instanceof Error) {
      console.error(`❌ [Hierarchy] Error name: ${error.name}`);
      console.error(`❌ [Hierarchy] Error message: ${error.message}`);
      
      // Check for specific DynamoDB errors
      if (error.message.includes('DynamoDB')) {
        console.error(`🔗 [Hierarchy] DYNAMODB ERROR: DynamoDB query failed`);
      } else if (error.message.includes('AWS')) {
        console.error(`🔧 [Hierarchy] AWS ERROR: AWS configuration issue`);
      } else if (error.message.includes('Network')) {
        console.error(`🌐 [Hierarchy] NETWORK ERROR: Network connectivity issue`);
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch hierarchy data',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

// ✅ Preserved original helper functions with same logic
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
        (item.hierarchyString || '').startsWith(userHierarchy)
      );
    case 5: // Plant
      return items.filter(item => 
        item.hierarchyString === userHierarchy ||
        userHierarchy.startsWith(item.hierarchyString || '')
      );
    default:
      return items.filter(item => 
        item.hierarchyString === userHierarchy
      );
  }
}

/// Usage in components (unchanged)
//const { data } = await fetch('/api/hierarchy?level=5'); // Get all plants
//const { data } = await fetch('/api/hierarchy?parent=ITW>Automotive OEM>TFM & Metals>TFM EU>'); // Get TFM EU plants
//const { data } = await fetch('/api/hierarchy?userHierarchy=ITW>Automotive OEM>TFM & Metals>TFM EU>&userLevel=4'); // Get accessible hierarchies for division user
