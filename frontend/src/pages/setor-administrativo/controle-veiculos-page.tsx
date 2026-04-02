import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { KeyboardEvent } from "react";
import {
  Car,
  ClipboardList,
  LayoutDashboard,
  List,
  MapPinned,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import {
  useDiarioBordo,
  useLocaisDestinoVeiculo,
  useMotoristasAutorizados,
  useMotoristasDisponiveis,
  useRemoverDiarioBordo,
  useRemoverLocalDestinoVeiculo,
  useRemoverMotoristaAutorizado,
  useRemoverVeiculo,
  useSalvarDiarioBordo,
  useSalvarLocalDestinoVeiculo,
  useSalvarMotoristaAutorizado,
  useSalvarVeiculo,
  useVeiculos
} from "@/features/controle-veiculos/use-controle-veiculos";
import { resolverUrlArquivo } from "@/lib/arquivos";
import {
  formatarCnpj,
  formatarDataPtBr,
  formatarTelefone,
  mascararTelefoneInput,
  normalizarTelefone
} from "@/lib/br-utils";
import { useUnidadeAssistencialAtual } from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import { imprimirConteudoAtual, imprimirHtmlSemJanela } from "@/lib/report-utils";
import { arquivosService } from "@/services/arquivos.service";
import { controleVeiculosService } from "@/services/controle-veiculos.service";
import type {
  LocalDestinoVeiculo,
  MotoristaAutorizado,
  RegistroDiarioBordo,
  VeiculoCadastro
} from "@/types/controle-veiculos";

type AbaId = "dashboard" | "cadastro" | "listagem" | "diario" | "destinos" | "motoristas";

const abas: AdminTab[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "cadastro", label: "Cadastro de veículo", icon: Car },
  { id: "listagem", label: "Listagem de veículos", icon: List },
  { id: "diario", label: "Mapa de bordo", icon: ClipboardList },
  { id: "destinos", label: "Locais de destino", icon: MapPinned },
  { id: "motoristas", label: "Motoristas autorizados", icon: ShieldCheck }
];

const tituloTela = "Controle de veículos";
const classeCardDashboard =
  "border-emerald-200 bg-emerald-100 shadow-[0_14px_30px_-24px_rgba(22,101,52,0.32)]";
const hojeBr = formatarDataPtBr(new Date().toISOString().slice(0, 10));
const documentoVeiculoMaximoBytes = 15 * 1024 * 1024;
const combustiveis = ["Gasolina", "Etanol", "Flex", "Diesel", "GNV", "Elétrico", "Híbrido"];
const categoriasCarteira = ["ACC", "A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"];

const defaultVeiculo: VeiculoCadastro = {
  placa: "",
  modelo: "",
  marca: "",
  cor: "",
  ano: null,
  tipoCombustivel: "",
  mediaConsumoPadrao: null,
  capacidadeTanqueLitros: null,
  observacoes: "",
  ativo: true,
  fotoFrente: null,
  documentoVeiculoPdf: null
};

const defaultDiario: RegistroDiarioBordo = {
  data: hojeBr,
  dataSaida: hojeBr,
  dataChegada: "",
  veiculoId: null,
  localDestinoId: null,
  destino: "",
  condutor: "",
  horarioSaida: "",
  horarioChegada: "",
  kmInicial: null,
  kmFinal: null,
  kmRodados: null,
  observacoes: ""
};

const defaultLocalDestino: LocalDestinoVeiculo = {
  nome: "",
  endereco: "",
  telefone: "",
  observacoes: "",
  ativo: true
};

const defaultMotorista: MotoristaAutorizado = {
  veiculoId: 0,
  tipoOrigem: "PROFISSIONAL",
  motoristaId: 0,
  nomeMotorista: "",
  numeroCarteira: "",
  categoriaCarteira: "",
  vencimentoCarteira: ""
};

type PeriodoImpressaoDiario = {
  aberto: boolean;
  dataInicial: string;
  dataFinal: string;
  veiculoId: number | null;
};

function mascararDataHifen(valor?: string | null) {
  const digitos = String(valor ?? "").replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}-${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 4)}-${digitos.slice(4)}`;
}

function converterDataHifenParaIso(valor?: string | null) {
  const texto = String(valor ?? "").trim();
  if (!texto) return undefined;
  const match = texto.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return undefined;
  const [, dia, mes, ano] = match;
  const data = new Date(`${ano}-${mes}-${dia}T00:00:00`);
  if (Number.isNaN(data.getTime())) return undefined;
  if (
    data.getUTCFullYear() !== Number(ano) ||
    data.getUTCMonth() + 1 !== Number(mes) ||
    data.getUTCDate() !== Number(dia)
  ) {
    return undefined;
  }
  return `${ano}-${mes}-${dia}`;
}

function normalizarDataFormularioParaIso(valor?: string | null) {
  const texto = String(valor ?? "").trim();
  if (!texto) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }
  return converterDataHifenParaIso(texto);
}

function formatarDataFormulario(valor?: string | null) {
  return valor?.trim() ? formatarDataPtBr(valor) : "";
}

function calcularKmRodados(kmInicial?: number | null, kmFinal?: number | null) {
  if (kmInicial == null || kmFinal == null) return 0;
  const diferenca = Number(kmFinal) - Number(kmInicial);
  return diferenca >= 0 ? diferenca : 0;
}

function obterChaveOrdenacaoDiario(registro: RegistroDiarioBordo) {
  const dataReferencia =
    normalizarDataFormularioParaIso(registro.dataSaida || registro.data) ??
    normalizarDataFormularioParaIso(registro.data) ??
    "0000-00-00";
  const horarioReferencia = String(registro.horarioSaida ?? registro.horarioChegada ?? "")
    .trim()
    .padEnd(5, "0");

  return `${dataReferencia}T${horarioReferencia || "00:00"}|${String(registro.id ?? 0).padStart(12, "0")}`;
}

function montarRotuloDestino(local?: LocalDestinoVeiculo | null) {
  if (!local) return "";
  const nome = String(local.nome ?? "").trim();
  const endereco = String(local.endereco ?? "").trim();
  if (nome && endereco) return `${nome} - ${endereco}`;
  return nome || endereco;
}

function mapearDiarioParaFormulario(registro: RegistroDiarioBordo): RegistroDiarioBordo {
  return {
    ...registro,
    data: formatarDataFormulario(registro.data),
    dataSaida: formatarDataFormulario(registro.dataSaida),
    dataChegada: formatarDataFormulario(registro.dataChegada)
  };
}

function escapeHtml(valor: string) {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatarPlacaVisual(valor?: string | null) {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 8);
}

function obterNomeArquivo(valor?: string | null) {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  const partes = texto.split("/");
  return partes[partes.length - 1] ?? texto;
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

function focarProximoCampoComEnter(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }

  const elementoAtual = event.target;
  if (!(elementoAtual instanceof HTMLElement) || elementoAtual.tagName === "TEXTAREA") {
    return;
  }

  const campos = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>("input, select, textarea, button")
  ).filter((elemento) => {
    if (elemento.tabIndex < 0) return false;
    if ("disabled" in elemento && elemento.disabled) return false;
    if ("readOnly" in elemento && elemento.readOnly) return false;
    return true;
  });

  const indiceAtual = campos.indexOf(elementoAtual);
  if (indiceAtual < 0) return;

  const proximoCampo = campos[indiceAtual + 1];
  if (!proximoCampo) return;

  event.preventDefault();
  proximoCampo.focus();
}

function arquivoEhPdf(arquivo: File) {
  return arquivo.type === "application/pdf" || arquivo.name.toLowerCase().endsWith(".pdf");
}

function PlacaVeiculoVisual({ placa }: { placa?: string | null }) {
  const placaFormatada = formatarPlacaVisual(placa);

  if (!placaFormatada) {
    return <span className="text-sm text-[var(--g3-muted)]">---</span>;
  }

  return (
    <div className="inline-flex w-[146px] overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
      <div className="w-full">
        <div className="flex items-center justify-between bg-[#0f4fa8] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white">
          <span>Brasil</span>
          <span>Mercosul</span>
        </div>
        <div className="flex min-h-[42px] items-center justify-center px-3 py-2 font-mono text-base font-black tracking-[0.28em] text-slate-900">
          {placaFormatada}
        </div>
      </div>
    </div>
  );
}

export function ControleVeiculosPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("dashboard");
  const [veiculoForm, setVeiculoForm] = useState<VeiculoCadastro>(defaultVeiculo);
  const [diarioForm, setDiarioForm] = useState<RegistroDiarioBordo>(defaultDiario);
  const [localDestinoForm, setLocalDestinoForm] = useState<LocalDestinoVeiculo>(defaultLocalDestino);
  const [motoristaForm, setMotoristaForm] = useState<MotoristaAutorizado>(defaultMotorista);
  const [termoMotorista, setTermoMotorista] = useState("");
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [periodoImpressaoDiario, setPeriodoImpressaoDiario] = useState<PeriodoImpressaoDiario>({
    aberto: false,
    dataInicial: hojeBr,
    dataFinal: hojeBr,
    veiculoId: null
  });
  const [fotoVeiculoArquivo, setFotoVeiculoArquivo] = useState<File | null>(null);
  const [fotoVeiculoPreview, setFotoVeiculoPreview] = useState("");
  const [enviandoFotoVeiculo, setEnviandoFotoVeiculo] = useState(false);
  const [documentoVeiculoArquivo, setDocumentoVeiculoArquivo] = useState<File | null>(null);
  const [enviandoDocumentoVeiculo, setEnviandoDocumentoVeiculo] = useState(false);

  const unidadeAtualQuery = useUnidadeAssistencialAtual();
  const { data: veiculosData } = useVeiculos();
  const { data: diarioData } = useDiarioBordo();
  const { data: locaisDestinoData } = useLocaisDestinoVeiculo();
  const { data: motoristasAutorizadosData } = useMotoristasAutorizados();
  const { data: motoristasVeiculoData } = useMotoristasAutorizados(diarioForm.veiculoId ?? undefined);
  const { data: motoristasDisponiveisData } = useMotoristasDisponiveis(termoMotorista);

  const salvarVeiculoMutation = useSalvarVeiculo();
  const salvarDiarioMutation = useSalvarDiarioBordo();
  const salvarLocalDestinoMutation = useSalvarLocalDestinoVeiculo();
  const salvarMotoristaMutation = useSalvarMotoristaAutorizado();
  const removerVeiculoMutation = useRemoverVeiculo();
  const removerDiarioMutation = useRemoverDiarioBordo();
  const removerLocalDestinoMutation = useRemoverLocalDestinoVeiculo();
  const removerMotoristaMutation = useRemoverMotoristaAutorizado();

  const veiculos = veiculosData ?? [];
  const diarios = useMemo(
    () =>
      [...(diarioData ?? [])].sort((primeiro, segundo) =>
        obterChaveOrdenacaoDiario(segundo).localeCompare(obterChaveOrdenacaoDiario(primeiro))
      ),
    [diarioData]
  );
  const locaisDestino = locaisDestinoData ?? [];
  const motoristasAutorizados = motoristasAutorizadosData ?? [];
  const motoristasVeiculo = motoristasVeiculoData ?? [];
  const motoristasDisponiveis = (motoristasDisponiveisData ?? []).filter(
    (item) => item.tipoOrigem === motoristaForm.tipoOrigem
  );
  const termoMotoristaNormalizado = termoMotorista.trim().toLocaleLowerCase("pt-BR");
  const motoristaSelecionadoNormalizado = String(motoristaForm.nomeMotorista ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");
  const mostrarSugestoesMotorista =
    termoMotoristaNormalizado.length >= 2 &&
    termoMotoristaNormalizado !== motoristaSelecionadoNormalizado;
  const locaisDestinoAtivos = locaisDestino.filter((item) => item.ativo !== false);

  const carregandoAcoes =
    salvarVeiculoMutation.isPending ||
    salvarDiarioMutation.isPending ||
    salvarLocalDestinoMutation.isPending ||
    salvarMotoristaMutation.isPending ||
    removerVeiculoMutation.isPending ||
    removerDiarioMutation.isPending ||
    removerLocalDestinoMutation.isPending ||
    removerMotoristaMutation.isPending ||
    enviandoFotoVeiculo ||
    enviandoDocumentoVeiculo;

  const veiculoSelecionadoDiario = veiculos.find((item) => item.id === diarioForm.veiculoId) ?? null;
  const veiculoSelecionadoListagem =
    veiculos.find((item) => item.id === veiculoForm.id) ?? veiculos[0] ?? null;

  const kmRodadosFormulario = useMemo(
    () => calcularKmRodados(diarioForm.kmInicial, diarioForm.kmFinal),
    [diarioForm.kmFinal, diarioForm.kmInicial]
  );

  const dashboard = useMemo(() => {
    const totalVeiculos = veiculos.length;
    const veiculosAtivos = veiculos.filter((item) => item.ativo !== false).length;
    const totalRotas = diarios.length;
    const kmTotalRodado = diarios.reduce(
      (total, item) => total + (item.kmRodados ?? calcularKmRodados(item.kmInicial, item.kmFinal)),
      0
    );

    return {
      totalVeiculos,
      veiculosAtivos,
      totalRotas,
      kmTotalRodado,
      locaisDestino: locaisDestinoAtivos.length,
      motoristasAutorizados: motoristasAutorizados.length
    };
  }, [diarios, locaisDestinoAtivos.length, motoristasAutorizados.length, veiculos]);

  const rotasRecentes = useMemo(() => diarios.slice(0, 6), [diarios]);

  async function salvarVeiculoComArquivos(payloadBase: VeiculoCadastro) {
    const arquivosTemporariosCriados: number[] = [];
    let payloadFinal: VeiculoCadastro = { ...payloadBase };

    try {
      if (fotoVeiculoArquivo) {
        setEnviandoFotoVeiculo(true);
        const uploadFoto = await controleVeiculosService.uploadFotoVeiculo(
          fotoVeiculoArquivo,
          payloadBase.id ?? null
        );
        if (uploadFoto.id) {
          arquivosTemporariosCriados.push(uploadFoto.id);
        }
        payloadFinal = {
          ...payloadFinal,
          fotoFrente: uploadFoto.caminhoArquivo
        };
      }

      if (documentoVeiculoArquivo) {
        setEnviandoDocumentoVeiculo(true);
        const uploadDocumento = await controleVeiculosService.uploadDocumentoVeiculo(
          documentoVeiculoArquivo,
          payloadBase.id ?? null
        );
        if (uploadDocumento.id) {
          arquivosTemporariosCriados.push(uploadDocumento.id);
        }
        payloadFinal = {
          ...payloadFinal,
          documentoVeiculoPdf: uploadDocumento.caminhoArquivo
        };
      }

      const salvo = await salvarVeiculoMutation.mutateAsync(payloadFinal);
      setFotoVeiculoArquivo(null);
      setFotoVeiculoPreview("");
      setDocumentoVeiculoArquivo(null);
      return salvo;
    } catch (error) {
      for (const arquivoId of arquivosTemporariosCriados) {
        try {
          await arquivosService.excluir(arquivoId);
        } catch {}
      }
      throw error;
    } finally {
      setEnviandoFotoVeiculo(false);
      setEnviandoDocumentoVeiculo(false);
    }
  }

  async function salvar() {
    try {
      if (abaAtiva === "dashboard" || abaAtiva === "listagem") {
        setPopupMensagem({
          tipo: "aviso",
          titulo: "Atenção",
          texto: "Selecione uma aba de cadastro para salvar informações."
        });
        return;
      }

      if (abaAtiva === "cadastro") {
        if (
          !String(veiculoForm.placa ?? "").trim() ||
          !String(veiculoForm.modelo ?? "").trim() ||
          !String(veiculoForm.marca ?? "").trim()
        ) {
          setPopupMensagem({
            tipo: "aviso",
            titulo: "Validação",
            texto: "Informe placa, modelo e marca do veículo."
          });
          return;
        }

        const response = await salvarVeiculoComArquivos({
          ...veiculoForm,
          placa: String(veiculoForm.placa ?? "").trim().toUpperCase()
        });
        setVeiculoForm(response);
        setPopupMensagem({
          tipo: "sucesso",
          titulo: "Confirmação",
          texto: "Veículo salvo com sucesso."
        });
        return;
      }

      if (abaAtiva === "diario") {
        const dataRegistro = converterDataHifenParaIso(diarioForm.data);
        const dataSaida = converterDataHifenParaIso(diarioForm.dataSaida);
        const dataChegada = converterDataHifenParaIso(diarioForm.dataChegada);
        const localSelecionado =
          locaisDestinoAtivos.find((item) => item.id === diarioForm.localDestinoId) ?? null;

        if (!diarioForm.veiculoId || !dataRegistro || !diarioForm.condutor?.trim() || !localSelecionado) {
          setPopupMensagem({
            tipo: "aviso",
            titulo: "Validação",
            texto: "Informe veículo, data, condutor e destino do mapa de bordo."
          });
          return;
        }

        if (diarioForm.dataSaida?.trim() && !dataSaida) {
          setPopupMensagem({
            tipo: "aviso",
            titulo: "Validação",
            texto: "A data de saída deve estar no formato dd-mm-aaaa."
          });
          return;
        }

        if (diarioForm.dataChegada?.trim() && !dataChegada) {
          setPopupMensagem({
            tipo: "aviso",
            titulo: "Validação",
            texto: "A data de chegada deve estar no formato dd-mm-aaaa."
          });
          return;
        }

        const response = await salvarDiarioMutation.mutateAsync({
          ...diarioForm,
          data: dataRegistro,
          dataSaida: dataSaida ?? dataRegistro,
          dataChegada,
          destino: montarRotuloDestino(localSelecionado),
          kmRodados: kmRodadosFormulario
        });
        setDiarioForm(mapearDiarioParaFormulario(response));
        setPopupMensagem({
          tipo: "sucesso",
          titulo: "Confirmação",
          texto: "Mapa de bordo salvo com sucesso."
        });
        return;
      }

      if (abaAtiva === "destinos") {
        if (!String(localDestinoForm.nome ?? "").trim()) {
          setPopupMensagem({
            tipo: "aviso",
            titulo: "Validação",
            texto: "Informe o nome do local de destino."
          });
          return;
        }

        const telefoneLocalDestino = normalizarTelefone(localDestinoForm.telefone);
        if (String(localDestinoForm.telefone ?? "").trim() && ![10, 11].includes(telefoneLocalDestino.length)) {
          setPopupMensagem({
            tipo: "aviso",
            titulo: "Validação",
            texto: "Informe um telefone com 10 ou 11 dígitos."
          });
          return;
        }

        const response = await salvarLocalDestinoMutation.mutateAsync({
          ...localDestinoForm,
          telefone: telefoneLocalDestino || undefined
        });
        setLocalDestinoForm(response);
        setPopupMensagem({
          tipo: "sucesso",
          titulo: "Confirmação",
          texto: "Local de destino salvo com sucesso."
        });
        return;
      }

      const vencimentoCarteira = motoristaForm.vencimentoCarteira?.trim()
        ? normalizarDataFormularioParaIso(motoristaForm.vencimentoCarteira)
        : undefined;

      if (!motoristaForm.veiculoId || !motoristaForm.motoristaId) {
        setPopupMensagem({
          tipo: "aviso",
          titulo: "Validação",
          texto: "Informe o veículo e selecione o motorista autorizado."
        });
        return;
      }

      if (motoristaForm.vencimentoCarteira?.trim() && !vencimentoCarteira) {
        setPopupMensagem({
          tipo: "aviso",
          titulo: "Validação",
          texto: "O vencimento da carteira deve estar no formato dd-mm-aaaa."
        });
        return;
      }

      const response = await salvarMotoristaMutation.mutateAsync({
        ...motoristaForm,
        vencimentoCarteira
      });
      setMotoristaForm({
        ...response,
        vencimentoCarteira: response.vencimentoCarteira ?? ""
      });
      setTermoMotorista(response.nomeMotorista ?? "");
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Motorista autorizado salvo com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar."
      });
    }
  }

  function novo() {
    if (abaAtiva === "dashboard") return;
    if (abaAtiva === "cadastro") {
      setVeiculoForm(defaultVeiculo);
      setFotoVeiculoArquivo(null);
      setFotoVeiculoPreview("");
      setDocumentoVeiculoArquivo(null);
      return;
    }
    if (abaAtiva === "listagem") {
      setVeiculoForm(defaultVeiculo);
      setFotoVeiculoArquivo(null);
      setFotoVeiculoPreview("");
      setDocumentoVeiculoArquivo(null);
      setAbaAtiva("cadastro");
      return;
    }
    if (abaAtiva === "diario") {
      setDiarioForm(defaultDiario);
      return;
    }
    if (abaAtiva === "destinos") {
      setLocalDestinoForm(defaultLocalDestino);
      return;
    }
    setMotoristaForm(defaultMotorista);
    setTermoMotorista("");
  }

  function cancelar() {
    novo();
  }

  function editarVeiculoSelecionado() {
    const veiculoSelecionado = veiculoSelecionadoListagem;
    if (!veiculoSelecionado) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um veículo para editar."
      });
      return;
    }

    setVeiculoForm(veiculoSelecionado);
    setFotoVeiculoArquivo(null);
    setFotoVeiculoPreview("");
    setDocumentoVeiculoArquivo(null);
    setAbaAtiva("cadastro");
  }

  function excluir() {
    const possuiId =
      ((abaAtiva === "cadastro" || abaAtiva === "listagem") && !!veiculoForm.id) ||
      (abaAtiva === "diario" && !!diarioForm.id) ||
      (abaAtiva === "destinos" && !!localDestinoForm.id) ||
      (abaAtiva === "motoristas" && !!motoristaForm.id);

    if (!possuiId) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um registro para excluir."
      });
      return;
    }

    setConfirmarExcluir(true);
  }

  function selecionarMotoristaDisponivel(item: { id: number; nome: string; tipoOrigem: string }) {
    setMotoristaForm((atual) => ({
      ...atual,
      tipoOrigem: item.tipoOrigem === "VOLUNTARIO" ? "VOLUNTARIO" : "PROFISSIONAL",
      motoristaId: item.id,
      nomeMotorista: item.nome
    }));
    setTermoMotorista(item.nome);
  }

  async function confirmarExclusao() {
    try {
      if ((abaAtiva === "cadastro" || abaAtiva === "listagem") && veiculoForm.id) {
        await removerVeiculoMutation.mutateAsync(veiculoForm.id);
        setVeiculoForm(defaultVeiculo);
        setFotoVeiculoArquivo(null);
        setFotoVeiculoPreview("");
        setDocumentoVeiculoArquivo(null);
      }
      if (abaAtiva === "diario" && diarioForm.id) {
        await removerDiarioMutation.mutateAsync(diarioForm.id);
        setDiarioForm(defaultDiario);
      }
      if (abaAtiva === "destinos" && localDestinoForm.id) {
        await removerLocalDestinoMutation.mutateAsync(localDestinoForm.id);
        setLocalDestinoForm(defaultLocalDestino);
      }
      if (abaAtiva === "motoristas" && motoristaForm.id) {
        await removerMotoristaMutation.mutateAsync(motoristaForm.id);
        setMotoristaForm(defaultMotorista);
        setTermoMotorista("");
      }

      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Registro excluído com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir."
      });
    } finally {
      setConfirmarExcluir(false);
    }
  }

  function abrirImpressaoDiarioBordo() {
    const datasDisponiveis = diarios
      .map((item) => normalizarDataFormularioParaIso(item.dataSaida || item.data))
      .filter((valor): valor is string => Boolean(valor))
      .sort();

    const dataPadraoInicial = datasDisponiveis[0] ? formatarDataPtBr(datasDisponiveis[0]) : hojeBr;
    const dataPadraoFinal = datasDisponiveis[datasDisponiveis.length - 1]
      ? formatarDataPtBr(datasDisponiveis[datasDisponiveis.length - 1])
      : hojeBr;

    setPeriodoImpressaoDiario({
      aberto: true,
      dataInicial: dataPadraoInicial,
      dataFinal: dataPadraoFinal,
      veiculoId: diarioForm.veiculoId ?? veiculoForm.id ?? null
    });
  }

  function imprimirDiarioBordoVeiculo() {
    const dataInicialIso = normalizarDataFormularioParaIso(periodoImpressaoDiario.dataInicial);
    const dataFinalIso = normalizarDataFormularioParaIso(periodoImpressaoDiario.dataFinal);
    const veiculoSelecionadoImpressao =
      veiculos.find((item) => item.id === periodoImpressaoDiario.veiculoId) ?? null;

    if (!dataInicialIso || !dataFinalIso) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe uma data inicial e uma data final válidas para imprimir o mapa de bordo."
      });
      return;
    }

    if (dataInicialIso > dataFinalIso) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "A data inicial não pode ser maior que a data final."
      });
      return;
    }

    if (!veiculoSelecionadoImpressao) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Selecione o veículo que deseja imprimir no mapa de bordo."
      });
      return;
    }

    const diariosFiltrados = diarios
      .filter((item) => {
        const dataReferencia = normalizarDataFormularioParaIso(item.dataSaida || item.data);
        if (!dataReferencia) return false;
        if (item.veiculoId !== veiculoSelecionadoImpressao.id) return false;
        return dataReferencia >= dataInicialIso && dataReferencia <= dataFinalIso;
      })
      .sort((primeiro, segundo) => {
        const dataPrimeiro = normalizarDataFormularioParaIso(primeiro.dataSaida || primeiro.data) ?? "";
        const dataSegundo = normalizarDataFormularioParaIso(segundo.dataSaida || segundo.data) ?? "";
        return dataPrimeiro.localeCompare(dataSegundo);
      });

    if (!diariosFiltrados.length) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Nenhum mapa de bordo foi encontrado no período informado."
      });
      return;
    }

    const linhas = diariosFiltrados
      .map((item) => {
        const veiculoLinha = veiculos.find((veiculo) => veiculo.id === item.veiculoId) ?? null;
        const destino = item.localDestinoNome || item.destino || "---";
        const kmRodados = item.kmRodados ?? calcularKmRodados(item.kmInicial, item.kmFinal);
        return `
        <tr>
          <td>${escapeHtml(formatarDataPtBr(normalizarDataFormularioParaIso(item.dataSaida || item.data) ?? item.data ?? ""))}</td>
          <td>${escapeHtml(veiculoLinha?.placa ?? "---")}</td>
          <td>${escapeHtml(item.condutor ?? "---")}</td>
          <td>${escapeHtml(item.horarioSaida ?? "---")}</td>
          <td>${escapeHtml(item.horarioChegada ?? "---")}</td>
          <td>${escapeHtml(String(kmRodados || 0))}</td>
          <td>${escapeHtml(destino)}</td>
        </tr>
      `;
      })
      .join("");
    const preencherCampo = (valor?: string | number | null) => {
      const texto = String(valor ?? "").trim();
      return texto ? escapeHtml(texto) : "&nbsp;";
    };
    const dataEmissao = formatarDataPtBr(new Date().toISOString().slice(0, 10));
    const veiculoDescricao = veiculoSelecionadoImpressao
      ? `${veiculoSelecionadoImpressao.placa ?? ""}${veiculoSelecionadoImpressao.modelo ? ` - ${veiculoSelecionadoImpressao.modelo}` : ""}`
      : "";
    const periodoDescricao = `${formatarDataPtBr(dataInicialIso)} até ${formatarDataPtBr(dataFinalIso)}`;
    const unidadeAtual = unidadeAtualQuery.data?.unidade;
    const nomeInstituicao =
      unidadeAtual?.razao_social?.trim() ||
      unidadeAtual?.nome_fantasia?.trim() ||
      "Instituição não cadastrada";
    const logomarcaRelatorio = resolverUrlArquivo(unidadeAtual?.logomarca_relatorio || unidadeAtual?.logomarca);
    const rodapeInstitucional = montarRodapeInstitucional(unidadeAtual ?? undefined);

    try {
      imprimirHtmlSemJanela({
        titulo: "Mapa de bordo",
        tamanhoPagina: "A4 landscape",
        margemPagina: "10mm",
        paddingRaiz: "18px",
        html: `
          <div class="folha">
            <div class="topo">
              <div class="g3-topo-faixa">
                <span class="g3-topo-marca">G3N</span>
                <span class="g3-topo-selo">Controle de veículos</span>
              </div>
              <div class="g3-topo-corpo">
                ${logomarcaRelatorio ? `<img src="${escapeHtml(logomarcaRelatorio)}" alt="Logomarca da instituição" class="g3-topo-logo" />` : ""}
                <div class="g3-topo-texto">
                  <h1>${escapeHtml(nomeInstituicao)}</h1>
                  <h2>Mapa de bordo</h2>
                  <p class="subtitulo">Relatório gerado a partir dos lançamentos registrados na tela de controle de veículos.</p>
                </div>
              </div>
              <div class="meta-grid">
                <div class="meta-item">
                  <strong>Período</strong>
                  <span class="meta-linha">${preencherCampo(periodoDescricao)}</span>
                </div>
                <div class="meta-item">
                  <strong>Veículo</strong>
                  <span class="meta-linha">${preencherCampo(veiculoDescricao)}</span>
                </div>
                <div class="meta-item">
                  <strong>Placa</strong>
                  <span class="meta-linha">${preencherCampo(veiculoSelecionadoImpressao?.placa)}</span>
                </div>
                <div class="meta-item">
                  <strong>Emitido em</strong>
                  <span class="meta-linha">${preencherCampo(dataEmissao)}</span>
                </div>
              </div>
            </div>
            <div class="tabela-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Veículo</th>
                    <th>Condutor</th>
                    <th>Saída</th>
                    <th>Chegada</th>
                    <th>Km rodados</th>
                    <th>Destino</th>
                  </tr>
                </thead>
                <tbody>${linhas}</tbody>
              </table>
            </div>
            <footer class="rodape">
              <div>${escapeHtml(rodapeInstitucional.linha1)}</div>
              ${rodapeInstitucional.linha2 ? `<div>${escapeHtml(rodapeInstitucional.linha2)}</div>` : ""}
              ${rodapeInstitucional.linha3 ? `<div>${escapeHtml(rodapeInstitucional.linha3)}</div>` : ""}
              <div>Emitido em ${escapeHtml(dataEmissao)}</div>
            </footer>
          </div>
        `,
        estilosExtras: `
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; color: #0f172a; background: #fff; }
          .folha { padding: 18px; }
          .topo {
            border: 1px solid #bbf7d0;
            border-radius: 18px;
            background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
            margin-bottom: 16px;
            overflow: hidden;
          }
          .g3-topo-faixa {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 18px;
            background: #0f8a57;
            color: #ffffff;
          }
          .g3-topo-marca { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; }
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
          .g3-topo-texto { text-align: center; }
          h1 { margin: 0; font-size: 18px; font-weight: 700; color: #14532d; }
          h2 {
            margin: 4px 0 6px;
            font-size: 24px;
            line-height: 1.1;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #1f2937;
            font-weight: 800;
          }
          .subtitulo { margin: 0; font-size: 12px; color: #475569; }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            padding: 0 18px 18px;
          }
          .meta-item {
            min-height: 74px;
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            background: #fff;
            padding: 10px 12px;
          }
          .meta-item strong {
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #166534;
          }
          .meta-linha {
            display: block;
            min-height: 20px;
            margin-top: 14px;
            border-bottom: 1px solid #0f172a;
            font-size: 12px;
          }
          .tabela-wrap {
            overflow: hidden;
            border: 1px solid #cbd5e1;
            border-radius: 18px;
          }
          table { width: 100%; border-collapse: collapse; }
          th {
            background: #166534;
            color: #fff;
            padding: 10px 8px;
            border: 1px solid #166534;
            font-size: 11px;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          td {
            border: 1px solid #cbd5e1;
            padding: 8px;
            font-size: 12px;
          }
          .rodape {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #dbe7df;
            font-size: 11px;
            color: #6b7f75;
            text-align: center;
          }
          .rodape div + div { margin-top: 2px; }
        `
      });
      setPeriodoImpressaoDiario((atual) => ({ ...atual, aberto: false }));
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível preparar a impressão do mapa de bordo."
      });
    }
  }

  function imprimir() {
    if (abaAtiva === "diario") {
      abrirImpressaoDiarioBordo();
      return;
    }

    try {
      imprimirConteudoAtual({ titulo: "Relatório de controle de veículos" });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível preparar a impressão."
      });
    }
  }

  function selecionarFotoVeiculo(arquivo?: File | null) {
    if (!arquivo) {
      setFotoVeiculoArquivo(null);
      setFotoVeiculoPreview("");
      return;
    }

    setFotoVeiculoArquivo(arquivo);
    const reader = new FileReader();
    reader.onload = () => {
      setFotoVeiculoPreview(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(arquivo);
  }

  function selecionarDocumentoVeiculo(arquivo?: File | null) {
    if (!arquivo) {
      setDocumentoVeiculoArquivo(null);
      return;
    }

    if (!arquivoEhPdf(arquivo)) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Envie apenas arquivo PDF para o documento do veículo."
      });
      return;
    }

    if (arquivo.size > documentoVeiculoMaximoBytes) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "O PDF do documento do veículo deve ter no máximo 15 MB."
      });
      return;
    }

    setDocumentoVeiculoArquivo(arquivo);
  }

  function abrirDocumentoVeiculo(caminhoArquivo?: string | null) {
    const url = resolverUrlArquivo(caminhoArquivo);
    if (!url) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Nenhum documento do veículo foi enviado."
      });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function abrirLocalDestinoNoGoogleMaps(endereco?: string | null) {
    const enderecoInformado = String(endereco ?? "").trim();
    if (!enderecoInformado) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Informe o endereço do destino para localizar no Google Maps."
      });
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoInformado)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const acoesPorAba: Record<AbaId, AdminAction[]> = {
    dashboard: [
      {
        label: "Buscar painel",
        icon: Search,
        onClick: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
        variant: "outline"
      },
      {
        label: "Abrir cadastro de veículo",
        icon: Plus,
        onClick: () => {
          setAbaAtiva("cadastro");
          setVeiculoForm(defaultVeiculo);
          setFotoVeiculoArquivo(null);
          setFotoVeiculoPreview("");
          setDocumentoVeiculoArquivo(null);
        },
        variant: "default",
        disabled: carregandoAcoes
      },
      { label: "Imprimir painel", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ],
    cadastro: [
      {
        label: "Buscar veículos",
        icon: Search,
        onClick: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
        variant: "outline"
      },
      { label: "Novo veículo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
      { label: "Salvar veículo", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
      { label: "Cancelar cadastro", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
      { label: "Excluir veículo", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
      { label: "Imprimir cadastro do veículo", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ],
    listagem: [
      {
        label: "Buscar veículos",
        icon: Search,
        onClick: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
        variant: "outline"
      },
      { label: "Novo veículo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
      {
        label: "Editar veículo",
        icon: Pencil,
        onClick: editarVeiculoSelecionado,
        variant: "default",
        disabled: carregandoAcoes || !veiculoSelecionadoListagem
      },
      { label: "Cancelar seleção", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
      { label: "Excluir veículo", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
      { label: "Imprimir veículos", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ],
    diario: [
      {
        label: "Buscar mapas de bordo",
        icon: Search,
        onClick: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
        variant: "outline"
      },
      { label: "Novo mapa de bordo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
      { label: "Salvar mapa de bordo", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
      { label: "Cancelar edição", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
      { label: "Excluir mapa de bordo", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
      { label: "Imprimir mapa de bordo", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ],
    destinos: [
      {
        label: "Buscar destinos",
        icon: Search,
        onClick: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
        variant: "outline"
      },
      { label: "Novo destino", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
      { label: "Salvar destino", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
      { label: "Cancelar edição", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
      { label: "Excluir destino", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
      { label: "Imprimir destinos", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ],
    motoristas: [
      {
        label: "Buscar motoristas autorizados",
        icon: Search,
        onClick: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
        variant: "outline"
      },
      { label: "Novo motorista autorizado", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
      { label: "Salvar motorista autorizado", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
      { label: "Cancelar edição", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
      { label: "Excluir motorista autorizado", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
      { label: "Imprimir motoristas autorizados", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ]
  };

  const acoes = acoesPorAba[abaAtiva];

  const codeBadge =
    abaAtiva === "cadastro" && veiculoForm.placa
      ? `Placa: ${veiculoForm.placa}`
      : abaAtiva === "listagem" && veiculoSelecionadoListagem?.placa
        ? `Placa: ${veiculoSelecionadoListagem.placa}`
      : abaAtiva === "diario" && diarioForm.id
        ? `Mapa: ${diarioForm.id}`
        : abaAtiva === "destinos" && localDestinoForm.nome
          ? `Destino: ${localDestinoForm.nome}`
          : abaAtiva === "motoristas" && motoristaForm.nomeMotorista
            ? `Motorista: ${motoristaForm.nomeMotorista}`
            : "Novo";

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => {
          const proximaAba = tabId as AbaId;
          if (proximaAba === "listagem" && !veiculoForm.id && veiculos[0]) {
            setVeiculoForm(veiculos[0]);
            setFotoVeiculoArquivo(null);
            setFotoVeiculoPreview("");
            setDocumentoVeiculoArquivo(null);
          }
          setAbaAtiva(proximaAba);
        }}
        actions={acoes}
        sectionLabel="Setor administrativo"
        pageTitle={tituloTela}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={codeBadge}
        actionsClassName="lg:max-w-[48rem] xl:max-w-[54rem]"
        actionButtonClassName="h-auto min-h-9 px-2 py-1.5 text-[10px] leading-tight whitespace-normal text-center lg:max-w-[9rem] lg:px-2"
      >
        {abaAtiva === "dashboard" ? (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <Card className={classeCardDashboard}><CardHeader className="items-center px-3 pb-1 pt-3 text-center"><CardTitle className="text-[11px] font-semibold tracking-[0.02em] text-emerald-900">Total de veículos</CardTitle></CardHeader><CardContent className="px-3 pb-3 pt-0 text-center text-xl font-semibold text-emerald-950">{dashboard.totalVeiculos}</CardContent></Card>
              <Card className={classeCardDashboard}><CardHeader className="items-center px-3 pb-1 pt-3 text-center"><CardTitle className="text-[11px] font-semibold tracking-[0.02em] text-emerald-900">Veículos ativos</CardTitle></CardHeader><CardContent className="px-3 pb-3 pt-0 text-center text-xl font-semibold text-emerald-950">{dashboard.veiculosAtivos}</CardContent></Card>
              <Card className={classeCardDashboard}><CardHeader className="items-center px-3 pb-1 pt-3 text-center"><CardTitle className="text-[11px] font-semibold tracking-[0.02em] text-emerald-900">Rotas registradas</CardTitle></CardHeader><CardContent className="px-3 pb-3 pt-0 text-center text-xl font-semibold text-emerald-950">{dashboard.totalRotas}</CardContent></Card>
              <Card className={classeCardDashboard}><CardHeader className="items-center px-3 pb-1 pt-3 text-center"><CardTitle className="text-[11px] font-semibold tracking-[0.02em] text-emerald-900">Km rodados</CardTitle></CardHeader><CardContent className="px-3 pb-3 pt-0 text-center text-xl font-semibold text-emerald-950">{dashboard.kmTotalRodado}</CardContent></Card>
              <Card className={classeCardDashboard}><CardHeader className="items-center px-3 pb-1 pt-3 text-center"><CardTitle className="text-[11px] font-semibold tracking-[0.02em] text-emerald-900">Locais de destino</CardTitle></CardHeader><CardContent className="px-3 pb-3 pt-0 text-center text-xl font-semibold text-emerald-950">{dashboard.locaisDestino}</CardContent></Card>
              <Card className={classeCardDashboard}><CardHeader className="items-center px-3 pb-1 pt-3 text-center"><CardTitle className="text-[11px] font-semibold tracking-[0.02em] text-emerald-900">Motoristas autorizados</CardTitle></CardHeader><CardContent className="px-3 pb-3 pt-0 text-center text-xl font-semibold text-emerald-950">{dashboard.motoristasAutorizados}</CardContent></Card>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Veículo</th><th className="px-3 py-2 text-left">Condutor</th><th className="px-3 py-2 text-left">Destino</th><th className="px-3 py-2 text-left">Km rodados</th></tr></thead>
                <tbody>{rotasRecentes.length ? rotasRecentes.map((item, index) => <tr key={item.id ?? `${item.veiculoId}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{formatarDataPtBr(item.dataSaida || item.data)}</td><td className="px-3 py-2">{veiculos.find((veiculo) => veiculo.id === item.veiculoId)?.placa ?? "---"}</td><td className="px-3 py-2">{item.condutor ?? "---"}</td><td className="px-3 py-2">{item.localDestinoNome || item.destino || "---"}</td><td className="px-3 py-2">{item.kmRodados ?? calcularKmRodados(item.kmInicial, item.kmFinal)}</td></tr>) : <tr><td className="px-3 py-4 text-center" colSpan={5}>Nenhuma rota cadastrada até o momento.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "cadastro" ? (
          <section className="space-y-4">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[var(--g3-active)]">Dados do veículo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1"><Label>Placa *</Label><Input value={veiculoForm.placa ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, placa: event.target.value.toUpperCase() }))} /></div>
                  <div className="space-y-1"><Label>Modelo *</Label><Input value={veiculoForm.modelo ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, modelo: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Marca *</Label><Input value={veiculoForm.marca ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, marca: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Cor do veículo</Label><Input value={veiculoForm.cor ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, cor: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Ano</Label><Input type="number" min={1900} max={2100} value={veiculoForm.ano ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, ano: Number(event.target.value) || null }))} /></div>
                  <div className="space-y-1"><Label>Combustível</Label><Select value={veiculoForm.tipoCombustivel ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, tipoCombustivel: event.target.value }))}><option value="">Selecione</option>{combustiveis.map((item) => <option key={item} value={item}>{item}</option>)}</Select></div>
                  <div className="space-y-1"><Label>Média de consumo (km/l)</Label><Input type="number" min={0} step="0.01" value={veiculoForm.mediaConsumoPadrao ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, mediaConsumoPadrao: Number(event.target.value) || null }))} /></div>
                  <div className="space-y-1"><Label>Capacidade do tanque (litros)</Label><Input type="number" min={0} step="0.01" value={veiculoForm.capacidadeTanqueLitros ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, capacidadeTanqueLitros: Number(event.target.value) || null }))} /></div>
                  <label className="inline-flex items-center gap-2 pt-7 text-sm"><input type="checkbox" checked={!!veiculoForm.ativo} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, ativo: event.target.checked }))} />Veículo ativo</label>
                  <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={3} value={veiculoForm.observacoes ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[var(--g3-active)]">Foto do veículo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label>Arquivo de imagem</Label><Input type="file" accept="image/*" onChange={(event) => selecionarFotoVeiculo(event.target.files?.[0] ?? null)} /></div>
                  <div className="overflow-hidden rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20">{fotoVeiculoPreview || veiculoForm.fotoFrente ? <img src={fotoVeiculoPreview || resolverUrlArquivo(veiculoForm.fotoFrente)} alt="Foto do veículo" className="h-56 w-full object-cover" /> : <div className="flex h-56 items-center justify-center text-sm text-[var(--g3-muted)]">Nenhuma foto selecionada.</div>}</div>
                  <p className="text-xs text-[var(--g3-muted)]">A foto é enviada no storage do sistema e vinculada ao cadastro do veículo.</p>
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[var(--g3-active)]">Documento do veículo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1"><Label>Arquivo PDF</Label><Input type="file" accept="application/pdf,.pdf" onChange={(event) => selecionarDocumentoVeiculo(event.target.files?.[0] ?? null)} /></div>
                  <div className="rounded-lg border border-dashed border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/15 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[var(--g3-active)]">{documentoVeiculoArquivo ? documentoVeiculoArquivo.name : obterNomeArquivo(veiculoForm.documentoVeiculoPdf) || "Nenhum PDF selecionado."}</p>
                        <p className="text-xs text-[var(--g3-muted)]">Envie o documento do veículo em PDF com até 15 MB.</p>
                      </div>
                      <Button type="button" variant="outline" className="shrink-0" disabled={!veiculoForm.documentoVeiculoPdf} onClick={() => abrirDocumentoVeiculo(veiculoForm.documentoVeiculoPdf)}>Abrir PDF</Button>
                    </div>
                  </div>
                  <div className="flex h-56 items-center justify-center rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 px-4 text-center text-sm text-[var(--g3-muted)]">
                    O documento em PDF fica disponível para consulta e vínculo direto no cadastro do veículo.
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {abaAtiva === "listagem" ? (
          <section className="w-full max-w-full space-y-4 2xl:max-w-[1040px]">
            {veiculos.length ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {veiculos.map((item, index) => {
                    const selecionado = item.id === veiculoSelecionadoListagem?.id;
                    return (
                      <Button
                        key={item.id ?? `${item.placa}-${index}`}
                        type="button"
                        variant={selecionado ? "default" : "outline"}
                        className="h-auto min-h-[58px] justify-start rounded-lg px-3 py-2 text-left"
                        onClick={() => {
                          setVeiculoForm(item);
                          setFotoVeiculoArquivo(null);
                          setFotoVeiculoPreview("");
                          setDocumentoVeiculoArquivo(null);
                        }}
                      >
                        <span className="block leading-tight">
                          <span className="block text-sm font-semibold">{item.placa || "Sem placa"}</span>
                          <span className="block text-[11px] opacity-80">{item.modelo || "Sem modelo"}</span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
                {veiculoSelecionadoListagem ? (
                  <div className="space-y-3">
                    <Card className="min-w-0 border-[var(--g3-border)]">
                      <CardHeader className="px-4 pb-2 pt-4">
                        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--g3-active)]">
                          <span>Informações do veículo</span>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button type="button" variant="outline" className="h-9 px-3" onClick={editarVeiculoSelecionado}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar cadastro
                            </Button>
                            <PlacaVeiculoVisual placa={veiculoSelecionadoListagem.placa} />
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pb-4">
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-lg border border-[var(--g3-border)] p-2.5"><p className="text-[11px] text-[var(--g3-muted)]">Tipo de placa</p><p className="mt-1 text-sm font-semibold text-[var(--g3-active)]">{veiculoSelecionadoListagem.placa?.length === 7 ? "Mercosul" : "Normal"}</p></div>
                          <div className="rounded-lg border border-[var(--g3-border)] p-2.5"><p className="text-[11px] text-[var(--g3-muted)]">Modelo</p><p className="mt-1 text-sm font-semibold text-[var(--g3-active)]">{veiculoSelecionadoListagem.modelo || "---"}</p></div>
                          <div className="rounded-lg border border-[var(--g3-border)] p-2.5"><p className="text-[11px] text-[var(--g3-muted)]">Marca</p><p className="mt-1 text-sm font-semibold text-[var(--g3-active)]">{veiculoSelecionadoListagem.marca || "---"}</p></div>
                          <div className="rounded-lg border border-[var(--g3-border)] p-2.5"><p className="text-[11px] text-[var(--g3-muted)]">Cor</p><p className="mt-1 text-sm font-semibold text-[var(--g3-active)]">{veiculoSelecionadoListagem.cor || "---"}</p></div>
                          <div className="rounded-lg border border-[var(--g3-border)] p-2.5"><p className="text-[11px] text-[var(--g3-muted)]">Ano</p><p className="mt-1 text-sm font-semibold text-[var(--g3-active)]">{veiculoSelecionadoListagem.ano || "---"}</p></div>
                          <div className="rounded-lg border border-[var(--g3-border)] p-2.5"><p className="text-[11px] text-[var(--g3-muted)]">Combustível</p><p className="mt-1 text-sm font-semibold text-[var(--g3-active)]">{veiculoSelecionadoListagem.tipoCombustivel || "---"}</p></div>
                          <div className="rounded-lg border border-[var(--g3-border)] p-2.5"><p className="text-[11px] text-[var(--g3-muted)]">Status</p><p className="mt-1 text-sm font-semibold text-[var(--g3-active)]">{veiculoSelecionadoListagem.ativo ? "Ativo" : "Inativo"}</p></div>
                          <div className="rounded-lg border border-[var(--g3-border)] p-2.5"><p className="text-[11px] text-[var(--g3-muted)]">Média de consumo</p><p className="mt-1 text-sm font-semibold text-[var(--g3-active)]">{veiculoSelecionadoListagem.mediaConsumoPadrao ?? "---"} km/l</p></div>
                          <div className="rounded-lg border border-[var(--g3-border)] p-2.5"><p className="text-[11px] text-[var(--g3-muted)]">Capacidade do tanque</p><p className="mt-1 text-sm font-semibold text-[var(--g3-active)]">{veiculoSelecionadoListagem.capacidadeTanqueLitros ?? "---"} litros</p></div>
                          <div className="rounded-lg border border-[var(--g3-border)] p-2.5"><p className="text-[11px] text-[var(--g3-muted)]">Documento</p><p className="mt-1 truncate text-sm font-semibold text-[var(--g3-active)]">{obterNomeArquivo(veiculoSelecionadoListagem.documentoVeiculoPdf) || "---"}</p></div>
                        </div>
                        <div className="rounded-lg border border-[var(--g3-border)] p-2.5">
                          <p className="text-[11px] text-[var(--g3-muted)]">Observações</p>
                          <p className="mt-1.5 text-sm text-[var(--g3-active)]">{veiculoSelecionadoListagem.observacoes || "Nenhuma observação cadastrada."}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                      <Card className="min-w-0 border-[var(--g3-border)]">
                        <CardHeader className="px-4 pb-2 pt-4">
                          <CardTitle className="text-sm text-[var(--g3-active)]">Foto do veículo</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                          <div className="overflow-hidden rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20">{veiculoSelecionadoListagem.fotoFrente ? <img src={resolverUrlArquivo(veiculoSelecionadoListagem.fotoFrente)} alt={veiculoSelecionadoListagem.placa ?? "Foto do veículo"} className="h-36 w-full object-cover sm:h-40" /> : <div className="flex h-36 items-center justify-center px-4 text-center text-sm text-[var(--g3-muted)] sm:h-40">Nenhuma foto cadastrada.</div>}</div>
                        </CardContent>
                      </Card>
                      <Card className="min-w-0 border-[var(--g3-border)]">
                        <CardHeader className="px-4 pb-2 pt-4">
                          <CardTitle className="text-sm text-[var(--g3-active)]">Documento do veículo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 px-4 pb-4">
                          <div className="rounded-lg border border-dashed border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/15 p-2.5">
                            <p className="truncate text-sm font-medium text-[var(--g3-active)]">{obterNomeArquivo(veiculoSelecionadoListagem.documentoVeiculoPdf) || "Nenhum PDF cadastrado."}</p>
                            <p className="mt-1 text-[11px] text-[var(--g3-muted)]">Consulte o documento vinculado ao veículo selecionado.</p>
                          </div>
                          <Button type="button" variant="outline" className="h-9 w-full" disabled={!veiculoSelecionadoListagem.documentoVeiculoPdf} onClick={() => abrirDocumentoVeiculo(veiculoSelecionadoListagem.documentoVeiculoPdf)}>Abrir PDF</Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <Card className="border-[var(--g3-border)]">
                <CardContent className="py-8 text-center text-sm text-[var(--g3-muted)]">
                  Nenhum veículo cadastrado.
                </CardContent>
              </Card>
            )}
          </section>
        ) : null}
        {abaAtiva === "diario" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onKeyDown={focarProximoCampoComEnter}>
              <div className="space-y-1"><Label>Veículo *</Label><Select value={String(diarioForm.veiculoId ?? "")} onChange={(event) => { const veiculoId = Number(event.target.value) || null; setDiarioForm((atual) => ({ ...atual, veiculoId, condutor: "" })); }}><option value="">Selecione</option>{veiculos.map((item) => <option key={item.id} value={item.id}>{item.placa} - {item.modelo}</option>)}</Select></div>
              <div className="space-y-1"><Label>Data *</Label><Input placeholder="dd-mm-aaaa" value={diarioForm.data ?? ""} readOnly disabled className="cursor-not-allowed bg-slate-100 text-slate-500" /></div>
              <div className="space-y-1"><Label>Data de saída</Label><Input placeholder="dd-mm-aaaa" value={diarioForm.dataSaida ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, dataSaida: mascararDataHifen(event.target.value) }))} /></div>
              <div className="space-y-1"><Label>Hora de saída</Label><Input type="time" value={diarioForm.horarioSaida ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, horarioSaida: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Data de chegada</Label><Input placeholder="dd-mm-aaaa" value={diarioForm.dataChegada ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, dataChegada: mascararDataHifen(event.target.value) }))} /></div>
              <div className="space-y-1"><Label>Hora de chegada</Label><Input type="time" value={diarioForm.horarioChegada ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, horarioChegada: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Condutor *</Label><Select value={diarioForm.condutor ?? ""} disabled={!diarioForm.veiculoId} onChange={(event) => setDiarioForm((atual) => ({ ...atual, condutor: event.target.value }))}><option value="">{diarioForm.veiculoId ? "Selecione" : "Escolha o veículo"}</option>{motoristasVeiculo.map((item) => <option key={item.id} value={item.nomeMotorista ?? ""}>{item.nomeMotorista}</option>)}</Select></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Destino *</Label><Select value={String(diarioForm.localDestinoId ?? "")} onChange={(event) => { const localDestinoId = Number(event.target.value) || null; const localSelecionado = locaisDestinoAtivos.find((item) => item.id === localDestinoId) ?? null; setDiarioForm((atual) => ({ ...atual, localDestinoId, destino: montarRotuloDestino(localSelecionado) })); }}><option value="">Selecione</option>{locaisDestinoAtivos.map((item) => <option key={item.id} value={item.id}>{montarRotuloDestino(item)}</option>)}</Select></div>
              <div className="space-y-1"><Label>Km inicial</Label><Input type="number" min={0} value={diarioForm.kmInicial ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, kmInicial: Number(event.target.value) || null }))} /></div>
              <div className="space-y-1"><Label>Km final</Label><Input type="number" min={0} value={diarioForm.kmFinal ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, kmFinal: Number(event.target.value) || null }))} /></div>
              <div className="space-y-1"><Label>Km rodados</Label><Input value={kmRodadosFormulario ? String(kmRodadosFormulario) : "0"} readOnly /></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={diarioForm.observacoes ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
            </div>
            {veiculoSelecionadoDiario ? <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3 text-sm"><p className="font-semibold text-[var(--g3-active)]">Veículo selecionado: {veiculoSelecionadoDiario.placa} - {veiculoSelecionadoDiario.modelo}</p><p className="text-[var(--g3-muted)]">Combustível: {veiculoSelecionadoDiario.tipoCombustivel ?? "---"} • Média padrão: {veiculoSelecionadoDiario.mediaConsumoPadrao ?? "---"} km/l</p></div> : null}
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Veículo</th><th className="px-3 py-2 text-left">Condutor</th><th className="px-3 py-2 text-left">Destino</th><th className="px-3 py-2 text-left">Saída</th><th className="px-3 py-2 text-left">Chegada</th><th className="px-3 py-2 text-left">Km rodados</th></tr></thead>
                <tbody>{diarios.length ? diarios.map((item, index) => <tr key={item.id ?? `${item.data}-${index}`} className={`cursor-pointer border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => setDiarioForm(mapearDiarioParaFormulario(item))}><td className="px-3 py-2">{formatarDataPtBr(item.dataSaida || item.data)}</td><td className="px-3 py-2">{veiculos.find((veiculo) => veiculo.id === item.veiculoId)?.placa ?? "---"}</td><td className="px-3 py-2">{item.condutor ?? "---"}</td><td className="px-3 py-2">{item.localDestinoNome || item.destino || "---"}</td><td className="px-3 py-2">{`${formatarDataPtBr(item.dataSaida || item.data)} ${item.horarioSaida ?? ""}`.trim()}</td><td className="px-3 py-2">{`${formatarDataPtBr(item.dataChegada || item.data)} ${item.horarioChegada ?? ""}`.trim()}</td><td className="px-3 py-2">{item.kmRodados ?? calcularKmRodados(item.kmInicial, item.kmFinal)}</td></tr>) : <tr><td className="px-3 py-4 text-center" colSpan={7}>Nenhum mapa de bordo cadastrado.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        ) : null}
        {abaAtiva === "destinos" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Nome do local *</Label><Input value={localDestinoForm.nome ?? ""} onChange={(event) => setLocalDestinoForm((atual) => ({ ...atual, nome: event.target.value }))} /></div>
              <div className="space-y-1 xl:col-span-2"><Label>Endereço ou referência</Label><Input value={localDestinoForm.endereco ?? ""} onChange={(event) => setLocalDestinoForm((atual) => ({ ...atual, endereco: event.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="(00) 00000-0000"
                    value={mascararTelefoneInput(localDestinoForm.telefone)}
                    onChange={(event) => setLocalDestinoForm((atual) => ({ ...atual, telefone: event.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 px-3"
                    title="Localizar no Google Maps"
                    aria-label="Localizar no Google Maps"
                    disabled={!String(localDestinoForm.endereco ?? "").trim()}
                    onClick={() => abrirLocalDestinoNoGoogleMaps(localDestinoForm.endereco)}
                  >
                    <MapPinned className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={localDestinoForm.ativo !== false} onChange={(event) => setLocalDestinoForm((atual) => ({ ...atual, ativo: event.target.checked }))} />Local ativo</label>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={localDestinoForm.observacoes ?? ""} onChange={(event) => setLocalDestinoForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
            </div>
            <p className="text-xs text-[var(--g3-muted)]">Clique em uma linha da lista para alterar ou excluir o destino selecionado.</p>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Local</th><th className="px-3 py-2 text-left">Endereço</th><th className="px-3 py-2 text-left">Telefone</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Mapa</th></tr></thead>
                <tbody>{locaisDestino.length ? locaisDestino.map((item, index) => <tr key={item.id ?? `${item.nome}-${index}`} className={`cursor-pointer border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => setLocalDestinoForm(item)}><td className="px-3 py-2">{item.nome ?? "---"}</td><td className="px-3 py-2">{item.endereco ?? "---"}</td><td className="px-3 py-2">{formatarTelefone(item.telefone) || "---"}</td><td className="px-3 py-2">{item.ativo ? "Ativo" : "Inativo"}</td><td className="px-3 py-2"><Button type="button" variant="outline" className="h-8 px-2" title="Abrir no Google Maps" aria-label="Abrir no Google Maps" disabled={!String(item.endereco ?? "").trim()} onClick={(event) => { event.stopPropagation(); abrirLocalDestinoNoGoogleMaps(item.endereco); }}><MapPinned className="h-4 w-4" /></Button></td></tr>) : <tr><td className="px-3 py-4 text-center" colSpan={5}>Nenhum local de destino cadastrado.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        ) : null}
        {abaAtiva === "motoristas" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Veículo *</Label><Select value={String(motoristaForm.veiculoId || "")} onChange={(event) => setMotoristaForm((atual) => ({ ...atual, veiculoId: Number(event.target.value) || 0 }))}><option value="">Selecione</option>{veiculos.map((item) => <option key={item.id} value={item.id}>{item.placa} - {item.modelo}</option>)}</Select></div>
              <div className="space-y-1"><Label>Tipo de origem</Label><Select value={motoristaForm.tipoOrigem} onChange={(event) => { const tipoOrigem = event.target.value as "PROFISSIONAL" | "VOLUNTARIO"; setMotoristaForm((atual) => ({ ...atual, tipoOrigem, motoristaId: 0, nomeMotorista: "" })); setTermoMotorista(""); }}><option value="PROFISSIONAL">Profissional</option><option value="VOLUNTARIO">Voluntário</option></Select></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-2">
                <Label>Motorista autorizado *</Label>
                <div className="relative">
                  <Input
                    placeholder="Digite ao menos 2 letras e selecione"
                    value={termoMotorista}
                    onChange={(event) => {
                      setTermoMotorista(event.target.value);
                      setMotoristaForm((atual) => ({
                        ...atual,
                        motoristaId: 0,
                        nomeMotorista: ""
                      }));
                    }}
                  />
                  {mostrarSugestoesMotorista ? (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] shadow-lg">
                      {motoristasDisponiveis.length ? motoristasDisponiveis.map((item) => (
                        <button
                          key={`${item.tipoOrigem}-${item.id}`}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-[var(--g3-primary-soft)]"
                          onClick={() => selecionarMotoristaDisponivel(item)}
                        >
                          <span className="font-medium text-[var(--g3-text)]">{item.nome}</span>
                          <span className="text-xs text-[var(--g3-muted)]">{item.tipoOrigem === "PROFISSIONAL" ? "Profissional" : "Voluntário"}</span>
                        </button>
                      )) : (
                        <div className="px-3 py-2 text-sm text-[var(--g3-muted)]">Nenhum motorista encontrado.</div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1"><Label>Número da carteira</Label><Input value={motoristaForm.numeroCarteira ?? ""} onChange={(event) => setMotoristaForm((atual) => ({ ...atual, numeroCarteira: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Categoria da carteira</Label><Select value={motoristaForm.categoriaCarteira ?? ""} onChange={(event) => setMotoristaForm((atual) => ({ ...atual, categoriaCarteira: event.target.value }))}><option value="">Selecione</option>{categoriasCarteira.map((item) => <option key={item} value={item}>{item}</option>)}</Select></div>
              <div className="space-y-1"><Label>Vencimento da carteira</Label><Input type="date" value={motoristaForm.vencimentoCarteira ?? ""} onChange={(event) => setMotoristaForm((atual) => ({ ...atual, vencimentoCarteira: event.target.value }))} /></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Veículo</th><th className="px-3 py-2 text-left">Motorista</th><th className="px-3 py-2 text-left">Origem</th><th className="px-3 py-2 text-left">Carteira</th></tr></thead>
                <tbody>{motoristasAutorizados.length ? motoristasAutorizados.map((item, index) => <tr key={item.id ?? `${item.veiculoId}-${index}`} className={`cursor-pointer border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => { setMotoristaForm({ ...item, vencimentoCarteira: item.vencimentoCarteira ?? "" }); setTermoMotorista(item.nomeMotorista ?? ""); }}><td className="px-3 py-2">{item.placaVeiculo ?? item.veiculoId}</td><td className="px-3 py-2">{item.nomeMotorista ?? item.motoristaId}</td><td className="px-3 py-2">{item.tipoOrigem === "PROFISSIONAL" ? "Profissional" : "Voluntário"}</td><td className="px-3 py-2">{item.numeroCarteira ?? "---"}</td></tr>) : <tr><td className="px-3 py-4 text-center" colSpan={4}>Nenhum motorista autorizado cadastrado.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        ) : null}
      </AdminPageLayout>
      {periodoImpressaoDiario.aberto ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          onClick={() => setPeriodoImpressaoDiario((atual) => ({ ...atual, aberto: false }))}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Imprimir mapa de bordo</h3>
              <p className="mt-1 text-sm text-slate-600">
                Informe o período desejado para gerar a impressão do mapa de bordo.
              </p>
            </div>
            <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label>Veículo</Label>
                <Select
                  value={String(periodoImpressaoDiario.veiculoId ?? "")}
                  onChange={(event) =>
                    setPeriodoImpressaoDiario((atual) => ({
                      ...atual,
                      veiculoId: Number(event.target.value) || null
                    }))
                  }
                >
                  <option value="">Selecione</option>
                  {veiculos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.placa} - {item.modelo}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data inicial</Label>
                <Input
                  placeholder="dd-mm-aaaa"
                  value={periodoImpressaoDiario.dataInicial}
                  onChange={(event) =>
                    setPeriodoImpressaoDiario((atual) => ({
                      ...atual,
                      dataInicial: mascararDataHifen(event.target.value)
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Data final</Label>
                <Input
                  placeholder="dd-mm-aaaa"
                  value={periodoImpressaoDiario.dataFinal}
                  onChange={(event) =>
                    setPeriodoImpressaoDiario((atual) => ({
                      ...atual,
                      dataFinal: mascararDataHifen(event.target.value)
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPeriodoImpressaoDiario((atual) => ({ ...atual, aberto: false }))}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={imprimirDiarioBordoVeiculo}>
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
      <PopupConfirmacao aberto={confirmarExcluir} titulo="Confirmar exclusão" texto="Esta ação é irreversível. Deseja continuar?" processando={carregandoAcoes} onCancel={() => setConfirmarExcluir(false)} onConfirm={() => void confirmarExclusao()} confirmarTexto="Excluir" />
    </>
  );
}

