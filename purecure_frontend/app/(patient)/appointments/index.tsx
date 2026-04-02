import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
  Animated, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import Toast from 'react-native-toast-message';
import { appointmentService } from '@services/appointmentService';
import {
  COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW
} from '@constants/index';
import {
  formatDate, formatTime, formatFee, formatRating, formatDoctorName, truncate,
  formatImageUrl,
} from '@utils/index';
import { Appointment } from '@/types';

// ─── Shared Components ──────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const STATUS_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    upcoming:             { bg: '#DBEAFE', text: '#1D4ED8', label: 'Upcoming' },
    in_progress:          { bg: '#FEF3C7', text: '#92400E', label: 'In Progress' },
    completed:            { bg: '#D1FAE5', text: '#065F46', label: 'Completed' },
    cancelled_by_patient: { bg: '#F3F4F6', text: '#6B7280', label: 'Cancelled' },
    cancelled_by_doctor:  { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled by Doctor' },
    no_show:              { bg: '#FEE2E2', text: '#991B1B', label: 'No Show' },
    rescheduled:          { bg: '#EDE9FE', text: '#5B21B6', label: 'Rescheduled' },
  };
  const style = STATUS_BADGE_STYLES[status] ?? STATUS_BADGE_STYLES.upcoming;
  return (
    <View style={{
      backgroundColor: style.bg,
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: BORDER_RADIUS.full,
    }}>
      <Text style={{ color: style.text, fontSize: FONT_SIZE.xs, fontWeight: '600' }}>
        {style.label}
      </Text>
    </View>
  );
};

const AppointmentCard = ({ 
  item, 
  onPress, 
  onCancel, 
  onReschedule,
  onReview 
}: { 
  item: Appointment; 
  onPress: () => void; 
  onCancel: () => void;
  onReschedule: () => void;
  onReview: () => void;
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardTop}>
        {formatImageUrl(item.doctor.profile_photo) ? (
          <Image 
            source={formatImageUrl(item.doctor.profile_photo)} 
            style={styles.avatar} 
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF0F4' }]}>
            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 20 }}>
              {item.doctor.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR'}
            </Text>
          </View>
        )}
        <View style={styles.doctorMeta}>
          <Text style={styles.doctorName}>{formatDoctorName(item.doctor.full_name)}</Text>
          <Text style={styles.doctorSpecialty}>{item.doctor.specialty_display}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{formatDate(item.appointment_date)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{formatTime(item.start_time)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="business-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>
            {truncate(item.clinic?.name || item.doctor.clinic_name, 25)}
          </Text>
        </View>
      </View>

      {item.reason ? (
        <Text style={styles.reasonText} numberOfLines={2}>
          {item.reason}
        </Text>
      ) : null}

      <View style={styles.actionRow}>
        {(item.status === 'upcoming' || item.status === 'rescheduled') && (
          <>
            <TouchableOpacity style={styles.rescheduleBtn} onPress={onReschedule}>
              <Text style={styles.rescheduleBtnText}>Reschedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === 'completed' && (
          <>
            <TouchableOpacity style={styles.detailsActionBtn} onPress={onPress}>
              <Text style={styles.detailsActionBtnText}>View Details</Text>
            </TouchableOpacity>
            {!item.has_review ? (
              <TouchableOpacity style={styles.reviewBtn} onPress={onReview}>
                <Text style={styles.reviewBtnText}>Leave Review</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.reviewBtnDisabled}>
                <Text style={styles.reviewBtnDisabledText}>View Review ✓</Text>
              </View>
            )}
          </>
        )}

        {(item.status === 'cancelled_by_patient' || item.status === 'cancelled_by_doctor' || item.status === 'no_show') && (
          <TouchableOpacity style={styles.fullWidthBtn} onPress={onPress}>
            <Text style={styles.fullWidthBtnText}>View Details</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ───────────────────────────────────────────────

type TabStatus = 'upcoming' | 'completed' | 'cancelled';

export default function AppointmentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabStatus>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const getStatusParam = (tab: TabStatus) => {
    return tab;
  };

  const fetchAppointments = async (tab: TabStatus, pageNum: number, refresh = false) => {
    if (pageNum === 1) setLoading(true);
    try {
      const res = await appointmentService.myList({
        status: getStatusParam(tab),
        ordering: tab === 'upcoming' ? 'appointment_date' : '-appointment_date',
        page: pageNum,
      });
      const results = res.data.results;
      if (refresh || pageNum === 1) {
        setAppointments(results);
      } else {
        setAppointments(prev => [...prev, ...results]);
      }
      setHasMore(!!res.data.next);
      setPage(pageNum);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load appointments' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setAppointments([]);
    setPage(1);
    setHasMore(true);
    fetchAppointments(activeTab, 1);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments(activeTab, 1, true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchAppointments(activeTab, page + 1);
    }
  };

  const handleCancelFromList = (appointment: Appointment) => {
    Alert.alert(
      'Cancel Appointment',
      `Cancel your appointment with ${formatDoctorName(appointment.doctor.full_name)} on ${formatDate(appointment.appointment_date)}?`,
      [
        { text: 'Keep Appointment', style: 'cancel' },
        {
          text: 'Cancel Appointment',
          style: 'destructive',
          onPress: async () => {
            try {
              await appointmentService.cancel(appointment.id, 'Cancelled by patient');
              Toast.show({ type: 'success', text1: 'Appointment Cancelled' });
              fetchAppointments(activeTab, 1, true);
            } catch (e: any) {
              Toast.show({
                type: 'error',
                text1: 'Cannot Cancel',
                text2: e.response?.data?.message || 'Failed to cancel appointment',
              });
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Appointments</Text>
      </View>

      <View style={styles.tabBar}>
        {(['upcoming', 'completed', 'cancelled'] as TabStatus[]).map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        <FlashList
          data={appointments}
          estimatedItemSize={200}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AppointmentCard 
              item={item} 
              onPress={() => router.push(`/(patient)/appointments/${item.id}`)}
              onCancel={() => handleCancelFromList(item)}
              onReschedule={() => router.push(`/(patient)/appointments/${item.id}/reschedule`)}
              onReview={() => router.push(`/(patient)/appointments/${item.id}/review`)}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListFooterComponent={() => (
            loading && page > 1 ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} /> : null
          )}
          ListEmptyComponent={() => (
            !loading ? (
              <View style={styles.emptyState}>
                <Ionicons 
                  name={activeTab === 'upcoming' ? 'calendar-outline' : activeTab === 'completed' ? 'checkmark-circle-outline' : 'close-circle-outline'} 
                  size={64} 
                  color="#E5E7EB" 
                />
                <Text style={styles.emptyTitle}>
                  {activeTab === 'upcoming' ? 'No upcoming appointments' : activeTab === 'completed' ? 'No completed appointments yet' : 'No cancelled appointments'}
                </Text>
                {activeTab === 'upcoming' && (
                  <>
                    <Text style={styles.emptySubtitle}>Book your first appointment</Text>
                    <TouchableOpacity 
                      style={styles.bookBtn}
                      onPress={() => router.push('/(patient)/search')}
                    >
                      <Text style={styles.bookBtnText}>Find a Doctor</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : <ActivityIndicator color={COLORS.primary} style={{ marginTop: 100 }} />
          )}
          contentContainerStyle={{ padding: SPACING.md }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabItemActive: {
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    width: '60%',
    height: 3,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    marginBottom: 12,
    ...SHADOW.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
  },
  doctorMeta: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  doctorSpecialty: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  reasonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rescheduleBtn: {
    flex: 1,
    height: 38,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rescheduleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cancelBtn: {
    flex: 1,
    height: 38,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  detailsActionBtn: {
    flex: 1,
    height: 38,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reviewBtn: {
    flex: 1,
    height: 38,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  reviewBtnDisabled: {
    flex: 1,
    height: 38,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewBtnDisabledText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  fullWidthBtn: {
    flex: 1,
    height: 38,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidthBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 24,
  },
  bookBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.lg,
  },
  bookBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
