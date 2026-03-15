import api from './api';

export const dashboardService = {
  async dailyAgenda(date?: string, tab?: string) {
    const res = await api.get('/dashboard/agenda/', {
      params: { date, tab },
    });
    return res.data.data;
  },

  async weekAgenda(startDate?: string) {
    const res = await api.get('/dashboard/agenda/week/', {
      params: startDate ? { start_date: startDate } : undefined,
    });
    return res.data.data;
  },

  async upcomingToday() {
    const res = await api.get('/dashboard/agenda/upcoming-today/');
    return res.data.data;
  },

  async stats() {
    const res = await api.get('/dashboard/stats/');
    return res.data.data;
  },

  async earnings() {
    const res = await api.get('/dashboard/earnings/');
    return res.data.data;
  },

  async patientList(params?: {
    search?: string;
    ordering?: string;
    page?: number;
  }) {
    const res = await api.get('/dashboard/patients/', { params });
    return res.data.data ?? res.data;
  },

  async patientDetail(patientId: string) {
    const res = await api.get(`/dashboard/patients/${patientId}/`);
    return res.data.data;
  },

  async searchPatients(q: string) {
    const res = await api.get('/dashboard/patients/search/', { params: { q } });
    return res.data.data;
  },

  async notifications() {
    const res = await api.get('/dashboard/notifications/');
    return res.data.data;
  },

  async getProfile() {
    const res = await api.get('/dashboard/profile/');
    return res.data.data;
  },

  async updateProfile(data: FormData) {
    const res = await api.patch('/dashboard/profile/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async toggleAvailability(is_available: boolean) {
    const res = await api.patch('/dashboard/profile/availability/', {
      is_available,
    });
    return res.data.data;
  },
};
