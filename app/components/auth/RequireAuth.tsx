// app/components/auth/RequireAuth.tsx - FIXED to use correct hook
'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUserAccess } from '@/app/hooks/useUserAccess'; // ✅ FIXED: Use correct hook

interface RequireAuthProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredGroups?: string[];
  fallbackPath?: string;
  showUnauthorized?: boolean;
  adminOnly?: boolean;
}

export default function RequireAuth({ 
  children, 
  requiredPermission,
  requiredGroups = [],
  fallbackPath = '/login',
  showUnauthorized = false,
  adminOnly = false
}: RequireAuthProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { userAccess, hasPermission, loading: permissionLoading, error, isReady } = useUserAccess(); // ✅ FIXED: Use correct hook
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  // ✅ Check permissions once both auth and permissions are loaded
  useEffect(() => {
    if (authLoading || permissionLoading || !isReady) return;

    // First check authentication
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // If no specific permissions required, just check authentication
    if (!requiredPermission && !adminOnly && requiredGroups.length === 0) {
      setIsAuthorized(true);
      return;
    }

    let authorized = true;

    // Check admin requirement
    if (adminOnly) {
      authorized = userAccess?.cognitoGroups?.includes('admin') || false;
    }

    // Check specific permission
    if (authorized && requiredPermission) {
      authorized = hasPermission(requiredPermission as any);
    }

    // Check required groups (fallback)
    if (!authorized && requiredGroups.length > 0 && userAccess?.cognitoGroups) {
      authorized = requiredGroups.some(group => userAccess.cognitoGroups.includes(group));
    }

    setIsAuthorized(authorized);

    // Redirect if not authorized and not showing unauthorized page
    if (!authorized && !showUnauthorized) {
      console.warn(`Access denied. Required: ${requiredPermission || requiredGroups.join(', ')}`);
      router.push(fallbackPath);
    }
  }, [
    authLoading, 
    permissionLoading, 
    isReady,
    isAuthenticated, 
    hasPermission, 
    userAccess, 
    requiredPermission, 
    requiredGroups, 
    adminOnly,
    router, 
    fallbackPath, 
    showUnauthorized
  ]);

  // ✅ Loading state (authentication or permissions)
  if (authLoading || permissionLoading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading permissions...'}
          </p>
        </div>
      </div>
    );
  }

  // ✅ Not authenticated - will redirect to login
  if (!isAuthenticated) {
    return null;
  }

  // ✅ Permission error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Permission Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-rose-800 text-white rounded hover:bg-rose-900"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // ✅ Unauthorized state (if showing unauthorized page)
  if (isAuthorized === false && showUnauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <div className="text-sm text-gray-500 mb-4 p-3 bg-gray-100 rounded">
            <p><strong>Your Role:</strong> {userAccess?.roleTitle}</p>
            <p><strong>Your Level:</strong> {userAccess?.level}</p>
            <p><strong>Required:</strong> {requiredPermission || requiredGroups.join(', ')}</p>
          </div>
          <div className="space-x-2">
            <button 
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-rose-800 text-white rounded hover:bg-rose-900"
            >
              Go Home
            </button>
            <button 
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Authorized or still checking authorization
  if (isAuthorized === true) {
    return <>{children}</>;
  }

  // ✅ Default loading state while checking authorization
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-800"></div>
    </div>
  );
}

// ✅ Convenience wrapper components for common use cases
export function AdminOnlyPage({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth adminOnly={true} showUnauthorized={true}>
      {children}
    </RequireAuth>
  );
}

export function DashboardProtection({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth 
      requiredPermission="canViewDashboard" 
      requiredGroups={['admin', 'hr', 'ENTERPRISE', 'SEGMENT']}
      showUnauthorized={true}
    >
      {children}
    </RequireAuth>
  );
}

export function ReportingProtection({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth 
      requiredPermission="canReportInjury" 
      requiredGroups={['admin', 'hr']}
      showUnauthorized={true}
    >
      {children}
    </RequireAuth>
  );
}
