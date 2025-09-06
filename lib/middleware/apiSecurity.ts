// lib/middleware/apiSecurity.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerUserAccess } from '@/lib/services/serverPermissionService';

export async function validateApiAccess(
  request: NextRequest,
  requiredPermissions: string[] = [],
  requiredScopes: string[] = []
) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 401 });
    }

    const userAccess = await getServerUserAccess(email);
    
    if (!userAccess) {
      return NextResponse.json({ error: 'User access not found' }, { status: 403 });
    }

    // Check permissions
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.some(permission =>
        userAccess.permissions?.[permission as keyof typeof userAccess.permissions]
      );
      
      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Check access scope
    if (requiredScopes.length > 0 && !requiredScopes.includes(userAccess.accessScope)) {
      return NextResponse.json({ error: 'Insufficient access scope' }, { status: 403 });
    }

    return null; // Access granted
  } catch (error) {
    return NextResponse.json({ error: 'Access validation failed' }, { status: 500 });
  }
}

// Usage in API routes
// app/api/get-filtered-incidents/route.ts
export async function GET(request: NextRequest) {
  // Validate access first
  const accessError = await validateApiAccess(request, ['canViewOpenClosedReports']);
  if (accessError) return accessError;

  // Continue with existing logic...
}
