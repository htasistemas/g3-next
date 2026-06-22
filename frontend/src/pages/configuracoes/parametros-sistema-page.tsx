import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Clock3,
  Eye,
  RefreshCcw,
  Save,
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
  type CarenciaDoacaoRealizadaSettings,
  type ObrigatoriedadeDocumentosBeneficiarioSettings
} from "@/services/parametros-sistema.service";
import type { ThemeSettings } from "@/types/theme";

const abas = [
  { id: "personalizacao", label: "Personalização", icon: SlidersHorizontal },
  { id: "carencia", label: "Carência", icon: Clock3 },
  { id: "obrigatoriedade", label: "Campos obrigatórios", icon: Eye },
  { id: "central-atendimentos", label: "Central de atendimentos", icon: BellRing }
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
  const [carregandoCarencia, setCarregandoCarencia] = useState(true);
  const [carregandoObrigatoriedade, setCarregandoObrigatoriedade] = useState(true);
  const [carregandoAlertasCentral, setCarregandoAlertasCentral] = useState(true);
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
      try {
        const [carencia, obrigatoriedade, alertasCentral] = await Promise.all([
          parametrosSistemaService.obterCarenciaDoacoesRealizadas(),
          parametrosSistemaService.obterObrigatoriedadeDocumentosBeneficiario(),
          parametrosSistemaService.obterAlertasCentralAtendimentos()
        ]);
        if (!ativo) return;
        setCarenciaDraft(carencia);
        setCarenciaSalva(carencia);
        setObrigatoriedadeDraft(obrigatoriedade);
        setObrigatoriedadeSalva(obrigatoriedade);
        setAlertasCentralDraft(alertasCentral);
        setAlertasCentralSalvos(alertasCentral);
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
  const houveMudanca =
    abaAtiva === "carencia"
      ? houveMudancaCarencia
      : abaAtiva === "obrigatoriedade"
        ? houveMudancaObrigatoriedade
        : abaAtiva === "central-atendimentos"
          ? houveMudancaAlertasCentral
          : houveMudancaPersonalizacao;
  const carregando =
    carregandoTema || carregandoCarencia || carregandoObrigatoriedade || carregandoAlertasCentral;

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
