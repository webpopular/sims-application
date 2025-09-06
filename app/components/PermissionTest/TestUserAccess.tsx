// components/PermissionTest/TestUserAccess.tsx
'use client';

import { useUserAccess } from '@/app/hooks/useUserAccess';
export default function TestUserAccess() {
  const { userAccess, loading, error } = useUserAccess();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>User Access Test</h2>
      <pre>{JSON.stringify(userAccess, null, 2)}</pre>
    </div>
  );
}
