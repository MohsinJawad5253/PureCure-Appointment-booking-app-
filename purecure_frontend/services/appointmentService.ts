import api from './api';
import { Appointment, AppointmentDoctor, PaginatedResponse } from '@types/index';

export const appointmentService = {
  // Patient
  async book(data: {
    doctor_id: string;
    slot_id: string;
    reason?: string;
    patient_notes?: string;
  }): Promise<Appointment> {
    const res = await api.post('/appointments/', data);
    return res.data.data;
  },

  async myList(params?: {
    status?: string;
    date?: string;
    ordering?: string;
    page?: number;
  }): Promise<PaginatedResponse<Appointment>> {
    const res = await api.get('/appointments/my/', { params });
    return res.data;
  },

  async myDetail(id: string): Promise<Appointment> {
    const res = await api.get(`/appointments/my/${id}/`);
    return res.data.data;
  },

  async cancel(
    id: string,
    reason?: string
  ): Promise<Appointment> {
    const res = await api.patch(`/appointments/my/${id}/cancel/`, {
      cancellation_reason: reason ?? '',
    });
    return res.data.data;
  },

  async reschedule(
    id: string,
    newSlotId: string
  ): Promise<Appointment> {
    const res = await api.patch(`/appointments/my/${id}/reschedule/`, {
      new_slot_id: newSlotId,
    });
    return res.data.data;
  },

  async submitReview(
    id: string,
    data: { rating: number; comment?: string; is_anonymous?: boolean }
  ): Promise<void> {
    await api.post(`/appointments/my/${id}/review/`, data);
  },

  // Doctor
  async doctorList(params?: {
    status?: string;
    date?: string;
    patient_name?: string;
    ordering?: string;
    page?: number;
  }): Promise<PaginatedResponse<AppointmentDoctor>> {
    const res = await api.get('/appointments/doctor/', { params });
    return res.data;
  },

  async doctorDetail(id: string): Promise<AppointmentDoctor> {
    const res = await api.get(`/appointments/doctor/${id}/`);
    return res.data.data;
  },

  async complete(id: string, notes?: string): Promise<AppointmentDoctor> {
    const res = await api.patch(`/appointments/doctor/${id}/complete/`, {
      notes: notes ?? '',
    });
    return res.data.data;
  },

  async noShow(id: string): Promise<AppointmentDoctor> {
    const res = await api.patch(`/appointments/doctor/${id}/no-show/`);
    return res.data.data;
  },

  async doctorCancel(id: string, reason?: string): Promise<AppointmentDoctor> {
    const res = await api.patch(`/appointments/doctor/${id}/cancel/`, {
      cancellation_reason: reason ?? '',
    });
    return res.data.data;
  },

  async updateNotes(id: string, notes: string): Promise<AppointmentDoctor> {
    const res = await api.patch(`/appointments/doctor/${id}/notes/`, { notes });
    return res.data.data;
  },

  // Preview which appointments will be cancelled
  async bulkCancelPreview(params: {
    date: string;       // "2026-03-17"
    start_time: string; // "09:00:00"
    end_time: string;   // "13:00:00"
  }): Promise<{
    date: string;
    start_time: string;
    end_time: string;
    affected_count: number;
    appointments: Array<{
      id: string;
      patient_name: string;
      patient_email: string;
      start_time: string;
      end_time: string;
      display_time: string;
      reason: string;
      has_push_token: boolean;
    }>;
  }> {
    const res = await api.get(
      '/appointments/doctor/bulk-cancel/preview/',
      { params }
    );
    return res.data.data ?? res.data;
  },

  // Execute bulk cancellation
  async bulkCancel(data: {
    date: string;
    start_time: string;
    end_time: string;
    reason?: string;
  }): Promise<{
    cancelled_count: number;
    notified_count: number;
    failed_notifications: number;
    cancelled_appointments: any[];
    message: string;
  }> {
    const res = await api.post(
      '/appointments/doctor/bulk-cancel/',
      data
    );
    return res.data.data ?? res.data;
  },
};
