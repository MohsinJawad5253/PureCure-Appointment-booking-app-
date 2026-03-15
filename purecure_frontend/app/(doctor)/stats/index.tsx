import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { dashboardService } from '@services/dashboardService';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { formatDate } from '@utils/index';

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

const SimpleBarChart = ({ data }: { data: Array<{month: string, count: number}> }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120, paddingTop: 16 }}>
      {data.map((item, i) => {
        const barHeight = (item.count / maxCount) * 100;
        const isLast = i === data.length - 1;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{item.count}</Text>
            <View style={{
              width: '100%',
              height: `${barHeight || 4}%`,
              backgroundColor: isLast ? COLORS.primary : COLORS.infoLight,
              borderRadius: 4,
              minHeight: 4,
            }} />
            <Text style={{ fontSize: 9, color: COLORS.textMuted, textAlign: 'center' }} numberOfLines={1}>
              {item.month.split(' ')[0]}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const RatingBar = ({ star, count, total }: { star: number; count: number; total: number }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <Text style={{ fontSize: 12, color: COLORS.textSecondary, width: 16 }}>{star}</Text>
      <Ionicons name="star" size={12} color="#F59E0B" />
      <View style={{ flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: 4 }} />
      </View>
      <Text style={{ fontSize: 12, color: COLORS.textMuted, width: 24 }}>{count}</Text>
    </View>
  );
};

export default function DoctorStats() {
  const router = useRouter();
  
  const [statsData, setStatsData] = useState<any>(null);
  const [earningsData, setEarningsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today'|'this_week'|'this_month'|'all_time'>('this_month');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [stats, earnings] = await Promise.all([
          dashboardService.stats(),
          dashboardService.earnings(),
        ]);
        const s = stats.data ?? stats;
        const e = earnings.data ?? earnings;
        setStatsData(s);
        setEarningsData(e);
      } catch {
        Toast.show({ type: 'error', text1: 'Failed to load stats' });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const getPeriodStats = () => {
    if (!statsData) return { total: 0, completed: 0 };
    return statsData[period] ?? statsData.today;
  };

  if (loading || !statsData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
            <SkeletonBox width="48%" height={100} borderRadius={16} />
            <SkeletonBox width="48%" height={100} borderRadius={16} />
          </View>
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
            <SkeletonBox width="48%" height={100} borderRadius={16} />
            <SkeletonBox width="48%" height={100} borderRadius={16} />
          </View>
          <SkeletonBox width="100%" height={200} borderRadius={16} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const currentStats = getPeriodStats();
  const earnings = earningsData ?? {};
  const ratings = statsData.ratings ?? { average: 0, total_reviews: 0, breakdown: { 5:0, 4:0, 3:0, 2:0, 1:0 } };
  const patients = statsData.patients ?? { total_unique: 0, new_this_month: 0 };
  const monthlyTrend = statsData.monthly_trend ?? [];
  const nextAppt = statsData.next_appointment;

  const todayDateObj = new Date();
  const dateFormatted = `${todayDateObj.toLocaleDateString('en-US', { weekday: 'long' })}, ${todayDateObj.toLocaleDateString('en-US', { month: 'short' })} ${todayDateObj.getDate()}`;

  const PERIODS = [
    { label: 'Today', value: 'today' },
    { label: 'Week', value: 'this_week' },
    { label: 'Month', value: 'this_month' },
    { label: 'All Time', value: 'all_time' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>{dateFormatted}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* PERIOD SELECTOR */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity 
              key={p.value} 
              style={[styles.periodPill, period === p.value && styles.periodPillActive]}
              onPress={() => setPeriod(p.value as any)}
            >
              <Text style={[styles.periodText, period === p.value && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KEY METRICS GRID */}
        <View style={styles.metricsGrid}>
          {/* Appointments */}
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{currentStats.total || 0}</Text>
            <Text style={styles.metricLabel}>Appointments</Text>
            <Text style={styles.metricSubtext}>↑ {currentStats.completed || 0} completed</Text>
          </View>
          
          {/* Earnings */}
          <View style={styles.metricCard}>
            <Text style={styles.metricValueCrimson}>₹{(earnings[period] || 0).toLocaleString()}</Text>
            <Text style={styles.metricLabel}>{PERIODS.find(p => p.value === period)?.label || 'Earnings'}</Text>
            <Text style={styles.metricSubtextGray}>₹{(earnings.today || 0).toLocaleString()} today</Text>
          </View>

          {/* Patients */}
          <View style={styles.metricCard}>
            <Text style={styles.metricValueInfo}>{patients.total_unique}</Text>
            <Text style={styles.metricLabel}>Total Patients</Text>
            <Text style={styles.metricSubtext}>+{patients.new_this_month} this month</Text>
          </View>

          {/* Rating */}
          <View style={styles.metricCard}>
            <Text style={styles.metricValueAmber}>★ {Number(ratings.average || 0).toFixed(1)}</Text>
            <Text style={styles.metricLabel}>Avg Rating</Text>
            <Text style={styles.metricSubtextGray}>{ratings.total_reviews} reviews</Text>
          </View>
        </View>

        {/* MONTHLY TREND CHART */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Appointments</Text>
          {monthlyTrend.length > 0 ? (
            <SimpleBarChart data={monthlyTrend} />
          ) : (
            <Text style={styles.emptyText}>Not enough data to show trends.</Text>
          )}
        </View>

        {/* EARNINGS BREAKDOWN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Earnings Summary</Text>
          
          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>Today</Text>
            <Text style={styles.earningValue}>₹{(earnings.today || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>This Week</Text>
            <Text style={styles.earningValue}>₹{(earnings.this_week || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>This Month</Text>
            <Text style={styles.earningValueCrimson}>₹{(earnings.this_month || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>Last Month</Text>
            <Text style={styles.earningValue}>₹{(earnings.last_month || 0).toLocaleString()}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.earningRow}>
            <Text style={styles.earningLabelBold}>All Time</Text>
            <Text style={styles.earningValueLarge}>₹{(earnings.all_time || 0).toLocaleString()}</Text>
          </View>

          <Text style={styles.feeNote}>Based on ₹{earnings.consultation_fee || 0} per consultation</Text>
        </View>

        {/* RATINGS BREAKDOWN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Patient Ratings</Text>
          <View style={styles.ratingHeader}>
            <Text style={styles.ratingAvgLarge}>{Number(ratings.average || 0).toFixed(1)}</Text>
            <View style={styles.ratingStarsRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <Ionicons 
                  key={i} 
                  name={i <= Math.round(ratings.average || 0) ? "star" : "star-outline"} 
                  size={16} 
                  color="#F59E0B" 
                />
              ))}
            </View>
            <Text style={styles.ratingReviewsText}>{ratings.total_reviews} total reviews</Text>
          </View>

          <View style={styles.barsContainer}>
            <RatingBar star={5} count={ratings.breakdown?.['5'] || 0} total={ratings.total_reviews} />
            <RatingBar star={4} count={ratings.breakdown?.['4'] || 0} total={ratings.total_reviews} />
            <RatingBar star={3} count={ratings.breakdown?.['3'] || 0} total={ratings.total_reviews} />
            <RatingBar star={2} count={ratings.breakdown?.['2'] || 0} total={ratings.total_reviews} />
            <RatingBar star={1} count={ratings.breakdown?.['1'] || 0} total={ratings.total_reviews} />
          </View>
        </View>

        {/* NEXT APPOINTMENT */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Appointment</Text>
          {nextAppt ? (
            <View style={styles.nextApptRow}>
              <View style={styles.nextApptInfo}>
                <Text style={styles.nextApptName}>{nextAppt.patient_name}</Text>
                <Text style={styles.nextApptDetails}>
                  {formatDate(nextAppt.date)} • {nextAppt.start_time.substring(0, 5)}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.viewBtn}
                onPress={() => router.push({ pathname: '/(doctor)/appointments/[id]', params: { id: nextAppt.id } })}
              >
                <Text style={styles.viewBtnText}>View</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyText}>No upcoming appointments scheduled</Text>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    gap: 8,
  },
  periodPill: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  periodTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: SPACING.lg,
  },
  metricCard: {
    backgroundColor: COLORS.white,
    width: '47%',
    borderRadius: 16,
    padding: 16,
    ...SHADOW.md,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  metricValueCrimson: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  metricValueInfo: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.info,
    marginBottom: 4,
  },
  metricValueAmber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: 8,
  },
  metricSubtext: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '500',
  },
  metricSubtextGray: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOW.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  earningLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  earningLabelBold: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  earningValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  earningValueCrimson: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '700',
  },
  earningValueLarge: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  feeNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  ratingHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingAvgLarge: {
    fontSize: 40,
    fontWeight: '800',
    color: '#F59E0B',
  },
  ratingStarsRow: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 4,
  },
  ratingReviewsText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  barsContainer: {
    paddingHorizontal: 8,
  },
  nextApptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  nextApptInfo: {
    flex: 1,
  },
  nextApptName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  nextApptDetails: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  viewBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
