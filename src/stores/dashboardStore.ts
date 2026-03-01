import { create } from "zustand";
import {
  dashboardService,
  type DashboardStats,
} from "@/services/dashboard.service";
import { queueService, type QueueApi } from "@/services/queue.service";

interface DashboardQueue {
  key: string;
  name: string;
  color: string;
  completedCount: number;
}

interface DashboardState {
  stats: DashboardStats;
  queues: DashboardQueue[];
  isLoading: boolean;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  stats: {
    total_queues: 0,
    total_messages: 0,
    total_completed: 0,
    total_failed: 0,
    total_timing: 0,
    total_pending: 0,
  },
  queues: [],
  isLoading: false,
  fetchStats: async () => {
    set({ isLoading: true });
    try {
      const [statsRes, queuesRes] = await Promise.all([
        dashboardService.getStats(),
        queueService.getAll(),
      ]);
      const queues: DashboardQueue[] = (queuesRes.data as QueueApi[]).map(
        (q) => ({
          key: q.key,
          name: q.name,
          color: q.color,
          completedCount: q.completed_count,
        }),
      );
      set({
        stats: statsRes.data as DashboardStats,
        queues,
      });
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    } finally {
      set({ isLoading: false });
    }
  },
}));
