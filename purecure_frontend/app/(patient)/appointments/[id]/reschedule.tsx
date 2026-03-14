import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { appointmentService } from '@services/appointmentService';
import { doctorService } from '@services/doctorService';
import {
  COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW
} from '@constants/index';
import {
  formatDate, formatTime, formatDoctorName,
} from '@utils/index';
import { Appointment, TimeSlot, DayAvailability } from '@/types';

export default function RescheduleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [weekDays, setWeekDays] = useState<DayAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const appt = await appointmentService.myDetail(id);
        setAppointment(appt);
        const week = await doctorService.weekAvailability(appt.doctor.id);
        setWeekDays(week);

        // Auto-select first available day that isn't the current appointment date
        const firstAvailable = week.find(d => 
          d.has_slots && d.date !== appt.appointment_date
        );
        if (firstAvailable) {
          setSelectedDate(firstAvailable.date);
          fetchSlots(appt.doctor.id, firstAvailable.date);
        }
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Failed to load details' });
        router.back();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  const fetchSlots = async (doctorId: string, date: string) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const slotList = await doctorService.availableSlots(doctorId, date);
      setSlots(slotList);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load time slots' });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: string) => {
    if (date === selectedDate) return;
    setSelectedDate(date);
    if (appointment) {
      fetchSlots(appointment.doctor.id, date);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      await appointmentService.reschedule(id, selectedSlot.id);
      Toast.show({
        type: 'success',
        text1: 'Appointment Rescheduled',
        text2: `New appointment on ${formatDate(selectedDate)} at ${selectedSlot.display_time}`,
      });
      router.replace('/(patient)/appointments');
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Reschedule Failed',
        text2: e.response?.data?.message || 'Please try a different slot',
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Appointment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* CURRENT APPOINTMENT CARD */}
        <View style={styles.currentApptCard}>
          <Text style={styles.currentLabel}>Current appointment</Text>
          <Text style={styles.strikenText}>
            {formatDoctorName(appointment?.doctor.full_name || '')}
          </Text>
          <Text style={styles.strikenInfo}>
            {formatDate(appointment?.appointment_date || '')} • {formatTime(appointment?.start_time || '')}
          </Text>
        </View>

        {/* SELECT NEW DATE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select New Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
            {weekDays.map((day) => (
              <TouchableOpacity
                key={day.date}
                style={[
                  styles.dateItem,
                  selectedDate === day.date && styles.dateItemActive,
                  !day.has_slots && styles.dateItemDisabled
                ]}
                disabled={!day.has_slots}
                onPress={() => handleDateSelect(day.date)}
              >
                <Text style={[styles.dayName, selectedDate === day.date && styles.dateTextActive]}>
                  {day.weekday.slice(0, 3)}
                </Text>
                <Text style={[styles.dayNumber, selectedDate === day.date && styles.dateTextActive]}>
                  {day.day_number}
                </Text>
                {day.has_slots && <View style={[styles.dot, selectedDate === day.date && { backgroundColor: '#fff' }]} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* SELECT NEW TIME */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Time Slots</Text>
            {loadingSlots && <ActivityIndicator size="small" color={COLORS.primary} />}
          </View>

          {slots.length === 0 && !loadingSlots ? (
            <View style={styles.emptySlots}>
              <Ionicons name="calendar-outline" size={40} color="#E5E7EB" />
              <Text style={styles.emptySlotsText}>No slots available for this date</Text>
            </View>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotItem,
                    selectedSlot?.id === slot.id && styles.slotItemActive
                  ]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text style={[
                    styles.slotText,
                    selectedSlot?.id === slot.id && styles.slotTextActive
                  ]}>
                    {slot.display_time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* INFO BOX */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.infoBoxText}>
            Your current appointment will be cancelled and a new one will be created
          </Text>
        </View>

        {/* CONFIRM BUTTON */}
        <TouchableOpacity 
          style={[styles.confirmBtn, (!selectedSlot || submitting) && styles.confirmBtnDisabled]}
          disabled={!selectedSlot || submitting}
          onPress={handleConfirmReschedule}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>
              {selectedSlot ? `Reschedule to ${selectedSlot.display_time}` : 'Confirm Reschedule'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  currentApptCard: {
    backgroundColor: '#F9FAFB',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  currentLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  strikenText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  strikenInfo: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textDecorationLine: 'line-through',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  dateList: {
    gap: 10,
    paddingRight: 20,
  },
  dateItem: {
    width: 60,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  dateItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOW.md,
  },
  dateItemDisabled: {
    opacity: 0.3,
  },
  dayName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  dateTextActive: {
    color: '#fff',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotItem: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  slotItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOW.sm,
  },
  slotText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  slotTextActive: {
    color: '#fff',
  },
  emptySlots: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: 10,
    marginBottom: SPACING.xl,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.md,
  },
  confirmBtnDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
