import { create } from "zustand";
import {
  queueService,
  type QueueApi,
  type CreateQueuePayload,
  type UpdateQueuePayload,
} from "@/services/queue.service";
import type { AxiosError } from "axios";
import type { Queue } from "@/types/queue";
import { safeJsonParse } from "@/utils/data";

function mapQueueApiToItem(q: QueueApi): Queue {
  const batchCount = q.batch_count ?? 1;
  const schema = (q.schema ?? "").toLowerCase();
  const schemaConfig = safeJsonParse<Record<string, unknown>>(
    q.schema_config,
    {},
  );

  let throughput_sec = "1";
  if (schema === "delay") {
    const random = Boolean((schemaConfig as { random?: unknown }).random);
    if (!random) {
      const sec = Number((schemaConfig as { sec?: unknown }).sec ?? 0);
      throughput_sec = `${batchCount}/${Math.max(1, sec || 1)}s`;
    } else {
      const min = Number((schemaConfig as { min?: unknown }).min ?? 1);
      const max = Number((schemaConfig as { max?: unknown }).max ?? min);
      const a = Math.max(1, Math.min(min || 1, max || 1));
      const b = Math.max(a, max || a);
      throughput_sec = `${batchCount}/${a}-${b}s`;
    }
  } else if (schema === "timing") {
    const datetime = String(
      (schemaConfig as { datetime?: unknown }).datetime ?? "",
    );
    let date = datetime;
    try {
      const d = new Date(datetime);
      if (!Number.isNaN(d.getTime())) {
        date = d.toISOString().slice(0, 10).replaceAll("-", "/");
      }
    } catch {
      // keep raw
    }
    throughput_sec = `${batchCount} on ${date}`;
  } else {
    throughput_sec = `${batchCount}/1s`;
  }

  return {
    id: q.id,
    name: q.name,
    key: q.key,
    color: q.color,
    enabled: q.enabled,
    messages: q.messages ?? 0,
    consumers: 0,
    batch_count: batchCount,
    throughput_sec,
    deliverRate: 0,
    status: q.enabled ? "running" : "idle",
    origin: q.origin,
    batchCount: batchCount,
    timeout: q.timeout ?? 30,
    headers: safeJsonParse<Array<{ key: string; value: string }>>(
      q.headers,
      [],
    ),
    schema: q.schema,
    schemaConfig,
    errorTrace: safeJsonParse<Record<string, unknown>>(q.error_trace, {}),
    createdAt: q.created_at,
    updatedAt: q.updated_at,
  };
}

interface QueueState {
  items: Queue[];
  isLoading: boolean;
  error: string | null;

  fetchAll: () => Promise<boolean>;
  fetchByKey: (key: string) => Promise<Queue | null>;
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
        const resp = await queueService.getAll();
        if (resp.data) {
          set({ items: resp.data.map(mapQueueApiToItem), isLoading: false });
        } else {
          set({ isLoading: false });
        }
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
