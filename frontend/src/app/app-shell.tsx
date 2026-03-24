import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { startTransition } from "react";
import { PopupConfirmacao } from "@/components/admin/admin-popups";
import { DatasComemorativasPopup } from "@/components/system/datas-comemorativas-popup";
import { AIChatWidget } from "@/modules/ai/components/AIChatWidget";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { APP_VERSION } from "@/lib/app-version";
import { resolverUrlArquivo } from "@/lib/arquivos";
import { precarregarRota, precarregarRotas } from "@/routes/route-modules";
import { useResumoLembretesDiarios } from "@/features/lembretes-diarios/use-lembretes-diarios";
import { registroPontoService } from "@/services/registro-ponto.service";
import { datasComemorativasService } from "@/services/datas-comemorativas.service";
import { useResumoTarefasAdministrativas } from "@/features/tarefas-administrativas/use-tarefas-administrativas";
import { useUnidadeAssistencialAtual } from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import type { DataComemorativaPopupPayload } from "@/types/datas-comemorativas";
import type { RegistroPontoAlertaPendente } from "@/types/registro-ponto";
import {
  AlarmClockCheck,
  BadgeDollarSign,
  BookOpenText,
  BriefcaseBusiness,
  Brain,
  Building2,
  CalendarRange,
  Bell,
  CarFront,
  ChartColumn,
  ChartPie,
  CheckSquare2,
  ChevronLeft,
  Clock3,
  ChevronDown,
  ChevronRight,
  ClipboardPenLine,
  CircleDollarSign,
  DollarSign,
  FileText,
  Files,
  FolderKanban,
  FolderOpen,
  Gift,
  GraduationCap,
  HandHeart,
  HandCoins,
  HeartHandshake,
  ImageIcon,
  LibraryBig,
  Landmark,
  LayoutDashboard,
  Link2,
  ListTodo,
  ListFilter,
  MailPlus,
  MapPinned,
  MonitorDot,
  ReceiptText,
  ScanBarcode,
  Presentation,
  RefreshCcw,
  Scale,
  ScrollText,
  ShoppingBasket,
  Settings2,
  ShieldUser,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Stethoscope,
  Ticket,
  Package,
  UserRound,
  UserCog,
  UsersRound,
  WalletCards,
  type LucideIcon
} from "lucide-react";

export type MenuItem = {
  id: string;
  to?: string;
  label: string;
  icon: LucideIcon;
  abrirEmNovaAba?: boolean;
  requiredPermissions?: string[];
  activeMatchPaths?: string[];
  emMigracao?: boolean;
};

export type MenuSection = {
  id: string;
  secao: string;
  icon: LucideIcon;
  requiredPermissions?: string[];
  itens: MenuItem[];
};

const comparadorItensMenu = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true
});

function ordenarItensMenu<T extends { label: string }>(itens: T[]) {
  return [...itens].sort((itemA, itemB) =>
    comparadorItensMenu.compare(itemA.label.trim(), itemB.label.trim())
  );
}

function listarRotasMenuParaPrecarregar(secoes: MenuSection[], rotaAtual: string) {
  return Array.from(
    new Set(
      secoes.flatMap((secao) =>
        secao.itens.flatMap((item) =>
          item.to && !item.abrirEmNovaAba && item.to !== rotaAtual ? [item.to] : []
        )
      )
    )
  );
}

function agendarQuandoOcioso(callback: () => void) {
  const timeoutId = globalThis.setTimeout(callback, 600);
  return () => globalThis.clearTimeout(timeoutId);
}

const captacaoMenuPermissions = [
  "ADMINISTRADOR",
  "CAPTACAO_DASHBOARD_VISUALIZAR",
  "CAPTACAO_DOADORES_VISUALIZAR",
  "CAPTACAO_DOADORES_CADASTRAR",
  "CAPTACAO_DOADORES_EDITAR",
  "CAPTACAO_DOADORES_INATIVAR",
  "CAPTACAO_DOACOES_VISUALIZAR",
  "CAPTACAO_DOACOES_CADASTRAR",
  "CAPTACAO_DOACOES_CONFIRMAR",
  "CAPTACAO_DOACOES_CANCELAR",
  "CAPTACAO_DOACOES_ESTORNAR",
  "CAPTACAO_COBRANCAS_GERAR",
  "CAPTACAO_COMPROVANTES_EMITIR",
  "CAPTACAO_COMPROVANTES_REENVIAR",
  "CAPTACAO_CAMPANHAS_CRIAR",
  "CAPTACAO_CAMPANHAS_EDITAR",
  "CAPTACAO_CAMPANHAS_PAUSAR",
  "CAPTACAO_CAMPANHAS_ENCERRAR",
  "CAPTACAO_PORTAL_ACESSAR",
  "CAPTACAO_CONFIGURAR",
  "CAPTACAO_RELATORIOS_VISUALIZAR",
  "CAPTACAO_RELATORIOS_EXPORTAR",
  "CAPTACAO_DADOS_SENSIVEIS_VISUALIZAR"
];

export const menuSections: MenuSection[] = [
  {
    id: "dashboard",
    secao: "Dashboard",
    icon: LayoutDashboard,
    itens: [
      { id: "dashboard-visao-geral", to: "/dashboard/visao-geral", label: "Visão geral", icon: ChartPie },
      { id: "dashboard-indicadores", to: "/dashboard/indicadores", label: "Indicadores", icon: ChartColumn },
      {
        id: "dashboard-vulnerabilidade",
        to: "/dashboard/vulnerabilidade",
        label: "Georreferenciamento",
        icon: MapPinned
      },
      {
        id: "dashboard-power-bi",
        to: "/dashboard/power-bi",
        label: "Power BI",
        icon: Presentation,
        requiredPermissions: ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"]
      }
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
    icon: HeartHandshake,
    itens: [
      {
        id: "atendimentos-central-atendimentos",
        to: "/atendimentos/central-atendimentos",
        label: "Central de Atendimentos",
        icon: HeartHandshake
      },
      {
        id: "atendimentos-matriculas",
        to: "/atendimentos/matriculas",
        label: "Inscrições",
        icon: GraduationCap
      },
      {
        id: "atendimentos-banco-empregos",
        to: "/atendimentos/banco-empregos",
        label: "Banco de empregos",
        icon: BriefcaseBusiness
      },
      {
        id: "atendimentos-biblioteca",
        to: "/atendimentos/biblioteca",
        label: "Biblioteca",
        icon: LibraryBig
      },
      {
        id: "atendimentos-registro-visitas",
        to: "/atendimentos/registro-visitas",
        label: "Registro de visitas",
        icon: MapPinned
      },
      {
        id: "atendimentos-ocorrencias",
        to: "/atendimentos/ocorrencias",
        label: "Ocorrências",
        icon: Siren
      },
      {
        id: "atendimentos-chamada-senhas",
        to: "/atendimentos/chamada-senhas",
        label: "Chamada de senhas",
        icon: Ticket
      },
      {
        id: "atendimentos-painel-senhas",
        to: "/senhas/painel",
        label: "Painel de senhas",
        icon: MonitorDot,
        abrirEmNovaAba: true
      },
      {
        id: "atendimentos-registro-doacao",
        to: "/financeiro/registro-doacao",
        label: "Recebimento de doações",
        icon: CircleDollarSign
      },
      {
        id: "atendimentos-doacoes-realizadas",
        to: "/financeiro/doacoes-realizadas",
        label: "Doação realizada",
        icon: Gift
      }
    ]
  },
  {
    id: "setor-administrativo",
    secao: "Setor administrativo",
    icon: FolderKanban,
    itens: [
      {
        id: "setor-administrativo-almoxarifado",
        to: "/setor-administrativo/almoxarifado",
        label: "Almoxarifado",
        icon: Package
      },
      {
        id: "setor-administrativo-controle-veiculos",
        to: "/setor-administrativo/controle-veiculos",
        label: "Controle de veículos",
        icon: CarFront
      },
      {
        id: "setor-administrativo-emprestimos-eventos",
        to: "/setor-administrativo/emprestimo-eventos",
        label: "Empréstimo para eventos",
        icon: CalendarRange
      },
      {
        id: "setor-administrativo-fotos-eventos",
        to: "/setor-administrativo/fotos-eventos",
        label: "Fotos e eventos",
        icon: ImageIcon
      },
      {
        id: "setor-administrativo-gestao-documentos",
        to: "/setor-administrativo/gestao-documentos",
        label: "Gestão de documentos",
        icon: Files
      },
      {
        id: "setor-administrativo-oficios-protocolos",
        to: "/setor-administrativo/oficios-protocolos",
        label: "Ofícios e protocolos",
        icon: ScrollText
      },
      {
        id: "setor-administrativo-patrimonio",
        to: "/setor-administrativo/patrimonio",
        label: "Patrimônio",
        icon: Landmark
      },
      {
        id: "setor-administrativo-tarefas-pendencias",
        to: "/setor-administrativo/tarefas-pendencias",
        label: "Tarefas e pendências",
        icon: CheckSquare2
      },
      {
        id: "setor-administrativo-lembretes-diarios",
        to: "/setor-administrativo/lembretes-diarios",
        label: "Lembretes diários",
        icon: AlarmClockCheck
      }
    ]
  },
  {
    id: "setor-juridico",
    secao: "Setor jurídico",
    icon: Scale,
    itens: [
      {
        id: "setor-juridico-plano-trabalho",
        to: "/setor-juridico/plano-trabalho",
        label: "Plano de trabalho",
        icon: ClipboardPenLine
      },
      {
        id: "setor-juridico-termo-fomento",
        to: "/setor-juridico/termo-fomento",
        label: "Termo de fomento",
        icon: FileText
      }
    ]
  },
  {
    id: "financeiro",
    secao: "Setor financeiro",
    icon: WalletCards,
    itens: [
      {
        id: "setor-financeiro-autorizacao-compras",
        to: "/setor-financeiro/autorizacao-compras",
        label: "Autorização de compras",
        icon: HandCoins
      },
      {
        id: "setor-financeiro-contabilidade",
        to: "/setor-financeiro/contabilidade",
        label: "Contabilidade",
        icon: DollarSign
      },
      {
        id: "setor-financeiro-prestacao-contas",
        to: "/setor-financeiro/prestacao-contas",
        label: "Prestação de contas",
        icon: BadgeDollarSign
      },
      {
        id: "setor-financeiro-captacao-recursos",
        to: "/captacao-recursos/dashboard",
        label: "Captação de recursos",
        icon: HandCoins,
        activeMatchPaths: ["/captacao-recursos"],
        requiredPermissions: captacaoMenuPermissions
      }
    ]
  },
  {
    id: "setor-vendas",
    secao: "Setor vendas",
    icon: ShoppingBasket,
    itens: [
      {
        id: "setor-vendas-historico",
        to: "/setor-vendas/historico",
        label: "Historico de vendas",
        icon: ScrollText
      },
      {
        id: "setor-vendas-frente-caixa",
        to: "/setor-vendas/frente-caixa",
        label: "Frente de caixa",
        icon: ScanBarcode,
        abrirEmNovaAba: true
      }
    ]
  },
  {
    id: "setor-rh",
    secao: "Setor RH",
    icon: UserCog,
    itens: [
      {
        id: "setor-rh-registro-ponto",
        to: "/setor-rh/registro-ponto",
        label: "Registro de ponto",
        icon: Clock3
      },
      {
        id: "setor-rh-contratacao",
        to: "/setor-rh/contratacao",
        label: "Contratação",
        icon: ShieldUser
      }
    ]
  },
  {
    id: "configuracoes-gerais",
    secao: "Configurações gerais",
    icon: Settings2,
    itens: [
      {
        id: "configuracoes-chamado-tecnico",
        to: "/configuracoes/chamado-tecnico",
        label: "Chamado técnico",
        icon: ListFilter
      },
      {
        id: "configuracoes-mensagens-personalizadas",
        to: "/configuracoes/mensagens-personalizadas",
        label: "Mensagens personalizadas",
        icon: MailPlus,
        requiredPermissions: [
          "ADMINISTRADOR",
          "OPERADOR",
          "LEITURA_APENAS",
          "MENSAGENS_PERSONALIZADAS_VISUALIZAR"
        ]
      },
      {
        id: "configuracoes-licenca-uso",
        to: "/configuracoes/licenca-uso",
        label: "Licença de uso",
        icon: ReceiptText,
        requiredPermissions: ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"]
      },
      {
        id: "configuracoes-manual-sistema",
        to: "/configuracoes/manual-do-sistema",
        label: "Manual do sistema",
        icon: BookOpenText
      },
      {
        id: "configuracoes-pesquise-na-ia",
        to: "/configuracoes/pesquise-na-ia",
        label: "Pesquise na IA",
        icon: Brain
      },
      {
        id: "configuracoes-sobre-o-sistema",
        to: "/configuracoes/sobre-o-sistema",
        label: "Sobre o sistema",
        icon: ShieldCheck
      },
      {
        id: "configuracoes-atualizar-sistema",
        to: "/configuracoes/atualizar-sistema",
        label: "Atualizar sistema",
        icon: RefreshCcw,
        requiredPermissions: [
          "ADMINISTRADOR",
          "CONFIG_ATUALIZAR_SISTEMA",
          "CONFIG_ALTERAR_MODO_ATUALIZACAO",
          "CONFIG_EXECUTAR_ROLLBACK"
        ]
      },
      {
        id: "configuracoes-datas-comemorativas",
        to: "/configuracoes/datas-comemorativas",
        label: "Datas comemorativas",
        icon: CalendarRange,
        requiredPermissions: ["ADMINISTRADOR", "DATAS_COMEMORATIVAS_VISUALIZAR"]
      },
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
  if (pathname.startsWith("/dashboard/vulnerabilidade")) return "Georreferenciamento";
  if (pathname.startsWith("/dashboard/power-bi")) return "Power BI";
  if (pathname.startsWith("/cadastros/beneficiarios")) return "Cadastro de beneficiários";
  if (pathname.startsWith("/cadastros/profissionais")) return "Cadastro de profissionais";
  if (pathname.startsWith("/cadastros/voluntariado")) return "Cadastro de voluntariado";
  if (pathname.startsWith("/atendimentos/central-atendimentos")) return "Central de Atendimentos";
  if (pathname.startsWith("/atendimentos/matriculas")) return "Inscrições";
  if (pathname.startsWith("/atendimentos/banco-empregos")) return "Banco de empregos";
  if (pathname.startsWith("/atendimentos/biblioteca")) return "Biblioteca";
  if (pathname.startsWith("/atendimentos/registro-visitas")) return "Registro de visitas";
  if (pathname.startsWith("/atendimentos/ocorrencias")) return "Ocorrências";
  if (pathname.startsWith("/atendimentos/chamada-senhas")) return "Chamada de senhas";
  if (pathname.startsWith("/financeiro/registro-doacao")) return "Recebimento de doações";
  if (pathname.startsWith("/financeiro/doacoes-realizadas")) return "Doação realizada";
  if (pathname.startsWith("/cadastros/unidades-assistenciais")) return "Cadastro de unidade assistencial";
  if (pathname.startsWith("/cadastros/vinculo-familiar")) return "Cadastro de vínculo familiar";
  if (pathname.startsWith("/captacao-recursos/dashboard")) return "Dashboard de captação";
  if (pathname.startsWith("/captacao-recursos/doadores")) return "Doadores";
  if (pathname.startsWith("/captacao-recursos/doacoes")) return "Doações";
  if (pathname.startsWith("/captacao-recursos/campanhas")) return "Campanhas";
  if (pathname.startsWith("/captacao-recursos/portal-doador")) return "Portal doador";
  if (pathname.startsWith("/captacao-recursos/comprovantes")) return "Comprovantes";
  if (pathname.startsWith("/captacao-recursos/configuracoes-pagamento")) return "Configurações de pagamento";
  if (pathname.startsWith("/captacao-recursos/relatorios")) return "Relatórios";
  if (pathname.startsWith("/captacao-recursos/permissoes")) return "Permissões do módulo";
  if (pathname.startsWith("/configuracoes/parametros-sistema")) return "Parâmetros do sistema";
  if (pathname.startsWith("/configuracoes/datas-comemorativas")) return "Datas comemorativas";
  if (pathname.startsWith("/configuracoes/atualizar-sistema")) return "Atualizar sistema";
  if (pathname.startsWith("/configuracoes/chamado-tecnico")) return "Chamado técnico";
  if (pathname.startsWith("/configuracoes/licenca-uso")) return "Licença de uso";
  if (pathname.startsWith("/configuracoes/manual-do-sistema")) return "Manual do sistema";
  if (pathname.startsWith("/configuracoes/pesquise-na-ia")) return "Pesquise na IA";
  if (pathname.startsWith("/configuracoes/sobre-o-sistema")) return "Sobre o sistema";
  if (pathname.startsWith("/configuracoes/mensagens-personalizadas")) return "Mensagens personalizadas";
  if (pathname.startsWith("/configuracoes/usuarios")) return "Usuários";
  if (pathname.startsWith("/setor-vendas/historico")) return "Historico de vendas";
  if (pathname.startsWith("/setor-rh/registro-ponto")) return "Registro de ponto";
  if (pathname.startsWith("/setor-administrativo/almoxarifado")) return "Almoxarifado";
  if (pathname.startsWith("/setor-administrativo/controle-veiculos")) return "Controle de veículos";
  if (pathname.startsWith("/setor-administrativo/emprestimo-eventos")) return "Empréstimo para eventos";
  if (pathname.startsWith("/setor-administrativo/fotos-eventos")) return "Fotos e eventos";
  if (pathname.startsWith("/setor-administrativo/gestao-documentos")) return "Gestão de documentos";
  if (pathname.startsWith("/setor-administrativo/oficios-protocolos")) return "Ofícios e protocolos";
  if (pathname.startsWith("/setor-administrativo/patrimonio")) return "Patrimônio";
  if (pathname.startsWith("/setor-administrativo/tarefas-pendencias")) return "Tarefas e pendências";
  if (pathname.startsWith("/setor-administrativo/lembretes-diarios")) return "Lembretes diários";
  if (pathname.startsWith("/setor-juridico/plano-trabalho")) return "Plano de trabalho";
  if (pathname.startsWith("/setor-juridico/termo-fomento")) return "Termo de fomento";
  if (pathname.startsWith("/setor-financeiro/autorizacao-compras")) return "Autorização de compras";
  if (pathname.startsWith("/setor-financeiro/contabilidade")) return "Contabilidade";
  if (pathname.startsWith("/setor-financeiro/prestacao-contas")) return "Prestação de contas";
  if (pathname.startsWith("/setor-rh/contratacao")) return "Contratação";
  return "Painel de migração";
}

function ocultarTituloTopo(pathname: string) {
  return (
    pathname.startsWith("/cadastros/") ||
    pathname.startsWith("/dashboard/power-bi") ||
    pathname.startsWith("/configuracoes/chamado-tecnico") ||
    pathname.startsWith("/configuracoes/mensagens-personalizadas") ||
    pathname.startsWith("/atendimentos/central-atendimentos") ||
    pathname.startsWith("/atendimentos/matriculas") ||
    pathname.startsWith("/atendimentos/banco-empregos") ||
    pathname.startsWith("/atendimentos/biblioteca") ||
    pathname.startsWith("/atendimentos/registro-visitas") ||
    pathname.startsWith("/atendimentos/ocorrencias") ||
    pathname.startsWith("/atendimentos/chamada-senhas") ||
    pathname.startsWith("/setor-rh/contratacao") ||
    pathname.startsWith("/setor-rh/registro-ponto") ||
    pathname.startsWith("/financeiro/") ||
    pathname.startsWith("/setor-financeiro/") ||
    pathname.startsWith("/captacao-recursos/") ||
    pathname.startsWith("/setor-juridico/plano-trabalho") ||
    pathname.startsWith("/setor-juridico/termo-fomento") ||
    pathname.startsWith("/setor-administrativo/")
  );
}

function itemEstaAtivo(pathname: string, item: MenuItem) {
  const rotasAtivas = item.activeMatchPaths?.length ? item.activeMatchPaths : item.to ? [item.to] : [];
  return rotasAtivas.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
}

export function AppShell() {
  const { usuario, logout } = useAuth();
  const [carregarResumoInicial, setCarregarResumoInicial] = useState(false);
  const [popupPontoPendente, setPopupPontoPendente] = useState<RegistroPontoAlertaPendente | null>(null);
  const [popupDatasComemorativas, setPopupDatasComemorativas] = useState<DataComemorativaPopupPayload | null>(null);
  const [usuarioVerificadoPontoId, setUsuarioVerificadoPontoId] = useState<string | null>(null);
  const [usuarioVerificadoDatasId, setUsuarioVerificadoDatasId] = useState<string | null>(null);
  const usuarioId = usuario?.id ? Number(usuario.id) : undefined;
  const { data: unidadeAtualData } = useUnidadeAssistencialAtual({ enabled: carregarResumoInicial });
  const { data: lembretesResumoData, isFetched: lembretesResumoCarregado } = useResumoLembretesDiarios(usuarioId, {
    enabled: carregarResumoInicial && typeof usuarioId === "number"
  });
  const { data: tarefasResumoData } = useResumoTarefasAdministrativas({ enabled: carregarResumoInicial });
  const location = useLocation();
  const navigate = useNavigate();
  const titulo = obterTitulo(location.pathname);
  const semTituloNoTopo = ocultarTituloTopo(location.pathname);
  const versaoSistema = APP_VERSION;
  const [sidebarRecolhida, setSidebarRecolhida] = useState(false);
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});
  const [lembreteAlertaAtivo, setLembreteAlertaAtivo] = useState(false);
  const logomarcaInstituicao = unidadeAtualData?.unidade?.logomarca;
  const nomeInstituicao =
    unidadeAtualData?.unidade?.nome_fantasia ??
    unidadeAtualData?.unidade?.razao_social ??
    "Sistema G3";

  const permissoesUsuario = usuario?.permissoes ?? [];
  const totalPendentes = lembretesResumoData?.totalPendentes ?? 0;
  const totalVencidos = lembretesResumoData?.totalVencidos ?? 0;
  const lembreteAlertaVisivel = lembreteAlertaAtivo || totalVencidos > 0;
  const lembretePisca = totalVencidos > 0;
  const totalTarefasPendentes = tarefasResumoData?.totalPendentes ?? 0;
  const totalTarefasEmAtraso = tarefasResumoData?.totalEmAtraso ?? 0;
  const tarefaAlertaVisivel = totalTarefasPendentes > 0;
  const tarefaPisca = totalTarefasEmAtraso > 0;
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
        itens: ordenarItensMenu(
          secao.itens.filter((item) => possuiPermissao(item.requiredPermissions))
        )
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
    const rotas = listarRotasMenuParaPrecarregar(menuSectionsVisiveis, location.pathname);
    if (rotas.length === 0) {
      return;
    }

    const cancelarAgendamento = agendarQuandoOcioso(() => {
      void precarregarRotas(rotas);
    });

    return cancelarAgendamento;
  }, [location.pathname, menuSectionsVisiveis]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setCarregarResumoInicial(true);
      });
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, []);

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

  useEffect(() => {
    const atualizarAlerta = () => {
      setLembreteAlertaAtivo(localStorage.getItem("g3_lembrete_alerta") === "1");
    };

    atualizarAlerta();

    const onStorage = (event: StorageEvent) => {
      if (event.key === "g3_lembrete_alerta") {
        atualizarAlerta();
      }
    };

    const onCustom = () => atualizarAlerta();

    window.addEventListener("storage", onStorage);
    window.addEventListener("g3-lembrete-alerta", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("g3-lembrete-alerta", onCustom);
    };
  }, []);

  useEffect(() => {
    if (!lembretesResumoCarregado) {
      return;
    }

    if (totalPendentes === 0 && lembreteAlertaAtivo) {
      localStorage.removeItem("g3_lembrete_alerta");
      setLembreteAlertaAtivo(false);
    }
  }, [totalPendentes, lembreteAlertaAtivo, lembretesResumoCarregado]);

  useEffect(() => {
    if (!usuario?.id) {
      setPopupPontoPendente(null);
      setUsuarioVerificadoPontoId(null);
      return;
    }

    if (usuarioVerificadoPontoId === usuario.id) {
      return;
    }

    let ativo = true;

    void (async () => {
      try {
        const alerta = await registroPontoService.buscarAlertaPendente();
        if (ativo && alerta.exibir_alerta) {
          setPopupPontoPendente(alerta);
        }
      } catch {
        if (ativo) {
          setPopupPontoPendente(null);
        }
      } finally {
        if (ativo) {
          setUsuarioVerificadoPontoId(usuario.id);
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [usuario?.id, usuarioVerificadoPontoId]);

  useEffect(() => {
    if (!usuario?.id) {
      setPopupDatasComemorativas(null);
      setUsuarioVerificadoDatasId(null);
      return;
    }

    if (!carregarResumoInicial) {
      return;
    }

    const podeVisualizarDatas =
      permissoesUsuario.includes("ADMINISTRADOR") ||
      permissoesUsuario.includes("DATAS_COMEMORATIVAS_VISUALIZAR");

    if (!podeVisualizarDatas) {
      setPopupDatasComemorativas(null);
      setUsuarioVerificadoDatasId(usuario.id);
      return;
    }

    if (usuarioVerificadoDatasId === usuario.id) {
      return;
    }

    let ativo = true;
    const dataReferencia = formatarDataLocalIso(new Date());

    void (async () => {
      try {
        const popup = await datasComemorativasService.obterPopupHoje({
          data: dataReferencia,
          uf: unidadeAtualData?.unidade?.estado,
          municipio: unidadeAtualData?.unidade?.cidade
        });

        if (!ativo) return;

        if (popup.exibirPopup && popup.eventos.length) {
          setPopupDatasComemorativas(popup);
          await datasComemorativasService.registrarVisualizacao({
            data: dataReferencia,
            eventIds: popup.eventos.map((evento) => evento.id),
            acao: "visualizado"
          });
        } else {
          setPopupDatasComemorativas(null);
        }
      } catch {
        if (ativo) {
          setPopupDatasComemorativas(null);
        }
      } finally {
        if (ativo) {
          setUsuarioVerificadoDatasId(usuario.id);
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [
    carregarResumoInicial,
    permissoesUsuario,
    unidadeAtualData?.unidade?.cidade,
    unidadeAtualData?.unidade?.estado,
    usuario?.id,
    usuarioVerificadoDatasId
  ]);

  function abrirLembretes() {
    localStorage.removeItem("g3_lembrete_alerta");
    setLembreteAlertaAtivo(false);
    navigate("/setor-administrativo/lembretes-diarios?tab=lembretes");
  }

  function abrirTarefas() {
    navigate("/setor-administrativo/tarefas-pendencias?tab=listagem");
  }

  function confirmarPopupPontoPendente() {
    setPopupPontoPendente(null);
    navigate("/setor-rh/registro-ponto?aba=marcacao");
  }

  function formatarDataLocalIso(data: Date) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(
      data.getDate()
    ).padStart(2, "0")}`;
  }

  function precarregarItemMenu(item: MenuItem) {
    if (!item.to || item.abrirEmNovaAba) {
      return;
    }

    void precarregarRota(item.to);
  }

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
                    src={resolverUrlArquivo(logomarcaInstituicao)}
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
                        <NavLink
                          key={item.id}
                          to={item.to}
                          target={item.abrirEmNovaAba ? "_blank" : undefined}
                          rel={item.abrirEmNovaAba ? "noreferrer" : undefined}
                          onMouseEnter={() => precarregarItemMenu(item)}
                          onFocus={() => precarregarItemMenu(item)}
                          onTouchStart={() => precarregarItemMenu(item)}
                        >
                          {({ isActive }) => {
                            const itemAtivo = isActive || itemEstaAtivo(location.pathname, item);
                            return (
                            <span
                              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                itemAtivo
                                  ? "border-[var(--g3-active)] bg-[var(--g3-card)] text-[var(--g3-active)] shadow-sm"
                                  : "border-transparent text-[var(--g3-foreground)] hover:border-[var(--g3-border)] hover:bg-[var(--g3-primary-soft-hover)]"
                              }`}
                            >
                              <item.icon className="h-3.5 w-3.5" />
                              {item.label}
                            </span>
                          );
                          }}
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
              {semTituloNoTopo ? <div className="min-h-0 min-w-0" /> : (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-sm font-semibold text-[var(--g3-foreground)] sm:text-base">
                      {titulo}
                    </h1>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {lembreteAlertaVisivel && (
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 ${
                      lembretePisca ? "animate-pulse" : ""
                    }`}
                    onClick={abrirLembretes}
                    aria-label="Abrir lembretes diários"
                    title="Abrir lembretes diários"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Lembrete
                    {totalPendentes > 0 && (
                      <span className="ml-1 rounded-full bg-amber-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {totalPendentes}
                      </span>
                    )}
                  </button>
                )}
                {tarefaAlertaVisivel && (
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-700 ${
                      tarefaPisca ? "animate-pulse" : ""
                    }`}
                    onClick={abrirTarefas}
                    aria-label="Abrir tarefas e pendências"
                    title="Abrir tarefas e pendências"
                  >
                    <ListTodo className="h-3.5 w-3.5" />
                    Tarefas
                    {totalTarefasPendentes > 0 && (
                      <span className="ml-1 rounded-full bg-sky-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {totalTarefasPendentes}
                      </span>
                    )}
                  </button>
                )}
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

            <nav className="mt-2 space-y-2 lg:hidden">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {menuSectionsVisiveis.map((secao) => {
                  const grupoAberto = gruposAbertos[secao.id] ?? secao.id === secaoAtivaId;
                  const grupoAtivo = secao.id === secaoAtivaId;
                  const IconeSecao = secao.icon;

                  return (
                    <button
                      key={secao.id}
                      type="button"
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        grupoAberto || grupoAtivo
                          ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"
                          : "border-[var(--g3-border)] bg-[var(--g3-card)] text-[var(--g3-muted)]"
                      }`}
                      onClick={() => alternarGrupo(secao.id)}
                    >
                      <IconeSecao className="h-3.5 w-3.5" />
                      {secao.secao}
                    </button>
                  );
                })}
              </div>

              {menuSectionsVisiveis
                .filter((secao) => gruposAbertos[secao.id] ?? secao.id === secaoAtivaId)
                .map((secao) => (
                  <div
                    key={secao.id}
                    className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-2 shadow-sm"
                  >
                    <div className="mb-1 flex items-center gap-2 px-1 py-1">
                      <secao.icon className="h-3.5 w-3.5 text-[var(--g3-active)]" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--g3-active)]">
                        {secao.secao}
                      </p>
                    </div>
                    <div className="grid gap-1.5">
                      {secao.itens.map((item) =>
                        item.to ? (
                          <NavLink
                            key={item.id}
                            to={item.to}
                            target={item.abrirEmNovaAba ? "_blank" : undefined}
                            rel={item.abrirEmNovaAba ? "noreferrer" : undefined}
                            onMouseEnter={() => precarregarItemMenu(item)}
                            onFocus={() => precarregarItemMenu(item)}
                            onTouchStart={() => precarregarItemMenu(item)}
                          >
                            {({ isActive }) => {
                              const itemAtivo = isActive || itemEstaAtivo(location.pathname, item);
                              return (
                                <span
                                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium ${
                                    itemAtivo
                                      ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"
                                      : "border-[var(--g3-border)] bg-[var(--g3-card-soft)] text-[var(--g3-foreground)]"
                                  }`}
                                >
                                  <item.icon className="h-3.5 w-3.5" />
                                  {item.label}
                                </span>
                              );
                            }}
                          </NavLink>
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
            </nav>
          </div>
        </header>

        <Outlet />
      </div>

      <PopupConfirmacao
        aberto={!!popupPontoPendente?.exibir_alerta}
        titulo="Ponto pendente"
        texto={
          popupPontoPendente?.mensagem ??
          "O ponto previsto para este horário ainda não foi registrado. Deseja registrar agora?"
        }
        onCancel={() => setPopupPontoPendente(null)}
        onConfirm={confirmarPopupPontoPendente}
        confirmarTexto="Sim"
        cancelarTexto="Não"
        confirmarVariant="default"
      />
      <DatasComemorativasPopup
        popup={popupDatasComemorativas}
        onClose={() => setPopupDatasComemorativas(null)}
        onDismissToday={() => {
          if (!popupDatasComemorativas?.dataReferencia) return;
          void datasComemorativasService
            .dispensarHoje({ data: popupDatasComemorativas.dataReferencia })
            .finally(() => setPopupDatasComemorativas(null));
        }}
        onViewCalendar={() => {
          const data = popupDatasComemorativas?.dataReferencia ?? formatarDataLocalIso(new Date());
          setPopupDatasComemorativas(null);
          navigate(`/configuracoes/datas-comemorativas?tab=calendario&data=${data}`);
        }}
      />
      <AIChatWidget />
    </div>
  );
}
