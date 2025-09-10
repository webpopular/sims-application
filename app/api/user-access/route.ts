// app/api/user-access/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from '@/app/amplify-config';

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

    const url = new URL(req.url);
    const debug = url.searchParams.get('debug') === '1';

    const rawEmail = (url.searchParams.get('email') || '').trim();
    if (!rawEmail) {
      return NextResponse.json({ ok: false, error: 'Missing email' }, { status: 400 });
    }
    const emailCandidates = [
      rawEmail,
      rawEmail.toLowerCase(),           // in case data is normalized
      rawEmail.replace(/\s+/g, ''),     // just in case
    ].filter((v, i, a) => a.indexOf(v) === i);

    // ID token from header or ?token=
    const headerToken = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const queryToken  = url.searchParams.get('token') || '';
    const idToken     = (headerToken || queryToken).replace(/^Bearer\s+/i, '').trim();

    if (!idToken) {
      return NextResponse.json({ ok: false, error: 'No ID token on request' }, { status: 401 });
    }
    if (!APPSYNC_ENDPOINT) {
      return NextResponse.json({ ok: false, error: 'APPSYNC endpoint not configured' }, { status: 500 });
    }

    // Decode JWT header.payload for debug (no signature verify)
    const peek = (t: string) => {
      try {
        const [, p] = t.split('.');
        return JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
      } catch { return {}; }
    };
    const jwt = peek(idToken);
    const tokenInfo = {
      iss: jwt?.iss,
      aud: jwt?.aud,
      token_use: jwt?.token_use,
      sub: jwt?.sub,
      groups: jwt?.['cognito:groups'] || [],
    };

    // Try a set of fields in order
    const GET_FIELDS  = ['getUserRole', 'getUserAccess', 'getUser'];
    const LIST_FIELDS = ['listUserRoles', 'listUserAccesses', 'listUsers', 'users'];

    // 1) get* by PK (if email is the id)
    for (const field of GET_FIELDS) {
      for (const email of emailCandidates) {
        const q = `
          query GetUser($email: ID!, $emailStr: String) {
            ${field}(email: $email) {
              email name roleTitle hierarchyString enterprise segment platform division plant level isActive cognitoGroups
            }
          }`;
        const d = await doGraphQL(APPSYNC_ENDPOINT, idToken, q, { email, emailStr: email }).catch(() => null);
        const got = d?.[field];
        if (got) {
          if (debug) return NextResponse.json({ ok: true, source: `graphql:${field}`, emailTried: email, tokenInfo, endpoint: APPSYNC_ENDPOINT, user: got });
          return NextResponse.json({ ok: true, source: `graphql:${field}`, user: normalize(got) });
        }
      }
    }

    // 2) list* with filter
    const attempts: Array<any> = [];
    for (const field of LIST_FIELDS) {
      for (const email of emailCandidates) {
        const q = `
          query ListUsers($email: String!) {
            ${field}(filter: { email: { eq: $email } }, limit: 5) {
              items {
                email name roleTitle hierarchyString enterprise segment platform division plant level isActive cognitoGroups
              }
            }
          }`;
        const d = await doGraphQL(APPSYNC_ENDPOINT, idToken, q, { email }).catch((e) => ({ __err: String(e) }));
        const items = d?.[field]?.items as any[] | undefined;

        if (debug) attempts.push({ field, email, count: Array.isArray(items) ? items.length : 0, err: d?.__err });

        if (Array.isArray(items) && items.length) {
          const row = items[0];
          if (debug) return NextResponse.json({ ok: true, source: `graphql:${field}`, emailTried: email, tokenInfo, endpoint: APPSYNC_ENDPOINT, user: row, attempts });
          return NextResponse.json({ ok: true, source: `graphql:${field}`, user: normalize(row) });
        }
      }
    }

    if (debug) {
      return NextResponse.json({
        ok: false,
        error: 'No user access data found',
        endpoint: APPSYNC_ENDPOINT,
        tokenInfo,
        emailCandidates,
        attempts
      }, { status: 404 });
    }

    return NextResponse.json({ ok: false, error: 'No user access data found' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

async function doGraphQL(endpoint: string, idToken: string, query: string, variables?: any) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // AppSync expects the raw JWT (no "Bearer")
      Authorization: idToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(JSON.stringify(json.errors || { status: res.status }));
  }
  return json.data;
}

function normalize(u: any) {
  const level = u?.level ?? 5;
  return {
    email: u?.email,
    name: u?.name || (u?.email ? u.email.split('@')[0] : 'Unknown User'),
    roleTitle: u?.roleTitle || 'Unknown Role',
    hierarchyString: u?.hierarchyString || '',
    enterprise: u?.enterprise || 'ITW',
    segment: u?.segment || '',
    platform: u?.platform || '',
    division: u?.division || '',
    plant: u?.plant || '',
    level,
    accessScope: levelToScope(level),
    isActive: u?.isActive !== false,
    cognitoGroups: (u?.cognitoGroups || []).filter(Boolean),
    permissions: {},
  };
}
function levelToScope(level: number) {
  switch (level) {
    case 1: return 'ENTERPRISE';
    case 2: return 'SEGMENT';
    case 3: return 'PLATFORM';
    case 4: return 'DIVISION';
    default: return 'PLANT';
  }
}
