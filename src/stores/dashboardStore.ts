import { create } from "zustand";

export interface QueueItem {
  name: string;
  key: string;
  enabled: boolean;
  messages: number;
  consumers: number;
  publishRate: number;
  deliverRate: number;
  status: "running" | "idle" | "error";
}

export interface QueueErrorItem {
  id: string;
  at: string;
  message: string;
  detail?: string;
}

interface DashboardState {
  totalQueues: number;
  totalMessages: number;
  totalConsumers: number;
  messagesPerSecond: number;
  queues: QueueItem[];
  errorsByQueue: Record<string, QueueErrorItem[]>;
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
  queues: [
    {
      name: "order.processing",
      key: "order.processing",
      enabled: true,
      messages: 1_243,
      consumers: 3,
      publishRate: 120,
      deliverRate: 115,
      status: "running",
    },
    {
      name: "email.notifications",
      key: "email.notifications",
      enabled: true,
      messages: 892,
      consumers: 2,
      publishRate: 85,
      deliverRate: 80,
      status: "running",
    },
    {
      name: "payment.webhook",
      key: "payment.webhook",
      enabled: true,
      messages: 456,
      consumers: 1,
      publishRate: 45,
      deliverRate: 44,
      status: "running",
    },
    {
      name: "analytics.events",
      key: "analytics.events",
      enabled: true,
      messages: 12_304,
      consumers: 4,
      publishRate: 340,
      deliverRate: 320,
      status: "running",
    },
    {
      name: "user.registration",
      key: "user.registration",
      enabled: false,
      messages: 23,
      consumers: 1,
      publishRate: 5,
      deliverRate: 5,
      status: "idle",
    },
    {
      name: "inventory.sync",
      key: "inventory.sync",
      enabled: true,
      messages: 8_901,
      consumers: 0,
      publishRate: 200,
      deliverRate: 0,
      status: "error",
    },
    {
      name: "log.aggregation",
      key: "log.aggregation",
      enabled: true,
      messages: 24_573,
      consumers: 2,
      publishRate: 452,
      deliverRate: 430,
      status: "running",
    },
  ],
  errorsByQueue: {
    "inventory.sync": [
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
