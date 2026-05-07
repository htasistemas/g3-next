import { httpClient } from "./http-client";

type HealthResponse = {
  status: string;
  service: string;
  version?: string;
};

export const systemVersionService = {
  async obterVersaoRuntime() {
    const { data } = await httpClient.get<HealthResponse>("/health");
    return data.version?.trim() || null;
  }
};
