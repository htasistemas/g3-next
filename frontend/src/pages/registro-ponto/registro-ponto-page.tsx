import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import {
  ClipboardCheck,
  Search,
  Plus,
  Save,
  Undo2,
  Trash2,
  Printer,
  X,
  Fingerprint,
  CalendarDays,
  History,
  ShieldCheck,
  AlertCircle,
  MapPinned,
  ListChecks
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { obterUrlArquivoAutenticado, resolverUrlArquivo } from "@/lib/arquivos";
import { imprimirConteudoAtual, reservarJanelaRelatorio } from "@/lib/report-utils";
import { toLocalDateISO } from "@/lib/date-utils";
import {
  capturarFotoTresPorQuatroDoVideo
} from "@/lib/foto-3x4";
import { reportsService } from "@/services/reports.service";
import { registroPontoService } from "@/services/registro-ponto.service";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario
} from "@/lib/tela-padrao-beneficiario";
import {
  filtroRegistroPontoPadrao,
  registroPontoAjusteSchema,
  registroPontoHorarioTrabalhoPadrao,
  registroPontoHorarioTrabalhoSchema,
  type RegistroPontoAjusteFormInput,
  type RegistroPontoAjusteFormValues,
  type RegistroPontoHorarioTrabalhoFormInput,
  type RegistroPontoHorarioTrabalhoFormValues
} from "@/features/registro-ponto/registro-ponto.schema";
import {
  useAdicionarOcorrenciaPonto,
  useAjustarRegistroPonto,
  useCatalogoUsuariosRegistroPonto,
  useConfiguracaoHoraExtraRegistroPonto,
  useConfiguracaoRegistroPonto,
  useDecidirHoraExtraRegistroPonto,
  useEspelhoPonto,
  useFaceRegistroPonto,
  useHistoricoRegistroPonto,
  useHorasExtrasRegistroPonto,
  useMarcarPonto,
  useRegistrosPonto,
  useRegistrarCienciaHoraExtraRegistroPonto,
  useRelatorioMensalHoraExtraRegistroPonto,
  useSalvarFaceRegistroPonto,
  useSalvarConfiguracaoHoraExtraRegistroPonto,
  useSalvarConfiguracaoRegistroPonto
} from "@/features/registro-ponto/use-registro-ponto";
import type {
  RegistroPontoFiltro,
  RegistroPontoItem,
  RegistroPontoHoraExtraConfiguracao,
  RegistroPontoHoraExtraItem,
  RegistroPontoHoraExtraPendencia,
  RegistroPontoHoraExtraResumo,
  RegistroPontoOcorrenciaTipo,
  RegistroPontoStatus
} from "@/types/registro-ponto";

const abas = [
  { id: "listagem", label: "Listagem", icon: Search },
  { id: "marcacao", label: "Registrar ponto", icon: Fingerprint },
  { id: "cadastro-face", label: "Cadastro facial", icon: Fingerprint },
  { id: "espelho", label: "Espelho de ponto", icon: CalendarDays },
  { id: "ocorrencias", label: "Ocorrências", icon: AlertCircle },
  { id: "historico", label: "Histórico", icon: History },
  { id: "ajuste", label: "Ajuste administrativo", icon: ShieldCheck },
  { id: "hora-extra", label: "Aprovação de horas extras", icon: ListChecks }
] as const;

type AbaRegistroPonto = (typeof abas)[number]["id"];

const tiposOcorrenciaOptions: RegistroPontoOcorrenciaTipo[] = [
  "AJUSTE_MANUAL",
  "ATRASO",
  "FALTA",
  "HORA_EXTRA",
  "BANCO_HORAS",
  "ESQUECIMENTO_BATIDA",
  "INCONSISTENCIA_SEQUENCIA",
  "CORRECAO_ADMINISTRATIVA",
  "OBSERVACAO_OPERACIONAL"
];

const tituloTela = "Registro de ponto";
const secaoTela = "Recursos humanos";

function normalizarAbaRegistroPonto(valor: string | null | undefined): AbaRegistroPonto {
  if (abas.some((aba) => aba.id === valor)) {
    return valor as AbaRegistroPonto;
  }
  return "listagem";
}

function formatarData(valor?: string) {
  if (!valor) return "---";
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(valor?: string) {
  if (!valor) return "---";
  const parsed = new Date(valor);
  if (Number.isNaN(parsed.getTime())) return valor;
  return parsed.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  });
}

function formatarHora(valor?: string) {
  if (!valor) return "--:--";
  return valor.slice(0, 5);
}

function resolverPreviewFace(valor?: string) {
  if (!valor) return "";
  if (valor.startsWith("data:") || valor.startsWith("blob:")) {
    return valor;
  }
  return resolverUrlArquivo(valor);
}

function obterPreviewFaceAtual(args: {
  modoFace: "cadastro" | "confirmacao";
  rascunhoFaceCadastro: string;
  confirmacaoFaceImagem: string;
  faceUrl?: string;
}) {
  if (args.modoFace === "cadastro") {
    return args.rascunhoFaceCadastro || args.faceUrl || "";
  }
  return args.confirmacaoFaceImagem || "";
}

function esperar(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const intervaloPiscadaMs = 180;
const duracaoMaximaPiscadaMs = 4200;
const variacaoMinimaPiscada = 5.5;
const variacaoMinimaMovimentoRosto = 9;

function capturarAmostraOlhosDoVideo(video: HTMLVideoElement) {
  const largura = 160;
  const altura = 120;
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d", { willReadFrequently: true });

  if (!contexto) {
    throw new Error("Não foi possível analisar a imagem da webcam.");
  }

  contexto.drawImage(video, 0, 0, largura, altura);

  const origemX = Math.round(largura * 0.22);
  const origemY = Math.round(altura * 0.18);
  const larguraRecorte = Math.round(largura * 0.56);
  const alturaRecorte = Math.round(altura * 0.24);

  return contexto.getImageData(origemX, origemY, larguraRecorte, alturaRecorte).data;
}

function capturarAmostraRostoDoVideo(video: HTMLVideoElement) {
  const largura = 180;
  const altura = 180;
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d", { willReadFrequently: true });

  if (!contexto) {
    throw new Error("Não foi possível analisar a posição do rosto na webcam.");
  }

  contexto.drawImage(video, 0, 0, largura, altura);

  const origemX = Math.round(largura * 0.2);
  const origemY = Math.round(altura * 0.16);
  const larguraRecorte = Math.round(largura * 0.6);
  const alturaRecorte = Math.round(altura * 0.68);

  return contexto.getImageData(origemX, origemY, larguraRecorte, alturaRecorte).data;
}

function calcularVariacaoMedia(amostraInicial: Uint8ClampedArray, amostraFinal: Uint8ClampedArray) {
  const tamanho = Math.min(amostraInicial.length, amostraFinal.length);
  if (!tamanho) return 0;

  let diferencaTotal = 0;

  for (let indice = 0; indice < tamanho; indice += 4) {
    const cinzaInicial =
      amostraInicial[indice] * 0.299 +
      amostraInicial[indice + 1] * 0.587 +
      amostraInicial[indice + 2] * 0.114;
    const cinzaFinal =
      amostraFinal[indice] * 0.299 +
      amostraFinal[indice + 1] * 0.587 +
      amostraFinal[indice + 2] * 0.114;

    diferencaTotal += Math.abs(cinzaInicial - cinzaFinal);
  }

  return diferencaTotal / Math.max(tamanho / 4, 1);
}

function calcularAssimetriaHorizontal(amostra: Uint8ClampedArray) {
  if (!amostra.length) return 0;

  let somaEsquerda = 0;
  let somaDireita = 0;
  let pixelsEsquerda = 0;
  let pixelsDireita = 0;
  const totalPixels = amostra.length / 4;
  const metadePixels = Math.floor(totalPixels / 2);

  for (let indice = 0; indice < amostra.length; indice += 4) {
    const cinza =
      amostra[indice] * 0.299 +
      amostra[indice + 1] * 0.587 +
      amostra[indice + 2] * 0.114;
    const pixelIndex = indice / 4;

    if (pixelIndex < metadePixels) {
      somaEsquerda += cinza;
      pixelsEsquerda += 1;
    } else {
      somaDireita += cinza;
      pixelsDireita += 1;
    }
  }

  const mediaEsquerda = somaEsquerda / Math.max(pixelsEsquerda, 1);
  const mediaDireita = somaDireita / Math.max(pixelsDireita, 1);
  return Math.abs(mediaEsquerda - mediaDireita);
}

function formatarMinutos(totalMinutos?: number) {
  const valor = Math.round(Number(totalMinutos ?? 0));
  const sinal = valor < 0 ? "-" : "";
  const absoluto = Math.abs(valor);
  const horas = Math.floor(absoluto / 60);
  const minutos = absoluto % 60;
  return `${sinal}${horas}h ${String(minutos).padStart(2, "0")}m`;
}

function formatarMediaMinutos(totalMinutos?: number, base?: number) {
  const divisor = Number(base ?? 0);
  if (!divisor) return "---";
  return formatarMinutos(Math.round(Number(totalMinutos ?? 0) / divisor));
}

function rotuloOcorrenciaEspelho(valor: string) {
  const normalizado = valor.trim().toUpperCase();
  if (normalizado === "ATRASO") return "Atraso";
  if (normalizado === "FALTA") return "Falta";
  if (normalizado === "HORA_EXTRA") return "Hora extra";
  if (normalizado === "BANCO_HORAS") return "Banco de horas";
  if (normalizado === "ESQUECIMENTO_BATIDA") return "Esquecimento";
  if (normalizado === "INCONSISTENCIA_SEQUENCIA") return "Inconsistência";
  if (normalizado === "CORRECAO_ADMINISTRATIVA") return "Correção";
  if (normalizado === "AJUSTE_MANUAL") return "Ajuste manual";
  if (normalizado === "OBSERVACAO_OPERACIONAL") return "Observação";
  return valor.replaceAll("_", " ");
}

function classeOcorrenciaEspelho(valor: string) {
  const normalizado = valor.trim().toUpperCase();
  if (normalizado === "HORA_EXTRA" || normalizado === "BANCO_HORAS") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalizado === "ATRASO" || normalizado === "FALTA") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalizado === "INCONSISTENCIA_SEQUENCIA") return "border-sky-200 bg-sky-50 text-sky-700";
  if (normalizado === "ESQUECIMENTO_BATIDA" || normalizado === "OBSERVACAO_OPERACIONAL") return "border-slate-200 bg-slate-100 text-slate-600";
  if (normalizado === "CORRECAO_ADMINISTRATIVA" || normalizado === "AJUSTE_MANUAL") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function formatarOcorrenciasEspelho(item: RegistroPontoItem) {
  const houveJornadaCompleta =
    !!item.entrada_1 && !!item.saida_1 && !!item.entrada_2 && !!item.saida_2;
  const semDesviosRelevantes =
    item.atrasos_minutos === 0 &&
    item.horas_extras_minutos === 0 &&
    item.banco_horas_minutos === 0 &&
    item.faltas_minutos === 0 &&
    !item.ocorrencias.length;

  if (houveJornadaCompleta && semDesviosRelevantes) {
    return [{ rotulo: "Lançado corretamente", classe: "border-emerald-200 bg-emerald-50 text-emerald-700" }];
  }

  if (item.ocorrencias.length) {
    return item.ocorrencias.map((ocorrencia) => ({
      rotulo: rotuloOcorrenciaEspelho(ocorrencia),
      classe: classeOcorrenciaEspelho(ocorrencia)
    }));
  }

  return [{ rotulo: "Sem ocorrência registrada", classe: "border-slate-200 bg-slate-100 text-slate-600" }];
}

function extrairNumero(valor: unknown) {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string" && valor.trim()) {
    const parsed = Number(valor);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

type LocalizacaoHistoricoMapa = {
  latitude: number;
  longitude: number;
  accuracy_metros?: number;
  acao: string;
  usuario?: string;
  criadoEm?: string;
};

function extrairLocalizacaoHistorico(item: {
  dados_depois?: Record<string, unknown>;
  acao?: string;
  usuario_nome?: string;
  criado_em?: string;
}): LocalizacaoHistoricoMapa | undefined {
  const origem = item.dados_depois ?? {};
  const latitude = extrairNumero(origem.latitude);
  const longitude = extrairNumero(origem.longitude);
  const accuracy = extrairNumero(origem.accuracy_metros);

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return undefined;
  }

  return {
    latitude,
    longitude,
    accuracy_metros: typeof accuracy === "number" ? accuracy : undefined,
    acao: item.acao ?? "Acao",
    usuario: item.usuario_nome,
    criadoEm: item.criado_em
  };
}

function formatarLocalizacaoHistorico(item: {
  dados_depois?: Record<string, unknown>;
  acao?: string;
  usuario_nome?: string;
  criado_em?: string;
}) {
  const dadosDepois = item.dados_depois ?? {};
  const origem = extrairLocalizacaoHistorico(item);

  if (origem) {
    const texto = `Lat ${origem.latitude.toFixed(5)}, Lon ${origem.longitude.toFixed(5)}`;
    if (typeof origem.accuracy_metros === "number") {
      return `${texto} (+/-${Math.round(origem.accuracy_metros)} m)`;
    }
    return texto;
  }

  const localizacaoStatus =
    typeof dadosDepois.localizacao_status === "string" ? dadosDepois.localizacao_status : undefined;

  if (item.acao === "MARCACAO" || dadosDepois.localizacao_obtida === false) {
    if (localizacaoStatus === "instituicao_sem_coordenadas") {
      return "Localização da instituição não configurada";
    }
    if (localizacaoStatus?.includes("nao_obtida")) {
      return "Localização não obtida";
    }
    return "Localização não registrada";
  }

  return undefined;
}

function badgeStatusClasse(status: RegistroPontoStatus) {
  if (status === "COMPLETO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

async function capturarLocalizacaoAtual() {
  if (!("geolocation" in navigator)) {
    return undefined;
  }

  return new Promise<{ latitude: number; longitude: number; accuracy_metros: number } | undefined>((resolve) => {
    const timeout = window.setTimeout(() => resolve(undefined), 4500);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeout);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy_metros: position.coords.accuracy
        });
      },
      () => {
        window.clearTimeout(timeout);
        resolve(undefined);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 4000
      }
    );
  });
}

export function RegistroPontoPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { usuario } = useAuth();

  const isAdmin = (usuario?.permissoes ?? []).includes("ADMINISTRADOR");

  const [abaAtiva, setAbaAtiva] = useState<AbaRegistroPonto>(() => normalizarAbaRegistroPonto(searchParams.get("aba")));
  const [filtroDraft, setFiltroDraft] = useState<RegistroPontoFiltro>({ ...filtroRegistroPontoPadrao });
  const [filtros, setFiltros] = useState<RegistroPontoFiltro>({ ...filtroRegistroPontoPadrao });
  const [filtroHoraExtraDraft, setFiltroHoraExtraDraft] = useState<Record<string, string>>({});
  const [filtrosHoraExtra, setFiltrosHoraExtra] = useState<Record<string, string>>({});
  const [registroSelecionadoId, setRegistroSelecionadoId] = useState<string | undefined>();
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [popupMarcarAberto, setPopupMarcarAberto] = useState(false);
  const [popupCienciaHoraExtraAberto, setPopupCienciaHoraExtraAberto] = useState(false);
  const [popupAjusteAberto, setPopupAjusteAberto] = useState(false);
  const [popupFaceAberto, setPopupFaceAberto] = useState(false);
  const [modoFace, setModoFace] = useState<"cadastro" | "confirmacao">("cadastro");
  const [modoConfirmacaoMarcacao, setModoConfirmacaoMarcacao] = useState<"senha" | "face">("senha");
  const [modoConfirmacaoAjuste, setModoConfirmacaoAjuste] = useState<"senha" | "face">("senha");
  const [localizacaoHistoricoSelecionada, setLocalizacaoHistoricoSelecionada] = useState<LocalizacaoHistoricoMapa | null>(null);
  const [pendenciaHoraExtra, setPendenciaHoraExtra] = useState<RegistroPontoHoraExtraPendencia | null>(null);
  const [cienciaHoraExtraConfirmada, setCienciaHoraExtraConfirmada] = useState(false);
  const [justificativaHoraExtra, setJustificativaHoraExtra] = useState("");
  const [configHoraExtraDraft, setConfigHoraExtraDraft] = useState<RegistroPontoHoraExtraConfiguracao>({
    tolerancia_entrada_antecipada_minutos: 10,
    exigir_autorizacao_hora_extra_antecipada: true,
    limite_hora_extra_diaria_minutos: 120,
    permitir_solicitacao_hora_extra_pelo_funcionario: false,
    mensagem_ciencia_hora_extra:
      "Declaro ciência de que a realização de hora extra depende de autorização da empresa."
  });
  const [confirmacaoLogin, setConfirmacaoLogin] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [confirmacaoFaceImagem, setConfirmacaoFaceImagem] = useState("");
  const [rascunhoFaceCadastro, setRascunhoFaceCadastro] = useState("");
  const [faceCadastroPreviewUrl, setFaceCadastroPreviewUrl] = useState("");
  const [statusPiscada, setStatusPiscada] = useState<"idle" | "aguardando" | "detectada" | "falha">("idle");
  const [validandoPiscada, setValidandoPiscada] = useState(false);
  const [etapaMarcacao, setEtapaMarcacao] = useState<"idle" | "localizacao" | "registro">("idle");
  const [ocorrenciaTipo, setOcorrenciaTipo] = useState<RegistroPontoOcorrenciaTipo>("OBSERVACAO_OPERACIONAL");
  const [ocorrenciaDescricao, setOcorrenciaDescricao] = useState("");
  const videoFaceRef = useRef<HTMLVideoElement | null>(null);
  const streamFaceRef = useRef<MediaStream | null>(null);
  const marcacaoEmExecucaoRef = useRef(false);
  const { data: listaData, isLoading: carregandoLista } = useRegistrosPonto(filtros);
  const { data: espelhoData, isLoading: carregandoEspelho } = useEspelhoPonto(filtros);
  const { data: historicoData, isLoading: carregandoHistorico } = useHistoricoRegistroPonto(registroSelecionadoId);
  const { data: configuracaoHorarioData, isLoading: carregandoConfiguracaoHorario } = useConfiguracaoRegistroPonto();
  const { data: configuracaoHoraExtraData } = useConfiguracaoHoraExtraRegistroPonto();
  const { data: faceData, isLoading: carregandoFace } = useFaceRegistroPonto();
  const { data: usuariosCatalogoData } = useCatalogoUsuariosRegistroPonto(isAdmin ? "" : undefined);
  const { data: horaExtrasData } = useHorasExtrasRegistroPonto(
    abaAtiva === "hora-extra" ? filtrosHoraExtra : undefined
  );
  const { data: relatorioHoraExtraData } = useRelatorioMensalHoraExtraRegistroPonto(
    abaAtiva === "hora-extra" ? filtrosHoraExtra : undefined
  );

  const marcarMutation = useMarcarPonto();
  const ajusteMutation = useAjustarRegistroPonto();
  const ocorrenciaMutation = useAdicionarOcorrenciaPonto();
  const salvarConfiguracaoHorarioMutation = useSalvarConfiguracaoRegistroPonto();
  const salvarConfiguracaoHoraExtraMutation = useSalvarConfiguracaoHoraExtraRegistroPonto();
  const decidirHoraExtraMutation = useDecidirHoraExtraRegistroPonto();
  const registrarCienciaHoraExtraMutation = useRegistrarCienciaHoraExtraRegistroPonto();
  const salvarFaceMutation = useSalvarFaceRegistroPonto();

  const ajusteForm = useForm<
    RegistroPontoAjusteFormInput,
    unknown,
    RegistroPontoAjusteFormValues
  >({
    resolver: zodResolver(registroPontoAjusteSchema),
    defaultValues: {
      entrada_1: "",
      saida_1: "",
      entrada_2: "",
      saida_2: "",
      observacoes: "",
      justificativa: "",
      observacao: ""
    }
  });

  const configuracaoHorarioForm = useForm<
    RegistroPontoHorarioTrabalhoFormInput,
    unknown,
    RegistroPontoHorarioTrabalhoFormValues
  >({
    resolver: zodResolver(registroPontoHorarioTrabalhoSchema),
    defaultValues: registroPontoHorarioTrabalhoPadrao
  });

  const registros = listaData?.registros ?? [];
  const espelho = espelhoData?.registros ?? [];
  const totaisEspelho = espelhoData?.totais;
  const totalDiasEspelho = totaisEspelho?.total_dias ?? 0;
  const totalTrabalhadoEspelho = totaisEspelho?.total_trabalhado_minutos ?? 0;
  const mediaDiariaEspelho = formatarMediaMinutos(totalTrabalhadoEspelho, totalDiasEspelho);
  const mediaSemanalEspelho = formatarMediaMinutos(totalTrabalhadoEspelho * 7, totalDiasEspelho);
  const mediaMensalEspelho = formatarMediaMinutos(totalTrabalhadoEspelho * 30, totalDiasEspelho);
  const usuariosCatalogo = usuariosCatalogoData?.usuarios ?? [];
  const horaExtras = horaExtrasData?.registros ?? [];
  const totaisHoraExtra = horaExtrasData?.totais;

  const registroSelecionado = useMemo(
    () => registros.find((item) => item.id === registroSelecionadoId),
    [registros, registroSelecionadoId]
  );

  const registroHojeUsuario = useMemo(() => {
    const hoje = toLocalDateISO();
    return registros.find((item) => item.usuario_id === usuario?.id && item.data === hoje);
  }, [registros, usuario?.id]);

  const unidadeAtiva =
    registroHojeUsuario?.unidade ?? registros[0]?.unidade ?? "Unidade do usuário";

  useEffect(() => {
    if (!registros.length) {
      setRegistroSelecionadoId(undefined);
      return;
    }

    setRegistroSelecionadoId((atual) => {
      if (atual && registros.some((item) => item.id === atual)) {
        return atual;
      }
      return registros[0].id;
    });
  }, [registros]);

  useEffect(() => {
    const usuarioId = usuario?.id;
    if (!usuarioId) return;

    if (isAdmin) {
      setFiltroDraft((prev) => ({
        ...prev,
        usuario_id: prev.usuario_id || usuarioId
      }));
      setFiltros((prev) => ({
        ...prev,
        usuario_id: prev.usuario_id || usuarioId
      }));
      return;
    }

    setFiltroDraft((prev) => ({
      ...prev,
      usuario_id: usuarioId
    }));
    setFiltros((prev) => ({
      ...prev,
      usuario_id: usuarioId
    }));
  }, [isAdmin, usuario?.id]);

  useEffect(() => {
    const abaDaUrl = normalizarAbaRegistroPonto(searchParams.get("aba"));
    setAbaAtiva((atual) => (atual === abaDaUrl ? atual : abaDaUrl));
  }, [searchParams]);

  useEffect(() => {
    if (abaAtiva !== "espelho") return;

    const overflowBodyAnterior = document.body.style.overflow;
    const overflowHtmlAnterior = document.documentElement.style.overflow;

    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";

    return () => {
      document.body.style.overflow = overflowBodyAnterior;
      document.documentElement.style.overflow = overflowHtmlAnterior;
    };
  }, [abaAtiva]);

  useEffect(() => {
    setConfirmacaoLogin(usuario?.nomeUsuario ?? "");
  }, [usuario?.nomeUsuario]);

  useEffect(() => {
    if (popupMarcarAberto) {
      setConfirmacaoLogin(usuario?.nomeUsuario ?? "");
      setConfirmacaoSenha("");
      setConfirmacaoFaceImagem("");
    }
  }, [popupMarcarAberto, usuario?.nomeUsuario]);

  useEffect(() => {
    if (popupAjusteAberto) {
      setConfirmacaoLogin(usuario?.nomeUsuario ?? "");
      setConfirmacaoSenha("");
      setConfirmacaoFaceImagem("");
    }
  }, [popupAjusteAberto, usuario?.nomeUsuario]);

  useEffect(() => {
    if (modoConfirmacaoMarcacao === "senha") {
      setConfirmacaoFaceImagem("");
      if (popupFaceAberto && modoFace === "confirmacao") {
        setPopupFaceAberto(false);
      }
    }
  }, [modoConfirmacaoMarcacao, modoFace, popupFaceAberto]);

  useEffect(() => {
    if (modoConfirmacaoAjuste === "senha") {
      setConfirmacaoFaceImagem("");
      if (popupFaceAberto && modoFace === "confirmacao") {
        setPopupFaceAberto(false);
      }
    }
  }, [modoConfirmacaoAjuste, modoFace, popupFaceAberto]);

  useEffect(() => {
    if (!popupFaceAberto || modoFace === "cadastro") {
      setStatusPiscada("idle");
      setValidandoPiscada(false);
    }
  }, [modoFace, popupFaceAberto]);

  useEffect(() => {
    if (rascunhoFaceCadastro) {
      setFaceCadastroPreviewUrl(rascunhoFaceCadastro);
      return;
    }

    const faceUrlSalva = faceData?.face_url;

    if (!faceUrlSalva) {
      setFaceCadastroPreviewUrl("");
      return;
    }

    let ativo = true;
    let revokeAtual: (() => void) | undefined;

    async function carregarPreviewSalva() {
      try {
        const arquivo = await obterUrlArquivoAutenticado(faceUrlSalva);
        if (!ativo) {
          arquivo.revoke?.();
          return;
        }

        revokeAtual = arquivo.revoke;
        setFaceCadastroPreviewUrl(arquivo.url);
      } catch {
        if (ativo) {
          setFaceCadastroPreviewUrl("");
        }
      }
    }

    void carregarPreviewSalva();

    return () => {
      ativo = false;
      revokeAtual?.();
    };
  }, [faceData?.face_url, rascunhoFaceCadastro]);

  useEffect(() => {
    let cancelled = false;

    async function iniciarCameraFace() {
      if (!popupFaceAberto) {
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setMensagem({
          tipo: "erro",
          texto: "Este dispositivo não permite captura de câmera para validação facial."
        });
        setPopupFaceAberto(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamFaceRef.current = stream;

        if (videoFaceRef.current) {
          videoFaceRef.current.srcObject = stream;
          await videoFaceRef.current.play().catch(() => undefined);
        }
      } catch (error) {
        setMensagem({
          tipo: "erro",
          texto:
            error instanceof Error
              ? error.message
              : "Não foi possível acessar a câmera para captura facial."
        });
        setPopupFaceAberto(false);
      }
    }

    void iniciarCameraFace();

    return () => {
      cancelled = true;
      streamFaceRef.current?.getTracks().forEach((track) => track.stop());
      streamFaceRef.current = null;
      if (videoFaceRef.current) {
        videoFaceRef.current.srcObject = null;
      }
    };
  }, [popupFaceAberto]);

  useEffect(() => {
    if (!registroSelecionado) {
      ajusteForm.reset({
        entrada_1: "",
        saida_1: "",
        entrada_2: "",
        saida_2: "",
        observacoes: "",
        justificativa: "",
        observacao: ""
      });
      return;
    }

    ajusteForm.reset({
      entrada_1: registroSelecionado.entrada_1 ? registroSelecionado.entrada_1.slice(0, 5) : "",
      saida_1: registroSelecionado.saida_1 ? registroSelecionado.saida_1.slice(0, 5) : "",
      entrada_2: registroSelecionado.entrada_2 ? registroSelecionado.entrada_2.slice(0, 5) : "",
      saida_2: registroSelecionado.saida_2 ? registroSelecionado.saida_2.slice(0, 5) : "",
      observacoes: registroSelecionado.observacoes ?? "",
      justificativa: "",
      observacao: ""
    });
  }, [ajusteForm, registroSelecionado]);

  useEffect(() => {
    if (!configuracaoHorarioData) {
      configuracaoHorarioForm.reset(registroPontoHorarioTrabalhoPadrao);
      return;
    }

    configuracaoHorarioForm.reset({
      horario_entrada_1: configuracaoHorarioData.horario_entrada_1 ?? "",
      horario_saida_1: configuracaoHorarioData.horario_saida_1 ?? "",
      horario_entrada_2: configuracaoHorarioData.horario_entrada_2 ?? "",
      horario_saida_2: configuracaoHorarioData.horario_saida_2 ?? ""
    });
  }, [configuracaoHorarioData, configuracaoHorarioForm]);

  useEffect(() => {
    if (configuracaoHoraExtraData) {
      setConfigHoraExtraDraft(configuracaoHoraExtraData);
    }
  }, [configuracaoHoraExtraData]);

  function montarFiltrosEspelho(): RegistroPontoFiltro | null {
    const dataInicial = filtroDraft.data_inicial?.trim() || undefined;
    const dataFinal = filtroDraft.data_final?.trim() || undefined;
    const usuarioIdEspelho = isAdmin ? filtroDraft.usuario_id?.trim() || usuario?.id : usuario?.id;

    if (!usuarioIdEspelho) {
      setMensagem({
        tipo: "erro",
        texto: "Selecione o funcionário para consultar o espelho de ponto."
      });
      return null;
    }

    if (dataInicial && dataFinal && dataInicial > dataFinal) {
      setMensagem({
        tipo: "erro",
        texto: "O período inicial não pode ser maior que o período final."
      });
      return null;
    }

    return {
      data_inicial: dataInicial,
      data_final: dataFinal,
      usuario_id: usuarioIdEspelho,
      status: filtroDraft.status || undefined,
      ocorrencia: filtroDraft.ocorrencia?.trim() || undefined,
      unidade: filtroDraft.unidade?.trim() || undefined,
      somente_alterados: !!filtroDraft.somente_alterados,
      somente_inconsistencias: !!filtroDraft.somente_inconsistencias
    };
  }

  function aplicarBusca() {
    if (filtrosTravados) return;
    const filtrosEspelho = montarFiltrosEspelho();
    if (!filtrosEspelho) return;
    setFiltros(filtrosEspelho);
  }

  function aplicarFiltrosHoraExtra() {
    setFiltrosHoraExtra({ ...filtroHoraExtraDraft });
  }

  function limparFiltrosHoraExtra() {
    setFiltroHoraExtraDraft({});
    setFiltrosHoraExtra({});
  }

  function limparParaNovo() {
    if (filtrosTravados) return;
    const padrao: RegistroPontoFiltro = {
      ...filtroRegistroPontoPadrao,
      usuario_id: usuario?.id
    };

    setFiltroDraft(padrao);
    setFiltros(padrao);
    setRegistroSelecionadoId(undefined);
    setOcorrenciaDescricao("");
    setOcorrenciaTipo("OBSERVACAO_OPERACIONAL");
    ajusteForm.reset({
      entrada_1: "",
      saida_1: "",
      entrada_2: "",
      saida_2: "",
      observacoes: "",
      justificativa: "",
      observacao: ""
    });
  }

  function cancelarEdicao() {
    if (!registroSelecionado) {
      ajusteForm.reset();
      return;
    }

    ajusteForm.reset({
      entrada_1: registroSelecionado.entrada_1 ? registroSelecionado.entrada_1.slice(0, 5) : "",
      saida_1: registroSelecionado.saida_1 ? registroSelecionado.saida_1.slice(0, 5) : "",
      entrada_2: registroSelecionado.entrada_2 ? registroSelecionado.entrada_2.slice(0, 5) : "",
      saida_2: registroSelecionado.saida_2 ? registroSelecionado.saida_2.slice(0, 5) : "",
      observacoes: registroSelecionado.observacoes ?? "",
      justificativa: "",
      observacao: ""
    });
    setOcorrenciaDescricao("");
    setMensagem({ tipo: "sucesso", texto: "Formulário restaurado." });
  }

  function selecionarAba(aba: AbaRegistroPonto) {
    setAbaAtiva(aba);
    const proximosParams = new URLSearchParams(searchParams);
    if (aba === "listagem") {
      proximosParams.delete("aba");
    } else {
      proximosParams.set("aba", aba);
    }
    setSearchParams(proximosParams, { replace: true });

    if (aba === "espelho") {
      const filtrosEspelho = montarFiltrosEspelho();
      if (filtrosEspelho) {
        setFiltros(filtrosEspelho);
      }
    }
  }

  const submitConfiguracaoHorario = configuracaoHorarioForm.handleSubmit(async (values) => {
    try {
      await salvarConfiguracaoHorarioMutation.mutateAsync(values);
      setMensagem({ tipo: "sucesso", texto: "Horários de trabalho salvos com sucesso." });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setMensagem({
        tipo: "erro",
        texto: apiError.response?.data?.message ?? "Não foi possível salvar os horários de trabalho."
      });
    }
  });

  async function salvarConfiguracaoHoraExtra() {
    try {
      await salvarConfiguracaoHoraExtraMutation.mutateAsync(configHoraExtraDraft);
      setMensagem({ tipo: "sucesso", texto: "Configuração de hora extra salva com sucesso." });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setMensagem({
        tipo: "erro",
        texto: apiError.response?.data?.message ?? "Não foi possível salvar a configuração de hora extra."
      });
    }
  }

  async function exportarRelatorioMensalHoraExtra(formato: "pdf" | "excel") {
    try {
      const blob = await registroPontoService.exportarRelatorioMensal({
        ...filtrosHoraExtra,
        formato
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-horas-extras.${formato === "pdf" ? "pdf" : "xls"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMensagem({ tipo: "sucesso", texto: `Relatório mensal exportado em ${formato.toUpperCase()}.` });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setMensagem({
        tipo: "erro",
        texto: apiError.response?.data?.message ?? "Não foi possível exportar o relatório mensal."
      });
    }
  }

  async function capturarFaceDaCamera() {
    const video = videoFaceRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setMensagem({ tipo: "erro", texto: "A câmera ainda não está pronta para a captura facial." });
      return;
    }

    try {
      const dataUrl = capturarFotoTresPorQuatroDoVideo(video);

      if (modoFace === "cadastro") {
        setRascunhoFaceCadastro(dataUrl);
      } else {
        setConfirmacaoFaceImagem(dataUrl);
      }
    } catch (error) {
      setMensagem({
        tipo: "erro",
        texto:
          error instanceof Error
            ? error.message
            : "Não foi possível concluir a captura facial."
      });
    }
  }

  async function validarPiscadaECapturarFace() {
    const video = videoFaceRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setMensagem({ tipo: "erro", texto: "A câmera ainda não está pronta para validar a piscada." });
      return;
    }

    setValidandoPiscada(true);
    setStatusPiscada("aguardando");

    try {
      const amostraBase = capturarAmostraOlhosDoVideo(video);
      const amostraRostoBase = capturarAmostraRostoDoVideo(video);
      const assimetriaBase = calcularAssimetriaHorizontal(amostraRostoBase);
      let maiorVariacaoOlhos = 0;
      let maiorVariacaoRosto = 0;
      let piscadasDetectadas = 0;
      let picoPiscadaAtivo = false;
      const totalTentativas = Math.ceil(duracaoMaximaPiscadaMs / intervaloPiscadaMs);

      for (let tentativa = 0; tentativa < totalTentativas; tentativa += 1) {
        await esperar(intervaloPiscadaMs);
        const amostraAtual = capturarAmostraOlhosDoVideo(video);
        const variacaoAtual = calcularVariacaoMedia(amostraBase, amostraAtual);
        const amostraRostoAtual = capturarAmostraRostoDoVideo(video);
        const assimetriaAtual = calcularAssimetriaHorizontal(amostraRostoAtual);
        const variacaoRostoAtual = Math.abs(assimetriaAtual - assimetriaBase);

        if (variacaoAtual > maiorVariacaoOlhos) {
          maiorVariacaoOlhos = variacaoAtual;
        }

        if (variacaoRostoAtual > maiorVariacaoRosto) {
          maiorVariacaoRosto = variacaoRostoAtual;
        }

        if (variacaoAtual >= variacaoMinimaPiscada && !picoPiscadaAtivo) {
          piscadasDetectadas += 1;
          picoPiscadaAtivo = true;
        } else if (variacaoAtual < variacaoMinimaPiscada * 0.72) {
          picoPiscadaAtivo = false;
        }

        if (piscadasDetectadas >= 2 || maiorVariacaoRosto >= variacaoMinimaMovimentoRosto) {
          break;
        }
      }

      const provaDeVidaAprovada =
        piscadasDetectadas >= 2 || maiorVariacaoRosto >= variacaoMinimaMovimentoRosto;

      if (!provaDeVidaAprovada) {
        setStatusPiscada("falha");
        setConfirmacaoFaceImagem("");
        setMensagem({
          tipo: "erro",
          texto:
            "Prova de vida não detectada. Pisque duas vezes ou vire levemente o rosto para os lados mantendo o rosto dentro do molde."
        });
        return;
      }

      const dataUrl = capturarFotoTresPorQuatroDoVideo(video);
      setConfirmacaoFaceImagem(dataUrl);
      setStatusPiscada("detectada");
    } catch (error) {
      setStatusPiscada("falha");
      setMensagem({
        tipo: "erro",
        texto:
          error instanceof Error
            ? error.message
            : "Não foi possível validar a piscada para a prova de vida."
      });
    } finally {
      setValidandoPiscada(false);
    }
  }

  async function salvarCadastroFace() {
    if (!rascunhoFaceCadastro) {
      setMensagem({ tipo: "erro", texto: "Capture a imagem da face pela webcam antes de salvar." });
      return;
    }

    try {
      const response = await salvarFaceMutation.mutateAsync({
        face_imagem: rascunhoFaceCadastro
      });

      setRascunhoFaceCadastro("");
      setMensagem({ tipo: "sucesso", texto: response.mensagem });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setMensagem({
        tipo: "erro",
        texto: apiError.response?.data?.message ?? "Não foi possível salvar a face do usuário."
      });
    }
  }

  async function executarMarcacao() {
    if (marcacaoEmExecucaoRef.current) {
      return;
    }

    marcacaoEmExecucaoRef.current = true;

    try {
      if (!confirmacaoLogin.trim() || !confirmacaoSenha.trim()) {
        setMensagem({ tipo: "erro", texto: "Informe usuário e senha para confirmar a marcação." });
        return;
      }

      if (modoConfirmacaoMarcacao === "face" && !confirmacaoFaceImagem) {
        setMensagem({
          tipo: "erro",
          texto: "Capture a face atual do usuário para confirmar a marcação."
        });
        return;
      }

      setPopupMarcarAberto(false);
      setEtapaMarcacao("localizacao");
      const localizacao = await capturarLocalizacaoAtual();
      const marcouSemLocalizacao = !localizacao;
      setEtapaMarcacao("registro");
      const response = await marcarMutation.mutateAsync({
        modo_confirmacao: modoConfirmacaoMarcacao,
        usuario_login: confirmacaoLogin.trim(),
        senha: confirmacaoSenha,
        face_imagem: modoConfirmacaoMarcacao === "face" ? confirmacaoFaceImagem : undefined,
        latitude: localizacao?.latitude,
        longitude: localizacao?.longitude,
        accuracy_metros: localizacao?.accuracy_metros,
        origem_manual: marcouSemLocalizacao
          ? "Localização do dispositivo não obtida no momento da marcação."
          : undefined,
        validar_localizacao: false
      });

      if (response.pendencia_hora_extra) {
        setJustificativaHoraExtra("");
        setCienciaHoraExtraConfirmada(false);
        setPendenciaHoraExtra(null);
      }

      setPopupCienciaHoraExtraAberto(false);
      setMensagem({
        tipo: "sucesso",
        texto: marcouSemLocalizacao
          ? `${response.mensagem} A marcação foi registrada sem localização.`
          : response.mensagem
      });
      setConfirmacaoSenha("");
      setConfirmacaoFaceImagem("");
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setMensagem({
        tipo: "erro",
        texto: apiError.response?.data?.message ?? "Não foi possível registrar a batida de ponto."
      });
    } finally {
      marcacaoEmExecucaoRef.current = false;
      setEtapaMarcacao("idle");
    }
  }

  async function confirmarCienciaHoraExtra() {
    if (!pendenciaHoraExtra) {
      setPopupCienciaHoraExtraAberto(false);
      return;
    }

    if (!cienciaHoraExtraConfirmada) {
      setMensagem({
        tipo: "erro",
        texto: "Confirme a ciência antes de finalizar a ocorrência de hora extra."
      });
      return;
    }

    if (!justificativaHoraExtra.trim()) {
      setMensagem({
        tipo: "erro",
        texto: "Informe a justificativa da antecipação."
      });
      return;
    }

    try {
      await registrarCienciaHoraExtraMutation.mutateAsync({
        id: pendenciaHoraExtra.id,
        payload: {
          justificativa_funcionario: justificativaHoraExtra.trim(),
          ciencia_registrada: true
        }
      });

      setMensagem({
        tipo: "sucesso",
        texto: "Batida registrada e ciência de hora extra confirmada com sucesso."
      });
      setPendenciaHoraExtra(null);
      setPopupCienciaHoraExtraAberto(false);
      setJustificativaHoraExtra("");
      setCienciaHoraExtraConfirmada(false);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setMensagem({
        tipo: "erro",
        texto: apiError.response?.data?.message ?? "Não foi possível registrar a ciência da hora extra."
      });
    }
  }

  const submitAjuste = ajusteForm.handleSubmit(async (values) => {
    if (!registroSelecionado) {
      setMensagem({ tipo: "erro", texto: "Selecione um registro para ajustar." });
      return;
    }

    if (!confirmacaoLogin.trim() || !confirmacaoSenha.trim()) {
      setMensagem({ tipo: "erro", texto: "Informe usuário e senha para confirmar o ajuste administrativo." });
      return;
    }

    if (modoConfirmacaoAjuste === "face" && !confirmacaoFaceImagem) {
      setMensagem({ tipo: "erro", texto: "Capture a face para confirmar o ajuste administrativo." });
      return;
    }

    try {
      await ajusteMutation.mutateAsync({
        id: registroSelecionado.id,
        payload: {
          ...values,
          modo_confirmacao: modoConfirmacaoAjuste,
          usuario_login: confirmacaoLogin.trim(),
          senha: confirmacaoSenha,
          face_imagem: modoConfirmacaoAjuste === "face" ? confirmacaoFaceImagem : undefined
        }
      });
      setMensagem({ tipo: "sucesso", texto: "Ajuste administrativo salvo com sucesso." });
      setPopupAjusteAberto(false);
      ajusteForm.setValue("justificativa", "");
      ajusteForm.setValue("observacao", "");
      setConfirmacaoSenha("");
      setConfirmacaoFaceImagem("");
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setMensagem({
        tipo: "erro",
        texto: apiError.response?.data?.message ?? "Não foi possível salvar o ajuste administrativo."
      });
    }
  });

  async function salvarOcorrencia() {
    if (!registroSelecionadoId) {
      setMensagem({ tipo: "erro", texto: "Selecione um registro para incluir ocorrência." });
      return;
    }

    try {
      await ocorrenciaMutation.mutateAsync({
        id: registroSelecionadoId,
        payload: {
          tipo: ocorrenciaTipo,
          descricao: ocorrenciaDescricao
        }
      });

      setOcorrenciaDescricao("");
      setMensagem({ tipo: "sucesso", texto: "Ocorrência registrada com sucesso." });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setMensagem({
        tipo: "erro",
        texto: apiError.response?.data?.message ?? "Não foi possível registrar a ocorrência."
      });
    }
  }

  function acaoSalvar() {
    if (abaAtiva === "marcacao") {
      void submitConfiguracaoHorario();
      return;
    }

    if (abaAtiva === "ajuste") {
      if (!isAdmin) {
        setMensagem({ tipo: "erro", texto: "Apenas administrador pode salvar ajustes." });
        return;
      }
      setPopupAjusteAberto(true);
      return;
    }

    if (abaAtiva === "ocorrencias") {
      void salvarOcorrencia();
      return;
    }

    setMensagem({
      tipo: "sucesso",
      texto: "Nenhuma alteração pendente nesta aba."
    });
  }

  function acaoExcluir() {
    setMensagem({
      tipo: "erro",
      texto: "Exclusão de registro de ponto não é permitida para preservar auditoria."
    });
  }

  function acaoImprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Registro de ponto" });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.message ?? "Não foi possível preparar a impressão."
      });
    }
  }

  async function gerarRelatorioEspelho() {
    const janela = reservarJanelaRelatorio("Espelho de Ponto Individual");
    try {
      const filtrosEspelho = montarFiltrosEspelho();
      if (!filtrosEspelho) {
        janela.fechar();
        return;
      }
      setFiltros(filtrosEspelho);
      const payloadEspelho = {
        ...filtrosEspelho,
        usuarioEmissor: usuario?.nome ?? usuario?.nomeUsuario
      };

      let blob: Blob;
      try {
        blob = await registroPontoService.gerarEspelhoPontoPdf(payloadEspelho);
      } catch (error: any) {
        if (error?.response?.status !== 401) {
          throw error;
        }
        blob = await reportsService.gerarEspelhoPonto(payloadEspelho);
      }

      janela.publicar(blob);
    } catch (error: any) {
      janela.fechar();
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? error?.message ?? "Não foi possível gerar o espelho de ponto."
      });
    }
  }

  function acaoFechar() {
    navigate("/dashboard/visao-geral");
  }

  const marcacaoEmAndamento = marcarMutation.isPending || etapaMarcacao !== "idle";
  const acoesDesabilitadas =
    marcacaoEmAndamento || ajusteMutation.isPending || ocorrenciaMutation.isPending;
  const filtrosTravados = abaAtiva !== "espelho";
  const previewFaceAtual = obterPreviewFaceAtual({
    modoFace,
    rascunhoFaceCadastro,
    confirmacaoFaceImagem,
    faceUrl: faceData?.face_url
  });

  function obterTextoBotaoMarcacao() {
    if (etapaMarcacao === "localizacao") return "Obtendo localização...";
    if (marcacaoEmAndamento) return "Registrando...";
    return "Registrar ponto agora";
  }

  function alterarUsuarioEspelho(usuarioId: string) {
    setFiltroDraft((prev) => ({
      ...prev,
      usuario_id: usuarioId
    }));
  }

  function atualizarFiltroEspelho(campo: keyof RegistroPontoFiltro, valor: RegistroPontoFiltro[keyof RegistroPontoFiltro]) {
    setFiltroDraft((prev) => ({
      ...prev,
      [campo]: valor
    }));

    setMensagem(null);
  }

  function renderFiltros() {
    const usuarioAtualNoCatalogo = usuariosCatalogo.some((item) => item.id === filtroDraft.usuario_id);
    const opcoesUsuarioEspelho =
      isAdmin && filtroDraft.usuario_id && !usuarioAtualNoCatalogo
        ? [
            {
              id: filtroDraft.usuario_id,
              nome: filtroDraft.usuario_id === usuario?.id ? usuario?.nome ?? usuario?.nomeUsuario ?? "Usuário atual" : "Usuário selecionado",
              login: filtroDraft.usuario_id === usuario?.id ? usuario?.nomeUsuario ?? "" : ""
            },
            ...usuariosCatalogo
          ]
        : usuariosCatalogo;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Período inicial</Label>
            <Input
              type="date"
              value={filtroDraft.data_inicial ?? ""}
              onChange={(event) => atualizarFiltroEspelho("data_inicial", event.target.value || undefined)}
              readOnly={abaAtiva !== "espelho"}
              disabled={abaAtiva !== "espelho"}
            />
          </div>

          <div>
            <Label>Período final</Label>
            <Input
              type="date"
              value={filtroDraft.data_final ?? ""}
              onChange={(event) => atualizarFiltroEspelho("data_final", event.target.value || undefined)}
              readOnly={abaAtiva !== "espelho"}
              disabled={abaAtiva !== "espelho"}
            />
            {abaAtiva === "espelho" ? (
              <p className="mt-1 text-xs text-[var(--g3-muted)]">
                Informe manualmente o período desejado e depois clique em Buscar.
              </p>
            ) : null}
          </div>

          {isAdmin && abaAtiva === "espelho" ? (
            <div>
              <Label>Funcionário</Label>
              <Select
                value={filtroDraft.usuario_id ?? usuario?.id ?? ""}
                onChange={(event) => alterarUsuarioEspelho(event.target.value)}
              >
                {opcoesUsuarioEspelho.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}{item.login ? ` (${item.login})` : ""}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">
                Administradores podem escolher o funcionário para consulta e impressão do espelho.
              </p>
            </div>
          ) : null}

          <div>
            <Label>Status</Label>
            <Select
              value={filtroDraft.status ?? ""}
              onChange={(event) =>
                atualizarFiltroEspelho("status", (event.target.value || undefined) as RegistroPontoStatus | undefined)
              }
            >
              <option value="">Todos</option>
              <option value="COMPLETO">Completo</option>
              <option value="INCOMPLETO">Incompleto</option>
            </Select>
          </div>

          <div>
            <Label>Ocorrência</Label>
            <Input
              value={filtroDraft.ocorrencia ?? ""}
              onChange={(event) => atualizarFiltroEspelho("ocorrencia", event.target.value)}
              placeholder="Ex.: atraso"
            />
          </div>

          <div>
            <Label>Unidade</Label>
            <Input value={unidadeAtiva} readOnly />
          </div>

          <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
            <Checkbox
              checked={!!filtroDraft.somente_alterados}
              onChange={(event) => atualizarFiltroEspelho("somente_alterados", event.target.checked)}
            />
            Somente registros alterados
          </label>

          <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
            <Checkbox
              checked={!!filtroDraft.somente_inconsistencias}
              onChange={(event) => atualizarFiltroEspelho("somente_inconsistencias", event.target.checked)}
            />
            Somente inconsistências
          </label>
        </CardContent>
      </Card>
    );
  }

  function renderTabelaRegistros(registrosLista: RegistroPontoItem[], exibirOcorrencias = false) {
    return (
      <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
        <table className="min-w-[1080px] text-xs sm:text-sm">
          <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
            <tr>
              <th className="px-2 py-2 text-left">Data</th>
              <th className="px-2 py-2 text-left">Usuário</th>
              <th className="px-2 py-2 text-left">E1</th>
              <th className="px-2 py-2 text-left">S1</th>
              <th className="px-2 py-2 text-left">E2</th>
              <th className="px-2 py-2 text-left">S2</th>
              <th className="px-2 py-2 text-left">Extras</th>
              <th className="px-2 py-2 text-left">Banco</th>
              <th className="px-2 py-2 text-left">Atraso</th>
              <th className="px-2 py-2 text-left">Falta</th>
              <th className="px-2 py-2 text-left">Status</th>
              {exibirOcorrencias ? <th className="px-2 py-2 text-left">Ocorrências</th> : null}
            </tr>
          </thead>
          <tbody>
            {registrosLista.map((item, index) => (
              <tr
                key={item.id}
                className={`cursor-pointer border-t border-[var(--g3-border)] transition-colors ${
                  registroSelecionadoId === item.id
                    ? "bg-[var(--g3-primary-soft-hover)]"
                    : index % 2 === 0
                      ? "bg-white"
                      : "bg-slate-50"
                }`}
                onClick={() => setRegistroSelecionadoId(item.id)}
              >
                <td className="px-2 py-2">{formatarData(item.data)}</td>
                <td className="px-2 py-2 font-medium">{item.usuario_nome}</td>
                <td className="px-2 py-2">{formatarHora(item.entrada_1)}</td>
                <td className="px-2 py-2">{formatarHora(item.saida_1)}</td>
                <td className="px-2 py-2">{formatarHora(item.entrada_2)}</td>
                <td className="px-2 py-2">{formatarHora(item.saida_2)}</td>
                <td className="px-2 py-2">{formatarMinutos(item.horas_extras_minutos)}</td>
                <td className="px-2 py-2">{formatarMinutos(item.banco_horas_minutos)}</td>
                <td className="px-2 py-2">{formatarMinutos(item.atrasos_minutos)}</td>
                <td className="px-2 py-2">{formatarMinutos(item.faltas_minutos)}</td>
                <td className="px-2 py-2">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${badgeStatusClasse(item.status)}`}>
                    {item.status === "COMPLETO" ? "Completo" : "Incompleto"}
                  </span>
                </td>
                {exibirOcorrencias ? (
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {formatarOcorrenciasEspelho(item).map((ocorrencia, ocorrenciaIndex) => (
                        <span
                          key={`${item.id}-ocorrencia-${ocorrenciaIndex}`}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-tight ${ocorrencia.classe}`}
                        >
                          {ocorrencia.rotulo}
                        </span>
                      ))}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}

            {!registrosLista.length && (
              <tr>
                <td colSpan={exibirOcorrencias ? 12 : 11} className="px-2 py-8 text-center text-sm text-[var(--g3-muted)]">
                  Nenhum registro encontrado para os filtros informados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderPainelMarcacaoDestaque() {
    return (
      <Card className="overflow-hidden border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/80 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Fingerprint className="h-4 w-4" />
                Marcação rápida
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900">Registrar ponto agora</h3>
                <p className="text-sm text-slate-700">
                  Faça a próxima batida diretamente da página inicial do registro de ponto.
                </p>
              </div>
            </div>

            <Button
              type="button"
              className="w-full border-emerald-700 bg-emerald-600 text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-200/80 sm:w-auto sm:min-w-[240px]"
              onClick={() => setPopupMarcarAberto(true)}
              disabled={marcacaoEmAndamento}
            >
              {obterTextoBotaoMarcacao()}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-emerald-100 bg-white/90 p-3">
              <p className="text-xs text-[var(--g3-muted)]">Hoje</p>
              <p className="text-sm font-semibold text-emerald-700">{formatarData(toLocalDateISO())}</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-white/90 p-3">
              <p className="text-xs text-[var(--g3-muted)]">Próxima batida</p>
              <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                {registroHojeUsuario?.proxima_batida ?? "Entrada 1"}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-white/90 p-3">
              <p className="text-xs text-[var(--g3-muted)]">Usuário</p>
              <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                {usuario?.nome ?? usuario?.nomeUsuario ?? "---"}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-white/90 p-3">
              <p className="text-xs text-[var(--g3-muted)]">Saldo de banco</p>
              <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                {formatarMinutos(registroHojeUsuario?.banco_horas_minutos ?? 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderAbaConteudo() {
    if (abaAtiva === "listagem") {
      return (
        <section className="space-y-3">
          {renderPainelMarcacaoDestaque()}
          {renderFiltros()}
          {renderTabelaRegistros(registros, false)}
        </section>
      );
    }

    if (abaAtiva === "hora-extra") {
      return (
        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Aprovação de horas extras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Pendentes</p>
                  <p className="text-lg font-semibold">{formatarMinutos(totaisHoraExtra?.total_pendentes_minutos)}</p>
                </div>
                <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Autorizadas</p>
                  <p className="text-lg font-semibold">{formatarMinutos(totaisHoraExtra?.total_autorizadas_minutos)}</p>
                </div>
                <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Negadas</p>
                  <p className="text-lg font-semibold">{formatarMinutos(totaisHoraExtra?.total_negadas_minutos)}</p>
                </div>
                <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Banco aprovado</p>
                  <p className="text-lg font-semibold">{formatarMinutos(totaisHoraExtra?.saldo_banco_horas_aprovado_minutos)}</p>
                </div>
                <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Limiar diário</p>
                  <p className="text-lg font-semibold">
                    {configuracaoHoraExtraData
                      ? `${configuracaoHoraExtraData.limite_hora_extra_diaria_minutos} min`
                      : "120 min"}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Funcionários no relatório</p>
                  <p className="text-lg font-semibold">{relatorioHoraExtraData?.totais.funcionarios ?? 0}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Configuração da empresa</h3>
                    <p className="text-xs text-[var(--g3-muted)]">
                      Ajuste a tolerância, o limite diário e a ciência obrigatória para entradas antecipadas.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void exportarRelatorioMensalHoraExtra("pdf")}
                    >
                      Exportar PDF
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void exportarRelatorioMensalHoraExtra("excel")}
                    >
                      Exportar Excel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void salvarConfiguracaoHoraExtra()}
                      disabled={salvarConfiguracaoHoraExtraMutation.isPending}
                    >
                      {salvarConfiguracaoHoraExtraMutation.isPending ? "Salvando..." : "Salvar configuração"}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <Label>Tolerância antecipada (min)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={configHoraExtraDraft.tolerancia_entrada_antecipada_minutos}
                      onChange={(event) =>
                        setConfigHoraExtraDraft((atual) => ({
                          ...atual,
                          tolerancia_entrada_antecipada_minutos: Number(event.target.value || 0)
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Limite diário (min)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={configHoraExtraDraft.limite_hora_extra_diaria_minutos}
                      onChange={(event) =>
                        setConfigHoraExtraDraft((atual) => ({
                          ...atual,
                          limite_hora_extra_diaria_minutos: Number(event.target.value || 0)
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cobrança de ciência</Label>
                    <label className="flex items-center gap-2 rounded-lg border border-[var(--g3-border)] bg-white px-3 py-2 text-sm">
                      <Checkbox
                        checked={configHoraExtraDraft.exigir_autorizacao_hora_extra_antecipada}
                        onChange={(event) =>
                          setConfigHoraExtraDraft((atual) => ({
                            ...atual,
                            exigir_autorizacao_hora_extra_antecipada: event.target.checked
                          }))
                        }
                      />
                      Exigir ciência para extra antecipada
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label>Solicitação do funcionário</Label>
                    <label className="flex items-center gap-2 rounded-lg border border-[var(--g3-border)] bg-white px-3 py-2 text-sm">
                      <Checkbox
                        checked={configHoraExtraDraft.permitir_solicitacao_hora_extra_pelo_funcionario}
                        onChange={(event) =>
                          setConfigHoraExtraDraft((atual) => ({
                            ...atual,
                            permitir_solicitacao_hora_extra_pelo_funcionario: event.target.checked
                          }))
                        }
                      />
                      Permitir solicitação
                    </label>
                  </div>
                  <div className="sm:col-span-2 xl:col-span-5">
                    <Label>Mensagem de ciência</Label>
                    <Textarea
                      value={configHoraExtraDraft.mensagem_ciencia_hora_extra}
                      onChange={(event) =>
                        setConfigHoraExtraDraft((atual) => ({
                          ...atual,
                          mensagem_ciencia_hora_extra: event.target.value
                        }))
                      }
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label>Funcionário</Label>
                  <Input
                    value={filtroHoraExtraDraft.funcionario ?? ""}
                    onChange={(event) =>
                      setFiltroHoraExtraDraft((atual) => ({ ...atual, funcionario: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Data inicial</Label>
                  <Input
                    type="date"
                    value={filtroHoraExtraDraft.data_inicial ?? ""}
                    onChange={(event) =>
                      setFiltroHoraExtraDraft((atual) => ({ ...atual, data_inicial: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Data final</Label>
                  <Input
                    type="date"
                    value={filtroHoraExtraDraft.data_final ?? ""}
                    onChange={(event) =>
                      setFiltroHoraExtraDraft((atual) => ({ ...atual, data_final: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Setor</Label>
                  <Input
                    value={filtroHoraExtraDraft.setor ?? ""}
                    onChange={(event) =>
                      setFiltroHoraExtraDraft((atual) => ({ ...atual, setor: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={filtroHoraExtraDraft.status ?? ""}
                    onChange={(event) =>
                      setFiltroHoraExtraDraft((atual) => ({ ...atual, status: event.target.value }))
                    }
                  >
                    <option value="">Todos</option>
                    <option value="EXTRA_PENDENTE_AUTORIZACAO">Pendente</option>
                    <option value="EXTRA_AUTORIZADA">Autorizada</option>
                    <option value="EXTRA_NEGADA">Negada</option>
                    <option value="EXTRA_COMPENSADA_BANCO">Compensada no banco</option>
                    <option value="EXTRA_PAGA_FOLHA">Paga em folha</option>
                  </Select>
                </div>
                <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-2">
                  <Button type="button" onClick={aplicarFiltrosHoraExtra}>Aplicar filtros</Button>
                  <Button type="button" variant="outline" onClick={limparFiltrosHoraExtra}>Limpar filtros</Button>
                </div>
              </div>

              <div className="overflow-auto rounded-xl border border-[var(--g3-border)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                    <tr>
                      <th className="px-3 py-2 text-left">Funcionário</th>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Previsto</th>
                      <th className="px-3 py-2 text-left">Real</th>
                      <th className="px-3 py-2 text-left">Minutos</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Ciência</th>
                      <th className="px-3 py-2 text-left">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {horaExtras.length ? horaExtras.map((item) => (
                      <tr key={item.id} className="border-t border-[var(--g3-border)] bg-[var(--g3-card)]">
                        <td className="px-3 py-2">
                          <div className="font-medium">{item.usuario_nome || item.usuario_login}</div>
                          <div className="text-xs text-[var(--g3-muted)]">{item.setor || item.unidade || "—"}</div>
                        </td>
                        <td className="px-3 py-2">{formatarData(item.data_referencia)}</td>
                        <td className="px-3 py-2">{item.horario_previsto}</td>
                        <td className="px-3 py-2">{item.horario_real}</td>
                        <td className="px-3 py-2">{formatarMinutos(item.minutos_excedentes)}</td>
                        <td className="px-3 py-2">{item.status}</td>
                        <td className="px-3 py-2">{item.ciencia_registrada ? "Sim" : "Não"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                const justificativa = window.prompt("Justificativa da aprovação:")?.trim();
                                if (!justificativa) return;
                                await decidirHoraExtraMutation.mutateAsync({
                                  id: item.id,
                                  payload: { justificativa, minutos_aprovados: item.minutos_excedentes, minutos_negados: 0 }
                                });
                                setMensagem({ tipo: "sucesso", texto: "Hora extra aprovada com sucesso." });
                              }}
                              disabled={decidirHoraExtraMutation.isPending}
                            >
                              Aprovar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const justificativa = window.prompt("Justificativa da negativa:")?.trim();
                                if (!justificativa) return;
                                await decidirHoraExtraMutation.mutateAsync({
                                  id: item.id,
                                  payload: { justificativa, minutos_aprovados: 0, minutos_negados: item.minutos_excedentes }
                                });
                                setMensagem({ tipo: "sucesso", texto: "Hora extra negada com sucesso." });
                              }}
                              disabled={decidirHoraExtraMutation.isPending}
                            >
                              Negar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const aprovadosTexto = window.prompt(
                                  `Quantidade aprovada em minutos (até ${item.minutos_excedentes}):`
                                )?.trim();
                                const aprovados = Number(aprovadosTexto);
                                if (!Number.isFinite(aprovados) || aprovados < 0 || aprovados > item.minutos_excedentes) {
                                  return;
                                }
                                const justificativa = window.prompt("Justificativa da decisão parcial:")?.trim();
                                if (!justificativa) return;
                                await decidirHoraExtraMutation.mutateAsync({
                                  id: item.id,
                                  payload: {
                                    justificativa,
                                    minutos_aprovados: aprovados,
                                    minutos_negados: item.minutos_excedentes - aprovados
                                  }
                                });
                                setMensagem({ tipo: "sucesso", texto: "Hora extra aprovada parcialmente com sucesso." });
                              }}
                              disabled={decidirHoraExtraMutation.isPending}
                            >
                              Aprovar parcialmente
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="px-3 py-4 text-center text-sm text-[var(--g3-muted)]" colSpan={8}>
                          Nenhuma hora extra encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      );
    }

    if (abaAtiva === "marcacao") {
      return (
        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Marcação de ponto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">
                O horário da marcação é controlado pelo servidor e não pode ser editado manualmente.
              </p>
              <p className="text-xs text-[var(--g3-muted)]">
                Validação de localização desativada para esta marcação.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Hoje</p>
                  <p className="text-sm font-semibold text-[var(--g3-active)]">{formatarData(toLocalDateISO())}</p>
                </div>
                <div className="rounded-lg border border-[var(--g3-border)] bg-white p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Próxima batida</p>
                  <p className="text-sm font-semibold text-[var(--g3-foreground)]">{registroHojeUsuario?.proxima_batida ?? "Entrada 1"}</p>
                </div>
                <div className="rounded-lg border border-[var(--g3-border)] bg-white p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Usuário</p>
                  <p className="text-sm font-semibold text-[var(--g3-foreground)]">{usuario?.nome ?? usuario?.nomeUsuario ?? "---"}</p>
                </div>
                <div className="rounded-lg border border-[var(--g3-border)] bg-white p-3">
                  <p className="text-xs text-[var(--g3-muted)]">Saldo de banco</p>
                  <p className="text-sm font-semibold text-[var(--g3-foreground)]">{formatarMinutos(registroHojeUsuario?.banco_horas_minutos ?? 0)}</p>
                </div>
              </div>

              {false && (
              <div className="grid gap-4 rounded-xl border border-[var(--g3-border)] bg-slate-50 p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[var(--g3-foreground)]">Validação facial</p>
                  <div className="overflow-hidden rounded-xl border border-[var(--g3-border)] bg-white">
                    {rascunhoFaceCadastro || faceData?.face_url ? (
                      <img
                        src={resolverPreviewFace(rascunhoFaceCadastro || faceData?.face_url)}
                        alt="Face cadastrada"
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center px-4 text-center text-sm text-[var(--g3-muted)]">
                        Nenhuma face cadastrada.
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                        faceData?.face_cadastrada
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {carregandoFace
                        ? "Verificando cadastro..."
                        : faceData?.face_cadastrada
                          ? "Face cadastrada"
                          : "Face pendente"}
                    </span>
                    {faceData?.face_cadastrada_em ? (
                      <span className="text-xs text-[var(--g3-muted)]">
                        Último cadastro em {formatarDataHora(faceData?.face_cadastrada_em ?? "")}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm text-slate-700">
                    Antes de registrar o ponto, cadastre a face do usuário e mantenha a senha para confirmação dupla.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setModoFace("cadastro");
                        setPopupFaceAberto(true);
                      }}
                    >
                      {faceData?.face_cadastrada ? "Atualizar face" : "Capturar face"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void salvarCadastroFace()}
                      disabled={!rascunhoFaceCadastro || salvarFaceMutation.isPending}
                    >
                      {salvarFaceMutation.isPending ? "Salvando face..." : "Salvar face cadastrada"}
                    </Button>
                  </div>

                  {rascunhoFaceCadastro ? (
                    <p className="text-xs text-[var(--g3-muted)]">
                      A imagem acima está em rascunho. Clique em salvar para atualizar a face do usuário.
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--g3-muted)]">
                      A marcação de ponto pode ser feita somente com senha ou com senha e captura facial, conforme o modo selecionado.
                    </p>
                  )}
                </div>
              </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  className="w-full shadow-md sm:w-auto sm:min-w-[220px]"
                  onClick={() => setPopupMarcarAberto(true)}
                  disabled={marcacaoEmAndamento}
                >
                  {obterTextoBotaoMarcacao()}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Espelho do dia</CardTitle>
            </CardHeader>
            <CardContent>
              {registroHojeUsuario ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <div><Label>Entrada 1</Label><p className="text-sm font-semibold">{formatarHora(registroHojeUsuario.entrada_1)}</p></div>
                  <div><Label>Saída 1</Label><p className="text-sm font-semibold">{formatarHora(registroHojeUsuario.saida_1)}</p></div>
                  <div><Label>Entrada 2</Label><p className="text-sm font-semibold">{formatarHora(registroHojeUsuario.entrada_2)}</p></div>
                  <div><Label>Saída 2</Label><p className="text-sm font-semibold">{formatarHora(registroHojeUsuario.saida_2)}</p></div>
                  <div><Label>Atrasos</Label><p className="text-sm font-semibold">{formatarMinutos(registroHojeUsuario.atrasos_minutos)}</p></div>
                  <div><Label>Horas extras</Label><p className="text-sm font-semibold">{formatarMinutos(registroHojeUsuario.horas_extras_minutos)}</p></div>
                </div>
              ) : (
                <p className="text-sm text-[var(--g3-muted)]">Ainda não há batidas registradas hoje.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/80">
            <CardHeader>
              <CardTitle>Horários de trabalho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700">
                Informe os horários previstos para o sistema verificar se alguma batida obrigatória ficou pendente ao entrar no G3-Next.
              </p>

              {carregandoConfiguracaoHorario ? (
                <p className="text-sm text-[var(--g3-muted)]">Carregando horários...</p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <Label htmlFor="horario_entrada_1">Entrada 1</Label>
                      <Input id="horario_entrada_1" type="time" {...configuracaoHorarioForm.register("horario_entrada_1")} />
                      {configuracaoHorarioForm.formState.errors.horario_entrada_1 ? (
                        <p className="mt-1 text-xs text-red-600">
                          {configuracaoHorarioForm.formState.errors.horario_entrada_1.message}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <Label htmlFor="horario_saida_1">Saída 1</Label>
                      <Input id="horario_saida_1" type="time" {...configuracaoHorarioForm.register("horario_saida_1")} />
                      {configuracaoHorarioForm.formState.errors.horario_saida_1 ? (
                        <p className="mt-1 text-xs text-red-600">
                          {configuracaoHorarioForm.formState.errors.horario_saida_1.message}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <Label htmlFor="horario_entrada_2">Entrada 2</Label>
                      <Input id="horario_entrada_2" type="time" {...configuracaoHorarioForm.register("horario_entrada_2")} />
                      {configuracaoHorarioForm.formState.errors.horario_entrada_2 ? (
                        <p className="mt-1 text-xs text-red-600">
                          {configuracaoHorarioForm.formState.errors.horario_entrada_2.message}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <Label htmlFor="horario_saida_2">Saída 2</Label>
                      <Input id="horario_saida_2" type="time" {...configuracaoHorarioForm.register("horario_saida_2")} />
                      {configuracaoHorarioForm.formState.errors.horario_saida_2 ? (
                        <p className="mt-1 text-xs text-red-600">
                          {configuracaoHorarioForm.formState.errors.horario_saida_2.message}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {configuracaoHorarioForm.formState.errors.root?.message ? (
                    <p className="text-xs text-red-600">{configuracaoHorarioForm.formState.errors.root.message}</p>
                  ) : null}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => void submitConfiguracaoHorario()}
                      disabled={salvarConfiguracaoHorarioMutation.isPending}
                    >
                      {salvarConfiguracaoHorarioMutation.isPending ? "Salvando..." : "Salvar horários"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      );
    }

    if (abaAtiva === "cadastro-face") {
      return (
        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Cadastro facial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700">
                Cadastre ou atualize a face do usuário nesta aba. A marcação do ponto continuará exigindo senha e a captura facial atual na confirmação.
              </p>

              <div className="grid gap-4 rounded-xl border border-[var(--g3-border)] bg-slate-50 p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[var(--g3-foreground)]">Validação facial</p>
                  <div className="overflow-hidden rounded-xl border border-[var(--g3-border)] bg-white">
                    {rascunhoFaceCadastro || faceData?.face_url ? (
                      <img
                        src={resolverPreviewFace(rascunhoFaceCadastro || faceData?.face_url)}
                        alt="Face cadastrada"
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center px-4 text-center text-sm text-[var(--g3-muted)]">
                        Nenhuma face cadastrada.
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                        faceData?.face_cadastrada
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {carregandoFace
                        ? "Verificando cadastro..."
                        : faceData?.face_cadastrada
                          ? "Face cadastrada"
                          : "Face pendente"}
                    </span>
                    {faceData?.face_cadastrada_em ? (
                      <span className="text-xs text-[var(--g3-muted)]">
                        Último cadastro em {formatarDataHora(faceData?.face_cadastrada_em ?? "")}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm text-slate-700">
                    Use esta aba separada para preparar o cadastro facial do usuário antes do registro do ponto.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setModoFace("cadastro");
                        setPopupFaceAberto(true);
                      }}
                    >
                      {faceData?.face_cadastrada ? "Atualizar face" : "Capturar face"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void salvarCadastroFace()}
                      disabled={!rascunhoFaceCadastro || salvarFaceMutation.isPending}
                    >
                      {salvarFaceMutation.isPending ? "Salvando face..." : "Salvar face cadastrada"}
                    </Button>
                  </div>

                  {rascunhoFaceCadastro ? (
                    <p className="text-xs text-[var(--g3-muted)]">
                      A imagem acima está em rascunho. Clique em salvar para atualizar a face do usuário.
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--g3-muted)]">
                      Depois do cadastro, a confirmação da marcação continuará pedindo senha e uma nova captura facial.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      );
    }

    if (abaAtiva === "espelho") {
      const periodoEspelho = espelhoData?.periodo;
      return (
        <section className="space-y-3">
          {renderFiltros()}
          <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Período do espelho</h3>
                <p className="text-xs text-[var(--g3-muted)]">
                  {periodoEspelho?.data_inicial ? formatarData(periodoEspelho.data_inicial) : "Início não informado"} até{" "}
                  {periodoEspelho?.data_final ? formatarData(periodoEspelho.data_final) : "Fim não informado"}
                </p>
                <p className="mt-1 text-xs text-[var(--g3-muted)]">
                  Este relatório considera o período selecionado e apresenta o fechamento para conferência do mês.
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  periodoEspelho?.fechado
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {periodoEspelho?.fechado ? "Período fechado" : "Período em aberto"}
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Card><CardContent className="p-3"><p className="text-xs text-[var(--g3-muted)]">Dias</p><p className="text-lg font-semibold">{totaisEspelho?.total_dias ?? 0}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-[var(--g3-muted)]">Horas extras</p><p className="text-lg font-semibold">{formatarMinutos(totaisEspelho?.horas_extras_minutos ?? 0)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-[var(--g3-muted)]">Banco de horas</p><p className="text-lg font-semibold">{formatarMinutos(totaisEspelho?.banco_horas_minutos ?? 0)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-[var(--g3-muted)]">Atrasos</p><p className="text-lg font-semibold">{formatarMinutos(totaisEspelho?.atrasos_minutos ?? 0)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-[var(--g3-muted)]">Faltas</p><p className="text-lg font-semibold">{formatarMinutos(totaisEspelho?.faltas_minutos ?? 0)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-[var(--g3-muted)]">Ajustes</p><p className="text-lg font-semibold">{totaisEspelho?.total_ajustes ?? 0}</p></CardContent></Card>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-[var(--g3-muted)]">Média por dia</p>
                <p className="text-lg font-semibold">{mediaDiariaEspelho}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-[var(--g3-muted)]">Média por semana</p>
                <p className="text-lg font-semibold">{mediaSemanalEspelho}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-[var(--g3-muted)]">Média por mês</p>
                <p className="text-lg font-semibold">{mediaMensalEspelho}</p>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-[var(--g3-muted)]">
            Faltas representam o tempo ainda não cumprido nos dias fechados do período. As médias são normalizadas a partir da jornada total trabalhada.
          </p>

          <div className="flex justify-end">
            <Button
              type="button"
              className="w-full border-emerald-700 bg-emerald-600 text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-200/80 sm:w-auto"
              onClick={() => void gerarRelatorioEspelho()}
              disabled={carregandoEspelho}
            >
              <Printer className="mr-2 h-4 w-4" />
              Gerar espelho de ponto PDF
            </Button>
          </div>

          {carregandoEspelho ? <p className="text-sm text-[var(--g3-muted)]">Carregando espelho...</p> : renderTabelaRegistros(espelho, true)}
        </section>
      );
    }

    if (abaAtiva === "ocorrencias") {
      return (
        <section className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Controle de ocorrências</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">Selecione um registro na listagem e informe a ocorrência operacional.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Tipo de ocorrência</Label>
                  <Select value={ocorrenciaTipo} onChange={(event) => setOcorrenciaTipo(event.target.value as RegistroPontoOcorrenciaTipo)}>
                    {tiposOcorrenciaOptions.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo.replaceAll("_", " ")}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Registro selecionado</Label>
                  <Input value={registroSelecionado ? `${formatarData(registroSelecionado.data)} - ${registroSelecionado.usuario_nome}` : "Nenhum registro selecionado"} readOnly />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={ocorrenciaDescricao} onChange={(event) => setOcorrenciaDescricao(event.target.value)} placeholder="Detalhe a ocorrência..." />
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => void salvarOcorrencia()} disabled={ocorrenciaMutation.isPending}>
                  {ocorrenciaMutation.isPending ? "Salvando..." : "Registrar ocorrência"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      );
    }

    if (abaAtiva === "historico") {
      return (
        <section className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Histórico e auditoria</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {carregandoHistorico && <p className="text-sm text-[var(--g3-muted)]">Carregando histórico...</p>}
              {!registroSelecionadoId && <p className="text-sm text-[var(--g3-muted)]">Selecione um registro para visualizar o histórico.</p>}

              {historicoData?.historico?.length ? (
                <div className="space-y-2">
                  {historicoData.historico.map((item) => {
                    const textoLocalizacao = formatarLocalizacaoHistorico(item);
                    const localizacaoHistorico = extrairLocalizacaoHistorico(item);

                    return (
                      <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.acao}</p>
                        <p className="text-xs text-[var(--g3-muted)]">{formatarDataHora(item.criado_em)}</p>
                      </div>
                      <p className="text-xs text-[var(--g3-muted)]">Usuário: {item.usuario_nome ?? "---"}</p>
                      {textoLocalizacao && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--g3-muted)]">
                          <span>Localização: {textoLocalizacao}</span>
                          {localizacaoHistorico ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 px-0"
                              aria-label="Ver localização no mapa"
                              title="Ver localização no mapa"
                              onClick={() => setLocalizacaoHistoricoSelecionada(localizacaoHistorico)}
                            >
                              <MapPinned className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      )}
                      {item.justificativa && <p className="text-xs text-[var(--g3-muted)]">Justificativa: {item.justificativa}</p>}
                      {item.observacao && <p className="text-xs text-[var(--g3-muted)]">Observação: {item.observacao}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                !carregandoHistorico && <p className="text-sm text-[var(--g3-muted)]">Sem histórico para o registro selecionado.</p>
              )}
            </CardContent>
          </Card>
        </section>
      );
    }

    return (
      <section className="space-y-3">
        {!isAdmin && (
          <Card>
            <CardContent className="p-4 text-sm text-amber-700">
              Apenas administrador pode realizar ajuste manual de ponto.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ajuste administrativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form className="space-y-3" onSubmit={submitAjuste}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><Label>Entrada 1</Label><Input type="time" {...ajusteForm.register("entrada_1")} disabled={!isAdmin} /></div>
                <div><Label>Saída 1</Label><Input type="time" {...ajusteForm.register("saida_1")} disabled={!isAdmin} /></div>
                <div><Label>Entrada 2</Label><Input type="time" {...ajusteForm.register("entrada_2")} disabled={!isAdmin} /></div>
                <div><Label>Saída 2</Label><Input type="time" {...ajusteForm.register("saida_2")} disabled={!isAdmin} /></div>
              </div>

              <div><Label>Observações</Label><Textarea {...ajusteForm.register("observacoes")} disabled={!isAdmin} /></div>
              <div><Label>Justificativa*</Label><Textarea {...ajusteForm.register("justificativa")} disabled={!isAdmin} /></div>
              <div><Label>Observação da ação*</Label><Textarea {...ajusteForm.register("observacao")} disabled={!isAdmin} /></div>
              <div className="space-y-2 rounded-xl border border-[var(--g3-border)] bg-slate-50 p-3">
                <Label>Confirmação do ajuste</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-start gap-2 rounded-lg border border-[var(--g3-border)] bg-white p-3">
                    <input
                      type="radio"
                      name="modo-confirmacao-ajuste"
                      className="mt-1"
                      checked={modoConfirmacaoAjuste === "senha"}
                      onChange={() => setModoConfirmacaoAjuste("senha")}
                      disabled={!isAdmin}
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-medium text-slate-900">Somente senha</span>
                      <span className="block text-xs text-[var(--g3-muted)]">Confirma o ajuste apenas com o usuário e a senha do administrador.</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 rounded-lg border border-[var(--g3-border)] bg-white p-3">
                    <input
                      type="radio"
                      name="modo-confirmacao-ajuste"
                      className="mt-1"
                      checked={modoConfirmacaoAjuste === "face"}
                      onChange={() => setModoConfirmacaoAjuste("face")}
                      disabled={!isAdmin}
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-medium text-slate-900">Senha + captura facial</span>
                      <span className="block text-xs text-[var(--g3-muted)]">Exige senha e validação facial para concluir o ajuste.</span>
                    </span>
                  </label>
                </div>
              </div>
              <button type="submit" className="hidden" />
            </form>
          </CardContent>
        </Card>
      </section>
    );
  }

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
                <Button type="button" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={aplicarBusca} disabled={acoesDesabilitadas || filtrosTravados}><Search className="mr-2 h-4 w-4" />Buscar</Button>
                <Button type="button" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={limparParaNovo} disabled={acoesDesabilitadas || filtrosTravados}><Plus className="mr-2 h-4 w-4" />Novo</Button>
                <Button type="button" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={acaoSalvar} disabled={acoesDesabilitadas}><Save className="mr-2 h-4 w-4" />Salvar</Button>
                <Button type="button" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={cancelarEdicao} disabled={acoesDesabilitadas}><Undo2 className="mr-2 h-4 w-4" />Cancelar</Button>
                <Button type="button" variant="danger" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={acaoExcluir} disabled={acoesDesabilitadas}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
                <Button type="button" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={acaoImprimir} disabled={acoesDesabilitadas}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
                <Button type="button" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={acaoFechar} disabled={acoesDesabilitadas}><X className="mr-2 h-4 w-4" />Fechar</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div
          className={`${classesTelaPadraoBeneficiario.gradePrincipal} lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]`}
          data-print="layout-grid"
        >
          <Card className={classesTelaPadraoBeneficiario.cardAbas} data-print="tabs">
            <CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>
              {abas
                .filter((aba) => (aba.id === "ajuste" || aba.id === "hora-extra" ? isAdmin : true))
                .map((aba, index) => (
                  <button
                    key={aba.id}
                    type="button"
                    className={classeBotaoAbaLateral(abaAtiva === aba.id)}
                    onClick={() => selecionarAba(aba.id)}
                  >
                    <span className={classeNumeroAbaLateral(abaAtiva === aba.id)}>{index + 1}</span>
                    <span className="min-w-0 break-words">{aba.label}</span>
                  </button>
                ))}
            </CardContent>
          </Card>

          <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
            <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
              <CardTitle className={classesTelaPadraoBeneficiario.tituloAba}>
                <ClipboardCheck className="h-4 w-4" />
                <span className={classesTelaPadraoBeneficiario.tituloAbaTexto}>
                  {abas.find((aba) => aba.id === abaAtiva)?.label}
                </span>
              </CardTitle>
              {registroSelecionado && (
                <span className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-2 py-1 text-xs text-[var(--g3-active)]">
                  {registroSelecionado.usuario_nome} - {formatarData(registroSelecionado.data)}
                </span>
              )}
            </CardHeader>
            <CardContent className={`space-y-3 p-3 ${abaAtiva === "espelho" ? "overflow-visible" : ""}`}>
              {carregandoLista && abaAtiva === "listagem" && (
                <p className="text-sm text-[var(--g3-muted)]">Carregando registros...</p>
              )}
              {renderAbaConteudo()}
            </CardContent>
          </Card>
        </div>
      </div>

      {mensagem && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setMensagem(null)}
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className={`text-base font-semibold ${mensagem.tipo === "sucesso" ? "text-emerald-800" : "text-red-700"}`}>
                {mensagem.tipo === "sucesso" ? "Confirmação" : "Atenção"}
              </h3>
            </div>
            <div className="px-5 py-4"><p className="text-sm text-slate-700">{mensagem.texto}</p></div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3"><Button type="button" onClick={() => setMensagem(null)}>OK</Button></div>
          </div>
        </div>
      )}

      {popupMarcarAberto && (
        <div className="fixed inset-0 z-[71] flex items-center justify-center bg-slate-900/45 px-4" role="dialog" aria-modal="true" onClick={() => !marcacaoEmAndamento && setPopupMarcarAberto(false)}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Confirmar marcação</h3></div>
            <div className="space-y-2 px-5 py-4">
              <p className="text-sm text-slate-700">Deseja registrar a próxima batida de ponto agora?</p>
              <div className="grid gap-3">
                <div>
                  <Label>Usuário</Label>
                  <Input
                    value={confirmacaoLogin}
                    onChange={(event) => setConfirmacaoLogin(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !marcacaoEmAndamento) {
                        void executarMarcacao();
                      }
                    }}
                    disabled={marcacaoEmAndamento}
                  />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={confirmacaoSenha}
                    onChange={(event) => setConfirmacaoSenha(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !marcacaoEmAndamento) {
                        void executarMarcacao();
                      }
                    }}
                    disabled={marcacaoEmAndamento}
                  />
                </div>
                <div className="space-y-2 rounded-xl border border-[var(--g3-border)] bg-slate-50 p-3">
                  <Label>Confirmação da marcação</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-start gap-2 rounded-lg border border-[var(--g3-border)] bg-white p-3">
                      <input
                        type="radio"
                        name="modo-confirmacao-marcacao"
                        className="mt-1"
                        checked={modoConfirmacaoMarcacao === "senha"}
                        onChange={() => setModoConfirmacaoMarcacao("senha")}
                        disabled={marcacaoEmAndamento}
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium text-slate-900">Somente senha</span>
                        <span className="block text-xs text-[var(--g3-muted)]">Registra o ponto apenas com usuário e senha.</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 rounded-lg border border-[var(--g3-border)] bg-white p-3">
                      <input
                        type="radio"
                        name="modo-confirmacao-marcacao"
                        className="mt-1"
                        checked={modoConfirmacaoMarcacao === "face"}
                        onChange={() => setModoConfirmacaoMarcacao("face")}
                        disabled={marcacaoEmAndamento}
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium text-slate-900">Senha + captura facial</span>
                        <span className="block text-xs text-[var(--g3-muted)]">Exige senha e validação facial para registrar o ponto.</span>
                      </span>
                    </label>
                  </div>
                  {modoConfirmacaoMarcacao === "face" ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <Label>Face atual</Label>
                          <p className="text-xs text-[var(--g3-muted)]">
                            Capture a face do usuário e faça a prova de vida com duas piscadas ou uma leve virada do rosto para validar junto com a senha.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setModoFace("confirmacao");
                            setPopupFaceAberto(true);
                          }}
                          disabled={marcacaoEmAndamento}
                        >
                          Capturar face
                        </Button>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-[var(--g3-border)] bg-white">
                        {confirmacaoFaceImagem ? (
                          <img
                            src={resolverPreviewFace(confirmacaoFaceImagem)}
                            alt="Face capturada para confirmação"
                            className="h-40 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-[var(--g3-muted)]">
                            Nenhuma face capturada para esta marcação.
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      A marcação será confirmada somente com o usuário e a senha.
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-[var(--g3-muted)]">
                A localização será registrada no momento da marcação.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setPopupMarcarAberto(false)} disabled={marcacaoEmAndamento}>Cancelar</Button>
              <Button type="button" onClick={() => void executarMarcacao()} disabled={marcacaoEmAndamento}>{obterTextoBotaoMarcacao()}</Button>
            </div>
          </div>
        </div>
      )}

      {popupCienciaHoraExtraAberto && pendenciaHoraExtra && (
        <div
          className="fixed inset-0 z-[72] flex items-center justify-center bg-slate-900/55 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !registrarCienciaHoraExtraMutation.isPending && setPopupCienciaHoraExtraAberto(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Ciência de hora extra</h3>
            </div>
            <div className="space-y-4 px-5 py-4">
              <p className="text-sm text-slate-700">{pendenciaHoraExtra.mensagem}</p>
              {pendenciaHoraExtra.mensagem_ciencia ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {pendenciaHoraExtra.mensagem_ciencia}
                </div>
              ) : null}
              {pendenciaHoraExtra.status === "EXTRA_PENDENTE_AUTORIZACAO" ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  Esta entrada ficará pendente de análise do RH/gestor até decisão formal.
                </div>
              ) : null}
              <label className="flex items-start gap-2 rounded-lg border border-[var(--g3-border)] bg-slate-50 p-3">
                <Checkbox
                  checked={cienciaHoraExtraConfirmada}
                  onChange={(event) => setCienciaHoraExtraConfirmada(event.target.checked)}
                />
                <span className="text-sm text-slate-700">
                  Declaro ciência de que a realização de hora extra depende de autorização da empresa.
                </span>
              </label>
              <div>
                <Label>Justificativa</Label>
                <Textarea
                  value={justificativaHoraExtra}
                  onChange={(event) => setJustificativaHoraExtra(event.target.value)}
                  rows={4}
                  placeholder="Informe o motivo da entrada antecipada."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPopupCienciaHoraExtraAberto(false)}
                disabled={registrarCienciaHoraExtraMutation.isPending}
              >
                Fechar
              </Button>
              <Button
                type="button"
                onClick={() => void confirmarCienciaHoraExtra()}
                disabled={registrarCienciaHoraExtraMutation.isPending}
              >
                {registrarCienciaHoraExtraMutation.isPending ? "Registrando..." : "Confirmar ciência"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupFaceAberto && (
        <div
          className="fixed inset-0 z-[72] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPopupFaceAberto(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {modoFace === "cadastro" ? "Cadastrar face do usuário" : "Capturar face para a marcação"}
                </h3>
                <p className="text-xs text-slate-500">
                  {modoFace === "cadastro"
                    ? "Centralize o rosto e mantenha boa iluminação antes de capturar."
                    : "Centralize o rosto, mantenha boa iluminação e faça duas piscadas ou vire levemente o rosto quando o sistema solicitar."}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => setPopupFaceAberto(false)}>
                Fechar
              </Button>
            </div>
            <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl border border-[var(--g3-border)] bg-slate-950">
                  <video ref={videoFaceRef} autoPlay muted playsInline className="h-[320px] w-full object-cover" />
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_28%,rgba(15,23,42,0.22)_28.5%,rgba(15,23,42,0.22)_100%)]" />
                    <div className="absolute left-1/2 top-1/2 h-[220px] w-[168px] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.12)]" />
                    <div className="absolute left-1/2 top-[calc(50%-126px)] h-4 w-4 -translate-x-1/2 rounded-full border border-white/85 bg-white/20" />
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/70 px-3 py-1 text-[11px] font-medium text-white">
                      Centralize o rosto dentro do molde
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void (modoFace === "cadastro" ? capturarFaceDaCamera() : validarPiscadaECapturarFace())}
                    disabled={validandoPiscada}
                  >
                    {modoFace === "cadastro"
                      ? "Capturar pela câmera"
                      : validandoPiscada
                        ? "Validando prova de vida..."
                        : "Validar prova de vida e capturar"}
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-[var(--g3-border)] bg-slate-50">
                  {modoFace === "cadastro" ? (
                    previewFaceAtual ? (
                      <img
                        src={resolverPreviewFace(previewFaceAtual)}
                        alt="Prévia da face cadastrada"
                        className="h-56 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-56 items-center justify-center px-4 text-center text-sm text-[var(--g3-muted)]">
                        Nenhuma imagem preparada.
                      </div>
                    )
                  ) : previewFaceAtual ? (
                    <img
                      src={resolverPreviewFace(previewFaceAtual)}
                      alt="Prévia da face para marcação"
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center px-4 text-center text-sm text-[var(--g3-muted)]">
                      Capture a face para concluir a validação.
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--g3-muted)]">
                  {modoFace === "cadastro"
                    ? "Ao salvar, a face do usuário fica pronta para validação no registro de ponto."
                    : "A captura atual será usada junto com a senha na confirmação da marcação, após a prova de vida com duas piscadas ou leve movimento do rosto."}
                </p>
                {modoFace === "confirmacao" ? (
                  <div
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      statusPiscada === "detectada"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : statusPiscada === "falha"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {statusPiscada === "detectada"
                      ? "Prova de vida validada. A face foi aceita para a confirmação do ponto."
                      : statusPiscada === "falha"
                        ? "A prova de vida falhou. Tente novamente com duas piscadas ou uma leve virada do rosto."
                        : "Ao iniciar a validação, olhe para a câmera por alguns segundos e faça duas piscadas ou uma leve virada do rosto."}
                  </div>
                ) : null}
                {previewFaceAtual ? (
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={() => setPopupFaceAberto(false)}>
                      Usar esta captura
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {popupAjusteAberto && (
        <div className="fixed inset-0 z-[71] flex items-center justify-center bg-slate-900/45 px-4" role="dialog" aria-modal="true" onClick={() => !ajusteMutation.isPending && setPopupAjusteAberto(false)}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Confirmar ajuste administrativo</h3></div>
            <div className="space-y-3 px-5 py-4">
              <p className="text-sm text-slate-700">Esta ação ficará registrada na auditoria. Confirme abaixo para continuar.</p>
              <div>
                <Label>Usuário</Label>
                <Input
                  value={confirmacaoLogin}
                  onChange={(event) => setConfirmacaoLogin(event.target.value)}
                  disabled={ajusteMutation.isPending}
                />
              </div>
              <div>
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={confirmacaoSenha}
                  onChange={(event) => setConfirmacaoSenha(event.target.value)}
                  disabled={ajusteMutation.isPending}
                />
              </div>
              {modoConfirmacaoAjuste === "face" ? (
                <div className="space-y-2 rounded-xl border border-[var(--g3-border)] bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>Face atual</Label>
                      <p className="text-xs text-[var(--g3-muted)]">
                        Capture a face do administrador para validar junto com a senha.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setModoFace("confirmacao");
                        setPopupFaceAberto(true);
                      }}
                      disabled={ajusteMutation.isPending}
                    >
                      Capturar face
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-[var(--g3-border)] bg-white">
                    {confirmacaoFaceImagem ? (
                      <img
                        src={resolverPreviewFace(confirmacaoFaceImagem)}
                        alt="Face capturada para confirmação do ajuste"
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-[var(--g3-muted)]">
                        Nenhuma face capturada para esta confirmação.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setPopupAjusteAberto(false)} disabled={ajusteMutation.isPending}>Cancelar</Button>
              <Button type="button" onClick={() => void submitAjuste()} disabled={ajusteMutation.isPending}>{ajusteMutation.isPending ? "Salvando..." : "Salvar ajuste"}</Button>
            </div>
          </div>
        </div>
      )}
      {localizacaoHistoricoSelecionada && (
        <div
          className="fixed inset-0 z-[72] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLocalizacaoHistoricoSelecionada(null)}
        >
          <div
            className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900">Localização registrada</h3>
                <p className="text-xs text-slate-500">
                  {localizacaoHistoricoSelecionada.acao}
                  {localizacaoHistoricoSelecionada.usuario ? ` | ${localizacaoHistoricoSelecionada.usuario}` : ""}
                  {localizacaoHistoricoSelecionada.criadoEm ? ` | ${formatarDataHora(localizacaoHistoricoSelecionada.criadoEm)}` : ""}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => setLocalizacaoHistoricoSelecionada(null)}>
                Fechar
              </Button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <p className="text-sm text-slate-700">
                Latitude {localizacaoHistoricoSelecionada.latitude.toFixed(6)} | Longitude {localizacaoHistoricoSelecionada.longitude.toFixed(6)}
                {typeof localizacaoHistoricoSelecionada.accuracy_metros === "number"
                  ? ` | Precisão aproximada de ${Math.round(localizacaoHistoricoSelecionada.accuracy_metros)} m`
                  : ""}
              </p>
              <div className="overflow-hidden rounded-xl border border-[var(--g3-border)]">
                <MapContainer
                  center={[localizacaoHistoricoSelecionada.latitude, localizacaoHistoricoSelecionada.longitude]}
                  zoom={16}
                  style={{ height: 360, width: "100%" }}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <CircleMarker
                    center={[localizacaoHistoricoSelecionada.latitude, localizacaoHistoricoSelecionada.longitude]}
                    radius={10}
                    pathOptions={{ color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.78 }}
                  >
                    <Popup>Origem da localização do registro de ponto</Popup>
                  </CircleMarker>
                  {typeof localizacaoHistoricoSelecionada.accuracy_metros === "number" ? (
                    <Circle
                      center={[localizacaoHistoricoSelecionada.latitude, localizacaoHistoricoSelecionada.longitude]}
                      radius={localizacaoHistoricoSelecionada.accuracy_metros}
                      pathOptions={{ color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.1 }}
                    />
                  ) : null}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}



