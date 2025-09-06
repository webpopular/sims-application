// lib/services/permissionService.ts
import type { UserAccess } from '@/app/hooks/useUserAccess';

export interface InjuryReport {
  hierarchyString?: string;
  createdBy?: string;
  status?: string;
  recordType?: string;
  // ... other fields
}

export class PermissionService {
  // ✅ Centralized hierarchy access check
  static checkHierarchyAccess(record: any, userAccess: UserAccess): boolean {
    if (!userAccess || !record) return false;

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

  // ✅ Centralized edit permission check
  static canEditRecord(record: any, userAccess: UserAccess): boolean {
    if (!userAccess) return false;
    
    // Check if user has edit permissions
    const hasEditPermission = userAccess.permissions?.canTakeFirstReportActions || false;
    
    // Check hierarchy access
    const isWithinHierarchy = this.checkHierarchyAccess(record, userAccess);
    
    // Additional business rules
    const canEditStatus = this.canEditBasedOnStatus(record, userAccess);
    
    return hasEditPermission && isWithinHierarchy && canEditStatus;
  }

  // ✅ Status-based edit permissions
  static canEditBasedOnStatus(record: any, userAccess: UserAccess): boolean {
    // Business rules: Can't edit completed or closed records
    if (record.status === 'Completed' || record.status === 'Close') {
      return false;
    }

    // Only certain roles can edit rejected records
    if (record.status === 'Rejected') {
      return userAccess.permissions?.canPerformApprovalIncidentClosure || false;
    }

    return true;
  }

  // ✅ View permission check
  static canViewRecord(record: any, userAccess: UserAccess): boolean {
    if (!userAccess) return false;
    
    // Check if user has view permissions
    const hasViewPermission = userAccess.permissions?.canViewOpenClosedReports || false;
    
    // Check hierarchy access
    const isWithinHierarchy = this.checkHierarchyAccess(record, userAccess);
    
    return hasViewPermission && isWithinHierarchy;
  }

  // ✅ Delete permission check
  static canDeleteRecord(record: any, userAccess: UserAccess): boolean {
    if (!userAccess) return false;
    
    // Only enterprise users can delete, and only draft records
    const canDelete = userAccess.accessScope === 'ENTERPRISE' && 
                     record.status === 'Draft';
    
    return canDelete && this.checkHierarchyAccess(record, userAccess);
  }

  // ✅ Approve permission check
  static canApproveRecord(record: any, userAccess: UserAccess): boolean {
    if (!userAccess) return false;
    
    const hasApprovalPermission = userAccess.permissions?.canPerformApprovalIncidentClosure || false;
    const isWithinHierarchy = this.checkHierarchyAccess(record, userAccess);
    const canApproveStatus = record.status === 'Pending Review';
    
    return hasApprovalPermission && isWithinHierarchy && canApproveStatus;
  }

  // ✅ Data-level security filtering
  static applyDataLevelSecurity(records: any[], userAccess: UserAccess): any[] {
    if (!userAccess) return [];

    return records.filter(record => this.checkHierarchyAccess(record, userAccess));
  }
}
