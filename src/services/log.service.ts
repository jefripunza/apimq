import satellite from "@/lib/satellite";
import type { Response } from "@/types/response";
import type { LogEntry } from "@/types/log";

export const logService = {
  getLogs: async () => {
    const response = await satellite.get<Response<LogEntry[]>>("/api/logs");
    return response.data;
  },
};
