export interface LogEntry {
  id: string;
  queue: string;
  status: "success" | "error" | "pending";
  message: string;
  detail?: string;
  at: string;
  duration: number;
}

export type StatusFilter = "all" | "success" | "error" | "pending";
