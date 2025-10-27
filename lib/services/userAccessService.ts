// lib/services/userAccessService.ts
import { generateClient } from 'aws-amplify/data';
import { fetchAuthSession } from 'aws-amplify/auth';
import type { Schema } from '@/amplify/data/schema';

export interface UserPermissions {
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
}

export interface UserAccess {
  email: string;
  name: string;
  roleTitle: string;
  enterprise?: string;
  segment?: string;
  platform?: string;
  division?: string;
  plant?: string;
  plantName?: string;
  divisionName?: string;

  hierarchyString: string;
  level: number;
  cognitoGroups: string[];
  isActive: boolean;
  permissions: UserPermissions;
  // @ts-ignore
  accessScope: AccessScope;
  allowedPlants: string[];
}

export type AccessScope = 'ENTERPRISE' | 'SEGMENT' | 'PLATFORM' | 'DIVISION' | 'PLANT';

export const levelToScope = (level: number): AccessScope =>
    level === 1 ? 'ENTERPRISE'
        : level === 2 ? 'SEGMENT'
            : level === 3 ? 'PLATFORM'
                : level === 4 ? 'DIVISION'
                    : 'PLANT';

const APPSYNC_ENDPOINT =
    process.env.NEXT_PUBLIC_APPSYNC_API_URL || process.env.APPSYNC_API_URL || '';

const CANDIDATE_GET_FIELDS = ['getUserRole', 'getUserAccess', 'getUser'];
const CANDIDATE_LIST_FIELDS = ['listUserRoles', 'listUserAccesses', 'listUsers', 'users'];


function normalizeUser(u: any): Omit<UserAccess, 'permissions' | 'accessScope'> & {
  accessScope: UserAccess['accessScope'];
  permissions: UserPermissions;
} {
  const level = u?.level ?? 5;
  const roleTitle = u?.roleTitle || 'Unknown Role';
  const roleLower = String(roleTitle).toLowerCase();

  // very light sensible defaults; you can keep your existing role map here
  const defaultPerms: UserPermissions = roleLower.includes('plant safety manager') ? {
    canReportInjury: true, canReportObservation: true, canSafetyRecognition: true,
    canTakeFirstReportActions: true, canViewPII: true, canTakeQuickFixActions: true,
    canTakeIncidentRCAActions: true, canPerformApprovalIncidentClosure: false,
    canViewManageOSHALogs: true, canViewOpenClosedReports: true, canViewSafetyAlerts: true,
    canViewLessonsLearned: true, canViewDashboard: true, canSubmitDSATicket: true,
    canApproveLessonsLearned: false,
  } : {
    // fallback generic viewer-ish defaults
    canReportInjury: true, canReportObservation: true, canSafetyRecognition: true,
    canTakeFirstReportActions: false, canViewPII: false, canTakeQuickFixActions: false,
    canTakeIncidentRCAActions: false, canPerformApprovalIncidentClosure: false,
    canViewManageOSHALogs: false, canViewOpenClosedReports: true, canViewSafetyAlerts: true,
    canViewLessonsLearned: true, canViewDashboard: false, canSubmitDSATicket: false,
    canApproveLessonsLearned: false,
  };

  const groups: string[] = (u?.cognitoGroups || []).filter(Boolean);

  return {
    email: u?.email,
    name: u?.name || (u?.email ? u.email.split('@')[0] : 'Unknown User'),
    roleTitle,
    enterprise: u?.enterprise || 'ITW',
    segment: u?.segment || '',
    platform: u?.platform || '',
    division: u?.division || '',
    plant: u?.plant || '',
    hierarchyString: u?.hierarchyString || '',
    level,
    cognitoGroups: groups,
    isActive: u?.isActive !== false,
    accessScope: levelToScope(level),
    permissions: defaultPerms,
    allowedPlants: Array.isArray(u?.allowedPlants) ? (u.allowedPlants as string[]) : ([] as string[]),
  };
}

async function rawGraphqlQuery(jwt: string, query: string, variables: any) {
  const res = await fetch(process.env.NEXT_PUBLIC_APPSYNC_API_URL!, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': jwt, // <- ID or ACCESS token (match your choice)
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}`);
  const { data, errors } = await res.json();
  if (errors) throw new Error(errors[0]?.message || 'GraphQL error');
  return data;
}

// ---------------- public API ----------------
export async function getUserAccess(email: string): Promise<UserAccess | null> {
  console.log('[UserAccessService] Looking up user via GraphQL fallback:', email);

  const { tokens } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString();
  if (!idToken) return null;

  const q = `
    query ListUserRoles($email: String!) {
      listUserRoles(filter: { email: { eq: $email } }) {
        items {
          email name roleTitle hierarchyString enterprise segment platform division plant level isActive cognitoGroups
        }
      }
    }`;

  const res = await fetch(process.env.NEXT_PUBLIC_APPSYNC_API_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: idToken },
    body: JSON.stringify({ query: q, variables: { email } }),
  });
  const { data, errors } = await res.json();
  if (errors || !data?.listUserRoles?.items?.length) {
    console.error('[UserAccessService] No user role found for', email);
    return null;
  }

  const user = data.listUserRoles.items[0];
  const norm = normalizeUser(user);
  console.log('[UserAccessService] ✅ Found via GraphQL listUserRoles');
  return norm;
}

// simple in-memory cache (same as you had)
const userAccessCache = new Map<string, { ts: number; val: UserAccess }>();
const TTL = 30 * 60 * 1000;

export async function getCachedUserAccess(email: string, idToken?: string) {
  const q = `
    query List($email: String!) {
      listUserRoles(filter: { email: { eq: $email } }, limit: 1) {
        items { email name roleTitle level enterprise segment platform division plant hierarchyString cognitoGroups isActive }
      }
    }`;
  if (!idToken && typeof window !== 'undefined') {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession({ forceRefresh: true });
    idToken = tokens?.idToken?.toString();
  }

  if (!idToken) {
    // Optionally try your /api/user-access route without token or just fail:
    throw new Error('No ID token available for user access lookup');
  }
  const r = await fetch(process.env.NEXT_PUBLIC_APPSYNC_API_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: idToken },
    body: JSON.stringify({ query: q, variables: { email } }),
  });
  const j = await r.json();
  return j?.data?.listUserRoles?.items?.[0] ?? null;
}
