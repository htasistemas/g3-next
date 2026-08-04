import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Clock3,
  Eye,
  PlugZap,
  RefreshCcw,
  Save,
  Settings2,
  SlidersHorizontal,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { defaultThemeSettings, themePresets } from "@/lib/theme-presets";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario
} from "@/lib/tela-padrao-beneficiario";
import {
  alertasCentralAtendimentosPadrao,
  documentosObrigatoriedadeBeneficiarioPadrao,
  parametrosSistemaService,
  type AlertasCentralAtendimentosSettings,
  type BeneficiarioConfiguracaoCadastroSettings,
  type CarenciaDoacaoRealizadaSettings,
  type IntegracaoApiSettings,
  type ObrigatoriedadeDocumentosBeneficiarioSettings
} from "@/services/parametros-sistema.service";
import type { ThemeSettings } from "@/types/theme";

const abas = [
  { id: "personalizacao", label: "Personalização", icon: SlidersHorizontal },
  { id: "carencia", label: "Carência", icon: Clock3 },
  { id: "obrigatoriedade", label: "Campos obrigatórios", icon: Eye },
  { id: "central-atendimentos", label: "Central de atendimentos", icon: BellRing },
  { id: "beneficiarios-cadastro", label: "Cadastro de beneficiários", icon: Settings2 },
  { id: "integracoes", label: "Integrações e APIs", icon: PlugZap }
] as const;

type AbaId = (typeof abas)[number]["id"];

const camposCor = [
  { key: "corPrimaria", label: "Cor principal" },
  { key: "corSecundaria", label: "Cor secundária" },
  { key: "corDestaque", label: "Cor de destaque" },
  { key: "corBotaoPrimario", label: "Cor de botões primários" },
  { key: "corLink", label: "Cor de links" },
  { key: "corElementoAtivo", label: "Cor de elementos ativos" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Foreground/texto" },
  { key: "border", label: "Borda" },
  { key: "muted", label: "Muted" },
  { key: "card", label: "Card" },
  { key: "dashboardCard", label: "Card da visão geral" },
  { key: "dashboardCardSoft", label: "Card suave da visão geral" },
  { key: "danger", label: "Cor de erro" },
  { key: "warning", label: "Cor de aviso" },
  { key: "success", label: "Cor de sucesso" },
  { key: "info", label: "Cor de informação" }
] as const;

const carenciaPadrao: CarenciaDoacaoRealizadaSettings = {
  tempoCarenciaDias: 0
};

const obrigatoriedadePadrao: ObrigatoriedadeDocumentosBeneficiarioSettings = {
  documentos: documentosObrigatoriedadeBeneficiarioPadrao
};

const configuracaoCadastroPadrao: BeneficiarioConfiguracaoCadastroSettings = {
  prazo_revisao_dias: 365,
  permitir_sem_cpf: true,
  permitir_sem_data_nascimento_completa: false,
  permitir_sem_documento: true,
  exigir_responsavel_menor: true,
  exigir_familia: false,
  ativar_analise_duplicidade: true,
  sensibilidade_duplicidade: "MEDIA",
  bloquear_cpf_duplicado: true,
  ativar_alertas: true,
  campos_obrigatorios_rapido: ["nome_completo", "consentimento_minimo"],
  campos_obrigatorios_completo: [],
  pesos_completude: {
    identificacao: 20,
    contatos: 10,
    endereco: 15,
    familia: 15,
    socioeconomico: 15,
    documentos: 10,
    consentimentos: 10,
    programas: 5
  },
  documentos_obrigatorios: [],
  consentimentos_obrigatorios: ["TRATAMENTO_DADOS"],
  validade_documentos_dias: null,
  validade_consentimentos_dias: null
};

export function ParametrosSistemaPage() {
  const { usuario } = useAuth();
  const { settings, applyPreview, clearPreview, saveSettings, carregando: carregandoTema } = useTheme();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("personalizacao");
  const [draft, setDraft] = useState<ThemeSettings>(settings);
  const [carenciaDraft, setCarenciaDraft] = useState<CarenciaDoacaoRealizadaSettings>(carenciaPadrao);
  const [carenciaSalva, setCarenciaSalva] = useState<CarenciaDoacaoRealizadaSettings>(carenciaPadrao);
  const [obrigatoriedadeDraft, setObrigatoriedadeDraft] =
    useState<ObrigatoriedadeDocumentosBeneficiarioSettings>(obrigatoriedadePadrao);
  const [obrigatoriedadeSalva, setObrigatoriedadeSalva] =
    useState<ObrigatoriedadeDocumentosBeneficiarioSettings>(obrigatoriedadePadrao);
  const [alertasCentralDraft, setAlertasCentralDraft] =
    useState<AlertasCentralAtendimentosSettings>(alertasCentralAtendimentosPadrao);
  const [alertasCentralSalvos, setAlertasCentralSalvos] =
    useState<AlertasCentralAtendimentosSettings>(alertasCentralAtendimentosPadrao);
  const [configuracaoCadastroDraft, setConfiguracaoCadastroDraft] =
    useState<BeneficiarioConfiguracaoCadastroSettings>(configuracaoCadastroPadrao);
  const [configuracaoCadastroSalva, setConfiguracaoCadastroSalva] =
    useState<BeneficiarioConfiguracaoCadastroSettings>(configuracaoCadastroPadrao);
  const [integracoes, setIntegracoes] = useState<IntegracaoApiSettings[]>([]);
  const [integracaoAtiva, setIntegracaoAtiva] = useState("CONSULTA_CEP");
  const [carregandoCarencia, setCarregandoCarencia] = useState(true);
  const [carregandoObrigatoriedade, setCarregandoObrigatoriedade] = useState(true);
  const [carregandoAlertasCentral, setCarregandoAlertasCentral] = useState(true);
  const [carregandoConfiguracaoCadastro, setCarregandoConfiguracaoCadastro] = useState(true);
  const [carregandoIntegracoes, setCarregandoIntegracoes] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    let ativo = true;

    void (async () => {
      setMensagem(null);
      setCarregandoCarencia(true);
      setCarregandoObrigatoriedade(true);
      setCarregandoAlertasCentral(true);
      setCarregandoConfiguracaoCadastro(true);
      setCarregandoIntegracoes(true);
      try {
        const [carencia, obrigatoriedade, alertasCentral, configuracaoCadastro, integracoesData] = await Promise.all([
          parametrosSistemaService.obterCarenciaDoacoesRealizadas(),
          parametrosSistemaService.obterObrigatoriedadeDocumentosBeneficiario(),
          parametrosSistemaService.obterAlertasCentralAtendimentos(),
          parametrosSistemaService.obterConfiguracaoCadastroBeneficiario(),
          parametrosSistemaService.listarIntegracoes()
        ]);
        if (!ativo) return;
        setCarenciaDraft(carencia);
        setCarenciaSalva(carencia);
        setObrigatoriedadeDraft(obrigatoriedade);
        setObrigatoriedadeSalva(obrigatoriedade);
        setAlertasCentralDraft(alertasCentral);
        setAlertasCentralSalvos(alertasCentral);
        setConfiguracaoCadastroDraft(configuracaoCadastro);
        setConfiguracaoCadastroSalva(configuracaoCadastro);
        setIntegracoes(integracoesData.integracoes);
        setIntegracaoAtiva(integracoesData.integracoes[0]?.tipo ?? "CONSULTA_CEP");
      } catch (error: any) {
        if (!ativo) return;
        setMensagem({
          tipo: "erro",
          texto: error?.response?.data?.message ?? "Não foi possível carregar os parâmetros do sistema."
        });
      } finally {
        if (ativo) {
          setCarregandoCarencia(false);
          setCarregandoObrigatoriedade(false);
          setCarregandoAlertasCentral(false);
          setCarregandoConfiguracaoCadastro(false);
          setCarregandoIntegracoes(false);
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [tenantId]);

  const abaAtual = abas.find((aba) => aba.id === abaAtiva);
  const IconeAbaAtual = abaAtual?.icon ?? SlidersHorizontal;
  const houveMudancaPersonalizacao = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings]
  );
  const houveMudancaCarencia = useMemo(
    () => JSON.stringify(carenciaDraft) !== JSON.stringify(carenciaSalva),
    [carenciaDraft, carenciaSalva]
  );
  const houveMudancaObrigatoriedade = useMemo(
    () => JSON.stringify(obrigatoriedadeDraft) !== JSON.stringify(obrigatoriedadeSalva),
    [obrigatoriedadeDraft, obrigatoriedadeSalva]
  );
  const houveMudancaAlertasCentral = useMemo(
    () => JSON.stringify(alertasCentralDraft) !== JSON.stringify(alertasCentralSalvos),
    [alertasCentralDraft, alertasCentralSalvos]
  );
  const houveMudancaConfiguracaoCadastro = useMemo(
    () => JSON.stringify(configuracaoCadastroDraft) !== JSON.stringify(configuracaoCadastroSalva),
    [configuracaoCadastroDraft, configuracaoCadastroSalva]
  );
  const integracaoSelecionada = integracoes.find((item) => item.tipo === integracaoAtiva);
  const houveMudanca =
    abaAtiva === "carencia"
      ? houveMudancaCarencia
      : abaAtiva === "obrigatoriedade"
        ? houveMudancaObrigatoriedade
        : abaAtiva === "central-atendimentos"
          ? houveMudancaAlertasCentral
          : abaAtiva === "beneficiarios-cadastro"
            ? houveMudancaConfiguracaoCadastro
            : abaAtiva === "integracoes"
              ? true
              : houveMudancaPersonalizacao;
  const carregando =
    carregandoTema ||
    carregandoCarencia ||
    carregandoObrigatoriedade ||
    carregandoAlertasCentral ||
    carregandoConfiguracaoCadastro ||
    carregandoIntegracoes;

  function atualizarModo(modo: ThemeSettings["modo"]) {
    setDraft((estadoAtual) => ({ ...estadoAtual, modo }));
  }

  function atualizarCor(campo: (typeof camposCor)[number]["key"], valor: string) {
    setDraft((estadoAtual) => ({
      ...estadoAtual,
      paleta: {
        ...estadoAtual.paleta,
        [campo]: valor
      }
    }));
  }

  function aplicarPreset(presetId: string) {
    const preset = themePresets.find((item) => item.id === presetId);
    if (!preset) return;
    setDraft(preset.settings);
    applyPreview(preset.settings);
  }

  function onVisualizar() {
    if (abaAtiva !== "personalizacao") return;
    applyPreview(draft);
  }

  function onCancelar() {
    setMensagem(null);

    if (abaAtiva === "carencia") {
      setCarenciaDraft(carenciaSalva);
      return;
    }

    if (abaAtiva === "obrigatoriedade") {
      setObrigatoriedadeDraft(obrigatoriedadeSalva);
      return;
    }

    if (abaAtiva === "central-atendimentos") {
      setAlertasCentralDraft(alertasCentralSalvos);
      return;
    }

    if (abaAtiva === "beneficiarios-cadastro") {
      setConfiguracaoCadastroDraft(configuracaoCadastroSalva);
      return;
    }

    clearPreview();
    setDraft(settings);
  }

  async function onSalvar() {
    setSalvando(true);
    setMensagem(null);
    try {
      if (abaAtiva === "carencia") {
        const salvo = await parametrosSistemaService.salvarCarenciaDoacoesRealizadas(carenciaDraft);
        setCarenciaDraft(salvo);
        setCarenciaSalva(salvo);
        setMensagem({ tipo: "sucesso", texto: "Carência salva com sucesso." });
      } else if (abaAtiva === "obrigatoriedade") {
        const salvo = await parametrosSistemaService.salvarObrigatoriedadeDocumentosBeneficiario(
          obrigatoriedadeDraft
        );
        setObrigatoriedadeDraft(salvo);
        setObrigatoriedadeSalva(salvo);
        setMensagem({ tipo: "sucesso", texto: "Campos obrigatórios salvos com sucesso." });
      } else if (abaAtiva === "central-atendimentos") {
        const salvo = await parametrosSistemaService.salvarAlertasCentralAtendimentos(
          alertasCentralDraft
        );
        setAlertasCentralDraft(salvo);
        setAlertasCentralSalvos(salvo);
        setMensagem({ tipo: "sucesso", texto: "Parâmetros da Central de atendimentos salvos com sucesso." });
      } else if (abaAtiva === "beneficiarios-cadastro") {
        const salvo = await parametrosSistemaService.salvarConfiguracaoCadastroBeneficiario(
          configuracaoCadastroDraft
        );
        setConfiguracaoCadastroDraft(salvo);
        setConfiguracaoCadastroSalva(salvo);
        setMensagem({ tipo: "sucesso", texto: "Configurações do cadastro de beneficiários salvas com sucesso." });
      } else if (abaAtiva === "integracoes" && integracaoSelecionada) {
        const salvo = await parametrosSistemaService.salvarIntegracao(integracaoSelecionada);
        setIntegracoes(salvo.integracoes);
        setMensagem({ tipo: "sucesso", texto: "Integração salva com sucesso." });
      } else {
        await saveSettings(draft);
        setMensagem({ tipo: "sucesso", texto: "Personalização salva com sucesso." });
      }
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto:
          error?.response?.data?.message ??
          (abaAtiva === "carencia"
            ? "Não foi possível salvar a carência."
            : abaAtiva === "obrigatoriedade"
              ? "Não foi possível salvar os campos obrigatórios."
              : abaAtiva === "central-atendimentos"
                ? "Não foi possível salvar os parâmetros da Central de atendimentos."
                : "Não foi possível salvar a personalização.")
      });
    } finally {
      setSalvando(false);
    }
  }

  function onRestaurarPadrao() {
    if (abaAtiva === "carencia") {
      setCarenciaDraft(carenciaPadrao);
      return;
    }

    if (abaAtiva === "obrigatoriedade") {
      setObrigatoriedadeDraft(obrigatoriedadePadrao);
      return;
    }

    if (abaAtiva === "central-atendimentos") {
      setAlertasCentralDraft(alertasCentralAtendimentosPadrao);
      return;
    }

    if (abaAtiva === "beneficiarios-cadastro") {
      setConfiguracaoCadastroDraft(configuracaoCadastroPadrao);
      return;
    }

    setDraft(defaultThemeSettings);
    applyPreview(defaultThemeSettings);
  }

  function alternarObrigatoriedadeDocumento(documentoId: string, obrigatorio: boolean) {
    setObrigatoriedadeDraft((estadoAtual) => ({
      documentos: estadoAtual.documentos.map((documento) =>
        documento.id === documentoId ? { ...documento, obrigatorio } : documento
      )
    }));
  }

  function atualizarAlertaCentral<K extends keyof AlertasCentralAtendimentosSettings>(
    campo: K,
    valor: AlertasCentralAtendimentosSettings[K]
  ) {
    setAlertasCentralDraft((estadoAtual) => ({ ...estadoAtual, [campo]: valor }));
  }

  function atualizarConfiguracaoCadastro<K extends keyof BeneficiarioConfiguracaoCadastroSettings>(
    campo: K,
    valor: BeneficiarioConfiguracaoCadastroSettings[K]
  ) {
    setConfiguracaoCadastroDraft((estadoAtual) => ({ ...estadoAtual, [campo]: valor }));
  }

  function atualizarPesoCompletude(grupo: string, valor: number) {
    setConfiguracaoCadastroDraft((estadoAtual) => ({
      ...estadoAtual,
      pesos_completude: {
        ...estadoAtual.pesos_completude,
        [grupo]: Math.max(0, valor)
      }
    }));
  }

  function atualizarIntegracao(campo: keyof IntegracaoApiSettings, valor: string | number | boolean | undefined) {
    setIntegracoes((estadoAtual) =>
      estadoAtual.map((item) =>
        item.tipo === integracaoAtiva ? { ...item, [campo]: valor } : item
      )
    );
  }

  async function testarIntegracaoAtual() {
    if (!integracaoAtiva) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const resultado = await parametrosSistemaService.testarIntegracao(integracaoAtiva);
      setMensagem({ tipo: resultado.ok ? "sucesso" : "erro", texto: resultado.mensagem });
      const dados = await parametrosSistemaService.listarIntegracoes();
      setIntegracoes(dados.integracoes);
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível testar a integração."
      });
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <main className="g3-container">
        <p className="text-sm text-slate-600">Carregando parâmetros do sistema...</p>
      </main>
    );
  }

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <section className={classesTelaPadraoBeneficiario.barraAcoes} data-print="toolbar">
        <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={classesTelaPadraoBeneficiario.botaoAcao}
            onClick={onVisualizar}
            disabled={abaAtiva !== "personalizacao" || salvando}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Visualizar alterações
          </Button>
          <Button
            type="button"
            size="sm"
            className={classesTelaPadraoBeneficiario.botaoAcao}
            onClick={() => void onSalvar()}
            disabled={salvando || !houveMudanca}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={classesTelaPadraoBeneficiario.botaoAcao}
            onClick={onCancelar}
            disabled={salvando}
          >
            <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={classesTelaPadraoBeneficiario.botaoAcao}
            onClick={onRestaurarPadrao}
            disabled={salvando}
          >
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Restaurar padrão
          </Button>
        </div>
      </section>

      <div className={classesTelaPadraoBeneficiario.gradePrincipal} data-print="layout-grid">
        <Card className={classesTelaPadraoBeneficiario.cardAbas} data-print="tabs">
          <CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>
            {abas.map((aba, indice) => (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaAtiva(aba.id)}
                className={classeBotaoAbaLateral(abaAtiva === aba.id)}
              >
                <span className={classeNumeroAbaLateral(abaAtiva === aba.id)} aria-hidden="true">
                  {indice + 1}
                </span>
                <span>{aba.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
          <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
            <div className={classesTelaPadraoBeneficiario.tituloAba}>
              <IconeAbaAtual className="h-4 w-4" aria-hidden="true" />
              <CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>
                {abaAtual?.label ?? "Configurações do sistema"}
              </CardTitle>
            </div>
            <Badge variant="default">Configurações gerais</Badge>
          </CardHeader>

          <CardContent>
            {abaAtiva === "personalizacao" ? (
              <section className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="preset">Preset</Label>
                    <Select
                      id="preset"
                      value={draft.preset ?? ""}
                      onChange={(event) => aplicarPreset(event.target.value)}
                    >
                      {themePresets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.nome}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="modo">Tema</Label>
                    <Select
                      id="modo"
                      value={draft.modo}
                      onChange={(event) => atualizarModo(event.target.value as ThemeSettings["modo"])}
                    >
                      <option value="claro">Claro</option>
                      <option value="escuro">Escuro</option>
                      <option value="automatico">Automático</option>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {camposCor.map((campo) => (
                    <div key={campo.key} className="space-y-1.5 rounded-lg border border-slate-200 p-3">
                      <Label className="text-xs">{campo.label}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          className="h-9 w-14 p-1"
                          value={draft.paleta[campo.key]}
                          onChange={(event) => atualizarCor(campo.key, event.target.value)}
                        />
                        <Input
                          value={draft.paleta[campo.key]}
                          onChange={(event) => atualizarCor(campo.key, event.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Os cards da visão geral usam os campos específicos acima e continuam com a base global de tema.
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-900">Preview</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2 rounded-lg border p-3">
                      <p className="text-sm font-semibold">Componentes</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm">Botão primário</Button>
                        <Button size="sm" variant="outline">
                          Botão outline
                        </Button>
                        <Button size="sm" variant="danger">
                          Danger
                        </Button>
                      </div>
                      <Input placeholder="Campo com foco e borda" />
                    </div>
                    <div className="space-y-2 rounded-lg border p-3">
                      <p className="text-sm font-semibold">Estados</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="success">Sucesso</Badge>
                        <Badge variant="warning">Aviso</Badge>
                        <Badge variant="danger">Erro</Badge>
                        <Badge variant="info">Informação</Badge>
                      </div>
                      <span className="text-sm underline underline-offset-2 text-[var(--g3-link)]">
                        Link de exemplo
                      </span>
                    </div>
                    <div
                      className="space-y-2 rounded-lg border p-3 md:col-span-2"
                      style={{
                        borderColor: draft.paleta.border,
                        backgroundImage: `linear-gradient(180deg, ${draft.paleta.dashboardCard} 0%, ${draft.paleta.dashboardCardSoft} 100%)`
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: draft.paleta.foreground }}>
                        Visão geral
                      </p>
                      <p className="text-xs" style={{ color: draft.paleta.muted }}>
                        Exemplo de card de resumo com a paleta atual.
                      </p>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: draft.paleta.muted }}>
                            Beneficiários no período
                          </p>
                          <p className="mt-1 text-2xl font-semibold" style={{ color: draft.paleta.corPrimaria }}>
                            128
                          </p>
                        </div>
                        <span
                          className="rounded-md px-2 py-2"
                          style={{
                            backgroundColor: draft.paleta.corPrimaria,
                            color: draft.paleta.dashboardCard
                          }}
                        >
                          VG
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : abaAtiva === "carencia" ? (
              <section className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                    <Label htmlFor="tempoCarenciaDias">Tempo de carência para doação realizada</Label>
                    <Input
                      id="tempoCarenciaDias"
                      type="number"
                      min={0}
                      step={1}
                      value={carenciaDraft.tempoCarenciaDias}
                      onChange={(event) =>
                        setCarenciaDraft({
                          tempoCarenciaDias: Math.max(0, Number(event.target.value) || 0)
                        })
                      }
                    />
                    <p className="text-xs text-slate-500">
                      Informe a quantidade de dias por item e destinatário. Use 0 para desativar a carência.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Como funciona</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p>
                        O sistema verifica a última entrega do mesmo item para o mesmo beneficiário ou família.
                      </p>
                      <p>
                        Se a nova entrega estiver dentro do prazo configurado, será exigida a senha de um administrador logado.
                      </p>
                      <p>As liberações fora da carência ficam registradas no histórico da doação.</p>
                    </div>
                  </div>
                </div>
              </section>
            ) : abaAtiva === "obrigatoriedade" ? (
              <section className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Campos obrigatórios</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Esta área foi estruturada em lista para crescer com novas telas no futuro. Hoje ela controla os documentos obrigatórios do cadastro de beneficiários.
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">Cadastro de beneficiários</p>
                    <p className="text-xs text-slate-500">
                      Marque os itens que devem ficar obrigatórios na aba Documentos.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {obrigatoriedadeDraft.documentos.map((documento) => (
                      <label
                        key={documento.id}
                        className={`flex items-start gap-3 px-4 py-3 transition ${
                          documento.obrigatorio ? "bg-emerald-50/70" : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <Checkbox
                          checked={documento.obrigatorio}
                          onChange={(event) =>
                            alternarObrigatoriedadeDocumento(documento.id, event.target.checked)
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">{documento.nome}</p>
                          <p className="text-xs text-slate-500">
                            {documento.obrigatorio
                              ? "Obrigatório no cadastro de beneficiários."
                              : "Opcional no cadastro de beneficiários."}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </section>
            ) : abaAtiva === "beneficiarios-cadastro" ? (
              <section className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Configurações do cadastro de beneficiários</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Parâmetros aplicados por instituição para revisão, duplicidade, obrigatoriedade e completude cadastral.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="space-y-1">
                      <Label>Prazo de revisão cadastral em dias</Label>
                      <Input
                        type="number"
                        min={1}
                        value={configuracaoCadastroDraft.prazo_revisao_dias}
                        onChange={(event) =>
                          atualizarConfiguracaoCadastro("prazo_revisao_dias", Math.max(1, Number(event.target.value) || 1))
                        }
                      />
                    </div>
                    {[
                      ["permitir_sem_cpf", "Permitir cadastro sem CPF"],
                      ["permitir_sem_documento", "Permitir pessoa sem documento"],
                      ["exigir_responsavel_menor", "Exigir responsável para menores"],
                      ["exigir_familia", "Exigir família"],
                      ["ativar_analise_duplicidade", "Ativar análise de duplicidade"],
                      ["bloquear_cpf_duplicado", "Bloquear CPF duplicado"],
                      ["ativar_alertas", "Ativar alertas cadastrais"]
                    ].map(([campo, label]) => (
                      <label key={campo} className="flex items-center gap-2 text-sm text-slate-700">
                        <Checkbox
                          checked={Boolean(configuracaoCadastroDraft[campo as keyof BeneficiarioConfiguracaoCadastroSettings])}
                          onChange={(event) =>
                            atualizarConfiguracaoCadastro(
                              campo as keyof BeneficiarioConfiguracaoCadastroSettings,
                              event.target.checked as never
                            )
                          }
                        />
                        {label}
                      </label>
                    ))}
                    <div className="space-y-1">
                      <Label>Sensibilidade da duplicidade</Label>
                      <Select
                        value={configuracaoCadastroDraft.sensibilidade_duplicidade}
                        onChange={(event) => atualizarConfiguracaoCadastro("sensibilidade_duplicidade", event.target.value)}
                      >
                        <option value="BAIXA">Baixa</option>
                        <option value="MEDIA">Média</option>
                        <option value="ALTA">Alta</option>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Pesos da completude</p>
                    {Object.entries(configuracaoCadastroDraft.pesos_completude).map(([grupo, valor]) => (
                      <div key={grupo} className="grid grid-cols-[1fr_90px] items-center gap-3">
                        <Label className="capitalize">{grupo}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={valor}
                          onChange={(event) => atualizarPesoCompletude(grupo, Number(event.target.value) || 0)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : abaAtiva === "integracoes" ? (
              <section className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Integrações e APIs</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Estrutura preparada para provedores futuros. Segredos são enviados separados e retornam apenas mascarados.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                    {integracoes.map((item) => (
                      <button
                        key={item.tipo}
                        type="button"
                        className={classeBotaoAbaLateral(integracaoAtiva === item.tipo)}
                        onClick={() => setIntegracaoAtiva(item.tipo)}
                      >
                        <span className="min-w-0">{item.tipo.replaceAll("_", " ").toLowerCase()}</span>
                      </button>
                    ))}
                  </div>
                  {integracaoSelecionada ? (
                    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                        <Checkbox
                          checked={integracaoSelecionada.ativo}
                          onChange={(event) => atualizarIntegracao("ativo", event.target.checked)}
                        />
                        Integração ativa
                      </label>
                      <div>
                        <Label>Fornecedor</Label>
                        <Input value={integracaoSelecionada.fornecedor ?? ""} onChange={(event) => atualizarIntegracao("fornecedor", event.target.value)} />
                      </div>
                      <div>
                        <Label>Ambiente</Label>
                        <Select value={integracaoSelecionada.ambiente} onChange={(event) => atualizarIntegracao("ambiente", event.target.value)}>
                          <option value="HOMOLOGACAO">Homologação</option>
                          <option value="PRODUCAO">Produção</option>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>URL base</Label>
                        <Input value={integracaoSelecionada.url_base ?? ""} onChange={(event) => atualizarIntegracao("url_base", event.target.value)} />
                      </div>
                      <div>
                        <Label>Timeout</Label>
                        <Input type="number" value={integracaoSelecionada.timeout_ms} onChange={(event) => atualizarIntegracao("timeout_ms", Number(event.target.value) || 5000)} />
                      </div>
                      <div>
                        <Label>Tentativas</Label>
                        <Input type="number" value={integracaoSelecionada.tentativas} onChange={(event) => atualizarIntegracao("tentativas", Number(event.target.value) || 1)} />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Credencial</Label>
                        <Input
                          type="password"
                          placeholder={integracaoSelecionada.credencial_mascarada ? `Chave configurada: ${integracaoSelecionada.credencial_mascarada}` : "Informe para configurar ou rotacionar"}
                          onChange={(event) => atualizarIntegracao("credencial", event.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Observação</Label>
                        <Input value={integracaoSelecionada.observacao ?? ""} onChange={(event) => atualizarIntegracao("observacao", event.target.value)} />
                      </div>
                      <div className="flex flex-wrap gap-2 md:col-span-2">
                        <Button type="button" variant="outline" onClick={() => void testarIntegracaoAtual()} disabled={salvando}>
                          Testar conexão
                        </Button>
                        <Badge variant={integracaoSelecionada.ultimo_erro ? "danger" : "info"}>
                          {integracaoSelecionada.ultimo_erro || integracaoSelecionada.ultimo_sucesso_em || "Sem teste registrado"}
                        </Badge>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : (
              <section className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Central de atendimentos</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Configure a sensibilidade dos alertas automáticos e os limites usados na visão 360º do beneficiário.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="space-y-2">
                      <Label htmlFor="diasSemAtendimentoRecente">Dias sem atendimento recente</Label>
                      <Input
                        id="diasSemAtendimentoRecente"
                        type="number"
                        min={1}
                        step={1}
                        value={alertasCentralDraft.diasSemAtendimentoRecente}
                        onChange={(event) =>
                          atualizarAlertaCentral(
                            "diasSemAtendimentoRecente",
                            Math.max(1, Number(event.target.value) || 1)
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valorCustoElevadoMes">Valor de custo elevado no mês</Label>
                      <Input
                        id="valorCustoElevadoMes"
                        type="number"
                        min={0}
                        step={0.01}
                        value={alertasCentralDraft.valorCustoElevadoMes}
                        onChange={(event) =>
                          atualizarAlertaCentral(
                            "valorCustoElevadoMes",
                            Math.max(0, Number(event.target.value) || 0)
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">Alertas ativos</p>
                      <p className="text-xs text-slate-500">
                        Marque as validações que devem aparecer automaticamente na Central.
                      </p>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {[
                        ["alertarCestaMesmoMes", "Beneficiário já recebeu cesta básica no mês"],
                        ["alertarFamiliaCestaMes", "Família já recebeu cesta básica no mês"],
                        ["alertarCadastroIncompleto", "Cadastro incompleto"],
                        ["alertarEncaminhamentoEmAberto", "Encaminhamento em aberto"],
                        ["alertarInscricaoAtiva", "Inscrição ativa em curso, oficina ou atividade"]
                      ].map(([campo, label]) => (
                        <label
                          key={campo}
                          className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50"
                        >
                          <Checkbox
                            checked={Boolean(
                              alertasCentralDraft[
                                campo as keyof AlertasCentralAtendimentosSettings
                              ]
                            )}
                            onChange={(event) =>
                              atualizarAlertaCentral(
                                campo as keyof AlertasCentralAtendimentosSettings,
                                event.target.checked as never
                              )
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">{label}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </CardContent>
        </Card>
      </div>

      {mensagem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setMensagem(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3
                className={`text-base font-semibold ${
                  mensagem.tipo === "sucesso" ? "text-emerald-800" : "text-red-700"
                }`}
              >
                {mensagem.tipo === "sucesso" ? "Confirmação" : "Atenção"}
              </h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700">{mensagem.texto}</p>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <Button type="button" onClick={() => setMensagem(null)}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
