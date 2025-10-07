// app/api/debug-submissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from '@/app/amplify-config';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/schema';

let configured = false;
function ensureAmplify() {
  if (!configured) {
    Amplify.configure(amplifyConfig, { ssr: true });
    configured = true;
  }
}

const APPSYNC_ENDPOINT =
    process.env.APPSYNC_API_URL || process.env.NEXT_PUBLIC_APPSYNC_API_URL || '';

export async function GET(req: NextRequest) {
  try {
    ensureAmplify();

    // Get ID token from Authorization header (or ?token= for local testing)
    const url = new URL(req.url);
    const idToken =
        req.headers.get('authorization') ||
        req.headers.get('Authorization') ||
        url.searchParams.get('token') ||
        '';

    if (!idToken) {
      return NextResponse.json(
          { error: 'Missing Authorization ID token. Pass Authorization: <ID_TOKEN> or ?token=...' },
          { status: 401 }
      );
    }

    // Try Amplify Data (Gen2) first
    try {
      const client: any = generateClient<Schema>({
        authMode: 'userPool',
        authToken: idToken,
      });

      if (client?.models?.Submission) {
        const resp = await client.models.Submission.list({ limit: 100 });
        const items = resp.data ?? [];
        return NextResponse.json({
          success: true,
          source: 'amplify-data',
          totalSubmissions: items.length,
          submissions: items.map((i: any) => ({
            id: i.id,
            submissionId: i.submissionId,
            recordType: i.recordType,
            hierarchyString: i.hierarchyString,
            createdBy: i.createdBy,
            createdAt: i.createdAt,
          })),
          hierarchyStrings: [...new Set(items.map((i: any) => i.hierarchyString).filter(Boolean))],
        });
      }
    } catch {
      // fall through to raw GraphQL
    }

    // Fallback: classic AppSync GraphQL
    if (!APPSYNC_ENDPOINT) {
      return NextResponse.json(
          { error: 'APPSYNC_API_URL / NEXT_PUBLIC_APPSYNC_API_URL not set' },
          { status: 500 }
      );
    }

    // Try common list field names
    const candidates = [
      {
        field: 'listSubmissions',
        query: `
          query List($limit: Int) {
            listSubmissions(limit: $limit) {
              items {
                id submissionId recordType hierarchyString createdBy createdAt
              }
            }
          }
        `,
        path: (data: any) => data?.listSubmissions?.items,
      },
      {
        field: 'submissions',
        query: `
          query List($limit: Int) {
            submissions(limit: $limit) {
              items {
                id submissionId recordType hierarchyString createdBy createdAt
              }
            }
          }
        `,
        path: (data: any) => data?.submissions?.items,
      },
    ] as const;

    for (const c of candidates) {
      const res = await fetch(APPSYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: idToken },
        body: JSON.stringify({ query: c.query, variables: { limit: 100 } }),
      });
      const json = await res.json();
      if (res.ok && !json.errors) {
        const items = c.path(json.data) ?? [];
        if (Array.isArray(items)) {
          return NextResponse.json({
            success: true,
            source: `graphql:${c.field}`,
            totalSubmissions: items.length,
            submissions: items,
            hierarchyStrings: [...new Set(items.map((i: any) => i.hierarchyString).filter(Boolean))],
          });
        }
      }
    }

    return NextResponse.json(
        { error: 'No submissions found (model name or auth rules may differ in this API).' },
        { status: 404 }
    );
  } catch (e: any) {
    return NextResponse.json(
        { error: e?.message || String(e) },
        { status: 500 }
    );
  }
}
