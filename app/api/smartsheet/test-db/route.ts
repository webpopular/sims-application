// app/api/smartsheet/test-db/route.ts
import { NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export async function GET(request: Request) {
  return await testDynamoDBWrite();
}

export async function POST(request: Request) {
  return await testDynamoDBWrite();
}

async function testDynamoDBWrite() {
  try {
    console.log('Starting simple DynamoDB test write');
    
    // Generate a test ID
    const testId = `test-${Date.now()}`;
    
    // Get the actual table name from your Amplify outputs
    const tableName = 'SmartsheetInjury-veooqyh5ireufagj7kv3h2ybwm-NONE';
    
    console.log(`Writing test record to table: ${tableName}`);
    console.log(`Test ID: ${testId}`);
    
    // Create a simple test item
    const item = {
      id: testId,
      sheetId: "test-sheet-id",
      rowId: "test-row-id",
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    console.log('Item to write:', JSON.stringify(item));
    
    // Attempt to write to DynamoDB
    const result = await docClient.send(new PutCommand({
      TableName: tableName,
      Item: item
    }));
    
    console.log('Write result:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Test record written to DynamoDB',
      recordId: testId,
      tableName: tableName
    });
  } catch (error) {
    console.error('DynamoDB write error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
