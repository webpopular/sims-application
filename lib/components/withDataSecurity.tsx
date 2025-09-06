// lib/components/withDataSecurity.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserAccess } from '@/app/hooks/useUserAccess';

interface SecurityConfig {
  requiredPermissions?: string[];
  requiredAccessScope?: string[];
  redirectTo?: string;
}

export function withDataSecurity<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  config: SecurityConfig = {}
) {
  return function SecurityWrappedComponent(props: T) {
    const { userAccess, isReady, loading } = useUserAccess();
    const router = useRouter();

    useEffect(() => {
      if (isReady && userAccess) {
        // Check required permissions
        if (config.requiredPermissions) {
          const hasPermission = config.requiredPermissions.some(permission =>
            userAccess.permissions?.[permission as keyof typeof userAccess.permissions]
          );
          
          if (!hasPermission) {
            router.push(config.redirectTo || '/unauthorized');
            return;
          }
        }

        // Check required access scope
        if (config.requiredAccessScope) {
          if (!config.requiredAccessScope.includes(userAccess.accessScope)) {
            router.push(config.redirectTo || '/unauthorized');
            return;
          }
        }
      }
    }, [isReady, userAccess, router]);

    if (loading || !isReady) {
      return <div>Loading permissions...</div>;
    }

    if (!userAccess) {
      return <div>Access denied</div>;
    }

    return <WrappedComponent {...props} userAccess={userAccess} />;
  };
}
