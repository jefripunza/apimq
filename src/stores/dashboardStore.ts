import type { Queue, QueueError } from "@/types/queue";
import { create } from "zustand";

interface DashboardState {
  totalQueues: number;
  totalMessages: number;
  totalConsumers: number;
  messagesPerSecond: number;
  queues: Queue[];
  errorsByQueue: Record<string, QueueError[]>;
  isLoading: boolean;
  setDashboardData: (data: Partial<DashboardState>) => void;
  setLoading: (loading: boolean) => void;
  toggleQueueEnabled: (key: string, enabled: boolean) => void;
  ackQueueErrors: (key: string) => void;
  retryQueueErrors: (key: string) => void;
  ackQueueError: (key: string, errorId: string) => void;
  retryQueueError: (key: string, errorId: string) => void;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  totalQueues: 12,
  totalMessages: 48_392,
  totalConsumers: 8,
  messagesPerSecond: 1_247,
  queues: [],
  errorsByQueue: {
    test: [
      {
        id: "err_1",
        at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        message: "Webhook returned 500 Internal Server Error",
        detail: "POST /deliver -> 500",
      },
      {
        id: "err_2",
        at: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
        message: "Timeout while delivering message",
        detail: "Request timeout after 10s",
      },
      {
        id: "err_3",
        at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        message: "Connection refused",
        detail: "Connection timeout to webhook endpoint",
      },
      {
        id: "err_4",
        at: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
        message: "Invalid payload format",
        detail: "JSON parsing failed",
      },
      {
        id: "err_5",
        at: new Date(Date.now() - 1000 * 60 * 0.5).toISOString(),
        message: "Rate limit exceeded",
        detail: "Too many requests in last minute",
      },
      {
        id: "err_6",
        at: new Date(Date.now() - 1000 * 60 * 0.2).toISOString(),
        message: "Service unavailable",
        detail: "Webhook service is down",
      },
    ],
  },
  isLoading: false,
  setDashboardData: (data) => set((state) => ({ ...state, ...data })),
  setLoading: (loading) => set({ isLoading: loading }),
  toggleQueueEnabled: (key, enabled) =>
    set((state) => ({
      queues: state.queues.map((q) => (q.key === key ? { ...q, enabled } : q)),
    })),
  ackQueueErrors: (key) =>
    set((state) => ({
      errorsByQueue: {
        ...state.errorsByQueue,
        [key]: [],
      },
    })),
  retryQueueErrors: (key) =>
    set((state) => ({
      errorsByQueue: {
        ...state.errorsByQueue,
        [key]: [],
      },
    })),
  ackQueueError: (key, errorId) =>
    set((state) => ({
      errorsByQueue: {
        ...state.errorsByQueue,
        [key]: (state.errorsByQueue[key] ?? []).filter((e) => e.id !== errorId),
      },
    })),
  retryQueueError: (key, errorId) =>
    set((state) => ({
      errorsByQueue: {
        ...state.errorsByQueue,
        [key]: (state.errorsByQueue[key] ?? []).filter((e) => e.id !== errorId),
      },
    })),
}));
