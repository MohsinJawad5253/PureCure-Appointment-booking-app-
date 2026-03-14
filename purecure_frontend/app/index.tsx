import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@store/authStore';
import { COLORS } from '@constants/index';

export default function Index() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace('/(auth)');
      return;
    }

    if (user?.role === 'patient') {
      router.replace('/(patient)');
    } else if (user?.role === 'doctor') {
      router.replace('/(doctor)');
    }
  }, [isAuthenticated, isHydrated, user]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
