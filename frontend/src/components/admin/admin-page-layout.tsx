import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario
} from "@/lib/tela-padrao-beneficiario";

export type AdminTab = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export type AdminAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  disabled?: boolean;
};

type AdminPageLayoutProps = {
  tabs: AdminTab[];
  activeTab: string;
  onChangeTab: (tabId: string) => void;
  actions: AdminAction[];
  sectionLabel?: string;
  pageTitle?: string;
  activeTitle?: string;
  activeIcon?: LucideIcon;
  codeBadge?: string;
  children: React.ReactNode;
};

export function AdminPageLayout({
  tabs,
  activeTab,
  onChangeTab,
  actions,
  sectionLabel,
  pageTitle,
  activeTitle,
  activeIcon: ActiveIcon,
  codeBadge,
  children
}: AdminPageLayoutProps) {
  const tab = tabs.find((item) => item.id === activeTab);
  const title = activeTitle ?? tab?.label ?? "";
  const Icon = ActiveIcon ?? tab?.icon;

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <section className={classesTelaPadraoBeneficiario.barraAcoes} data-print="toolbar">
        <div
          className={
            sectionLabel || pageTitle
              ? "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
              : undefined
          }
        >
          {sectionLabel || pageTitle ? (
            <div className="min-w-0">
              {sectionLabel ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                  {sectionLabel}
                </p>
              ) : null}
              {pageTitle ? (
                <h1 className="text-sm font-semibold tracking-tight text-[var(--g3-foreground)] sm:text-base">
                  {pageTitle}
                </h1>
              ) : null}
            </div>
          ) : null}

          <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
            {actions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant={action.variant}
                size="sm"
                className={classesTelaPadraoBeneficiario.botaoAcao}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                <action.icon className="mr-1.5 h-3.5 w-3.5" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <div className={classesTelaPadraoBeneficiario.gradePrincipal} data-print="layout-grid">
        <Card className={classesTelaPadraoBeneficiario.cardAbas} data-print="tabs">
          <CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>
            {tabs.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={classeBotaoAbaLateral(activeTab === item.id)}
              >
                <span className={classeNumeroAbaLateral(activeTab === item.id)}>{index + 1}</span>
                <span className="min-w-0 break-words">{item.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
          <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
            <div className={classesTelaPadraoBeneficiario.tituloAba}>
              {Icon ? <Icon className="h-4 w-4" /> : null}
              <CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>{title}</CardTitle>
            </div>
            {codeBadge ? (
              <span className="self-start rounded-md bg-[var(--g3-primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--g3-active)] sm:self-auto">
                {codeBadge}
              </span>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3 p-3">{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
