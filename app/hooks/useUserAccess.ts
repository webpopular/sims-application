// app/hooks/useUserAccess.ts - FIXED to remove non-existent accessibleHierarchies property
'use client';

import { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { getCachedUserAccess, type UserAccess as ServiceUserAccess } from '@/lib/services/userAccessService';
import {fetchAuthSession} from "aws-amplify/auth";
import {callAppSync, getIdTokenOrThrow} from "@/lib/utils/appSync";

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
  hierarchyString: string;
  level: number;
  cognitoGroups: string[];
  isActive: boolean;
  permissions: UserPermissions;
  accessScope: 'ENTERPRISE' | 'SEGMENT' | 'PLATFORM' | 'DIVISION' | 'PLANT';
}

interface UseUserAccessResult {
  userAccess: UserAccess | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // ✅ Safe helper functions
  hasPermission: (permission: keyof UserPermissions) => boolean;
  isReady: boolean;
  getUserInfo: () => {
    name: string;
    email: string;
    roleTitle: string;
    level: number;
    hierarchyString: string;
    accessScope: string;
  };
  // ✅ Methods that PermissionGate expects
  canPerformAction: (permission: string) => boolean;
  hasAccessToHierarchy: (hierarchy: string) => boolean;
}

export function useUserAccess() {
  const { user } = useAuthenticator();
  const [userAccess, setUserAccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserAccess = async () => {
    const email = user?.signInDetails?.loginId;
    if (!email) { setLoading(false); setError('No user email found'); return; }
    try {
      setLoading(true);
      setError(null);

      const { payload } = await getIdTokenOrThrow();
      console.log('[token_use]', payload.token_use); // "id"
      console.log('[iss]', payload.iss);
      console.log('[aud]', payload.aud);

      if (process.env.NODE_ENV === 'development') {
        // --- try PK first ---
        const getRes = await callAppSync(
            `query Get($email: ID!) {
       getUserRole(email: $email) {
         email name roleTitle level
         enterprise segment platform division plant
         hierarchyString cognitoGroups isActive
       }
     }`,
            { email }
        );

        let row = getRes?.data?.getUserRole ?? null;

        // --- optional fallback: scan with larger limit ---
        if (!row) {
          const listRes = await callAppSync(
              `query List($email: String!, $limit: Int) {
         listUserRoles(filter: { email: { eq: $email } }, limit: $limit) {
           items {
             email name roleTitle level
             enterprise segment platform division plant
             hierarchyString cognitoGroups isActive
           }
         }
       }`,
              { email, limit: 1000 }
          );
          row = listRes?.data?.listUserRoles?.items?.[0] ?? null;
        }

        if (!row) throw new Error('No user access data found');

        setUserAccess({
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
          cognitoGroups: row.cognitoGroups,
          isActive: row.isActive,
          permissions: row.permissions,
          accessScope: row.accessScope,
        });
      }
    } catch (e: any) {
      console.error('[useUserAccess] error:', e);
      setError(e?.message || 'Unknown error');
      setUserAccess(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUserAccess(); }, [user?.signInDetails?.loginId]);

  // ...return the same shape you already had
  return {
    userAccess, loading, error,
    refetch: fetchUserAccess,
    hasPermission: (p: any) => !!userAccess?.permissions?.[p],
    isReady: !loading && !error && !!userAccess,
    getUserInfo: () => ({
      name: userAccess?.name || 'Unknown User',
      email: userAccess?.email || '',
      roleTitle: userAccess?.roleTitle || 'Unknown Role',
      level: userAccess?.level || 5,
      hierarchyString: userAccess?.hierarchyString || '',
      accessScope: userAccess?.accessScope || 'PLANT',
    }),
    canPerformAction: (p: string) => !!userAccess?.permissions?.[p as any],
    hasAccessToHierarchy: (h: string) => {
      const ua = userAccess;
      if (!ua) return false;
      switch (ua.accessScope) {
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
