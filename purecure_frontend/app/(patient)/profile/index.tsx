import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@store/authStore';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';

// ─── Internal Components ────────────────────────────────────────

const ProfileMenuItem = ({ icon, label, sublabel, onPress, isDestructive = false }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={[styles.menuIconContainer, isDestructive && { backgroundColor: '#FEE2E2' }]}>
      <Ionicons name={icon} size={22} color={isDestructive ? '#DC2626' : COLORS.primary} />
    </View>
    <View style={styles.menuTextContent}>
      <Text style={[styles.menuLabel, isDestructive && { color: '#DC2626' }]}>{label}</Text>
      {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
  </TouchableOpacity>
);

// ─── Main Screen ───────────────────────────────────────────────

export default function PatientProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            await logout();
            router.replace('/(auth)');
          } 
        },
      ]
    );
  };

  const initials = user?.first_name?.[0] || 'U';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER / HERO */}
        <View style={styles.profileHero}>
          <View style={styles.avatarContainer}>
            {user?.profile_photo ? (
              <Image source={{ uri: user.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.full_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          <TouchableOpacity style={styles.editProfileBtn}>
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ACCOUNT SETTINGS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.menuCard}>
            <ProfileMenuItem 
              icon="person-outline" 
              label="Personal Information" 
              sublabel="Name, Email, Phone"
              onPress={() => {}} 
            />
            <ProfileMenuItem 
              icon="notifications-outline" 
              label="Notifications" 
              sublabel="Appointment reminders, offers"
              onPress={() => {}} 
            />
            <ProfileMenuItem 
              icon="shield-checkmark-outline" 
              label="Security & Privacy" 
              sublabel="Password, HIPAA settings"
              onPress={() => {}} 
            />
          </View>
        </View>

        {/* MEDICAL HISTORY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Records</Text>
          <View style={styles.menuCard}>
            <ProfileMenuItem 
              icon="medical-outline" 
              label="My Consultations" 
              onPress={() => router.push('/(patient)/appointments')} 
            />
            <ProfileMenuItem 
              icon="document-text-outline" 
              label="Prescriptions" 
              onPress={() => {}} 
            />
            <ProfileMenuItem 
              icon="heart-outline" 
              label="Favorite Doctors" 
              onPress={() => {}} 
            />
          </View>
        </View>

        {/* SUPPORT & LEGAL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.menuCard}>
            <ProfileMenuItem 
              icon="help-circle-outline" 
              label="Help Center" 
              onPress={() => {}} 
            />
            <ProfileMenuItem 
              icon="information-circle-outline" 
              label="Terms & Conditions" 
              onPress={() => {}} 
            />
            <ProfileMenuItem 
              icon="log-out-outline" 
              label="Sign Out" 
              isDestructive
              onPress={handleLogout} 
            />
          </View>
        </View>

        <View style={styles.footerInfo}>
          <Text style={styles.versionText}>PureCure v1.0.0</Text>
          <Text style={styles.copyText}>© 2024 PureCure Healthcare</Text>
        </View>

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
  profileHero: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...SHADOW.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF0F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.primary,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  editProfileBtn: {
    marginTop: SPACING.lg,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editProfileBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md,
    ...SHADOW.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF0F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuTextContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  menuSublabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footerInfo: {
    alignItems: 'center',
    marginTop: SPACING.xxl,
    gap: 4,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.border,
  },
  copyText: {
    fontSize: 12,
    color: COLORS.border,
  },
});
