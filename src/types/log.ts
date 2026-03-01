export interface LogEntry {
  id: string;
  queue_id: string;
  queue_key: string;
  queue_name: string;
  message_id: string;
  status: "processing" | "completed" | "failed";
  method: string;
  duration: number;
  error_message?: string | null;
  created_at: string;
}

export type StatusFilter = "all" | "processing" | "completed" | "failed";

export interface LogsResponse {
  logs: LogEntry[];
  next_cursor: string;
}
