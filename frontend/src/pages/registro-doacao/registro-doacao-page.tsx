import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  DollarSign,
  HandHeart,
  ListChecks,
  MessageSquare,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  UserPlus,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MensagemAcoesRapidas } from "@/components/mensagens-personalizadas/mensagem-acoes-rapidas";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  registroDoacaoDefaultValues,
  registroDoacaoFormSchema,
  statusRegistroDoacaoOptions,
  tipoDoacaoOptions,
  type RegistroDoacaoFormInput,
  type RegistroDoacaoFormValues
} from "@/features/registro-doacao/registro-doacao.schema";
import {
  useCriarDoador,
  useDoadores,
  useRegistroDoacao,
  useRegistrosDoacao,
  useRemoverDoador,
  useRemoverRegistroDoacao,
  useSalvarRegistroDoacao
} from "@/features/registro-doacao/use-registro-doacao";
import { reportsService } from "@/services/reports.service";
import { abrirRelatorioPdf } from "@/lib/report-utils";
import { formatarTextoPorCampo } from "@/lib/text-formatter";
import {
  mapaCamposTextoDoadorForm,
  mapaCamposTextoRegistroDoacaoForm
} from "@/lib/text-format-config";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario,
  ordemAcoesCrudPadrao
} from "@/lib/tela-padrao-beneficiario";
import { somenteDigitos } from "@/lib/validators";
import { useAuth } from "@/hooks/use-auth";
import type {
  Doador,
  RegistroDoacao,
  RegistroDoacaoFiltro,
  RegistroDoacaoItem
} from "@/types/registro-doacao";

const abas = [
  { id: "listagem", label: "Listagem de doações", icon: ClipboardList },
  { id: "doador", label: "Cadastro do doador", icon: UserPlus },
  { id: "dados", label: "Dados da doação", icon: DollarSign },
  { id: "recorrencia", label: "Recorrência", icon: ListChecks },
  { id: "gestao", label: "Gestão de doação", icon: MessageSquare },
  { id: "itens", label: "Itens recebidos", icon: HandHeart }
] as const;

type AbaId = (typeof abas)[number]["id"];

type AcaoCrud = {
  label: (typeof ordemAcoesCrudPadrao)[number];
  icon: LucideIcon;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  disabled?: boolean;
};

type PopupMensagemState = {
  tipo: "sucesso" | "erro" | "aviso";
  titulo: string;
  texto: string;
};

const secaoTela = "Setor financeiro";
const tituloTela = "Recebimento de doações";

function formatarData(data?: string) {
  if (!data) return "---";
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return data;
  return parsed.toLocaleDateString("pt-BR");
}

function PopupMensagem({ popup, onClose }: { popup: PopupMensagemState; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className={`text-base font-semibold ${popup.tipo === "erro" ? "text-rose-700" : "text-emerald-800"}`}>
            {popup.titulo}
          </h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-slate-700">{popup.texto}</p>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <Button type="button" onClick={onClose}>OK</Button>
        </div>
      </div>
    </div>
  );
}

export function RegistroDoacaoPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [idSelecionado, setIdSelecionado] = useState<string>();
  const [snapshot, setSnapshot] = useState<RegistroDoacaoFormValues | null>(null);
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [popupExcluirAberto, setPopupExcluirAberto] = useState(false);
  const [filtroDraft, setFiltroDraft] = useState<RegistroDoacaoFiltro>({
    doador_nome: "",
    tipo_doacao: "",
    status: "",
    data_inicial: "",
    data_final: ""
  });
  const [filtros, setFiltros] = useState<RegistroDoacaoFiltro>(filtroDraft);
  const [itens, setItens] = useState<RegistroDoacaoItem[]>([]);
  const [novoItem, setNovoItem] = useState<RegistroDoacaoItem>({ descricao: "", quantidade: 1 });
  const [termoDoador, setTermoDoador] = useState("");
  const [doadorForm, setDoadorForm] = useState<Doador>({ nome: "", tipo_pessoa: "FISICA" });
  const [canalGestao, setCanalGestao] = useState("WhatsApp");
  const [mensagemGestao, setMensagemGestao] = useState("");

  const { data: listaData, isLoading: carregandoLista } = useRegistrosDoacao(filtros);
  const { data: detalheData, isLoading: carregandoDetalhes } = useRegistroDoacao(idSelecionado);
  const { data: doadoresData, isFetching: carregandoDoadores } = useDoadores(termoDoador);

  const salvarMutation = useSalvarRegistroDoacao();
  const removerMutation = useRemoverRegistroDoacao();
  const criarDoadorMutation = useCriarDoador();
  const removerDoadorMutation = useRemoverDoador();

  const {
    register,
    reset,
    setValue,
    getValues,
    watch,
    handleSubmit,
    formState: { errors }
  } = useForm<RegistroDoacaoFormInput, unknown, RegistroDoacaoFormValues>({
    resolver: zodResolver(registroDoacaoFormSchema),
    defaultValues: registroDoacaoDefaultValues as RegistroDoacaoFormInput
  });

  const registros = listaData?.registros ?? [];
  const doadores = doadoresData?.doadores ?? [];
  const recorrente = !!watch("recorrente");
  const doadorSelecionadoId = watch("doador_id") || "";
  const doadorContatoAtual =
    doadores.find((item) => item.id_doador === doadorSelecionadoId) ??
    (doadorSelecionadoId && doadorForm.nome
      ? { ...doadorForm, id_doador: doadorSelecionadoId }
      : undefined);
  const acaoEmAndamento =
    salvarMutation.isPending || removerMutation.isPending || carregandoDetalhes || criarDoadorMutation.isPending;

  useEffect(() => {
    if (!detalheData?.registro) return;

    const formValues: RegistroDoacaoFormValues = {
      ...registroDoacaoDefaultValues,
      ...detalheData.registro,
      id_registro_doacao: detalheData.registro.id_registro_doacao,
      doador_id: detalheData.registro.doador_id ?? "",
      descricao: detalheData.registro.descricao ?? "",
      forma_recebimento: detalheData.registro.forma_recebimento ?? "",
      periodicidade: detalheData.registro.periodicidade ?? "",
      proxima_cobranca: detalheData.registro.proxima_cobranca ?? "",
      observacoes: detalheData.registro.observacoes ?? ""
    };

    reset(formValues);
    setSnapshot(formValues);
    setItens(detalheData.registro.itens ?? []);
    setAbaAtiva("dados");
  }, [detalheData, reset]);

  function aplicarFormatacaoRegistro(campo: keyof RegistroDoacaoFormValues) {
    const valor = getValues(campo);
    const formatado = formatarTextoPorCampo(campo, valor, mapaCamposTextoRegistroDoacaoForm);
    if (typeof valor === "string" && typeof formatado === "string" && valor !== formatado) {
      setValue(campo, formatado as RegistroDoacaoFormValues[typeof campo], {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }

  function buscar() {
    setFiltros({ ...filtroDraft });
  }

  function novo() {
    setIdSelecionado(undefined);
    setSnapshot(null);
    reset(registroDoacaoDefaultValues);
    setItens([]);
    setNovoItem({ descricao: "", quantidade: 1 });
    setCanalGestao("WhatsApp");
    setMensagemGestao("");
    setAbaAtiva("dados");
  }

  function cancelar() {
    reset(snapshot ?? registroDoacaoDefaultValues);
    setItens(detalheData?.registro?.itens ?? []);
  }

  function excluir() {
    if (!getValues("id_registro_doacao")) {
      setPopupMensagem({ tipo: "aviso", titulo: "Atenção", texto: "Selecione um registro para excluir." });
      return;
    }
    setPopupExcluirAberto(true);
  }

  async function confirmarExclusao() {
    const id = getValues("id_registro_doacao");
    if (!id) return;

    try {
      await removerMutation.mutateAsync(id);
      setPopupExcluirAberto(false);
      novo();
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Registro excluído com sucesso." });
    } catch (error: any) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível excluir." });
    }
  }

  async function imprimir() {
    try {
      const blob = await reportsService.gerarRelacaoRegistroDoacao({ ...filtros, usuarioEmissor: usuario?.nomeUsuario });
      abrirRelatorioPdf(blob);
    } catch (error: any) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.message ?? "Não foi possível gerar o relatório." });
    }
  }

  function fechar() {
    navigate("/dashboard/visao-geral");
  }

  function selecionarRegistro(id: string) {
    setIdSelecionado(id);
  }

  function adicionarItem() {
    const descricao = novoItem.descricao?.trim() ?? "";
    if (descricao.length < 2 || !novoItem.quantidade || novoItem.quantidade < 1) {
      setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Informe descrição e quantidade válida do item." });
      return;
    }

    const item: RegistroDoacaoItem = {
      ...novoItem,
      descricao,
      quantidade: Number(novoItem.quantidade),
      valor_unitario: novoItem.valor_unitario ? Number(novoItem.valor_unitario) : undefined,
      valor_total: novoItem.valor_total ? Number(novoItem.valor_total) : undefined
    };

    setItens((atual) => [...atual, item]);
    setNovoItem({ descricao: "", quantidade: 1 });
  }

  function removerItem(indice: number) {
    setItens((atual) => atual.filter((_, index) => index !== indice));
  }

  function aplicarTemplateGestao(tipo: "lembrete" | "agradecimento" | "transparencia") {
    const templates: Record<string, string> = {
      lembrete: "Olá! Passando para lembrar sobre a doação programada. Podemos ajudar em algo?",
      agradecimento: "Obrigado pelo apoio! Sua doação faz a diferença no atendimento social.",
      transparencia: "Segue um resumo da aplicação dos recursos recebidos. Obrigado pela parceria."
    };
    setMensagemGestao(templates[tipo]);
  }

  async function salvarRegistro(values: RegistroDoacaoFormValues) {
    try {
      const payload: RegistroDoacao = {
        ...values,
        doador_id: values.doador_id || undefined,
        quantidade_itens: values.quantidade_itens || itens.length,
        itens
      };

      const response = await salvarMutation.mutateAsync(payload);
      const formValues: RegistroDoacaoFormValues = {
        ...registroDoacaoDefaultValues,
        ...response.registro,
        id_registro_doacao: response.registro.id_registro_doacao,
        doador_id: response.registro.doador_id ?? "",
        descricao: response.registro.descricao ?? "",
        forma_recebimento: response.registro.forma_recebimento ?? "",
        periodicidade: response.registro.periodicidade ?? "",
        proxima_cobranca: response.registro.proxima_cobranca ?? "",
        observacoes: response.registro.observacoes ?? ""
      };

      reset(formValues);
      setSnapshot(formValues);
      setIdSelecionado(response.registro.id_registro_doacao);
      setItens(response.registro.itens ?? []);
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Registro salvo com sucesso." });
    } catch (error: any) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar." });
    }
  }

  async function salvarDoador() {
    const nome = doadorForm.nome?.trim() ?? "";
    if (nome.length < 3) {
      setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Informe o nome do doador." });
      return;
    }

    try {
      const payload: Doador = {
        ...doadorForm,
        nome,
        documento: doadorForm.documento ? somenteDigitos(doadorForm.documento) : undefined,
        telefone: doadorForm.telefone ? somenteDigitos(doadorForm.telefone) : undefined,
        cep: doadorForm.cep ? somenteDigitos(doadorForm.cep) : undefined
      };

      const response = await criarDoadorMutation.mutateAsync(payload);
      const doadorCriado = response.doador;
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Doador cadastrado com sucesso." });
      setAbaAtiva("dados");
      setDoadorForm({ nome: "", tipo_pessoa: "FISICA" });
      setValue("doador_id", doadorCriado.id_doador ?? "", { shouldDirty: true, shouldValidate: true });
      setTermoDoador(doadorCriado.nome ?? "");
    } catch (error: any) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível cadastrar o doador." });
    }
  }

  async function excluirDoador(id?: string) {
    if (!id) return;
    try {
      await removerDoadorMutation.mutateAsync(id);
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Doador removido com sucesso." });
    } catch (error: any) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível remover o doador." });
    }
  }

  const acoes: AcaoCrud[] = [
    { label: "Buscar", icon: Search, onClick: buscar, variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: acaoEmAndamento },
    { label: "Salvar", icon: Save, onClick: () => void handleSubmit(salvarRegistro)(), variant: "default", disabled: acaoEmAndamento },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: acaoEmAndamento },
    { label: "Excluir", icon: Trash2, onClick: excluir, variant: "danger", disabled: acaoEmAndamento },
    { label: "Imprimir", icon: Printer, onClick: () => void imprimir(), variant: "outline", disabled: acaoEmAndamento },
    { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
  ];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-4 lg:px-8">
      <div className={classesTelaPadraoBeneficiario.container}>
        <Card className={classesTelaPadraoBeneficiario.barraAcoes} data-print="toolbar">
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                  {secaoTela}
                </p>
                <h1 className="text-sm font-semibold tracking-tight text-[var(--g3-foreground)] sm:text-base">
                  {tituloTela}
                </h1>
              </div>

              <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
                {ordemAcoesCrudPadrao.map((ordem) => {
                  const acao = acoes.find((item) => item.label === ordem);
                  if (!acao) return null;
                  const Icone = acao.icon;
                  return (
                    <Button
                      key={acao.label}
                      type="button"
                      variant={acao.variant}
                      onClick={acao.onClick}
                      disabled={acao.disabled}
                      className={`${classesTelaPadraoBeneficiario.botaoAcao} h-8 px-3 py-1 text-xs`}
                    >
                      <Icone className="h-3.5 w-3.5" />
                      {acao.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={classesTelaPadraoBeneficiario.gradePrincipal} data-print="layout-grid">
          <Card className={classesTelaPadraoBeneficiario.cardAbas} data-print="tabs">
            <CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>
              {abas.map((aba, indice) => (
                <button key={aba.id} type="button" className={classeBotaoAbaLateral(abaAtiva === aba.id)} onClick={() => setAbaAtiva(aba.id)}>
                  <span className={classeNumeroAbaLateral(abaAtiva === aba.id)}>{indice + 1}</span>
                  <span className="min-w-0 break-words">{aba.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
            <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
              <CardTitle className={classesTelaPadraoBeneficiario.tituloAba}>
                <DollarSign className="h-4 w-4" />
                <span className={classesTelaPadraoBeneficiario.tituloAbaTexto}>{abas.find((aba) => aba.id === abaAtiva)?.label}</span>
              </CardTitle>
              <span className="rounded-full border border-[var(--g3-border)] bg-[var(--g3-card)] px-2 py-1 text-xs text-[var(--g3-muted)]">
                Código: {getValues("id_registro_doacao") ?? "---"}
              </span>
            </CardHeader>

            <CardContent className="space-y-4 p-3">
              {abaAtiva === "listagem" && (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-1"><Label>Nome do doador</Label><Input value={filtroDraft.doador_nome ?? ""} onChange={(e) => setFiltroDraft((a) => ({ ...a, doador_nome: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Tipo de doação</Label><Input value={filtroDraft.tipo_doacao ?? ""} onChange={(e) => setFiltroDraft((a) => ({ ...a, tipo_doacao: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Status</Label><Input value={filtroDraft.status ?? ""} onChange={(e) => setFiltroDraft((a) => ({ ...a, status: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Data inicial</Label><Input type="date" value={filtroDraft.data_inicial ?? ""} onChange={(e) => setFiltroDraft((a) => ({ ...a, data_inicial: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Data final</Label><Input type="date" value={filtroDraft.data_final ?? ""} onChange={(e) => setFiltroDraft((a) => ({ ...a, data_final: e.target.value }))} /></div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                    <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Doador</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-left">Itens</th></tr></thead>
                      <tbody>
                        {carregandoLista ? <tr><td className="px-3 py-4 text-center" colSpan={6}>Carregando registros...</td></tr> : registros.length ? registros.map((item, idx) => (
                          <tr key={item.id_registro_doacao} onClick={() => item.id_registro_doacao && selecionarRegistro(item.id_registro_doacao)} className={`cursor-pointer border-t border-[var(--g3-border)] ${idx % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}>
                            <td className="px-3 py-2">{formatarData(item.data_recebimento)}</td><td className="px-3 py-2">{item.doador_nome ?? "---"}</td><td className="px-3 py-2">{item.tipo_doacao}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2">{item.valor_total?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? item.valor?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "---"}</td><td className="px-3 py-2">{item.quantidade_itens ?? item.itens?.length ?? 0}</td>
                          </tr>
                        )) : <tr><td className="px-3 py-4 text-center" colSpan={6}>Nenhum registro encontrado.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {abaAtiva === "doador" && (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1 xl:col-span-2"><Label>Nome *</Label><Input value={doadorForm.nome ?? ""} onChange={(e) => setDoadorForm((a) => ({ ...a, nome: formatarTextoPorCampo("nome", e.target.value, mapaCamposTextoDoadorForm) as string }))} /></div>
                    <div className="space-y-1"><Label>Tipo de pessoa</Label><Select value={doadorForm.tipo_pessoa ?? "FISICA"} onChange={(e) => setDoadorForm((a) => ({ ...a, tipo_pessoa: e.target.value }))}><option value="FISICA">Física</option><option value="JURIDICA">Jurídica</option></Select></div>
                    <div className="space-y-1"><Label>Documento</Label><Input value={doadorForm.documento ?? ""} onChange={(e) => setDoadorForm((a) => ({ ...a, documento: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>E-mail</Label><Input value={doadorForm.email ?? ""} onChange={(e) => setDoadorForm((a) => ({ ...a, email: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Telefone</Label><Input value={doadorForm.telefone ?? ""} onChange={(e) => setDoadorForm((a) => ({ ...a, telefone: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Cidade</Label><Input value={doadorForm.cidade ?? ""} onChange={(e) => setDoadorForm((a) => ({ ...a, cidade: formatarTextoPorCampo("cidade", e.target.value, mapaCamposTextoDoadorForm) as string }))} /></div>
                    <div className="space-y-1"><Label>UF</Label><Input value={doadorForm.uf ?? ""} maxLength={2} onChange={(e) => setDoadorForm((a) => ({ ...a, uf: e.target.value.toUpperCase() }))} /></div>
                  </div>
                  <div className="flex justify-end"><Button type="button" onClick={() => void salvarDoador()} disabled={criarDoadorMutation.isPending}>{criarDoadorMutation.isPending ? "Salvando..." : "Cadastrar doador"}</Button></div>
                  <MensagemAcoesRapidas
                    titulo="Mensagens do doador"
                    destinatarioTipo="DOADOR"
                    destinatario={{
                      id:
                        typeof doadorContatoAtual?.id_doador === "string"
                          ? doadorContatoAtual.id_doador
                          : undefined,
                      nome: doadorContatoAtual?.nome?.trim() || undefined,
                      email: doadorContatoAtual?.email?.trim() || undefined,
                      telefone: doadorContatoAtual?.telefone?.trim() || undefined,
                      documento: doadorContatoAtual?.documento?.trim() || undefined,
                      detalhe: doadorContatoAtual?.cidade
                        ? [doadorContatoAtual.cidade, doadorContatoAtual.uf].filter(Boolean).join(" / ")
                        : undefined
                    }}
                    contextoExtra={{ doadorId: doadorContatoAtual?.id_doador }}
                    onFeedback={({ tipo, texto }) =>
                      setPopupMensagem({
                        tipo,
                        titulo: tipo === "sucesso" ? "Confirmação" : tipo === "aviso" ? "Atenção" : "Erro",
                        texto
                      })
                    }
                  />

                  <div className="space-y-2 rounded-lg border border-[var(--g3-border)] p-3">
                    <Label>Buscar doadores</Label>
                    <Input value={termoDoador} onChange={(e) => setTermoDoador(e.target.value)} placeholder="Digite pelo menos 2 letras" />
                    {carregandoDoadores ? <p className="text-xs text-[var(--g3-muted)]">Buscando doadores...</p> : null}
                    {doadores.length ? (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {doadores.map((doador) => (
                          <div key={doador.id_doador} className="flex items-center justify-between rounded border border-[var(--g3-border)] px-2 py-1 text-sm">
                            <button type="button" className="text-left" onClick={() => { setValue("doador_id", doador.id_doador ?? "", { shouldDirty: true, shouldValidate: true }); setDoadorForm(doador); setAbaAtiva("dados"); }}>
                              {doador.nome} {doador.documento ? `- ${doador.documento}` : ""}
                            </button>
                            <Button type="button" variant="ghost" onClick={() => void excluirDoador(doador.id_doador)} disabled={removerDoadorMutation.isPending}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {abaAtiva === "dados" && (
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-1">
                    <Label>Buscar doador</Label>
                    <Input value={termoDoador} onChange={(e) => setTermoDoador(e.target.value)} placeholder="Digite nome do doador" />
                    {doadores.length ? (
                      <div className="max-h-28 overflow-y-auto rounded border border-[var(--g3-border)] p-1">
                        {doadores.map((item) => (
                          <button key={item.id_doador} type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]" onClick={() => { setValue("doador_id", item.id_doador ?? "", { shouldDirty: true, shouldValidate: true }); setDoadorForm(item); }}>{item.nome}</button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1"><Label>Tipo de doação *</Label><Select {...register("tipo_doacao")} onBlur={() => aplicarFormatacaoRegistro("tipo_doacao")}><option value="">Selecione</option>{tipoDoacaoOptions.map((item) => <option key={item} value={item}>{item}</option>)}</Select>{errors.tipo_doacao && <p className="text-xs text-rose-600">{errors.tipo_doacao.message}</p>}</div>
                    <div className="space-y-1"><Label>Status *</Label><Select {...register("status")} onBlur={() => aplicarFormatacaoRegistro("status")}>{statusRegistroDoacaoOptions.map((item) => <option key={item} value={item}>{item}</option>)}</Select>{errors.status && <p className="text-xs text-rose-600">{errors.status.message}</p>}</div>
                    <div className="space-y-1"><Label>Data de recebimento *</Label><Input type="date" {...register("data_recebimento")} />{errors.data_recebimento && <p className="text-xs text-rose-600">{errors.data_recebimento.message}</p>}</div>
                    <div className="space-y-1"><Label>Forma de recebimento</Label><Input {...register("forma_recebimento")} onBlur={() => aplicarFormatacaoRegistro("forma_recebimento")} /></div>
                    <div className="space-y-1"><Label>Valor total</Label><Input type="number" step="0.01" min={0} {...register("valor_total")} /></div>
                    <div className="space-y-1"><Label>Valor unitário médio</Label><Input type="number" step="0.01" min={0} {...register("valor_medio")} /></div>
                    <div className="space-y-1"><Label>Quantidade de itens</Label><Input type="number" min={0} {...register("quantidade_itens")} /></div>
                    <div className="space-y-1"><Label>Periodicidade</Label><Input {...register("periodicidade")} onBlur={() => aplicarFormatacaoRegistro("periodicidade")} disabled={!recorrente} /></div>
                    <div className="space-y-1"><Label>Próxima cobrança</Label><Input type="date" {...register("proxima_cobranca")} disabled={!recorrente} /></div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm"><Checkbox checked={recorrente} onChange={() => setValue("recorrente", !recorrente, { shouldDirty: true, shouldValidate: true })} /><span>Doação recorrente</span></label>

                  <div className="space-y-1"><Label>Descrição</Label><Textarea rows={3} {...register("descricao")} onBlur={() => aplicarFormatacaoRegistro("descricao")} /></div>
                  <div className="space-y-1"><Label>Observações</Label><Textarea rows={3} {...register("observacoes")} onBlur={() => aplicarFormatacaoRegistro("observacoes")} /></div>
                </form>
              )}

              {abaAtiva === "recorrencia" && (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="inline-flex items-center gap-2 text-sm xl:col-span-2">
                      <Checkbox
                        checked={recorrente}
                        onChange={() => setValue("recorrente", !recorrente, { shouldDirty: true, shouldValidate: true })}
                      />
                      <span>Doação recorrente</span>
                    </label>
                    <div className="space-y-1">
                      <Label>Periodicidade</Label>
                      <Input
                        {...register("periodicidade")}
                        onBlur={() => aplicarFormatacaoRegistro("periodicidade")}
                        disabled={!recorrente}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Próxima cobrança</Label>
                      <Input type="date" {...register("proxima_cobranca")} disabled={!recorrente} />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--g3-muted)]">
                    As informações de recorrência serão salvas junto com o registro da doação.
                  </p>
                </div>
              )}

              {abaAtiva === "gestao" && (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Canal de envio</Label>
                      <Select value={canalGestao} onChange={(e) => setCanalGestao(e.target.value)}>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Email">E-mail</option>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Templates rápidos</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => aplicarTemplateGestao("lembrete")}>Lembrete</Button>
                        <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => aplicarTemplateGestao("agradecimento")}>Agradecimento</Button>
                        <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => aplicarTemplateGestao("transparencia")}>Transparência</Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Mensagem</Label>
                    <Textarea
                      rows={4}
                      value={mensagemGestao}
                      onChange={(e) => setMensagemGestao(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Mensagem preparada para envio." })}
                    >
                      Confirmar mensagem
                    </Button>
                  </div>
                </div>
              )}

              {abaAtiva === "itens" && (
                <div className="space-y-3">
                  <div className="grid gap-3 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-6">
                    <div className="space-y-1 md:col-span-2"><Label>Descrição *</Label><Input value={novoItem.descricao ?? ""} onChange={(e) => setNovoItem((a) => ({ ...a, descricao: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Quantidade *</Label><Input type="number" min={1} value={novoItem.quantidade ?? 1} onChange={(e) => setNovoItem((a) => ({ ...a, quantidade: Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label>Unidade</Label><Input value={novoItem.unidade ?? ""} onChange={(e) => setNovoItem((a) => ({ ...a, unidade: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Valor unitário</Label><Input type="number" step="0.01" min={0} value={novoItem.valor_unitario ?? ""} onChange={(e) => setNovoItem((a) => ({ ...a, valor_unitario: Number(e.target.value) || undefined }))} /></div>
                    <div className="flex items-end"><Button type="button" className="w-full" onClick={adicionarItem}><Plus className="h-4 w-4" />Adicionar</Button></div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                    <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-left">Qtd</th><th className="px-3 py-2 text-left">Unidade</th><th className="px-3 py-2 text-left">Valor unitário</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
                      <tbody>
                        {itens.length ? itens.map((item, idx) => (
                          <tr key={`${item.descricao}-${idx}`} className={`border-t border-[var(--g3-border)] ${idx % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}>
                            <td className="px-3 py-2">{item.descricao}</td><td className="px-3 py-2">{item.quantidade}</td><td className="px-3 py-2">{item.unidade ?? "---"}</td><td className="px-3 py-2">{item.valor_unitario?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "---"}</td>
                            <td className="px-3 py-2 text-right"><Button type="button" variant="ghost" onClick={() => removerItem(idx)}><Trash2 className="h-4 w-4 text-rose-600" /></Button></td>
                          </tr>
                        )) : <tr><td className="px-3 py-4 text-center" colSpan={5}>Nenhum item adicionado.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {popupMensagem && <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} />}

      {popupExcluirAberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => !removerMutation.isPending && setPopupExcluirAberto(false)}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Confirmar exclusão</h3></div>
            <div className="px-5 py-4"><p className="text-sm text-slate-700">Esta ação é irreversível. Deseja continuar?</p></div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setPopupExcluirAberto(false)}>Cancelar</Button>
              <Button type="button" variant="danger" onClick={() => void confirmarExclusao()} disabled={removerMutation.isPending}>{removerMutation.isPending ? "Excluindo..." : "Excluir"}</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
