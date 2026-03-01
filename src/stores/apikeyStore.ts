import { create } from "zustand";
import { apikeyService, type ApiKeyApi } from "@/services/apikey.service";

interface ApiKeyState {
  keys: ApiKeyApi[];
  isLoading: boolean;
  fetchAll: () => Promise<void>;
  addKey: (payload: { name: string; expires_at?: string }) => Promise<boolean>;
  toggleKey: (id: string, is_active: boolean) => Promise<boolean>;
  removeKey: (id: string) => Promise<boolean>;
}

export const useApiKeyStore = create<ApiKeyState>()((set) => ({
  keys: [],
  isLoading: false,
  fetchAll: async () => {
    set({ isLoading: true });
    try {
      const res = await apikeyService.getAll();
      set({ keys: (res.data as ApiKeyApi[]) ?? [] });
    } catch (err) {
      console.error("Failed to fetch API keys:", err);
    } finally {
      set({ isLoading: false });
    }
  },
  addKey: async (payload) => {
    try {
      const res = await apikeyService.create(payload);
      if (res.data) {
        set((state) => ({ keys: [res.data as ApiKeyApi, ...state.keys] }));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to create API key:", err);
      return false;
    }
  },
  toggleKey: async (id, is_active) => {
    try {
      const res = await apikeyService.toggle(id, is_active);
      if (res.data) {
        set((state) => ({
          keys: state.keys.map((k) =>
            k.id === id ? { ...k, is_active } : k,
          ),
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to toggle API key:", err);
      return false;
    }
  },
  removeKey: async (id) => {
    try {
      await apikeyService.remove(id);
      set((state) => ({
        keys: state.keys.filter((k) => k.id !== id),
      }));
      return true;
    } catch (err) {
      console.error("Failed to remove API key:", err);
      return false;
    }
  },
}));
