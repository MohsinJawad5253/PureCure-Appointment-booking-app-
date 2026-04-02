// ─── Auth & User ──────────────────────────────────────────────
export type UserRole = 'patient' | 'doctor';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role: UserRole;
  profile_photo: string | null;
  gender: 'male' | 'female' | 'other' | '';
  date_of_birth: string | null;
  is_profile_complete: boolean;
  created_at: string;
  // Physician specific
  bio?: string;
  consultation_fee?: number | string;
  languages?: string[];
  specialty?: string;
  experience?: number;
  is_available?: boolean;
  reviews_count?: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: AuthTokens;
  };
}

// ─── Doctor & Clinic ──────────────────────────────────────────
export type Specialty =
  | 'general' | 'cardiology' | 'dermatology' | 'dental'
  | 'ophthalmology' | 'orthopedics' | 'pediatrics'
  | 'psychiatry' | 'gynecology' | 'neurology';

export interface ClinicMinimal {
  id: string;
  name: string;
  city: string;
  rating: number | string;
  distance_km: number | string;
}

export interface Clinic extends ClinicMinimal {
  address: string;
  photo: string | null;
  review_count: number;
  tags: string[];
  opening_time: string;
  closing_time: string;
  phone: string;
  phone_number?: string; // Some parts of code use this
  email: string;
  doctor_count: number;
  doctors?: Doctor[];
  description?: string;
  rating: number | string;
}

export interface DoctorClinicInfo {
  id: string;
  name: string;
  address: string;
  city: string;
  is_primary: boolean;
  consultation_fee: number | string;
}

export interface Doctor {
  id: string;
  user_id: string;
  full_name: string;
  specialty: Specialty;
  specialty_display: string;
  clinic_name: string;
  clinic: ClinicMinimal | null;
  clinics: DoctorClinicInfo[]; // New field
  years_experience: number;
  rating: number | string;
  review_count: number;
  consultation_fee: number | string;
  is_available: boolean;
  profile_photo: string | null;
  languages: string[];
  bio?: string;
}

// ─── Time Slots ───────────────────────────────────────────────
export type SlotStatus =
  | 'available' | 'booked' | 'blocked'
  | 'completed' | 'cancelled';

export interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: SlotStatus;
  slot_duration_minutes: number;
  is_available: boolean;
  is_past: boolean;
  display_time: string;
}

export interface DayAvailability {
  date: string;
  weekday: string;
  day_number: number;
  available_count: number;
  has_slots: boolean;
}

// ─── Appointments ─────────────────────────────────────────────
export type AppointmentStatus =
  | 'upcoming' | 'in_progress' | 'completed'
  | 'cancelled_by_patient' | 'cancelled_by_doctor'
  | 'no_show' | 'rescheduled';

export interface Appointment {
  id: string;
  status: AppointmentStatus;
  appointment_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  patient_notes: string;
  notes: string;
  cancellation_reason: string;
  cancelled_at: string | null;
  is_cancellable: boolean;
  is_reschedulable: boolean;
  has_review: boolean;
  created_at: string;
  updated_at: string;
  rescheduled_from: string | null;
  clinic: {
    id: string;
    name: string;
    address: string;
    city: string;
  } | null;
  doctor: {
    id: string;
    full_name: string;
    specialty: string;
    specialty_display: string;
    clinic_name: string;
    profile_photo: string | null;
    rating: number | string;
    consultation_fee: number | string;
  };
  time_slot: Pick<TimeSlot, 'id' | 'date' | 'start_time' | 'end_time' | 'display_time'>;
}

export interface AppointmentDoctor extends Omit<Appointment, 'doctor'> {
  patient: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    gender: string;
    date_of_birth: string | null;
    profile_photo: string | null;
  };
}

// ─── API Response wrappers ────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    results: T[];
    count: number;
    next: string | null;
    previous: string | null;
  };
}

// ─── Navigation params ────────────────────────────────────────
export type RootStackParamList = {
  '(auth)': undefined;
  '(patient)': undefined;
  '(doctor)': undefined;
};
