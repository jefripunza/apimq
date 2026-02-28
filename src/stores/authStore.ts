import { create } from "zustand";

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  validateToken: () => Promise<boolean>;
  setAuthenticated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  isAuthenticated: false,
  login: (token) => {
    localStorage.setItem("token", token);
    return set({ token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem("token");
    return set({ token: null, isAuthenticated: false });
  },
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  validateToken: async () => {
    const { token } = get();
    if (!token) {
      set({ isAuthenticated: false });
      return false;
    }
    try {
      const { authService } = await import("@/services/auth.service");
      await authService.validate();
      set({ isAuthenticated: true });
      return true;
    } catch {
      set({ isAuthenticated: false, token: null });
      return false;
    }
  },
}));
