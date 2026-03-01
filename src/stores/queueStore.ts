import { create } from "zustand";
import {
  queueService,
  type QueueApi,
  type CreateQueuePayload,
  type UpdateQueuePayload,
} from "@/services/queue.service";
import type { AxiosError } from "axios";

export type QueueItem = {
  id: string;
  name: string;
  key: string;
  color: string;
  enabled: boolean;
  messages: number;
  consumers: number;
  publishRate: number;
  deliverRate: number;
  status: "running" | "idle" | "error";
  origin: string;
  batchCount: number;
  headers: Array<{ key: string; value: string }>;
  schema: string;
  schemaConfig: Record<string, unknown>;
  errorTrace: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

function safeJsonParse<T>(input: string | null | undefined, fallback: T): T {
  if (!input) return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

function mapQueueApiToItem(q: QueueApi): QueueItem {
  return {
    id: q.id,
    name: q.name,
    key: q.key,
    color: q.color,
    enabled: q.enabled,
    messages: 0,
    consumers: 0,
    publishRate: 0,
    deliverRate: 0,
    status: q.enabled ? "running" : "idle",
    origin: q.origin,
    batchCount: q.batch_count,
    headers: safeJsonParse<Array<{ key: string; value: string }>>(
      q.headers,
      [],
    ),
    schema: q.schema,
    schemaConfig: safeJsonParse<Record<string, unknown>>(q.schema_config, {}),
    errorTrace: safeJsonParse<Record<string, unknown>>(q.error_trace, {}),
    createdAt: q.created_at,
    updatedAt: q.updated_at,
  };
}

interface QueueState {
  items: QueueItem[];
  isLoading: boolean;
  error: string | null;

  fetchAll: () => Promise<boolean>;
  fetchByKey: (key: string) => Promise<QueueItem | null>;
  checkKeyAvailable: (key: string) => Promise<boolean>;
  create: (payload: CreateQueuePayload) => Promise<boolean>;
  update: (key: string, payload: UpdateQueuePayload) => Promise<boolean>;
  remove: (key: string) => Promise<boolean>;
  toggleEnabled: (key: string, enabled: boolean) => Promise<boolean>;
}

export const useQueueStore = create<QueueState>()((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await queueService.getAll();
      const items = (res.data ?? []).map(mapQueueApiToItem);
      set({ items, isLoading: false });
      return true;
    } catch (err: unknown) {
      const e = err as AxiosError;
      const msg =
        (e.response?.data as { message?: string } | undefined)?.message ??
        "Failed to load queues";
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  fetchByKey: async (key: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await queueService.getByKey(key);
      if (!res.data) {
        set({ isLoading: false });
        return null;
      }
      const item = mapQueueApiToItem(res.data);
      set({
        items: [item, ...get().items.filter((q) => q.key !== key)],
        isLoading: false,
      });
      return item;
    } catch (err: unknown) {
      const e = err as AxiosError;
      const msg =
        (e.response?.data as { message?: string } | undefined)?.message ??
        "Failed to load queue";
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  checkKeyAvailable: async (key: string) => {
    try {
      await queueService.getByKey(key);
      return false;
    } catch (err: unknown) {
      const e = err as AxiosError;
      if (e.response?.status === 404) return true;
      return true;
    }
  },

  create: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await queueService.create(payload);
      if (res.data) {
        const created = mapQueueApiToItem(res.data);
        set({ items: [created, ...get().items], isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return true;
    } catch (err: unknown) {
      const e = err as AxiosError;
      const msg =
        (e.response?.data as { message?: string } | undefined)?.message ??
        "Failed to create queue";
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  update: async (key, payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await queueService.update(key, payload);
      if (res.data) {
        const updated = mapQueueApiToItem(res.data);
        set({
          items: get().items.map((q) => (q.key === key ? updated : q)),
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
      return true;
    } catch (err: unknown) {
      const e = err as AxiosError;
      const msg =
        (e.response?.data as { message?: string } | undefined)?.message ??
        "Failed to update queue";
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  remove: async (key) => {
    set({ isLoading: true, error: null });
    try {
      await queueService.remove(key);
      set({
        items: get().items.filter((q) => q.key !== key),
        isLoading: false,
      });
      return true;
    } catch (err: unknown) {
      const e = err as AxiosError;
      const msg =
        (e.response?.data as { message?: string } | undefined)?.message ??
        "Failed to delete queue";
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  toggleEnabled: async (key, enabled) => {
    // optimistic update
    const prev = get().items;
    set({ items: prev.map((q) => (q.key === key ? { ...q, enabled } : q)) });
    try {
      const res = await queueService.toggleEnabled(key, enabled);
      if (res.data) {
        const updated = mapQueueApiToItem(res.data);
        set({ items: get().items.map((q) => (q.key === key ? updated : q)) });
      }
      return true;
    } catch (err: unknown) {
      // rollback
      set({ items: prev });
      const e = err as AxiosError;
      const msg =
        (e.response?.data as { message?: string } | undefined)?.message ??
        "Failed to toggle queue";
      set({ error: msg });
      return false;
    }
  },
}));
