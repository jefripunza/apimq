import { create } from "zustand";
import { authService } from "@/services/auth.service";
import type { AxiosError } from "axios";

interface AuthState {
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    password: string,
  ) => Promise<{ success: boolean; message: string | null }>;
  logout: () => Promise<{ success: boolean; message: string | null }>;
  validateToken: (on?: string) => Promise<boolean>;
  setAuthenticated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: localStorage.getItem("token") || null,
  isLoading: true,
  isAuthenticated: false,
  login: async (password) => {
    try {
      const response = await authService.login(password);
      if (response.data?.token) {
        const token = response.data.token;
        localStorage.setItem("token", token);
        set({ token, isAuthenticated: true });
        return { success: true, message: null };
      } else {
        return { success: false, message: response.message || "Login failed" };
      }
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, message: "Login failed" };
    }
  },
  logout: async () => {
    try {
      await authService.logout();
      localStorage.removeItem("token");
    } catch (error) {
      console.error("Logout failed:", error);
    }
    set({ token: null, isAuthenticated: false });
    return { success: true, message: null };
  },
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  validateToken: async (on?: string) => {
    const { token, isAuthenticated } = get();
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return false;
    }
    if (isAuthenticated) return true;
    try {
      await authService.validate(on);
      set({ isAuthenticated: true, isLoading: false });
      return true;
    } catch (err) {
      const error = err as AxiosError;
      if (error.response?.status === 401) {
        // localStorage.removeItem("token");
        set({ isAuthenticated: false, token: null, isLoading: false });
      }
      return false;
    }
  },
}));
