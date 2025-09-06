// app/api/debug-submissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from "@/amplify/data/schema";
import config from '@/amplify_outputs.json';

Amplify.configure(config, { ssr: true });
const client = generateClient<Schema>();

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Debug] Fetching all submissions...');
    
    const response = await client.models.Submission.list({
      limit: 100
    });
    
    const data = response.data || [];
    
    console.log(`✅ [Debug] Found ${data.length} total submissions`);
    
    return NextResponse.json({
      success: true,
      totalSubmissions: data.length,
      submissions: data.map(item => ({
        id: item.id,
        submissionId: item.submissionId,
        recordType: item.recordType,
        hierarchyString: item.hierarchyString,
        createdBy: item.createdBy,
        createdAt: item.createdAt
      })),
      hierarchyStrings: [...new Set(data.map(item => item.hierarchyString).filter(Boolean))]
    });

  } catch (error) {
    console.error('❌ [Debug] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch submissions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
