// app/api/smartsheet/columns/route.ts
import { NextResponse } from 'next/server';
import { SMARTSHEET_CONFIG, SheetType } from '../config';

interface SmartsheetColumn {
    id: number;
    index: number;
    title: string;
    type: string;
    primary?: boolean;
    width?: number;
}

// Define an interface for the processed column data
interface ProcessedColumn {
    id: number;
    title: string;
    type: string;
    index: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetType = (searchParams.get('sheetType') || 'SEATS_NA_RECOGNITION') as SheetType;
    
    if (!Object.keys(SMARTSHEET_CONFIG.SHEET_IDS).includes(sheetType)) {
      throw new Error(`Invalid sheet type: ${sheetType}`);
    }

    const response = await fetch(
      `${SMARTSHEET_CONFIG.API_URL}/sheets/${SMARTSHEET_CONFIG.SHEET_IDS[sheetType]}?include=columnType`,
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

    const data = await response.json();
    
    // Extract and format column information
    const columns: ProcessedColumn[] = data.columns.map((column: SmartsheetColumn) => ({
      id: column.id,
      title: column.title,
      type: column.type,
      index: column.index
    }));
    
    console.log('Column information:');
    columns.forEach((col: ProcessedColumn) => {
      console.log(`Column ID: ${col.id}, Title: "${col.title}", Type: ${col.type}, Index: ${col.index}`);
    });
    
    return NextResponse.json({ columns });
  } catch (error) {
    console.error('SmartSheet API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SmartSheet columns' }, 
      { status: 500 }
    );
  }
}
