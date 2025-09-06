// app/api/smartsheet/copy-to-sims/route.ts
import { NextResponse } from 'next/server';
import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { CloudWatchLogsClient, CreateLogGroupCommand, CreateLogStreamCommand, PutLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { v4 as uuidv4 } from 'uuid';
import { downloadAndUploadAttachments } from '../attachment-handler'; // ✅ ADD 

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
    convertClassInstanceToMap: false
  }
});

// Initialize CloudWatch client
const cloudWatchClient = new CloudWatchLogsClient({});

// Cache for table names
let tableNamesCache: Record<string, string> | null = null;

// Helper function to generate SIMS-compatible Report IDs
const generateInjuryReportId = (formType: 'US' | 'Global' = 'US'): string => {
  const now = new Date();
  const prefix = formType === 'US' ? 'US-I-' : 'GL-I-';
  return prefix +
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    '-' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0') +
    Math.floor(Math.random() * 100).toString().padStart(2, '0');
};

const generateObservationReportId = (): string => {
  const now = new Date();
  const prefix = 'O-';
  return prefix +
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    '-' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0') +
    Math.floor(Math.random() * 100).toString().padStart(2, '0');
};

const generateRecognitionId = (): string => {
  const now = new Date();
  const prefix = 'R-';
  return prefix +
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    '-' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0') +
    Math.floor(Math.random() * 100).toString().padStart(2, '0');
};

// Function to dynamically discover table names
async function discoverTableNames(): Promise<Record<string, string>> {
  if (tableNamesCache) {
    return tableNamesCache;
  }

  try {
    console.log('🔍 Discovering DynamoDB table names...');
    
    const listTablesCommand = new ListTablesCommand({});
    const tablesResult = await dynamoClient.send(listTablesCommand);
    
    const tableNames: Record<string, string> = {};
    
    if (tablesResult.TableNames) {
      for (const tableName of tablesResult.TableNames) {
        if (tableName.includes('SmartsheetInjury')) {
          tableNames.SmartsheetInjury = tableName;
        } else if (tableName.includes('SmartsheetObservation')) {
          tableNames.SmartsheetObservation = tableName;
        } else if (tableName.includes('SmartsheetRecognition')) {
          tableNames.SmartsheetRecognition = tableName;
        } else if (tableName.includes('Submission') && !tableName.includes('Smartsheet')) {
          tableNames.Submission = tableName;
        } else if (tableName.includes('Recognition-') && !tableName.includes('Smartsheet')) {
          tableNames.Recognition = tableName;
        }
      }
    }
    
    console.log('✅ Discovered table names:', tableNames);
    tableNamesCache = tableNames;
    return tableNames;
    
  } catch (error) {
    console.error('❌ Error discovering table names:', error);
    throw error;
  }
}

// Helper function to clean undefined values
function cleanObject(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// ✅ SIMPLE DUPLICATE CHECK FUNCTION
async function recordExists(tableName: string, smartsheetUniqueId: string): Promise<boolean> {
  try {
    console.log(`🔍 Checking if record exists with smartsheetUniqueId: ${smartsheetUniqueId}`);
    
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'smartsheetUniqueId = :smartsheetUniqueId',
      ExpressionAttributeValues: {
        ':smartsheetUniqueId': smartsheetUniqueId
      },
      Limit: 1
    });
    
    const result = await docClient.send(scanCommand);
    const exists = Boolean(result.Items && result.Items.length > 0);
    
    console.log(`📊 Record exists: ${exists} for smartsheetUniqueId: ${smartsheetUniqueId}`);
    
    if (exists) {
      console.log(`🔄 Found existing record with smartsheetUniqueId: ${smartsheetUniqueId}`);
    }
    
    return exists;
  } catch (error) {
    console.error('❌ Error checking for existing record:', error);
    return false;
  }
}

// Helper function to parse time components
function parseTimeComponents(timeString: string): { hour: string; minute: string; ampm: string } {
  if (!timeString) {
    return { hour: '12', minute: '00', ampm: 'AM' };
  }
  
  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
  const match = timeString.match(timeRegex);
  
  if (match) {
    let hour = match[1];
    const minute = match[2];
    let ampm = match[3] || 'AM';
    
    if (!match[3]) {
      const hourNum = parseInt(hour);
      if (hourNum === 0) {
        hour = '12';
        ampm = 'AM';
      } else if (hourNum > 12) {
        hour = (hourNum - 12).toString();
        ampm = 'PM';
      } else if (hourNum === 12) {
        ampm = 'PM';
      }
    }
    
    return { 
      hour: hour.padStart(2, '0'), 
      minute: minute, 
      ampm: ampm.toUpperCase() 
    };
  }
  
  return { hour: '12', minute: '00', ampm: 'AM' };
}

// ✅ FIXED Map SmartsheetObservation to Submission with CLEAR smartsheetUniqueId
// ✅ FIXED Map SmartsheetObservation to Submission - Use smartsheetUniqueId as PRIMARY KEY
function mapObservationToSubmission(observationRecord: any): any {
  const newSubmissionId = generateObservationReportId();
  const timeComponents = parseTimeComponents(observationRecord.timeOfIncident);
  
  // ✅ CREATE CLEAR smartsheetUniqueId: SHEETNAME_AUTONUMBER
  const sheetName = observationRecord.sheetType || 'UNKNOWN';
  const autoNum = observationRecord.autoNumber || '0';
  const smartsheetUniqueId = `${sheetName}_${autoNum}`;
  
  console.log(`📝 Creating smartsheetUniqueId as PK: ${smartsheetUniqueId} (sheetName: ${sheetName}, autoNumber: ${autoNum})`);
  
  return cleanObject({
    // ✅ CRITICAL: Use smartsheetUniqueId as the PRIMARY KEY (like sync-to-db)
    id: smartsheetUniqueId, // This makes it the primary key - NO DUPLICATES POSSIBLE!
    submissionId: newSubmissionId,
    recordType: 'OBSERVATION_REPORT',
    
    // Time and date fields
    dateOfIncident: observationRecord.dateOfIncident || observationRecord.dateOfIncidentInspection,
    timeOfIncident: observationRecord.timeOfIncident,
    timeOfIncidentHour: observationRecord.timeOfIncidentHour || timeComponents.hour,
    timeOfIncidentMinute: observationRecord.timeOfIncidentMinute || timeComponents.minute,
    timeOfInjuryAmPm: observationRecord.pleaseSelectAmPm || observationRecord.timeOfIncidentAmPm1 || timeComponents.ampm,
    timeEmployeeBegan: observationRecord.timeEmployeeBegan,
    
    // Employee information
    employeeId: observationRecord.employeeId,
    firstName: observationRecord.name?.split(' ')[0] || '',
    lastName: observationRecord.name?.split(' ').slice(1).join(' ') || '',
    phoneNumber: observationRecord.phoneNumber,
    employeeType: observationRecord.employeeType,
    ageRange: observationRecord.ageRange,
    tenure: observationRecord.tenure,
    experience: observationRecord.experience,
    title: observationRecord.title,
    
    // Location and division fields
    incidentLocation: observationRecord.location,
    locationOnSite: observationRecord.locationOnSite || observationRecord.location,
    division: observationRecord.division,
    platform: observationRecord.platform,
    workAreaDescription: observationRecord.workAreaDescription || '',
    workActivityCategory: observationRecord.workActivityCategory,
    activityType: observationRecord.activityType || observationRecord.workActivityCategory,
    
    // ✅ Add the missing whereDidThisOccur field
    whereDidThisOccur: observationRecord.whereDidThisOccur || observationRecord.generalIncidentLocation || '',
    
    // ✅ COMPLETE OBSERVATION SPECIFIC FIELDS
    obsTypeOfConcern: observationRecord.typeOfConcern || '',
    obsPriorityType: observationRecord.priorityType || '',
    obsCorrectiveAction: observationRecord.correctiveAction || '',
    incidentDescription: observationRecord.problem || '',
    
    // SIMS required status fields
    status: 'Draft',
    location: observationRecord.location || 'TBD',
    submissionType: 'Smartsheet',
    
    // SIMS metadata fields
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Smartsheet Import Process',
    updatedBy: 'Smartsheet Import Process',
    owner: 'system',
    
    // ✅ Keep smartsheetUniqueId field for reference (same as PK)
    autoNumber: observationRecord.autoNumber || '',
    smartsheetautonum: observationRecord.autoNumber || '',
    smartsheetUniqueId: smartsheetUniqueId, // Same as id field
    
    // Additional SIMS fields with defaults
    documents: [],
    
    // Store reference to original Smartsheet data
    metadata: {
      smartsheetSource: true,
      originalSmartsheetId: observationRecord.id,
      originalSheetId: observationRecord.sheetId,
      originalRowId: observationRecord.rowId,
      copiedAt: new Date().toISOString(),
      lastSyncedAt: observationRecord.lastSyncedAt,
      importedFromSmartsheet: true
    }
  });
}


// Map SmartsheetInjury to Submission
// Map SmartsheetInjury to Submission - ✅ FIXED to use smartsheetUniqueId as PRIMARY KEY
function mapInjuryToSubmission(injuryRecord: any): any {
  const newSubmissionId = generateInjuryReportId('US');
  const timeComponents = parseTimeComponents(injuryRecord.timeOfIncident);
  
  // ✅ CREATE CLEAR smartsheetUniqueId: SHEETNAME_AUTONUMBER
  const sheetName = injuryRecord.sheetType || 'UNKNOWN';
  const autoNum = injuryRecord.autoNumber || '0';
  const smartsheetUniqueId = `${sheetName}_${autoNum}`;
  
  console.log(`📝 Creating smartsheetUniqueId as PK: ${smartsheetUniqueId} (sheetName: ${sheetName}, autoNumber: ${autoNum})`);
  
  return cleanObject({
    // ✅ CRITICAL: Use smartsheetUniqueId as the PRIMARY KEY (like Observation)
    id: smartsheetUniqueId, // This makes it the primary key - NO DUPLICATES POSSIBLE!
    submissionId: newSubmissionId,
    recordType: 'INJURY_REPORT',
    
    // Time and date fields
    dateOfIncident: injuryRecord.dateOfIncident,
    timeOfIncident: injuryRecord.timeOfIncident,
    timeOfIncidentHour: injuryRecord.timeOfIncidentHour || timeComponents.hour,
    timeOfIncidentMinute: injuryRecord.timeOfIncidentMinute || timeComponents.minute,
    timeOfInjuryAmPm: injuryRecord.timeOfInjuryAmPm || timeComponents.ampm,
    timeEmployeeBegan: injuryRecord.timeEmployeeBeganWork,
    timeEmployeeBeganAmPm: injuryRecord.employeeBeganTimeAmPm || 'AM',
    
    // Employee information
    employeeId: injuryRecord.employeeId,
    firstName: injuryRecord.firstName,
    lastName: injuryRecord.lastName,
    streetAddress: injuryRecord.streetAddress || '',
    city: injuryRecord.city || '',
    state: injuryRecord.state || '',
    zipCode: injuryRecord.zipCode || '',
    phoneNumber: injuryRecord.phoneNumber || '',
    dateOfBirth: injuryRecord.dateOfBirth || '',
    sex: injuryRecord.sex || '',
    dateHired: injuryRecord.dateHired || '',
    employeeType: injuryRecord.employeeType || '',
    tenure: injuryRecord.tenure || '',
    experience: injuryRecord.experience || '',
    
    // Work details
    division: injuryRecord.division || '',
    platform: injuryRecord.platform || '',
    ageRange: injuryRecord.ageRange || '',
    title: injuryRecord.title || '',
    shift: injuryRecord.shift || '',
    isCovidRelated: injuryRecord.isCovidRelated || '',
    
    // Location details
    incidentLocation: injuryRecord.location || '',
    locationOnSite: injuryRecord.locationOnSite || injuryRecord.onSiteLocation || '',
    whereDidThisOccur: injuryRecord.whereDidThisOccur || injuryRecord.generalIncidentLocation || '',
    workAreaDescription: injuryRecord.workAreaDescription || '',
    activityType: injuryRecord.activityType || '',
    workActivityCategory: injuryRecord.workAreaActivityCategory || '',
    
    // Injury details
    incidentDescription: injuryRecord.incidentDescription || '',
    injuryDescription: injuryRecord.injuryDescription || '',
    injuryType: injuryRecord.injuryType ? [injuryRecord.injuryType] : [],
    injuredBodyPart: injuryRecord.injuredBodyPart || injuryRecord.bodyPartInjured ? 
      [injuryRecord.injuredBodyPart || injuryRecord.bodyPartInjured] : [],
    injuryCategory: injuryRecord.injuryCategory || '',
    incidentCategory: injuryRecord.incidentCategory || '',
    incidentType: injuryRecord.incidentType || injuryRecord.incidentCategory || '',
    
    // Status fields
    investigationStatus: injuryRecord.investigationStatus || 'Draft',
    status: 'Draft',
    location: injuryRecord.location || 'TBD',
    submissionType: 'Smartsheet',
    
    // SIMS metadata fields
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Smartsheet Import Process',
    updatedBy: 'Smartsheet Import Process',
    owner: 'system',
    
    // ✅ Keep smartsheetUniqueId field for reference (same as PK)
    autoNumber: injuryRecord.autoNumber || '',
    smartsheetautonum: injuryRecord.autoNumber || '',
    smartsheetUniqueId: smartsheetUniqueId, // Same as id field
    
    // Additional SIMS fields with defaults
    documents: [],
    interimCorrectiveActions: [],
    rca: [],
    finalCorrectiveAction: [],
    lessonsLearned: [],
    lessonsLearnedFlag: false,
    eventApprovalStatus: 'YET_TO_START',
    saStatus: 'NONE',
    saInjuryFlag: false,
    saPropertyDamageFlag: false,
    
    // Store reference to original Smartsheet data
    metadata: {
      smartsheetSource: true,
      originalSmartsheetId: injuryRecord.id,
      originalSheetId: injuryRecord.sheetId,
      originalRowId: injuryRecord.rowId,
      copiedAt: new Date().toISOString(),
      lastSyncedAt: injuryRecord.lastSyncedAt,
      importedFromSmartsheet: true
    }
  });
}


// ✅ ENHANCED CHECKBOX PARSING FUNCTION for your specific Smartsheet format
const parseCheckboxFlags = (checkboxString: string, rawData?: any) => {
  console.log(`🔍 Parsing checkbox data: "${checkboxString}"`);
  
  // Initialize all flags to false
  let flags = {
    safetyFocused: false,
    continualImprovement: false,
    focus8020: false,
    entrepreneurialCulture: false,
    attitudeFocused: false,
    peopleFocused: false,
    detailFocused: false
  };
  
  if (!checkboxString) {
    // Try to get from rawData if checkbox string is empty
    if (rawData && rawData.Checkbox) {
      checkboxString = rawData.Checkbox;
    }
  }
  
  if (checkboxString) {
    // Convert to lowercase for easier matching
    const lowerData = checkboxString.toLowerCase();
    
    // Check for Continual Improvement
    if (lowerData.includes('continual improvement') || 
        lowerData.includes('simplicity') || 
        lowerData.includes('looking for new opportunities')) {
      flags.continualImprovement = true;
    }
    
    // Check for 80/20 Focus
    if (lowerData.includes('80/20') || 
        lowerData.includes('strategically focusing') || 
        lowerData.includes('priorities in challenging')) {
      flags.focus8020 = true;
    }
    
    // Check for Entrepreneurial Culture
    if (lowerData.includes('entrepreneurial culture') || 
        lowerData.includes('thinking about your role like an entrepreneur') || 
        lowerData.includes('creatively developing new')) {
      flags.entrepreneurialCulture = true;
    }
    
    // Check for People Focused
    if (lowerData.includes('people focused') || 
        lowerData.includes('exceeding expectations to help') || 
        lowerData.includes('serve a team member')) {
      flags.peopleFocused = true;
    }
    
    // Check for Detail Focused
    if (lowerData.includes('detail focused') || 
        lowerData.includes('consistently championing towards results') || 
        lowerData.includes('higher level of awareness') || 
        lowerData.includes('housekeeping, safety')) {
      flags.detailFocused = true;
    }
    
    // Check for Safety Focused
    if (lowerData.includes('safety focused') || 
        lowerData.includes('safety') || 
        lowerData.includes('safe')) {
      flags.safetyFocused = true;
    }
    
    // Check for Attitude Focused
    if (lowerData.includes('attitude focused') || 
        lowerData.includes('positive attitude') || 
        lowerData.includes('attitude')) {
      flags.attitudeFocused = true;
    }
  }
  
  console.log(`✅ Decoded flags:`, flags);
  return flags;
};


// ✅ UPDATED Map SmartsheetRecognition to Recognition with enhanced checkbox parsing
function mapRecognitionToRecognition(recognitionRecord: any): any {
  const newRecognitionId = generateRecognitionId();
  
  // ✅ CREATE CLEAR smartsheetUniqueId: SHEETNAME_AUTONUMBER
  const sheetName = recognitionRecord.sheetType || 'UNKNOWN';
  const autoNum = recognitionRecord.autoNumber || '0';
  const smartsheetUniqueId = `${sheetName}_${autoNum}`;
  
  console.log(`📝 Processing recognition record:`, {
    smartsheetUniqueId,
    checkbox: recognitionRecord.checkbox,
    hasAttachments: recognitionRecord.attachments?.length > 0
  });
  
  // ✅ ENHANCED CHECKBOX PARSING for your specific format
  const checkboxFlags = parseCheckboxFlags(recognitionRecord.checkbox, recognitionRecord.rawData);
  console.log(`✅ Decoded checkbox flags:`, checkboxFlags);
  
  return cleanObject({
    // ✅ CRITICAL: Use smartsheetUniqueId as the PRIMARY KEY
    id: smartsheetUniqueId, // This makes it the primary key - NO DUPLICATES POSSIBLE!
    recognitionId: newRecognitionId,
    
    // Recognition specific fields
    yourName: recognitionRecord.yourName || '',
    yourEmployeeId: recognitionRecord.employeeId || '',
    recognizedPersonName: recognitionRecord.nameOfRecipient || '',
    
    // ✅ PROPERLY DECODED CHECKBOX VALUES FROM YOUR SMARTSHEET FORMAT
    safetyFocused: checkboxFlags.safetyFocused,
    continualImprovement: checkboxFlags.continualImprovement,
    focus8020: checkboxFlags.focus8020,
    entrepreneurialCulture: checkboxFlags.entrepreneurialCulture,
    attitudeFocused: checkboxFlags.attitudeFocused,
    peopleFocused: checkboxFlags.peopleFocused,
    detailFocused: checkboxFlags.detailFocused,
    
    // Story and contact info
    employeeStory: recognitionRecord.tellYourStory || '',
    contactRequested: recognitionRecord.phoneNumber ? true : false,
    contactPhoneNumber: recognitionRecord.phoneNumber || '',
    
    // ✅ ATTACHMENT FIELDS - Will be populated after S3 upload
    mediaUploadUrl: '', // Will be set after S3 upload
    thumbnailS3Key: '', // Will be set after thumbnail generation
    photoSize: '', // Will be set after upload
    photoType: '', // Will be set after upload
    
    // ✅ SMARTSHEET TRACKING FIELDS
    smartsheetautonum: recognitionRecord.autoNumber || '',
    smartsheetUniqueId: smartsheetUniqueId,
    
    // SIMS system fields
    createdAt: new Date().toISOString(),
    createdBy: 'Smartsheet Import Process',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Smartsheet Import Process',
    
    // Store reference to original Smartsheet data
    metadata: {
      smartsheetSource: true,
      originalSmartsheetId: recognitionRecord.id,
      originalSheetId: recognitionRecord.sheetId,
      originalRowId: recognitionRecord.rowId,
      copiedAt: new Date().toISOString(),
      lastSyncedAt: recognitionRecord.lastSyncedAt,
      importedFromSmartsheet: true,
      originalAutoNumber: recognitionRecord.autoNumber,
      originalCheckboxData: recognitionRecord.checkbox,
      originalRawData: recognitionRecord.rawData,
      decodedFlags: checkboxFlags,
      hasAttachments: recognitionRecord.attachments?.length > 0,
      attachmentCount: recognitionRecord.attachments?.length || 0
    }
  });
}




// CloudWatch logging functions
async function logToCloudWatch(logGroupName: string, logStreamName: string, message: string) {
  try {
    const command = new PutLogEventsCommand({
      logGroupName,
      logStreamName,
      logEvents: [{ timestamp: Date.now(), message }]
    });
    await cloudWatchClient.send(command);
  } catch (error) {
    console.error('Error logging to CloudWatch:', error);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const copyType = searchParams.get('type');
  const skipDuplicates = searchParams.get('skipDuplicates') === 'true';
  
  return await copyData(copyType || 'all', skipDuplicates);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, skipDuplicates } = body;
    
    return await copyData(type || 'all', skipDuplicates !== false);
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' }, 
      { status: 400 }
    );
  }
}

async function copyData(copyType: string, skipDuplicates: boolean = true) {
  const logGroupName = '/aws/amplify/simsappdev/api/smartsheet';
  const today = new Date().toISOString().split('T')[0];
  const logStreamName = `${today}/copy-to-sims`;
  
  try {
    console.log(`🚀 Starting SIMS data copy: ${copyType}, skipDuplicates: ${skipDuplicates}`);
    await logToCloudWatch(logGroupName, logStreamName, `Starting SIMS data copy: ${copyType}, skipDuplicates: ${skipDuplicates}`);
    
    const tableNames = await discoverTableNames();
    
    let totalCopied = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const errors: string[] = [];
    const results: any = {};
    
    // Copy Injury records
    if (copyType === 'all' || copyType === 'injury') {
      console.log('📋 Copying Injury records to SIMS...');
      const injuryResult = await copyInjuryRecords(tableNames, logGroupName, logStreamName, skipDuplicates);
      results.injury = injuryResult;
      totalCopied += injuryResult.copied;
      totalSkipped += injuryResult.skipped;
      totalErrors += injuryResult.errors;
      errors.push(...injuryResult.errorMessages);
    }
    
    // Copy Observation records
    if (copyType === 'all' || copyType === 'observation') {
      console.log('👁️ Copying Observation records to SIMS...');
      const observationResult = await copyObservationRecords(tableNames, logGroupName, logStreamName, skipDuplicates);
      results.observation = observationResult;
      totalCopied += observationResult.copied;
      totalSkipped += observationResult.skipped;
      totalErrors += observationResult.errors;
      errors.push(...observationResult.errorMessages);
    }
    
    // Copy Recognition records
    if (copyType === 'all' || copyType === 'recognition') {
      console.log('🏆 Copying Recognition records to SIMS...');
      const recognitionResult = await copyRecognitionRecords(tableNames, logGroupName, logStreamName, skipDuplicates);
      results.recognition = recognitionResult;
      totalCopied += recognitionResult.copied;
      totalSkipped += recognitionResult.skipped;
      totalErrors += recognitionResult.errors;
      errors.push(...recognitionResult.errorMessages);
    }
    
    const summary = `✅ SIMS copy completed. Total copied: ${totalCopied}, Total skipped: ${totalSkipped}, Total errors: ${totalErrors}`;
    console.log(summary);
    await logToCloudWatch(logGroupName, logStreamName, summary);
    
    return NextResponse.json({
      success: true,
      message: summary,
      copyType,
      totalCopied,
      totalSkipped,
      totalErrors,
      results,
      errors: errors.slice(0, 10)
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ SIMS copy failed:`, errorMessage);
    await logToCloudWatch(logGroupName, logStreamName, `SIMS copy failed: ${errorMessage}`);
    
    return NextResponse.json(
      { 
        error: `SIMS copy failed`, 
        details: errorMessage,
        copyType 
      }, 
      { status: 500 }
    );
  }
}

// ✅ SIMPLE copyObservationRecords - Check then Insert
// ✅ FIXED copyObservationRecords - Use smartsheetUniqueId as Primary Key (like sync-to-db)
async function copyObservationRecords(tableNames: Record<string, string>, logGroupName: string, logStreamName: string, skipDuplicates: boolean) {
  let copied = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages: string[] = [];
  
  try {
    console.log(`📊 Starting observation copy from table: ${tableNames.SmartsheetObservation}`);
    
    const scanCommand = new ScanCommand({
      TableName: tableNames.SmartsheetObservation
    });
    
    const result = await docClient.send(scanCommand);
    console.log(`📈 Found ${result.Items?.length || 0} observation records to process`);
    
    if (result.Items) {
      for (const item of result.Items) {
        try {
          console.log(`🔄 Processing observation record: ${item.id} (autoNumber: ${item.autoNumber})`);
          
          const submissionRecord = mapObservationToSubmission(item);
          
          console.log(`📝 Created record with smartsheetUniqueId as PK: ${submissionRecord.id}`);
          
          // ✅ SIMPLE: Just insert - DynamoDB handles duplicates automatically with PK
          await docClient.send(new PutCommand({
            TableName: tableNames.Submission,
            Item: submissionRecord
          }));
          
          copied++;
          console.log(`✅ Successfully copied observation record: ${item.id} -> ${submissionRecord.submissionId} (PK: ${submissionRecord.id})`);
          
        } catch (error) {
          errors++;
          const errorMsg = `❌ Error copying observation record ${item.id}: ${error}`;
          errorMessages.push(errorMsg);
          console.error(errorMsg);
        }
      }
    }
    
  } catch (error) {
    const errorMsg = `❌ Error scanning SmartsheetObservation table: ${error}`;
    errorMessages.push(errorMsg);
    console.error(errorMsg);
  }
  
  const summary = `Observation copy completed: ${copied} copied, ${skipped} skipped, ${errors} errors`;
  console.log(summary);
  await logToCloudWatch(logGroupName, logStreamName, summary);
  
  return { copied, skipped, errors, errorMessages };
}


// ✅ FIXED copyInjuryRecords - Use smartsheetUniqueId as Primary Key (like Observation)
async function copyInjuryRecords(tableNames: Record<string, string>, logGroupName: string, logStreamName: string, skipDuplicates: boolean) {
  let copied = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages: string[] = [];
  
  try {
    console.log(`📊 Starting injury copy from table: ${tableNames.SmartsheetInjury}`);
    
    const scanCommand = new ScanCommand({
      TableName: tableNames.SmartsheetInjury
    });
    
    const result = await docClient.send(scanCommand);
    console.log(`📈 Found ${result.Items?.length || 0} injury records to process`);
    
    if (result.Items) {
      for (const item of result.Items) {
        try {
          console.log(`🔄 Processing injury record: ${item.id} (autoNumber: ${item.autoNumber})`);
          
          const submissionRecord = mapInjuryToSubmission(item);
          
          console.log(`📝 Created record with smartsheetUniqueId as PK: ${submissionRecord.id}`);
          
          // ✅ SIMPLE: Just insert - DynamoDB handles duplicates automatically with PK
          await docClient.send(new PutCommand({
            TableName: tableNames.Submission,
            Item: submissionRecord
          }));
          
          copied++;
          console.log(`✅ Successfully copied injury record: ${item.id} -> ${submissionRecord.submissionId} (PK: ${submissionRecord.id})`);
          
        } catch (error) {
          errors++;
          const errorMsg = `❌ Error copying injury record ${item.id}: ${error}`;
          errorMessages.push(errorMsg);
          console.error(errorMsg);
        }
      }
    }
    
  } catch (error) {
    const errorMsg = `❌ Error scanning SmartsheetInjury table: ${error}`;
    errorMessages.push(errorMsg);
    console.error(errorMsg);
  }
  
  const summary = `Injury copy completed: ${copied} copied, ${skipped} skipped, ${errors} errors`;
  console.log(summary);
  await logToCloudWatch(logGroupName, logStreamName, summary);
  
  return { copied, skipped, errors, errorMessages };
}


// ✅ SIMPLE copyRecognitionRecords - Check then Insert
// ✅ FIXED copyRecognitionRecords - Use smartsheetUniqueId as Primary Key
// ✅ ENHANCED copyRecognitionRecords with Attachment Processing
async function copyRecognitionRecords(tableNames: Record<string, string>, logGroupName: string, logStreamName: string, skipDuplicates: boolean) {
  let copied = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages: string[] = [];
  
  try {
    console.log(`📊 Starting recognition copy from table: ${tableNames.SmartsheetRecognition}`);
    
    const scanCommand = new ScanCommand({
      TableName: tableNames.SmartsheetRecognition
    });
    
    const result = await docClient.send(scanCommand);
    console.log(`📈 Found ${result.Items?.length || 0} recognition records to process`);
    
    if (result.Items) {
      for (const item of result.Items) {
        try {
          console.log(`🔄 Processing recognition record: ${item.id} (autoNumber: ${item.autoNumber})`);
          
          const recognitionRecord = mapRecognitionToRecognition(item);
          
          console.log(`📝 Created record with smartsheetUniqueId as PK: ${recognitionRecord.id}`);
          
          // ✅ SIMPLE: Just insert - DynamoDB handles duplicates automatically with PK
          await docClient.send(new PutCommand({
            TableName: tableNames.Recognition,
            Item: recognitionRecord
          }));
          
          copied++;
          console.log(`✅ Successfully copied recognition record: ${item.id} -> ${recognitionRecord.recognitionId} (PK: ${recognitionRecord.id})`);
          
          // ✅ PROCESS ATTACHMENTS AFTER SUCCESSFUL INSERT
          if (item.attachments && item.attachments.length > 0) {
            console.log(`📎 Processing ${item.attachments.length} attachments for recognition ${recognitionRecord.recognitionId}`);
            
            try {
              const attachmentResult = await downloadAndUploadAttachments(
                item.sheetId,
                recognitionRecord.recognitionId,
                item.attachments
              );
              
              if (attachmentResult) {
                // ✅ UPDATE RECOGNITION RECORD WITH ATTACHMENT INFO
                await docClient.send(new PutCommand({
                  TableName: tableNames.Recognition,
                  Item: {
                    ...recognitionRecord,
                    mediaUploadUrl: attachmentResult.mediaUploadUrl,
                    thumbnailS3Key: attachmentResult.thumbnailS3Key,
                    photoSize: attachmentResult.photoSize,
                    photoType: attachmentResult.photoType,
                    updatedAt: new Date().toISOString()
                  }
                }));
                
                console.log(`📸 Successfully processed attachments for recognition ${recognitionRecord.recognitionId}`);
                console.log(`📸 S3 Key: ${attachmentResult.mediaUploadUrl}`);
              }
            } catch (attachmentError) {
              console.error(`❌ Error processing attachments for recognition ${recognitionRecord.recognitionId}:`, attachmentError);
              // Don't fail the entire record for attachment errors
            }
          }
          
        } catch (error) {
          errors++;
          const errorMsg = `❌ Error copying recognition record ${item.id}: ${error}`;
          errorMessages.push(errorMsg);
          console.error(errorMsg);
        }
      }
    }
    
  } catch (error) {
    const errorMsg = `❌ Error scanning SmartsheetRecognition table: ${error}`;
    errorMessages.push(errorMsg);
    console.error(errorMsg);
  }
  
  const summary = `Recognition copy completed: ${copied} copied, ${skipped} skipped, ${errors} errors`;
  console.log(summary);
  await logToCloudWatch(logGroupName, logStreamName, summary);
  
  return { copied, skipped, errors, errorMessages };
}
