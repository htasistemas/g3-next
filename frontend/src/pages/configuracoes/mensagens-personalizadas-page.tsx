import { useEffect, useMemo, useState } from "react";
import {
  BookText,
  FilterX,
  History,
  MailPlus,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
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
  { id: "pre-prontas", label: "Mensagens pré-prontas", icon: BookText },
  { id: "sugestoes-ia", label: "Sugestões da IA", icon: Sparkles },
  { id: "categorias", label: "Categorias e assuntos", icon: Tags },
  { id: "historico", label: "Histórico / utilização", icon: History }
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
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("pre-prontas");
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
  const [envioAberto, setEnvioAberto] = useState(false);
  const [modoDialog, setModoDialog] = useState<ModeloModo>("criar");
  const [modeloAtual, setModeloAtual] = useState<MensagemModelo | undefined>();
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState<string>();
  const [taxonomiaEdicao, setTaxonomiaEdicao] = useState<MensagemTaxonomia | null>(null);
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
    { label: "Preparar envio", icon: MailPlus, onClick: () => setEnvioAberto(true), variant: "outline" },
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
            Centralize mensagens reutilizáveis para WhatsApp e e-mail, com sugestões iniciais, organização por categorias e rastreio de uso.
          </CardContent>
        </Card>
        <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1"><Label>Buscar</Label><Input value={filtros.busca ?? ""} onChange={(e) => setFiltros((v) => ({ ...v, busca: e.target.value }))} placeholder="Título, assunto ou conteúdo" /></div>
            <div className="space-y-1"><Label>Status</Label><Select value={filtros.status ?? ""} onChange={(e) => setFiltros((v) => ({ ...v, status: e.target.value ? (e.target.value as MensagemStatus) : undefined }))}><option value="">Todos</option><option value="ATIVA">Ativa</option><option value="INATIVA">Inativa</option></Select></div>
            <div className="space-y-1"><Label>Categoria</Label><Select value={filtros.categoriaId ?? ""} onChange={(e) => setFiltros((v) => ({ ...v, categoriaId: e.target.value || undefined }))}><option value="">Todas</option>{taxonomias.filter((i) => i.tipo === "CATEGORIA").map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select></div>
            <div className="space-y-1"><Label>Canal</Label><Select value={filtros.canal ?? ""} onChange={(e) => setFiltros((v) => ({ ...v, canal: e.target.value ? (e.target.value as any) : undefined }))}><option value="">Todos</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">E-mail</option></Select></div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[var(--g3-border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
              <tr>
                <th className="px-3 py-2 text-left">Título</th>
                <th className="px-3 py-2 text-left">Assunto</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-left">Destinatário</th>
                <th className="px-3 py-2 text-left">Canal</th>
                <th className="px-3 py-2 text-left">Situação</th>
                <th className="px-3 py-2 text-left">Atualização</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(abaAtiva === "sugestoes-ia" ? sugestoesIa : modelos).map((item, index) => (
                <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-white" : "bg-[var(--g3-primary-soft)]/25"}`}>
                  <td className="px-3 py-2">{item.titulo}</td>
                  <td className="px-3 py-2">{item.assunto ?? "---"}</td>
                  <td className="px-3 py-2">{item.categoria ?? "---"}</td>
                  <td className="px-3 py-2">{item.tiposDestinatario.join(", ")}</td>
                  <td className="px-3 py-2">{item.canalPermitido}</td>
                  <td className="px-3 py-2">{rotuloStatus(item.status)}</td>
                  <td className="px-3 py-2">{formatarDataHora(item.atualizado_em)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setModoDialog("visualizar"); setModeloAtual(item); setDialogAberto(true); }}>Visualizar</Button>
                      <Button size="sm" variant="outline" onClick={() => { setModoDialog("editar"); setModeloAtual(item); setDialogAberto(true); }} disabled={!podeEditar}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => void duplicarMutation.mutateAsync(item.id)} disabled={!podeEditar}><Plus className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => void statusMutation.mutateAsync({ id: item.id, status: item.status === "ATIVA" ? "INATIVA" : "ATIVA" })} disabled={!podeEditar}>{item.status === "ATIVA" ? "Inativar" : "Ativar"}</Button>
                      <Button size="sm" variant="danger" onClick={() => setConfirmarExclusaoId(item.id)} disabled={!podeEditar}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {abaAtiva === "categorias" ? (
          <div className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
            <Card>
              <CardHeader><CardTitle className="text-sm">Cadastro de taxonomia</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1"><Label>Tipo</Label><Select value={taxonomiaForm.tipo} onChange={(e) => setTaxonomiaForm((v) => ({ ...v, tipo: e.target.value as MensagemTaxonomiaTipo }))}><option value="CATEGORIA">Categoria</option><option value="ASSUNTO">Assunto</option><option value="TIPO_COMUNICACAO">Tipo de comunicação</option><option value="TAG">Tag</option></Select></div>
                <div className="space-y-1"><Label>Nome</Label><Input value={taxonomiaForm.nome} onChange={(e) => setTaxonomiaForm((v) => ({ ...v, nome: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Descrição</Label><Textarea rows={3} value={taxonomiaForm.descricao} onChange={(e) => setTaxonomiaForm((v) => ({ ...v, descricao: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Status</Label><Select value={taxonomiaForm.status} onChange={(e) => setTaxonomiaForm((v) => ({ ...v, status: e.target.value as MensagemStatus }))}><option value="ATIVA">Ativa</option><option value="INATIVA">Inativa</option></Select></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setTaxonomiaEdicao(null); setTaxonomiaForm({ tipo: "CATEGORIA", nome: "", descricao: "", status: "ATIVA" }); }}>Limpar</Button>
                  <Button onClick={() => void salvarTaxonomiaMutation.mutateAsync({ id: taxonomiaEdicao?.id, payload: taxonomiaForm })}>{taxonomiaEdicao ? "Atualizar" : "Cadastrar"}</Button>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              {(["CATEGORIA", "ASSUNTO", "TIPO_COMUNICACAO", "TAG"] as MensagemTaxonomiaTipo[]).map((tipo) => (
                <Card key={tipo}>
                  <CardHeader><CardTitle className="text-sm">{rotuloTaxonomia(tipo)}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {taxonomias.filter((item) => item.tipo === tipo).map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] px-3 py-2 text-sm">
                        <div><p className="font-medium text-slate-900">{item.nome}</p><p className="text-xs text-[var(--g3-muted)]">{rotuloStatus(item.status)}</p></div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setTaxonomiaEdicao(item); setTaxonomiaForm({ tipo: item.tipo, nome: item.nome, descricao: item.descricao ?? "", status: item.status }); }}>Editar</Button>
                          <Button size="sm" variant="danger" onClick={() => void removerTaxonomiaMutation.mutateAsync(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
        {abaAtiva === "historico" ? (
          <div className="overflow-x-auto rounded-xl border border-[var(--g3-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data/Hora</th><th className="px-3 py-2 text-left">Canal</th><th className="px-3 py-2 text-left">Destinatário</th><th className="px-3 py-2 text-left">Mensagem</th><th className="px-3 py-2 text-left">Usuário</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
              <tbody>{historico.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-white" : "bg-[var(--g3-primary-soft)]/25"}`}><td className="px-3 py-2">{formatarDataHora(item.criado_em)}</td><td className="px-3 py-2">{item.canal}</td><td className="px-3 py-2">{item.destinatarioNome ?? "---"}</td><td className="px-3 py-2">{item.nomeMensagem}</td><td className="px-3 py-2">{item.usuarioNome ?? "---"}</td><td className="px-3 py-2">{item.tipoEnvio}</td><td className="px-3 py-2">{item.status}</td></tr>)}</tbody>
            </table>
          </div>
        ) : null}
      </AdminPageLayout>

      <ModeloDialog aberto={dialogAberto} modo={modoDialog} modelo={modeloAtual} placeholders={placeholders} taxonomias={taxonomias} salvando={salvarMutation.isPending} onClose={() => setDialogAberto(false)} onSalvar={salvarModelo} />
      <MensagemEnvioDialog
        aberto={envioAberto}
        onClose={() => setEnvioAberto(false)}
        onFeedback={({ tipo, texto }) =>
          setPopup({ tipo, titulo: "Mensagens personalizadas", texto })
        }
      />
      <PopupConfirmacao aberto={!!confirmarExclusaoId} titulo="Confirmar exclusão" texto="Esta ação é irreversível. Deseja continuar?" processando={removerMutation.isPending} onCancel={() => setConfirmarExclusaoId(undefined)} onConfirm={() => { if (!confirmarExclusaoId) return; void removerMutation.mutateAsync(confirmarExclusaoId).then(() => setConfirmarExclusaoId(undefined)); }} confirmarTexto="Excluir" />
      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}
