import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {

  // Request permission + get push token
  async registerForPushNotifications(): Promise<string | null> {
    // Push notifications only work on physical devices
    // They won't work in iOS Simulator but WILL work in Expo Go on real device
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check existing permission
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('appointments', {
        name: 'Appointment Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E8184A',
        sound: 'default',
      });
    }

    // Get the Expo push token
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        // Replace with your Expo Project ID from expo.dev
        projectId: 'bc84aeab-fe6d-43af-b3bf-0de10f012f17',
      });
      const token = tokenData.data;
      console.log('Push token:', token);
      return token;
    } catch (error) {
      console.log('Failed to get push token:', error);
      return null;
    }
  },

  // Save push token to backend
  async savePushTokenToBackend(token: string): Promise<void> {
    try {
      await api.post('/auth/push-token/', { push_token: token });
      console.log('Push token saved to backend');
    } catch (error) {
      console.log('Failed to save push token:', error);
    }
  },

  // Set up notification listeners
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void,
  ) {
    // Fires when notification received while app is open
    const receivedSub = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );

    // Fires when user taps on notification
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      onNotificationResponse
    );

    // Return cleanup function
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  },

  // Get badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  },

  // Clear badge
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  },

  // Dismiss all notifications
  async dismissAll(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  },
};
