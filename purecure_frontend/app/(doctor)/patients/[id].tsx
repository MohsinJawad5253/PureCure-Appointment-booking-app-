import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, Linking, FlatList
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { dashboardService } from '@services/dashboardService';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { formatDate, getInitials } from '@utils/index';

const SkeletonBox = ({ width, height, borderRadius = 8, style }: any) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: COLORS.border, opacity }, style]} />;
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    upcoming: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Upcoming' },
    completed: { bg: '#D1FAE5', text: '#065F46', label: 'Completed' },
    cancelled_by_patient: { bg: '#F3F4F6', text: '#6B7280', label: 'Cancelled' },
    cancelled_by_doctor: { bg: '#F3F4F6', text: '#6B7280', label: 'Cancelled' },
    no_show: { bg: '#FEE2E2', text: '#991B1B', label: 'No Show' },
    rescheduled: { bg: '#EDE9FE', text: '#5B21B6', label: 'Rescheduled' },
    in_progress: { bg: '#FEF3C7', text: '#92400E', label: 'In Progress' }
  };
  const s = styles[status] || { bg: '#F3F4F6', text: '#6B7280', label: status };
  
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
      <Text style={{ color: s.text, fontSize: 10, fontWeight: '700' }}>{s.label}</Text>
    </View>
  );
};

export default function DoctorPatientRecord() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.patientDetail(id as string)
      .then(res => {
        const d = res.data ?? res;
        setData(d);
      })
      .catch(() => Toast.show({ type: 'error', text1: 'Failed to load patient' }))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient Record</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
          <SkeletonBox width="100%" height={200} borderRadius={16} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            <SkeletonBox width={100} height={80} borderRadius={12} style={{ flex: 1 }} />
            <SkeletonBox width={100} height={80} borderRadius={12} style={{ flex: 1 }} />
            <SkeletonBox width={100} height={80} borderRadius={12} style={{ flex: 1 }} />
          </View>
          <SkeletonBox width="100%" height={100} borderRadius={16} style={{ marginBottom: 8 }} />
          <SkeletonBox width="100%" height={100} borderRadius={16} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { patient, stats, appointments = [] } = data;
  const age = patient?.date_of_birth ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / 31557600000) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Record</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        
        {/* PATIENT HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroAvatarContainer}>
            {patient.profile_photo ? (
              <Image source={{ uri: patient.profile_photo }} style={styles.heroAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.heroAvatar, styles.initialsContainer]}>
                <Text style={styles.initialsText}>{getInitials(patient.full_name)}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.heroName}>{patient.full_name}</Text>
          
          <View style={styles.heroSubRow}>
            {patient.gender && (
              <View style={styles.heroGenderBadge}>
                <Text style={styles.heroGenderText}>{patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}</Text>
              </View>
            )}
            {age !== null && <Text style={styles.heroAgeText}>{age} years old</Text>}
          </View>

          <View style={styles.heroContactRow}>
            {patient.email && (
              <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL(`mailto:${patient.email}`)}>
                <Ionicons name="mail-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.contactText} numberOfLines={1}>{patient.email}</Text>
              </TouchableOpacity>
            )}
            {patient.phone && (
              <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL(`tel:${patient.phone}`)}>
                <Ionicons name="call-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.contactText}>{patient.phone}</Text>
              </TouchableOpacity>
            )}
          </View>

          {patient.date_of_birth && (
            <View style={styles.dobRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.dobText}>{formatDate(patient.date_of_birth)}</Text>
            </View>
          )}
        </View>

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats?.total_visits || 0}</Text>
            <Text style={styles.statLabel}>Total Visits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValueMid}>{stats?.last_visit ? formatDate(stats.last_visit) : '—'}</Text>
            <Text style={styles.statLabel}>Last Visit</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.info }]}>{stats?.total_upcoming || 0}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
        </View>

        {/* APPOINTMENT HISTORY */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Appointment History</Text>
          {stats?.first_visit && (
            <Text style={styles.sectionSubtitle}>First visit: {formatDate(stats.first_visit)}</Text>
          )}

          {appointments.length > 0 ? (
            <View style={styles.historyList}>
              {appointments.map((appt: any) => {
                const dateObj = new Date(appt.appointment_date);
                const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                const day = dateObj.getDate();

                return (
                  <TouchableOpacity 
                    key={appt.id} 
                    style={styles.historyCard}
                    onPress={() => router.push({ pathname: '/(doctor)/appointments/[id]', params: { id: appt.id } })}
                  >
                    <View style={styles.historyDateBox}>
                      <Text style={styles.historyMonth}>{month}</Text>
                      <Text style={styles.historyDay}>{day}</Text>
                    </View>
                    <View style={styles.historyCenter}>
                      <Text style={styles.historyTime}>{appt.start_time.substring(0, 5)} - {appt.end_time.substring(0, 5)}</Text>
                      <Text style={styles.historyReason} numberOfLines={1}>{appt.reason || 'No reason specified'}</Text>
                    </View>
                    <StatusBadge status={appt.status} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyHistoryText}>No appointment history yet</Text>
          )}
        </View>

      </ScrollView>
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOW.md,
  },
  heroAvatarContainer: {
    marginBottom: 12,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  initialsContainer: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '700',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  heroGenderBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  heroGenderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  heroAgeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  heroContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 13,
    color: COLORS.info,
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dobText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    ...SHADOW.md,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  statValueMid: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  historySection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  historyList: {
    gap: 8,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    ...SHADOW.md,
  },
  historyDateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    width: 50,
    height: 50,
    marginRight: 12,
  },
  historyMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  historyDay: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyCenter: {
    flex: 1,
    marginRight: 8,
  },
  historyTime: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  historyReason: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyHistoryText: {
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});
