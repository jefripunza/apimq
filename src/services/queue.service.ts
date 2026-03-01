import satellite from "@/lib/satellite";
import type { Response } from "@/types/response";

export const exampleService = {
  example: async () => {
    const response = await satellite.get<Response<unknown>>("/api/example");
    return response.data;
  },
};
