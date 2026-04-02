import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doctorService } from '@services/doctorService';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { formatRating, formatFee, formatDoctorName } from '@utils/index';
import { Doctor, TimeSlot, DayAvailability } from '@/types';

// ─── Shared Components ──────────────────────────────────────────

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= Math.floor(rating) ? 'star' : i - rating < 1 ? 'star-half' : 'star-outline'}
          size={14}
          color="#F59E0B"
        />
      ))}
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────

export default function DoctorProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [weekDays, setWeekDays] = useState<DayAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  
  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const rawDoc = await doctorService.detail(id);
        const safeDoc = { ...rawDoc, clinics: rawDoc.clinics || [] };
        setDoctor(safeDoc);
        
        // Safely fallback clinics array
        const clinics = safeDoc.clinics;
        
        // Find primary clinic or first available
        const primaryClinic = clinics.find(c => c.is_primary) || clinics[0];
        const clinicId = primaryClinic?.id || null;
        setSelectedClinicId(clinicId);

        const week = await doctorService.weekAvailability(id, undefined, clinicId || undefined);
        setWeekDays(week);
        
        // Auto-select first day that has slots
        const firstAvailable = week.find(d => d.has_slots);
        if (firstAvailable) {
          setSelectedDate(firstAvailable.date);
          fetchSlots(firstAvailable.date, clinicId || undefined);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDoctor(false);
      }
    };
    init();
  }, [id]);

  const fetchSlots = async (date: string, clinicId?: string | null) => {
    const cid = clinicId === undefined ? selectedClinicId : clinicId;
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const slotList = await doctorService.availableSlots(id, date, cid || undefined);
      setSlots(slotList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleClinicChange = async (clinicId: string) => {
    setSelectedClinicId(clinicId);
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const week = await doctorService.weekAvailability(id, undefined, clinicId);
      setWeekDays(week);
      
      const firstAvailable = week.find(d => d.has_slots);
      if (firstAvailable) {
        setSelectedDate(firstAvailable.date);
        fetchSlots(firstAvailable.date, clinicId || undefined);
      } else {
        setSelectedDate('');
        setSlots([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (day: DayAvailability) => {
    if (!day.has_slots) return;
    setSelectedDate(day.date);
    fetchSlots(day.date);
  };

  const handleBook = () => {
    if (!selectedSlot || !doctor || !selectedClinicId) return;
    
    const activeClinic = doctor.clinics.find(c => c.id === selectedClinicId);
    
    router.push({
      pathname: '/(patient)/booking/confirm',
      params: {
        doctorId: doctor.id,
        slotId: selectedSlot.id,
        clinicId: selectedClinicId,
        doctorName: doctor.full_name,
        specialty: doctor.specialty_display,
        clinicName: activeClinic?.name || doctor.clinic_name,
        date: selectedDate,
        time: selectedSlot.display_time,
        fee: String(activeClinic?.consultation_fee || doctor.consultation_fee),
      },
    });
  };

  if (loadingDoctor) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!doctor) return null;

  const currentClinic = doctor.clinics.find(c => c.id === selectedClinicId) || doctor.clinics[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor Profile</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="share-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* DOCTOR HERO */}
        <View style={styles.hero}>
          <View style={styles.photoContainer}>
            <Image 
              source={doctor.profile_photo ? { uri: doctor.profile_photo } : null} 
              style={styles.photo} 
            />
            {doctor.is_available && <View style={styles.onlineDot} />}
          </View>
          <Text style={styles.name}>{formatDoctorName(doctor.full_name)}</Text>
          <Text style={styles.specialty}>{doctor.specialty_display.toUpperCase()}</Text>
          <View style={styles.clinicBadge}>
            <Ionicons name="location" size={14} color={COLORS.primary} />
            <Text style={styles.clinicInfo}>{currentClinic?.name || doctor.clinic_name}</Text>
          </View>
          <Text style={styles.expText}>{doctor.years_experience}+ Years Exp.</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={Number(doctor.rating || 0)} />
            <Text style={styles.reviewsText}>({Number(doctor.review_count || 0)} Reviews)</Text>
          </View>
        </View>

        {/* CLINIC SELECTOR */}
        {doctor.clinics.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Clinic</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clinicList}>
              {doctor.clinics.map((clinic) => (
                <TouchableOpacity 
                  key={clinic.id} 
                  onPress={() => handleClinicChange(clinic.id)}
                  style={[
                    styles.clinicCard,
                    selectedClinicId === clinic.id && styles.clinicCardActive
                  ]}
                >
                  <Text style={[
                    styles.clinicName,
                    selectedClinicId === clinic.id && styles.whiteText
                  ]}>{clinic.name}</Text>
                  <Text style={[
                    styles.clinicLocation,
                    selectedClinicId === clinic.id && styles.whiteTextOp
                  ]} numberOfLines={1}>{clinic.city}</Text>
                  <Text style={[
                    styles.clinicFee,
                    selectedClinicId === clinic.id && styles.whiteText
                  ]}>{formatFee(clinic.consultation_fee)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{doctor.review_count * 10}+</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{doctor.years_experience} Yrs</Text>
            <Text style={styles.statLabel}>Experience</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatRating(doctor.rating)}★</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* ABOUT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text 
            style={styles.bio} 
            numberOfLines={isAboutExpanded ? undefined : 3}
          >
            {doctor.bio || "No biography provided."}
          </Text>
          {doctor.bio && doctor.bio.length > 100 && (
            <TouchableOpacity onPress={() => setIsAboutExpanded(!isAboutExpanded)}>
              <Text style={styles.readMore}>{isAboutExpanded ? 'Read less' : 'Read more'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FEE */}
        <View style={styles.section}>
          <View style={styles.feeRow}>
            <Text style={styles.sectionTitle}>Consultation Fee</Text>
            <Text style={styles.feeValue}>{formatFee(doctor.consultation_fee)}</Text>
          </View>
        </View>

        {/* DATE PICKER */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Select Date</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}
          >
            {weekDays.map((day) => (
              <TouchableOpacity 
                key={day.date} 
                onPress={() => handleDateSelect(day)}
                style={[
                  styles.datePill,
                  selectedDate === day.date && styles.datePillActive,
                  !day.has_slots && styles.datePillDisabled
                ]}
              >
                <Text style={[
                  styles.dateWeek, 
                  selectedDate === day.date && styles.whiteText,
                  !day.has_slots && styles.disabledText
                ]}>
                  {day.weekday.toUpperCase()}
                </Text>
                <Text style={[
                  styles.dateDay, 
                  selectedDate === day.date && styles.whiteText,
                  !day.has_slots && styles.disabledText
                ]}>
                  {day.day_number}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* TIME SLOTS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Slots</Text>
          {loadingSlots ? (
            <View style={styles.slotsGrid}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <View key={i} style={styles.slotSkeleton} />
              ))}
            </View>
          ) : slots.length > 0 ? (
            <View style={styles.slotsGrid}>
              {slots.map((slot) => (
                <TouchableOpacity 
                  key={slot.id}
                  onPress={() => setSelectedSlot(slot)}
                  disabled={!slot.is_available}
                  style={[
                    styles.slotBtn,
                    selectedSlot?.id === slot.id && styles.slotBtnActive,
                    !slot.is_available && styles.slotBtnBooked
                  ]}
                >
                  <Text style={[
                    styles.slotText,
                    selectedSlot?.id === slot.id && styles.whiteText,
                    !slot.is_available && styles.slotTextBooked
                  ]}>
                    {slot.display_time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noSlots}>No slots available for this date</Text>
          )}
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* BOOK BUTTON */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.bookBtn, !selectedSlot && styles.bookBtnDisabled]}
          disabled={!selectedSlot}
          onPress={handleBook}
        >
          <Text style={styles.bookBtnText}>
            {selectedSlot ? `Book • ${selectedSlot.display_time}` : 'Select a Time Slot'}
          </Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  specialty: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  clinicInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  clinicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  expText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  clinicList: {
    gap: 12,
    paddingRight: SPACING.lg,
  },
  clinicCard: {
    width: 160,
    padding: SPACING.md,
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOW.sm,
  },
  clinicCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOW.md,
  },
  clinicName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  clinicLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  clinicFee: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  whiteTextOp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 5,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  bio: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  readMore: {
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    paddingVertical: SPACING.md,
  },
  feeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dateList: {
    gap: 12,
  },
  datePill: {
    width: 60,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  datePillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOW.md,
  },
  datePillDisabled: {
    opacity: 0.5,
  },
  dateWeek: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  whiteText: {
    color: '#fff',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotBtn: {
    width: '31%',
    height: 45,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOW.sm,
  },
  slotBtnBooked: {
    backgroundColor: '#F3F4F6',
    borderColor: '#F3F4F6',
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  slotTextBooked: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  slotSkeleton: {
    width: '31%',
    height: 45,
    backgroundColor: '#F3F4F6',
    borderRadius: BORDER_RADIUS.md,
  },
  noSlots: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    paddingVertical: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: SPACING.lg,
    paddingBottom: 30, // Extra for safe area
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bookBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.md,
  },
  bookBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  bookBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
