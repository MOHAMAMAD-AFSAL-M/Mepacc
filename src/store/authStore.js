import { create } from 'zustand';
import * as authService from '../services/authService';

/**
 * Auth store — manages user authentication state globally.
 *
 * State:
 *   user            – the logged-in user object (null when logged out)
 *   role            – 'technician' | 'foreman' | 'supervisor' | null
 *   isAuthenticated – boolean shortcut
 *   isLoading       – true while login/logout is in flight
 *   error           – last auth error message, or null
 *
 * Actions:
 *   login(email, password) – authenticates and sets state
 *   logout()               – clears state
 *   clearError()           – clears the error message
 */
const useAuthStore = create((set) => ({
  // ── State ──────────────────────────────────────────────────
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────────
  login: async (phone, pin) => {
    set({ isLoading: true, error: null });
    try {
      const { user, role } = await authService.login(phone, pin);
      set({
        user,
        role,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return { user, role }; // caller can use this to navigate
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
    await authService.logout();
    set({
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  setInitialPin: async (newPin) => {
    set({ isLoading: true, error: null });
    try {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) throw new Error('No active user session');
      const { user } = await authService.setInitialPin(currentUser.id, newPin);
      set({ user, isLoading: false, error: null });
      return user;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
