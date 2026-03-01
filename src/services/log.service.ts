import satellite from "@/lib/satellite";
import type { Response } from "@/types/response";
import type { LogsResponse } from "@/types/log";

export const logService = {
  getLogs: async (params?: {
    limit?: number;
    cursor?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", String(params.limit));
    if (params?.cursor) queryParams.set("cursor", params.cursor);
    if (params?.status && params.status !== "all")
      queryParams.set("status", params.status);

    const query = queryParams.toString();
    const url = `/api/queue/logs${query ? `?${query}` : ""}`;
    const response = await satellite.get<Response<LogsResponse>>(url);
    return response.data;
  },
};
