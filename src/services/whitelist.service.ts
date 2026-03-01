import satellite from "@/lib/satellite";
import type { Response } from "@/types/response";

export interface WhitelistApi {
  id: string;
  type: "ip" | "domain";
  value: string;
  label?: string | null;
  created_at: string;
}

export const whitelistService = {
  getAll: async () => {
    const response = await satellite.get<Response<WhitelistApi[]>>(
      "/api/whitelist/all",
    );
    return response.data;
  },
  create: async (payload: {
    type: "ip" | "domain";
    value: string;
    label?: string;
  }) => {
    const response = await satellite.post<Response<WhitelistApi>>(
      "/api/whitelist/create",
      payload,
    );
    return response.data;
  },
  remove: async (id: string) => {
    const response = await satellite.delete<Response<null>>(
      `/api/whitelist/remove/${encodeURIComponent(id)}`,
    );
    return response.data;
  },
};
