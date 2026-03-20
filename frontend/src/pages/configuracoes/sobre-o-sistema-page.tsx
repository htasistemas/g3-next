import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ClipboardCopy,
  Globe,
  Info,
  MonitorCog,
  RefreshCcw,
  Server,
  ShieldCheck,
  Workflow,
  X
} from "lucide-react";
import { PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { APP_VERSION } from "@/lib/app-version";

type AbaId = "geral";

type InformacoesTela = {
  versao: string;
  release: string;
  ambiente: string;
  ultimaAtualizacaoData: string;
  ultimaAtualizacaoHora: string;
  dataHoraAtual: string;
  baseAplicacao: string;
  baseApi: string;
  navegador: string;
  plataforma: string;
  idioma: string;
};

const abas: AdminTab[] = [{ id: "geral", label: "Visão institucional", icon: Info }];

const recursosSistema = [
  { titulo: "Gestão cadastral", icon: Building2 },
  { titulo: "Atendimento e acompanhamento", icon: Workflow },
  { titulo: "Relatórios gerenciais", icon: ClipboardCopy },
  { titulo: "Controle administrativo", icon: ShieldCheck },
  { titulo: "Gestão documental", icon: Server },
  { titulo: "Captação de recursos", icon: Globe },
  { titulo: "Prestação de contas", icon: CheckCircle2 },
  { titulo: "Painéis e indicadores", icon: MonitorCog },
  { titulo: "IA aplicada à operação", icon: BrainCircuit },
  { titulo: "Organização institucional", icon: Bot }
] as const;

function detectarAmbiente() {
  if (import.meta.env.DEV) return "Desenvolvimento";

  const hostname = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  if (hostname.includes("hml") || hostname.includes("homolog")) return "Homologação";
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) return "Desenvolvimento";
  return "Produção";
}

function formatarDataHora(valor?: Date | null) {
  if (!valor) return "Não informado";
  return valor.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatarData(valor?: Date | null) {
  if (!valor) return "Não informado";
  return valor.toLocaleDateString("pt-BR");
}

function formatarHora(valor?: Date | null) {
  if (!valor) return "Não informado";
  return valor.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function obterUltimaAtualizacao() {
  if (typeof document === "undefined") return null;
  const valor = document.lastModified ? new Date(document.lastModified) : null;
  if (!valor || Number.isNaN(valor.getTime())) return null;
  return valor;
}

function obterInformacoesTela(): InformacoesTela {
  const agora = new Date();
  const ultimaAtualizacao = obterUltimaAtualizacao();
  const baseAplicacao = typeof window !== "undefined" ? window.location.origin : "Não informado";
  const baseApi = import.meta.env.VITE_API_URL?.trim() || baseAplicacao || "Não informado";
  const navegador = typeof navigator !== "undefined" ? navigator.userAgent : "Não informado";
  const plataforma = typeof navigator !== "undefined" ? navigator.platform || "Não informado" : "Não informado";
  const idioma = typeof navigator !== "undefined" ? navigator.language || "pt-BR" : "pt-BR";

  return {
    versao: APP_VERSION || "Não informado",
    release: APP_VERSION || "Não informado",
    ambiente: detectarAmbiente(),
    ultimaAtualizacaoData: formatarData(ultimaAtualizacao),
    ultimaAtualizacaoHora: formatarHora(ultimaAtualizacao),
    dataHoraAtual: formatarDataHora(agora),
    baseAplicacao,
    baseApi,
    navegador,
    plataforma,
    idioma
  };
}

function montarTextoTecnico(informacoes: InformacoesTela, usuarioLogado: string, instituicao: string) {
  return [
    "G3N - Informações técnicas",
    `Versão: ${informacoes.versao}`,
    `Release: ${informacoes.release}`,
    `Ambiente: ${informacoes.ambiente}`,
    `Última atualização: ${informacoes.ultimaAtualizacaoData} ${informacoes.ultimaAtualizacaoHora}`,
    `Data/hora atual: ${informacoes.dataHoraAtual}`,
    `Base da aplicação: ${informacoes.baseAplicacao}`,
    `Base da API: ${informacoes.baseApi}`,
    `Usuário logado: ${usuarioLogado}`,
    `Instituição vinculada: ${instituicao}`,
    `Navegador: ${informacoes.navegador}`,
    `Plataforma: ${informacoes.plataforma}`,
    `Idioma: ${informacoes.idioma}`
  ].join("\n");
}

export function SobreOSistemaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("geral");
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [loading, setLoading] = useState(false);
  const [informacoes, setInformacoes] = useState<InformacoesTela>(() => obterInformacoesTela());

  const usuarioLogado = usuario?.nome || usuario?.nomeUsuario || "Não informado";
  const instituicaoVinculada = "Não informado";
  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setInformacoes(obterInformacoesTela());
    }, 60_000);

    return () => window.clearInterval(intervalo);
  }, []);

  const cardsProduto = useMemo(
    () => [
      { rotulo: "Produto", valor: "G3N" },
      { rotulo: "Categoria", valor: "Sistema de gestão" },
      { rotulo: "Segmento", valor: "Terceiro setor / assistência social" },
      { rotulo: "Status do sistema", valor: "Ativo" },
      { rotulo: "Desenvolvido por", valor: "HTA Sistemas" },
      { rotulo: "Gerenciamento e desenvolvimento", valor: "Torresoft Soluções Empresariais" }
    ],
    []
  );

  const cardsVersao = useMemo(
    () => [
      { rotulo: "Versão atual", valor: informacoes.versao },
      { rotulo: "Build / release", valor: informacoes.release },
      { rotulo: "Ambiente", valor: informacoes.ambiente },
      { rotulo: "Data da última atualização", valor: informacoes.ultimaAtualizacaoData },
      { rotulo: "Hora da última atualização", valor: informacoes.ultimaAtualizacaoHora },
      { rotulo: "Data/hora atual", valor: informacoes.dataHoraAtual },
      { rotulo: "URL / base da aplicação", valor: informacoes.baseAplicacao }
    ],
    [informacoes]
  );

  const informacoesTecnicas = useMemo(
    () => [
      { rotulo: "Nome da aplicação", valor: "G3N" },
      { rotulo: "Versão", valor: informacoes.versao },
      { rotulo: "Ambiente", valor: informacoes.ambiente },
      { rotulo: "Navegador em uso", valor: informacoes.navegador },
      { rotulo: "Plataforma / dispositivo", valor: informacoes.plataforma },
      { rotulo: "Usuário logado", valor: usuarioLogado },
      { rotulo: "Empresa / instituição vinculada", valor: instituicaoVinculada },
      { rotulo: "Banco de dados", valor: "Não informado" },
      { rotulo: "Servidor / base URL", valor: informacoes.baseApi },
      { rotulo: "Data e hora atual do cliente", valor: informacoes.dataHoraAtual },
      { rotulo: "Idioma / localização", valor: informacoes.idioma || "pt-BR" }
    ],
    [informacoes, instituicaoVinculada, usuarioLogado]
  );

  const textoTecnico = useMemo(
    () => montarTextoTecnico(informacoes, usuarioLogado, instituicaoVinculada),
    [informacoes, instituicaoVinculada, usuarioLogado]
  );

  const atualizarInformacoes = async () => {
    setLoading(true);
    try {
      setInformacoes(obterInformacoesTela());
      setPopup({
        tipo: "sucesso",
        titulo: "Informações atualizadas",
        texto: "Os dados institucionais e técnicos foram atualizados com sucesso."
      });
    } finally {
      setLoading(false);
    }
  };

  const copiarInformacoesTecnicas = async () => {
    try {
      await navigator.clipboard.writeText(textoTecnico);
      setPopup({
        tipo: "sucesso",
        titulo: "Informações copiadas",
        texto: "As informações técnicas foram copiadas para a área de transferência."
      });
    } catch {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: "Não foi possível copiar as informações técnicas."
      });
    }
  };

  const fecharTela = () => {
    if (window.history.length > 1 && location.key !== "default") {
      navigate(-1);
      return;
    }
    navigate("/dashboard/visao-geral");
  };

  const acoes: AdminAction[] = [
    {
      label: loading ? "Atualizando..." : "Atualizar informações",
      icon: RefreshCcw,
      onClick: () => void atualizarInformacoes(),
      variant: "outline",
      disabled: loading
    },
    {
      label: "Copiar informações técnicas",
      icon: ClipboardCopy,
      onClick: () => void copiarInformacoesTecnicas(),
      variant: "default",
      disabled: false
    },
    {
      label: "Fechar",
      icon: X,
      onClick: fecharTela,
      variant: "outline",
      disabled: false
    }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Configurações gerais"
        pageTitle="Sobre o Sistema"
        activeTitle="Informações institucionais, técnicas e de desenvolvimento do G3N"
        activeIcon={Info}
      >
        <section className="space-y-4">
          <Card className="overflow-hidden border-[var(--g3-border)] bg-[linear-gradient(135deg,var(--g3-card)_0%,var(--g3-primary-soft)_48%,rgba(255,255,255,0.98)_100%)] shadow-[0_24px_64px_-36px_rgba(15,122,67,0.40)]">
            <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:p-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info" className="bg-[var(--g3-active)]/10 text-[var(--g3-active)]">
                    Sistema institucional
                  </Badge>
                  <Badge variant="success">Operação ativa</Badge>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight text-[var(--g3-foreground)] sm:text-3xl">
                    G3N
                  </h2>
                  <p className="max-w-3xl text-sm leading-6 text-[var(--g3-muted)] sm:text-[15px]">
                    Sistema de gestão desenvolvido para atender com eficiência, organização e inteligência as rotinas administrativas, operacionais e estratégicas da instituição.
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--g3-active)]/15 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Autoria institucional
                  </p>
                  <p className="mt-2 text-base font-semibold leading-7 text-[var(--g3-active)] sm:text-lg">
                    Desenvolvido por HTA Sistemas, sob o gerenciamento e desenvolvimento da Torresoft Soluções Empresariais.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/60 bg-white/88 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Versão
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--g3-foreground)]">{informacoes.versao}</p>
                  <p className="mt-1 text-xs text-[var(--g3-muted)]">Release {informacoes.release}</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/88 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Ambiente
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[var(--g3-foreground)]">{informacoes.ambiente}</p>
                  <p className="mt-1 text-xs text-[var(--g3-muted)]">Base {informacoes.baseAplicacao}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--g3-active)]">
                  <Building2 className="h-4 w-4" />
                  Identificação do produto
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {cardsProduto.map((item) => (
                  <div key={item.rotulo} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)]/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">
                      {item.rotulo}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--g3-foreground)]">{item.valor}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--g3-active)]">
                  <MonitorCog className="h-4 w-4" />
                  Versão e ambiente
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {cardsVersao.map((item) => (
                  <div key={item.rotulo} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">
                      {item.rotulo}
                    </p>
                    <p className="mt-2 break-words text-sm font-semibold text-[var(--g3-foreground)]">{item.valor}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-[var(--g3-border)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--g3-active)]">
                <Workflow className="h-4 w-4" />
                Recursos e capacidades do sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {recursosSistema.map((item) => {
                const Icone = item.icon;
                return (
                  <div
                    key={item.titulo}
                    className="rounded-2xl border border-[var(--g3-border)] bg-[linear-gradient(180deg,var(--g3-card)_0%,var(--g3-card-soft)_100%)] p-4 shadow-sm"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                      <Icone className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-[var(--g3-foreground)]">{item.titulo}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--g3-active)]">
                  <Server className="h-4 w-4" />
                  Informações técnicas
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => void copiarInformacoesTecnicas()}>
                  <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
                  Copiar informações técnicas
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {informacoesTecnicas.map((item) => (
                    <div key={item.rotulo} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">
                        {item.rotulo}
                      </p>
                      <p className="mt-2 break-words text-sm text-[var(--g3-foreground)]">{item.valor}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--g3-active)]">
                    <ShieldCheck className="h-4 w-4" />
                    Informações institucionais e responsabilidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-7 text-[var(--g3-muted)]">
                  <p>
                    <strong className="text-[var(--g3-foreground)]">O G3N é uma solução desenvolvida com foco em eficiência, padronização, segurança da informação, rastreabilidade e melhoria contínua dos processos institucionais.</strong>
                  </p>
                  <p>
                    Seu desenvolvimento foi realizado pela HTA Sistemas, sob o gerenciamento e desenvolvimento da Torresoft Soluções Empresariais, assegurando uma estrutura sólida, evolutiva e alinhada às necessidades operacionais da instituição.
                  </p>
                  <p>
                    A preservação da identidade do produto, da lógica de negócio, da organização visual e das evoluções implementadas deve respeitar as diretrizes internas do projeto.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--g3-active)]">
                    <Globe className="h-4 w-4" />
                    Suporte e contato institucional
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Responsável pelo sistema", "Não informado"],
                    ["Empresa desenvolvedora", "HTA Sistemas"],
                    ["Canal de suporte", "Configurar nas preferências do sistema"],
                    ["E-mail", "Não informado"],
                    ["Site", "A definir"],
                    ["Telefone", "Não informado"]
                  ].map(([rotulo, valor]) => (
                    <div key={rotulo} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">
                        {rotulo}
                      </p>
                      <p className="mt-2 text-sm text-[var(--g3-foreground)]">{valor}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-[var(--g3-border)] bg-[linear-gradient(180deg,var(--g3-card)_0%,var(--g3-card-soft)_100%)]">
            <CardContent className="flex flex-col gap-2 px-5 py-4 text-xs text-[var(--g3-muted)] sm:flex-row sm:items-center sm:justify-between">
              <p>© {anoAtual} HTA Sistemas — Gerenciamento e desenvolvimento: Torresoft Soluções Empresariais</p>
              <p>
                Versão {informacoes.versao} • {informacoes.ambiente}
              </p>
            </CardContent>
          </Card>
        </section>
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}
