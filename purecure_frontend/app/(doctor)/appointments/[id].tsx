import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, TextInput, Platform, Linking
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@store/authStore';
import { appointmentService } from '@services/appointmentService';
import {
  COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW
} from '@constants/index';
import {
  formatDate, formatTimeRange, getInitials,
} from '@utils/index';
import { AppointmentDoctor } from '@app-types/index';

const SkeletonCard = () => {
  return (
    <View style={{
      height: 100, backgroundColor: '#E5E7EB',
      borderRadius: BORDER_RADIUS.lg, marginBottom: 12, opacity: 0.5
    }} />
  );
};

export default function DoctorAppointmentDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [appointment, setAppointment] = useState<AppointmentDoctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesText, setNotesText] = useState('');
  const [notesChanged, setNotesChanged] = useState(false);
  const [actionLoading, setActionLoading] = useState<'complete' | 'noshow' | 'cancel' | null>(null);

  useEffect(() => {
    appointmentService.doctorDetail(id as string)
      .then(appt => {
        setAppointment(appt);
        setNotesText(appt.notes || '');
      })
      .catch(() =>
        Toast.show({ type: 'error', text1: 'Failed to load appointment' })
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !appointment) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointment Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const getStatusBanner = () => {
    switch (appointment.status) {
      case 'upcoming': return { bg: '#DBEAFE', icon: 'time-outline' as const, text: 'Upcoming' };
      case 'in_progress': return { bg: '#FEF3C7', icon: 'radio-button-on' as const, text: 'In Progress' };
      case 'completed': return { bg: '#D1FAE5', icon: 'checkmark-circle' as const, text: 'Completed' };
      case 'cancelled_by_patient': return { bg: '#F3F4F6', icon: 'close-circle' as const, text: 'Cancelled by Patient' };
      case 'cancelled_by_doctor': return { bg: '#F3F4F6', icon: 'close-circle' as const, text: 'Cancelled by You' };
      case 'no_show': return { bg: '#FEE2E2', icon: 'person-remove-outline' as const, text: 'No Show' };
      case 'rescheduled': return { bg: '#EDE9FE', icon: 'time-outline' as const, text: 'Rescheduled' };
      default: return { bg: '#F3F4F6', icon: 'ellipse-outline' as const, text: appointment.status };
    }
  };

  const banner = getStatusBanner();

  const handleSaveNotes = async () => {
    try {
      await appointmentService.updateNotes(appointment.id, notesText);
      setNotesChanged(false);
      Toast.show({ type: 'success', text1: 'Notes saved' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save notes' });
    }
  };

  const handleComplete = () => {
    Alert.alert(
      'Complete Appointment',
      'Mark this appointment as completed?',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Mark Completed',
          onPress: async () => {
            setActionLoading('complete');
            try {
              const updated = await appointmentService.complete(appointment.id, notesText);
              setAppointment(updated);
              Toast.show({ type: 'success', text1: 'Appointment Completed' });
            } catch (e: any) {
              Toast.show({
                type: 'error',
                text1: 'Failed',
                text2: e.response?.data?.message || 'Try again',
              });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleNoShow = () => {
    Alert.alert(
      'Mark as No Show',
      'Are you sure you want to mark this patient as a no show?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark No Show',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('noshow');
            try {
              const updated = await appointmentService.noShow(appointment.id);
              setAppointment(updated);
              Toast.show({ type: 'success', text1: 'Marked as No Show' });
            } catch (e: any) {
              Toast.show({
                type: 'error',
                text1: 'Failed',
                text2: e.response?.data?.message || 'Try again',
              });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Cancel Appointment',
        'Reason for cancellation (optional):',
        async (reason) => {
          setActionLoading('cancel');
          try {
            const updated = await appointmentService.doctorCancel(appointment.id, reason || '');
            setAppointment(updated);
            Toast.show({ type: 'success', text1: 'Appointment Cancelled' });
          } catch (e: any) {
            Toast.show({ type: 'error', text1: 'Failed to cancel' });
          } finally {
            setActionLoading(null);
          }
        },
        'plain-text'
      );
    } else {
      Alert.alert(
        'Cancel Appointment',
        'Are you sure you want to cancel this appointment?',
        [
          { text: 'Back', style: 'cancel' },
          {
            text: 'Cancel Appointment',
            style: 'destructive',
            onPress: async () => {
              setActionLoading('cancel');
              try {
                const updated = await appointmentService.doctorCancel(appointment.id, 'Cancelled by doctor');
                setAppointment(updated);
                Toast.show({ type: 'success', text1: 'Appointment Cancelled' });
              } catch (e: any) {
                Toast.show({ type: 'error', text1: 'Failed to cancel' });
              } finally {
                setActionLoading(null);
              }
            },
          },
        ]
      );
    }
  };

  const isActionsVisible = appointment.status === 'upcoming' || appointment.status === 'in_progress' || appointment.status === 'rescheduled';
  const anyLoading = actionLoading !== null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* STATUS BANNER */}
        <View style={[styles.statusBanner, { backgroundColor: banner.bg }]}>
          <Ionicons name={banner.icon} size={20} color={COLORS.textPrimary} />
          <Text style={styles.statusBannerText}>{banner.text}</Text>
        </View>

        {/* PATIENT CARD */}
        <View style={styles.card}>
          <View style={styles.patientRow}>
            {appointment.patient.profile_photo ? (
              <Image source={{ uri: appointment.patient.profile_photo }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.initialsContainer]}>
                <Text style={styles.initialsText}>{getInitials(appointment.patient.full_name)}</Text>
              </View>
            )}
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{appointment.patient.full_name}</Text>
              <Text style={styles.patientSubtext}>
                {appointment.patient.gender ? `${appointment.patient.gender} • ` : ''} 
                {appointment.patient.date_of_birth ? 'DOB info' : ''}
              </Text>
              <View style={styles.phoneRow}>
                <Ionicons name="call" size={12} color={COLORS.textSecondary} />
                <Text style={styles.patientSubtext}>{appointment.patient.phone}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.pillsRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText} numberOfLines={1}>✉️ {appointment.patient.email}</Text>
            </View>
            <TouchableOpacity style={styles.pill} onPress={() => Linking.openURL(`tel:${appointment.patient.phone}`)}>
              <Text style={styles.pillText}>📱 Call</Text>
            </TouchableOpacity>
            {appointment.patient.gender && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>⚥ {appointment.patient.gender}</Text>
              </View>
            )}
          </View>
        </View>

        {/* APPOINTMENT INFO CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appointment Info</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(appointment.appointment_date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>{formatTimeRange(appointment.start_time, appointment.end_time)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="timer-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>30 minutes</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="medical-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>Consultation</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoLabel}>Booking ID</Text>
            <Text style={styles.infoValueMonospace}>{appointment.id.substring(0, 8)}</Text>
          </View>
        </View>

        {/* VISIT REASON CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Visit Details</Text>
          <Text style={styles.labelText}>Reason for Visit</Text>
          <Text style={[styles.bodyText, !appointment.reason && styles.italicGray]}>
            {appointment.reason || "Not specified"}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.labelText}>Patient Notes</Text>
          <Text style={[styles.bodyText, !appointment.patient_notes && styles.italicGray]}>
            {appointment.patient_notes || "None"}
          </Text>
        </View>

        {/* DOCTOR NOTES SECTION */}
        <View style={styles.card}>
          <View style={styles.notesHeaderRow}>
            <Text style={styles.cardTitle}>My Notes</Text>
            {notesChanged && (
              <TouchableOpacity onPress={handleSaveNotes}>
                <Text style={styles.saveNotesText}>Save</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={[styles.notesInput, !notesChanged && styles.notesInputIdle]}
            value={notesText}
            onChangeText={(text) => {
              setNotesText(text);
              setNotesChanged(true);
            }}
            placeholder="Add consultation notes, diagnosis, prescriptions..."
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* CANCELLATION CARD */}
        {(appointment.status === 'cancelled_by_patient' || appointment.status === 'cancelled_by_doctor') && (
          <View style={styles.cancellationCard}>
            <Text style={styles.cancellationLabel}>Cancellation Reason</Text>
            <Text style={styles.cancellationText}>{appointment.cancellation_reason || 'No reason provided'}</Text>
            {appointment.cancelled_at && (
              <Text style={styles.cancelledAtText}>Cancelled on {formatDate(appointment.cancelled_at)}</Text>
            )}
          </View>
        )}

        {/* ACTION BUTTONS */}
        {isActionsVisible && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Actions</Text>
            <TouchableOpacity 
              style={styles.completeBtn} 
              onPress={handleComplete}
              disabled={anyLoading}
            >
              {actionLoading === 'complete' ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                  <Text style={styles.completeBtnText}>Mark as Completed</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.noshowBtn} 
              onPress={handleNoShow}
              disabled={anyLoading}
            >
              {actionLoading === 'noshow' ? <ActivityIndicator color="#92400E" /> : (
                <>
                  <Ionicons name="person-remove-outline" size={20} color="#92400E" />
                  <Text style={styles.noshowBtnText}>Mark as No Show</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={handleCancel}
              disabled={anyLoading}
            >
              {actionLoading === 'cancel' ? <ActivityIndicator color={COLORS.danger} /> : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color={COLORS.danger} />
                  <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
                </>
              )}
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  statusBannerText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOW.md,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: SPACING.md,
  },
  initialsContainer: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  patientSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    backgroundColor: '#F3F4F6',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  infoValueMonospace: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  labelText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  italicGray: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  notesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  saveNotesText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  notesInput: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 22,
    minHeight: 100,
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  notesInputIdle: {
    backgroundColor: '#F9FAFB',
  },
  cancellationCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    ...SHADOW.md,
  },
  cancellationLabel: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
    marginBottom: 4,
  },
  cancellationText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  cancelledAtText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  completeBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  completeBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
  noshowBtn: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  noshowBtnText: {
    color: '#92400E',
    fontWeight: '600',
    fontSize: 15,
  },
  cancelBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelBtnText: {
    color: COLORS.danger,
    fontWeight: '600',
    fontSize: 15,
  },
});
