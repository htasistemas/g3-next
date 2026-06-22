import { useMemo, useState } from "react";
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
    identificadorLabel: "CPF ou código familiar",
    identificadorPlaceholder: "Digite CPF ou código familiar",
    senhaLabel: "Senha de acesso",
    senhaPlaceholder: "Digite sua senha",
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
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);

  const gradiente = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${config.cor} 0%, #0f172a 100%)`
    }),
    [config.cor]
  );

  function acessarPortal() {
    if (config.acessoRestrito && (!identificador.trim() || !senha.trim())) {
      setPopup({
        tipo: "aviso",
        titulo: "Dados obrigatórios",
        texto: "Informe os dados de acesso para entrar no portal."
      });
      return;
    }

    setAcessoLiberado(true);
    setPopup({
      tipo: "sucesso",
      titulo: config.acessoRestrito ? "Acesso liberado" : "Consulta aberta",
      texto: config.acessoRestrito
        ? "O painel externo foi aberto para validação do fluxo do portal."
        : "A consulta pública foi aberta para navegação."
    });
  }

  function sairPortal() {
    setAcessoLiberado(!config.acessoRestrito);
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
      texto: "A ação está disponível na interface do portal e será conectada aos dados reais do módulo correspondente."
    });
  }

  return (
    <>
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#edf4f8_100%)] px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="overflow-hidden rounded-3xl text-white shadow-[0_30px_100px_-55px_rgba(15,23,42,0.85)]" style={gradiente}>
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
                  {config.indicadores.map((item) => (
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
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{config.senhaLabel}</Label>
                    <Input
                      type={config.acessoRestrito ? "password" : "text"}
                      value={senha}
                      onChange={(event) => setSenha(event.target.value)}
                      placeholder={config.senhaPlaceholder}
                    />
                  </div>
                  <Button className="w-full" onClick={acessarPortal}>
                    {config.acaoPrimaria}
                  </Button>
                  {acessoLiberado && config.acessoRestrito ? (
                    <Button className="w-full" variant="outline" onClick={sairPortal}>
                      Sair do portal
                    </Button>
                  ) : null}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <ShieldCheck className="mr-1.5 inline h-4 w-4 align-[-3px] text-emerald-700" />
                    {acessoLiberado
                      ? "Painel externo aberto com isolamento visual por público."
                      : "Acesso preparado para isolamento por instituição, perfil e permissão."}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {config.cards.map((card) => (
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
                  <p className="mt-1 text-sm text-[var(--g3-muted)]">
                    {config.acessoRestrito
                      ? `Acesso validado para ${identificador.trim() || "usuário externo"}.`
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
                {config.cards.map((card) => (
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
            </section>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="border-[var(--g3-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UsersRound className="h-5 w-5 text-[var(--g3-active)]" />
                  Acompanhamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {config.linhaDoTempo.map((item, index) => (
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
                    {acessoLiberado ? "Fluxo ativo" : "Pendente"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] px-3 py-2">
                  <span>Autenticação dedicada</span>
                  <Badge variant={config.acessoRestrito ? "warning" : "info"}>
                    {config.acessoRestrito ? "Pendente" : "Não exigida"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
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
