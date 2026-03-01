import satellite from "@/lib/satellite";
import type { Response } from "@/types/response";

export const settingService = {
  setNewPassword: async (password: string) => {
    const response = await satellite.post<Response<unknown>>(
      "/api/setting/set",
      {
        auth_password: password,
      },
    );
    return response.data;
  },
};
