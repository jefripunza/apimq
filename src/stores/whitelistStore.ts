import { create } from "zustand";
import {
  whitelistService,
  type WhitelistApi,
} from "@/services/whitelist.service";

interface WhitelistState {
  entries: WhitelistApi[];
  isLoading: boolean;
  fetchAll: () => Promise<void>;
  addEntry: (payload: {
    type: "ip" | "domain";
    value: string;
    label?: string;
  }) => Promise<boolean>;
  removeEntry: (id: string) => Promise<boolean>;
}

export const useWhitelistStore = create<WhitelistState>()((set) => ({
  entries: [],
  isLoading: false,
  fetchAll: async () => {
    set({ isLoading: true });
    try {
      const res = await whitelistService.getAll();
      set({ entries: (res.data as WhitelistApi[]) ?? [] });
    } catch (err) {
      console.error("Failed to fetch whitelist:", err);
    } finally {
      set({ isLoading: false });
    }
  },
  addEntry: async (payload) => {
    try {
      const res = await whitelistService.create(payload);
      if (res.data) {
        set((state) => ({ entries: [res.data as WhitelistApi, ...state.entries] }));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to create whitelist entry:", err);
      return false;
    }
  },
  removeEntry: async (id) => {
    try {
      await whitelistService.remove(id);
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
      }));
      return true;
    } catch (err) {
      console.error("Failed to remove whitelist entry:", err);
      return false;
    }
  },
}));
