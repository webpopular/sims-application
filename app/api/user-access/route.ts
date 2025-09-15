// app/api/user-access/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const APPSYNC_ENDPOINT =
    process.env.APPSYNC_API_URL || process.env.NEXT_PUBLIC_APPSYNC_API_URL || '';

export async function GET(req: NextRequest) {
  try {
    const url   = new URL(req.url);
    const debug = url.searchParams.get('debug') === '1';
    const raw   = (url.searchParams.get('email') || '').trim();

    if (!raw) return NextResponse.json({ ok:false, error:'Missing email' }, { status:400 });

    const emailCandidates = [raw, raw.toLowerCase(), raw.replace(/\s+/g,'')].filter(
        (v,i,a) => a.indexOf(v) === i
    );

    const idToken = (req.headers.get('authorization') || url.searchParams.get('token') || '')
        .replace(/^Bearer\s+/i,'')
        .trim();
    if (!idToken) return NextResponse.json({ ok:false, error:'No ID token on request' }, { status:401 });
    if (!APPSYNC_ENDPOINT) return NextResponse.json({ ok:false, error:'APPSYNC endpoint not configured' }, { status:500 });

    const peek = (t:string) => { try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString('utf8')); } catch { return {}; } };
    const jwt  = peek(idToken);

    const GET_FIELDS  = ['getUserRole','getUserAccess','getUser'];
    const LIST_FIELDS = ['listUserRoles','listUserAccesses','listUsers','users'];

    for (const field of GET_FIELDS) {
      for (const email of emailCandidates) {
        const q = `
          query GetUser($email: String!) {
            ${field}(email: $email) {
              email name roleTitle hierarchyString enterprise segment platform division plant level isActive cognitoGroups
            }
          }`;
        const d = await doGraphQL(APPSYNC_ENDPOINT, idToken, q, { email, emailStr: email }).catch(() => null);
        const got = d?.[field];
        if (got) return NextResponse.json({ ok:true, source:`graphql:${field}`, user: normalize(got) });
      }
    }

    const attempts:any[] = [];
    for (const field of LIST_FIELDS) {
      for (const email of emailCandidates) {
        const q = `query List($email: String!) {
          ${field}(filter:{ email:{ eq:$email } }, limit:5) {
            items { email name roleTitle hierarchyString enterprise segment platform division plant level isActive cognitoGroups }
          }
        }`;
        const d = await doGraphQL(APPSYNC_ENDPOINT, idToken, q, { email }).catch(e => ({ __err:String(e) }));
        const items = d?.[field]?.items;
        if (debug) attempts.push({ field, email, count: Array.isArray(items)? items.length : 0, err: d?.__err });
        if (Array.isArray(items) && items.length) {
          return NextResponse.json({ ok:true, source:`graphql:${field}`, user: normalize(items[0]) });
        }
      }
    }

    return NextResponse.json(
        debug
            ? { ok:false, error:'No user access data found', endpoint:APPSYNC_ENDPOINT, tokenUse: jwt.token_use, aud: jwt.aud, iss: jwt.iss, groups: jwt['cognito:groups'] || [], attempts }
            : { ok:false, error:'No user access data found' },
        { status:404 }
    );
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status:500 });
  }
}

async function doGraphQL(endpoint:string, idToken:string, query:string, variables?:any) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type':'application/json', Authorization: idToken },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || { status: res.status }));
  return json.data;
}

function normalize(u:any) {
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
function levelToScope(l:number){ return l===1?'ENTERPRISE':l===2?'SEGMENT':l===3?'PLATFORM':l===4?'DIVISION':'PLANT'; }
