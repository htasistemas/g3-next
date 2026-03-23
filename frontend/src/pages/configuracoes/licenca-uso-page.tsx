import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Mail,
  Save,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { AdminPageLayout, type AdminTab } from "@/components/admin/admin-page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUnidadeAssistencialAtual } from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import { licencaUsoService } from "@/services/licenca-uso.service";
import type {
  LicencaUsoCiclo,
  LicencaUsoConfiguracao,
  LicencaUsoPagamentoHistorico,
  LicencaUsoPlanoId,
  LicencaUsoResponse
} from "@/types/licenca-uso";

const abas: AdminTab[] = [{ id: "licenca", label: "Licença de uso", icon: ShieldCheck }];

const planos: Array<{
  id: LicencaUsoPlanoId;
  nome: string;
  valorMensal: number;
  implantacao: number;
  destaque?: string;
  resumo: string;
  liberacoes: string[];
}> = [
  {
    id: "essencial",
    nome: "Essencial",
    valorMensal: 147,
    implantacao: 497,
    resumo: "Ideal para organizações menores que precisam organizar a base e o atendimento.",
    liberacoes: [
      "Cadastro de beneficiários",
      "Cadastro familiar básico",
      "Atendimentos simples",
      "Relatórios básicos"
    ]
  },
  {
    id: "profissional",
    nome: "Profissional",
    valorMensal: 247,
    implantacao: 897,
    destaque: "Mais escolhido",
    resumo: "Equilibra operação, gestão e valor percebido para a maioria das instituições.",
    liberacoes: [
      "Histórico completo de atendimentos",
      "Controle de benefícios",
      "Financeiro básico",
      "Dashboard inteligente"
    ]
  },
  {
    id: "premium",
    nome: "Premium",
    valorMensal: 397,
    implantacao: 1500,
    resumo: "Entrega o G3N completo com IA, automação e visão executiva.",
    liberacoes: [
      "IA integrada",
      "Prestação de contas completa",
      "Captação de recursos",
      "Georreferenciamento"
    ]
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    valorMensal: 597,
    implantacao: 1500,
    resumo: "Para operações maiores com multiunidades, integrações e atendimento prioritário.",
    liberacoes: [
      "Usuários ilimitados",
      "Multiunidades",
      "Integrações por API",
      "Suporte prioritário"
    ]
  }
];

const configuracaoInicial: LicencaUsoConfiguracao = {
  planoId: "profissional",
  cicloCobranca: "mensal",
  vigenciaInicialDias: 30,
  valorBaseMensal: 247,
  percentualDesconto: 0,
  valorCobranca: 247,
  valorImplantacao: 897,
  implantacaoIsenta: false,
  statusLicenca: "sem_vigencia",
  alertasEmailAtivos: true,
  diasAlertaEmail: [30, 15, 7, 1],
  emailsAlerta: [],
  pixAmbiente: "sandbox",
  pixExpiracaoMinutos: 1440,
  pixProvider: "infinitypay",
  cartaoProvider: "infinitypay",
  cartaoAmbiente: "sandbox",
  cartaoTentativasFalha: 2,
  boletoProvider: "infinitypay",
  boletoAmbiente: "sandbox",
  boletoPrazoVencimentoDias: 5
};

function moeda(valor?: number) {
  return Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data?: string) {
  if (!data) return "Não definida";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${data}T00:00:00`));
}

function calcularValores(planoId: LicencaUsoPlanoId, ciclo: LicencaUsoCiclo) {
  const plano = planos.find((item) => item.id === planoId) ?? planos[1];
  const meses = ciclo === "anual" ? 12 : ciclo === "semestral" ? 6 : 1;
  const desconto = ciclo === "anual" ? 20 : ciclo === "semestral" ? 10 : 0;
  const valorCobranca = Number((plano.valorMensal * meses * (1 - desconto / 100)).toFixed(2));
  const implantacaoIsenta = ciclo === "anual";
  return {
    valorBaseMensal: plano.valorMensal,
    percentualDesconto: desconto,
    valorCobranca,
    valorImplantacao: implantacaoIsenta ? 0 : plano.implantacao,
    implantacaoIsenta
  };
}

function adicionarDias(dataIso?: string, dias?: number) {
  if (!dataIso || !dias) return "";
  const data = new Date(`${dataIso}T00:00:00`);
  data.setDate(data.getDate() + Math.max(dias, 1) - 1);
  return data.toISOString().slice(0, 10);
}

function statusTexto(status: LicencaUsoConfiguracao["statusLicenca"]) {
  if (status === "vencida") return "Vencida";
  if (status === "vence_hoje") return "Vence hoje";
  if (status === "ativa") return "Ativa";
  return "Sem vigência";
}

function PaymentItem({
  item,
  destaque
}: {
  item: LicencaUsoPagamentoHistorico;
  destaque: "pendente" | "realizado";
}) {
  return (
    <div
      className={`rounded-3xl border p-4 ${
        destaque === "pendente"
          ? "border-amber-200 bg-amber-50/80"
          : "border-emerald-200 bg-emerald-50/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{item.descricao}</p>
          <p className="text-xs text-slate-600">
            {item.planoId} • {item.cicloCobranca}
          </p>
        </div>
        <Badge variant={destaque === "pendente" ? "warning" : "success"}>
          {destaque === "pendente" ? "Pendente" : "Pago"}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
        <p>Valor total: {moeda(item.valorTotal)}</p>
        <p>Vigência: {item.vigenciaInicio ? `${formatarData(item.vigenciaInicio)} até ${formatarData(item.vigenciaFim)}` : "Aguardando ativação"}</p>
        <p>Criado em: {item.criadoEm ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.criadoEm)) : "Não informado"}</p>
        <p>NSU: {item.orderNsu || "Não informado"}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.checkoutUrl ? (
          <a href={item.checkoutUrl} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline" className="h-9">
              Abrir checkout
            </Button>
          </a>
        ) : null}
        {item.receiptUrl ? (
          <a href={item.receiptUrl} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline" className="h-9">
              Ver comprovante
            </Button>
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function LicencaUsoPage() {
  const [abaAtiva, setAbaAtiva] = useState("licenca");
  const [config, setConfig] = useState<LicencaUsoConfiguracao>(configuracaoInicial);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerandoCheckout, setGerandoCheckout] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [resumo, setResumo] = useState<LicencaUsoResponse["resumo"]>({ bloqueiaSistema: false });
  const [historico, setHistorico] = useState<LicencaUsoResponse["historico"]>({
    pendentes: [],
    realizados: []
  });
  const { data: unidadeAtualData } = useUnidadeAssistencialAtual();

  useEffect(() => {
    let ativo = true;

    void (async () => {
      setCarregando(true);
      try {
        const data = await licencaUsoService.obterConfiguracao();
        if (!ativo) return;
        setConfig({
          ...data.configuracao,
          checkoutHandle: data.configuracao.checkoutHandle || "Torresoft",
          checkoutRedirectUrl:
            data.configuracao.checkoutRedirectUrl ||
            `${window.location.origin}/licenca-de-uso/retorno-pagamento`,
          pixWebhookUrl:
            data.configuracao.pixWebhookUrl ||
            `${window.location.origin}/api/configuracoes/licenca-uso/webhook/infinitepay`,
          dataInicioVigencia:
            data.configuracao.dataInicioVigencia ?? new Date().toISOString().slice(0, 10),
          vigenciaInicialDias: data.configuracao.vigenciaInicialDias ?? 30
        });
        setResumo(data.resumo);
        setHistorico(data.historico);
      } catch (error: any) {
        if (!ativo) return;
        setMensagem({
          tipo: "erro",
          texto: error?.response?.data?.message ?? "Não foi possível carregar a licença de uso."
        });
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

  const cnpjAtual = unidadeAtualData?.unidade?.cnpj ?? config.instituicaoCnpj ?? "";
  const planoAtivo = useMemo(
    () => planos.find((item) => item.id === config.planoId) ?? planos[1],
    [config.planoId]
  );
  const dataInicio = config.dataInicioVigencia ?? new Date().toISOString().slice(0, 10);
  const dataFimPrevista = adicionarDias(dataInicio, config.vigenciaInicialDias ?? 30);
  const totalHoje = config.valorCobranca + (config.implantacaoIsenta ? 0 : config.valorImplantacao);

  function aplicarPlano(planoId: LicencaUsoPlanoId, ciclo = config.cicloCobranca) {
    const calculado = calcularValores(planoId, ciclo);
    setConfig((atual) => ({
      ...atual,
      planoId,
      cicloCobranca: ciclo,
      ...calculado
    }));
  }

  function atualizarCiclo(ciclo: LicencaUsoCiclo) {
    aplicarPlano(config.planoId, ciclo);
  }

  async function persistirConfiguracao() {
    const payload: LicencaUsoConfiguracao = {
      ...config,
      instituicaoNome:
        unidadeAtualData?.unidade?.nome_fantasia ||
        unidadeAtualData?.unidade?.razao_social ||
        config.instituicaoNome,
      instituicaoCnpj: cnpjAtual,
      dataInicioVigencia: dataInicio,
      dataVencimento: dataFimPrevista,
      vigenciaInicialDias: Math.max(Number(config.vigenciaInicialDias ?? 30), 1),
      emailsAlerta: config.emailsAlerta.filter(Boolean),
      diasAlertaEmail: [...config.diasAlertaEmail].sort((a, b) => b - a),
      checkoutHandle: "Torresoft",
      checkoutRedirectUrl: `${window.location.origin}/licenca-de-uso/retorno-pagamento`,
      pixWebhookUrl: `${window.location.origin}/api/configuracoes/licenca-uso/webhook/infinitepay`
    };
    return licencaUsoService.salvarConfiguracao(payload);
  }

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    try {
      const data = await persistirConfiguracao();
      setConfig(data.configuracao);
      setResumo(data.resumo);
      setHistorico(data.historico);
      setMensagem({ tipo: "sucesso", texto: "Licença de uso atualizada com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar a licença de uso."
      });
    } finally {
      setSalvando(false);
    }
  }

  async function gerarCheckout() {
    setGerandoCheckout(true);
    setMensagem(null);
    try {
      const salvo = await persistirConfiguracao();
      setConfig(salvo.configuracao);
      setResumo(salvo.resumo);
      setHistorico(salvo.historico);
      const data = await licencaUsoService.gerarCheckout();
      setConfig(data.configuracao);
      setResumo(data.resumo);
      setHistorico(data.historico);
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
      }
      setMensagem({
        tipo: "sucesso",
        texto: data.checkoutUrl
          ? "Checkout gerado com sucesso. O pagamento já entrou no histórico como pendente."
          : "Checkout gerado sem URL de abertura."
      });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível gerar o checkout da licença."
      });
    } finally {
      setGerandoCheckout(false);
    }
  }

  return (
    <AdminPageLayout
      tabs={abas}
      activeTab={abaAtiva}
      onChangeTab={(tabId) => setAbaAtiva(tabId)}
      sectionLabel="Configurações gerais"
      pageTitle="Licença de uso"
      activeTitle="Licença de uso"
      actions={[
        {
          label: salvando ? "Salvando..." : "Salvar cenário",
          icon: Save,
          onClick: () => void salvar(),
          variant: "outline",
          disabled: salvando || carregando
        },
        {
          label: gerandoCheckout ? "Gerando checkout..." : "Gerar cobrança",
          icon: ExternalLink,
          onClick: () => void gerarCheckout(),
          variant: "default",
          disabled: gerandoCheckout || salvando || carregando
        }
      ]}
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f7f4ea_0%,#fffdf7_55%,#eef7f3_100%)]">
          <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_360px] xl:p-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                <Sparkles className="h-4 w-4 text-[var(--g3-active)]" />
                Licenciamento guiado do G3N
              </div>
              <div className="space-y-3">
                <h2 className="max-w-3xl font-serif text-3xl font-semibold tracking-tight text-slate-900">
                  Escolha o plano, defina a vigência inicial e acompanhe toda a jornada de pagamento em uma única tela.
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
                  A experiência foi simplificada para seguir o padrão das melhores áreas de billing da web:
                  decisão clara, resumo comercial imediato, status visível e histórico financeiro sem ruído técnico.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instituição vinculada</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {unidadeAtualData?.unidade?.nome_fantasia || config.instituicaoNome || "Não informada"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{cnpjAtual || "CNPJ não localizado no registro"}</p>
                </div>
                <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status da licença</p>
                  <div className="mt-2">
                    <Badge variant={config.statusLicenca === "vencida" ? "danger" : "default"}>
                      {statusTexto(config.statusLicenca)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {config.dataVencimento
                      ? `Vigência atual até ${formatarData(config.dataVencimento)}`
                      : "A vigência será definida no fluxo abaixo."}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Próximo passo</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">Gerar cobrança e acompanhar o retorno</p>
                  <p className="mt-1 text-sm text-slate-600">
                    O sistema envia alertas por e-mail, mas nunca bloqueia a operação.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-xl shadow-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Resumo ao vivo</p>
                  <p className="mt-2 text-xl font-semibold">{planoAtivo.nome}</p>
                </div>
                <ShieldCheck className="h-8 w-8 text-emerald-300" />
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-sm text-slate-400">Cobrança do ciclo</p>
                  <p className="text-3xl font-semibold">{moeda(config.valorCobranca)}</p>
                </div>
                <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-300">Implantação</span>
                    <span>{config.implantacaoIsenta ? "Grátis" : moeda(config.valorImplantacao)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-300">Vigência inicial</span>
                    <span>{config.vigenciaInicialDias ?? 30} dias</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-300">Data final prevista</span>
                    <span>{formatarData(dataFimPrevista)}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between gap-3 text-base font-semibold">
                    <span>Total desta cobrança</span>
                    <span>{moeda(totalHoje)}</span>
                  </div>
                </div>
                <p className="text-xs leading-5 text-slate-400">
                  Estrutura de pagamento InfinityPay pronta e vinculada automaticamente ao G3N, sem exigir preenchimento técnico do usuário final.
                </p>
              </div>
            </div>
          </div>
        </section>

        {mensagem ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              mensagem.tipo === "erro"
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-emerald-300 bg-emerald-50 text-emerald-700"
            }`}
          >
            {mensagem.texto}
          </div>
        ) : null}

        <Card className="border-[var(--g3-border)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-[var(--g3-active)]" />
              Escolha do plano
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-4">
            {planos.map((plano) => {
              const ativo = plano.id === config.planoId;
              return (
                <button
                  key={plano.id}
                  type="button"
                  onClick={() => aplicarPlano(plano.id)}
                  className={`group rounded-[28px] border p-5 text-left transition ${
                    ativo
                      ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)] shadow-sm"
                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{plano.nome}</p>
                      <p className="mt-1 text-sm text-slate-600">{plano.resumo}</p>
                    </div>
                    {plano.destaque ? <Badge>{plano.destaque}</Badge> : null}
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-slate-950">{moeda(plano.valorMensal)}</p>
                  <p className="text-xs text-slate-500">valor mensal de referência</p>
                  <div className="mt-4 space-y-2 text-sm text-slate-700">
                    {plano.liberacoes.map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm font-medium">
                    <span>{ativo ? "Plano selecionado" : "Selecionar plano"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <Card className="border-[var(--g3-border)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-5 w-5 text-[var(--g3-active)]" />
                Ativação guiada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label>Ciclo comercial</Label>
                <div className="grid gap-2 md:grid-cols-3">
                  {(["mensal", "semestral", "anual"] as LicencaUsoCiclo[]).map((ciclo) => {
                    const ativo = config.cicloCobranca === ciclo;
                    const label =
                      ciclo === "mensal"
                        ? "Mensal"
                        : ciclo === "semestral"
                          ? "Semestral"
                          : "Anual";
                    const subtitulo =
                      ciclo === "mensal"
                        ? "sem desconto"
                        : ciclo === "semestral"
                          ? "10% off"
                          : "20% off + implantação grátis";
                    return (
                      <button
                        key={ciclo}
                        type="button"
                        onClick={() => atualizarCiclo(ciclo)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          ativo
                            ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <p className="font-semibold text-slate-900">{label}</p>
                        <p className="text-sm text-slate-600">{subtitulo}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Início da vigência</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(event) =>
                      setConfig((atual) => ({
                        ...atual,
                        dataInicioVigencia: event.target.value || new Date().toISOString().slice(0, 10)
                      }))
                    }
                  />
                  <p className="text-xs text-slate-500">
                    Data em que o cliente começa a usar a licença do G3N.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Vigência inicial em dias</Label>
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={String(config.vigenciaInicialDias ?? 30)}
                    onChange={(event) =>
                      setConfig((atual) => ({
                        ...atual,
                        vigenciaInicialDias: Math.max(Number(event.target.value || 1), 1)
                      }))
                    }
                  />
                  <p className="text-xs text-slate-500">
                    Exemplo: ao informar 30, a licença fica válida por 30 dias corridos.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data inicial</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatarData(dataInicio)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data final</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatarData(dataFimPrevista)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cobrança do ciclo</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{moeda(config.valorCobranca)}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">O que será cobrado agora</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <span>Licença {planoAtivo.nome}</span>
                      <span>{moeda(config.valorCobranca)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Implantação</span>
                      <span>{config.implantacaoIsenta ? "Grátis" : moeda(config.valorImplantacao)}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex items-center justify-between gap-3 font-semibold text-slate-950">
                      <span>Total</span>
                      <span>{moeda(totalHoje)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Como funciona no dia a dia</p>
                  <div className="mt-3 space-y-2 text-sm text-emerald-900/90">
                    <p>1. Você escolhe o plano e define a vigência inicial.</p>
                    <p>2. O sistema calcula a data final automaticamente.</p>
                    <p>3. Ao gerar a cobrança, o checkout entra no histórico como pendente.</p>
                    <p>4. Quando houver pagamento, o histórico muda para realizado e a vigência é atualizada.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BellRing className="h-5 w-5 text-[var(--g3-active)]" />
                  Alertas por e-mail
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={config.alertasEmailAtivos}
                    onChange={(event) =>
                      setConfig((atual) => ({
                        ...atual,
                        alertasEmailAtivos: event.target.checked
                      }))
                    }
                  />
                  Enviar alertas de vencimento por e-mail
                </label>
                <div className="space-y-2">
                  <Label>E-mails que receberão os alertas</Label>
                  <textarea
                    className="min-h-[120px] w-full rounded-2xl border border-[var(--g3-border)] bg-white px-3 py-2 text-sm outline-none ring-0"
                    value={config.emailsAlerta.join("\n")}
                    onChange={(event) =>
                      setConfig((atual) => ({
                        ...atual,
                        emailsAlerta: event.target.value
                          .split(/\r?\n/u)
                          .map((item) => item.trim())
                          .filter(Boolean)
                      }))
                    }
                    placeholder={"financeiro@instituicao.org.br\ndiretoria@instituicao.org.br"}
                  />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Regra operacional</p>
                  <p className="mt-1">
                    O G3N apenas alerta por e-mail. A licença vencida não bloqueia o uso do sistema.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Mail className="h-4 w-4 text-[var(--g3-active)]" />
                    <span className="font-semibold">Próximo marco automático</span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    {resumo.proximoAlertaDias != null
                      ? `${resumo.proximoAlertaDias} dia(s) antes do vencimento`
                      : "Nenhum marco definido com a configuração atual"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-5 w-5 text-[var(--g3-active)]" />
                  Cobrança pronta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Integração ativa</p>
                  <p className="mt-1">InfinityPay com handle fixo `Torresoft`.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Retorno automático</p>
                  <p className="mt-1">A URL de retorno e a webhook pública são preenchidas pelo próprio G3N.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">Última referência</p>
                  <p className="mt-1">{config.ultimoOrderNsu || "Nenhuma cobrança gerada até agora."}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-[var(--g3-border)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock3 className="h-5 w-5 text-amber-600" />
                Pagamentos a realizar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {historico.pendentes.length ? (
                historico.pendentes.map((item) => (
                  <PaymentItem key={item.id} item={item} destaque="pendente" />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                  Ainda não existe cobrança pendente. Gere uma nova cobrança para iniciar o histórico financeiro.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[var(--g3-border)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Pagamentos realizados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {historico.realizados.length ? (
                historico.realizados.map((item) => (
                  <PaymentItem key={item.id} item={item} destaque="realizado" />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                  Nenhum pagamento confirmado até o momento. Quando a InfinitePay confirmar, ele aparecerá aqui.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageLayout>
  );
}
