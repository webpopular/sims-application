// app/api/debug-raw-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import config from '@/amplify_outputs.json';

Amplify.configure(config, { ssr: true });

export async function GET(request: NextRequest) {
  try {
    const client = generateClient<Schema>({
      authMode: 'apiKey'
    });

    console.log('🔍 [Debug] Fetching ALL submissions without any filters...');
    
    const response = await client.models.Submission.list({
      limit: 10 // Just get first 10 records
    });
    
    const data = response.data || [];
    
    console.log(`✅ [Debug] Found ${data.length} total submissions`);
    
    return NextResponse.json({
      success: true,
      totalSubmissions: data.length,
      sampleSubmissions: data.map(item => ({
        id: item.id,
        submissionId: item.submissionId,
        recordType: item.recordType,
        hierarchyString: item.hierarchyString,
        hierarchyStringLength: item.hierarchyString?.length || 0,
        hierarchyStringBytes: item.hierarchyString ? Buffer.from(item.hierarchyString).toString('hex') : null,
        createdBy: item.createdBy,
        createdAt: item.createdAt,
        status: item.status
      })),
      uniqueHierarchies: [...new Set(data.map(item => item.hierarchyString).filter(Boolean))],
      fieldNames: data.length > 0 ? Object.keys(data[0]) : []
    });

  } catch (error) {
    console.error('❌ [Debug] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch raw data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
