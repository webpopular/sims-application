// app/api/smartsheet/copy-recognition-to-sims/route.ts
//http://localhost:3000/api/smartsheet/copy-recognition-to-sims

import { NextResponse } from 'next/server';
import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { downloadAndUploadAttachments } from '../attachment-handler';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
    convertClassInstanceToMap: false
  }
});

// Cache for table names
let tableNamesCache: Record<string, string> | null = null;

// Helper function to generate Recognition ID
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

// Function to discover table names
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
        if (tableName.includes('SmartsheetRecognition')) {
          tableNames.SmartsheetRecognition = tableName;
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

// ✅ ENHANCED CHECKBOX PARSING FUNCTION
const parseCheckboxFlags = (checkboxString: string, rawData?: any) => {
  console.log(`🔍 Parsing checkbox data: "${checkboxString}"`);
  
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
    if (rawData && rawData.Checkbox) {
      checkboxString = rawData.Checkbox;
    }
  }
  
  if (checkboxString) {
    const lowerData = checkboxString.toLowerCase();
    
    if (lowerData.includes('continual improvement') || 
        lowerData.includes('simplicity') || 
        lowerData.includes('looking for new opportunities')) {
      flags.continualImprovement = true;
    }
    
    if (lowerData.includes('80/20') || 
        lowerData.includes('strategically focusing') || 
        lowerData.includes('priorities in challenging')) {
      flags.focus8020 = true;
    }
    
    if (lowerData.includes('entrepreneurial culture') || 
        lowerData.includes('thinking about your role like an entrepreneur') || 
        lowerData.includes('creatively developing new')) {
      flags.entrepreneurialCulture = true;
    }
    
    if (lowerData.includes('people focused') || 
        lowerData.includes('exceeding expectations to help') || 
        lowerData.includes('serve a team member')) {
      flags.peopleFocused = true;
    }
    
    if (lowerData.includes('detail focused') || 
        lowerData.includes('consistently championing towards results') || 
        lowerData.includes('higher level of awareness') || 
        lowerData.includes('housekeeping, safety')) {
      flags.detailFocused = true;
    }
    
    if (lowerData.includes('safety focused') || 
        lowerData.includes('safety') || 
        lowerData.includes('safe')) {
      flags.safetyFocused = true;
    }
    
    if (lowerData.includes('attitude focused') || 
        lowerData.includes('positive attitude') || 
        lowerData.includes('attitude')) {
      flags.attitudeFocused = true;
    }
  }
  
  console.log(`✅ Decoded flags:`, flags);
  return flags;
};

// ✅ Map SmartsheetRecognition to Recognition with attachment support
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
  
  // ✅ ENHANCED CHECKBOX PARSING
  const checkboxFlags = parseCheckboxFlags(recognitionRecord.checkbox, recognitionRecord.rawData);
  
  return cleanObject({
    // ✅ Use smartsheetUniqueId as PRIMARY KEY
    id: smartsheetUniqueId,
    recognitionId: newRecognitionId,
    
    // Recognition specific fields
    yourName: recognitionRecord.yourName || '',
    yourEmployeeId: recognitionRecord.employeeId || '',
    recognizedPersonName: recognitionRecord.nameOfRecipient || '',
    
    // ✅ DECODED CHECKBOX VALUES
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
    mediaUploadUrl: '',
    thumbnailS3Key: '',
    photoSize: '',
    photoType: '',
    
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

export async function GET(request: Request) {
  return await copyRecognitionRecords();
}

export async function POST(request: Request) {
  return await copyRecognitionRecords();
}

// ✅ FIXED copyRecognitionRecords with ACTUAL attachment processing
async function copyRecognitionRecords() {
    let copied = 0;
    let skipped = 0;
    let errors = 0;
    const errorMessages: string[] = [];
    
    try {
      console.log(`🚀 Starting Recognition copy process...`);
      
      const tableNames = await discoverTableNames();
      
      if (!tableNames.SmartsheetRecognition || !tableNames.Recognition) {
        throw new Error('Required tables not found');
      }
      
      console.log(`📊 Scanning SmartsheetRecognition table: ${tableNames.SmartsheetRecognition}`);
      
      const scanCommand = new ScanCommand({
        TableName: tableNames.SmartsheetRecognition
      });
      
      const result = await docClient.send(scanCommand);
      console.log(`📈 Found ${result.Items?.length || 0} recognition records to process`);
      
      if (result.Items) {
        for (const item of result.Items) {
          try {
            console.log(`\n🔄 Processing recognition record: ${item.id} (autoNumber: ${item.autoNumber})`);
            
            // ✅ CHECK FOR ATTACHMENTS FIRST
            const hasAttachments = item.attachments && item.attachments.length > 0;
            console.log(`📎 Record ${item.id} has attachments: ${hasAttachments}`);
            
            if (hasAttachments) {
              console.log(`📎 Found ${item.attachments.length} attachments:`);
              item.attachments.forEach((attachment: any, index: number) => {
                console.log(`📎 Attachment ${index + 1}:`, {
                  id: attachment.id,
                  name: attachment.name,
                  attachmentType: attachment.attachmentType,
                  mimeType: attachment.mimeType,
                  sizeInKb: attachment.sizeInKb
                });
              });
            }
            
            const recognitionRecord = mapRecognitionToRecognition(item);
            
            console.log(`📝 Created record with smartsheetUniqueId as PK: ${recognitionRecord.id}`);
            
            // ✅ Insert the record first
            await docClient.send(new PutCommand({
              TableName: tableNames.Recognition,
              Item: recognitionRecord
            }));
            
            copied++;
            console.log(`✅ Successfully copied recognition record: ${item.id} -> ${recognitionRecord.recognitionId}`);
            
            // ✅ NOW ACTUALLY PROCESS ATTACHMENTS IF THEY EXIST
            if (hasAttachments) {
              console.log(`📸 Starting attachment processing for recognition ${recognitionRecord.recognitionId}`);
              
              try {
                // ✅ CALL THE ATTACHMENT HANDLER FUNCTION
                const attachmentResult = await downloadAndUploadAttachments(
                  item.sheetId,
                  recognitionRecord.recognitionId,
                  item.attachments
                );
                
                if (attachmentResult) {
                  console.log(`📸 Attachment processing successful!`);
                  console.log(`📸 S3 Key: ${attachmentResult.mediaUploadUrl}`);
                  console.log(`📸 Thumbnail Key: ${attachmentResult.thumbnailS3Key}`);
                  
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
                  
                  console.log(`📸 Successfully updated record with attachment info`);
                } else {
                  console.log(`⚠️  downloadAndUploadAttachments returned null`);
                }
              } catch (attachmentError) {
                console.error(`❌ Error processing attachments for recognition ${recognitionRecord.recognitionId}:`, attachmentError);
                errorMessages.push(`Attachment error for ${recognitionRecord.recognitionId}: ${attachmentError}`);
              }
            } else {
              console.log(`📎 No attachments found for recognition ${recognitionRecord.recognitionId}`);
            }
            
          } catch (error) {
            errors++;
            const errorMsg = `❌ Error copying recognition record ${item.id}: ${error}`;
            errorMessages.push(errorMsg);
            console.error(errorMsg);
          }
        }
      }
      
      const summary = `Recognition copy completed: ${copied} copied, ${skipped} skipped, ${errors} errors`;
      console.log(`\n${summary}`);
      
      return NextResponse.json({
        success: true,
        message: summary,
        totalRecords: result.Items?.length || 0,
        copied,
        skipped,
        errors,
        errorMessages: errorMessages.slice(0, 10),
        tableNames
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Recognition copy failed:`, errorMessage);
      
      return NextResponse.json(
        { 
          error: 'Recognition copy failed', 
          details: errorMessage,
          copied,
          skipped,
          errors
        }, 
        { status: 500 }
      );
    }
  }
  
  
  
