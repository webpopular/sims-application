// app/api/smartsheet/get-columns/route.ts
import { NextResponse } from 'next/server';
import { SMARTSHEET_CONFIG, SheetType } from '../config';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sheetType = searchParams.get('sheetType') as SheetType;
  
  if (!sheetType || !Object.keys(SMARTSHEET_CONFIG.SHEET_IDS).includes(sheetType)) {
    return NextResponse.json(
      { error: 'Invalid or missing sheetType parameter' }, 
      { status: 400 }
    );
  }
  
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
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const data = await response.json();
    
    const columns = data.columns.map((column: any) => ({
      id: column.id,
      title: column.title,
      type: column.type,
      primary: column.primary || false,
      index: column.index
    }));

    return NextResponse.json({
      success: true,
      sheetType,
      sheetId: data.id,
      columns: columns,
      totalColumns: columns.length
    });
    
  } catch (error) {
    console.error('Error fetching columns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch columns', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}
