import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Home,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  UsersRound,
  Link2,
  type LucideIcon
} from "lucide-react";

type MenuItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

type MenuSection = {
  id: string;
  secao: string;
  icon: LucideIcon;
  itens: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    id: "dashboard",
    secao: "Dashboard",
    icon: LayoutDashboard,
    itens: [{ to: "/", label: "Dashboard", icon: Home }]
  },
  {
    id: "cadastros",
    secao: "Cadastros",
    icon: FolderOpen,
    itens: [
      { to: "/cadastros/beneficiarios", label: "Beneficiários", icon: UserRound },
      { to: "/cadastros/vinculo-familiar", label: "Vínculo familiar", icon: Link2 }
    ]
  }
];

function obterTitulo(pathname: string): string {
  if (pathname === "/") {
    return "Dashboard";
  }
  if (pathname.startsWith("/cadastros/beneficiarios")) {
    return "Cadastro de beneficiários";
  }
  if (pathname.startsWith("/cadastros/vinculo-familiar")) {
    return "Cadastro de vínculo familiar";
  }
  return "Painel de migração";
}

export function AppShell() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const titulo = obterTitulo(location.pathname);
  const versaoSistema = import.meta.env.VITE_APP_VERSION ?? "1.00.12";

  const [sidebarRecolhida, setSidebarRecolhida] = useState(false);
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(menuSections.map((secao) => [secao.id, true]))
  );

  function alternarSidebar() {
    setSidebarRecolhida((valorAtual) => !valorAtual);
  }

  function alternarGrupo(id: string) {
    setGruposAbertos((estadoAtual) => ({
      ...estadoAtual,
      [id]: !estadoAtual[id]
    }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-emerald-800/30 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-900 text-white shadow-2xl shadow-emerald-950/35 transition-[width] duration-300 lg:flex ${
          sidebarRecolhida ? "w-20" : "w-72"
        }`}
      >
        <div className={`border-b border-white/10 ${sidebarRecolhida ? "px-2 py-3" : "px-5 py-4"}`}>
          <div className="relative flex items-center justify-center">
            {sidebarRecolhida ? (
              <span className="mx-auto text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                G3
              </span>
            ) : (
              <div className="w-full text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                  Sistema G3
                </p>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 h-7 w-7 p-0 text-emerald-100 hover:bg-white/10 hover:text-white"
              onClick={alternarSidebar}
              title={sidebarRecolhida ? "Expandir Menu Lateral" : "Recolher Menu Lateral"}
              aria-label={sidebarRecolhida ? "Expandir Menu Lateral" : "Recolher Menu Lateral"}
            >
              {sidebarRecolhida ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>

        </div>

        <nav className={`flex-1 overflow-y-auto ${sidebarRecolhida ? "space-y-2 px-2 py-3" : "space-y-4 px-4 py-4"}`}>
          {menuSections.map((secao) => {
            const grupoAberto = gruposAbertos[secao.id] ?? true;
            const IconeSecao = secao.icon;

            return (
              <section key={secao.id} className="space-y-1.5">
                <button
                  type="button"
                  className={`flex w-full items-center rounded-lg border border-white/10 bg-white/5 text-left font-semibold text-emerald-100 transition-colors hover:bg-white/10 ${
                    sidebarRecolhida ? "justify-center px-2 py-2" : "justify-between px-3 py-2 text-xs uppercase tracking-[0.16em]"
                  }`}
                  onClick={() => alternarGrupo(secao.id)}
                  title={sidebarRecolhida ? secao.secao : undefined}
                  aria-label={`Alternar Grupo ${secao.secao}`}
                >
                  <span className={`flex items-center ${sidebarRecolhida ? "justify-center" : "gap-2"}`}>
                    {IconeSecao ? <IconeSecao className="h-4 w-4" /> : null}
                    {!sidebarRecolhida && secao.secao}
                  </span>
                  {!sidebarRecolhida &&
                    (grupoAberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                </button>

                {grupoAberto && (
                  <div className={`space-y-1 rounded-xl border border-white/10 bg-white/5 ${sidebarRecolhida ? "p-1" : "p-2"}`}>
                    {secao.itens.map((item) => (
                      <NavLink key={item.to} to={item.to}>
                        {({ isActive }) => (
                          <span
                            className={`flex items-center rounded-lg border text-sm font-medium transition-colors ${
                              sidebarRecolhida ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"
                            } ${
                              isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                : "border-transparent text-emerald-100 hover:border-white/20 hover:bg-white/10"
                            }`}
                            title={sidebarRecolhida ? item.label : undefined}
                          >
                            <item.icon className="h-4 w-4" />
                            {!sidebarRecolhida && item.label}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </nav>

        <div
          className={`border-t border-white/10 text-center text-emerald-100/90 ${
            sidebarRecolhida ? "px-2 py-3 text-[10px]" : "px-5 py-3 text-xs"
          }`}
        >
          {sidebarRecolhida ? `v${versaoSistema}` : `Versão do sistema: ${versaoSistema}`}
        </div>
      </aside>

      <div
        className={`transition-[padding] duration-300 ${sidebarRecolhida ? "lg:pl-20" : "lg:pl-72"}`}
      >
        <header className="border-b border-emerald-200 bg-emerald-100/95 backdrop-blur">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-1.5 lg:px-8">
            <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{titulo}</h1>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                  G3 Next
                </span>
                <span className="text-[11px] text-slate-600">{usuario?.nomeUsuario}</span>
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
              {menuSections.flatMap((secao) =>
                secao.itens.map((item) => (
                  <NavLink key={item.to} to={item.to}>
                    {({ isActive }) => (
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                ))
              )}
            </nav>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
