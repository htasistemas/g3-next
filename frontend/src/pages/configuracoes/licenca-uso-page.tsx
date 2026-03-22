import { useEffect, useMemo, useState } from "react";
import { BellRing, CreditCard, ExternalLink, Save, ShieldCheck } from "lucide-react";
import { AdminPageLayout, type AdminTab } from "@/components/admin/admin-page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUnidadeAssistencialAtual } from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import { licencaUsoService } from "@/services/licenca-uso.service";
import type { LicencaUsoCiclo, LicencaUsoConfiguracao, LicencaUsoPlanoId, LicencaUsoResponse } from "@/types/licenca-uso";

const abas: AdminTab[] = [{ id: "licenca", label: "Licença de uso", icon: ShieldCheck }];

const planos: Array<{
  id: LicencaUsoPlanoId;
  nome: string;
  valorMensal: number;
  recomendacao?: string;
  implantacao: number;
  liberacoes: string[];
}> = [
  {
    id: "essencial",
    nome: "Essencial",
    valorMensal: 147,
    implantacao: 497,
    liberacoes: [
      "Cadastro de beneficiários",
      "Cadastro familiar básico",
      "Controle de atendimentos simples",
      "Registro manual de doações",
      "Relatórios básicos",
      "Agenda simples",
      "Controle limitado de usuários",
      "Exportação básica em PDF e Excel"
    ]
  },
  {
    id: "profissional",
    nome: "Profissional",
    valorMensal: 247,
    recomendacao: "Plano principal",
    implantacao: 897,
    liberacoes: [
      "Tudo do Essencial",
      "Cadastro familiar inteligente",
      "Central de atendimentos com histórico completo",
      "Controle de benefícios",
      "Controle financeiro básico",
      "Relatórios gerenciais",
      "Gestão de doadores",
      "WhatsApp e e-mail básico"
    ]
  },
  {
    id: "premium",
    nome: "Premium",
    valorMensal: 397,
    implantacao: 1500,
    liberacoes: [
      "Tudo do Profissional",
      "IA integrada",
      "Sugestões inteligentes automáticas",
      "Correção de dados",
      "Relatórios executivos automáticos",
      "Prestação de contas completa",
      "Captação com PIX, boleto e campanhas",
      "Georreferenciamento e automação"
    ]
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    valorMensal: 597,
    implantacao: 1500,
    liberacoes: [
      "Tudo do Premium",
      "Usuários ilimitados",
      "Multiunidades e filiais",
      "Personalizações",
      "Integrações por API",
      "Suporte prioritário",
      "Treinamento contínuo",
      "Backup e segurança avançada"
    ]
  }
];

const configuracaoInicial: LicencaUsoConfiguracao = {
  planoId: "profissional",
  cicloCobranca: "mensal",
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

function statusTexto(status: LicencaUsoConfiguracao["statusLicenca"]) {
  if (status === "vencida") return "Vencida";
  if (status === "vence_hoje") return "Vence hoje";
  if (status === "ativa") return "Ativa";
  return "Sem vigência";
}

export function LicencaUsoPage() {
  const [abaAtiva, setAbaAtiva] = useState("licenca");
  const [config, setConfig] = useState<LicencaUsoConfiguracao>(configuracaoInicial);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerandoCheckout, setGerandoCheckout] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [resumo, setResumo] = useState<LicencaUsoResponse["resumo"]>({ bloqueiaSistema: false });
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
            `${window.location.origin}/api/configuracoes/licenca-uso/webhook/infinitepay`
        });
        setResumo(data.resumo);
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
      emailsAlerta: config.emailsAlerta.filter(Boolean),
      diasAlertaEmail: [...config.diasAlertaEmail].sort((a, b) => b - a),
      checkoutHandle: config.checkoutHandle || "Torresoft",
      checkoutRedirectUrl:
        config.checkoutRedirectUrl || `${window.location.origin}/licenca-de-uso/retorno-pagamento`,
      pixWebhookUrl:
        config.pixWebhookUrl || `${window.location.origin}/api/configuracoes/licenca-uso/webhook/infinitepay`
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
      setMensagem({ tipo: "sucesso", texto: "Licença de uso salva com sucesso." });
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
      const data = await licencaUsoService.gerarCheckout();
      setConfig(data.configuracao);
      setResumo(data.resumo);
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
      }
      setMensagem({
        tipo: "sucesso",
        texto: data.checkoutUrl
          ? "Checkout da InfinitePay gerado com sucesso."
          : "Checkout gerado, mas sem URL de abertura."
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
          label: salvando ? "Salvando..." : "Salvar",
          icon: Save,
          onClick: () => void salvar(),
          variant: "default",
          disabled: salvando || carregando
        },
        {
          label: gerandoCheckout ? "Gerando checkout..." : "Gerar checkout",
          icon: ExternalLink,
          onClick: () => void gerarCheckout(),
          variant: "outline",
          disabled: gerandoCheckout || salvando || carregando
        }
      ]}
    >
      <div className="space-y-4">
        <Card className="border-[var(--g3-border)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-[var(--g3-active)]" />
              Resumo da licença
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-[var(--g3-border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Instituição</p>
              <p className="mt-1 font-semibold">{unidadeAtualData?.unidade?.nome_fantasia || config.instituicaoNome || "Não informada"}</p>
            </div>
            <div className="rounded-xl border border-[var(--g3-border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">CNPJ vinculado</p>
              <p className="mt-1 font-semibold">{cnpjAtual || "Não informado no registro"}</p>
            </div>
            <div className="rounded-xl border border-[var(--g3-border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Plano atual</p>
              <p className="mt-1 font-semibold">{planoAtivo.nome}</p>
            </div>
            <div className="rounded-xl border border-[var(--g3-border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Status</p>
              <div className="mt-1">
                <Badge variant={config.statusLicenca === "vencida" ? "danger" : "default"}>
                  {statusTexto(config.statusLicenca)}
                </Badge>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--g3-border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Bloqueio</p>
              <p className="mt-1 font-semibold">Não bloqueia o sistema</p>
            </div>
          </CardContent>
        </Card>

        {mensagem ? (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${
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
            <CardTitle className="text-base">Planos oficiais do G3N</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 xl:grid-cols-4">
            {planos.map((plano) => {
              const ativo = plano.id === config.planoId;
              const valorCiclo = calcularValores(plano.id, config.cicloCobranca);
              return (
                <button
                  key={plano.id}
                  type="button"
                  className={`rounded-2xl border p-4 text-left transition ${
                    ativo
                      ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]"
                      : "border-[var(--g3-border)] bg-[var(--g3-card)]"
                  }`}
                  onClick={() => aplicarPlano(plano.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold">{plano.nome}</p>
                      {plano.recomendacao ? <p className="text-xs text-[var(--g3-active)]">{plano.recomendacao}</p> : null}
                    </div>
                    {ativo ? <Badge>Selecionado</Badge> : null}
                  </div>
                  <p className="mt-3 text-2xl font-bold">{moeda(plano.valorMensal)}</p>
                  <p className="text-xs text-[var(--g3-muted)]">valor mensal de referência</p>
                  <p className="mt-3 text-sm font-medium">Cobrança no ciclo atual: {moeda(valorCiclo.valorCobranca)}</p>
                  <div className="mt-3 space-y-1 text-sm text-[var(--g3-muted)]">
                    {plano.liberacoes.slice(0, 4).map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-4">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Vigência e cobrança</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Plano</Label>
                  <Select value={config.planoId} onChange={(event) => aplicarPlano(event.target.value as LicencaUsoPlanoId)}>
                    {planos.map((plano) => (
                      <option key={plano.id} value={plano.id}>
                        {plano.nome}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Ciclo de cobrança</Label>
                  <Select value={config.cicloCobranca} onChange={(event) => atualizarCiclo(event.target.value as LicencaUsoCiclo)}>
                    <option value="mensal">Mensal</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Início da vigência</Label>
                  <Input type="date" value={config.dataInicioVigencia ?? ""} onChange={(event) => setConfig((atual) => ({ ...atual, dataInicioVigencia: event.target.value || undefined }))} />
                </div>
                <div className="space-y-1">
                  <Label>Vencimento da licença</Label>
                  <Input type="date" value={config.dataVencimento ?? ""} onChange={(event) => setConfig((atual) => ({ ...atual, dataVencimento: event.target.value || undefined }))} />
                </div>
                <div className="space-y-1">
                  <Label>Valor mensal base</Label>
                  <Input value={String(config.valorBaseMensal)} onChange={(event) => setConfig((atual) => ({ ...atual, valorBaseMensal: Number(event.target.value || 0) }))} />
                </div>
                <div className="space-y-1">
                  <Label>Desconto do ciclo (%)</Label>
                  <Input value={String(config.percentualDesconto)} onChange={(event) => setConfig((atual) => ({ ...atual, percentualDesconto: Number(event.target.value || 0) }))} />
                </div>
                <div className="space-y-1">
                  <Label>Valor da cobrança</Label>
                  <Input value={String(config.valorCobranca)} onChange={(event) => setConfig((atual) => ({ ...atual, valorCobranca: Number(event.target.value || 0) }))} />
                </div>
                <div className="space-y-1">
                  <Label>Handle da InfinitePay</Label>
                  <Input value={config.checkoutHandle ?? "Torresoft"} onChange={(event) => setConfig((atual) => ({ ...atual, checkoutHandle: event.target.value || "Torresoft" }))} />
                </div>
                <div className="space-y-1">
                  <Label>Implantação</Label>
                  <Input value={String(config.valorImplantacao)} disabled={config.implantacaoIsenta} onChange={(event) => setConfig((atual) => ({ ...atual, valorImplantacao: Number(event.target.value || 0) }))} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>URL de retorno do checkout</Label>
                  <Input value={config.checkoutRedirectUrl ?? ""} onChange={(event) => setConfig((atual) => ({ ...atual, checkoutRedirectUrl: event.target.value || undefined }))} />
                </div>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <Checkbox checked={config.implantacaoIsenta} onChange={(event) => setConfig((atual) => ({ ...atual, implantacaoIsenta: event.target.checked, valorImplantacao: event.target.checked ? 0 : atual.valorImplantacao || planoAtivo.implantacao }))} />
                  Implantação gratuita
                </label>
                <div className="space-y-1 md:col-span-2">
                  <Label>Observações comerciais</Label>
                  <Textarea value={config.observacoes ?? ""} onChange={(event) => setConfig((atual) => ({ ...atual, observacoes: event.target.value || undefined }))} placeholder="Ex.: plano anual com implantação grátis e sem bloqueio operacional." />
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-5 w-5 text-[var(--g3-active)]" />
                  Recebimento compartilhado com InfinityPay
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Provider PIX</Label>
                  <Input value={config.pixProvider} onChange={(event) => setConfig((atual) => ({ ...atual, pixProvider: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Ambiente PIX</Label>
                  <Select value={config.pixAmbiente} onChange={(event) => setConfig((atual) => ({ ...atual, pixAmbiente: event.target.value as "sandbox" | "producao" }))}>
                    <option value="sandbox">Sandbox</option>
                    <option value="producao">Produção</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Chave PIX</Label>
                  <Input value={config.pixChave ?? ""} onChange={(event) => setConfig((atual) => ({ ...atual, pixChave: event.target.value || undefined }))} />
                </div>
                <div className="space-y-1">
                  <Label>Recebedor PIX</Label>
                  <Input value={config.pixRecebedor ?? ""} onChange={(event) => setConfig((atual) => ({ ...atual, pixRecebedor: event.target.value || undefined }))} />
                </div>
                <div className="space-y-1">
                  <Label>Cidade PIX</Label>
                  <Input value={config.pixCidade ?? ""} onChange={(event) => setConfig((atual) => ({ ...atual, pixCidade: event.target.value || undefined }))} />
                </div>
                <div className="space-y-1">
                  <Label>Webhook PIX</Label>
                  <Input value={config.pixWebhookUrl ?? ""} onChange={(event) => setConfig((atual) => ({ ...atual, pixWebhookUrl: event.target.value || undefined }))} />
                </div>
                <div className="space-y-1">
                  <Label>Provider cartão</Label>
                  <Input value={config.cartaoProvider} onChange={(event) => setConfig((atual) => ({ ...atual, cartaoProvider: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Ambiente cartão</Label>
                  <Select value={config.cartaoAmbiente} onChange={(event) => setConfig((atual) => ({ ...atual, cartaoAmbiente: event.target.value as "sandbox" | "producao" }))}>
                    <option value="sandbox">Sandbox</option>
                    <option value="producao">Produção</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Chave pública</Label>
                  <Input value={config.cartaoChavePublica ?? ""} onChange={(event) => setConfig((atual) => ({ ...atual, cartaoChavePublica: event.target.value || undefined }))} />
                </div>
                <div className="space-y-1">
                  <Label>Referência da chave privada</Label>
                  <Input value={config.cartaoChavePrivadaRef ?? ""} onChange={(event) => setConfig((atual) => ({ ...atual, cartaoChavePrivadaRef: event.target.value || undefined }))} />
                </div>
                <div className="space-y-1">
                  <Label>Provider boleto</Label>
                  <Input value={config.boletoProvider} onChange={(event) => setConfig((atual) => ({ ...atual, boletoProvider: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Ambiente boleto</Label>
                  <Select value={config.boletoAmbiente} onChange={(event) => setConfig((atual) => ({ ...atual, boletoAmbiente: event.target.value as "sandbox" | "producao" }))}>
                    <option value="sandbox">Sandbox</option>
                    <option value="producao">Produção</option>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Mensagem de cobrança</Label>
                  <Textarea value={config.mensagemCobranca ?? ""} onChange={(event) => setConfig((atual) => ({ ...atual, mensagemCobranca: event.target.value || undefined }))} />
                </div>
              </CardContent>
            </Card>
          </div>

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
                  <Checkbox checked={config.alertasEmailAtivos} onChange={(event) => setConfig((atual) => ({ ...atual, alertasEmailAtivos: event.target.checked }))} />
                  Ativar alertas de vencimento por e-mail
                </label>
                <div className="space-y-1">
                  <Label>E-mails para alerta</Label>
                  <Textarea
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
                    placeholder="financeiro@instituicao.org.br&#10;diretoria@instituicao.org.br"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Dias para alertar</Label>
                  <Input
                    value={config.diasAlertaEmail.join(", ")}
                    onChange={(event) =>
                      setConfig((atual) => ({
                        ...atual,
                        diasAlertaEmail: event.target.value
                          .split(",")
                          .map((item) => Number(item.trim()))
                          .filter((item) => Number.isInteger(item) && item >= 0)
                      }))
                    }
                    placeholder="30, 15, 7, 1"
                  />
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/40 p-3 text-sm">
                  <p className="font-medium">Próximo alerta</p>
                  <p className="text-[var(--g3-muted)]">
                    {resumo.proximoAlertaDias != null
                      ? `O próximo marco configurado é de ${resumo.proximoAlertaDias} dia(s) antes do vencimento.`
                      : "Nenhum alerta previsto com a configuração atual."}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] p-3 text-sm">
                  <p className="font-medium">Regra operacional</p>
                  <p className="text-[var(--g3-muted)]">
                    O sistema apenas envia alertas por e-mail. A licença vencida não bloqueia a operação do G3N.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumo comercial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-xl border border-[var(--g3-border)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Último checkout</p>
                  <p className="mt-1 font-semibold">{config.ultimoOrderNsu || "Nenhum checkout gerado"}</p>
                  {config.ultimoCheckoutUrl ? (
                    <a className="text-[var(--g3-active)] underline" href={config.ultimoCheckoutUrl} target="_blank" rel="noreferrer">
                      Abrir último checkout
                    </a>
                  ) : null}
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Último pagamento</p>
                  <p className="mt-1 font-semibold">
                    {config.ultimoCheckoutPago ? `Pago em ${moeda(config.ultimoValorPago)}` : "Aguardando pagamento"}
                  </p>
                  {config.ultimoReceiptUrl ? (
                    <a className="text-[var(--g3-active)] underline" href={config.ultimoReceiptUrl} target="_blank" rel="noreferrer">
                      Abrir comprovante
                    </a>
                  ) : null}
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Plano âncora</p>
                  <p className="mt-1 font-semibold">Profissional por {moeda(247)}/mês</p>
                  <p className="text-[var(--g3-muted)]">Posicionamento principal para a maioria das instituições.</p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Descontos</p>
                  <p className="mt-1">Semestral: 10% off</p>
                  <p>Anual: 20% off e implantação gratuita</p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--g3-muted)]">Frase de venda</p>
                  <p className="mt-1 text-[var(--g3-muted)]">
                    O G3N organiza toda a operação da instituição, reduz erros, melhora a prestação de contas e usa inteligência artificial para apoiar a decisão.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}
