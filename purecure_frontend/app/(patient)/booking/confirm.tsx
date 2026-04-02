import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { appointmentService } from '@services/appointmentService';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { formatDoctorName, formatFee } from '@utils/index';

export default function BookingConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    doctorId: string;
    slotId: string;
    clinicId: string;
    doctorName: string;
    specialty: string;
    clinicName: string;
    date: string;
    time: string;
    fee: string;
  }>();

  const [reason, setReason] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const formattedDate = new Date(params.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await appointmentService.book({
        doctor_id: params.doctorId,
        slot_id: params.slotId,
        clinic_id: params.clinicId,
        reason: reason.trim(),
        patient_notes: patientNotes.trim(),
      });
      
      // Navigate to success screen
      router.replace({
        pathname: '/(patient)/booking/success',
        params: { 
          doctorName: params.doctorName, 
          specialty: params.specialty, 
          clinicName: params.clinicName, 
          date: params.date, 
          time: params.time 
        },
      });
    } catch (error: any) {
      const msg = error.response?.data?.message
        || error.response?.data?.errors
        || 'Booking failed. Please try again.';
      Toast.show({ 
        type: 'error', 
        text1: 'Booking Failed', 
        text2: String(typeof msg === 'object' ? JSON.stringify(msg) : msg) 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Booking</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* SUMMARY CARD */}
          <View style={styles.summaryCard}>
            <View style={styles.doctorInfo}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{params.doctorName[0]}</Text>
              </View>
              <View>
                <Text style={styles.doctorName}>{formatDoctorName(params.doctorName)}</Text>
                <Text style={styles.doctorSpecialty}>{params.specialty}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formattedDate}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{params.time}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="business-outline" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.detailLabel}>Clinic</Text>
                <Text style={styles.detailValue}>{params.clinicName}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Consultation Fee</Text>
              <Text style={styles.totalValue}>{formatFee(params.fee)}</Text>
            </View>
          </View>

          {/* INPUTS */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Reason for Visit</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe your symptoms or reason for visit..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Any medications, allergies, or additional info..."
              value={patientNotes}
              onChangeText={setPatientNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.policyContainer}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.policyText}>
              Free cancellation up to 1 hour before appointment
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.confirmBtn, loading && styles.disabledBtn]}
            onPress={handleConfirm}
            disabled={loading}
          >
            <Text style={styles.confirmBtnText}>
              {loading ? 'Confirming...' : 'Confirm Appointment'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
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
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOW.md,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FEF0F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF0F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  inputSection: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
  },
  policyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
  },
  policyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: SPACING.lg,
    paddingBottom: 30,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.md,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledBtn: {
    backgroundColor: '#E5E7EB',
  },
});
