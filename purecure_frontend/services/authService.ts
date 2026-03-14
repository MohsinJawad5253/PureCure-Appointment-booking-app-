import api from './api';
import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEYS } from '@constants/index';
import { AuthResponse, User } from '@types/index';

export const authService = {
  async registerPatient(data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    confirm_password: string;
    date_of_birth?: string;
    gender?: string;
  }): Promise<AuthResponse> {
    const res = await api.post('/auth/patient/register/', data);
    return res.data;
  },

  async registerDoctor(data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    confirm_password: string;
    specialty: string;
    clinic_name: string;
    years_experience: number;
    license_number: string;
    bio?: string;
  }): Promise<AuthResponse> {
    const res = await api.post('/auth/doctor/register/', data);
    return res.data;
  },

  async login(data: {
    email: string;
    password: string;
    role: 'patient' | 'doctor';
  }): Promise<AuthResponse> {
    const res = await api.post('/auth/login/', data);
    return res.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout/', { refresh: refreshToken });
  },

  async getMe(): Promise<User> {
    const res = await api.get('/auth/me/');
    return res.data.data;
  },

  async updateProfile(data: FormData): Promise<User> {
    const res = await api.patch('/auth/me/update/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async changePassword(data: {
    old_password: string;
    new_password: string;
    confirm_new_password: string;
  }): Promise<void> {
    await api.post('/auth/change-password/', data);
  },

  // Token helpers
  async saveTokens(access: string, refresh: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN, access),
      SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, refresh),
    ]);
  },

  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(SECURE_STORE_KEYS.USER),
    ]);
  },

  async getStoredUser(): Promise<User | null> {
    const raw = await SecureStore.getItemAsync(SECURE_STORE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },

  async saveUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(
      SECURE_STORE_KEYS.USER,
      JSON.stringify(user)
    );
  },
};
