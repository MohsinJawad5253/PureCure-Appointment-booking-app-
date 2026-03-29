import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Animated, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { appointmentService } from '@services/appointmentService';
import {
  COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW
} from '@constants/index';
import { formatDate, formatTime, formatDoctorName } from '@utils/index';

// Notification type config
const NOTIF_CONFIG: Record<string, {
  icon: string;
  bg: string;
  iconColor: string;
  label: string;
}> = {
  upcoming: {
    icon: 'calendar-outline',
    bg: COLORS.infoLight,
    iconColor: COLORS.info,
    label: 'Upcoming',
  },
  completed: {
    icon: 'checkmark-circle-outline',
    bg: COLORS.successLight,
    iconColor: COLORS.success,
    label: 'Completed',
  },
  cancelled_by_doctor: {
    icon: 'close-circle-outline',
    bg: COLORS.dangerLight,
    iconColor: COLORS.danger,
    label: 'Cancelled',
  },
  cancelled_by_patient: {
    icon: 'close-circle-outline',
    bg: '#F3F4F6',
    iconColor: COLORS.textMuted,
    label: 'Cancelled',
  },
  rescheduled: {
    icon: 'repeat-outline',
    bg: '#EDE9FE',
    iconColor: '#7C3AED',
    label: 'Rescheduled',
  },
};

export default function PatientNotifications() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Build notification items from recent appointments
  const fetchNotifications = async (refresh = false) => {
    if (!refresh) setLoading(true);
    try {
      // Fetch recent appointments across all statuses
      const [upcoming, completed, cancelled] = await Promise.all([
        appointmentService.myList({
          status: 'upcoming',
          ordering: 'appointment_date',
          page: 1,
        }),
        appointmentService.myList({
          status: 'completed',
          ordering: '-appointment_date',
          page: 1,
        }),
        appointmentService.myList({
          status: 'cancelled_by_doctor',
          ordering: '-appointment_date',
          page: 1,
        }),
      ]);

      // Safely extract results from all possible response shapes
      const getResults = (res: any) =>
        res?.data?.data?.results ??
        res?.data?.results ??
        res?.results ??
        [];

      const allItems = [
        ...getResults(upcoming),
        ...getResults(completed),
        ...getResults(cancelled),
      ].sort((a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() -
        new Date(a.updated_at ?? a.created_at).getTime()
      );

      setAppointments(allItems);
    } catch {
      // Silent fail — notifications are not critical
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  // Build notification message from appointment
  const getNotificationMessage = (appt: any): string => {
    const doctorName = appt.doctor?.full_name ?? 'Your doctor';
    const date = formatDate(appt.appointment_date);
    const time = formatTime(appt.start_time);

    switch (appt.status) {
      case 'upcoming':
        return `Appointment with ${doctorName} on ${date} at ${time} is confirmed.`;
      case 'completed':
        return `Your appointment with ${doctorName} on ${date} has been completed.`;
      case 'cancelled_by_doctor':
        return `${doctorName} has cancelled your appointment on ${date} at ${time}.`;
      case 'cancelled_by_patient':
        return `You cancelled your appointment with ${doctorName} on ${date}.`;
      case 'rescheduled':
        return `Your appointment with ${doctorName} has been rescheduled.`;
      default:
        return `Appointment update from ${doctorName}.`;
    }
  };

  const getNotificationTitle = (appt: any): string => {
    switch (appt.status) {
      case 'upcoming': return 'Appointment Confirmed';
      case 'completed': return 'Appointment Completed';
      case 'cancelled_by_doctor': return 'Appointment Cancelled';
      case 'cancelled_by_patient': return 'Appointment Cancelled';
      case 'rescheduled': return 'Appointment Rescheduled';
      default: return 'Appointment Update';
    }
  };

  // Notification card component
  const NotificationCard = ({ item }: { item: any }) => {
    const config = NOTIF_CONFIG[item.status] ?? NOTIF_CONFIG.upcoming;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          router.push(
            `/(patient)/appointments/${item.id}`
          )
        }
      >
        {/* Icon circle */}
        <View style={[
          styles.iconCircle,
          { backgroundColor: config.bg }
        ]}>
          <Ionicons
            name={config.icon as any}
            size={22}
            color={config.iconColor}
          />
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>
            {getNotificationTitle(item)}
          </Text>
          <Text style={styles.cardMessage} numberOfLines={2}>
            {getNotificationMessage(item)}
          </Text>
          <Text style={styles.cardTime}>
            {formatDate(item.appointment_date)}
            {' · '}
            {item.doctor?.clinic_name ?? ''}
          </Text>
        </View>

        {/* Arrow */}
        <Ionicons
          name="chevron-forward"
          size={16}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>
    );
  };

  // Skeleton loading
  const SkeletonCard = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.7, duration: 800, useNativeDriver: true
          }),
          Animated.timing(opacity, {
            toValue: 0.3, duration: 800, useNativeDriver: true
          }),
        ])
      ).start();
    }, []);
    return (
      <Animated.View style={[styles.skeletonCard, { opacity }]} />
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.skeletonContainer}>
          {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationCard item={item} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="notifications-outline"
                size={64}
                color={COLORS.textMuted}
              />
              <Text style={styles.emptyTitle}>
                No notifications yet
              </Text>
              <Text style={styles.emptySub}>
                Your appointment updates will appear here
              </Text>
            </View>
          }
          ListHeaderComponent={
            appointments.length > 0 ? (
              <Text style={styles.listHeader}>
                Recent activity
              </Text>
            ) : null
          }
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  listHeader: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    ...SHADOW.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardMessage: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  cardTime: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  skeletonContainer: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  skeletonCard: {
    height: 80,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
  },
});
