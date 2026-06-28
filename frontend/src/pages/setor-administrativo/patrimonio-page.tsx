import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import JsBarcode from "jsbarcode";
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
  ChevronDown,
  ChevronUp,
  ListChecks,
  ListRestart,
  MapPin,
  Package,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  Wand2,
  Wallet,
  Wrench,
  X
} from "lucide-react";
import QRCode from "qrcode";
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
  usePatrimonioCategorias,
  useRemoverPatrimonioCategoria,
  useRegistrarMovimentoPatrimonio,
  useSalvarPatrimonioCategoria,
  useSalvarPatrimonio
} from "@/features/patrimonios/use-patrimonios";
import {
  useUnidadeAssistencialAtual,
  useUnidadesAssistenciais
} from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import { obterUrlArquivoAutenticado, resolverUrlArquivo } from "@/lib/arquivos";
import { formatarCnpj, formatarTelefone } from "@/lib/br-utils";
import { imprimirConteudoAtual, imprimirHtmlSemJanela } from "@/lib/report-utils";
import type { Patrimonio, PatrimonioCategoria, PatrimonioMovimento } from "@/types/patrimonio";

type AbaId =
  | "dashboard"
  | "cadastro"
  | "localizacao"
  | "visual"
  | "movimentacao"
  | "categorias"
  | "listagem";
type CampoFormulario = "numeroPatrimonio" | "nome" | "categoria" | "unidade" | "valorAquisicao" | "taxaDepreciacao";
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

type PopupImpressaoState = {
  aberto: boolean;
  localSelecionado: string;
};

const abas: AdminTab[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "cadastro", label: "Cadastro patrimonial", icon: Pencil },
  { id: "localizacao", label: "Localização e custódia", icon: MapPin },
  { id: "visual", label: "Identificação visual", icon: Camera },
  { id: "movimentacao", label: "Movimentação", icon: Archive },
  { id: "categorias", label: "Categorias", icon: ClipboardList },
  { id: "listagem", label: "Listagem e busca", icon: ListChecks }
];

const tituloTela = "Patrimônio";
const categoriasPatrimonio = [
  { nome: "Equipamentos de informática", taxaDepreciacao: 10 },
  { nome: "Mobiliário", taxaDepreciacao: 10 },
  { nome: "Eletrodomésticos", taxaDepreciacao: 10 },
  { nome: "Telefonia", taxaDepreciacao: 20 },
  { nome: "Veículos", taxaDepreciacao: 20 },
  { nome: "Instrumentos", taxaDepreciacao: 10 },
  { nome: "Máquinas", taxaDepreciacao: 10 },
  { nome: "Material permanente", taxaDepreciacao: 10 },
  { nome: "Imóveis e construções", taxaDepreciacao: 4 },
  { nome: "Outros", taxaDepreciacao: 10 }
];
const categoriasPadrao = categoriasPatrimonio.map((item) => item.nome);
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
  unidadeId: "",
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

const defaultCategoriaForm: PatrimonioCategoria = {
  nome: "",
  taxaDepreciacao: 10,
  subcategorias: [],
  ativo: true
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

function normalizarValorMonetario(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return 0;
  return Number(digitos) / 100;
}

function formatarValorMonetarioInput(valor?: number | null) {
  return formatarMoeda(Number(valor ?? 0));
}

function extrairNumeroSequencial(valor?: string | null) {
  const match = String(valor ?? "").match(/\d+/g);
  if (!match?.length) return null;
  return Number(match[match.length - 1]);
}

function formatarNumeroSequencial(numero: number, tamanho = 3) {
  return String(numero).padStart(tamanho, "0");
}

function normalizarNomeCatalogo(valor?: string | null) {
  return String(valor ?? "").trim().replace(/\s+/g, " ");
}

function normalizarBusca(valor?: string | null) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolverUnidadeAssistencial(
  unidades: Array<{
    id_unidade?: string | null;
    nome_fantasia?: string | null;
    razao_social?: string | null;
    salas?: Array<{
      nome?: string | null;
      ativo?: boolean | null;
    }>;
  }>,
  valor?: string | null
) {
  const chave = normalizarBusca(valor);
  if (!chave) return null;

  return (
    unidades.find((unidade) => unidade.id_unidade === valor) ??
    unidades.find((unidade) => normalizarBusca(unidade.nome_fantasia) === chave) ??
    unidades.find((unidade) => normalizarBusca(unidade.razao_social) === chave) ??
    null
  );
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
  const meses =
    (hoje.getFullYear() - dataAquisicao.getFullYear()) * 12 +
    (hoje.getMonth() - dataAquisicao.getMonth()) -
    (hoje.getDate() < dataAquisicao.getDate() ? 1 : 0);
  const mesesDepreciados = Math.max(0, meses);
  const depreciacao = valor * (taxa / 100) * (mesesDepreciados / 12);
  return Math.max(0, valor - depreciacao);
}

function listarPendencias(item: Partial<Patrimonio>) {
  const pendencias: string[] = [];

  if (!item.numeroPatrimonio?.trim()) pendencias.push("Definir número patrimonial");
  if (!item.nome?.trim()) pendencias.push("Informar nome do bem");
  if (!item.categoria?.trim()) pendencias.push("Classificar a categoria");
  if (!item.responsavel?.trim()) pendencias.push("Definir responsável");
  if (!item.unidade?.trim()) pendencias.push("Definir unidade");
  if (!item.sala?.trim()) pendencias.push("Definir sala");
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

function normalizarCodigoEtiqueta(numeroPatrimonio?: string) {
  return (numeroPatrimonio ?? "").trim().replace(/\s+/g, " ");
}

function escaparHtmlRelatorio(valor?: string | number | null) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function montarRodapeInstitucional(unidade?: {
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}) {
  const linha1 = unidade?.razao_social?.trim() || unidade?.nome_fantasia?.trim() || "Instituição não cadastrada";
  const detalhes = [formatarCnpj(unidade?.cnpj), formatarTelefone(unidade?.telefone), unidade?.email?.trim()]
    .filter(Boolean)
    .join(" • ");
  const endereco = [
    unidade?.logradouro?.trim(),
    unidade?.numero?.trim(),
    unidade?.complemento?.trim(),
    unidade?.bairro?.trim(),
    unidade?.cidade?.trim(),
    unidade?.estado?.trim()
  ]
    .filter(Boolean)
    .join(" • ");

  return { linha1, linha2: detalhes, linha3: endereco };
}

function montarConteudoQr(item: Partial<Patrimonio>, codigoEtiqueta: string) {
  return [
    `Patrimônio: ${codigoEtiqueta || "Não informado"}`,
    item.nome?.trim() ? `Bem: ${item.nome.trim()}` : "",
    gerarResumoLocalizacao(item.unidade, item.sala),
    item.responsavel?.trim() ? `Responsável: ${item.responsavel.trim()}` : "",
    item.categoria?.trim() ? `Categoria: ${item.categoria.trim()}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

type VisualCodeProps = {
  value: string;
  compact?: boolean;
  size?: number;
  showValue?: boolean;
  barcodeHeight?: number;
  barWidth?: number;
};

type FormatoEtiquetaId = "50x30" | "60x40" | "80x50";

type FormatoEtiqueta = {
  id: FormatoEtiquetaId;
  label: string;
  widthMm: number;
  heightMm: number;
  qrSize: number;
  qrContainerPx: number;
  barcodeHeight: number;
  barWidth: number;
  numeroFontPx: number;
  nomeFontPx: number;
  detalheFontPx: number;
  rodapeFontPx: number;
};

const formatosEtiqueta: FormatoEtiqueta[] = [
  {
    id: "50x30",
    label: "50 x 30 mm",
    widthMm: 50,
    heightMm: 30,
    qrSize: 56,
    qrContainerPx: 64,
    barcodeHeight: 18,
    barWidth: 0.72,
    numeroFontPx: 13,
    nomeFontPx: 7.5,
    detalheFontPx: 6.5,
    rodapeFontPx: 6
  },
  {
    id: "60x40",
    label: "60 x 40 mm",
    widthMm: 60,
    heightMm: 40,
    qrSize: 70,
    qrContainerPx: 78,
    barcodeHeight: 24,
    barWidth: 0.88,
    numeroFontPx: 17,
    nomeFontPx: 9.5,
    detalheFontPx: 7.5,
    rodapeFontPx: 6.8
  },
  {
    id: "80x50",
    label: "80 x 50 mm",
    widthMm: 80,
    heightMm: 50,
    qrSize: 88,
    qrContainerPx: 96,
    barcodeHeight: 30,
    barWidth: 1.1,
    numeroFontPx: 20,
    nomeFontPx: 11,
    detalheFontPx: 9,
    rodapeFontPx: 8
  }
];

function BarcodePreview({
  value,
  compact = false,
  showValue = !compact,
  barcodeHeight,
  barWidth
}: VisualCodeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    if (!value.trim()) {
      svg.innerHTML = "";
      return;
    }

    try {
      JsBarcode(svg, value, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        width: barWidth ?? (compact ? 1.1 : 1.65),
        height: barcodeHeight ?? (compact ? 30 : 46),
        background: "transparent",
        lineColor: "#0f172a"
      });
    } catch {
      svg.innerHTML = "";
    }
  }, [value]);

  if (!value.trim()) {
    return (
      <div
        className={`border border-dashed border-[var(--g3-border)] bg-white/70 text-center text-[var(--g3-muted)] ${
          compact ? "rounded-lg px-2 py-3 text-[10px]" : "rounded-xl px-3 py-5 text-xs"
        }`}
      >
        Informe o número patrimonial para gerar o código de barras.
      </div>
    );
  }

  return (
    <div
      className={`border border-white/70 bg-white/85 ${
        compact ? "rounded-lg px-2 py-2" : "rounded-xl px-3 py-3"
      }`}
    >
      <div className="overflow-hidden rounded-lg">
        <svg
          ref={svgRef}
          className={compact ? "h-10 w-full" : "h-16 w-full"}
          role="img"
          aria-label={`Código de barras ${value}`}
        />
      </div>
      {showValue ? (
        <p className="mt-2 text-center text-xs font-semibold tracking-[0.24em] text-[var(--g3-foreground)]">
          {value}
        </p>
      ) : null}
    </div>
  );
}

function QrCodePreview({ value, compact = false, size }: VisualCodeProps) {
  const [svgMarkup, setSvgMarkup] = useState("");
  const qrSize = size ?? (compact ? 88 : 156);

  useEffect(() => {
    let ativo = true;

    if (!value.trim()) {
      setSvgMarkup("");
      return () => {
        ativo = false;
      };
    }

    void QRCode.toString(value, {
      type: "svg",
      margin: 1,
      width: qrSize,
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    })
      .then((svg) => {
        if (ativo) {
          setSvgMarkup(svg);
        }
      })
      .catch(() => {
        if (ativo) {
          setSvgMarkup("");
        }
      });

    return () => {
      ativo = false;
    };
  }, [value, qrSize]);

  if (!value.trim()) {
    return (
      <div
        className={`border border-dashed border-[var(--g3-border)] bg-white/70 text-center text-[var(--g3-muted)] ${
          compact ? "rounded-lg px-2 py-3 text-[10px]" : "rounded-xl px-3 py-5 text-xs"
        }`}
      >
        Informe o número patrimonial para gerar o QR code.
      </div>
    );
  }

  return (
    <div className={`border border-white/70 bg-white/85 ${compact ? "rounded-lg p-2" : "rounded-xl p-3"}`}>
      <div
        className="mx-auto flex items-center justify-center overflow-hidden [&>svg]:h-full [&>svg]:w-full"
        style={{ width: `${qrSize}px`, height: `${qrSize}px` }}
        dangerouslySetInnerHTML={{
          __html:
            svgMarkup ||
            '<div style="font-size:12px;color:#64748b;text-align:center;">Gerando QR code...</div>'
        }}
      />
    </div>
  );
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
  const [mostrarSaneamentoLote, setMostrarSaneamentoLote] = useState(true);
  const [formatoEtiquetaId, setFormatoEtiquetaId] = useState<FormatoEtiquetaId>("80x50");
  const [mostrarNumerosVagos, setMostrarNumerosVagos] = useState(false);
  const [form, setForm] = useState<Patrimonio>(defaultForm);
  const [unidadeLocalizacaoSelecionadaId, setUnidadeLocalizacaoSelecionadaId] = useState("");
  const [categoriaForm, setCategoriaForm] = useState<PatrimonioCategoria>(defaultCategoriaForm);
  const [subcategoriaDraft, setSubcategoriaDraft] = useState("");
  const [snapshot, setSnapshot] = useState<Patrimonio>(defaultForm);
  const [movimento, setMovimento] = useState<MovimentoAssistido>(criarMovimentoPadrao());
  const [erros, setErros] = useState<Partial<Record<CampoFormulario, string>>>({});
  const [errosMovimento, setErrosMovimento] = useState<Partial<Record<CampoMovimento, string>>>({});
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [popupImpressao, setPopupImpressao] = useState<PopupImpressaoState>({
    aberto: false,
    localSelecionado: ""
  });

  const { data, isLoading } = usePatrimonios();
  const categoriasQuery = usePatrimonioCategorias();
  const unidadeAtualQuery = useUnidadeAssistencialAtual();
  const unidadesAssistenciaisQuery = useUnidadesAssistenciais({});
  const salvarMutation = useSalvarPatrimonio();
  const salvarCategoriaMutation = useSalvarPatrimonioCategoria();
  const removerCategoriaMutation = useRemoverPatrimonioCategoria();
  const atualizarLoteMutation = useAtualizarPatrimoniosEmLote();
  const movimentoMutation = useRegistrarMovimentoPatrimonio();

  const patrimonios = data?.patrimonios ?? [];
  const categoriasCatalogo = categoriasQuery.data?.categorias ?? [];
  const unidadesAssistenciais = unidadesAssistenciaisQuery.data?.unidades ?? [];
  const unidadeAtual = unidadeAtualQuery.data?.unidade;
  const unidadePadraoPatrimonio =
    unidadesAssistenciais.find((unidade) => unidade.unidade_principal) ??
    unidadeAtual ??
    unidadesAssistenciais[0] ??
    null;
  const nomeUnidadePrincipalPatrimonio = unidadePadraoPatrimonio?.nome_fantasia?.trim() || "";
  const idUnidadePrincipalPatrimonio = unidadePadraoPatrimonio?.id_unidade ?? "";
  const nomeInstituicao =
    unidadeAtual?.razao_social?.trim() ||
    unidadeAtual?.nome_fantasia?.trim() ||
    "Instituição não cadastrada";
  const caminhoLogomarcaRelatorio = unidadeAtual?.logomarca_relatorio || unidadeAtual?.logomarca || "";
  const rodapeInstitucional = montarRodapeInstitucional(unidadeAtual ?? undefined);
  const carregandoAcoes =
    salvarMutation.isPending ||
    movimentoMutation.isPending ||
    atualizarLoteMutation.isPending ||
    salvarCategoriaMutation.isPending ||
    removerCategoriaMutation.isPending;
  const possuiRegistroSelecionado = Boolean(form.idPatrimonio);

  const categoriasDisponiveis = useMemo(
    () =>
      categoriasCatalogo
        .filter((item) => item.ativo ?? true)
        .map((item) => item.nome)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [categoriasCatalogo]
  );
  const categoriaSelecionada = useMemo(
    () => categoriasCatalogo.find((item) => normalizarBusca(item.nome) === normalizarBusca(form.categoria)),
    [categoriasCatalogo, form.categoria]
  );
  const subcategoriasDisponiveis = useMemo(
    () => (categoriaSelecionada?.subcategorias ?? []).slice().sort((a, b) => a.localeCompare(b, "pt-BR")),
    [categoriaSelecionada]
  );
  const numerosPatrimonio = useMemo(
    () =>
      patrimonios
        .map((item) => extrairNumeroSequencial(item.numeroPatrimonio))
        .filter((numero): numero is number => typeof numero === "number" && Number.isInteger(numero) && numero > 0)
        .sort((a, b) => a - b),
    [patrimonios]
  );
  const patrimoniosDaUnidadeSelecionada = useMemo(() => {
    const unidadeSelecionada = normalizarBusca(form.unidade);
    if (!unidadeSelecionada) return patrimonios;
    return patrimonios.filter((item) => normalizarBusca(item.unidade) === unidadeSelecionada);
  }, [form.unidade, patrimonios]);
  const numerosPatrimonioDaUnidade = useMemo(
    () =>
      patrimoniosDaUnidadeSelecionada
        .map((item) => extrairNumeroSequencial(item.numeroPatrimonio))
        .filter((numero): numero is number => typeof numero === "number" && Number.isInteger(numero) && numero > 0)
        .sort((a, b) => a - b),
    [patrimoniosDaUnidadeSelecionada]
  );
  const ultimoNumeroPatrimonial = numerosPatrimonioDaUnidade[numerosPatrimonioDaUnidade.length - 1] ?? 0;
  const proximoNumeroPatrimonial = formatarNumeroSequencial(ultimoNumeroPatrimonial + 1);
  const numerosPatrimoniaisVagos = useMemo(() => {
    if (!numerosPatrimonioDaUnidade.length) return [];
    const existentes = new Set(numerosPatrimonioDaUnidade);
    const vagas: string[] = [];
    const ultimo = numerosPatrimonioDaUnidade[numerosPatrimonioDaUnidade.length - 1] ?? 0;
    for (let numero = 1; numero < ultimo; numero += 1) {
      if (!existentes.has(numero)) vagas.push(formatarNumeroSequencial(numero));
      if (vagas.length >= 80) break;
    }
    return vagas;
  }, [numerosPatrimonioDaUnidade]);

  const unidadesDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(unidadesAssistenciais.map((item) => item.nome_fantasia?.trim() || "").filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [unidadesAssistenciais]
  );

  const unidadeLocalizacaoSelecionada = useMemo(
    () =>
      resolverUnidadeAssistencial(unidadesAssistenciais, unidadeLocalizacaoSelecionadaId) ??
      resolverUnidadeAssistencial(unidadesAssistenciais, form.unidadeId) ??
      resolverUnidadeAssistencial(unidadesAssistenciais, form.unidade),
    [form.unidade, form.unidadeId, unidadeLocalizacaoSelecionadaId, unidadesAssistenciais]
  );

  useEffect(() => {
    if (!form.unidadeId?.trim() && !form.unidade?.trim()) {
      setUnidadeLocalizacaoSelecionadaId("");
      return;
    }

    const unidadeEncontrada =
      resolverUnidadeAssistencial(unidadesAssistenciais, form.unidadeId) ??
      resolverUnidadeAssistencial(unidadesAssistenciais, form.unidade);
    setUnidadeLocalizacaoSelecionadaId(unidadeEncontrada?.id_unidade ?? unidadeEncontrada?.nome_fantasia ?? "");
  }, [form.unidade, form.unidadeId, unidadesAssistenciais]);

  const salasDisponiveis = useMemo(() => {
    const salaSource = unidadeLocalizacaoSelecionada?.salas ?? [];
    const salasDasUnidades = salaSource
      .map((sala) => sala.nome?.trim() || "")
      .filter(Boolean);

    return Array.from(new Set(salasDasUnidades)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [unidadeLocalizacaoSelecionada]);

  const locaisPatrimonioDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(
          unidadesAssistenciais
            .flatMap((unidade) => {
              const nomeUnidade = unidade.nome_fantasia?.trim() || "";
              const salasAtivas = (unidade.salas ?? []).filter((sala) => sala.ativo ?? true);
              if (!nomeUnidade) return [];
              if (!salasAtivas.length) return [gerarResumoLocalizacao(nomeUnidade, "")];
              return salasAtivas.map((sala) => gerarResumoLocalizacao(nomeUnidade, sala.nome));
            })
            .filter((item) => item && item !== "---")
        )
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [unidadesAssistenciais]
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

  const patrimoniosSemVinculo = useMemo(
    () => patrimoniosAnaliticos.filter(({ item }) => !item.unidadeId?.trim()),
    [patrimoniosAnaliticos]
  );

  const patrimoniosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    const termoBruto = busca.trim();
    const termoNumerico = /^\d+$/.test(termoBruto);

    return patrimoniosAnaliticos
      .filter(({ item, pendencias }) => {
      if (termoNumerico) {
        const numeroNormalizado = String(item.numeroPatrimonio ?? "").replace(/\D/g, "");
        if (numeroNormalizado !== termoBruto.replace(/\D/g, "")) return false;
      }

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

      if (termo && !termoNumerico && !alvo.includes(termo)) return false;
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
    })
      .sort((a, b) => {
        if (!termoNumerico) return 0;
        const unidadeA = String(a.item.unidade ?? "");
        const unidadeB = String(b.item.unidade ?? "");
        const porUnidade = unidadeA.localeCompare(unidadeB, "pt-BR");
        if (porUnidade !== 0) return porUnidade;
        return String(a.item.nome ?? "").localeCompare(String(b.item.nome ?? ""), "pt-BR");
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
  const codigoEtiqueta = useMemo(() => normalizarCodigoEtiqueta(form.numeroPatrimonio), [form.numeroPatrimonio]);
  const conteudoQrEtiqueta = useMemo(() => montarConteudoQr(form, codigoEtiqueta), [form, codigoEtiqueta]);
  const formatoEtiquetaSelecionado = useMemo(
    () => formatosEtiqueta.find((item) => item.id === formatoEtiquetaId) ?? formatosEtiqueta[2],
    [formatoEtiquetaId]
  );

  function validarCampoFormulario(campo: CampoFormulario, valor = form[campo]) {
    if (campo === "numeroPatrimonio") {
      return String(valor ?? "").trim() ? "" : "Informe o número patrimonial.";
    }
    if (campo === "nome") {
      return String(valor ?? "").trim().length >= 2 ? "" : "Informe o nome do bem.";
    }
    if (campo === "categoria") {
      const categoria = String(valor ?? "").trim();
      if (!categoria) return "Selecione a categoria do bem.";
      return categoriasCatalogo.some(
        (item) => (item.ativo ?? true) && normalizarBusca(item.nome) === normalizarBusca(categoria)
      )
        ? ""
        : "Categoria não cadastrada. Selecione uma categoria existente para evitar duplicidade.";
    }
    if (campo === "unidade") {
      return String(valor ?? "").trim() ? "" : "Selecione a unidade do patrimônio.";
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
    (["numeroPatrimonio", "nome", "categoria", "unidade", "valorAquisicao", "taxaDepreciacao"] as CampoFormulario[]).forEach(
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
    const proximo = {
      ...defaultForm,
      numeroPatrimonio: proximoNumeroPatrimonial,
      unidadeId: idUnidadePrincipalPatrimonio,
      unidade: nomeUnidadePrincipalPatrimonio
    };
    setForm(proximo);
    setSnapshot(proximo);
    setMovimento(criarMovimentoPadrao(proximo));
    setUnidadeLocalizacaoSelecionadaId(idUnidadePrincipalPatrimonio);
    setMostrarNumerosVagos(false);
    setSelecionadosIds([]);
    setErros({});
    setErrosMovimento({});
    setAbaAtiva("cadastro");
  }

  function selecionar(item: Patrimonio) {
    const unidadeSelecionada =
      unidadesAssistenciais.find((unidade) => unidade.id_unidade === item.unidadeId) ??
      unidadesAssistenciais.find(
        (unidade) => normalizarBusca(unidade.nome_fantasia) === normalizarBusca(item.unidade)
      ) ??
      null;
    const proximo = {
      ...defaultForm,
      ...item,
      unidadeId: item.unidadeId ?? unidadeSelecionada?.id_unidade ?? "",
      unidade: unidadeSelecionada?.nome_fantasia ?? item.unidade ?? "",
      movimentos: item.movimentos ?? []
    };
    setForm(proximo);
    setSnapshot(proximo);
    setMovimento(criarMovimentoPadrao(proximo));
    setUnidadeLocalizacaoSelecionadaId(unidadeSelecionada?.id_unidade ?? "");
    setMostrarNumerosVagos(false);
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
    setUnidadeLocalizacaoSelecionadaId(
      unidadesAssistenciais.find((unidade) => unidade.id_unidade === snapshot.unidadeId)?.id_unidade ??
        unidadesAssistenciais.find(
          (unidade) => normalizarBusca(unidade.nome_fantasia) === normalizarBusca(snapshot.unidade)
        )?.id_unidade ??
        ""
    );
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
        unidadeId: form.unidadeId?.trim() || undefined,
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

  function novaCategoria() {
    setCategoriaForm(defaultCategoriaForm);
    setSubcategoriaDraft("");
    setAbaAtiva("categorias");
  }

  function editarCategoria(categoria: PatrimonioCategoria) {
    setCategoriaForm({
      id: categoria.id,
      nome: categoria.nome,
      taxaDepreciacao: categoria.taxaDepreciacao ?? 0,
      subcategorias: categoria.subcategorias ?? [],
      ativo: categoria.ativo ?? true
    });
    setSubcategoriaDraft("");
  }

  function incluirSubcategoria() {
    const nome = normalizarNomeCatalogo(subcategoriaDraft);
    if (!nome) {
      setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Informe a subcategoria antes de incluir." });
      return;
    }

    const existentes = categoriaForm.subcategorias ?? [];
    if (existentes.some((item) => normalizarBusca(item) === normalizarBusca(nome))) {
      setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Esta subcategoria já está cadastrada." });
      return;
    }

    setCategoriaForm((atual) => ({
      ...atual,
      subcategorias: [...(atual.subcategorias ?? []), nome]
    }));
    setSubcategoriaDraft("");
  }

  function removerSubcategoria(nome: string) {
    setCategoriaForm((atual) => ({
      ...atual,
      subcategorias: (atual.subcategorias ?? []).filter((item) => item !== nome)
    }));
  }

  async function salvarCategoria() {
    const nome = normalizarNomeCatalogo(categoriaForm.nome);
    if (!nome) {
      setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Informe o nome da categoria." });
      return;
    }

    const duplicada = categoriasCatalogo.some(
      (item) => item.id !== categoriaForm.id && normalizarBusca(item.nome) === normalizarBusca(nome)
    );
    if (duplicada) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Categoria já existe",
        texto: "Edite a categoria existente para evitar duplicidade de nomes."
      });
      return;
    }

    try {
      await salvarCategoriaMutation.mutateAsync({
        ...categoriaForm,
        nome,
        taxaDepreciacao: Number(categoriaForm.taxaDepreciacao ?? 0),
        subcategorias: categoriaForm.subcategorias ?? [],
        ativo: categoriaForm.ativo ?? true
      });
      setCategoriaForm(defaultCategoriaForm);
      setSubcategoriaDraft("");
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Categoria salva com sucesso." });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar a categoria."
      });
    }
  }

  async function removerCategoria(categoria: PatrimonioCategoria) {
    if (!categoria.id) return;
    try {
      await removerCategoriaMutation.mutateAsync(categoria.id);
      if (categoriaForm.id === categoria.id) {
        setCategoriaForm(defaultCategoriaForm);
      }
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Categoria excluída com sucesso." });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir a categoria."
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
            unidadeId: movimento.atualizarCadastro
              ? unidadesAssistenciais.find(
                  (unidade) =>
                    unidade.id_unidade === unidadeLocalizacaoSelecionadaId ||
                    normalizarBusca(unidade.nome_fantasia) === normalizarBusca(movimento.novaUnidade)
                )?.id_unidade ?? patrimonioAtualizado.unidadeId
              : patrimonioAtualizado.unidadeId,
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

  function abrirPopupImpressao() {
    setPopupImpressao((atual) => ({
      aberto: true,
      localSelecionado:
        atual.localSelecionado && locaisPatrimonioDisponiveis.includes(atual.localSelecionado)
          ? atual.localSelecionado
          : locaisPatrimonioDisponiveis[0] ?? ""
    }));
  }

  function fecharPopupImpressao() {
    setPopupImpressao((atual) => ({ ...atual, aberto: false }));
  }

  function montarHtmlRelatorioPatrimonio(
    titulo: string,
    subtitulo: string,
    itens: Patrimonio[],
    localSelecionado?: string,
    opcoes: {
      mostrarValores?: boolean;
      tituloComplemento?: string;
      formatoMuralLocal?: boolean;
      logomarcaUrl?: string;
    } = {}
  ) {
    const mostrarValores = opcoes.mostrarValores ?? false;
    const formatoMuralLocal = opcoes.formatoMuralLocal ?? false;
    const logomarcaUrl = opcoes.logomarcaUrl?.trim() || "";
    const totalIncorporado = itens.reduce((acc, item) => acc + Number(item.valorAquisicao ?? 0), 0);
    const totalGeral = itens.reduce((acc, item) => acc + calcularValorContabilEstimado(item), 0);
    const totalDepreciado = Math.max(0, totalIncorporado - totalGeral);
    const linhas = itens
      .map(
        (item) => `
          <tr>
            <td>${escaparHtmlRelatorio(item.numeroPatrimonio || "---")}</td>
            <td>${escaparHtmlRelatorio(item.nome || "---")}</td>
            <td>${escaparHtmlRelatorio(item.categoria || "---")}</td>
            ${mostrarValores ? `<td class="valor">${escaparHtmlRelatorio(formatarMoeda(item.valorAquisicao))}</td>` : ""}
          </tr>
        `
      )
      .join("");
    const emitidoEm = formatarDataInterface(new Date().toISOString().slice(0, 10));
    const colunasBase = 3;
    const colspanVazio = colunasBase + (mostrarValores ? 1 : 0);
    const tituloComplemento = opcoes.tituloComplemento?.trim();
    const linhasTotais = mostrarValores
      ? `
          <tr class="totalizador totalizador-inicio">
            <td colspan="${colspanVazio - 1}">Total incorporado</td>
            <td class="valor">${escaparHtmlRelatorio(formatarMoeda(totalIncorporado))}</td>
          </tr>
          <tr class="totalizador">
            <td colspan="${colspanVazio - 1}">Total depreciado</td>
            <td class="valor">${escaparHtmlRelatorio(formatarMoeda(totalDepreciado))}</td>
          </tr>
          <tr class="totalizador totalizador-geral">
            <td colspan="${colspanVazio - 1}">Total geral</td>
            <td class="valor">${escaparHtmlRelatorio(formatarMoeda(totalGeral))}</td>
          </tr>
        `
      : "";

    return `
      <section class="folha">
        <header class="topo ${formatoMuralLocal ? "topo-mural" : ""}">
          <div class="g3-topo-faixa">
            <span class="g3-topo-marca">G3N</span>
            <span class="g3-topo-selo">Patrimônio</span>
          </div>
          <div class="g3-topo-corpo">
            ${logomarcaUrl ? `<img src="${escaparHtmlRelatorio(logomarcaUrl)}" alt="Logomarca da instituição" class="g3-topo-logo" />` : ""}
            <div class="g3-topo-texto">
              <h1>${escaparHtmlRelatorio(nomeInstituicao)}</h1>
              <h2>${escaparHtmlRelatorio(titulo)}</h2>
              ${tituloComplemento ? `<div class="titulo-complemento">${escaparHtmlRelatorio(tituloComplemento)}</div>` : ""}
              <p class="subtitulo">${escaparHtmlRelatorio(subtitulo)}</p>
            </div>
          </div>
          ${
            formatoMuralLocal
              ? `<div class="localizacao-destaque">
                  <span>Localização</span>
                  <strong>${escaparHtmlRelatorio(localSelecionado?.trim() || "Local não informado")}</strong>
                </div>`
              : ""
          }
          <div class="meta-resumo">
            <span><strong>Setor:</strong> Patrimônio</span>
            <span><strong>Tipo de impressão:</strong> ${escaparHtmlRelatorio(titulo)}</span>
            <span><strong>Local selecionado:</strong> ${escaparHtmlRelatorio(localSelecionado?.trim() || "Todos os locais")}</span>
            <span><strong>Total de itens:</strong> ${escaparHtmlRelatorio(itens.length)}</span>
            <span><strong>Emitido em:</strong> ${escaparHtmlRelatorio(emitidoEm)}</span>
          </div>
        </header>
        <div class="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Número do patrimônio</th>
                <th>Nome do bem</th>
                <th>Categoria</th>
                ${mostrarValores ? "<th class=\"valor\">Valor</th>" : ""}
              </tr>
            </thead>
            <tbody>
              ${
                linhas ||
                `<tr><td colspan="${colspanVazio}" class="g3-relatorio__vazio">Nenhum item encontrado para este relatório.</td></tr>`
              }
              ${linhas ? linhasTotais : ""}
            </tbody>
          </table>
        </div>
        <footer class="rodape">
          <div>${escaparHtmlRelatorio(rodapeInstitucional.linha1)}</div>
          ${rodapeInstitucional.linha2 ? `<div>${escaparHtmlRelatorio(rodapeInstitucional.linha2)}</div>` : ""}
          ${rodapeInstitucional.linha3 ? `<div>${escaparHtmlRelatorio(rodapeInstitucional.linha3)}</div>` : ""}
          <div>Emitido em ${escaparHtmlRelatorio(emitidoEm)}</div>
        </footer>
      </section>
    `;
  }

  async function obterLogomarcaRelatorioParaImpressao() {
    if (!caminhoLogomarcaRelatorio?.trim()) return "";

    try {
      const arquivo = await obterUrlArquivoAutenticado(caminhoLogomarcaRelatorio, {
        cache: true,
        auditar: false
      });
      return arquivo.url || resolverUrlArquivo(caminhoLogomarcaRelatorio);
    } catch {
      return resolverUrlArquivo(caminhoLogomarcaRelatorio);
    }
  }

  async function imprimirRelatorioPatrimonio(
    titulo: string,
    subtitulo: string,
    itens: Patrimonio[],
    localSelecionado?: string,
    opcoes: { mostrarValores?: boolean; tituloComplemento?: string; formatoMuralLocal?: boolean } = {}
  ) {
    try {
      const logomarcaUrl = await obterLogomarcaRelatorioParaImpressao();
      imprimirHtmlSemJanela({
        titulo,
        html: montarHtmlRelatorioPatrimonio(titulo, subtitulo, itens, localSelecionado, {
          ...opcoes,
          logomarcaUrl
        }),
        tamanhoPagina: "A4 portrait",
        margemPagina: "10mm",
        paddingRaiz: "18px",
        estilosExtras: `
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            font-family: Arial, sans-serif;
            margin: 0;
            color: #0f172a;
            background: #fff;
          }

          .folha {
            padding: 18px;
          }

          .topo {
            border: 1px solid #bbf7d0;
            border-radius: 18px;
            background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
            margin-bottom: 16px;
            overflow: hidden;
          }

          .topo-mural {
            border-color: #86efac;
          }

          .g3-topo-faixa {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 18px;
            background: #0f8a57;
            color: #ffffff;
          }

          .g3-topo-marca {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
          }

          .g3-topo-selo {
            border: 1px solid rgba(255,255,255,0.35);
            border-radius: 999px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 600;
            background: rgba(255,255,255,0.12);
          }

          .g3-topo-corpo {
            display: grid;
            grid-template-columns: auto 1fr;
            align-items: center;
            gap: 16px;
            padding: 18px;
          }

          .g3-topo-logo {
            width: 88px;
            height: 88px;
            object-fit: contain;
            border-radius: 16px;
            background: #ffffff;
            border: 1px solid #dbe7df;
            padding: 10px;
          }

          .g3-topo-texto {
            text-align: center;
          }

          h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
            color: #14532d;
          }

          h2 {
            margin: 4px 0 6px;
            font-size: 24px;
            line-height: 1.1;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #1f2937;
            font-weight: 800;
          }

          .titulo-complemento {
            margin: -2px 0 6px;
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #166534;
          }

          .subtitulo {
            margin: 0;
            font-size: 13px;
            color: #475569;
          }

          .localizacao-destaque {
            margin: 0 18px 14px;
            padding: 12px 14px;
            border-radius: 14px;
            background: #dcfce7;
            color: #14532d;
            text-align: center;
          }

          .localizacao-destaque span {
            display: block;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .localizacao-destaque strong {
            display: block;
            margin-top: 3px;
            font-size: 22px;
            line-height: 1.15;
          }

          .meta-resumo {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 16px;
            padding: 0 18px 18px;
            font-size: 12px;
            color: #334155;
          }

          .meta-resumo span {
            white-space: nowrap;
          }

          .meta-resumo strong {
            color: #166534;
          }

          .tabela-wrap {
            overflow: hidden;
            border-radius: 18px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
          }

          th {
            background: #166534;
            color: #fff;
            padding: 10px 8px;
            border: 0;
            font-size: 11px;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          td {
            border: 0;
            padding: 8px;
            font-size: 12px;
          }

          tbody tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          tbody tr:nth-child(odd) td {
            background: #ffffff;
          }

          tbody tr:nth-child(even) td {
            background: #f1f5f9;
          }

          .valor {
            text-align: right;
            white-space: nowrap;
          }

          .totalizador td {
            background: #dcfce7;
            color: #14532d;
            font-weight: 800;
          }

          .totalizador-inicio td {
            border-top: 2px solid #166534;
          }

          .totalizador-geral td {
            background: #bbf7d0;
            font-size: 13px;
          }

          .g3-relatorio__vazio {
            text-align: center;
            color: #64748b;
          }

          .rodape {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #dbe7df;
            font-size: 11px;
            color: #6b7f75;
            text-align: center;
          }

          .rodape div + div {
            margin-top: 2px;
          }
        `
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível preparar a impressão."
      });
    }
  }

  async function imprimirRelacaoGeral() {
    await imprimirRelatorioPatrimonio(
      "Impressão geral do patrimônio",
      "Relação completa dos bens patrimoniais cadastrados.",
      [...patrimonios].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      undefined,
      { mostrarValores: true }
    );
    fecharPopupImpressao();
  }

  async function imprimirRelacaoPorLocal() {
    const localSelecionado = popupImpressao.localSelecionado.trim();

    if (!localSelecionado) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Local obrigatório",
        texto: "Selecione o local que deseja imprimir."
      });
      return;
    }

    const itensLocal = patrimonios
      .filter((item) => gerarResumoLocalizacao(item.unidade, item.sala) === localSelecionado)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    await imprimirRelatorioPatrimonio(
      "Impressão patrimonial",
      `Itens patrimoniais vinculados ao local ${localSelecionado}.`,
      itensLocal,
      localSelecionado,
      { mostrarValores: true, tituloComplemento: "Por local", formatoMuralLocal: true }
    );
    fecharPopupImpressao();
  }

  function imprimirEtiquetaTermica() {
    try {
      const { widthMm, heightMm } = formatoEtiquetaSelecionado;
      imprimirConteudoAtual({
        titulo: "Etiqueta patrimonial",
        seletor: "#patrimonio-etiqueta-termica-print",
        tamanhoPagina: `${widthMm}mm ${heightMm}mm`,
        margemPagina: "2.5mm",
        paddingRaiz: "0",
        estilosExtras: `
          html,
          body {
            width: ${widthMm}mm;
            min-height: ${heightMm}mm;
          }

          .g3-print-root {
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }

          #patrimonio-etiqueta-termica-print {
            width: ${widthMm}mm !important;
            min-height: ${heightMm}mm !important;
            max-width: ${widthMm}mm !important;
            box-shadow: none !important;
          }
        `
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível preparar a etiqueta térmica."
      });
    }
  }

  function imprimirFichaAtual() {
    imprimirRelatorioPatrimonio(
      "Ficha patrimonial",
      "Relação detalhada do bem patrimonial selecionado.",
      [
        {
          ...form,
          nome: form.nome?.trim() || "Bem patrimonial sem nome"
        }
      ],
      gerarResumoLocalizacao(form.unidade, form.sala)
    );
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
    { label: "Imprimir", icon: Printer, onClick: abrirPopupImpressao, variant: "outline", disabled: carregandoAcoes },
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
        sectionLabel="Administração e gestão"
        pageTitle={tituloTela}
        activeTitle={abas.find((aba) => aba.id === abaAtiva)?.label}
        codeBadge={form.numeroPatrimonio ? `Patrimônio ${form.numeroPatrimonio}` : "Novo cadastro"}
      >
        {abaAtiva === "dashboard" ? (
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
        ) : null}

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
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5 xl:items-start">
                <div className="space-y-1 xl:col-span-1">
                  <Label>Unidade</Label>
                  <Select
                    value={form.unidadeId ?? ""}
                    className={erros.unidade ? "border-rose-400 focus:ring-rose-400" : undefined}
                    onChange={(event) => {
                      const unidadeSelecionada = resolverUnidadeAssistencial(
                        unidadesAssistenciais,
                        event.target.value
                      );
                      setForm((atual) => ({
                        ...atual,
                        unidadeId: unidadeSelecionada?.id_unidade ?? "",
                        unidade: unidadeSelecionada?.nome_fantasia ?? "",
                        sala: ""
                      }));
                      setUnidadeLocalizacaoSelecionadaId(unidadeSelecionada?.id_unidade ?? "");
                      atualizarErroFormulario("unidade", unidadeSelecionada?.nome_fantasia ?? "");
                    }}
                    onBlur={() => atualizarErroFormulario("unidade")}
                  >
                    <option value="">Selecione a unidade</option>
                    {unidadesAssistenciais.map((item) => (
                      <option
                        key={item.id_unidade ?? item.nome_fantasia}
                        value={item.id_unidade ?? item.nome_fantasia ?? ""}
                      >
                        {item.nome_fantasia?.trim() || item.razao_social?.trim() || item.id_unidade}
                      </option>
                    ))}
                  </Select>
                  {erros.unidade ? (
                    <p className="text-xs text-rose-700">{erros.unidade}</p>
                  ) : (
                    <p className="text-xs text-[var(--g3-muted)]">
                      O número patrimonial é validado por unidade.
                    </p>
                  )}
                </div>

                <div className="space-y-1 xl:col-span-1">
                  <Label>Número patrimonial *</Label>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                    <Input
                      value={form.numeroPatrimonio}
                      className={erros.numeroPatrimonio ? "border-rose-400 focus:ring-rose-400" : undefined}
                      placeholder={form.unidade ? proximoNumeroPatrimonial : "Selecione a unidade primeiro"}
                      disabled={!form.unidade}
                      onChange={(event) =>
                        setForm((atual) => ({ ...atual, numeroPatrimonio: event.target.value }))
                      }
                      onBlur={() => atualizarErroFormulario("numeroPatrimonio")}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 px-0"
                      title="Usar próximo número"
                      aria-label="Usar próximo número"
                      onClick={() =>
                        setForm((atual) => ({ ...atual, numeroPatrimonio: proximoNumeroPatrimonial }))
                      }
                    >
                      <Wand2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 px-0"
                      title="Ver números vagos"
                      aria-label="Ver números vagos"
                      onClick={() => setMostrarNumerosVagos((atual) => !atual)}
                    >
                      <ListRestart className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  {erros.numeroPatrimonio ? (
                    <p className="text-xs text-rose-700">{erros.numeroPatrimonio}</p>
                  ) : (
                    <div className="space-y-1 text-xs text-[var(--g3-muted)]">
                      <p>
                        Último registrado:{" "}
                        {ultimoNumeroPatrimonial ? formatarNumeroSequencial(ultimoNumeroPatrimonial) : "---"} •
                        Próximo sugerido: {proximoNumeroPatrimonial}
                      </p>
                      {mostrarNumerosVagos ? (
                        <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-2">
                          {numerosPatrimoniaisVagos.length ? (
                            <div className="flex max-h-24 flex-wrap gap-1 overflow-auto">
                              {numerosPatrimoniaisVagos.map((numero) => (
                                <button
                                  key={numero}
                                  type="button"
                                  className="rounded border border-[var(--g3-border)] px-2 py-1 text-xs text-[var(--g3-foreground)] hover:bg-[var(--g3-primary-soft)]"
                                  onClick={() => {
                                    setForm((atual) => ({ ...atual, numeroPatrimonio: numero }));
                                    setMostrarNumerosVagos(false);
                                  }}
                                >
                                  {numero}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p>Nenhum número vago encontrado na sequência atual.</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="space-y-1 xl:col-span-3">
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
                  <Select
                    value={form.categoria ?? ""}
                    className={erros.categoria ? "border-rose-400 focus:ring-rose-400" : undefined}
                    onChange={(event) => {
                      const categoria = categoriasCatalogo.find((item) => item.nome === event.target.value);
                      setForm((atual) => ({
                        ...atual,
                        categoria: event.target.value,
                        subcategoria: "",
                        taxaDepreciacao: categoria?.taxaDepreciacao ?? atual.taxaDepreciacao
                      }));
                    }}
                    onBlur={() => atualizarErroFormulario("categoria")}
                  >
                    <option value="">Selecione a categoria</option>
                    {categoriasCatalogo.filter((item) => item.ativo ?? true).map((item) => (
                      <option key={item.nome} value={item.nome}>
                        {item.nome} - {Number(item.taxaDepreciacao ?? 0).toFixed(2)}% ao ano
                      </option>
                    ))}
                  </Select>
                  {erros.categoria ? (
                    <p className="text-xs text-rose-700">{erros.categoria}</p>
                  ) : (
                    <p className="text-xs text-[var(--g3-muted)]">
                      Use categorias da base para evitar duplicidade de escrita.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Subcategoria</Label>
                  <Select
                    value={form.subcategoria ?? ""}
                    onChange={(event) => setForm((atual) => ({ ...atual, subcategoria: event.target.value }))}
                    disabled={!form.categoria || !subcategoriasDisponiveis.length}
                  >
                    <option value="">
                      {form.categoria ? "Selecione a subcategoria" : "Selecione a categoria primeiro"}
                    </option>
                    {subcategoriasDisponiveis.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
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
                    inputMode="numeric"
                    value={formatarValorMonetarioInput(form.valorAquisicao)}
                    className={erros.valorAquisicao ? "border-rose-400 focus:ring-rose-400" : undefined}
                    onChange={(event) =>
                      setForm((atual) => ({
                        ...atual,
                        valorAquisicao: normalizarValorMonetario(event.target.value)
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
                      {categoriaSelecionada
                        ? `Sugestão da categoria ${categoriaSelecionada.nome}: ${categoriaSelecionada.taxaDepreciacao}% ao ano.`
                        : "Ajuda a estimar o valor atual do bem ao longo do tempo."}
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
                    <Select
                      value={unidadeLocalizacaoSelecionadaId}
                      onChange={(event) =>
                        {
                          const valorSelecionado = event.target.value;
                          const unidadeSelecionada = resolverUnidadeAssistencial(
                            unidadesAssistenciais,
                            valorSelecionado
                          );

                          setForm((atual) => ({
                            ...atual,
                            unidadeId: unidadeSelecionada?.id_unidade ?? "",
                            unidade: unidadeSelecionada?.nome_fantasia ?? atual.unidade,
                            sala: ""
                          }));
                          setUnidadeLocalizacaoSelecionadaId(unidadeSelecionada?.id_unidade ?? valorSelecionado);
                        }
                      }
                    >
                      <option value="">Selecione a unidade</option>
                      {unidadesAssistenciais.map((item) => (
                        <option key={item.id_unidade ?? item.nome_fantasia} value={item.id_unidade ?? item.nome_fantasia}>
                          {item.nome_fantasia}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Sala</Label>
                    <Select
                      value={form.sala ?? ""}
                      onChange={(event) => setForm((atual) => ({ ...atual, sala: event.target.value }))}
                      disabled={!unidadeLocalizacaoSelecionadaId}
                    >
                      <option value="">
                        {unidadeLocalizacaoSelecionadaId ? "Selecione a sala" : "Selecione a unidade primeiro"}
                      </option>
                      {salasDisponiveis.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                    {unidadeLocalizacaoSelecionadaId && salasDisponiveis.length === 0 ? (
                      <p className="text-xs text-[var(--g3-muted)]">
                        Nenhuma sala de atendimento cadastrada para esta unidade.
                      </p>
                    ) : null}
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
                    ok: Number(form.valorAquisicao ?? 0) > 0,
                    titulo: "Valor informado",
                    detalhe: Number(form.valorAquisicao ?? 0) > 0 ? formatarMoeda(form.valorAquisicao) : "Sem valor informado"
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
                    <div className="grid gap-4 xl:grid-cols-[1.3fr,190px]">
                      <div>
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

                      <div className="rounded-2xl border border-white/70 bg-white/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                          QR code
                        </p>
                        <div className="mt-3">
                          <QrCodePreview value={conteudoQrEtiqueta} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                            Código de barras
                          </p>
                          <p className="mt-1 text-xs text-[var(--g3-muted)]">
                            A leitura usa o número patrimonial atual.
                          </p>
                        </div>
                        <Badge variant="info">{codigoEtiqueta || "Sem número"}</Badge>
                      </div>

                      <div className="mt-3">
                        <BarcodePreview value={codigoEtiqueta} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={badgeStatusFormulario.variant}>{badgeStatusFormulario.label}</Badge>
                    <Badge variant={badgeConservacaoFormulario.variant}>{badgeConservacaoFormulario.label}</Badge>
                  </div>

                  <div className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),220px] md:items-start">
                      <div>
                        <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                          Etiqueta térmica pronta para impressão
                        </p>
                        <p className="mt-1 text-xs text-[var(--g3-muted)]">
                          Escolha o tamanho da etiqueta e a prévia será atualizada com número, código de barras e QR code.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label>Tamanho da etiqueta</Label>
                        <Select
                          value={formatoEtiquetaId}
                          onChange={(event) => setFormatoEtiquetaId(event.target.value as FormatoEtiquetaId)}
                        >
                          {formatosEtiqueta.map((formato) => (
                            <option key={formato.id} value={formato.id}>
                              {formato.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="info">{formatoEtiquetaSelecionado.label}</Badge>
                      <Badge variant="info">
                        {formatoEtiquetaSelecionado.widthMm} x {formatoEtiquetaSelecionado.heightMm} mm
                      </Badge>
                    </div>

                    <div className="mt-4 overflow-x-auto pb-1">
                      <div
                        id="patrimonio-etiqueta-termica-print"
                        className="rounded-2xl border border-slate-300 bg-white p-3 text-slate-900 shadow-sm"
                        style={{
                          width: `${formatoEtiquetaSelecionado.widthMm}mm`,
                          maxWidth: "100%",
                          minHeight: `${formatoEtiquetaSelecionado.heightMm}mm`
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Patrimônio
                            </p>
                            <p
                              className="mt-1 font-bold leading-none text-slate-900"
                              style={{ fontSize: `${formatoEtiquetaSelecionado.numeroFontPx}px` }}
                            >
                              {codigoEtiqueta || "Sem número"}
                            </p>
                            <p
                              className="mt-1 font-semibold leading-tight text-slate-900"
                              style={{ fontSize: `${formatoEtiquetaSelecionado.nomeFontPx}px` }}
                            >
                              {form.nome || "Nome do patrimônio"}
                            </p>
                            <p
                              className="mt-1 leading-tight text-slate-600"
                              style={{ fontSize: `${formatoEtiquetaSelecionado.detalheFontPx}px` }}
                            >
                              {gerarResumoLocalizacao(form.unidade, form.sala)}
                            </p>
                            <p
                              className="mt-1 leading-tight text-slate-600"
                              style={{ fontSize: `${formatoEtiquetaSelecionado.detalheFontPx}px` }}
                            >
                              {form.responsavel || "Responsável não definido"}
                            </p>
                          </div>

                          <div
                            className="shrink-0"
                            style={{ width: `${formatoEtiquetaSelecionado.qrContainerPx}px` }}
                          >
                            <QrCodePreview
                              value={conteudoQrEtiqueta}
                              compact
                              size={formatoEtiquetaSelecionado.qrSize}
                            />
                          </div>
                        </div>

                        <div className="mt-2">
                          <BarcodePreview
                            value={codigoEtiqueta}
                            compact
                            showValue={false}
                            barcodeHeight={formatoEtiquetaSelecionado.barcodeHeight}
                            barWidth={formatoEtiquetaSelecionado.barWidth}
                          />
                        </div>

                        <div
                          className="mt-1 flex items-center justify-between gap-2 font-medium uppercase tracking-[0.14em] text-slate-500"
                          style={{ fontSize: `${formatoEtiquetaSelecionado.rodapeFontPx}px` }}
                        >
                          <span>{codigoEtiqueta || "Sem número"}</span>
                          <span>{form.categoria?.trim() || "Sem categoria"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={imprimirFichaAtual}>
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir ficha atual
                    </Button>
                    <Button onClick={imprimirEtiquetaTermica}>
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir etiqueta térmica
                    </Button>
                  </div>
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

        {abaAtiva === "categorias" ? (
          <section className="space-y-3">
            <div className="grid gap-3 xl:grid-cols-[0.9fr,1.1fr]">
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {categoriaForm.id ? "Editar categoria" : "Cadastrar categoria"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Input
                      value={categoriaForm.nome}
                      placeholder="Ex.: Equipamentos odontológicos"
                      onChange={(event) =>
                        setCategoriaForm((atual) => ({ ...atual, nome: event.target.value }))
                      }
                      onBlur={() =>
                        setCategoriaForm((atual) => ({ ...atual, nome: normalizarNomeCatalogo(atual.nome) }))
                      }
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Taxa de depreciação anual (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={Number(categoriaForm.taxaDepreciacao ?? 0)}
                        onChange={(event) =>
                          setCategoriaForm((atual) => ({
                            ...atual,
                            taxaDepreciacao: Number(event.target.value) || 0
                          }))
                        }
                      />
                    </div>

                    <label className="flex items-center gap-2 pt-6 text-sm text-[var(--g3-foreground)]">
                      <Checkbox
                        checked={categoriaForm.ativo ?? true}
                        onChange={(event) =>
                          setCategoriaForm((atual) => ({ ...atual, ativo: event.target.checked }))
                        }
                      />
                      Categoria ativa
                    </label>
                  </div>

                  <div className="space-y-2 rounded-lg border border-[var(--g3-border)] p-3">
                    <Label>Subcategorias</Label>
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <Input
                        value={subcategoriaDraft}
                        placeholder="Ex.: Cadeiras de rodas"
                        onChange={(event) => setSubcategoriaDraft(event.target.value)}
                        onBlur={() => setSubcategoriaDraft((valor) => normalizarNomeCatalogo(valor))}
                      />
                      <Button type="button" variant="outline" onClick={incluirSubcategoria}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Incluir
                      </Button>
                    </div>
                    {(categoriaForm.subcategorias ?? []).length ? (
                      <div className="flex flex-wrap gap-2">
                        {(categoriaForm.subcategorias ?? []).map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--g3-border)] px-3 py-1 text-xs text-[var(--g3-foreground)]"
                          >
                            {item}
                            <button
                              type="button"
                              className="text-[var(--g3-danger)]"
                              onClick={() => removerSubcategoria(item)}
                              aria-label={`Remover ${item}`}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--g3-muted)]">Nenhuma subcategoria incluída.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void salvarCategoria()} disabled={carregandoAcoes}>
                      <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Salvar categoria
                    </Button>
                    <Button type="button" variant="outline" onClick={novaCategoria} disabled={carregandoAcoes}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Nova categoria
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Categorias cadastradas</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto p-0">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--g3-card-soft)] text-[var(--g3-muted)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Categoria</th>
                        <th className="px-3 py-2 text-left">Subcategorias</th>
                        <th className="px-3 py-2 text-left">Taxa</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoriasCatalogo.length ? (
                        categoriasCatalogo.map((item, index) => (
                          <tr
                            key={item.id ?? item.nome}
                            className={`border-t border-[var(--g3-border)] ${
                              index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/20"
                            }`}
                          >
                            <td className="px-3 py-2 font-medium">{item.nome}</td>
                            <td className="px-3 py-2 text-[var(--g3-muted)]">
                              {(item.subcategorias ?? []).join(", ") || "---"}
                            </td>
                            <td className="px-3 py-2">{Number(item.taxaDepreciacao ?? 0).toFixed(2)}%</td>
                            <td className="px-3 py-2">
                              <Badge variant={(item.ativo ?? true) ? "success" : "default"}>
                                {(item.ativo ?? true) ? "Ativa" : "Inativa"}
                              </Badge>
                            </td>
                            <td className="space-x-2 px-3 py-2 text-right">
                              <Button type="button" size="sm" variant="outline" onClick={() => editarCategoria(item)}>
                                Editar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                onClick={() => void removerCategoria(item)}
                                disabled={carregandoAcoes}
                              >
                                Excluir
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-[var(--g3-muted)]">
                            Nenhuma categoria cadastrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
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
                  <p className="text-xs text-[var(--g3-muted)]">
                    A busca numérica é exata e a unidade aparece na coluna Unidade.
                  </p>
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

            {patrimoniosSemVinculo.length ? (
              <Card className="border-amber-300 bg-amber-50/60">
                <CardContent className="flex flex-col gap-2 p-3 text-sm text-amber-950 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold">Auditoria de legado</p>
                    <p>
                      {patrimoniosSemVinculo.length} patrimônio(s) ainda estão sem `unidadeId` resolvido e podem
                      precisar de revisão manual.
                    </p>
                  </div>
                  <Badge variant="warning">Revisar vínculo de unidade</Badge>
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm">Saneamento em lote assistido</CardTitle>
                  <p className="text-xs text-[var(--g3-muted)]">
                    {mostrarSaneamentoLote
                      ? "Recolha a seção quando quiser focar apenas na listagem."
                      : "Seção recolhida. Abra novamente para continuar o saneamento."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarSaneamentoLote((atual) => !atual)}
                  aria-expanded={mostrarSaneamentoLote}
                >
                  {mostrarSaneamentoLote ? (
                    <>
                      <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
                      Recolher
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                      Abrir saneamento
                    </>
                  )}
                </Button>
              </CardHeader>
              {mostrarSaneamentoLote ? (
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
              ) : null}
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

      {popupImpressao.aberto ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          onClick={fecharPopupImpressao}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Imprimir patrimônio</h3>
              <p className="mt-1 text-sm text-slate-600">
                Escolha o tipo de relatório que deseja gerar.
              </p>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4">
                <p className="text-sm font-semibold text-[var(--g3-foreground)]">Impressão geral</p>
                <p className="mt-1 text-sm text-[var(--g3-muted)]">
                  Gera a relação completa com nome do bem, número do patrimônio e categoria.
                </p>
                <Button className="mt-3" type="button" onClick={imprimirRelacaoGeral}>
                  Impressão geral
                </Button>
              </div>

              <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4">
                <p className="text-sm font-semibold text-[var(--g3-foreground)]">Impressão por local</p>
                <p className="mt-1 text-sm text-[var(--g3-muted)]">
                  Gere a relação dos itens do local selecionado para uso no mural do ambiente.
                </p>

                <div className="mt-3 space-y-1">
                  <Label htmlFor="patrimonio-impressao-local">Local</Label>
                  <Select
                    id="patrimonio-impressao-local"
                    value={popupImpressao.localSelecionado}
                    onChange={(event) =>
                      setPopupImpressao((atual) => ({
                        ...atual,
                        localSelecionado: event.target.value
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {locaisPatrimonioDisponiveis.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>

                <Button
                  className="mt-3"
                  type="button"
                  variant="outline"
                  onClick={imprimirRelacaoPorLocal}
                  disabled={!popupImpressao.localSelecionado}
                >
                  Impressão por local
                </Button>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={fecharPopupImpressao}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
    </>
  );
}
