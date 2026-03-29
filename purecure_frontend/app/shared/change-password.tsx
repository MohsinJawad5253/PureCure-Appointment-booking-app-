import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { authService } from '@services/authService';
import {
  COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW
} from '@constants/index';
import { extractAxiosError } from '@utils/index';

// ─── Internal Components ────────────────────────────────────────

const RequirementItem = ({ label, met }: { label: string; met: boolean }) => (
  <View style={styles.reqItem}>
    <Ionicons 
      name={met ? "checkmark-circle" : "ellipse-outline"} 
      size={16} 
      color={met ? COLORS.success : COLORS.textMuted} 
    />
    <Text style={[styles.reqText, met && { color: COLORS.textPrimary }]}>{label}</Text>
  </View>
);

const PasswordInput = ({ label, value, onChangeText, placeholder, error }: any) => {
  const [show, setShow] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[
        styles.inputRow, 
        isFocused && styles.inputFocused,
        !!error && styles.inputError
      ]}>
        <Ionicons name="lock-closed-outline" size={20} color={isFocused ? COLORS.primary : COLORS.textSecondary} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!show}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <TouchableOpacity onPress={() => setShow(!show)}>
          <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_new_password: '',
  });

  const requirements = {
    length: form.new_password.length >= 8,
    uppercase: /[A-Z]/.test(form.new_password),
    number: /[0-9]/.test(form.new_password),
    special: /[^A-Za-z0-9]/.test(form.new_password),
  };

  const strength = Object.values(requirements).filter(Boolean).length;
  const strengthColor = strength <= 1 ? COLORS.danger : strength <= 3 ? '#F59E0B' : COLORS.success;
  const strengthWidth = `${(strength / 4) * 100}%`;

  const handleUpdate = async () => {
    if (!form.old_password) {
      Toast.show({ type: 'error', text1: 'Current password is required' });
      return;
    }
    if (Object.values(requirements).some(v => v === false)) {
      Toast.show({ type: 'error', text1: 'New password does not meet requirements' });
      return;
    }
    if (form.new_password !== form.confirm_new_password) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(form);
      Toast.show({
        type: 'success',
        text1: 'Password Updated',
        text2: 'Your password has been changed successfully',
      });
      router.back();
    } catch (e: any) {
      const message = extractAxiosError(e);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.heroTitle}>Secure Your Account</Text>
            <Text style={styles.heroSub}>Create a strong password to protect your medical data and personal information.</Text>
          </View>

          <PasswordInput 
            label="Current Password"
            value={form.old_password}
            onChangeText={(v: string) => setForm({ ...form, old_password: v })}
            placeholder="Enter current password"
          />

          <View style={{ height: 10 }} />

          <PasswordInput 
            label="New Password"
            value={form.new_password}
            onChangeText={(v: string) => setForm({ ...form, new_password: v })}
            placeholder="Enter new password"
          />

          {/* STRENGTH BAR */}
          <View style={styles.strengthContainer}>
            <View style={[styles.strengthBar, { width: strengthWidth as any, backgroundColor: strengthColor }]} />
          </View>

          {/* REQUIREMENTS */}
          <View style={styles.reqContainer}>
            <RequirementItem label="At least 8 characters" met={requirements.length} />
            <RequirementItem label="One uppercase letter" met={requirements.uppercase} />
            <RequirementItem label="One number" met={requirements.number} />
            <RequirementItem label="One special character" met={requirements.special} />
          </View>

          <PasswordInput 
            label="Confirm New Password"
            value={form.confirm_new_password}
            onChangeText={(v: string) => setForm({ ...form, confirm_new_password: v })}
            placeholder="Re-enter new password"
            error={form.confirm_new_password && form.new_password !== form.confirm_new_password ? 'Passwords do not match' : ''}
          />

          <TouchableOpacity 
            style={[styles.actionBtn, loading && styles.btnDisabled]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.btnText}>Update Password</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    gap: 10,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
  strengthContainer: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  reqContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: 24,
    gap: 10,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    ...SHADOW.md,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
