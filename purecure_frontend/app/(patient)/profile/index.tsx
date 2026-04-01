import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@store/authStore';
import { appointmentService } from '@services/appointmentService';
import {
  COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW
} from '@constants/index';
import { getInitials, formatDate } from '@utils/index';

// ─── Internal Components ────────────────────────────────────────

const InfoRow = ({ icon, text, isLast = false }: { icon: any; text: string; isLast?: boolean }) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
    <Text style={styles.infoText}>{text || 'Not set'}</Text>
  </View>
);

const MenuRow = ({ icon, label, color, onPress, isLast = false }: any) => (
  <TouchableOpacity
    style={[styles.menuRow, isLast && { borderBottomWidth: 0 }]}
    onPress={onPress}
  >
    <View style={[styles.menuIconBox, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.menuLabelText}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
  </TouchableOpacity>
);

const StatCard = ({ count, label }: { count: number; label: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statCount}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────

export default function PatientProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
  const fetchCounts = async () => {
    try {
      const [upcoming, completed] = await Promise.all([
        appointmentService.myList({ status: 'upcoming', page: 1 }),
        appointmentService.myList({ status: 'completed', page: 1 }),
      ]);

      // Cast to any to safely extract count
      // regardless of response shape
      const upcomingAny = upcoming as any;
      const completedAny = completed as any;

      setUpcomingCount(
        upcomingAny?.data?.data?.count ??
        upcomingAny?.data?.count ??
        upcomingAny?.count ??
        0
      );
      setCompletedCount(
        completedAny?.data?.data?.count ??
        completedAny?.data?.count ??
        completedAny?.count ??
        0
      );
    } catch {
      // Silently fail — counts are not critical
    }
  };
  fetchCounts();
}, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
              router.replace('/(auth)');
            } catch {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            {user?.profile_photo ? (
              <Image source={{ uri: user.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={styles.initialsAvatar}>
                <Text style={styles.initialsText}>{getInitials(user?.full_name || 'U')}</Text>
              </View>
            )}
          </View>

          <Text style={styles.userName}>{user?.full_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Patient</Text>
          </View>

          <View style={styles.infoContainer}>
            <InfoRow icon="mail-outline" text={user?.email || ''} />
            <InfoRow icon="call-outline" text={user?.phone || ''} />
            <InfoRow icon="calendar-outline" text={user?.date_of_birth ? formatDate(user.date_of_birth) : ''} />
            <InfoRow
              icon={user?.gender === 'female' ? 'female-outline' : 'male-outline'}
              text={user?.gender ? (user.gender.charAt(0).toUpperCase() + user.gender.slice(1)) : ''}
              isLast
            />
          </View>
        </View>

        {/* MENU CARD */}
        <View style={styles.menuCard}>
          <MenuRow
            icon="person-outline"
            label="Edit Profile"
            color="#3B82F6"
            onPress={() => router.push('/shared/edit-profile')}
          />
          <MenuRow
            icon="lock-closed-outline"
            label="Change Password"
            color="#10B981"
            onPress={() => router.push('/shared/change-password')}
          />
          <MenuRow
            icon="calendar-outline"
            label="My Appointments"
            color="#8B5CF6"
            onPress={() => router.push('/(patient)/appointments')}
          />
          <MenuRow
            icon="star-outline"
            label="My Reviews"
            color="#F59E0B"
            isLast
            onPress={() => router.push({ pathname: '/(patient)/appointments', params: { tab: 'completed' } })}
          />
        </View>

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          <StatCard count={upcomingCount} label="Upcoming" />
          <StatCard count={completedCount} label="Completed" />
          <StatCard count={user?.reviews_count || 0} label="Reviews" />
        </View>

        {/* APP INFO */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>PureCure</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={12} color={COLORS.textSecondary} />
              <Text style={styles.badgeText}>HIPAA Compliant</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="lock-closed" size={12} color={COLORS.textSecondary} />
              <Text style={styles.badgeText}>SSL Secure</Text>
            </View>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={COLORS.danger} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    ...SHADOW.md,
    marginBottom: SPACING.lg,
  },
  avatarWrapper: {
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  initialsAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '700',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: 20,
  },
  roleText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    width: '100%',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOW.md,
    marginBottom: SPACING.lg,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabelText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: 12,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  statCount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  appVersion: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: BORDER_RADIUS.lg,
    height: 50,
    marginBottom: 20,
  },
  logoutText: {
    color: COLORS.danger,
    fontWeight: '700',
    fontSize: 15,
  },
});
