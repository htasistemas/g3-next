import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  CheckCheck,
  ClipboardList,
  FileCheck,
  FileSpreadsheet,
  History,
  List,
  PackageCheck,
  Paperclip,
  Plus,
  Printer,
  Save,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  Undo2,
  Wallet,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import { resolverUrlArquivo } from "@/lib/arquivos";
import { formatarCnpj, formatarCpf, formatarMoedaInput, normalizarMoeda, somenteDigitos, validarCnpj, validarCpf } from "@/lib/br-utils";
import { autorizacaoComprasService } from "@/services/autorizacao-compras.service";
import {
  useArquivosAutorizacaoCompra,
  useAutorizacoesCompras,
  useCriarCotacaoAutorizacao,
  useDefinirFornecedorAutorizacao,
  useDetalheAutorizacaoCompra,
  useEnviarAutorizacaoParaAprovacao,
  useExcluirArquivoAutorizacaoCompra,
  useExcluirAutorizacaoCompra,
  useExcluirCotacaoAutorizacao,
  useGerarAutorizacaoPagamento,
  usePainelAutorizacoesCompras,
  useRegistrarAprovacaoCompra,
  useRegistrarReservaAutorizacao,
  useRemoverReservaAutorizacao,
  useSalvarAutorizacaoCompra,
  useSetoresSolicitantesAutorizacao,
  useUploadArquivoAutorizacaoCompra
} from "@/features/autorizacao-compras/use-autorizacao-compras";
import { useContasBancarias } from "@/features/contabilidade/use-contabilidade";
import type {
  AprovacaoCompraPayload,
  AutorizacaoCompraDetalhe,
  AutorizacaoCompraPayload,
  AutorizacaoCompraTipoCompra,
  AutorizacaoCotacaoPayload,
  AutorizacaoPagamentoPayload,
  EscolhaFornecedorPayload,
  ReservaBancariaPayload
} from "@/types/autorizacao-compras";

type AbaId =
  | "listagem"
  | "solicitacao"
  | "aprovacoes"
  | "cotacoes"
  | "fornecedor"
  | "reserva"
  | "pagamento"
  | "lancamentos"
  | "integracoes"
  | "historico"
  | "anexos"
  | "impressoes";

type TipoDocumentoCotacao = "cpf" | "cnpj";

const abas: AdminTab[] = [
  { id: "listagem", label: "Painel e listagem", icon: List },
  { id: "solicitacao", label: "Solicitação", icon: ShoppingCart },
  { id: "aprovacoes", label: "Aprovações", icon: CheckCheck },
  { id: "cotacoes", label: "Cotações", icon: FileCheck },
  { id: "fornecedor", label: "Fornecedor vencedor", icon: ClipboardList },
  { id: "reserva", label: "Reserva financeira", icon: Wallet },
  { id: "pagamento", label: "Autorização de pagamento", icon: Banknote },
  { id: "lancamentos", label: "Lançamentos", icon: FileSpreadsheet },
  { id: "integracoes", label: "Integrações", icon: PackageCheck },
  { id: "historico", label: "Histórico", icon: History },
  { id: "anexos", label: "Anexos", icon: Paperclip },
  { id: "impressoes", label: "Impressões", icon: Printer }
];

const tituloTela = "Autorização de compras";

const statusLabels: Record<string, string> = {
  SOLICITADO: "Solicitado",
  EM_ANALISE: "Em análise",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  DEVOLVIDO_PARA_AJUSTE: "Devolvido para ajuste",
  EM_COTACAO: "Em cotação",
  COTACAO_CONCLUIDA: "Cotação concluída",
  FORNECEDOR_DEFINIDO: "Fornecedor definido",
  FORA_DO_ORCAMENTO: "Fora do orçamento",
  RESERVA_EFETUADA: "Reserva efetuada",
  RESERVA_CANCELADA: "Reserva cancelada",
  PAGAMENTO_AUTORIZADO: "Pagamento autorizado",
  DESPESA_LANCADA: "Despesa lançada",
  INTEGRADO_AO_ALMOXARIFADO: "Integrado ao almoxarifado",
  INTEGRADO_AO_PATRIMONIO: "Integrado ao patrimônio",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado"
};

const tiposCompraOptions: Array<{ value: AutorizacaoCompraTipoCompra; label: string }> = [
  { value: "Material de consumo", label: "Material de consumo" },
  { value: "Bens patrimoniais", label: "Bens patrimoniais" },
  { value: "Serviços", label: "Serviços" }
];

function normalizarTipoCompra(valor?: string | null): AutorizacaoCompraTipoCompra {
  const normalizado = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (normalizado === "bens patrimoniais" || normalizado === "bem patrimonial" || normalizado === "bem") {
    return "Bens patrimoniais";
  }

  if (normalizado === "servicos" || normalizado === "servico") {
    return "Serviços";
  }

  return "Material de consumo";
}

function tipoCompraParaItem(tipoCompra: AutorizacaoCompraTipoCompra) {
  switch (tipoCompra) {
    case "Bens patrimoniais":
      return "bem" as const;
    case "Serviços":
      return "servico" as const;
    default:
      return "material" as const;
  }
}

const compraVazia = (solicitante = ""): AutorizacaoCompraPayload => ({
  solicitante,
  setorSolicitante: "",
  centroCusto: "",
  dataSolicitacao: new Date().toISOString().slice(0, 10),
  prioridade: "normal",
  justificativa: "",
  observacoes: "",
  tipoCompra: "Material de consumo",
  naturezaCompra: "",
  dataPrevista: "",
  dispensarCotacao: false,
  motivoDispensa: "",
  autorizacaoEspecialOrcamento: false,
  justificativaOrcamento: "",
  orcamentoPrevisto: 0,
  registroPatrimonio: false,
  registroAlmoxarifado: true,
  itens: [
    {
      descricao: "",
      quantidade: 1,
      unidade: "un",
      valorEstimado: 0,
      categoria: "",
      tipoItem: "material"
    }
  ]
});

const cotacaoVazia: AutorizacaoCotacaoPayload = {
  fornecedor: "",
  cnpj: "",
  contato: "",
  situacaoCadastral: "",
  inicioAtividade: "",
  enderecoCartaoCnpj: "",
  valor: 0,
  prazoEntrega: "",
  formaPagamento: "",
  validadeProposta: new Date().toISOString().slice(0, 10),
  observacoes: "",
  dataCotacao: new Date().toISOString().slice(0, 10)
};

const aprovacaoVazia: AprovacaoCompraPayload = {
  acao: "APROVAR",
  parecer: "",
  observacao: "",
  motivo: ""
};

const escolhaVazia: EscolhaFornecedorPayload = {
  cotacaoId: 0,
  justificativaDivergencia: ""
};

const reservaVazia: ReservaBancariaPayload = {
  contaBancariaId: 0,
  valor: 0,
  observacao: ""
};

const pagamentoVazio: AutorizacaoPagamentoPayload = {
  valorAutorizado: 0,
  vencimento: new Date().toISOString().slice(0, 10),
  formaPagamento: "",
  contaPagadoraId: 0,
  documentoReferencia: "",
  documentoFiscal: "",
  observacoes: "",
  justificativaDivergencia: ""
};

function moeda(valor?: number) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function badgeClasse(status?: string) {
  if (status === "FINALIZADO" || status === "APROVADO") return "bg-emerald-100 text-emerald-700";
  if (status === "FORA_DO_ORCAMENTO" || status === "REPROVADO" || status === "CANCELADO") {
    return "bg-rose-100 text-rose-700";
  }
  if (status === "PAGAMENTO_AUTORIZADO" || status === "RESERVA_EFETUADA") {
    return "bg-blue-100 text-blue-700";
  }
  return "bg-amber-100 text-amber-700";
}

function toPayload(detalhe: AutorizacaoCompraDetalhe): AutorizacaoCompraPayload {
  const tipoCompra = normalizarTipoCompra(detalhe.tipoCompra);
  return {
    numeroSolicitacao: detalhe.numeroSolicitacao,
    titulo: detalhe.titulo,
    solicitante: detalhe.solicitante ?? "",
    setorSolicitante: detalhe.setorSolicitante ?? "",
    centroCusto: detalhe.centroCusto ?? "",
    dataSolicitacao: detalhe.dataSolicitacao,
    prioridade: detalhe.prioridade,
    justificativa: "",
    observacoes: "",
    tipoCompra,
    naturezaCompra: detalhe.naturezaCompra ?? "",
    dataPrevista: "",
    status: detalhe.status,
    dispensarCotacao: detalhe.dispensarCotacao,
    motivoDispensa: detalhe.motivoDispensa ?? "",
    autorizacaoEspecialOrcamento: detalhe.orcamento.autorizacaoEspecial,
    justificativaOrcamento: detalhe.orcamento.justificativa ?? "",
    orcamentoPrevisto: detalhe.orcamento.previsto,
    registroPatrimonio: detalhe.registroPatrimonio,
    registroAlmoxarifado: detalhe.registroAlmoxarifado,
    itens: detalhe.itens.map((item) => ({
      descricao: item.descricao,
      quantidade: item.quantidade,
      unidade: item.unidade,
      valorEstimado: item.valorEstimado,
      categoria: item.categoria,
      tipoItem: tipoCompraParaItem(tipoCompra)
    }))
  };
}

export function AutorizacaoComprasPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [autorizacaoSelecionadaId, setAutorizacaoSelecionadaId] = useState<string>();
  const [filtro, setFiltro] = useState("");
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [form, setForm] = useState<AutorizacaoCompraPayload>(compraVazia(usuario?.nome ?? usuario?.nomeUsuario ?? ""));
  const [snapshot, setSnapshot] = useState<AutorizacaoCompraPayload>(compraVazia(usuario?.nome ?? usuario?.nomeUsuario ?? ""));
  const [cotacaoForm, setCotacaoForm] = useState<AutorizacaoCotacaoPayload>(cotacaoVazia);
  const [tipoDocumentoCotacao, setTipoDocumentoCotacao] = useState<TipoDocumentoCotacao>("cnpj");
  const [consultandoDocumentoCotacao, setConsultandoDocumentoCotacao] = useState(false);
  const [aprovacaoForm, setAprovacaoForm] = useState<AprovacaoCompraPayload>(aprovacaoVazia);
  const [fornecedorForm, setFornecedorForm] = useState<EscolhaFornecedorPayload>(escolhaVazia);
  const [reservaForm, setReservaForm] = useState<ReservaBancariaPayload>(reservaVazia);
  const [pagamentoForm, setPagamentoForm] = useState<AutorizacaoPagamentoPayload>(pagamentoVazio);
  const [arquivoObservacao, setArquivoObservacao] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [arquivoOrcamentoCotacao, setArquivoOrcamentoCotacao] = useState<File | null>(null);
  const [arquivoCartaoCotacao, setArquivoCartaoCotacao] = useState<File | null>(null);

  const listaQuery = useAutorizacoesCompras();
  const indicadoresQuery = usePainelAutorizacoesCompras();
  const setoresQuery = useSetoresSolicitantesAutorizacao();
  const detalheQuery = useDetalheAutorizacaoCompra(autorizacaoSelecionadaId);
  const arquivosQuery = useArquivosAutorizacaoCompra(autorizacaoSelecionadaId);
  const contasBancariasQuery = useContasBancarias();

  const salvarMutation = useSalvarAutorizacaoCompra();
  const excluirMutation = useExcluirAutorizacaoCompra();
  const enviarMutation = useEnviarAutorizacaoParaAprovacao();
  const aprovarMutation = useRegistrarAprovacaoCompra();
  const criarCotacaoMutation = useCriarCotacaoAutorizacao();
  const excluirCotacaoMutation = useExcluirCotacaoAutorizacao(autorizacaoSelecionadaId);
  const definirFornecedorMutation = useDefinirFornecedorAutorizacao();
  const registrarReservaMutation = useRegistrarReservaAutorizacao();
  const removerReservaMutation = useRemoverReservaAutorizacao(autorizacaoSelecionadaId);
  const pagarMutation = useGerarAutorizacaoPagamento();
  const uploadArquivoMutation = useUploadArquivoAutorizacaoCompra(autorizacaoSelecionadaId);
  const excluirArquivoMutation = useExcluirArquivoAutorizacaoCompra(autorizacaoSelecionadaId);

  const detalhe = detalheQuery.data;
  const lista = listaQuery.data ?? [];
  const arquivos = arquivosQuery.data ?? detalhe?.anexos ?? [];
  const indicadores = indicadoresQuery.data;
  const setoresCatalogo = setoresQuery.data ?? [];
  const contasBancarias = contasBancariasQuery.data ?? [];

  const setoresOptions = useMemo(() => {
    const mapa = new Map<string, string>();
    setoresCatalogo.forEach((setor) => {
      mapa.set(setor.valor, setor.label);
    });
    if (form.setorSolicitante?.trim() && !mapa.has(form.setorSolicitante)) {
      mapa.set(form.setorSolicitante, form.setorSolicitante);
    }
    return Array.from(mapa.entries()).map(([value, label]) => ({ value, label }));
  }, [form.setorSolicitante, setoresCatalogo]);

  useEffect(() => {
    if (!detalhe) return;
    const payload = toPayload(detalhe);
    setForm(payload);
    setSnapshot(payload);
    setFornecedorForm({
      cotacaoId: detalhe.fornecedorEscolhido?.cotacaoId ?? detalhe.fornecedorSugerido?.cotacaoId ?? 0,
      justificativaDivergencia: detalhe.justificativaExcecaoMenorPreco ?? ""
    });
    setReservaForm((atual) => ({ ...atual, valor: detalhe.valorTotal || 0 }));
    setPagamentoForm({
      valorAutorizado: detalhe.autorizacaoPagamento.valorAutorizado ?? detalhe.valorTotal,
      vencimento: detalhe.autorizacaoPagamento.vencimento ?? new Date().toISOString().slice(0, 10),
      formaPagamento: detalhe.autorizacaoPagamento.formaPagamento ?? "",
      contaPagadoraId: detalhe.autorizacaoPagamento.contaPagadoraId ?? 0,
      documentoReferencia: detalhe.autorizacaoPagamento.documentoReferencia ?? "",
      documentoFiscal: detalhe.autorizacaoPagamento.documentoFiscal ?? "",
      observacoes: detalhe.autorizacaoPagamento.observacoes ?? "",
      justificativaDivergencia: ""
    });
  }, [detalhe]);

  const processando =
    salvarMutation.isPending ||
    excluirMutation.isPending ||
    enviarMutation.isPending ||
    aprovarMutation.isPending ||
    criarCotacaoMutation.isPending ||
    excluirCotacaoMutation.isPending ||
    definirFornecedorMutation.isPending ||
    consultandoDocumentoCotacao ||
    registrarReservaMutation.isPending ||
    removerReservaMutation.isPending ||
    pagarMutation.isPending ||
    uploadArquivoMutation.isPending ||
    excluirArquivoMutation.isPending;

  const listaFiltrada = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (!termo) return lista;
    return lista.filter((item) => {
      const alvo = `${item.numeroSolicitacao ?? ""} ${item.titulo} ${item.solicitante ?? ""} ${item.setorSolicitante ?? ""} ${item.status}`;
      return alvo.toLowerCase().includes(termo);
    });
  }, [filtro, lista]);

  function novo() {
    const vazio = compraVazia(usuario?.nome ?? usuario?.nomeUsuario ?? "");
    setAutorizacaoSelecionadaId(undefined);
    setForm(vazio);
    setSnapshot(vazio);
    setCotacaoForm(cotacaoVazia);
    setTipoDocumentoCotacao("cnpj");
    setAprovacaoForm(aprovacaoVazia);
    setFornecedorForm(escolhaVazia);
    setReservaForm(reservaVazia);
    setPagamentoForm(pagamentoVazio);
    setAbaAtiva("solicitacao");
  }

  function selecionarAutorizacao(id: string) {
    setAutorizacaoSelecionadaId(id);
    setAbaAtiva("solicitacao");
  }

  function cancelarEdicao() {
    setForm(snapshot);
  }

  function adicionarItem() {
    setForm((atual) => ({
      ...atual,
      itens: [
        ...atual.itens,
        {
          descricao: "",
          quantidade: 1,
          unidade: "un",
          valorEstimado: 0,
          categoria: "",
          tipoItem: tipoCompraParaItem(atual.tipoCompra)
        }
      ]
    }));
  }

  function atualizarTipoCompra(tipoCompra: AutorizacaoCompraTipoCompra) {
    setForm((atual) => ({
      ...atual,
      tipoCompra,
      registroPatrimonio: tipoCompra === "Bens patrimoniais",
      registroAlmoxarifado: tipoCompra === "Material de consumo",
      itens: atual.itens.map((item) => ({
        ...item,
        tipoItem: tipoCompraParaItem(tipoCompra)
      }))
    }));
  }

  function removerItem(index: number) {
    setForm((atual) => ({
      ...atual,
      itens: atual.itens.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function salvar() {
    try {
      const response = await salvarMutation.mutateAsync({
        id: autorizacaoSelecionadaId,
        payload: form
      });
      setAutorizacaoSelecionadaId(String(response.id));
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Solicitação salva com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar a solicitação."
      });
    }
  }

  async function enviarParaAprovacao() {
    if (!autorizacaoSelecionadaId) return;
    try {
      await enviarMutation.mutateAsync(autorizacaoSelecionadaId);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Fluxo enviado para aprovação." });
      setAbaAtiva("aprovacoes");
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível enviar para aprovação."
      });
    }
  }

  async function confirmarExclusaoAutorizacao() {
    if (!autorizacaoSelecionadaId) return;
    try {
      await excluirMutation.mutateAsync(autorizacaoSelecionadaId);
      setConfirmarExclusao(false);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Processo cancelado com sucesso." });
      novo();
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível cancelar o processo."
      });
    }
  }

  async function registrarAprovacao() {
    if (!autorizacaoSelecionadaId) return;
    try {
      await aprovarMutation.mutateAsync({ id: autorizacaoSelecionadaId, payload: aprovacaoForm });
      setAprovacaoForm(aprovacaoVazia);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Ação de aprovação registrada." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível registrar a aprovação."
      });
    }
  }

  function atualizarDocumentoCotacao(valor: string, tipo = tipoDocumentoCotacao) {
    const limite = tipo === "cpf" ? 11 : 14;
    const digitos = somenteDigitos(valor).slice(0, limite);
    setCotacaoForm((atual) => ({
      ...atual,
      cnpj: tipo === "cpf" ? formatarCpf(digitos) : formatarCnpj(digitos)
    }));
  }

  function alternarTipoDocumentoCotacao(usarCpf: boolean) {
    const tipo: TipoDocumentoCotacao = usarCpf ? "cpf" : "cnpj";
    setTipoDocumentoCotacao(tipo);
    if (tipo === "cpf") {
      setArquivoCartaoCotacao(null);
    }
    atualizarDocumentoCotacao(cotacaoForm.cnpj, tipo);
  }

  async function consultarDocumentoCotacao() {
    const documento = somenteDigitos(cotacaoForm.cnpj);
    const documentoValido =
      tipoDocumentoCotacao === "cpf" ? validarCpf(documento) : validarCnpj(documento);

    if (!documentoValido) {
      setPopup({
        tipo: "erro",
        titulo: "Documento inválido",
        texto: tipoDocumentoCotacao === "cpf" ? "Informe um CPF válido." : "Informe um CNPJ válido."
      });
      return;
    }

    setConsultandoDocumentoCotacao(true);
    try {
      const consulta = await autorizacaoComprasService.consultarDocumentoFornecedor(
        tipoDocumentoCotacao,
        documento
      );

      if (tipoDocumentoCotacao === "cpf") {
        setCotacaoForm((atual) => ({ ...atual, cnpj: formatarCpf(consulta.documento) }));
        setPopup({
          tipo: "sucesso",
          titulo: "CPF validado",
          texto: consulta.mensagem ?? "CPF validado com sucesso."
        });
        return;
      }

      const detalhesCartao = [
        consulta.origem ? `Origem: ${consulta.origem}` : "",
        consulta.situacaoCadastral ? `Situação cadastral: ${consulta.situacaoCadastral}` : "",
        consulta.dataInicioAtividade ? `Início de atividade: ${consulta.dataInicioAtividade}` : "",
        consulta.atividadePrincipal ? `Atividade principal: ${consulta.atividadePrincipal}` : "",
        consulta.endereco ? `Endereço: ${consulta.endereco}` : ""
      ].filter(Boolean);

      setCotacaoForm((atual) => ({
        ...atual,
        cnpj: formatarCnpj(consulta.documento),
        fornecedor: consulta.fornecedor || atual.fornecedor,
        razaoSocial: consulta.razaoSocial || atual.razaoSocial,
        telefone: consulta.telefone || atual.telefone,
        email: consulta.email || atual.email,
        situacaoCadastral: consulta.situacaoCadastral || atual.situacaoCadastral,
        inicioAtividade: consulta.dataInicioAtividade || atual.inicioAtividade,
        enderecoCartaoCnpj: consulta.endereco || atual.enderecoCartaoCnpj,
        observacoes: detalhesCartao.length
          ? [atual.observacoes?.trim(), `Cartão CNPJ consultado. ${detalhesCartao.join(" | ")}`]
              .filter(Boolean)
              .join("\n")
          : atual.observacoes
      }));
      setPopup({
        tipo: "sucesso",
        titulo: "CNPJ consultado",
        texto: "Dados principais do cartão CNPJ preenchidos na cotação."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro na consulta",
        texto: error?.response?.data?.message ?? "Não foi possível consultar o documento informado."
      });
    } finally {
      setConsultandoDocumentoCotacao(false);
    }
  }

  async function adicionarCotacao() {
    if (!autorizacaoSelecionadaId) return;
    const documentoCotacao = somenteDigitos(cotacaoForm.cnpj);
    const documentoValido =
      tipoDocumentoCotacao === "cpf" ? validarCpf(documentoCotacao) : validarCnpj(documentoCotacao);
    if (!documentoValido) {
      setPopup({
        tipo: "erro",
        titulo: "Documento inválido",
        texto: tipoDocumentoCotacao === "cpf" ? "Informe um CPF válido." : "Informe um CNPJ válido."
      });
      return;
    }

    try {
      let orcamentoArquivoId = cotacaoForm.orcamentoArquivoId;
      let cartaoCnpjArquivoId = cotacaoForm.cartaoCnpjArquivoId;

      if (arquivoOrcamentoCotacao) {
        const upload = await uploadArquivoMutation.mutateAsync({
          arquivo: arquivoOrcamentoCotacao,
          observacao: "Orçamento da cotação"
        });
        orcamentoArquivoId = upload.id;
      }
      if (tipoDocumentoCotacao === "cnpj" && arquivoCartaoCotacao) {
        const upload = await uploadArquivoMutation.mutateAsync({
          arquivo: arquivoCartaoCotacao,
          observacao: "Cartão do CNPJ da cotação"
        });
        cartaoCnpjArquivoId = upload.id;
      }

      await criarCotacaoMutation.mutateAsync({
        id: autorizacaoSelecionadaId,
        payload: {
          ...cotacaoForm,
          orcamentoArquivoId,
          cartaoCnpjArquivoId
        }
      });

      setCotacaoForm(cotacaoVazia);
      setTipoDocumentoCotacao("cnpj");
      setArquivoOrcamentoCotacao(null);
      setArquivoCartaoCotacao(null);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Cotação registrada com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível registrar a cotação."
      });
    }
  }

  async function definirFornecedor() {
    if (!autorizacaoSelecionadaId) return;
    try {
      await definirFornecedorMutation.mutateAsync({
        id: autorizacaoSelecionadaId,
        payload: fornecedorForm
      });
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Fornecedor vencedor definido." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível definir o fornecedor."
      });
    }
  }

  async function registrarReserva() {
    if (!autorizacaoSelecionadaId) return;
    try {
      await registrarReservaMutation.mutateAsync({ id: autorizacaoSelecionadaId, payload: reservaForm });
      setReservaForm(reservaVazia);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Reserva financeira registrada." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível registrar a reserva."
      });
    }
  }

  async function autorizarPagamento() {
    if (!autorizacaoSelecionadaId) return;
    try {
      await pagarMutation.mutateAsync({ id: autorizacaoSelecionadaId, payload: pagamentoForm });
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Pagamento autorizado e integração executada." });
      setAbaAtiva("lancamentos");
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível autorizar o pagamento."
      });
    }
  }

  function renderCabecalhoProcesso() {
    if (!detalhe) return null;
    return (
      <section id="autorizacao-compras-print" className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
            <p className="text-xs text-[var(--g3-muted)]">Status atual</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClasse(detalhe.status)}`}>
                {statusLabels[detalhe.status] ?? detalhe.status}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
            <p className="text-xs text-[var(--g3-muted)]">Valor da compra</p>
            <p className="mt-2 text-lg font-semibold text-[var(--g3-active)]">{moeda(detalhe.valorTotal)}</p>
          </div>
          <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
            <p className="text-xs text-[var(--g3-muted)]">Fornecedor sugerido</p>
            <p className="mt-2 text-sm font-semibold">{detalhe.fornecedorSugerido?.fornecedor ?? "Aguardando cotação"}</p>
          </div>
          <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
            <p className="text-xs text-[var(--g3-muted)]">Saldo orçamentário</p>
            <p className="mt-2 text-lg font-semibold text-[var(--g3-active)]">{moeda(detalhe.orcamento.saldoDisponivel)}</p>
          </div>
        </div>
      </section>
    );
  }

  function renderListagem() {
    return (
      <section className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <ResumoCard titulo="Aguardando aprovação" valor={indicadores?.aguardando_aprovacao ?? 0} />
          <ResumoCard titulo="Cotações pendentes" valor={indicadores?.cotacoes_pendentes ?? 0} />
          <ResumoCard titulo="Sem reserva" valor={indicadores?.sem_reserva ?? 0} />
          <ResumoCard titulo="Aguardando pagamento" valor={indicadores?.aguardando_pagamento ?? 0} />
          <ResumoCard titulo="Fora do orçamento" valor={indicadores?.fora_orcamento ?? 0} />
          <ResumoCard titulo="Exceções de menor preço" valor={indicadores?.excecao_menor_preco ?? 0} />
        </div>

        <div className="space-y-1">
          <Label>Pesquisar processo</Label>
          <Input
            placeholder="Número, título, solicitante, setor ou status"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
              <tr>
                <th className="px-3 py-2 text-left">Solicitação</th>
                <th className="px-3 py-2 text-left">Solicitante</th>
                <th className="px-3 py-2 text-left">Setor</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Valor</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((item, index) => (
                <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}>
                  <td className="px-3 py-2">
                    <p className="font-semibold">{item.numeroSolicitacao ?? `#${item.id}`}</p>
                    <p className="text-xs text-[var(--g3-muted)]">{item.titulo}</p>
                  </td>
                  <td className="px-3 py-2">{item.solicitante ?? "---"}</td>
                  <td className="px-3 py-2">{item.setorSolicitante ?? "---"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClasse(item.status)}`}>
                      {statusLabels[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{moeda(item.valorTotal)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => selecionarAutorizacao(String(item.id))}>
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderSolicitacao() {
    return (
      <section className="space-y-4">
        {renderCabecalhoProcesso()}
        <div className="rounded-lg border border-[var(--g3-border)] p-3">
          <h3 className="text-sm font-semibold text-[var(--g3-active)]">1. Dados da solicitação</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label>Número da solicitação</Label>
              <Input
                readOnly
                value={form.numeroSolicitacao ?? ""}
                placeholder="Gerado automaticamente ao salvar"
              />
            </div>
            <div className="space-y-1">
              <Label>Solicitante *</Label>
              <Input value={form.solicitante} onChange={(event) => setForm((atual) => ({ ...atual, solicitante: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Setor solicitante *</Label>
              <Select
                value={form.setorSolicitante}
                onChange={(event) => setForm((atual) => ({ ...atual, setorSolicitante: event.target.value }))}
                disabled={setoresQuery.isLoading}
              >
                <option value="">Selecione uma sala administrativa</option>
                {setoresOptions.map((setor) => (
                  <option key={setor.value} value={setor.value}>
                    {setor.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Centro de custo *</Label>
              <Input value={form.centroCusto} onChange={(event) => setForm((atual) => ({ ...atual, centroCusto: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Data da solicitação</Label>
              <Input type="date" value={form.dataSolicitacao ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, dataSolicitacao: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={form.prioridade ?? "normal"} onChange={(event) => setForm((atual) => ({ ...atual, prioridade: event.target.value }))}>
                <option value="urgente">Urgente</option>
                <option value="normal">Normal</option>
                <option value="baixa">Baixa</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo da compra</Label>
              <Select value={form.tipoCompra} onChange={(event) => atualizarTipoCompra(event.target.value as AutorizacaoCompraTipoCompra)}>
                {tiposCompraOptions.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Natureza da compra</Label>
              <Input value={form.naturezaCompra ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, naturezaCompra: event.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Justificativa</Label>
              <Textarea rows={3} value={form.justificativa ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, justificativa: event.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, observacoes: event.target.value }))} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--g3-border)] p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--g3-active)]">2. Itens da compra</h3>
            <Button size="sm" variant="outline" onClick={adicionarItem}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar item
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {form.itens.map((item, index) => (
              <div key={`${index}-${item.descricao}`} className="grid gap-3 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-2 xl:grid-cols-6">
                <div className="space-y-1 xl:col-span-2">
                  <Label>Descrição</Label>
                  <Input value={item.descricao} onChange={(event) => setForm((atual) => ({ ...atual, itens: atual.itens.map((atualItem, itemIndex) => itemIndex === index ? { ...atualItem, descricao: event.target.value } : atualItem) }))} />
                </div>
                <div className="space-y-1">
                  <Label>Quantidade</Label>
                  <Input type="number" min={0.01} step="0.01" value={item.quantidade} onChange={(event) => setForm((atual) => ({ ...atual, itens: atual.itens.map((atualItem, itemIndex) => itemIndex === index ? { ...atualItem, quantidade: Number(event.target.value) || 0 } : atualItem) }))} />
                </div>
                <div className="space-y-1">
                  <Label>Unidade</Label>
                  <Input value={item.unidade} onChange={(event) => setForm((atual) => ({ ...atual, itens: atual.itens.map((atualItem, itemIndex) => itemIndex === index ? { ...atualItem, unidade: event.target.value } : atualItem) }))} />
                </div>
                <div className="space-y-1">
                  <Label>Valor estimado</Label>
                  <Input type="number" min={0} step="0.01" value={item.valorEstimado} onChange={(event) => setForm((atual) => ({ ...atual, itens: atual.itens.map((atualItem, itemIndex) => itemIndex === index ? { ...atualItem, valorEstimado: Number(event.target.value) || 0 } : atualItem) }))} />
                </div>
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select value={item.tipoItem} onChange={(event) => setForm((atual) => ({ ...atual, itens: atual.itens.map((atualItem, itemIndex) => itemIndex === index ? { ...atualItem, tipoItem: event.target.value as "material" | "bem" | "servico" } : atualItem) }))}>
                    <option value="material">Material</option>
                    <option value="bem">Bem patrimonial</option>
                    <option value="servico">Serviço</option>
                  </Select>
                </div>
                <div className="space-y-1 xl:col-span-2">
                  <Label>Categoria</Label>
                  <Input value={item.categoria ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, itens: atual.itens.map((atualItem, itemIndex) => itemIndex === index ? { ...atualItem, categoria: event.target.value } : atualItem) }))} />
                </div>
                <div className="flex items-end xl:col-span-4">
                  <Button size="sm" variant="danger" onClick={() => removerItem(index)} disabled={form.itens.length === 1}>
                    Remover item
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--g3-border)] p-3">
            <h3 className="text-sm font-semibold text-[var(--g3-active)]">3. Controle orçamentário</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Orçamento previsto do setor</Label>
                <Input type="number" min={0} step="0.01" value={form.orcamentoPrevisto ?? 0} onChange={(event) => setForm((atual) => ({ ...atual, orcamentoPrevisto: Number(event.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label>Saldo atual estimado</Label>
                <Input readOnly value={moeda(detalhe?.orcamento.saldoDisponivel ?? form.orcamentoPrevisto ?? 0)} />
              </div>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={!!form.autorizacaoEspecialOrcamento} onChange={(event) => setForm((atual) => ({ ...atual, autorizacaoEspecialOrcamento: event.target.checked }))} />
                Permitir continuação acima do orçamento com autorização especial
              </label>
              <div className="space-y-1 md:col-span-2">
                <Label>Justificativa da exceção orçamentária</Label>
                <Textarea rows={2} value={form.justificativaOrcamento ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, justificativaOrcamento: event.target.value }))} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--g3-border)] p-3">
            <h3 className="text-sm font-semibold text-[var(--g3-active)]">4. Regras da cotação</h3>
            <div className="mt-3 space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!form.dispensarCotacao} onChange={(event) => setForm((atual) => ({ ...atual, dispensarCotacao: event.target.checked }))} />
                Permitir exceção para menos de 3 orçamentos
              </label>
              <div className="space-y-1">
                <Label>Justificativa da exceção de cotação</Label>
                <Textarea rows={3} value={form.motivoDispensa ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, motivoDispensa: event.target.value }))} />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderAprovacoes() {
    return (
      <section className="space-y-4">
        {renderCabecalhoProcesso()}
        <div className="grid gap-3 md:grid-cols-3">
          {(detalhe?.niveisAprovacao ?? []).map((nivel) => (
            <div key={nivel.id} className="rounded-lg border border-[var(--g3-border)] p-3">
              <p className="text-xs text-[var(--g3-muted)]">Nível {nivel.ordem}</p>
              <p className="mt-1 font-semibold">{nivel.nome}</p>
              <p className="text-xs text-[var(--g3-muted)]">{nivel.permissaoRequerida}</p>
              <span className={`mt-3 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badgeClasse(nivel.status.toUpperCase())}`}>
                {nivel.status}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-[var(--g3-border)] p-3">
          <h3 className="text-sm font-semibold text-[var(--g3-active)]">Registrar aprovação</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label>Ação</Label>
              <Select value={aprovacaoForm.acao} onChange={(event) => setAprovacaoForm((atual) => ({ ...atual, acao: event.target.value as AprovacaoCompraPayload["acao"] }))}>
                <option value="APROVAR">Aprovar</option>
                <option value="REPROVAR">Reprovar</option>
                <option value="DEVOLVER_AJUSTE">Devolver para ajuste</option>
              </Select>
            </div>
            <div className="space-y-1 xl:col-span-3">
              <Label>Parecer</Label>
              <Input value={aprovacaoForm.parecer} onChange={(event) => setAprovacaoForm((atual) => ({ ...atual, parecer: event.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Observação</Label>
              <Textarea rows={2} value={aprovacaoForm.observacao ?? ""} onChange={(event) => setAprovacaoForm((atual) => ({ ...atual, observacao: event.target.value }))} />
            </div>
            {aprovacaoForm.acao !== "APROVAR" ? (
              <div className="space-y-1 md:col-span-2 xl:col-span-4">
                <Label>Motivo</Label>
                <Textarea rows={2} value={aprovacaoForm.motivo ?? ""} onChange={(event) => setAprovacaoForm((atual) => ({ ...atual, motivo: event.target.value }))} />
              </div>
            ) : null}
          </div>
          <div className="mt-3">
            <Button onClick={() => void registrarAprovacao()} disabled={!autorizacaoSelecionadaId}>Registrar aprovação</Button>
          </div>
        </div>
      </section>
    );
  }

  function renderCotacoes() {
    return (
      <section className="space-y-4">
        {renderCabecalhoProcesso()}
        <div className="rounded-lg border border-[var(--g3-border)] p-3">
          <h3 className="text-sm font-semibold text-[var(--g3-active)]">Cadastrar cotação</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1 md:max-w-[19rem]">
              <div className="flex items-center justify-between gap-2">
                <Label>{tipoDocumentoCotacao === "cpf" ? "CPF" : "CNPJ"}</Label>
                <label className="inline-flex items-center gap-1.5 text-xs text-[var(--g3-muted)]">
                  <input
                    type="checkbox"
                    checked={tipoDocumentoCotacao === "cpf"}
                    onChange={(event) => alternarTipoDocumentoCotacao(event.target.checked)}
                  />
                  CPF
                </label>
              </div>
              <div className="flex gap-2">
                <Input
                  value={cotacaoForm.cnpj}
                  placeholder={tipoDocumentoCotacao === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  onChange={(event) => atualizarDocumentoCotacao(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 shrink-0 p-0"
                  onClick={() => void consultarDocumentoCotacao()}
                  disabled={consultandoDocumentoCotacao}
                  title="Consultar documento"
                  aria-label="Consultar documento"
                >
                  <Search className={`h-4 w-4 ${consultandoDocumentoCotacao ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
            <div className="space-y-1 xl:col-span-2"><Label>Fornecedor</Label><Input value={cotacaoForm.fornecedor} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, fornecedor: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Razão social</Label><Input value={cotacaoForm.razaoSocial ?? ""} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, razaoSocial: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Contato</Label><Input value={cotacaoForm.contato} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, contato: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Telefone</Label><Input value={cotacaoForm.telefone ?? ""} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, telefone: event.target.value }))} /></div>
            <div className="space-y-1"><Label>E-mail</Label><Input value={cotacaoForm.email ?? ""} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, email: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Situação</Label><Input value={cotacaoForm.situacaoCadastral ?? ""} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, situacaoCadastral: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Início de atividade</Label><Input type="date" value={cotacaoForm.inicioAtividade ?? ""} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, inicioAtividade: event.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Endereço</Label><Input value={cotacaoForm.enderecoCartaoCnpj ?? ""} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, enderecoCartaoCnpj: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Valor</Label><Input inputMode="decimal" value={formatarMoedaInput(cotacaoForm.valor)} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, valor: normalizarMoeda(event.target.value) }))} /></div>
            <div className="space-y-1"><Label>Prazo de entrega</Label><Input type="date" value={cotacaoForm.prazoEntrega ?? ""} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, prazoEntrega: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Forma de pagamento</Label><Input value={cotacaoForm.formaPagamento} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, formaPagamento: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Validade da proposta</Label><Input type="date" value={cotacaoForm.validadeProposta} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, validadeProposta: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Data da cotação</Label><Input type="date" value={cotacaoForm.dataCotacao} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, dataCotacao: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Anexo do orçamento</Label><Input type="file" onChange={(event) => setArquivoOrcamentoCotacao(event.target.files?.[0] ?? null)} /></div>
            {tipoDocumentoCotacao === "cnpj" ? <div className="space-y-1"><Label>Cartão do CNPJ</Label><Input type="file" onChange={(event) => setArquivoCartaoCotacao(event.target.files?.[0] ?? null)} /></div> : null}
            <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={cotacaoForm.observacoes ?? ""} onChange={(event) => setCotacaoForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
          </div>
          <div className="mt-3"><Button onClick={() => void adicionarCotacao()} disabled={!autorizacaoSelecionadaId}>Registrar cotação</Button></div>
        </div>
        <div className="grid gap-3">
          {(detalhe?.cotacoes ?? []).map((cotacao) => (
            <div key={cotacao.id} className={`rounded-lg border p-3 ${cotacao.ehMenorPreco ? "border-emerald-300 bg-emerald-50/70" : "border-[var(--g3-border)]"}`}>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold">{cotacao.fornecedor}</p>
                  <p className="text-xs text-[var(--g3-muted)]">{cotacao.cnpj} · {cotacao.contato}</p>
                  {cotacao.razaoSocial ? <p className="text-xs text-[var(--g3-muted)]">Razão social: {cotacao.razaoSocial}</p> : null}
                  {cotacao.situacaoCadastral || cotacao.inicioAtividade ? (
                    <p className="text-xs text-[var(--g3-muted)]">
                      {[cotacao.situacaoCadastral, cotacao.inicioAtividade ? `Início: ${cotacao.inicioAtividade.split("-").reverse().join("/")}` : ""].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {cotacao.enderecoCartaoCnpj ? <p className="text-xs text-[var(--g3-muted)]">Endereço: {cotacao.enderecoCartaoCnpj}</p> : null}
                  <p className="text-sm">{moeda(cotacao.valor)} · {cotacao.formaPagamento}</p>
                </div>
                <div className="flex gap-2">
                  {cotacao.ehMenorPreco ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Menor preço</span> : null}
                  {cotacao.ehEscolhida ? <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">Escolhida</span> : null}
                  {!cotacao.ehEscolhida ? <Button size="sm" variant="danger" onClick={() => void excluirCotacaoMutation.mutateAsync(String(cotacao.id))}>Remover</Button> : null}
                </div>
              </div>
              {cotacao.indicadoresFornecedor ? (
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-4">
                  <div>Compras anteriores: <strong>{cotacao.indicadoresFornecedor.quantidadeComprasAnteriores}</strong></div>
                  <div>Total contratado: <strong>{moeda(cotacao.indicadoresFornecedor.valorTotalContratado)}</strong></div>
                  <div>Índice de atendimento: <strong>{cotacao.indicadoresFornecedor.indiceAtendimento}%</strong></div>
                  <div>Média comparada: <strong>{moeda(cotacao.indicadoresFornecedor.mediaPrecoComparada)}</strong></div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderFornecedor() {
    return (
      <section className="space-y-4">
        {renderCabecalhoProcesso()}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--g3-border)] p-3">
            <p className="text-xs text-[var(--g3-muted)]">Fornecedor sugerido pelo menor preço</p>
            <p className="mt-2 text-lg font-semibold">{detalhe?.fornecedorSugerido?.fornecedor ?? "Aguardando cotações"}</p>
            <p className="text-sm text-[var(--g3-muted)]">{moeda(detalhe?.fornecedorSugerido?.valor)}</p>
          </div>
          <div className="rounded-lg border border-[var(--g3-border)] p-3">
            <Label>Cotação vencedora</Label>
            <Select value={String(fornecedorForm.cotacaoId || "")} onChange={(event) => setFornecedorForm((atual) => ({ ...atual, cotacaoId: Number(event.target.value) || 0 }))}>
              <option value="">Selecione</option>
              {(detalhe?.cotacoes ?? []).map((cotacao) => (
                <option key={cotacao.id} value={cotacao.id}>
                  {cotacao.fornecedor} · {moeda(cotacao.valor)}
                </option>
              ))}
            </Select>
            <div className="mt-3 space-y-1">
              <Label>Justificativa se fugir do menor preço</Label>
              <Textarea rows={3} value={fornecedorForm.justificativaDivergencia ?? ""} onChange={(event) => setFornecedorForm((atual) => ({ ...atual, justificativaDivergencia: event.target.value }))} />
            </div>
            <div className="mt-3"><Button onClick={() => void definirFornecedor()} disabled={!autorizacaoSelecionadaId}>Definir fornecedor vencedor</Button></div>
          </div>
        </div>
      </section>
    );
  }

  function renderReserva() {
    return (
      <section className="space-y-4">
        {renderCabecalhoProcesso()}
        <div className="rounded-lg border border-[var(--g3-border)] p-3">
          <h3 className="text-sm font-semibold text-[var(--g3-active)]">Registrar reserva financeira</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1 xl:col-span-2">
              <Label>Conta pagadora</Label>
              <Select value={String(reservaForm.contaBancariaId || "")} onChange={(event) => setReservaForm((atual) => ({ ...atual, contaBancariaId: Number(event.target.value) || 0 }))}>
                <option value="">Selecione</option>
                {contasBancarias.map((conta) => <option key={conta.id} value={conta.id}>{conta.banco} - {conta.numero}</option>)}
              </Select>
            </div>
            <div className="space-y-1"><Label>Valor</Label><Input type="number" min={0} step="0.01" value={reservaForm.valor} onChange={(event) => setReservaForm((atual) => ({ ...atual, valor: Number(event.target.value) || 0 }))} /></div>
            <div className="space-y-1"><Label>Observação</Label><Input value={reservaForm.observacao ?? ""} onChange={(event) => setReservaForm((atual) => ({ ...atual, observacao: event.target.value }))} /></div>
          </div>
          <div className="mt-3"><Button onClick={() => void registrarReserva()} disabled={!autorizacaoSelecionadaId}>Registrar reserva</Button></div>
        </div>
        <div className="space-y-3">
          {(detalhe?.reservas ?? []).map((reserva) => (
            <div key={reserva.id} className="rounded-lg border border-[var(--g3-border)] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{moeda(reserva.valor)}</p>
                  <p className="text-xs text-[var(--g3-muted)]">Conta #{reserva.contaBancariaId} · {reserva.status}</p>
                </div>
                {reserva.status === "RESERVA_EFETUADA" ? <Button size="sm" variant="danger" onClick={() => void removerReservaMutation.mutateAsync(reserva.id)}>Cancelar reserva</Button> : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderPagamento() {
    return (
      <section className="space-y-4">
        {renderCabecalhoProcesso()}
        <div className="rounded-lg border border-[var(--g3-border)] p-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1"><Label>Valor autorizado</Label><Input type="number" min={0} step="0.01" value={pagamentoForm.valorAutorizado} onChange={(event) => setPagamentoForm((atual) => ({ ...atual, valorAutorizado: Number(event.target.value) || 0 }))} /></div>
            <div className="space-y-1"><Label>Vencimento</Label><Input type="date" value={pagamentoForm.vencimento} onChange={(event) => setPagamentoForm((atual) => ({ ...atual, vencimento: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Forma de pagamento</Label><Input value={pagamentoForm.formaPagamento} onChange={(event) => setPagamentoForm((atual) => ({ ...atual, formaPagamento: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Conta pagadora</Label><Select value={String(pagamentoForm.contaPagadoraId || "")} onChange={(event) => setPagamentoForm((atual) => ({ ...atual, contaPagadoraId: Number(event.target.value) || 0 }))}><option value="">Selecione</option>{contasBancarias.map((conta) => <option key={conta.id} value={conta.id}>{conta.banco} - {conta.numero}</option>)}</Select></div>
            <div className="space-y-1"><Label>Documento de referência</Label><Input value={pagamentoForm.documentoReferencia ?? ""} onChange={(event) => setPagamentoForm((atual) => ({ ...atual, documentoReferencia: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Documento fiscal</Label><Input value={pagamentoForm.documentoFiscal ?? ""} onChange={(event) => setPagamentoForm((atual) => ({ ...atual, documentoFiscal: event.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={pagamentoForm.observacoes ?? ""} onChange={(event) => setPagamentoForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Justificativa de divergência</Label><Textarea rows={2} value={pagamentoForm.justificativaDivergencia ?? ""} onChange={(event) => setPagamentoForm((atual) => ({ ...atual, justificativaDivergencia: event.target.value }))} /></div>
          </div>
          <div className="mt-3"><Button onClick={() => void autorizarPagamento()} disabled={!autorizacaoSelecionadaId}>Autorizar pagamento</Button></div>
        </div>
      </section>
    );
  }

  function renderLacamentosHistoricoAnexos() {
    return (
      <section className="space-y-4">
        {renderCabecalhoProcesso()}
        {abaAtiva === "lancamentos" ? <div className="rounded-lg border border-[var(--g3-border)] p-3 text-sm">Lançamento financeiro vinculado: {detalhe?.autorizacaoPagamento.lancamentoFinanceiroId ?? "Aguardando"}</div> : null}
        {abaAtiva === "integracoes" ? <div className="space-y-3">{(detalhe?.integracoes ?? []).map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] p-3"><p className="font-semibold">{item.tipo}</p><p className="text-sm">{item.detalhe ?? "---"}</p></div>)}</div> : null}
        {abaAtiva === "historico" ? <div className="space-y-3">{(detalhe?.historico ?? []).map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] p-3"><p className="font-semibold">{item.acao}</p><p className="text-xs text-[var(--g3-muted)]">{item.usuarioNome ?? "Sistema"} · {item.criadoEm.slice(0, 16).replace("T", " ")}</p><p className="mt-2 text-sm">{item.observacao ?? item.justificativa ?? "---"}</p></div>)}</div> : null}
        {abaAtiva === "anexos" ? <div className="space-y-3"><div className="rounded-lg border border-[var(--g3-border)] p-3"><div className="grid gap-3 md:grid-cols-3"><Input type="file" onChange={(event) => setArquivoSelecionado(event.target.files?.[0] ?? null)} /><Input placeholder="Observação do anexo" value={arquivoObservacao} onChange={(event) => setArquivoObservacao(event.target.value)} /><Button onClick={() => arquivoSelecionado && void uploadArquivoMutation.mutateAsync({ arquivo: arquivoSelecionado, observacao: arquivoObservacao })}>Enviar anexo</Button></div></div>{arquivos.map((arquivo) => <div key={arquivo.id} className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] p-3"><div><p className="font-semibold">{arquivo.nomeOriginal}</p><p className="text-xs text-[var(--g3-muted)]">{arquivo.observacao ?? "---"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => window.open(resolverUrlArquivo(arquivo.caminhoArquivo), "_blank", "noopener,noreferrer")}>Abrir</Button><Button size="sm" variant="danger" onClick={() => void excluirArquivoMutation.mutateAsync(arquivo.id)}>Excluir</Button></div></div>)}</div> : null}
        {abaAtiva === "impressoes" ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[
          ["solicitacao", "Solicitação de compra"],
          ["aprovacoes", "Parecer de aprovação"],
          ["cotacoes", "Mapa comparativo de cotação"],
          ["fornecedor", "Escolha do fornecedor"],
          ["reserva", "Reserva financeira"],
          ["pagamento", "Autorização de pagamento"],
          ["lancamentos", "Comprovante da despesa"],
          ["integracoes", "Integrações da compra"],
          ["historico", "Relatório completo do processo"]
        ].map(([tabId, titulo]) => <Button key={tabId} variant="outline" onClick={() => { setAbaAtiva(tabId as AbaId); window.setTimeout(() => imprimirConteudoAtual({ titulo, seletor: "#autorizacao-compras-print" }), 50); }}>{titulo}</Button>)}</div> : null}
      </section>
    );
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbaAtiva("listagem"), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: processando },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: processando },
    { label: "Enviar", icon: Send, onClick: () => void enviarParaAprovacao(), variant: "outline", disabled: processando || !autorizacaoSelecionadaId },
    { label: "Cancelar", icon: Undo2, onClick: cancelarEdicao, variant: "outline", disabled: processando },
    { label: "Excluir", icon: Trash2, onClick: () => setConfirmarExclusao(true), variant: "danger", disabled: processando || !autorizacaoSelecionadaId },
    { label: "Imprimir", icon: Printer, onClick: () => imprimirConteudoAtual({ titulo: "Autorização de compras", seletor: "#autorizacao-compras-print" }), variant: "outline" },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Contabilidade e finanças"
        pageTitle={tituloTela}
        activeTitle={abaAtiva === "listagem" ? "Painel e listagem" : abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={autorizacaoSelecionadaId ? `Código: ${detalhe?.numeroSolicitacao ?? autorizacaoSelecionadaId}` : "Novo"}
      >
        {abaAtiva === "listagem" ? renderListagem() : null}
        {abaAtiva === "solicitacao" ? renderSolicitacao() : null}
        {abaAtiva === "aprovacoes" ? renderAprovacoes() : null}
        {abaAtiva === "cotacoes" ? renderCotacoes() : null}
        {abaAtiva === "fornecedor" ? renderFornecedor() : null}
        {abaAtiva === "reserva" ? renderReserva() : null}
        {abaAtiva === "pagamento" ? renderPagamento() : null}
        {["lancamentos", "integracoes", "historico", "anexos", "impressoes"].includes(abaAtiva) ? renderLacamentosHistoricoAnexos() : null}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarExclusao}
        titulo="Confirmar cancelamento"
        texto="O processo será cancelado e permanecerá no histórico. Deseja continuar?"
        processando={processando}
        onCancel={() => setConfirmarExclusao(false)}
        onConfirm={() => void confirmarExclusaoAutorizacao()}
        confirmarTexto="Cancelar processo"
      />
    </>
  );
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
      <p className="text-xs text-[var(--g3-muted)]">{titulo}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--g3-active)]">{valor}</p>
    </div>
  );
}
