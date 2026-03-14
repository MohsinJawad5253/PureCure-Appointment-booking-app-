export const COLORS = {
  // Brand
  primary: '#E8184A',
  primaryLight: '#FEF0F4',
  primaryMid: '#FDDAE3',

  // Neutrals
  white: '#FFFFFF',
  black: '#111827',
  background: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Text
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textWhite: '#FFFFFF',

  // Semantic
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  // Status badges
  upcoming: '#3B82F6',
  upcomingBg: '#DBEAFE',
  completed: '#10B981',
  completedBg: '#D1FAE5',
  cancelled: '#6B7280',
  cancelledBg: '#F3F4F6',
  emergency: '#E8184A',
  emergencyBg: '#FEF0F4',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  huge: 32,
} as const;

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Reusable style objects — import these anywhere
export const COMMON_STYLES = {
  // Containers
  screenContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  // Input
  inputContainer: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  inputFocused: {
    borderColor: '#E8184A',
    backgroundColor: '#FEF0F4',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  // Buttons
  primaryButton: {
    backgroundColor: '#E8184A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    backgroundColor: '#FEF0F4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1.5,
    borderColor: '#E8184A',
  },
  secondaryButtonText: {
    color: '#E8184A',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  // Typography
  heading1: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  heading2: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  bodyText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  captionText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  // Row layouts
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
} as const;

// Keep the rest of your existing constants below
export const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const SECURE_STORE_KEYS = {
  ACCESS_TOKEN: 'purecure_access_token',
  REFRESH_TOKEN: 'purecure_refresh_token',
  USER: 'purecure_user',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  upcoming: '#3B82F6',
  in_progress: '#F59E0B',
  completed: '#10B981',
  cancelled_by_patient: '#6B7280',
  cancelled_by_doctor: '#6B7280',
  no_show: '#EF4444',
  rescheduled: '#8B5CF6',
};

export const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled_by_patient: 'Cancelled',
  cancelled_by_doctor: 'Cancelled by Doctor',
  no_show: 'No Show',
  rescheduled: 'Rescheduled',
};

export const SPECIALTY_ICONS: Record<string, string> = {
  general: 'medical',
  cardiology: 'heart',
  dermatology: 'sunny',
  dental: 'happy',
  ophthalmology: 'eye',
  orthopedics: 'body',
  pediatrics: 'people',
  psychiatry: 'flash',
  gynecology: 'female',
  neurology: 'flash',
};