import satellite from "@/lib/satellite";
import type { Response } from "@/types/response";

export const authService = {
  login: async (password: string) => {
    const response = await satellite.post<Response<{ token: string }>>(
      "/api/auth/login",
      {
        password,
      },
    );
    return response.data;
  },
  validate: async (on?: string) => {
    if (on) console.log(`Validate on: ${on}`);
    const response =
      await satellite.get<Response<unknown>>("/api/auth/validate");
    return response.data;
  },
  logout: async () => {
    const response =
      await satellite.delete<Response<unknown>>("/api/auth/logout");
    return response.data;
  },
  register: async (name: string, username: string, password: string) => {
    const response = await satellite.post<Response<unknown>>(
      "/api/auth/register",
      {
        name,
        username,
        password,
      },
    );
    return response.data;
  },
};
