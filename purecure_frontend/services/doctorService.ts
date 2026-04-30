import api from './api';
import { Doctor, PaginatedResponse, DayAvailability, TimeSlot } from '@/types';

export const doctorService = {
  async list(params?: {
    specialty?: string;
    search?: string;
    min_rating?: number;
    max_fee?: number;
    is_available?: boolean;
    ordering?: string;
    page?: number;
  }): Promise<PaginatedResponse<Doctor>> {
    const res = await api.get('/doctors/', { params });
    return res.data;
  },

  async topRated(): Promise<Doctor[]> {
    const res = await api.get('/doctors/top-rated/');
    return res.data.data?.doctors ?? res.data.data;
  },

  async detail(id: string): Promise<Doctor> {
    const res = await api.get(`/doctors/${id}/`);
    return res.data.data;
  },

  async specialties(): Promise<
    Array<{ value: string; label: string; doctor_count: number }>
  > {
    const res = await api.get('/doctors/specialties/');
    return res.data.data.specialties;
  },

  async bySpecialty(specialty: string): Promise<Doctor[]> {
    const res = await api.get(`/doctors/specialty/${specialty}/`);
    return res.data.data.results ?? res.data.data;
  },

  async weekAvailability(
    doctorId: string,
    startDate?: string
  ): Promise<DayAvailability[]> {
    const res = await api.get(`/timeslots/${doctorId}/week/`, {
      params: startDate ? { start_date: startDate } : undefined,
    });
    return res.data.data.week;
  },

  async availableSlots(
    doctorId: string,
    date: string
  ): Promise<TimeSlot[]> {
    const res = await api.get(`/timeslots/${doctorId}/slots/`, {
      params: { date },
    });
    return res.data.data.slots;
  },

  async reviews(
    doctorId: string,
    params?: { page?: number; rating?: string }
  ): Promise<{
    doctor: {
      id: string;
      full_name: string;
      specialty: string;
      profile_photo: string | null;
    };
    summary: {
      average_rating: number;
      total_reviews: number;
      breakdown: Record<string, number>;
    };
    reviews: Array<{
      id: string;
      rating: number;
      comment: string;
      is_anonymous: boolean;
      patient_name: string;
      patient_initials: string;
      time_ago: string;
      created_at: string;
    }>;
    page: number;
    total_pages: number;
    has_next: boolean;
  }> {
    const res = await api.get(
      `/doctors/${doctorId}/reviews/`,
      { params }
    );
    return res.data.data ?? res.data;
  },
};
