import { useState, useEffect } from 'react';
import { clinicApi } from '../api/clinicApi';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('admin_access_token')
  );
  const [admin, setAdmin] = useState<any>(
    JSON.parse(localStorage.getItem('admin_info') || 'null')
  );
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await clinicApi.login(email, password);
      const { tokens, admin: adminInfo } = res.data.data;
      localStorage.setItem('admin_access_token', tokens.access);
      localStorage.setItem('admin_refresh_token', tokens.refresh);
      localStorage.setItem(
        'admin_info', JSON.stringify(adminInfo)
      );
      setAdmin(adminInfo);
      setIsAuthenticated(true);
      return { success: true };
    } catch (e: any) {
      return {
        success: false,
        message: e.response?.data?.message ?? 'Login failed',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setAdmin(null);
    window.location.href = '/login';
  };

  return { isAuthenticated, admin, login, logout, loading };
}
