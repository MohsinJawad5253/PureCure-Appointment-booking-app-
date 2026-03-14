import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@store/authStore';

export function useAuthGuard() {
  const { isAuthenticated, user, isHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      router.replace('/(auth)');
    }
  }, [isAuthenticated, isHydrated]);

  return { isAuthenticated, user };
}
