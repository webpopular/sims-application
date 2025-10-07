// lib/services/permissionService.ts
import type { UserAccess as UserAccessBase } from "@/app/types/auth";

/** What we actually need for checks (all optional so TS won't complain). */
type AccessScope = 'ENTERPRISE' | 'SEGMENT' | 'PLATFORM' | 'DIVISION' | 'PLANT';
type UAExtras = {
  accessScope?: AccessScope;
  level?: number;
  hierarchyString?: string;
  enterprise?: string;
  segment?: string;
  platform?: string;
  division?: string;
  divisionName?: string; // some codepaths use *Name
  plant?: string;
  plantName?: string;    // some codepaths use *Name
  permissions?: Record<string, boolean>;
};

/** Unify your app's UserAccess with the optional fields we rely on here. */
type UA = UserAccessBase & Partial<UAExtras>;

export interface InjuryReport {
  hierarchyString?: string;
  createdBy?: string;
  status?: string;
  recordType?: string;
  // ... other fields
}

/* ---------- helpers ---------- */

function levelToScope(level?: number): AccessScope {
  switch (level) {
    case 1: return 'ENTERPRISE';
    case 2: return 'SEGMENT';
    case 3: return 'PLATFORM';
    case 4: return 'DIVISION';
    default: return 'PLANT';
  }
}

function scopeFrom(u: UA): AccessScope {
  return u.accessScope ?? levelToScope(u.level);
}

/** Build a prefix path to compare against record.hierarchyString. */
function userPrefixForScope(u: UA, scope: AccessScope): string | null {
  // Prefer the exact hierarchy string when present.
  const hs = u.hierarchyString?.trim();
  if (hs) {
    // For PLANT we’ll compare equality; for higher scopes we’ll use beginsWith.
    return hs;
  }

  // Otherwise compose from parts we have
  // (format observed in your data: ITW>Segment>Platform>Division>Plant)
  const enterprise = (u.enterprise && u.enterprise.endsWith('>'))
      ? u.enterprise.slice(0, -1)
      : (u.enterprise ?? 'ITW');

  const segment  = u.segment;
  const platform = u.platform;
  const division = u.divisionName ?? u.division;
  const plant    = u.plantName ?? u.plant;

  // Build the narrowest path we KNOW for the given scope
  const parts: string[] = [enterprise];

  if (scope === 'SEGMENT'   && segment)                 parts.push(segment);
  if (scope === 'PLATFORM'  && segment && platform)     parts.push(segment, platform);
  if (scope === 'DIVISION'  && segment && platform && division)
    parts.push(segment, platform, division);
  if (scope === 'PLANT'     && segment && platform && division && plant)
    parts.push(segment, platform, division, plant);

  // If we couldn't build enough parts, return null (forces conservative checks)
  const built =
      (scope === 'SEGMENT'  && parts.length >= 2) ||
      (scope === 'PLATFORM' && parts.length >= 3) ||
      (scope === 'DIVISION' && parts.length >= 4) ||
      (scope === 'PLANT'    && parts.length >= 5);

  if (!built && scope !== 'ENTERPRISE') return null;

  return parts.join('>');
}

/* ---------- main service ---------- */

export class PermissionService {
  // Centralized hierarchy access check
  static checkHierarchyAccess(record: { hierarchyString?: string } | null | undefined, userAccess: UA): boolean {
    if (!userAccess || !record) return false;

    const scope = scopeFrom(userAccess);

    // Enterprise = everything
    if (scope === 'ENTERPRISE') return true;

    const recordHS = record.hierarchyString ?? '';
    if (!recordHS) return false; // no target to compare

    // Use user's hierarchy string if available; otherwise compose a prefix from fields we have
    const userPath = userPrefixForScope(userAccess, scope);

    switch (scope) {
      case 'SEGMENT':
      case 'PLATFORM':
      case 'DIVISION':
        // beginsWith on the user's path
        return !!userPath && recordHS.startsWith(userPath);
      case 'PLANT':
      default:
        // exact plant match
        return !!userPath && recordHS === userPath;
    }
  }

  // Centralized edit permission check
  static canEditRecord(record: any, userAccess: UA): boolean {
    if (!userAccess) return false;

    const hasEditPermission = !!userAccess.permissions?.canTakeFirstReportActions;
    const isWithinHierarchy = this.checkHierarchyAccess(record, userAccess);
    const canEditStatus     = this.canEditBasedOnStatus(record, userAccess);

    return hasEditPermission && isWithinHierarchy && canEditStatus;
  }

  // Status-based edit permissions
  static canEditBasedOnStatus(record: any, userAccess: UA): boolean {
    // Business rules: Can't edit completed or closed records
    const status = (record?.status ?? '').toString();
    if (status === 'Completed' || status === 'Close') return false;

    // Only certain roles can edit rejected records
    if (status === 'Rejected') {
      return !!userAccess.permissions?.canPerformApprovalIncidentClosure;
    }
    return true;
  }

  // View permission check
  static canViewRecord(record: any, userAccess: UA): boolean {
    if (!userAccess) return false;

    const hasViewPermission = !!userAccess.permissions?.canViewOpenClosedReports;
    const isWithinHierarchy = this.checkHierarchyAccess(record, userAccess);

    return hasViewPermission && isWithinHierarchy;
  }

  // Delete permission check
  static canDeleteRecord(record: any, userAccess: UA): boolean {
    if (!userAccess) return false;

    const scope = scopeFrom(userAccess);
    const canDelete = scope === 'ENTERPRISE' && record?.status === 'Draft';

    return canDelete && this.checkHierarchyAccess(record, userAccess);
  }

  // Approve permission check
  static canApproveRecord(record: any, userAccess: UA): boolean {
    if (!userAccess) return false;

    const hasApprovalPermission = !!userAccess.permissions?.canPerformApprovalIncidentClosure;
    const isWithinHierarchy = this.checkHierarchyAccess(record, userAccess);
    const canApproveStatus = (record?.status ?? '') === 'Pending Review';

    return hasApprovalPermission && isWithinHierarchy && canApproveStatus;
  }

  // Data-level security filtering
  static applyDataLevelSecurity(records: any[], userAccess: UA): any[] {
    if (!userAccess || !Array.isArray(records)) return [];
    return records.filter(r => this.checkHierarchyAccess(r, userAccess));
  }
}
