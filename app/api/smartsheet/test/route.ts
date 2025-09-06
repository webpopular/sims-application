// app/api/smartsheet/test/route.ts
import { NextResponse } from 'next/server';
import { SMARTSHEET_CONFIG, SheetType } from '../config';

// Define a type for the results object
interface SheetResults {
  [key: string]: {
    name: string;
    rowCount: number;
    columnCount: number;
  } | {
    error: string;
  };
}

export async function GET() {
  try {
    const results: SheetResults = {};
    
    // Test each sheet type
    for (const sheetType of Object.keys(SMARTSHEET_CONFIG.SHEET_IDS) as SheetType[]) {
      console.log(`Testing sheet: ${sheetType}`);
      
      try {
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
          results[sheetType] = { error: response.statusText };
          continue;
        }
        
        const data = await response.json();
        results[sheetType] = {
          name: data.name,
          rowCount: data.rows?.length || 0,
          columnCount: data.columns?.length || 0
        };
        
        console.log(`  Success: ${data.name} - ${data.rows?.length || 0} rows`);
      } catch (error) {
        console.error(`  Error fetching ${sheetType}:`, error);
        results[sheetType] = { error: error instanceof Error ? error.message : String(error) };
      }
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Test API Error:', error);
    return NextResponse.json(
      { error: 'Failed to test SmartSheet connections' }, 
      { status: 500 }
    );
  }
}
