import { useEffect, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
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
import { formatarTextoPorCampo, normalizarObjetoTexto } from "@/lib/text-formatter";
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
import {
  formatarMoedaInput,
  formatarTelefone,
  normalizarEmail,
  normalizarMoeda
} from "@/lib/br-utils";
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
  { id: "itens", label: "Itens recebidos", icon: HandHeart },
  { id: "recorrencia", label: "Recorrência", icon: ListChecks },
  { id: "gestao", label: "Gestão de doação", icon: MessageSquare }
] as const;

type AbaId = (typeof abas)[number]["id"];

type AcaoCrud = {
  label: string;
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

const formaRecebimentoOptionsPadrao = [
  "Pix",
  "Transferência bancária",
  "Cartão de crédito/débito",
  "Boleto",
  "Dinheiro"
];
const periodicidadeOptions = ["Única", "Diário", "Semanal", "Mensal", "Anual"];
const tipoDoacaoDestinoMap: Record<string, string> = {
  "Doação financeira": "Contabilidade",
  "Doação de bens de consumo": "Almoxarifado",
  "Doação de bens permanentes": "Patrimônio"
};
const tiposComFormaRecebimento = new Set([
  "Doação financeira"
]);

const labelsCamposRegistroDoacao: Partial<Record<keyof RegistroDoacaoFormValues, string>> = {
  doador_id: "Doador",
  numero_recibo: "Número do recibo",
  tipo_doacao: "Tipo de doação",
  data_recebimento: "Data de recebimento",
  forma_recebimento: "Forma de recebimento",
  periodicidade: "Periodicidade",
  proxima_cobranca: "Próxima cobrança",
  status: "Status",
  observacoes: "Observações"
};

function formatarData(data?: string) {
  if (!data) return "---";
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return data;
  return parsed.toLocaleDateString("pt-BR");
}

function obterCamposPendentesRegistroDoacao(errors: FieldErrors<RegistroDoacaoFormInput>) {
  const pendencias = new Set<string>();

  function visitar(campoAtual: string, valor: unknown) {
    if (!valor || typeof valor !== "object") return;

    if ("message" in (valor as Record<string, unknown>)) {
      const label = labelsCamposRegistroDoacao[campoAtual as keyof RegistroDoacaoFormValues];
      if (label) pendencias.add(label);
    }

    Object.entries(valor as Record<string, unknown>).forEach(([chave, filho]) => {
      if (chave === "message" || chave === "type" || chave === "ref") return;
      visitar(chave, filho);
    });
  }

  Object.entries(errors).forEach(([campo, valor]) => visitar(campo, valor));

  return Array.from(pendencias);
}

function obterCamposPendentesRegistroDoacaoPorValores(values: Record<string, unknown>) {
  const pendencias: string[] = [];

  const doadorId = typeof values.doador_id === "string" ? values.doador_id.trim() : "";
  const tipoDoacao = typeof values.tipo_doacao === "string" ? values.tipo_doacao.trim() : "";
  const status = typeof values.status === "string" ? values.status.trim() : "";
  const dataRecebimento =
    typeof values.data_recebimento === "string" ? values.data_recebimento.trim() : "";
  const formaRecebimento =
    typeof values.forma_recebimento === "string" ? values.forma_recebimento.trim() : "";
  const recorrente = values.recorrente === true;
  const periodicidade = typeof values.periodicidade === "string" ? values.periodicidade.trim() : "";

  if (!doadorId) pendencias.push("Doador");
  if (!tipoDoacao) pendencias.push("Tipo de doação");
  if (!status) pendencias.push("Status");
  if (!dataRecebimento) pendencias.push("Data de recebimento");
  if (tipoDoacao === "Doação financeira" && !formaRecebimento) {
    pendencias.push("Forma de recebimento");
  }
  if (recorrente && !periodicidade) pendencias.push("Periodicidade");

  return pendencias;
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
  const [doadorSelecionado, setDoadorSelecionado] = useState<Doador | null>(null);
  const [canalGestao, setCanalGestao] = useState("WhatsApp");
  const [mensagemGestao, setMensagemGestao] = useState("");
  const [formaRecebimentoOptions, setFormaRecebimentoOptions] = useState<string[]>(
    formaRecebimentoOptionsPadrao
  );
  const [novaFormaRecebimento, setNovaFormaRecebimento] = useState("");
  const [valorMedioInput, setValorMedioInput] = useState("");
  const [valorTotalInput, setValorTotalInput] = useState("");
  const [novoItemValorUnitarioInput, setNovoItemValorUnitarioInput] = useState("");
  const [novoItemValorTotalInput, setNovoItemValorTotalInput] = useState("");

  const { data: listaData, isLoading: carregandoLista } = useRegistrosDoacao(filtros);
  const { data: detalheData, isLoading: carregandoDetalhes } = useRegistroDoacao(idSelecionado);
  const { data: doadoresData, isFetching: carregandoDoadores } = useDoadores(termoDoador);
  const { data: doadoresCadastradosData, isLoading: carregandoDoadoresCadastrados } = useDoadores();

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
    defaultValues: registroDoacaoDefaultValues as RegistroDoacaoFormInput,
    shouldUnregister: false
  });

  const registros = listaData?.registros ?? [];
  const doadores = doadoresData?.doadores ?? [];
  const doadoresCadastrados = doadoresCadastradosData?.doadores ?? [];
  const recorrente = !!watch("recorrente");
  const tipoDoacaoSelecionadoBruto = watch("tipo_doacao");
  const tipoDoacaoSelecionado =
    typeof tipoDoacaoSelecionadoBruto === "string" ? tipoDoacaoSelecionadoBruto : "";
  const statusSelecionadoBruto = watch("status");
  const statusSelecionado =
    typeof statusSelecionadoBruto === "string" ? statusSelecionadoBruto : "";
  const quantidadeItens = watch("quantidade_itens");
  const valorMedio = watch("valor_medio");
  const formaRecebimentoSelecionadaBruta = watch("forma_recebimento");
  const formaRecebimentoSelecionada =
    typeof formaRecebimentoSelecionadaBruta === "string" ? formaRecebimentoSelecionadaBruta : "";
  const periodicidadeSelecionadaBruta = watch("periodicidade");
  const periodicidadeSelecionada =
    typeof periodicidadeSelecionadaBruta === "string" ? periodicidadeSelecionadaBruta : "";
  const quantidadeItensValor = typeof quantidadeItens === "number" ? quantidadeItens : "";
  const doadorSelecionadoId = watch("doador_id") || "";
  const doadorContatoAtual =
    doadorSelecionado ??
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
      numero_recibo: detalheData.registro.numero_recibo ?? "",
      descricao: detalheData.registro.descricao ?? "",
      forma_recebimento: detalheData.registro.forma_recebimento ?? "",
      periodicidade: detalheData.registro.periodicidade ?? "",
      proxima_cobranca: detalheData.registro.proxima_cobranca ?? "",
      observacoes: detalheData.registro.observacoes ?? ""
    };

    reset(formValues);
    setSnapshot(formValues);
    setItens(detalheData.registro.itens ?? []);
    sincronizarFormaRecebimento(formValues.forma_recebimento);
    setValorMedioInput(
      formValues.valor_medio === undefined ? "" : formatarMoedaInput(formValues.valor_medio)
    );
    setValorTotalInput(
      formValues.valor_total === undefined ? "" : formatarMoedaInput(formValues.valor_total)
    );
    setAbaAtiva("dados");
  }, [detalheData, reset]);

  useEffect(() => {
    if (typeof quantidadeItens !== "number" || quantidadeItens <= 0 || typeof valorMedio !== "number") {
      setValue("valor_total", undefined, { shouldDirty: true, shouldValidate: true });
      setValue("valor", undefined, { shouldDirty: true, shouldValidate: true });
      setValorTotalInput("");
      return;
    }

    const total = Number((valorMedio * quantidadeItens).toFixed(2));
    setValue("valor_total", total, { shouldDirty: true, shouldValidate: true });
    setValue("valor", total, { shouldDirty: true, shouldValidate: true });
    setValorTotalInput(formatarMoedaInput(total));
  }, [quantidadeItens, setValue, valorMedio]);

  useEffect(() => {
    if (typeof novoItem.quantidade !== "number" || novoItem.quantidade <= 0 || typeof novoItem.valor_unitario !== "number") {
      setNovoItem((atual) => (
        atual.valor_total === undefined
          ? atual
          : { ...atual, valor_total: undefined }
      ));
      setNovoItemValorTotalInput("");
      return;
    }

    const total = Number((novoItem.quantidade * novoItem.valor_unitario).toFixed(2));
    setNovoItem((atual) => (
      atual.valor_total === total
        ? atual
        : { ...atual, valor_total: total }
    ));
    setNovoItemValorTotalInput(formatarMoedaInput(total));
  }, [novoItem.quantidade, novoItem.valor_unitario]);

  useEffect(() => {
    if (tiposComFormaRecebimento.has(tipoDoacaoSelecionado)) return;
    setValue("forma_recebimento", "", { shouldDirty: true, shouldValidate: true });
    setNovaFormaRecebimento("");
  }, [setValue, tipoDoacaoSelecionado]);

  function sincronizarFormaRecebimento(valor?: string) {
    const texto = valor?.trim();
    if (!texto) return;
    setFormaRecebimentoOptions((atual) => (atual.includes(texto) ? atual : [...atual, texto]));
  }

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

  function novoRegistro() {
    setIdSelecionado(undefined);
    setSnapshot(null);
    reset(registroDoacaoDefaultValues);
    setItens([]);
    setNovoItem({ descricao: "", quantidade: 1 });
    setDoadorSelecionado(null);
    setCanalGestao("WhatsApp");
    setMensagemGestao("");
    setFormaRecebimentoOptions(formaRecebimentoOptionsPadrao);
    setNovaFormaRecebimento("");
    setValorMedioInput("");
    setValorTotalInput("");
    setNovoItemValorUnitarioInput("");
    setNovoItemValorTotalInput("");
    setAbaAtiva("dados");
  }

  function novoDoador() {
    setDoadorForm({ nome: "", tipo_pessoa: "FISICA" });
    setDoadorSelecionado(null);
    setTermoDoador("");
    setValue("doador_id", "", { shouldDirty: true, shouldValidate: true });
  }

  function aplicarFormatacaoDoadorCampo(campo: keyof Doador) {
    setDoadorForm((atual) => {
      const valor = atual[campo];

      if (campo === "email") {
        return { ...atual, email: normalizarEmail(typeof valor === "string" ? valor : "") };
      }

      if (campo === "telefone") {
        return { ...atual, telefone: formatarTelefone(typeof valor === "string" ? valor : "") };
      }

      if (campo === "uf") {
        return { ...atual, uf: typeof valor === "string" ? valor.trim().toUpperCase().slice(0, 2) : "" };
      }

      const formatado = formatarTextoPorCampo(
        String(campo),
        valor,
        mapaCamposTextoDoadorForm
      );

      return {
        ...atual,
        [campo]: typeof formatado === "string" ? formatado : valor
      };
    });
  }

  function normalizarDoadorPayload(input: Doador): Doador {
    const textoNormalizado = normalizarObjetoTexto(input, mapaCamposTextoDoadorForm);
    return {
      ...textoNormalizado,
      nome: String(textoNormalizado.nome ?? "").trim(),
      email: normalizarEmail(textoNormalizado.email) || undefined,
      telefone: textoNormalizado.telefone ? somenteDigitos(textoNormalizado.telefone) : undefined,
      documento: textoNormalizado.documento ? somenteDigitos(textoNormalizado.documento) : undefined,
      cep: textoNormalizado.cep ? somenteDigitos(textoNormalizado.cep) : undefined,
      uf: textoNormalizado.uf?.trim().toUpperCase().slice(0, 2) || undefined
    };
  }

  function cancelarRegistro() {
    const valores = snapshot ?? registroDoacaoDefaultValues;
    reset(valores);
    setItens(detalheData?.registro?.itens ?? []);
    setFormaRecebimentoOptions(formaRecebimentoOptionsPadrao);
    sincronizarFormaRecebimento(valores.forma_recebimento);
    setNovaFormaRecebimento("");
    setValorMedioInput(valores.valor_medio === undefined ? "" : formatarMoedaInput(valores.valor_medio));
    setValorTotalInput(valores.valor_total === undefined ? "" : formatarMoedaInput(valores.valor_total));
    setNovoItemValorUnitarioInput("");
    setNovoItemValorTotalInput("");
  }

  function cancelarDoador() {
    const doadorBase = doadorSelecionado ?? { nome: "", tipo_pessoa: "FISICA" as const };
    setDoadorForm(doadorBase);
    setTermoDoador(doadorSelecionado?.nome ?? "");
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
      novoRegistro();
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

  function confirmarMensagemGestao() {
    setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Mensagem preparada para envio." });
  }

  function selecionarRegistro(id: string) {
    setIdSelecionado(id);
  }

  function adicionarItem() {
    const descricao = novoItem.descricao?.trim() ?? "";
    if (
      descricao.length < 2 ||
      !novoItem.quantidade ||
      novoItem.quantidade < 1 ||
      typeof novoItem.valor_unitario !== "number" ||
      novoItem.valor_unitario <= 0
    ) {
      setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Informe descrição, quantidade e valor unitário válidos do item." });
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
    setNovoItemValorUnitarioInput("");
    setNovoItemValorTotalInput("");
  }

  function atualizarNovoItemValorUnitarioInput(valor: string) {
    const valorFiltrado = valor.replace(/[^\d.,]/g, "");
    setNovoItemValorUnitarioInput(valorFiltrado);
    setNovoItem((atual) => ({
      ...atual,
      valor_unitario: valorFiltrado ? normalizarMoeda(valorFiltrado) : undefined
    }));
  }

  function formatarNovoItemValorUnitarioNoBlur() {
    if (!novoItemValorUnitarioInput.trim()) {
      setNovoItemValorUnitarioInput("");
      setNovoItem((atual) => ({ ...atual, valor_unitario: undefined }));
      return;
    }

    const valorNormalizado = normalizarMoeda(novoItemValorUnitarioInput);
    setNovoItemValorUnitarioInput(formatarMoedaInput(valorNormalizado));
    setNovoItem((atual) => ({ ...atual, valor_unitario: valorNormalizado }));
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

  function adicionarFormaRecebimento() {
    const valor = novaFormaRecebimento.trim();
    if (valor.length < 2) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe uma nova forma de recebimento válida."
      });
      return;
    }

    sincronizarFormaRecebimento(valor);
    setValue("forma_recebimento", valor, { shouldDirty: true, shouldValidate: true });
    setNovaFormaRecebimento("");
  }

  function atualizarValorMedioInput(valor: string) {
    const valorFiltrado = valor.replace(/[^\d.,]/g, "");
    setValorMedioInput(valorFiltrado);
    setValue("valor_medio", valorFiltrado ? normalizarMoeda(valorFiltrado) : undefined, {
      shouldDirty: true,
      shouldValidate: true
    });
  }

  function formatarValorMedioNoBlur() {
    if (!valorMedioInput.trim()) {
      setValorMedioInput("");
      setValue("valor_medio", undefined, {
        shouldDirty: true,
        shouldValidate: true
      });
      return;
    }

    const valorNormalizado = normalizarMoeda(valorMedioInput);
    setValorMedioInput(formatarMoedaInput(valorNormalizado));
    setValue("valor_medio", valorNormalizado, {
      shouldDirty: true,
      shouldValidate: true
    });
  }

  async function salvarRegistro(values: RegistroDoacaoFormValues) {
    if (!itens.length) {
      setAbaAtiva("itens");
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Inclua pelo menos um item recebido antes de registrar a doação."
      });
      return;
    }

    try {
      const quantidadeItensCalculada = itens.length
        ? itens.reduce((total, item) => total + Number(item.quantidade ?? 0), 0)
        : values.quantidade_itens;

      const valorTotalItens = itens.length
        ? Number(
            itens
              .reduce((total, item) => {
                const quantidade = Number(item.quantidade ?? 0);
                const valorTotalItem =
                  typeof item.valor_total === "number"
                    ? item.valor_total
                    : typeof item.valor_unitario === "number"
                      ? Number((item.valor_unitario * quantidade).toFixed(2))
                      : 0;
                return total + valorTotalItem;
              }, 0)
              .toFixed(2)
          )
        : undefined;

      const valorMedioCalculado =
        itens.length && quantidadeItensCalculada && quantidadeItensCalculada > 0 && typeof valorTotalItens === "number"
          ? Number((valorTotalItens / quantidadeItensCalculada).toFixed(2))
          : values.valor_medio;

      const valorTotalCalculado =
        typeof valorTotalItens === "number"
          ? valorTotalItens
          : typeof values.valor_medio === "number" && typeof values.quantidade_itens === "number"
            ? Number((values.valor_medio * values.quantidade_itens).toFixed(2))
            : values.valor_total;

      const payload: RegistroDoacao = {
        ...values,
        doador_id: values.doador_id || undefined,
        numero_recibo: values.numero_recibo || undefined,
        quantidade_itens: quantidadeItensCalculada,
        valor_medio: valorMedioCalculado,
        valor_total: valorTotalCalculado,
        valor: valorTotalCalculado,
        itens
      };

      const response = await salvarMutation.mutateAsync(payload);
      const formValues: RegistroDoacaoFormValues = {
        ...registroDoacaoDefaultValues,
        ...response.registro,
        id_registro_doacao: response.registro.id_registro_doacao,
        doador_id: response.registro.doador_id ?? "",
        numero_recibo: response.registro.numero_recibo ?? "",
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
      sincronizarFormaRecebimento(formValues.forma_recebimento);
      setValorMedioInput(
        formValues.valor_medio === undefined ? "" : formatarMoedaInput(formValues.valor_medio)
      );
      setValorTotalInput(
        formValues.valor_total === undefined ? "" : formatarMoedaInput(formValues.valor_total)
      );
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Registro salvo com sucesso." });
    } catch (error: any) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar." });
    }
  }

  async function salvarDoador() {
    const payload = normalizarDoadorPayload(doadorForm);
    if ((payload.nome ?? "").length < 3) {
      setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Informe o nome do doador." });
      return;
    }

    try {
      setDoadorForm(payload);
      const response = await criarDoadorMutation.mutateAsync(payload);
      const doadorCriado = response.doador;
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Doador cadastrado com sucesso." });
      setAbaAtiva("dados");
      setDoadorForm(doadorCriado);
      setDoadorSelecionado(doadorCriado);
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

  function salvarRegistroComEntrada() {
    return handleSubmit(
      async (values) => {
        const statusAtual = typeof values.status === "string" ? values.status.trim() : "";
        const statusParaSalvar =
          !statusAtual || statusAtual === "Aguardando" ? "Finalizado" : values.status;

        await salvarRegistro({
          ...values,
          status: statusParaSalvar
        });
      },
      tratarErrosSalvar
    )();
  }

  function tratarErrosSalvar(errors: FieldErrors<RegistroDoacaoFormInput>) {
    const pendencias =
      obterCamposPendentesRegistroDoacao(errors).length > 0
        ? obterCamposPendentesRegistroDoacao(errors)
        : obterCamposPendentesRegistroDoacaoPorValores(getValues());
    setAbaAtiva("dados");
    setPopupMensagem({
      tipo: "aviso",
      titulo: "Validação",
      texto: pendencias.length
        ? `Preencha os campos obrigatórios: ${pendencias.join(", ")}.`
        : "Revise os campos obrigatórios antes de salvar a doação."
    });
  }

  const acoesPorAba: Record<AbaId, AcaoCrud[]> = {
    listagem: [
      { label: "Buscar registros", icon: Search, onClick: buscar, variant: "outline" },
      { label: "Novo registro", icon: Plus, onClick: novoRegistro, variant: "default", disabled: acaoEmAndamento },
      { label: "Imprimir relação", icon: Printer, onClick: () => void imprimir(), variant: "outline", disabled: acaoEmAndamento },
      { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
    ],
    doador: [
      { label: "Novo doador", icon: Plus, onClick: novoDoador, variant: "default", disabled: criarDoadorMutation.isPending || removerDoadorMutation.isPending },
      { label: "Salvar doador", icon: Save, onClick: () => void salvarDoador(), variant: "default", disabled: criarDoadorMutation.isPending || removerDoadorMutation.isPending },
      { label: "Cancelar cadastro", icon: Undo2, onClick: cancelarDoador, variant: "outline", disabled: criarDoadorMutation.isPending || removerDoadorMutation.isPending },
      { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
    ],
    dados: [
      { label: "Novo registro", icon: Plus, onClick: novoRegistro, variant: "default", disabled: acaoEmAndamento },
      { label: "Salvar doação", icon: Save, onClick: () => void handleSubmit(salvarRegistro, tratarErrosSalvar)(), variant: "default", disabled: acaoEmAndamento },
      { label: "Cancelar edição", icon: Undo2, onClick: cancelarRegistro, variant: "outline", disabled: acaoEmAndamento },
      { label: "Excluir registro", icon: Trash2, onClick: excluir, variant: "danger", disabled: acaoEmAndamento },
      { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
    ],
    itens: [
      { label: "Novo registro", icon: Plus, onClick: novoRegistro, variant: "default", disabled: acaoEmAndamento },
      { label: "Salvar doação", icon: Save, onClick: () => void handleSubmit(salvarRegistro, tratarErrosSalvar)(), variant: "default", disabled: acaoEmAndamento },
      { label: "Cancelar edição", icon: Undo2, onClick: cancelarRegistro, variant: "outline", disabled: acaoEmAndamento },
      { label: "Excluir registro", icon: Trash2, onClick: excluir, variant: "danger", disabled: acaoEmAndamento },
      { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
    ],
    recorrencia: [
      { label: "Novo registro", icon: Plus, onClick: novoRegistro, variant: "default", disabled: acaoEmAndamento },
      { label: "Salvar doação", icon: Save, onClick: () => void handleSubmit(salvarRegistro, tratarErrosSalvar)(), variant: "default", disabled: acaoEmAndamento },
      { label: "Cancelar edição", icon: Undo2, onClick: cancelarRegistro, variant: "outline", disabled: acaoEmAndamento },
      { label: "Excluir registro", icon: Trash2, onClick: excluir, variant: "danger", disabled: acaoEmAndamento },
      { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
    ],
    gestao: [
      { label: "Novo registro", icon: Plus, onClick: novoRegistro, variant: "default", disabled: acaoEmAndamento },
      { label: "Confirmar mensagem", icon: Save, onClick: confirmarMensagemGestao, variant: "default", disabled: acaoEmAndamento },
      { label: "Cancelar edição", icon: Undo2, onClick: cancelarRegistro, variant: "outline", disabled: acaoEmAndamento },
      { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
    ]
  };
  const acoes = acoesPorAba[abaAtiva];

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
                {acoes.map((acao) => {
                  const Icone = acao.icon;
                  return (
                    <Button
                      key={`${abaAtiva}-${acao.label}`}
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
                    <div className="space-y-1 xl:col-span-2"><Label>Nome *</Label><Input value={doadorForm.nome ?? ""} onChange={(e) => setDoadorForm((a) => ({ ...a, nome: e.target.value }))} onBlur={() => aplicarFormatacaoDoadorCampo("nome")} /></div>
                    <div className="space-y-1"><Label>Tipo de pessoa</Label><Select value={doadorForm.tipo_pessoa ?? "FISICA"} onChange={(e) => setDoadorForm((a) => ({ ...a, tipo_pessoa: e.target.value }))}><option value="FISICA">Física</option><option value="JURIDICA">Jurídica</option></Select></div>
                    <div className="space-y-1"><Label>Documento</Label><Input value={doadorForm.documento ?? ""} onChange={(e) => setDoadorForm((a) => ({ ...a, documento: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>E-mail</Label><Input value={doadorForm.email ?? ""} onChange={(e) => setDoadorForm((a) => ({ ...a, email: e.target.value }))} onBlur={() => aplicarFormatacaoDoadorCampo("email")} /></div>
                    <div className="space-y-1"><Label>Telefone</Label><Input value={doadorForm.telefone ?? ""} onChange={(e) => setDoadorForm((a) => ({ ...a, telefone: e.target.value }))} onBlur={() => aplicarFormatacaoDoadorCampo("telefone")} /></div>
                    <div className="space-y-1"><Label>Cidade</Label><Input value={doadorForm.cidade ?? ""} onChange={(e) => setDoadorForm((a) => ({ ...a, cidade: e.target.value }))} onBlur={() => aplicarFormatacaoDoadorCampo("cidade")} /></div>
                    <div className="space-y-1"><Label>UF</Label><Input value={doadorForm.uf ?? ""} maxLength={2} onChange={(e) => setDoadorForm((a) => ({ ...a, uf: e.target.value }))} onBlur={() => aplicarFormatacaoDoadorCampo("uf")} /></div>
                  </div>
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
                            <button type="button" className="text-left" onClick={() => { setValue("doador_id", doador.id_doador ?? "", { shouldDirty: true, shouldValidate: true }); setDoadorForm(doador); setDoadorSelecionado(doador); setTermoDoador(doador.nome ?? ""); setAbaAtiva("dados"); }}>
                              {doador.nome} {doador.documento ? `- ${doador.documento}` : ""}
                            </button>
                            <Button type="button" variant="ghost" onClick={() => void excluirDoador(doador.id_doador)} disabled={removerDoadorMutation.isPending}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2 rounded-lg border border-[var(--g3-border)] p-3">
                    <Label>Doadores cadastrados</Label>
                    {carregandoDoadoresCadastrados ? (
                      <p className="text-xs text-[var(--g3-muted)]">Carregando doadores cadastrados...</p>
                    ) : doadoresCadastrados.length ? (
                      <div className="max-h-56 overflow-y-auto space-y-1">
                        {doadoresCadastrados.map((doador) => (
                          <div key={`cad-${doador.id_doador}`} className="flex items-center justify-between rounded border border-[var(--g3-border)] px-2 py-1 text-sm">
                            <button type="button" className="text-left" onClick={() => { setValue("doador_id", doador.id_doador ?? "", { shouldDirty: true, shouldValidate: true }); setDoadorForm(doador); setDoadorSelecionado(doador); setTermoDoador(doador.nome ?? ""); setAbaAtiva("dados"); }}>
                              {doador.nome} {doador.documento ? `- ${doador.documento}` : ""}
                            </button>
                            <Button type="button" variant="ghost" onClick={() => void excluirDoador(doador.id_doador)} disabled={removerDoadorMutation.isPending}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--g3-muted)]">Nenhum doador cadastrado.</p>
                    )}
                  </div>
                </div>
              )}

              {abaAtiva === "dados" && (
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-1">
                    <Label>Doador selecionado</Label>
                    <div className="flex gap-2">
                      <Input
                        value={termoDoador}
                        onChange={(e) => setTermoDoador(e.target.value)}
                        placeholder="Digite nome para buscar doador..."
                        className="flex-1"
                      />
                      {(termoDoador || doadorSelecionadoId) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTermoDoador("");
                            setValue("doador_id", "", { shouldDirty: true, shouldValidate: true });
                            setDoadorSelecionado(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {doadores.length > 0 && termoDoador && !doadorSelecionadoId ? (
                      <div className="max-h-28 overflow-y-auto rounded border border-[var(--g3-border)] p-1 bg-white shadow-sm mt-1">
                        {doadores.map((item) => (
                          <button
                            key={item.id_doador}
                            type="button"
                            className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]"
                            onClick={() => {
                              setValue("doador_id", item.id_doador ?? "", {
                                shouldDirty: true,
                                shouldValidate: true
                              });
                              setDoadorForm(item);
                              setDoadorSelecionado(item);
                              setTermoDoador(item.nome ?? "");
                            }}
                          >
                            {item.nome} {item.documento ? `(${item.documento})` : ""}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {doadorSelecionadoId && !termoDoador && (
                      <p className="text-[10px] text-emerald-600 font-medium">Doador vinculado com sucesso.</p>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1"><Label>Número do recibo</Label><Input {...register("numero_recibo")} onBlur={() => aplicarFormatacaoRegistro("numero_recibo")} maxLength={80} /></div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label>Tipo de doação *</Label>
                        {tipoDoacaoSelecionado ? <span className="rounded-full border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--g3-active)]">{tipoDoacaoDestinoMap[tipoDoacaoSelecionado] ?? "Sem destino"}</span> : null}
                      </div>
                      <Select
                        value={tipoDoacaoSelecionado}
                        onChange={(e) =>
                          setValue("tipo_doacao", e.target.value, {
                            shouldDirty: true,
                            shouldValidate: true
                          })}
                      >
                        <option value="">Selecione</option>
                        {tipoDoacaoOptions.map((item) => <option key={item} value={item}>{`${item} • ${tipoDoacaoDestinoMap[item] ?? "Sem destino"}`}</option>)}
                      </Select>
                      {errors.tipo_doacao && <p className="text-xs text-rose-600">{errors.tipo_doacao.message}</p>}
                    </div>
                    <div className="space-y-1"><Label>Status *</Label><Select value={statusSelecionado} onChange={(e) => setValue("status", e.target.value, { shouldDirty: true, shouldValidate: true })} onBlur={() => aplicarFormatacaoRegistro("status")}><option value="">Selecione</option>{statusRegistroDoacaoOptions.map((item) => <option key={item} value={item}>{item}</option>)}</Select>{errors.status && <p className="text-xs text-rose-600">{errors.status.message}</p>}</div>
                    <div className="space-y-1"><Label>Data de recebimento *</Label><Input type="date" {...register("data_recebimento")} />{errors.data_recebimento && <p className="text-xs text-rose-600">{errors.data_recebimento.message}</p>}</div>
                    {tiposComFormaRecebimento.has(tipoDoacaoSelecionado) ? (
                      <div className="space-y-1 md:col-span-2 xl:col-span-4">
                        <Label>Forma de recebimento *</Label>
                        <div className="flex flex-col gap-2 xl:flex-row">
                          <Select
                            value={formaRecebimentoSelecionada}
                            onChange={(e) =>
                              setValue("forma_recebimento", e.target.value, {
                                shouldDirty: true,
                                shouldValidate: true
                              })
                            }
                          >
                            <option value="">Selecione</option>
                            {formaRecebimentoOptions.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </Select>
                          <div className="flex gap-2 xl:w-[360px]">
                            <Input
                              value={novaFormaRecebimento}
                              onChange={(e) => setNovaFormaRecebimento(e.target.value)}
                              placeholder="Nova forma de recebimento"
                            />
                            <Button type="button" variant="outline" onClick={adicionarFormaRecebimento}>
                              <Plus className="mr-1.5 h-4 w-4" />
                              Adicionar
                            </Button>
                          </div>
                        </div>
                        {errors.forma_recebimento ? (
                          <p className="text-xs text-rose-600">{errors.forma_recebimento.message}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-1"><Label>Observações</Label><Textarea rows={2} {...register("observacoes")} maxLength={160} onBlur={() => aplicarFormatacaoRegistro("observacoes")} /></div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-900">Próximo passo: preencher os itens recebidos</p>
                    <p className="mt-1 text-sm text-amber-800">
                      Depois de conferir os dados da doação, siga para a aba Itens recebidos para lançar os produtos, quantidades e valores antes de concluir o registro.
                    </p>
                    <div className="mt-3 flex justify-end">
                      <Button type="button" variant="outline" onClick={() => setAbaAtiva("itens")}>
                        Ir para Itens recebidos
                      </Button>
                    </div>
                  </div>
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
                      <Select
                        value={periodicidadeSelecionada}
                        onChange={(e) => setValue("periodicidade", e.target.value, { shouldDirty: true, shouldValidate: true })}
                      >
                        <option value="">Selecione</option>
                        {periodicidadeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                      </Select>
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
                </div>
              )}

              {abaAtiva === "itens" && (
                <div className="space-y-3">
                  <div className="grid gap-3 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-6">
                    <div className="space-y-1 md:col-span-2"><Label>Descrição *</Label><Input value={novoItem.descricao ?? ""} onChange={(e) => setNovoItem((a) => ({ ...a, descricao: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Quantidade *</Label><Input type="number" min={1} value={novoItem.quantidade ?? 1} onChange={(e) => setNovoItem((a) => ({ ...a, quantidade: Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label>Valor unitário *</Label><Input inputMode="decimal" value={novoItemValorUnitarioInput} onChange={(e) => atualizarNovoItemValorUnitarioInput(e.target.value)} onBlur={formatarNovoItemValorUnitarioNoBlur} placeholder="0,00" /></div>
                    <div className="space-y-1"><Label>Valor total</Label><Input value={novoItemValorTotalInput} readOnly placeholder="0,00" /></div>
                    <div className="flex items-end"><Button type="button" className="w-full" onClick={adicionarItem}><Plus className="h-4 w-4" />Adicionar</Button></div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                    <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-left">Qtd</th><th className="px-3 py-2 text-left">Valor unitário</th><th className="px-3 py-2 text-left">Valor total</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
                      <tbody>
                        {itens.length ? itens.map((item, idx) => (
                          <tr key={`${item.descricao}-${idx}`} className={`border-t border-[var(--g3-border)] ${idx % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}>
                            <td className="px-3 py-2">{item.descricao}</td><td className="px-3 py-2">{item.quantidade}</td><td className="px-3 py-2">{item.valor_unitario?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "---"}</td><td className="px-3 py-2">{item.valor_total?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "---"}</td>
                            <td className="px-3 py-2 text-right"><Button type="button" variant="ghost" onClick={() => removerItem(idx)}><Trash2 className="h-4 w-4 text-rose-600" /></Button></td>
                          </tr>
                        )) : <tr><td className="px-3 py-4 text-center" colSpan={5}>Nenhum item adicionado.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => void salvarRegistroComEntrada()}
                      disabled={acaoEmAndamento}
                    >
                      {salvarMutation.isPending ? "Registrando..." : "Incluir doação e registrar entrada"}
                    </Button>
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


