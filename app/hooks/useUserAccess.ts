// app/hooks/useUserAccess.ts - FIXED to remove non-existent accessibleHierarchies property
'use client';

import { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { getCachedUserAccess, type UserAccess as ServiceUserAccess } from '@/lib/services/userAccessService';

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

export function useUserAccess(): UseUserAccessResult {
  const { user } = useAuthenticator();
  const [userAccess, setUserAccess] = useState<UserAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserAccess = async () => {
    if (!user?.signInDetails?.loginId) {
      setLoading(false);
      setError('No user email found');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 [useUserAccess] Getting access for: ${user.signInDetails.loginId}`);

      // Try server route first (more permissive); fallback to client service
      const apiResp = await fetch(`/api/user-access?email=${encodeURIComponent(user.signInDetails.loginId)}`, { cache: 'no-store' });
      let serviceUserAccess = null;
      if (apiResp.ok) {
        const json = await apiResp.json();
        if (json.ok && json.user) serviceUserAccess = json.user;
        }
      if (!serviceUserAccess) {
        serviceUserAccess = await getCachedUserAccess(user.signInDetails.loginId);
      }

      if (!serviceUserAccess) {
        throw new Error('No user access data found');
      }

      // ✅ FIXED: Convert service response to hook format without accessibleHierarchies
      const hookUserAccess: UserAccess = {
        email: serviceUserAccess.email,
        name: serviceUserAccess.name,
        roleTitle: serviceUserAccess.roleTitle,
        enterprise: serviceUserAccess.enterprise,
        segment: serviceUserAccess.segment,
        platform: serviceUserAccess.platform,
        division: serviceUserAccess.division,
        plant: serviceUserAccess.plant,
        hierarchyString: serviceUserAccess.hierarchyString,
        level: serviceUserAccess.level,
        cognitoGroups: serviceUserAccess.cognitoGroups,
        isActive: serviceUserAccess.isActive,
        permissions: serviceUserAccess.permissions,
        accessScope: serviceUserAccess.accessScope
      };

      setUserAccess(hookUserAccess);
      console.log(`✅ [useUserAccess] Successfully loaded user access:`, {
        email: hookUserAccess.email,
        roleTitle: hookUserAccess.roleTitle,
        level: hookUserAccess.level,
        accessScope: hookUserAccess.accessScope,
        plant: hookUserAccess.plant,
        hierarchyString: hookUserAccess.hierarchyString
      });

    } catch (err) {
      console.error('❌ [useUserAccess] Error fetching user access:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUserAccess(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAccess();
  }, [user?.signInDetails?.loginId]);

  // ✅ Safe helper functions
  const hasPermission = (permission: keyof UserPermissions): boolean => {
    return userAccess?.permissions?.[permission] === true;
  };

  // ✅ canPerformAction method for PermissionGate compatibility
  const canPerformAction = (permission: string): boolean => {
    if (!userAccess) return false;
    return userAccess.permissions?.[permission as keyof UserPermissions] === true;
  };

  // ✅ FIXED: hasAccessToHierarchy method using hierarchyString instead of accessibleHierarchies
  const hasAccessToHierarchy = (hierarchy: string): boolean => {
    if (!userAccess) return false;
    
    switch (userAccess.accessScope) {
      case 'ENTERPRISE':
        return true; // Enterprise users have access to all hierarchies
      case 'SEGMENT':
        // Check if the hierarchy starts with the user's segment
        return hierarchy.startsWith(`ITW>${userAccess.segment}>`);
      case 'PLATFORM':
        // Check if the hierarchy starts with the user's platform path
        return hierarchy.startsWith(`ITW>${userAccess.segment}>${userAccess.platform}>`);
      case 'DIVISION':
        // Check if the hierarchy starts with the user's division path
        return hierarchy.startsWith(`ITW>${userAccess.segment}>${userAccess.platform}>${userAccess.division}>`);
      case 'PLANT':
        // Plant users can only access their exact hierarchy
        return hierarchy === userAccess.hierarchyString;
      default:
        return false;
    }
  };

  const isReady = !loading && !error && userAccess !== null;

  const getUserInfo = () => ({
    name: userAccess?.name || 'Unknown User',
    email: userAccess?.email || 'unknown@email.com',
    roleTitle: userAccess?.roleTitle || 'Unknown Role',
    level: userAccess?.level || 5,
    hierarchyString: userAccess?.hierarchyString || '',
    accessScope: userAccess?.accessScope || 'PLANT'
  });

  return {
    userAccess,
    loading,
    error,
    refetch: fetchUserAccess,
    hasPermission,
    isReady,
    getUserInfo,
    canPerformAction,
    hasAccessToHierarchy
  };
}
