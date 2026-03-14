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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@store/authStore';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { extractAxiosError } from '@utils/index';

/**
 * CONSTANTS
 */
const SPECIALTIES = [
  { label: 'General Physician', value: 'general' },
  { label: 'Cardiologist', value: 'cardiology' },
  { label: 'Dermatologist', value: 'dermatology' },
  { label: 'Dentist', value: 'dental' },
  { label: 'Ophthalmologist', value: 'ophthalmology' },
  { label: 'Orthopedic Surgeon', value: 'orthopedics' },
  { label: 'Pediatrician', value: 'pediatrics' },
  { label: 'Psychiatrist', value: 'psychiatry' },
  { label: 'Gynecologist', value: 'gynecology' },
  { label: 'Neurologist', value: 'neurology' },
];

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
  multiline?: boolean;
  numberOfLines?: number;
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
  multiline,
  numberOfLines,
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
          multiline && styles.inputRowMultiline,
        ]}
      >
        <View style={styles.iconContainer}>
            <Ionicons name={icon} size={20} color={isFocused ? COLORS.primary : COLORS.textMuted} />
        </View>
        <TextInput
          style={[styles.inputText, multiline && styles.inputTextMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
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

/**
 * MAIN SCREEN
 */

export default function RegisterDoctor() {
  const router = useRouter();
  const registerDoctor = useAuthStore((s) => s.registerDoctor);

  const [currentStep, setCurrentStep] = useState(1);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    specialty: '',
    specialtyLabel: 'Select Specialty',
    clinicName: '',
    yearsExperience: '',
    licenseNumber: '',
    bio: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10,15}$/;

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!emailRegex.test(formData.email)) newErrors.email = 'Invalid email';
    
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    else if (!phoneRegex.test(formData.phone)) newErrors.phone = '10-15 digits';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Min 8 chars';
    
    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords mismatch';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    const licenseRegex = /^[A-Za-z0-9-]+$/;

    if (!formData.specialty) newErrors.specialty = 'Specialty is required';
    if (!formData.clinicName.trim()) newErrors.clinicName = 'Clinic name is required';
    
    const years = parseInt(formData.yearsExperience);
    if (!formData.yearsExperience) newErrors.yearsExperience = 'Required';
    else if (isNaN(years) || years < 0 || years > 50) newErrors.yearsExperience = '0-50';

    if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License is required';
    else if (!licenseRegex.test(formData.licenseNumber)) newErrors.licenseNumber = 'Invalid format';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setCurrentStep(2);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setIsLoading(true);
    try {
      await registerDoctor({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        confirm_password: formData.confirmPassword,
        specialty: formData.specialty,
        clinic_name: formData.clinicName,
        years_experience: parseInt(formData.yearsExperience),
        license_number: formData.licenseNumber,
        bio: formData.bio,
      });
      router.replace('/(doctor)');
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

  const renderSpecialtyItem = ({ item }: { item: typeof SPECIALTIES[0] }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => {
        setFormData({ ...formData, specialty: item.value, specialtyLabel: item.label });
        setIsModalVisible(false);
      }}
    >
      <Text style={[styles.modalItemText, formData.specialty === item.value && styles.modalItemTextActive]}>
        {item.label}
      </Text>
      {formData.specialty === item.value && (
        <Ionicons name="checkmark" size={20} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => currentStep === 1 ? router.back() : setCurrentStep(1)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor Registration</Text>
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
          <Text style={styles.subtitle}>Join PureCure as a Medical Professional</Text>

          {/* Progress Indicator */}
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressLine, currentStep === 2 && styles.progressLineActive]} />
            <View style={[styles.progressDot, currentStep === 2 && styles.progressDotActive]} />
          </View>

          {currentStep === 1 ? (
            <View>
              <View style={styles.row}>
                <InputField
                  label="First Name"
                  value={formData.firstName}
                  onChangeText={(t) => setFormData({ ...formData, firstName: t })}
                  placeholder="Jane"
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
                  placeholder="Smith"
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
                placeholder="dr.jane@purecure.com"
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

              <TouchableOpacity style={styles.button} onPress={handleNext}>
                <Text style={styles.buttonText}>Next: Professional Details →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Step 2 Form */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Medical Specialty</Text>
                <TouchableOpacity
                  style={[styles.inputRow, !!errors.specialty && styles.inputRowError]}
                  onPress={() => setIsModalVisible(true)}
                >
                  <Ionicons name="medical-outline" size={20} color={COLORS.primary} />
                  <Text style={[styles.inputText, !formData.specialty && { color: COLORS.textMuted }]}>
                    {formData.specialtyLabel}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
                {!!errors.specialty && <Text style={styles.errorText}>{errors.specialty}</Text>}
              </View>

              <InputField
                label="Clinic Name"
                value={formData.clinicName}
                onChangeText={(t) => setFormData({ ...formData, clinicName: t })}
                placeholder="City Health Clinic"
                icon="business-outline"
                error={errors.clinicName}
              />

              <View style={styles.row}>
                <InputField
                  label="Exp. (Years)"
                  value={formData.yearsExperience}
                  onChangeText={(t) => setFormData({ ...formData, yearsExperience: t })}
                  placeholder="10"
                  icon="time-outline"
                  keyboardType="numeric"
                  error={errors.yearsExperience}
                  containerStyle={{ flex: 1 }}
                />
                <View style={{ width: SPACING.lg }} />
                <InputField
                  label="License Number"
                  value={formData.licenseNumber}
                  onChangeText={(t) => setFormData({ ...formData, licenseNumber: t })}
                  placeholder="PC-123456"
                  icon="id-card-outline"
                  error={errors.licenseNumber}
                  containerStyle={{ flex: 2 }}
                />
              </View>

              <InputField
                label="Professional Bio (Optional)"
                value={formData.bio}
                onChangeText={(t) => setFormData({ ...formData, bio: t })}
                placeholder="Tell patients about your expertise..."
                icon="document-text-outline"
                multiline
                numberOfLines={4}
                error={errors.bio}
              />

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Complete Registration</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backLink} onPress={() => setCurrentStep(1)}>
                  <Text style={styles.linkText}>← Back to Personal Info</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.footerLink} onPress={() => router.replace('/(auth)')}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.linkText}>Sign in</Text>
            </Text>
          </TouchableOpacity>

          <TrustBadges />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Specialty Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Specialty</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={SPECIALTIES}
              keyExtractor={(item) => item.value}
              renderItem={renderSpecialtyItem}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  progressLineActive: {
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
  iconContainer: {
    width: 24,
    alignItems: 'center',
  },
  inputRowMultiline: {
    height: 100,
    paddingVertical: 12,
    alignItems: 'flex-start',
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
  inputTextMultiline: {
    height: '100%',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
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
  backLink: {
      marginTop: SPACING.lg,
      alignItems: 'center',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '60%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalList: {
    padding: 10,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalItemText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  modalItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
