import { useEffect, useMemo, useState } from "react";
import { Clock3, Eye, RefreshCcw, Save, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { defaultThemeSettings, themePresets } from "@/lib/theme-presets";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario
} from "@/lib/tela-padrao-beneficiario";
import {
  parametrosSistemaService,
  type CarenciaDoacaoRealizadaSettings
} from "@/services/parametros-sistema.service";
import type { ThemeSettings } from "@/types/theme";

const abas = [
  { id: "personalizacao", label: "Personalização", icon: SlidersHorizontal },
  { id: "carencia", label: "Carência", icon: Clock3 }
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

export function ParametrosSistemaPage() {
  const { settings, applyPreview, clearPreview, saveSettings, carregando: carregandoTema } = useTheme();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("personalizacao");
  const [draft, setDraft] = useState<ThemeSettings>(settings);
  const [carenciaDraft, setCarenciaDraft] =
    useState<CarenciaDoacaoRealizadaSettings>(carenciaPadrao);
  const [carenciaSalva, setCarenciaSalva] =
    useState<CarenciaDoacaoRealizadaSettings>(carenciaPadrao);
  const [carregandoCarencia, setCarregandoCarencia] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(
    null
  );

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    let ativo = true;

    void (async () => {
      setCarregandoCarencia(true);
      try {
        const carencia = await parametrosSistemaService.obterCarenciaDoacoesRealizadas();
        if (!ativo) return;
        setCarenciaDraft(carencia);
        setCarenciaSalva(carencia);
      } catch (error: any) {
        if (!ativo) return;
        setMensagem({
          tipo: "erro",
          texto: error?.response?.data?.message ?? "Não foi possível carregar a carência."
        });
      } finally {
        if (ativo) {
          setCarregandoCarencia(false);
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

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
  const houveMudanca = abaAtiva === "carencia" ? houveMudancaCarencia : houveMudancaPersonalizacao;
  const carregando = carregandoTema || carregandoCarencia;

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

    setDraft(defaultThemeSettings);
    applyPreview(defaultThemeSettings);
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
                {abaAtual?.label ?? "Parâmetros do sistema"}
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
            ) : (
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
                      <p>
                        As liberações fora da carência ficam registradas no histórico da doação.
                      </p>
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
