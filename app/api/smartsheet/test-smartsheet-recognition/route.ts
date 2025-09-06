// app/api/smartsheet/test-smartsheet-recognition/route.ts
import { NextResponse } from 'next/server';
import { SMARTSHEET_CONFIG } from '../config';

export async function GET() {
  try {
    console.log('🔍 Testing Smartsheet Recognition data...');
    
    // Fetch Recognition data WITH attachments
    const response = await fetch(
      `${SMARTSHEET_CONFIG.API_URL}/sheets/${SMARTSHEET_CONFIG.SHEET_IDS.SEATS_NA_RECOGNITION}?include=attachments`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SMARTSHEET_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const data = await response.json();
    
    const rowsWithAttachments = [];
    const rowsWithoutAttachments = [];
    
    for (const row of data.rows) {
      if (row.attachments && row.attachments.length > 0) {
        rowsWithAttachments.push({
          rowId: row.id,
          rowNumber: row.rowNumber,
          attachmentCount: row.attachments.length,
          attachments: row.attachments.map((att: any) => ({
            id: att.id,
            name: att.name,
            attachmentType: att.attachmentType,
            mimeType: att.mimeType,
            sizeInKb: att.sizeInKb
          }))
        });
      } else {
        rowsWithoutAttachments.push({
          rowId: row.id,
          rowNumber: row.rowNumber
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      sheetId: data.id,
      sheetName: data.name,
      totalRows: data.rows.length,
      rowsWithAttachments: rowsWithAttachments.length,
      rowsWithoutAttachments: rowsWithoutAttachments.length,
      attachmentDetails: rowsWithAttachments,
      sampleRowsWithoutAttachments: rowsWithoutAttachments.slice(0, 5)
    });
    
  } catch (error) {
    console.error('Error testing Smartsheet Recognition:', error);
    return NextResponse.json({ 
      error: 'Failed to test Smartsheet Recognition',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
