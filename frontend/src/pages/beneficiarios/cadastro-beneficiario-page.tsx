import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { MensagemAcoesRapidas } from "@/components/mensagens-personalizadas/mensagem-acoes-rapidas";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  Plus,
  Save,
  Undo2,
  Trash2,
  Printer,
  X,
  Camera,
  Upload,
  Eye,
  ListFilter,
  IdCard,
  MapPinned,
  Phone,
  Handshake,
  GraduationCap,
  HeartPulse,
  HandCoins,
  FileText,
  ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  beneficiarioDefaultValues,
  beneficiarioFormSchema,
  beneficiarioStatusOptions,
  type BeneficiarioFormValues
} from "@/features/beneficiarios/beneficiario.schema";
import {
  useBeneficiario,
  useBeneficiarios,
  useProximoCodigo,
  useRemoverBeneficiario,
  useSalvarBeneficiario
} from "@/features/beneficiarios/use-beneficiarios";
import {
  documentosObrigatoriedadeBeneficiarioPadrao,
  parametrosSistemaService,
  type DocumentoObrigatoriedadeBeneficiarioSetting
} from "@/services/parametros-sistema.service";
import { reportsService } from "@/services/reports.service";
import { buscarEnderecoPorCep, buscarSugestaoZonaSubzona } from "@/services/cep.service";
import type { Beneficiario, BeneficiarioFiltro, BeneficiarioStatus } from "@/types/beneficiario";
import { useAuth } from "@/hooks/use-auth";
import { somenteDigitos, validarCpf } from "@/lib/validators";
import {
  mapaCamposTextoBeneficiarioForm,
  mapaDocumentoBeneficiarioForm
} from "@/lib/text-format-config";
import { formatarTextoPorCampo, normalizarObjetoTexto } from "@/lib/text-formatter";
import { reservarJanelaRelatorio } from "@/lib/report-utils";
import { obterUrlArquivoAutenticado, resolverUrlArquivo } from "@/lib/arquivos";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario,
  ordemAcoesCrudPadrao
} from "@/lib/tela-padrao-beneficiario";

const abas = [
  { id: "listagem", label: "Listagem de beneficiários", icon: ListFilter },
  { id: "dados", label: "Dados pessoais", icon: IdCard },
  { id: "endereco", label: "Endereço", icon: MapPinned },
  { id: "contato", label: "Contato", icon: Phone },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "social", label: "Situação social", icon: Handshake },
  { id: "escolaridade", label: "Escolaridade e trabalho", icon: GraduationCap },
  { id: "saude", label: "Saúde", icon: HeartPulse },
  { id: "beneficios", label: "Benefícios", icon: HandCoins },
  { id: "observacoes", label: "Observações", icon: FileText }
] as const;

type DocumentoCadastroConfig = DocumentoObrigatoriedadeBeneficiarioSetting & {
  permiteIgnorar: boolean;
};

const documentosConfigBase: DocumentoCadastroConfig[] =
  documentosObrigatoriedadeBeneficiarioPadrao.map((documento) => ({
    ...documento,
    permiteIgnorar: true
  }));

const opcaoAutoDeclaracaoResidencia = "Auto declaração de residência";

const opcoesComprovanteEndereco = [
  "Conta de água",
  "Conta de energia",
  "Contrato de aluguel",
  opcaoAutoDeclaracaoResidencia
] as const;

const subzonaEnderecoOptions = [
  { value: "ZONA_NORTE", label: "Zona Norte" },
  { value: "ZONA_SUL", label: "Zona Sul" },
  { value: "ZONA_LESTE", label: "Zona Leste" },
  { value: "ZONA_OESTE", label: "Zona Oeste" },
  { value: "ZONA_CENTRAL", label: "Zona Central" }
] as const;

type DocumentoCadastroId = string;

type DocumentoCadastro = {
  id: DocumentoCadastroId;
  nome: string;
  numeroDocumento: string;
  nomeArquivo?: string;
  caminhoArquivo?: string;
  contentType?: string;
  ignorado: boolean;
  obrigatorio: boolean;
  permiteIgnorar: boolean;
};

type ColunaOrdenacaoBeneficiario =
  | "codigo"
  | "nome_completo"
  | "data_nascimento"
  | "cpf"
  | "telefone_principal"
  | "bairro"
  | "status";

type DirecaoOrdenacao = "asc" | "desc";

function documentoEhComprovanteEndereco(documento: DocumentoCadastro) {
  return documento.id === "comprovante_endereco";
}

function normalizarTipoComprovanteEndereco(tipo?: string) {
  if (!tipo?.trim()) return "";
  const valor = tipo.trim();
  if (valor === "Declaração de residência") {
    return opcaoAutoDeclaracaoResidencia;
  }
  return valor;
}

const tituloTela = "Cadastro de beneficiários";
type AbaFormularioId = (typeof abas)[number]["id"];

const mapaCamposObrigatorios: Partial<
  Record<keyof BeneficiarioFormValues, { label: string; aba: AbaFormularioId }>
> = {
  nome_completo: { label: "Nome completo", aba: "dados" },
  data_nascimento: { label: "Data de nascimento", aba: "dados" },
  nome_mae: { label: "Nome da mãe", aba: "dados" },
  cep: { label: "CEP", aba: "endereco" },
  telefone_principal: { label: "Telefone principal", aba: "contato" },
  telefone_secundario: { label: "Telefone secundário", aba: "contato" },
  telefone_recado_numero: { label: "Telefone recado", aba: "contato" },
  email: { label: "E-mail", aba: "contato" },
  aceite_lgpd: { label: "Aceite LGPD", aba: "observacoes" }
};

function obterPendenciasFormulario(
  errors: Partial<Record<keyof BeneficiarioFormValues, unknown>>
) {
  return Object.entries(mapaCamposObrigatorios).flatMap(([campo, definicao]) => {
    if (!definicao || !errors[campo as keyof BeneficiarioFormValues]) {
      return [];
    }

    return [{ campo, ...definicao }];
  });
}

function formatarStatus(status?: string) {
  if (!status) return "Em análise";
  const texto = status.toLowerCase().replaceAll("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarDataIso(data?: string) {
  if (!data) return "---";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

function calcularIdade(data?: string) {
  if (!data) return "---";

  const [anoTexto, mesTexto, diaTexto] = data.split("-");
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);

  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) {
    return "---";
  }

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const mesAtual = hoje.getMonth() + 1;
  const diaAtual = hoje.getDate();

  if (mesAtual < mes || (mesAtual === mes && diaAtual < dia)) {
    idade -= 1;
  }

  if (idade < 0) return "---";
  return `${idade} ${idade === 1 ? "ano" : "anos"}`;
}

function formatarTelefone(telefone?: string) {
  const formatado = formatarTelefoneInput(telefone);
  return formatado || "---";
}

function formatarTelefoneInput(telefone?: string) {
  const digitos = somenteDigitos(telefone).slice(0, 11);
  if (!digitos) return "";
  const temNonoDigito = digitos.length > 10;
  const ddd = digitos.slice(0, 2);
  const prefixo = digitos.slice(2, temNonoDigito ? 7 : 6);
  const sufixo = digitos.slice(temNonoDigito ? 7 : 6, temNonoDigito ? 11 : 10);
  if (sufixo) {
    return `(${ddd}) ${prefixo}-${sufixo}`;
  }
  if (prefixo) {
    return `(${ddd}) ${prefixo}`;
  }
  return `(${ddd}`;
}

function telefoneValido(telefone?: string) {
  const digitos = somenteDigitos(telefone);
  return digitos.length === 10 || digitos.length === 11;
}

function formatarCep(cep?: string) {
  const digitos = somenteDigitos(cep).slice(0, 8);
  if (!digitos) return "";
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

function normalizarEmailDigitado(email?: string) {
  return (email ?? "").replace(/\s+/g, "").toLowerCase();
}

function gerarSenhaPortalAcesso() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function chaveSenhaPortalBeneficiario(id?: string) {
  return id ? `g3n:beneficiario:senha-portal:${id}` : "";
}

function salvarSenhaPortalNaSessao(id?: string, senha?: string) {
  if (!id || !senha || typeof window === "undefined") return;
  window.sessionStorage.setItem(chaveSenhaPortalBeneficiario(id), senha);
}

function lerSenhaPortalDaSessao(id?: string) {
  if (!id || typeof window === "undefined") return "";
  return window.sessionStorage.getItem(chaveSenhaPortalBeneficiario(id)) ?? "";
}

function emailValido(email?: string) {
  const valor = normalizarEmailDigitado(email);
  if (!valor) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function normalizarNomeDocumento(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function obterConfiguracaoDocumentos(
  configuracaoRemota?: DocumentoObrigatoriedadeBeneficiarioSetting[]
): DocumentoCadastroConfig[] {
  const configuracaoPorId = new Map(
    (configuracaoRemota ?? []).map((documento) => [documento.id, documento])
  );

  return documentosConfigBase.map((documentoBase) => {
    const configuracao = configuracaoPorId.get(documentoBase.id);
    const obrigatorio = configuracao?.obrigatorio ?? documentoBase.obrigatorio;

    return {
      ...documentoBase,
      nome: configuracao?.nome ?? documentoBase.nome,
      obrigatorio,
      permiteIgnorar: !obrigatorio
    };
  });
}

function criarDocumentosPadrao(configuracao?: DocumentoObrigatoriedadeBeneficiarioSetting[]) {
  return obterConfiguracaoDocumentos(configuracao).map((documento) => ({
    id: documento.id,
    nome: documento.nome,
    numeroDocumento: "",
    nomeArquivo: undefined,
    caminhoArquivo: undefined,
    contentType: undefined,
    ignorado: false,
    obrigatorio: documento.obrigatorio,
    permiteIgnorar: documento.permiteIgnorar
  }));
}

function reconciliarDocumentosComConfiguracao(
  documentosAtuais: DocumentoCadastro[],
  configuracao?: DocumentoObrigatoriedadeBeneficiarioSetting[]
): DocumentoCadastro[] {
  const configuracaoAtual = criarDocumentosPadrao(configuracao);
  const documentosPorId = new Map(documentosAtuais.map((documento) => [documento.id, documento]));
  const documentosPorNome = new Map(
    documentosAtuais.map((documento) => [normalizarNomeDocumento(documento.nome), documento])
  );
  const idsPadrao = new Set(configuracaoAtual.map((documento) => documento.id));

  const documentosPadrao = configuracaoAtual.map((documentoPadrao) => {
    const documentoAtual =
      documentosPorId.get(documentoPadrao.id) ??
      documentosPorNome.get(normalizarNomeDocumento(documentoPadrao.nome));

    if (!documentoAtual) {
      return documentoPadrao;
    }

    return {
      ...documentoAtual,
      id: documentoPadrao.id,
      nome: documentoPadrao.nome,
      obrigatorio: documentoPadrao.obrigatorio,
      permiteIgnorar: documentoPadrao.permiteIgnorar,
      ignorado: documentoPadrao.permiteIgnorar ? documentoAtual.ignorado : false
    };
  });

  const documentosExtras = documentosAtuais.filter((documento) => !idsPadrao.has(documento.id));
  return [...documentosPadrao, ...documentosExtras];
}

function mapearDocumentosDoBeneficiario(
  item: Beneficiario,
  configuracao?: DocumentoObrigatoriedadeBeneficiarioSetting[]
): DocumentoCadastro[] {
  const anexos = item.documentos_obrigatorios ?? [];
  const anexosPorNome = new Map(anexos.map((doc) => [normalizarNomeDocumento(doc.nome), doc]));
  const configuracaoAtual = criarDocumentosPadrao(configuracao);
  const nomesDocumentosPadrao = new Set(
    configuracaoAtual.map((doc) => normalizarNomeDocumento(doc.nome))
  );

  const documentosPadrao = configuracaoAtual.map((documento) => {
    const anexo = anexosPorNome.get(normalizarNomeDocumento(documento.nome));
    const numeroDocumento =
      anexo?.numeroDocumento ??
      (documento.id === "cpf"
        ? item.cpf
        : documento.id === "cnh"
          ? item.cnh
          : documento.id === "titulo_eleitor"
            ? item.titulo_eleitor
            : documento.id === "cartao_sus"
              ? item.cartao_sus
              : undefined) ??
      "";

    return {
      ...documento,
      numeroDocumento: documentoEhComprovanteEndereco(documento)
        ? normalizarTipoComprovanteEndereco(numeroDocumento)
        : numeroDocumento,
      nomeArquivo: anexo?.nomeArquivo,
      caminhoArquivo: anexo?.caminhoArquivo,
      contentType: anexo?.contentType,
      ignorado: documento.permiteIgnorar ? !!anexo?.ignorado : false,
      obrigatorio: documento.obrigatorio,
      permiteIgnorar: documento.permiteIgnorar
    };
  });

  const documentosExtras = anexos
    .filter((doc) => !nomesDocumentosPadrao.has(normalizarNomeDocumento(doc.nome)))
    .map((doc, indice) => {
      const identificadorExtra = doc.id ?? normalizarNomeDocumento(doc.nome) ?? String(indice);

      return {
        id: `extra-${identificadorExtra}`,
        nome: doc.nome,
        numeroDocumento: doc.numeroDocumento ?? "",
        nomeArquivo: doc.nomeArquivo,
        caminhoArquivo: doc.caminhoArquivo,
        contentType: doc.contentType,
        ignorado: !!doc.ignorado,
        obrigatorio: !!doc.obrigatorio,
        permiteIgnorar: !doc.obrigatorio
      };
    });

  return [...documentosPadrao, ...documentosExtras];
}

function mapearBeneficiarioParaFormulario(item?: Beneficiario): BeneficiarioFormValues {
  if (!item) {
    return beneficiarioDefaultValues;
  }

  return {
    ...beneficiarioDefaultValues,
    ...item,
    cep: formatarCep(item.cep),
    telefone_principal: formatarTelefoneInput(item.telefone_principal),
    telefone_secundario: formatarTelefoneInput(item.telefone_secundario),
    telefone_recado_numero: formatarTelefoneInput(item.telefone_recado_numero),
    email: normalizarEmailDigitado(item.email),
    senha_portal: "",
    status: item.status ?? "EM_ANALISE",
    aceite_lgpd: item.aceite_lgpd ?? false
  };
}

function isDocumentoPdf(documento: DocumentoCadastro) {
  return (
    (documento.contentType ?? "").includes("pdf") ||
    documento.caminhoArquivo?.startsWith("data:application/pdf") ||
    documento.nomeArquivo?.toLowerCase().endsWith(".pdf") ||
    false
  );
}

async function prepararUrlDocumento(documento: DocumentoCadastro) {
  const caminhoArquivo = documento.caminhoArquivo;
  if (!caminhoArquivo) {
    throw new Error("Nenhum arquivo enviado para este documento.");
  }

  if (!caminhoArquivo.startsWith("data:")) {
    const arquivoResolvido = await obterUrlArquivoAutenticado(caminhoArquivo);
    return { ...arquivoResolvido, isPdf: isDocumentoPdf(documento) };
  }

  const response = await fetch(caminhoArquivo);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  return {
    url,
    isPdf: blob.type.includes("pdf") || isDocumentoPdf(documento),
    revoke: () => URL.revokeObjectURL(url)
  };
}

function agendarLimpezaUrlDocumento(revoke?: () => void) {
  if (!revoke) return;
  window.setTimeout(() => revoke(), 60_000);
}

function abrirJanelaDocumento(titulo: string) {
  const janela = window.open("", "_blank", "width=1200,height=900");

  if (!janela) {
    throw new Error("Não foi possível abrir a visualização do documento.");
  }

  try {
    janela.opener = null;
  } catch {
    // Alguns navegadores não permitem ajustar opener.
  }

  janela.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${titulo.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #f8fafc;
            color: #0f172a;
            font-family: Arial, sans-serif;
          }
        </style>
      </head>
      <body>Carregando documento...</body>
    </html>`);
  janela.document.close();

  return janela;
}

function documentoTemConteudoPersistivel(documento: DocumentoCadastro) {
  return !!(
    documento.ignorado ||
    documento.numeroDocumento.trim().length > 0 ||
    documento.nomeArquivo?.trim() ||
    documento.caminhoArquivo?.trim()
  );
}

function statusVariant(status?: BeneficiarioStatus) {
  switch (status) {
    case "ATIVO":
    case "COMPLETO":
      return "success" as const;
    case "BLOQUEADO":
      return "danger" as const;
    case "INCOMPLETO":
    case "DESATUALIZADO":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

const fotoLarguraPx = 400;
const fotoAlturaPx = 300;
const fotoMaximaBytes = 5 * 1024 * 1024;
const documentoMaximoBytes = 10 * 1024 * 1024;
const documentoWebcamLarguraMaximaPx = 1600;
const documentoWebcamAlturaMaximaPx = 1600;

type AcaoCrud = {
  label: string;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  icon: LucideIcon;
};

function lerArquivoComoDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem enviada."));
    reader.readAsDataURL(arquivo);
  });
}

function carregarImagem(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error("Não foi possível processar a imagem."));
    imagem.src = dataUrl;
  });
}

function extrairMensagemBeneficiario(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const response = (error as any).response;
    const message = response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }

    const directMessage = (error as any).message;
    if (typeof directMessage === "string" && directMessage.trim()) {
      return directMessage;
    }
  }

  return fallback;
}

async function ajustarImagemDocumentoCapturada(dataUrl: string): Promise<string> {
  const imagem = await carregarImagem(dataUrl);
  const canvas = document.createElement("canvas");

  const proporcao = Math.min(
    1,
    documentoWebcamLarguraMaximaPx / imagem.width,
    documentoWebcamAlturaMaximaPx / imagem.height
  );

  canvas.width = Math.max(1, Math.round(imagem.width * proporcao));
  canvas.height = Math.max(1, Math.round(imagem.height * proporcao));

  const contexto = canvas.getContext("2d");
  if (!contexto) {
    throw new Error("Não foi possível preparar a imagem capturada para o documento.");
  }

  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.82);
}

async function ajustarParaFotoQuatroPorTres(dataUrl: string): Promise<string> {
  const imagem = await carregarImagem(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = fotoLarguraPx;
  canvas.height = fotoAlturaPx;

  const contexto = canvas.getContext("2d");
  if (!contexto) {
    throw new Error("Não foi possível preparar a Área de edição da foto.");
  }

  // Mantém a foto inteira visível (sem corte), ajustando com "contain" no quadro 4x3.
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, fotoLarguraPx, fotoAlturaPx);

  const escala = Math.min(fotoLarguraPx / imagem.width, fotoAlturaPx / imagem.height);
  const larguraRender = imagem.width * escala;
  const alturaRender = imagem.height * escala;
  const destinoX = (fotoLarguraPx - larguraRender) / 2;
  const destinoY = (fotoAlturaPx - alturaRender) / 2;

  contexto.drawImage(imagem, destinoX, destinoY, larguraRender, alturaRender);

  return canvas.toDataURL("image/jpeg", 0.92);
}

export function CadastroBeneficiarioPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<(typeof abas)[number]["id"]>("listagem");
  const [filtroDraft, setFiltroDraft] = useState<BeneficiarioFiltro>({
    nome: "",
    codigo: "",
    cpf: "",
    status: "",
    data_nascimento: ""
  });
  const [filtros, setFiltros] = useState<BeneficiarioFiltro>(filtroDraft);
  const [ordenacaoListagem, setOrdenacaoListagem] = useState<{
    coluna: ColunaOrdenacaoBeneficiario;
    direcao: DirecaoOrdenacao;
  }>({ coluna: "nome_completo", direcao: "asc" });
  const [beneficiarioSelecionadoId, setBeneficiarioSelecionadoId] = useState<string | undefined>();
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [avisoPendenciasSelecao, setAvisoPendenciasSelecao] = useState<
    Array<{ grupo: string; itens: string[] }>
  >([]);
  const [configuracaoDocumentos, setConfiguracaoDocumentos] = useState<
    DocumentoObrigatoriedadeBeneficiarioSetting[]
  >(documentosObrigatoriedadeBeneficiarioPadrao);
  const [documentos, setDocumentos] = useState<DocumentoCadastro[]>(() => criarDocumentosPadrao());
  const [popupSalvarAberto, setPopupSalvarAberto] = useState(false);
  const [senhaPortalGerada, setSenhaPortalGerada] = useState("");
  const [popupExcluirAberto, setPopupExcluirAberto] = useState(false);
  const [popupImprimirAberto, setPopupImprimirAberto] = useState(false);
  const [popupDeclaracaoResidenciaAberto, setPopupDeclaracaoResidenciaAberto] = useState(false);
  const [imprimindoRelatorio, setImprimindoRelatorio] = useState(false);
  const [popupExcluirDocumentoId, setPopupExcluirDocumentoId] = useState<DocumentoCadastroId | null>(null);
  const [foto3x4PreviewUrl, setFoto3x4PreviewUrl] = useState("");
  const [webcamAberta, setWebcamAberta] = useState(false);
  const [carregandoWebcam, setCarregandoWebcam] = useState(false);
  const [carregandoCep, setCarregandoCep] = useState(false);
  const [webcamDocumentoAberta, setWebcamDocumentoAberta] = useState(false);
  const [carregandoWebcamDocumento, setCarregandoWebcamDocumento] = useState(false);
  const [documentoWebcamId, setDocumentoWebcamId] = useState<DocumentoCadastroId | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement | null>(null);
  const inputDocumentosRef = useRef<Record<string, HTMLInputElement | null>>({});
  const ultimoCepConsultadoRef = useRef("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoDocumentoRef = useRef<HTMLVideoElement | null>(null);
  const streamWebcamRef = useRef<MediaStream | null>(null);
  const streamDocumentoRef = useRef<MediaStream | null>(null);
  const impressaoEmAndamentoRef = useRef(false);
  const ultimoDisparoImpressaoRef = useRef(0);
  const exibirAvisoPendenciasAoCarregarRef = useRef(false);

  const { data: listaData, isLoading: carregandoLista } = useBeneficiarios(filtros);
  const { data: detalhesData, isLoading: carregandoDetalhes } = useBeneficiario(beneficiarioSelecionadoId);
  const { data: proximoCodigoData, refetch: refetchProximoCodigo } = useProximoCodigo();
  const salvarMutation = useSalvarBeneficiario();
  const removerMutation = useRemoverBeneficiario();

  const {
    register,
    control,
    handleSubmit,
    setFocus,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(beneficiarioFormSchema),
    defaultValues: beneficiarioDefaultValues
  });
  const campoCep = register("cep");
  const campoTelefonePrincipal = register("telefone_principal");
  const campoTelefoneSecundario = register("telefone_secundario");
  const campoTelefoneRecadoNumero = register("telefone_recado_numero");
  const campoEmail = register("email");

  const foto3x4Atual = watch("foto_3x4") || "";
  const nomeCompletoAtual = watch("nome_completo") || "";
  const dataNascimentoAtual = watch("data_nascimento") || "";
  const cpfAtual = watch("cpf") || "";
  const telefonePrincipalAtual = watch("telefone_principal") || "";
  const emailAtual = watch("email") || "";
  const cepAtual = watch("cep") || "";
  const logradouroAtual = watch("logradouro") || "";
  const numeroAtual = watch("numero") || "";
  const bairroAtual = watch("bairro") || "";
  const municipioAtual = watch("municipio") || "";
  const ufAtual = watch("uf") || "";
  const subzonaAtual = watch("subzona") || "";
  const idadeAtual = calcularIdade(dataNascimentoAtual);
  const possuiEnderecoParaMapa = [
    logradouroAtual,
    numeroAtual,
    bairroAtual,
    municipioAtual,
    ufAtual,
    cepAtual
  ].some((valor) => valor.trim().length > 0);

  useEffect(() => {
    let ativo = true;

    void (async () => {
      try {
        const configuracao =
          await parametrosSistemaService.obterObrigatoriedadeDocumentosBeneficiario();
        if (!ativo) return;
        setConfiguracaoDocumentos(configuracao.documentos);
      } catch {
        if (!ativo) return;
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    setDocumentos((estadoAtual) =>
      reconciliarDocumentosComConfiguracao(estadoAtual, configuracaoDocumentos)
    );
  }, [configuracaoDocumentos]);

  useEffect(() => {
    if (!detalhesData?.beneficiario) return;
    const item = detalhesData.beneficiario;

    reset(mapearBeneficiarioParaFormulario(item));
    setSenhaPortalGerada(lerSenhaPortalDaSessao(item.id_beneficiario));
    setDocumentos(mapearDocumentosDoBeneficiario(item, configuracaoDocumentos));
    if (exibirAvisoPendenciasAoCarregarRef.current) {
      setAvisoPendenciasSelecao(obterPendenciasAvisoBeneficiario(item));
      exibirAvisoPendenciasAoCarregarRef.current = false;
    }
    setPopupExcluirDocumentoId(null);
    setMensagem(null);
    ultimoCepConsultadoRef.current = somenteDigitos(item.cep ?? "");
  }, [configuracaoDocumentos, detalhesData, reset]);

  useEffect(() => {
    if (beneficiarioSelecionadoId) return;
    const codigo = proximoCodigoData?.codigo;
    const senhaPortal = gerarSenhaPortalAcesso();
    reset({
      ...beneficiarioDefaultValues,
      codigo: codigo ?? beneficiarioDefaultValues.codigo,
      senha_portal: senhaPortal
    });
    setDocumentos(criarDocumentosPadrao(configuracaoDocumentos));
    setAvisoPendenciasSelecao([]);
    exibirAvisoPendenciasAoCarregarRef.current = false;
    setPopupExcluirDocumentoId(null);
    setSenhaPortalGerada(senhaPortal);
    ultimoCepConsultadoRef.current = "";
  }, [beneficiarioSelecionadoId, configuracaoDocumentos, proximoCodigoData, reset]);

  useEffect(() => {
    const cepNormalizado = somenteDigitos(cepAtual);
    if (cepNormalizado.length < 8) {
      ultimoCepConsultadoRef.current = "";
      setCarregandoCep(false);
      return;
    }
    if (cepNormalizado.length !== 8) {
      setCarregandoCep(false);
      return;
    }
    if (ultimoCepConsultadoRef.current === cepNormalizado) {
      return;
    }

    let ativo = true;
    setCarregandoCep(true);

    void (async () => {
      try {
        const endereco = await buscarEnderecoPorCep(cepNormalizado);
        if (!ativo) return;
        ultimoCepConsultadoRef.current = cepNormalizado;

        if (!endereco) {
          setMensagem({ tipo: "erro", texto: "CEP não encontrado." });
          return;
        }

        setValue("cep", formatarCep(endereco.cep || cepNormalizado), {
          shouldDirty: true,
          shouldValidate: true
        });
        setValue("logradouro", endereco.logradouro, { shouldDirty: true, shouldValidate: true });
        setValue("bairro", endereco.bairro, { shouldDirty: true, shouldValidate: true });
        setValue("municipio", endereco.municipio, { shouldDirty: true, shouldValidate: true });
        setValue("uf", endereco.uf, { shouldDirty: true, shouldValidate: true });

        const complementoAtual = (getValues("complemento") ?? "").trim();
        if (!complementoAtual && endereco.complemento) {
          setValue("complemento", endereco.complemento, {
            shouldDirty: true,
            shouldValidate: true
          });
        }
        try {
          const sugestao = await buscarSugestaoZonaSubzona(endereco.municipio, endereco.bairro);
          if (!ativo) return;
          setValue("zona", sugestao?.zona?.trim() || "URBANA", {
            shouldDirty: true,
            shouldValidate: true
          });
          setValue("subzona", sugestao?.subzona?.trim() || "", {
            shouldDirty: true,
            shouldValidate: true
          });
        } catch {
          if (!ativo) return;
        }

      } catch (error: any) {
        if (!ativo) return;
        setMensagem({
          tipo: "erro",
          texto: error?.message ?? "Não foi possível consultar o CEP informado."
        });
      } finally {
        if (ativo) {
          setCarregandoCep(false);
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [cepAtual, getValues, setValue]);

  useEffect(() => {
    if (!webcamAberta) return;
    const video = videoRef.current;
    const stream = streamWebcamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play();
  }, [webcamAberta]);

  useEffect(() => {
    if (!webcamDocumentoAberta) return;
    const video = videoDocumentoRef.current;
    const stream = streamDocumentoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play();
  }, [webcamDocumentoAberta]);

  useEffect(() => {
    return () => {
      const stream = streamWebcamRef.current;
      if (!stream) return;
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamWebcamRef.current = null;

      const streamDocumento = streamDocumentoRef.current;
      if (!streamDocumento) return;
      for (const track of streamDocumento.getTracks()) {
        track.stop();
      }
      streamDocumentoRef.current = null;
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    let revokeAtual: (() => void) | undefined;

    if (!foto3x4Atual.trim()) {
      setFoto3x4PreviewUrl("");
      return;
    }

    if (foto3x4Atual.startsWith("data:") || foto3x4Atual.startsWith("blob:")) {
      setFoto3x4PreviewUrl(foto3x4Atual);
      return;
    }

    void (async () => {
      try {
        const arquivo = await obterUrlArquivoAutenticado(foto3x4Atual);
        if (!ativo) {
          arquivo.revoke?.();
          return;
        }

        revokeAtual = arquivo.revoke;
        setFoto3x4PreviewUrl(arquivo.url);
      } catch {
        if (!ativo) return;
        setFoto3x4PreviewUrl(resolverUrlArquivo(foto3x4Atual));
      }
    })();

    return () => {
      ativo = false;
      revokeAtual?.();
    };
  }, [foto3x4Atual]);

  const beneficiarios = useMemo(() => {
    const lista = [...(listaData?.beneficiarios ?? [])];
    const { coluna, direcao } = ordenacaoListagem;
    const fator = direcao === "asc" ? 1 : -1;

    const obterValor = (item: Beneficiario) => {
      switch (coluna) {
        case "codigo":
          return item.codigo?.trim() ?? "";
        case "nome_completo":
          return item.nome_completo?.trim() ?? "";
        case "data_nascimento":
          return item.data_nascimento?.trim() ?? "";
        case "cpf":
          return somenteDigitos(item.cpf);
        case "telefone_principal":
          return somenteDigitos(item.telefone_principal);
        case "bairro":
          return item.bairro?.trim() ?? "";
        case "status":
          return item.status?.trim() ?? "";
        default:
          return "";
      }
    };

    lista.sort((itemA, itemB) => {
      const valorA = obterValor(itemA);
      const valorB = obterValor(itemB);

      if (coluna === "data_nascimento") {
        return valorA.localeCompare(valorB) * fator;
      }

      return String(valorA).localeCompare(String(valorB), "pt-BR", { numeric: true, sensitivity: "base" }) * fator;
    });

    return lista;
  }, [listaData?.beneficiarios, ordenacaoListagem]);
  const abaAtual = abas.find((aba) => aba.id === abaAtiva);
  const tituloAbaAtiva = abaAtual?.label ?? tituloTela;
  const IconeAbaAtiva = abaAtual?.icon ?? ListFilter;
  const documentoParaExcluir = popupExcluirDocumentoId
    ? documentos.find((documento) => documento.id === popupExcluirDocumentoId)
    : null;
  const documentoWebcamAtual = documentoWebcamId
    ? documentos.find((documento) => documento.id === documentoWebcamId)
    : null;

  const bloqueadoAcao =
    salvarMutation.isPending || removerMutation.isPending || carregandoDetalhes || imprimindoRelatorio;

  function alternarOrdenacaoListagem(coluna: ColunaOrdenacaoBeneficiario) {
    setOrdenacaoListagem((atual) => ({
      coluna,
      direcao: atual.coluna === coluna && atual.direcao === "asc" ? "desc" : "asc"
    }));
  }

  function renderCabecalhoOrdenavel(
    coluna: ColunaOrdenacaoBeneficiario,
    label: string
  ) {
    const ativa = ordenacaoListagem.coluna === coluna;
    const sufixo = ativa ? (ordenacaoListagem.direcao === "asc" ? " ↑" : " ↓") : "";

    return (
      <button
        type="button"
        onClick={() => alternarOrdenacaoListagem(coluna)}
        className="flex items-center gap-1 font-semibold text-emerald-900 transition hover:text-emerald-950"
      >
        <span>{label}{sufixo}</span>
        <ArrowUpDown className={`h-3.5 w-3.5 ${ativa ? "opacity-100" : "opacity-50"}`} />
      </button>
    );
  }

  function aplicarFormatacaoCampo(campo: keyof BeneficiarioFormValues) {
    const valorAtual = getValues(campo);
    const valorFormatado = formatarTextoPorCampo(
      String(campo),
      valorAtual,
      mapaCamposTextoBeneficiarioForm
    );

    if (typeof valorAtual === "string" && typeof valorFormatado === "string" && valorAtual !== valorFormatado) {
      setValue(campo, valorFormatado as BeneficiarioFormValues[keyof BeneficiarioFormValues], {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }

  const onSubmit = handleSubmit(
    async (values) => {
      setMensagem(null);
      const valoresNormalizados = normalizarObjetoTexto(values, mapaCamposTextoBeneficiarioForm);
      const beneficiarioPersistido = detalhesData?.beneficiario;

      const documentoCpf = documentos.find((documento) => documento.id === "cpf");
      const pendenciasDocumentos = obterPendenciasDocumentos(documentos);
      if (!documentoCpf || pendenciasDocumentos.length > 0) {
        setAbaAtiva("documentos");
        const primeiroDocumentoPendente = documentos.find((documento) => !documento.numeroDocumento?.trim() && !documento.caminhoArquivo && !documento.ignorado);
        window.setTimeout(() => inputDocumentosRef.current[primeiroDocumentoPendente?.id ?? "cpf"]?.focus(), 100);
        setMensagem({
          tipo: "erro",
          texto: `Preencha ou corrija os campos: ${pendenciasDocumentos.join(", ")}.`
        });
        return;
      }

      const documentosPayload = documentos
        .filter((documento) => documentoTemConteudoPersistivel(documento))
        .map((documento) => {
          const documentoNormalizado = normalizarObjetoTexto(documento, mapaDocumentoBeneficiarioForm);
          return {
            nome: String(documentoNormalizado.nome ?? documento.nome),
            numeroDocumento: documento.numeroDocumento || undefined,
            nomeArquivo: documento.nomeArquivo,
            caminhoArquivo: documento.caminhoArquivo,
            contentType: documento.contentType,
            obrigatorio: documento.obrigatorio,
            ignorado: documento.permiteIgnorar ? documento.ignorado : false
          };
        });

      const numeroCnh = documentos.find((documento) => documento.id === "cnh")?.numeroDocumento;
      const numeroTituloEleitor = documentos.find(
        (documento) => documento.id === "titulo_eleitor"
      )?.numeroDocumento;
      const numeroCartaoSus = documentos.find(
        (documento) => documento.id === "cartao_sus"
      )?.numeroDocumento;

      const payload = {
        ...beneficiarioPersistido,
        ...valoresNormalizados,
        id_beneficiario: beneficiarioSelecionadoId,
        codigo: valoresNormalizados.codigo || beneficiarioPersistido?.codigo || proximoCodigoData?.codigo,
        senha_portal: valoresNormalizados.senha_portal || beneficiarioPersistido?.senha_portal || undefined,
        cpf: documentoCpf.numeroDocumento,
        rg_numero: beneficiarioPersistido?.rg_numero || undefined,
        rg_orgao_emissor: beneficiarioPersistido?.rg_orgao_emissor || undefined,
        rg_uf: beneficiarioPersistido?.rg_uf || undefined,
        rg_data_emissao: beneficiarioPersistido?.rg_data_emissao || undefined,
        nis: beneficiarioPersistido?.nis || undefined,
        cnh: numeroCnh || undefined,
        titulo_eleitor: numeroTituloEleitor || undefined,
        cartao_sus: numeroCartaoSus || undefined,
        certidao_tipo: beneficiarioPersistido?.certidao_tipo || undefined,
        certidao_livro: beneficiarioPersistido?.certidao_livro || undefined,
        certidao_folha: beneficiarioPersistido?.certidao_folha || undefined,
        certidao_termo: beneficiarioPersistido?.certidao_termo || undefined,
        certidao_cartorio: beneficiarioPersistido?.certidao_cartorio || undefined,
        certidao_municipio: beneficiarioPersistido?.certidao_municipio || undefined,
        certidao_uf: beneficiarioPersistido?.certidao_uf || undefined,
        documentos_obrigatorios: documentosPayload,
        data_aceite_lgpd: valoresNormalizados.data_aceite_lgpd || new Date().toISOString().slice(0, 10)
      } as unknown as Beneficiario;

      try {
        const response = await salvarMutation.mutateAsync(payload);
        const beneficiarioAtualizado = response.beneficiario;
        const id = beneficiarioAtualizado.id_beneficiario;
        setBeneficiarioSelecionadoId(id);
        reset(mapearBeneficiarioParaFormulario(beneficiarioAtualizado));
        setDocumentos(mapearDocumentosDoBeneficiario(beneficiarioAtualizado, configuracaoDocumentos));
        setPopupExcluirDocumentoId(null);
        setSenhaPortalGerada(response.senha_portal_gerada || valoresNormalizados.senha_portal || "");
        salvarSenhaPortalNaSessao(
          beneficiarioAtualizado.id_beneficiario,
          response.senha_portal_gerada || valoresNormalizados.senha_portal || ""
        );
        setMensagem(null);
        setPopupSalvarAberto(true);
        setFiltros((prev) => ({ ...prev }));
        await refetchProximoCodigo();
      } catch (error: any) {
        setMensagem({
          tipo: "erro",
          texto: extrairMensagemBeneficiario(error, "Não foi possível salvar o beneficiário.")
        });
      }
    },
    (submitErrors) => {
      const pendencias = obterPendenciasFormulario(submitErrors);
      setAbaAtiva(pendencias[0]?.aba ?? "dados");
      if (pendencias[0]?.campo) {
        window.setTimeout(() => setFocus(pendencias[0].campo as keyof BeneficiarioFormValues), 100);
      }
      setMensagem({
        tipo: "erro",
        texto: pendencias.length
          ? `Preencha ou corrija os campos: ${pendencias.map((item) => item.label).join(", ")}.`
          : "Preencha os campos obrigatórios antes de salvar."
      });
    }
  );

  function atualizarDocumento(
    documentoId: DocumentoCadastroId,
    patch: Partial<Omit<DocumentoCadastro, "id" | "nome" | "permiteIgnorar">>
  ) {
    setDocumentos((estadoAtual) =>
      estadoAtual.map((documento) =>
        documento.id === documentoId ? { ...documento, ...patch } : documento
      )
    );
  }

  function obterStatusDocumento(documento: DocumentoCadastro) {
    if (documento.caminhoArquivo) {
      return { texto: "OK", variant: "success" as const };
    }
    if (documento.permiteIgnorar && documento.ignorado) {
      return { texto: "Ignorado", variant: "warning" as const };
    }
    return { texto: "Pendente", variant: "danger" as const };
  }

  function listarDocumentosObrigatorios(documentosAtuais: DocumentoCadastro[]) {
    return documentosAtuais.filter((documento) => documento.obrigatorio).map((documento) => documento.nome);
  }

  function obterPendenciasDocumentos(documentosAtuais: DocumentoCadastro[]) {
    return documentosAtuais.flatMap((documento) => {
      const numeroDocumento = documento.numeroDocumento.trim();

      if (documento.id === "cpf") {
        if (!numeroDocumento) {
          return documento.obrigatorio ? [documento.nome] : [];
        }

        return validarCpf(numeroDocumento) ? [] : [documento.nome];
      }

      if (!documento.obrigatorio) {
        return [];
      }

      if (documentoEhComprovanteEndereco(documento)) {
        const pendencias: string[] = [];
        if (!numeroDocumento) {
          pendencias.push(`Tipo do ${documento.nome.toLowerCase()}`);
        }
        if (!documento.caminhoArquivo) {
          pendencias.push(documento.nome);
        }
        return pendencias;
      }

      if (numeroDocumento || documento.caminhoArquivo) {
        return [];
      }

      return [documento.nome];
    });
  }

  function obterPendenciasAvisoBeneficiario(item: Beneficiario) {
    const dadosPessoais = new Set<string>();
    const endereco = new Set<string>();
    const contato = new Set<string>();
    const documentos = new Set<string>();
    const alertas = new Set<string>();

    if (!item.nome_completo?.trim()) dadosPessoais.add("Nome completo");
    if (!item.data_nascimento?.trim()) dadosPessoais.add("Data de nascimento");
    if (!item.nome_mae?.trim()) dadosPessoais.add("Nome da mãe");
    if (!item.sexo_biologico?.trim()) dadosPessoais.add("Sexo");
    if (!item.cor_raca?.trim()) dadosPessoais.add("Raça/cor");
    if (!item.estado_civil?.trim()) dadosPessoais.add("Estado civil");
    if (!item.nacionalidade?.trim()) dadosPessoais.add("Nacionalidade");
    if (!item.naturalidade_cidade?.trim()) dadosPessoais.add("Naturalidade (cidade)");
    if (!item.naturalidade_uf?.trim()) dadosPessoais.add("Naturalidade (UF)");

    if (!item.cep?.trim()) endereco.add("CEP");
    if (!item.logradouro?.trim()) endereco.add("Endereço");
    if (!item.numero?.trim()) endereco.add("Número");
    if (!item.bairro?.trim()) endereco.add("Bairro");
    if (!item.municipio?.trim()) endereco.add("Município");
    if (!item.uf?.trim()) endereco.add("UF");
    if (!item.zona?.trim()) endereco.add("Zona");
    if (!item.subzona?.trim()) endereco.add("Subzona");

    const enderecoIncompleto = ![
      item.cep,
      item.logradouro,
      item.numero,
      item.bairro,
      item.municipio,
      item.uf
    ].every((valor) => valor?.trim());
    if (enderecoIncompleto) {
      alertas.add("Endereço incompleto");
    }

    if (!telefoneValido(item.telefone_principal)) {
      contato.add("Telefone principal");
    }

    if (!item.email?.trim()) {
      contato.add("E-mail");
    } else if (!emailValido(item.email)) {
      contato.add("E-mail inválido");
    }

    if (!item.cpf?.trim()) {
      documentos.add("CPF");
    } else if (!validarCpf(item.cpf)) {
      documentos.add("CPF inválido");
    }

    const documentosBeneficiario = mapearDocumentosDoBeneficiario(item, configuracaoDocumentos);
    obterPendenciasDocumentos(documentosBeneficiario).forEach((pendencia) => documentos.add(pendencia));

    if (item.aceite_lgpd === false) {
      alertas.add("Aceite LGPD");
    }

    const faltouUltimoAtendimento =
      (item as Beneficiario & {
        faltou_ultimo_atendimento?: boolean;
        faltouUltimoAtendimento?: boolean;
      }).faltou_ultimo_atendimento ??
      (item as Beneficiario & {
        faltou_ultimo_atendimento?: boolean;
        faltouUltimoAtendimento?: boolean;
      }).faltouUltimoAtendimento;

    if (faltouUltimoAtendimento) {
      alertas.add("Faltou ao último atendimento");
    }

    return [
      { grupo: "Dados pessoais", itens: [...dadosPessoais] },
      { grupo: "Endereço", itens: [...endereco] },
      { grupo: "Contato", itens: [...contato] },
      { grupo: "Documentos", itens: [...documentos] },
      { grupo: "Alertas", itens: [...alertas] }
    ].filter((grupo) => grupo.itens.length > 0);
  }

  function abrirSeletorArquivoDocumento(documentoId: DocumentoCadastroId) {
    inputDocumentosRef.current[documentoId]?.click();
  }

  async function onSelecionarArquivoDocumento(
    documentoId: DocumentoCadastroId,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;

    const tipoValido = arquivo.type.startsWith("image/") || arquivo.type === "application/pdf";
    if (!tipoValido) {
      setMensagem({
        tipo: "erro",
        texto: "Envie apenas arquivos de imagem ou PDF."
      });
      return;
    }

    if (arquivo.size > documentoMaximoBytes) {
      setMensagem({
        tipo: "erro",
        texto: "O documento deve ter no máximo 10 MB."
      });
      return;
    }

    try {
      const dataUrl = await lerArquivoComoDataUrl(arquivo);
      atualizarDocumento(documentoId, {
        nomeArquivo: arquivo.name,
        caminhoArquivo: dataUrl,
        contentType: arquivo.type || "application/octet-stream",
        ignorado: false
      });
      setMensagem({ tipo: "sucesso", texto: "Documento anexado com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.message ?? "Não foi possível anexar o documento."
      });
    }
  }

  function encerrarWebcamDocumento() {
    const video = videoDocumentoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    const stream = streamDocumentoRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    streamDocumentoRef.current = null;
    setDocumentoWebcamId(null);
    setWebcamDocumentoAberta(false);
  }

  async function abrirWebcamDocumento(documentoId: DocumentoCadastroId) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMensagem({
        tipo: "erro",
        texto: "Este navegador não permite captura por webcam."
      });
      return;
    }

    setMensagem(null);
    setCarregandoWebcamDocumento(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      streamDocumentoRef.current = stream;
      setDocumentoWebcamId(documentoId);
      setWebcamDocumentoAberta(true);
    } catch {
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível acessar a webcam. Verifique as permissões."
      });
    } finally {
      setCarregandoWebcamDocumento(false);
    }
  }

  async function capturarDocumentoWebcam() {
    if (!documentoWebcamId) return;

    const documento = documentos.find((item) => item.id === documentoWebcamId);
    const video = videoDocumentoRef.current;
    if (!documento || !video || !video.videoWidth || !video.videoHeight) {
      setMensagem({
        tipo: "erro",
        texto: "A webcam ainda não está pronta para captura."
      });
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const contexto = canvas.getContext("2d");
    if (!contexto) {
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível capturar a imagem do documento."
      });
      return;
    }

    try {
      contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrlOriginal = canvas.toDataURL("image/jpeg", 0.92);
      const dataUrl = await ajustarImagemDocumentoCapturada(dataUrlOriginal);

      atualizarDocumento(documento.id, {
        nomeArquivo: `${normalizarNomeDocumento(documento.nome).replaceAll(" ", "-")}.jpg`,
        caminhoArquivo: dataUrl,
        contentType: "image/jpeg",
        ignorado: false
      });
      encerrarWebcamDocumento();
      setMensagem({ tipo: "sucesso", texto: "Documento capturado com sucesso." });
    } catch (error) {
      setMensagem({
        tipo: "erro",
        texto: extrairMensagemBeneficiario(
          error,
          "Não foi possível preparar a imagem capturada pela webcam."
        )
      });
    }
  }

  async function visualizarDocumento(documento: DocumentoCadastro) {
    if (!documento.caminhoArquivo) {
      setMensagem({ tipo: "erro", texto: "Nenhum arquivo enviado para este documento." });
      return;
    }

    let novaJanela: Window | null = null;

    try {
      novaJanela = abrirJanelaDocumento(documento.nome);
      const fonteDocumento = await prepararUrlDocumento(documento);
      novaJanela.location.replace(fonteDocumento.url);
      agendarLimpezaUrlDocumento(fonteDocumento.revoke);
    } catch (error: any) {
      novaJanela?.close();
      setMensagem({
        tipo: "erro",
        texto: error?.message ?? "Não foi possível abrir o documento."
      });
    }
  }

  async function imprimirDocumento(documento: DocumentoCadastro) {
    if (!documento.caminhoArquivo) {
      setMensagem({ tipo: "erro", texto: "Nenhum arquivo enviado para este documento." });
      return;
    }

    let novaJanela: Window | null = null;

    try {
      novaJanela = abrirJanelaDocumento(documento.nome);
      const documentoEscapado = documento.nome.replaceAll("\"", "'");
      const fonteDocumento = await prepararUrlDocumento(documento);

      if (fonteDocumento.isPdf) {
        novaJanela.document.write(`<!doctype html>
          <html>
            <head><title>${documentoEscapado}</title></head>
            <body style="margin:0">
              <iframe src="${fonteDocumento.url}" style="border:0;width:100vw;height:100vh"></iframe>
            </body>
          </html>`);
      } else {
        novaJanela.document.write(`<!doctype html>
          <html>
            <head><title>${documentoEscapado}</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff">
              <img src="${fonteDocumento.url}" alt="${documentoEscapado}" style="max-width:100%;max-height:100vh" />
            </body>
          </html>`);
      }

      novaJanela.document.close();
      window.setTimeout(() => {
        novaJanela?.focus();
        novaJanela?.print();
      }, 500);
      agendarLimpezaUrlDocumento(fonteDocumento.revoke);
    } catch (error: any) {
      novaJanela?.close();
      setMensagem({
        tipo: "erro",
        texto: error?.message ?? "Não foi possível preparar o documento para impressão."
      });
    }
  }

  function marcarIgnorarDocumento(documentoId: DocumentoCadastroId, ignorar: boolean) {
    atualizarDocumento(documentoId, {
      ignorado: ignorar,
      ...(ignorar
        ? {
            numeroDocumento: "",
            nomeArquivo: undefined,
            caminhoArquivo: undefined,
            contentType: undefined
          }
        : {})
    });
  }

  function solicitarExclusaoDocumento(documentoId: DocumentoCadastroId) {
    setPopupExcluirDocumentoId(documentoId);
  }

  function confirmarExclusaoDocumento() {
    if (!popupExcluirDocumentoId) return;
    atualizarDocumento(popupExcluirDocumentoId, {
      numeroDocumento: "",
      nomeArquivo: undefined,
      caminhoArquivo: undefined,
      contentType: undefined,
      ignorado: false
    });
    setPopupExcluirDocumentoId(null);
    setMensagem({ tipo: "sucesso", texto: "Documento excluído com sucesso." });
  }

  function selecionarTipoComprovanteEndereco(tipo: (typeof opcoesComprovanteEndereco)[number]) {
    atualizarDocumento("comprovante_endereco", {
      numeroDocumento: tipo,
      ignorado: false
    });

    if (tipo === opcaoAutoDeclaracaoResidencia) {
      setPopupDeclaracaoResidenciaAberto(true);
    }
  }

  function acaoBuscar() {
    setMensagem(null);
    setFiltros({ ...filtroDraft });
    setAbaAtiva("listagem");
  }

  async function acaoNovo() {
    encerrarWebcam();
    encerrarWebcamDocumento();
    setBeneficiarioSelecionadoId(undefined);
    setAbaAtiva("dados");
    const novaSenhaPortal = gerarSenhaPortalAcesso();
    await refetchProximoCodigo();
    reset({
      ...beneficiarioDefaultValues,
      codigo: proximoCodigoData?.codigo,
      senha_portal: novaSenhaPortal
    });
    setSenhaPortalGerada(novaSenhaPortal);
    salvarSenhaPortalNaSessao(undefined, novaSenhaPortal);
    setDocumentos(criarDocumentosPadrao(configuracaoDocumentos));
    setPopupExcluirDocumentoId(null);
    setMensagem(null);
  }

  function acaoCancelar() {
    encerrarWebcam();
    encerrarWebcamDocumento();
    if (detalhesData?.beneficiario) {
      reset(mapearBeneficiarioParaFormulario(detalhesData.beneficiario));
      setSenhaPortalGerada(lerSenhaPortalDaSessao(detalhesData.beneficiario.id_beneficiario));
      setDocumentos(mapearDocumentosDoBeneficiario(detalhesData.beneficiario, configuracaoDocumentos));
      setPopupExcluirDocumentoId(null);
      setMensagem(null);
      return;
    }
    void acaoNovo();
  }

  function acaoExcluir() {
    if (!beneficiarioSelecionadoId) {
      setMensagem({ tipo: "erro", texto: "Selecione um beneficiário para excluir." });
      return;
    }
    setPopupExcluirAberto(true);
  }

  async function confirmarExclusao() {
    if (!beneficiarioSelecionadoId) {
      setPopupExcluirAberto(false);
      setMensagem({ tipo: "erro", texto: "Selecione um beneficiário para excluir." });
      return;
    }
    try {
      await removerMutation.mutateAsync(beneficiarioSelecionadoId);
      setPopupExcluirAberto(false);
      await acaoNovo();
      setMensagem({ tipo: "sucesso", texto: "Beneficiário excluído com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o beneficiário."
      });
    }
  }

  async function abrirPdfComJanelaReservada(titulo: string, gerarBlob: () => Promise<Blob>) {
    const janela = reservarJanelaRelatorio(titulo);

    try {
      const blob = await gerarBlob();
      janela.publicar(blob);
    } catch (error) {
      janela.fechar();
      throw error;
    }
  }

  function obterBeneficiarioParaImpressao() {
    const item = detalhesData?.beneficiario;
    if (!item?.id_beneficiario) {
      setMensagem({ tipo: "erro", texto: "Selecione um beneficiário para imprimir." });
      return null;
    }
    return item;
  }

  function obterBeneficiarioContextoTermo(): Beneficiario {
    if (detalhesData?.beneficiario) {
      return detalhesData.beneficiario;
    }

    const valores = getValues();

    return {
      nome_completo: valores.nome_completo?.trim() || "Beneficiário",
      nome_social: valores.nome_social?.trim() || undefined,
      data_nascimento: valores.data_nascimento || new Date().toISOString().slice(0, 10),
      nome_mae: valores.nome_mae?.trim() || "Não informado",
      telefone_principal: valores.telefone_principal || "",
      cpf: documentos.find((documento) => documento.id === "cpf")?.numeroDocumento || "",
      cep: valores.cep || "",
      logradouro: valores.logradouro || "",
      numero: valores.numero || "",
      complemento: valores.complemento || "",
      bairro: valores.bairro || "",
      municipio: valores.municipio || "",
      uf: valores.uf || "",
      aceite_lgpd: !!valores.aceite_lgpd
    };
  }

  function montarPayloadTermoConsentimento(item: Beneficiario) {
    const valores = getValues();
    const emissor = usuario?.nome || usuario?.nomeUsuario || "Sistema G3-Next";
    const nomeBeneficiario =
      valores.nome_completo?.trim() ||
      item.nome_completo?.trim() ||
      valores.nome_social?.trim() ||
      item.nome_social?.trim() ||
      "Beneficiário";
    const cpf =
      documentos.find((documento) => documento.id === "cpf")?.numeroDocumento?.trim() ||
      valores.cpf?.trim() ||
      item.cpf?.trim();
    const rg = valores.rg_numero?.trim() || item.rg_numero?.trim();
    const logradouro = valores.logradouro?.trim() || item.logradouro?.trim() || "";
    const numero = valores.numero?.trim() || item.numero?.trim() || "";
    const complemento = valores.complemento?.trim() || item.complemento?.trim() || "";
    const bairro = valores.bairro?.trim() || item.bairro?.trim() || "";
    const cidade = valores.municipio?.trim() || item.municipio?.trim() || "";
    const uf = valores.uf?.trim() || item.uf?.trim() || "";
    const cep = valores.cep?.trim() || item.cep?.trim() || "";
    const enderecoCompleto = [logradouro, numero, complemento, bairro, cidade, uf, cep]
      .filter((valor) => valor.length > 0)
      .join(", ");
    const localAssinatura = [cidade, uf].filter((valor) => valor.length > 0).join(" - ");
    const dataAssinatura = valores.data_aceite_lgpd || new Date().toISOString().slice(0, 10);

    return {
      beneficiarioNome: nomeBeneficiario,
      rg: rg || undefined,
      cpf: cpf || undefined,
      enderecoCompleto: enderecoCompleto || undefined,
      cidade: cidade || undefined,
      uf: uf || undefined,
      cep: cep || undefined,
      finalidadeDados:
        "Atendimento socioassistencial, cadastro institucional e cumprimento de obrigações legais.",
      finalidadeImagem:
        "Registro institucional de atividades, documentação interna e divulgação em canais oficiais.",
      vigencia: "Enquanto perdurar o vínculo com os serviços prestados, salvo revogação formal.",
      localAssinatura: localAssinatura || undefined,
      dataAssinatura,
      responsavelNome: nomeBeneficiario,
      responsavelCpf: cpf || undefined,
      responsavelRelacao: "Titular dos dados",
      representanteNome: emissor,
      representanteCargo: "Representante institucional",
      issuedBy: emissor
    };
  }

  async function executarImpressaoSegura(operacao: () => Promise<void>, mensagemErroPadrao: string) {
    const agora = Date.now();
    if (agora - ultimoDisparoImpressaoRef.current < 900) return;
    ultimoDisparoImpressaoRef.current = agora;

    if (impressaoEmAndamentoRef.current) return;

    impressaoEmAndamentoRef.current = true;
    setImprimindoRelatorio(true);
    try {
      await operacao();
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? mensagemErroPadrao
      });
    } finally {
      impressaoEmAndamentoRef.current = false;
      setImprimindoRelatorio(false);
    }
  }

  async function imprimirFichaBeneficiario(item: Beneficiario) {
    await abrirPdfComJanelaReservada("Gerando ficha cadastral", () =>
      reportsService.gerarFichaBeneficiario({
        beneficiarioId: item.id_beneficiario as string,
        usuarioEmissor: usuario?.nome || usuario?.nomeUsuario || "Sistema G3-Next"
      })
    );
  }

  async function imprimirTermoConsentimento(item: Beneficiario) {
    const payload = montarPayloadTermoConsentimento(item);
    await abrirPdfComJanelaReservada("Gerando termo de consentimento", () =>
      reportsService.gerarTermoAutorizacao(payload)
    );
  }

  function acaoImprimir() {
    const item = obterBeneficiarioParaImpressao();
    if (!item) return;
    setPopupImprimirAberto(true);
  }

  async function acaoImprimirFicha() {
    const item = obterBeneficiarioParaImpressao();
    if (!item) return;

    setPopupImprimirAberto(false);
    await executarImpressaoSegura(
      async () => {
        await imprimirFichaBeneficiario(item);
      },
      "Não foi possível gerar a ficha cadastral."
    );
  }

  async function acaoImprimirTermo() {
    const item = obterBeneficiarioParaImpressao();
    if (!item) return;

    setPopupImprimirAberto(false);
    await executarImpressaoSegura(
      async () => {
        await imprimirTermoConsentimento(item);
      },
      "Não foi possível gerar o termo de consentimento."
    );
  }

  async function acaoAceiteLgpd(marcado: boolean) {
    if (!marcado) {
      setValue("data_aceite_lgpd", "", { shouldDirty: true, shouldValidate: true });
      return;
    }

    if (!getValues("data_aceite_lgpd")) {
      setValue("data_aceite_lgpd", new Date().toISOString().slice(0, 10), {
        shouldDirty: true,
        shouldValidate: true
      });
    }

    const item = obterBeneficiarioContextoTermo();

    await executarImpressaoSegura(
      async () => {
        await imprimirTermoConsentimento(item);
      },
      "Não foi possível gerar o termo de consentimento do aceite LGPD."
    );
  }

  function acaoFechar() {
    navigate("/");
  }

  function encerrarWebcam() {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    const stream = streamWebcamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    streamWebcamRef.current = null;
    setWebcamAberta(false);
  }

  async function abrirWebcam() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMensagem({
        tipo: "erro",
        texto: "Este navegador não permite captura por webcam."
      });
      return;
    }

    setMensagem(null);
    setCarregandoWebcam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      streamWebcamRef.current = stream;
      setWebcamAberta(true);
    } catch {
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível acessar a webcam. Verifique as permissões."
      });
    } finally {
      setCarregandoWebcam(false);
    }
  }

  async function definirFotoPorDataUrl(dataUrl: string) {
    const fotoTratada = await ajustarParaFotoQuatroPorTres(dataUrl);
    setValue("foto_3x4", fotoTratada, { shouldDirty: true, shouldValidate: true });
  }

  async function onSelecionarArquivoFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setMensagem({ tipo: "erro", texto: "Selecione um arquivo de imagem válido." });
      return;
    }

    if (arquivo.size > fotoMaximaBytes) {
      setMensagem({
        tipo: "erro",
        texto: "A foto deve ter no máximo 5 MB."
      });
      return;
    }

    try {
      const dataUrl = await lerArquivoComoDataUrl(arquivo);
      await definirFotoPorDataUrl(dataUrl);
      setMensagem({ tipo: "sucesso", texto: "Foto 4x3 atualizada com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.message ?? "Não foi possível processar a foto enviada."
      });
    }
  }

  async function capturarFotoWebcam() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setMensagem({
        tipo: "erro",
        texto: "A webcam ainda não esta pronta para captura."
      });
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = fotoLarguraPx;
    canvas.height = fotoAlturaPx;
    const contexto = canvas.getContext("2d");

    if (!contexto) {
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível capturar a imagem da webcam."
      });
      return;
    }

    // Captura sem recorte: mantém toda a imagem visível dentro do quadro 4x3.
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, fotoLarguraPx, fotoAlturaPx);

    const escala = Math.min(fotoLarguraPx / video.videoWidth, fotoAlturaPx / video.videoHeight);
    const larguraRender = video.videoWidth * escala;
    const alturaRender = video.videoHeight * escala;
    const destinoX = (fotoLarguraPx - larguraRender) / 2;
    const destinoY = (fotoAlturaPx - alturaRender) / 2;

    contexto.drawImage(video, destinoX, destinoY, larguraRender, alturaRender);

    try {
      await definirFotoPorDataUrl(canvas.toDataURL("image/jpeg", 0.92));
      encerrarWebcam();
      setMensagem({ tipo: "sucesso", texto: "Foto capturada com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.message ?? "Não foi possível concluir a captura da foto."
      });
    }
  }

  function removerFoto() {
    setValue("foto_3x4", "", { shouldDirty: true, shouldValidate: true });
    setMensagem(null);
  }

  function abrirEnderecoNoGoogleMaps() {
    const partesEndereco = [
      logradouroAtual,
      numeroAtual,
      bairroAtual,
      municipioAtual,
      ufAtual,
      cepAtual
    ]
      .map((valor) => valor.trim())
      .filter((valor) => valor.length > 0);

    if (partesEndereco.length === 0) {
      setMensagem({
        tipo: "erro",
        texto: "Preencha o endereço antes de abrir no Google Maps."
      });
      return;
    }

    const query = encodeURIComponent(partesEndereco.join(", "));
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function acaoSalvar() {
    void onSubmit();
  }

  const acoes: AcaoCrud[] = [
    { label: "Buscar", onClick: acaoBuscar, variant: "outline", icon: Search },
    { label: "Novo", onClick: () => void acaoNovo(), variant: "outline", icon: Plus },
    { label: "Salvar", onClick: acaoSalvar, variant: "default", icon: Save },
    { label: "Cancelar", onClick: acaoCancelar, variant: "outline", icon: Undo2 },
    { label: "Excluir", onClick: () => void acaoExcluir(), variant: "danger", icon: Trash2 },
    { label: "Imprimir", onClick: () => void acaoImprimir(), variant: "outline", icon: Printer },
    { label: "Fechar", onClick: acaoFechar, variant: "outline", icon: X }
  ];

  const acoesNaOrdemPadrao = ordemAcoesCrudPadrao
    .map((label) => acoes.find((acao) => acao.label === label))
    .filter((acao): acao is AcaoCrud => !!acao);

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <section className={classesTelaPadraoBeneficiario.barraAcoes} data-print="toolbar">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
              Cadastros em geral
            </p>
            <h1 className="text-sm font-semibold tracking-tight text-[var(--g3-foreground)] sm:text-base">
              {tituloTela}
            </h1>
          </div>

          <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
            {acoesNaOrdemPadrao.map((acao) => (
              <Button
                key={acao.label}
                type="button"
                variant={acao.variant}
                size="sm"
                className={classesTelaPadraoBeneficiario.botaoAcao}
                onClick={acao.onClick}
                disabled={bloqueadoAcao || (acao.label === "Excluir" && !beneficiarioSelecionadoId)}
              >
                <acao.icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {acao.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <div className={classesTelaPadraoBeneficiario.gradePrincipal} data-print="layout-grid">
        <Card className={classesTelaPadraoBeneficiario.cardAbas} data-print="tabs">
          <CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>
            {abas.map((aba, indice) => (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaAtiva(aba.id)}
                className={classeBotaoAbaLateral(abaAtiva === aba.id)}
                >
                <span
                  className={classeNumeroAbaLateral(abaAtiva === aba.id)}
                  aria-hidden="true"
                >
                  {indice + 1}
                </span>
                <span>{aba.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
          <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
            <div className={classesTelaPadraoBeneficiario.tituloAba}>
              <IconeAbaAtiva className="h-4 w-4" aria-hidden="true" />
              <CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>
                {abaAtiva === "listagem" ? "Listagem" : tituloAbaAtiva}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {detalhesData?.beneficiario?.status && (
                <Badge variant={statusVariant(detalhesData.beneficiario.status)}>
                  {formatarStatus(detalhesData.beneficiario.status)}
                </Badge>
              )}
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1">
                <span className="text-xs font-bold text-emerald-900">Senha do portal</span>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    const novaSenha = gerarSenhaPortalAcesso();
                    setValue("senha_portal", novaSenha, {
                      shouldDirty: true,
                      shouldValidate: true
                    });
                    setSenhaPortalGerada(novaSenha);
                  }}
                >
                  Gerar
                </Button>
                {senhaPortalGerada ? (
                  <Badge
                    variant="default"
                    className="h-8 rounded-md border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold tracking-[0.16em] text-emerald-900"
                  >
                    {senhaPortalGerada}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-900">Código do beneficiário</span>
                <Badge
                  variant={classesTelaPadraoBeneficiario.badgeCodigo}
                  className="rounded-md border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-sm font-bold tracking-[0.12em] text-emerald-800 shadow-sm"
                >
                  {detalhesData?.beneficiario?.codigo ?? proximoCodigoData?.codigo ?? "---"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {abaAtiva === "listagem" ? (
              <section className="flex h-[calc(100vh-250px)] min-h-[420px] flex-col gap-4 overflow-hidden">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-12">
                  <div className="sm:col-span-2 lg:col-span-4">
                    <Label>Nome</Label>
                    <Input
                      className="h-8 text-xs"
                      value={filtroDraft.nome ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, nome: event.target.value }))
                      }
                      placeholder="Buscar por nome"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>Código</Label>
                    <Input
                      className="h-8 text-xs"
                      value={filtroDraft.codigo ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, codigo: event.target.value }))
                      }
                      placeholder="0001"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>CPF</Label>
                    <Input
                      className="h-8 text-xs"
                      value={filtroDraft.cpf ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, cpf: event.target.value }))
                      }
                      placeholder="00000000000"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>Status</Label>
                    <Select
                      className="h-8 text-xs"
                      value={filtroDraft.status ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, status: event.target.value }))
                      }
                    >
                      <option value="">Todos</option>
                      {beneficiarioStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {formatarStatus(status)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="lg:col-span-2">
                    <Label>Nascimento</Label>
                    <Input
                      className="h-8 text-xs"
                      type="date"
                      value={filtroDraft.data_nascimento ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, data_nascimento: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  onClick={() =>
                    setFiltroDraft({
                      nome: "",
                      codigo: "",
                      cpf: "",
                      status: "",
                      data_nascimento: ""
                    })
                  }
                >
                  Limpar filtros
                </Button>

                <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200">
                  {carregandoLista ? (
                    <p className="p-3 text-sm text-slate-500">Carregando beneficiários...</p>
                  ) : beneficiarios.length === 0 ? (
                    <p className="p-3 text-sm text-slate-500">Nenhum beneficiário encontrado.</p>
                  ) : (
                        <table className="w-full text-left text-sm">
                          <thead className="bg-emerald-100 text-xs text-emerald-900">
                            <tr>
                              <th className="px-2 py-2">{renderCabecalhoOrdenavel("codigo", "Código")}</th>
                              <th className="px-2 py-2">{renderCabecalhoOrdenavel("nome_completo", "Nome")}</th>
                              <th className="px-2 py-2">{renderCabecalhoOrdenavel("data_nascimento", "Data de nascimento")}</th>
                              <th className="px-2 py-2">{renderCabecalhoOrdenavel("cpf", "CPF")}</th>
                              <th className="px-2 py-2">{renderCabecalhoOrdenavel("telefone_principal", "Telefone")}</th>
                              <th className="px-2 py-2">{renderCabecalhoOrdenavel("bairro", "Bairro")}</th>
                              <th className="px-2 py-2">{renderCabecalhoOrdenavel("status", "Status")}</th>
                            </tr>
                          </thead>
                      <tbody>
                        {beneficiarios.map((item, indice) => (
                          <tr
                            key={item.id_beneficiario}
                            className={`cursor-pointer border-t border-[var(--g3-border)] hover:bg-[var(--g3-primary-soft-hover)] ${
                              item.id_beneficiario === beneficiarioSelecionadoId
                                ? "bg-[var(--g3-primary-soft-hover)]"
                                : indice % 2 === 0
                                  ? "bg-[var(--g3-card)]"
                                  : "bg-[var(--g3-card-soft)]"
                            }`}
                            onClick={() => {
                              exibirAvisoPendenciasAoCarregarRef.current = true;
                              setBeneficiarioSelecionadoId(item.id_beneficiario);
                              setAbaAtiva("dados");
                            }}
                          >
                            <td className="px-2 py-2">{item.codigo ?? "---"}</td>
                            <td className="px-2 py-2">{item.nome_completo}</td>
                            <td className="px-2 py-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span>{formatarDataIso(item.data_nascimento)}</span>
                                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                                  {calcularIdade(item.data_nascimento)}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2">{item.cpf ?? "---"}</td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {formatarTelefone(item.telefone_principal)}
                            </td>
                            <td className="px-2 py-2">{item.bairro ?? "---"}</td>
                            <td className="px-2 py-2">
                              <Badge variant={statusVariant(item.status)}>
                                {formatarStatus(item.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

              </section>
            ) : (
              <form className="min-w-0 space-y-4" onSubmit={onSubmit}>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950" role="note">
                  <p className="font-semibold">Para salvar o cadastro, preencha os dados principais obrigatórios:</p>
                  <p className="mt-1">Nome completo, data de nascimento, nome da mãe, CEP, telefone principal, CPF, documentos obrigatórios e aceite da LGPD.</p>
                  <p className="mt-1 text-xs">Ao clicar em Salvar, o sistema levará você automaticamente ao primeiro campo pendente. Depois de preencher, clique novamente em Salvar para avançar ao próximo.</p>
                </div>
                {abaAtiva === "dados" && (
                  <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-12 [&_button]:h-8 [&_input]:h-8 [&_label]:text-xs [&_select]:h-8">
                    <input type="hidden" {...register("foto_3x4")} />
                    <div className="sm:col-span-2 xl:col-span-12 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <div className="mx-auto flex w-28 md:mx-0">
                          <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md border border-emerald-200 bg-white">
                            {foto3x4PreviewUrl ? (
                              <img
                                src={foto3x4PreviewUrl}
                                alt="Foto 4x3 do beneficiário"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="px-2 text-center text-xs font-medium text-slate-500">
                                Foto 4x3
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 space-y-2">
                          <Label>Foto 4x3 do beneficiário</Label>
                          <input
                            ref={inputArquivoRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onSelecionarArquivoFoto}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => inputArquivoRef.current?.click()}
                            >
                              Enviar foto
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void abrirWebcam()}
                              disabled={carregandoWebcam}
                            >
                              {carregandoWebcam ? "Abrindo webcam..." : "Capturar pela webcam"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={removerFoto}
                              disabled={!foto3x4Atual}
                            >
                              Remover foto
                            </Button>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            A foto será ajustada automaticamente no formato 4x3.
                          </p>
                        </div>

                        <div className="flex flex-col gap-3 md:ml-auto md:flex-row md:items-end">
                          <div className="w-28 rounded-md border border-emerald-200 bg-white px-2 py-1 text-center md:self-center">
                            <p className="text-[10px] font-medium text-emerald-700">Idade</p>
                            <p className="text-xs font-semibold text-slate-900">
                              {idadeAtual === "---" ? "Informe a data" : idadeAtual}
                            </p>
                          </div>

                          <input type="hidden" {...register("senha_portal")} />
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2 xl:col-span-7">
                      <Label>Nome completo*</Label>
                      <Input {...register("nome_completo")} onBlurCapture={() => aplicarFormatacaoCampo("nome_completo")} />
                      {errors.nome_completo && (
                        <p className="mt-1 text-xs text-red-600">{errors.nome_completo.message}</p>
                      )}
                    </div>
                    <div className="xl:col-span-5">
                      <Label>Status</Label>
                      <Select {...register("status")}>
                        {beneficiarioStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {formatarStatus(status)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="xl:col-span-4">
                      <Label>Nome social</Label>
                      <Input {...register("nome_social")} onBlurCapture={() => aplicarFormatacaoCampo("nome_social")} />
                    </div>
                    <div className="xl:col-span-4">
                      <Label>Apelido</Label>
                      <Input {...register("apelido")} onBlurCapture={() => aplicarFormatacaoCampo("apelido")} />
                    </div>
                    <div className="xl:col-span-4">
                      <Label>Data de nascimento*</Label>
                      <Input
                        type="date"
                        className="[color-scheme:light]"
                        {...register("data_nascimento")}
                      />
                      {errors.data_nascimento && (
                        <p className="mt-1 text-xs text-red-600">{errors.data_nascimento.message}</p>
                      )}
                    </div>
                    <div className="xl:col-span-4">
                      <Label>Sexo</Label>
                      <Select {...register("sexo_biologico")}>
                        <option value="">Selecione</option>
                        <option value="FEMININO">Feminino</option>
                        <option value="MASCULINO">Masculino</option>
                        <option value="OUTRO">Outro</option>
                        <option value="NAO_INFORMADO">Não informado</option>
                      </Select>
                    </div>
                    <div className="xl:col-span-4">
                      <Label>Raça/cor</Label>
                      <Select {...register("cor_raca")}>
                        <option value="">Selecione</option>
                        <option value="BRANCA">Branca</option>
                        <option value="PRETA">Preta</option>
                        <option value="PARDA">Parda</option>
                        <option value="AMARELA">Amarela</option>
                        <option value="INDIGENA">Indígena</option>
                        <option value="NAO_INFORMADA">Não informada</option>
                      </Select>
                    </div>
                    <div className="xl:col-span-4">
                      <Label>Estado civil</Label>
                      <Select {...register("estado_civil")}>
                        <option value="">Selecione</option>
                        <option value="SOLTEIRO">Solteiro(a)</option>
                        <option value="CASADO">Casado(a)</option>
                        <option value="UNIAO_ESTAVEL">União estável</option>
                        <option value="DIVORCIADO">Divorciado(a)</option>
                        <option value="VIUVO">Viúvo(a)</option>
                      </Select>
                    </div>
                    <div className="xl:col-span-5">
                      <Label>Nacionalidade</Label>
                      <Input {...register("nacionalidade")} onBlurCapture={() => aplicarFormatacaoCampo("nacionalidade")} />
                    </div>
                    <div className="xl:col-span-5">
                      <Label>Naturalidade (cidade)</Label>
                      <Input
                        {...register("naturalidade_cidade")}
                        onBlurCapture={() => aplicarFormatacaoCampo("naturalidade_cidade")}
                      />
                    </div>
                    <div className="xl:col-span-2">
                      <Label>Naturalidade (UF)</Label>
                      <Input maxLength={2} {...register("naturalidade_uf")} />
                    </div>
                    <div className="xl:col-span-6">
                      <Label>Nome da mãe*</Label>
                      <Input {...register("nome_mae")} onBlurCapture={() => aplicarFormatacaoCampo("nome_mae")} />
                      {errors.nome_mae && (
                        <p className="mt-1 text-xs text-red-600">{errors.nome_mae.message}</p>
                      )}
                    </div>
                    <div className="xl:col-span-6">
                      <Label>Nome do pai</Label>
                      <Input {...register("nome_pai")} onBlurCapture={() => aplicarFormatacaoCampo("nome_pai")} />
                    </div>
                  </section>
                )}

                {abaAtiva === "endereco" && (
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                    <div className="xl:col-span-3">
                      <Label>CEP*</Label>
                      <Input
                        {...campoCep}
                        className="h-9"
                        maxLength={9}
                        placeholder="00000-000"
                        onChange={(event) => {
                          event.target.value = formatarCep(event.target.value);
                          campoCep.onChange(event);
                        }}
                        onBlur={(event) => {
                          event.target.value = formatarCep(event.target.value);
                          campoCep.onBlur(event);
                        }}
                      />
                      {carregandoCep && (
                        <p className="mt-1 text-xs text-emerald-700">Consultando CEP...</p>
                      )}
                      {errors.cep && <p className="mt-1 text-xs text-red-600">{errors.cep.message}</p>}
                    </div>
                    <div className="xl:col-span-2">
                      <Label>Zona</Label>
                      <Select {...register("zona")} className="h-9">
                        <option value="URBANA">Urbana</option>
                        <option value="RURAL">Rural</option>
                      </Select>
                    </div>
                    <div className="xl:col-span-3">
                      <Label>Subzona</Label>
                      <Select {...register("subzona")} className="h-9">
                        <option value="">Selecione</option>
                        {subzonaEnderecoOptions.map((subzona) => (
                          <option key={subzona.value} value={subzona.value}>
                            {subzona.label}
                          </option>
                        ))}
                        {subzonaAtual &&
                          !subzonaEnderecoOptions.some((subzona) => subzona.value === subzonaAtual) && (
                            <option value={subzonaAtual}>{subzonaAtual}</option>
                          )}
                      </Select>
                    </div>
                    <div className="flex items-end xl:col-span-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                        onClick={abrirEnderecoNoGoogleMaps}
                        disabled={!possuiEnderecoParaMapa}
                      >
                        <MapPinned className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Ver no Google Maps
                      </Button>
                    </div>

                    <div className="sm:col-span-2 xl:col-span-8">
                      <Label>Endereço</Label>
                      <Input
                        {...register("logradouro")}
                        className="h-9"
                        onBlurCapture={() => aplicarFormatacaoCampo("logradouro")}
                      />
                    </div>
                    <div className="xl:col-span-2">
                      <Label>Número</Label>
                      <Input {...register("numero")} className="h-9" />
                    </div>
                    <div className="xl:col-span-2">
                      <Label>Complemento</Label>
                      <Input
                        {...register("complemento")}
                        className="h-9"
                        onBlurCapture={() => aplicarFormatacaoCampo("complemento")}
                      />
                    </div>
                    <div className="xl:col-span-4">
                      <Label>Bairro</Label>
                      <Input {...register("bairro")} className="h-9" onBlurCapture={() => aplicarFormatacaoCampo("bairro")} />
                    </div>
                    <div className="xl:col-span-4">
                      <Label>Município</Label>
                      <Input
                        {...register("municipio")}
                        className="h-9"
                        onBlurCapture={() => aplicarFormatacaoCampo("municipio")}
                      />
                    </div>
                    <div className="xl:col-span-2">
                      <Label>UF</Label>
                      <Input maxLength={2} {...register("uf")} className="h-9" />
                    </div>
                    <div className="sm:col-span-2 xl:col-span-12">
                      <Label>Ponto de referência</Label>
                      <Input
                        {...register("ponto_referencia")}
                        className="h-9"
                        onBlurCapture={() => aplicarFormatacaoCampo("ponto_referencia")}
                      />
                    </div>
                  </section>
                )}

                {abaAtiva === "contato" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Telefone principal*</Label>
                      <Input
                        {...campoTelefonePrincipal}
                        inputMode="tel"
                        maxLength={15}
                        placeholder="(34) 99999-9999"
                        onChange={(event) => {
                          event.target.value = formatarTelefoneInput(event.target.value);
                          campoTelefonePrincipal.onChange(event);
                        }}
                        onBlur={(event) => {
                          event.target.value = formatarTelefoneInput(event.target.value);
                          campoTelefonePrincipal.onBlur(event);
                        }}
                      />
                      {errors.telefone_principal && (
                        <p className="mt-1 text-xs text-red-600">{errors.telefone_principal.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Telefone secundário</Label>
                      <Input
                        {...campoTelefoneSecundario}
                        inputMode="tel"
                        maxLength={15}
                        placeholder="(34) 99999-9999"
                        onChange={(event) => {
                          event.target.value = formatarTelefoneInput(event.target.value);
                          campoTelefoneSecundario.onChange(event);
                        }}
                        onBlur={(event) => {
                          event.target.value = formatarTelefoneInput(event.target.value);
                          campoTelefoneSecundario.onBlur(event);
                        }}
                      />
                      {errors.telefone_secundario && (
                        <p className="mt-1 text-xs text-red-600">{errors.telefone_secundario.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Telefone recado</Label>
                      <Input
                        {...campoTelefoneRecadoNumero}
                        inputMode="tel"
                        maxLength={15}
                        placeholder="(34) 99999-9999"
                        onChange={(event) => {
                          event.target.value = formatarTelefoneInput(event.target.value);
                          campoTelefoneRecadoNumero.onChange(event);
                        }}
                        onBlur={(event) => {
                          event.target.value = formatarTelefoneInput(event.target.value);
                          campoTelefoneRecadoNumero.onBlur(event);
                        }}
                      />
                      {errors.telefone_recado_numero && (
                        <p className="mt-1 text-xs text-red-600">{errors.telefone_recado_numero.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Nome recado</Label>
                      <Input
                        {...register("telefone_recado_nome")}
                        onBlurCapture={() => aplicarFormatacaoCampo("telefone_recado_nome")}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        {...campoEmail}
                        inputMode="email"
                        placeholder="nome@dominio.com.br"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        onChange={(event) => {
                          event.target.value = normalizarEmailDigitado(event.target.value);
                          campoEmail.onChange(event);
                        }}
                        onBlur={(event) => {
                          event.target.value = normalizarEmailDigitado(event.target.value);
                          campoEmail.onBlur(event);
                        }}
                      />
                      {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <MensagemAcoesRapidas
                        titulo="Mensagens do beneficiário"
                        destinatarioTipo="BENEFICIARIO"
                        destinatario={{
                          id: beneficiarioSelecionadoId,
                          nome: nomeCompletoAtual.trim() || undefined,
                          email:
                            typeof emailAtual === "string"
                              ? normalizarEmailDigitado(emailAtual) || undefined
                              : undefined,
                          telefone:
                            typeof telefonePrincipalAtual === "string"
                              ? formatarTelefoneInput(telefonePrincipalAtual) || undefined
                              : undefined,
                          documento: somenteDigitos(cpfAtual) || undefined,
                          detalhe: municipioAtual && ufAtual ? `${municipioAtual} / ${ufAtual}` : municipioAtual || undefined
                        }}
                        contextoExtra={{ beneficiarioId: beneficiarioSelecionadoId }}
                        onFeedback={({ tipo, texto }) =>
                          setMensagem({
                            tipo: tipo === "sucesso" ? "sucesso" : "erro",
                            texto
                          })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2 grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-3">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <Controller
                          name="permite_contato_tel"
                          control={control}
                          render={({ field }) => (
                            <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                          )}
                        />
                        Permite ligação
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <Controller
                          name="permite_contato_whatsapp"
                          control={control}
                          render={({ field }) => (
                            <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                          )}
                        />
                        Permite WhatsApp
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <Controller
                          name="permite_contato_sms"
                          control={control}
                          render={({ field }) => (
                            <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                          )}
                        />
                        Permite SMS
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <Controller
                          name="permite_contato_email"
                          control={control}
                          render={({ field }) => (
                            <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                          )}
                        />
                        Permite e-mail
                      </label>
                    </div>
                  </section>
                )}

                {abaAtiva === "social" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Composição familiar</Label>
                      <Textarea
                        {...register("composicao_familiar")}
                        onBlurCapture={() => aplicarFormatacaoCampo("composicao_familiar")}
                      />
                    </div>
                    <div>
                      <Label>Crianças/adolescentes</Label>
                      <Input
                        type="number"
                        min={0}
                        {...register("criancas_adolescentes", {
                          setValueAs: (value) => (value === "" ? undefined : Number(value))
                        })}
                      />
                    </div>
                    <div>
                      <Label>Idosos</Label>
                      <Input
                        type="number"
                        min={0}
                        {...register("idosos", {
                          setValueAs: (value) => (value === "" ? undefined : Number(value))
                        })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Situação de vulnerabilidade</Label>
                      <Textarea
                        {...register("situacao_vulnerabilidade")}
                        onBlurCapture={() => aplicarFormatacaoCampo("situacao_vulnerabilidade")}
                      />
                    </div>
                  </section>
                )}

                {abaAtiva === "escolaridade" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Nível de escolaridade</Label>
                      <Input
                        {...register("nivel_escolaridade")}
                        onBlurCapture={() => aplicarFormatacaoCampo("nivel_escolaridade")}
                      />
                    </div>
                    <div>
                      <Label>Ocupação</Label>
                      <Input {...register("ocupacao")} onBlurCapture={() => aplicarFormatacaoCampo("ocupacao")} />
                    </div>
                    <div>
                      <Label>Situação de trabalho</Label>
                      <Input
                        {...register("situacao_trabalho")}
                        onBlurCapture={() => aplicarFormatacaoCampo("situacao_trabalho")}
                      />
                    </div>
                    <div>
                      <Label>Local de trabalho</Label>
                      <Input
                        {...register("local_trabalho")}
                        onBlurCapture={() => aplicarFormatacaoCampo("local_trabalho")}
                      />
                    </div>
                    <div>
                      <Label>Renda mensal</Label>
                      <Input {...register("renda_mensal")} />
                    </div>
                    <div>
                      <Label>Fonte de renda</Label>
                      <Input {...register("fonte_renda")} onBlurCapture={() => aplicarFormatacaoCampo("fonte_renda")} />
                    </div>
                  </section>
                )}

                {abaAtiva === "saude" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <Controller
                        name="possui_deficiencia"
                        control={control}
                        render={({ field }) => (
                          <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                        )}
                      />
                      Possui deficiência
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <Controller
                        name="usa_medicacao_continua"
                        control={control}
                        render={({ field }) => (
                          <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                        )}
                      />
                      Usa medicação contínua
                    </label>
                    <div>
                      <Label>Tipo de deficiência</Label>
                      <Input
                        {...register("tipo_deficiencia")}
                        onBlurCapture={() => aplicarFormatacaoCampo("tipo_deficiencia")}
                      />
                    </div>
                    <div>
                      <Label>Serviço de saúde de referência</Label>
                      <Input
                        {...register("servico_saude_referencia")}
                        onBlurCapture={() => aplicarFormatacaoCampo("servico_saude_referencia")}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Descrição de medicação</Label>
                      <Textarea
                        {...register("descricao_medicacao")}
                        onBlurCapture={() => aplicarFormatacaoCampo("descricao_medicacao")}
                      />
                    </div>
                  </section>
                )}

                {abaAtiva === "beneficios" && (
                  <section className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                      <Controller
                        name="recebe_beneficio"
                        control={control}
                        render={({ field }) => (
                          <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                        )}
                      />
                      Recebe benefício social
                    </label>
                    <div className="sm:col-span-2">
                      <Label>Descrição dos benefícios</Label>
                      <Textarea
                        {...register("beneficios_descricao")}
                        onBlurCapture={() => aplicarFormatacaoCampo("beneficios_descricao")}
                      />
                    </div>
                    <div>
                      <Label>Valor total dos benefícios</Label>
                      <Input {...register("valor_total_beneficios")} />
                    </div>
                  </section>
                )}

                {abaAtiva === "documentos" && (
                  <section className="flex h-[calc(100vh-250px)] min-h-[420px] flex-col gap-3 overflow-hidden">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      {listarDocumentosObrigatorios(documentos).length
                        ? `${listarDocumentosObrigatorios(documentos).join(", ")} ${
                            listarDocumentosObrigatorios(documentos).length === 1 ? "é obrigatório" : "são obrigatórios"
                          }.`
                        : "Nenhum documento está marcado como obrigatório."}{" "}
                      Documentos sem envio ficam com status pendente, exceto quando marcados como
                      ignorados.
                    </div>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                      {documentos.map((documento) => {
                        const statusDocumento = obterStatusDocumento(documento);
                        const cpfInvalido =
                          documento.id === "cpf" &&
                          documento.numeroDocumento.trim().length > 0 &&
                          !validarCpf(documento.numeroDocumento);

                        return (
                          <article
                            key={documento.id}
                            className={`rounded-lg border p-3 shadow-sm ${
                              documento.obrigatorio
                                ? "border-emerald-300 bg-emerald-100/80"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <input
                              ref={(elemento) => {
                                inputDocumentosRef.current[documento.id] = elemento;
                              }}
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(event) => void onSelecionarArquivoDocumento(documento.id, event)}
                            />

                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-slate-900">
                                {documento.nome}
                                {documento.obrigatorio ? "*" : ""}
                              </h4>
                              <Badge variant={statusDocumento.variant}>{statusDocumento.texto}</Badge>
                              <span className="text-xs text-slate-500">
                                {documento.nomeArquivo
                                  ? `Arquivo: ${documento.nomeArquivo}`
                                  : "Sem arquivo enviado"}
                              </span>
                            </div>

                            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
                              <div className="space-y-2">
                                {documentoEhComprovanteEndereco(documento) ? (
                                  <div className="space-y-2">
                                    <Label>
                                      Tipo do comprovante{documento.obrigatorio ? "*" : ""}
                                    </Label>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {opcoesComprovanteEndereco.map((opcao) => (
                                        <label
                                          key={opcao}
                                          className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-xs transition ${
                                            documento.numeroDocumento === opcao
                                              ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`tipo-comprovante-${documento.id}`}
                                            checked={documento.numeroDocumento === opcao}
                                            onChange={() => selecionarTipoComprovanteEndereco(opcao)}
                                            className="mt-0.5 h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                          />
                                          <span className="leading-4">{opcao}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <Label htmlFor={`documento-numero-${documento.id}`}>
                                      Número do documento{documento.obrigatorio ? "*" : ""}
                                    </Label>
                                    <Input
                                      id={`documento-numero-${documento.id}`}
                                      value={documento.numeroDocumento}
                                      onChange={(event) =>
                                        atualizarDocumento(documento.id, {
                                          numeroDocumento: event.target.value,
                                          ignorado: false
                                        })
                                      }
                                      placeholder={
                                        documento.id === "cpf"
                                          ? "000.000.000-00"
                                          : "Informe o número do documento"
                                      }
                                    />
                                  </div>
                                )}

                                {cpfInvalido && (
                                  <p className="text-xs text-red-600">Informe um CPF válido.</p>
                                )}

                                {documento.permiteIgnorar && (
                                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                    <Checkbox
                                      checked={documento.ignorado}
                                      onChange={(event) =>
                                        marcarIgnorarDocumento(
                                          documento.id,
                                          event.target.checked
                                        )
                                      }
                                    />
                                    Ignorar documento
                                  </label>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => abrirSeletorArquivoDocumento(documento.id)}
                                >
                                  <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                  Enviar
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void abrirWebcamDocumento(documento.id)}
                                  disabled={carregandoWebcamDocumento}
                                >
                                  <Camera className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                  Webcam
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => visualizarDocumento(documento)}
                                  disabled={!documento.caminhoArquivo}
                                >
                                  <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                  Visualizar
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => imprimirDocumento(documento)}
                                  disabled={!documento.caminhoArquivo}
                                >
                                  <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                  Imprimir
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => solicitarExclusaoDocumento(documento.id)}
                                  disabled={
                                    !documento.caminhoArquivo &&
                                    !documento.numeroDocumento &&
                                    !documento.ignorado
                                  }
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                  Excluir
                                </Button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}

                {abaAtiva === "observacoes" && (
                  <section className="space-y-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <Controller
                        name="aceite_lgpd"
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            onChange={(event) => {
                              const marcado = event.target.checked;
                              field.onChange(marcado);
                              void acaoAceiteLgpd(marcado);
                            }}
                          />
                        )}
                      />
                      Aceite LGPD*
                    </label>
                    {errors.aceite_lgpd && (
                      <p className="text-xs text-red-600">{errors.aceite_lgpd.message}</p>
                    )}
                    <div>
                      <Label>Data de aceite LGPD</Label>
                      <Input type="date" {...register("data_aceite_lgpd")} />
                    </div>
                    <div>
                      <Label>Observações</Label>
                      <Textarea {...register("observacoes")} onBlurCapture={() => aplicarFormatacaoCampo("observacoes")} />
                    </div>
                  </section>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {mensagem && (
        <div
          className="fixed inset-0 z-[58] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setMensagem(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3
                className={`text-base font-semibold ${
                  mensagem.tipo === "sucesso" ? "text-emerald-800" : "text-red-700"
                }`}
              >
                {mensagem.tipo === "sucesso" ? "Confirmação" : "Atenção"}
              </h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700">{mensagem.texto}</p>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <Button type="button" onClick={() => setMensagem(null)}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {avisoPendenciasSelecao.length > 0 && (
        <div
          className="fixed inset-0 z-[59] flex items-center justify-center bg-slate-900/45 px-4 py-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setAvisoPendenciasSelecao([])}
        >
          <div
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92vh]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Aviso de pendências</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-3 text-sm text-slate-700">
                Este cadastro possui pendências ou alertas que merecem atenção:
              </p>
              <div className="space-y-4">
                {avisoPendenciasSelecao.map((grupo) => (
                  <div key={grupo.grupo} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-900">{grupo.grupo}</p>
                    <ul className="space-y-2 text-sm text-slate-700">
                      {grupo.itens.map((item) => (
                        <li key={`${grupo.grupo}-${item}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-100 px-5 py-3">
              <Button type="button" onClick={() => setAvisoPendenciasSelecao([])}>
                Ciente
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupSalvarAberto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPopupSalvarAberto(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Confirmação</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700">Salvo com sucesso</p>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <Button type="button" onClick={() => setPopupSalvarAberto(false)}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupExcluirAberto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!removerMutation.isPending) setPopupExcluirAberto(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Confirmar exclusão</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700">
                Esta ação é irreversível. Deseja continuar?
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPopupExcluirAberto(false)}
                disabled={removerMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void confirmarExclusao()}
                disabled={removerMutation.isPending}
              >
                {removerMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupImprimirAberto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!imprimindoRelatorio) {
              setPopupImprimirAberto(false);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Imprimir beneficiário</h3>
            </div>
            <div className="space-y-2 px-5 py-4">
              <p className="text-sm text-slate-700">Selecione o relatório que deseja imprimir:</p>
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void acaoImprimirFicha()}
                  disabled={imprimindoRelatorio}
                >
                  {imprimindoRelatorio ? "Gerando..." : "Imprimir Ficha Cadastral"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void acaoImprimirTermo()}
                  disabled={imprimindoRelatorio}
                >
                  {imprimindoRelatorio ? "Gerando..." : "Imprimir Termo"}
                </Button>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPopupImprimirAberto(false)}
                disabled={imprimindoRelatorio}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupDeclaracaoResidenciaAberto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPopupDeclaracaoResidenciaAberto(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Auto declaração de residência</h3>
            </div>
            <div className="space-y-4 px-5 py-4 text-sm text-slate-700">
              <p>
                A declaração de residência é o documento feito à mão pelo beneficiário para comprovar onde mora.
              </p>
              <p>
                Ela é utilizada quando o morador não possui comprovantes formais no próprio nome, como conta de luz,
                água ou contrato de aluguel.
              </p>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="font-semibold text-amber-900">Principais características</p>
                <div className="mt-2 space-y-2">
                  <p>
                    <strong>De próprio punho:</strong> deve ser escrita à mão e assinada pelo declarante.
                  </p>
                  <p>
                    <strong>Valor legal:</strong> é baseada na Lei nº 7.115/1983, que torna a declaração firmada pelo
                    interessado presumida verdadeira, sob pena de falsidade ideológica.
                  </p>
                  <p>
                    <strong>Reconhecimento de firma:</strong> em muitos casos, para ter validade, a instituição exige
                    que a assinatura seja reconhecida em cartório ou assinada digitalmente pelo gov.br.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="font-semibold text-emerald-900">A declaração deve constar</p>
                <div className="mt-2 space-y-2">
                  <p>Nome completo do declarante.</p>
                  <p>Número de RG e CPF.</p>
                  <p>Endereço completo: rua, número, bairro, cidade, estado e CEP.</p>
                  <p>Uma frase afirmando que reside no local.</p>
                  <p>Data, local e assinatura.</p>
                  <p className="font-medium text-emerald-900">Todas as informações devem ser do próprio punho.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <Button type="button" onClick={() => setPopupDeclaracaoResidenciaAberto(false)}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupExcluirDocumentoId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPopupExcluirDocumentoId(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Confirmar exclusão</h3>
            </div>
            <div className="space-y-2 px-5 py-4">
              <p className="text-sm text-slate-700">
                Esta ação é irreversível. Deseja continuar?
              </p>
              <p className="text-xs text-slate-500">
                Documento: {documentoParaExcluir?.nome ?? "Documento selecionado"}
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPopupExcluirDocumentoId(null)}
              >
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={confirmarExclusaoDocumento}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {webcamDocumentoAberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-4"
          role="dialog"
          aria-modal="true"
          onClick={encerrarWebcamDocumento}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                Capturar Documento - {documentoWebcamAtual?.nome ?? "Documento"}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={encerrarWebcamDocumento}>
                Fechar
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                <video
                  ref={videoDocumentoRef}
                  className="aspect-video w-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              </div>
              <p className="text-center text-xs text-slate-600">
                Posicione o documento no centro e clique em Capturar.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
              <Button type="button" variant="outline" onClick={encerrarWebcamDocumento}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void capturarDocumentoWebcam()}>
                Capturar
              </Button>
            </div>
          </div>
        </div>
      )}

      {webcamAberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-4"
          role="dialog"
          aria-modal="true"
          onClick={encerrarWebcam}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Capturar Foto 4x3</h3>
              <Button type="button" variant="ghost" size="sm" onClick={encerrarWebcam}>
                Fechar
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 sm:max-w-sm">
                <video
                  ref={videoRef}
                  className="aspect-[4/3] w-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              </div>
              <p className="text-center text-xs text-slate-600">
                Posicione o rosto no centro e clique em Capturar.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
              <Button type="button" variant="outline" onClick={encerrarWebcam}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void capturarFotoWebcam()}>
                Capturar
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}




