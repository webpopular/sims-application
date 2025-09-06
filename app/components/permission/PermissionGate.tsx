// components/permission/PermissionGate.tsx - WORKING VERSION
import React from 'react';
import { useUserAccess } from '@/app/hooks/useUserAccess';

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: string;
  level?: number;
  hierarchy?: string;
  fallback?: React.ReactNode;
  requireAll?: boolean;
  // ✅ Enhanced: Record-specific props
  record?: any;
  action?: 'view' | 'edit' | 'delete' | 'approve';
  checkRecordAccess?: boolean;
}

export function PermissionGate({ 
  children, 
  permission, 
  level, 
  hierarchy,
  fallback = null,
  requireAll = false,
  // ✅ Enhanced: Record-specific props
  record,
  action,
  checkRecordAccess = false
}: PermissionGateProps) {
  const { userAccess, loading, canPerformAction, hasAccessToHierarchy } = useUserAccess();
  
  console.log('🔒 PermissionGate: Checking access', { permission, level, hierarchy, loading, userAccess: !!userAccess });
  
  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-32 rounded"></div>;
  }
  
  if (!userAccess) {
    console.log('❌ PermissionGate: No user access, showing fallback');
    return <>{fallback}</>;
  }
  
  const conditions: boolean[] = [];
  
  // Check permission
  if (permission) {
    const hasPermission = canPerformAction(permission);
    conditions.push(hasPermission);
    console.log(`🔐 PermissionGate: Permission '${permission}':`, hasPermission);
  }
  
  // Check level
  if (level !== undefined) {
    const hasLevel = userAccess.level <= level;
    conditions.push(hasLevel);
    console.log(`📊 PermissionGate: Level check (${userAccess.level} <= ${level}):`, hasLevel);
  }
  
  // Check hierarchy access
  if (hierarchy) {
    const hasHierarchy = hasAccessToHierarchy(hierarchy);
    conditions.push(hasHierarchy);
    console.log(`🏢 PermissionGate: Hierarchy '${hierarchy}':`, hasHierarchy);
  }

  // ✅ Enhanced: Record-specific access checks
  if (checkRecordAccess && record && action) {
    const hasRecordAccess = checkInvestigationPermission(record, action, userAccess);
    conditions.push(hasRecordAccess);
  }
  
  // If no conditions specified, default to true
  if (conditions.length === 0) {
    return <>{children}</>;
  }
  
  // Check if conditions are met
  const hasAccess = requireAll 
    ? conditions.every(condition => condition)
    : conditions.some(condition => condition);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

function checkInvestigationPermission(record: any, action: string, userAccess: any): boolean {
  if (!record || !userAccess) return false;
  
  // Check hierarchy access first
  const hasHierarchyAccess = checkHierarchyAccess(record, userAccess);
  if (!hasHierarchyAccess) return false;
  
  switch (action) {
    case 'view':
      return userAccess.permissions?.canViewOpenClosedReports || false;
      
    case 'edit':
      // ✅ For investigation access, check multiple permissions
      const canInvestigate = userAccess.permissions?.canTakeIncidentRCAActions || false;
      const canTakeActions = userAccess.permissions?.canTakeFirstReportActions || false;
      const canApprove = userAccess.permissions?.canPerformApprovalIncidentClosure || false;
      
      // User needs at least one investigation-related permission
      return canInvestigate || canTakeActions || canApprove;
      
    case 'delete':
      return userAccess.accessScope === 'ENTERPRISE' && record.status === 'Draft';
      
    case 'approve':
      return userAccess.permissions?.canPerformApprovalIncidentClosure && 
             record.status === 'Pending Review';
      
    default:
      return false;
  }
}

// ✅ Enhanced: Record permission checking function
function checkRecordPermission(record: any, action: string, userAccess: any): boolean {
  if (!record || !userAccess) return false;
  
  // Check hierarchy access first
  const hasHierarchyAccess = checkHierarchyAccess(record, userAccess);
  if (!hasHierarchyAccess) return false;
  
  switch (action) {
    case 'view':
      return userAccess.permissions?.canViewOpenClosedReports || false;
      
    case 'edit':
      // Check edit permission
      const hasEditPermission = userAccess.permissions?.canTakeFirstReportActions || false;
      
      // Check if record status allows editing
      const canEditStatus = !['Completed', 'Close'].includes(record.status);
      
      return hasEditPermission && canEditStatus;
      
    case 'delete':
      // Only enterprise users can delete, and only draft records
      return userAccess.accessScope === 'ENTERPRISE' && record.status === 'Draft';
      
    case 'approve':
      return userAccess.permissions?.canPerformApprovalIncidentClosure && 
             record.status === 'Pending Review';
      
    default:
      return false;
  }
}

function checkHierarchyAccess(record: any, userAccess: any): boolean {
  switch (userAccess.accessScope) {
    case 'ENTERPRISE':
      return true;
    case 'SEGMENT':
    case 'PLATFORM':
    case 'DIVISION':
      return record.hierarchyString?.startsWith(userAccess.hierarchyString) || false;
    case 'PLANT':
      return record.hierarchyString === userAccess.hierarchyString;
    default:
      return false;
  }
}
