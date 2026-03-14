import { format, parseISO, isToday, isTomorrow } from 'date-fns';

export const formatDate = (dateStr: string): string => {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  } catch {
    return dateStr;
  }
};

export const formatTime = (timeStr: string): string => {
  // "09:00:00" → "9:00 AM"
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
};

export const formatTimeRange = (start: string, end: string): string =>
  `${formatTime(start)} – ${formatTime(end)}`;

export const formatCurrency = (amount: number | string): string => {
  const num = parseFloat(String(amount || 0));
  return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN')}`;
};

// Safe rating display — handles string "4.9" or number 4.9 or undefined
export const formatRating = (rating: any): string => {
  const num = parseFloat(String(rating || 0));
  return isNaN(num) ? '0.0' : num.toFixed(1);
};

// Safe currency — handles string "800.00" or number 800
export const formatFee = (fee: any): string => {
  const num = parseFloat(String(fee || 0));
  return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN')}`;
};

export const formatDoctorName = (fullName: string): string => {
  // Remove duplicate "Dr." prefix if backend already includes it
  const cleaned = fullName.replace(/^Dr\.\s*/i, '');
  return `Dr. ${cleaned}`;
};

export const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const truncate = (str: string, maxLength: number): string =>
  str.length > maxLength ? `${str.slice(0, maxLength)}…` : str;

export const extractAxiosError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any;
    const data = axiosError.response?.data;
    if (data?.errors) {
      const firstKey = Object.keys(data.errors)[0];
      const msg = data.errors[firstKey];
      return Array.isArray(msg) ? msg[0] : String(msg);
    }
    return data?.message ?? 'An error occurred';
  }
  return 'An error occurred';
};
