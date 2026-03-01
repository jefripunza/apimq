// Schema types removed - now using explicit fields

export interface HeaderEntry {
  id: string;
  key: string;
  value: string;
}

export type KeyStatus = "idle" | "checking" | "available" | "taken" | "error";

export type QueueStatus = "running" | "idle" | "error";

export type Queue = {
  id?: string;
  name: string;
  key: string;
  color: string;
  enabled: boolean;
  messages: number;
  consumers: number;
  batch_count: number;
  throughput_sec: string;
  deliverRate: number;
  status: QueueStatus;
  origin?: string;
  batchCount?: number;
  timeout?: number;
  headers?: Array<{ key: string; value: string }>;
  isSendNow?: boolean;
  sendLaterTime?: string;
  isRandomDelay?: boolean;
  delaySec?: number;
  delayStart?: number;
  delayEnd?: number;
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
  | "pending"
  | "processing"
  | "completed"
  | "failed";
