import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Animated,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doctorService } from '@services/doctorService';
import {
  COLORS, SPACING, FONT_SIZE,
  BORDER_RADIUS, SHADOW,
} from '@constants/index';

// ── Types ──────────────────────────────────────────────────
interface Review {
  id: string;
  rating: number;
  comment: string;
  is_anonymous: boolean;
  patient_name: string;
  patient_initials: string;
  time_ago: string;
  created_at: string;
}

interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
  breakdown: Record<string, number>;
}

// ── Star display component ─────────────────────────────────
const StarRow = ({
  rating,
  size = 14,
  showNumber = false,
}: {
  rating: number;
  size?: number;
  showNumber?: boolean;
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Ionicons
        key={i}
        name={
          i <= Math.floor(rating)
            ? 'star'
            : i - rating < 1 && i - rating > 0
            ? 'star-half'
            : 'star-outline'
        }
        size={size}
        color="#F59E0B"
      />
    ))}
    {showNumber && (
      <Text style={{
        fontSize: size - 2,
        color: COLORS.textSecondary,
        marginLeft: 4,
        fontWeight: '500',
      }}>
        {rating.toFixed(1)}
      </Text>
    )}
  </View>
);

// ── Rating breakdown bar ───────────────────────────────────
const RatingBar = ({
  star,
  count,
  total,
  isSelected,
  onPress,
}: {
  star: number;
  count: number;
  total: number;
  isSelected: boolean;
  onPress: () => void;
}) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct,
      duration: 600,
      delay: (5 - star) * 80,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.ratingBarRow,
        isSelected && styles.ratingBarRowSelected,
      ]}
    >
      {/* Star number */}
      <Text style={styles.ratingBarStar}>{star}</Text>
      <Ionicons name="star" size={12} color="#F59E0B" />

      {/* Bar track */}
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: barAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: isSelected
                ? COLORS.primary
                : '#F59E0B',
            },
          ]}
        />
      </View>

      {/* Count */}
      <Text style={[
        styles.ratingBarCount,
        isSelected && { color: COLORS.primary, fontWeight: '700' },
      ]}>
        {count}
      </Text>
    </TouchableOpacity>
  );
};

// ── Review card ────────────────────────────────────────────
const ReviewCard = ({ review }: { review: Review }) => {
  console.log('Rendering ReviewCard for:', review.id);
  const [expanded, setExpanded] = useState(false);
  const isLong = review.comment?.length > 120;

  return (
    <View style={styles.reviewCard}>
      {/* Header row */}
      <View style={styles.reviewHeader}>
        {/* Avatar */}
        <View style={[
          styles.avatar,
          review.is_anonymous && styles.avatarAnon,
        ]}>
          <Text style={styles.avatarText}>
            {review.patient_initials || 'P'}
          </Text>
        </View>

        {/* Name + time */}
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>
            {review.patient_name || 'Patient'}
          </Text>
          <Text style={styles.reviewTime}>
            {review.time_ago || 'Some time ago'}
          </Text>
        </View>

        {/* Rating stars */}
        <View style={styles.reviewRating}>
          <StarRow rating={review.rating || 0} size={13} />
          <Text style={styles.reviewRatingNum}>
            {(review.rating || 0).toFixed(1)}
          </Text>
        </View>
      </View>

      {/* Comment */}
      {review.comment ? (
        <View style={styles.commentContainer}>
          <Text
            style={styles.commentText}
            numberOfLines={expanded ? undefined : 3}
          >
            {review.comment}
          </Text>
          {isLong && (
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              style={styles.readMoreBtn}
            >
              <Text style={styles.readMoreText}>
                {expanded ? 'Show less' : 'Read more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text style={styles.noCommentText}>
          No written review
        </Text>
      )}

      {/* Rating badge */}
      <View style={[
        styles.ratingBadge,
        {
          backgroundColor:
            review.rating >= 4
              ? '#D1FAE5'
              : review.rating === 3
              ? '#FEF3C7'
              : '#FEE2E2',
        },
      ]}>
        <Ionicons
          name="star"
          size={10}
          color={
            review.rating >= 4
              ? '#065F46'
              : review.rating === 3
              ? '#92400E'
              : '#991B1B'
          }
        />
        <Text style={[
          styles.ratingBadgeText,
          {
            color:
              review.rating >= 4
                ? '#065F46'
                : review.rating === 3
                ? '#92400E'
                : '#991B1B',
          },
        ]}>
          {review.rating === 5
            ? 'Excellent'
            : review.rating === 4
            ? 'Very Good'
            : review.rating === 3
            ? 'Good'
            : review.rating === 2
            ? 'Fair'
            : 'Poor'}
        </Text>
      </View>
    </View>
  );
};

// ── Skeleton card ──────────────────────────────────────────
const SkeletonReviewCard = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7, duration: 800, useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3, duration: 800, useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonAvatar} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: '40%' }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, { marginTop: 12 }]} />
      <View style={[styles.skeletonLine, { width: '70%', marginTop: 6 }]} />
    </Animated.View>
  );
};

// ── MAIN SCREEN ────────────────────────────────────────────
export default function DoctorReviewsScreen() {
  const router = useRouter();
  const { id, doctorName, specialty, profilePhoto } =
    useLocalSearchParams<{
      id: string;
      doctorName: string;
      specialty: string;
      profilePhoto?: string;
    }>();

  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedRating, setSelectedRating] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // ── Fetch reviews ────────────────────────────────────────
  const fetchReviews = useCallback(async (
    pageNum: number,
    ratingFilter: string,
    refresh = false,
  ) => {
    if (loading || (pageNum > 1 && loadingMore)) return;

    if (pageNum === 1 && !refresh) setLoading(true);
    if (pageNum > 1) setLoadingMore(true);

    console.log(`Fetching reviews for page ${pageNum}, rating ${ratingFilter}`);
    try {
      const data = await doctorService.reviews(id, {
        page: pageNum,
        rating: ratingFilter || undefined,
      });
      console.log('Reviews API response:', data);

      const newReviews = Array.isArray(data.reviews) ? data.reviews : [];

      if (pageNum === 1 || refresh) {
        setSummary(data.summary);
        setReviews(newReviews);
      } else {
        setReviews(prev => [...prev, ...newReviews]);
      }

      setHasMore(data.has_next);
      setPage(pageNum);
    } catch (err) {
      console.error('Fetch reviews error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReviews(1, selectedRating);
  }, [selectedRating]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews(1, selectedRating, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchReviews(page + 1, selectedRating);
    }
  };

  // ── Sort reviews locally ─────────────────────────────────
  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'highest') return b.rating - a.rating;
    if (sortBy === 'lowest') return a.rating - b.rating;
    return 0; // recent = already sorted from API
  });

  // ── Header component (inside FlatList) ──────────────────
  const ListHeader = () => (
    <View>
      {/* ── DOCTOR MINI CARD ──────────────────────────── */}
      <View style={styles.doctorCard}>
        {profilePhoto ? (
          <Image
            source={{ uri: profilePhoto }}
            style={styles.doctorPhoto}
            contentFit="cover"
          />
        ) : (
          <View style={styles.doctorPhotoPlaceholder}>
            <Text style={styles.doctorPhotoInitial}>
              {(doctorName ?? 'D')[0]}
            </Text>
          </View>
        )}
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>{doctorName}</Text>
          <Text style={styles.doctorSpecialty}>{specialty}</Text>
        </View>
      </View>

      {/* ── RATING SUMMARY CARD ───────────────────────── */}
      {summary && (
        <View style={styles.summaryCard}>

          {/* Big average rating */}
          <View style={styles.summaryLeft}>
            <Text style={styles.bigRating}>
              {summary.average_rating.toFixed(1)}
            </Text>
            <StarRow
              rating={summary.average_rating}
              size={20}
            />
            <Text style={styles.totalReviewsText}>
              {summary.total_reviews} review
              {summary.total_reviews !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Breakdown bars */}
          <View style={styles.summaryRight}>
            {[5, 4, 3, 2, 1].map(star => (
              <RatingBar
                key={star}
                star={star}
                count={summary.breakdown[String(star)] ?? 0}
                total={summary.total_reviews}
                isSelected={selectedRating === String(star)}
                onPress={() => {
                  setSelectedRating(
                    selectedRating === String(star)
                      ? ''
                      : String(star)
                  );
                }}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── FILTER + SORT ROW ─────────────────────────── */}
      <View style={styles.filterRow}>

        {/* Active filter pill */}
        {selectedRating ? (
          <View style={styles.activeFilter}>
            <Ionicons name="star" size={12} color={COLORS.white} />
            <Text style={styles.activeFilterText}>
              {selectedRating} star only
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedRating('')}
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.reviewsCountLabel}>
            {loading ? '...' : `${reviews.length} reviews`}
          </Text>
        )}

        {/* Sort button */}
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <Ionicons
            name="swap-vertical-outline"
            size={16}
            color={COLORS.textSecondary}
          />
          <Text style={styles.sortButtonText}>
            {sortBy === 'recent'
              ? 'Most Recent'
              : sortBy === 'highest'
              ? 'Highest First'
              : 'Lowest First'}
          </Text>
          <Ionicons
            name={showSortMenu
              ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Sort dropdown */}
      {showSortMenu && (
        <View style={styles.sortDropdown}>
          {[
            { key: 'recent', label: 'Most Recent' },
            { key: 'highest', label: 'Highest Rating First' },
            { key: 'lowest', label: 'Lowest Rating First' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.sortOption,
                sortBy === opt.key && styles.sortOptionActive,
              ]}
              onPress={() => {
                setSortBy(opt.key as any);
                setShowSortMenu(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortBy === opt.key && { color: COLORS.primary },
              ]}>
                {opt.label}
              </Text>
              {sortBy === opt.key && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={COLORS.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />
    </View>
  );

  // ── Empty state ──────────────────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="star-outline"
        size={56}
        color={COLORS.textMuted}
      />
      <Text style={styles.emptyTitle}>
        {selectedRating
          ? `No ${selectedRating}-star reviews`
          : 'No reviews yet'}
      </Text>
      <Text style={styles.emptySub}>
        {selectedRating
          ? 'Try selecting a different rating filter'
          : 'Be the first to review this doctor after your appointment'}
      </Text>
      {selectedRating && (
        <TouchableOpacity
          style={styles.clearFilterBtn}
          onPress={() => setSelectedRating('')}
        >
          <Text style={styles.clearFilterText}>
            Clear filter
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Footer (load more) ───────────────────────────────────
  const ListFooter = () => {
    if (!loadingMore) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingMoreText}>
          Loading more reviews...
        </Text>
      </View>
    );
  };

  // ── RENDER ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* Fixed header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
        {summary && (
          <View style={styles.headerRating}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.headerRatingText}>
              {summary.average_rating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.skeletonContainer}>
          {/* Skeleton summary card */}
          <View style={[styles.skeletonSummary]} />
          {[1, 2, 3].map(i => (
            <SkeletonReviewCard key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={sortedReviews}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ReviewCard review={item} />
          )}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={<ListFooter />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
        />
      )}

    </SafeAreaView>
  );
}

// ── STYLES ─────────────────────────────────────────────────
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
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  headerRatingText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: '#92400E',
  },
  listContent: {
    paddingBottom: SPACING.xxxl,
  },

  // Doctor card
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  doctorPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  doctorPhotoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorPhotoInitial: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  doctorInfo: { flex: 1 },
  doctorName: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  doctorSpecialty: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 2,
  },

  // Summary card
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    gap: SPACING.xl,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  summaryLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minWidth: 90,
  },
  bigRating: {
    fontSize: 52,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 56,
  },
  totalReviewsText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  summaryRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },

  // Rating bar row
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  ratingBarRowSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  ratingBarStar: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    width: 10,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  ratingBarCount: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    width: 20,
    textAlign: 'right',
  },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  activeFilterText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.white,
    fontWeight: '600',
  },
  reviewsCountLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  sortButtonText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sortDropdown: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.md,
    zIndex: 100,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  sortOptionActive: {
    backgroundColor: COLORS.primaryLight,
  },
  sortOptionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
  },
  divider: {
    height: SPACING.sm,
    backgroundColor: COLORS.background,
  },

  // Review card
  reviewCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOW.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarAnon: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  reviewerInfo: { flex: 1 },
  reviewerName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reviewTime: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  reviewRating: {
    alignItems: 'flex-end',
    gap: 2,
  },
  reviewRatingNum: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  commentContainer: {
    marginBottom: SPACING.sm,
  },
  commentText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  readMoreBtn: { marginTop: 4 },
  readMoreText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  noCommentText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginBottom: SPACING.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xs,
  },
  ratingBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearFilterBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  clearFilterText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: FONT_SIZE.sm,
  },

  // Load more
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  loadingMoreText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },

  // Skeleton
  skeletonContainer: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  skeletonSummary: {
    height: 140,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  skeletonCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.border,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    width: '80%',
  },
});
