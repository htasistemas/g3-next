import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileDown,
  LayoutGrid,
  LoaderCircle,
  TriangleAlert,
  TrendingUp,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { authService } from "@/services/auth.service";
import { useUnidadeAssistencialAtual } from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import { obterUrlArquivoAutenticado } from "@/lib/arquivos";
import { formatarCnpj, formatarTelefone } from "@/lib/br-utils";
import {
  AgendaCardList,
  BeneficiarioSelector,
  DataSelector,
  GenerateCardButton,
  ItemResumoCard,
  ItemSelector,
  TipoSelector
} from "@/modules/agendamentos-operacional/components";
import {
  useAgendamentos,
  useBeneficiariosOperacionaisAgendamento,
  useCancelarAgendamento,
  useIndicadoresAgendamentos,
  useItensOperacionaisAgendamento,
  useListaEsperaAgendamentos,
  useExcluirAgendamento,
  useNotificarAgendamento,
  useRemarcarAgendamento,
  useSalvarAgendamento,
  useSalvarAgendamentoOperacional
} from "@/features/agendamentos/use-agendamentos";
import type { Agendamento, AgendamentoOperacionalItem, AgendamentoOperacionalTipo } from "@/types/agendamento";

type AbaId = "agenda" | "dashboard" | "espera";
type AgendamentoParticipante = NonNullable<Agendamento["participantes"]>[number];

type DashboardCard = {
  label: string;
  value: string | number;
  icon: LucideIcon;
};

type EnvioAgendamentoEmAndamento = {
  agendamentoId: number;
  canal: "WHATSAPP" | "EMAIL";
  etapa: number;
};

const ETAPAS_ENVIO: Array<Record<"WHATSAPP" | "EMAIL", string>> = [
  {
    WHATSAPP: "Preparando links e validando contatos do WhatsApp...",
    EMAIL: "Preparando envio e validando e-mails dos participantes..."
  },
  {
    WHATSAPP: "Montando a fila de mensagens da agenda operacional...",
    EMAIL: "Processando os destinatários da agenda operacional..."
  },
  {
    WHATSAPP: "Finalizando os links para abertura do WhatsApp...",
    EMAIL: "Finalizando o disparo dos e-mails da agenda..."
  }
];

const ETAPAS_GERACAO_AGS = [
  "Validando os beneficiários selecionados...",
  "Salvando a agenda operacional...",
  "Atualizando a visualização do dia..."
];

let janelaFichaAgendamentoAtual: Window | null = null;
let urlFichaAgendamentoAtual: string | null = null;

const abas: AdminTab[] = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "agenda", label: "Agendamento", icon: CalendarRange },
  { id: "espera", label: "Lista de espera", icon: Users }
];

const hoje = new Date().toISOString().slice(0, 10);
function obterInicioSemana(dataBase: Date) {
  const data = new Date(dataBase);
  const dia = data.getDay();
  const deslocamento = dia === 0 ? -6 : 1 - dia;
  data.setDate(data.getDate() + deslocamento);
  data.setHours(0, 0, 0, 0);
  return data;
}

function obterFimSemana(dataBase: Date) {
  const inicio = obterInicioSemana(dataBase);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);
  return fim;
}

function normalizarData(data?: string) {
  if (!data) return null;
  const parsed = new Date(`${data.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function somarDias(data: string, deslocamento: number) {
  const base = normalizarData(data) ?? new Date(`${hoje}T12:00:00`);
  base.setDate(base.getDate() + deslocamento);
  return base.toISOString().slice(0, 10);
}

function formatarDataExtensa(data?: string) {
  const parsed = normalizarData(data);
  if (!parsed) return "---";
  const texto = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(parsed);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarIdade(dataNascimento?: string) {
  if (!dataNascimento) return "---";

  const nascimento = new Date(`${dataNascimento.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(nascimento.getTime())) return "---";

  const hojeAtual = new Date();
  let idade = hojeAtual.getFullYear() - nascimento.getFullYear();
  const mesAtual = hojeAtual.getMonth();
  const mesNascimento = nascimento.getMonth();
  const diaAtual = hojeAtual.getDate();
  const diaNascimento = nascimento.getDate();

  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && diaAtual < diaNascimento)) {
    idade -= 1;
  }

  return idade >= 0 ? `${idade} ano${idade === 1 ? "" : "s"}` : "---";
}

function formatarTelefoneRelatorio(telefone?: string | null) {
  if (!telefone?.trim()) return "";
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 11) {
    return `${digitos.slice(0, 2)} ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `${digitos.slice(0, 2)} ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return telefone.trim();
}

function escapeHtml(value?: string | number | null) {
  return String(value ?? "")
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

function imprimirFichaHtml(options: {
  titulo: string;
  html: string;
  estilosExtras?: string;
  tamanhoPagina?: string;
  margemPagina?: string;
  paddingRaiz?: string;
}) {
  if (janelaFichaAgendamentoAtual && !janelaFichaAgendamentoAtual.closed) {
    janelaFichaAgendamentoAtual.close();
  }

  if (urlFichaAgendamentoAtual) {
    URL.revokeObjectURL(urlFichaAgendamentoAtual);
    urlFichaAgendamentoAtual = null;
  }

  const estilos = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("\n");

  const tamanhoPagina = options.tamanhoPagina ?? "A4 portrait";
  const margemPagina = options.margemPagina ?? "12mm";
  const paddingRaiz = options.paddingRaiz ?? "18px";
  const estilosExtras = options.estilosExtras ?? "";

  const conteudo = `<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(options.titulo)}</title>
        ${estilos}
        <style>
          @page {
            size: ${tamanhoPagina};
            margin: ${margemPagina};
          }

          body {
            margin: 0;
            background: #eef3ef;
            color: #0f172a;
            font-family: Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .g3-print-toolbar {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            justify-content: flex-end;
            padding: 16px 20px 0;
            background: linear-gradient(180deg, #eef3ef 0%, rgba(238, 243, 239, 0.94) 72%, rgba(238, 243, 239, 0) 100%);
          }

          .g3-print-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid #0f8a57;
            border-radius: 999px;
            padding: 10px 16px;
            background: #0f8a57;
            color: #ffffff;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 14px 30px rgba(15, 138, 87, 0.18);
          }

          .g3-print-button:hover {
            background: #0c6d45;
          }

          .g3-print-button svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
          }

          .g3-print-root {
            max-width: 1120px;
            margin: 0 auto;
            padding: ${paddingRaiz} 20px 28px;
          }

          .g3-print-sheet {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #ffffff;
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
            border: 1px solid #dbe7df;
            box-sizing: border-box;
            overflow: hidden;
          }

          .g3-print-sheet-inner {
            padding: ${paddingRaiz};
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th,
          td {
            vertical-align: top;
          }

          @media print {
            body {
              background: #fff;
            }

            .g3-print-toolbar {
              display: none !important;
            }

            .g3-print-root {
              max-width: none;
              padding: 0;
            }

            .g3-print-sheet {
              width: auto;
              min-height: auto;
              margin: 0;
              box-shadow: none;
              border: 0;
              overflow: visible;
            }

            .g3-print-sheet-inner {
              padding: ${paddingRaiz};
            }
          }

          ${estilosExtras}
        </style>
      </head>
      <body>
        <div class="g3-print-toolbar">
          <button type="button" class="g3-print-button" id="g3-print-button" aria-label="Imprimir relatório">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9V3h12v6h1a3 3 0 0 1 3 3v5h-4v4H6v-4H2v-5a3 3 0 0 1 3-3h1zm2-4v4h8V5H8zm8 14v-4H8v4h8zm3-8a1 1 0 1 0 0 2a1 1 0 0 0 0-2z"/>
            </svg>
            Imprimir
          </button>
        </div>
        <div class="g3-print-root">
          <div class="g3-print-sheet">
            <div class="g3-print-sheet-inner">${options.html}</div>
          </div>
        </div>
        <script>
          document.getElementById("g3-print-button")?.addEventListener("click", () => {
            try {
              window.focus();
              window.print();
            } catch {
              // Mantem a janela aberta para o usuario se a impressao falhar.
            }
          });
        </script>
      </body>
    </html>`;

  const blob = new Blob([conteudo], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const janela = window.open(url, "_blank", "width=1200,height=900");

  if (!janela) {
    URL.revokeObjectURL(url);
    throw new Error("O navegador bloqueou a abertura da ficha de presença.");
  }

  try {
    janela.opener = null;
  } catch {
    // Alguns navegadores não permitem ajustar opener em todas as combinações.
  }

  janelaFichaAgendamentoAtual = janela;
  urlFichaAgendamentoAtual = url;

  janela.addEventListener(
    "beforeunload",
    () => {
      if (janelaFichaAgendamentoAtual === janela) {
        janelaFichaAgendamentoAtual = null;
      }
      if (urlFichaAgendamentoAtual === url) {
        URL.revokeObjectURL(url);
        urlFichaAgendamentoAtual = null;
      }
    },
    { once: true }
  );
}

export function AgendamentosPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("dashboard");
  const [tipo, setTipo] = useState<AgendamentoOperacionalTipo | undefined>();
  const [buscaItem, setBuscaItem] = useState("");
  const buscaItemAdiada = useDeferredValue(buscaItem);
  const [itemSelecionado, setItemSelecionado] = useState<AgendamentoOperacionalItem | null>(null);
  const [dataAgendamento, setDataAgendamento] = useState(hoje);
  const [dataVisualizacao, setDataVisualizacao] = useState(hoje);
  const [preferenciaCarregada, setPreferenciaCarregada] = useState(false);
  const [buscaBeneficiario, setBuscaBeneficiario] = useState("");
  const [beneficiariosSelecionados, setBeneficiariosSelecionados] = useState<number[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [envioEmAndamento, setEnvioEmAndamento] = useState<EnvioAgendamentoEmAndamento | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState<Agendamento | null>(null);
  const [agendaParaExcluir, setAgendaParaExcluir] = useState<Agendamento | null>(null);
  const [agendaParaData, setAgendaParaData] = useState<{ acao: "copiar" | "mover"; item: Agendamento } | null>(null);
  const [novaDataAgenda, setNovaDataAgenda] = useState(hoje);
  const [participanteParaMover, setParticipanteParaMover] = useState<{ item: Agendamento; index: number } | null>(null);
  const [participanteParaExcluir, setParticipanteParaExcluir] = useState<{ item: Agendamento; index: number } | null>(null);

  const agendamentosQuery = useAgendamentos({});
  const indicadoresQuery = useIndicadoresAgendamentos({});
  const listaEsperaQuery = useListaEsperaAgendamentos();
  const itensQuery = useItensOperacionaisAgendamento(tipo, buscaItemAdiada);
  const beneficiariosQuery = useBeneficiariosOperacionaisAgendamento(itemSelecionado?.id ?? null);
  const unidadeAtualQuery = useUnidadeAssistencialAtual();
  const salvarAgendamentoMutation = useSalvarAgendamento();
  const salvarMutation = useSalvarAgendamentoOperacional();
  const cancelarMutation = useCancelarAgendamento();
  const excluirMutation = useExcluirAgendamento();
  const notificarMutation = useNotificarAgendamento();
  const remarcarMutation = useRemarcarAgendamento();
  const preferenciaSalvando = useRef<number | null>(null);
  const [agendaCopiando, setAgendaCopiando] = useState(false);
  const [geracaoEmAndamento, setGeracaoEmAndamento] = useState(false);
  const [geracaoEtapa, setGeracaoEtapa] = useState(0);
  const [ultimaAgendaDestacadaId, setUltimaAgendaDestacadaId] = useState<number | null>(null);
  const [agendaGeradaLocal, setAgendaGeradaLocal] = useState<Agendamento | null>(null);
  const [confirmacaoParticipanteEmAndamento, setConfirmacaoParticipanteEmAndamento] = useState<{
    agendamentoId: number;
    index: number;
  } | null>(null);
  const geracaoIntervalo = useRef<number | null>(null);
  const destaqueAgendaTimeout = useRef<number | null>(null);
  const dataVisualizacaoInteragida = useRef(false);

  function definirDataVisualizacao(novaData: string) {
    dataVisualizacaoInteragida.current = true;
    setDataVisualizacao(novaData);
  }

  useEffect(() => {
    let ativo = true;

    if (!usuario?.id) {
      setPreferenciaCarregada(true);
      return () => {
        ativo = false;
      };
    }

    setPreferenciaCarregada(false);
    void (async () => {
      try {
        const dataPreferencia = await authService.obterPreferenciaAgendamentos();
        if (!ativo) return;
        if (dataPreferencia && !dataVisualizacaoInteragida.current) {
          setDataVisualizacao(dataPreferencia);
        }
      } catch {
        if (!ativo) return;
      } finally {
        if (ativo) setPreferenciaCarregada(true);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [usuario?.id]);

  useEffect(() => {
    if (!preferenciaCarregada || !usuario?.id) return;

    if (preferenciaSalvando.current) {
      window.clearTimeout(preferenciaSalvando.current);
    }

    preferenciaSalvando.current = window.setTimeout(() => {
      void authService.salvarPreferenciaAgendamentos(dataVisualizacao).catch(() => undefined);
      preferenciaSalvando.current = null;
    }, 350);

    return () => {
      if (preferenciaSalvando.current) {
        window.clearTimeout(preferenciaSalvando.current);
        preferenciaSalvando.current = null;
      }
    };
  }, [dataVisualizacao, preferenciaCarregada, usuario?.id]);

  const cards = useMemo(
    () =>
      (agendamentosQuery.data ?? [])
        .filter((item) => (item.status ?? "").trim().toUpperCase() !== "CANCELADO")
        .filter((item) => {
          const participantes = item.participantes ?? [];
          return (
            item.itemOrigemId ||
            item.itemNome ||
            item.itemTipo ||
            item.tituloColetivo ||
            item.coletivo ||
            participantes.length > 0
          );
        })
        .sort((a, b) => `${a.data ?? ""}${a.horaInicial ?? ""}`.localeCompare(`${b.data ?? ""}${b.horaInicial ?? ""}`)),
    [agendamentosQuery.data]
  );

  const cardsVisiveis = useMemo(() => {
    if (!agendaGeradaLocal) {
      return cards;
    }

    const existeNaLista = cards.some(
      (item) =>
        item.id === agendaGeradaLocal.id ||
        (item.itemOrigemId === agendaGeradaLocal.itemOrigemId &&
          item.itemTipo === agendaGeradaLocal.itemTipo &&
          (item.data ?? "").slice(0, 10) === (agendaGeradaLocal.data ?? "").slice(0, 10))
    );
    if (existeNaLista) {
      return cards;
    }

    return [...cards, agendaGeradaLocal].sort((a, b) =>
      `${a.data ?? ""}${a.horaInicial ?? ""}`.localeCompare(`${b.data ?? ""}${b.horaInicial ?? ""}`)
    );
  }, [agendaGeradaLocal, cards]);

  const cardSelecionado = cardsVisiveis.find((item) => item.id === selecionadoId) ?? null;
  const cardsDoDia = useMemo(
    () => cardsVisiveis.filter((item) => (item.data ?? "").slice(0, 10) === dataVisualizacao),
    [cardsVisiveis, dataVisualizacao]
  );

  const beneficiariosFiltrados = useMemo(() => {
    const termo = buscaBeneficiario.trim().toLowerCase();
    const base = beneficiariosQuery.data ?? [];
    if (!termo) return base;
    return base.filter((item) => item.nomeCompleto.toLowerCase().includes(termo));
  }, [beneficiariosQuery.data, buscaBeneficiario]);

  const resumoOperacional = [
    { label: "Tipo", value: tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : "Não selecionado" },
    { label: "Item", value: itemSelecionado?.nome || "Não selecionado" },
    { label: "Data", value: dataAgendamento ? new Date(`${dataAgendamento}T12:00:00`).toLocaleDateString("pt-BR") : "Não selecionada" },
    { label: "Beneficiários", value: `${beneficiariosSelecionados.length} selecionado(s)` }
  ];

  const dashboardResumo = useMemo<DashboardCard[]>(() => {
    const hojeData = new Date();
    const inicioSemana = obterInicioSemana(hojeData);
    const fimSemana = obterFimSemana(hojeData);
    const inicioMes = new Date(hojeData.getFullYear(), hojeData.getMonth(), 1);
    const fimMes = new Date(hojeData.getFullYear(), hojeData.getMonth() + 1, 0, 23, 59, 59, 999);

    const participantesAgendados = cards.reduce((total, item) => total + (item.participantes?.length ?? 0), 0);
    const frequenciaMedia = cards.length ? Math.round((participantesAgendados / cards.length) * 10) / 10 : 0;
    const faltasSemana = cards.filter((item) => {
      const data = normalizarData(item.data);
      const status = (item.status ?? "").trim().toUpperCase();
      return data && data >= inicioSemana && data <= fimSemana && status === "FALTOU";
    }).length;
    const sessoesMes = cards.filter((item) => {
      const data = normalizarData(item.data);
      return data && data >= inicioMes && data <= fimMes;
    }).length;

    return [
      { label: "Beneficiários atendidos", value: participantesAgendados, icon: Users },
      { label: "Frequência média", value: frequenciaMedia.toLocaleString("pt-BR"), icon: TrendingUp },
      { label: "Faltas da semana", value: faltasSemana, icon: TriangleAlert },
      { label: "Sessões do mês", value: sessoesMes, icon: CalendarDays },
      { label: "Lista de espera", value: (listaEsperaQuery.data ?? []).length, icon: Clock3 },
      { label: "Total de cards", value: cards.length, icon: LayoutGrid },
      { label: "Confirmados", value: indicadoresQuery.data?.confirmados ?? 0, icon: BadgeCheck }
    ];
  }, [cards, indicadoresQuery.data?.confirmados, listaEsperaQuery.data]);

  const acoes: AdminAction[] = [
    {
      label: "Nova agenda",
      icon: CalendarRange,
      onClick: () => {
        setSelecionadoId(null);
        setTipo(undefined);
        setBuscaItem("");
        setItemSelecionado(null);
        setBuscaBeneficiario("");
        setBeneficiariosSelecionados([]);
        setDataAgendamento(hoje);
        definirDataVisualizacao(hoje);
        setAbaAtiva("agenda");
      },
      variant: "default"
    },
    { label: "Exportar", icon: FileDown, onClick: () => void 0, variant: "outline", disabled: true },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  async function salvarCard() {
    if (!tipo || !itemSelecionado?.id || !beneficiariosSelecionados.length || !dataAgendamento) {
      setPopup({ tipo: "erro", titulo: "Atenção", texto: "Selecione tipo, item, beneficiários e data antes de gerar a agenda." });
      return;
    }

    if (geracaoIntervalo.current) {
      window.clearInterval(geracaoIntervalo.current);
      geracaoIntervalo.current = null;
    }
    if (destaqueAgendaTimeout.current) {
      window.clearTimeout(destaqueAgendaTimeout.current);
      destaqueAgendaTimeout.current = null;
    }

    setGeracaoEmAndamento(true);
    setGeracaoEtapa(0);
    geracaoIntervalo.current = window.setInterval(() => {
      setGeracaoEtapa((atual) => Math.min(atual + 1, ETAPAS_GERACAO_AGS.length - 1));
    }, 850);

    const cardExistente = cards.find(
      (item) =>
        item.itemOrigemId === itemSelecionado.id &&
        item.itemTipo === tipo &&
        (item.data ?? "").slice(0, 10) === dataAgendamento &&
        (item.status ?? "").trim().toUpperCase() !== "CANCELADO"
    );

    try {
      const salvo = await salvarMutation.mutateAsync({
        id: cardSelecionado?.id ? String(cardSelecionado.id) : undefined,
        tipo,
        itemId: itemSelecionado.id,
        data: dataAgendamento,
        matriculasIds: beneficiariosSelecionados
      });
      await agendamentosQuery.refetch();
      const dataExibicao = String(salvo?.data ?? dataAgendamento).slice(0, 10);
      const participantesPreview = (beneficiariosQuery.data ?? [])
        .filter((item) => beneficiariosSelecionados.includes(item.matriculaId))
        .map((item) => ({
          matriculaId: item.matriculaId,
          beneficiarioId: item.beneficiarioId,
          beneficiarioNome: item.nomeCompleto,
          dataNascimento: item.dataNascimento,
          telefone: item.telefone,
          comparecimento: "Pendente" as const
        }));
      const agendaVisivel: Agendamento =
        salvo ?? {
          id: -Date.now(),
          beneficiarioId: participantesPreview[0]?.beneficiarioId,
          beneficiarioNome: itemSelecionado.nome,
          unidade: itemSelecionado.local ?? "Local a definir",
          setor: tipo === "curso" ? "Curso" : tipo === "oficina" ? "Oficina" : "Atendimento",
          tipoAtendimento: itemSelecionado.nome,
          profissionalNome: itemSelecionado.profissionalNome,
          data: dataExibicao,
          horaInicial: itemSelecionado.horario ?? "08:00",
          modalidade: "Coletivo",
          prioridade: "Normal",
          status: "Agendado",
          coletivo: true,
          tituloColetivo: itemSelecionado.nome,
          capacidadeMaxima: participantesPreview.length,
          participantes: participantesPreview,
          itemTipo: tipo,
          itemOrigemId: itemSelecionado.id,
          itemNome: itemSelecionado.nome,
          itemDiasSemana: itemSelecionado.diasSemana,
          itemLocal: itemSelecionado.local,
          diaSemana: new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(
            new Date(`${dataExibicao}T12:00:00`)
          ),
          observacaoCurta: `${participantesPreview.length} participante(s) vinculado(s) pela inscricao.`
        };

      queryClient.setQueriesData<Agendamento[]>(
        { queryKey: ["agendamentos", usuario?.tenant_id ?? "sem-tenant"] },
        (atual) => {
          const base = Array.isArray(atual) ? atual : [];
          const semDuplicado = base.filter(
            (item) =>
              !(
                item.id === agendaVisivel.id ||
                (item.itemOrigemId === agendaVisivel.itemOrigemId &&
                  item.itemTipo === agendaVisivel.itemTipo &&
                  (item.data ?? "").slice(0, 10) === (agendaVisivel.data ?? "").slice(0, 10))
              )
          );
          return [...semDuplicado, agendaVisivel].sort((a, b) =>
            `${a.data ?? ""}${a.horaInicial ?? ""}`.localeCompare(`${b.data ?? ""}${b.horaInicial ?? ""}`)
          );
        }
      );

      setAgendaGeradaLocal(agendaVisivel);
      setSelecionadoId(agendaVisivel.id ?? null);
      setUltimaAgendaDestacadaId(agendaVisivel.id ?? null);
      definirDataVisualizacao(dataExibicao);
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: cardExistente
          ? "Agenda já existente atualizada com sucesso. O card foi reaproveitado e deve aparecer na data selecionada."
          : "Agenda gerada com sucesso."
      });
      destaqueAgendaTimeout.current = window.setTimeout(() => {
        setUltimaAgendaDestacadaId((atual) => (atual === salvo?.id ? null : atual));
      }, 4500);
    } catch (error: any) {
      definirDataVisualizacao(dataAgendamento);
      const mensagem = error?.response?.data?.message ?? "Não foi possível gerar a agenda.";
      setPopup({
        tipo: "erro",
        titulo: mensagem.startsWith("Conflito de agenda identificado.") ? "Agendamento bloqueador" : "Erro",
        texto: mensagem
      });
    }
    finally {
      if (geracaoIntervalo.current) {
        window.clearInterval(geracaoIntervalo.current);
        geracaoIntervalo.current = null;
      }
      setGeracaoEmAndamento(false);
      setGeracaoEtapa(0);
    }
  }

  async function executarNotificacao(item: Agendamento, canal: "WHATSAPP" | "EMAIL") {
    if (!item.id) return;
    const agendamentoId = Number(item.id);
    let etapaAtual = 0;
    setEnvioEmAndamento({ agendamentoId, canal, etapa: etapaAtual });

    const intervalo = window.setInterval(() => {
      etapaAtual = Math.min(etapaAtual + 1, ETAPAS_ENVIO.length - 1);
      setEnvioEmAndamento((atual) => {
        if (!atual || atual.agendamentoId !== agendamentoId || atual.canal !== canal) {
          return atual;
        }
        return { ...atual, etapa: etapaAtual };
      });
    }, 1200);

    try {
      const resultado = await notificarMutation.mutateAsync({ id: item.id, canal });
      if (canal === "WHATSAPP") {
        (resultado.links ?? []).slice(0, 10).forEach((link) => window.open(link, "_blank", "noopener,noreferrer"));
      }
      window.clearInterval(intervalo);
      setEnvioEmAndamento((atual) => {
        if (!atual || atual.agendamentoId !== agendamentoId || atual.canal !== canal) {
          return atual;
        }
        return null;
      });
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto:
          canal === "EMAIL"
            ? `Envio por e-mail concluído. Enviados: ${resultado.enviados}. Ignorados: ${resultado.ignorados}.`
            : `Links de WhatsApp preparados. Enviados: ${resultado.enviados}. Ignorados: ${resultado.ignorados}.`
      });
    } catch (error: any) {
      window.clearInterval(intervalo);
      setEnvioEmAndamento((atual) => {
        if (!atual || atual.agendamentoId !== agendamentoId || atual.canal !== canal) {
          return atual;
        }
        return null;
      });
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível enviar a comunicação." });
    }
  }

  async function imprimirFichaPresenca(item: Agendamento) {
    const unidadeAtual = unidadeAtualQuery.data?.unidade;
    const participantes = item.participantes ?? [];
    const atividade = item.itemNome || item.tipoAtendimento;
    const tipo = item.itemTipo || item.setor || "-";
    const profissional = item.profissionalNome || "Sem profissional definido";
    const data = item.data ? new Date(`${item.data}T12:00:00`).toLocaleDateString("pt-BR") : "-";
    const horario = item.horaInicial || "-";
    const local = item.itemLocal || item.sala || item.unidade || "-";
    const nomeInstituicao = unidadeAtual?.razao_social?.trim() || unidadeAtual?.nome_fantasia?.trim() || "Instituição não cadastrada";
    let logomarcaRelatorio = "";
    try {
      const logo = await obterUrlArquivoAutenticado(unidadeAtual?.logomarca_relatorio || unidadeAtual?.logomarca, {
        cache: false,
        auditar: false
      });
      logomarcaRelatorio = logo.url;
      window.setTimeout(() => logo.revoke?.(), 60_000);
    } catch {
      logomarcaRelatorio = "";
    }
    const rodapeInstitucional = montarRodapeInstitucional(unidadeAtual ?? undefined);
    const linhas = participantes.length
      ? participantes
          .map(
            (participante, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(participante.codigo || participante.beneficiarioId?.toString() || participante.matriculaId?.toString() || "-")}</td>
                <td>${escapeHtml(participante.beneficiarioNome)}</td>
                <td>${escapeHtml(formatarTelefoneRelatorio(participante.telefone) || "-")}</td>
                <td>${escapeHtml(formatarIdade(participante.dataNascimento))}</td>
                <td><span class="g3-assinatura-campo" aria-hidden="true"></span></td>
              </tr>`
          )
          .join("")
      : `
        <tr>
          <td>1</td>
          <td colspan="5">Sem beneficiários vinculados ao card.</td>
        </tr>`;

    const emitidoEm = new Date().toLocaleString("pt-BR");

    imprimirFichaHtml({
      titulo: `Agendamento e lista de presença - ${atividade}`,
      tamanhoPagina: "A4 portrait",
      paddingRaiz: "16px",
      estilosExtras: `
        .g3-ficha { color: #163027; }
        .g3-topo { margin-bottom: 18px; border: 1px solid #cfe9da; border-radius: 18px; overflow: hidden; background: linear-gradient(180deg, #f6fdf8 0%, #edf8f1 100%); }
        .g3-topo-faixa { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; background: #0f8a57; color: #ffffff; }
        .g3-topo-marca { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; }
        .g3-topo-selo { border: 1px solid rgba(255,255,255,0.35); border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 600; background: rgba(255,255,255,0.12); }
        .g3-topo-corpo { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 16px; padding: 18px; }
        .g3-topo-texto { text-align: center; }
        .g3-topo-logo { width: 88px; height: 88px; object-fit: contain; border-radius: 16px; background: #ffffff; border: 1px solid #dbe7df; padding: 10px; }
        .g3-topo h1 { margin: 0; font-size: 18px; font-weight: 700; color: #14532d; }
        .g3-topo h2 { margin: 4px 0 0; font-size: 24px; font-weight: 800; color: #1f2937; font-family: Arial, sans-serif; }
        .g3-bloco { margin-bottom: 16px; border: 1px solid #dbe7df; border-radius: 16px; background: #ffffff; overflow: hidden; }
        .g3-bloco-titulo { margin: 0; padding: 10px 14px; background: #eef8f2; border-bottom: 1px solid #dbe7df; font-size: 13px; font-weight: 700; color: #166534; }
        .g3-meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding: 10px 12px 12px; }
        .g3-meta-item { border: 1px solid #dbe7df; border-radius: 12px; padding: 8px 10px; background: #f9fcfa; text-align: center; }
        .g3-meta-item strong { display: block; margin-bottom: 3px; font-size: 10px; font-weight: 600; color: #5d7467; }
        .g3-meta-item span { display: block; font-size: 13px; font-weight: 700; color: #163027; line-height: 1.15; }
        .g3-orientacao { margin: 0 0 16px; border-left: 4px solid #0f8a57; border-radius: 10px; padding: 10px 12px; background: #f4fbf7; font-size: 12px; color: #4b6356; }
        .g3-tabela { width: 100%; table-layout: fixed; border: 1px solid #dbe7df; border-radius: 16px; overflow: hidden; }
        .g3-tabela thead th { padding: 11px 12px; background: #0f8a57; color: #ffffff; font-size: 12px; font-weight: 700; text-align: left; }
        .g3-tabela th, .g3-tabela td { border: 1px solid #dbe7df; padding: 10px 12px; text-align: left; }
        .g3-tabela tbody tr:nth-child(even) td { background: #f8fbf9; }
        .g3-tabela td { font-size: 13px; color: #233a31; min-height: 36px; }
        .g3-tabela td:first-child,
        .g3-tabela td:nth-child(2),
        .g3-tabela td:nth-child(4),
        .g3-tabela td:nth-child(5),
        .g3-tabela td:nth-child(6) { white-space: nowrap; }
        .g3-tabela th:nth-child(2),
        .g3-tabela td:nth-child(2) { width: 76px; }
        .g3-tabela th:nth-child(3),
        .g3-tabela td:nth-child(3) { width: 29%; }
        .g3-tabela th:nth-child(4),
        .g3-tabela td:nth-child(4) { width: 118px; }
        .g3-tabela th:nth-child(5),
        .g3-tabela td:nth-child(5) { width: 62px; }
        .g3-tabela th:nth-child(6),
        .g3-tabela td:nth-child(6) { width: 170px; }
        .g3-assinatura-campo { display: block; min-height: 20px; border-bottom: 1px solid #96b3a2; }
        .g3-rodape { margin-top: 18px; padding-top: 12px; border-top: 1px solid #dbe7df; font-size: 11px; color: #6b7f75; text-align: center; }
        .g3-rodape div + div { margin-top: 2px; }
      `,
      html: `
        <section class="g3-ficha">
          <header class="g3-topo">
            <div class="g3-topo-faixa">
              <span class="g3-topo-marca">G3N</span>
              <span class="g3-topo-selo">Agendamento</span>
            </div>
            <div class="g3-topo-corpo">
              ${
                logomarcaRelatorio
                  ? `<img src="${escapeHtml(logomarcaRelatorio)}" alt="Logomarca da instituição" class="g3-topo-logo" />`
                  : ""
              }
              <div class="g3-topo-texto">
                <h1>${escapeHtml(nomeInstituicao)}</h1>
                <h2>Agendamento e lista de presença</h2>
              </div>
            </div>
          </header>
          <section class="g3-bloco">
            <h2 class="g3-bloco-titulo">Resumo do agendamento</h2>
            <div class="g3-meta">
              <div class="g3-meta-item"><strong>Atividade</strong><span>${escapeHtml(atividade)}</span></div>
              <div class="g3-meta-item"><strong>Tipo</strong><span>${escapeHtml(tipo)}</span></div>
              <div class="g3-meta-item"><strong>Profissional</strong><span>${escapeHtml(profissional)}</span></div>
              <div class="g3-meta-item"><strong>Data</strong><span>${escapeHtml(data)}</span></div>
              <div class="g3-meta-item"><strong>Horário</strong><span>${escapeHtml(horario)}</span></div>
              <div class="g3-meta-item"><strong>Local</strong><span>${escapeHtml(local)}</span></div>
              <div class="g3-meta-item"><strong>Total de participantes</strong><span>${escapeHtml(participantes.length)}</span></div>
              <div class="g3-meta-item"><strong>Status da agenda</strong><span>${escapeHtml(item.status || "Agendado")}</span></div>
            </div>
          </section>
          <table class="g3-tabela">
            <thead>
              <tr>
                <th style="width: 42px;">Nº</th>
                <th style="width: 76px;">Código</th>
                <th>Beneficiário</th>
                <th style="width: 118px;">Telefone</th>
                <th style="width: 62px;">Idade</th>
                <th style="width: 170px;">Assinatura</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
          <footer class="g3-rodape">
            <div>${escapeHtml(rodapeInstitucional.linha1)}</div>
            ${rodapeInstitucional.linha2 ? `<div>${escapeHtml(rodapeInstitucional.linha2)}</div>` : ""}
            ${rodapeInstitucional.linha3 ? `<div>${escapeHtml(rodapeInstitucional.linha3)}</div>` : ""}
            <div>Emitido em ${escapeHtml(emitidoEm)}</div>
          </footer>
        </section>`
    });
  }

  function carregarParaEdicao(item: Agendamento) {
    setAbaAtiva("agenda");
    setSelecionadoId(item.id ?? null);
    setTipo(item.itemTipo);
    setBuscaItem("");
    setBuscaBeneficiario("");
    const itemResumo: AgendamentoOperacionalItem = {
      id: item.itemOrigemId ?? 0,
      nome: item.itemNome || item.tipoAtendimento,
      profissionalNome: item.profissionalNome,
      horario: item.horaInicial,
      diasSemana: item.itemDiasSemana,
      local: item.itemLocal || item.sala || item.unidade
    };
    setItemSelecionado(itemResumo.id ? itemResumo : null);
    setDataAgendamento(item.data ?? hoje);
    definirDataVisualizacao(item.data ?? hoje);
    setBeneficiariosSelecionados(
      (item.participantes ?? [])
        .map((participante) => participante.matriculaId ?? participante.beneficiarioId)
        .filter(Boolean) as number[]
    );
  }

  async function copiarAgenda(item: Agendamento) {
    if (!item.id) {
      setPopup({ tipo: "erro", titulo: "Atenção", texto: "Não foi possível copiar esta agenda porque faltam dados obrigatórios." });
      return;
    }

    setAgendaParaData({ acao: "copiar", item });
    setNovaDataAgenda(item.data?.slice(0, 10) || hoje);
  }

  async function moverAgenda(item: Agendamento) {
    if (!item.id) return;
    setAgendaParaData({ acao: "mover", item });
    setNovaDataAgenda(item.data?.slice(0, 10) || hoje);
  }

  async function excluirAgenda(item: Agendamento) {
    if (!item.id) return;
    setAgendaParaExcluir(item);
  }

  async function confirmarAcaoComData() {
    if (!agendaParaData) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(novaDataAgenda)) {
      setPopup({ tipo: "erro", titulo: "Data inválida", texto: "Informe a data no formato AAAA-MM-DD." });
      return;
    }

    setAgendaCopiando(true);
    try {
      if (agendaParaData.acao === "copiar") {
        const agendaOriginal = agendaParaData.item;
        const participantes = (agendaOriginal.participantes ?? []).map<AgendamentoParticipante>((participante) => ({
          ...participante,
          comparecimento: "Pendente" as const
        }));

        const novaAgenda: Agendamento = {
          ...agendaOriginal,
          id: undefined,
          data: novaDataAgenda,
          diaSemana: undefined,
          status: "Agendado",
          confirmadoEm: undefined,
          confirmadoPorNome: undefined,
          confirmacaoCanal: undefined,
          observacaoConfirmacao: undefined,
          participantes
        };

        const salvo = await salvarAgendamentoMutation.mutateAsync(novaAgenda);

        if (!salvo?.id) {
          setPopup({ tipo: "erro", titulo: "Erro", texto: "Não foi possível copiar a agenda." });
          return;
        }

        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Agenda copiada com sucesso para a nova data." });
      } else {
        if (!agendaParaData.item.id) return;
        await remarcarMutation.mutateAsync({
          id: agendaParaData.item.id,
          payload: { data: novaDataAgenda }
        });
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Agenda remarcada com sucesso." });
      }

      definirDataVisualizacao(novaDataAgenda);
      setAgendaParaData(null);
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto:
          error?.response?.data?.message ?? 
          (agendaParaData.acao === "copiar" ? "Não foi possível copiar a agenda." : "Não foi possível remarcar a agenda.")
      });
    } finally {
      setAgendaCopiando(false);
    }
  }

  async function alternarConfirmacaoParticipante(item: Agendamento, index: number) {
    if (!item.id) return;
    const participanteAtual = item.participantes?.[index];
    if (!participanteAtual || participanteAtual.comparecimento === "Presente") return;

    const participantes = (item.participantes ?? []).map<AgendamentoParticipante>((participante, participanteIndex) =>
      participanteIndex === index
        ? {
            ...participante,
            comparecimento: "Presente"
        }
        : participante
    );
    const statusAtualizado = participantes.every((participante) => participante.comparecimento === "Presente")
      ? "Confirmado"
      : item.status;

    setConfirmacaoParticipanteEmAndamento({ agendamentoId: item.id, index });
    try {
      await salvarAgendamentoMutation.mutateAsync({
        ...item,
        status: statusAtualizado,
        participantes
      });
      await agendamentosQuery.refetch();
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Participante confirmado com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível atualizar a confirmação." });
    } finally {
      setConfirmacaoParticipanteEmAndamento((atual) =>
        atual && atual.agendamentoId === item.id && atual.index === index ? null : atual
      );
    }
  }

  function solicitarMoverParticipante(item: Agendamento, index: number) {
    setParticipanteParaMover({ item, index });
    setNovaDataAgenda(item.data?.slice(0, 10) || hoje);
  }

  function solicitarExcluirParticipante(item: Agendamento, index: number) {
    setParticipanteParaExcluir({ item, index });
  }

  async function salvarParticipantesAtualizados(item: Agendamento, participantes: NonNullable<Agendamento["participantes"]>) {
    if (!item.id) return;

    if (!participantes.length) {
      await cancelarMutation.mutateAsync({ id: item.id, motivo: "Agenda sem participantes após ajuste individual." });
      if (selecionadoId === item.id) {
        setSelecionadoId(null);
      }
      return;
    }

    await salvarAgendamentoMutation.mutateAsync({
      ...item,
      participantes
    });
  }

  async function confirmarMoverParticipante() {
    if (!participanteParaMover) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(novaDataAgenda)) {
      setPopup({ tipo: "erro", titulo: "Data inválida", texto: "Informe a data no formato AAAA-MM-DD." });
      return;
    }

    const participante = participanteParaMover.item.participantes?.[participanteParaMover.index];
    const matriculaId = participante?.matriculaId;
    const itemId = participanteParaMover.item.itemOrigemId;
    const tipoItem = participanteParaMover.item.itemTipo;

    if (!participante || !matriculaId || !itemId || !tipoItem) {
      setPopup({ tipo: "erro", titulo: "Atenção", texto: "Não foi possível mover este beneficiário." });
      return;
    }

    try {
      await salvarMutation.mutateAsync({
        tipo: tipoItem,
        itemId,
        data: novaDataAgenda,
        matriculasIds: [matriculaId]
      });

      const participantesRestantes = (participanteParaMover.item.participantes ?? []).filter((_, index) => index !== participanteParaMover.index);
      await salvarParticipantesAtualizados(participanteParaMover.item, participantesRestantes);

      definirDataVisualizacao(novaDataAgenda);
      setParticipanteParaMover(null);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Beneficiário movido para a nova data com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível mover o beneficiário." });
    }
  }

  async function confirmarExcluirParticipante() {
    if (!participanteParaExcluir) return;

    try {
      const participantesRestantes = (participanteParaExcluir.item.participantes ?? []).filter((_, index) => index !== participanteParaExcluir.index);
      await salvarParticipantesAtualizados(participanteParaExcluir.item, participantesRestantes);
      setParticipanteParaExcluir(null);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Beneficiário removido da agenda com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível remover o beneficiário." });
    }
  }

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Atendimentos diários"
        pageTitle="Agendamentos"
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={cardSelecionado?.id ? `Código: ${cardSelecionado.id}` : "Novo"}
      >
        <section className="space-y-4">
          {abaAtiva === "agenda" ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {resumoOperacional.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-[var(--g3-border)] bg-white px-4 py-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">{item.label}</p>
                    <p className="mt-2 text-sm font-medium text-[var(--g3-foreground)]">{item.value}</p>
                  </div>
                ))}
              </div>

              <Card className="border-[var(--g3-border)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfb_100%)] shadow-sm">
                <CardContent className="space-y-4">
                  <p className="text-xs text-[var(--g3-muted)]">
                    Selecione o tipo, escolha o item já existente nas inscrições, marque os beneficiários vinculados e gere a agenda do dia.
                  </p>
                  <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <TipoSelector
                      value={tipo}
                      onChange={(value) => {
                        setTipo(value);
                        setItemSelecionado(null);
                        setBeneficiariosSelecionados([]);
                      }}
                    />
                    <ItemSelector
                      busca={buscaItem}
                      onBuscaChange={setBuscaItem}
                      itens={itensQuery.data ?? []}
                      selecionadoId={itemSelecionado?.id ?? null}
                      onSelect={(item) => {
                        setItemSelecionado(item);
                        setBeneficiariosSelecionados([]);
                      }}
                      carregando={itensQuery.isLoading}
                    />
                  </div>
                  <ItemResumoCard item={itemSelecionado} />
                  <BeneficiarioSelector
                    busca={buscaBeneficiario}
                    onBuscaChange={setBuscaBeneficiario}
                    beneficiarios={beneficiariosFiltrados}
                    selecionados={beneficiariosSelecionados}
                    onToggle={(matriculaId) =>
                      setBeneficiariosSelecionados((atual) =>
                        atual.includes(matriculaId) ? atual.filter((item) => item !== matriculaId) : [...atual, matriculaId]
                      )
                    }
                    onSelecionarTodos={() =>
                      setBeneficiariosSelecionados(beneficiariosFiltrados.filter((item) => item.selecionavel).map((item) => item.matriculaId))
                    }
                    onLimparSelecao={() => setBeneficiariosSelecionados([])}
                    carregando={beneficiariosQuery.isLoading}
                  />
                  <DataSelector value={dataAgendamento} onChange={setDataAgendamento} />
                  <GenerateCardButton
                    disabled={!tipo || !itemSelecionado?.id || !beneficiariosSelecionados.length || !dataAgendamento}
                    loading={salvarMutation.isPending || geracaoEmAndamento}
                    onClick={salvarCard}
                    texto={cardSelecionado?.id ? "Atualizar agenda" : "Gerar agenda"}
                  />
                  {geracaoEmAndamento ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <LoaderCircle className="h-4 w-4 animate-spin text-emerald-700" />
                        <p className="text-sm font-medium text-emerald-900">{ETAPAS_GERACAO_AGS[geracaoEtapa]}</p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                          style={{ width: `${((geracaoEtapa + 1) / ETAPAS_GERACAO_AGS.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfb_100%)] shadow-sm">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-sm">Agenda operacional gerada</CardTitle>
                  <p className="text-xs text-[var(--g3-muted)]">
                    Use a data de visualização para navegar entre os dias e carregar somente os cards agendados naquela data.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Data em exibição</p>
                      <p className="mt-1 text-base font-semibold text-emerald-950">{formatarDataExtensa(dataVisualizacao)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" className="shadow-sm" onClick={() => definirDataVisualizacao(somarDias(dataVisualizacao, -1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <input
                        type="date"
                        value={dataVisualizacao}
                        onChange={(event) => definirDataVisualizacao(event.target.value)}
                        className="h-10 rounded-xl border border-[var(--g3-border)] bg-white px-3 text-sm text-[var(--g3-foreground)] shadow-sm outline-none focus:border-emerald-400"
                      />
                      <Button type="button" variant="outline" className="shadow-sm" onClick={() => definirDataVisualizacao(somarDias(dataVisualizacao, 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <AgendaCardList
                    cards={cardsDoDia}
                    selecionadoId={selecionadoId}
                    destaqueRecenteId={ultimaAgendaDestacadaId}
                    envioEmAndamento={envioEmAndamento}
                    confirmacaoEmAndamento={confirmacaoParticipanteEmAndamento}
                    onAlternarConfirmacao={(item, index) => void alternarConfirmacaoParticipante(item, index)}
                    onMoverParticipante={(item, index) => solicitarMoverParticipante(item, index)}
                    onExcluirParticipante={(item, index) => solicitarExcluirParticipante(item, index)}
                    onCopiar={(item) => void copiarAgenda(item)}
                    onExcluir={(item) => void excluirAgenda(item)}
                    onMover={(item) => void moverAgenda(item)}
                    onEditar={carregarParaEdicao}
                    onCancelar={(item) => setConfirmarCancelar(item)}
                    onWhatsApp={(item) => void executarNotificacao(item, "WHATSAPP")}
                    onEmail={(item) => void executarNotificacao(item, "EMAIL")}
                    onImprimir={imprimirFichaPresenca}
                  />
                </CardContent>
              </Card>
            </div>
          ) : null}

          {abaAtiva === "dashboard" ? (
            <Card className="border-[var(--g3-border)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfb_100%)] shadow-sm">
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm">Dashboard operacional</CardTitle>
                <p className="text-xs text-[var(--g3-muted)]">
                  Visão rápida da agenda com foco em demanda, confirmação e volume de atendimento.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {dashboardResumo.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center shadow-[0_10px_24px_rgba(22,101,52,0.12)]"
                  >
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
                      <card.icon className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-950">{card.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {abaAtiva === "espera" ? (
            <Card className="border-[var(--g3-border)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfb_100%)] shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Lista de espera</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(listaEsperaQuery.data ?? []).length ? (
                  (listaEsperaQuery.data ?? []).map((item) => (
                    <div key={item.id} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.beneficiarioNome}</p>
                      <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.tipoAtendimento} - {item.prioridade || "Normal"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--g3-muted)]">Nenhum item na lista de espera.</p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </section>
      </AdminPageLayout>

      <PopupConfirmacao
        aberto={Boolean(confirmarCancelar)}
        titulo="Cancelar agenda"
        texto="Deseja realmente cancelar esta agenda operacional?"
        processando={cancelarMutation.isPending}
        onCancel={() => setConfirmarCancelar(null)}
        onConfirm={() => {
          if (!confirmarCancelar?.id) return;
          void cancelarMutation
            .mutateAsync({ id: confirmarCancelar.id, motivo: "Cancelado pela agenda operacional." })
            .then(() => {
              setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Agenda cancelada com sucesso." });
              setConfirmarCancelar(null);
            })
            .catch((error: any) =>
              setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível cancelar a agenda." })
            );
        }}
        confirmarTexto="Cancelar agenda"
      />

      <PopupConfirmacao
        aberto={Boolean(agendaParaExcluir)}
        titulo="Excluir agenda"
        texto="Deseja realmente excluir esta agenda da listagem?"
        processando={excluirMutation.isPending}
        onCancel={() => setAgendaParaExcluir(null)}
        onConfirm={() => {
          if (!agendaParaExcluir?.id) return;
          void excluirMutation
            .mutateAsync(agendaParaExcluir.id)
            .then(() => {
              setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Agenda removida com sucesso." });
              if (selecionadoId === agendaParaExcluir.id) {
                setSelecionadoId(null);
              }
              setAgendaParaExcluir(null);
            })
            .catch((error: any) =>
              setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível excluir a agenda." })
            );
        }}
        confirmarTexto="Excluir agenda"
      />

      <PopupConfirmacao
        aberto={Boolean(participanteParaExcluir)}
        titulo="Excluir beneficiário"
        texto="Deseja realmente remover este beneficiário da agenda do dia?"
        processando={salvarAgendamentoMutation.isPending || cancelarMutation.isPending}
        onCancel={() => setParticipanteParaExcluir(null)}
        onConfirm={() => void confirmarExcluirParticipante()}
        confirmarTexto="Excluir beneficiário"
      />

      {agendaParaData ? (
        <div
          className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4 ${agendaCopiando ? "cursor-wait" : "cursor-default"}`}
          onClick={() => !agendaCopiando && setAgendaParaData(null)}
        >
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            {agendaCopiando ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/65 backdrop-blur-[1px]">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Copiando agenda...
                </div>
              </div>
            ) : null}
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-emerald-800">
                {agendaParaData.acao === "copiar" ? "Copiar agenda" : "Mover agenda"}
              </h3>
            </div>
            <div className="space-y-4 px-5 py-4">
              <p className="text-sm text-slate-700">
                {agendaParaData.acao === "copiar"
                  ? "Informe a nova data para criar uma cópia desta agenda."
                  : "Informe a nova data para remarcar esta agenda."}
              </p>
              <input
                type="date"
                value={novaDataAgenda}
                onChange={(event) => setNovaDataAgenda(event.target.value)}
                className="h-10 w-full rounded-xl border border-[var(--g3-border)] bg-white px-3 text-sm text-[var(--g3-foreground)] shadow-sm outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setAgendaParaData(null)} disabled={agendaCopiando}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void confirmarAcaoComData()} disabled={agendaCopiando}>
                {agendaCopiando ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Copiando...
                  </>
                ) : (
                  "Salvar data"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {participanteParaMover ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => setParticipanteParaMover(null)}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-emerald-800">Mover beneficiário</h3>
            </div>
            <div className="space-y-4 px-5 py-4">
              <p className="text-sm text-slate-700">Informe a nova data para transferir apenas este beneficiário.</p>
              <input
                type="date"
                value={novaDataAgenda}
                onChange={(event) => setNovaDataAgenda(event.target.value)}
                className="h-10 w-full rounded-xl border border-[var(--g3-border)] bg-white px-3 text-sm text-[var(--g3-foreground)] shadow-sm outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setParticipanteParaMover(null)}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void confirmarMoverParticipante()}>
                Salvar data
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}
