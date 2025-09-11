// app/components/PermissionTest/PermissionTest.tsx - FIXED TypeScript issue
import { useUserAccess } from '@/app/hooks/useUserAccess';

export function PermissionTest() {
  const { userAccess, hasPermission, canPerformAction, loading, error, isReady } = useUserAccess();

  if (loading || !isReady) {
    return (
      <div className="p-6 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>🔄 Loading permissions...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold">❌ Error Loading Permissions</h3>
        <p className="text-red-600 mt-2">{error}</p>
      </div>
    );
  }

  if (!userAccess) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-yellow-800 font-semibold">⚠️ No User Access Data</h3>
        <p className="text-yellow-600 mt-2">Unable to load user access information.</p>
      </div>
    );
  }

  // ✅ FIXED: Type-safe helper function with proper typing
  const canAccess = (permission: keyof typeof userAccess.permissions) => {
    return hasPermission(permission);
  };
  
  const canViewPage = (page: string) => {
    switch (page) {
      case 'report-injury':
        return hasPermission('canReportInjury');
      case 'report-observation':
        return hasPermission('canReportObservation');
      case 'safety-recognition':
        return hasPermission('canSafetyRecognition');
      case 'dashboard':
        return hasPermission('canViewDashboard');
      case 'osha-logs':
        return hasPermission('canViewManageOSHALogs');
      case 'safety-alerts':
        return hasPermission('canViewSafetyAlerts');
      case 'lessons-learned':
        return hasPermission('canViewLessonsLearned');
      default:
        return false;
    }
  };

  const isAdmin = () => {
    return userAccess.level <= 2 || userAccess.roleTitle.toLowerCase().includes('director');
  };

  const isHR = () => {
    return userAccess.roleTitle.toLowerCase().includes('hr');
  };
  const groups: string[] = userAccess?.cognitoGroups ?? [];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">🔐 RBAC Permission Test</h2>
      
      {/* User Information Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 User Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{userAccess.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-medium">{userAccess.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Role Title</p>
            <p className="font-medium">{userAccess.roleTitle}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Hierarchy Level</p>
            <p className="font-medium">Level {userAccess.level}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Access Scope</p>
            <p className="font-medium">{userAccess.accessScope}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Plant</p>
            <p className="font-medium">{userAccess.plant}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-600">Hierarchy String</p>
            <p className="font-medium font-mono text-sm bg-gray-100 p-2 rounded">
              {userAccess.hierarchyString}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-600">Cognito Groups</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {groups.map((group: string) => (
                  <span key={group} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {group}
                  </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Special Roles */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏷️ Special Roles</h3>
        <div className="flex space-x-4">
          <div className={`px-3 py-2 rounded-lg ${isAdmin() ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
            Admin: {isAdmin() ? '✅ Yes' : '❌ No'}
          </div>
          <div className={`px-3 py-2 rounded-lg ${isHR() ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            HR: {isHR() ? '✅ Yes' : '❌ No'}
          </div>
        </div>
      </div>

      {/* Permissions Grid */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🛡️ Permissions Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { key: 'canReportInjury' as const, label: 'Report Injury' },
            { key: 'canReportObservation' as const, label: 'Report Observation' },
            { key: 'canSafetyRecognition' as const, label: 'Safety Recognition' },
            { key: 'canTakeFirstReportActions' as const, label: 'First Report Actions' },
            { key: 'canViewPII' as const, label: 'View PII' },
            { key: 'canTakeQuickFixActions' as const, label: 'Quick Fix Actions' },
            { key: 'canTakeIncidentRCAActions' as const, label: 'Incident RCA Actions' },
            { key: 'canPerformApprovalIncidentClosure' as const, label: 'Approval for Closure' },
            { key: 'canViewManageOSHALogs' as const, label: 'Manage OSHA Logs' },
            { key: 'canViewOpenClosedReports' as const, label: 'View Open/Closed Reports' },
            { key: 'canViewSafetyAlerts' as const, label: 'View Safety Alerts' },
            { key: 'canViewLessonsLearned' as const, label: 'View Lessons Learned' },
            { key: 'canViewDashboard' as const, label: 'View Dashboard' },
            { key: 'canSubmitDSATicket' as const, label: 'Submit DSA Ticket' }
          ].map((permission) => {
            const hasPermissionValue = canAccess(permission.key);
            return (
              <div
                key={permission.key}
                className={`p-3 rounded-lg border ${
                  hasPermissionValue 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{permission.label}</span>
                  <span className="text-lg">{hasPermissionValue ? '✅' : '❌'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Page Access Test */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📄 Page Access Test</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { page: 'report-injury', label: 'Report Injury Page' },
            { page: 'report-observation', label: 'Report Observation Page' },
            { page: 'safety-recognition', label: 'Safety Recognition Page' },
            { page: 'dashboard', label: 'Dashboard Page' },
            { page: 'osha-logs', label: 'OSHA Logs Page' },
            { page: 'safety-alerts', label: 'Safety Alerts Page' },
            { page: 'lessons-learned', label: 'Lessons Learned Page' }
          ].map((pageTest) => {
            const canView = canViewPage(pageTest.page);
            return (
              <div
                key={pageTest.page}
                className={`p-3 rounded-lg border ${
                  canView 
                    ? 'bg-blue-50 border-blue-200 text-blue-800' 
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{pageTest.label}</span>
                  <span className="text-lg">{canView ? '✅' : '❌'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Raw Data for Debugging */}
      <details className="bg-gray-50 rounded-lg border border-gray-200">
        <summary className="p-4 cursor-pointer font-medium text-gray-900">
          🔍 Debug Information (Click to expand)
        </summary>
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">User Access Data:</h4>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto">
                {JSON.stringify(userAccess, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Permissions Data:</h4>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto">
                {JSON.stringify(userAccess.permissions, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
