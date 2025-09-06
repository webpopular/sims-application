// app/api/smartsheet/test-attachments/route.ts
import { NextResponse } from 'next/server';
import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
    convertClassInstanceToMap: false
  }
});

export async function GET() {
  try {
    // Find SmartsheetRecognition table
    const listTablesCommand = new ListTablesCommand({});
    const tablesResult = await dynamoClient.send(listTablesCommand);
    
    let recognitionTable = '';
    if (tablesResult.TableNames) {
      for (const tableName of tablesResult.TableNames) {
        if (tableName.includes('SmartsheetRecognition')) {
          recognitionTable = tableName;
          break;
        }
      }
    }
    
    if (!recognitionTable) {
      return NextResponse.json({ error: 'SmartsheetRecognition table not found' });
    }
    
    console.log(`🔍 Scanning table: ${recognitionTable}`);
    
    // Scan for records with attachments
    const scanCommand = new ScanCommand({
      TableName: recognitionTable
    });
    
    const result = await docClient.send(scanCommand);
    
    if (!result.Items) {
      return NextResponse.json({ 
        message: 'No records found',
        table: recognitionTable 
      });
    }
    
    const recordsWithAttachments = [];
    const recordsWithoutAttachments = [];
    
    for (const item of result.Items) {
      const hasAttachments = item.attachments && item.attachments.length > 0;
      
      if (hasAttachments) {
        recordsWithAttachments.push({
          id: item.id,
          autoNumber: item.autoNumber,
          attachmentCount: item.attachments.length,
          attachments: item.attachments.map((att: any) => ({
            id: att.id,
            name: att.name,
            attachmentType: att.attachmentType,
            mimeType: att.mimeType,
            sizeInKb: att.sizeInKb
          }))
        });
      } else {
        recordsWithoutAttachments.push({
          id: item.id,
          autoNumber: item.autoNumber,
          hasAttachments: false
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      table: recognitionTable,
      totalRecords: result.Items.length,
      recordsWithAttachments: recordsWithAttachments.length,
      recordsWithoutAttachments: recordsWithoutAttachments.length,
      attachmentDetails: recordsWithAttachments,
      sampleRecordsWithoutAttachments: recordsWithoutAttachments.slice(0, 5)
    });
    
  } catch (error) {
    console.error('Error testing attachments:', error);
    return NextResponse.json({ 
      error: 'Failed to test attachments',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
