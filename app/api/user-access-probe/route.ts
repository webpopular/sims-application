// app/api/user-access-probe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from '@/app/amplify-config';

Amplify.configure(amplifyConfig, { ssr: true });

const APPSYNC =
    process.env.APPSYNC_API_URL || process.env.NEXT_PUBLIC_APPSYNC_API_URL || '';

const CANDIDATE_LIST_FIELDS = [
    'listUserRoles',
    'listUserAccesses',
    'listUsers',
    'users',
];

export async function GET(req: NextRequest) {
    try {
        if (!APPSYNC) {
            return NextResponse.json(
                { ok: false, error: 'APPSYNC_API_URL not set' },
                { status: 500 }
            );
        }

        const url = new URL(req.url);
        const idToken =
            req.headers.get('authorization') ||
            req.headers.get('Authorization') ||
            url.searchParams.get('token') ||
            '';

        if (!idToken) {
            return NextResponse.json(
                { ok: false, error: 'Pass Authorization: <ID_TOKEN> or ?token=...' },
                { status: 401 }
            );
        }

        const tried: any[] = [];
        for (const field of CANDIDATE_LIST_FIELDS) {
            const query = `
        query Probe {
          ${field}(limit: 25) {
            items {
              email name roleTitle hierarchyString level enterprise segment platform division plant isActive cognitoGroups
            }
          }
        }`;
            const r = await fetch(APPSYNC, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: idToken },
                body: JSON.stringify({ query }),
            });
            const json = await r.json();
            tried.push({ field, ok: r.ok, errors: json?.errors });

            const items = json?.data?.[field]?.items;
            if (Array.isArray(items)) {
                return NextResponse.json({
                    ok: true,
                    field,
                    count: items.length,
                    sample: items.slice(0, 5),
                });
            }
        }

        return NextResponse.json(
            { ok: false, error: 'No list* field returned items', tried },
            { status: 404 }
        );
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message || String(e) },
            { status: 500 }
        );
    }
}
