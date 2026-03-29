import axios from 'axios';

const BASE_URL =
  'https://purecure-appointment-booking-app-g5ua.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  // Render free tier has cold starts up to 60s — use 60s timeout
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — redirect to login (but not if already there)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
