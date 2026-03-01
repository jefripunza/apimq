import satellite from "@/lib/satellite";
import type { Response } from "@/types/response";

export interface QueueApi {
  id: string;
  name: string;
  key: string;
  color: string;
  enabled: boolean;
  messages: number;
  completed_count: number;
  failed_count: number;
  origin: string;
  batch_count: number;
  timeout: number;
  headers: string;
  is_send_now: boolean;
  send_later_time: string | null;
  is_use_delay: boolean;
  is_random_delay: boolean;
  delay_sec: number;
  delay_start: number;
  delay_end: number;
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
  isSendNow?: boolean;
  sendLaterTime?: string;
  isUseDelay?: boolean;
  isRandomDelay?: boolean;
  delaySec?: number;
  delayStart?: number;
  delayEnd?: number;
  errorTrace?: Record<string, unknown>;
};

export type UpdateQueuePayload = Omit<CreateQueuePayload, "key">;

export const queueService = {
  getAll: async () => {
    const response =
      await satellite.get<Response<QueueApi[]>>("/api/queue/all");
    return response.data;
  },
  getById: async (id: string) => {
    const response = await satellite.get<Response<QueueApi>>(
      `/api/queue/one/${encodeURIComponent(id)}`,
    );
    return response.data;
  },
  getByKey: async (key: string) => {
    const response = await satellite.get<Response<QueueApi>>(
      `/api/queue/by-key/${encodeURIComponent(key)}`,
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
  update: async (id: string, payload: UpdateQueuePayload) => {
    const response = await satellite.put<Response<QueueApi>>(
      `/api/queue/edit/${encodeURIComponent(id)}`,
      payload,
    );
    return response.data;
  },
  remove: async (id: string) => {
    const response = await satellite.delete<Response<null>>(
      `/api/queue/remove/${encodeURIComponent(id)}`,
    );
    return response.data;
  },
  toggleEnabled: async (id: string, enabled: boolean) => {
    const response = await satellite.patch<Response<QueueApi>>(
      `/api/queue/toggle/${encodeURIComponent(id)}`,
      { enabled },
    );
    return response.data;
  },
  sendTestMessage: async (json: Record<string, unknown>, apiKey?: string) => {
    const payload = {
      queue_id: json.queue_id as string | undefined,
      key: json.key as string | undefined,
      method: (json.method as string) ?? "POST",
      query: json.query ? JSON.stringify(json.query) : undefined,
      body: JSON.stringify(json.body),
      headers: json.headers ? JSON.stringify(json.headers) : undefined,
    };
    const config = apiKey ? { headers: { "X-Api-Key": apiKey } } : {};
    const response = await satellite.post<Response<null>>(
      `/queue`,
      payload,
      config,
    );
    return response.data;
  },
  getFailedMessages: async (id: string) => {
    const response = await satellite.get<Response<QueueMessageApi[]>>(
      `/api/queue/errors/${encodeURIComponent(id)}`,
    );
    return response.data;
  },
  retryMessage: async (messageId: string) => {
    const response = await satellite.put<Response<QueueMessageApi>>(
      `/api/queue/message/${encodeURIComponent(messageId)}/retry`,
    );
    return response.data;
  },
  ackMessage: async (messageId: string) => {
    const response = await satellite.put<Response<QueueMessageApi>>(
      `/api/queue/message/${encodeURIComponent(messageId)}/ack`,
    );
    return response.data;
  },
  updateMessage: async (
    messageId: string,
    payload: { method: string; query?: string; body: string; headers?: string },
  ) => {
    const response = await satellite.put<Response<QueueMessageApi>>(
      `/api/queue/message/${encodeURIComponent(messageId)}`,
      payload,
    );
    return response.data;
  },
};

export interface QueueMessageApi {
  id: string;
  queue_id: string;
  method: string;
  query: string | null;
  headers: string | null;
  body: string;
  status: string;
  response: string | null;
  error_message: string | null;
  is_ack: boolean;
  reference_id?: string | null;
  created_at: string;
}
