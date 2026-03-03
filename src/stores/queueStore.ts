import { create } from "zustand";
import {
  queueService,
  type QueueApi,
  type QueueMessageApi,
  type CreateQueuePayload,
  type UpdateQueuePayload,
} from "@/services/queue.service";
import type { AxiosError } from "axios";
import type { Queue } from "@/types/queue";
import { safeJsonParse } from "@/utils/data";

function mapQueueApiToItem(q: QueueApi): Queue {
  const batchCount = q.batch_count ?? 1;

  // Compute throughput_sec from new explicit fields
  let throughput_sec = `${batchCount}/1s`;

  // Delay display
  if (q.is_random_delay) {
    const min = Math.max(1, q.delay_start || 1);
    const max = Math.max(min, q.delay_end || min);
    throughput_sec = `${batchCount}/${min}-${max}s`;
  } else if (q.delay_sec > 0) {
    throughput_sec = `${batchCount}/${q.delay_sec}s`;
  }

  // Timing display (append if not send now)
  if (!q.is_send_now && q.send_later_time) {
    let time = q.send_later_time;
    try {
      const d = new Date(q.send_later_time);
      if (!Number.isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        time = `${hh}:${mm}`;
      }
    } catch {
      // keep raw
    }
    throughput_sec = `${throughput_sec} at ${time}`;
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
    completedCount: q.completed_count ?? 0,
    failedCount: q.failed_count ?? 0,
    status: q.enabled ? "running" : "idle",
    origin: q.origin,
    batchCount: batchCount,
    timeout: q.timeout ?? 30,
    headers: safeJsonParse<Array<{ key: string; value: string }>>(
      q.headers,
      [],
    ),
    isSendNow: q.is_send_now,
    sendLaterTime: q.send_later_time ?? undefined,
    isUseDelay: q.is_use_delay,
    isRandomDelay: q.is_random_delay,
    delaySec: q.delay_sec,
    delayStart: q.delay_start,
    delayEnd: q.delay_end,
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
  fetchById: (id: string) => Promise<Queue | null>;
  checkKeyAvailable: (key: string) => Promise<boolean>;
  create: (payload: CreateQueuePayload) => Promise<boolean>;
  update: (id: string, payload: UpdateQueuePayload) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  toggleEnabled: (id: string, enabled: boolean) => Promise<boolean>;
  updateQueuePartial: (id: string, partial: Partial<Queue>) => void;
  sendTestMessage: (
    json: Record<string, unknown>,
    apiKey?: string,
  ) => Promise<boolean>;
  getFailedMessages: (id: string) => Promise<QueueMessageApi[]>;
  retryMessage: (messageId: string) => Promise<boolean>;
  ackMessage: (messageId: string) => Promise<boolean>;
  updateMessage: (
    messageId: string,
    payload: { method: string; query?: string; body: string; headers?: string },
  ) => Promise<boolean>;
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

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await queueService.getById(id);
      if (!res.data) {
        set({ isLoading: false });
        return null;
      }
      const item = mapQueueApiToItem(res.data);
      set({
        items: [item, ...get().items.filter((q) => q.id !== id)],
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
      await queueService.create(payload);
      const resp = await queueService.getAll();
      if (resp.data) {
        set({ items: resp.data.map(mapQueueApiToItem), isLoading: false });
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

  update: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await queueService.update(id, payload);
      if (res.data) {
        const updated = mapQueueApiToItem(res.data);
        set({
          items: get().items.map((q) => (q.id === id ? updated : q)),
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

  remove: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await queueService.remove(id);
      set({
        items: get().items.filter((q) => q.id !== id),
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

  toggleEnabled: async (id, enabled) => {
    // optimistic update
    const prev = get().items;
    set({ items: prev.map((q) => (q.id === id ? { ...q, enabled } : q)) });
    try {
      const res = await queueService.toggleEnabled(id, enabled);
      if (res.data) {
        const resp = await queueService.getAll();
        if (resp.data) {
          set({ items: resp.data.map(mapQueueApiToItem), isLoading: false });
        } else {
          set({ isLoading: false });
        }
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

  sendTestMessage: async (json: Record<string, unknown>, apiKey?: string) => {
    try {
      await queueService.sendTestMessage(json, apiKey);
      return true;
    } catch (err: unknown) {
      const e = err as AxiosError;
      const msg =
        (e.response?.data as { message?: string } | undefined)?.message ??
        "Failed to send test message";
      set({ error: msg });
      return false;
    }
  },

  getFailedMessages: async (id: string) => {
    try {
      const res = await queueService.getFailedMessages(id);
      return res.data ?? [];
    } catch (err: unknown) {
      const e = err as AxiosError;
      const msg =
        (e.response?.data as { message?: string } | undefined)?.message ??
        "Failed to get failed messages";
      set({ error: msg });
      return [];
    }
  },

  retryMessage: async (messageId: string) => {
    try {
      const res = await queueService.retryMessage(messageId);
      if (res.status === 200) {
        await get().fetchAll();
        return true;
      }
      return false;
    } catch (err: unknown) {
      const e = err as AxiosError;
      const msg =
        (e.response?.data as { message?: string } | undefined)?.message ??
        "Failed to retry message";
      set({ error: msg });
      return false;
    }
  },

  ackMessage: async (messageId: string) => {
    try {
      const res = await queueService.ackMessage(messageId);
      if (res.status === 200) {
        await get().fetchAll();
        return true;
      }
      return false;
    } catch (err: unknown) {
      const e = err as AxiosError;
      const msg =
        (e.response?.data as { message?: string } | undefined)?.message ??
        "Failed to acknowledge message";
      set({ error: msg });
      return false;
    }
  },

  updateMessage: async (messageId, payload) => {
    try {
      const res = await queueService.updateMessage(messageId, payload);
      if (res.status === 200) {
        return true;
      }
      return false;
    } catch (err: unknown) {
      const e = err as AxiosError;
      const msg =
        (e.response?.data as { message?: string } | undefined)?.message ??
        "Failed to update message";
      set({ error: msg });
      return false;
    }
  },

  updateQueuePartial: (id: string, partial: Partial<Queue>) => {
    set({
      items: get().items.map((q) => (q.id === id ? { ...q, ...partial } : q)),
    });
  },
}));
