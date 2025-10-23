// app/api/user-access/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const APPSYNC_ENDPOINT =
    process.env.APPSYNC_API_URL || process.env.NEXT_PUBLIC_APPSYNC_API_URL || '';

function computePermissions(groups: string[]) {
  const has = (g: string) => groups.includes(g);

  return {
    // View
    canViewDashboard: true,
    canViewOpenClosedReports: true,
    canViewSafetyAlerts: true,
    canViewLessonsLearned: true,
    canViewManageOSHALogs: has('PLANT_SAFETY_MANAGER') || has('DIVISION_PLANT_HR'),

    // Report / Recognition
    canReportInjury: has('PLANT_SAFETY_MANAGER') || has('PLANT_SAFETY_CHAMPIONS') || has('DIVISION_PLANT_HR'),
    canReportObservation: true,
    canSafetyRecognition: true,

    // Actions
    canTakeFirstReportActions: has('PLANT_SAFETY_MANAGER') || has('DIVISION_PLANT_MANAGER') || has('DIVISION_SAFETY'),
    canTakeQuickFixActions: has('PLANT_SAFETY_MANAGER') || has('DIVISION_PLANT_HR') || has('PLANT_SAFETY_CHAMPIONS'),
    canTakeIncidentRCAActions: has('PLANT_SAFETY_MANAGER') || has('DIVISION_PLANT_HR') || has('DIVISION_OPS_DIRECTOR'),
    canPerformApprovalIncidentClosure: has('DIVISION_PLANT_MANAGER') || has('DIVISION_OPS_DIRECTOR'),

    // PII / Tickets / Approvals
    canViewPII: has('DIVISION_HR_DIRECTOR') || has('PLATFORM_HR') || has('DIVISION_PLANT_HR'),
    canSubmitDSATicket: has('ENTERPRISE') || has('SEGMENT') || has('DIVISION_VP_GM_BUM'),
    canApproveLessonsLearned: has('DIVISION_OPS_DIRECTOR') || has('ENTERPRISE_SAFETY_DIRECTOR'),
  };
}


export async function GET(req: NextRequest) {
  try {
    const url   = new URL(req.url);
    const debug = url.searchParams.get('debug') === '1';

    // 1) email from query
    const rawEmail = (url.searchParams.get('email') || '').trim();
    if (!rawEmail) {
      return NextResponse.json({ ok:false, error:'Missing email' }, { status:400 });
    }

    // 2) Cognito ID token (RAW, no "Bearer")
    const headerToken = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const queryToken  = url.searchParams.get('token') || '';
    const idToken     = (headerToken || queryToken).replace(/^Bearer\s+/i,'').trim();

    if (!idToken) {
      return NextResponse.json({ ok:false, error:'No ID token on request' }, { status:401 });
    }
    if (!APPSYNC_ENDPOINT) {
      return NextResponse.json({ ok:false, error:'APPSYNC endpoint not configured' }, { status:500 });
    }

    // Small helper to peek at token (no signature check, for debug only)
    const peek = (t: string) => {
      try { const [,p] = t.split('.'); return JSON.parse(Buffer.from(p, 'base64url').toString('utf8')); }
      catch { return {}; }
    };
    const jwt = peek(idToken);
    const tokenInfo = {
      iss: jwt?.iss,
      aud: jwt?.aud,
      token_use: jwt?.token_use,
      sub: jwt?.sub,
      groups: jwt?.['cognito:groups'] || [],
      email: jwt?.email
    };

    // Build candidate strings to try server-side
    const emailCandidates = Array.from(new Set([
      rawEmail,
      rawEmail.trim(),
      rawEmail.toLowerCase(),
      rawEmail.replace(/\s+/g,''),
    ]));

    // GraphQL helpers
    const doGraphQL = async (query: string, variables?: any) => {
      const res = await fetch(APPSYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type':'application/json', Authorization: idToken },
        body: JSON.stringify({ query, variables }),
      });
      const json = await res.json();
      if (!res.ok || json.errors) {
        throw new Error(JSON.stringify(json.errors || { status: res.status }));
      }
      return json.data;
    };

    const normalize = (u: any) => {
      const level = u?.level ?? 5;
      const groups = (u?.cognitoGroups || []).filter(Boolean);
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
        accessScope: level === 1 ? 'ENTERPRISE' :
            level === 2 ? 'SEGMENT'    :
                level === 3 ? 'PLATFORM'   :
                    level === 4 ? 'DIVISION'   : 'PLANT',
        isActive: u?.isActive !== false,
        cognitoGroups: (u?.cognitoGroups || []).filter(Boolean),
        permissions: computePermissions(groups),
      };
    };

    const attempts: any[] = [];

    // A) Try get* by PK (if resolver uses email as id)
    for (const field of ['getUserRole','getUserAccess','getUser']) {
      for (const email of emailCandidates) {
        try {
          const q = `query($email: String!, $emailID: ID) {
            ${field}(email: $email) { email name roleTitle level hierarchyString enterprise segment platform division plant isActive cognitoGroups }
          }`;
          const data = await doGraphQL(q, { email, emailID: email }).catch(() => null);
          const got  = data?.[field];
          attempts.push({ mode:`get:${field}`, email, hit: !!got });
          if (got) return NextResponse.json({ ok:true, source:`graphql:${field}`, user: normalize(got) });
        } catch (e:any) {
          attempts.push({ mode:`get:${field}`, email, err: String(e) });
        }
      }
    }

    // B) Try list* filter eq
    for (const field of ['listUserRoles','listUserAccesses','listUsers','users']) {
      for (const email of emailCandidates) {
        try {
          const q = `query($email:String!){
            ${field}(filter:{ email:{ eq:$email } }, limit:5){
              items{ email name roleTitle level hierarchyString enterprise segment platform division plant isActive cognitoGroups }
            }
          }`;
          const data  = await doGraphQL(q, { email }).catch(() => null);
          const items = data?.[field]?.items || [];
          attempts.push({ mode:`list-eq:${field}`, email, count: items.length });
          if (items.length) return NextResponse.json({ ok:true, source:`graphql:${field}`, user: normalize(items[0]) });
        } catch (e:any) {
          attempts.push({ mode:`list-eq:${field}`, email, err: String(e) });
        }
      }
    }

    // C) Broad list then local, case-insensitive match (last resort)
    try {
      const q = `query{
        listUserRoles(limit: 500){
          items{ email name roleTitle level hierarchyString enterprise segment platform division plant isActive cognitoGroups }
        }
      }`;
      const data  = await doGraphQL(q);
      const items = data?.listUserRoles?.items || [];
      const lower = (s:string) => (s||'').toLowerCase().trim();

      const found = items.find((r:any) => emailCandidates.some(c => lower(r?.email) === lower(c)));
      attempts.push({ mode:'list-scan', total: items.length, match: !!found });

      if (found) return NextResponse.json({ ok:true, source:'scan:listUserRoles', user: normalize(found) });
    } catch (e:any) {
      attempts.push({ mode:'list-scan', err: String(e) });
    }

    if (debug) {
      return NextResponse.json({
        ok:false,
        error:'No user access data found',
        endpoint: APPSYNC_ENDPOINT,
        tokenInfo,
        emailCandidates,
        attempts
      }, { status:404 });
    }

    return NextResponse.json({ ok:false, error:'No user access data found' }, { status:404 });
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
