import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@store/authStore';
import { doctorService } from '@services/doctorService';
import { appointmentService } from '@services/appointmentService';
import { clinicService } from '@services/clinicService';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { formatDate, formatTime, formatRating, formatFee, formatDoctorName } from '@utils/index';
import { Doctor, Clinic, Appointment } from '@/types';

// ─── Shared Components ──────────────────────────────────────────

const SkeletonBox = ({ width, height, borderRadius = 8, style = {} }: any) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: COLORS.border, opacity }, style]} />;
};

const Avatar = ({ photo, name, size = 40 }: { photo: string | null; name: string; size?: number }) => {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#FEF0F4',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: size * 0.4 }}>{initials}</Text>
    </View>
  );
};

const SectionHeader = ({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionLabel && (
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.sectionAction}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────

export default function PatientHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [topDoctors, setTopDoctors] = useState<Doctor[]>([]);
  const [upcomingAppointment, setUpcomingAppointment] = useState<Appointment | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHomeData = async () => {
    try {
      const [clinicsRes, doctorsRes, apptRes, cancelledRes] = await Promise.all([
        clinicService.topRated().catch(err => {
          console.error('[HomeData] Clinics fetch error:', err);
          return [];
        }),
        doctorService.topRated().catch(err => {
          console.error('[HomeData] Doctors fetch error:', err);
          return [];
        }),
        appointmentService.myList({ status: 'upcoming', page: 1 }).catch(err => {
          console.error('[HomeData] Appointments fetch error:', err);
          return { data: { results: [] } } as any;
        }),
        appointmentService.myList({ status: 'cancelled_by_doctor', page: 1 }).catch(err => {
          console.error('[HomeData] Cancelled fetch error:', err);
          return { data: { count: 0 } } as any;
        }),
      ]);

      setClinics(clinicsRes);
      setTopDoctors(doctorsRes);
      setUpcomingAppointment(apptRes?.data?.results?.[0] ?? null);
      
      const cancelledCount = 
        cancelledRes?.data?.count ?? 
        cancelledRes?.data?.data?.count ?? 
        cancelledRes?.count ?? 0;
      setUnreadCount(cancelledCount);
    } catch (e) {
      console.error('[HomeData] Unexpected error:', e);
      Toast.show({ type: 'error', text1: 'Failed to load home data' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const specialties = [
    { id: 'general', label: 'General', icon: 'medical' as const },
    { id: 'cardiology', label: 'Heart', icon: 'heart' as const },
    { id: 'dental', label: 'Dental', icon: 'happy' as const },
    { id: 'ophthalmology', label: 'Eyes', icon: 'eye' as const },
    { id: 'orthopedics', label: 'Bones', icon: 'body' as const },
    { id: 'pediatrics', label: 'Child', icon: 'people' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {user?.first_name || 'User'} 👋</Text>
            <Text style={styles.subtitle}>Find your doctor today</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={() => router.push('/(patient)/notifications')}
              style={[styles.iconButton, { position: 'relative' }]}
            >
              <Ionicons name="notifications-outline" size={24} color={COLORS.textPrimary} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <Avatar photo={user?.profile_photo || null} name={`${user?.first_name} ${user?.last_name}`} />
          </View>
        </View>

        {/* SEARCH BAR (Pressable) */}
        <TouchableOpacity 
          style={styles.searchBar} 
          onPress={() => router.push('/(patient)/search')}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <Text style={styles.searchPlaceholder}>Search doctors or specialties...</Text>
        </TouchableOpacity>

        {/* SPECIALTY QUICK FILTERS */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.specialtiesList}
        >
          {specialties.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.specialtyCard}
              onPress={() => router.push({ pathname: '/(patient)/search', params: { specialty: item.id } })}
            >
              <View style={styles.specialtyIconContainer}>
                <Ionicons name={item.icon} size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.specialtyLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* UPCOMING APPOINTMENT */}
        {upcomingAppointment && (
          <View style={styles.sectionContainer}>
            <SectionHeader title="Next Appointment" />
            <TouchableOpacity 
              style={styles.upcomingCard}
              onPress={() => router.push(`/(patient)/appointments/${upcomingAppointment.id}`)}
            >
              <View style={styles.dateBadge}>
                <Text style={styles.dateMonth}>{new Date(upcomingAppointment.appointment_date).toLocaleString('default', { month: 'short' }).toUpperCase()}</Text>
                <Text style={styles.dateDay}>{new Date(upcomingAppointment.appointment_date).getDate()}</Text>
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingDoctor}>{formatDoctorName(upcomingAppointment.doctor.full_name)}</Text>
                <Text style={styles.upcomingDetails}>
                  {upcomingAppointment.doctor.specialty_display} • {formatTime(upcomingAppointment.start_time)}
                </Text>
                <View style={styles.clinicRow}>
                  <Ionicons name="location" size={12} color={COLORS.white} />
                  <Text style={styles.upcomingClinic}>{upcomingAppointment.doctor.clinic_name}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* TOP RATED CLINICS */}
        <View style={styles.sectionContainer}>
          <SectionHeader title="Top Rated Clinics" actionLabel="See All" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {loading ? (
              [1, 2, 3].map(i => <SkeletonBox key={i} width={200} height={180} style={{ marginRight: SPACING.md }} />)
            ) : (
              clinics.map(clinic => (
                <TouchableOpacity 
                  key={clinic.id} 
                  style={styles.clinicCard}
                  onPress={() => router.push({ pathname: '/(patient)/clinic/[id]', params: { id: clinic.id } })}
                >
                  <Image 
                    source={clinic.photo ? { uri: clinic.photo } : null} 
                    style={styles.clinicImage} 
                    contentFit="cover"
                  />
                  <View style={styles.clinicDetails}>
                    <Text style={styles.clinicName} numberOfLines={1}>{clinic.name}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.ratingText}>{formatRating(clinic.rating)}</Text>
                      <Text style={styles.distanceText}> • {formatRating(clinic.distance_km)} km away</Text>
                    </View>
                    <View style={styles.tagsRow}>
                      {clinic.tags.slice(0, 2).map((tag, i) => (
                        <View key={i} style={styles.tagPill}>
                          <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* TOP RATED DOCTORS */}
        <View style={styles.sectionContainer}>
          <SectionHeader title="Top Doctors" actionLabel="See All" onAction={() => router.push('/(patient)/search')} />
          {loading ? (
            [1, 2, 3].map(i => <SkeletonBox key={i} width="100%" height={100} style={{ marginBottom: SPACING.md }} />)
          ) : (
            topDoctors.map(doctor => (
              <TouchableOpacity 
                key={doctor.id} 
                style={styles.doctorCard}
                onPress={() => router.push(`/(patient)/doctor/${doctor.id}`)}
              >
                <View style={styles.doctorInfoRow}>
                  <Avatar photo={doctor.profile_photo} name={doctor.full_name} size={60} />
                  <View style={styles.doctorMainInfo}>
                    <Text style={styles.doctorName}>{formatDoctorName(doctor.full_name)}</Text>
                    <Text style={styles.doctorSpecialty}>{doctor.specialty_display}</Text>
                    <Text style={styles.doctorClinic}>{doctor.clinic_name}</Text>
                  </View>
                  <View style={styles.doctorStats}>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.ratingText}>{formatRating(doctor.rating)}</Text>
                    </View>
                    <Text style={styles.feeText}>{formatFee(doctor.consultation_fee)}</Text>
                  </View>
                </View>
                <View style={styles.doctorCardFooter}>
                  <View style={[styles.availabilityPill, { backgroundColor: doctor.is_available ? '#DCFCE7' : '#F3F4F6' }]}>
                    <Text style={[styles.availabilityText, { color: doctor.is_available ? '#166534' : '#6B7280' }]}>
                      {doctor.is_available ? 'Available' : 'Booked'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.bookButton}
                    onPress={() => router.push(`/(patient)/doctor/${doctor.id}`)}
                  >
                    <Text style={styles.bookButtonText}>Book Now</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        
        {/* Adds padding at bottom for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  greeting: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.sm,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    height: 50,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.xl,
    gap: SPACING.xs,
  },
  searchPlaceholder: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  specialtiesList: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  specialtyCard: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  specialtyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.sm,
  },
  specialtyLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionAction: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  horizontalList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  clinicCard: {
    width: 200,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  clinicImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#E5E7EB',
  },
  clinicDetails: {
    padding: SPACING.md,
  },
  clinicName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 4,
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  tagPill: {
    backgroundColor: '#FEF0F4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  doctorCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOW.md,
  },
  doctorInfoRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  doctorMainInfo: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  doctorClinic: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  doctorStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  feeText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  doctorCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  availabilityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.lg,
  },
  bookButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  upcomingCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    ...SHADOW.md,
  },
  dateBadge: {
    backgroundColor: COLORS.white,
    width: 50,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingDoctor: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  upcomingDetails: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 4,
  },
  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upcomingClinic: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '500',
  },
});
