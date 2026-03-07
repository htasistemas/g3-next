import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  FileText
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
import { reportsService } from "@/services/reports.service";
import { buscarEnderecoPorCep } from "@/services/cep.service";
import type { Beneficiario, BeneficiarioFiltro, BeneficiarioStatus } from "@/types/beneficiario";
import { useAuth } from "@/hooks/use-auth";
import { somenteDigitos, validarCpf } from "@/lib/validators";
import {
  mapaCamposTextoBeneficiarioForm,
  mapaDocumentoBeneficiarioForm
} from "@/lib/text-format-config";
import { formatarTextoPorCampo, normalizarObjetoTexto } from "@/lib/text-formatter";
import { abrirRelatorioPdf } from "@/lib/report-utils";
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

const documentosConfig = [
  { id: "cpf", nome: "CPF", obrigatorio: true, permiteIgnorar: false },
  { id: "cnh", nome: "CNH", obrigatorio: false, permiteIgnorar: true },
  {
    id: "certidao_nascimento",
    nome: "Certidão de nascimento",
    obrigatorio: false,
    permiteIgnorar: true
  },
  {
    id: "certidao_casamento",
    nome: "Certidão de casamento",
    obrigatorio: false,
    permiteIgnorar: true
  },
  {
    id: "carteira_trabalho",
    nome: "Carteira de trabalho",
    obrigatorio: false,
    permiteIgnorar: true
  },
  {
    id: "titulo_eleitor",
    nome: "Título de eleitor",
    obrigatorio: false,
    permiteIgnorar: true
  },
  { id: "cartao_sus", nome: "Cartão do SUS", obrigatorio: false, permiteIgnorar: true },
  {
    id: "comprovante_endereco",
    nome: "Comprovante de endereço",
    obrigatorio: false,
    permiteIgnorar: true
  }
] as const;

const subzonaEnderecoOptions = [
  { value: "ZONA_NORTE", label: "Zona Norte" },
  { value: "ZONA_SUL", label: "Zona Sul" },
  { value: "ZONA_LESTE", label: "Zona Leste" },
  { value: "ZONA_OESTE", label: "Zona Oeste" },
  { value: "ZONA_CENTRAL", label: "Zona Central" }
] as const;

type DocumentoCadastroId = (typeof documentosConfig)[number]["id"];

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

const tituloTela = "Cadastro de beneficiários";

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
  if (!telefone) return "---";
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return telefone;
}

function criarDocumentosPadrao(): DocumentoCadastro[] {
  return documentosConfig.map((config) => ({
    id: config.id,
    nome: config.nome,
    numeroDocumento: "",
    nomeArquivo: undefined,
    caminhoArquivo: undefined,
    contentType: undefined,
    ignorado: false,
    obrigatorio: config.obrigatorio,
    permiteIgnorar: config.permiteIgnorar
  }));
}

function normalizarNomeDocumento(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function mapearDocumentosDoBeneficiario(item: Beneficiario): DocumentoCadastro[] {
  const anexosPorNome = new Map(
    (item.documentos_obrigatorios ?? []).map((doc) => [normalizarNomeDocumento(doc.nome), doc])
  );

  return criarDocumentosPadrao().map((documento) => {
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
      numeroDocumento,
      nomeArquivo: anexo?.nomeArquivo,
      caminhoArquivo: anexo?.caminhoArquivo,
      contentType: anexo?.contentType,
      ignorado: documento.permiteIgnorar ? !!anexo?.ignorado : false
    };
  });
}

function statusVariant(status?: BeneficiarioStatus) {
  switch (status) {
    case "ATIVO":
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

const fotoLarguraPx = 300;
const fotoAlturaPx = 400;
const fotoMaximaBytes = 5 * 1024 * 1024;
const documentoMaximoBytes = 10 * 1024 * 1024;

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

async function ajustarParaFotoTresPorQuatro(dataUrl: string): Promise<string> {
  const imagem = await carregarImagem(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = fotoLarguraPx;
  canvas.height = fotoAlturaPx;

  const contexto = canvas.getContext("2d");
  if (!contexto) {
    throw new Error("Não foi possível preparar a área de edição da foto.");
  }

  // Mantém a foto inteira visível (sem corte), ajustando com "contain" no quadro 3x4.
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
  const [beneficiarioSelecionadoId, setBeneficiarioSelecionadoId] = useState<string | undefined>();
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoCadastro[]>(() => criarDocumentosPadrao());
  const [popupSalvarAberto, setPopupSalvarAberto] = useState(false);
  const [popupExcluirAberto, setPopupExcluirAberto] = useState(false);
  const [popupImprimirAberto, setPopupImprimirAberto] = useState(false);
  const [imprimindoRelatorio, setImprimindoRelatorio] = useState(false);
  const [popupExcluirDocumentoId, setPopupExcluirDocumentoId] = useState<DocumentoCadastroId | null>(null);
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

  const { data: listaData, isLoading: carregandoLista } = useBeneficiarios(filtros);
  const { data: detalhesData, isLoading: carregandoDetalhes } = useBeneficiario(beneficiarioSelecionadoId);
  const { data: proximoCodigoData, refetch: refetchProximoCodigo } = useProximoCodigo();
  const salvarMutation = useSalvarBeneficiario();
  const removerMutation = useRemoverBeneficiario();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(beneficiarioFormSchema),
    defaultValues: beneficiarioDefaultValues
  });

  const foto3x4Atual = watch("foto_3x4") || "";
  const cepAtual = watch("cep") || "";
  const logradouroAtual = watch("logradouro") || "";
  const numeroAtual = watch("numero") || "";
  const bairroAtual = watch("bairro") || "";
  const municipioAtual = watch("municipio") || "";
  const ufAtual = watch("uf") || "";
  const subzonaAtual = watch("subzona") || "";
  const possuiEnderecoParaMapa = [
    logradouroAtual,
    numeroAtual,
    bairroAtual,
    municipioAtual,
    ufAtual,
    cepAtual
  ].some((valor) => valor.trim().length > 0);

  useEffect(() => {
    if (!detalhesData?.beneficiario) return;
    const item = detalhesData.beneficiario;

    reset({
      ...beneficiarioDefaultValues,
      ...item,
      status: item.status ?? "EM_ANALISE",
      aceite_lgpd: item.aceite_lgpd ?? true
    });
    setDocumentos(mapearDocumentosDoBeneficiario(item));
    setPopupExcluirDocumentoId(null);
    setMensagem(null);
    ultimoCepConsultadoRef.current = somenteDigitos(item.cep ?? "");
  }, [detalhesData, reset]);

  useEffect(() => {
    if (beneficiarioSelecionadoId) return;
    const codigo = proximoCodigoData?.codigo;
    reset({
      ...beneficiarioDefaultValues,
      codigo: codigo ?? beneficiarioDefaultValues.codigo
    });
    setDocumentos(criarDocumentosPadrao());
    setPopupExcluirDocumentoId(null);
    ultimoCepConsultadoRef.current = "";
  }, [beneficiarioSelecionadoId, proximoCodigoData, reset]);

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

  const beneficiarios = listaData?.beneficiarios ?? [];
  const abaAtual = abas.find((aba) => aba.id === abaAtiva);
  const tituloAbaAtiva = abaAtual?.label ?? tituloTela;
  const IconeAbaAtiva = abaAtual?.icon ?? ListFilter;
  const documentoParaExcluir = popupExcluirDocumentoId
    ? documentos.find((documento) => documento.id === popupExcluirDocumentoId)
    : null;
  const documentoWebcamAtual = documentoWebcamId
    ? documentos.find((documento) => documento.id === documentoWebcamId)
    : null;

  const dadosGrafico = useMemo(() => {
    const agrupado = new Map<string, number>();
    for (const item of beneficiarios) {
      const chave = item.status ?? "EM_ANALISE";
      agrupado.set(chave, (agrupado.get(chave) ?? 0) + 1);
    }
    return [...agrupado.entries()].map(([status, total]) => ({
      status: formatarStatus(status),
      total
    }));
  }, [beneficiarios]);

  const bloqueadoAcao =
    salvarMutation.isPending || removerMutation.isPending || carregandoDetalhes || imprimindoRelatorio;

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

      const documentoCpf = documentos.find((documento) => documento.id === "cpf");
      if (!documentoCpf || !validarCpf(documentoCpf.numeroDocumento)) {
        setAbaAtiva("documentos");
        setMensagem({
          tipo: "erro",
          texto: "Informe um CPF válido na aba Documentos."
        });
        return;
      }

      const documentosPayload = documentos.map((documento) => {
        const documentoNormalizado = normalizarObjetoTexto(documento, mapaDocumentoBeneficiarioForm);
        return {
          nome: String(documentoNormalizado.nome ?? documento.nome),
          numeroDocumento: documento.numeroDocumento || undefined,
          nomeArquivo: documento.nomeArquivo,
          caminhoArquivo: documento.caminhoArquivo,
          contentType: documento.contentType,
          obrigatorio: true,
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
        ...valoresNormalizados,
        id_beneficiario: beneficiarioSelecionadoId,
        codigo: valoresNormalizados.codigo || proximoCodigoData?.codigo,
        cpf: documentoCpf.numeroDocumento,
        rg_numero: "",
        rg_orgao_emissor: "",
        rg_uf: "",
        rg_data_emissao: "",
        cnh: numeroCnh || undefined,
        titulo_eleitor: numeroTituloEleitor || undefined,
        cartao_sus: numeroCartaoSus || undefined,
        certidao_tipo: undefined,
        certidao_livro: undefined,
        certidao_folha: undefined,
        certidao_termo: undefined,
        certidao_cartorio: undefined,
        certidao_municipio: undefined,
        certidao_uf: undefined,
        documentos_obrigatorios: documentosPayload,
        data_aceite_lgpd: valoresNormalizados.data_aceite_lgpd || new Date().toISOString().slice(0, 10)
      } as unknown as Beneficiario;

      try {
        const response = await salvarMutation.mutateAsync(payload);
        const id = response.beneficiario.id_beneficiario;
        setBeneficiarioSelecionadoId(id);
        setMensagem(null);
        setPopupSalvarAberto(true);
        setFiltros((prev) => ({ ...prev }));
        await refetchProximoCodigo();
      } catch (error: any) {
        setMensagem({
          tipo: "erro",
          texto: error?.response?.data?.message ?? "Não foi possível salvar o beneficiário."
        });
      }
    },
    () => {
      setAbaAtiva("dados");
      setMensagem({
        tipo: "erro",
        texto: "Preencha os campos obrigatórios antes de salvar."
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

    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    atualizarDocumento(documento.id, {
      nomeArquivo: `${normalizarNomeDocumento(documento.nome).replaceAll(" ", "-")}.jpg`,
      caminhoArquivo: dataUrl,
      contentType: "image/jpeg",
      ignorado: false
    });
    encerrarWebcamDocumento();
    setMensagem({ tipo: "sucesso", texto: "Documento capturado com sucesso." });
  }

  function visualizarDocumento(documento: DocumentoCadastro) {
    if (!documento.caminhoArquivo) {
      setMensagem({ tipo: "erro", texto: "Nenhum arquivo enviado para este documento." });
      return;
    }
    window.open(documento.caminhoArquivo, "_blank", "noopener,noreferrer");
  }

  function imprimirDocumento(documento: DocumentoCadastro) {
    if (!documento.caminhoArquivo) {
      setMensagem({ tipo: "erro", texto: "Nenhum arquivo enviado para este documento." });
      return;
    }

    const novaJanela = window.open("", "_blank");
    if (!novaJanela) {
      setMensagem({ tipo: "erro", texto: "Não foi possível abrir a visualização para impressão." });
      return;
    }

    const documentoEscapado = documento.nome.replaceAll("\"", "'");
    const isPdf =
      (documento.contentType ?? "").includes("pdf") ||
      documento.caminhoArquivo.startsWith("data:application/pdf");

    if (isPdf) {
      novaJanela.document.write(`<!doctype html>
        <html>
          <head><title>${documentoEscapado}</title></head>
          <body style="margin:0">
            <iframe src="${documento.caminhoArquivo}" style="border:0;width:100vw;height:100vh"></iframe>
          </body>
        </html>`);
    } else {
      novaJanela.document.write(`<!doctype html>
        <html>
          <head><title>${documentoEscapado}</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff">
            <img src="${documento.caminhoArquivo}" alt="${documentoEscapado}" style="max-width:100%;max-height:100vh" />
          </body>
        </html>`);
    }
    novaJanela.document.close();
    setTimeout(() => novaJanela.print(), 500);
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
    await refetchProximoCodigo();
    reset({
      ...beneficiarioDefaultValues,
      codigo: proximoCodigoData?.codigo
    });
    setDocumentos(criarDocumentosPadrao());
    setPopupExcluirDocumentoId(null);
    setMensagem(null);
  }

  function acaoCancelar() {
    encerrarWebcam();
    encerrarWebcamDocumento();
    if (detalhesData?.beneficiario) {
      reset({
        ...beneficiarioDefaultValues,
        ...detalhesData.beneficiario,
        status: detalhesData.beneficiario.status ?? "EM_ANALISE",
        aceite_lgpd: detalhesData.beneficiario.aceite_lgpd ?? true
      });
      setDocumentos(mapearDocumentosDoBeneficiario(detalhesData.beneficiario));
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

  function abrirPdfComFallback(blob: Blob) {
    try {
      abrirRelatorioPdf(blob);
    } catch {
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível abrir o relatório. Verifique se o navegador bloqueou pop-up."
      });
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
    const blob = await reportsService.gerarFichaBeneficiario({
      beneficiarioId: item.id_beneficiario as string,
      usuarioEmissor: usuario?.nome || usuario?.nomeUsuario || "Sistema G3-Next"
    });
    abrirPdfComFallback(blob);
  }

  async function imprimirTermoConsentimento(item: Beneficiario) {
    const payload = montarPayloadTermoConsentimento(item);
    const blob = await reportsService.gerarTermoAutorizacao(payload);
    abrirPdfComFallback(blob);
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

    const item = obterBeneficiarioParaImpressao();
    if (!item) return;

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
    const fotoTratada = await ajustarParaFotoTresPorQuatro(dataUrl);
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
      setMensagem({ tipo: "sucesso", texto: "Foto 3x4 atualizada com sucesso." });
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

    // Captura sem recorte: mantém toda a imagem visível dentro do quadro 3x4.
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
      <section className={classesTelaPadraoBeneficiario.barraAcoes}>
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
      </section>

      <div className={classesTelaPadraoBeneficiario.gradePrincipal}>
        <Card className={classesTelaPadraoBeneficiario.cardAbas}>
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
                {tituloAbaAtiva}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {detalhesData?.beneficiario?.status && (
                <Badge variant={statusVariant(detalhesData.beneficiario.status)}>
                  {formatarStatus(detalhesData.beneficiario.status)}
                </Badge>
              )}
              <Badge variant={classesTelaPadraoBeneficiario.badgeCodigo}>
                Código {detalhesData?.beneficiario?.codigo ?? proximoCodigoData?.codigo ?? "---"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {abaAtiva === "listagem" ? (
              <section className="space-y-4">
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

                <div className="max-h-[420px] overflow-auto rounded-md border border-slate-200">
                  {carregandoLista ? (
                    <p className="p-3 text-sm text-slate-500">Carregando beneficiários...</p>
                  ) : beneficiarios.length === 0 ? (
                    <p className="p-3 text-sm text-slate-500">Nenhum beneficiário encontrado.</p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-2 py-2">Código</th>
                          <th className="px-2 py-2">Nome</th>
                          <th className="px-2 py-2">Data de nascimento</th>
                          <th className="px-2 py-2">CPF</th>
                          <th className="px-2 py-2">Telefone</th>
                          <th className="px-2 py-2">Bairro</th>
                          <th className="px-2 py-2">Status</th>
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

                <div className="h-52 rounded-md border border-slate-200 bg-slate-50 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGrafico}>
                      <XAxis dataKey="status" hide />
                      <YAxis allowDecimals={false} width={24} />
                      <Tooltip />
                      <Bar dataKey="total" fill="var(--g3-primary)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            ) : (
              <form className="min-w-0 space-y-4" onSubmit={onSubmit}>
                {abaAtiva === "dados" && (
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                    <input type="hidden" {...register("foto_3x4")} />
                    <div className="sm:col-span-2 xl:col-span-12 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="mx-auto flex aspect-[3/4] w-36 items-center justify-center overflow-hidden rounded-md border border-emerald-200 bg-white">
                          {foto3x4Atual ? (
                            <img
                              src={foto3x4Atual}
                              alt="Foto 3x4 do beneficiário"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="px-2 text-center text-xs font-medium text-slate-500">
                              Foto 3x4
                            </span>
                          )}
                        </div>

                        <div className="flex-1 space-y-3">
                          <Label>Foto 3x4 do beneficiário</Label>
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
                              Enviar Foto
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void abrirWebcam()}
                              disabled={carregandoWebcam}
                            >
                              {carregandoWebcam ? "Abrindo Webcam..." : "Capturar Pela Webcam"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={removerFoto}
                              disabled={!foto3x4Atual}
                            >
                              Remover Foto
                            </Button>
                          </div>
                          <p className="text-xs text-slate-600">
                            A Foto Será Ajustada Automaticamente No Formato 3x4.
                          </p>
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
                        {...register("cep")}
                        className="h-9"
                        maxLength={9}
                        placeholder="00000-000"
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
                        Ver No Google Maps
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
                      <Input {...register("telefone_principal")} />
                      {errors.telefone_principal && (
                        <p className="mt-1 text-xs text-red-600">{errors.telefone_principal.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Telefone secundário</Label>
                      <Input {...register("telefone_secundario")} />
                    </div>
                    <div>
                      <Label>Telefone recado</Label>
                      <Input {...register("telefone_recado_numero")} />
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
                      <Input type="email" {...register("email")} />
                      {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
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
                  <section className="space-y-3">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      CPF é obrigatório. Documentos sem envio ficam com status pendente, exceto quando
                      marcados como ignorados.
                    </div>

                    <div className="space-y-3">
                      {documentos.map((documento) => {
                        const statusDocumento = obterStatusDocumento(documento);
                        const cpfInvalido =
                          documento.id === "cpf" &&
                          documento.numeroDocumento.trim().length > 0 &&
                          !validarCpf(documento.numeroDocumento);

                        return (
                          <article
                            key={documento.id}
                            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
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
                                {documento.id === "cpf" ? "*" : ""}
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
                                <div>
                                  <Label htmlFor={`documento-numero-${documento.id}`}>
                                    Número do documento{documento.id === "cpf" ? "*" : ""}
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
              <h3 className="text-base font-semibold text-slate-900">Capturar Foto 3x4</h3>
              <Button type="button" variant="ghost" size="sm" onClick={encerrarWebcam}>
                Fechar
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 sm:max-w-sm">
                <video
                  ref={videoRef}
                  className="aspect-[3/4] w-full object-cover"
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




