import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CalendarDays,
  CalendarSync,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Plus,
  Save,
  Settings2,
  Trash2,
  Upload
} from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useAtivarDataComemorativa,
  useCalendarioDatasComemorativas,
  useConfiguracoesDatasComemorativas,
  useDatasComemorativas,
  useDuplicarDataComemorativa,
  useEventosDoDiaDatasComemorativas,
  useExcluirDataComemorativa,
  useImportarDatasComemorativas,
  useInativarDataComemorativa,
  useLogsDatasComemorativas,
  useSalvarConfiguracoesDatasComemorativas,
  useSalvarDataComemorativa,
  useSincronizarFeriados,
  useSincronizarIntervaloDatasComemorativas,
  useSyncLogsDatasComemorativas
} from "@/features/datas-comemorativas/use-datas-comemorativas";
import { datasComemorativasService } from "@/services/datas-comemorativas.service";
import type {
  AbrangenciaDataComemorativa,
  DataComemorativaConfiguracoes,
  DataComemorativaEvento,
  DataComemorativaFiltros,
  DataComemorativaPayload,
  TipoEventoDataComemorativa
} from "@/types/datas-comemorativas";

type AbaId = "calendario" | "lista" | "importacao" | "configuracoes" | "logs";
type FormState = {
  id?: string;
  titulo: string;
  descricao: string;
  dia: string;
  mes: string;
  ano: string;
  dataEvento: string;
  tipoEvento: TipoEventoDataComemorativa;
  abrangencia: AbrangenciaDataComemorativa;
  uf: string;
  municipio: string;
  recorrenteAnual: boolean;
  fonteOrigem: string;
  origemReferencia: string;
  corExibicao: string;
  icone: string;
  prioridadePopup: string;
  exibirNoPopup: boolean;
  ativo: boolean;
};

const abas: AdminTab[] = [
  { id: "calendario", label: "Calendário", icon: CalendarDays },
  { id: "lista", label: "Lista de eventos", icon: FileText },
  { id: "importacao", label: "Importação e sincronização", icon: CalendarSync },
  { id: "configuracoes", label: "Configurações", icon: Settings2 },
  { id: "logs", label: "Histórico e logs", icon: History }
];

const tipos = [
  { value: "comemorativa", label: "Comemorativa", cor: "#2563eb" },
  { value: "feriado_nacional", label: "Feriado nacional", cor: "#b91c1c" },
  { value: "feriado_estadual", label: "Feriado estadual", cor: "#dc2626" },
  { value: "feriado_municipal", label: "Feriado municipal", cor: "#ef4444" },
  { value: "institucional", label: "Institucional", cor: "#0f766e" },
  { value: "personalizado", label: "Personalizado", cor: "#7c3aed" }
] as const;

const abrangencias = [
  { value: "nacional", label: "Nacional" },
  { value: "estadual", label: "Estadual" },
  { value: "municipal", label: "Municipal" },
  { value: "interna", label: "Interna" }
] as const;

const defaultForm: FormState = {
  titulo: "",
  descricao: "",
  dia: "",
  mes: "",
  ano: "",
  dataEvento: "",
  tipoEvento: "comemorativa",
  abrangencia: "nacional",
  uf: "",
  municipio: "",
  recorrenteAnual: true,
  fonteOrigem: "manual",
  origemReferencia: "",
  corExibicao: "#2563eb",
  icone: "CalendarDays",
  prioridadePopup: "10",
  exibirNoPopup: true,
  ativo: true
};

const defaultConfig: DataComemorativaConfiguracoes = {
  popupHabilitado: true,
  popupUmaVezPorDia: true,
  popupMostrarFeriados: true,
  popupMostrarComemorativas: true,
  popupMostrarEventosInternos: true,
  popupLimiteItens: 6,
  popupOrdenarPorPrioridade: true,
  sincronizacaoAutomatica: false,
  frequenciaSincronizacao: "manual",
  providerFeriadoPrincipal: "brasilapi",
  providerFeriadoFallback: "nager",
  cacheDias: 30,
  ativo: true
};

const providerOptions = [
  { value: "brasilapi", label: "BrasilAPI" },
  { value: "nager", label: "Nager.Date" }
];

function hojeIso() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function formatarData(dataIso?: string) {
  if (!dataIso) return "—";
  const [ano, mes, dia] = dataIso.split("-");
  return ano && mes && dia ? `${dia}-${mes}-${ano}` : dataIso;
}

function formatarDataHora(dataIso?: string) {
  if (!dataIso) return "—";
  const data = new Date(dataIso);
  return Number.isNaN(data.getTime()) ? dataIso : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

function corTipo(tipo: TipoEventoDataComemorativa) {
  return tipos.find((item) => item.value === tipo)?.cor ?? "#2563eb";
}

function labelTipo(tipo: TipoEventoDataComemorativa) {
  return tipos.find((item) => item.value === tipo)?.label ?? tipo;
}

function labelAbrangencia(abrangencia: AbrangenciaDataComemorativa) {
  return abrangencias.find((item) => item.value === abrangencia)?.label ?? abrangencia;
}

function payloadDoFormulario(form: FormState): DataComemorativaPayload {
  return {
    titulo: form.titulo.trim(),
    descricao: form.descricao.trim() || null,
    dia: form.recorrenteAnual && form.dia ? Number(form.dia) : null,
    mes: form.recorrenteAnual && form.mes ? Number(form.mes) : null,
    ano: form.recorrenteAnual && form.ano ? Number(form.ano) : null,
    dataEvento: form.recorrenteAnual ? null : form.dataEvento || null,
    tipoEvento: form.tipoEvento,
    abrangencia: form.abrangencia,
    uf: form.abrangencia === "estadual" || form.abrangencia === "municipal" ? form.uf || null : null,
    municipio: form.abrangencia === "municipal" ? form.municipio || null : null,
    recorrenteAnual: form.recorrenteAnual,
    fonteOrigem: form.fonteOrigem || "manual",
    origemReferencia: form.origemReferencia || null,
    corExibicao: form.corExibicao || null,
    icone: form.icone || null,
    prioridadePopup: form.prioridadePopup ? Number(form.prioridadePopup) : 0,
    exibirNoPopup: form.exibirNoPopup,
    ativo: form.ativo
  };
}

function formDoEvento(evento: DataComemorativaEvento): FormState {
  return {
    id: evento.id,
    titulo: evento.titulo,
    descricao: evento.descricao ?? "",
    dia: evento.dia ? String(evento.dia) : "",
    mes: evento.mes ? String(evento.mes) : "",
    ano: evento.ano ? String(evento.ano) : "",
    dataEvento: evento.dataEvento ?? "",
    tipoEvento: evento.tipoEvento,
    abrangencia: evento.abrangencia,
    uf: evento.uf ?? "",
    municipio: evento.municipio ?? "",
    recorrenteAnual: evento.recorrenteAnual,
    fonteOrigem: evento.fonteOrigem ?? "manual",
    origemReferencia: evento.origemReferencia ?? "",
    corExibicao: evento.corExibicao ?? "#2563eb",
    icone: evento.icone ?? "CalendarDays",
    prioridadePopup: String(evento.prioridadePopup ?? 0),
    exibirNoPopup: evento.exibirNoPopup,
    ativo: evento.ativo
  };
}

async function abrirBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const janela = window.open(url, "_blank", "noopener,noreferrer");
  if (!janela) {
    URL.revokeObjectURL(url);
    throw new Error("O navegador bloqueou a abertura do arquivo.");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function Chip({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${cor}1a`, color: cor }}>
      {children}
    </span>
  );
}

export function DatasComemorativasPage() {
  const location = useLocation();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("calendario");
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState<DataComemorativaFiltros>({
    termo: "",
    tipoEvento: "",
    abrangencia: "",
    uf: "",
    municipio: "",
    ativo: "true",
    exibirNoPopup: "",
    origem: "",
    ordenarPor: "data",
    ordem: "ASC",
    limite: "20"
  });
  const hoje = useMemo(() => new Date(), []);
  const [anoCalendario, setAnoCalendario] = useState(hoje.getFullYear());
  const [mesCalendario, setMesCalendario] = useState(hoje.getMonth() + 1);
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState<string | null>(null);
  const [providerSync, setProviderSync] = useState("brasilapi");
  const [anoSync, setAnoSync] = useState(String(hoje.getFullYear()));
  const [syncInicio, setSyncInicio] = useState(String(hoje.getFullYear()));
  const [syncFim, setSyncFim] = useState(String(hoje.getFullYear() + 1));
  const [arquivoImportacao, setArquivoImportacao] = useState<File | null>(null);
  const [formatoImportacao, setFormatoImportacao] = useState<"json" | "csv">("json");
  const [configForm, setConfigForm] = useState(defaultConfig);

  const listaQuery = useDatasComemorativas({ ...filtros, pagina: String(pagina) });
  const calendarioQuery = useCalendarioDatasComemorativas(anoCalendario, mesCalendario, filtros);
  const eventosDiaQuery = useEventosDoDiaDatasComemorativas(dataSelecionada ?? undefined, {
    uf: filtros.uf || undefined,
    municipio: filtros.municipio || undefined
  });
  const configuracoesQuery = useConfiguracoesDatasComemorativas();
  const syncLogsQuery = useSyncLogsDatasComemorativas();
  const logsQuery = useLogsDatasComemorativas();
  const salvarMutation = useSalvarDataComemorativa();
  const excluirMutation = useExcluirDataComemorativa();
  const ativarMutation = useAtivarDataComemorativa();
  const inativarMutation = useInativarDataComemorativa();
  const duplicarMutation = useDuplicarDataComemorativa();
  const sincronizarMutation = useSincronizarFeriados();
  const sincronizarIntervaloMutation = useSincronizarIntervaloDatasComemorativas();
  const importarMutation = useImportarDatasComemorativas();
  const salvarConfiguracoesMutation = useSalvarConfiguracoesDatasComemorativas();

  const eventos = listaQuery.data?.eventos ?? [];
  const totalPaginas = Math.max(1, Math.ceil((listaQuery.data?.total ?? 0) / Number(filtros.limite ?? "20")));
  const eventosDia = eventosDiaQuery.data?.eventos ?? [];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    const data = params.get("data");
    if (tab === "calendario" || tab === "lista" || tab === "importacao" || tab === "configuracoes" || tab === "logs") {
      setAbaAtiva(tab);
    }
    if (data) {
      setDataSelecionada(data);
      setAnoCalendario(Number(data.slice(0, 4)));
      setMesCalendario(Number(data.slice(5, 7)));
    }
  }, [location.search]);

  useEffect(() => {
    if (configuracoesQuery.data) {
      setConfigForm(configuracoesQuery.data);
    }
  }, [configuracoesQuery.data]);

  function atualizarFiltro(chave: keyof DataComemorativaFiltros, valor: string) {
    setPagina(1);
    setFiltros((estado) => ({ ...estado, [chave]: valor }));
  }

  function limparFormulario() {
    setForm(defaultForm);
  }

  function editarEvento(evento: DataComemorativaEvento) {
    setForm(formDoEvento(evento));
    setAbaAtiva("lista");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarEvento() {
    if (!form.titulo.trim()) {
      setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Informe o título do evento." });
      return;
    }

    try {
      await salvarMutation.mutateAsync({ id: form.id, payload: payloadDoFormulario(form) });
      limparFormulario();
      setPopupMensagem({ tipo: "sucesso", titulo: "Evento salvo", texto: "A data comemorativa foi salva com sucesso." });
    } catch (error) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro ao salvar", texto: error instanceof Error ? error.message : "Não foi possível salvar o evento." });
    }
  }

  async function excluirEvento(id: string) {
    try {
      await excluirMutation.mutateAsync(id);
      if (form.id === id) limparFormulario();
      setConfirmarExclusaoId(null);
      setPopupMensagem({ tipo: "sucesso", titulo: "Evento excluído", texto: "O evento foi removido logicamente." });
    } catch (error) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro ao excluir", texto: error instanceof Error ? error.message : "Não foi possível excluir o evento." });
    }
  }

  async function alternarAtivo(evento: DataComemorativaEvento) {
    try {
      if (evento.ativo) await inativarMutation.mutateAsync(evento.id);
      else await ativarMutation.mutateAsync(evento.id);
    } catch (error) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro na atualização", texto: error instanceof Error ? error.message : "Não foi possível atualizar o status." });
    }
  }

  async function executarLote(acao: "ativar" | "inativar" | "excluir") {
    if (!selecionados.length) return;
    try {
      for (const id of selecionados) {
        if (acao === "ativar") await ativarMutation.mutateAsync(id);
        if (acao === "inativar") await inativarMutation.mutateAsync(id);
        if (acao === "excluir") await excluirMutation.mutateAsync(id);
      }
      setSelecionados([]);
    } catch (error) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro no lote", texto: error instanceof Error ? error.message : "Não foi possível concluir a ação em lote." });
    }
  }

  async function exportar(formato: "pdf" | "excel") {
    try {
      const blob = await datasComemorativasService.exportar(formato, filtros);
      if (formato === "pdf") await abrirBlob(blob);
      else baixarBlob(blob, `datas-comemorativas-${hojeIso()}.csv`);
    } catch (error) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro ao exportar", texto: error instanceof Error ? error.message : "Não foi possível exportar o relatório." });
    }
  }

  const actions: AdminAction[] = [
    { label: "Novo evento", icon: Plus, variant: "default", onClick: () => { limparFormulario(); setAbaAtiva("lista"); } },
    { label: "Exportar PDF", icon: FileText, variant: "outline", onClick: () => void exportar("pdf") },
    { label: "Exportar Excel", icon: FileSpreadsheet, variant: "outline", onClick: () => void exportar("excel") }
  ];

  return (
    <AdminPageLayout
      tabs={abas}
      activeTab={abaAtiva}
      onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
      actions={actions}
      sectionLabel="Configurações gerais"
      pageTitle="Datas comemorativas"
      activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
      activeIcon={abas.find((item) => item.id === abaAtiva)?.icon}
      codeBadge="CAL-001"
    >
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1 xl:col-span-2">
            <Label>Palavra-chave</Label>
            <Input value={filtros.termo ?? ""} onChange={(event) => atualizarFiltro("termo", event.target.value)} placeholder="Buscar por título ou descrição" />
          </div>
          <div className="space-y-1">
            <Label>Tipo do evento</Label>
            <Select value={filtros.tipoEvento ?? ""} onChange={(event) => atualizarFiltro("tipoEvento", event.target.value)}>
              <option value="">Todos</option>
              {tipos.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Abrangência</Label>
            <Select value={filtros.abrangencia ?? ""} onChange={(event) => atualizarFiltro("abrangencia", event.target.value)}>
              <option value="">Todas</option>
              {abrangencias.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Ativo</Label>
            <Select value={filtros.ativo ?? ""} onChange={(event) => atualizarFiltro("ativo", event.target.value)}>
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {abaAtiva === "calendario" ? (
        <div className="space-y-3">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><CardTitle>Calendário mensal</CardTitle></div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => mesCalendario === 1 ? (setMesCalendario(12), setAnoCalendario((valor) => valor - 1)) : setMesCalendario((valor) => valor - 1)}>Mês anterior</Button>
                <Select value={String(mesCalendario)} onChange={(event) => setMesCalendario(Number(event.target.value))} className="w-[120px]">
                  {Array.from({ length: 12 }, (_, indice) => <option key={indice + 1} value={String(indice + 1)}>{new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2026, indice, 1))}</option>)}
                </Select>
                <Input type="number" value={anoCalendario} onChange={(event) => setAnoCalendario(Number(event.target.value))} className="w-[110px]" />
                <Button type="button" variant="outline" size="sm" onClick={() => mesCalendario === 12 ? (setMesCalendario(1), setAnoCalendario((valor) => valor + 1)) : setMesCalendario((valor) => valor + 1)}>Próximo mês</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {tipos.slice(0, 5).map((item) => <Chip key={item.value} cor={item.cor}>{item.label}</Chip>)}
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[820px] space-y-2">
                  <div className="grid grid-cols-7 gap-2">{(calendarioQuery.data?.semanaLabels ?? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]).map((label) => <div key={label} className="rounded-lg bg-[var(--g3-primary-soft)] px-3 py-2 text-center text-xs font-semibold text-[var(--g3-active)]">{label}</div>)}</div>
                  {calendarioQuery.data?.weeks.map((semana, indice) => (
                    <div key={indice} className="grid grid-cols-7 gap-2">
                      {semana.map((dia, idx) => (
                        <button key={`${indice}-${idx}`} type="button" onClick={() => dia.data && setDataSelecionada(dia.data)} className={`min-h-[120px] rounded-xl border p-3 text-left ${dia.vazio ? "border-dashed border-[var(--g3-border)]" : "border-[var(--g3-border)] bg-[var(--g3-card)]"}`}>
                          {!dia.vazio ? <>
                            <div className="flex items-center justify-between"><span className="text-sm font-semibold">{dia.dia}</span><span className="text-[10px] text-[var(--g3-muted)]">{dia.eventos?.length ?? 0}</span></div>
                            <div className="mt-2 space-y-1">{(dia.eventos ?? []).slice(0, 3).map((evento) => <div key={evento.id} className="truncate rounded-md px-2 py-1 text-[11px] font-medium" style={{ backgroundColor: `${corTipo(evento.tipoEvento)}1a`, color: corTipo(evento.tipoEvento) }}>{evento.titulo}</div>)}</div>
                          </> : null}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {dataSelecionada ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Eventos do dia {formatarData(dataSelecionada)}</CardTitle>
                <Button type="button" variant="outline" onClick={() => setDataSelecionada(null)}>Fechar</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {eventosDia.map((evento) => (
                  <div key={evento.id} className="rounded-xl border border-[var(--g3-border)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Chip cor={corTipo(evento.tipoEvento)}>{labelTipo(evento.tipoEvento)}</Chip>
                          <Chip cor="#475569">{labelAbrangencia(evento.abrangencia)}</Chip>
                        </div>
                        <div className="text-base font-semibold">{evento.titulo}</div>
                        {evento.descricao ? <p className="text-sm text-[var(--g3-muted)]">{evento.descricao}</p> : null}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => editarEvento(evento)}>Editar</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => void duplicarMutation.mutateAsync(evento.id).then(editarEvento)}>Duplicar</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {abaAtiva === "lista" ? (
        <div className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Cadastro e edição</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2"><Label>Título</Label><Input value={form.titulo} onChange={(event) => setForm((estado) => ({ ...estado, titulo: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Tipo</Label><Select value={form.tipoEvento} onChange={(event) => setForm((estado) => ({ ...estado, tipoEvento: event.target.value as TipoEventoDataComemorativa }))}>{tipos.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
              <div className="space-y-1"><Label>Abrangência</Label><Select value={form.abrangencia} onChange={(event) => setForm((estado) => ({ ...estado, abrangencia: event.target.value as AbrangenciaDataComemorativa }))}>{abrangencias.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Descrição</Label><Textarea rows={3} value={form.descricao} onChange={(event) => setForm((estado) => ({ ...estado, descricao: event.target.value }))} /></div>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.recorrenteAnual} onChange={(event) => setForm((estado) => ({ ...estado, recorrenteAnual: event.target.checked }))} />Recorrência anual</label>
              {form.recorrenteAnual ? (
                <>
                  <div className="space-y-1"><Label>Dia</Label><Input type="number" value={form.dia} onChange={(event) => setForm((estado) => ({ ...estado, dia: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Mês</Label><Input type="number" value={form.mes} onChange={(event) => setForm((estado) => ({ ...estado, mes: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Ano base</Label><Input type="number" value={form.ano} onChange={(event) => setForm((estado) => ({ ...estado, ano: event.target.value }))} /></div>
                </>
              ) : (
                <div className="space-y-1"><Label>Data do evento</Label><Input type="date" value={form.dataEvento} onChange={(event) => setForm((estado) => ({ ...estado, dataEvento: event.target.value }))} /></div>
              )}
              <div className="space-y-1"><Label>UF</Label><Input value={form.uf} maxLength={2} onChange={(event) => setForm((estado) => ({ ...estado, uf: event.target.value.toUpperCase() }))} /></div>
              <div className="space-y-1"><Label>Município</Label><Input value={form.municipio} onChange={(event) => setForm((estado) => ({ ...estado, municipio: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Cor</Label><Input value={form.corExibicao} onChange={(event) => setForm((estado) => ({ ...estado, corExibicao: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Prioridade do popup</Label><Input type="number" value={form.prioridadePopup} onChange={(event) => setForm((estado) => ({ ...estado, prioridadePopup: event.target.value }))} /></div>
              <div className="xl:col-span-2 space-y-1"><Label>Origem de referência</Label><Input value={form.origemReferencia} onChange={(event) => setForm((estado) => ({ ...estado, origemReferencia: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Fonte de origem</Label><Input value={form.fonteOrigem} onChange={(event) => setForm((estado) => ({ ...estado, fonteOrigem: event.target.value }))} /></div>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.exibirNoPopup} onChange={(event) => setForm((estado) => ({ ...estado, exibirNoPopup: event.target.checked }))} />Exibir no popup</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.ativo} onChange={(event) => setForm((estado) => ({ ...estado, ativo: event.target.checked }))} />Evento ativo</label>
              <div className="flex flex-wrap gap-2 xl:col-span-4">
                <Button type="button" onClick={() => void salvarEvento()} disabled={salvarMutation.isPending}><Save className="mr-1.5 h-3.5 w-3.5" />{salvarMutation.isPending ? "Salvando..." : form.id ? "Atualizar evento" : "Salvar evento"}</Button>
                <Button type="button" variant="outline" onClick={limparFormulario}>Limpar formulário</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Lista de eventos</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void executarLote("ativar")}>Ativar selecionados</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void executarLote("inativar")}>Inativar selecionados</Button>
                <Button type="button" variant="danger" size="sm" onClick={() => void executarLote("excluir")}>Excluir selecionados</Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr><th className="px-3 py-2 text-left"><Checkbox checked={eventos.length > 0 && selecionados.length === eventos.length} onChange={(event) => setSelecionados(event.target.checked ? eventos.map((item) => item.id) : [])} /></th><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Título</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Ações</th></tr>
                </thead>
                <tbody>
                  {eventos.map((evento) => (
                    <tr key={evento.id} className="border-t border-[var(--g3-border)]">
                      <td className="px-3 py-2"><Checkbox checked={selecionados.includes(evento.id)} onChange={(event) => setSelecionados((estado) => event.target.checked ? [...estado, evento.id] : estado.filter((id) => id !== evento.id))} /></td>
                      <td className="px-3 py-2">{formatarData(evento.dataVisual)}</td>
                      <td className="px-3 py-2">{evento.titulo}</td>
                      <td className="px-3 py-2"><Chip cor={corTipo(evento.tipoEvento)}>{labelTipo(evento.tipoEvento)}</Chip></td>
                      <td className="px-3 py-2">{evento.ativo ? "Ativo" : "Inativo"}</td>
                      <td className="px-3 py-2"><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => editarEvento(evento)}>Editar</Button><Button type="button" variant="outline" size="sm" onClick={() => void duplicarMutation.mutateAsync(evento.id).then(editarEvento)}><Copy className="mr-1.5 h-3.5 w-3.5" />Duplicar</Button><Button type="button" variant="outline" size="sm" onClick={() => void alternarAtivo(evento)}>{evento.ativo ? "Inativar" : "Ativar"}</Button><Button type="button" variant="danger" size="sm" onClick={() => setConfirmarExclusaoId(evento.id)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Excluir</Button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-between text-sm text-[var(--g3-muted)]">
                <span>Página {pagina} de {totalPaginas}</span>
                <div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((valor) => Math.max(valor - 1, 1))}>Anterior</Button><Button type="button" variant="outline" size="sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((valor) => Math.min(valor + 1, totalPaginas))}>Próxima</Button></div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {abaAtiva === "importacao" ? (
        <div className="space-y-3">
          <Card><CardHeader><CardTitle>Sincronização de feriados</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-4"><div className="space-y-1"><Label>Ano</Label><Input type="number" value={anoSync} onChange={(event) => setAnoSync(event.target.value)} /></div><div className="space-y-1"><Label>Provider</Label><Select value={providerSync} onChange={(event) => setProviderSync(event.target.value)}>{providerOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div><div className="space-y-1"><Label>Início</Label><Input type="number" value={syncInicio} onChange={(event) => setSyncInicio(event.target.value)} /></div><div className="space-y-1"><Label>Fim</Label><Input type="number" value={syncFim} onChange={(event) => setSyncFim(event.target.value)} /></div><div className="flex flex-wrap gap-2 md:col-span-4"><Button type="button" onClick={() => void sincronizarMutation.mutateAsync({ ano: Number(anoSync), provider: providerSync })}><CalendarSync className="mr-1.5 h-3.5 w-3.5" />Sincronizar ano</Button><Button type="button" variant="outline" onClick={() => void sincronizarIntervaloMutation.mutateAsync({ inicio: Number(syncInicio), fim: Number(syncFim), provider: providerSync })}>Sincronizar intervalo</Button></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Importação de base local</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><div className="space-y-1"><Label>Formato</Label><Select value={formatoImportacao} onChange={(event) => setFormatoImportacao(event.target.value as "json" | "csv")}><option value="json">JSON</option><option value="csv">CSV</option></Select></div><div className="space-y-1 md:col-span-2"><Label>Arquivo</Label><Input type="file" onChange={(event) => setArquivoImportacao(event.target.files?.[0] ?? null)} /></div><div className="flex flex-wrap gap-2 md:col-span-3"><Button type="button" onClick={async () => { if (!arquivoImportacao) return; const conteudo = await arquivoImportacao.text(); await importarMutation.mutateAsync({ formato: formatoImportacao, conteudo }); }}><Upload className="mr-1.5 h-3.5 w-3.5" />Importar arquivo</Button><Button type="button" variant="outline" onClick={() => void importarMutation.mutateAsync({ formato: "seed" })}><Download className="mr-1.5 h-3.5 w-3.5" />Carregar seed inicial</Button></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Histórico de sincronização</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data e hora</th><th className="px-3 py-2 text-left">Provider</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Status</th></tr></thead><tbody>{(syncLogsQuery.data ?? []).map((log) => <tr key={log.id} className="border-t border-[var(--g3-border)]"><td className="px-3 py-2">{formatarDataHora(log.iniciadoEm)}</td><td className="px-3 py-2">{log.providerNome}</td><td className="px-3 py-2">{log.tipoSync}</td><td className="px-3 py-2">{log.statusExecucao}</td></tr>)}</tbody></table></CardContent></Card>
        </div>
      ) : null}

      {abaAtiva === "configuracoes" ? (
        <Card><CardHeader><CardTitle>Configurações do módulo</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className="flex items-center gap-2 text-sm"><Checkbox checked={configForm.popupHabilitado} onChange={(event) => setConfigForm((estado) => ({ ...estado, popupHabilitado: event.target.checked }))} />Habilitar popup no login</label><label className="flex items-center gap-2 text-sm"><Checkbox checked={configForm.popupUmaVezPorDia} onChange={(event) => setConfigForm((estado) => ({ ...estado, popupUmaVezPorDia: event.target.checked }))} />Mostrar apenas uma vez por dia</label><label className="flex items-center gap-2 text-sm"><Checkbox checked={configForm.popupMostrarFeriados} onChange={(event) => setConfigForm((estado) => ({ ...estado, popupMostrarFeriados: event.target.checked }))} />Incluir feriados</label><label className="flex items-center gap-2 text-sm"><Checkbox checked={configForm.popupMostrarEventosInternos} onChange={(event) => setConfigForm((estado) => ({ ...estado, popupMostrarEventosInternos: event.target.checked }))} />Incluir eventos internos</label><div className="space-y-1"><Label>Limite de itens</Label><Input type="number" value={configForm.popupLimiteItens} onChange={(event) => setConfigForm((estado) => ({ ...estado, popupLimiteItens: Number(event.target.value) }))} /></div><div className="space-y-1"><Label>Provider principal</Label><Select value={configForm.providerFeriadoPrincipal} onChange={(event) => setConfigForm((estado) => ({ ...estado, providerFeriadoPrincipal: event.target.value }))}>{providerOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div><div className="space-y-1"><Label>Provider fallback</Label><Select value={configForm.providerFeriadoFallback} onChange={(event) => setConfigForm((estado) => ({ ...estado, providerFeriadoFallback: event.target.value }))}>{providerOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div><div className="space-y-1"><Label>Dias de cache</Label><Input type="number" value={configForm.cacheDias} onChange={(event) => setConfigForm((estado) => ({ ...estado, cacheDias: Number(event.target.value) }))} /></div><div className="xl:col-span-4"><Button type="button" onClick={() => void salvarConfiguracoesMutation.mutateAsync(configForm)}><Save className="mr-1.5 h-3.5 w-3.5" />Salvar configurações</Button></div></CardContent></Card>
      ) : null}

      {abaAtiva === "logs" ? (
        <Card><CardHeader><CardTitle>Histórico consolidado</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data e hora</th><th className="px-3 py-2 text-left">Origem</th><th className="px-3 py-2 text-left">Título</th><th className="px-3 py-2 text-left">Descrição</th></tr></thead><tbody>{(logsQuery.data ?? []).map((log) => <tr key={log.id} className="border-t border-[var(--g3-border)]"><td className="px-3 py-2">{formatarDataHora(log.criadoEm)}</td><td className="px-3 py-2">{log.origem}</td><td className="px-3 py-2">{log.titulo}</td><td className="px-3 py-2">{log.descricao}</td></tr>)}</tbody></table></CardContent></Card>
      ) : null}

      <PopupConfirmacao aberto={!!confirmarExclusaoId} titulo="Excluir evento" texto="O evento será removido logicamente. Deseja continuar?" processando={excluirMutation.isPending} onCancel={() => setConfirmarExclusaoId(null)} onConfirm={() => { if (confirmarExclusaoId) void excluirEvento(confirmarExclusaoId); }} confirmarTexto="Excluir" confirmarVariant="danger" />
      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
    </AdminPageLayout>
  );
}
