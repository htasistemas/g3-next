import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckSquare,
  AlertTriangle,
  Archive,
  ArrowRightLeft,
  BarChart3,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  ListChecks,
  MapPin,
  Package,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  Wallet,
  Wrench,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import {
  usePatrimonios,
  useAtualizarPatrimoniosEmLote,
  useRegistrarMovimentoPatrimonio,
  useSalvarPatrimonio
} from "@/features/patrimonios/use-patrimonios";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import type { Patrimonio, PatrimonioMovimento } from "@/types/patrimonio";

type AbaId =
  | "dashboard"
  | "cadastro"
  | "localizacao"
  | "visual"
  | "movimentacao"
  | "listagem";
type CampoFormulario = "numeroPatrimonio" | "nome" | "valorAquisicao" | "taxaDepreciacao";
type CampoMovimento = "dataMovimento";

type MovimentoAssistido = PatrimonioMovimento & {
  atualizarCadastro: boolean;
  novaUnidade: string;
  novaSala: string;
  novoResponsavel: string;
};

type PatrimonioAnalitico = {
  item: Patrimonio;
  pendencias: string[];
  valorContabil: number;
  ultimaMovimentacao?: PatrimonioMovimento;
};

type EdicaoLote = {
  categoria: string;
  unidade: string;
  sala: string;
  responsavel: string;
  status: string;
  conservacao: string;
};

const abas: AdminTab[] = [
  { id: "dashboard", label: "Painel de controle", icon: BarChart3 },
  { id: "cadastro", label: "Cadastro patrimonial", icon: Pencil },
  { id: "localizacao", label: "Localização e custódia", icon: MapPin },
  { id: "visual", label: "Identificação visual", icon: Camera },
  { id: "movimentacao", label: "Movimentação", icon: Archive },
  { id: "listagem", label: "Listagem e busca", icon: ListChecks }
];

const tituloTela = "Patrimônio";
const categoriasPadrao = [
  "Equipamentos de informática",
  "Mobiliário",
  "Eletrodomésticos",
  "Telefonia",
  "Veículos",
  "Instrumentos",
  "Máquinas",
  "Material permanente",
  "Outros"
];
const conservacaoOptions = ["Novo", "Bom", "Regular", "Ruim", "Inservível"];
const statusOptions = ["Ativo", "Em manutenção", "Em empréstimo", "Baixado / Inativo"];
const origemOptions = ["Compra", "Doação", "Transferência", "Comodato", "Produção própria"];

const defaultForm: Patrimonio = {
  numeroPatrimonio: "",
  nome: "",
  categoria: "",
  subcategoria: "",
  conservacao: "Novo",
  status: "Ativo",
  dataAquisicao: "",
  valorAquisicao: 0,
  origem: "Compra",
  responsavel: "",
  unidade: "",
  sala: "",
  taxaDepreciacao: 0,
  observacoes: "",
  movimentos: []
};

const defaultEdicaoLote: EdicaoLote = {
  categoria: "",
  unidade: "",
  sala: "",
  responsavel: "",
  status: "",
  conservacao: ""
};

function obterHojeIso() {
  const agora = new Date();
  const ajuste = agora.getTime() - agora.getTimezoneOffset() * 60_000;
  return new Date(ajuste).toISOString().slice(0, 10);
}

function criarMovimentoPadrao(base?: Partial<Patrimonio>): MovimentoAssistido {
  return {
    tipo: "MOVIMENTACAO",
    destino: "",
    responsavel: base?.responsavel ?? "",
    observacao: "",
    dataMovimento: obterHojeIso(),
    atualizarCadastro: false,
    novaUnidade: base?.unidade ?? "",
    novaSala: base?.sala ?? "",
    novoResponsavel: base?.responsavel ?? ""
  };
}

function formatarDataInterface(data?: string) {
  if (!data) return "---";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}-${mes}-${ano}`;
}

function formatarMoeda(valor?: number | null) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function normalizarBusca(valor?: string | null) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function gerarResumoLocalizacao(unidade?: string, sala?: string) {
  return [unidade?.trim(), sala?.trim()].filter(Boolean).join(" / ") || "---";
}

function formatarTipoMovimento(tipo?: PatrimonioMovimento["tipo"]) {
  const mapa: Record<PatrimonioMovimento["tipo"], string> = {
    MOVIMENTACAO: "Movimentação",
    MANUTENCAO: "Manutenção",
    BAIXA: "Baixa"
  };

  return tipo ? mapa[tipo] : "---";
}

function obterBadgeStatus(status?: string) {
  const texto = status?.trim() || "Sem status";
  const chave = normalizarBusca(status);

  if (chave.includes("baix")) return { label: "Baixado / inativo", variant: "danger" as const };
  if (chave.includes("manuten")) return { label: "Em manutenção", variant: "warning" as const };
  if (chave.includes("emprest")) return { label: "Em empréstimo", variant: "info" as const };
  if (chave.includes("ativo")) return { label: "Ativo", variant: "success" as const };

  return { label: texto, variant: "default" as const };
}

function obterBadgeConservacao(conservacao?: string) {
  const texto = conservacao?.trim() || "Sem avaliação";
  const chave = normalizarBusca(conservacao);

  if (chave === "novo" || chave === "bom") return { label: texto, variant: "success" as const };
  if (chave === "regular") return { label: texto, variant: "warning" as const };
  if (chave === "ruim" || chave.includes("inserv")) {
    return { label: texto, variant: "danger" as const };
  }

  return { label: texto, variant: "default" as const };
}

function extrairUltimaMovimentacao(item: Patrimonio) {
  return [...(item.movimentos ?? [])]
    .sort((a, b) => String(b.dataMovimento ?? "").localeCompare(String(a.dataMovimento ?? "")))[0];
}

function calcularValorContabilEstimado(item: Patrimonio) {
  const valor = Number(item.valorAquisicao ?? 0);
  const taxa = Math.min(Math.max(Number(item.taxaDepreciacao ?? 0), 0), 100);
  if (!valor || !taxa || !item.dataAquisicao) return valor;

  const dataAquisicao = new Date(`${item.dataAquisicao}T00:00:00`);
  if (Number.isNaN(dataAquisicao.getTime())) return valor;

  const hoje = new Date();
  const anos = Math.max(0, (hoje.getTime() - dataAquisicao.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const fator = Math.max(0, 1 - (taxa / 100) * anos);
  return Math.max(0, valor * fator);
}

function listarPendencias(item: Partial<Patrimonio>) {
  const pendencias: string[] = [];

  if (!item.numeroPatrimonio?.trim()) pendencias.push("Definir número patrimonial");
  if (!item.nome?.trim()) pendencias.push("Informar nome do bem");
  if (!item.categoria?.trim()) pendencias.push("Classificar a categoria");
  if (!item.responsavel?.trim()) pendencias.push("Definir responsável");
  if (!item.unidade?.trim() || !item.sala?.trim()) pendencias.push("Completar localização");
  if (Number(item.valorAquisicao ?? 0) > 0 && !item.dataAquisicao?.trim()) {
    pendencias.push("Registrar data de aquisição");
  }
  if (Number(item.valorAquisicao ?? 0) > 0 && Number(item.taxaDepreciacao ?? 0) <= 0) {
    pendencias.push("Informar taxa de depreciação");
  }
  if (!(item.movimentos ?? []).length) pendencias.push("Sem histórico de movimentação");

  return pendencias;
}

function somarDistribuicao(
  items: Patrimonio[],
  seletor: (item: Patrimonio) => string | undefined,
  fallback: string
) {
  const acumulado = new Map<string, number>();

  items.forEach((item) => {
    const chave = seletor(item)?.trim() || fallback;
    acumulado.set(chave, (acumulado.get(chave) ?? 0) + 1);
  });

  return [...acumulado.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

export function PatrimonioPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("dashboard");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroUnidade, setFiltroUnidade] = useState("todas");
  const [somentePendencias, setSomentePendencias] = useState(false);
  const [selecionadosIds, setSelecionadosIds] = useState<string[]>([]);
  const [edicaoLote, setEdicaoLote] = useState<EdicaoLote>(defaultEdicaoLote);
  const [somenteCamposVaziosLote, setSomenteCamposVaziosLote] = useState(true);
  const [form, setForm] = useState<Patrimonio>(defaultForm);
  const [snapshot, setSnapshot] = useState<Patrimonio>(defaultForm);
  const [movimento, setMovimento] = useState<MovimentoAssistido>(criarMovimentoPadrao());
  const [erros, setErros] = useState<Partial<Record<CampoFormulario, string>>>({});
  const [errosMovimento, setErrosMovimento] = useState<Partial<Record<CampoMovimento, string>>>({});
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);

  const { data, isLoading } = usePatrimonios();
  const salvarMutation = useSalvarPatrimonio();
  const atualizarLoteMutation = useAtualizarPatrimoniosEmLote();
  const movimentoMutation = useRegistrarMovimentoPatrimonio();

  const patrimonios = data?.patrimonios ?? [];
  const carregandoAcoes =
    salvarMutation.isPending || movimentoMutation.isPending || atualizarLoteMutation.isPending;
  const possuiRegistroSelecionado = Boolean(form.idPatrimonio);

  const categoriasDisponiveis = useMemo(
    () =>
      Array.from(
        new Set([...categoriasPadrao, ...patrimonios.map((item) => item.categoria?.trim() || "").filter(Boolean)])
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [patrimonios]
  );

  const unidadesDisponiveis = useMemo(
    () =>
      Array.from(new Set(patrimonios.map((item) => item.unidade?.trim() || "").filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    [patrimonios]
  );

  const salasDisponiveis = useMemo(
    () =>
      Array.from(new Set(patrimonios.map((item) => item.sala?.trim() || "").filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    [patrimonios]
  );

  const responsaveisDisponiveis = useMemo(
    () =>
      Array.from(new Set(patrimonios.map((item) => item.responsavel?.trim() || "").filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    [patrimonios]
  );

  const patrimoniosAnaliticos = useMemo<PatrimonioAnalitico[]>(
    () =>
      patrimonios.map((item) => ({
        item,
        pendencias: listarPendencias(item),
        valorContabil: calcularValorContabilEstimado(item),
        ultimaMovimentacao: extrairUltimaMovimentacao(item)
      })),
    [patrimonios]
  );

  const patrimoniosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);

    return patrimoniosAnaliticos.filter(({ item, pendencias }) => {
      const alvo = normalizarBusca(
        [
          item.numeroPatrimonio,
          item.nome,
          item.categoria,
          item.subcategoria,
          item.unidade,
          item.sala,
          item.responsavel,
          item.status
        ]
          .filter(Boolean)
          .join(" ")
      );

      if (termo && !alvo.includes(termo)) return false;
      if (filtroStatus !== "todos" && normalizarBusca(item.status) !== normalizarBusca(filtroStatus)) return false;
      if (
        filtroCategoria !== "todas" &&
        normalizarBusca(item.categoria) !== normalizarBusca(filtroCategoria)
      ) {
        return false;
      }
      if (filtroUnidade !== "todas" && normalizarBusca(item.unidade) !== normalizarBusca(filtroUnidade)) {
        return false;
      }
      if (somentePendencias && !pendencias.length) return false;

      return true;
    });
  }, [busca, filtroCategoria, filtroStatus, filtroUnidade, patrimoniosAnaliticos, somentePendencias]);

  const patrimoniosSelecionados = useMemo(
    () =>
      patrimoniosAnaliticos.filter(({ item }) =>
        item.idPatrimonio ? selecionadosIds.includes(String(item.idPatrimonio)) : false
      ),
    [patrimoniosAnaliticos, selecionadosIds]
  );

  const todosFiltradosSelecionados =
    Boolean(patrimoniosFiltrados.length) &&
    patrimoniosFiltrados.every(({ item }) =>
      item.idPatrimonio ? selecionadosIds.includes(String(item.idPatrimonio)) : false
    );

  const dashboard = useMemo(() => {
    const ativos = patrimonios.filter((item) => normalizarBusca(item.status).includes("ativo")).length;
    const manutencao = patrimonios.filter((item) => normalizarBusca(item.status).includes("manuten")).length;
    const baixados = patrimonios.filter((item) => normalizarBusca(item.status).includes("baix")).length;
    const semResponsavel = patrimonios.filter((item) => !item.responsavel?.trim()).length;
    const semLocalizacao = patrimonios.filter((item) => !item.unidade?.trim() || !item.sala?.trim()).length;
    const valorTotal = patrimonios.reduce((acc, item) => acc + Number(item.valorAquisicao ?? 0), 0);
    const valorContabil = patrimoniosAnaliticos.reduce((acc, item) => acc + item.valorContabil, 0);
    const comPendencias = patrimoniosAnaliticos.filter((item) => item.pendencias.length).length;
    const categorias = somarDistribuicao(patrimonios, (item) => item.categoria, "Sem categoria");
    const unidades = somarDistribuicao(patrimonios, (item) => item.unidade, "Sem unidade");
    const prioridades = [...patrimoniosAnaliticos]
      .sort((a, b) => b.pendencias.length - a.pendencias.length)
      .slice(0, 6);
    const ultimasMovimentacoes = patrimonios
      .flatMap((item) =>
        (item.movimentos ?? []).map((movimentacao) => ({
          patrimonio: item,
          movimentacao
        }))
      )
      .sort((a, b) => String(b.movimentacao.dataMovimento ?? "").localeCompare(String(a.movimentacao.dataMovimento ?? "")))
      .slice(0, 6);

    return {
      total: patrimonios.length,
      ativos,
      manutencao,
      baixados,
      semResponsavel,
      semLocalizacao,
      valorTotal,
      valorContabil,
      comPendencias,
      categorias,
      unidades,
      prioridades,
      ultimasMovimentacoes
    };
  }, [patrimonios, patrimoniosAnaliticos]);

  const pendenciasFormulario = useMemo(() => listarPendencias(form), [form]);
  const valorContabilFormulario = useMemo(() => calcularValorContabilEstimado(form), [form]);
  const ultimaMovimentacaoFormulario = useMemo(() => extrairUltimaMovimentacao(form), [form]);
  const badgeStatusFormulario = useMemo(() => obterBadgeStatus(form.status), [form.status]);
  const badgeConservacaoFormulario = useMemo(() => obterBadgeConservacao(form.conservacao), [form.conservacao]);

  function validarCampoFormulario(campo: CampoFormulario, valor = form[campo]) {
    if (campo === "numeroPatrimonio") {
      return String(valor ?? "").trim() ? "" : "Informe o número patrimonial.";
    }
    if (campo === "nome") {
      return String(valor ?? "").trim().length >= 2 ? "" : "Informe o nome do bem.";
    }
    if (campo === "valorAquisicao") {
      return Number(valor ?? 0) >= 0 ? "" : "O valor de aquisição não pode ser negativo.";
    }
    if (campo === "taxaDepreciacao") {
      const taxa = Number(valor ?? 0);
      return taxa >= 0 && taxa <= 100 ? "" : "A taxa de depreciação deve ficar entre 0 e 100%.";
    }
    return "";
  }

  function atualizarErroFormulario(campo: CampoFormulario, valor = form[campo]) {
    const mensagem = validarCampoFormulario(campo, valor);
    setErros((atual) => {
      if (!mensagem) {
        const proximo = { ...atual };
        delete proximo[campo];
        return proximo;
      }
      return { ...atual, [campo]: mensagem };
    });
  }

  function validarFormulario() {
    const proximo: Partial<Record<CampoFormulario, string>> = {};
    (["numeroPatrimonio", "nome", "valorAquisicao", "taxaDepreciacao"] as CampoFormulario[]).forEach(
      (campo) => {
        const mensagem = validarCampoFormulario(campo);
        if (mensagem) proximo[campo] = mensagem;
      }
    );
    setErros(proximo);
    return !Object.keys(proximo).length;
  }

  function validarCampoMovimento(campo: CampoMovimento, valor = movimento[campo]) {
    if (campo === "dataMovimento") {
      return String(valor ?? "").trim() ? "" : "Informe a data da movimentação.";
    }
    return "";
  }

  function atualizarErroMovimento(campo: CampoMovimento, valor = movimento[campo]) {
    const mensagem = validarCampoMovimento(campo, valor);
    setErrosMovimento((atual) => {
      if (!mensagem) {
        const proximo = { ...atual };
        delete proximo[campo];
        return proximo;
      }
      return { ...atual, [campo]: mensagem };
    });
  }

  function validarMovimento() {
    const proximo: Partial<Record<CampoMovimento, string>> = {};
    (["dataMovimento"] as CampoMovimento[]).forEach((campo) => {
      const mensagem = validarCampoMovimento(campo);
      if (mensagem) proximo[campo] = mensagem;
    });
    setErrosMovimento(proximo);
    return !Object.keys(proximo).length;
  }

  function novo() {
    setForm(defaultForm);
    setSnapshot(defaultForm);
    setMovimento(criarMovimentoPadrao());
    setSelecionadosIds([]);
    setErros({});
    setErrosMovimento({});
    setAbaAtiva("cadastro");
  }

  function selecionar(item: Patrimonio) {
    const proximo = {
      ...defaultForm,
      ...item,
      movimentos: item.movimentos ?? []
    };
    setForm(proximo);
    setSnapshot(proximo);
    setMovimento(criarMovimentoPadrao(proximo));
    setErros({});
    setErrosMovimento({});
    setAbaAtiva("cadastro");
  }

  function buscar() {
    setAbaAtiva("listagem");
  }

  function cancelar() {
    setForm(snapshot);
    setMovimento(criarMovimentoPadrao(snapshot));
    setErros({});
    setErrosMovimento({});
  }

  function alternarSelecaoPatrimonio(id?: string) {
    if (!id) return;

    setSelecionadosIds((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]
    );
  }

  function alternarSelecaoTodosFiltrados() {
    const idsFiltrados = patrimoniosFiltrados
      .map(({ item }) => item.idPatrimonio)
      .filter(Boolean)
      .map((item) => String(item));

    setSelecionadosIds((atual) => {
      if (idsFiltrados.every((id) => atual.includes(id))) {
        return atual.filter((id) => !idsFiltrados.includes(id));
      }

      return Array.from(new Set([...atual, ...idsFiltrados]));
    });
  }

  function selecionarFiltradosComPendencias() {
    const idsPendentes = patrimoniosFiltrados
      .filter((item) => item.pendencias.length)
      .map(({ item }) => item.idPatrimonio)
      .filter(Boolean)
      .map((item) => String(item));

    setSelecionadosIds((atual) => Array.from(new Set([...atual, ...idsPendentes])));
  }

  function limparSelecaoLote() {
    setSelecionadosIds([]);
  }

  function limparEdicaoLote() {
    setEdicaoLote(defaultEdicaoLote);
    setSomenteCamposVaziosLote(true);
  }

  async function aplicarEdicaoLote() {
    if (!patrimoniosSelecionados.length) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Seleção necessária",
        texto: "Selecione ao menos um patrimônio na listagem para aplicar o saneamento em lote."
      });
      return;
    }

    const camposPreenchidos = Object.entries(edicaoLote).filter(([, valor]) => valor.trim());
    if (!camposPreenchidos.length) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Campos não informados",
        texto: "Preencha pelo menos um campo do saneamento em lote antes de aplicar."
      });
      return;
    }

    const atualizacoes = patrimoniosSelecionados.map(({ item }) => {
      const id = String(item.idPatrimonio);
      const payload: Patrimonio = {
        ...item,
        numeroPatrimonio: item.numeroPatrimonio.trim(),
        nome: item.nome.trim(),
        categoria:
          edicaoLote.categoria.trim() &&
          (!somenteCamposVaziosLote || !item.categoria?.trim())
            ? edicaoLote.categoria.trim()
            : item.categoria,
        unidade:
          edicaoLote.unidade.trim() &&
          (!somenteCamposVaziosLote || !item.unidade?.trim())
            ? edicaoLote.unidade.trim()
            : item.unidade,
        sala:
          edicaoLote.sala.trim() &&
          (!somenteCamposVaziosLote || !item.sala?.trim())
            ? edicaoLote.sala.trim()
            : item.sala,
        responsavel:
          edicaoLote.responsavel.trim() &&
          (!somenteCamposVaziosLote || !item.responsavel?.trim())
            ? edicaoLote.responsavel.trim()
            : item.responsavel,
        status:
          edicaoLote.status.trim() &&
          (!somenteCamposVaziosLote || !item.status?.trim())
            ? edicaoLote.status.trim()
            : item.status,
        conservacao:
          edicaoLote.conservacao.trim() &&
          (!somenteCamposVaziosLote || !item.conservacao?.trim())
            ? edicaoLote.conservacao.trim()
            : item.conservacao,
        movimentos: undefined
      };

      return { id, payload };
    });

    try {
      const respostas = await atualizarLoteMutation.mutateAsync(atualizacoes);
      const patrimonioSelecionadoAtualizado = form.idPatrimonio
        ? respostas.find((item) => item.patrimonio.idPatrimonio === form.idPatrimonio)?.patrimonio
        : undefined;

      if (patrimonioSelecionadoAtualizado) {
        setForm(patrimonioSelecionadoAtualizado);
        setSnapshot(patrimonioSelecionadoAtualizado);
        setMovimento(criarMovimentoPadrao(patrimonioSelecionadoAtualizado));
      }

      limparSelecaoLote();
      limparEdicaoLote();
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Saneamento concluído",
        texto: `${respostas.length} patrimônio(s) foram atualizados em lote com sucesso.`
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível concluir a atualização em lote."
      });
    }
  }

  function prepararMovimentoRapido(tipo: PatrimonioMovimento["tipo"]) {
    setAbaAtiva("movimentacao");
    setMovimento((atual) => ({
      ...atual,
      tipo,
      dataMovimento: obterHojeIso(),
      atualizarCadastro: tipo !== "MOVIMENTACAO" ? true : atual.atualizarCadastro,
      novaUnidade: atual.novaUnidade || form.unidade || "",
      novaSala: atual.novaSala || form.sala || "",
      novoResponsavel: atual.novoResponsavel || form.responsavel || ""
    }));
  }

  async function salvar() {
    if (!validarFormulario()) {
      setAbaAtiva("cadastro");
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Revise os campos destacados antes de salvar o patrimônio."
      });
      return;
    }

    try {
      const payload: Patrimonio = {
        ...form,
        numeroPatrimonio: form.numeroPatrimonio.trim(),
        nome: form.nome.trim(),
        categoria: form.categoria?.trim() || undefined,
        subcategoria: form.subcategoria?.trim() || undefined,
        conservacao: form.conservacao?.trim() || undefined,
        status: form.status?.trim() || undefined,
        dataAquisicao: form.dataAquisicao?.trim() || undefined,
        valorAquisicao: Number(form.valorAquisicao ?? 0),
        origem: form.origem?.trim() || undefined,
        responsavel: form.responsavel?.trim() || undefined,
        unidade: form.unidade?.trim() || undefined,
        sala: form.sala?.trim() || undefined,
        taxaDepreciacao: Number(form.taxaDepreciacao ?? 0),
        observacoes: form.observacoes?.trim() || undefined,
        movimentos: undefined
      };

      const response = await salvarMutation.mutateAsync(payload);
      const patrimonio = response.patrimonio;
      setForm(patrimonio);
      setSnapshot(patrimonio);
      setMovimento(criarMovimentoPadrao(patrimonio));
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Patrimônio salvo com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o patrimônio."
      });
    }
  }

  async function registrarMovimento() {
    if (!form.idPatrimonio) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um patrimônio antes de registrar movimentação."
      });
      return;
    }

    if (!validarMovimento()) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Revise os dados da movimentação antes de continuar."
      });
      return;
    }

    try {
      const responseMovimento = await movimentoMutation.mutateAsync({
        id: form.idPatrimonio,
        payload: {
          tipo: movimento.tipo,
          destino: movimento.destino?.trim() || undefined,
          responsavel: movimento.responsavel?.trim() || undefined,
          observacao: movimento.observacao?.trim() || undefined,
          dataMovimento: movimento.dataMovimento?.trim() || undefined
        }
      });

      let patrimonioAtualizado = responseMovimento.patrimonio;
      const precisaSincronizarCadastro = movimento.atualizarCadastro || movimento.tipo !== "MOVIMENTACAO";

      if (precisaSincronizarCadastro) {
        try {
          const responseCadastro = await salvarMutation.mutateAsync({
            ...patrimonioAtualizado,
            status:
              movimento.tipo === "BAIXA"
                ? "Baixado / Inativo"
                : movimento.tipo === "MANUTENCAO"
                  ? "Em manutenção"
                  : patrimonioAtualizado.status,
            unidade: movimento.atualizarCadastro
              ? movimento.novaUnidade.trim() || patrimonioAtualizado.unidade
              : patrimonioAtualizado.unidade,
            sala: movimento.atualizarCadastro
              ? movimento.novaSala.trim() || patrimonioAtualizado.sala
              : patrimonioAtualizado.sala,
            responsavel: movimento.atualizarCadastro
              ? movimento.novoResponsavel.trim() || patrimonioAtualizado.responsavel
              : patrimonioAtualizado.responsavel,
            movimentos: undefined
          });
          patrimonioAtualizado = responseCadastro.patrimonio;
        } catch (error: any) {
          setForm(patrimonioAtualizado);
          setSnapshot(patrimonioAtualizado);
          setMovimento(criarMovimentoPadrao(patrimonioAtualizado));
          setPopupMensagem({
            tipo: "aviso",
            titulo: "Movimentação registrada",
            texto:
              error?.response?.data?.message ??
              "A movimentação foi registrada, mas o cadastro não pôde ser sincronizado automaticamente."
          });
          return;
        }
      }

      setForm(patrimonioAtualizado);
      setSnapshot(patrimonioAtualizado);
      setMovimento(criarMovimentoPadrao(patrimonioAtualizado));
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: precisaSincronizarCadastro
          ? "Movimentação registrada e cadastro sincronizado com sucesso."
          : "Movimentação registrada com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível registrar a movimentação."
      });
    }
  }

  function excluir() {
    setPopupMensagem({
      tipo: "aviso",
      titulo: "Ação controlada",
      texto: "A exclusão de patrimônio permanece bloqueada para preservar o histórico institucional."
    });
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Relatório de patrimônio" });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível preparar a impressão."
      });
    }
  }

  function fechar() {
    navigate("/dashboard/visao-geral");
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: buscar, variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
    { label: "Excluir", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
    { label: "Imprimir", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
    { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
  ];

  const progressoChecklist = [
    Boolean(form.numeroPatrimonio.trim()),
    Boolean(form.nome.trim()),
    Boolean(form.categoria?.trim()),
    Boolean(form.responsavel?.trim()),
    Boolean(form.unidade?.trim() && form.sala?.trim()),
    Boolean(form.dataAquisicao?.trim()),
    Boolean((form.movimentos ?? []).length)
  ].filter(Boolean).length;

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Setor administrativo"
        pageTitle={tituloTela}
        activeTitle={abas.find((aba) => aba.id === abaAtiva)?.label}
        codeBadge={form.numeroPatrimonio ? `Patrimônio ${form.numeroPatrimonio}` : "Novo cadastro"}
      >
        <section className="grid gap-3 xl:grid-cols-[2fr,1fr]">
          <Card className="border-[var(--g3-border)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumo executivo do patrimônio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={badgeStatusFormulario.variant}>{badgeStatusFormulario.label}</Badge>
                <Badge variant={badgeConservacaoFormulario.variant}>{badgeConservacaoFormulario.label}</Badge>
                <Badge variant={pendenciasFormulario.length ? "warning" : "success"}>
                  {pendenciasFormulario.length
                    ? `${pendenciasFormulario.length} pendência(s)`
                    : "Cadastro completo"}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Número patrimonial
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                    {form.numeroPatrimonio || "---"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Nome do bem
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                    {form.nome || "---"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Localização atual
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                    {gerarResumoLocalizacao(form.unidade, form.sala)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Responsável
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                    {form.responsavel || "---"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Valor de aquisição
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                    {formatarMoeda(form.valorAquisicao)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Valor contábil estimado
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                    {formatarMoeda(valorContabilFormulario)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Data de aquisição
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                    {formatarDataInterface(form.dataAquisicao)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Última movimentação
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">
                    {ultimaMovimentacaoFormulario
                      ? `${formatarTipoMovimento(ultimaMovimentacaoFormulario.tipo)} em ${formatarDataInterface(
                          ultimaMovimentacaoFormulario.dataMovimento
                        )}`
                      : "---"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--g3-border)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Painel de atenção rápida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3">
                <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                  Checklist institucional
                </p>
                <p className="mt-1 text-xs text-[var(--g3-muted)]">
                  {progressoChecklist} de 7 pontos essenciais preenchidos.
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--g3-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--g3-active)] transition-all"
                    style={{ width: `${(progressoChecklist / 7) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {pendenciasFormulario.length ? (
                  pendenciasFormulario.slice(0, 5).map((pendencia) => (
                    <div
                      key={pendencia}
                      className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{pendencia}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Este cadastro está pronto para controle, rastreio e auditoria.</span>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="justify-start"
                  disabled={!possuiRegistroSelecionado}
                  onClick={() => prepararMovimentoRapido("MOVIMENTACAO")}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Registrar transferência
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  disabled={!possuiRegistroSelecionado}
                  onClick={() => prepararMovimentoRapido("MANUTENCAO")}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  Enviar para manutenção
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  disabled={!possuiRegistroSelecionado}
                  onClick={() => prepararMovimentoRapido("BAIXA")}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Registrar baixa
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {abaAtiva === "dashboard" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Bens cadastrados</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                  {dashboard.total}
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ativos</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold text-emerald-700">
                  {dashboard.ativos}
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Em manutenção</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold text-amber-600">
                  {dashboard.manutencao}
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Com pendências</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold text-[var(--g3-danger)]">
                  {dashboard.comPendencias}
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Sem responsável</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold text-[var(--g3-danger)]">
                  {dashboard.semResponsavel}
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Sem localização</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold text-[var(--g3-danger)]">
                  {dashboard.semLocalizacao}
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Valor de aquisição</CardTitle>
                </CardHeader>
                <CardContent className="text-xl font-semibold text-[var(--g3-active)]">
                  {formatarMoeda(dashboard.valorTotal)}
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Valor contábil estimado</CardTitle>
                </CardHeader>
                <CardContent className="text-xl font-semibold text-[var(--g3-active)]">
                  {formatarMoeda(dashboard.valorContabil)}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.35fr,1fr]">
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Prioridades da gestão patrimonial</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.prioridades.length ? (
                    dashboard.prioridades.map(({ item, pendencias }) => (
                      <button
                        key={item.idPatrimonio ?? item.numeroPatrimonio}
                        type="button"
                        className="flex w-full flex-col gap-2 rounded-xl border border-[var(--g3-border)] px-3 py-3 text-left transition hover:bg-[var(--g3-primary-soft)]/25 sm:flex-row sm:items-center sm:justify-between"
                        onClick={() => selecionar(item)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                            {item.numeroPatrimonio || "---"} • {item.nome || "Sem nome"}
                          </p>
                          <p className="mt-1 text-xs text-[var(--g3-muted)]">
                            {gerarResumoLocalizacao(item.unidade, item.sala)} • {item.responsavel || "Sem responsável"}
                          </p>
                        </div>
                        <Badge variant={pendencias.length ? "warning" : "success"}>
                          {pendencias.length ? `${pendencias.length} ajustes` : "OK"}
                        </Badge>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--g3-muted)]">
                      Nenhum patrimônio cadastrado até o momento.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Últimas movimentações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.ultimasMovimentacoes.length ? (
                    dashboard.ultimasMovimentacoes.map(({ patrimonio, movimentacao }, index) => (
                      <div
                        key={`${patrimonio.idPatrimonio ?? patrimonio.numeroPatrimonio}-${movimentacao.idMovimento ?? index}`}
                        className="rounded-xl border border-[var(--g3-border)] px-3 py-3"
                      >
                        <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                          {patrimonio.numeroPatrimonio} • {patrimonio.nome}
                        </p>
                        <p className="mt-1 text-xs text-[var(--g3-muted)]">
                          {formatarTipoMovimento(movimentacao.tipo)} em{" "}
                          {formatarDataInterface(movimentacao.dataMovimento)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--g3-muted)]">
                          Destino: {movimentacao.destino || "---"} • Responsável:{" "}
                          {movimentacao.responsavel || "---"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--g3-muted)]">
                      Ainda não há movimentações registradas.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              <Card className="border-[var(--g3-border)] xl:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Categorias com maior volume</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.categorias.length ? (
                    dashboard.categorias.map((item) => {
                      const base = Math.max(...dashboard.categorias.map((entrada) => entrada.total), 1);
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--g3-foreground)]">{item.label}</span>
                            <span className="font-semibold text-[var(--g3-active)]">{item.total}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[var(--g3-border)]">
                            <div
                              className="h-full rounded-full bg-[var(--g3-active)]"
                              style={{ width: `${(item.total / base) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-[var(--g3-muted)]">Sem dados para distribuição.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)] xl:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Unidades com maior acervo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.unidades.length ? (
                    dashboard.unidades.map((item) => {
                      const base = Math.max(...dashboard.unidades.map((entrada) => entrada.total), 1);
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--g3-foreground)]">{item.label}</span>
                            <span className="font-semibold text-[var(--g3-active)]">{item.total}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[var(--g3-border)]">
                            <div
                              className="h-full rounded-full bg-[var(--g3-active)]"
                              style={{ width: `${(item.total / base) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-[var(--g3-muted)]">Sem dados para distribuição.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)] xl:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Boas práticas embutidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-[var(--g3-foreground)]">
                  <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 px-3 py-3">
                    Todo bem deve sair desta tela com número, categoria, responsável e localização definidos.
                  </div>
                  <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 px-3 py-3">
                    Movimentação útil é a que deixa rastro e, quando necessário, atualiza a custódia do cadastro.
                  </div>
                  <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 px-3 py-3">
                    O valor contábil estimado ajuda a priorizar manutenção, substituição e prestação de contas.
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {abaAtiva === "cadastro" ? (
          <section className="space-y-3">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Identificação patrimonial</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <Label>Número patrimonial *</Label>
                  <Input
                    value={form.numeroPatrimonio}
                    className={erros.numeroPatrimonio ? "border-rose-400 focus:ring-rose-400" : undefined}
                    placeholder="Ex.: 000123"
                    onChange={(event) =>
                      setForm((atual) => ({ ...atual, numeroPatrimonio: event.target.value }))
                    }
                    onBlur={() => atualizarErroFormulario("numeroPatrimonio")}
                  />
                  {erros.numeroPatrimonio ? (
                    <p className="text-xs text-rose-700">{erros.numeroPatrimonio}</p>
                  ) : (
                    <p className="text-xs text-[var(--g3-muted)]">
                      Use o identificador oficial que será rastreado na instituição.
                    </p>
                  )}
                </div>

                <div className="space-y-1 xl:col-span-2">
                  <Label>Nome do bem *</Label>
                  <Input
                    value={form.nome}
                    className={erros.nome ? "border-rose-400 focus:ring-rose-400" : undefined}
                    placeholder="Ex.: Computador da recepção"
                    onChange={(event) => setForm((atual) => ({ ...atual, nome: event.target.value }))}
                    onBlur={() => atualizarErroFormulario("nome")}
                  />
                  {erros.nome ? <p className="text-xs text-rose-700">{erros.nome}</p> : null}
                </div>

                <div className="space-y-1">
                  <Label>Categoria</Label>
                  <Input
                    list="patrimonio-categorias"
                    value={form.categoria ?? ""}
                    placeholder="Selecione ou digite"
                    onChange={(event) => setForm((atual) => ({ ...atual, categoria: event.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Subcategoria</Label>
                  <Input
                    value={form.subcategoria ?? ""}
                    placeholder="Detalhe a classificação"
                    onChange={(event) => setForm((atual) => ({ ...atual, subcategoria: event.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Conservação</Label>
                  <Select
                    value={form.conservacao ?? "Novo"}
                    onChange={(event) => setForm((atual) => ({ ...atual, conservacao: event.target.value }))}
                  >
                    {conservacaoOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={form.status ?? "Ativo"}
                    onChange={(event) => setForm((atual) => ({ ...atual, status: event.target.value }))}
                  >
                    {statusOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Origem</Label>
                  <Input
                    list="patrimonio-origens"
                    value={form.origem ?? ""}
                    placeholder="Selecione ou digite"
                    onChange={(event) => setForm((atual) => ({ ...atual, origem: event.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Aquisição e controle econômico</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <Label>Data de aquisição</Label>
                  <Input
                    type="date"
                    value={form.dataAquisicao ?? ""}
                    onChange={(event) =>
                      setForm((atual) => ({ ...atual, dataAquisicao: event.target.value }))
                    }
                  />
                  <p className="text-xs text-[var(--g3-muted)]">
                    A interface resume essa data em formato institucional logo acima.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label>Valor de aquisição</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={Number(form.valorAquisicao ?? 0)}
                    className={erros.valorAquisicao ? "border-rose-400 focus:ring-rose-400" : undefined}
                    onChange={(event) =>
                      setForm((atual) => ({
                        ...atual,
                        valorAquisicao: Number(event.target.value) || 0
                      }))
                    }
                    onBlur={() => atualizarErroFormulario("valorAquisicao")}
                  />
                  {erros.valorAquisicao ? (
                    <p className="text-xs text-rose-700">{erros.valorAquisicao}</p>
                  ) : (
                    <p className="text-xs text-[var(--g3-muted)]">
                      Valor usado no painel e na estimativa contábil.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Taxa de depreciação (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={Number(form.taxaDepreciacao ?? 0)}
                    className={erros.taxaDepreciacao ? "border-rose-400 focus:ring-rose-400" : undefined}
                    onChange={(event) =>
                      setForm((atual) => ({
                        ...atual,
                        taxaDepreciacao: Number(event.target.value) || 0
                      }))
                    }
                    onBlur={() => atualizarErroFormulario("taxaDepreciacao")}
                  />
                  {erros.taxaDepreciacao ? (
                    <p className="text-xs text-rose-700">{erros.taxaDepreciacao}</p>
                  ) : (
                    <p className="text-xs text-[var(--g3-muted)]">
                      Ajuda a estimar o valor atual do bem ao longo do tempo.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Valor contábil estimado
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[var(--g3-active)]">
                    {formatarMoeda(valorContabilFormulario)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--g3-muted)]">
                    Estimativa linear baseada na taxa informada e na data de aquisição.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Observações e orientação de cadastro</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 xl:grid-cols-[1.5fr,1fr]">
                <div className="space-y-1">
                  <Label>Observações</Label>
                  <Textarea
                    rows={7}
                    value={form.observacoes ?? ""}
                    placeholder="Descreva características importantes, número de série, notas de conservação ou orientações de uso."
                    onChange={(event) => setForm((atual) => ({ ...atual, observacoes: event.target.value }))}
                  />
                </div>

                <div className="space-y-2 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3 text-sm text-[var(--g3-foreground)]">
                  <p className="font-semibold">Cadastro forte, controle simples</p>
                  <p>
                    Bons sistemas patrimoniais evitam registros órfãos. Aqui, o foco é sair com bem classificado,
                    localizado, atribuído e pronto para rastreabilidade.
                  </p>
                  <p>
                    Se o bem mudou de sala, responsável ou situação, use a aba de movimentação para registrar o
                    histórico e, se necessário, sincronizar o cadastro no mesmo fluxo.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {abaAtiva === "localizacao" ? (
          <section className="space-y-3">
            <div className="grid gap-3 xl:grid-cols-[1.25fr,1fr]">
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Localização atual do bem</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Unidade</Label>
                    <Input
                      list="patrimonio-unidades"
                      value={form.unidade ?? ""}
                      placeholder="Selecione ou digite"
                      onChange={(event) => setForm((atual) => ({ ...atual, unidade: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Sala</Label>
                    <Input
                      list="patrimonio-salas"
                      value={form.sala ?? ""}
                      placeholder="Selecione ou digite"
                      onChange={(event) => setForm((atual) => ({ ...atual, sala: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label>Responsável pela guarda</Label>
                    <Input
                      list="patrimonio-responsaveis"
                      value={form.responsavel ?? ""}
                      placeholder="Nome do responsável atual"
                      onChange={(event) =>
                        setForm((atual) => ({ ...atual, responsavel: event.target.value }))
                      }
                    />
                    <p className="text-xs text-[var(--g3-muted)]">
                      O responsável facilita conferência, prestação de contas e rastreio.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resumo de vínculo institucional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-[var(--g3-foreground)]">
                  <p className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[var(--g3-active)]" />
                    Unidade: {form.unidade || "---"}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--g3-active)]" />
                    Sala: {form.sala || "---"}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <Package className="h-4 w-4 text-[var(--g3-active)]" />
                    Responsável: {form.responsavel || "---"}
                  </p>
                  <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                      Última movimentação
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--g3-foreground)]">
                      {ultimaMovimentacaoFormulario
                        ? `${formatarTipoMovimento(ultimaMovimentacaoFormulario.tipo)} em ${formatarDataInterface(
                            ultimaMovimentacaoFormulario.dataMovimento
                          )}`
                        : "Sem histórico registrado"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Conferência de conformidade</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {[
                  {
                    ok: Boolean(form.numeroPatrimonio.trim()),
                    titulo: "Número patrimonial definido",
                    detalhe: form.numeroPatrimonio || "Ainda não informado"
                  },
                  {
                    ok: Boolean(form.categoria?.trim()),
                    titulo: "Categoria definida",
                    detalhe: form.categoria || "Classificação pendente"
                  },
                  {
                    ok: Boolean(form.responsavel?.trim()),
                    titulo: "Responsável atribuído",
                    detalhe: form.responsavel || "Responsável pendente"
                  },
                  {
                    ok: Boolean(form.unidade?.trim() && form.sala?.trim()),
                    titulo: "Localização completa",
                    detalhe: gerarResumoLocalizacao(form.unidade, form.sala)
                  },
                  {
                    ok: Boolean(form.dataAquisicao?.trim()),
                    titulo: "Data de aquisição registrada",
                    detalhe: formatarDataInterface(form.dataAquisicao)
                  },
                  {
                    ok: Boolean((form.movimentos ?? []).length),
                    titulo: "Histórico iniciado",
                    detalhe: (form.movimentos ?? []).length
                      ? `${(form.movimentos ?? []).length} movimentação(ões)`
                      : "Sem histórico"
                  }
                ].map((item) => (
                  <div
                    key={item.titulo}
                    className={`rounded-xl border px-3 py-3 ${
                      item.ok
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {item.ok ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-semibold">{item.titulo}</p>
                        <p className="mt-1 text-xs">{item.detalhe}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {abaAtiva === "visual" ? (
          <section className="space-y-3">
            <div className="grid gap-3 xl:grid-cols-[1.15fr,1fr]">
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Prévia da identificação visual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl border border-[var(--g3-border)] bg-gradient-to-br from-[var(--g3-primary-soft)] via-white to-[var(--g3-primary-soft)]/20 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--g3-muted)]">
                      Etiqueta patrimonial
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--g3-active)]">
                      {form.numeroPatrimonio || "Sem número"}
                    </p>
                    <p className="mt-2 text-base font-semibold text-[var(--g3-foreground)]">
                      {form.nome || "Nome do patrimônio"}
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-white/70 bg-white/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                          Local
                        </p>
                        <p className="mt-1 text-sm font-medium text-[var(--g3-foreground)]">
                          {gerarResumoLocalizacao(form.unidade, form.sala)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/70 bg-white/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                          Responsável
                        </p>
                        <p className="mt-1 text-sm font-medium text-[var(--g3-foreground)]">
                          {form.responsavel || "---"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={badgeStatusFormulario.variant}>{badgeStatusFormulario.label}</Badge>
                    <Badge variant={badgeConservacaoFormulario.variant}>{badgeConservacaoFormulario.label}</Badge>
                  </div>

                  <Button variant="outline" onClick={imprimir}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir ficha atual
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Conferência visual orientada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3 text-sm text-[var(--g3-foreground)]">
                    Esta área foi organizada para preparar foto, etiqueta e auditoria visual sem depender de clique
                    duplo nem fluxo escondido.
                  </div>
                  <div className="space-y-2">
                    {[
                      "Plaqueta visível e compatível com o número cadastrado.",
                      "Descrição do bem compreensível para quem faz conferência em campo.",
                      "Responsável e localização coerentes com o uso atual.",
                      "Observações ajudam a identificar características únicas do item."
                    ].map((texto) => (
                      <div
                        key={texto}
                        className="flex items-start gap-2 rounded-xl border border-[var(--g3-border)] px-3 py-2 text-sm text-[var(--g3-foreground)]"
                      >
                        <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-[var(--g3-active)]" />
                        <span>{texto}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <Label>Características visuais e observações</Label>
                    <Textarea
                      rows={7}
                      value={form.observacoes ?? ""}
                      placeholder="Cor, modelo, número de série, marcas de identificação ou observações de conferência."
                      onChange={(event) =>
                        setForm((atual) => ({ ...atual, observacoes: event.target.value }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {abaAtiva === "movimentacao" ? (
          <section className="space-y-3">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ação de movimentação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={!possuiRegistroSelecionado} onClick={() => prepararMovimentoRapido("MOVIMENTACAO")}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Transferência
                  </Button>
                  <Button variant="outline" disabled={!possuiRegistroSelecionado} onClick={() => prepararMovimentoRapido("MANUTENCAO")}>
                    <Wrench className="mr-2 h-4 w-4" />
                    Manutenção
                  </Button>
                  <Button variant="outline" disabled={!possuiRegistroSelecionado} onClick={() => prepararMovimentoRapido("BAIXA")}>
                    <Archive className="mr-2 h-4 w-4" />
                    Baixa
                  </Button>
                </div>

                <div className="grid gap-3 rounded-xl border border-[var(--g3-border)] p-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Select
                      value={movimento.tipo}
                      onChange={(event) =>
                        setMovimento((atual) => ({
                          ...atual,
                          tipo: event.target.value as PatrimonioMovimento["tipo"]
                        }))
                      }
                    >
                      <option value="MOVIMENTACAO">Movimentação</option>
                      <option value="MANUTENCAO">Manutenção</option>
                      <option value="BAIXA">Baixa</option>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={movimento.dataMovimento ?? ""}
                      className={errosMovimento.dataMovimento ? "border-rose-400 focus:ring-rose-400" : undefined}
                      onChange={(event) =>
                        setMovimento((atual) => ({ ...atual, dataMovimento: event.target.value }))
                      }
                      onBlur={() => atualizarErroMovimento("dataMovimento")}
                    />
                    {errosMovimento.dataMovimento ? (
                      <p className="text-xs text-rose-700">{errosMovimento.dataMovimento}</p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <Label>Destino ou ocorrência</Label>
                    <Input
                      value={movimento.destino ?? ""}
                      placeholder="Ex.: Sala da coordenação"
                      onChange={(event) =>
                        setMovimento((atual) => ({ ...atual, destino: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Responsável pelo registro</Label>
                    <Input
                      list="patrimonio-responsaveis"
                      value={movimento.responsavel ?? ""}
                      placeholder="Quem realizou ou recebeu"
                      onChange={(event) =>
                        setMovimento((atual) => ({ ...atual, responsavel: event.target.value }))
                      }
                    />
                  </div>

                  <div className="flex items-end">
                    <Button className="w-full" disabled={!possuiRegistroSelecionado || carregandoAcoes} onClick={() => void registrarMovimento()}>
                      Registrar agora
                    </Button>
                  </div>

                  <div className="space-y-1 md:col-span-2 xl:col-span-5">
                    <Label>Observação</Label>
                    <Textarea
                      rows={3}
                      value={movimento.observacao ?? ""}
                      placeholder="Descreva o motivo, condição do bem, encaminhamento ou referência do atendimento."
                      onChange={(event) =>
                        setMovimento((atual) => ({ ...atual, observacao: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--g3-border)] p-3">
                  <label className="flex items-start gap-3">
                    <Checkbox
                      checked={movimento.atualizarCadastro}
                      onChange={(event) =>
                        setMovimento((atual) => ({
                          ...atual,
                          atualizarCadastro: event.target.checked
                        }))
                      }
                    />
                    <span className="text-sm text-[var(--g3-foreground)]">
                      Atualizar automaticamente a localização e a custódia do cadastro com esta movimentação.
                    </span>
                  </label>

                  {movimento.atualizarCadastro ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Nova unidade</Label>
                        <Input
                          list="patrimonio-unidades"
                          value={movimento.novaUnidade}
                          onChange={(event) =>
                            setMovimento((atual) => ({ ...atual, novaUnidade: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Nova sala</Label>
                        <Input
                          list="patrimonio-salas"
                          value={movimento.novaSala}
                          onChange={(event) =>
                            setMovimento((atual) => ({ ...atual, novaSala: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Novo responsável</Label>
                        <Input
                          list="patrimonio-responsaveis"
                          value={movimento.novoResponsavel}
                          onChange={(event) =>
                            setMovimento((atual) => ({ ...atual, novoResponsavel: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3 text-sm text-[var(--g3-foreground)]">
                    {movimento.tipo === "BAIXA"
                      ? "Ao registrar baixa, o sistema também atualiza o status do patrimônio para baixado / inativo."
                      : movimento.tipo === "MANUTENCAO"
                        ? "Ao registrar manutenção, o sistema também atualiza o status do patrimônio para em manutenção."
                        : "Use a sincronização do cadastro quando a movimentação representar troca real de sala, unidade ou responsável."}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Histórico do patrimônio</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                    <tr>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Destino</th>
                      <th className="px-3 py-2 text-left">Responsável</th>
                      <th className="px-3 py-2 text-left">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.movimentos ?? []).length ? (
                      (form.movimentos ?? []).map((item, index) => (
                        <tr
                          key={`${item.idMovimento ?? index}-${item.dataMovimento ?? ""}`}
                          className={`border-t border-[var(--g3-border)] ${
                            index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/20"
                          }`}
                        >
                          <td className="px-3 py-2">{formatarDataInterface(item.dataMovimento)}</td>
                          <td className="px-3 py-2">
                            <Badge variant={item.tipo === "BAIXA" ? "danger" : item.tipo === "MANUTENCAO" ? "warning" : "info"}>
                              {formatarTipoMovimento(item.tipo)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{item.destino ?? "---"}</td>
                          <td className="px-3 py-2">{item.responsavel ?? "---"}</td>
                          <td className="px-3 py-2">{item.observacao ?? "---"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-[var(--g3-muted)]">
                          Nenhuma movimentação registrada para este patrimônio.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {abaAtiva === "listagem" ? (
          <section className="space-y-3">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Filtros de busca</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-1 xl:col-span-2">
                  <Label>Busca</Label>
                  <Input
                    placeholder="Número, nome, categoria, unidade, sala, responsável ou status"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value)}>
                    <option value="todos">Todos</option>
                    {statusOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Categoria</Label>
                  <Select value={filtroCategoria} onChange={(event) => setFiltroCategoria(event.target.value)}>
                    <option value="todas">Todas</option>
                    {categoriasDisponiveis.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Unidade</Label>
                  <Select value={filtroUnidade} onChange={(event) => setFiltroUnidade(event.target.value)}>
                    <option value="todas">Todas</option>
                    {unidadesDisponiveis.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="xl:col-span-5">
                  <label className="flex items-center gap-2 text-sm text-[var(--g3-foreground)]">
                    <Checkbox
                      checked={somentePendencias}
                      onChange={(event) => setSomentePendencias(event.target.checked)}
                    />
                    Mostrar somente patrimônios com pendências de cadastro ou rastreio
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Saneamento em lote assistido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={patrimoniosSelecionados.length ? "info" : "default"}>
                    {patrimoniosSelecionados.length} selecionado(s)
                  </Badge>
                  <Button variant="outline" size="sm" onClick={alternarSelecaoTodosFiltrados}>
                    <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                    {todosFiltradosSelecionados ? "Remover filtro da seleção" : "Selecionar filtro atual"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={selecionarFiltradosComPendencias}>
                    Selecionar pendências
                  </Button>
                  <Button variant="ghost" size="sm" onClick={limparSelecaoLote}>
                    Limpar seleção
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Input
                      list="patrimonio-categorias"
                      value={edicaoLote.categoria}
                      placeholder="Aplicar categoria"
                      onChange={(event) =>
                        setEdicaoLote((atual) => ({ ...atual, categoria: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Unidade</Label>
                    <Input
                      list="patrimonio-unidades"
                      value={edicaoLote.unidade}
                      placeholder="Aplicar unidade"
                      onChange={(event) =>
                        setEdicaoLote((atual) => ({ ...atual, unidade: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Sala</Label>
                    <Input
                      list="patrimonio-salas"
                      value={edicaoLote.sala}
                      placeholder="Aplicar sala"
                      onChange={(event) =>
                        setEdicaoLote((atual) => ({ ...atual, sala: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Responsável</Label>
                    <Input
                      list="patrimonio-responsaveis"
                      value={edicaoLote.responsavel}
                      placeholder="Aplicar responsável"
                      onChange={(event) =>
                        setEdicaoLote((atual) => ({ ...atual, responsavel: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select
                      value={edicaoLote.status}
                      onChange={(event) =>
                        setEdicaoLote((atual) => ({ ...atual, status: event.target.value }))
                      }
                    >
                      <option value="">Não alterar</option>
                      {statusOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Conservação</Label>
                    <Select
                      value={edicaoLote.conservacao}
                      onChange={(event) =>
                        setEdicaoLote((atual) => ({ ...atual, conservacao: event.target.value }))
                      }
                    >
                      <option value="">Não alterar</option>
                      {conservacaoOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <label className="flex items-center gap-2 text-sm text-[var(--g3-foreground)]">
                    <Checkbox
                      checked={somenteCamposVaziosLote}
                      onChange={(event) => setSomenteCamposVaziosLote(event.target.checked)}
                    />
                    Aplicar somente onde o campo estiver vazio
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={limparEdicaoLote}>
                      Limpar campos
                    </Button>
                    <Button size="sm" disabled={atualizarLoteMutation.isPending} onClick={() => void aplicarEdicaoLote()}>
                      {atualizarLoteMutation.isPending ? "Aplicando..." : "Aplicar saneamento"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3 text-sm text-[var(--g3-foreground)]">
                  Preencha apenas os dados que deseja propagar. O modo seguro mantém os valores já existentes e só
                  completa lacunas no acervo selecionado.
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-3">
              <Card className="border-[var(--g3-border)]">
                <CardContent className="p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Registros filtrados
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--g3-active)]">
                    {patrimoniosFiltrados.length}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardContent className="p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Valor de aquisição
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[var(--g3-active)]">
                    {formatarMoeda(
                      patrimoniosFiltrados.reduce((acc, item) => acc + Number(item.item.valorAquisicao ?? 0), 0)
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardContent className="p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Com pendências
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--g3-danger)]">
                    {patrimoniosFiltrados.filter((item) => item.pendencias.length).length}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Listagem patrimonial</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        <Checkbox checked={todosFiltradosSelecionados} onChange={alternarSelecaoTodosFiltrados} />
                      </th>
                      <th className="px-3 py-2 text-left">Número</th>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Categoria</th>
                      <th className="px-3 py-2 text-left">Localização</th>
                      <th className="px-3 py-2 text-left">Responsável</th>
                      <th className="px-3 py-2 text-left">Situação</th>
                      <th className="px-3 py-2 text-left">Pendências</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-4 text-center text-[var(--g3-muted)]">
                          Carregando patrimônios...
                        </td>
                      </tr>
                    ) : patrimoniosFiltrados.length ? (
                      patrimoniosFiltrados.map(({ item, pendencias }, index) => {
                        const badgeStatus = obterBadgeStatus(item.status);
                        const id = item.idPatrimonio ? String(item.idPatrimonio) : "";
                        const selecionado = id ? selecionadosIds.includes(id) : false;
                        return (
                          <tr
                            key={item.idPatrimonio ?? `${item.numeroPatrimonio}-${index}`}
                            className={`border-t border-[var(--g3-border)] ${
                              index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/20"
                            }`}
                          >
                            <td className="px-3 py-2">
                              <Checkbox checked={selecionado} onChange={() => alternarSelecaoPatrimonio(id)} />
                            </td>
                            <td className="px-3 py-2">{item.numeroPatrimonio}</td>
                            <td className="px-3 py-2 font-medium text-[var(--g3-foreground)]">{item.nome}</td>
                            <td className="px-3 py-2">{item.categoria ?? "---"}</td>
                            <td className="px-3 py-2">{gerarResumoLocalizacao(item.unidade, item.sala)}</td>
                            <td className="px-3 py-2">{item.responsavel ?? "---"}</td>
                            <td className="px-3 py-2">
                              <Badge variant={badgeStatus.variant}>{badgeStatus.label}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              {pendencias.length ? (
                                <Badge variant="warning">{pendencias.length} ajuste(s)</Badge>
                              ) : (
                                <Badge variant="success">OK</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => selecionar(item)}>
                                  Selecionar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    selecionar(item);
                                    prepararMovimentoRapido("MOVIMENTACAO");
                                  }}
                                >
                                  Movimentar
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-3 py-4 text-center text-[var(--g3-muted)]">
                          Nenhum patrimônio encontrado com os filtros informados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>
        ) : null}

        <datalist id="patrimonio-categorias">
          {categoriasDisponiveis.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="patrimonio-origens">
          {origemOptions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="patrimonio-unidades">
          {unidadesDisponiveis.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="patrimonio-salas">
          {salasDisponiveis.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="patrimonio-responsaveis">
          {responsaveisDisponiveis.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </AdminPageLayout>

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
    </>
  );
}
