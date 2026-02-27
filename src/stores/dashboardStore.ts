import { create } from "zustand";

export interface QueueItem {
  name: string;
  key: string;
  messages: number;
  consumers: number;
  publishRate: number;
  deliverRate: number;
  status: "running" | "idle" | "error";
}

interface DashboardState {
  totalQueues: number;
  totalMessages: number;
  totalConsumers: number;
  messagesPerSecond: number;
  queues: QueueItem[];
  isLoading: boolean;
  setDashboardData: (data: Partial<DashboardState>) => void;
  setLoading: (loading: boolean) => void;
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
      messages: 1_243,
      consumers: 3,
      publishRate: 120,
      deliverRate: 115,
      status: "running",
    },
    {
      name: "email.notifications",
      key: "email.notifications",
      messages: 892,
      consumers: 2,
      publishRate: 85,
      deliverRate: 80,
      status: "running",
    },
    {
      name: "payment.webhook",
      key: "payment.webhook",
      messages: 456,
      consumers: 1,
      publishRate: 45,
      deliverRate: 44,
      status: "running",
    },
    {
      name: "analytics.events",
      key: "analytics.events",
      messages: 12_304,
      consumers: 4,
      publishRate: 340,
      deliverRate: 320,
      status: "running",
    },
    {
      name: "user.registration",
      key: "user.registration",
      messages: 23,
      consumers: 1,
      publishRate: 5,
      deliverRate: 5,
      status: "idle",
    },
    {
      name: "inventory.sync",
      key: "inventory.sync",
      messages: 8_901,
      consumers: 0,
      publishRate: 200,
      deliverRate: 0,
      status: "error",
    },
    {
      name: "log.aggregation",
      key: "log.aggregation",
      messages: 24_573,
      consumers: 2,
      publishRate: 452,
      deliverRate: 430,
      status: "running",
    },
  ],
  isLoading: false,
  setDashboardData: (data) => set((state) => ({ ...state, ...data })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
