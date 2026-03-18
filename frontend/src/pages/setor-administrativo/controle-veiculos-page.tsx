import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Car,
  ClipboardList,
  LayoutDashboard,
  MapPinned,
  Plus,
  Printer,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  X
} from "lucide-react";
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
import { formatarDataPtBr } from "@/lib/br-utils";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import { controleVeiculosService } from "@/services/controle-veiculos.service";
import type {
  LocalDestinoVeiculo,
  MotoristaAutorizado,
  RegistroDiarioBordo,
  VeiculoCadastro
} from "@/types/controle-veiculos";

type AbaId = "dashboard" | "cadastro" | "diario" | "destinos" | "motoristas";

const abas: AdminTab[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "cadastro", label: "Cadastro de veículo", icon: Car },
  { id: "diario", label: "Mapa de bordo", icon: ClipboardList },
  { id: "destinos", label: "Locais de destino", icon: MapPinned },
  { id: "motoristas", label: "Motoristas autorizados", icon: ShieldCheck }
];

const tituloTela = "Controle de veículos";
const classeCardDashboard =
  "border-emerald-200 bg-emerald-100 shadow-[0_18px_40px_-24px_rgba(22,101,52,0.42)]";
const hojeBr = formatarDataPtBr(new Date().toISOString().slice(0, 10));
const combustiveis = ["Gasolina", "Etanol", "Flex", "Diesel", "GNV", "Elétrico", "Híbrido"];

const defaultVeiculo: VeiculoCadastro = {
  placa: "",
  modelo: "",
  marca: "",
  ano: null,
  tipoCombustivel: "",
  mediaConsumoPadrao: null,
  capacidadeTanqueLitros: null,
  observacoes: "",
  ativo: true,
  fotoFrente: null
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

function formatarDataFormulario(valor?: string | null) {
  return valor?.trim() ? formatarDataPtBr(valor) : "";
}

function calcularKmRodados(kmInicial?: number | null, kmFinal?: number | null) {
  if (kmInicial == null || kmFinal == null) return 0;
  const diferenca = Number(kmFinal) - Number(kmInicial);
  return diferenca >= 0 ? diferenca : 0;
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
  const [fotoVeiculoArquivo, setFotoVeiculoArquivo] = useState<File | null>(null);
  const [fotoVeiculoPreview, setFotoVeiculoPreview] = useState("");
  const [enviandoFotoVeiculo, setEnviandoFotoVeiculo] = useState(false);

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
  const diarios = diarioData ?? [];
  const locaisDestino = locaisDestinoData ?? [];
  const motoristasAutorizados = motoristasAutorizadosData ?? [];
  const motoristasVeiculo = motoristasVeiculoData ?? [];
  const motoristasDisponiveis = (motoristasDisponiveisData ?? []).filter(
    (item) => item.tipoOrigem === motoristaForm.tipoOrigem
  );
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
    enviandoFotoVeiculo;

  const veiculoSelecionadoDiario = veiculos.find((item) => item.id === diarioForm.veiculoId) ?? null;

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

  async function salvarVeiculoComFoto(payloadBase: VeiculoCadastro) {
    let salvo = await salvarVeiculoMutation.mutateAsync(payloadBase);

    if (fotoVeiculoArquivo) {
      setEnviandoFotoVeiculo(true);
      try {
        const caminhoFoto = await controleVeiculosService.uploadFotoVeiculo(
          fotoVeiculoArquivo,
          salvo.id ?? null
        );
        salvo = await salvarVeiculoMutation.mutateAsync({
          ...salvo,
          fotoFrente: caminhoFoto
        });
        setFotoVeiculoArquivo(null);
        setFotoVeiculoPreview("");
      } finally {
        setEnviandoFotoVeiculo(false);
      }
    }

    return salvo;
  }

  async function salvar() {
    try {
      if (abaAtiva === "dashboard") {
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

        const response = await salvarVeiculoComFoto({
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

        const response = await salvarLocalDestinoMutation.mutateAsync(localDestinoForm);
        setLocalDestinoForm(response);
        setPopupMensagem({
          tipo: "sucesso",
          titulo: "Confirmação",
          texto: "Local de destino salvo com sucesso."
        });
        return;
      }

      const vencimentoCarteira = motoristaForm.vencimentoCarteira?.trim()
        ? converterDataHifenParaIso(motoristaForm.vencimentoCarteira)
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
        vencimentoCarteira: formatarDataFormulario(response.vencimentoCarteira)
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

  function excluir() {
    const possuiId =
      (abaAtiva === "cadastro" && !!veiculoForm.id) ||
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

  async function confirmarExclusao() {
    try {
      if (abaAtiva === "cadastro" && veiculoForm.id) {
        await removerVeiculoMutation.mutateAsync(veiculoForm.id);
        setVeiculoForm(defaultVeiculo);
        setFotoVeiculoArquivo(null);
        setFotoVeiculoPreview("");
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

  function imprimirMapaBordoCompleto() {
    if (!diarioForm.veiculoId) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione o veículo do mapa de bordo para imprimir as rotas."
      });
      return;
    }

    const veiculo = veiculos.find((item) => item.id === diarioForm.veiculoId);
    const rotas = diarios.filter((item) => item.veiculoId === diarioForm.veiculoId);

    if (!veiculo || !rotas.length) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Não há rotas registradas para o veículo selecionado."
      });
      return;
    }

    const totalKm = rotas.reduce(
      (total, item) => total + (item.kmRodados ?? calcularKmRodados(item.kmInicial, item.kmFinal)),
      0
    );
    const fotoVeiculo = veiculo.fotoFrente ? resolverUrlArquivo(veiculo.fotoFrente) : "";
    const janela = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");

    if (!janela) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: "O navegador bloqueou a abertura da impressão do mapa de bordo."
      });
      return;
    }

    const linhas = rotas
      .map((item) => {
        const kmRodados = item.kmRodados ?? calcularKmRodados(item.kmInicial, item.kmFinal);
        return `
          <tr>
            <td>${escapeHtml(formatarDataPtBr(item.dataSaida || item.data))}</td>
            <td>${escapeHtml(item.horarioSaida || "---")}</td>
            <td>${escapeHtml(formatarDataPtBr(item.dataChegada || item.data))}</td>
            <td>${escapeHtml(item.horarioChegada || "---")}</td>
            <td>${escapeHtml(item.condutor || "---")}</td>
            <td>${escapeHtml(item.localDestinoNome || item.destino || "---")}</td>
            <td>${item.kmInicial ?? "---"}</td>
            <td>${item.kmFinal ?? "---"}</td>
            <td>${kmRodados}</td>
          </tr>
        `;
      })
      .join("");

    janela.document.write(`<!doctype html>
      <html lang="pt-BR">
        <head><meta charset="utf-8" /><title>Mapa de bordo</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            .cabecalho { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
            .foto { width: 220px; height: 140px; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; }
            .foto img { width: 100%; height: 100%; object-fit: cover; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 12px; }
            th { background: #dcfce7; color: #14532d; }
            .rodape { margin-top: 16px; font-size: 13px; font-weight: 700; color: #14532d; }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            <div>
              <h1>Mapa de bordo completo</h1>
              <p><strong>Veículo:</strong> ${escapeHtml(`${veiculo.placa ?? "---"} - ${veiculo.modelo ?? "---"}`)}</p>
              <p><strong>Marca:</strong> ${escapeHtml(veiculo.marca ?? "---")}</p>
              <p><strong>Ano:</strong> ${veiculo.ano ?? "---"}</p>
              <p><strong>Combustível:</strong> ${escapeHtml(veiculo.tipoCombustivel ?? "---")}</p>
            </div>
            <div class="foto">${fotoVeiculo ? `<img src="${fotoVeiculo}" alt="Foto do veículo" />` : "Sem foto"}</div>
          </div>
          <table><thead><tr><th>Data de saída</th><th>Hora de saída</th><th>Data de chegada</th><th>Hora de chegada</th><th>Condutor</th><th>Destino</th><th>Km inicial</th><th>Km final</th><th>Km rodados</th></tr></thead><tbody>${linhas}</tbody></table>
          <p class="rodape">Total rodado no período: ${totalKm} km</p>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>`);
    janela.document.close();
  }

  function imprimir() {
    if (abaAtiva === "diario") {
      imprimirMapaBordoCompleto();
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

  const acoes: AdminAction[] = [
    {
      label: "Buscar",
      icon: Search,
      onClick: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
      variant: "outline"
    },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
    { label: "Excluir", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
    { label: "Imprimir", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  const codeBadge =
    abaAtiva === "cadastro" && veiculoForm.placa
      ? `Placa: ${veiculoForm.placa}`
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
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Setor administrativo"
        pageTitle={tituloTela}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={codeBadge}
      >
        {abaAtiva === "dashboard" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Card className={classeCardDashboard}><CardHeader className="items-center pb-2 text-center"><CardTitle className="text-sm font-medium text-emerald-900">Total de veículos</CardTitle></CardHeader><CardContent className="text-center text-3xl font-semibold text-emerald-950">{dashboard.totalVeiculos}</CardContent></Card>
              <Card className={classeCardDashboard}><CardHeader className="items-center pb-2 text-center"><CardTitle className="text-sm font-medium text-emerald-900">Veículos ativos</CardTitle></CardHeader><CardContent className="text-center text-3xl font-semibold text-emerald-950">{dashboard.veiculosAtivos}</CardContent></Card>
              <Card className={classeCardDashboard}><CardHeader className="items-center pb-2 text-center"><CardTitle className="text-sm font-medium text-emerald-900">Rotas registradas</CardTitle></CardHeader><CardContent className="text-center text-3xl font-semibold text-emerald-950">{dashboard.totalRotas}</CardContent></Card>
              <Card className={classeCardDashboard}><CardHeader className="items-center pb-2 text-center"><CardTitle className="text-sm font-medium text-emerald-900">Km rodados</CardTitle></CardHeader><CardContent className="text-center text-3xl font-semibold text-emerald-950">{dashboard.kmTotalRodado}</CardContent></Card>
              <Card className={classeCardDashboard}><CardHeader className="items-center pb-2 text-center"><CardTitle className="text-sm font-medium text-emerald-900">Locais de destino</CardTitle></CardHeader><CardContent className="text-center text-3xl font-semibold text-emerald-950">{dashboard.locaisDestino}</CardContent></Card>
              <Card className={classeCardDashboard}><CardHeader className="items-center pb-2 text-center"><CardTitle className="text-sm font-medium text-emerald-900">Motoristas autorizados</CardTitle></CardHeader><CardContent className="text-center text-3xl font-semibold text-emerald-950">{dashboard.motoristasAutorizados}</CardContent></Card>
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
            <div className="grid gap-4 xl:grid-cols-[1.2fr_320px]">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1"><Label>Placa *</Label><Input value={veiculoForm.placa ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, placa: event.target.value.toUpperCase() }))} /></div>
                <div className="space-y-1"><Label>Modelo *</Label><Input value={veiculoForm.modelo ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, modelo: event.target.value }))} /></div>
                <div className="space-y-1"><Label>Marca *</Label><Input value={veiculoForm.marca ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, marca: event.target.value }))} /></div>
                <div className="space-y-1"><Label>Ano</Label><Input type="number" min={1900} max={2100} value={veiculoForm.ano ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, ano: Number(event.target.value) || null }))} /></div>
                <div className="space-y-1"><Label>Combustível</Label><Select value={veiculoForm.tipoCombustivel ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, tipoCombustivel: event.target.value }))}><option value="">Selecione</option>{combustiveis.map((item) => <option key={item} value={item}>{item}</option>)}</Select></div>
                <div className="space-y-1"><Label>Média de consumo (km/l)</Label><Input type="number" min={0} step="0.01" value={veiculoForm.mediaConsumoPadrao ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, mediaConsumoPadrao: Number(event.target.value) || null }))} /></div>
                <div className="space-y-1"><Label>Capacidade do tanque (litros)</Label><Input type="number" min={0} step="0.01" value={veiculoForm.capacidadeTanqueLitros ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, capacidadeTanqueLitros: Number(event.target.value) || null }))} /></div>
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!veiculoForm.ativo} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, ativo: event.target.checked }))} />Veículo ativo</label>
                <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={3} value={veiculoForm.observacoes ?? ""} onChange={(event) => setVeiculoForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
              </div>
              <div className="space-y-3 rounded-lg border border-[var(--g3-border)] p-3">
                <div className="space-y-1"><Label>Foto do veículo</Label><Input type="file" accept="image/*" onChange={(event) => selecionarFotoVeiculo(event.target.files?.[0] ?? null)} /></div>
                <div className="overflow-hidden rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20">{fotoVeiculoPreview || veiculoForm.fotoFrente ? <img src={fotoVeiculoPreview || resolverUrlArquivo(veiculoForm.fotoFrente)} alt="Foto do veículo" className="h-56 w-full object-cover" /> : <div className="flex h-56 items-center justify-center text-sm text-[var(--g3-muted)]">Nenhuma foto selecionada.</div>}</div>
                <p className="text-xs text-[var(--g3-muted)]">A foto é enviada no storage do sistema e vinculada ao cadastro do veículo.</p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Foto</th><th className="px-3 py-2 text-left">Placa</th><th className="px-3 py-2 text-left">Modelo</th><th className="px-3 py-2 text-left">Marca</th><th className="px-3 py-2 text-left">Ano</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                <tbody>{veiculos.length ? veiculos.map((item, index) => <tr key={item.id ?? `${item.placa}-${index}`} className={`cursor-pointer border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => { setVeiculoForm(item); setFotoVeiculoArquivo(null); setFotoVeiculoPreview(""); }}><td className="px-3 py-2">{item.fotoFrente ? <img src={resolverUrlArquivo(item.fotoFrente)} alt={item.placa ?? "Foto do veículo"} className="h-12 w-16 rounded object-cover" /> : "---"}</td><td className="px-3 py-2">{item.placa ?? "---"}</td><td className="px-3 py-2">{item.modelo ?? "---"}</td><td className="px-3 py-2">{item.marca ?? "---"}</td><td className="px-3 py-2">{item.ano ?? "---"}</td><td className="px-3 py-2">{item.ativo ? "Ativo" : "Inativo"}</td></tr>) : <tr><td className="px-3 py-4 text-center" colSpan={6}>Nenhum veículo cadastrado.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        ) : null}
        {abaAtiva === "diario" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Veículo *</Label><Select value={String(diarioForm.veiculoId ?? "")} onChange={(event) => { const veiculoId = Number(event.target.value) || null; setDiarioForm((atual) => ({ ...atual, veiculoId, condutor: "" })); }}><option value="">Selecione</option>{veiculos.map((item) => <option key={item.id} value={item.id}>{item.placa} - {item.modelo}</option>)}</Select></div>
              <div className="space-y-1"><Label>Data *</Label><Input placeholder="dd-mm-aaaa" value={diarioForm.data ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, data: mascararDataHifen(event.target.value) }))} /></div>
              <div className="space-y-1"><Label>Data de saída</Label><Input placeholder="dd-mm-aaaa" value={diarioForm.dataSaida ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, dataSaida: mascararDataHifen(event.target.value) }))} /></div>
              <div className="space-y-1"><Label>Hora de saída</Label><Input type="time" value={diarioForm.horarioSaida ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, horarioSaida: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Data de chegada</Label><Input placeholder="dd-mm-aaaa" value={diarioForm.dataChegada ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, dataChegada: mascararDataHifen(event.target.value) }))} /></div>
              <div className="space-y-1"><Label>Hora de chegada</Label><Input type="time" value={diarioForm.horarioChegada ?? ""} onChange={(event) => setDiarioForm((atual) => ({ ...atual, horarioChegada: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Condutor *</Label><Select value={diarioForm.condutor ?? ""} disabled={!diarioForm.veiculoId} onChange={(event) => setDiarioForm((atual) => ({ ...atual, condutor: event.target.value }))}><option value="">{diarioForm.veiculoId ? "Selecione" : "Escolha o veículo"}</option>{motoristasVeiculo.map((item) => <option key={item.id} value={item.nomeMotorista ?? ""}>{item.nomeMotorista}</option>)}</Select></div>
              <div className="space-y-1"><Label>Destino *</Label><Select value={String(diarioForm.localDestinoId ?? "")} onChange={(event) => { const localDestinoId = Number(event.target.value) || null; const localSelecionado = locaisDestinoAtivos.find((item) => item.id === localDestinoId) ?? null; setDiarioForm((atual) => ({ ...atual, localDestinoId, destino: montarRotuloDestino(localSelecionado) })); }}><option value="">Selecione</option>{locaisDestinoAtivos.map((item) => <option key={item.id} value={item.id}>{montarRotuloDestino(item)}</option>)}</Select></div>
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
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={localDestinoForm.ativo !== false} onChange={(event) => setLocalDestinoForm((atual) => ({ ...atual, ativo: event.target.checked }))} />Local ativo</label>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={localDestinoForm.observacoes ?? ""} onChange={(event) => setLocalDestinoForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Local</th><th className="px-3 py-2 text-left">Endereço</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                <tbody>{locaisDestino.length ? locaisDestino.map((item, index) => <tr key={item.id ?? `${item.nome}-${index}`} className={`cursor-pointer border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => setLocalDestinoForm(item)}><td className="px-3 py-2">{item.nome ?? "---"}</td><td className="px-3 py-2">{item.endereco ?? "---"}</td><td className="px-3 py-2">{item.ativo ? "Ativo" : "Inativo"}</td></tr>) : <tr><td className="px-3 py-4 text-center" colSpan={3}>Nenhum local de destino cadastrado.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        ) : null}
        {abaAtiva === "motoristas" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Veículo *</Label><Select value={String(motoristaForm.veiculoId || "")} onChange={(event) => setMotoristaForm((atual) => ({ ...atual, veiculoId: Number(event.target.value) || 0 }))}><option value="">Selecione</option>{veiculos.map((item) => <option key={item.id} value={item.id}>{item.placa} - {item.modelo}</option>)}</Select></div>
              <div className="space-y-1"><Label>Tipo de origem</Label><Select value={motoristaForm.tipoOrigem} onChange={(event) => { const tipoOrigem = event.target.value as "PROFISSIONAL" | "VOLUNTARIO"; setMotoristaForm((atual) => ({ ...atual, tipoOrigem, motoristaId: 0, nomeMotorista: "" })); setTermoMotorista(""); }}><option value="PROFISSIONAL">Profissional</option><option value="VOLUNTARIO">Voluntário</option></Select></div>
              <div className="space-y-1"><Label>Buscar motorista</Label><Input placeholder="Digite ao menos 2 letras" value={termoMotorista} onChange={(event) => setTermoMotorista(event.target.value)} /></div>
              <div className="space-y-1"><Label>Motorista autorizado *</Label><Select value={motoristaForm.motoristaId ? String(motoristaForm.motoristaId) : ""} onChange={(event) => { const motoristaId = Number(event.target.value) || 0; const motoristaSelecionado = motoristasDisponiveis.find((item) => item.id === motoristaId) ?? null; setMotoristaForm((atual) => ({ ...atual, motoristaId, nomeMotorista: motoristaSelecionado?.nome ?? atual.nomeMotorista ?? "" })); }}><option value="">{termoMotorista.trim().length >= 2 ? "Selecione" : "Digite para buscar"}</option>{motoristaForm.motoristaId && motoristaForm.nomeMotorista ? <option value={motoristaForm.motoristaId}>{motoristaForm.nomeMotorista}</option> : null}{motoristasDisponiveis.map((item) => <option key={`${item.tipoOrigem}-${item.id}`} value={item.id}>{item.nome}</option>)}</Select></div>
              <div className="space-y-1"><Label>Número da carteira</Label><Input value={motoristaForm.numeroCarteira ?? ""} onChange={(event) => setMotoristaForm((atual) => ({ ...atual, numeroCarteira: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Categoria da carteira</Label><Input value={motoristaForm.categoriaCarteira ?? ""} onChange={(event) => setMotoristaForm((atual) => ({ ...atual, categoriaCarteira: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Vencimento da carteira</Label><Input placeholder="dd-mm-aaaa" value={motoristaForm.vencimentoCarteira ?? ""} onChange={(event) => setMotoristaForm((atual) => ({ ...atual, vencimentoCarteira: mascararDataHifen(event.target.value) }))} /></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Veículo</th><th className="px-3 py-2 text-left">Motorista</th><th className="px-3 py-2 text-left">Origem</th><th className="px-3 py-2 text-left">Carteira</th></tr></thead>
                <tbody>{motoristasAutorizados.length ? motoristasAutorizados.map((item, index) => <tr key={item.id ?? `${item.veiculoId}-${index}`} className={`cursor-pointer border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => { setMotoristaForm({ ...item, vencimentoCarteira: formatarDataFormulario(item.vencimentoCarteira) }); setTermoMotorista(item.nomeMotorista ?? ""); }}><td className="px-3 py-2">{item.placaVeiculo ?? item.veiculoId}</td><td className="px-3 py-2">{item.nomeMotorista ?? item.motoristaId}</td><td className="px-3 py-2">{item.tipoOrigem === "PROFISSIONAL" ? "Profissional" : "Voluntário"}</td><td className="px-3 py-2">{item.numeroCarteira ?? "---"}</td></tr>) : <tr><td className="px-3 py-4 text-center" colSpan={4}>Nenhum motorista autorizado cadastrado.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        ) : null}
      </AdminPageLayout>
      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
      <PopupConfirmacao aberto={confirmarExcluir} titulo="Confirmar exclusão" texto="Esta ação é irreversível. Deseja continuar?" processando={carregandoAcoes} onCancel={() => setConfirmarExcluir(false)} onConfirm={() => void confirmarExclusao()} confirmarTexto="Excluir" />
    </>
  );
}
