import api from './api';
import { Clinic } from '@/types';

export const clinicService = {
  async topRated(): Promise<Clinic[]> {
    const res = await api.get('/clinics/top-rated/');
    // Based on user prompt, might be in data.clinics or direct data
    return res.data.data?.clinics ?? res.data.data;
  },
  
  async list(params?: { search?: string; ordering?: string }): Promise<any> {
    const res = await api.get('/clinics/', { params });
    return res.data;
  },
  
  async detail(id: string): Promise<Clinic> {
    const res = await api.get(`/clinics/${id}/`);
    return res.data.data;
  },
};
