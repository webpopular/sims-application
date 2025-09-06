// lib/utils/PermissionService.ts - FIXED to remove non-existent accessibleHierarchies property
'use client';

import type { UserAccess } from '@/app/hooks/useUserAccess';

export class PermissionService {
  private userAccess: UserAccess;

  constructor(userAccess: UserAccess) {
    this.userAccess = userAccess;
  }

  // ✅ Check if user has a specific permission
  hasPermission(permission: keyof UserAccess['permissions']): boolean {
    return this.userAccess.permissions[permission] === true;
  }

  // ✅ Check if user can perform a specific action
  canPerformAction(action: string): boolean {
    return this.hasPermission(action as keyof UserAccess['permissions']);
  }

  // ✅ FIXED: Check hierarchy access using existing properties instead of accessibleHierarchies
  hasAccessToHierarchy(hierarchy: string): boolean {
    if (!this.userAccess) return false;
    
    switch (this.userAccess.accessScope) {
      case 'ENTERPRISE':
        return true; // Enterprise users have access to all hierarchies
      case 'SEGMENT':
        // Check if the hierarchy starts with the user's segment
        return hierarchy.startsWith(`ITW>${this.userAccess.segment}>`);
      case 'PLATFORM':
        // Check if the hierarchy starts with the user's platform path
        return hierarchy.startsWith(`ITW>${this.userAccess.segment}>${this.userAccess.platform}>`);
      case 'DIVISION':
        // Check if the hierarchy starts with the user's division path
        return hierarchy.startsWith(`ITW>${this.userAccess.segment}>${this.userAccess.platform}>${this.userAccess.division}>`);
      case 'PLANT':
        // Plant users can only access their exact hierarchy
        return hierarchy === this.userAccess.hierarchyString;
      default:
        return false;
    }
  }

  // ✅ Check if user can access a specific plant
  canAccessPlant(plantName: string): boolean {
    switch (this.userAccess.accessScope) {
      case 'ENTERPRISE':
        return true; // Enterprise users can access all plants
      case 'SEGMENT':
      case 'PLATFORM':
      case 'DIVISION':
        // For upper levels, check if plant is within their hierarchy scope
        return this.hasAccessToHierarchy(`${this.userAccess.hierarchyString}${plantName}`);
      case 'PLANT':
        // Plant users can only access their specific plant(s)
        return this.userAccess.plant === plantName || 
               this.userAccess.hierarchyString.includes(plantName);
      default:
        return false;
    }
  }

  // ✅ Check if user can view PII data
  canViewPII(): boolean {
    return this.hasPermission('canViewPII');
  }

  // ✅ Check if user can take first report actions
  canTakeFirstReportActions(): boolean {
    return this.hasPermission('canTakeFirstReportActions');
  }

  // ✅ Check if user can perform incident closure approval
  canPerformApprovalIncidentClosure(): boolean {
    return this.hasPermission('canPerformApprovalIncidentClosure');
  }

  // ✅ Check if user can view OSHA logs
  canViewOSHALogs(): boolean {
    return this.hasPermission('canViewManageOSHALogs');
  }

  // ✅ Check if user can view safety alerts
  canViewSafetyAlerts(): boolean {
    return this.hasPermission('canViewSafetyAlerts');
  }

  // ✅ Check if user can view dashboard
  canViewDashboard(): boolean {
    return this.hasPermission('canViewDashboard');
  }

  // ✅ Check if user can report injuries
  canReportInjury(): boolean {
    return this.hasPermission('canReportInjury');
  }

  // ✅ Check if user can report observations
  canReportObservation(): boolean {
    return this.hasPermission('canReportObservation');
  }

  // ✅ Check if user can submit safety recognition
  canSafetyRecognition(): boolean {
    return this.hasPermission('canSafetyRecognition');
  }

  // ✅ Check if user can take quick fix actions
  canTakeQuickFixActions(): boolean {
    return this.hasPermission('canTakeQuickFixActions');
  }

  // ✅ Check if user can take incident RCA actions
  canTakeIncidentRCAActions(): boolean {
    return this.hasPermission('canTakeIncidentRCAActions');
  }

  // ✅ Check if user can view open and closed reports
  canViewOpenClosedReports(): boolean {
    return this.hasPermission('canViewOpenClosedReports');
  }

  // ✅ Check if user can view lessons learned
  canViewLessonsLearned(): boolean {
    return this.hasPermission('canViewLessonsLearned');
  }

  // ✅ Check if user can submit DSA tickets
  canSubmitDSATicket(): boolean {
    return this.hasPermission('canSubmitDSATicket');
  }

  // ✅ Get user's access level
  getAccessLevel(): number {
    return this.userAccess.level;
  }

  // ✅ Get user's access scope
  getAccessScope(): string {
    return this.userAccess.accessScope;
  }

  // ✅ Get user's role title
  getRoleTitle(): string {
    return this.userAccess.roleTitle;
  }

  // ✅ Get user's plant
  getUserPlant(): string {
    return this.userAccess.plant || '';
  }

  // ✅ Get user's division
  getUserDivision(): string {
    return this.userAccess.division || '';
  }

  // ✅ Get user's platform
  getUserPlatform(): string {
    return this.userAccess.platform || '';
  }

  // ✅ Get user's segment
  getUserSegment(): string {
    return this.userAccess.segment || '';
  }

  // ✅ Get user's hierarchy string
  getUserHierarchy(): string {
    return this.userAccess.hierarchyString;
  }

  // ✅ Check if user is active
  isUserActive(): boolean {
    return this.userAccess.isActive;
  }

  // ✅ Get user's Cognito groups
  getCognitoGroups(): string[] {
    return this.userAccess.cognitoGroups;
  }

  // ✅ Check if user belongs to a specific Cognito group
  belongsToCognitoGroup(groupName: string): boolean {
    return this.userAccess.cognitoGroups.includes(groupName);
  }

  // ✅ Get all user permissions
  getAllPermissions(): UserAccess['permissions'] {
    return this.userAccess.permissions;
  }

  // ✅ Get user info summary
  getUserSummary() {
    return {
      email: this.userAccess.email,
      name: this.userAccess.name,
      roleTitle: this.userAccess.roleTitle,
      level: this.userAccess.level,
      accessScope: this.userAccess.accessScope,
      plant: this.userAccess.plant,
      division: this.userAccess.division,
      platform: this.userAccess.platform,
      segment: this.userAccess.segment,
      hierarchyString: this.userAccess.hierarchyString,
      isActive: this.userAccess.isActive,
      cognitoGroups: this.userAccess.cognitoGroups
    };
  }

  // ✅ Check if user can access specific data based on hierarchy
  canAccessData(dataHierarchy: string): boolean {
    return this.hasAccessToHierarchy(dataHierarchy);
  }

  // ✅ Check if user can modify data based on hierarchy and permissions
  canModifyData(dataHierarchy: string, requiredPermission: keyof UserAccess['permissions']): boolean {
    return this.hasAccessToHierarchy(dataHierarchy) && this.hasPermission(requiredPermission);
  }

  // ✅ Check if user can approve actions based on level and permissions
  canApproveActions(): boolean {
    return this.hasPermission('canPerformApprovalIncidentClosure') && this.userAccess.level <= 4;
  }

  // ✅ Check if user can manage users in their scope
  canManageUsers(): boolean {
    return ['ENTERPRISE', 'SEGMENT', 'PLATFORM', 'DIVISION'].includes(this.userAccess.accessScope);
  }

  // ✅ Check if user can view reports from specific hierarchy
  canViewReportsFromHierarchy(reportHierarchy: string): boolean {
    return this.hasAccessToHierarchy(reportHierarchy) && this.hasPermission('canViewOpenClosedReports');
  }

  // ✅ Check if user can take actions on reports from specific hierarchy
  canTakeActionsOnReports(reportHierarchy: string): boolean {
    return this.hasAccessToHierarchy(reportHierarchy) && this.hasPermission('canTakeFirstReportActions');
  }

  // ✅ Get permission summary for display
  getPermissionSummary() {
    const permissions = this.userAccess.permissions;
    const activePermissions = Object.entries(permissions)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key);

    return {
      total: Object.keys(permissions).length,
      active: activePermissions.length,
      activePermissions,
      canReport: permissions.canReportInjury || permissions.canReportObservation,
      canTakeActions: permissions.canTakeFirstReportActions || permissions.canTakeQuickFixActions,
      canApprove: permissions.canPerformApprovalIncidentClosure,
      canViewPII: permissions.canViewPII,
      canManageOSHA: permissions.canViewManageOSHALogs
    };
  }

  // ✅ Check if user has any administrative permissions
  hasAdministrativePermissions(): boolean {
    return this.hasPermission('canPerformApprovalIncidentClosure') ||
           this.hasPermission('canViewManageOSHALogs') ||
           this.hasPermission('canSubmitDSATicket');
  }

  // ✅ Check if user has reporting permissions
  hasReportingPermissions(): boolean {
    return this.hasPermission('canReportInjury') ||
           this.hasPermission('canReportObservation') ||
           this.hasPermission('canSafetyRecognition');
  }

  // ✅ Check if user has action permissions
  hasActionPermissions(): boolean {
    return this.hasPermission('canTakeFirstReportActions') ||
           this.hasPermission('canTakeQuickFixActions') ||
           this.hasPermission('canTakeIncidentRCAActions');
  }

  // ✅ Check if user has viewing permissions
  hasViewingPermissions(): boolean {
    return this.hasPermission('canViewOpenClosedReports') ||
           this.hasPermission('canViewSafetyAlerts') ||
           this.hasPermission('canViewLessonsLearned') ||
           this.hasPermission('canViewDashboard');
  }
}

// ✅ Factory function to create PermissionService instance
export function createPermissionService(userAccess: UserAccess): PermissionService {
  return new PermissionService(userAccess);
}

// ✅ Helper function to check permissions without creating service instance
export function checkPermission(userAccess: UserAccess, permission: keyof UserAccess['permissions']): boolean {
  return userAccess.permissions[permission] === true;
}

// ✅ Helper function to check hierarchy access without creating service instance
export function checkHierarchyAccess(userAccess: UserAccess, hierarchy: string): boolean {
  const service = new PermissionService(userAccess);
  return service.hasAccessToHierarchy(hierarchy);
}

// ✅ Helper function to get user's accessible plants based on their scope
export function getAccessiblePlants(userAccess: UserAccess): string[] {
  // This would typically integrate with your plant data source
  // For now, return based on user's plant assignment
  if (userAccess.plant) {
    return [userAccess.plant];
  }
  return [];
}

// ✅ Helper function to check if user can access specific plant
export function canAccessPlant(userAccess: UserAccess, plantName: string): boolean {
  const service = new PermissionService(userAccess);
  return service.canAccessPlant(plantName);
}
