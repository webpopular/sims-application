// types/auth.ts
export type Permission = 'Y' | 'N';

export interface MenuPermissions {
  canReviewQRCodes: Permission;
  injuryDirectEntry: Permission;
  directObsEntry: Permission;
  canCompleteFirstReportInjury: Permission;
  canCompleteFirstReportObservation: Permission;
  canResolveInjuryReport: Permission;
  canResolveObservationReports: Permission;
  canCloseInjuryReport: Permission;
  canCloseObservationReport: Permission;
}

export interface UserAccess {
  plantName: string;
  divisionName: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  permissions: MenuPermissions;
  access: UserAccess[];
}