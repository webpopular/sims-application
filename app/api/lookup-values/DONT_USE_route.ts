// app/api/lookup-values/route.ts - COMPLETE DynamoDB Implementation with RBAC-based Plant Locations
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

// ✅ Helper function to determine access scope
function getAccessScope(level: number): string {
  const scopes = {
    1: 'ENTERPRISE',
    2: 'SEGMENT', 
    3: 'PLATFORM',
    4: 'DIVISION',
    5: 'PLANT'
  };
  
  return scopes[level as keyof typeof scopes] || 'PLANT';
}

// ✅ Get user access level to determine plant visibility using DynamoDB
async function getUserAccessLevel(userEmail: string) {
  try {
    console.log(`🔍 [LookupValues] Getting access level for: ${userEmail}`);
    
    const userRoleTableName = getTableName('UserRole');
    
    const userRoleResponse = await docClient.send(new ScanCommand({
      TableName: userRoleTableName,
      FilterExpression: 'email = :email AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':email': userEmail,
        ':isActive': true
      }
    }));

    if (!userRoleResponse.Items || userRoleResponse.Items.length === 0) {
      console.log(`❌ [LookupValues] No user found for: ${userEmail}`);
      return null;
    }

    // Get primary role (lowest level = highest access)
    const primaryRole = userRoleResponse.Items.reduce((prev, current) => 
      (current.level || 5) < (prev.level || 5) ? current : prev
    );

    return {
      email: primaryRole.email,
      level: primaryRole.level || 5,
      accessScope: getAccessScope(primaryRole.level || 5),
      hierarchyString: primaryRole.hierarchyString || '',
      plant: primaryRole.plant || '',
      division: primaryRole.division || '',
      platform: primaryRole.platform || '',
      segment: primaryRole.segment || '',
      enterprise: primaryRole.enterprise || ''
    };
  } catch (error) {
    console.error('❌ [LookupValues] Error getting user access level:', error);
    return null;
  }
}

// ✅ Get accessible plants based on user hierarchy and access level using EnterpriseToPlantHierarchy
async function getAccessiblePlants(userAccess: any) {
  try {
    console.log(`🏢 [LookupValues] Getting plants for ${userAccess.accessScope} user: ${userAccess.email}`);
    console.log(`🏢 [LookupValues] User hierarchy: ${userAccess.hierarchyString}`);

    const hierarchyTableName = getTableName('EnterpriseToPlantHierarchy');
    
    let filterExpression = 'isActive = :isActive AND #level = :level';
    let expressionAttributeValues: any = {
      ':isActive': true,
      ':level': 5 // Only get plant-level entries
    };
    let expressionAttributeNames: any = {
      '#level': 'level'
    };

    // ✅ Apply hierarchy-based filtering based on user access scope
    switch (userAccess.accessScope) {
      case 'ENTERPRISE':
        // Enterprise users see all plants
        console.log(`🌐 [LookupValues] Enterprise access - showing all plants`);
        break;
        
      case 'SEGMENT':
        // Segment users see all plants in their segment
        if (userAccess.segment) {
          filterExpression += ' AND segment = :segment';
          expressionAttributeValues[':segment'] = userAccess.segment;
        }
        console.log(`🏭 [LookupValues] Segment access - showing plants in segment: ${userAccess.segment}`);
        break;
        
      case 'PLATFORM':
        // Platform users see all plants in their platform
        if (userAccess.platform) {
          filterExpression += ' AND platform = :platform';
          expressionAttributeValues[':platform'] = userAccess.platform;
        }
        console.log(`🏗️ [LookupValues] Platform access - showing plants in platform: ${userAccess.platform}`);
        break;
        
      case 'DIVISION':
        // Division users see all plants in their division
        if (userAccess.division) {
          filterExpression += ' AND division = :division';
          expressionAttributeValues[':division'] = userAccess.division;
        }
        console.log(`🏢 [LookupValues] Division access - showing plants in division: ${userAccess.division}`);
        break;
        
      case 'PLANT':
        // Plant users see only their specific plant(s)
        if (userAccess.hierarchyString) {
          filterExpression += ' AND hierarchyString = :hierarchyString';
          expressionAttributeValues[':hierarchyString'] = userAccess.hierarchyString;
        } else if (userAccess.plant) {
          filterExpression += ' AND plant = :plant';
          expressionAttributeValues[':plant'] = userAccess.plant;
        }
        console.log(`🏭 [LookupValues] Plant access - showing only user's plant: ${userAccess.plant}`);
        break;
    }

    const hierarchyResponse = await docClient.send(new ScanCommand({
      TableName: hierarchyTableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames
    }));

    if (!hierarchyResponse.Items) {
      console.log(`❌ [LookupValues] No hierarchy data found`);
      return [];
    }

    // ✅ Extract and organize plant data with proper null handling
    const plants = hierarchyResponse.Items
      .filter(item => item.plant && item.plant !== 'na' && item.plant !== '')
      .map(item => ({
        id: item.id,
        value: item.plant || '',
        label: item.plant || '',
        hierarchyString: item.hierarchyString || '',
        division: item.division || '',
        platform: item.platform || '',
        segment: item.segment || '',
        enterprise: item.enterprise || '',
        sortOrder: item.sortOrder || 0
      }))
      .sort((a, b) => {
        // Sort by hierarchy level, then alphabetically
        if (a.sortOrder !== b.sortOrder) return (a.sortOrder || 0) - (b.sortOrder || 0);
        return a.label.localeCompare(b.label);
      });

    // ✅ Remove duplicates (some users might have multiple roles for same plant)
    const uniquePlants = plants.filter((plant, index, self) => 
      index === self.findIndex(p => p.value === plant.value)
    );

    console.log(`✅ [LookupValues] Found ${uniquePlants.length} accessible plants for user`);
    return uniquePlants;

  } catch (error) {
    console.error('❌ [LookupValues] Error getting accessible plants:', error);
    return [];
  }
}

// ✅ Get hardcoded lookup values for other categories (since we're focusing on plant locations)
function getHardcodedLookupValues() {
  // ✅ Based on your RBAC data, provide common lookup values
  const workActivityTypes = [
    'Maintenance',
    'Production',
    'Quality Control',
    'Material Handling',
    'Administrative',
    'Training',
    'Other'
  ];

  const injuryTypes = [
    'Cut/Laceration',
    'Bruise/Contusion',
    'Strain/Sprain',
    'Burn',
    'Chemical Exposure',
    'Eye Injury',
    'Fracture',
    'Other'
  ];

  const bodyParts = [
    'Head',
    'Eyes',
    'Face',
    'Neck',
    'Shoulder',
    'Arm',
    'Hand',
    'Finger',
    'Back',
    'Chest',
    'Abdomen',
    'Leg',
    'Knee',
    'Foot',
    'Toe',
    'Multiple',
    'Other'
  ];

  const injuryCauses = [
    'Struck by Object',
    'Struck Against Object',
    'Caught In/Between',
    'Fall Same Level',
    'Fall Different Level',
    'Overexertion',
    'Chemical Contact',
    'Temperature Extreme',
    'Electrical Contact',
    'Repetitive Motion',
    'Other'
  ];

  return {
    workActivityTypes,
    injuryTypes,
    bodyParts,
    injuryCauses
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log(`🚀 [LookupValues] ===== DynamoDB RBAC-based Plant Locations API START =====`);
  
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail') || 'system';
    const category = searchParams.get('category');
    
    console.log(`🔍 [LookupValues] Fetching RBAC-based lookup values for user: ${userEmail}`);
    console.log(`🔧 [LookupValues] Using DynamoDB client with environment variables`);
    
    // ✅ Log environment variables for debugging (same as your working APIs)
    console.log('🔑 ENV - MY_AWS_ACCESS_KEY_ID:', process.env.MY_AWS_ACCESS_KEY_ID);
    console.log('🔑 ENV - MY_AWS_REGION:', process.env.MY_AWS_REGION);
    console.log('🔑 ENV - MY_AMPLIFY_APP_ID:', process.env.MY_AMPLIFY_APP_ID);
    console.log('🔑 ENV - MY_AMPLIFY_BRANCH:', process.env.MY_AMPLIFY_BRANCH);
    
    // ✅ Get user access level to determine plant visibility
    let userAccess = null;
    
    if (userEmail !== 'system') {
      userAccess = await getUserAccessLevel(userEmail);
      
      if (!userAccess) {
        console.warn(`⚠️ [LookupValues] No user access found for: ${userEmail}, using default plant access`);
      }
    }

    // ✅ Get accessible plants based on user hierarchy and role
    const accessiblePlants = userAccess ? await getAccessiblePlants(userAccess) : [];
    
    // ✅ Get hardcoded lookup values for other categories
    const { workActivityTypes, injuryTypes, bodyParts, injuryCauses } = getHardcodedLookupValues();

    // ✅ Convert plants to the expected format
    const plantLocations = accessiblePlants.map(plant => plant.value);
    const plantLocationData = accessiblePlants;

    const totalTime = Date.now() - startTime;
    console.log(`✅ [LookupValues] Successfully processed RBAC-based lookup values in ${totalTime}ms`);
    console.log(`📊 [LookupValues] User access scope: ${userAccess?.accessScope || 'UNKNOWN'}`);
    console.log(`🏭 [LookupValues] Accessible plants: ${plantLocations.length}`);
    
    // ✅ Enhanced response with RBAC-based plant data (maintaining exact same structure)
    const response = {
      success: true,
      userEmail,
      userAccess: userAccess ? {
        level: userAccess.level,
        accessScope: userAccess.accessScope,
        hierarchyString: userAccess.hierarchyString
      } : null,
      
      // ✅ RBAC-based plant locations
      plantLocationCount: plantLocations.length,
      plantLocations,
      PlantLocation: plantLocationData, // Detailed plant data with hierarchy info
      
      // ✅ Hardcoded lookup categories for backward compatibility
      workActivityTypes,
      injuryTypes,
      bodyParts,
      injuryCauses,
      
      // ✅ Organized data for backward compatibility
      WorkActivityType: workActivityTypes.map((type, index) => ({
        id: `work-${index}`,
        value: type,
        label: type,
        isActive: true,
        sortOrder: index
      })),
      
      InjuryType: injuryTypes.map((type, index) => ({
        id: `injury-${index}`,
        value: type,
        label: type,
        isActive: true,
        sortOrder: index
      })),
      
      BodyPart: bodyParts.map((part, index) => ({
        id: `body-${index}`,
        value: part,
        label: part,
        isActive: true,
        sortOrder: index
      })),
      
      InjuryCause: injuryCauses.map((cause, index) => ({
        id: `cause-${index}`,
        value: cause,
        label: cause,
        isActive: true,
        sortOrder: index
      })),
      
      // ✅ Debug info (same as working APIs)
      debug: {
        processingTime: totalTime,
        queryMethod: 'DynamoDB + RBAC',
        dataSource: 'EnterpriseToPlantHierarchy + Hardcoded',
        userAccessScope: userAccess?.accessScope || 'NONE',
        plantsAccessible: plantLocations.length,
        filtersApplied: { category, userEmail }
      },
      
      // ✅ Environment info (same as working APIs)
      environment: process.env.MY_AMPLIFY_BRANCH || 'local',
      tableNames: {
        hierarchy: getTableName('EnterpriseToPlantHierarchy'),
        userRole: getTableName('UserRole')
      }
    };
    
    console.log(`🏁 [LookupValues] ===== DynamoDB RBAC-based API REQUEST END (SUCCESS) =====`);
    
    return NextResponse.json(response);

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [LookupValues] DynamoDB Error after ${totalTime}ms:`, error);
    
    // ✅ Enhanced error analysis for DynamoDB (same as working APIs)
    if (error instanceof Error) {
      console.error(`❌ [LookupValues] Error name: ${error.name}`);
      console.error(`❌ [LookupValues] Error message: ${error.message}`);
      
      // Check for specific DynamoDB errors
      if (error.message.includes('DynamoDB')) {
        console.error(`🔗 [LookupValues] DYNAMODB ERROR: DynamoDB query failed`);
      } else if (error.message.includes('AWS')) {
        console.error(`🔧 [LookupValues] AWS ERROR: AWS configuration issue`);
      } else if (error.message.includes('Network')) {
        console.error(`🌐 [LookupValues] NETWORK ERROR: Network connectivity issue`);
      }
    }
    
    console.log(`🏁 [LookupValues] ===== DynamoDB RBAC-based API REQUEST END (ERROR) =====`);
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch RBAC-based lookup values',
      userEmail: 'No user',
      plantLocationCount: 0,
      plantLocations: [],
      workActivityTypes: [],
      injuryTypes: [],
      bodyParts: [],
      injuryCauses: [],
      debug: process.env.NODE_ENV === 'development' ? {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingTime: totalTime,
        queryMethod: 'DynamoDB + RBAC'
      } : undefined
    }, { status: 500 });
  }
}
