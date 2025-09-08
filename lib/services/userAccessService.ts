// lib/services/userAccessService.ts
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/schema';

export type UserPermissions = {
  canReportInjury: boolean;
  canReportObservation: boolean;
  canSafetyRecognition: boolean;
  canTakeFirstReportActions: boolean;
  canViewPII: boolean;
  canTakeQuickFixActions: boolean;
  canTakeIncidentRCAActions: boolean;
  canPerformApprovalIncidentClosure: boolean;
  canViewManageOSHALogs: boolean;
  canViewOpenClosedReports: boolean;
  canViewSafetyAlerts: boolean;
  canViewLessonsLearned: boolean;
  canViewDashboard: boolean;
  canSubmitDSATicket: boolean;
  canApproveLessonsLearned: boolean;
};

export type UserAccess = {
  email: string;
  name?: string | null;
  roleTitle?: string | null;
  enterprise?: string | null;
  segment?: string | null;
  platform?: string | null;
  division?: string | null;
  plant?: string | null;
  hierarchyString?: string | null;
  level?: number | null;
  cognitoGroups?: string[];
  isActive?: boolean | null;
  permissions: UserPermissions;
  accessScope: 'ENTERPRISE' | 'SEGMENT' | 'PLATFORM' | 'DIVISION' | 'PLANT';
};

// ---- helpers ----
const DEFAULT_PERMISSIONS: UserPermissions = {
  canReportInjury: false,
  canReportObservation: false,
  canSafetyRecognition: false,
  canTakeFirstReportActions: false,
  canViewPII: false,
  canTakeQuickFixActions: false,
  canTakeIncidentRCAActions: false,
  canPerformApprovalIncidentClosure: false,
  canViewManageOSHALogs: false,
  canViewOpenClosedReports: false,
  canViewSafetyAlerts: false,
  canViewLessonsLearned: false,
  canViewDashboard: false,
  canSubmitDSATicket: false,
  canApproveLessonsLearned: false,
};

function fillDefaults(u: Partial<UserAccess>): UserAccess {
  return {
    email: u.email || '',
    name: u.name ?? null,
    roleTitle: u.roleTitle ?? 'User',
    enterprise: u.enterprise ?? null,
    segment: u.segment ?? null,
    platform: u.platform ?? null,
    division: u.division ?? null,
    plant: u.plant ?? null,
    hierarchyString: u.hierarchyString ?? '',
    level: u.level ?? 5,
    cognitoGroups: u.cognitoGroups ?? [],
    isActive: u.isActive ?? true,
    permissions: { ...DEFAULT_PERMISSIONS, ...(u.permissions || {}) },
    accessScope: (u.accessScope as any) ?? 'PLANT',
  };
}

function pickModel(clientAny: any, candidates: string[]) {
  const modelsObj = clientAny?.models ?? {};
  const names = Object.keys(modelsObj);
  const chosen =
      candidates.find(n => names.includes(n)) ??
      names.find(n => /user/i.test(n)) ?? // fallback: anything with "user"
      names[0];
  return { model: modelsObj[chosen], name: chosen, names };
}

function roleToScope(level?: number | null): UserAccess['accessScope'] {
  switch (level) {
    case 1: return 'ENTERPRISE';
    case 2: return 'SEGMENT';
    case 3: return 'PLATFORM';
    case 4: return 'DIVISION';
    case 5:
    default: return 'PLANT';
  }
}

// ---- main API ----

// in-memory cache
const CACHE_MS = 30 * 60 * 1000;
const cache = new Map<string, { value: UserAccess | null; exp: number }>();

export async function getCachedUserAccess(email: string): Promise<UserAccess | null> {
  const key = (email || '').trim().toLowerCase();
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.exp > now) return hit.value;

  const fresh = await getUserAccess(email);
  cache.set(key, { value: fresh, exp: now + CACHE_MS });
  return fresh;
}

export function clearUserAccessCache() {
  cache.clear();
}

export async function getUserAccess(email: string): Promise<UserAccess | null> {
  try {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) return null;

    // IMPORTANT: create the Data client at call time (Amplify must be configured already)
    const client = generateClient<Schema>({ authMode: 'userPool' }) as any;

    // 1) Resolve user-access model dynamically
    const userModelPick = pickModel(client, ['UserRole','UserAccess','User','Users']);
    if (!userModelPick.model) {
      console.error('[UserAccessService] No user-access model found. Available:', userModelPick.names);
      return null;
    }

    // 2) Query by email using filter (works even if email isn’t PK)
    const { data, errors } = await userModelPick.model.list({
      filter: { email: { eq: normalized } },
      selectionSet: [
        'email','name','roleTitle',
        'enterprise','segment','platform','division','plant',
        'hierarchyString','level','isActive',
        'cognitoGroups','accessScope',
      ],
      limit: 1,
    });

    if (errors?.length) {
      console.error('[UserAccessService] GraphQL errors:', errors);
      return null;
    }

    const row = (data ?? [])[0];
    if (!row) {
      console.warn(`[UserAccessService] No user-access row for email=${normalized}. Models present:`, userModelPick.names);
      return null;
    }

    // 3) Build base user access
    const base: Partial<UserAccess> = {
      email: row.email,
      name: row.name,
      roleTitle: row.roleTitle,
      enterprise: (row as any).enterprise,
      segment: (row as any).segment,
      platform: (row as any).platform,
      division: (row as any).division,
      plant: (row as any).plant,
      hierarchyString: (row as any).hierarchyString,
      level: (row as any).level ?? 5,
      isActive: (row as any).isActive ?? true,
      cognitoGroups: ((row as any).cognitoGroups || []).filter((g: any) => typeof g === 'string'),
      accessScope: (row as any).accessScope ?? roleToScope((row as any).level),
    };

    // 4) Permissions: resolve RolePermission model dynamically
    const permPick = pickModel(client, ['RolePermission','RolePermissions','Permission','Permissions']);
    let perms: UserPermissions = { ...DEFAULT_PERMISSIONS };

    if (permPick.model) {
      const { data: rp, errors: permErrors } = await permPick.model.list({
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
      if (!permErrors?.length && rp?.[0]) {
        const p = rp[0] as any;
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
      } else {
        // fall through to defaults
      }
    } else {
      console.warn('[UserAccessService] No RolePermission model found. Available:', permPick.names);
    }

    return fillDefaults({ ...base, permissions: perms });

  } catch (err) {
    console.error('❌ [UserAccessService] getUserAccess error:', err);
    return null;
  }
}
