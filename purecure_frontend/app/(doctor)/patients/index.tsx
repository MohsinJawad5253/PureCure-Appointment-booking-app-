import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, ActivityIndicator, Animated, TextInput, RefreshControl
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { dashboardService } from '@services/dashboardService';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { formatDate, getInitials } from '@utils/index';

const SkeletonBox = ({
  width, height, borderRadius = 8, style
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
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
    <Animated.View style={[{ width, height, borderRadius, backgroundColor: COLORS.border, opacity }, style]} />
  );
};

interface PatientRecord {
  id: string;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  phone: string;
  profile_photo: string | null;
  visit_count: number;
  last_visit: string | null;
  upcoming_count: number;
}

export default function DoctorPatients() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('-last_visit');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const searchTimer = useRef<NodeJS.Timeout>();

  const fetchPatients = async (q: string, ord: string, pageNum: number, refresh = false) => {
    if (pageNum === 1 && !refresh) setLoading(true);
    try {
      const res = await dashboardService.patientList({
        search: q || undefined,
        ordering: ord,
        page: pageNum,
      });
      const data = res.data ?? res;
      const results = data.results ?? data.data?.results ?? [];
      const count = data.count ?? data.data?.count ?? 0;
      const next = data.next ?? data.data?.next ?? null;
      
      if (refresh || pageNum === 1) {
        setPatients(results);
      } else {
        setPatients(prev => [...prev, ...results]);
      }
      setTotal(count);
      setHasMore(!!next);
      setPage(pageNum);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load patients' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatients('', ordering, 1);
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchPatients(text, ordering, 1);
    }, 300);
  };

  const handleSort = (ord: string) => {
    setOrdering(ord);
    fetchPatients(search, ord, 1);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchPatients(search, ordering, page + 1);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPatients(search, ordering, 1, true);
  };

  const getGenderStyle = (gender: string | null) => {
    if (gender?.toLowerCase() === 'male') return { bg: '#DBEAFE', text: '#1D4ED8' };
    if (gender?.toLowerCase() === 'female') return { bg: '#FCE7F3', text: '#9D174D' };
    return { bg: '#F3F4F6', text: '#6B7280' };
  };

  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    return Math.floor((new Date().getTime() - new Date(dob).getTime()) / 31557600000);
  };

  const renderPatientCard = ({ item }: { item: PatientRecord }) => {
    const genderStyle = getGenderStyle(item.gender);
    const age = calculateAge(item.date_of_birth);

    return (
      <TouchableOpacity 
        style={styles.patientCard}
        onPress={() => router.push({ pathname: '/(doctor)/patients/[id]', params: { id: item.id } })}
      >
        {item.profile_photo ? (
          <Image source={{ uri: item.profile_photo }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.initialsContainer]}>
            <Text style={styles.initialsText}>{getInitials(item.full_name)}</Text>
          </View>
        )}
        
        <View style={styles.centerCol}>
          <Text style={styles.patientName}>{item.full_name}</Text>
          
          <View style={styles.metaRow}>
            {(item.gender || age !== null) && (
              <View style={[styles.genderPill, { backgroundColor: genderStyle.bg }]}>
                <Text style={[styles.genderText, { color: genderStyle.text }]}>
                  {item.gender ? item.gender.charAt(0).toUpperCase() + item.gender.slice(1) : ''}
                  {item.gender && age !== null ? ' • ' : ''}
                  {age !== null ? `${age} yrs` : ''}
                </Text>
              </View>
            )}
            <View style={styles.phoneCol}>
              <Ionicons name="call" size={11} color={COLORS.textMuted} />
              <Text style={styles.phoneText}>{item.phone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.rightCol}>
          <View style={styles.visitCountBadge}>
            <Text style={styles.visitCountText}>{item.visit_count} visits</Text>
          </View>
          <Text style={styles.lastVisitText}>
            {item.last_visit ? formatDate(item.last_visit) : 'No visits yet'}
          </Text>
          {item.upcoming_count > 0 && (
            <View style={styles.upcomingBadge}>
              <Text style={styles.upcomingBadgeText}>{item.upcoming_count} upcoming</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const SORT_OPTIONS = [
    { label: 'Recent', value: '-last_visit' },
    { label: 'Most Visits', value: '-visit_count' },
    { label: 'Name A–Z', value: 'name' },
    { label: 'Name Z–A', value: '-name' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Patients</Text>
        <Text style={styles.headerSubtitle}>{total} total patients</Text>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            value={search}
            onChangeText={handleSearch}
            autoFocus={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SORT PILLS */}
      <View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortContainer}
        >
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity 
              key={opt.value}
              style={[styles.sortPill, ordering === opt.value && styles.sortPillSelected]}
              onPress={() => handleSort(opt.value)}
            >
              <Text style={[styles.sortPillText, ordering === opt.value && styles.sortPillTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* PATIENT LIST */}
      {!loading && (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderPatientCard({ item })}
          contentContainerStyle={{ 
            paddingHorizontal: SPACING.lg, 
            paddingBottom: 100, 
            paddingTop: SPACING.md 
          }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListFooterComponent={() => loading && page > 1 ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
          ) : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="people-outline"
                size={56}
                color={COLORS.textMuted}
              />
              <Text style={styles.emptyTitle}>No patients found</Text>
              <Text style={styles.emptySubtitle}>
                Patients who book appointments with you appear here
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  searchWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    ...SHADOW.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  sortContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: 8,
  },
  sortPill: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortPillText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sortPillTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  patientCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    ...SHADOW.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  initialsContainer: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  centerCol: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genderPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  genderText: {
    fontSize: 10,
    fontWeight: '600',
  },
  phoneCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  visitCountBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  visitCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  lastVisitText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  upcomingBadge: {
    backgroundColor: COLORS.info,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  upcomingBadgeText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 40,
  },
});
