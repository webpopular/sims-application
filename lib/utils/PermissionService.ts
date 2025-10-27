// lib/utils/PermissionService.ts
// (no 'use client' so it works on server & client)

import type { UserAccess as UserAccessBase } from '@/app/types/auth';

type AccessScope = 'ENTERPRISE' | 'SEGMENT' | 'PLATFORM' | 'DIVISION' | 'PLANT';

// Declare the permission flags here so we don't rely on the shared type having them.
export type PermissionFlags = {
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

// Extend whatever your shared UserAccess has with optional fields we need here.
type UserAccess = UserAccessBase & {
  permissions?: Partial<PermissionFlags>;
  accessScope?: AccessScope;
  hierarchyString?: string;
  enterprise?: string;
  segment?: string;
  platform?: string;
  division?: string;
  divisionName?: string;
  plant?: string;
  plantName?: string;
  level?: number;
  email?: string;
  name?: string;
  roleTitle?: string;
  isActive?: boolean;
  cognitoGroups?: string[];
};

function levelToScope(level?: number): AccessScope {
  switch (level) {
    case 1: return 'ENTERPRISE';
    case 2: return 'SEGMENT';
    case 3: return 'PLATFORM';
    case 4: return 'DIVISION';
    default: return 'PLANT';
  }
}
function scopeFrom(u: UserAccess): AccessScope {
  return u.accessScope ?? levelToScope(u.level);
}

export class PermissionService {
  private user: UserAccess;

  constructor(userAccess: UserAccess) {
    this.user = userAccess;
  }

  private defaultPerms: PermissionFlags = {
    canReportInjury: true,
    canReportObservation: true,
    canSafetyRecognition: true,
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

  private perms(): PermissionFlags {
    return { ...this.defaultPerms, ...(this.user.permissions ?? {}) };
  }
  private userScope(): AccessScope { return scopeFrom(this.user); }

  // ----- Permission helpers -----
  hasPermission(p: keyof PermissionFlags): boolean { return this.perms()[p] === true; }
  canPerformAction(action: string): boolean {
    return this.hasPermission(action as keyof PermissionFlags);
  }

  // ----- Hierarchy checks -----
  hasAccessToHierarchy(hierarchy: string): boolean {
    const hs = (this.user.hierarchyString ?? '').trim();
    const scope = this.userScope();
    if (!hierarchy) return false;

    switch (scope) {
      case 'ENTERPRISE': return true;
      case 'SEGMENT':
      case 'PLATFORM':
      case 'DIVISION': return !!hs && hierarchy.startsWith(hs);
      case 'PLANT':
      default: return !!hs && hierarchy === hs;
    }
  }

  canAccessPlant(plantName: string): boolean {
    if (!plantName) return false;
    const scope = this.userScope();
    const hs = this.user.hierarchyString ?? '';
    switch (scope) {
      case 'ENTERPRISE': return true;
      case 'SEGMENT':
      case 'PLATFORM':
      case 'DIVISION': return !!hs && (plantName === this.user.plant || hs.includes(plantName));
      case 'PLANT':
      default: return (this.user.plant === plantName) || hs.includes(plantName);
    }
  }

  // ----- Convenience getters -----
  getAccessLevel() { return this.user.level ?? 5; }
  getAccessScope(): AccessScope { return this.userScope(); }
  getRoleTitle() { return this.user.roleTitle ?? 'Unknown Role'; }
  getUserPlant() { return this.user.plant ?? this.user.plantName ?? ''; }
  getUserDivision() { return this.user.division ?? this.user.divisionName ?? ''; }
  getUserPlatform() { return this.user.platform ?? ''; }
  getUserSegment() { return this.user.segment ?? ''; }
  getUserHierarchy() { return this.user.hierarchyString ?? ''; }
  isUserActive() { return this.user.isActive !== false; }
  getCognitoGroups() { return this.user.cognitoGroups ?? []; }
  belongsToCognitoGroup(groupName: string) { return this.getCognitoGroups().includes(groupName); }

  getAllPermissions(): PermissionFlags { return this.perms(); }

  getUserSummary() {
    return {
      email: this.user.email ?? '',
      name: this.user.name ?? '',
      roleTitle: this.getRoleTitle(),
      level: this.getAccessLevel(),
      accessScope: this.getAccessScope(),
      plant: this.getUserPlant(),
      division: this.getUserDivision(),
      platform: this.getUserPlatform(),
      segment: this.getUserSegment(),
      hierarchyString: this.getUserHierarchy(),
      isActive: this.isUserActive(),
      cognitoGroups: this.getCognitoGroups(),
    };
  }

  // ----- Composite checks -----
  canAccessData(h: string) { return this.hasAccessToHierarchy(h); }
  canModifyData(h: string, perm: keyof PermissionFlags) {
    return this.hasAccessToHierarchy(h) && this.hasPermission(perm);
  }
  canApproveActions() {
    return this.hasPermission('canPerformApprovalIncidentClosure') && (this.user.level ?? 5) <= 4;
  }
  canManageUsers() {
    const s = this.userScope();
    return s === 'ENTERPRISE' || s === 'SEGMENT' || s === 'PLATFORM' || s === 'DIVISION';
  }
  canViewReportsFromHierarchy(h: string) {
    return this.hasAccessToHierarchy(h) && this.hasPermission('canViewOpenClosedReports');
  }
  canTakeActionsOnReports(h: string) {
    return this.hasAccessToHierarchy(h) && this.hasPermission('canTakeFirstReportActions');
  }

  getPermissionSummary() {
    const p = this.perms();
    const entries = Object.entries(p) as [keyof PermissionFlags, boolean][];
    const active = entries.filter(([, v]) => v).map(([k]) => k as string);
    return {
      total: entries.length,
      active: active.length,
      activePermissions: active,
      canReport: !!(p.canReportInjury || p.canReportObservation),
      canTakeActions: !!(p.canTakeFirstReportActions || p.canTakeQuickFixActions),
      canApprove: !!p.canPerformApprovalIncidentClosure,
      canViewPII: !!p.canViewPII,
      canManageOSHA: !!p.canViewManageOSHALogs,
    };
  }
}

// Factory & helpers
export function createPermissionService(userAccess: UserAccess) {
  return new PermissionService(userAccess);
}
export function checkPermission(userAccess: UserAccess, permission: keyof PermissionFlags) {
  return new PermissionService(userAccess).hasPermission(permission);
}
export function checkHierarchyAccess(userAccess: UserAccess, hierarchy: string) {
  return new PermissionService(userAccess).hasAccessToHierarchy(hierarchy);
}
export function getAccessiblePlants(userAccess: UserAccess): string[] {
  const plant = userAccess.plant ?? userAccess.plantName;
  return plant ? [plant] : [];
}
export function canAccessPlant(userAccess: UserAccess, plantName: string) {
  return new PermissionService(userAccess).canAccessPlant(plantName);
}
