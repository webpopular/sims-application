// app/hooks/usePermissions.ts - FIXED with null checks
import { useMemo } from 'react';
import { useUserAccess } from './useUserAccess';
import { PermissionService } from '@/lib/services/permissionService';

export function usePermissions() {
  const { userAccess, isReady } = useUserAccess();

  const permissions = useMemo(() => ({
    // ✅ Fixed: Add null checks for userAccess
    canEdit: (record: any) => {
      if (!userAccess) return false;
      return PermissionService.canEditRecord(record, userAccess);
    },
    canView: (record: any) => {
      if (!userAccess) return false;
      return PermissionService.canViewRecord(record, userAccess);
    },
    canDelete: (record: any) => {
      if (!userAccess) return false;
      return PermissionService.canDeleteRecord(record, userAccess);
    },
    canApprove: (record: any) => {
      if (!userAccess) return false;
      return PermissionService.canApproveRecord(record, userAccess);
    },
    
    // ✅ Data filtering with null check
    filterByHierarchy: (records: any[]) => {
      if (!userAccess) return [];
      return PermissionService.applyDataLevelSecurity(records, userAccess);
    },
    
    // ✅ Direct access to user info
    userAccess,
    isReady,
    
    // ✅ Additional helper functions
    hasPermission: (permission: string) => {
      if (!userAccess) return false;
      return userAccess.permissions?.[permission as keyof typeof userAccess.permissions] || false;
    },
    
    checkHierarchyAccess: (record: any) => {
      if (!userAccess) return false;
      return PermissionService.checkHierarchyAccess(record, userAccess);
    }
  }), [userAccess, isReady]);

  return permissions;
}
