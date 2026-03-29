import api from './axios';

export const clinicApi = {
  login: (email: string, password: string) =>
    api.post('/clinic-admin/login/', { email, password }),

  dashboard: () =>
    api.get('/clinic-admin/dashboard/'),

  patients: (params?: {
    search?: string;
    page?: number;
  }) => api.get('/clinic-admin/patients/', { params }),

  patientDetail: (id: string) =>
    api.get(`/clinic-admin/patients/${id}/`),

  appointments: (params?: {
    status?: string;
    date?: string;
    doctor_id?: string;
    search?: string;
    page?: number;
  }) => api.get('/clinic-admin/appointments/', { params }),

  doctors: () =>
    api.get('/clinic-admin/doctors/'),

  reviews: (params?: {
    doctor_id?: string;
    rating?: string;
    page?: number;
  }) => api.get('/clinic-admin/reviews/', { params }),

  reportData: (params: {
    date_from: string;
    date_to: string;
  }) => api.get('/clinic-admin/report-data/', { params }),
};
