// app/api/debug-submissions/route.ts
import { NextResponse } from 'next/server';

// ✅ Initialize Amplify once from envs (no outputs.json here)
import '@/app/amplify-config-server';

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/schema';

// Use IAM on the server (no user session needed)
const client = generateClient<Schema>({ authMode: 'iam' });

export async function GET() {
  try {
    console.log('🔍 [Debug] Fetching all submissions...');

    const response = await client.models.Submission.list({
      limit: 100,
    });

    const data = response.data ?? [];
    console.log(`✅ [Debug] Found ${data.length} total submissions`);

    return NextResponse.json({
      success: true,
      totalSubmissions: data.length,
      submissions: data.map((item) => ({
        id: item.id,
        submissionId: item.submissionId,
        recordType: item.recordType,
        hierarchyString: item.hierarchyString,
        createdBy: item.createdBy,
        createdAt: item.createdAt,
      })),
      hierarchyStrings: [...new Set(data.map((i) => i.hierarchyString).filter(Boolean))],
    });
  } catch (error: any) {
    console.error('❌ [Debug] Error:', error);
    return NextResponse.json(
        {
          error: 'Failed to fetch submissions',
          details: error?.message ?? 'Unknown error',
        },
        { status: 500 },
    );
  }
}
