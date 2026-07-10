import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileCheck2,
  FileText,
  HandHeart,
  HandCoins,
  HeartHandshake,
  LockKeyhole,
  Mail,
  MapPinned,
  MessageCircle,
  PieChart,
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

function PortalExternoPage({ tipo }: { tipo: PortalTipo }) {
  const config = portalConfigs[tipo];
  const [identificador, setIdentificador] = useState("");
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
    setSenha("");
    setPainel(null);
    setAcessoLiberado(!config.acessoRestrito);

    if (tipo !== "transparencia") return;

    let ativo = true;
    setCarregando(true);
    portaisExternosService
      .obterTransparencia()
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
  }, [config.acessoRestrito, tipo]);

  useEffect(() => {
    if (tipo !== "beneficiario") return;
    setIdentificador((valorAtual) => formatarCpf(somenteDigitos(valorAtual).slice(0, 11)));
    setSenha((valorAtual) => somenteDigitos(valorAtual).slice(0, 4));
  }, [tipo]);

  async function acessarPortal() {
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
        const dados = await portaisExternosService.obterTransparencia();
        setPainel(dados);
      } else {
        const dados = await portaisExternosService.acessar(
          tipo,
          tipo === "beneficiario" ? cpfNormalizado : identificador,
          tipo === "beneficiario" ? senhaNormalizada : senha
        );
        setPainel(dados);
      }

      setAcessoLiberado(true);
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
                      onChange={(event) => {
                        const valor = event.target.value;
                        if (tipo === "beneficiario") {
                          setIdentificador(formatarCpf(somenteDigitos(valor).slice(0, 11)));
                          return;
                        }
                        setIdentificador(valor);
                      }}
                      onBlur={() => {
                        if (tipo === "beneficiario") {
                          setIdentificador((valorAtual) =>
                            formatarCpf(somenteDigitos(valorAtual).slice(0, 11))
                          );
                        }
                      }}
                      placeholder={config.identificadorPlaceholder}
                      inputMode={tipo === "beneficiario" ? "numeric" : "text"}
                      maxLength={tipo === "beneficiario" ? 14 : undefined}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{config.senhaLabel}</Label>
                    <Input
                      type={config.acessoRestrito ? "password" : "text"}
                      value={senha}
                      onChange={(event) => {
                        const valor = event.target.value;
                        if (tipo === "beneficiario") {
                          setSenha(somenteDigitos(valor).slice(0, 4));
                          return;
                        }
                        setSenha(valor);
                      }}
                      onBlur={() => {
                        if (tipo === "beneficiario") {
                          setSenha((valorAtual) => somenteDigitos(valorAtual).slice(0, 4));
                        }
                      }}
                      placeholder={config.senhaPlaceholder}
                      inputMode={tipo === "beneficiario" ? "numeric" : "text"}
                      maxLength={tipo === "beneficiario" ? 4 : undefined}
                    />
                  </div>
                  <Button className="w-full" onClick={acessarPortal} disabled={carregando}>
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
  return <PortalExternoPage tipo="transparencia" />;
}

export function PortalParceiroFinanciadorPage() {
  return <PortalExternoPage tipo="parceiro" />;
}
