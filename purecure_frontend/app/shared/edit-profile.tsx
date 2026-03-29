import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Switch,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@store/authStore';
import { authService } from '@services/authService';
import { dashboardService } from '@services/dashboardService';
import {
  COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW
} from '@constants/index';
import { getInitials } from '@utils/index';

// ─── Shared Components ──────────────────────────────────────────

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  containerStyle?: object;
  prefix?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  error,
  multiline,
  numberOfLines,
  keyboardType = 'default',
  autoCapitalize = 'none',
  containerStyle,
  prefix,
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
          multiline && { height: 100, alignItems: 'flex-start', paddingTop: 12 },
        ]}
      >
        <Ionicons 
          name={icon} 
          size={20} 
          color={isFocused ? COLORS.primary : COLORS.textSecondary} 
          style={multiline && { marginTop: 2 }}
        />
        {prefix && <Text style={styles.prefixText}>{prefix}</Text>}
        <TextInput
          style={[styles.inputText, multiline && { textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────

export default function EditProfileScreen() {
  const { user, updateUser } = useAuthStore();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [form, setForm] = useState({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    phone: user?.phone ?? '',
    gender: user?.gender ?? '',
    date_of_birth: user?.date_of_birth ?? '',
    // Doctor only fields:
    bio: user?.bio ?? '',
    consultation_fee: user?.consultation_fee?.toString() ?? '',
    languages: user?.languages ?? [] as string[],
    profile_photo: null as any,
  });

  const [availability, setAvailability] = useState(user?.is_available ?? true);

  const updateForm = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleToggleAvailability = async (val: boolean) => {
    setAvailability(val);
    try {
      await dashboardService.toggleAvailability(val);
      // No need to wait for Save button for this
    } catch (e) {
      setAvailability(!val);
      Toast.show({ type: 'error', text1: 'Failed to update availability' });
    }
  };

  const handleChangePhoto = async () => {
    Alert.alert(
      'Change Profile Photo',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera access is required.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) {
              updateForm('profile_photo', result.assets[0]);
            }
          },
        },
        {
          text: 'Photo Library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Photos access is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) {
              updateForm('profile_photo', result.assets[0]);
            }
          },
        },
        {
          text: 'Remove Photo',
          style: 'destructive',
          onPress: () => updateForm('profile_photo', 'REMOVE'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAddLanguage = () => {
    Alert.prompt(
      'Add Language',
      'Enter a language you speak',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add', 
          onPress: (lang) => {
            if (lang && !form.languages.includes(lang)) {
              updateForm('languages', [...form.languages, lang]);
            }
          } 
        },
      ]
    );
  };

  const handleRemoveLanguage = (lang: string) => {
    updateForm('languages', form.languages.filter(l => l !== lang));
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      Toast.show({ type: 'error', text1: 'Name fields are required' });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('first_name', form.first_name.trim());
      formData.append('last_name', form.last_name.trim());
      formData.append('phone', form.phone.trim());
      formData.append('gender', form.gender);
      formData.append('date_of_birth', form.date_of_birth);

      if (user?.role === 'doctor') {
        formData.append('bio', form.bio);
        formData.append('consultation_fee', form.consultation_fee);
        formData.append('languages', JSON.stringify(form.languages));
      }

      if (form.profile_photo === 'REMOVE') {
        formData.append('profile_photo', '');
      } else if (form.profile_photo) {
        formData.append('profile_photo', {
          uri: form.profile_photo.uri,
          type: 'image/jpeg',
          name: 'profile_photo.jpg',
        } as any);
      }

      const updatedUser = await authService.updateProfile(formData);
      updateUser(updatedUser);

      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your changes have been saved successfully',
      });
      
      setIsDirty(false);
      router.back();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to update profile',
        text2: e.response?.data?.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={!isDirty || loading}
        >
          <Text style={[styles.saveBtnText, (!isDirty || loading) && { opacity: 0.5 }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* PHOTO SECTION */}
          <View style={styles.photoContainer}>
            <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarWrapper}>
              {form.profile_photo && form.profile_photo !== 'REMOVE' ? (
                <Image source={{ uri: form.profile_photo.uri }} style={styles.avatarLarge} />
              ) : (user?.profile_photo && form.profile_photo !== 'REMOVE') ? (
                <Image source={{ uri: user.profile_photo }} style={styles.avatarLarge} />
              ) : (
                <View style={styles.initialsAvatarLarge}>
                  <Text style={styles.initialsTextLarge}>{getInitials(user?.full_name || 'U')}</Text>
                </View>
              )}
              <View style={styles.cameraIconBadge}>
                <Ionicons name="camera" size={18} color={COLORS.white} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleChangePhoto}>
              <Text style={styles.changePhotoText}>Change Profile Photo</Text>
            </TouchableOpacity>
          </View>

          {/* COMMON FIELDS */}
          <View style={styles.section}>
            <View style={styles.row}>
              <InputField 
                label="First Name"
                value={form.first_name}
                onChangeText={(v) => updateForm('first_name', v)}
                placeholder="First Name"
                icon="person-outline"
                containerStyle={{ flex: 1 }}
                autoCapitalize="words"
              />
              <View style={{ width: 15 }} />
              <InputField 
                label="Last Name"
                value={form.last_name}
                onChangeText={(v) => updateForm('last_name', v)}
                placeholder="Last Name"
                icon="person-outline"
                containerStyle={{ flex: 1 }}
                autoCapitalize="words"
              />
            </View>

            <InputField 
              label="Phone Number"
              value={form.phone}
              onChangeText={(v) => updateForm('phone', v)}
              placeholder="e.g. 9876543210"
              icon="call-outline"
              keyboardType="numeric"
            />

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {['male', 'female', 'other'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderPill,
                      form.gender === g && styles.genderPillActive,
                    ]}
                    onPress={() => updateForm('gender', g)}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        form.gender === g && styles.genderTextActive,
                      ]}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <InputField 
              label="Date of Birth"
              value={form.date_of_birth}
              onChangeText={(v) => updateForm('date_of_birth', v)}
              placeholder="DD/MM/YYYY"
              icon="calendar-outline"
            />
          </View>

          {/* DOCTOR ONLY FIELDS */}
          {user?.role === 'doctor' && (
            <View style={[styles.section, { marginTop: SPACING.md }]}>
              <Text style={styles.sectionHeader}>Professional Information</Text>
              
              <InputField 
                label="Bio"
                value={form.bio}
                onChangeText={(v) => updateForm('bio', v)}
                placeholder="Tell patients about your expertise..."
                icon="document-text-outline"
                multiline
                numberOfLines={4}
              />

              <InputField 
                label="Consultation Fee"
                value={form.consultation_fee}
                onChangeText={(v) => updateForm('consultation_fee', v)}
                placeholder="0"
                icon="cash-outline"
                keyboardType="numeric"
                prefix="₹"
              />

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Languages Spoken</Text>
                <View style={styles.languagesContainer}>
                  {form.languages.map((lang) => (
                    <View key={lang} style={styles.langTag}>
                      <Text style={styles.langTagText}>{lang}</Text>
                      <TouchableOpacity onPress={() => handleRemoveLanguage(lang)}>
                        <Ionicons name="close-circle" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addLangBtn} onPress={handleAddLanguage}>
                    <Ionicons name="add" size={20} color={COLORS.primary} />
                    <Text style={styles.addLangText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.availabilityRow}>
                <View>
                  <Text style={styles.availabilityLabel}>Available for bookings</Text>
                  <Text style={styles.availabilitySub}>Currently {availability ? 'Online' : 'Offline'}</Text>
                </View>
                <Switch 
                  value={availability} 
                  onValueChange={handleToggleAvailability}
                  trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.saveBtn, (!isDirty || loading) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isDirty || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnFullText}>Save Changes</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  initialsAvatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsTextLarge: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: '700',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  section: {
    width: '100%',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  row: {
    flexDirection: 'row',
  },
  inputWrapper: {
    marginBottom: SPACING.lg,
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
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: 12,
    height: 52,
    backgroundColor: '#F9FAFB',
    gap: 10,
  },
  inputRowFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  inputRowError: {
    borderColor: COLORS.danger,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: -4,
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
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderPill: {
    flex: 1,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  genderPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  genderTextActive: {
    color: COLORS.primary,
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  langTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  langTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
  addLangBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: 4,
  },
  addLangText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginTop: 10,
  },
  availabilityLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  availabilitySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    ...SHADOW.md,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnFullText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
