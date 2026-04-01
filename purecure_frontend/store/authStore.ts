import { create } from 'zustand';
import { User, AuthTokens, UserRole } from '@app-types/index';
import { authService } from '@services/authService';
import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEYS } from '@constants/index';

interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;  // true once we've checked SecureStore on app start

  // Actions
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  registerPatient: (data: any) => Promise<void>;
  registerDoctor: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  isHydrated: false,

  setLoading: (loading) => set({ isLoading: loading }),

  // ── Hydrate on app start ─────────────────────────────────────
  hydrate: async () => {
    try {
      const [accessToken, refreshToken, rawUser] = await Promise.all([
        SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN),
        SecureStore.getItemAsync(SECURE_STORE_KEYS.USER),
      ]);

      if (accessToken && refreshToken && rawUser) {
        const user: User = JSON.parse(rawUser);
        set({
          user,
          tokens: { access: accessToken, refresh: refreshToken },
          isAuthenticated: true,
          isHydrated: true,
        });

        // Refresh user data from server in background
        try {
          const freshUser = await authService.getMe();
          await authService.saveUser(freshUser);
          set({ user: freshUser });
        } catch {
          // Token might be expired — interceptor will handle refresh
        }
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  // ── Login ────────────────────────────────────────────────────
  login: async (email, password, role) => {
    set({ isLoading: true });
    try {
      const response = await authService.login({ email, password, role });
      const { user, tokens } = response.data;

      await authService.saveTokens(tokens.access, tokens.refresh);
      await authService.saveUser(user);

      set({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // ── Register Patient ─────────────────────────────────────────
  registerPatient: async (data) => {
    set({ isLoading: true });
    try {
      const response = await authService.registerPatient(data);
      const { user, tokens } = response.data;

      await authService.saveTokens(tokens.access, tokens.refresh);
      await authService.saveUser(user);

      set({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // ── Register Doctor ──────────────────────────────────────────
  registerDoctor: async (data) => {
    set({ isLoading: true });
    try {
      const response = await authService.registerDoctor(data);
      const { user, tokens } = response.data;

      await authService.saveTokens(tokens.access, tokens.refresh);
      await authService.saveUser(user);

      set({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // ── Logout ───────────────────────────────────────────────────
  logout: async () => {
    set({ isLoading: true });
    try {
      const { tokens } = get();
      if (tokens?.refresh) {
        await authService.logout(tokens.refresh).catch(() => {});
      }
    } finally {
      await authService.clearTokens();
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // ── Update user fields locally ───────────────────────────────
  updateUser: (partial) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    set({ user: updated });
    authService.saveUser(updated).catch(() => {});
  },

  // ── Called by Axios interceptor when refresh fails ───────────
  clearAuth: () => {
    set({
      user: null,
      tokens: null,
      isAuthenticated: false,
    });
  },
}));
