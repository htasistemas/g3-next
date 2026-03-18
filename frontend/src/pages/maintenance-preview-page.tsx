import { MaintenanceScreen } from "@/components/system/maintenance-screen";

export function MaintenancePreviewPage() {
  return (
    <MaintenanceScreen
      previsao="Em instantes"
      changelogResumido="Correções de estabilidade, ajustes de infraestrutura e atualização controlada do ambiente."
    />
  );
}
