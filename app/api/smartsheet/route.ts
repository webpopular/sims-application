// app/api/smartsheet/route.ts
// app/api/smartsheet/route.ts
import { NextResponse } from 'next/server';
import { SMARTSHEET_CONFIG, SheetType } from './config';

interface SmartsheetRow {
  id: number;
  rowNumber: number;
  cells: Array<{
    columnId: number;
    value?: any;
    displayValue?: string;
  }>;
}

interface SmartsheetResponse {
  id: number;
  name: string;
  rows: SmartsheetRow[];
  columns: Array<{
    id: number;
    title: string;
    type: string;
  }>;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetType = (searchParams.get('sheetType') || 'SEATS_NA_INJURY') as SheetType;
    
    if (!Object.keys(SMARTSHEET_CONFIG.SHEET_IDS).includes(sheetType)) {
      throw new Error(`Invalid sheet type: ${sheetType}`);
    }

    const response = await fetch(
      `${SMARTSHEET_CONFIG.API_URL}/sheets/${SMARTSHEET_CONFIG.SHEET_IDS[sheetType]}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SMARTSHEET_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch SmartSheet data: ${response.statusText}`);
    }

    const data = await response.json() as SmartsheetResponse;
    
    // Create a column map for easier reference
    const columnMap = new Map();
    data.columns.forEach(column => {
      columnMap.set(column.id, column.title);
    });
    
    // Process rows to make them more readable
    const processedRows = data.rows.map(row => {
      const processedRow: Record<string, any> = {
        id: row.id,
        rowNumber: row.rowNumber
      };
      
      // Process each cell and map it to its column name
      row.cells.forEach(cell => {
        const columnName = columnMap.get(cell.columnId) || `column_${cell.columnId}`;
        processedRow[columnName] = cell.value;
      });
      
      return processedRow;
    });
    
    // Log some key information for verification
    console.log(`Sheet: ${data.name} (${sheetType})`);
    console.log(`Total rows: ${processedRows.length}`);
    
    // Log the first row with key columns (if available)
    if (processedRows.length > 0) {
      const firstRow = processedRows[0];
      console.log('Sample row data:');
      
      // Log key fields based on sheet type
      if (sheetType === 'SEATS_NA_INJURY') {
        console.log(`  Employee ID: ${firstRow['Employee ID']}`);
        console.log(`  Name: ${firstRow['First Name']} ${firstRow['Last Name']}`);
        console.log(`  Date of Incident: ${firstRow['Date of Incident']}`);
      } else if (sheetType === 'SEATS_NA_OBSERVATION') {
        console.log(`  Employee ID: ${firstRow['Employee ID']}`);
        console.log(`  Name: ${firstRow['Name']}`);
        console.log(`  Date of Incident: ${firstRow['Date of Incident/Inspection']}`);
      } else if (sheetType === 'SEATS_NA_RECOGNITION') {
        console.log(`  Name: ${firstRow['Name of Recipient']}`);
        console.log(`  Location: ${firstRow['Location']}`);
      }
    }
    
    // Return processed data
    return NextResponse.json({
      sheetName: data.name,
      rowCount: processedRows.length,
      rows: processedRows
    });
  } catch (error) {
    console.error('SmartSheet API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SmartSheet data' }, 
      { status: 500 }
    );
  }
}
