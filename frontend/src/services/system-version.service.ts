import { httpClient } from "./http-client";

type HealthResponse = {
  status: string;
  service: string;
  version?: string;
};

export const systemVersionService = {
  async obterVersaoRuntime() {
    const { data } = await httpClient.get<HealthResponse>("/health", {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      },
      params: {
        t: Date.now()
      }
    });
    return data.version?.trim() || null;
  }
};
