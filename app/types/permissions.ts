// types/permissions.ts
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
    accessibleHierarchies: string[];
    accessScope: 'ENTERPRISE' | 'SEGMENT' | 'PLATFORM' | 'DIVISION' | 'PLANT';
  }
  