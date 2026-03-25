import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { appointmentService } from '@services/appointmentService';
import {
  COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW
} from '@constants/index';
import {
  formatDate, formatTime, formatTimeRange,
  formatFee, formatRating, formatDoctorName,
  formatImageUrl,
} from '@utils/index';
import { Appointment } from '@/types';

// ─── Shared Components ──────────────────────────────────────────

const SkeletonBox = ({ width, height, borderRadius = 8 }: {
  width: number | string; height: number; borderRadius?: number
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[{
      width: width as any, height: height as any, borderRadius,
      backgroundColor: COLORS.border, opacity
    }]} />
  );
};

const StatusBanner = ({ status }: { status: string }) => {
  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    upcoming:             { label: 'Your appointment is confirmed', color: '#1D4ED8', bg: '#DBEAFE', icon: 'checkmark-circle' },
    in_progress:          { label: 'Appointment in progress', color: '#92400E', bg: '#FEF3C7', icon: 'time' },
    completed:            { label: 'Appointment completed', color: '#065F46', bg: '#D1FAE5', icon: 'checkmark-circle' },
    cancelled_by_patient: { label: 'Appointment cancelled', color: '#6B7280', bg: '#F3F4F6', icon: 'close-circle' },
    cancelled_by_doctor:  { label: 'Appointment cancelled by doctor', color: '#991B1B', bg: '#FEE2E2', icon: 'close-circle' },
    no_show:              { label: 'No show', color: '#991B1B', bg: '#FEE2E2', icon: 'close-circle' },
    rescheduled:          { label: 'This appointment was rescheduled', color: '#5B21B6', bg: '#EDE9FE', icon: 'repeat' },
  };

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.upcoming;

  return (
    <View style={[styles.banner, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={20} color={config.color} />
      <Text style={[styles.bannerText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appointmentService.myDetail(id)
      .then(setAppointment)
      .catch(() => Toast.show({ type: 'error', text1: 'Failed to load appointment' }))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Appointment',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await appointmentService.cancel(id);
              setAppointment(updated);
              Toast.show({ type: 'success', text1: 'Appointment Cancelled' });
            } catch (e: any) {
              Toast.show({
                type: 'error',
                text1: 'Cannot Cancel',
                text2: e.response?.data?.message || 'Too close to appointment time',
              });
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointment Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: SPACING.lg, gap: 12 }}>
          <SkeletonBox width="100%" height={60} borderRadius={12} />
          <SkeletonBox width="100%" height={180} borderRadius={12} />
          <SkeletonBox width="100%" height={220} borderRadius={12} />
          <SkeletonBox width="100%" height={100} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <TouchableOpacity style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <StatusBanner status={appointment.status} />

        {/* DOCTOR CARD */}
        <View style={styles.card}>
          <View style={styles.doctorInfoRow}>
            <Image 
              source={formatImageUrl(appointment.doctor.profile_photo)} 
              style={styles.doctorAvatar}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.doctorMeta}>
              <Text style={styles.doctorName}>{formatDoctorName(appointment.doctor.full_name)}</Text>
              <Text style={styles.doctorSpecialty}>{appointment.doctor.specialty_display}</Text>
              <Text style={styles.clinicName}>{appointment.doctor.clinic_name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingText}>{formatRating(appointment.doctor.rating)}</Text>
                <Text style={styles.reviewCount}>(Based on patient reviews)</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.viewProfileBtn}
            onPress={() => router.push(`/(patient)/doctor/${appointment.doctor.id}`)}
          >
            <Text style={styles.viewProfileBtnText}>View Doctor Profile</Text>
          </TouchableOpacity>
        </View>

        {/* APPOINTMENT INFO CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appointment Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBg}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(appointment.appointment_date)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBg}>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>
                  {formatTimeRange(appointment.start_time, appointment.end_time)}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBg}>
                <Ionicons name="hourglass-outline" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>30 minutes</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBg}>
                <Ionicons name="business-outline" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Clinic</Text>
                <Text style={styles.infoValue}>{appointment.doctor.clinic_name}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBg}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Consultation Fee</Text>
                <Text style={styles.infoValue}>{formatFee(appointment.doctor.consultation_fee)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBg}>
                <Ionicons name="barcode-outline" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Booking ID</Text>
                <Text style={[styles.infoValue, styles.bookingId]}>
                  {appointment.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* VISIT DETAILS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Visit Details</Text>
          <Text style={styles.sectionLabel}>Reason for Visit</Text>
          <Text style={[styles.sectionText, !appointment.reason && styles.mutedText]}>
            {appointment.reason || 'Not specified'}
          </Text>
          
          <View style={styles.miniDivider} />
          
          <Text style={styles.sectionLabel}>Your Notes</Text>
          <Text style={[styles.sectionText, !appointment.patient_notes && styles.mutedText]}>
            {appointment.patient_notes || 'None'}
          </Text>
        </View>

        {/* DOCTOR NOTES */}
        {appointment.status === 'completed' && appointment.notes && (
          <View style={[styles.card, styles.docNotesCard]}>
            <Text style={[styles.cardTitle, { color: '#059669' }]}>Doctor's Notes</Text>
            <Text style={styles.sectionText}>{appointment.notes}</Text>
          </View>
        )}

        {/* REVIEW CARD */}
        {appointment.status === 'completed' && (
          <View style={styles.card}>
            {appointment.has_review ? (
              <>
                <Text style={styles.cardTitle}>Your Review</Text>
                <View style={styles.ratingRow}>
                   {/* This assumes review data is available or can be fetched. 
                       For now, showing a placeholder for the review summary */}
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.ratingText}>Review submitted ✓</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Rate your experience</Text>
                <Text style={styles.mutedText}>Share your feedback about this visit</Text>
                <TouchableOpacity 
                  style={styles.crimsonBtn}
                  onPress={() => router.push(`/(patient)/appointments/${id}/review`)}
                >
                  <Text style={styles.crimsonBtnText}>Leave a Review</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* CANCELLATION INFO */}
        {(appointment.status === 'cancelled_by_patient' || appointment.status === 'cancelled_by_doctor') && (
          <View style={[styles.card, styles.cancelInfoCard]}>
            <Text style={[styles.cardTitle, { color: '#DC2626' }]}>Cancellation Information</Text>
            <Text style={styles.sectionLabel}>Reason</Text>
            <Text style={styles.sectionText}>{appointment.cancellation_reason || 'Not specified'}</Text>
            {appointment.cancelled_at && (
              <Text style={styles.cancelledAt}>Cancelled on {formatDate(appointment.cancelled_at)}</Text>
            )}
          </View>
        )}

        {/* ACTION BUTTONS */}
        {(appointment.status === 'upcoming' || appointment.status === 'rescheduled') && (
          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={styles.outlineBtn}
              onPress={() => router.push(`/(patient)/appointments/${id}/reschedule`)}
            >
              <Text style={styles.outlineBtnText}>Reschedule Appointment</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.redOutlineBtn}
              onPress={handleCancel}
            >
              <Text style={styles.redOutlineBtnText}>Cancel Appointment</Text>
            </TouchableOpacity>
          </View>
        )}
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
    padding: SPACING.lg,
    backgroundColor: '#fff',
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
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: 10,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOW.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  doctorInfoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: SPACING.lg,
  },
  doctorAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
  },
  doctorMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  clinicName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reviewCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  viewProfileBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  viewProfileBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  infoGrid: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF1F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  bookingId: {
    fontFamily: 'Courier',
    letterSpacing: 1,
    color: COLORS.textSecondary,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  mutedText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  miniDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: SPACING.lg,
  },
  docNotesCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  crimsonBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  crimsonBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelInfoCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  cancelledAt: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionSection: {
    padding: SPACING.md,
    gap: 12,
  },
  outlineBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineBtnText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  redOutlineBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
  },
  redOutlineBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 16,
  },
});
