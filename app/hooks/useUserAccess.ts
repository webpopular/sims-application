// app/hooks/useUserAccess.ts
'use client';
import { useEffect, useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getCachedUserAccess } from '@/lib/services/userAccessService';


export function useUserAccess() {
  const { authStatus, user } = useAuthenticator(ctx => [ctx.authStatus, ctx.user]);
  const [userAccess, setUserAccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const fetchUserAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // 🚦 hard gate — only run when signed in
      if (authStatus !== 'authenticated') {
        setLoading(false);
        return;
      }

      const email = user?.signInDetails?.loginId;
      if (!email) throw new Error('No user email found');

      // get ID token and send it to your API route
      const s = await fetchAuthSession({ forceRefresh: true });
      const idToken = s.tokens?.idToken?.toString();
      if (!idToken) throw new Error('No ID token');

      const apiResp = await fetch(
          `/api/user-access?email=${encodeURIComponent(email)}`,
          { cache: 'no-store', headers: { authorization: idToken } } // ⚠️ lower-case header name is fine
      );

      let access = null;
      if (apiResp.ok) {
        const j = await apiResp.json();
        access = j.ok ? j.user : null;
      }
      if (!access) {
        access = await getCachedUserAccess(email);
      }
      if (!access) throw new Error('No user access data found');

      setUserAccess({
        email:          access.email,
        name:           access.name,
        roleTitle:      access.roleTitle,
        enterprise:     access.enterprise,
        segment:        access.segment,
        platform:       access.platform,
        division:       access.division,
        plant:          access.plant,
        hierarchyString:access.hierarchyString,
        level:          access.level,
        cognitoGroups:  access.cognitoGroups ?? [],
        isActive:       access.isActive,
        permissions:    access.permissions,
        accessScope:    access.accessScope,
      });
    } catch (e: any) {
      console.error('[useUserAccess] error:', e);
      setError(e?.message || 'Unknown error');
      setUserAccess(null);
    } finally {
      setLoading(false);
    }
  };

  // ⛔ don’t run on first paint; only after auth is ready
  useEffect(() => {
    if (authStatus === 'authenticated') fetchUserAccess();
  }, [authStatus, user?.signInDetails?.loginId]);

  return {
    userAccess,
    loading,
    error,
    refetch: fetchUserAccess,
    hasPermission: (p: any) => !!userAccess?.permissions?.[p],
    isReady: authStatus === 'authenticated' && !loading && !error && !!userAccess,
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
