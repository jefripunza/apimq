import satellite from "@/lib/satellite";
import type { Response } from "@/types/response";

export const settingService = {
  setNewPassword: async (last_password: string, password: string) => {
    const response = await satellite.put<Response<unknown>>(
      "/api/setting/set",
      {
        auth_password: password,
      },
      {
        headers: {
          "X-Last-Password": last_password,
        },
      },
    );
    return response.data;
  },
};
