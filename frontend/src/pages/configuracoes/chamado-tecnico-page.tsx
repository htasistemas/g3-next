import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Code2, Download, Filter, MessageSquare, Plus, RefreshCw, Save, Wrench } from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { menuSections } from "@/app/app-shell";
import {
  useAdicionarVinculoChamadoTecnico,
  useAlterarSituacaoChamadoTecnico,
  useAnexarArquivosChamadoTecnico,
  useChamadoTecnico,
  useChamadosTecnicos,
  useChamadosTecnicosCatalogo,
  useChamadosTecnicosFiltrosSalvos,
  useComentarChamadoTecnico,
  useRemoverAnexoChamadoTecnico,
  useRemoverFiltroChamadoTecnico,
  useSalvarParametroChamadoTecnico,
  useSalvarChamadoTecnico,
  useSalvarFiltroChamadoTecnico
} from "@/features/chamados-tecnicos/use-chamados-tecnicos";
import { useUnidadeAssistencialAtual } from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import { useAuth } from "@/hooks/use-auth";
import { chamadosTecnicosService } from "@/services/chamados-tecnicos.service";
import type {
  ChamadoParametro,
  ChamadoParametroInput,
  ChamadoTecnicoDetalhe,
  ChamadoTecnicoFiltros,
  ChamadoTecnicoInput
} from "@/types/chamado-tecnico";

type AbaId = "painel" | "cadastro" | "detalhe" | "desenvolvimento" | "filtros";

type StatusForm = {
  situacao_id: string;
  resolucao: string;
  justificativa_reabertura: string;
  motivo_reabertura_id: string;
};

type VinculoForm = {
  tipo_vinculo: string;
  referencia_id: string;
  referencia_descricao: string;
};

type MenuRouteOption = {
  menu: string;
  submenu: string;
  rota: string;
};

const statusPadrao: StatusForm = {
  situacao_id: "",
  resolucao: "",
  justificativa_reabertura: "",
  motivo_reabertura_id: ""
};

const vinculoPadrao: VinculoForm = {
  tipo_vinculo: "outro_chamado",
  referencia_id: "",
  referencia_descricao: ""
};

const parametroPadrao: ChamadoParametroInput = {
  tipo: "TIPO",
  chave: "",
  nome: "",
  descricao: "",
  cor: "",
  ordem: 0,
  sla_horas: undefined,
  padrao: false,
  ativo: true
};

const opcoesOrdenacao = [
  { id: "ultima_atualizacao", nome: "Última atualização" },
  { id: "data_criacao", nome: "Data de criação" },
  { id: "prioridade", nome: "Prioridade" },
  { id: "situacao", nome: "Situação" },
  { id: "cliente", nome: "Cliente" },
  { id: "sistema", nome: "Sistema" }
];

const opcoesDirecao = [
  { id: "desc", nome: "Decrescente" },
  { id: "asc", nome: "Crescente" }
];

const opcoesLimite = [
  { id: "20", nome: "20 registros" },
  { id: "50", nome: "50 registros" },
  { id: "100", nome: "100 registros" }
];

const opcoesVinculo = [
  { id: "outro_chamado", nome: "Outro chamado" },
  { id: "modulo", nome: "Módulo" },
  { id: "release", nome: "Release" },
  { id: "tarefa_interna", nome: "Tarefa interna" },
  { id: "cliente", nome: "Cliente" }
];

const tiposPermitidos = ["ERRO", "TAREFAS", "MELHORIA", "NOVA_IMPLEMENTACAO"];
const prioridadesPermitidas = ["URGENTE", "PRIORIDADE", "NORMAL", "BAIXA"];
const situacoesDesenvolvimentoPermitidas = [
  "EM_ANALISE",
  "AGUARDANDO_RETORNO_SOLICITANTE",
  "EM_DESENVOLVIMENTO",
  "EM_TESTES",
  "RESOLVIDO",
  "NAO_SERA_IMPLEMENTADO",
  "REABERTO",
  "CANCELADO",
  "FECHADO"
];

function criarFormPadrao({
  solicitante,
  cliente,
  sistemaId,
  origemId
}: {
  solicitante?: string;
  cliente?: string;
  sistemaId?: string;
  origemId?: string;
}): ChamadoTecnicoInput {
  return {
    solicitante: solicitante ?? "",
    cliente: cliente ?? "",
    sistema_id: sistemaId ?? "",
    origem_id: origemId ?? "",
    tipo_id: "",
    prioridade_id: "",
    resumo: "",
    descricao: "",
    menu_nome: "",
    submenu_rota: ""
  };
}

export function ChamadoTecnicoPage() {
  const { usuario } = useAuth();
  const { data: unidadeAtualData } = useUnidadeAssistencialAtual();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("painel");
  const [filtros, setFiltros] = useState<ChamadoTecnicoFiltros>({
    limite: 20,
    pagina: 1,
    ordenacao: "ultima_atualizacao",
    direcao: "desc"
  });
  const [form, setForm] = useState<ChamadoTecnicoInput>(criarFormPadrao({}));
  const [statusForm, setStatusForm] = useState<StatusForm>(statusPadrao);
  const [vinculoForm, setVinculoForm] = useState<VinculoForm>(vinculoPadrao);
  const [selecionadoId, setSelecionadoId] = useState<string>();
  const [comentario, setComentario] = useState("");
  const [comentarioInterno, setComentarioInterno] = useState(false);
  const [comentarioVisivel, setComentarioVisivel] = useState(true);
  const [anexosPendentes, setAnexosPendentes] = useState<File[]>([]);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [anexoExcluirId, setAnexoExcluirId] = useState<string>();
  const [nomeFiltro, setNomeFiltro] = useState("");
  const [parametroIdEdicao, setParametroIdEdicao] = useState<string>();
  const [parametroForm, setParametroForm] = useState<ChamadoParametroInput>(parametroPadrao);

  const catalogo = useChamadosTecnicosCatalogo();
  const listagem = useChamadosTecnicos(filtros);
  const detalhe = useChamadoTecnico(selecionadoId);
  const filtrosSalvos = useChamadosTecnicosFiltrosSalvos();
  const salvar = useSalvarChamadoTecnico();
  const comentar = useComentarChamadoTecnico();
  const alterarSituacao = useAlterarSituacaoChamadoTecnico();
  const salvarFiltro = useSalvarFiltroChamadoTecnico();
  const removerFiltro = useRemoverFiltroChamadoTecnico();
  const anexar = useAnexarArquivosChamadoTecnico();
  const removerAnexo = useRemoverAnexoChamadoTecnico();
  const adicionarVinculo = useAdicionarVinculoChamadoTecnico();
  const salvarParametro = useSalvarParametroChamadoTecnico();

  const parametros = catalogo.data?.parametros ?? {};
  const cards = listagem.data?.resumo.cards;
  const chamados = listagem.data?.chamados ?? [];
  const chamadoAtual = detalhe.data?.chamado;
  const parametrosTipo = useMemo(() => {
    const listaExplicita = (catalogo.data?.tipos ?? []).filter(Boolean);
    return listaExplicita.length > 0 ? listaExplicita : obterParametrosCatalogo(parametros, "TIPO");
  }, [catalogo.data?.tipos, parametros]);
  const parametrosPrioridade = useMemo(() => {
    const listaExplicita = (catalogo.data?.prioridades ?? []).filter(Boolean);
    return listaExplicita.length > 0 ? listaExplicita : obterParametrosCatalogo(parametros, "PRIORIDADE");
  }, [catalogo.data?.prioridades, parametros]);
  const parametrosSistema = useMemo(() => obterParametrosCatalogo(parametros, "SISTEMA"), [parametros]);
  const parametrosOrigem = useMemo(() => obterParametrosCatalogo(parametros, "ORIGEM"), [parametros]);
  const parametrosSituacao = useMemo(() => obterParametrosCatalogo(parametros, "SITUACAO"), [parametros]);
  const parametrosMotivoReabertura = useMemo(
    () => obterParametrosCatalogo(parametros, "MOTIVO_REABERTURA"),
    [parametros]
  );

  const nomeSolicitante = (usuario?.nome ?? usuario?.nomeUsuario ?? "").trim();
  const clientePadrao =
    unidadeAtualData?.unidade?.nome_fantasia?.trim() ||
    unidadeAtualData?.unidade?.razao_social?.trim() ||
    "";

  const sistemaPadrao = useMemo(
    () => parametrosSistema.find((item) => item.chave === "G3_NEXT"),
    [parametrosSistema]
  );
  const origemManual = useMemo(
    () => parametrosOrigem.find((item) => item.chave === "MANUAL"),
    [parametrosOrigem]
  );
  const urgente = useMemo(
    () => parametrosPrioridade.find((item) => item.chave === "URGENTE"),
    [parametrosPrioridade]
  );
  const situacaoFechado = useMemo(
    () => parametrosSituacao.find((item) => item.chave === "FECHADO"),
    [parametrosSituacao]
  );

  const podeDesenvolver =
    !!usuario?.permissoes.includes("ADMINISTRADOR") ||
    !!usuario?.permissoes.includes("CHAMADO_TECNICO_DESENVOLVIMENTO");

  const abas = useMemo<AdminTab[]>(() => {
    const base: AdminTab[] = [
      { id: "painel", label: "Painel e listagem", icon: Filter },
      { id: "cadastro", label: "Cadastro / edição", icon: Plus },
      { id: "detalhe", label: "Detalhe e andamento", icon: MessageSquare }
    ];
    base.push({ id: "filtros", label: "Meus filtros", icon: Wrench });
    if (podeDesenvolver) base.push({ id: "desenvolvimento", label: "Desenvolvimento", icon: Code2 });
    return base;
  }, [podeDesenvolver]);

  const menuOptions = useMemo(() => menuSections.map((item) => ({ id: item.secao, nome: item.secao })), []);
  const submenuOptions = useMemo<MenuRouteOption[]>(
    () =>
      menuSections.flatMap((section) =>
        section.itens
          .filter((item) => !!item.to)
          .map((item) => ({ menu: section.secao, submenu: item.label, rota: item.to as string }))
      ),
    []
  );

  const submenuOptionsFiltradas = useMemo(
    () =>
      submenuOptions
        .filter((item) => !form.menu_nome || item.menu === form.menu_nome)
        .map((item) => ({ id: item.rota, nome: item.submenu })),
    [form.menu_nome, submenuOptions]
  );

  const resumoSituacao = useMemo(
    () => agruparPorNome(chamados.map((item) => item.situacao?.nome ?? "Sem situação")),
    [chamados]
  );
  const resumoTipo = useMemo(
    () => agruparPorNome(chamados.map((item) => item.tipo?.nome ?? "Sem tipo")),
    [chamados]
  );
  const tiposDisponiveis = useMemo(
    () => filtrarParametros(parametrosTipo, tiposPermitidos),
    [parametrosTipo]
  );
  const prioridadesDisponiveis = useMemo(
    () => filtrarParametros(parametrosPrioridade, prioridadesPermitidas),
    [parametrosPrioridade]
  );
  const catalogoEssencialCarregando = catalogo.isLoading || catalogo.isFetching;
  const semTiposDisponiveis = !catalogoEssencialCarregando && !tiposDisponiveis.length;
  const semPrioridadesDisponiveis = !catalogoEssencialCarregando && !prioridadesDisponiveis.length;
  const situacoesDesenvolvimento = useMemo(
    () => filtrarParametros(parametrosSituacao, situacoesDesenvolvimentoPermitidas),
    [parametrosSituacao]
  );
  const motivoReaberturaOptions = parametrosMotivoReabertura;

  const chips = useMemo(
    () => [
      { label: "Meus chamados", onClick: () => setFiltros((atual) => ({ ...atual, criador_usuario_id: usuario?.id, pagina: 1 })) },
      { label: "Urgentes", onClick: () => setFiltros((atual) => ({ ...atual, prioridade_id: urgente?.id, pagina: 1 })) },
      { label: "Sem atualização", onClick: () => setFiltros((atual) => ({ ...atual, inatividade_dias: 7, pagina: 1 })) }
    ],
    [urgente?.id, usuario?.id]
  );

  const podeFecharComoSolicitante =
    !!chamadoAtual &&
    chamadoAtual.criador?.id === usuario?.id &&
    ["RESOLVIDO", "NAO_SERA_IMPLEMENTADO"].includes(chamadoAtual.situacao?.chave ?? "");

  const acoes: AdminAction[] = [
    { label: "Novo chamado", icon: Plus, onClick: () => iniciarNovoChamado(), variant: "default" },
    {
      label: "Atualizar",
      icon: RefreshCw,
      onClick: () => void Promise.allSettled([listagem.refetch(), detalhe.refetch(), filtrosSalvos.refetch(), catalogo.refetch()]),
      variant: "outline"
    },
    {
      label: "Limpar filtros",
      icon: Filter,
      onClick: () => setFiltros({ limite: 20, pagina: 1, ordenacao: "ultima_atualizacao", direcao: "desc" }),
      variant: "outline"
    },
    {
      label: "Exportar Excel",
      icon: Download,
      onClick: () => void exportarListagem("excel"),
      variant: "outline",
      disabled: abaAtiva !== "painel" || chamados.length === 0
    },
    {
      label: "Exportar PDF",
      icon: Download,
      onClick: () => void exportarListagem("pdf"),
      variant: "outline",
      disabled: abaAtiva !== "painel" || chamados.length === 0
    },
    {
      label: salvar.isPending ? "Salvando..." : "Salvar",
      icon: Save,
      onClick: () => void salvarChamado(),
      variant: "default",
      disabled: abaAtiva !== "cadastro"
    }
  ];

  useEffect(() => {
    if (selecionadoId) return;
    setForm((atual) => ({
      ...atual,
      solicitante: atual.solicitante || nomeSolicitante,
      cliente: atual.cliente || clientePadrao,
      sistema_id: atual.sistema_id || sistemaPadrao?.id || "",
      origem_id: atual.origem_id || origemManual?.id || ""
    }));
  }, [clientePadrao, nomeSolicitante, origemManual?.id, selecionadoId, sistemaPadrao?.id]);

  useEffect(() => {
    if (!tiposDisponiveis.length) return;
    setForm((atual) => (atual.tipo_id ? atual : { ...atual, tipo_id: tiposDisponiveis[0].id }));
  }, [tiposDisponiveis]);

  useEffect(() => {
    if (!prioridadesDisponiveis.length) return;
    setForm((atual) => (atual.prioridade_id ? atual : { ...atual, prioridade_id: prioridadesDisponiveis[0].id }));
  }, [prioridadesDisponiveis]);

  useEffect(() => {
    if (!chamadoAtual) return;
    setForm(mapDetalheParaForm(chamadoAtual));
    setStatusForm({
      situacao_id: chamadoAtual.situacao?.id ?? "",
      resolucao: chamadoAtual.resolucao ?? "",
      justificativa_reabertura: chamadoAtual.justificativaReabertura ?? "",
      motivo_reabertura_id: chamadoAtual.motivoReabertura?.id ?? ""
    });
  }, [chamadoAtual]);

  function iniciarNovoChamado() {
    setSelecionadoId(undefined);
    setAnexosPendentes([]);
    setStatusForm(statusPadrao);
    setComentario("");
    setComentarioInterno(false);
    setComentarioVisivel(true);
    setForm(
      criarFormPadrao({
        solicitante: nomeSolicitante,
        cliente: clientePadrao,
        sistemaId: sistemaPadrao?.id,
        origemId: origemManual?.id
      })
    );
    setAbaAtiva("cadastro");
  }

  async function salvarChamado() {
    if (
      !form.solicitante.trim() || !form.cliente?.trim() || !form.sistema_id || !form.tipo_id || !form.prioridade_id ||
      !form.menu_nome?.trim() || !form.submenu_rota?.trim() || !form.resumo.trim() || !form.descricao.trim()
    ) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Preencha solicitante, cliente, sistema, tipo, prioridade, menu, submenu, resumo e descrição." });
      return;
    }

    try {
      const resposta = await salvar.mutateAsync({ id: selecionadoId, data: prepararPayloadChamado(form) });
      const id = resposta.chamado.id;
      if (anexosPendentes.length) await anexar.mutateAsync({ id, files: anexosPendentes });
      setSelecionadoId(id);
      setAbaAtiva("detalhe");
      setAnexosPendentes([]);
      await Promise.allSettled([detalhe.refetch(), listagem.refetch()]);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Chamado salvo com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: extrairMensagem(error, "Não foi possível salvar o chamado.") });
    }
  }

  async function exportarListagem(formato: "excel" | "pdf") {
    try {
      const { blob, contentDisposition } = await chamadosTecnicosService.exportar(filtros, formato);
      baixarBlob(blob, extrairNomeArquivo(contentDisposition) ?? `chamados-tecnicos-${new Date().toISOString().slice(0, 10)}.${formato === "pdf" ? "pdf" : "csv"}`);
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: extrairMensagem(error, "Não foi possível exportar a listagem.") });
    }
  }

  async function registrarAndamento() {
    if (!chamadoAtual?.id || !comentario.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe um comentário para registrar o andamento." });
      return;
    }

    try {
      await comentar.mutateAsync({
        id: chamadoAtual.id,
        data: {
          comentario: comentario.trim(),
          interno: podeDesenvolver ? comentarioInterno : false,
          visivel_solicitante: podeDesenvolver ? comentarioVisivel : true
        }
      });
      setComentario("");
      setComentarioInterno(false);
      setComentarioVisivel(true);
      await Promise.allSettled([detalhe.refetch(), listagem.refetch()]);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Andamento registrado com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: extrairMensagem(error, "Não foi possível registrar o andamento.") });
    }
  }

  async function atualizarStatus() {
    if (!chamadoAtual?.id || !statusForm.situacao_id) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Selecione a situação do chamado." });
      return;
    }

    try {
      await alterarSituacao.mutateAsync({ id: chamadoAtual.id, data: limparPayload(statusForm) });
      await Promise.allSettled([detalhe.refetch(), listagem.refetch()]);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Situação atualizada com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: extrairMensagem(error, "Não foi possível atualizar a situação.") });
    }
  }

  async function fecharChamadoComoSolicitante() {
    if (!chamadoAtual?.id || !situacaoFechado?.id) return;

    try {
      await alterarSituacao.mutateAsync({
        id: chamadoAtual.id,
        data: { situacao_id: situacaoFechado.id, resolucao: chamadoAtual.resolucao }
      });
      await Promise.allSettled([detalhe.refetch(), listagem.refetch()]);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Chamado fechado com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: extrairMensagem(error, "Não foi possível fechar o chamado.") });
    }
  }

  async function anexarArquivosNoDetalhe(files: File[]) {
    if (!chamadoAtual?.id || files.length === 0) return;

    try {
      await anexar.mutateAsync({ id: chamadoAtual.id, files });
      await detalhe.refetch();
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Arquivos anexados com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: extrairMensagem(error, "Não foi possível anexar os arquivos.") });
    }
  }

  async function salvarNovoVinculo() {
    if (!chamadoAtual?.id || !vinculoForm.referencia_descricao.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe a descrição do vínculo." });
      return;
    }

    try {
      await adicionarVinculo.mutateAsync({ id: chamadoAtual.id, data: limparPayload(vinculoForm) });
      setVinculoForm(vinculoPadrao);
      await detalhe.refetch();
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Vínculo registrado com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: extrairMensagem(error, "Não foi possível registrar o vínculo.") });
    }
  }

  async function salvarFiltroAtual() {
    if (!nomeFiltro.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe um nome para o filtro salvo." });
      return;
    }

    try {
      await salvarFiltro.mutateAsync({ nome: nomeFiltro.trim(), filtros });
      setNomeFiltro("");
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Filtro salvo com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: extrairMensagem(error, "Não foi possível salvar o filtro.") });
    }
  }

  async function salvarParametroAuxiliar() {
    if (!parametroForm.tipo || !parametroForm.chave.trim() || !parametroForm.nome.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe tipo, chave e nome para o parâmetro." });
      return;
    }

    try {
      await salvarParametro.mutateAsync({ id: parametroIdEdicao, data: limparPayload(parametroForm) as ChamadoParametroInput });
      setParametroIdEdicao(undefined);
      setParametroForm(parametroPadrao);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Parâmetro salvo com sucesso." });
    } catch (error) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: extrairMensagem(error, "Não foi possível salvar o parâmetro.") });
    }
  }

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Configurações gerais"
        pageTitle="Chamado técnico"
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={chamadoAtual?.codigo ?? "Novo"}
      >
        {abaAtiva === "painel" ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
              <CardResumo titulo="Abertos" total={Number(cards?.totalAbertos ?? 0)} />
              <CardResumo titulo="Resolvidos hoje" total={Number(cards?.resolvidosHoje ?? 0)} />
              <CardResumo titulo="Em atraso" total={Number(cards?.emAtraso ?? 0)} />
              <CardResumo titulo="Aguardando retorno" total={Number(cards?.aguardandoMeuRetorno ?? 0)} />
              <CardResumo titulo="Urgentes" total={Number(cards?.criticos ?? 0)} />
              <CardResumo titulo="Reabertos" total={Number(cards?.reabertos ?? 0)} />
              <CardResumo titulo="Sem atualização" total={Number(cards?.semAtualizacaoMaisSeteDias ?? 0)} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Filtros avançados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <Button key={chip.label} type="button" variant="outline" size="sm" onClick={chip.onClick}>
                      {chip.label}
                    </Button>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Campo label="Busca textual" value={filtros.texto ?? ""} onChange={(value) => atualizarFiltros(setFiltros, "texto", value || undefined)} />
                  <Campo label="Código" value={filtros.codigo ?? ""} onChange={(value) => atualizarFiltros(setFiltros, "codigo", value || undefined)} />
                  <Campo label="Cliente" value={filtros.cliente ?? ""} onChange={(value) => atualizarFiltros(setFiltros, "cliente", value || undefined)} />
                  <CampoSelect label="Situação" value={filtros.situacao_id ?? ""} options={parametrosSituacao} onChange={(value) => atualizarFiltros(setFiltros, "situacao_id", value || undefined)} />
                  <CampoSelect label="Tipo" value={filtros.tipo_id ?? ""} options={tiposDisponiveis} onChange={(value) => atualizarFiltros(setFiltros, "tipo_id", value || undefined)} />
                  <CampoSelect label="Prioridade" value={filtros.prioridade_id ?? ""} options={prioridadesDisponiveis} onChange={(value) => atualizarFiltros(setFiltros, "prioridade_id", value || undefined)} />
                  <CampoSelect label="Sistema" value={filtros.sistema_id ?? ""} options={parametrosSistema} onChange={(value) => atualizarFiltros(setFiltros, "sistema_id", value || undefined)} />
                  <Campo label="Data de criação inicial" value={filtros.data_criacao_inicio ?? ""} type="date" onChange={(value) => atualizarFiltros(setFiltros, "data_criacao_inicio", value || undefined)} />
                  <Campo label="Data de criação final" value={filtros.data_criacao_fim ?? ""} type="date" onChange={(value) => atualizarFiltros(setFiltros, "data_criacao_fim", value || undefined)} />
                  <Campo label="Inatividade superior a X dias" value={filtros.inatividade_dias ? String(filtros.inatividade_dias) : ""} onChange={(value) => atualizarFiltros(setFiltros, "inatividade_dias", value ? Number(value) : undefined)} />
                  <CampoSelect label="Ordenação" value={filtros.ordenacao ?? "ultima_atualizacao"} options={opcoesOrdenacao} onChange={(value) => atualizarFiltros(setFiltros, "ordenacao", value || undefined)} placeholder="Selecione" />
                  <CampoSelect label="Direção" value={filtros.direcao ?? "desc"} options={opcoesDirecao} onChange={(value) => atualizarFiltros(setFiltros, "direcao", value || undefined)} placeholder="Selecione" />
                  <CampoSelect label="Limite" value={String(filtros.limite ?? 20)} options={opcoesLimite} onChange={(value) => atualizarFiltros(setFiltros, "limite", value ? Number(value) : undefined)} placeholder="Selecione" />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Listagem de chamados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  {chamados.length > 0 ? (
                    <>
                      <div className="grid gap-2">
                        {chamados.map((item) => {
                          const submenu = resolverSubmenuPorRota(item.urlTela, submenuOptions);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3 text-left transition-colors hover:border-[var(--g3-active)] hover:bg-[var(--g3-primary-soft)]"
                              onClick={() => {
                                setSelecionadoId(item.id);
                                setAbaAtiva("detalhe");
                              }}
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">{item.codigo}</span>
                                    <BadgeParametro parametro={item.situacao} fallback="Sem situação" />
                                    <BadgeParametro parametro={item.prioridade} fallback="Sem prioridade" />
                                  </div>
                                  <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.resumo}</p>
                                  <p className="text-xs text-[var(--g3-muted)]">{item.tipo?.nome ?? "Sem tipo"} • {submenu ?? item.moduloAfetado ?? "Sem submenu"} • {item.cliente ?? item.solicitante}</p>
                                </div>
                                <div className="space-y-1 text-right text-xs text-[var(--g3-muted)]">
                                  <p>Atualizado em {formatarData(item.ultimaAtualizacao)}</p>
                                  <p>{textoSla(item.slaVencimentoEm, item.resolvidoEm, item.fechadoEm)}</p>
                                  <p>{item.anexosQuantidade} anexo(s) • {item.comentariosNaoLidos} não lido(s)</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--g3-border)] pt-3">
                        <p className="text-sm text-[var(--g3-muted)]">{listagem.data?.total ?? 0} chamado(s) • página {listagem.data?.pagina ?? 1}</p>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" disabled={(filtros.pagina ?? 1) <= 1} onClick={() => setFiltros((atual) => ({ ...atual, pagina: Math.max(1, (atual.pagina ?? 1) - 1) }))}>Anterior</Button>
                          <Button type="button" size="sm" variant="outline" disabled={(listagem.data?.total ?? 0) <= (filtros.pagina ?? 1) * (filtros.limite ?? 20)} onClick={() => setFiltros((atual) => ({ ...atual, pagina: (atual.pagina ?? 1) + 1 }))}>Próxima</Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <EmptyState texto="Nenhum chamado encontrado para os filtros informados." />
                  )}
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Resumo titulo="Chamados por situação" itens={resumoSituacao} />
                <Resumo titulo="Chamados por tipo" itens={resumoTipo} />
              </div>
            </div>
          </div>
        ) : null}

        {abaAtiva === "cadastro" ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Abertura e classificação</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
                <Campo label="Solicitante" value={form.solicitante} onChange={(value) => atualizarCampo(setForm, "solicitante", value)} disabled />
                <Campo label="Cliente" value={form.cliente ?? ""} onChange={(value) => atualizarCampo(setForm, "cliente", value)} disabled />
                <Campo label="Sistema" value={sistemaPadrao?.nome ?? "G3-Next Terceiro Setor"} onChange={() => undefined} disabled />
                <CampoSelect
                  label="Tipo"
                  value={form.tipo_id}
                  options={tiposDisponiveis}
                  onChange={(value) => atualizarCampo(setForm, "tipo_id", value)}
                  placeholder={catalogoEssencialCarregando ? "Carregando..." : "Selecione"}
                  disabled={catalogoEssencialCarregando || semTiposDisponiveis}
                />
                <CampoSelect
                  label="Prioridade"
                  value={form.prioridade_id}
                  options={prioridadesDisponiveis}
                  onChange={(value) => atualizarCampo(setForm, "prioridade_id", value)}
                  placeholder={catalogoEssencialCarregando ? "Carregando..." : "Selecione"}
                  disabled={catalogoEssencialCarregando || semPrioridadesDisponiveis}
                />
                <CampoSelect label="Menu" value={form.menu_nome ?? ""} options={menuOptions} onChange={(value) => { atualizarCampo(setForm, "menu_nome", value); const submenuAtual = submenuOptions.find((item) => item.rota === form.submenu_rota); if (submenuAtual && submenuAtual.menu !== value) atualizarCampo(setForm, "submenu_rota", ""); }} placeholder="Selecione" />
                <CampoSelect label="Submenu" value={form.submenu_rota ?? ""} options={submenuOptionsFiltradas} onChange={(value) => { const selecionado = submenuOptions.find((item) => item.rota === value); atualizarCampo(setForm, "submenu_rota", value); atualizarCampo(setForm, "menu_nome", selecionado?.menu ?? form.menu_nome ?? ""); }} placeholder="Selecione" />
                <Info label="Rota do submenu" value={form.submenu_rota || "Selecione um submenu para identificar a rota"} />
                {(semTiposDisponiveis || semPrioridadesDisponiveis) ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 md:col-span-2 xl:col-span-4">
                    Não foi possível carregar todas as opções de catálogo. Atualize a tela e, se persistir, verifique os parâmetros de tipo e prioridade no backend.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Conteúdo do chamado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <Campo label="Resumo" value={form.resumo} onChange={(value) => atualizarCampo(setForm, "resumo", value)} />
                <Campo label="Versão do sistema" value={form.versao_sistema ?? ""} onChange={(value) => atualizarCampo(setForm, "versao_sistema", value)} />
                <AreaTexto label="Descrição detalhada" value={form.descricao} onChange={(value) => atualizarCampo(setForm, "descricao", value)} />
                <AreaTexto label="Resultado esperado" value={form.resultado_esperado ?? ""} onChange={(value) => atualizarCampo(setForm, "resultado_esperado", value)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Anexos iniciais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <Input type="file" multiple onChange={(event) => setAnexosPendentes(Array.from(event.target.files ?? []))} />
                <div className="space-y-2">
                  {anexosPendentes.length > 0 ? anexosPendentes.map((file) => (
                    <div key={`${file.name}-${file.size}`} className="rounded-lg border border-[var(--g3-border)] px-3 py-2 text-sm">
                      {file.name} • {formatarTamanho(file.size)}
                    </div>
                  )) : <EmptyState texto="Os anexos adicionados aqui serão enviados junto com o chamado." />}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {abaAtiva === "detalhe" ? (
          chamadoAtual ? (
            <div className="space-y-4">
              {podeFecharComoSolicitante ? (
                <Card className="border-emerald-200 bg-emerald-50/80">
                  <CardHeader>
                    <CardTitle className="text-sm text-emerald-800">Confirmação do solicitante</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm text-emerald-900">
                      O chamado foi concluído pela equipe técnica. Se o atendimento estiver satisfatório, feche o chamado.
                    </p>
                    <Button type="button" onClick={() => void fecharChamadoComoSolicitante()}>Fechar chamado</Button>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Dados do chamado</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
                  <Info label="Código" value={chamadoAtual.codigo} />
                  <Info label="Situação" value={chamadoAtual.situacao?.nome ?? "---"} />
                  <Info label="Prioridade" value={chamadoAtual.prioridade?.nome ?? "---"} />
                  <Info label="Tipo" value={chamadoAtual.tipo?.nome ?? "---"} />
                  <Info label="Solicitante" value={chamadoAtual.solicitante} />
                  <Info label="Cliente" value={chamadoAtual.cliente ?? "---"} />
                  <Info label="Sistema" value={chamadoAtual.sistema?.nome ?? "---"} />
                  <Info label="Menu" value={chamadoAtual.menuNome ?? "---"} />
                  <Info label="Submenu" value={resolverSubmenuPorRota(chamadoAtual.submenuRota, submenuOptions) ?? "---"} />
                  <Info label="Rota" value={chamadoAtual.submenuRota ?? "---"} />
                  <Info label="Criado em" value={formatarData(chamadoAtual.dataCriacao)} />
                  <Info label="Atualizado em" value={formatarData(chamadoAtual.ultimaAtualizacao)} />
                  <Info label="Tempo aberto" value={formatarTempo(chamadoAtual.dataCriacao, chamadoAtual.fechadoEm ?? chamadoAtual.resolvidoEm)} />
                  <Info label="SLA" value={textoSla(chamadoAtual.slaVencimentoEm, chamadoAtual.resolvidoEm, chamadoAtual.fechadoEm)} />
                  <Info label="Versão do sistema" value={chamadoAtual.versaoSistema ?? "---"} />
                  <Info label="Release" value={chamadoAtual.numeroRelease ?? "---"} />
                  <Info label="Resumo" value={chamadoAtual.resumo} full />
                  <Info label="Descrição detalhada" value={chamadoAtual.descricao} full />
                  <Info label="Passos para reproduzir" value={chamadoAtual.passosReproduzir ?? "---"} full />
                  <Info label="Resultado esperado" value={chamadoAtual.resultadoEsperado ?? "---"} full />
                  <Info label="Resultado obtido" value={chamadoAtual.resultadoObtido ?? "---"} full />
                  <Info label="Impacto no uso" value={chamadoAtual.impactoUso ?? "---"} full />
                  <Info label="Resolução" value={chamadoAtual.resolucao ?? "---"} full />
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Comentários e andamento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4">
                    <AreaTexto label="Novo comentário" value={comentario} onChange={setComentario} rows={4} />
                    <div className="flex flex-wrap gap-4">
                      {podeDesenvolver ? (
                        <>
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={comentarioInterno} onChange={(event) => setComentarioInterno(event.target.checked)} />
                            Comentário interno
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={comentarioVisivel} onChange={(event) => setComentarioVisivel(event.target.checked)} />
                            Visível ao solicitante
                          </label>
                        </>
                      ) : (
                        <p className="text-xs text-[var(--g3-muted)]">Seu comentário será registrado como andamento visível.</p>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" onClick={() => void registrarAndamento()}>Registrar andamento</Button>
                    </div>
                    <div className="space-y-2">
                      {(detalhe.data?.comentarios ?? []).length > 0 ? (
                        (detalhe.data?.comentarios ?? []).map((item) => (
                          <div key={item.id} className="rounded-xl border border-[var(--g3-border)] px-3 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold">{item.autor?.nome ?? "Usuário"}</p>
                              <p className="text-xs text-[var(--g3-muted)]">{formatarData(item.criadoEm)}</p>
                            </div>
                            <p className="mt-1 text-xs text-[var(--g3-muted)]">
                              {item.interno ? "Interno" : "Público"}{item.visivelSolicitante ? " • Visível ao solicitante" : ""}
                            </p>
                            <p className="mt-2 text-sm">{item.comentario}</p>
                          </div>
                        ))
                      ) : <EmptyState texto="Nenhum comentário registrado." />}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Anexos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4">
                    <Input type="file" multiple onChange={(event) => { const files = Array.from(event.target.files ?? []); void anexarArquivosNoDetalhe(files); event.target.value = ""; }} />
                    <div className="space-y-2">
                      {(detalhe.data?.anexos ?? []).length > 0 ? (
                        (detalhe.data?.anexos ?? []).map((item) => (
                          <div key={item.id} className="rounded-xl border border-[var(--g3-border)] px-3 py-3">
                            <p className="text-sm font-semibold">{item.nomeOriginal}</p>
                            <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.mimeType} • {formatarTamanho(item.tamanhoBytes)} • {formatarData(item.dataUpload)}</p>
                            <div className="mt-3 flex gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => window.open(item.urlVisualizacao, "_blank")}>Abrir</Button>
                              <Button type="button" size="sm" variant="danger" onClick={() => setAnexoExcluirId(item.id)}>Remover</Button>
                            </div>
                          </div>
                        ))
                      ) : <EmptyState texto="Nenhum anexo registrado." />}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Vínculos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4">
                    <div className="grid gap-3 md:grid-cols-[180px_180px_minmax(0,1fr)_auto]">
                      <CampoSelect label="Tipo de vínculo" value={vinculoForm.tipo_vinculo} options={opcoesVinculo} onChange={(value) => setVinculoForm((atual) => ({ ...atual, tipo_vinculo: value }))} placeholder="Selecione" />
                      <Campo label="Referência" value={vinculoForm.referencia_id} onChange={(value) => setVinculoForm((atual) => ({ ...atual, referencia_id: value }))} />
                      <Campo label="Descrição" value={vinculoForm.referencia_descricao} onChange={(value) => setVinculoForm((atual) => ({ ...atual, referencia_descricao: value }))} />
                      <div className="flex items-end"><Button type="button" onClick={() => void salvarNovoVinculo()}>Vincular</Button></div>
                    </div>
                    <div className="space-y-2">
                      {(detalhe.data?.vinculos ?? []).length > 0 ? (
                        (detalhe.data?.vinculos ?? []).map((item) => (
                          <div key={item.id} className="rounded-xl border border-[var(--g3-border)] px-3 py-3">
                            <p className="text-sm font-semibold">{item.referenciaDescricao}</p>
                            <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.tipoVinculo} • {item.referenciaId ?? "Sem referência"} • {formatarData(item.criadoEm)}</p>
                          </div>
                        ))
                      ) : <EmptyState texto="Nenhum vínculo registrado." />}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Histórico</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-4">
                    {(detalhe.data?.historico ?? []).length > 0 ? (
                      (detalhe.data?.historico ?? []).map((item) => (
                        <div key={item.id} className="rounded-xl border border-[var(--g3-border)] px-3 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{item.descricao}</p>
                            <p className="text-xs text-[var(--g3-muted)]">{formatarData(item.criadoEm)}</p>
                          </div>
                          <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.usuario?.nome ?? "Sistema"} • {item.tipoEvento}</p>
                          {item.valorAnterior || item.valorNovo ? <p className="mt-2 text-sm">{item.valorAnterior ? `De: ${item.valorAnterior}` : ""}{item.valorAnterior && item.valorNovo ? " • " : ""}{item.valorNovo ? `Para: ${item.valorNovo}` : ""}</p> : null}
                        </div>
                      ))
                    ) : <EmptyState texto="Nenhum histórico registrado." />}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : <EmptyState texto="Selecione um chamado na listagem para visualizar o detalhe." />
        ) : null}

        {abaAtiva === "desenvolvimento" ? (
          podeDesenvolver ? (
            chamadoAtual ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Situação técnica</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
                    <Info label="Chamado" value={chamadoAtual.codigo} />
                    <div className="space-y-1">
                      <Label>Situação atual</Label>
                      <div className="rounded-lg border border-[var(--g3-border)] px-3 py-2"><BadgeParametro parametro={chamadoAtual.situacao} fallback="Sem situação" /></div>
                    </div>
                    <Info label="Solicitante" value={chamadoAtual.solicitante} />
                    <Info label="Submenu" value={resolverSubmenuPorRota(chamadoAtual.submenuRota, submenuOptions) ?? "---"} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Ação de desenvolvimento</CardTitle></CardHeader>
                  <CardContent className="space-y-4 p-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <CampoSelect label="Nova situação" value={statusForm.situacao_id} options={situacoesDesenvolvimento} onChange={(value) => setStatusForm((atual) => ({ ...atual, situacao_id: value }))} placeholder="Selecione" />
                      <CampoSelect label="Motivo de reabertura" value={statusForm.motivo_reabertura_id} options={motivoReaberturaOptions} onChange={(value) => setStatusForm((atual) => ({ ...atual, motivo_reabertura_id: value }))} placeholder="Selecione" />
                    </div>
                    <AreaTexto label="Resolução / orientação técnica" value={statusForm.resolucao} onChange={(value) => setStatusForm((atual) => ({ ...atual, resolucao: value }))} />
                    <AreaTexto label="Justificativa de reabertura" value={statusForm.justificativa_reabertura} onChange={(value) => setStatusForm((atual) => ({ ...atual, justificativa_reabertura: value }))} />
                    <div className="flex justify-end"><Button type="button" onClick={() => void atualizarStatus()}>Atualizar situação</Button></div>
                  </CardContent>
                </Card>
              </div>
            ) : <EmptyState texto="Selecione um chamado para atuar na aba de desenvolvimento." />
          ) : <EmptyState texto="A aba de desenvolvimento é restrita a usuários com permissão de desenvolvimento." />
        ) : null}

        {abaAtiva === "filtros" ? (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Salvar filtro atual</CardTitle></CardHeader>
              <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <Campo label="Nome do filtro" value={nomeFiltro} onChange={setNomeFiltro} />
                <div className="flex items-end"><Button type="button" onClick={() => void salvarFiltroAtual()}>Salvar filtro atual</Button></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Filtros salvos</CardTitle></CardHeader>
              <CardContent className="space-y-3 p-4">
                {(filtrosSalvos.data ?? []).length > 0 ? (
                  (filtrosSalvos.data ?? []).map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[var(--g3-border)] px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold">{item.nome}</p>
                        <p className="text-xs text-[var(--g3-muted)]">{item.padrao ? "Filtro padrão" : "Filtro salvo"} • {formatarData(item.atualizadoEm)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => { setFiltros(item.filtros as ChamadoTecnicoFiltros); setAbaAtiva("painel"); }}>Aplicar</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => void salvarFiltro.mutateAsync({ id: item.id, nome: item.nome, filtros: item.filtros, padrao: true })}>Tornar padrão</Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => void removerFiltro.mutateAsync(item.id)}>Excluir</Button>
                      </div>
                    </div>
                  ))
                ) : <EmptyState texto="Nenhum filtro salvo até o momento." />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Parâmetros auxiliares</CardTitle></CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <CampoSelect label="Tipo" value={parametroForm.tipo} options={[{ id: "TIPO", nome: "Tipo" }, { id: "CATEGORIA", nome: "Categoria" }, { id: "PRIORIDADE", nome: "Prioridade" }, { id: "SITUACAO", nome: "Situação" }, { id: "SISTEMA", nome: "Sistema" }, { id: "PROJETO", nome: "Projeto" }, { id: "SPRINT", nome: "Sprint" }, { id: "MOTIVO_REABERTURA", nome: "Motivo de reabertura" }, { id: "ORIGEM", nome: "Origem" }]} onChange={(value) => setParametroForm((atual) => ({ ...atual, tipo: value }))} placeholder="Selecione" />
                  <Campo label="Chave" value={parametroForm.chave} onChange={(value) => setParametroForm((atual) => ({ ...atual, chave: value.toUpperCase().replace(/\s+/g, "_") }))} />
                  <Campo label="Nome" value={parametroForm.nome} onChange={(value) => setParametroForm((atual) => ({ ...atual, nome: value }))} />
                  <Campo label="Cor" value={parametroForm.cor ?? ""} onChange={(value) => setParametroForm((atual) => ({ ...atual, cor: value }))} />
                  <Campo label="Ordem" value={String(parametroForm.ordem ?? 0)} onChange={(value) => setParametroForm((atual) => ({ ...atual, ordem: Number(value || 0) }))} />
                  <Campo label="SLA em horas" value={parametroForm.sla_horas ? String(parametroForm.sla_horas) : ""} onChange={(value) => setParametroForm((atual) => ({ ...atual, sla_horas: value ? Number(value) : undefined }))} />
                  <Campo label="Descrição" value={parametroForm.descricao ?? ""} onChange={(value) => setParametroForm((atual) => ({ ...atual, descricao: value }))} />
                  <div className="flex flex-wrap items-end gap-4">
                    <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={parametroForm.padrao ?? false} onChange={(event) => setParametroForm((atual) => ({ ...atual, padrao: event.target.checked }))} />Padrão</label>
                    <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={parametroForm.ativo ?? true} onChange={(event) => setParametroForm((atual) => ({ ...atual, ativo: event.target.checked }))} />Ativo</label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" onClick={() => void salvarParametroAuxiliar()}>{parametroIdEdicao ? "Atualizar parâmetro" : "Salvar parâmetro"}</Button>
                  <Button type="button" variant="outline" onClick={() => { setParametroIdEdicao(undefined); setParametroForm(parametroPadrao); }}>Limpar formulário</Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {["tipo", "prioridade", "situacao", "sistema", "projeto", "sprint", "origem"].map((chave) => (
                    <Card key={chave}>
                      <CardContent className="space-y-2 p-3 text-sm">
                        <p className="font-semibold capitalize">{chave}</p>
                        {(parametros[chave] ?? []).slice(0, 10).map((item: ChamadoParametro) => (
                          <button key={item.id} type="button" className="block w-full rounded-md border border-[var(--g3-border)] px-2 py-1 text-left hover:bg-[var(--g3-primary-soft)]" onClick={() => { setParametroIdEdicao(item.id); setParametroForm({ tipo: item.tipo, chave: item.chave, nome: item.nome, descricao: "", cor: item.cor ?? "", ordem: item.ordem ?? 0, sla_horas: item.slaHoras, padrao: item.padrao ?? false, ativo: item.ativo ?? true }); }}>
                            {item.nome}
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao
        aberto={!!anexoExcluirId}
        titulo="Remover anexo"
        texto="Deseja remover este anexo do chamado?"
        processando={removerAnexo.isPending}
        onCancel={() => setAnexoExcluirId(undefined)}
        onConfirm={() => {
          if (!selecionadoId || !anexoExcluirId) return;
          void removerAnexo.mutateAsync({ id: selecionadoId, arquivoId: anexoExcluirId }).then(() => {
            setAnexoExcluirId(undefined);
            return detalhe.refetch();
          }).catch((error) => {
            setPopup({ tipo: "erro", titulo: "Erro", texto: extrairMensagem(error, "Não foi possível remover o anexo.") });
          });
        }}
        confirmarTexto="Remover"
      />
    </>
  );
}

function CardResumo({ titulo, total }: { titulo: string; total: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">{titulo}</p>
        <p className="mt-2 text-2xl font-semibold text-[var(--g3-foreground)]">{total}</p>
      </CardContent>
    </Card>
  );
}

function Resumo({ titulo, itens }: { titulo: string; itens: Array<{ label: string; total: number }> }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{titulo}</CardTitle></CardHeader>
      <CardContent className="space-y-2 p-4">
        {itens.length > 0 ? itens.map((item) => (
          <div key={`${titulo}-${item.label}`} className="flex items-center justify-between gap-3">
            <span className="text-sm">{item.label}</span>
            <span className="text-sm font-semibold">{item.total}</span>
          </div>
        )) : <p className="text-sm text-[var(--g3-muted)]">Sem dados na listagem atual.</p>}
      </CardContent>
    </Card>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return <div className="rounded-xl border border-dashed border-[var(--g3-border)] px-4 py-5 text-sm text-[var(--g3-muted)]">{texto}</div>;
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function CampoSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Todos",
  disabled = false
}: {
  label: string;
  value: string;
  options: Array<{ id: string; nome: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>{item.nome}</option>
        ))}
      </Select>
    </div>
  );
}

function AreaTexto({
  label,
  value,
  onChange,
  rows = 5
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Info({
  label,
  value,
  full = false
}: {
  label: string;
  value?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "space-y-1 md:col-span-2 xl:col-span-4" : "space-y-1"}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">{label}</p>
      <p className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-sm">{value || "---"}</p>
    </div>
  );
}

function BadgeParametro({
  parametro,
  fallback
}: {
  parametro?: ChamadoParametro | null;
  fallback: string;
}) {
  if (!parametro) {
    return <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">{fallback}</span>;
  }

  const cor = parametro.cor || "#475569";
  return (
    <span className="rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ color: cor, borderColor: hexToRgba(cor, 0.24), backgroundColor: hexToRgba(cor, 0.12) }}>
      {parametro.nome}
    </span>
  );
}

function atualizarCampo(
  setForm: Dispatch<SetStateAction<ChamadoTecnicoInput>>,
  campo: keyof ChamadoTecnicoInput,
  valor: string | number | string[] | undefined
) {
  setForm((atual) => ({ ...atual, [campo]: valor }));
}

function atualizarFiltros(
  setFiltros: Dispatch<SetStateAction<ChamadoTecnicoFiltros>>,
  campo: keyof ChamadoTecnicoFiltros,
  valor: string | number | undefined
) {
  setFiltros((atual) => ({ ...atual, [campo]: valor, pagina: 1 }));
}

function limparPayload(formulario: Record<string, unknown>) {
  const payload = { ...formulario };
  Object.keys(payload).forEach((chave) => {
    const valor = payload[chave];
    if (valor === "" || valor === undefined || valor === null || (Array.isArray(valor) && valor.length === 0)) {
      delete payload[chave];
    }
  });
  return payload;
}

function prepararPayloadChamado(form: ChamadoTecnicoInput): ChamadoTecnicoInput {
  const payload = limparPayload({ ...form }) as Partial<ChamadoTecnicoInput>;

  delete payload.interessado;
  delete payload.categoria_id;
  delete payload.responsavel_usuario_id;
  delete payload.tags;
  delete payload.passos_reproduzir;
  delete payload.resultado_obtido;
  delete payload.ambiente;
  delete payload.navegador_dispositivo;
  delete payload.impacto_uso;
  delete payload.quantidade_usuarios_afetados;
  delete payload.numero_release;

  return payload as ChamadoTecnicoInput;
}

function mapDetalheParaForm(chamado: ChamadoTecnicoDetalhe): ChamadoTecnicoInput {
  return {
    solicitante: chamado.solicitante,
    cliente: chamado.cliente ?? "",
    sistema_id: chamado.sistema?.id ?? "",
    projeto_id: chamado.projeto?.id ?? "",
    sprint_id: chamado.sprint?.id ?? "",
    tipo_id: chamado.tipo?.id ?? "",
    prioridade_id: chamado.prioridade?.id ?? "",
    resumo: chamado.resumo,
    descricao: chamado.descricao,
    resultado_esperado: chamado.resultadoEsperado ?? "",
    menu_nome: chamado.menuNome ?? chamado.moduloAfetado ?? "",
    submenu_rota: chamado.submenuRota ?? chamado.urlTela ?? "",
    versao_sistema: chamado.versaoSistema ?? "",
    origem_id: chamado.origem?.id ?? ""
  };
}

function filtrarParametros(parametros: ChamadoParametro[], chaves: string[]) {
  if (!parametros.length) return [];

  const mapaOrdem = new Map(chaves.map((chave, index) => [normalizarChaveParametro(chave), index]));
  const filtrados = parametros.filter((item) => {
    const chaveNormalizada = normalizarChaveParametro(item.chave);
    const nomeNormalizado = normalizarChaveParametro(item.nome);
    return mapaOrdem.has(chaveNormalizada) || mapaOrdem.has(nomeNormalizado);
  });

  const base = filtrados.length > 0 ? filtrados : parametros;

  return [...base].sort((itemA, itemB) => {
    const ordemA = mapaOrdem.get(normalizarChaveParametro(itemA.chave)) ?? mapaOrdem.get(normalizarChaveParametro(itemA.nome)) ?? itemA.ordem ?? 999;
    const ordemB = mapaOrdem.get(normalizarChaveParametro(itemB.chave)) ?? mapaOrdem.get(normalizarChaveParametro(itemB.nome)) ?? itemB.ordem ?? 999;
    if (ordemA !== ordemB) return ordemA - ordemB;
    if (itemA.ordem !== itemB.ordem) return itemA.ordem - itemB.ordem;
    return itemA.nome.localeCompare(itemB.nome, "pt-BR");
  });
}

function obterParametrosCatalogo(parametros: Record<string, ChamadoParametro[]>, tipo: string) {
  const chaveNormalizada = normalizarChaveParametro(tipo).toLowerCase();
  const listaDireta = (parametros[chaveNormalizada] ?? []).filter(Boolean);
  if (listaDireta.length > 0) {
    return listaDireta;
  }

  return Object.values(parametros)
    .flatMap((item) => item ?? [])
    .filter((item): item is ChamadoParametro => !!item)
    .filter((item) => normalizarChaveParametro(item.tipo) === normalizarChaveParametro(tipo))
    .sort((itemA, itemB) => {
      if (itemA.ordem !== itemB.ordem) return itemA.ordem - itemB.ordem;
      return itemA.nome.localeCompare(itemB.nome, "pt-BR");
    });
}

function normalizarChaveParametro(valor?: string) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolverSubmenuPorRota(rota: string | undefined, submenuOptions: MenuRouteOption[]) {
  if (!rota) return undefined;
  return submenuOptions.find((item) => item.rota === rota)?.submenu;
}

function formatarData(valor?: string) {
  if (!valor) return "---";
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? valor
    : data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatarTempo(inicio?: string, fim?: string | null) {
  if (!inicio) return "---";
  const dataInicio = new Date(inicio).getTime();
  const dataFim = fim ? new Date(fim).getTime() : Date.now();
  if (!Number.isFinite(dataInicio) || !Number.isFinite(dataFim)) return "---";
  const horas = Math.max(0, Math.round((dataFim - dataInicio) / 3_600_000));
  if (horas < 24) return `${horas}h`;
  return `${Math.floor(horas / 24)}d ${horas % 24}h`;
}

function formatarTamanho(valor: number) {
  if (valor < 1024) return `${valor} B`;
  if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;
  return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
}

function agruparPorNome(labels: string[]) {
  const mapa = new Map<string, number>();
  labels.forEach((label) => mapa.set(label, (mapa.get(label) ?? 0) + 1));
  return [...mapa.entries()].map(([label, total]) => ({ label, total })).sort((itemA, itemB) => itemB.total - itemA.total).slice(0, 6);
}

function extrairMensagem(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } }; message?: unknown })?.response?.data?.message ?? (error as { message?: unknown })?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function textoSla(sla?: string, resolvidoEm?: string, fechadoEm?: string) {
  if (fechadoEm) return "Fechado";
  if (resolvidoEm) return "Resolvido";
  if (!sla) return "Sem prazo";
  return new Date(sla).getTime() < Date.now() ? "Prazo vencido" : `Até ${formatarData(sla)}`;
}

function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function extrairNomeArquivo(contentDisposition?: string) {
  const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1];
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((char) => `${char}${char}`).join("") : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(71, 85, 105, ${alpha})`;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
