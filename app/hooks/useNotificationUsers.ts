// app/hooks/useNotificationUsers.ts - Hook for Easy Integration
'use client';

import { useState, useEffect } from 'react';
import { getAllNotificationUsers, type NotificationUsersResult } from '@/lib/services/notificationUsersService';

export function useNotificationUsers() {
  const [notificationUsers, setNotificationUsers] = useState<NotificationUsersResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getAllNotificationUsers();
      setNotificationUsers(result);
      
      if (!result.success) {
        setError('Failed to load notification users');
      }
    } catch (error) {
      console.error('❌ [useNotificationUsers] Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return {
    notificationUsers,
    users: notificationUsers?.users || [],
    loading,
    error,
    refetch
  };
}
