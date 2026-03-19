import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@store/authStore';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { getInitials } from '@utils/index';

export default function DoctorProfile() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

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
    
    
  <SafeAreaView style={styles.container}>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Doctor Info Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(user?.full_name ?? 'Doctor')}
          </Text>
        </View>
        <Text style={styles.name}>{user?.full_name ?? 'Doctor'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Medical Professional</Text>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{user?.email ?? '—'}</Text>
          </View>
          {user?.phone ? (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.infoText}>{user.phone}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: COLORS.infoLight }]}>
              <Ionicons name="person-outline" size={18} color={COLORS.info} />
            </View>
            <Text style={styles.menuLabel}>Edit Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.success} />
            </View>
            <Text style={styles.menuLabel}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(doctor)/notifications/index')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="notifications-outline" size={18} color={COLORS.warning} />
            </View>
            <Text style={styles.menuLabel}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(doctor)/schedule/index')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="calendar-outline" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.menuLabel}>Schedule Manager</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appName}>PureCure</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.badgeText}>HIPAA Compliant</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="lock-closed-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.badgeText}>256-bit SSL</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.8}
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
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOW.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.white,
  },
  name: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  roleBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.lg,
  },
  roleText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoContainer: {
    width: '100%',
    gap: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  infoText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    flex: 1,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    ...SHADOW.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  divider: {
    height: 0.5,
    backgroundColor: COLORS.border,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    gap: SPACING.xs,
  },
  appName: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.primary,
  },
  appVersion: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  badges: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  logoutText: {
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    color: COLORS.danger,
  },
  scrollContent: {
  paddingBottom: 40,
},
header: {
  paddingHorizontal: SPACING.xl,
  paddingTop: SPACING.md,
  paddingBottom: SPACING.lg,
  backgroundColor: COLORS.white,
  borderBottomWidth: 0.5,
  borderBottomColor: COLORS.border,
},
});