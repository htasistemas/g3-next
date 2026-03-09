import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useUnidadeAssistencialAtual } from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import {
  BookOpenCheck,
  Building2,
  ChartColumn,
  ChartPie,
  ChevronLeft,
  Clock3,
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileText,
  FolderOpen,
  Gift,
  HandHeart,
  HandCoins,
  Handshake,
  LayoutDashboard,
  Link2,
  ListFilter,
  Settings2,
  SlidersHorizontal,
  Stethoscope,
  UserRound,
  UsersRound,
  type LucideIcon
} from "lucide-react";

type MenuItem = {
  id: string;
  to?: string;
  label: string;
  icon: LucideIcon;
  requiredPermissions?: string[];
  emMigracao?: boolean;
};

type MenuSection = {
  id: string;
  secao: string;
  icon: LucideIcon;
  requiredPermissions?: string[];
  itens: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    id: "dashboard",
    secao: "Dashboard",
    icon: LayoutDashboard,
    itens: [
      { id: "dashboard-visao-geral", to: "/dashboard/visao-geral", label: "Visão geral", icon: ChartPie },
      { id: "dashboard-indicadores", to: "/dashboard/indicadores", label: "Indicadores", icon: ChartColumn }
    ]
  },
  {
    id: "cadastros",
    secao: "Cadastros",
    icon: FolderOpen,
    itens: [
      { id: "cadastros-beneficiarios", to: "/cadastros/beneficiarios", label: "Beneficiários", icon: UserRound },
      {
        id: "cadastros-profissionais",
        to: "/cadastros/profissionais",
        label: "Profissionais",
        icon: Stethoscope
      },
      {
        id: "cadastros-voluntariado",
        to: "/cadastros/voluntariado",
        label: "Voluntariado",
        icon: HandHeart
      },
      {
        id: "cadastros-unidades-assistenciais",
        to: "/cadastros/unidades-assistenciais",
        label: "Unidades assistenciais",
        icon: Building2
      },
      {
        id: "cadastros-vinculo-familiar",
        to: "/cadastros/vinculo-familiar",
        label: "Vínculo familiar",
        icon: Link2
      }
    ]
  },
  {
    id: "atendimentos",
    secao: "Atendimentos",
    icon: Handshake,
    itens: [
      {
        id: "atendimentos-matriculas",
        to: "/atendimentos/matriculas",
        label: "Matrículas",
        icon: BookOpenCheck
      },
      {
        id: "atendimentos-registro-doacao",
        to: "/financeiro/registro-doacao",
        label: "Recebimento de doações",
        icon: DollarSign
      },
      {
        id: "atendimentos-doacoes-realizadas",
        to: "/financeiro/doacoes-realizadas",
        label: "Doação realizada",
        icon: Gift
      },
      {
        id: "atendimentos-migracao",
        label: "Módulo em migração",
        icon: Handshake,
        emMigracao: true
      }
    ]
  },
  {
    id: "setor-administrativo",
    secao: "Setor administrativo",
    icon: FileText,
    itens: [
      {
        id: "setor-administrativo-migracao",
        label: "Módulo em migração",
        icon: FileText,
        emMigracao: true
      }
    ]
  },
  {
    id: "almoxarifado",
    secao: "Setor jurídico",
    icon: ListFilter,
    itens: [
      {
        id: "setor-juridico-migracao",
        label: "Módulo em migração",
        icon: ListFilter,
        emMigracao: true
      }
    ]
  },
  {
    id: "financeiro",
    secao: "Setor financeiro",
    icon: HandCoins,
    itens: [
      {
        id: "setor-financeiro-migracao",
        label: "Módulo em migração",
        icon: HandCoins,
        emMigracao: true
      }
    ]
  },
  {
    id: "setor-rh",
    secao: "Setor RH",
    icon: UsersRound,
    itens: [
      {
        id: "setor-rh-registro-ponto",
        to: "/setor-rh/registro-ponto",
        label: "Registro de ponto",
        icon: Clock3
      },
      {
        id: "setor-rh-migracao",
        label: "Módulo em migração",
        icon: UsersRound,
        emMigracao: true
      }
    ]
  },
  {
    id: "configuracoes-gerais",
    secao: "Configurações gerais",
    icon: Settings2,
    requiredPermissions: ["ADMINISTRADOR"],
    itens: [
      {
        id: "configuracoes-parametros-sistema",
        to: "/configuracoes/parametros-sistema",
        label: "Parâmetros do sistema",
        icon: SlidersHorizontal,
        requiredPermissions: ["ADMINISTRADOR"]
      },
      {
        id: "configuracoes-usuarios",
        to: "/configuracoes/usuarios",
        label: "Usuários",
        icon: UsersRound,
        requiredPermissions: ["ADMINISTRADOR"]
      }
    ]
  }
];

function obterTitulo(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/dashboard/visao-geral")) return "Visão geral";
  if (pathname.startsWith("/dashboard/indicadores")) return "Indicadores";
  if (pathname.startsWith("/cadastros/beneficiarios")) return "Cadastro de beneficiários";
  if (pathname.startsWith("/cadastros/profissionais")) return "Cadastro de profissionais";
  if (pathname.startsWith("/cadastros/voluntariado")) return "Cadastro de voluntariado";
  if (pathname.startsWith("/atendimentos/matriculas")) return "Matrículas";
  if (pathname.startsWith("/financeiro/registro-doacao")) return "Recebimento de doações";
  if (pathname.startsWith("/financeiro/doacoes-realizadas")) return "Doação realizada";
  if (pathname.startsWith("/cadastros/unidades-assistenciais")) return "Cadastro de unidade assistencial";
  if (pathname.startsWith("/cadastros/vinculo-familiar")) return "Cadastro de vínculo familiar";
  if (pathname.startsWith("/configuracoes/parametros-sistema")) return "Parâmetros do sistema";
  if (pathname.startsWith("/configuracoes/usuarios")) return "Usuários";
  if (pathname.startsWith("/setor-rh/registro-ponto")) return "Registro de ponto";
  return "Painel de migração";
}

function itemEstaAtivo(pathname: string, item: MenuItem) {
  if (!item.to) return false;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function AppShell() {
  const { usuario, logout } = useAuth();
  const { data: unidadeAtualData } = useUnidadeAssistencialAtual();
  const location = useLocation();
  const titulo = obterTitulo(location.pathname);
  const versaoSistema = import.meta.env.VITE_APP_VERSION ?? "1.00.12";
  const [sidebarRecolhida, setSidebarRecolhida] = useState(false);
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});
  const logomarcaInstituicao = unidadeAtualData?.unidade?.logomarca;
  const nomeInstituicao =
    unidadeAtualData?.unidade?.nome_fantasia ??
    unidadeAtualData?.unidade?.razao_social ??
    "Sistema G3";

  const permissoesUsuario = usuario?.permissoes ?? [];
  const possuiPermissao = useMemo(
    () =>
      (permissoesNecessarias?: string[]) => {
        if (!permissoesNecessarias?.length) return true;
        return permissoesNecessarias.some((permissao) => permissoesUsuario.includes(permissao));
      },
    [permissoesUsuario]
  );

  const menuSectionsVisiveis = useMemo(() => {
    return menuSections
      .filter((secao) => possuiPermissao(secao.requiredPermissions))
      .map((secao) => ({
        ...secao,
        itens: secao.itens.filter((item) => possuiPermissao(item.requiredPermissions))
      }))
      .filter((secao) => secao.itens.length > 0);
  }, [possuiPermissao]);

  const secaoAtivaId = useMemo(() => {
    for (const secao of menuSectionsVisiveis) {
      if (secao.itens.some((item) => itemEstaAtivo(location.pathname, item))) {
        return secao.id;
      }
    }
    return undefined;
  }, [location.pathname, menuSectionsVisiveis]);

  useEffect(() => {
    setGruposAbertos(() => {
      const proximoEstado: Record<string, boolean> = {};

      menuSectionsVisiveis.forEach((secao) => {
        proximoEstado[secao.id] = false;
      });

      const grupoParaAbrir = secaoAtivaId ?? menuSectionsVisiveis[0]?.id;
      if (grupoParaAbrir) {
        proximoEstado[grupoParaAbrir] = true;
      }

      return proximoEstado;
    });
  }, [menuSectionsVisiveis, secaoAtivaId]);

  function alternarSidebar() {
    setSidebarRecolhida((valorAtual) => !valorAtual);
  }

  function alternarGrupo(id: string) {
    setGruposAbertos((estadoAtual) => {
      const proximoEstado: Record<string, boolean> = {};
      const abrirGrupoSelecionado = !estadoAtual[id];

      menuSectionsVisiveis.forEach((secao) => {
        proximoEstado[secao.id] = false;
      });

      proximoEstado[id] = abrirGrupoSelecionado;
      return proximoEstado;
    });
  }

  function abrirSidebarNoGrupo(id: string) {
    if (!sidebarRecolhida) return;
    setSidebarRecolhida(false);
    setGruposAbertos(() => {
      const proximoEstado: Record<string, boolean> = {};
      menuSectionsVisiveis.forEach((secao) => {
        proximoEstado[secao.id] = secao.id === id;
      });
      return proximoEstado;
    });
  }

  return (
    <div className="min-h-screen bg-[var(--g3-bg)]">
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[var(--g3-sidebar-border)] bg-[linear-gradient(180deg,var(--g3-sidebar-bg)_0%,var(--g3-sidebar-bg-alt)_100%)] text-[var(--g3-sidebar-text)] shadow-2xl shadow-[color:var(--g3-sidebar-shadow)] transition-[width] duration-300 lg:flex ${
          sidebarRecolhida ? "w-16" : "w-64"
        }`}
      >
        <div className={`border-b border-white/10 ${sidebarRecolhida ? "px-2 py-2" : "px-4 py-3"}`}>
          <div className="relative flex items-center justify-center">
            {sidebarRecolhida ? (
              <span className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
                <HandHeart className="h-4 w-4" />
              </span>
            ) : (
              <div className="w-full text-center">
                {logomarcaInstituicao ? (
                  <img
                    src={logomarcaInstituicao}
                    alt={`Logomarca da instituição ${nomeInstituicao}`}
                    className="mx-auto h-10 w-auto max-w-[170px] object-contain"
                  />
                ) : (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">Sistema G3</p>
                )}
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 h-6 w-6 p-0 text-white/85 hover:bg-white/10 hover:text-white"
              onClick={alternarSidebar}
              title={sidebarRecolhida ? "Expandir menu lateral" : "Recolher menu lateral"}
              aria-label={sidebarRecolhida ? "Expandir menu lateral" : "Recolher menu lateral"}
            >
              {sidebarRecolhida ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <nav
          className={`g3-sidebar-scroll flex-1 overflow-y-auto ${
            sidebarRecolhida ? "space-y-1.5 px-1.5 py-2" : "space-y-2 px-2.5 py-3"
          }`}
        >
          {menuSectionsVisiveis.map((secao) => {
            const grupoAberto = gruposAbertos[secao.id] ?? true;
            const grupoAtivo = secao.id === secaoAtivaId;
            const IconeSecao = secao.icon;

            return (
              <section key={secao.id} className="space-y-1">
                <button
                  type="button"
                  className={`flex w-full items-center rounded-lg border text-left font-semibold transition-colors ${
                    sidebarRecolhida
                      ? "justify-center px-1.5 py-1.5"
                      : "justify-between gap-2 px-2.5 py-2 text-[12px]"
                  } ${
                    grupoAtivo
                      ? "border-[var(--g3-active)] bg-[var(--g3-sidebar-bg)] text-[var(--g3-sidebar-text)] shadow-md"
                      : "border-[var(--g3-sidebar-border)] bg-[var(--g3-sidebar-bg)] text-[var(--g3-sidebar-text)] hover:bg-[var(--g3-sidebar-bg-alt)]"
                  }`}
                  onClick={() => {
                    if (sidebarRecolhida) {
                      abrirSidebarNoGrupo(secao.id);
                      return;
                    }
                    alternarGrupo(secao.id);
                  }}
                  title={sidebarRecolhida ? secao.secao : undefined}
                  aria-label={`Alternar grupo ${secao.secao}`}
                  aria-expanded={grupoAberto}
                >
                  <span className={`flex items-center ${sidebarRecolhida ? "justify-center" : "gap-2"}`}>
                    <IconeSecao className="h-3.5 w-3.5" />
                    {!sidebarRecolhida && secao.secao}
                  </span>
                  {!sidebarRecolhida &&
                    (grupoAberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)}
                </button>

                {grupoAberto && !sidebarRecolhida && (
                  <div
                    className={`ml-1.5 space-y-1 rounded-lg border bg-[var(--g3-primary-soft)] p-1.5 ${
                      secao.id === "configuracoes-gerais" ? "border-transparent" : "border-[var(--g3-border)]"
                    }`}
                  >
                    {secao.itens.map((item) =>
                      item.to ? (
                        <NavLink key={item.id} to={item.to}>
                          {({ isActive }) => (
                            <span
                              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                isActive
                                  ? "border-[var(--g3-active)] bg-[var(--g3-card)] text-[var(--g3-active)] shadow-sm"
                                  : "border-transparent text-[var(--g3-foreground)] hover:border-[var(--g3-border)] hover:bg-[var(--g3-primary-soft-hover)]"
                              }`}
                            >
                              <item.icon className="h-3.5 w-3.5" />
                              {item.label}
                            </span>
                          )}
                        </NavLink>
                      ) : (
                        <span
                          key={item.id}
                          className="flex cursor-not-allowed items-center gap-2 rounded-md border border-dashed border-[var(--g3-border)] bg-[var(--g3-card)]/70 px-2.5 py-1.5 text-xs text-[var(--g3-muted)]"
                          aria-disabled="true"
                        >
                          <item.icon className="h-3.5 w-3.5" />
                          {item.label}
                        </span>
                      )
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </nav>

        <div
          className={`border-t border-white/10 text-center text-white/80 ${
            sidebarRecolhida ? "px-1.5 py-2 text-[10px]" : "px-4 py-2.5 text-[11px]"
          }`}
        >
          {sidebarRecolhida ? `v${versaoSistema}` : `Versão do sistema: ${versaoSistema}`}
        </div>
      </aside>

      <div className={`transition-[padding] duration-300 ${sidebarRecolhida ? "lg:pl-16" : "lg:pl-64"}`}>
        <header className="border-b border-[var(--g3-header-border)] bg-[var(--g3-header-bg)]/95 backdrop-blur">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-1.5 lg:px-8">
            <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-[var(--g3-foreground)] sm:text-base">{titulo}</h1>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="rounded-full bg-[var(--g3-primary-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--g3-active)]">
                  G3 Next
                </span>
                <span className="text-[11px] text-[var(--g3-muted)]">{usuario?.nomeUsuario}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => void logout()}
                >
                  Sair
                </Button>
              </div>
            </div>

            <nav className="mt-1 flex flex-wrap gap-1.5 lg:hidden">
              {menuSectionsVisiveis.flatMap((secao) =>
                secao.itens.map((item) =>
                  item.to ? (
                    <NavLink key={item.id} to={item.to}>
                      {({ isActive }) => (
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            isActive
                              ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"
                              : "border-[var(--g3-border)] bg-[var(--g3-card)] text-[var(--g3-muted)]"
                          }`}
                        >
                          {item.label}
                        </span>
                      )}
                    </NavLink>
                  ) : null
                )
              )}
            </nav>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
