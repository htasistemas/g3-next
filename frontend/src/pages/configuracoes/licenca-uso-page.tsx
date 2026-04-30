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
import { useAuth } from "@/hooks/use-auth";
import {
  beneficiosComerciais,
  comparativoLinhas,
  depoimentosEstrutura,
  faqComercial,
  linksComerciais,
  ofertaPlanos,
  perfisPlanos,
  provasConfianca
} from "@/pages/configuracoes/licenca-uso-oferta";
import { licencaUsoService } from "@/services/licenca-uso.service";
import type {
  LicencaUsoCiclo,
  LicencaUsoConfiguracao,
  LicencaUsoPagamentoHistorico,
  LicencaUsoPlanoId,
  LicencaUsoResponse
} from "@/types/licenca-uso";

const abas: AdminTab[] = [{ id: "licenca", label: "Licença de uso", icon: ShieldCheck }];

const configuracaoInicial: LicencaUsoConfiguracao = {
  planoId: "profissional",
  cicloCobranca: "mensal",
  vigenciaInicialDias: 30,
  valorBaseMensal: 697,
  percentualDesconto: 0,
  valorCobranca: 697,
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
  const plano = ofertaPlanos.find((item) => item.id === planoId) ?? ofertaPlanos[1];
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

function obterVigenciaDias(ciclo: LicencaUsoCiclo) {
  if (ciclo === "anual") return 365;
  if (ciclo === "semestral") return 180;
  return 30;
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

function calcularPrecoExibicao(planoId: LicencaUsoPlanoId, ciclo: "mensal" | "anual") {
  const plano = ofertaPlanos.find((item) => item.id === planoId) ?? ofertaPlanos[1];
  if (ciclo === "anual") {
    const totalAnual = Number((plano.valorMensal * 12 * 0.8).toFixed(2));
    const mensalEquivalente = Number((totalAnual / 12).toFixed(2));
    const economia = Number((plano.valorMensal * 12 - totalAnual).toFixed(2));
    return {
      valorDestaque: mensalEquivalente,
      apoio: `Cobrança anual de ${moeda(totalAnual)}`,
      legenda: `Economize ${moeda(economia)} por ano`,
      selo: "Implantação grátis no anual"
    };
  }

  return {
    valorDestaque: plano.valorMensal,
    apoio: `Implantação inicial de ${moeda(plano.implantacao)}`,
    legenda: "Valor mensal de referência",
    selo: "Contratação flexível para começar"
  };
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
        <p>
          Vigência:{" "}
          {item.vigenciaInicio
            ? `${formatarData(item.vigenciaInicio)} até ${formatarData(item.vigenciaFim)}`
            : "Aguardando ativação"}
        </p>
        <p>
          Criado em:{" "}
          {item.criadoEm
            ? new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "short"
              }).format(new Date(item.criadoEm))
            : "Não informado"}
        </p>
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

function SectionHeader({
  eyebrow,
  titulo,
  descricao
}: {
  eyebrow: string;
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
        <Sparkles className="h-4 w-4 text-[var(--g3-active)]" />
        {eyebrow}
      </div>
      <div className="space-y-2">
        <h2
          className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl"
          style={{ fontFamily: "Verdana, Geneva, sans-serif" }}
        >
          {titulo}
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600 md:text-base">{descricao}</p>
      </div>
    </div>
  );
}

export function LicencaUsoPage() {
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState("licenca");
  const [config, setConfig] = useState<LicencaUsoConfiguracao>(configuracaoInicial);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerandoCheckout, setGerandoCheckout] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [checkoutGeradoUrl, setCheckoutGeradoUrl] = useState("");
  const [resumo, setResumo] = useState<LicencaUsoResponse["resumo"]>({ bloqueiaSistema: false });
  const [historico, setHistorico] = useState<LicencaUsoResponse["historico"]>({
    pendentes: [],
    realizados: []
  });
  const { data: unidadeAtualData } = useUnidadeAssistencialAtual();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";

  useEffect(() => {
    let ativo = true;

    void (async () => {
      setCarregando(true);
      setMensagem(null);
      setCheckoutGeradoUrl("");
      setHistorico({ pendentes: [], realizados: [] });
      try {
        const data = await licencaUsoService.obterConfiguracao();
        if (!ativo) return;
        const cicloNormalizado: "mensal" | "anual" =
          data.configuracao.cicloCobranca === "anual" ? "anual" : "mensal";
        setConfig({
          ...data.configuracao,
          cicloCobranca: cicloNormalizado,
          checkoutHandle: data.configuracao.checkoutHandle || "Torresoft",
          checkoutRedirectUrl:
            data.configuracao.checkoutRedirectUrl ||
            `${window.location.origin}/licenca-de-uso/retorno-pagamento`,
          pixWebhookUrl:
            data.configuracao.pixWebhookUrl ||
            `${window.location.origin}/api/configuracoes/licenca-uso/webhook/infinitepay`,
          dataInicioVigencia:
            data.configuracao.dataInicioVigencia ?? new Date().toISOString().slice(0, 10),
          vigenciaInicialDias: obterVigenciaDias(cicloNormalizado)
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
  }, [tenantId]);

  const cnpjAtual = unidadeAtualData?.unidade?.cnpj ?? config.instituicaoCnpj ?? "";
  const emailUnidadeAtual =
    unidadeAtualData?.unidade?.email?.trim() || config.emailsAlerta.find(Boolean) || "";
  const cicloComercial: "mensal" | "anual" =
    config.cicloCobranca === "anual" ? "anual" : "mensal";
  const planoAtivo = useMemo(
    () => ofertaPlanos.find((item) => item.id === config.planoId) ?? ofertaPlanos[1],
    [config.planoId]
  );
  const dataInicio = config.dataInicioVigencia ?? new Date().toISOString().slice(0, 10);
  const vigenciaCalculadaDias = obterVigenciaDias(cicloComercial);
  const dataFimPrevista = adicionarDias(dataInicio, vigenciaCalculadaDias);
  const totalHoje = config.valorCobranca + (config.implantacaoIsenta ? 0 : config.valorImplantacao);
  const economiaAnualTexto = "Economize até 2 meses no plano anual";

  function aplicarPlano(planoId: LicencaUsoPlanoId, ciclo: LicencaUsoCiclo = cicloComercial) {
    const calculado = calcularValores(planoId, ciclo);
    setConfig((atual) => ({
      ...atual,
      planoId,
      cicloCobranca: ciclo,
      vigenciaInicialDias: obterVigenciaDias(ciclo),
      ...calculado
    }));
  }

  function atualizarCiclo(ciclo: "mensal" | "anual") {
    aplicarPlano(config.planoId, ciclo);
  }

  async function persistirConfiguracao() {
    const payload: LicencaUsoConfiguracao = {
      ...config,
      cicloCobranca: cicloComercial,
      instituicaoNome:
        unidadeAtualData?.unidade?.nome_fantasia ||
        unidadeAtualData?.unidade?.razao_social ||
        config.instituicaoNome,
      instituicaoCnpj: cnpjAtual,
      dataInicioVigencia: dataInicio,
      dataVencimento: dataFimPrevista,
      vigenciaInicialDias: vigenciaCalculadaDias,
      emailsAlerta: emailUnidadeAtual ? [emailUnidadeAtual] : [],
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
    setCheckoutGeradoUrl("");
    try {
      const salvo = await persistirConfiguracao();
      setConfig(salvo.configuracao);
      setResumo(salvo.resumo);
      setHistorico(salvo.historico);
      const data = await licencaUsoService.gerarCheckout();
      setConfig(data.configuracao);
      setResumo(data.resumo);
      setHistorico(data.historico);
      setCheckoutGeradoUrl(data.checkoutUrl ?? "");
      setMensagem({
        tipo: "sucesso",
        texto: data.checkoutUrl
          ? "Checkout gerado com sucesso. Clique em Abrir checkout para seguir para o pagamento."
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
      <div className="space-y-6 pb-6" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#f5f0de_0,#ffffff_38%,#ecf7f2_100%)]">
          <div className="grid gap-8 p-6 md:p-8 xl:grid-cols-[minmax(0,1.25fr)_380px]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                <Sparkles className="h-4 w-4 text-[var(--g3-active)]" />
                O G3N foi pensado para instituições que precisam crescer com organização, transparência e inteligência de gestão.
              </div>

              <div className="space-y-4">
                <h1
                  className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl"
                  style={{ fontFamily: "Verdana, Geneva, sans-serif" }}
                >
                  Escolha o plano ideal para profissionalizar a gestão da sua instituição
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-700 md:text-lg">
                  Organize atendimentos, centralize cadastros, acompanhe benefícios, fortaleça a prestação de contas e tenha mais controle da operação com o G3N.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a href={linksComerciais.demonstracao} target="_blank" rel="noreferrer">
                  <Button type="button" className="h-11 px-5">
                    Agendar demonstração
                  </Button>
                </a>
                <a href={linksComerciais.whatsapp} target="_blank" rel="noreferrer">
                  <Button type="button" variant="outline" className="h-11 px-5">
                    Falar no WhatsApp
                  </Button>
                </a>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Produto especializado
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Feito para a realidade do terceiro setor, assistência social e instituições com múltiplas rotinas operacionais.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Gestão com clareza
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Mais previsibilidade sobre atendimentos, benefícios, indicadores, documentos e evolução da operação.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Compra com segurança
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Plano, vigência, cobrança e histórico ficam centralizados em um único fluxo comercial e operacional.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-emerald-900/20 bg-[linear-gradient(180deg,#0f766e_0%,#0b5d56_100%)] p-6 text-white shadow-2xl shadow-emerald-200/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/80">
                    Resumo comercial
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{planoAtivo.nome}</p>
                </div>
                <ShieldCheck className="h-9 w-9 text-emerald-300" />
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-emerald-100/85">Instituição vinculada</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {unidadeAtualData?.unidade?.nome_fantasia || config.instituicaoNome || "Não informada"}
                  </p>
                  <p className="mt-1 text-sm text-emerald-50/80">{cnpjAtual || "CNPJ não localizado no registro"}</p>
                </div>

                <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-emerald-100/85">Status da licença</span>
                    <Badge variant={config.statusLicenca === "vencida" ? "danger" : "default"}>
                      {statusTexto(config.statusLicenca)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-emerald-100/85">Ciclo contratado</span>
                    <span>{cicloComercial === "anual" ? "Anual" : "Mensal"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-emerald-100/85">Cobrança do ciclo</span>
                    <span>{moeda(config.valorCobranca)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-emerald-100/85">Vigência calculada</span>
                    <span>{vigenciaCalculadaDias} dias</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-emerald-100/85">Data final prevista</span>
                    <span>{formatarData(dataFimPrevista)}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between gap-3 text-base font-semibold">
                    <span>Total desta contratação</span>
                    <span>{moeda(totalHoje)}</span>
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
                  O G3N transmite mais organização, melhora a gestão diária e fortalece a apresentação de resultados para direção, equipe e parceiros.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <SectionHeader
              eyebrow="Chave de cobrança"
              titulo="Defina como a instituição prefere contratar"
              descricao="Escolha entre mensal e anual para visualizar o investimento da forma mais estratégica para a sua instituição."
            />

            <div className="space-y-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4 xl:w-[420px]">
              <div className="grid grid-cols-2 gap-2">
                {(["mensal", "anual"] as const).map((ciclo) => {
                  const ativo = cicloComercial === ciclo;
                  return (
                    <button
                      key={ciclo}
                      type="button"
                      onClick={() => atualizarCiclo(ciclo)}
                      className={`rounded-2xl px-4 py-3 text-left transition ${
                        ativo
                          ? "bg-slate-950 text-white shadow-lg"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <p className="font-semibold">{ciclo === "anual" ? "Anual" : "Mensal"}</p>
                      <p className={`text-xs ${ativo ? "text-slate-300" : "text-slate-500"}`}>
                        {ciclo === "anual" ? "Mais previsibilidade" : "Mais flexibilidade"}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <p className="font-semibold">
                  {cicloComercial === "anual"
                    ? economiaAnualTexto
                    : "Melhor custo-benefício para instituições que desejam previsibilidade"}
                </p>
                <p className="mt-1">
                  No anual, a implantação fica grátis e o custo mensal equivalente se torna mais competitivo.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <SectionHeader
            eyebrow="Planos G3N"
            titulo="Escolha a estrutura comercial que acompanha o momento da sua instituição"
            descricao="Não é apenas software. É uma base de gestão para dar mais organização, segurança operacional e capacidade de crescimento."
          />

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {ofertaPlanos.map((plano) => {
              const preco = calcularPrecoExibicao(plano.id, cicloComercial);
              const ativo = plano.id === config.planoId;
              const isProfissional = plano.id === "profissional";
              return (
                <article
                  key={plano.id}
                  className={`min-w-0 rounded-[30px] border p-5 transition md:p-6 ${
                    isProfissional
                      ? "border-[var(--g3-active)] bg-[linear-gradient(180deg,#fff9ec_0%,#ffffff_50%,#eef7f3_100%)] shadow-xl shadow-amber-100/70"
                      : ativo
                        ? "border-emerald-700 bg-[linear-gradient(180deg,#0f766e_0%,#0b5d56_100%)] text-white shadow-xl shadow-emerald-200/70"
                        : "border-slate-200 bg-white shadow-sm"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="space-y-2">
                      <p
                        className={`text-xl font-semibold ${ativo && !isProfissional ? "text-white" : "text-slate-950"}`}
                      >
                        {plano.nome}
                      </p>
                      {plano.destaque ? (
                        <Badge className="border-0 bg-amber-500 text-slate-950">{plano.destaque}</Badge>
                      ) : null}
                      <p
                        className={`text-sm leading-6 ${
                          ativo && !isProfissional ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {plano.resumo}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-end gap-2">
                      <span className={`text-4xl font-semibold ${ativo && !isProfissional ? "text-white" : "text-slate-950"}`}>
                        {moeda(preco.valorDestaque)}
                      </span>
                      <span className={`pb-1 text-sm ${ativo && !isProfissional ? "text-slate-300" : "text-slate-500"}`}>
                        /mês
                      </span>
                    </div>
                    <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.2em] ${ativo && !isProfissional ? "text-slate-400" : "text-slate-500"}`}>
                      {preco.legenda}
                    </p>
                    <p
                      className={`mt-2 break-words text-sm ${ativo && !isProfissional ? "text-slate-300" : "text-slate-600"}`}
                    >
                      {preco.apoio}
                    </p>
                    <div
                      className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        ativo && !isProfissional
                          ? "bg-white/10 text-emerald-200"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {preco.selo}
                    </div>
                  </div>

                  <div
                    className={`mt-6 rounded-[24px] border p-4 text-sm leading-6 ${
                      ativo && !isProfissional
                        ? "border-white/10 bg-white/10 text-emerald-50"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {plano.mensagemValor}
                  </div>

                  <div className="mt-6 space-y-3">
                    {plano.funcionalidades.map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <CheckCircle2
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            ativo && !isProfissional ? "text-emerald-300" : "text-emerald-600"
                          }`}
                        />
                        <span
                          className={`break-words text-sm leading-6 ${ativo && !isProfissional ? "text-slate-200" : "text-slate-700"}`}
                        >
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Button
                      type="button"
                      onClick={() => aplicarPlano(plano.id)}
                      variant={isProfissional || ativo ? "default" : "outline"}
                      className={`h-11 w-full ${
                        ativo && !isProfissional
                          ? "border-white/10 bg-white text-emerald-900 hover:bg-emerald-50"
                          : ""
                      }`}
                    >
                      {plano.cta}
                    </Button>
                    {plano.id === "enterprise" ? (
                      <a
                        href={linksComerciais.especialista}
                        target="_blank"
                        rel="noreferrer"
                        className={`mt-3 inline-flex items-center gap-2 text-sm font-medium ${
                          ativo && !isProfissional ? "text-slate-200" : "text-slate-700"
                        }`}
                      >
                        Falar com especialista
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <SectionHeader
            eyebrow="Comparativo entre planos"
            titulo="Visualize com clareza a progressão de valor entre as opções"
            descricao="O G3N cresce junto com a instituição. Compare as entregas e identifique onde sua operação ganha mais controle e maturidade."
          />

          <div className="mt-8 overflow-x-auto rounded-[28px] border border-slate-200">
            <table className="min-w-[860px] w-full border-collapse text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-4 text-sm font-semibold text-slate-600">Funcionalidade</th>
                  {ofertaPlanos.map((plano) => {
                    const preco = calcularPrecoExibicao(plano.id, cicloComercial);
                    const destaque = plano.id === "profissional";
                    return (
                      <th
                        key={plano.id}
                        className={`px-4 py-4 text-center ${
                          destaque ? "bg-[var(--g3-primary-soft)] text-slate-950" : "text-slate-700"
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="text-base font-semibold">{plano.nome}</p>
                          <p className="text-sm">{moeda(preco.valorDestaque)}/mês</p>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {comparativoLinhas.map((linha) => (
                  <tr key={linha.nome} className="border-t border-slate-200">
                    <td className="px-4 py-4 text-sm text-slate-700">{linha.nome}</td>
                    {ofertaPlanos.map((plano) => {
                      const incluido = linha.valores[plano.id];
                      const destaque = plano.id === "profissional";
                      return (
                        <td
                          key={`${linha.nome}-${plano.id}`}
                          className={`px-4 py-4 text-center ${destaque ? "bg-[var(--g3-primary-soft)]" : ""}`}
                        >
                          {incluido ? (
                            <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600" />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <SectionHeader
              eyebrow="Para quem é"
              titulo="Cada plano responde a um momento diferente de gestão"
              descricao="A proposta comercial do G3N não tenta empurrar complexidade. Ela acompanha o estágio real da sua instituição."
            />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {perfisPlanos.map((item) => (
                <div key={item.titulo} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-base font-semibold text-slate-950">{item.titulo}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.descricao}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <SectionHeader
              eyebrow="Benefícios comerciais"
              titulo="O G3N entrega valor prático independentemente do plano"
              descricao="Em todos os níveis, o sistema foi pensado para reduzir ruído operacional e aumentar a confiança da gestão."
            />
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {beneficiosComerciais.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="text-sm leading-6 text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <SectionHeader
              eyebrow="Provas de confiança"
              titulo="Uma plataforma que transmite credibilidade para a instituição"
              descricao="A proposta do G3N é unir robustez operacional, implantação orientada e uma evolução contínua alinhada à realidade do terceiro setor."
            />
            <div className="mt-8 grid gap-3">
              {provasConfianca.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <ShieldCheck className="h-5 w-5 text-[var(--g3-active)]" />
                  <span className="text-sm text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <SectionHeader
              eyebrow="Prova social"
              titulo="Estrutura pronta para depoimentos e casos reais"
              descricao="Enquanto os depoimentos finais são publicados, a página já fica preparada para reforçar credibilidade comercial com instituições reais."
            />
            <div className="mt-8 grid gap-4">
              {depoimentosEstrutura.map((item, index) => (
                <div
                  key={`${item.instituicao}-${index}`}
                  className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5"
                >
                  <p className="text-sm leading-6 text-slate-700">“{item.depoimento}”</p>
                  <div className="mt-4 text-sm">
                    <p className="font-semibold text-slate-950">{item.instituicao}</p>
                    <p className="text-slate-600">
                      {item.responsavel} • {item.cargo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <SectionHeader
            eyebrow="FAQ comercial"
            titulo="Tire as dúvidas mais comuns antes de avançar"
            descricao="Respostas objetivas para facilitar a decisão de gestores, coordenadores, direção e presidência."
          />
          <div className="mt-8 grid gap-4">
            {faqComercial.map((item) => (
              <details key={item.pergunta} className="group rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-slate-950">
                  <span>{item.pergunta}</span>
                  <ArrowRight className="h-4 w-4 transition group-open:rotate-90" />
                </summary>
                <p className="mt-4 text-sm leading-6 text-slate-600">{item.resposta}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <SectionHeader
            eyebrow="Contratação e ativação"
            titulo="Simule a contratação, defina a vigência e gere a cobrança"
            descricao="A parte comercial e a parte operacional ficam na mesma tela para acelerar o fechamento com segurança."
          />

          {mensagem ? (
            <div
              className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                mensagem.tipo === "erro"
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-emerald-300 bg-emerald-50 text-emerald-700"
              }`}
            >
              {mensagem.texto}
            </div>
          ) : null}

          {checkoutGeradoUrl ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span>Checkout pronto para pagamento.</span>
              <a href={checkoutGeradoUrl} target="_blank" rel="noreferrer">
                <Button type="button" className="h-9">
                  Abrir checkout
                </Button>
              </a>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
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
                  <div className="grid gap-2 md:grid-cols-2">
                    {(["mensal", "anual"] as const).map((ciclo) => {
                      const ativo = cicloComercial === ciclo;
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
                          <p className="font-semibold text-slate-900">
                            {ciclo === "anual" ? "Anual" : "Mensal"}
                          </p>
                          <p className="text-sm text-slate-600">
                            {ciclo === "anual"
                              ? "Melhor custo-benefício e implantação grátis"
                              : "Contratação flexível para começar"}
                          </p>
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
                      Data em que o contrato começa. A data final será calculada automaticamente pelo ciclo escolhido.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Vigência calculada</Label>
                    <Input type="text" value={`${vigenciaCalculadaDias} dias`} readOnly />
                    <p className="text-xs text-slate-500">
                      Mensal soma 30 dias e anual soma 365 dias automaticamente.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plano em análise</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{planoAtivo.nome}</p>
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
                      <p>1. Você define o plano e escolhe o modelo de contratação.</p>
                      <p>2. O G3N calcula a vigência automaticamente.</p>
                      <p>3. A cobrança entra no histórico como pendente.</p>
                      <p>4. Após o pagamento, a vigência é atualizada no sistema.</p>
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
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">E-mail de destino automático</p>
                    <p className="mt-1">
                      {emailUnidadeAtual
                        ? `Os alertas serão enviados automaticamente para ${emailUnidadeAtual}.`
                        : "Cadastre um e-mail na unidade assistencial para habilitar o envio automático dos alertas."}
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
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
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
        </section>

        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-[linear-gradient(135deg,#17312e_0%,#112522_55%,#0a1715_100%)] p-6 text-white shadow-xl shadow-slate-200 md:p-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_auto] xl:items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                <Sparkles className="h-4 w-4" />
                Chamada final
              </div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
                Pronto para profissionalizar a gestão da sua instituição?
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                Escolha o plano ideal e comece a usar o G3N para organizar processos, melhorar o atendimento e dar mais segurança à operação.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={linksComerciais.demonstracao} target="_blank" rel="noreferrer">
                <Button type="button" className="h-11 px-5">
                  Agendar demonstração
                </Button>
              </a>
              <a href={linksComerciais.whatsapp} target="_blank" rel="noreferrer">
                <Button type="button" variant="outline" className="h-11 border-white/20 bg-white/10 px-5 text-white hover:bg-white/20">
                  Falar no WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </section>
      </div>
    </AdminPageLayout>
  );
}
