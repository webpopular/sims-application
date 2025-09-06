// app/api/smartsheet/test-single-record/route.ts
import { NextResponse } from 'next/server';
import { SMARTSHEET_CONFIG, SheetType } from '../config';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/schema';
import { Amplify } from 'aws-amplify';
import config from '@/amplify_outputs.json';
import { CloudWatchLogsClient, CreateLogGroupCommand, CreateLogStreamCommand, PutLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// Configure Amplify
console.log('Configuring Amplify...');
Amplify.configure(config);
console.log('Amplify configured successfully');

// Initialize the Amplify API client with IAM auth mode
console.log('Initializing API client with IAM auth mode...');
const client = generateClient<Schema>({
  authMode: 'iam'
});
console.log('API client initialized');

// Initialize CloudWatch client
const cloudWatchClient = new CloudWatchLogsClient({});

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Create a log group if it doesn't exist
async function ensureLogGroupExists(logGroupName: string) {
  try {
    const command = new CreateLogGroupCommand({
      logGroupName
    });
    await cloudWatchClient.send(command);
    console.log(`Created log group: ${logGroupName}`);
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && 'name' in error && error.name === 'ResourceAlreadyExistsException') {
      console.log(`Log group already exists: ${logGroupName}`);
      return true;
    } else if (error instanceof Error) {
      console.error('Error creating log group:', error);
    } else {
      console.error('Unknown error creating log group:', String(error));
    }
    return false;
  }
}

// Create a log stream
async function createLogStream(logGroupName: string, logStreamName: string) {
  try {
    const command = new CreateLogStreamCommand({
      logGroupName,
      logStreamName
    });
    await cloudWatchClient.send(command);
    console.log(`Created log stream: ${logStreamName}`);
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && 'name' in error && error.name === 'ResourceAlreadyExistsException') {
      console.log(`Log stream already exists: ${logStreamName}`);
      return true;
    } else if (error instanceof Error) {
      console.error('Error creating log stream:', error);
    } else {
      console.error('Unknown error creating log stream:', String(error));
    }
    return false;
  }
}

// Log to CloudWatch
async function logToCloudWatch(logGroupName: string, logStreamName: string, message: string) {
  try {
    // Ensure log group and stream exist
    const groupExists = await ensureLogGroupExists(logGroupName);
    if (!groupExists) {
      console.error('Failed to ensure log group exists, cannot log message');
      return;
    }
    
    const streamExists = await createLogStream(logGroupName, logStreamName);
    if (!streamExists) {
      console.error('Failed to ensure log stream exists, cannot log message');
      return;
    }
    
    const command = new PutLogEventsCommand({
      logGroupName,
      logStreamName,
      logEvents: [
        {
          timestamp: Date.now(),
          message
        }
      ]
    });
    await cloudWatchClient.send(command);
    console.log('Log event sent to CloudWatch');
  } catch (error) {
    console.error('Error sending log event to CloudWatch:', error);
  }
}

export async function GET(request: Request) {
  return await fetchAndStoreSingleRecord();
}

export async function POST(request: Request) {
  return await fetchAndStoreSingleRecord();
}

async function fetchAndStoreSingleRecord() {
  const logGroupName = '/aws/amplify/simsappdev/api/smartsheet';
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const logStreamName = `${today}/test-single-record`;
  
  try {
    await logToCloudWatch(logGroupName, logStreamName, 'Starting test to fetch and store a single Smartsheet record');
    
    // Use SEATS_NA_INJURY for this test
    const sheetType = 'SEATS_NA_INJURY' as SheetType;
    
    await logToCloudWatch(logGroupName, logStreamName, `Fetching data from Smartsheet for sheet: ${sheetType}`);
    
    // Fetch data from Smartsheet
    const response = await fetch(
      `${SMARTSHEET_CONFIG.API_URL}/sheets/${SMARTSHEET_CONFIG.SHEET_IDS[sheetType]}?rows=1`,  // Limit to 1 row
      {
        headers: {
          'Authorization': `Bearer ${process.env.SMARTSHEET_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorMsg = `Failed to fetch SmartSheet data: ${response.statusText}`;
      await logToCloudWatch(logGroupName, logStreamName, errorMsg);
      throw new Error(errorMsg);
    }

    const data = await response.json();
    await logToCloudWatch(logGroupName, logStreamName, `Successfully fetched data from Smartsheet. Found ${data.rows.length} rows.`);
    
    if (data.rows.length === 0) {
      await logToCloudWatch(logGroupName, logStreamName, 'No rows found in the sheet.');
      return NextResponse.json({ success: false, message: 'No rows found in the sheet' });
    }
    
    // Get the first row
    const row = data.rows[0];
    
    // Create a column map for easier reference
    const columnMap = new Map<number, string>();
    data.columns.forEach((column: any) => {
      columnMap.set(column.id, column.title);
    });
    
    // Process the row to a more usable format
    const processedRow: Record<string, any> = {
      id: row.id,
      rowNumber: row.rowNumber
    };
    
    // Process each cell and map it to its column name
    row.cells.forEach((cell: any) => {
      const columnName = columnMap.get(cell.columnId) || `column_${cell.columnId}`;
      processedRow[columnName] = cell.value;
    });
    
    await logToCloudWatch(logGroupName, logStreamName, `Processed row ${row.id} with ${row.cells.length} cells`);
    
    // Try both methods to store the record
    
    // Method 1: Using Amplify API
    try {
      await logToCloudWatch(logGroupName, logStreamName, `Attempting to store record using Amplify API...`);
      const result = await client.models.SmartsheetInjury.create({
        sheetId: data.id.toString(),
        rowId: row.id.toString(),
        autoNumber: processedRow['Auto #'] || processedRow['Auto Number'],
        simsAutoRecordId: processedRow['SIMS Auto Record ID'],
        resolved: processedRow['Resolved?'] === true,
        lessonsLearned: processedRow['Lessons Learned'],
        emergency: processedRow['Emergency'],
        location: processedRow['Location'],
        employeeId: processedRow['Employee ID'],
        firstName: processedRow['First Name'],
        lastName: processedRow['Last Name'],
        streetAddress: processedRow['Street Address'],
        city: processedRow['City'],
        state: processedRow['State'],
        zipCode: processedRow['Zip Code'],
        dateOfBirth: processedRow['Date of Birth'],
        dateHired: processedRow['Date Hired'],
        employeeType: processedRow['Employee Type'],
        dateOfIncident: processedRow['Date of Incident'],
        timeOfIncident: processedRow['Time of Incident'],
        incidentDescription: processedRow['Incident Description'],
        injuryDescription: processedRow['Injury Description'],
        bodyPartInjured: processedRow['Body Part Injured'],
        injuryCategory: processedRow['Injury Category'],
        incidentCategory: processedRow['Incident Category'],
        submissionStatus: processedRow['Submission Status'],
        investigationStatus: processedRow['Investigation Status'],
        rawData: processedRow,
        lastSyncedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      
      await logToCloudWatch(logGroupName, logStreamName, `Successfully stored record using Amplify API. Record ID: ${result.data?.id}`);
    } catch (amplifyError) {
      const errorMessage = amplifyError instanceof Error ? amplifyError.message : String(amplifyError);
      await logToCloudWatch(logGroupName, logStreamName, `Error storing record using Amplify API: ${errorMessage}`);
      console.error('Amplify API Error:', amplifyError);
    }
    
    // Method 2: Using DynamoDB Document Client directly
    try {
      await logToCloudWatch(logGroupName, logStreamName, `Attempting to store record using DynamoDB Document Client directly...`);
      
      const tableName = 'SmartsheetInjury-veooqyh5ireufagj7kv3h2ybwm-NONE'; // Your actual table name
      const testId = `test-${Date.now()}`;
      
      const item = {
        id: testId,
        sheetId: data.id.toString(),
        rowId: row.id.toString(),
        autoNumber: processedRow['Auto #'] || processedRow['Auto Number'],
        simsAutoRecordId: processedRow['SIMS Auto Record ID'],
        resolved: processedRow['Resolved?'] === true,
        lessonsLearned: processedRow['Lessons Learned'],
        emergency: processedRow['Emergency'],
        location: processedRow['Location'],
        employeeId: processedRow['Employee ID'],
        firstName: processedRow['First Name'],
        lastName: processedRow['Last Name'],
        lastSyncedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      await logToCloudWatch(logGroupName, logStreamName, `Writing item to DynamoDB table ${tableName}: ${JSON.stringify(item)}`);
      
      const result = await docClient.send(new PutCommand({
        TableName: tableName,
        Item: item
      }));
      
      await logToCloudWatch(logGroupName, logStreamName, `Successfully stored record using DynamoDB Document Client. Result: ${JSON.stringify(result)}`);
    } catch (dynamoError) {
      const errorMessage = dynamoError instanceof Error ? dynamoError.message : String(dynamoError);
      await logToCloudWatch(logGroupName, logStreamName, `Error storing record using DynamoDB Document Client: ${errorMessage}`);
      console.error('DynamoDB Error:', dynamoError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test completed, check logs for details',
      rowId: row.id,
      sheetId: data.id
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logToCloudWatch(logGroupName, logStreamName, `Error in test operation: ${errorMessage}`);
    console.error('Test Error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch and store Smartsheet record', details: errorMessage }, 
      { status: 500 }
    );
  }
}
