// app/api/smartsheet/sync-to-db/route.ts

//http://localhost:3000/api/smartsheet/sync-to-db?sheetType=SHAKEPROOF_NA_OBSERVATION
import { NextResponse } from 'next/server';
import { SMARTSHEET_CONFIG, SheetType } from '../config';
import { CloudWatchLogsClient, CreateLogGroupCommand, CreateLogStreamCommand, PutLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// Initialize CloudWatch client
const cloudWatchClient = new CloudWatchLogsClient({});

// Initialize DynamoDB client with removeUndefinedValues option
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
    convertClassInstanceToMap: false
  }
});

// Cache for table names to avoid repeated lookups
let tableNamesCache: Record<string, string> | null = null;

// Function to dynamically discover table names
async function discoverTableNames(): Promise<Record<string, string>> {
  if (tableNamesCache) {
    return tableNamesCache;
  }

  try {
    console.log('Discovering DynamoDB table names...');
    
    // List all tables
    const listTablesCommand = new ListTablesCommand({});
    const tablesResult = await dynamoClient.send(listTablesCommand);
    
    const tableNames: Record<string, string> = {};
    
    if (tablesResult.TableNames) {
      // Find tables that match our patterns
      for (const tableName of tablesResult.TableNames) {
        if (tableName.includes('SmartsheetInjury')) {
          tableNames.Injury = tableName;
          console.log(`Found Injury table: ${tableName}`);
        } else if (tableName.includes('SmartsheetObservation')) {
          tableNames.Observation = tableName;
          console.log(`Found Observation table: ${tableName}`);
        } else if (tableName.includes('SmartsheetRecognition')) {
          tableNames.Recognition = tableName;
          console.log(`Found Recognition table: ${tableName}`);
        }
      }
    }
    
    // Validate that we found all required tables
    const requiredTables = ['Injury', 'Observation', 'Recognition'];
    const missingTables = requiredTables.filter(table => !tableNames[table]);
    
    if (missingTables.length > 0) {
      throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
    }
    
    console.log('Successfully discovered all table names:', tableNames);
    
    // Cache the results
    tableNamesCache = tableNames;
    return tableNames;
    
  } catch (error) {
    console.error('Error discovering table names:', error);
    
    // Fallback to the known table names if discovery fails
    console.log('Falling back to known table names...');
    const fallbackTables = {
      Injury: 'SmartsheetInjury-veooqyh5ireufagj7kv3h2ybwm-NONE',
      Observation: 'SmartsheetObservation-veooqyh5ireufagj7kv3h2ybwm-NONE',
      Recognition: 'SmartsheetRecognition-veooqyh5ireufagj7kv3h2ybwm-NONE'
    };
    
    tableNamesCache = fallbackTables;
    return fallbackTables;
  }
}

// Helper function to determine record type based on sheet name
function getRecordType(sheetType: SheetType): 'Injury' | 'Observation' | 'Recognition' {
  if (sheetType.includes('INJURY')) return 'Injury';
  if (sheetType.includes('OBSERVATION')) return 'Observation';
  if (sheetType.includes('RECOGNITION')) return 'Recognition';
  return 'Injury'; // default fallback
}

// Helper function to get the correct table name based on record type
async function getTableName(recordType: 'Injury' | 'Observation' | 'Recognition'): Promise<string> {
  const tableNames = await discoverTableNames();
  return tableNames[recordType];
}

  // Helper function to create composite primary key - FIXED FORMAT
function createCompositeKey(sheetType: SheetType, autoNumber: string | number): string {
  // ✅ Use the same format as copy-to-sims: SHEETNAME_AUTONUMBER
  return `${sheetType}_${autoNumber}`;
}

// Helper function to clean undefined values from object
function cleanObject(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = cleanObject(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}
 
 

// Helper function to map row data based on record type - UPDATED
function mapRowToRecord(processedRow: Record<string, any>, sheetType: SheetType, recordType: 'Injury' | 'Observation' | 'Recognition') {
  const autoNumber = processedRow['Auto #'] || processedRow['Auto Number'];
  
  // ✅ CRITICAL: Use SHEETNAME_AUTONUMBER format for consistency
  const smartsheetUniqueId = `${sheetType}_${autoNumber}`; // e.g., SEATS_NA_OBSERVATION_5
  
  // Base record structure that applies to all types
  const baseRecord = {
    id: smartsheetUniqueId, // ✅ Use the same format as copy-to-sims
    sheetType: sheetType,
    recordType: recordType,
    sheetId: processedRow.sheetId || '',
    rowId: processedRow.rowId || processedRow.id?.toString() || '',
    autoNumber: autoNumber?.toString() || '',
    rawData: processedRow,
    lastSyncedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  // Common fields that might exist across different record types
  const commonFields = {
    location: processedRow['Location'],
    employeeId: processedRow['Employee ID'],
    firstName: processedRow['First Name'] || processedRow['Name']?.split(' ')[0],
    lastName: processedRow['Last Name'] || processedRow['Name']?.split(' ').slice(1).join(' '),
    dateOfIncident: processedRow['Date of Incident'] || processedRow['Date of Incident/Inspection'],
    timeOfIncident: processedRow['Time of Incident'],
    employeeType: processedRow['Employee Type']
  };

  // Type-specific field mappings
  if (recordType === 'Injury') {
    return {
      ...baseRecord,
      ...commonFields,
      
      // ✅ All your existing injury field mappings...
      simsAutoRecordId: processedRow['SIMS Auto Record ID'],
      resolved: processedRow['Resolved?'] === true,
      lessonsLearned: processedRow['Lessons Learned'],
      emergency: processedRow['Emergency'],
      
      // Personal Information
      streetAddress: processedRow['Street Address'],
      city: processedRow['City'],
      state: processedRow['State'],
      zipCode: processedRow['Zip Code'],
      phoneNumber: processedRow['Phone Number'],
      dateOfBirth: processedRow['Date of Birth'],
      sex: processedRow['Sex'],
      dateHired: processedRow['Date Hired'],
      
      // Experience mappings
      tenure: processedRow['Experience at ITW'],
      experience: processedRow['Experience in Role'],
      
      // Work Details
      division: processedRow['Division'],
      platform: processedRow['Platform'],
      ageRange: processedRow['Age Range'],
      title: processedRow['Title'],
      
      // Location Details
      onSiteLocation: processedRow['On Site Location'],
      locationOnSite: processedRow['On Site Location'] || processedRow['Location on Site'],
      whereDidThisOccur: processedRow['General Incident Location'],
      generalIncidentLocation: processedRow['General Incident Location'],
      workAreaDescription: processedRow['Work Area Description'],
      
      // Activity Type mapping
      activityType: processedRow['Work Area/Activity Category'],
      workAreaActivityCategory: processedRow['Work Area/Activity Category'],
      
      // Incident Details
      shift: processedRow['Shift'],
      timeOfIncidentHour: processedRow['Time of Incident Hour'],
      timeOfIncidentMinute: processedRow['Time of Incident Minute'],
      timeOfInjuryAmPm: processedRow['Time of Injury AM/PM'],
      timeEmployeeBeganWork: processedRow['Time Employee Began Work'],
      employeeBeganTimeAmPm: processedRow['Employee Began Time AM/PM'],
      
      // Injury Specific Fields
      bodyPartInjured: processedRow['Body Part Injured'],
      injuredBodyPart: processedRow['Injured Body Part'] || processedRow['Body Part Injured'],
      
      // Corrected injury category mapping
      injuryType: processedRow['Injury Category'], // SS.injuryCategory → SIMS.injuryType
      injuryCategory: processedRow['Injury Category'],
      
      incidentCategory: processedRow['Incident Category'],
      incidentType: processedRow['Incident Type'] || processedRow['Incident Category'],
      
      // ... rest of your existing injury mappings
      incidentDescription: processedRow['Incident Description'],
      injuryDescription: processedRow['Injury Description'],
      injuryOrIllness: processedRow['Injury or Illness'],
      objectOrSubstance: processedRow['Object or Substance'],
      
      // COVID and Work Status
      isCovidRelated: processedRow['COVID-19'] || processedRow['Is Covid Related'],
      isRestrictedWork: processedRow['Is Restricted Work'],
      isJobTransfer: processedRow['Is Job Transfer'],
      finalDaysAway: processedRow['Final Days Away'],
      estimatedLostWorkDays: processedRow['Estimated Lost Work Days'],
      
      // Risk and Safety
      atRisk: processedRow['At Risk'] === true,
      
      // Status Fields
      submissionStatus: processedRow['Submission Status'],
      investigationStatus: processedRow['Investigation Status'],
      submissionOwner: processedRow['Submission Owner'],
      submissionLocation: processedRow['Submission Location'],
      submissionType: processedRow['Submission Type'],
      
      // System Fields
      modifiedBy: processedRow['Modified By'],
      duration: processedRow['Duration'],
      modificationDate: processedRow['Modification Date'],
      supervisorNotified: processedRow['Supervisor Notified'],
      pleaseNote: processedRow['PLEASE NOTE'],
      continue: processedRow['Continue'],
      readyToSubmit: processedRow['Ready to Submit?'],
      
      // OSHA and Classification
      oshaRecordableType: processedRow['OSHA Recordable Type'],
      caseClassification: processedRow['Case Classification'],
      submissionInjuryOrIllness: processedRow['Submission Injury or Illness'],
      
      // Approval Fields
      rejectionReason: processedRow['Rejection Reason'],
      rejectedAt: processedRow['Rejected At'],
      rejectedBy: processedRow['Rejected By'],
      approvalDueDate: processedRow['Approval Due Date'],
      approvalAssignedTo: processedRow['Approval Assigned To'],
      approvalStatus: processedRow['Approval Status'],
      approvalDescription: processedRow['Approval Description'],
      approvalNotes: processedRow['Approval Notes'],
      approvalUploadedAt: processedRow['Approval Uploaded At'],
      approvalUploadedBy: processedRow['Approval Uploaded By'],
      
      // Timestamps
      createdAt: processedRow['Created At'] || new Date().toISOString(),
      updatedAt: processedRow['Updated At'] || new Date().toISOString(),
      createdBy: processedRow['Created By'],
      updatedBy: processedRow['Updated By']
    };
  } else if (recordType === 'Observation') {
    return {
      ...baseRecord,
      ...commonFields,
      
      // ✅ All your existing observation field mappings...
      simsAutoId: processedRow['SIMS Auto ID'],
      name: processedRow['Name'],
      
      // Time and Date Fields
      dateOfIncidentInspection: processedRow['Date of Incident/Inspection'],
      timeOfIncidentHour: processedRow['Time of Incident Hour'],
      timeOfIncidentMinute: processedRow['Time of Incident Minute'],
      pleaseSelectAmPm: processedRow['Please Select AM/PM'],
      timeOfIncidentAmPm1: processedRow['Time of Incident AM/PM(1)'],
      timeEmployeeBegan: processedRow['Time Employee Began'],
      
      // Personal Information
      phoneNumber: processedRow['Phone Number'],
      division: processedRow['Division'],
      platform: processedRow['Platform'],
      ageRange: processedRow['Age Range'],
      tenure: processedRow['Tenure'],
      experience: processedRow['Experience'],
      title: processedRow['Title'],
      
      // Location Fields
      locationOnSite: processedRow['Location On Site'],
      whereDidThisOccur: processedRow['Where Did This Occur'] || processedRow['General Incident Location'],
      generalIncidentLocation: processedRow['General Incident Location'],
      workAreaDescription: processedRow['Work Area Description'],
      workActivityCategory: processedRow['Work Activity Category'],
      activityType: processedRow['Activity Type'],
      
      // Observation Specific Fields
      typeOfConcern: processedRow['Type of Concern'],
      priorityType: processedRow['Priority Type'],
      problem: processedRow['Problem'],
      correctiveAction: processedRow['Corrective Action'],
      quickFix: processedRow['Quick Fix'],
      managersComments: processedRow['Manager\'s Comments'],
      
      // Injury Related Fields for Observations
      injuryDescription: processedRow['Injury Description'],
      injuryType: processedRow['Injury Type'],
      injuredBodyPart: processedRow['Injured Body Part'],
      incidentType: processedRow['Incident Type'],
      estimatedLostWorkDays: processedRow['Estimated Lost Work Days'],
      injuryCategory: processedRow['Injury Category'],
      
      // COVID and Work Status
      isCovidRelated: processedRow['Is Covid Related'],
      isCovid19Related: processedRow['Is Covid Related'],
      isRestrictedWork: processedRow['Is Restricted Work'],
      isJobTransfer: processedRow['Is Job Transfer'],
      finalDaysAway: processedRow['Final Days Away'],
      
      // System Fields
      modifiedDate: processedRow['Modified Date'],
      recordType: processedRow['Record Type'],
      createdAt: processedRow['Created At'] || new Date().toISOString(),
      updatedAt: processedRow['Updated At'] || new Date().toISOString()
    };
  } else if (recordType === 'Recognition') {
    return {
      ...baseRecord,
      ...commonFields,
      
      // ✅ CRITICAL: Store attachments for Recognition records
      attachments: processedRow.attachments || [], // This was missing!
            
      // ✅ All your existing recognition field mappings...
      nameOfRecipient: processedRow['Name of Recipient'],
      checkbox: processedRow['Checkbox'],
      supervisorName: processedRow['Supervisor Name'],
      tellYourStory: processedRow['Tell Your Story'],
      yourName: processedRow['Your Name'],
      phoneNumber: processedRow['Phone Number']
    };
  }

  return baseRecord;
}



// CloudWatch logging functions (same as before)
async function ensureLogGroupExists(logGroupName: string) {
  try {
    const command = new CreateLogGroupCommand({ logGroupName });
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

async function createLogStream(logGroupName: string, logStreamName: string) {
  try {
    const command = new CreateLogStreamCommand({ logGroupName, logStreamName });
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

async function logToCloudWatch(logGroupName: string, logStreamName: string, message: string) {
  try {
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
      logEvents: [{ timestamp: Date.now(), message }]
    });
    await cloudWatchClient.send(command);
    console.log('Log event sent to CloudWatch');
  } catch (error) {
    console.error('Error sending log event to CloudWatch:', error);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sheetType = searchParams.get('sheetType') as SheetType;
  
  console.log(`Received GET request with sheetType: ${sheetType}`);
  
  if (!sheetType || !Object.keys(SMARTSHEET_CONFIG.SHEET_IDS).includes(sheetType)) {
    console.error(`Invalid or missing sheetType parameter: ${sheetType}`);
    return NextResponse.json(
      { error: 'Invalid or missing sheetType parameter. Valid types: ' + Object.keys(SMARTSHEET_CONFIG.SHEET_IDS).join(', ') }, 
      { status: 400 }
    );
  }
  
  return await syncSheetToDatabase(sheetType);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sheetType } = body;
    
    console.log(`Received POST request with sheetType: ${sheetType}`);
    
    if (!sheetType || !Object.keys(SMARTSHEET_CONFIG.SHEET_IDS).includes(sheetType)) {
      console.error(`Invalid or missing sheetType in request body: ${sheetType}`);
      return NextResponse.json(
        { error: 'Invalid or missing sheetType in request body. Valid types: ' + Object.keys(SMARTSHEET_CONFIG.SHEET_IDS).join(', ') }, 
        { status: 400 }
      );
    }
    
    return await syncSheetToDatabase(sheetType);
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json(
      { error: 'Invalid JSON in request body' }, 
      { status: 400 }
    );
  }
}

// In sync-to-db/route.ts - Complete syncSheetToDatabase function with attachment support
async function syncSheetToDatabase(sheetType: SheetType) {
  const logGroupName = '/aws/amplify/simsappdev/api/smartsheet';
  const today = new Date().toISOString().split('T')[0];
  const logStreamName = `${today}/sync-${sheetType}`;
  
  // Determine record type and discover the corresponding table
  const recordType = getRecordType(sheetType);
  const tableName = await getTableName(recordType);
  
  try {
    console.log(`Starting sync for sheet: ${sheetType} -> Record Type: ${recordType} -> Table: ${tableName}`);
    await logToCloudWatch(logGroupName, logStreamName, `Starting sync for sheet: ${sheetType} -> Record Type: ${recordType} -> Table: ${tableName}`);
    
    // ✅ Fetch data from Smartsheet WITH ATTACHMENTS for Recognition sheets
    const includeAttachments = sheetType.includes('RECOGNITION') ? '?include=attachments' : '';
    console.log(`Fetching data from Smartsheet for sheet: ${sheetType}${includeAttachments ? ' (including attachments)' : ''}`);
    
    const response = await fetch(
      `${SMARTSHEET_CONFIG.API_URL}/sheets/${SMARTSHEET_CONFIG.SHEET_IDS[sheetType]}${includeAttachments}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SMARTSHEET_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorMsg = `Failed to fetch SmartSheet data for ${sheetType}: ${response.statusText}`;
      console.error(errorMsg);
      await logToCloudWatch(logGroupName, logStreamName, errorMsg);
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.rows.length} rows from ${sheetType}`);
    await logToCloudWatch(logGroupName, logStreamName, `Successfully fetched ${data.rows.length} rows from ${sheetType}`);
    
    if (data.rows.length === 0) {
      console.log(`No rows found in sheet ${sheetType}`);
      await logToCloudWatch(logGroupName, logStreamName, `No rows found in sheet ${sheetType}`);
      return NextResponse.json({ 
        success: true, 
        message: `No rows found in sheet ${sheetType}`,
        recordsProcessed: 0 
      });
    }
    
    // Create column map
    const columnMap = new Map<number, string>();
    data.columns.forEach((column: any) => {
      columnMap.set(column.id, column.title);
    });
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Process each row
// Process each row
for (const row of data.rows) {
  try {
    console.log(`Processing row ${row.id}`);
    
    // Process row to usable format
    const processedRow: Record<string, any> = {
      sheetId: data.id.toString(),
      rowId: row.id.toString(),
      id: row.id,
      rowNumber: row.rowNumber
    };
    
    // Process each cell and map it to its column name
    row.cells.forEach((cell: any) => {
      const columnName = columnMap.get(cell.columnId) || `column_${cell.columnId}`;
      processedRow[columnName] = cell.value;
    });
    
    // ✅ CRITICAL: Add attachment information for Recognition records
    if (recordType === 'Recognition' && row.attachments && row.attachments.length > 0) {
      processedRow.attachments = row.attachments;
      console.log(`📎 Row ${row.id} has ${row.attachments.length} attachments`);
      
      // ✅ Log attachment details for debugging
      row.attachments.forEach((attachment: any, index: number) => {
        console.log(`📎 Attachment ${index + 1}:`, {
          id: attachment.id,
          name: attachment.name,
          attachmentType: attachment.attachmentType,
          mimeType: attachment.mimeType,
          sizeInKb: attachment.sizeInKb
        });
      });
    } else if (recordType === 'Recognition') {
      console.log(`📎 Row ${row.id} has no attachments`);
    }
    
    console.log(`Processed row ${row.id} with ${row.cells.length} cells`);
    
    // Map to record format based on sheet type
    const rawItem = mapRowToRecord(processedRow, sheetType, recordType);
    
    // Clean the item to remove undefined values
    const item = cleanObject(rawItem);
    
    console.log(`Writing ${recordType} record ${item.id} to table ${tableName}`);
    await logToCloudWatch(logGroupName, logStreamName, `Writing ${recordType} record to table ${tableName}: ${JSON.stringify(item)}`);
    
    // Store in the correct database table based on record type
    const result = await docClient.send(new PutCommand({
      TableName: tableName,
      Item: item
    }));
    
    successCount++;
    console.log(`Successfully stored ${recordType} record ${item.id} in ${tableName}`);
    await logToCloudWatch(logGroupName, logStreamName, `Successfully stored ${recordType} record ${item.id} in ${tableName}. Result: ${JSON.stringify(result)}`);
    
  } catch (rowError) {
    errorCount++;
    const errorMessage = rowError instanceof Error ? rowError.message : String(rowError);
    const errorMsg = `Error processing row ${row.id}: ${errorMessage}`;
    errors.push(errorMsg);
    console.error(errorMsg);
    await logToCloudWatch(logGroupName, logStreamName, errorMsg);
  }
}

    
    const summary = `Sync completed for ${sheetType} (${recordType}). Success: ${successCount}, Errors: ${errorCount}. Data saved to ${tableName}`;
    console.log(summary);
    await logToCloudWatch(logGroupName, logStreamName, summary);
    
    return NextResponse.json({
      success: true,
      message: summary,
      sheetType,
      recordType,
      tableName,
      recordsProcessed: data.rows.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10)
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Sync failed for ${sheetType}:`, errorMessage);
    await logToCloudWatch(logGroupName, logStreamName, `Sync failed for ${sheetType}: ${errorMessage}`);
    
    return NextResponse.json(
      { 
        error: `Failed to sync ${sheetType}`, 
        details: errorMessage,
        sheetType,
        recordType: getRecordType(sheetType),
        tableName: await getTableName(getRecordType(sheetType))
      }, 
      { status: 500 }
    );
  }
}



