import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CircleDollarSign,
  Eye,
  FileCheck2,
  FileText,
  HandHeart,
  HandCoins,
  HeartHandshake,
  Landmark,
  LockKeyhole,
  Mail,
  MapPinned,
  MessageCircle,
  PieChart,
  Search,
  ShieldCheck,
  Target,
  UsersRound
} from "lucide-react";
import { PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { darken, lighten } from "@/lib/color-utils";
import { formatarCpf, somenteDigitos } from "@/lib/br-utils";
import {
  portaisExternosService,
  obterUrlLogoTransparencia,
  type PortalExternoCard,
  type PortalExternoIndicador,
  type PortalExternoPainel,
  type PortalExternoTimeline
} from "@/services/portais-externos.service";

type PortalTipo = "voluntario" | "beneficiario" | "transparencia" | "parceiro";

type PortalConfig = {
  tipo: PortalTipo;
  titulo: string;
  subtitulo: string;
  destaque: string;
  acaoPrimaria: string;
  cor: string;
  Icone: typeof HandHeart;
  identificadorLabel: string;
  identificadorPlaceholder: string;
  senhaLabel: string;
  senhaPlaceholder: string;
  indicadores: Array<{ label: string; valor: string; Icone: typeof Target }>;
  cards: Array<{ titulo: string; texto: string; Icone: typeof Target }>;
  linhaDoTempo: Array<{ titulo: string; detalhe: string }>;
  acessoRestrito: boolean;
};

function obterMensagemErro(error: any, fallback: string) {
  return error?.response?.data?.message ?? error?.response?.data?.mensagem ?? fallback;
}

function aplicarTemaPortal(tema?: PortalExternoPainel["tema"]): CSSProperties | undefined {
  if (!tema?.paleta) return undefined;

  const { paleta } = tema;
  return {
    "--g3-primary": paleta.cor_primaria,
    "--g3-primary-hover": darken(paleta.cor_primaria, 0.15),
    "--g3-primary-soft": lighten(paleta.cor_primaria, 0.82),
    "--g3-primary-soft-hover": lighten(paleta.cor_primaria, 0.7),
    "--g3-secondary": paleta.cor_secundaria,
    "--g3-accent": paleta.cor_destaque,
    "--g3-primary-button": paleta.cor_botao_primario,
    "--g3-primary-button-hover": darken(paleta.cor_botao_primario, 0.16),
    "--g3-link": paleta.cor_link,
    "--g3-active": paleta.cor_elemento_ativo,
    "--g3-bg": paleta.background,
    "--g3-page-gradient-start": lighten(paleta.background, 0.12),
    "--g3-page-gradient-end": lighten(paleta.background, 0.04),
    "--g3-card": paleta.card,
    "--g3-card-soft": lighten(paleta.card, 0.02),
    "--g3-foreground": paleta.foreground,
    "--g3-muted": paleta.muted,
    "--g3-border": paleta.border,
    "--g3-danger": paleta.danger,
    "--g3-warning": paleta.warning,
    "--g3-success": paleta.success,
    "--g3-info": paleta.info
  } as CSSProperties;
}

function formatarDataPortal(valor?: string) {
  if (!valor) return "---";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

function formatarDataHoraPortal(valor?: string) {
  if (!valor) return "---";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(data);
}

function formatarMoedaPortal(valor?: number) {
  if (typeof valor !== "number" || Number.isNaN(valor)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valor);
}

const limitesIniciaisPortal = {
  atendimentos: 5,
  beneficios: 5,
  agendamentos: 5,
  documentosPendentes: 5,
  movimentacoes: 5
} as const;

const portalConfigs: Record<PortalTipo, PortalConfig> = {
  voluntario: {
    tipo: "voluntario",
    titulo: "Portal do voluntário",
    subtitulo: "Escalas, horas, oportunidades e certificados em um único espaço.",
    destaque: "Minha participação social",
    acaoPrimaria: "Entrar no portal",
    cor: "#0f766e",
    Icone: HandHeart,
    identificadorLabel: "E-mail ou CPF",
    identificadorPlaceholder: "Digite seu e-mail ou CPF",
    senhaLabel: "Senha",
    senhaPlaceholder: "Digite sua senha",
    acessoRestrito: true,
    indicadores: [
      { label: "Horas registradas", valor: "0h", Icone: CalendarCheck },
      { label: "Escalas futuras", valor: "0", Icone: ClipboardList },
      { label: "Certificados", valor: "0", Icone: FileCheck2 }
    ],
    cards: [
      {
        titulo: "Oportunidades disponíveis",
        texto: "Acompanhe ações abertas conforme área de interesse, disponibilidade e unidade.",
        Icone: Target
      },
      {
        titulo: "Escalas e check-in",
        texto: "Consulte compromissos confirmados e registre presença nas ações da instituição.",
        Icone: CalendarCheck
      },
      {
        titulo: "Certificados e termos",
        texto: "Acesse certificados, termos de adesão e histórico de participação.",
        Icone: FileText
      }
    ],
    linhaDoTempo: [
      { titulo: "Cadastro aprovado", detalhe: "Dados validados pela equipe da instituição." },
      { titulo: "Escala liberada", detalhe: "Próximas atividades aparecerão aqui após confirmação." },
      { titulo: "Certificado disponível", detalhe: "Certificados serão emitidos após validação das horas." }
    ]
  },
  beneficiario: {
    tipo: "beneficiario",
    titulo: "Portal do beneficiário e família",
    subtitulo: "Atendimentos, agenda, documentos e comunicados para a família acompanhada.",
    destaque: "Minha jornada de atendimento",
    acaoPrimaria: "Acessar acompanhamento",
    cor: "#2563eb",
    Icone: HeartHandshake,
    identificadorLabel: "CPF",
    identificadorPlaceholder: "Digite o CPF do beneficiário",
    senhaLabel: "Senha de acesso",
    senhaPlaceholder: "Digite a senha de 4 dígitos",
    acessoRestrito: true,
    indicadores: [
      { label: "Atendimentos", valor: "0", Icone: HeartHandshake },
      { label: "Agendamentos", valor: "0", Icone: CalendarCheck },
      { label: "Documentos pendentes", valor: "0", Icone: FileText }
    ],
    cards: [
      {
        titulo: "Agenda da família",
        texto: "Consulte cursos, oficinas, visitas, atendimentos e compromissos confirmados.",
        Icone: CalendarCheck
      },
      {
        titulo: "Histórico de atendimento",
        texto: "Acompanhe registros compartilhados pela equipe e próximos encaminhamentos.",
        Icone: ClipboardList
      },
      {
        titulo: "Documentos e avisos",
        texto: "Receba orientações, pendências e comunicados importantes da instituição.",
        Icone: MessageCircle
      }
    ],
    linhaDoTempo: [
      { titulo: "Cadastro familiar", detalhe: "Dados principais da família ficam disponíveis após liberação." },
      { titulo: "Acompanhamento ativo", detalhe: "Atendimentos e encaminhamentos serão exibidos conforme permissão." },
      { titulo: "Agenda compartilhada", detalhe: "Compromissos confirmados aparecem no painel da família." }
    ]
  },
  transparencia: {
    tipo: "transparencia",
    titulo: "Portal da transparência",
    subtitulo: "Indicadores, projetos, documentos públicos e prestação social da instituição.",
    destaque: "Transparência institucional",
    acaoPrimaria: "Consultar informações",
    cor: "#7c3aed",
    Icone: PieChart,
    identificadorLabel: "Buscar",
    identificadorPlaceholder: "Projeto, campanha, documento ou período",
    senhaLabel: "Filtro adicional",
    senhaPlaceholder: "Opcional",
    acessoRestrito: false,
    indicadores: [
      { label: "Projetos publicados", valor: "0", Icone: Target },
      { label: "Documentos públicos", valor: "0", Icone: FileCheck2 },
      { label: "Indicadores sociais", valor: "0", Icone: BarChart3 }
    ],
    cards: [
      {
        titulo: "Projetos e resultados",
        texto: "Consulte objetivos, metas, público atendido, indicadores e evidências públicas.",
        Icone: Target
      },
      {
        titulo: "Prestação de contas pública",
        texto: "Acesse documentos, relatórios e demonstrativos liberados para consulta externa.",
        Icone: FileCheck2
      },
      {
        titulo: "Mapa de atuação",
        texto: "Visualize territórios, unidades e frentes de atendimento da organização.",
        Icone: MapPinned
      }
    ],
    linhaDoTempo: [
      { titulo: "Projetos ativos", detalhe: "Projetos publicados aparecerão com metas e andamento." },
      { titulo: "Evidências liberadas", detalhe: "Fotos, listas e relatórios públicos ficam organizados por projeto." },
      { titulo: "Relatórios consolidados", detalhe: "A instituição define quais dados serão exibidos externamente." }
    ]
  },
  parceiro: {
    tipo: "parceiro",
    titulo: "Portal do parceiro e financiador",
    subtitulo: "Acompanhamento de projetos, metas, documentos e impacto dos recursos apoiados.",
    destaque: "Painel do parceiro",
    acaoPrimaria: "Entrar como parceiro",
    cor: "#0369a1",
    Icone: Building2,
    identificadorLabel: "E-mail institucional",
    identificadorPlaceholder: "Digite o e-mail do parceiro",
    senhaLabel: "Senha",
    senhaPlaceholder: "Digite sua senha",
    acessoRestrito: true,
    indicadores: [
      { label: "Projetos apoiados", valor: "0", Icone: Target },
      { label: "Metas acompanhadas", valor: "0", Icone: BarChart3 },
      { label: "Relatórios disponíveis", valor: "0", Icone: FileText }
    ],
    cards: [
      {
        titulo: "Projetos financiados",
        texto: "Acompanhe execução física, financeira, metas e evidências vinculadas ao apoio.",
        Icone: Target
      },
      {
        titulo: "Relatórios e documentos",
        texto: "Consulte prestações, arquivos, anexos e relatórios narrativos autorizados.",
        Icone: FileText
      },
      {
        titulo: "Comunicação com a equipe",
        texto: "Centralize solicitações, devolutivas e pendências entre parceiro e instituição.",
        Icone: Mail
      }
    ],
    linhaDoTempo: [
      { titulo: "Contrato ou parceria", detalhe: "O vínculo libera projetos e documentos permitidos." },
      { titulo: "Execução monitorada", detalhe: "Metas, custos e evidências aparecem por projeto apoiado." },
      { titulo: "Prestação entregue", detalhe: "Relatórios finais ficam disponíveis após validação interna." }
    ]
  }
};

function PortalExternoPage({ tipo, tenantSlug }: { tipo: PortalTipo; tenantSlug?: string }) {
  const config = portalConfigs[tipo];
  const [identificador, setIdentificador] = useState("");
  const [instituicaoBusca, setInstituicaoBusca] = useState("");
  const [instituicaoBeneficiario, setInstituicaoBeneficiario] = useState("");
  const [senha, setSenha] = useState("");
  const [acessoLiberado, setAcessoLiberado] = useState(!config.acessoRestrito);
  const [painel, setPainel] = useState<PortalExternoPainel | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [limitesPortal, setLimitesPortal] = useState(limitesIniciaisPortal);
  const portalThemeStyle = useMemo(() => aplicarTemaPortal(painel?.tema), [painel?.tema]);

  const indicadores = useMemo(
    () =>
      (painel?.indicadores ?? config.indicadores).map((item: PortalExternoIndicador, index) => ({
        ...item,
        Icone: config.indicadores[index]?.Icone ?? Target
      })),
    [config.indicadores, painel?.indicadores]
  );
  const cards = useMemo(
    () =>
      (painel?.cards ?? config.cards).map((item: PortalExternoCard, index) => ({
        ...item,
        Icone: config.cards[index]?.Icone ?? Target
      })),
    [config.cards, painel?.cards]
  );
  const linhaDoTempo = (painel?.linhaDoTempo ?? config.linhaDoTempo) as PortalExternoTimeline[];
  const atendimentosPortal = painel?.atendimentos ?? [];
  const beneficiosPortal = painel?.beneficios ?? [];
  const agendamentosPortal = painel?.agendamentos ?? [];
  const documentosPendentesPortal = painel?.documentosPendentes ?? [];
  const movimentacoesPortal = painel?.movimentacoes ?? [];

  useEffect(() => {
    setLimitesPortal(limitesIniciaisPortal);
  }, [painel?.token, tipo]);

  useEffect(() => {
    setIdentificador("");
    setInstituicaoBusca("");
    setInstituicaoBeneficiario("");
    setSenha("");
    setPainel(null);
    setAcessoLiberado(!config.acessoRestrito);

    if (tipo !== "transparencia") return;

    let ativo = true;
    setCarregando(true);
    portaisExternosService
      .obterTransparencia(tenantSlug)
      .then((dados) => {
        if (!ativo) return;
        setPainel(dados);
        setAcessoLiberado(true);
      })
      .catch((error) => {
        if (!ativo) return;
        setPopup({
          tipo: "erro",
          titulo: "Falha ao carregar dados",
          texto: obterMensagemErro(error, "Não foi possível carregar os dados reais do portal.")
        });
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [config.acessoRestrito, tenantSlug, tipo]);

  useEffect(() => {
    if (tipo !== "beneficiario") return;
    setIdentificador((valorAtual) => formatarCpf(somenteDigitos(valorAtual).slice(0, 11)));
    setSenha((valorAtual) => somenteDigitos(valorAtual).slice(0, 4));
  }, [tipo]);

  async function acessarPortal(tenantSelecionadoOverride?: string) {
    const cpfNormalizado = somenteDigitos(identificador).slice(0, 11);
    const senhaNormalizada = somenteDigitos(senha).slice(0, 4);

    if (config.acessoRestrito && (!identificador.trim() || !senha.trim())) {
      setPopup({
        tipo: "aviso",
        titulo: "Dados obrigatórios",
        texto: "Informe os dados de acesso para entrar no portal."
      });
      return;
    }

    if (tipo === "beneficiario") {
      if (cpfNormalizado.length !== 11) {
        setPopup({
          tipo: "aviso",
          titulo: "CPF inválido",
          texto: "Informe o CPF do beneficiário com 11 dígitos."
        });
        return;
      }

      if (senhaNormalizada.length !== 4) {
        setPopup({
          tipo: "aviso",
          titulo: "Senha inválida",
          texto: "Informe a senha de 4 dígitos criada no cadastro do beneficiário."
        });
        return;
      }
    }

    setCarregando(true);
    try {
      if (tipo === "transparencia") {
        const dados = await portaisExternosService.obterTransparencia(tenantSlug);
        setPainel(dados);
      } else {
        const dados = await portaisExternosService.acessar(
          tipo,
          tipo === "beneficiario" ? cpfNormalizado : identificador,
          tipo === "beneficiario" ? senhaNormalizada : senha,
          tipo === "beneficiario" ? tenantSelecionadoOverride || instituicaoBeneficiario || undefined : undefined
        );
        setPainel(dados);
        if (tipo === "beneficiario") {
          const precisaEscolherInstituicao = (dados.instituicoesBeneficiario?.length ?? 0) > 1 && !dados.pessoa;
          setAcessoLiberado(!precisaEscolherInstituicao);
        }
      }

      if (tipo !== "beneficiario") setAcessoLiberado(true);
      setPopup({
        tipo: "sucesso",
        titulo: config.acessoRestrito ? "Acesso liberado" : "Consulta aberta",
        texto: config.acessoRestrito
          ? "O painel externo foi carregado com dados reais vinculados ao cadastro localizado."
          : "A consulta pública foi carregada com dados reais da instituição."
      });
    } catch (error: any) {
      setAcessoLiberado(!config.acessoRestrito);
      setPopup({
        tipo: "erro",
        titulo: "Acesso não liberado",
        texto: obterMensagemErro(error, "Não foi possível validar o acesso ao portal.")
      });
    } finally {
      setCarregando(false);
    }
  }

  function sairPortal() {
    setAcessoLiberado(!config.acessoRestrito);
    setPainel(null);
    setIdentificador("");
    setSenha("");
    setPopup({
      tipo: "aviso",
      titulo: "Acesso encerrado",
      texto: "O portal voltou para a tela inicial."
    });
  }

  function executarAcao(titulo: string) {
    setPopup({
      tipo: "aviso",
      titulo,
      texto: acessoLiberado
        ? "A rotina já está vinculada ao painel real do portal. A abertura detalhada será liberada na próxima etapa."
        : "Entre no portal para consultar os dados reais vinculados a esta rotina."
    });
  }

  function ampliarListaPortal(chave: keyof typeof limitesIniciaisPortal) {
    setLimitesPortal((atual) => ({
      ...atual,
      [chave]: atual[chave] + 5
    }));
  }

  function renderPortalTransparencia() {
    const instituicao = painel?.instituicao;
    const logoInstituicao = instituicao?.logoUrl
      ? (/^(https?:\/\/|data:)/i.test(instituicao.logoUrl)
          ? instituicao.logoUrl
          : obterUrlLogoTransparencia(instituicao.slug))
      : "";
    const buscaInstituicao = instituicaoBusca.trim().toLowerCase();
    const instituicoesFiltradas = (painel?.instituicoesDisponiveis ?? []).filter((item) =>
      !buscaInstituicao || `${item.nome} ${item.cnpj}`.toLowerCase().includes(buscaInstituicao)
    );
    const termoBusca = identificador.trim().toLowerCase();
    const itensPublicos = (painel?.itens ?? []).filter((item) => {
      if (!termoBusca) return true;
      return [item.titulo, item.subtitulo, item.status].some((valor) =>
        String(valor ?? "").toLowerCase().includes(termoBusca)
      );
    });
    const categorias = [
      { titulo: "Serviços", Icone: Landmark },
      { titulo: "Receitas", Icone: CircleDollarSign },
      { titulo: "Despesas", Icone: FileText },
      { titulo: "Convênios", Icone: HeartHandshake },
      { titulo: "Projetos", Icone: Target },
      { titulo: "Documentos", Icone: FileCheck2 }
    ];

    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <header className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 rounded-b-[26px] bg-white px-6 py-3 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.55)] sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl text-[var(--g3-primary)]">
              {logoInstituicao ? <img src={logoInstituicao} alt={`Logomarca de ${instituicao?.nome ?? "instituição"}`} className="h-full w-full object-contain" /> : <Landmark className="h-9 w-9" />}
            </span>
            <div>
              <p className="text-lg font-bold leading-5 text-slate-900">Portal da Transparência</p>
              <p className="text-sm text-slate-600">Consulta pública institucional</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 sm:gap-7">
            <button type="button" className="border-b-4 border-[var(--g3-primary)] px-2 py-3">Início</button>
            <button type="button" onClick={() => setIdentificador("")} className="px-2 py-3">Serviços</button>
            <button type="button" onClick={() => setIdentificador("projeto")} className="px-2 py-3">Projetos</button>
            <button type="button" onClick={() => setIdentificador("documento")} className="px-2 py-3">Documentos</button>
            <button type="button" className="inline-flex items-center gap-1 px-2 py-3">Mais <ChevronDown className="h-4 w-4" /></button>
            <Button type="button" size="sm" onClick={() => setPopup({ tipo: "aviso", titulo: "Área pública", texto: "Esta consulta não exige login. Utilize a busca para localizar informações publicadas." })}>
              <Eye className="mr-1.5 h-4 w-4" /> Consultar
            </Button>
            {instituicao ? <Button type="button" size="sm" variant="outline" onClick={() => { window.location.href = "/portal-transparencia"; }}>Trocar instituição</Button> : null}
          </nav>
        </header>

        <section className="bg-[linear-gradient(135deg,#173f70_0%,#0d2d52_100%)] px-5 pb-10 pt-9 text-white sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-center gap-5 sm:gap-8">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-3 shadow-inner sm:h-36 sm:w-36">
                {logoInstituicao ? <img src={logoInstituicao} alt={`Logomarca de ${instituicao?.nome ?? "instituição"}`} className="h-full w-full object-contain" /> : <Landmark className="h-20 w-20 text-blue-100" />}
              </div>
              <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-200">{instituicao?.nome ?? "Transparência institucional"}</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Portal da Transparência</h1>
              <p className="mt-3 max-w-2xl text-base text-blue-100">Acesse serviços, projetos, documentos e informações públicas da instituição.</p>
                {instituicao ? <p className="mt-2 text-sm text-blue-200">CNPJ: {instituicao.cnpj}</p> : null}
              </div>
            </div>

            {!instituicao && painel?.instituicoesDisponiveis?.length ? (
              <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-4">
                <label className="block text-sm font-semibold text-white" htmlFor="instituicao-portal-transparencia">
                  Buscar instituição
                </label>
                <div className="mt-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="instituicao-portal-transparencia"
                    value={instituicaoBusca}
                    onChange={(event) => setInstituicaoBusca(event.target.value)}
                    placeholder="Digite o nome ou CNPJ da instituição"
                    className="min-h-12 w-full border-white/20 bg-white text-slate-900 placeholder:text-slate-500 sm:max-w-xl"
                  />
                  <span className="text-xs text-blue-100 sm:whitespace-nowrap">Digite para localizar uma instituição.</span>
                </div>
                {instituicaoBusca.trim() ? (
                  <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto sm:max-w-xl">
                    {instituicoesFiltradas.length ? instituicoesFiltradas.map((item) => (
                      <button key={item.slug} type="button" onClick={() => { window.location.href = `/portal-transparencia/${item.slug}`; }} className="rounded-xl bg-white px-4 py-3 text-left text-sm text-slate-900 transition hover:bg-blue-50">
                        <span className="block font-semibold">{item.nome}</span>
                        <span className="mt-1 block text-xs text-slate-500">CNPJ: {item.cnpj}</span>
                      </button>
                    )) : <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600">Nenhuma instituição encontrada.</p>}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col gap-2 rounded-2xl border border-white/20 bg-slate-950/25 p-2 shadow-xl sm:flex-row">
              <div className="flex min-h-12 flex-1 items-center gap-3 rounded-xl bg-white/10 px-4">
                <Search className="h-5 w-5 shrink-0 text-blue-200" />
                <Input
                  value={identificador}
                  onChange={(event) => setIdentificador(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void acessarPortal();
                  }}
                  placeholder="Buscar projetos, documentos ou informações..."
                  className="border-0 bg-transparent p-0 text-white placeholder:text-blue-200 focus-visible:ring-0"
                />
              </div>
              <Button type="button" className="min-h-12 bg-blue-600 px-7 hover:bg-blue-500" onClick={() => void acessarPortal()} disabled={carregando}>
                {carregando ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Voltar ao início">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="rounded-full border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-900">Serviços</span>
          </div>

          <div className="mt-5 flex items-center gap-3 overflow-hidden">
            <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600" aria-label="Categoria anterior"><ChevronLeft className="h-5 w-5" /></button>
            <div className="flex min-w-0 gap-3 overflow-x-auto pb-2">
              {categorias.map(({ titulo, Icone }) => (
                <button key={titulo} type="button" onClick={() => setIdentificador(titulo)} className="flex min-w-[150px] items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-4 text-left font-bold text-slate-800 transition hover:border-blue-400 hover:bg-blue-100">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-200/70 text-blue-900"><Icone className="h-5 w-5" /></span>
                  {titulo}
                </button>
              ))}
            </div>
            <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600" aria-label="Próxima categoria"><ChevronRight className="h-5 w-5" /></button>
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {(cards.length ? cards : config.cards).map((card, index) => {
              const Icone = config.cards[index]?.Icone ?? Target;
              return (
                <article key={card.titulo} className="flex min-h-[270px] flex-col rounded-3xl border-2 border-blue-200 bg-white p-5 shadow-[0_14px_35px_-25px_rgba(30,64,175,0.8)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Icone className="h-7 w-7" /></div>
                  <span className="mt-4 w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Transparência</span>
                  <h2 className="mt-4 text-xl font-bold leading-tight text-slate-900">{card.titulo}</h2>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-500">{card.texto}</p>
                  <Button type="button" className="mt-5 w-full bg-blue-600 hover:bg-blue-700" onClick={() => setIdentificador(card.titulo)}>
                    Acessar <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </article>
              );
            })}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {(indicadores ?? []).map((indicador) => (
              <div key={indicador.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <p className="text-sm text-slate-500">{indicador.label}</p>
                <p className="mt-1 text-2xl font-black text-blue-900">{indicador.valor}</p>
              </div>
            ))}
          </div>

          {instituicao && painel?.checklistTransparencia?.length ? (
            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Conformidade da publicação</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Informações de transparência</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">A situação abaixo é calculada com base nos dados cadastrados no G3N. Itens pendentes mostram o que a instituição deve complementar.</p>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {painel.checklistTransparencia.map((item) => (
                  <div key={item.codigo} className={`rounded-2xl border px-4 py-4 ${item.status === "PUBLICADO" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-slate-900">{item.titulo}</p>
                      <Badge variant={item.status === "PUBLICADO" ? "success" : "warning"}>{item.status === "PUBLICADO" ? "Publicado" : "Pendente"}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.sugestao}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {instituicao && painel?.parcerias?.length ? (
            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Parcerias públicas</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Instrumentos e termos publicados</h2>
              <div className="mt-4 grid gap-3">
                {painel.parcerias.map((parceria) => (
                  <article key={parceria.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{parceria.numero} · {parceria.tipo}</p>
                        <p className="mt-1 text-sm text-slate-500">Órgão concedente: {parceria.orgaoConcedente ?? "Não informado"}</p>
                      </div>
                      <Badge variant="info">{parceria.situacao}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{parceria.objeto ?? "Objeto não informado"}</p>
                    <p className="mt-2 text-sm font-semibold text-blue-900">Valor global: {formatarMoedaPortal(parceria.valorGlobal)}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {termoBusca ? (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Resultado da busca</p><h2 className="mt-1 text-xl font-bold">Informações encontradas</h2></div>
                <Button type="button" variant="outline" onClick={() => setIdentificador("")}>Limpar busca</Button>
              </div>
              <div className="mt-4 grid gap-3">
                {itensPublicos.length ? itensPublicos.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <p className="font-bold text-slate-900">{item.titulo}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.subtitulo}</p>
                    <Badge className="mt-2" variant="info">{item.status ?? "Ativo"}</Badge>
                  </div>
                )) : <p className="text-sm text-slate-500">Nenhuma informação encontrada para a busca.</p>}
              </div>
            </div>
          ) : null}
        </section>

        <footer className="bg-[linear-gradient(135deg,#173f70_0%,#0d2d52_100%)] px-5 py-9 text-blue-100 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col justify-between gap-8 md:flex-row">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/10 p-1 text-blue-100">
                  {logoInstituicao ? <img src={logoInstituicao} alt={`Logomarca de ${instituicao?.nome ?? "instituição"}`} className="h-full w-full object-contain" /> : <Landmark className="h-6 w-6" />}
                </span>
                <div>
                  <p className="font-bold text-white">{instituicao?.nome ?? "Portal da Transparência"}</p>
                  <p className="mt-1 text-sm text-blue-200">Informações públicas institucionais</p>
                  <p className="mt-1 text-xs text-blue-300">Dados publicados conforme disponibilidade e aprovação institucional.</p>
                </div>
              </div>
              <div className="md:text-right">
                <p className="font-bold uppercase tracking-[0.14em] text-white">Contato</p>
                <p className="mt-2 text-sm text-blue-200">{instituicao?.email ?? "Atendimento público institucional"}</p>
                <p className="mt-1 text-sm text-blue-200">{instituicao?.telefone ?? instituicao?.endereco ?? "Utilize os canais oficiais da instituição responsável."}</p>
              </div>
            </div>
            <div className="my-7 h-px bg-white/15" />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={() => setPopup({ tipo: "aviso", titulo: "LGPD", texto: "Consulte a política de proteção de dados da instituição responsável por este portal." })} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10">LGPD</button>
              <button type="button" onClick={() => setPopup({ tipo: "aviso", titulo: "Política de privacidade", texto: "A política de privacidade será disponibilizada pela instituição responsável." })} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10">Política de privacidade</button>
              <button type="button" onClick={() => setPopup({ tipo: "aviso", titulo: "Termos de uso", texto: "Os termos de uso serão disponibilizados pela instituição responsável." })} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10">Termos de uso</button>
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-300">
              <span>© Portal da Transparência</span>
              <span>G3N · versão pública</span>
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="rounded-full border border-white/15 px-4 py-2 font-semibold text-blue-100 transition hover:bg-white/10">Voltar ao topo</button>
            </div>
          </div>
        </footer>
      </main>
    );
  }

  function renderPortalBeneficiario() {
    const pessoa = painel?.pessoa;
    const categorias = [
      { titulo: "Atendimentos", Icone: HeartHandshake },
      { titulo: "Agendamentos", Icone: CalendarCheck },
      { titulo: "Benefícios", Icone: HandCoins },
      { titulo: "Documentos", Icone: FileCheck2 },
      { titulo: "Comunicados", Icone: MessageCircle }
    ];

    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <header className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 rounded-b-[26px] bg-white px-6 py-3 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.55)] sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--g3-primary)]"><HeartHandshake className="h-9 w-9" /></span>
            <div><p className="text-lg font-bold leading-5 text-slate-900">Portal do Beneficiário e Família</p><p className="text-sm text-slate-600">Acompanhamento público e seguro</p></div>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 sm:gap-7">
            <button type="button" className="border-b-4 border-[var(--g3-primary)] px-2 py-3">Início</button>
            <button type="button" onClick={() => setIdentificador(identificador)} className="px-2 py-3">Atendimentos</button>
            <button type="button" onClick={() => setIdentificador(identificador)} className="px-2 py-3">Agenda</button>
            <button type="button" onClick={() => setIdentificador(identificador)} className="px-2 py-3">Documentos</button>
            {acessoLiberado ? <Button type="button" size="sm" variant="outline" onClick={sairPortal}>Sair</Button> : null}
          </nav>
        </header>

        <section className="bg-[linear-gradient(135deg,#173f70_0%,#0d2d52_100%)] px-5 pb-10 pt-9 text-white sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-center gap-5 sm:gap-8">
              <div className="flex h-32 w-32 items-center justify-center rounded-3xl border border-white/20 bg-white/10 shadow-inner sm:h-36 sm:w-36"><HeartHandshake className="h-20 w-20 text-blue-100" /></div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-200">Minha jornada de atendimento</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Portal do beneficiário e família</h1>
                <p className="mt-3 max-w-2xl text-base text-blue-100">Consulte atendimentos, agenda, benefícios, documentos e comunicados autorizados.</p>
                {pessoa?.nome ? <p className="mt-2 text-sm text-blue-200">Beneficiário: {pessoa.nome}</p> : null}
              </div>
            </div>

            {!acessoLiberado ? (
              painel?.instituicoesBeneficiario?.length && !pessoa ? (
                <div className="mt-7 rounded-2xl border border-white/20 bg-slate-950/25 p-4 shadow-xl">
                  <p className="text-sm font-semibold text-white">Selecione a instituição para continuar</p>
                  <p className="mt-1 text-xs text-blue-100">Seu CPF e senha estão vinculados a mais de uma instituição.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {painel.instituicoesBeneficiario.map((item) => (
                      <button key={item.tenantId} type="button" onClick={() => { setInstituicaoBeneficiario(item.tenantId); void acessarPortal(item.tenantId); }} className="rounded-xl bg-white px-4 py-3 text-left text-slate-900 transition hover:bg-blue-50">
                        <span className="block font-semibold">{item.nome}</span>
                        {item.cnpj ? <span className="mt-1 block text-xs text-slate-500">CNPJ: {item.cnpj}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            ) : null}

            {!acessoLiberado && !(painel?.instituicoesBeneficiario?.length && !pessoa) ? (
              <div className="mt-7 grid gap-3 rounded-2xl border border-white/20 bg-slate-950/25 p-3 shadow-xl md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Input
                  value={identificador}
                  onChange={(event) => setIdentificador(formatarCpf(somenteDigitos(event.target.value).slice(0, 11)))}
                  placeholder="Digite o CPF do beneficiário"
                  inputMode="numeric"
                  maxLength={14}
                  className="min-h-12 border-white/20 bg-white text-slate-900 placeholder:text-slate-500"
                />
                <Input
                  type="password"
                  value={senha}
                  onChange={(event) => setSenha(somenteDigitos(event.target.value).slice(0, 4))}
                  placeholder="Senha de 4 dígitos"
                  inputMode="numeric"
                  maxLength={4}
                  className="min-h-12 border-white/20 bg-white text-slate-900 placeholder:text-slate-500"
                />
                <Button type="button" className="min-h-12 bg-blue-600 px-7 hover:bg-blue-500" onClick={() => void acessarPortal()} disabled={carregando}>{carregando ? "Entrando..." : "Entrar"}</Button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
          <div className="flex items-center gap-3"><span className="rounded-full border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-900">Serviços</span></div>
          <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
            {categorias.map(({ titulo, Icone }) => <button key={titulo} type="button" className="flex min-w-[150px] items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-4 text-left font-bold text-slate-800 transition hover:border-blue-400 hover:bg-blue-100"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-200/70 text-blue-900"><Icone className="h-5 w-5" /></span>{titulo}</button>)}
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => {
              const Icone = config.cards[index]?.Icone ?? Target;
              return <article key={card.titulo} className="flex min-h-[250px] flex-col rounded-3xl border-2 border-blue-200 bg-white p-5 shadow-[0_14px_35px_-25px_rgba(30,64,175,0.8)]"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Icone className="h-7 w-7" /></div><span className="mt-4 w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Área do beneficiário</span><h2 className="mt-4 text-xl font-bold leading-tight text-slate-900">{card.titulo}</h2><p className="mt-3 flex-1 text-sm leading-6 text-slate-500">{card.texto}</p><Button type="button" className="mt-5 w-full bg-blue-600 hover:bg-blue-700" onClick={() => executarAcao(card.titulo)}>{acessoLiberado ? "Acessar" : "Entrar para acessar"}<ChevronRight className="ml-1.5 h-4 w-4" /></Button></article>;
            })}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {indicadores.map((indicador) => <div key={indicador.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><p className="text-sm text-slate-500">{indicador.label}</p><p className="mt-1 text-2xl font-black text-blue-900">{indicador.valor}</p></div>)}
          </div>

          {acessoLiberado ? <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Acompanhamento</p><h2 className="mt-1 text-xl font-bold">Dados do beneficiário</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-blue-50 px-4 py-4"><p className="text-sm text-slate-500">Nome</p><p className="mt-1 font-bold">{pessoa?.nome ?? identificador}</p></div><div className="rounded-2xl bg-blue-50 px-4 py-4"><p className="text-sm text-slate-500">Status do acesso</p><p className="mt-1 font-bold text-emerald-700">Acesso validado</p></div></div></section> : null}
        </section>

        <footer className="bg-[linear-gradient(135deg,#173f70_0%,#0d2d52_100%)] px-5 py-9 text-blue-100 sm:px-8"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><div><p className="font-bold text-white">Portal do Beneficiário e Família</p><p className="mt-1 text-sm text-blue-200">Informações protegidas e autorizadas pela instituição.</p></div><p className="text-sm text-blue-200">G3N · portal externo</p></div></footer>
      </main>
    );
  }

  function renderPortalInstitucional() {
    const isVoluntario = tipo === "voluntario";
    const tituloArea = isVoluntario ? "Portal do voluntário" : "Portal do parceiro e financiador";
    const categorias = isVoluntario
      ? ["Oportunidades", "Escalas", "Horas", "Certificados"]
      : ["Projetos", "Metas", "Relatórios", "Documentos"];
    const IconeArea = isVoluntario ? HandHeart : Building2;

    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <header className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 rounded-b-[26px] bg-white px-6 py-3 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.55)] sm:px-8">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--g3-primary)]"><IconeArea className="h-9 w-9" /></span><div><p className="text-lg font-bold leading-5">{tituloArea}</p><p className="text-sm text-slate-600">Consulta pública institucional</p></div></div>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold sm:gap-7"><button type="button" className="border-b-4 border-[var(--g3-primary)] px-2 py-3">Início</button>{categorias.slice(0, 3).map((item) => <button key={item} type="button" className="px-2 py-3">{item}</button>)}{acessoLiberado ? <Button type="button" size="sm" variant="outline" onClick={sairPortal}>Sair</Button> : null}</nav>
        </header>
        <section className="bg-[linear-gradient(135deg,#173f70_0%,#0d2d52_100%)] px-5 pb-10 pt-9 text-white sm:px-8"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center gap-5 sm:gap-8"><div className="flex h-32 w-32 items-center justify-center rounded-3xl border border-white/20 bg-white/10 shadow-inner sm:h-36 sm:w-36"><IconeArea className="h-20 w-20 text-blue-100" /></div><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-200">{config.destaque}</p><h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{tituloArea}</h1><p className="mt-3 max-w-2xl text-base text-blue-100">{config.subtitulo}</p></div></div>{!acessoLiberado ? <div className="mt-7 grid gap-3 rounded-2xl border border-white/20 bg-slate-950/25 p-3 shadow-xl md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><Input value={identificador} onChange={(event) => setIdentificador(event.target.value)} placeholder={config.identificadorPlaceholder} className="min-h-12 border-white/20 bg-white text-slate-900 placeholder:text-slate-500" /><Input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} placeholder={config.senhaPlaceholder} className="min-h-12 border-white/20 bg-white text-slate-900 placeholder:text-slate-500" /><Button type="button" className="min-h-12 bg-blue-600 px-7 hover:bg-blue-500" onClick={() => void acessarPortal()} disabled={carregando}>{carregando ? "Entrando..." : config.acaoPrimaria}</Button></div> : null}</div></section>
        <section className="mx-auto max-w-6xl px-5 py-7 sm:px-8"><span className="rounded-full border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-900">Serviços</span><div className="mt-5 flex gap-3 overflow-x-auto pb-2">{categorias.map((item, index) => <button key={item} type="button" className="flex min-w-[150px] items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-4 text-left font-bold"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-200/70 text-blue-900"><IconeArea className="h-5 w-5" /></span>{item}</button>)}</div><div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <article key={card.titulo} className="flex min-h-[250px] flex-col rounded-3xl border-2 border-blue-200 bg-white p-5 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Target className="h-7 w-7" /></div><span className="mt-4 w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{isVoluntario ? "Voluntariado" : "Parceria"}</span><h2 className="mt-4 text-xl font-bold">{card.titulo}</h2><p className="mt-3 flex-1 text-sm leading-6 text-slate-500">{card.texto}</p><Button type="button" className="mt-5 w-full bg-blue-600" onClick={() => executarAcao(card.titulo)}>{acessoLiberado ? "Acessar" : "Entrar para acessar"}<ChevronRight className="ml-1.5 h-4 w-4" /></Button></article>)}</div><div className="mt-8 grid gap-5 lg:grid-cols-3">{indicadores.map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-black text-blue-900">{item.valor}</p></div>)}</div></section><footer className="bg-[linear-gradient(135deg,#173f70_0%,#0d2d52_100%)] px-5 py-9 text-blue-100 sm:px-8"><div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4"><p className="font-bold text-white">{tituloArea}</p><p className="text-sm">G3N · portal externo</p></div></footer>
      </main>
    );
  }

  if (tipo === "beneficiario") {
    return (
      <div style={portalThemeStyle}>
        {renderPortalBeneficiario()}
        {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      </div>
    );
  }

  if (tipo === "voluntario" || tipo === "parceiro") {
    return <div style={portalThemeStyle}>{renderPortalInstitucional()}{popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}</div>;
  }

  if (tipo === "transparencia") {
    return (
      <div style={portalThemeStyle}>
        {renderPortalTransparencia()}
        {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      </div>
    );
  }

  return (
    <div style={portalThemeStyle}>
      <main className="min-h-screen bg-[linear-gradient(180deg,var(--g3-page-gradient-start,#f8fafc)_0%,var(--g3-page-gradient-end,#edf4f8)_100%)] px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <section
            className="overflow-hidden rounded-3xl text-white shadow-[0_30px_100px_-55px_rgba(15,23,42,0.85)]"
            style={{
              background:
                "linear-gradient(135deg, var(--g3-primary, #2563eb) 0%, var(--g3-secondary, #0f172a) 100%)"
            }}
          >
            <div className="grid gap-6 px-5 py-7 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-8">
              <div className="flex min-h-[280px] flex-col justify-between">
                <div className="space-y-4">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
                    <config.Icone className="h-4 w-4" />
                    {config.destaque}
                  </span>
                  <div className="max-w-3xl space-y-3">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{config.titulo}</h1>
                    <p className="text-sm leading-6 text-white/82 sm:text-base">{config.subtitulo}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {indicadores.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <item.Icone className="h-5 w-5 text-white/85" />
                      <p className="mt-3 text-2xl font-semibold">{item.valor}</p>
                      <p className="mt-1 text-xs text-white/72">{item.label}</p>
                    </div>
                  ))}
                </div>
                </div>

                <Card className="border-white/20 bg-white/95 text-slate-900 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                    {config.acessoRestrito ? <LockKeyhole className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    {config.acessoRestrito ? "Acesso seguro" : "Consulta pública"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>{config.identificadorLabel}</Label>
                    <Input
                      value={identificador}
                      onChange={(event) => setIdentificador(event.target.value)}
                      placeholder={config.identificadorPlaceholder}
                      inputMode="text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{config.senhaLabel}</Label>
                    <Input
                      type={config.acessoRestrito ? "password" : "text"}
                      value={senha}
                      onChange={(event) => setSenha(event.target.value)}
                      placeholder={config.senhaPlaceholder}
                      inputMode="text"
                    />
                  </div>
                  <Button className="w-full" onClick={() => void acessarPortal()} disabled={carregando}>
                    {carregando ? "Carregando..." : config.acaoPrimaria}
                  </Button>
                  {acessoLiberado && config.acessoRestrito ? (
                    <Button className="w-full" variant="outline" onClick={sairPortal}>
                      Sair do portal
                    </Button>
                  ) : null}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <ShieldCheck className="mr-1.5 inline h-4 w-4 align-[-3px] text-emerald-700" />
                    {acessoLiberado
                      ? "Painel externo aberto com dados reais filtrados pelo cadastro localizado."
                      : "Acesso preparado para consulta real por instituição, perfil e permissão."}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {cards.map((card) => (
              <Card key={card.titulo} className="border-[var(--g3-border)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                      <card.Icone className="h-5 w-5" />
                    </span>
                    {card.titulo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-[var(--g3-muted)]">{card.texto}</p>
                </CardContent>
              </Card>
            ))}
          </section>

              {acessoLiberado ? (
            <section className="rounded-2xl border border-[var(--g3-border)] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">
                    Área do portal
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--g3-foreground)]">
                    {config.destaque}
                  </h2>
                  {config.tipo === "beneficiario" && painel?.pessoa?.nome ? (
                    <p className="mt-1 text-sm font-medium text-[var(--g3-primary)]">
                      Beneficiário logado: {painel.pessoa.nome}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-[var(--g3-muted)]">
                    {config.acessoRestrito
                      ? `Acesso validado para ${(painel?.pessoa?.nome ?? identificador.trim()) || "usuário externo"}.`
                      : "Consulta pública liberada para navegação externa."}
                  </p>
                </div>
                {config.acessoRestrito ? (
                  <Button variant="outline" onClick={sairPortal}>
                    Sair
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {cards.map((card) => (
                  <button
                    key={card.titulo}
                    type="button"
                    onClick={() => executarAcao(card.titulo)}
                    className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-4 py-4 text-left transition hover:border-[var(--g3-active)] hover:bg-white"
                  >
                    <card.Icone className="h-5 w-5 text-[var(--g3-active)]" />
                    <span className="mt-3 block text-sm font-semibold text-[var(--g3-foreground)]">
                      {card.titulo}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--g3-muted)]">
                      Abrir rotina do portal
                    </span>
                  </button>
                ))}
              </div>

              {painel?.itens?.length ? (
                <div className="mt-4 grid gap-3">
                  {painel.itens.map((item, index) => (
                    <div
                      key={item.id ?? `${item.titulo}-${index}`}
                      className="rounded-xl border border-[var(--g3-border)] bg-white px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.titulo}</p>
                          <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.subtitulo}</p>
                        </div>
                        <Badge variant="info">{item.status ?? "Ativo"}</Badge>
                      </div>
                      {typeof item.percentual === "number" ? (
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[var(--g3-active)]"
                            style={{ width: `${Math.min(Math.max(item.percentual, 0), 100)}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {acessoLiberado && (
            <section className="grid gap-4 xl:grid-cols-2">
              <Card className="border-[var(--g3-border)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HeartHandshake className="h-5 w-5 text-[var(--g3-active)]" />
                    Atendimentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {atendimentosPortal.length ? (
                    <>
                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {atendimentosPortal.slice(0, limitesPortal.atendimentos).map((item) => (
                        <article key={item.id} className="rounded-xl border border-[var(--g3-border)] px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                                {item.tipoAtendimento}
                              </p>
                              <p className="mt-1 text-xs text-[var(--g3-muted)]">
                                {formatarDataHoraPortal(item.dataHora)} • {item.setor}
                              </p>
                            </div>
                            {item.status ? <Badge variant="info">{item.status}</Badge> : null}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-[var(--g3-muted)]">{item.resumo}</p>
                          <div className="mt-3 grid gap-2 text-xs text-[var(--g3-muted)] sm:grid-cols-2">
                            <p>Profissional: {item.profissionalResponsavel}</p>
                            <p>Retorno previsto: {formatarDataPortal(item.retornoPrevisto)}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                    {atendimentosPortal.length > limitesPortal.atendimentos ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => ampliarListaPortal("atendimentos")}
                      >
                        Ver mais atendimentos
                      </Button>
                    ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-[var(--g3-muted)]">Nenhum atendimento foi encontrado.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HandCoins className="h-5 w-5 text-[var(--g3-active)]" />
                    Benefícios e movimentações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">
                      Benefícios
                    </p>
                    {beneficiosPortal.length ? (
                      <>
                      <div className="mt-3 max-h-[260px] space-y-3 overflow-y-auto pr-1">
                        {beneficiosPortal.slice(0, limitesPortal.beneficios).map((item) => (
                          <article key={item.id} className="rounded-xl border border-[var(--g3-border)] px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                                  {item.tipo} - {item.item}
                                </p>
                                <p className="mt-1 text-xs text-[var(--g3-muted)]">{formatarDataPortal(item.data)}</p>
                              </div>
                              <Badge variant="success">{formatarMoedaPortal(item.valorTotal)}</Badge>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs text-[var(--g3-muted)] sm:grid-cols-2">
                              <p>Quantidade: {item.quantidade}</p>
                              <p>Valor unitário: {formatarMoedaPortal(item.valorUnitario)}</p>
                              {item.profissionalResponsavel ? (
                                <p className="sm:col-span-2">Responsável: {item.profissionalResponsavel}</p>
                              ) : null}
                              {item.observacoes ? (
                                <p className="sm:col-span-2">Observações: {item.observacoes}</p>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                      {beneficiosPortal.length > limitesPortal.beneficios ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3 w-full"
                          onClick={() => ampliarListaPortal("beneficios")}
                        >
                          Ver mais benefícios
                        </Button>
                      ) : null}
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--g3-muted)]">Nenhum benefício encontrado.</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">
                      Movimentações
                    </p>
                    {movimentacoesPortal.length ? (
                      <>
                      <div className="mt-3 max-h-[220px] space-y-3 overflow-y-auto pr-1">
                        {movimentacoesPortal.slice(0, limitesPortal.movimentacoes).map((item, index) => {
                          const categoria = String(item.categoria ?? "Movimentação");
                          const titulo = String(item.titulo ?? "Registro");
                          const data = String(item.data ?? "");
                          const descricao = String(item.descricao ?? "");
                          return (
                            <article
                              key={`${categoria}-${titulo}-${index}`}
                              className="rounded-xl border border-[var(--g3-border)] px-4 py-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-[var(--g3-foreground)]">{titulo}</p>
                                  <p className="mt-1 text-xs text-[var(--g3-muted)]">
                                    {categoria} • {formatarDataHoraPortal(data)}
                                  </p>
                                </div>
                                <Badge variant="info">{categoria}</Badge>
                              </div>
                              {descricao ? (
                                <p className="mt-3 text-sm leading-6 text-[var(--g3-muted)]">{descricao}</p>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                      {movimentacoesPortal.length > limitesPortal.movimentacoes ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3 w-full"
                          onClick={() => ampliarListaPortal("movimentacoes")}
                        >
                          Ver mais movimentações
                        </Button>
                      ) : null}
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--g3-muted)]">Nenhuma movimentação encontrada.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {acessoLiberado && (
            <section className="grid gap-4 xl:grid-cols-2">
              <Card className="border-[var(--g3-border)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarCheck className="h-5 w-5 text-[var(--g3-active)]" />
                    Agendamentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agendamentosPortal.length ? (
                    <>
                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {agendamentosPortal.slice(0, limitesPortal.agendamentos).map((item) => (
                        <article key={item.id} className="rounded-xl border border-[var(--g3-border)] px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                                {item.tipoAtendimento ?? "Agendamento"}
                              </p>
                              <p className="mt-1 text-xs text-[var(--g3-muted)]">
                                {formatarDataPortal(item.data)} • {item.horaInicial}
                                {item.horaFinal ? ` até ${item.horaFinal}` : ""}
                              </p>
                            </div>
                            {item.status ? <Badge variant="warning">{item.status}</Badge> : null}
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-[var(--g3-muted)] sm:grid-cols-2">
                            {item.setor ? <p>Setor: {item.setor}</p> : null}
                            {item.modalidade ? <p>Modalidade: {item.modalidade}</p> : null}
                            {item.profissionalNome ? <p>Profissional: {item.profissionalNome}</p> : null}
                            {item.sala ? <p>Sala: {item.sala}</p> : null}
                            {item.prioridade ? <p>Prioridade: {item.prioridade}</p> : null}
                            {item.documentosPendentes ? <p>Documentos: pendentes</p> : null}
                            {item.observacaoCurta ? (
                              <p className="sm:col-span-2">Observação: {item.observacaoCurta}</p>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                    {agendamentosPortal.length > limitesPortal.agendamentos ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => ampliarListaPortal("agendamentos")}
                      >
                        Ver mais agendamentos
                      </Button>
                    ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-[var(--g3-muted)]">Nenhum agendamento foi encontrado.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5 text-[var(--g3-active)]" />
                    Documentos pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {documentosPendentesPortal.length ? (
                    <>
                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {documentosPendentesPortal.slice(0, limitesPortal.documentosPendentes).map((item) => (
                        <article key={item.id} className="rounded-xl border border-[var(--g3-border)] px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.nome}</p>
                              <p className="mt-1 text-xs text-[var(--g3-muted)]">
                                {item.tipo ?? "Documento"} • {item.obrigatorio ? "Obrigatório" : "Opcional"}
                              </p>
                            </div>
                            <Badge variant="danger">Pendente</Badge>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-[var(--g3-muted)] sm:grid-cols-2">
                            {item.numeroDocumento ? <p>Número: {item.numeroDocumento}</p> : null}
                            {item.contentType ? <p>Tipo de arquivo: {item.contentType}</p> : null}
                            <p className="sm:col-span-2">Envio aguardando anexação no cadastro interno.</p>
                          </div>
                        </article>
                      ))}
                    </div>
                    {documentosPendentesPortal.length > limitesPortal.documentosPendentes ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => ampliarListaPortal("documentosPendentes")}
                      >
                        Ver mais documentos
                      </Button>
                    ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-[var(--g3-muted)]">Nenhum documento pendente foi encontrado.</p>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="border-[var(--g3-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UsersRound className="h-5 w-5 text-[var(--g3-active)]" />
                  Acompanhamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {linhaDoTempo.map((item, index) => (
                  <div key={item.titulo} className="flex gap-3 rounded-xl border border-[var(--g3-border)] px-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--g3-primary-soft)] text-xs font-semibold text-[var(--g3-active)]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.titulo}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--g3-muted)]">{item.detalhe}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-[var(--g3-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  Status do portal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] px-3 py-2">
                  <span>Interface externa</span>
                  <Badge variant="success">Ativa</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] px-3 py-2">
                  <span>Dados reais</span>
                  <Badge variant={acessoLiberado ? "info" : "warning"}>
                    {acessoLiberado ? "Conectados" : "Pendente"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] px-3 py-2">
                  <span>Autenticação dedicada</span>
                  <Badge variant={config.acessoRestrito ? "warning" : "info"}>
                    {config.acessoRestrito ? "Identificador e senha" : "Não exigida"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </div>
  );
}

export function PortalVoluntarioPage() {
  return <PortalExternoPage tipo="voluntario" />;
}

export function PortalBeneficiarioFamiliaPage() {
  return <PortalExternoPage tipo="beneficiario" />;
}

export function PortalTransparenciaPage() {
  const { slug } = useParams<{ slug?: string }>();
  return <PortalExternoPage tipo="transparencia" tenantSlug={slug} />;
}

export function PortalParceiroFinanciadorPage() {
  return <PortalExternoPage tipo="parceiro" />;
}
