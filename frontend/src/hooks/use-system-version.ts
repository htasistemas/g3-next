import { useQuery } from "@tanstack/react-query";
import { APP_VERSION } from "@/lib/app-version";
import { systemVersionService } from "@/services/system-version.service";

export function useSystemVersion() {
  const query = useQuery({
    queryKey: ["system-version-runtime"],
    queryFn: () => systemVersionService.obterVersaoRuntime(),
    refetchInterval: 60_000,
    staleTime: 30_000
  });

  return {
    ...query,
    runtimeVersion: query.data ?? null,
    buildVersion: APP_VERSION,
    version: query.data || APP_VERSION || "Não informado"
  };
}
