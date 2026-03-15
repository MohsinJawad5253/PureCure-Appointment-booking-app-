import api from './api';

export const timeslotService = {
  async getSchedule() {
    const res = await api.get('/timeslots/schedule/');
    return res.data.data ?? res.data;
  },

  async createSchedule(data: {
    weekday: number;
    start_time: string;
    end_time: string;
    slot_duration_minutes: number;
  }) {
    const res = await api.post('/timeslots/schedule/', data);
    return res.data.data ?? res.data;
  },

  async updateSchedule(id: string, data: Partial<{
    start_time: string;
    end_time: string;
    slot_duration_minutes: number;
    is_active: boolean;
  }>) {
    const res = await api.patch(`/timeslots/schedule/${id}/`, data);
    return res.data.data ?? res.data;
  },

  async deleteSchedule(id: string) {
    await api.delete(`/timeslots/schedule/${id}/`);
  },

  async getBlockedDates() {
    const res = await api.get('/timeslots/blocked-dates/');
    return res.data.data ?? res.data;
  },

  async blockDate(data: {
    date: string;
    reason?: string;
    block_entire_day: boolean;
    block_start_time?: string;
    block_end_time?: string;
  }) {
    const res = await api.post('/timeslots/blocked-dates/', data);
    return res.data.data ?? res.data;
  },

  async unblockDate(id: string) {
    await api.delete(`/timeslots/blocked-dates/${id}/`);
  },

  async generateSlots(daysAhead = 14) {
    const res = await api.post('/timeslots/generate/', { days_ahead: daysAhead });
    return res.data.data ?? res.data;
  },
};
