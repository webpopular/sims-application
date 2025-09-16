// app/hooks/useUserAccess.ts
'use client';

import { useEffect, useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getCachedUserAccess } from '@/lib/services/userAccessService';
import {callAppSync} from "@/lib/utils/appSync";

type UserPermissions = {
  canReportInjury?: boolean;
  canReportObservation?: boolean;
  canSafetyRecognition?: boolean;
  canTakeFirstReportActions?: boolean;
  canViewPII?: boolean;
  canTakeQuickFixActions?: boolean;
  canTakeIncidentRCAActions?: boolean;
  canPerformApprovalIncidentClosure?: boolean;
  canViewManageOSHALogs?: boolean;
  canViewOpenClosedReports?: boolean;
  canViewSafetyAlerts?: boolean;
  canViewLessonsLearned?: boolean;
  canViewDashboard?: boolean;
  canSubmitDSATicket?: boolean;
  canApproveLessonsLearned?: boolean;
};

type AccessScope = 'ENTERPRISE' | 'SEGMENT' | 'PLATFORM' | 'DIVISION' | 'PLANT';

function computePermissionsClient(groups: string[] = []) {
  const has = (g: string) => groups.includes(g);
  return {
    canViewDashboard: true,
    canViewOpenClosedReports: true,
    canViewSafetyAlerts: true,
    canViewLessonsLearned: true,
    canViewManageOSHALogs: has('PLANT_SAFETY_MANAGER') || has('DIVISION_PLANT_HR'),
    canReportInjury: has('PLANT_SAFETY_MANAGER') || has('PLANT_SAFETY_CHAMPIONS') || has('DIVISION_PLANT_HR'),
    canReportObservation: true,
    canSafetyRecognition: true,
    canTakeFirstReportActions: has('PLANT_SAFETY_MANAGER') || has('DIVISION_PLANT_MANAGER') || has('DIVISION_SAFETY'),
    canTakeQuickFixActions: has('PLANT_SAFETY_MANAGER') || has('DIVISION_PLANT_HR') || has('PLANT_SAFETY_CHAMPIONS'),
    canTakeIncidentRCAActions: has('PLANT_SAFETY_MANAGER') || has('DIVISION_PLANT_HR') || has('DIVISION_OPS_DIRECTOR'),
    canPerformApprovalIncidentClosure: has('DIVISION_PLANT_MANAGER') || has('DIVISION_OPS_DIRECTOR'),
    canViewPII: has('DIVISION_HR_DIRECTOR') || has('PLATFORM_HR') || has('DIVISION_PLANT_HR'),
    canSubmitDSATicket: has('ENTERPRISE') || has('SEGMENT') || has('DIVISION_VP_GM_BUM'),
    canApproveLessonsLearned: has('DIVISION_OPS_DIRECTOR') || has('ENTERPRISE_SAFETY_DIRECTOR'),
  };
}

export function useUserAccess() {
  const { authStatus, user } = useAuthenticator(ctx => [ctx.authStatus, ctx.user]);
  const [userAccess, setUserAccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const deriveScope = (level?: number): AccessScope =>
      level === 1 ? 'ENTERPRISE' :
          level === 2 ? 'SEGMENT'    :
              level === 3 ? 'PLATFORM'   :
                  level === 4 ? 'DIVISION'   : 'PLANT';

  const fetchUserAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // only after sign in
      if (authStatus !== 'authenticated') { setLoading(false); return; }

      const email = user?.signInDetails?.loginId;
      if (!email) throw new Error('No user email found');

      const s = await fetchAuthSession({ forceRefresh: true });
      const idToken = s.tokens?.idToken?.toString();
      if (!idToken) throw new Error('No ID token');

      // ---- 1) Try API route (now hardened) ----
      const params = new URLSearchParams({ email });
      if (process.env.NODE_ENV === 'development') params.set('debug','1');

      const apiResp = await fetch(`/api/user-access?` + params.toString(), {
        cache: 'no-store',
        headers: { authorization: idToken }, // raw JWT (no Bearer)
      });

      let access: any = null;
      if (apiResp.ok) {
        const j = await apiResp.json();
        access = j.ok ? j.user : null;
      }

      // ---- 2) Fallback: cached client service ----
      if (!access) {
        access = await getCachedUserAccess(email);
      }

      // ---- 3) Fallback: direct AppSync scan + local match (case-insensitive) ----
      if (!access) {
        const scan = await callAppSync<{ listUserRoles: { items: any[] } }>(
            `query {
            listUserRoles(limit: 500) {
              items {
                email name roleTitle level hierarchyString
                enterprise segment platform division plant
                isActive cognitoGroups
              }
            }
          }`
        );
        const items = scan?.data?.listUserRoles?.items || [];
        const lower = (s:string) => (s||'').toLowerCase().trim();
        access = items.find(r => lower(r?.email) === lower(email)) || null;
      }

      if (!access) throw new Error('No user access data found');

      // normalize + safe defaults
      const level = access.level ?? 5;
      const scope = access.accessScope ?? deriveScope(level);

      const normalized = {
        email:           access.email,
        name:            access.name,
        roleTitle:       access.roleTitle,
        enterprise:      access.enterprise,
        segment:         access.segment,
        platform:        access.platform,
        division:        access.division,
        plant:           access.plant,
        hierarchyString: access.hierarchyString,
        level,
        accessScope:     scope as AccessScope,
        isActive:        access.isActive !== false,
        cognitoGroups:   Array.isArray(access.cognitoGroups) ? access.cognitoGroups : [],
        permissions: access.permissions ?? computePermissionsClient(access.cognitoGroups),
      };

      setUserAccess(normalized);
    } catch (e: any) {
      console.error('[useUserAccess] error:', e);
      setError(e?.message || 'Unknown error');
      setUserAccess(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated') fetchUserAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, user?.signInDetails?.loginId]);

  return {
    userAccess,
    loading,
    error,
    refetch: fetchUserAccess,
    hasPermission: (p: keyof UserPermissions) => !!userAccess?.permissions?.[p],
    isReady: authStatus === 'authenticated' && !loading && !error && !!userAccess,
    getUserInfo: () => ({
      name: userAccess?.name || 'Unknown User',
      email: userAccess?.email || '',
      roleTitle: userAccess?.roleTitle || 'Unknown Role',
      level: userAccess?.level || 5,
      hierarchyString: userAccess?.hierarchyString || '',
      accessScope: (userAccess?.accessScope as AccessScope) || 'PLANT',
    }),
    canPerformAction: (p: string) => !!userAccess?.permissions?.[p as keyof UserPermissions],
    hasAccessToHierarchy: (h: string) => {
      const ua = userAccess;
      if (!ua) return false;
      switch (ua.accessScope as AccessScope) {
        case 'ENTERPRISE': return true;
        case 'SEGMENT':   return h.startsWith(`ITW>${ua.segment}>`);
        case 'PLATFORM':  return h.startsWith(`ITW>${ua.segment}>${ua.platform}>`);
        case 'DIVISION':  return h.startsWith(`ITW>${ua.segment}>${ua.platform}>${ua.division}>`);
        case 'PLANT':     return h === ua.hierarchyString;
        default: return false;
      }
    },
  };
}
