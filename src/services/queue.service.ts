import satellite from "@/lib/satellite";
import type { Response } from "@/types/response";

export interface QueueApi {
  id: string;
  name: string;
  key: string;
  color: string;
  enabled: boolean;
  messages: number;
  origin: string;
  batch_count: number;
  timeout: number;
  headers: string;
  schema: string;
  schema_config: string;
  error_trace: string;
  created_at: string;
  updated_at: string;
}

export type CreateQueuePayload = {
  name: string;
  key: string;
  color?: string;
  origin: string;
  batchCount?: number;
  timeout?: number;
  headers?: Array<{ key: string; value: string }>;
  schema?: string;
  schemaConfig?: Record<string, unknown>;
  errorTrace?: Record<string, unknown>;
};

export type UpdateQueuePayload = Omit<CreateQueuePayload, "key">;

export const queueService = {
  getAll: async () => {
    const response =
      await satellite.get<Response<QueueApi[]>>("/api/queue/all");
    return response.data;
  },
  getByKey: async (key: string) => {
    const response = await satellite.get<Response<QueueApi>>(
      `/api/queue/one/${encodeURIComponent(key)}`,
    );
    return response.data;
  },
  create: async (payload: CreateQueuePayload) => {
    const response = await satellite.post<Response<QueueApi>>(
      "/api/queue/create",
      payload,
    );
    return response.data;
  },
  update: async (key: string, payload: UpdateQueuePayload) => {
    const response = await satellite.put<Response<QueueApi>>(
      `/api/queue/edit/${encodeURIComponent(key)}`,
      payload,
    );
    return response.data;
  },
  remove: async (key: string) => {
    const response = await satellite.delete<Response<null>>(
      `/api/queue/remove/${encodeURIComponent(key)}`,
    );
    return response.data;
  },
  toggleEnabled: async (key: string, enabled: boolean) => {
    const response = await satellite.patch<Response<QueueApi>>(
      `/api/queue/toggle/${encodeURIComponent(key)}`,
      { enabled },
    );
    return response.data;
  },
  sendTestMessage: async (json: Record<string, unknown>) => {
    const payload = {
      key: json.key as string,
      method: (json.method as string) ?? "POST",
      query: json.query ? JSON.stringify(json.query) : undefined,
      body: JSON.stringify(json.body),
      headers: json.headers ? JSON.stringify(json.headers) : undefined,
    };
    const response = await satellite.post<Response<null>>(`/queue`, payload);
    return response.data;
  },
};
