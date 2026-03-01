import satellite from "@/lib/satellite";
import type { Response } from "@/types/response";

export interface ApiKeyApi {
  id: string;
  name: string;
  key: string;
  is_active: boolean;
  expires_at: string | null;
  last_used: string | null;
  created_at: string;
}

export const apikeyService = {
  getAll: async () => {
    const response = await satellite.get<Response<ApiKeyApi[]>>(
      "/api/apikey/all",
    );
    return response.data;
  },
  create: async (payload: { name: string; expires_at?: string }) => {
    const response = await satellite.post<Response<ApiKeyApi>>(
      "/api/apikey/create",
      payload,
    );
    return response.data;
  },
  toggle: async (id: string, is_active: boolean) => {
    const response = await satellite.patch<Response<ApiKeyApi>>(
      `/api/apikey/toggle/${encodeURIComponent(id)}`,
      { is_active },
    );
    return response.data;
  },
  remove: async (id: string) => {
    const response = await satellite.delete<Response<null>>(
      `/api/apikey/remove/${encodeURIComponent(id)}`,
    );
    return response.data;
  },
};
