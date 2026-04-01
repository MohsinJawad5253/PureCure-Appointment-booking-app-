import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, ActivityIndicator, Animated, RefreshControl
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@store/authStore';
import { dashboardService } from '@services/dashboardService';
import {
  COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW
} from '@constants/index';
import { getInitials } from '@utils/index';
import { AppointmentDoctor } from '@app-types/index';
import BulkCancelModal from '@/components/BulkCancelModal';

const SkeletonCard = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      height: 100, backgroundColor: '#E5E7EB',
      borderRadius: 16, marginBottom: 12, opacity
    }} />
  );
};

export default function DoctorDailyAgenda() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [agendaData, setAgendaData] = useState<any>(null);
  const [weekData, setWeekData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'emergency'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [showBulkCancel, setShowBulkCancel] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const fetchData = async (date: string) => {
    setLoading(true);
    try {
      const [agenda, week, notifRes] = await Promise.all([
        dashboardService.dailyAgenda(date),
        dashboardService.weekAgenda(),
        dashboardService.notifications().catch(() => ({ data: { unread_count: 0 } })),
      ]);
      setAgendaData(agenda);
      setWeekData(week.week ?? week);
      setIsAvailable(agenda.profile?.is_available ?? isAvailable);
      
      const notifs = notifRes?.data ?? notifRes;
      setNotifCount(notifs?.unread_count ?? 0);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load schedule' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (weekData.length > 0 && scrollViewRef.current) {
      const todayIndex = weekData.findIndex(d => d.date === todayStr);
      if (todayIndex > -1) {
        scrollViewRef.current.scrollTo({ x: Math.max(0, todayIndex * 60 - 40), animated: true });
      }
    }
  }, [weekData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(selectedDate);
    setRefreshing(false);
  };

  const getTabAppointments = (): AppointmentDoctor[] => {
    if (!agendaData?.appointments) return [];

    const isEmergency = (appt: AppointmentDoctor) => {
      const r = (appt.reason || '').toLowerCase();
      return ['emergency', 'urgent', 'severe', 'chest pain', 'breathing', 'unconscious']
        .some(k => r.includes(k)) || appt.status === 'in_progress';
    };

    switch (activeTab) {
      case 'upcoming':
        return [
          ...(agendaData.appointments.in_progress || []),
          ...(agendaData.appointments.upcoming || []),
          ...(agendaData.appointments.rescheduled || []),
        ];
      case 'completed':
        return [
          ...(agendaData.appointments.completed || []),
          ...(agendaData.appointments.no_show || []),
        ];
      case 'emergency':
        return [
          ...(agendaData.appointments.upcoming || []),
          ...(agendaData.appointments.in_progress || []),
        ].filter(isEmergency);
      default:
        return [];
    }
  };

  const emergencyCount = agendaData ? [
    ...(agendaData.appointments?.upcoming || []),
    ...(agendaData.appointments?.in_progress || []),
  ].filter(appt => {
    const r = (appt.reason || '').toLowerCase();
    return ['emergency', 'urgent', 'severe', 'chest pain', 'breathing', 'unconscious']
      .some(k => r.includes(k)) || appt.status === 'in_progress';
  }).length : 0;

  const handleToggleAvailability = async () => {
    const newVal = !isAvailable;
    setIsAvailable(newVal); 
    try {
      await dashboardService.toggleAvailability(newVal);
      Toast.show({
        type: 'success',
        text1: newVal ? 'You are now Online' : 'You are now Offline',
      });
    } catch {
      setIsAvailable(!newVal); 
    }
  };

  const summary = agendaData?.summary || { total: 0, upcoming: 0, completed: 0, cancelled: 0 };
  const appointmentsToDisplay = getTabAppointments();

  const renderWeekPill = ({ item }: { item: any }) => {
    const isSelected = item.date === selectedDate;
    const isToday = item.date === todayStr;
    const hasAppointments = item.total > 0;

    return (
      <TouchableOpacity
        style={[
          styles.weekPill,
          isSelected && styles.weekPillSelected,
          !isSelected && isToday && styles.weekPillToday
        ]}
        onPress={() => setSelectedDate(item.date)}
      >
        <Text style={[styles.weekPillDayText, isSelected && styles.textWhite]}>
          {item.weekday.substring(0, 3).toUpperCase()}
        </Text>
        <Text style={[styles.weekPillNumText, isSelected && styles.textWhite]}>
          {item.day_number}
        </Text>
        {hasAppointments && (
          <View style={[styles.weekPillDot, isSelected && { backgroundColor: COLORS.white }]} />
        )}
      </TouchableOpacity>
    );
  };

  const renderAppointmentCard = ({ item }: { item: AppointmentDoctor }) => {
    const r = (item.reason || '').toLowerCase();
    const isEmergencyReq = ['emergency', 'urgent', 'severe', 'chest pain', 'breathing', 'unconscious']
      .some(k => r.includes(k)) || item.status === 'in_progress';

    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'upcoming': return { bg: '#DBEAFE', text: '#1D4ED8', label: 'Upcoming' };
        case 'in_progress': return { bg: '#FEF3C7', text: '#92400E', label: 'In Pgrs' };
        case 'completed': return { bg: '#D1FAE5', text: '#065F46', label: 'Completed' };
        case 'cancelled_by_patient':
        case 'cancelled_by_doctor': return { bg: '#F3F4F6', text: '#6B7280', label: 'Cancelled' };
        case 'no_show': return { bg: '#FEE2E2', text: '#991B1B', label: 'No Show' };
        case 'rescheduled': return { bg: '#EDE9FE', text: '#5B21B6', label: 'Rescheduled' };
        default: return { bg: '#F3F4F6', text: '#6B7280', label: status };
      }
    };

    const statusStyle = getStatusStyle(item.status);

    return (
      <View style={[
        styles.appointmentCard,
        isEmergencyReq && { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
        item.status === 'in_progress' && !isEmergencyReq && { borderLeftWidth: 4, borderLeftColor: COLORS.warning }
      ]}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTimeCol}>
            <Text style={styles.cardStartTime}>{item.start_time.substring(0, 5)}</Text>
            <Text style={styles.cardEndTime}>{item.end_time.substring(0, 5)}</Text>
            <View style={styles.cardTimeLine} />
          </View>
          <View style={styles.cardPatientCol}>
            <Text style={styles.cardPatientName}>{item.patient.full_name}</Text>
            {item.reason ? (
              <Text style={styles.cardReasonText} numberOfLines={1}>{item.reason}</Text>
            ) : (
              <Text style={styles.cardReasonTextMuted}>No reason specified</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBottomRow}>
          {item.patient.profile_photo ? (
            <Image source={{ uri: item.patient.profile_photo }} style={styles.patientAvatar} contentFit="cover" />
          ) : (
            <View style={styles.patientAvatarInitials}>
              <Text style={styles.patientAvatarText}>{getInitials(item.patient.full_name)}</Text>
            </View>
          )}
          <View style={styles.patientMetaCol}>
            {item.patient.date_of_birth ? (
              <Text style={styles.patientMetaText}>
                {Math.floor((new Date().getTime() - new Date(item.patient.date_of_birth).getTime()) / 31557600000)} years • {item.patient.gender || 'N/A'}
              </Text>
            ) : (
              <Text style={styles.patientMetaText}>{item.patient.phone}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.viewRecordsBtn}
            onPress={() => router.push({ pathname: '/(doctor)/appointments/[id]', params: { id: item.id } })}
          >
            <Text style={styles.viewRecordsBtnText}>View Records</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const todayDateObj = new Date();
  const dateFormatted = `${todayDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}, ${todayDateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${todayDateObj.getDate()}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Today's Schedule</Text>
          <Text style={styles.headerSubtitle}>{dateFormatted}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => router.push('/(doctor)/notifications')}
            style={{ position: 'relative' }}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.textPrimary} />
            {notifCount > 0 && (
              <View style={styles.badgePillSmall}>
                <Text style={styles.badgeTextSmall}>
                  {notifCount > 9 ? '9+' : notifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.availabilityPill, isAvailable ? styles.bgOnline : styles.bgOffline]}
            onPress={handleToggleAvailability}
          >
            <Text style={[styles.availabilityText, isAvailable ? styles.textOnline : styles.textOffline]}>
              {isAvailable ? '● Online' : '○ Offline'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QUICK ACTIONS */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={styles.bulkCancelTrigger}
          onPress={() => setShowBulkCancel(true)}
        >
          <Ionicons name="calendar-outline" size={16} color={COLORS.danger} />
          <Text style={styles.bulkCancelTriggerText}>Cancel Range</Text>
        </TouchableOpacity>
      </View>

      {/* WEEK STRIP */}
      <View style={styles.weekStripContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          ref={scrollViewRef}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
        >
          {weekData.map(day => <React.Fragment key={day.date}>{renderWeekPill({ item: day })}</React.Fragment>)}
        </ScrollView>
      </View>

      {/* SUMMARY STATS */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.textPrimary }]}>{summary.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.info }]}>{summary.upcoming}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{summary.completed}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.danger }]}>{summary.cancelled}</Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </View>
      </View>

      {/* TAB SELECTOR */}
      <View style={styles.tabSelector}>
        <TouchableOpacity 
          style={styles.tabBtn} 
          onPress={() => setActiveTab('upcoming')}
        >
          <View style={styles.tabBtnContent}>
            <Text style={[styles.tabBtnText, activeTab === 'upcoming' ? styles.tabBtnTextActive : null]}>Upcoming</Text>
            {summary.upcoming > 0 && (
              <View style={styles.badgePill}><Text style={styles.badgeText}>{summary.upcoming}</Text></View>
            )}
          </View>
          {activeTab === 'upcoming' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabBtn} 
          onPress={() => setActiveTab('completed')}
        >
          <View style={styles.tabBtnContent}>
            <Text style={[styles.tabBtnText, activeTab === 'completed' ? styles.tabBtnTextActive : null]}>Completed</Text>
          </View>
          {activeTab === 'completed' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabBtn} 
          onPress={() => setActiveTab('emergency')}
        >
          <View style={styles.tabBtnContent}>
            <Text style={[styles.tabBtnText, activeTab === 'emergency' ? styles.tabBtnTextActive : null]}>Emergency</Text>
            {emergencyCount > 0 && (
              <View style={styles.badgePill}><Text style={styles.badgeText}>{emergencyCount}</Text></View>
            )}
          </View>
          {activeTab === 'emergency' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* APPOINTMENT LIST */}
      <FlatList
        data={loading ? ([1, 2, 3] as any[]) : appointmentsToDisplay}
        keyExtractor={(item, index) => loading ? index.toString() : (item as AppointmentDoctor).id}
        renderItem={({ item }) => loading ? <SkeletonCard /> : renderAppointmentCard({ item: item as AppointmentDoctor })}
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 100, paddingTop: SPACING.md }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No {activeTab} appointments</Text>
            <Text style={styles.emptySubtitle}>You have no appointments in this category for the selected date.</Text>
          </View>
        )}
      />

      {/* BULK CANCEL MODAL */}
      <BulkCancelModal
        visible={showBulkCancel}
        selectedDate={selectedDate}
        onClose={() => setShowBulkCancel(false)}
        onSuccess={() => {
          setShowBulkCancel(false);
          fetchData(selectedDate);
          Toast.show({
            type: 'success',
            text1: 'Bulk Cancellation Successful',
            text2: 'Affected appointments have been cancelled.',
          });
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  availabilityPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  bgOnline: { backgroundColor: '#D1FAE5' },
  bgOffline: { backgroundColor: '#F3F4F6' },
  textOnline: { color: '#065F46' },
  textOffline: { color: '#6B7280' },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bulkCancelTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  bulkCancelTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.danger,
  },
  quickActionDivider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.lg,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  quickActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  weekStripContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  weekPill: {
    width: 52,
    height: 72,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekPillSelected: {
    backgroundColor: COLORS.primary,
  },
  weekPillToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  weekPillDayText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  weekPillNumText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  textWhite: {
    color: COLORS.white,
  },
  weekPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    ...SHADOW.md,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  tabSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabBtnTextActive: {
    color: COLORS.primary,
  },
  badgePill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    width: '100%',
    height: 2,
    backgroundColor: COLORS.primary,
  },
  appointmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardTimeCol: {
    width: 56,
    alignItems: 'center',
  },
  cardStartTime: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardEndTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  cardTimeLine: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },
  cardPatientCol: {
    flex: 1,
    paddingHorizontal: 12,
  },
  cardPatientName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  cardReasonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cardReasonTextMuted: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardDivider: {
    height: 0.5,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  patientAvatarInitials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientAvatarText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  patientMetaCol: {
    flex: 1,
    paddingHorizontal: 10,
  },
  patientMetaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  viewRecordsBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewRecordsBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
    textAlign: 'center',
    marginTop: 4,
  },
  badgePillSmall: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeTextSmall: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
});
