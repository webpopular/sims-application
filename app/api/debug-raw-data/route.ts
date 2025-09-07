// app/api/debug-raw-data/route.ts
'use server';

import { NextResponse } from 'next/server';

// Init Amplify from env-driven config (no outputs.json)
import '@/app/lib/amplify-config-universal';

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/schema';
import { fetchAuthSession } from 'aws-amplify/auth/server';

// Safer defaults for this route
export const runtime = 'nodejs';        // ensure Node (Buffer, AWS SDK, etc.)
export const dynamic = 'force-dynamic'; // don't cache user-scoped responses

// Enable SSR session handling without changing category config
Amplify.configure({}, { ssr: true });

export async function GET() {
  try {
    // Require a signed-in user (User Pool / JWT)
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    if (!idToken) {
      return NextResponse.json(
          { error: 'Not authenticated (no ID token)' },
          { status: 401 }
      );
    }

    const client = generateClient<Schema>({ authMode: 'userPool' });

    // Keep it small; add fields you actually inspect
    const selectionSet = [
      'id',
      'submissionId',
      'recordType',
      'hierarchyString',
      'createdBy',
      'createdAt',
      'status',
    ] as const;

    console.log('🔍 [DebugRawData] Fetching first 10 submissions…');

    const resp = await client.models.Submission.list({
      selectionSet,
      limit: 10,
    });

    const data = resp.data ?? [];

    console.log(`✅ [DebugRawData] Found ${data.length} submissions`);

    return NextResponse.json({
      success: true,
      totalSubmissions: data.length,
      sampleSubmissions: data.map((item) => ({
        id: item.id,
        submissionId: item.submissionId,
        recordType: item.recordType,
        hierarchyString: item.hierarchyString,
        hierarchyStringLength: item.hierarchyString?.length || 0,
        hierarchyStringBytes: item.hierarchyString
            ? Buffer.from(item.hierarchyString).toString('hex')
            : null,
        createdBy: item.createdBy,
        createdAt: item.createdAt,
        status: item.status,
      })),
      uniqueHierarchies: [...new Set(data.map((i) => i.hierarchyString).filter(Boolean))],
      fieldNames: data.length > 0 ? Object.keys(data[0]) : [],
    });
  } catch (error: any) {
    console.error('❌ [DebugRawData] Error:', error);
    return NextResponse.json(
        { error: 'Failed to fetch raw data', details: error?.message ?? 'Unknown error' },
        { status: 500 }
    );
  }
}
