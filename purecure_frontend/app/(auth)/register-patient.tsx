import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@store/authStore';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { extractAxiosError } from '@utils/index';

/**
 * SHARED COMPONENTS (Inline)
 */

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  rightIcon?: React.ReactNode;
  containerStyle?: object;
}



const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  error,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  rightIcon,
  containerStyle,
}) => {
  const [isFocused, setIsFocused] = useState(false);



  return (
    <View style={[styles.inputWrapper, containerStyle]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          isFocused && styles.inputRowFocused,
          !!error && styles.inputRowError,
        ]}
      >
        <Ionicons name={icon} size={20} color={isFocused ? COLORS.primary : COLORS.textMuted} />
        <TextInput
          style={styles.inputText}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {rightIcon}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const TrustBadges = () => (
  <View style={styles.trustRow}>
    <View style={styles.trustBadge}>
      <Ionicons name="lock-closed" size={12} color={COLORS.textMuted} />
      <Text style={styles.trustText}>HIPAA COMPLIANT</Text>
    </View>
    <View style={styles.trustBadge}>
      <Ionicons name="shield-checkmark" size={12} color={COLORS.textMuted} />
      <Text style={styles.trustText}>256-BIT SSL</Text>
    </View>
  </View>
);

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (!password) return 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;
  return score;
};

const StrengthBar = ({ password }: { password: string }) => {
  const score = getPasswordStrength(password);
  const colors = ['#E5E7EB', '#EF4444', '#EF4444', '#F59E0B', '#10B981'];
  const widths: (string | number)[] = ['0%', '25%', '50%', '75%', '100%'];

  if (score === 0) return null;

  return (
    <View style={styles.strengthContainer}>
      <View style={[styles.strengthBar, { width: widths[score] as any, backgroundColor: colors[score] }]} />
    </View>
  );
};

/**
 * MAIN SCREEN
 */

export default function RegisterPatient() {
  const router = useRouter();
  const registerPatient = useAuthStore((s) => s.registerPatient);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10,15}$/;

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    else if (formData.firstName.length < 2) newErrors.firstName = 'Min 2 characters';

    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    else if (formData.lastName.length < 2) newErrors.lastName = 'Min 2 characters';

    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!emailRegex.test(formData.email)) newErrors.email = 'Invalid email address';

    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!phoneRegex.test(formData.phone)) newErrors.phone = '10-15 digits only';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Min 8 characters';
    else if (getPasswordStrength(formData.password) < 4) {
      newErrors.password = 'Must include: Uppercase, Lowercase, Number, Special Char';
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await registerPatient({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        confirm_password: formData.confirmPassword,
        date_of_birth: formData.dob || undefined,
        gender: formData.gender || undefined,
      });
      router.replace('/(patient)');
    } catch (err: any) {
      const message = extractAxiosError(err);
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
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
          <Text style={styles.subtitle}>Join PureCure as a Patient</Text>

          <View style={styles.progressRow}>
            <View style={styles.progressDotActive} />
          </View>

          {/* Form */}
          <View style={styles.row}>
            <InputField
              label="First Name"
              value={formData.firstName}
              onChangeText={(t) => setFormData({ ...formData, firstName: t })}
              placeholder="rohit"
              icon="person-outline"
              error={errors.firstName}
              containerStyle={{ flex: 1 }}
              autoCapitalize="words"
            />
            <View style={{ width: SPACING.lg }} />
            <InputField
              label="Last Name"
              value={formData.lastName}
              onChangeText={(t) => setFormData({ ...formData, lastName: t })}
              placeholder="sharma"
              icon="person-outline"
              error={errors.lastName}
              containerStyle={{ flex: 1 }}
              autoCapitalize="words"
            />
          </View>

          <InputField
            label="Email Address"
            value={formData.email}
            onChangeText={(t) => setFormData({ ...formData, email: t })}
            placeholder="rohit@example.com"
            icon="mail-outline"
            keyboardType="email-address"
            error={errors.email}
          />

          <InputField
            label="Phone Number"
            value={formData.phone}
            onChangeText={(t) => setFormData({ ...formData, phone: t })}
            placeholder="1234567890"
            icon="call-outline"
            keyboardType="numeric"
            error={errors.phone}
          />

          <InputField
            label="Password"
            value={formData.password}
            onChangeText={(t) => setFormData({ ...formData, password: t })}
            placeholder="••••••••"
            icon="lock-closed-outline"
            secureTextEntry={!showPassword}
            error={errors.password}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            }
          />
          <StrengthBar password={formData.password} />

          <InputField
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(t) => setFormData({ ...formData, confirmPassword: t })}
            placeholder="••••••••"
            icon="lock-closed-outline"
            secureTextEntry={!showConfirmPassword}
            error={errors.confirmPassword}
            rightIcon={
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            }
          />

          <InputField
            label="Date of Birth (Optional)"
            value={formData.dob}
            onChangeText={(t) => setFormData({ ...formData, dob: t })}
            placeholder="YYYY-MM-DD"
            icon="calendar-outline"
            error={errors.dob}
          />

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Gender (Optional)</Text>
            <View style={styles.genderRow}>
              {['male', 'female', 'other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderPill,
                    formData.gender === g && styles.genderPillActive,
                  ]}
                  onPress={() => setFormData({ ...formData, gender: g })}
                >
                  <Text
                    style={[
                      styles.genderText,
                      formData.gender === g && styles.genderTextActive,
                    ]}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Create Patient Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.footerLink} onPress={() => router.back()}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.linkText}>Sign in</Text>
            </Text>
          </TouchableOpacity>

          <TrustBadges />
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
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    paddingTop: SPACING.lg,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  progressDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
  },
  inputWrapper: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    height: 54,
    backgroundColor: COLORS.white,
    gap: 10,
  },
  inputRowFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  inputRowError: {
    borderColor: COLORS.danger,
  },
  inputText: {
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
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: -SPACING.md,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderPill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  genderPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  genderTextActive: {
    color: COLORS.primary,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    ...SHADOW.md,
  },
  buttonDisabled: {
    backgroundColor: '#F67A9B',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  footerLink: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 32,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
