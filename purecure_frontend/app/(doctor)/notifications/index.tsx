import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { dashboardService } from '@services/dashboardService';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { formatDate } from '@utils/index';

const SkeletonBox = ({ width, height, style }: any) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[{ width, height, borderRadius: 12, backgroundColor: COLORS.border, opacity, marginBottom: 8 }, style]} />;
};

const getNotificationStyle = (type: string) => {
  switch (type) {
    case 'new_booking': return { bg: COLORS.primary, icon: 'calendar' };
    case 'cancellation': return { bg: '#F97316', icon: 'close-circle' };
    case 'review': return { bg: '#F59E0B', icon: 'star' };
    case 'reminder': return { bg: COLORS.info, icon: 'alarm' };
    default: return { bg: COLORS.textMuted, icon: 'notifications' };
  }
};

export default function DoctorNotifications() {
  const router = useRouter();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = async () => {
    try {
      const res = await dashboardService.notifications();
      const d = res.data ?? res;
      setNotifications(d.notifications ?? []);
      setUnreadCount(d.unread_count ?? 0);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load notifications' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifs();
  };

  const groupByType = () => {
    const list = [
      { type: 'new_booking', title: 'New Bookings', data: notifications.filter(n => n.type === 'new_booking') },
      { type: 'cancellation', title: 'Cancellations', data: notifications.filter(n => n.type === 'cancellation') },
      { type: 'review', title: 'Reviews', data: notifications.filter(n => n.type === 'review') },
      { type: 'reminder', title: 'Reminders', data: notifications.filter(n => n.type === 'reminder') },
    ];
    return list.filter(l => l.data.length > 0).map(l => ({ ...l, data: [{ type: 'header', title: l.title }, ...l.data] })).flatMap(l => l.data);
  };

  const renderItem = ({ item, index }: any) => {
    if (loading) return <SkeletonBox width="100%" height={80} />;

    if (item.type === 'header') {
      return <Text style={styles.sectionHeader}>{item.title}</Text>;
    }

    const { bg, icon } = getNotificationStyle(item.type);

    return (
      <View style={styles.card}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={20} color={COLORS.white} />
        </View>
        <View style={styles.centerCol}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.time}>{item.created_at ? formatDate(item.created_at) : ''}</Text>
        </View>
        {item.appointment_id && (
          <TouchableOpacity 
            style={styles.viewLink}
            onPress={() => router.push({ pathname: '/(doctor)/appointments/[id]', params: { id: item.appointment_id } })}
          >
            <Text style={styles.viewLinkText}>View →</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount} unread</Text>
          </View>
        )}
      </View>

      <FlatList
        data={loading ? [1, 2, 3, 4] : groupByType()}
        keyExtractor={(item, index) => loading ? index.toString() : item.id || `header-${index}`}
        renderItem={renderItem}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={() => {
          if (loading) return null;
          return (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={56} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtitle}>You're all caught up!</Text>
            </View>
          );
        }}
      />
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    ...SHADOW.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  centerCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  viewLink: {
    alignSelf: 'center',
    marginLeft: 12,
  },
  viewLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
