import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Modal, Pressable, Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { doctorService } from '@services/doctorService';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { formatRating, formatFee, formatDoctorName } from '@utils/index';
import { Doctor } from '@/types';

// ─── Constants ──────────────────────────────────────────────────

const SPECIALTIES = [
  { id: '', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'cardiology', label: 'Cardiology' },
  { id: 'dermatology', label: 'Dermatology' },
  { id: 'dental', label: 'Dental' },
  { id: 'ophthalmology', label: 'Ophthalmology' },
  { id: 'orthopedics', label: 'Orthopedics' },
  { id: 'pediatrics', label: 'Pediatrics' },
];

// ─── Internal Components ────────────────────────────────────────

const Avatar = ({ photo, name, size = 64 }: { photo: string | null; name: string; size?: number }) => {
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

const DoctorCard = ({ doctor, onPress }: { doctor: Doctor; onPress: () => void }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
    <View style={styles.cardTop}>
      <Avatar photo={doctor.profile_photo} name={doctor.full_name} />
      <View style={styles.cardMain}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName}>{formatDoctorName(doctor.full_name)}</Text>
          <View style={styles.cardRating}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>{formatRating(doctor.rating)}</Text>
          </View>
        </View>
        <Text style={styles.cardSpecialty}>{doctor.specialty_display}</Text>
        <View style={styles.cardDetails}>
          <Text style={styles.feeText}>₹{doctor.consultation_fee}/consult</Text>
        </View>
          <View style={styles.cardInfoCol}>
            <Text style={styles.cardClinic}>{doctor.clinic_name}</Text>
            <Text style={styles.cardFee}>{formatFee(doctor.consultation_fee)}</Text>
          </View>
      </View>
    </View>
    <View style={styles.cardBottom}>
      <View style={[styles.statusPill, { backgroundColor: doctor.is_available ? '#DCFCE7' : '#F3F4F6' }]}>
        <Ionicons 
          name={doctor.is_available ? "checkmark-circle" : "time"} 
          size={14} 
          color={doctor.is_available ? '#166534' : '#6B7280'} 
        />
        <Text style={[styles.statusText, { color: doctor.is_available ? '#166534' : '#6B7280' }]}>
          {doctor.is_available ? 'Available Now' : 'Busy'}
        </Text>
      </View>
      <TouchableOpacity style={styles.bookBtn} onPress={onPress}>
        <Text style={styles.bookBtnText}>Book Appointment</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

// ─── Main Screen ───────────────────────────────────────────────

export default function DoctorSearchScreen() {
  const router = useRouter();
  const { specialty: paramSpecialty } = useLocalSearchParams<{ specialty: string }>();

  const [query, setQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(paramSpecialty || '');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  
  const [filters, setFilters] = useState({
    min_rating: undefined as number | undefined,
    max_fee: undefined as number | undefined,
    is_available: false,
    ordering: '-rating',
  });

  const searchTimeout = useRef<NodeJS.Timeout>();

  const fetchDoctors = async (
    q: string, 
    specialty: string, 
    f: typeof filters, 
    pageNum: number
  ) => {
    if (pageNum === 1) setLoading(true);
    try {
      const res = await doctorService.list({
        search: q || undefined,
        specialty: specialty || undefined,
        min_rating: f.min_rating,
        max_fee: f.max_fee,
        is_available: f.is_available || undefined,
        ordering: f.ordering,
        page: pageNum,
      });
      
      const newDoctors = res.data.results;
      if (pageNum === 1) {
        setDoctors(newDoctors);
      } else {
        setDoctors(prev => [...prev, ...newDoctors]);
      }
      setHasMore(!!res.data.next);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors(query, selectedSpecialty, filters, 1);
  }, []);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchDoctors(text, selectedSpecialty, filters, 1);
    }, 300);
  };

  const handleSpecialtySelect = (sId: string) => {
    setSelectedSpecialty(sId);
    fetchDoctors(query, sId, filters, 1);
  };

  const applyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setFilterModalVisible(false);
    fetchDoctors(query, selectedSpecialty, newFilters, 1);
  };

  const resetFilters = () => {
    const f = {
      min_rating: undefined,
      max_fee: undefined,
      is_available: false,
      ordering: '-rating',
    };
    setFilters(f);
    setFilterModalVisible(false);
    fetchDoctors(query, selectedSpecialty, f, 1);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchDoctors(query, selectedSpecialty, filters, page + 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find a Doctor</Text>
      </View>

      {/* SEARCH BOX */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors or specialties..."
            value={query}
            onChangeText={handleSearch}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.filterBtn} 
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* SPECIALTY PILLS */}
      <View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.pillsContainer}
        >
          {SPECIALTIES.map(s => (
            <TouchableOpacity 
              key={s.id}
              style={[
                styles.pill, 
                selectedSpecialty === s.id && styles.pillActive
              ]}
              onPress={() => handleSpecialtySelect(s.id)}
            >
              <Text style={[
                styles.pillText, 
                selectedSpecialty === s.id && styles.pillTextActive
              ]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* RESULTS */}
      <View style={{ flex: 1 }}>
        <FlashList
          data={doctors}
          keyExtractor={item => item.id}
          estimatedItemSize={160}
          contentContainerStyle={{ padding: SPACING.lg }}
          renderItem={({ item }) => (
            <DoctorCard 
              doctor={item} 
              onPress={() => router.push(`/(patient)/doctor/${item.id}`)} 
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {loading ? 'Searching...' : `${doctors.length} doctors found`}
            </Text>
          }
          ListFooterComponent={hasMore ? <ActivityIndicator color={COLORS.primary} style={{ margin: 20 }} /> : null}
          ListEmptyComponent={!loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#E5E7EB" />
              <Text style={styles.emptyText}>No doctors found</Text>
              <Text style={styles.emptySubtext}>Try a different search or specialty</Text>
            </View>
          ) : null}
        />
      </View>

      {/* FILTER MODAL */}
      <FilterModal 
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        currentFilters={filters}
      />
    </SafeAreaView>
  );
}

// ─── Filter Modal Component ──────────────────────────────────

const FilterModal = ({ visible, onClose, onApply, onReset, currentFilters }: any) => {
  const [f, setF] = useState(currentFilters);

  useEffect(() => {
    if (visible) setF(currentFilters);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Doctors</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            {/* RATING */}
            <Text style={styles.modalSectionLabel}>Minimum Rating</Text>
            <View style={styles.modalPillsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity 
                  key={star}
                  style={[styles.modalPill, f.min_rating === star && styles.pillActive]}
                  onPress={() => setF({ ...f, min_rating: star })}
                >
                  <Text style={[styles.modalPillText, f.min_rating === star && styles.pillTextActive]}>
                    {star}★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ORDERING */}
            <Text style={styles.modalSectionLabel}>Sort By</Text>
            <View style={styles.modalPillsRow}>
              {[
                { id: '-rating', label: 'Rating' },
                { id: 'consultation_fee', label: 'Fee (Low)' },
                { id: '-years_experience', label: 'Experience' }
              ].map(opt => (
                <TouchableOpacity 
                  key={opt.id}
                  style={[styles.modalPill, f.ordering === opt.id && styles.pillActive]}
                  onPress={() => setF({ ...f, ordering: opt.id })}
                >
                  <Text style={[styles.modalPillText, f.ordering === opt.id && styles.pillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* AVAILABILITY */}
            <View style={styles.availabilityRow}>
              <Text style={styles.modalSectionLabel}>Available Now Only</Text>
              <Switch 
                value={f.is_available} 
                onValueChange={val => setF({ ...f, is_available: val })}
                trackColor={{ false: '#767577', true: COLORS.primary }}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
              <Text style={styles.resetBtnText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={() => onApply(f)}>
              <Text style={styles.applyBtnText}>Show Results</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    height: 50,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.xs,
    ...SHADOW.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  filterBtn: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.sm,
  },
  pillsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  pillTextActive: {
    color: COLORS.white,
  },
  resultsCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.md,
  },
  cardTop: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cardMain: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardSpecialty: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  feeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clinicText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  expText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cardInfoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardClinic: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  cardFee: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookBtn: {
    backgroundColor: 'rgba(232, 24, 74, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  bookBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: SPACING.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalScroll: {
    marginBottom: SPACING.xl,
  },
  modalSectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  modalPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#F3F4F6',
  },
  modalPillText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingBottom: 20,
  },
  resetBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: BORDER_RADIUS.lg,
  },
  resetBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    height: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  applyBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
