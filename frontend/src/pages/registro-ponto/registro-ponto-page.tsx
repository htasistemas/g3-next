
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  Search,
  Plus,
  Save,
  Undo2,
  Trash2,
  Printer,
  X,
  Fingerprint,
  CalendarDays,
  History,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario
} from "@/lib/tela-padrao-beneficiario";
import {
  filtroRegistroPontoPadrao,
  registroPontoAjusteSchema,
  type RegistroPontoAjusteFormInput,
  type RegistroPontoAjusteFormValues
} from "@/features/registro-ponto/registro-ponto.schema";
import {
  useAdicionarOcorrenciaPonto,
  useAjustarRegistroPonto,
  useCatalogoUsuariosRegistroPonto,
  useEspelhoPonto,
  useHistoricoRegistroPonto,
  useMarcarPonto,
  useRegistrosPonto
} from "@/features/registro-ponto/use-registro-ponto";
import type {
  RegistroPontoFiltro,
  RegistroPontoItem,
  RegistroPontoOcorrenciaTipo,
  RegistroPontoStatus
} from "@/types/registro-ponto";

const abas = [
  { id: "listagem", label: "Listagem", icon: Search },
  { id: "marcacao", label: "Marcação", icon: Fingerprint },
  { id: "espelho", label: "Espelho de ponto", icon: CalendarDays },
  { id: "ocorrencias", label: "Ocorrências", icon: AlertCircle },
  { id: "historico", label: "Histórico", icon: History },
  { id: "ajuste", label: "Ajuste administrativo", icon: ShieldCheck }
] as const;

const tiposOcorrenciaOptions: RegistroPontoOcorrenciaTipo[] = [
  "AJUSTE_MANUAL",
  "ATRASO",
  "FALTA",
  "HORA_EXTRA",
  "BANCO_HORAS",
  "ESQUECIMENTO_BATIDA",
  "INCONSISTENCIA_SEQUENCIA",
  "CORRECAO_ADMINISTRATIVA",
  "OBSERVACAO_OPERACIONAL"
];

const tituloTela = "Registro de ponto";

function formatarData(valor?: string) {
  if (!valor) return "---";
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(valor?: string) {
  if (!valor) return "---";
  const parsed = new Date(valor);
  if (Number.isNaN(parsed.getTime())) return valor;
  return parsed.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function formatarHora(valor?: string) {
  if (!valor) return "--:--";
  return valor.slice(0, 5);
}

function formatarMinutos(totalMinutos?: number) {
  const valor = Number(totalMinutos ?? 0);
  const sinal = valor < 0 ? "-" : "";
  const absoluto = Math.abs(valor);
  const horas = Math.floor(absoluto / 60);
  const minutos = absoluto % 60;
  return `${sinal}${horas}h ${String(minutos).padStart(2, "0")}m`;
}

function badgeStatusClasse(status: RegistroPontoStatus) {
  if (status === "COMPLETO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

async function capturarLocalizacaoAtual() {
  if (!("geolocation" in navigator)) {
    return undefined;
  }

  return new Promise<{ latitude: number; longitude: number; accuracy_metros: number } | undefined>((resolve) => {
    const timeout = window.setTimeout(() => resolve(undefined), 4500);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeout);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy_metros: position.coords.accuracy
        });
      },
      () => {
        window.clearTimeout(timeout);
        resolve(undefined);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 4000
      }
    );
  });
}

export function RegistroPontoPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const isAdmin = (usuario?.permissoes ?? []).includes("ADMINISTRADOR");

  const [abaAtiva, setAbaAtiva] = useState<(typeof abas)[number]["id"]>("listagem");
  const [filtroDraft, setFiltroDraft] = useState<RegistroPontoFiltro>({ ...filtroRegistroPontoPadrao });
  const [filtros, setFiltros] = useState<RegistroPontoFiltro>({ ...filtroRegistroPontoPadrao });
  const [termoUsuario, setTermoUsuario] = useState("");
  const [registroSelecionadoId, setRegistroSelecionadoId] = useState<string | undefined>();
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [popupMarcarAberto, setPopupMarcarAberto] = useState(false);
  const [popupAjusteAberto, setPopupAjusteAberto] = useState(false);
  const [validarLocalizacaoMarcacao, setValidarLocalizacaoMarcacao] = useState(true);
  const [etapaMarcacao, setEtapaMarcacao] = useState<"idle" | "localizacao" | "registro">("idle");
  const [ocorrenciaTipo, setOcorrenciaTipo] = useState<RegistroPontoOcorrenciaTipo>("OBSERVACAO_OPERACIONAL");
  const [ocorrenciaDescricao, setOcorrenciaDescricao] = useState("");

  const { data: listaData, isLoading: carregandoLista } = useRegistrosPonto(filtros);
  const { data: espelhoData, isLoading: carregandoEspelho } = useEspelhoPonto(filtros);
  const { data: usuariosCatalogoData } = useCatalogoUsuariosRegistroPonto(termoUsuario);
  const { data: historicoData, isLoading: carregandoHistorico } = useHistoricoRegistroPonto(registroSelecionadoId);

  const marcarMutation = useMarcarPonto();
  const ajusteMutation = useAjustarRegistroPonto();
  const ocorrenciaMutation = useAdicionarOcorrenciaPonto();

  const ajusteForm = useForm<
    RegistroPontoAjusteFormInput,
    unknown,
    RegistroPontoAjusteFormValues
  >({
    resolver: zodResolver(registroPontoAjusteSchema),
    defaultValues: {
      entrada_1: "",
      saida_1: "",
      entrada_2: "",
      saida_2: "",
      observacoes: "",
      justificativa: "",
      observacao: ""
    }
  });

  const registros = listaData?.registros ?? [];
  const espelho = espelhoData?.registros ?? [];
  const totaisEspelho = espelhoData?.totais;

  const registroSelecionado = useMemo(
    () => registros.find((item) => item.id === registroSelecionadoId),
    [registros, registroSelecionadoId]
  );

  const registroHojeUsuario = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    return registros.find((item) => item.usuario_id === usuario?.id && item.data === hoje);
  }, [registros, usuario?.id]);

  useEffect(() => {
    if (!registros.length) {
      setRegistroSelecionadoId(undefined);
      return;
    }

    setRegistroSelecionadoId((atual) => {
      if (atual && registros.some((item) => item.id === atual)) {
        return atual;
      }
      return registros[0].id;
    });
  }, [registros]);

  useEffect(() => {
    if (isAdmin) return;

    const usuarioId = usuario?.id;
    if (!usuarioId) return;

    setFiltroDraft((prev) => ({
      ...prev,
      usuario_id: usuarioId
    }));
    setFiltros((prev) => ({
      ...prev,
      usuario_id: usuarioId
    }));
  }, [isAdmin, usuario?.id]);

  useEffect(() => {
    if (!registroSelecionado) {
      ajusteForm.reset({
        entrada_1: "",
        saida_1: "",
        entrada_2: "",
        saida_2: "",
        observacoes: "",
        justificativa: "",
        observacao: ""
      });
      return;
    }

    ajusteForm.reset({
      entrada_1: registroSelecionado.entrada_1 ? registroSelecionado.entrada_1.slice(0, 5) : "",
      saida_1: registroSelecionado.saida_1 ? registroSelecionado.saida_1.slice(0, 5) : "",
      entrada_2: registroSelecionado.entrada_2 ? registroSelecionado.entrada_2.slice(0, 5) : "",
      saida_2: registroSelecionado.saida_2 ? registroSelecionado.saida_2.slice(0, 5) : "",
      observacoes: registroSelecionado.observacoes ?? "",
      justificativa: "",
      observacao: ""
    });
  }, [ajusteForm, registroSelecionado]);

  function aplicarBusca() {
    setFiltros({ ...filtroDraft });
  }

  function limparParaNovo() {
    const padrao: RegistroPontoFiltro = {
      ...filtroRegistroPontoPadrao,
      usuario_id: isAdmin ? "" : usuario?.id
    };

    setFiltroDraft(padrao);
    setFiltros(padrao);
    setRegistroSelecionadoId(undefined);
    setOcorrenciaDescricao("");
    setOcorrenciaTipo("OBSERVACAO_OPERACIONAL");
    ajusteForm.reset({
      entrada_1: "",
      saida_1: "",
      entrada_2: "",
      saida_2: "",
      observacoes: "",
      justificativa: "",
      observacao: ""
    });
  }

  function cancelarEdicao() {
    if (!registroSelecionado) {
      ajusteForm.reset();
      return;
    }

    ajusteForm.reset({
      entrada_1: registroSelecionado.entrada_1 ? registroSelecionado.entrada_1.slice(0, 5) : "",
      saida_1: registroSelecionado.saida_1 ? registroSelecionado.saida_1.slice(0, 5) : "",
      entrada_2: registroSelecionado.entrada_2 ? registroSelecionado.entrada_2.slice(0, 5) : "",
      saida_2: registroSelecionado.saida_2 ? registroSelecionado.saida_2.slice(0, 5) : "",
      observacoes: registroSelecionado.observacoes ?? "",
      justificativa: "",
      observacao: ""
    });
    setOcorrenciaDescricao("");
    setMensagem({ tipo: "sucesso", texto: "Formulário restaurado." });
  }

  async function executarMarcacao() {
    try {
      setEtapaMarcacao(validarLocalizacaoMarcacao ? "localizacao" : "registro");
      const localizacao = validarLocalizacaoMarcacao ? await capturarLocalizacaoAtual() : undefined;
      setEtapaMarcacao("registro");
      const response = await marcarMutation.mutateAsync({
        latitude: localizacao?.latitude,
        longitude: localizacao?.longitude,
        accuracy_metros: localizacao?.accuracy_metros,
        validar_localizacao: validarLocalizacaoMarcacao
      });

      setMensagem({
        tipo: "sucesso",
        texto: response.mensagem
      });
      setPopupMarcarAberto(false);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setMensagem({
        tipo: "erro",
        texto: apiError.response?.data?.message ?? "Não foi possível registrar a batida de ponto."
      });
    } finally {
      setEtapaMarcacao("idle");
    }
  }

  const submitAjuste = ajusteForm.handleSubmit(async (values) => {
    if (!registroSelecionado) {
      setMensagem({ tipo: "erro", texto: "Selecione um registro para ajustar." });
      return;
    }

    try {
      await ajusteMutation.mutateAsync({
        id: registroSelecionado.id,
        payload: values
      });
      setMensagem({ tipo: "sucesso", texto: "Ajuste administrativo salvo com sucesso." });
      setPopupAjusteAberto(false);
      ajusteForm.setValue("justificativa", "");
      ajusteForm.setValue("observacao", "");
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setMensagem({
        tipo: "erro",
        texto: apiError.response?.data?.message ?? "Não foi possível salvar o ajuste administrativo."
      });
    }
  });

  async function salvarOcorrencia() {
    if (!registroSelecionadoId) {
      setMensagem({ tipo: "erro", texto: "Selecione um registro para incluir ocorrência." });
      return;
    }

    try {
      await ocorrenciaMutation.mutateAsync({
        id: registroSelecionadoId,
        payload: {
          tipo: ocorrenciaTipo,
          descricao: ocorrenciaDescricao
        }
      });

      setOcorrenciaDescricao("");
      setMensagem({ tipo: "sucesso", texto: "Ocorrência registrada com sucesso." });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setMensagem({
        tipo: "erro",
        texto: apiError.response?.data?.message ?? "Não foi possível registrar a ocorrência."
      });
    }
  }

  function acaoSalvar() {
    if (abaAtiva === "ajuste") {
      if (!isAdmin) {
        setMensagem({ tipo: "erro", texto: "Apenas administrador pode salvar ajustes." });
        return;
      }
      setPopupAjusteAberto(true);
      return;
    }

    if (abaAtiva === "ocorrencias") {
      void salvarOcorrencia();
      return;
    }

    setMensagem({
      tipo: "sucesso",
      texto: "Nenhuma alteração pendente nesta aba."
    });
  }

  function acaoExcluir() {
    setMensagem({
      tipo: "erro",
      texto: "Exclusão de registro de ponto não é permitida para preservar auditoria."
    });
  }

  function acaoImprimir() {
    window.print();
  }

  function acaoFechar() {
    navigate("/dashboard/visao-geral");
  }

  const marcacaoEmAndamento = marcarMutation.isPending || etapaMarcacao !== "idle";
  const acoesDesabilitadas =
    marcacaoEmAndamento || ajusteMutation.isPending || ocorrenciaMutation.isPending;

  function obterTextoBotaoMarcacao() {
    if (etapaMarcacao === "localizacao") return "Obtendo localização...";
    if (marcacaoEmAndamento) return "Registrando...";
    return "Registrar Ponto Agora";
  }

  function renderFiltros() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Período inicial</Label>
            <Input
              type="date"
              value={filtroDraft.data_inicial ?? ""}
              onChange={(event) => setFiltroDraft((prev) => ({ ...prev, data_inicial: event.target.value }))}
            />
          </div>

          <div>
            <Label>Período final</Label>
            <Input
              type="date"
              value={filtroDraft.data_final ?? ""}
              onChange={(event) => setFiltroDraft((prev) => ({ ...prev, data_final: event.target.value }))}
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={filtroDraft.status ?? ""}
              onChange={(event) =>
                setFiltroDraft((prev) => ({
                  ...prev,
                  status: (event.target.value || undefined) as RegistroPontoStatus | undefined
                }))
              }
            >
              <option value="">Todos</option>
              <option value="COMPLETO">Completo</option>
              <option value="INCOMPLETO">Incompleto</option>
            </Select>
          </div>

          <div>
            <Label>Ocorrência</Label>
            <Input
              value={filtroDraft.ocorrencia ?? ""}
              onChange={(event) => setFiltroDraft((prev) => ({ ...prev, ocorrencia: event.target.value }))}
              placeholder="Ex.: atraso"
            />
          </div>

          {isAdmin && (
            <>
              <div>
                <Label>Buscar usuário</Label>
                <Input
                  value={termoUsuario}
                  onChange={(event) => setTermoUsuario(event.target.value)}
                  placeholder="Digite pelo menos 2 letras"
                />
              </div>

              <div>
                <Label>Usuário</Label>
                <Select
                  value={filtroDraft.usuario_id ?? ""}
                  onChange={(event) => setFiltroDraft((prev) => ({ ...prev, usuario_id: event.target.value || "" }))}
                >
                  <option value="">Todos</option>
                  {(usuariosCatalogoData?.usuarios ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome} ({item.login})
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}

          <div>
            <Label>Unidade</Label>
            <Input
              value={filtroDraft.unidade ?? ""}
              onChange={(event) => setFiltroDraft((prev) => ({ ...prev, unidade: event.target.value }))}
              placeholder="Unidade"
              disabled={!isAdmin}
            />
          </div>

          <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
            <Checkbox
              checked={!!filtroDraft.somente_alterados}
              onChange={(event) =>
                setFiltroDraft((prev) => ({ ...prev, somente_alterados: event.target.checked }))
              }
            />
            Somente registros alterados
          </label>

          <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
            <Checkbox
              checked={!!filtroDraft.somente_inconsistencias}
              onChange={(event) =>
                setFiltroDraft((prev) => ({ ...prev, somente_inconsistencias: event.target.checked }))
              }
            />
            Somente inconsistências
          </label>
        </CardContent>
      </Card>
    );
  }

  function renderTabelaRegistros(registrosLista: RegistroPontoItem[]) {
    return (
      <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
        <table className="min-w-[1080px] text-xs sm:text-sm">
          <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
            <tr>
              <th className="px-2 py-2 text-left">Data</th>
              <th className="px-2 py-2 text-left">Usuário</th>
              <th className="px-2 py-2 text-left">E1</th>
              <th className="px-2 py-2 text-left">S1</th>
              <th className="px-2 py-2 text-left">E2</th>
              <th className="px-2 py-2 text-left">S2</th>
              <th className="px-2 py-2 text-left">Extras</th>
              <th className="px-2 py-2 text-left">Banco</th>
              <th className="px-2 py-2 text-left">Atraso</th>
              <th className="px-2 py-2 text-left">Falta</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-left">Ocorrências</th>
            </tr>
          </thead>
          <tbody>
            {registrosLista.map((item, index) => (
              <tr
                key={item.id}
                className={`cursor-pointer border-t border-[var(--g3-border)] transition-colors ${
                  registroSelecionadoId === item.id
                    ? "bg-[var(--g3-primary-soft-hover)]"
                    : index % 2 === 0
                      ? "bg-white"
                      : "bg-slate-50"
                }`}
                onClick={() => setRegistroSelecionadoId(item.id)}
              >
                <td className="px-2 py-2">{formatarData(item.data)}</td>
                <td className="px-2 py-2 font-medium">{item.usuario_nome}</td>
                <td className="px-2 py-2">{formatarHora(item.entrada_1)}</td>
                <td className="px-2 py-2">{formatarHora(item.saida_1)}</td>
                <td className="px-2 py-2">{formatarHora(item.entrada_2)}</td>
                <td className="px-2 py-2">{formatarHora(item.saida_2)}</td>
                <td className="px-2 py-2">{formatarMinutos(item.horas_extras_minutos)}</td>
                <td className="px-2 py-2">{formatarMinutos(item.banco_horas_minutos)}</td>
                <td className="px-2 py-2">{formatarMinutos(item.atrasos_minutos)}</td>
                <td className="px-2 py-2">{formatarMinutos(item.faltas_minutos)}</td>
                <td className="px-2 py-2">
                  <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${badgeStatusClasse(item.status)}`}>
                    {item.status === "COMPLETO" ? "Completo" : "Incompleto"}
                  </span>
                </td>
                <td className="px-2 py-2">{item.ocorrencias.join(", ") || "---"}</td>
              </tr>
            ))}

            {!registrosLista.length && (
              <tr>
                <td colSpan={12} className="px-2 py-8 text-center text-sm text-[var(--g3-muted)]">
                  Nenhum registro encontrado para os filtros informados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderAbaConteudo() {
    if (abaAtiva === "listagem") {
      return (
        <section className="space-y-3">
          {renderFiltros()}
          {renderTabelaRegistros(registros)}
        </section>
      );
    }

    if (abaAtiva === "marcacao") {
      return (
        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Marcação de ponto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">
                O horário da marcação é controlado pelo servidor e não pode ser editado manualmente.
              </p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox
                  checked={validarLocalizacaoMarcacao}
                  onChange={(event) => setValidarLocalizacaoMarcacao(event.target.checked)}
                  disabled={marcacaoEmAndamento}
                />
                Validar localização da instituição
              </label>
              <p className="text-xs text-[var(--g3-muted)]">
                Se desativado, o sistema não bloqueará a marcação por validação geográfica nesta batida.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Hoje</p>
                  <p className="text-sm font-semibold text-[var(--g3-active)]">{formatarData(new Date().toISOString().slice(0, 10))}</p>
                </div>
                <div className="rounded-lg border border-[var(--g3-border)] bg-white p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Próxima batida</p>
                  <p className="text-sm font-semibold text-[var(--g3-foreground)]">{registroHojeUsuario?.proxima_batida ?? "Entrada 1"}</p>
                </div>
                <div className="rounded-lg border border-[var(--g3-border)] bg-white p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Usuário</p>
                  <p className="text-sm font-semibold text-[var(--g3-foreground)]">{usuario?.nome ?? usuario?.nomeUsuario ?? "---"}</p>
                </div>
                <div className="rounded-lg border border-[var(--g3-border)] bg-white p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Saldo de banco</p>
                  <p className="text-sm font-semibold text-[var(--g3-foreground)]">{formatarMinutos(registroHojeUsuario?.banco_horas_minutos ?? 0)}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  className="min-w-[220px] shadow-md"
                  onClick={() => setPopupMarcarAberto(true)}
                  disabled={marcacaoEmAndamento}
                >
                  {obterTextoBotaoMarcacao()}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Espelho do dia</CardTitle>
            </CardHeader>
            <CardContent>
              {registroHojeUsuario ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <div><Label>Entrada 1</Label><p className="text-sm font-semibold">{formatarHora(registroHojeUsuario.entrada_1)}</p></div>
                  <div><Label>Saída 1</Label><p className="text-sm font-semibold">{formatarHora(registroHojeUsuario.saida_1)}</p></div>
                  <div><Label>Entrada 2</Label><p className="text-sm font-semibold">{formatarHora(registroHojeUsuario.entrada_2)}</p></div>
                  <div><Label>Saída 2</Label><p className="text-sm font-semibold">{formatarHora(registroHojeUsuario.saida_2)}</p></div>
                  <div><Label>Atrasos</Label><p className="text-sm font-semibold">{formatarMinutos(registroHojeUsuario.atrasos_minutos)}</p></div>
                  <div><Label>Horas extras</Label><p className="text-sm font-semibold">{formatarMinutos(registroHojeUsuario.horas_extras_minutos)}</p></div>
                </div>
              ) : (
                <p className="text-sm text-[var(--g3-muted)]">Ainda não há batidas registradas hoje.</p>
              )}
            </CardContent>
          </Card>
        </section>
      );
    }

    if (abaAtiva === "espelho") {
      return (
        <section className="space-y-3">
          {renderFiltros()}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Card><CardContent className="p-3"><p className="text-xs text-[var(--g3-muted)]">Dias</p><p className="text-lg font-semibold">{totaisEspelho?.total_dias ?? 0}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-[var(--g3-muted)]">Horas extras</p><p className="text-lg font-semibold">{formatarMinutos(totaisEspelho?.horas_extras_minutos ?? 0)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-[var(--g3-muted)]">Banco de horas</p><p className="text-lg font-semibold">{formatarMinutos(totaisEspelho?.banco_horas_minutos ?? 0)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-[var(--g3-muted)]">Atrasos</p><p className="text-lg font-semibold">{formatarMinutos(totaisEspelho?.atrasos_minutos ?? 0)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-[var(--g3-muted)]">Faltas</p><p className="text-lg font-semibold">{formatarMinutos(totaisEspelho?.faltas_minutos ?? 0)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-[var(--g3-muted)]">Ajustes</p><p className="text-lg font-semibold">{totaisEspelho?.total_ajustes ?? 0}</p></CardContent></Card>
          </div>
          {carregandoEspelho ? <p className="text-sm text-[var(--g3-muted)]">Carregando espelho...</p> : renderTabelaRegistros(espelho)}
        </section>
      );
    }

    if (abaAtiva === "ocorrencias") {
      return (
        <section className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Controle de ocorrências</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">Selecione um registro na listagem e informe a ocorrência operacional.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Tipo de ocorrência</Label>
                  <Select value={ocorrenciaTipo} onChange={(event) => setOcorrenciaTipo(event.target.value as RegistroPontoOcorrenciaTipo)}>
                    {tiposOcorrenciaOptions.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo.replaceAll("_", " ")}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Registro selecionado</Label>
                  <Input value={registroSelecionado ? `${formatarData(registroSelecionado.data)} - ${registroSelecionado.usuario_nome}` : "Nenhum registro selecionado"} readOnly />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={ocorrenciaDescricao} onChange={(event) => setOcorrenciaDescricao(event.target.value)} placeholder="Detalhe a ocorrência..." />
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => void salvarOcorrencia()} disabled={ocorrenciaMutation.isPending}>
                  {ocorrenciaMutation.isPending ? "Salvando..." : "Registrar ocorrência"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      );
    }

    if (abaAtiva === "historico") {
      return (
        <section className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Histórico e auditoria</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {carregandoHistorico && <p className="text-sm text-[var(--g3-muted)]">Carregando histórico...</p>}
              {!registroSelecionadoId && <p className="text-sm text-[var(--g3-muted)]">Selecione um registro para visualizar o histórico.</p>}

              {historicoData?.historico?.length ? (
                <div className="space-y-2">
                  {historicoData.historico.map((item) => (
                    <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.acao}</p>
                        <p className="text-xs text-[var(--g3-muted)]">{formatarDataHora(item.criado_em)}</p>
                      </div>
                      <p className="text-xs text-[var(--g3-muted)]">Usuário: {item.usuario_nome ?? "---"}</p>
                      {item.justificativa && <p className="text-xs text-[var(--g3-muted)]">Justificativa: {item.justificativa}</p>}
                      {item.observacao && <p className="text-xs text-[var(--g3-muted)]">Observação: {item.observacao}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                !carregandoHistorico && <p className="text-sm text-[var(--g3-muted)]">Sem histórico para o registro selecionado.</p>
              )}
            </CardContent>
          </Card>
        </section>
      );
    }

    return (
      <section className="space-y-3">
        {!isAdmin && (
          <Card>
            <CardContent className="p-4 text-sm text-amber-700">
              Apenas administrador pode realizar ajuste manual de ponto.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ajuste administrativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form className="space-y-3" onSubmit={submitAjuste}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><Label>Entrada 1</Label><Input type="time" {...ajusteForm.register("entrada_1")} disabled={!isAdmin} /></div>
                <div><Label>Saída 1</Label><Input type="time" {...ajusteForm.register("saida_1")} disabled={!isAdmin} /></div>
                <div><Label>Entrada 2</Label><Input type="time" {...ajusteForm.register("entrada_2")} disabled={!isAdmin} /></div>
                <div><Label>Saída 2</Label><Input type="time" {...ajusteForm.register("saida_2")} disabled={!isAdmin} /></div>
              </div>

              <div><Label>Observações</Label><Textarea {...ajusteForm.register("observacoes")} disabled={!isAdmin} /></div>
              <div><Label>Justificativa*</Label><Textarea {...ajusteForm.register("justificativa")} disabled={!isAdmin} /></div>
              <div><Label>Observação da ação*</Label><Textarea {...ajusteForm.register("observacao")} disabled={!isAdmin} /></div>
              <button type="submit" className="hidden" />
            </form>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="px-4 py-4 lg:px-8">
      <div className={classesTelaPadraoBeneficiario.container}>
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--g3-muted)]">Setor RH</p>
          <h2 className="text-base font-semibold text-[var(--g3-foreground)]">{tituloTela}</h2>
        </div>

        <Card className={classesTelaPadraoBeneficiario.barraAcoes}>
          <CardContent className="p-0">
            <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
              <Button type="button" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={aplicarBusca} disabled={acoesDesabilitadas}><Search className="mr-2 h-4 w-4" />Buscar</Button>
              <Button type="button" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={limparParaNovo} disabled={acoesDesabilitadas}><Plus className="mr-2 h-4 w-4" />Novo</Button>
              <Button type="button" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={acaoSalvar} disabled={acoesDesabilitadas}><Save className="mr-2 h-4 w-4" />Salvar</Button>
              <Button type="button" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={cancelarEdicao} disabled={acoesDesabilitadas}><Undo2 className="mr-2 h-4 w-4" />Cancelar</Button>
              <Button type="button" variant="danger" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={acaoExcluir} disabled={acoesDesabilitadas}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
              <Button type="button" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={acaoImprimir} disabled={acoesDesabilitadas}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
              <Button type="button" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={acaoFechar} disabled={acoesDesabilitadas}><X className="mr-2 h-4 w-4" />Fechar</Button>
            </div>
          </CardContent>
        </Card>

        <div className={classesTelaPadraoBeneficiario.gradePrincipal}>
          <Card className={classesTelaPadraoBeneficiario.cardAbas}>
            <CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>
              {abas
                .filter((aba) => (aba.id === "ajuste" ? isAdmin : true))
                .map((aba, index) => (
                  <button
                    key={aba.id}
                    type="button"
                    className={classeBotaoAbaLateral(abaAtiva === aba.id)}
                    onClick={() => setAbaAtiva(aba.id)}
                  >
                    <span className={classeNumeroAbaLateral(abaAtiva === aba.id)}>{index + 1}</span>
                    <span>{aba.label}</span>
                  </button>
                ))}
            </CardContent>
          </Card>

          <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
            <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
              <CardTitle className={classesTelaPadraoBeneficiario.tituloAba}>
                <ClipboardCheck className="h-4 w-4" />
                <span className={classesTelaPadraoBeneficiario.tituloAbaTexto}>
                  {abas.find((aba) => aba.id === abaAtiva)?.label}
                </span>
              </CardTitle>
              {registroSelecionado && (
                <span className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-2 py-1 text-xs text-[var(--g3-active)]">
                  {registroSelecionado.usuario_nome} - {formatarData(registroSelecionado.data)}
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-3 p-3">
              {carregandoLista && abaAtiva === "listagem" && (
                <p className="text-sm text-[var(--g3-muted)]">Carregando registros...</p>
              )}
              {renderAbaConteudo()}
            </CardContent>
          </Card>
        </div>
      </div>

      {mensagem && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setMensagem(null)}
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className={`text-base font-semibold ${mensagem.tipo === "sucesso" ? "text-emerald-800" : "text-red-700"}`}>
                {mensagem.tipo === "sucesso" ? "Confirmação" : "Atenção"}
              </h3>
            </div>
            <div className="px-5 py-4"><p className="text-sm text-slate-700">{mensagem.texto}</p></div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3"><Button type="button" onClick={() => setMensagem(null)}>OK</Button></div>
          </div>
        </div>
      )}

      {popupMarcarAberto && (
        <div className="fixed inset-0 z-[71] flex items-center justify-center bg-slate-900/45 px-4" role="dialog" aria-modal="true" onClick={() => !marcacaoEmAndamento && setPopupMarcarAberto(false)}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Confirmar marcação</h3></div>
            <div className="space-y-2 px-5 py-4">
              <p className="text-sm text-slate-700">Deseja registrar a próxima batida de ponto agora?</p>
              <p className="text-xs text-[var(--g3-muted)]">
                Validação de localização: {validarLocalizacaoMarcacao ? "ativada" : "desativada"}.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setPopupMarcarAberto(false)} disabled={marcacaoEmAndamento}>Cancelar</Button>
              <Button type="button" onClick={() => void executarMarcacao()} disabled={marcacaoEmAndamento}>{obterTextoBotaoMarcacao()}</Button>
            </div>
          </div>
        </div>
      )}

      {popupAjusteAberto && (
        <div className="fixed inset-0 z-[71] flex items-center justify-center bg-slate-900/45 px-4" role="dialog" aria-modal="true" onClick={() => !ajusteMutation.isPending && setPopupAjusteAberto(false)}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Confirmar ajuste administrativo</h3></div>
            <div className="px-5 py-4"><p className="text-sm text-slate-700">Esta ação ficará registrada na auditoria. Deseja continuar?</p></div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setPopupAjusteAberto(false)} disabled={ajusteMutation.isPending}>Cancelar</Button>
              <Button type="button" onClick={() => void submitAjuste()} disabled={ajusteMutation.isPending}>{ajusteMutation.isPending ? "Salvando..." : "Salvar ajuste"}</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
