export type SchemaType = "" | "delay" | "timing";

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
  publishRate: number;
  deliverRate: number;
  status: QueueStatus;
  origin?: string;
  batchCount?: number;
  timeout?: number;
  headers?: Array<{ key: string; value: string }>;
  schema?: string;
  schemaConfig?: Record<string, unknown>;
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
