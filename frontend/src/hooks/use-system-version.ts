import { useQuery } from "@tanstack/react-query";
import { APP_VERSION } from "@/lib/app-version";
import { systemVersionService } from "@/services/system-version.service";

export function useSystemVersion() {
  const query = useQuery({
    queryKey: ["system-version-runtime"],
    queryFn: () => systemVersionService.obterVersaoRuntime(),
    staleTime: 60_000
  });

  return {
    ...query,
    version: query.data || APP_VERSION || "Não informado"
  };
}
