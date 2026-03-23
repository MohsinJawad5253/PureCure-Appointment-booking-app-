
import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@store/authStore';
import { notificationService } from '@services/notificationService';
import { toastConfig } from '@components/ui/ToastConfig';


export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, []);

  // Set up push notifications when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Register for push notifications
    const setupPush = async () => {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        await notificationService.savePushTokenToBackend(token);
      }
    };
    setupPush();

    // Set up listeners
    const cleanup = notificationService.setupNotificationListeners(
      // Notification received while app is open
      (notification) => {
        const { title, body } = notification.request.content;
        Toast.show({
          type: 'info',
          text1: title ?? 'PureCure',
          text2: body ?? '',
          visibilityTime: 4000,
        });
      },
      // User tapped on notification
      (response) => {
        const data = response.notification.request.content.data;
        // Navigate based on notification type
        if (data?.type === 'appointment_cancelled' && data?.appointment_id) {
          if (user.role === 'patient') {
            router.push(`/(patient)/appointments/${data.appointment_id}`);
          }
        } else if (data?.type === 'new_booking' && data?.appointment_id) {
          if (user.role === 'doctor') {
            router.push(`/(doctor)/appointments/${data.appointment_id}`);
          }
        }
      }
    );

    return cleanup;
  }, [isAuthenticated, user]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(patient)" />
          <Stack.Screen name="(doctor)" />
        </Stack>
        <Toast config={toastConfig} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
