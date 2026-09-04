import { create } from 'zustand';
import * as authService from '../services/authService';

const STORAGE_KEY = 'mepac_auth_session';

const getInitialSession = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.user && parsed?.role) {
        return {
          user: parsed.user,
          role: parsed.role,
          isAuthenticated: true,
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse saved session', e);
  }
  return {
    user: null,
    role: null,
    isAuthenticated: false,
  };
};

const initial = getInitialSession();

/**
 * Auth store — manages user authentication state globally with localStorage persistence.
 */
const useAuthStore = create((set) => ({
  // ── State ──────────────────────────────────────────────────
  user: initial.user,
  role: initial.role,
  isAuthenticated: initial.isAuthenticated,
  isLoading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────────
  login: async (phone, pin, forceOverride = false) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.login(phone, pin, forceOverride);
      if (res?.hasActiveSession) {
        set({ isLoading: false });
        return res;
      }

      const { user, role } = res;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, role }));
      set({
        user,
        role,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return { user, role };
    } catch (err) {
      set({
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        error: err.message,
      });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      set({
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  updateUser: (updates) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...updates };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: updatedUser, role: state.role })
      );
      return { user: updatedUser };
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
