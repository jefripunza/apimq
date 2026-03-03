import satellite from "@/lib/satellite";
import type { Response } from "@/types/response";

export interface DashboardStats {
  total_queues: number;
  total_messages: number;
  total_completed: number;
  total_failed: number;
  total_timing: number;
  total_pending: number;
  queue?: Record<string, number>;
}

export const dashboardService = {
  getStats: async () => {
    const response = await satellite.get<Response<DashboardStats>>(
      "/api/dashboard/stats",
    );
    return response.data;
  },
};
