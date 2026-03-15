import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clinicService } from '@services/clinicService';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { formatRating, formatFee, formatDoctorName } from '@utils/index';
import { Clinic, Doctor } from '@/types';

const DoctorItem = ({ doctor, onPress }: { doctor: Doctor; onPress: () => void }) => (
  <TouchableOpacity style={styles.doctorItem} onPress={onPress}>
    <View style={styles.doctorAvatarContainer}>
      {doctor.profile_photo ? (
        <Image source={{ uri: doctor.profile_photo }} style={styles.doctorAvatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{doctor.full_name[0]}</Text>
        </View>
      )}
    </View>
    <View style={styles.doctorInfo}>
      <Text style={styles.doctorName}>{formatDoctorName(doctor.full_name)}</Text>
      <Text style={styles.doctorSpecialty}>{doctor.specialty_display}</Text>
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={12} color="#F59E0B" />
        <Text style={styles.ratingText}>{formatRating(doctor.rating)}</Text>
        <Text style={styles.expText}> • {doctor.years_experience} Yrs Exp</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
  </TouchableOpacity>
);

export default function ClinicDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await clinicService.detail(id);
        setClinic(data);
        // Assuming the clinic detail response includes its doctors. 
        // If not, we'd need another service call or use filtering on doctorService.
        // For now, based on standard patterns, we'll assume it's in the response or handle appropriately.
        if (data.doctors) {
          setDoctors(data.doctors);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleCall = () => {
    if (clinic?.phone_number) {
      Linking.openURL(`tel:${clinic.phone_number}`);
    }
  };

  const handleDirections = () => {
    if (clinic?.address) {
      const url = Platform.select({
        ios: `maps:0,0?q=${clinic.address}`,
        android: `geo:0,0?q=${clinic.address}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!clinic) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clinic Details</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="share-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Image 
          key={clinic.id}
          source={clinic.photo ? { uri: clinic.photo } : null} 
          style={styles.clinicHeroImage} 
          contentFit="cover"
        />

        <View style={styles.content}>
          <View style={styles.clinicInfoContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.clinicName}>{clinic.name}</Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#fff" />
                <Text style={styles.ratingBadgeText}>{formatRating(clinic.rating)}</Text>
              </View>
            </View>
            
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.addressText}>{clinic.address}</Text>
            </View>

            <View style={styles.tagsContainer}>
              {clinic.tags.map((tag: string, i: number) => (
                <View key={i} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="call" size={20} color="#0284C7" />
              </View>
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleDirections}>
              <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="navigate" size={20} color="#166534" />
              </View>
              <Text style={styles.actionLabel}>Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <View style={[styles.actionIcon, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="globe-outline" size={20} color="#374151" />
              </View>
              <Text style={styles.actionLabel}>Website</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionDivider} />

          {/* ABOUT */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Clinic</Text>
            <Text style={styles.description}>
              {clinic.description || `Welcome to ${clinic.name}. We provide comprehensive healthcare services with a team of experienced professionals dedicated to your well-being.`}
            </Text>
          </View>

          {/* DOCTORS AT CLINIC */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Doctors ({doctors.length})</Text>
            {doctors.length > 0 ? (
              doctors.map(doctor => (
                <DoctorItem 
                  key={doctor.id} 
                  doctor={doctor} 
                  onPress={() => router.push(`/(patient)/doctor/${doctor.id}`)} 
                />
              ))
            ) : (
              <Text style={styles.emptyText}>No doctors currently listed at this clinic.</Text>
            )}
          </View>
        </View>
        
        <View style={{ height: 40 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: '#fff',
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
  clinicHeroImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: SPACING.lg,
  },
  clinicInfoContainer: {
    marginBottom: SPACING.xl,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  clinicName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 8,
    width: '30%',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  doctorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  doctorAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  doctorAvatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF0F4',
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 24,
  },
  doctorInfo: {
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
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  expText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
});
