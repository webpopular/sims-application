// app/api/user-access/route.ts
import { NextResponse } from 'next/server';
import '@/app/amplify-init-server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/schema';
import { fetchAuthSession } from 'aws-amplify/auth/server';

import { DynamoDBClient, ListTablesCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

type UserPermissions = {
  canReportInjury: boolean;  canReportObservation: boolean;  canSafetyRecognition: boolean;
  canTakeFirstReportActions: boolean;  canViewPII: boolean;  canTakeQuickFixActions: boolean;
  canTakeIncidentRCAActions: boolean;  canPerformApprovalIncidentClosure: boolean;
  canViewManageOSHALogs: boolean;  canViewOpenClosedReports: boolean;  canViewSafetyAlerts: boolean;
  canViewLessonsLearned: boolean;  canViewDashboard: boolean;  canSubmitDSATicket: boolean;
  canApproveLessonsLearned: boolean;
};
type AccessScope = 'ENTERPRISE' | 'SEGMENT' | 'PLATFORM' | 'DIVISION' | 'PLANT';

const DEFAULT_PERMS: UserPermissions = {
  canReportInjury:false, canReportObservation:false, canSafetyRecognition:false,
  canTakeFirstReportActions:false, canViewPII:false, canTakeQuickFixActions:false,
  canTakeIncidentRCAActions:false, canPerformApprovalIncidentClosure:false,
  canViewManageOSHALogs:false, canViewOpenClosedReports:false, canViewSafetyAlerts:false,
  canViewLessonsLearned:false, canViewDashboard:false, canSubmitDSATicket:false,
  canApproveLessonsLearned:false,
};

function roleToScope(level?: number|null): AccessScope {
  switch (level) { case 1: return 'ENTERPRISE'; case 2: return 'SEGMENT';
    case 3: return 'PLATFORM'; case 4: return 'DIVISION'; default: return 'PLANT'; }
}

function pickModel(c:any, candidates:string[]) {
  const names = Object.keys(c?.models ?? {});
  const chosen = candidates.find(n => names.includes(n))
      ?? names.find(n => /user/i.test(n)) ?? names[0];
  return { model: c?.models?.[chosen], name: chosen, names };
}

async function lookupByEmailWithAmplify(email: string) {
  const iam = generateClient<Schema>({ authMode: 'iam' }) as any;
  const up  = generateClient<Schema>({ authMode: 'userPool' }) as any;

  const pickIam = pickModel(iam, ['UserRole','UserAccess','User','Users']);
  const pickUp  = pickModel(up,  ['UserRole','UserAccess','User','Users']);

  const selection = [
    'email','name','roleTitle','enterprise','segment','platform','division','plant',
    'hierarchyString','level','isActive','cognitoGroups','accessScope',
  ];

  // Try IAM first
  if (pickIam.model) {
    try {
      const r = await pickIam.model.list({
        filter: { email: { eq: email } },
        selectionSet: selection, limit: 1,
      });
      const row = (r?.data ?? [])[0];
      if (row) return { row, modelUsed: `amplify:iam:${pickIam.name}` };
    } catch {}
  }
  // Fallback to userPool
  if (pickUp.model) {
    try {
      const r = await pickUp.model.list({
        filter: { email: { eq: email } },
        selectionSet: selection, limit: 1,
      });
      const row = (r?.data ?? [])[0];
      if (row) return { row, modelUsed: `amplify:userPool:${pickUp.name}` };
    } catch {}
  }
  return { row: null, modelUsed: null, amplifyModels: { iam: pickIam.names, userPool: pickUp.names } };
}

function docClient() {
  const ddb = new DynamoDBClient({});
  return DynamoDBDocumentClient.from(ddb);
}

async function findTableName(candidates: string[], override?: string | null) {
  if (override) return override;
  const d = docClient();
  const raw = await d.send(new ListTablesCommand({}));
  const tables = raw.TableNames ?? [];
  const match = candidates
      .flatMap(pattern => tables.filter(t => t.includes(pattern)))
      // prefer long names with env hashes
      .sort((a,b) => b.length - a.length)[0];
  return match || null;
}

async function scanOneByEmail(table: string, email: string) {
  const d = docClient();
  // use a Scan with FilterExpression to handle unknown PK layout
  const res = await d.send(new ScanCommand({
    TableName: table,
    FilterExpression: '#e = :email',
    ExpressionAttributeNames: { '#e': 'email' },
    ExpressionAttributeValues: { ':email': email },
    Limit: 1,
  }));
  return (res.Items ?? [])[0] || null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    let email = (url.searchParams.get('email') || '').trim();
    const session = await fetchAuthSession();
    const loginId =
        (session as any)?.tokens?.idToken?.payload?.email ||
        (session as any)?.tokens?.idToken?.payload?.['cognito:username'] || '';
    if (!email && loginId) email = loginId;
    if (!email) return NextResponse.json({ ok:false, error:'No email provided/signed-in' }, { status: 400 });

    const normalized = email.toLowerCase();

    // 1) Try Amplify Data (if models are present)
    const tryAmplify = await lookupByEmailWithAmplify(normalized);
    let row: any = tryAmplify.row;
    let modelUsed = tryAmplify.modelUsed || null;

    // 2) Fallback to DynamoDB if Amplify Data had no models/row
    if (!row) {
      const userTblOverride = process.env.USER_ACCESS_TABLE_NAME || null;
      const roleTblOverride = process.env.ROLE_PERMISSION_TABLE_NAME || null;

      const userTable = await findTableName(['UserRole', 'UserAccess', 'User', 'Users'], userTblOverride);
      if (!userTable) {
        return NextResponse.json({
          ok:false,
          error:'No user-access table found in DynamoDB',
          amplifyModels: tryAmplify.amplifyModels || {},
        }, { status: 500 });
      }
      row = await scanOneByEmail(userTable, normalized);
      modelUsed = `dynamodb:${userTable}`;

      if (!row) {
        return NextResponse.json({
          ok:false,
          error:`No user row for ${normalized} in ${userTable}`,
          amplifyModels: tryAmplify.amplifyModels || {},
        }, { status: 404 });
      }

      // Normalize attribute casing if needed (Dynamo may have lowercase keys already)
      row = {
        email: row.email,
        name: row.name,
        roleTitle: row.roleTitle,
        enterprise: row.enterprise,
        segment: row.segment,
        platform: row.platform,
        division: row.division,
        plant: row.plant,
        hierarchyString: row.hierarchyString,
        level: row.level,
        isActive: row.isActive,
        cognitoGroups: row.cognitoGroups,
        accessScope: row.accessScope,
      };

      // Permissions table
      let perms: UserPermissions = { ...DEFAULT_PERMS };
      const permTable = await findTableName(['RolePermission','RolePermissions','Permission','Permissions'], roleTblOverride);
      if (permTable && row.roleTitle) {
        const d = docClient();
        const pr = await d.send(new ScanCommand({
          TableName: permTable,
          FilterExpression: '#r = :rt',
          ExpressionAttributeNames: { '#r': 'roleTitle' },
          ExpressionAttributeValues: { ':rt': row.roleTitle },
          Limit: 1,
        }));
        const p = (pr.Items ?? [])[0];
        if (p) {
          perms = {
            canReportInjury: !!p.canReportInjury,
            canReportObservation: !!p.canReportObservation,
            canSafetyRecognition: !!p.canSafetyRecognition,
            canTakeFirstReportActions: !!p.canTakeFirstReportActions,
            canViewPII: !!p.canViewPII,
            canTakeQuickFixActions: !!p.canTakeQuickFixActions,
            canTakeIncidentRCAActions: !!p.canTakeIncidentRCAActions,
            canPerformApprovalIncidentClosure: !!p.canPerformApprovalIncidentClosure,
            canViewManageOSHALogs: !!p.canViewManageOSHALogs,
            canViewOpenClosedReports: !!p.canViewOpenClosedReports,
            canViewSafetyAlerts: !!p.canViewSafetyAlerts,
            canViewLessonsLearned: !!p.canViewLessonsLearned,
            canViewDashboard: !!p.canViewDashboard,
            canSubmitDSATicket: !!p.canSubmitDSATicket,
            canApproveLessonsLearned: !!p.canApproveLessonsLearned,
          };
        }
      }

      const level = Number(row.level ?? 5);
      const out = {
        email: row.email,
        name: row.name ?? row.email?.split('@')[0],
        roleTitle: row.roleTitle ?? 'User',
        enterprise: row.enterprise ?? null,
        segment: row.segment ?? null,
        platform: row.platform ?? null,
        division: row.division ?? null,
        plant: row.plant ?? null,
        hierarchyString: row.hierarchyString ?? '',
        level,
        isActive: row.isActive ?? true,
        cognitoGroups: (row.cognitoGroups ?? []).filter((g:any) => typeof g === 'string'),
        accessScope: row.accessScope ?? roleToScope(level),
        permissions: perms,
      };

      return NextResponse.json({ ok:true, modelUsed, user: out });
    }

    // 3) If Amplify Data returned the row, normalize and respond
    const level = Number(row.level ?? 5);
    const base = {
      email: row.email,
      name: row.name ?? row.email?.split('@')[0],
      roleTitle: row.roleTitle ?? 'User',
      enterprise: row.enterprise ?? null,
      segment: row.segment ?? null,
      platform: row.platform ?? null,
      division: row.division ?? null,
      plant: row.plant ?? null,
      hierarchyString: row.hierarchyString ?? '',
      level,
      isActive: row.isActive ?? true,
      cognitoGroups: (row.cognitoGroups ?? []).filter((g:any) => typeof g === 'string'),
      accessScope: row.accessScope ?? roleToScope(level),
    };

    // Permissions via Amplify Data (IAM)
    let perms: UserPermissions = { ...DEFAULT_PERMS };
    const clientIam:any = generateClient<Schema>({ authMode: 'iam' });
    const permPick = pickModel(clientIam, ['RolePermission','RolePermissions','Permission','Permissions']);
    if (permPick.model && base.roleTitle) {
      const pr = await permPick.model.list({
        filter: { roleTitle: { eq: base.roleTitle } },
        selectionSet: [
          'roleTitle',
          'canReportInjury','canReportObservation','canSafetyRecognition',
          'canTakeFirstReportActions','canViewPII','canTakeQuickFixActions',
          'canTakeIncidentRCAActions','canPerformApprovalIncidentClosure',
          'canViewManageOSHALogs','canViewOpenClosedReports','canViewSafetyAlerts',
          'canViewLessonsLearned','canViewDashboard','canSubmitDSATicket','canApproveLessonsLearned',
        ],
        limit: 1,
      });
      const p:any = (pr?.data ?? [])[0];
      if (p) {
        perms = {
          canReportInjury: !!p.canReportInjury,
          canReportObservation: !!p.canReportObservation,
          canSafetyRecognition: !!p.canSafetyRecognition,
          canTakeFirstReportActions: !!p.canTakeFirstReportActions,
          canViewPII: !!p.canViewPII,
          canTakeQuickFixActions: !!p.canTakeQuickFixActions,
          canTakeIncidentRCAActions: !!p.canTakeIncidentRCAActions,
          canPerformApprovalIncidentClosure: !!p.canPerformApprovalIncidentClosure,
          canViewManageOSHALogs: !!p.canViewManageOSHALogs,
          canViewOpenClosedReports: !!p.canViewOpenClosedReports,
          canViewSafetyAlerts: !!p.canViewSafetyAlerts,
          canViewLessonsLearned: !!p.canViewLessonsLearned,
          canViewDashboard: !!p.canViewDashboard,
          canSubmitDSATicket: !!p.canSubmitDSATicket,
          canApproveLessonsLearned: !!p.canApproveLessonsLearned,
        };
      }
    }

    return NextResponse.json({
      ok: true,
      modelUsed,
      user: { ...base, permissions: perms },
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}
