import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Switch,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { appointmentService } from '@services/appointmentService';
import {
  COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW
} from '@constants/index';
import {
  formatDate, formatDoctorName,
} from '@utils/index';
import { Appointment } from '@/types';

const StarInput = ({ rating, onRate }: { rating: number; onRate: (r: number) => void }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map(star => (
      <TouchableOpacity key={star} onPress={() => onRate(star)} activeOpacity={0.7}>
        <Ionicons
          name={star <= rating ? 'star' : 'star-outline'}
          size={44}
          color={star <= rating ? '#F59E0B' : '#D1D5DB'}
        />
      </TouchableOpacity>
    ))}
  </View>
);

export default function ReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'];

  useEffect(() => {
    appointmentService.myDetail(id)
      .then(setAppointment)
      .catch(() => Toast.show({ type: 'error', text1: 'Failed to load appointment' }))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Toast.show({ type: 'error', text1: 'Please select a rating' });
      return;
    }
    setSubmitting(true);
    try {
      await appointmentService.submitReview(id, {
        rating,
        comment: comment.trim(),
        is_anonymous: isAnonymous,
      });
      Toast.show({
        type: 'success',
        text1: 'Review Submitted!',
        text2: 'Thank you for your feedback',
      });
      router.replace('/(patient)/appointments');
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to submit review',
        text2: e.response?.data?.message || 'Please try again',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!appointment) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave a Review</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* DOCTOR INFO CARD */}
          <View style={styles.doctorCard}>
            <View style={styles.doctorInfoRow}>
              <View style={styles.avatarContainer}>
                {appointment.doctor.profile_photo ? (
                  <Image source={{ uri: appointment.doctor.profile_photo }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{appointment.doctor.full_name[0]}</Text>
                  </View>
                )}
              </View>
              <View style={styles.doctorMeta}>
                <Text style={styles.doctorName}>{formatDoctorName(appointment.doctor.full_name)}</Text>
                <Text style={styles.doctorSpecialty}>{appointment.doctor.specialty_display}</Text>
                <Text style={styles.apptDate}>Appointment on {formatDate(appointment.appointment_date)}</Text>
              </View>
            </View>
          </View>

          {/* RATING SECTION */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingQuestion}>How was your experience?</Text>
            <StarInput rating={rating} onRate={setRating} />
            {rating > 0 && (
              <Text style={styles.ratingLabel}>{ratingLabels[rating]}</Text>
            )}
          </View>

          {/* COMMENT INPUT */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Share your experience (optional)</Text>
              <Text style={styles.charCount}>{comment.length}/500</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Tell others about your visit with this doctor..."
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
              scrollEnabled={false}
            />
          </View>

          {/* ANONYMOUS TOGGLE */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Post anonymously</Text>
              <Text style={styles.toggleSubtext}>Your name won't be shown with your review</Text>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
              thumbColor={Platform.OS === 'android' ? (isAnonymous ? COLORS.primary : '#f4f3f4') : undefined}
            />
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity 
            style={[styles.submitBtn, (rating === 0 || submitting) && styles.submitBtnDisabled]}
            disabled={rating === 0 || submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Review</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.skipBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  doctorCard: {
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...SHADOW.sm,
    marginBottom: SPACING.xl,
  },
  doctorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: '#FEF0F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 24,
  },
  doctorMeta: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  apptDate: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  ratingQuestion: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  starRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  ratingLabel: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  toggleSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    ...SHADOW.md,
  },
  submitBtnDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    marginTop: SPACING.lg,
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
