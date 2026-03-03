// Schema types removed - now using explicit fields

export interface HeaderEntry {
  id: string;
  key: string;
  value: string;
}

export type KeyStatus = "idle" | "checking" | "available" | "taken" | "error";

export type QueueStatus = "running" | "idle" | "error";

export type Queue = {
  id: string;
  name: string;
  key: string;
  color: string;
  enabled: boolean;
  messages: number;
  consumers: number;
  batch_count: number;
  throughput_sec: string;
  completedCount: number;
  failedCount: number;
  status: QueueStatus;
  origin?: string;
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
  isWaitResponse?: boolean;
  errorTrace?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export interface QueueError {
  id: string;
  at: string;
  message: string;
  detail?: string;
}

export type QueueMessageStatus =
  | "timing"
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface QueueMessage {
  id: string;
  queue_id: string;
  method: string;
  query?: string | null;
  headers?: string | null;
  body: string;
  status: QueueMessageStatus;
  response?: string | null;
  error_message?: string | null;
  is_ack: boolean;
  reference_id?: string | null;
  created_at: string;
}
