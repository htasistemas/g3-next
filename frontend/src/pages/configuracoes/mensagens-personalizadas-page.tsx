import { useEffect, useMemo, useState } from "react";
import {
  BookText,
  BarChart3,
  FilterX,
  History,
  Mail,
  MailPlus,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Settings2,
  Search,
  Sparkles,
  Tags,
  Trash2
} from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { MensagemEnvioDialog } from "@/components/mensagens-personalizadas/mensagem-envio-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  useAtualizarStatusMensagemPersonalizada,
  useDuplicarMensagemPersonalizada,
  useMensagensPersonalizadasHistorico,
  useMensagensPersonalizadasModelos,
  useMensagensPersonalizadasSuporte,
  useMensagensPersonalizadasTaxonomias,
  useRemoverMensagemPersonalizada,
  useRemoverTaxonomiaMensagem,
  useSalvarMensagemPersonalizada,
  useSalvarTaxonomiaMensagem
} from "@/features/mensagens-personalizadas/use-mensagens-personalizadas";
import type {
  MensagemDestinatarioTipo,
  MensagemHistoricoFiltros,
  MensagemModelo,
  MensagemModeloFiltros,
  MensagemModeloForm,
  MensagemPlaceholder,
  MensagemStatus,
  MensagemTaxonomia,
  MensagemTaxonomiaTipo
} from "@/types/mensagens-personalizadas";

const abas: AdminTab[] = [
  { id: "dashboard", label: "Dashboard de envios", icon: BarChart3 },
  { id: "envio", label: "Envio de mensagens", icon: MailPlus },
  { id: "pre-prontas", label: "Mensagens pré-prontas", icon: BookText },
  { id: "sugestoes-ia", label: "Sugestões da IA", icon: Sparkles },
  { id: "categorias", label: "Categorias e assuntos", icon: Tags },
  { id: "historico", label: "Histórico / utilização", icon: History },
  { id: "configuracao", label: "Configurar envios", icon: Settings2 }
];

const tonsVozIA = [
  { id: "acolhedor", label: "Acolhedor", descricao: "Empático e caloroso" },
  { id: "formal", label: "Formal", descricao: "Profissional e sério" },
  { id: "institucional", label: "Institucional", descricao: "Padrão oficial da organização" },
  { id: "motivacional", label: "Motivacional", descricao: "Inspirador e enérgico" },
  { id: "informativo", label: "Informativo", descricao: "Direto e objetivo" }
];

const objetivosIA = [
  { id: "boas-vindas", label: "Boas-vindas" },
  { id: "lembrete", label: "Lembrete de compromisso" },
  { id: "agradecimento-doacao", label: "Agradecimento por doação" },
  { id: "convite-evento", label: "Convite para evento" },
  { id: "comunicado-urgente", label: "Comunicado importante" },
  { id: "atualizacao-cadastral", label: "Atualização cadastral" }
];

const modeloVazio: MensagemModeloForm = {
  titulo: "",
  assunto: "",
  categoriaId: "",
  assuntoId: "",
  tipoComunicacaoId: "",
  tags: [],
  tiposDestinatario: ["BENEFICIARIO"],
  canalPermitido: "AMBOS",
  mensagemBase: "",
  variaveisPermitidas: [],
  status: "ATIVA",
  observacoesInternas: "",
  mensagemPadraoSistema: false,
  mensagemPersonalizadaUsuario: true,
  mensagemSugeridaIa: false
};

type AbaId = (typeof abas)[number]["id"];
type ModeloModo = "criar" | "editar" | "visualizar";

function formatarDataHora(valor?: string) {
  if (!valor) return "---";
  return new Date(valor).toLocaleString("pt-BR");
}

function rotuloTaxonomia(tipo: MensagemTaxonomiaTipo) {
  if (tipo === "CATEGORIA") return "Categoria";
  if (tipo === "ASSUNTO") return "Assunto";
  if (tipo === "TIPO_COMUNICACAO") return "Tipo de comunicação";
  return "Tag";
}

function rotuloStatus(status: MensagemStatus) {
  return status === "ATIVA" ? "Ativa" : "Inativa";
}

function rotuloDestinatario(tipo: MensagemDestinatarioTipo) {
  if (tipo === "BENEFICIARIO") return "Beneficiário";
  if (tipo === "PROFISSIONAL") return "Profissional";
  if (tipo === "COLABORADOR") return "Colaborador";
  if (tipo === "VOLUNTARIO") return "Voluntário";
  if (tipo === "DOADOR") return "Doador";
  return "Instituição";
}

function rotuloCanal(canal?: "WHATSAPP" | "EMAIL" | "AMBOS") {
  if (canal === "WHATSAPP") return "WhatsApp";
  if (canal === "EMAIL") return "E-mail";
  return "WhatsApp e e-mail";
}

function rotuloOrigem(modelo?: MensagemModelo) {
  if (!modelo) return "Mensagem personalizada do usuário";
  if (modelo.mensagemSugeridaIa) return "Sugestão da IA";
  if (modelo.mensagemPadraoSistema) return "Padrão do sistema";
  return "Mensagem personalizada do usuário";
}

function mapModeloParaForm(modelo?: MensagemModelo): MensagemModeloForm {
  if (!modelo) return modeloVazio;
  return {
    titulo: modelo.titulo,
    assunto: modelo.assunto ?? "",
    categoriaId: modelo.categoriaId ?? "",
    assuntoId: modelo.assuntoId ?? "",
    tipoComunicacaoId: modelo.tipoComunicacaoId ?? "",
    tags: modelo.tags,
    tiposDestinatario: modelo.tiposDestinatario,
    canalPermitido: modelo.canalPermitido,
    mensagemBase: modelo.mensagemBase,
    variaveisPermitidas: modelo.variaveisPermitidas,
    status: modelo.status,
    observacoesInternas: modelo.observacoesInternas ?? "",
    mensagemPadraoSistema: modelo.mensagemPadraoSistema,
    mensagemPersonalizadaUsuario: modelo.mensagemPersonalizadaUsuario,
    mensagemSugeridaIa: modelo.mensagemSugeridaIa
  };
}

function ModeloDialog({
  aberto,
  modo,
  modelo,
  placeholders,
  taxonomias,
  salvando,
  onClose,
  onSalvar
}: {
  aberto: boolean;
  modo: ModeloModo;
  modelo?: MensagemModelo;
  placeholders: MensagemPlaceholder[];
  taxonomias: MensagemTaxonomia[];
  salvando: boolean;
  onClose: () => void;
  onSalvar: (payload: MensagemModeloForm) => Promise<void>;
}) {
  const [form, setForm] = useState<MensagemModeloForm>(modeloVazio);
  const [campoAtivo, setCampoAtivo] = useState<"assunto" | "mensagemBase">("mensagemBase");
  const somenteLeitura = modo === "visualizar";

  useEffect(() => {
    if (!aberto) return;
    setForm(mapModeloParaForm(modelo));
  }, [aberto, modelo?.id, modo]);

  const categorias = taxonomias.filter((item) => item.tipo === "CATEGORIA");
  const assuntos = taxonomias.filter((item) => item.tipo === "ASSUNTO");
  const tiposComunicacao = taxonomias.filter((item) => item.tipo === "TIPO_COMUNICACAO");
  const tags = taxonomias.filter((item) => item.tipo === "TAG");

  function inserirPlaceholder(chave: string) {
    if (somenteLeitura) return;
    setForm((atual) => {
      const variavel = chave.replace(/[{}]/g, "");
      const variaveisPermitidas = atual.variaveisPermitidas.includes(variavel)
        ? atual.variaveisPermitidas
        : [...atual.variaveisPermitidas, variavel];
      if (campoAtivo === "assunto") {
        return { ...atual, assunto: `${atual.assunto ?? ""}${chave}`, variaveisPermitidas };
      }
      return { ...atual, mensagemBase: `${atual.mensagemBase}${chave}`, variaveisPermitidas };
    });
  }

  async function confirmar() {
    await onSalvar(form);
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {modo === "criar" ? "Nova mensagem" : modo === "editar" ? "Editar mensagem" : "Visualizar mensagem"}
            </h3>
            <p className="text-sm text-[var(--g3-muted)]">Gerencie títulos, canais, destinatários e conteúdo reutilizável.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </div>
        <div className="grid flex-1 gap-4 overflow-y-auto p-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="grid gap-3 md:grid-cols-2 xl:min-w-0">
            <div className="space-y-1 md:col-span-2">
              <Label>Título</Label>
              <Input value={form.titulo} disabled={somenteLeitura} onChange={(e) => setForm((v) => ({ ...v, titulo: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Assunto</Label>
              <Input value={form.assunto ?? ""} disabled={somenteLeitura} onFocus={() => setCampoAtivo("assunto")} onChange={(e) => setForm((v) => ({ ...v, assunto: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={form.categoriaId ?? ""} disabled={somenteLeitura} onChange={(e) => setForm((v) => ({ ...v, categoriaId: e.target.value }))}>
                <option value="">Selecione</option>
                {categorias.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Assunto</Label>
              <Select value={form.assuntoId ?? ""} disabled={somenteLeitura} onChange={(e) => setForm((v) => ({ ...v, assuntoId: e.target.value }))}>
                <option value="">Selecione</option>
                {assuntos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de comunicação</Label>
              <Select value={form.tipoComunicacaoId ?? ""} disabled={somenteLeitura} onChange={(e) => setForm((v) => ({ ...v, tipoComunicacaoId: e.target.value }))}>
                <option value="">Selecione</option>
                {tiposComunicacao.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Canal permitido</Label>
              <Select value={form.canalPermitido} disabled={somenteLeitura} onChange={(e) => setForm((v) => ({ ...v, canalPermitido: e.target.value as any }))}>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">E-mail</option>
                <option value="AMBOS">Ambos</option>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Tipos de destinatário</Label>
              <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--g3-border)] p-3">
                {["BENEFICIARIO", "PROFISSIONAL", "COLABORADOR", "VOLUNTARIO", "DOADOR", "INSTITUICAO"].map((tipo) => {
                  const ativo = form.tiposDestinatario.includes(tipo as any);
                  return (
                    <button
                      key={tipo}
                      type="button"
                      disabled={somenteLeitura}
                      onClick={() =>
                        setForm((atual) => ({
                          ...atual,
                          tiposDestinatario: ativo
                            ? atual.tiposDestinatario.filter((item) => item !== tipo)
                            : [...atual.tiposDestinatario, tipo as any]
                        }))
                      }
                      className={`rounded-full px-3 py-1 text-xs font-medium ${ativo ? "bg-[var(--g3-primary-button)] text-white" : "bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"}`}
                    >
                      {tipo.replaceAll("_", " ")}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Mensagem base</Label>
              <Textarea rows={9} value={form.mensagemBase} disabled={somenteLeitura} onFocus={() => setCampoAtivo("mensagemBase")} onChange={(e) => setForm((v) => ({ ...v, mensagemBase: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Observações internas</Label>
              <Textarea rows={3} value={form.observacoesInternas ?? ""} disabled={somenteLeitura} onChange={(e) => setForm((v) => ({ ...v, observacoesInternas: e.target.value }))} />
            </div>
          </section>
          <section className="space-y-4 xl:min-w-0">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Variáveis dinâmicas</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {placeholders.map((item) => (
                  <button key={item.chave} type="button" onClick={() => inserirPlaceholder(`{${item.chave}}`)} className="rounded-full bg-[var(--g3-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--g3-active)]">
                    {`{${item.chave}}`}
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tags sugeridas</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {tags.map((item) => (
                  <button key={item.id} type="button" disabled={somenteLeitura} onClick={() => setForm((atual) => ({ ...atual, tags: atual.tags.includes(item.nome) ? atual.tags.filter((tag) => tag !== item.nome) : [...atual.tags, item.nome] }))} className={`rounded-full px-3 py-1 text-xs font-medium ${form.tags.includes(item.nome) ? "bg-[var(--g3-primary-button)] text-white" : "bg-slate-100 text-slate-700"}`}>
                    {item.nome}
                  </button>
                ))}
              </CardContent>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} disabled={somenteLeitura} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value as MensagemStatus }))}>
                  <option value="ATIVA">Ativa</option>
                  <option value="INATIVA">Inativa</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Origem para exibição</Label>
                <Input value={rotuloOrigem(modelo)} disabled />
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-[var(--g3-border)] p-3">
              <p className="text-sm font-semibold text-slate-900">Marcação da mensagem</p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox
                  checked={form.mensagemPadraoSistema}
                  disabled={somenteLeitura}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      mensagemPadraoSistema: event.target.checked
                    }))
                  }
                />
                Mensagem padrão do sistema
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox
                  checked={form.mensagemPersonalizadaUsuario}
                  disabled={somenteLeitura}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      mensagemPersonalizadaUsuario: event.target.checked
                    }))
                  }
                />
                Mensagem personalizada do usuário
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox
                  checked={form.mensagemSugeridaIa}
                  disabled={somenteLeitura}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      mensagemSugeridaIa: event.target.checked
                    }))
                  }
                />
                Mensagem sugerida pela IA
              </label>
            </div>
            {somenteLeitura ? null : (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={() => void confirmar()} disabled={salvando}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {salvando ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function MensagensPersonalizadasPage() {
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("dashboard");
  const [filtros, setFiltros] = useState<MensagemModeloFiltros>({
    busca: "",
    status: undefined,
    somenteAtivas: false,
    destinatario: undefined,
    canal: undefined,
    categoriaId: undefined
  });
  const [filtrosHistorico, setFiltrosHistorico] = useState<MensagemHistoricoFiltros>({
    busca: "",
    canal: undefined,
    destinatarioTipo: undefined,
    usuario: "",
    status: undefined,
    dataInicio: "",
    dataFim: ""
  });
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [modoDialog, setModoDialog] = useState<ModeloModo>("criar");
  const [modeloAtual, setModeloAtual] = useState<MensagemModelo | undefined>();
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState<string>();
  const [taxonomiaEdicao, setTaxonomiaEdicao] = useState<MensagemTaxonomia | null>(null);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<string>();
  const [taxonomiaForm, setTaxonomiaForm] = useState({ tipo: "CATEGORIA" as MensagemTaxonomiaTipo, nome: "", descricao: "", status: "ATIVA" as MensagemStatus });

  const suporteQuery = useMensagensPersonalizadasSuporte();
  const taxonomiasQuery = useMensagensPersonalizadasTaxonomias();
  const modelosQuery = useMensagensPersonalizadasModelos({
    ...filtros,
    somenteIa: abaAtiva === "sugestoes-ia" ? true : filtros.somenteIa
  });
  const historicoQuery = useMensagensPersonalizadasHistorico(
    {
      ...filtrosHistorico,
      busca: filtrosHistorico.busca?.trim() || undefined,
      usuario: filtrosHistorico.usuario?.trim() || undefined,
      dataInicio: filtrosHistorico.dataInicio || undefined,
      dataFim: filtrosHistorico.dataFim || undefined
    },
    abaAtiva === "historico"
  );
  const salvarMutation = useSalvarMensagemPersonalizada();
  const duplicarMutation = useDuplicarMensagemPersonalizada();
  const statusMutation = useAtualizarStatusMensagemPersonalizada();
  const removerMutation = useRemoverMensagemPersonalizada();
  const salvarTaxonomiaMutation = useSalvarTaxonomiaMensagem();
  const removerTaxonomiaMutation = useRemoverTaxonomiaMensagem();

  const modelos = modelosQuery.data ?? [];
  const taxonomias = taxonomiasQuery.data ?? [];
  const placeholders = suporteQuery.data?.placeholders ?? [];
  const sugestoesIa = modelos.filter((item) => item.mensagemSugeridaIa);
  const historico = historicoQuery.data ?? [];

  const metricas = useMemo(() => {
    const total = historico.length;
    const enviados = historico.filter((item) => item.status === "ENVIADO").length;
    const preparados = historico.filter((item) => item.status === "PREPARADO").length;
    const rejeitados = historico.filter((item) => item.status === "ERRO").length;
    const porMensagem = historico.reduce<Record<string, number>>((acc, item) => {
      acc[item.nomeMensagem] = (acc[item.nomeMensagem] ?? 0) + 1;
      return acc;
    }, {});
    const maisEnviadas = Object.entries(porMensagem).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total, enviados, preparados, rejeitados, maisEnviadas };
  }, [historico]);

  const podeEditar = (usuario?.permissoes ?? []).some((permissao) =>
    ["ADMINISTRADOR", "OPERADOR", "MENSAGENS_PERSONALIZADAS_CADASTRAR", "MENSAGENS_PERSONALIZADAS_EDITAR"].includes(permissao)
  );

  const acoes: AdminAction[] = [
    {
      label: "Nova mensagem",
      icon: Plus,
      onClick: () => {
        setModoDialog("criar");
        setModeloAtual(undefined);
        setDialogAberto(true);
      },
      variant: "default",
      disabled: !podeEditar
    },
    {
      label: "Atualizar",
      icon: RefreshCcw,
      onClick: () => {
        void modelosQuery.refetch();
        void taxonomiasQuery.refetch();
        if (abaAtiva === "historico") void historicoQuery.refetch();
      },
      variant: "outline"
    }
  ];

  async function salvarModelo(payload: MensagemModeloForm) {
    try {
      await salvarMutation.mutateAsync({ id: modoDialog === "editar" ? modeloAtual?.id : undefined, payload });
      setDialogAberto(false);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Mensagem salva com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar a mensagem." });
    }
  }

  async function duplicarModelo(id: string) {
    try {
      await duplicarMutation.mutateAsync(id);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Mensagem duplicada com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível duplicar a mensagem." });
    }
  }

  async function alternarStatus(modelo: MensagemModelo) {
    try {
      await statusMutation.mutateAsync({
        id: modelo.id,
        status: modelo.status === "ATIVA" ? "INATIVA" : "ATIVA"
      });
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: `Mensagem ${modelo.status === "ATIVA" ? "inativada" : "ativada"} com sucesso.`
      });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível atualizar o status." });
    }
  }

  async function salvarTaxonomia() {
    try {
      await salvarTaxonomiaMutation.mutateAsync({ id: taxonomiaEdicao?.id, payload: taxonomiaForm });
      setTaxonomiaEdicao(null);
      setTaxonomiaForm({ tipo: "CATEGORIA", nome: "", descricao: "", status: "ATIVA" });
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Taxonomia salva com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar a taxonomia." });
    }
  }

  async function removerTaxonomia(id: string) {
    try {
      await removerTaxonomiaMutation.mutateAsync(id);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Taxonomia removida com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível remover a taxonomia." });
    }
  }

  return (
    <>
      <AdminPageLayout tabs={abas} activeTab={abaAtiva} onChangeTab={(tab) => setAbaAtiva(tab as AbaId)} actions={acoes} sectionLabel="Configurações gerais" pageTitle="Mensagens personalizadas" activeTitle={abas.find((item) => item.id === abaAtiva)?.label}>
        <Card className="border-dashed">
          <CardContent className="py-4 text-sm text-[var(--g3-muted)]">
            Central de comunicação inteligente: envie mensagens para beneficiários, voluntários e doadores via WhatsApp ou E-mail, organize modelos reutilizáveis e acompanhe o histórico.
          </CardContent>
        </Card>

        {abaAtiva === "dashboard" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {[
                ["Total de registros", metricas.total, "bg-slate-50 text-slate-800"],
                ["Enviadas", metricas.enviados, "bg-emerald-50 text-emerald-700"],
                ["Não enviadas / preparadas", metricas.preparados, "bg-blue-50 text-blue-700"],
                ["Rejeitadas / falhas", metricas.rejeitados, "bg-rose-50 text-rose-700"],
                ["Devolvidas", 0, "bg-amber-50 text-amber-700"],
                ["Mensagens ativas", modelos.filter((item) => item.status === "ATIVA").length, "bg-violet-50 text-violet-700"]
              ].map(([label, value, style]) => (
                <Card key={String(label)} className={String(style)}><CardContent className="p-5">
                  <p className="text-sm font-medium opacity-80">{label}</p>
                  <p className="mt-2 text-3xl font-bold">{value}</p>
                </CardContent></Card>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Card><CardHeader><CardTitle className="text-base">Mensagens mais utilizadas</CardTitle></CardHeader><CardContent>
                {metricas.maisEnviadas.length ? <div className="space-y-3">{metricas.maisEnviadas.map(([nome, quantidade], index) => (
                  <div key={nome} className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--g3-primary-soft)] text-xs font-bold text-[var(--g3-active)]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{nome}</span><span className="text-sm font-bold">{quantidade}</span></div>
                ))}</div> : <p className="text-sm text-[var(--g3-muted)]">Ainda não há registros de envio para analisar.</p>}
              </CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Canais utilizados</CardTitle></CardHeader><CardContent className="space-y-4">
                {(["WHATSAPP", "EMAIL"] as const).map((canal) => { const total = historico.filter((item) => item.canal === canal).length; const percentual = metricas.total ? Math.round((total / metricas.total) * 100) : 0; return <div key={canal}><div className="mb-1 flex justify-between text-sm"><span>{canal === "WHATSAPP" ? "WhatsApp" : "E-mail"}</span><strong>{total} ({percentual}%)</strong></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[var(--g3-primary-button)]" style={{ width: `${percentual}%` }} /></div></div>; })}
              </CardContent></Card>
            </div>
            <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">Acompanhe a operação em tempo real</p><p className="text-sm text-[var(--g3-muted)]">O dashboard usa o histórico registrado por destinatário, canal e mensagem.</p></div><Button variant="outline" onClick={() => { setAbaAtiva("historico"); void historicoQuery.refetch(); }}><History className="mr-2 h-4 w-4" />Ver histórico detalhado</Button></CardContent></Card>
          </div>
        )}

        {abaAtiva === "envio" && (
          <MensagemEnvioDialog
            inline
            onFeedback={({ tipo, texto }) =>
              setPopup({ tipo, titulo: "Mensagens personalizadas", texto })
            }
          />
        )}

        {abaAtiva === "pre-prontas" && (
          <div className="space-y-4">
            <Card className="bg-slate-50"><CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px_180px_auto]"><Input value={filtros.busca ?? ""} onChange={(e) => setFiltros((v) => ({ ...v, busca: e.target.value }))} placeholder="Buscar por título ou conteúdo" /><Select value={filtros.canal ?? ""} onChange={(e) => setFiltros((v) => ({ ...v, canal: (e.target.value || undefined) as any }))}><option value="">Todos os canais</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">E-mail</option></Select><Select value={filtros.status ?? ""} onChange={(e) => setFiltros((v) => ({ ...v, status: (e.target.value || undefined) as any }))}><option value="">Todos os status</option><option value="ATIVA">Ativas</option><option value="INATIVA">Inativas</option></Select><Button variant="outline" onClick={() => setFiltros({ busca: "", status: undefined, somenteAtivas: false, destinatario: undefined, canal: undefined, categoriaId: undefined })}><FilterX className="mr-2 h-4 w-4" />Limpar filtros</Button></CardContent></Card>
            <Card><CardContent className="overflow-x-auto p-0"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)]/60"><tr>{["Mensagem", "Categoria", "Canais", "Status", "Ações"].map((label) => <th key={label} className="px-4 py-3 text-left font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--g3-border)]">{modelos.length ? modelos.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3"><p className="font-semibold">{item.titulo}</p><p className="line-clamp-1 max-w-lg text-xs text-[var(--g3-muted)]">{item.mensagemBase}</p></td><td className="px-4 py-3">{item.categoria ?? "Sem categoria"}</td><td className="px-4 py-3">{item.canaisPermitidos.map(rotuloCanal).join(" e ")}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${item.status === "ATIVA" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{rotuloStatus(item.status)}</span></td><td className="px-4 py-3"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => { setModeloAtual(item); setModoDialog("visualizar"); setDialogAberto(true); }} title="Visualizar"><Search className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => { setModeloAtual(item); setModoDialog("editar"); setDialogAberto(true); }} title="Editar"><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => void duplicarModelo(item.id)} title="Duplicar"><Plus className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => void alternarStatus(item)} title="Ativar ou inativar"><RefreshCcw className="h-4 w-4" /></Button></div></td></tr>) : <tr><td colSpan={5} className="px-4 py-10 text-center text-[var(--g3-muted)]">Nenhuma mensagem pré-pronta encontrada.</td></tr>}</tbody></table></CardContent></Card>
          </div>
        )}

        {abaAtiva === "categorias" && (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Card><CardHeader><CardTitle className="text-base">{taxonomiaEdicao ? "Editar item" : "Novo item"}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="space-y-1"><Label>Tipo</Label><Select value={taxonomiaForm.tipo} onChange={(e) => setTaxonomiaForm((v) => ({ ...v, tipo: e.target.value as MensagemTaxonomiaTipo }))} disabled={!!taxonomiaEdicao}><option value="CATEGORIA">Categoria</option><option value="ASSUNTO">Assunto</option><option value="TIPO_COMUNICACAO">Tipo de comunicação</option><option value="TAG">Tag</option></Select></div><div className="space-y-1"><Label>Nome</Label><Input value={taxonomiaForm.nome} onChange={(e) => setTaxonomiaForm((v) => ({ ...v, nome: e.target.value }))} placeholder="Ex.: Lembretes" /></div><div className="space-y-1"><Label>Descrição</Label><Textarea rows={3} value={taxonomiaForm.descricao} onChange={(e) => setTaxonomiaForm((v) => ({ ...v, descricao: e.target.value }))} /></div><div className="flex gap-2"><Button onClick={() => void salvarTaxonomia()} disabled={salvarTaxonomiaMutation.isPending || taxonomiaForm.nome.trim().length < 2}>{salvarTaxonomiaMutation.isPending ? "Salvando..." : "Salvar item"}</Button>{taxonomiaEdicao ? <Button variant="outline" onClick={() => { setTaxonomiaEdicao(null); setTaxonomiaForm({ tipo: "CATEGORIA", nome: "", descricao: "", status: "ATIVA" }); }}>Cancelar</Button> : null}</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Categorias, assuntos e tags</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2">{taxonomias.map((item) => <div key={item.id} className="rounded-xl border border-[var(--g3-border)] p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{item.nome}</p><p className="text-xs text-[var(--g3-muted)]">{rotuloTaxonomia(item.tipo)} · {item.descricao || "Sem descrição"}</p></div><span className="text-xs text-emerald-700">{rotuloStatus(item.status)}</span></div><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => { setTaxonomiaEdicao(item); setTaxonomiaForm({ tipo: item.tipo, nome: item.nome, descricao: item.descricao ?? "", status: item.status }); }}>Editar</Button><Button size="sm" variant="ghost" className="text-rose-600" onClick={() => void removerTaxonomia(item.id)}>Remover</Button></div></div>)}</div></CardContent></Card>
          </div>
        )}

        {abaAtiva === "configuracao" && (
          <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Canais de envio</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold text-emerald-800">E-mail</p><p className="text-sm text-emerald-700">{suporteQuery.data?.integracoes.emailHabilitado ? "Integração habilitada para envio transacional." : "Integração ainda não habilitada."}</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-800">WhatsApp</p><p className="text-sm text-amber-700">{suporteQuery.data?.integracoes.whatsappProviderHabilitado ? "Provedor conectado." : "Modo atual: link preparado. O envio é conferido e aberto no WhatsApp."}</p></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Regras de segurança</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-[var(--g3-muted)]"><p>• A mensagem final é montada com as variáveis do destinatário antes do disparo.</p><p>• A prévia deve ser conferida antes de liberar o envio.</p><p>• Cada destinatário gera um registro próprio no histórico, incluindo conteúdo, canal e resultado.</p><p>• Falhas de contato são rejeitadas e ficam disponíveis para análise.</p></CardContent></Card></div>
        )}

        {abaAtiva === "sugestoes-ia" && (
          <div className="space-y-4">
            <Card className="bg-slate-50">
              <CardContent className="py-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Público alvo</Label>
                    <Select value={filtros.destinatario ?? ""} onChange={(e) => setFiltros(v => ({...v, destinatario: e.target.value as any}))}>
                      <option value="">Selecione</option>
                      <option value="BENEFICIARIO">Beneficiários</option>
                      <option value="VOLUNTARIO">Voluntários</option>
                      <option value="DOADOR">Doadores</option>
                      <option value="PROFISSIONAL">Profissionais</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Objetivo</Label>
                    <Select>
                      {objetivosIA.map(obj => <option key={obj.id} value={obj.id}>{obj.label}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Tom da mensagem</Label>
                    <Select>
                      {tonsVozIA.map(tom => <option key={tom.id} value={tom.id}>{tom.label}</option>)}
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Gerar sugestão com IA
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {sugestoesIa.length ? sugestoesIa.map((item) => (
                <Card key={item.id} className="group relative overflow-hidden transition-all hover:border-indigo-300 hover:shadow-md">
                  <div className="absolute top-0 left-0 h-1 w-full bg-indigo-500 opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold text-slate-900">{item.titulo}</CardTitle>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => void duplicarModelo(item.id)} title="Transformar em pré-pronta">
                          <Plus className="h-4 w-4 text-indigo-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">{item.canalPermitido}</span>
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 uppercase">{item.categoria ?? "Informativo"}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="line-clamp-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 italic border border-slate-100">
                      "{item.mensagemBase}"
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setModoDialog("visualizar"); setModeloAtual(item); setDialogAberto(true); }}>Visualizar tudo</Button>
                      <Button size="sm" className="bg-indigo-600" onClick={() => { setModoDialog("editar"); setModeloAtual(item); setDialogAberto(true); }}>Editar e Salvar</Button>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-slate-400">
                  <Sparkles className="mb-3 h-12 w-12 opacity-20" />
                  <p>Defina o público e o tom acima para gerar sugestões inteligentes.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {abaAtiva === "historico" && (
          <div className="space-y-4">
            <Card className="bg-slate-50">
              <CardContent className="py-4">
                <div className="grid gap-3 md:grid-cols-5">
                  <div className="space-y-1">
                    <Label>Início</Label>
                    <Input type="date" value={filtrosHistorico.dataInicio} onChange={e => setFiltrosHistorico(v => ({...v, dataInicio: e.target.value}))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Fim</Label>
                    <Input type="date" value={filtrosHistorico.dataFim} onChange={e => setFiltrosHistorico(v => ({...v, dataFim: e.target.value}))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={filtrosHistorico.status} onChange={e => setFiltrosHistorico(v => ({...v, status: e.target.value as any}))}>
                      <option value="">Todos</option>
                      <option value="ENVIADO">Enviado</option>
                      <option value="ERRO">Falha</option>
                      <option value="PREPARADO">Preparado</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Canal</Label>
                    <Select value={filtrosHistorico.canal} onChange={e => setFiltrosHistorico(v => ({...v, canal: e.target.value as any}))}>
                      <option value="">Todos</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">E-mail</option>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" className="w-full" onClick={() => setFiltrosHistorico({busca: "", canal: undefined, destinatarioTipo: undefined, usuario: "", status: undefined, dataInicio: "", dataFim: ""})}>
                      <FilterX className="mr-2 h-4 w-4" />
                      Limpar filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="overflow-hidden rounded-xl border border-[var(--g3-border)] bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)]/60 text-[var(--g3-active)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Data/Hora</th>
                    <th className="px-4 py-3 text-left font-bold">Destinatário</th>
                    <th className="px-4 py-3 text-left font-bold">Canal</th>
                    <th className="px-4 py-3 text-left font-bold">Mensagem</th>
                    <th className="px-4 py-3 text-left font-bold">Status</th>
                    <th className="px-4 py-3 text-right font-bold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--g3-border)]">
                  {historico.length ? historico.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-600">{formatarDataHora(item.criado_em)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{item.destinatarioNome ?? "---"}</span>
                          <span className="text-xs text-[var(--g3-muted)] uppercase">{item.destinatarioTipo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {item.canal === "WHATSAPP" ? <MessageCircle className="h-4 w-4 text-emerald-600" /> : <Mail className="h-4 w-4 text-blue-600" />}
                          <span className="text-xs font-medium">{item.canal}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.nomeMensagem}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          item.status === "ENVIADO" ? "bg-emerald-50 text-emerald-700" : 
                          item.status === "ERRO" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {item.status === "ERRO" ? "FALHA" : item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Ver detalhes" onClick={() => setHistoricoSelecionado(item.id)}><Search className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-indigo-600" title="Reenviar"><RefreshCcw className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">Nenhum registro de envio encontrado para os filtros selecionados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {historicoSelecionado ? (() => { const item = historico.find((registro) => registro.id === historicoSelecionado); if (!item) return null; return <Card className="border-[var(--g3-active)]"><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Detalhes do envio</CardTitle><p className="text-sm text-[var(--g3-muted)]">{item.nomeMensagem} · {item.destinatarioNome ?? "Destinatário não identificado"}</p></div><Button variant="ghost" onClick={() => setHistoricoSelecionado(undefined)}>Fechar</Button></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><div><p className="text-xs text-[var(--g3-muted)]">Contato</p><p className="text-sm font-medium">{item.destinatarioContato ?? "Não informado"}</p></div><div><p className="text-xs text-[var(--g3-muted)]">Assunto</p><p className="text-sm font-medium">{item.assuntoFinal ?? "Sem assunto"}</p></div><div><p className="text-xs text-[var(--g3-muted)]">Status</p><p className="text-sm font-medium">{item.status === "ERRO" ? item.erroObservacao ?? "Falha no envio" : item.status === "PREPARADO" ? "Link preparado para WhatsApp" : "Mensagem enviada"}</p></div><div className="md:col-span-3"><p className="text-xs text-[var(--g3-muted)]">Mensagem registrada</p><p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{item.mensagemFinal ?? "Sem conteúdo registrado"}</p></div></CardContent></Card>; })() : null}
          </div>
        )}
      </AdminPageLayout>

      <ModeloDialog aberto={dialogAberto} modo={modoDialog} modelo={modeloAtual} placeholders={placeholders} taxonomias={taxonomias} salvando={salvarMutation.isPending} onClose={() => setDialogAberto(false)} onSalvar={salvarModelo} />
      
      <PopupConfirmacao aberto={!!confirmarExclusaoId} titulo="Confirmar exclusão" texto="Esta ação é irreversível. Deseja continuar?" processando={removerMutation.isPending} onCancel={() => setConfirmarExclusaoId(undefined)} onConfirm={() => { if (!confirmarExclusaoId) return; void removerMutation.mutateAsync(confirmarExclusaoId).then(() => setConfirmarExclusaoId(undefined)); }} confirmarTexto="Excluir" />
      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}
