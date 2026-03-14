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
};
