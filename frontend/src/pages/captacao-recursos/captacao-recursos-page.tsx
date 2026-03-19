import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CircleDollarSign,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  HandCoins,
  History,
  LayoutDashboard,
  Link2,
  MailPlus,
  Printer,
  Plus,
  RefreshCcw,
  Save,
  Settings2,
  ShieldUser,
  Trash2,
  Upload,
  UsersRound
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useAlterarStatusCampanhaCaptacao,
  useCancelarDoacaoCaptacao,
  useCaptacaoCampanhas,
  useCaptacaoComprovantes,
  useCaptacaoConfiguracoes,
  useCaptacaoDashboard,
  useCaptacaoDoacoes,
  useCaptacaoDoadores,
  useCaptacaoLogs,
  useConfirmarDoacaoCaptacao,
  useEmitirComprovanteCaptacao,
  useEstornarDoacaoCaptacao,
  useGerarCobrancaCaptacao,
  useInativarDoadorCaptacao,
  useReenviarComprovanteCaptacao,
  useSalvarCampanhaCaptacao,
  useSalvarConfiguracoesCaptacao,
  useSalvarDoacaoCaptacao,
  useSalvarDoadorCaptacao
} from "@/features/captacao-recursos/use-captacao-recursos";
import { useAuth } from "@/hooks/use-auth";
import { abrirArquivoAutenticado, imprimirArquivoAutenticado } from "@/lib/arquivos";
import {
  formatarCep,
  formatarCnpj,
  formatarCpf,
  formatarTelefone,
  mascararTelefoneInput,
  normalizarCep,
  normalizarCnpj,
  normalizarCpf,
  normalizarEmail,
  normalizarTelefone,
  validarCep,
  validarCnpj,
  validarCpf,
  validarEmail
} from "@/lib/br-utils";
import { reservarJanelaRelatorio } from "@/lib/report-utils";
import { arquivosService } from "@/services/arquivos.service";
import { captacaoRecursosService } from "@/services/captacao-recursos.service";
import type { ArquivoMetadata } from "@/types/arquivo";
import type {
  CaptacaoCampanha,
  CaptacaoComprovante,
  CaptacaoConfiguracoes,
  CaptacaoDoacao,
  CaptacaoDoador,
  CaptacaoListFilters,
  CaptacaoLogItem
} from "@/types/captacao-recursos";
import {
  badgeClasseStatus,
  categoriaDoadorOptions,
  captacaoTabPaths,
  dataHojeIso,
  formatarData,
  formatarDataHora,
  formatarMoeda,
  formatarNumero,
  formaPagamentoOptions,
  IndicadorCard,
  origemDoacaoOptions,
  periodicidadeOptions,
  permissaoCaptacaoDetalhada,
  primeiroDiaMesIso,
  SecaoCard,
  situacaoDoacaoOptions,
  statusCampanhaOptions,
  statusDoadorOptions,
  statusRecorrenciaOptions,
  tipoCampanhaOptions,
  tipoDoacaoOptions,
  tipoDoadorOptions,
  type CaptacaoTabId
} from "./captacao-recursos.shared";

type PopupConfirmacaoState = {
  titulo: string;
  texto: string;
  acao: () => Promise<void>;
};

type DoadorFormState = {
  id?: string;
  tipoDoador: string;
  nome: string;
  nomeFantasia: string;
  cpfCnpj: string;
  dataNascimentoFundacao: string;
  emailPrincipal: string;
  emailSecundario: string;
  telefone: string;
  whatsapp: string;
  enderecoCompleto: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  observacoes: string;
  origemCadastro: string;
  status: string;
  aceitouLgpd: boolean;
  dataAceiteLgpd: string;
  aceitaEmail: boolean;
  aceitaWhatsapp: boolean;
  aceitaReceberCampanhas: boolean;
  categoriaDoador: string;
  responsavelRelacionamento: string;
  observacoesInternas: string;
  portalAtivo: boolean;
  anexoPrincipalCaminho: string;
};

type CampanhaFormState = {
  id?: string;
  nome: string;
  descricaoCurta: string;
  descricaoCompleta: string;
  objetivo: string;
  metaFinanceira: string;
  dataInicial: string;
  dataFinal: string;
  status: string;
  imagemBanner: string;
  corDestaque: string;
  tipo: string;
  responsavel: string;
  destaqueNoPortal: boolean;
  visivelAoPublico: boolean;
  urlPublica: string;
  qrCodePublico: string;
  mensagemAgradecimento: string;
};

type DoacaoFormState = {
  id?: string;
  doadorId: string;
  campanhaId: string;
  valor: string;
  valorLiquido: string;
  valorTaxas: string;
  tipoDoacao: string;
  formaPagamento: string;
  situacao: string;
  origem: string;
  identificadorExterno: string;
  txid: string;
  linkPagamento: string;
  dataVencimento: string;
  observacoesInternas: string;
  usuarioResponsavel: string;
  comprovanteGerado: boolean;
  recorrenciaAtiva: boolean;
  recorrenciaId: string;
  recorrenciaValor: string;
  recorrenciaPeriodicidade: string;
  recorrenciaFormaPagamento: string;
  recorrenciaDataProximaCobranca: string;
  recorrenciaQuantidadeCiclos: string;
  recorrenciaSemPrevisaoTermino: boolean;
  recorrenciaStatus: string;
};

type DoadorAbaInterna =
  | "dados"
  | "contato"
  | "endereco"
  | "historico"
  | "campanhas"
  | "comprovantes"
  | "observacoes"
  | "anexos";

const abas: AdminTab[] = [
  { id: "dashboard", label: "Dashboard de captação", icon: LayoutDashboard },
  { id: "doadores", label: "Doadores", icon: UsersRound },
  { id: "doacoes", label: "Doações", icon: CircleDollarSign },
  { id: "campanhas", label: "Campanhas", icon: HandCoins },
  { id: "portal", label: "Portal doador", icon: ShieldUser },
  { id: "comprovantes", label: "Comprovantes", icon: FileText },
  { id: "configuracoes", label: "Configurações de pagamento", icon: Settings2 },
  { id: "relatorios", label: "Relatórios", icon: FileSpreadsheet },
  { id: "permissoes", label: "Permissões do módulo", icon: History }
];

const defaultDoadorForm: DoadorFormState = {
  tipoDoador: "pessoa_fisica",
  nome: "",
  nomeFantasia: "",
  cpfCnpj: "",
  dataNascimentoFundacao: "",
  emailPrincipal: "",
  emailSecundario: "",
  telefone: "",
  whatsapp: "",
  enderecoCompleto: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  observacoes: "",
  origemCadastro: "administrativo",
  status: "ativo",
  aceitouLgpd: false,
  dataAceiteLgpd: "",
  aceitaEmail: true,
  aceitaWhatsapp: true,
  aceitaReceberCampanhas: true,
  categoriaDoador: "individual",
  responsavelRelacionamento: "",
  observacoesInternas: "",
  portalAtivo: true,
  anexoPrincipalCaminho: ""
};

const defaultCampanhaForm: CampanhaFormState = {
  nome: "",
  descricaoCurta: "",
  descricaoCompleta: "",
  objetivo: "",
  metaFinanceira: "",
  dataInicial: "",
  dataFinal: "",
  status: "rascunho",
  imagemBanner: "",
  corDestaque: "#0f766e",
  tipo: "institucional",
  responsavel: "",
  destaqueNoPortal: false,
  visivelAoPublico: true,
  urlPublica: "",
  qrCodePublico: "",
  mensagemAgradecimento: ""
};

const defaultDoacaoForm: DoacaoFormState = {
  doadorId: "",
  campanhaId: "",
  valor: "",
  valorLiquido: "",
  valorTaxas: "",
  tipoDoacao: "unica",
  formaPagamento: "pix",
  situacao: "pendente",
  origem: "administrativo",
  identificadorExterno: "",
  txid: "",
  linkPagamento: "",
  dataVencimento: "",
  observacoesInternas: "",
  usuarioResponsavel: "",
  comprovanteGerado: false,
  recorrenciaAtiva: false,
  recorrenciaId: "",
  recorrenciaValor: "",
  recorrenciaPeriodicidade: "mensal",
  recorrenciaFormaPagamento: "cartao",
  recorrenciaDataProximaCobranca: "",
  recorrenciaQuantidadeCiclos: "",
  recorrenciaSemPrevisaoTermino: true,
  recorrenciaStatus: "ativa"
};

const defaultFiltros: CaptacaoListFilters = {
  termo: "",
  pagina: 1,
  limite: 20,
  periodoInicio: primeiroDiaMesIso(),
  periodoFim: dataHojeIso(),
  campanhaId: "",
  formaPagamento: "",
  situacao: "",
  origem: "",
  tipoDoacao: "",
  tipoDoador: "",
  status: ""
};

const coresGraficos = ["#0f766e", "#2563eb", "#7c3aed", "#d97706", "#dc2626", "#0891b2"];

function tooltipMoedaFormatter(value: number | string | readonly (number | string)[] | undefined) {
  const valorNormalizado = Array.isArray(value) ? value[0] : value;
  return formatarMoeda(Number(valorNormalizado ?? 0));
}

function tooltipNumeroFormatter(value: number | string | readonly (number | string)[] | undefined) {
  const valorNormalizado = Array.isArray(value) ? value[0] : value;
  return formatarNumero(Number(valorNormalizado ?? 0));
}

function obterAbaPeloPath(pathname: string): CaptacaoTabId {
  if (pathname.startsWith("/captacao-recursos/doadores")) return "doadores";
  if (pathname.startsWith("/captacao-recursos/doacoes")) return "doacoes";
  if (pathname.startsWith("/captacao-recursos/campanhas")) return "campanhas";
  if (pathname.startsWith("/captacao-recursos/portal-doador")) return "portal";
  if (pathname.startsWith("/captacao-recursos/comprovantes")) return "comprovantes";
  if (pathname.startsWith("/captacao-recursos/configuracoes-pagamento")) return "configuracoes";
  if (pathname.startsWith("/captacao-recursos/relatorios")) return "relatorios";
  if (pathname.startsWith("/captacao-recursos/permissoes")) return "permissoes";
  return "dashboard";
}

function CampoErro({ texto }: { texto?: string }) {
  return texto ? <p className="text-xs text-rose-600">{texto}</p> : null;
}

function TabelaVazia({ texto, colSpan }: { texto: string; colSpan: number }) {
  return (
    <tr>
      <td className="px-3 py-4 text-center text-sm text-[var(--g3-muted)]" colSpan={colSpan}>
        {texto}
      </td>
    </tr>
  );
}

function DocumentLabel({ item }: { item: CaptacaoDoador }) {
  const documento = item.cpfCnpj ?? "";
  if (!documento) return <>—</>;
  const digitos = documento.replace(/\D/g, "");
  return <>{digitos.length === 11 ? formatarCpf(digitos) : formatarCnpj(digitos)}</>;
}

export function CaptacaoRecursosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const permissoes = usuario?.permissoes ?? [];
  const isAdmin = permissoes.includes("ADMINISTRADOR");
  const abaAtiva = obterAbaPeloPath(location.pathname);
  const [filtros, setFiltros] = useState<CaptacaoListFilters>(defaultFiltros);
  const [doadorForm, setDoadorForm] = useState<DoadorFormState>(defaultDoadorForm);
  const [campanhaForm, setCampanhaForm] = useState<CampanhaFormState>(defaultCampanhaForm);
  const [doacaoForm, setDoacaoForm] = useState<DoacaoFormState>(defaultDoacaoForm);
  const [configForm, setConfigForm] = useState<Partial<CaptacaoConfiguracoes>>({});
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmacao, setConfirmacao] = useState<PopupConfirmacaoState | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [doadorAbaInterna, setDoadorAbaInterna] = useState<DoadorAbaInterna>("dados");
  const [anexosDoador, setAnexosDoador] = useState<ArquivoMetadata[]>([]);
  const [errosDoador, setErrosDoador] = useState<Record<string, string>>({});
  const [errosCampanha, setErrosCampanha] = useState<Record<string, string>>({});
  const [errosDoacao, setErrosDoacao] = useState<Record<string, string>>({});

  function possuiAlgumaPermissao(permitidas: string[]) {
    return isAdmin || permitidas.some((item) => permissoes.includes(item));
  }

  const podeVerDashboard = possuiAlgumaPermissao(["CAPTACAO_DASHBOARD_VISUALIZAR"]);
  const podeVerDoadores = possuiAlgumaPermissao([
    "CAPTACAO_DOADORES_VISUALIZAR",
    "CAPTACAO_DOADORES_CADASTRAR",
    "CAPTACAO_DOADORES_EDITAR"
  ]);
  const podeVerDoacoes = possuiAlgumaPermissao([
    "CAPTACAO_DOACOES_VISUALIZAR",
    "CAPTACAO_DOACOES_CADASTRAR"
  ]);
  const podeVerCampanhas = possuiAlgumaPermissao([
    "CAPTACAO_DASHBOARD_VISUALIZAR",
    "CAPTACAO_CAMPANHAS_CRIAR",
    "CAPTACAO_CAMPANHAS_EDITAR"
  ]);
  const podeConfigurar = possuiAlgumaPermissao(["CAPTACAO_CONFIGURAR"]);
  const podeVerRelatorios = possuiAlgumaPermissao([
    "CAPTACAO_RELATORIOS_VISUALIZAR",
    "CAPTACAO_RELATORIOS_EXPORTAR"
  ]);

  const dashboardQuery = useCaptacaoDashboard(filtros, abaAtiva === "dashboard" && podeVerDashboard);
  const doadoresQuery = useCaptacaoDoadores(filtros, (abaAtiva === "doadores" || abaAtiva === "doacoes" || abaAtiva === "portal") && podeVerDoadores);
  const campanhasQuery = useCaptacaoCampanhas(filtros, (abaAtiva === "campanhas" || abaAtiva === "dashboard" || abaAtiva === "doacoes" || abaAtiva === "portal" || abaAtiva === "relatorios") && podeVerCampanhas);
  const doacoesQuery = useCaptacaoDoacoes(filtros, (abaAtiva === "doacoes" || abaAtiva === "dashboard" || abaAtiva === "doadores" || abaAtiva === "comprovantes" || abaAtiva === "relatorios" || abaAtiva === "portal") && podeVerDoacoes);
  const comprovantesQuery = useCaptacaoComprovantes(filtros, (abaAtiva === "comprovantes" || abaAtiva === "doadores") && podeVerDoacoes);
  const configuracoesQuery = useCaptacaoConfiguracoes((abaAtiva === "configuracoes" || abaAtiva === "portal") && podeConfigurar);
  const logsQuery = useCaptacaoLogs((abaAtiva === "permissoes" || abaAtiva === "relatorios") && podeVerRelatorios);

  const salvarDoadorMutation = useSalvarDoadorCaptacao();
  const inativarDoadorMutation = useInativarDoadorCaptacao();
  const salvarCampanhaMutation = useSalvarCampanhaCaptacao();
  const alterarStatusCampanhaMutation = useAlterarStatusCampanhaCaptacao();
  const salvarDoacaoMutation = useSalvarDoacaoCaptacao();
  const gerarCobrancaMutation = useGerarCobrancaCaptacao();
  const confirmarDoacaoMutation = useConfirmarDoacaoCaptacao();
  const cancelarDoacaoMutation = useCancelarDoacaoCaptacao();
  const estornarDoacaoMutation = useEstornarDoacaoCaptacao();
  const emitirComprovanteMutation = useEmitirComprovanteCaptacao();
  const reenviarComprovanteMutation = useReenviarComprovanteCaptacao();
  const salvarConfiguracoesMutation = useSalvarConfiguracoesCaptacao();

  const doadores = doadoresQuery.data?.doadores ?? [];
  const campanhas = campanhasQuery.data?.campanhas ?? [];
  const doacoes = doacoesQuery.data?.doacoes ?? [];
  const comprovantes = comprovantesQuery.data?.comprovantes ?? [];
  const logs = logsQuery.data ?? [];
  const doadorSelecionado = doadores.find((item) => item.id === doadorForm.id);
  const historicoDoacoesDoador = doacoes.filter((item) => item.doadorId && item.doadorId === doadorForm.id);
  const comprovantesDoador = comprovantes.filter((item) => item.doadorId && item.doadorId === doadorForm.id);
  const campanhasDoador = Array.from(
    new Map(
      historicoDoacoesDoador
        .filter((item) => item.campanhaId && item.campanhaNome)
        .map((item) => [item.campanhaId as string, { id: item.campanhaId as string, nome: item.campanhaNome as string }])
    ).values()
  );

  useEffect(() => {
    if (!usuario) return;
    setDoadorForm((atual) => ({ ...atual, responsavelRelacionamento: atual.responsavelRelacionamento || usuario.nome || usuario.nomeUsuario }));
    setCampanhaForm((atual) => ({ ...atual, responsavel: atual.responsavel || usuario.nome || usuario.nomeUsuario }));
    setDoacaoForm((atual) => ({ ...atual, usuarioResponsavel: atual.usuarioResponsavel || usuario.nome || usuario.nomeUsuario }));
  }, [usuario]);

  useEffect(() => {
    if (configuracoesQuery.data) {
      setConfigForm(configuracoesQuery.data);
    }
  }, [configuracoesQuery.data]);

  useEffect(() => {
    let ativo = true;
    async function carregarAnexos() {
      if (!doadorForm.id) {
        if (ativo) setAnexosDoador([]);
        return;
      }
      try {
        const arquivos = await arquivosService.listarPorEntidade("captacao_doador", doadorForm.id);
        if (ativo) setAnexosDoador(arquivos);
      } catch {
        if (ativo) setAnexosDoador([]);
      }
    }
    void carregarAnexos();
    return () => {
      ativo = false;
    };
  }, [doadorForm.id]);

  function abrirMensagem(tipo: PopupMensagemState["tipo"], titulo: string, texto: string) {
    setPopupMensagem({ tipo, titulo, texto });
  }

  function limparFiltros() {
    setFiltros(defaultFiltros);
  }

  function editarDoador(item: CaptacaoDoador) {
    setDoadorForm({
      id: item.id,
      tipoDoador: item.tipoDoador,
      nome: item.nome ?? "",
      nomeFantasia: item.nomeFantasia ?? "",
      cpfCnpj: item.cpfCnpj ?? "",
      dataNascimentoFundacao: item.dataNascimentoFundacao ?? "",
      emailPrincipal: item.emailPrincipal ?? "",
      emailSecundario: item.emailSecundario ?? "",
      telefone: item.telefone ?? "",
      whatsapp: item.whatsapp ?? "",
      enderecoCompleto: item.enderecoCompleto ?? "",
      bairro: item.bairro ?? "",
      cidade: item.cidade ?? "",
      uf: item.uf ?? "",
      cep: item.cep ?? "",
      observacoes: item.observacoes ?? "",
      origemCadastro: item.origemCadastro ?? "administrativo",
      status: item.status ?? "ativo",
      aceitouLgpd: item.aceitouLgpd,
      dataAceiteLgpd: item.dataAceiteLgpd ?? "",
      aceitaEmail: item.aceitaEmail,
      aceitaWhatsapp: item.aceitaWhatsapp,
      aceitaReceberCampanhas: item.aceitaReceberCampanhas,
      categoriaDoador: item.categoriaDoador ?? "individual",
      responsavelRelacionamento: item.responsavelRelacionamento ?? "",
      observacoesInternas: item.observacoesInternas ?? "",
      portalAtivo: item.portalAtivo,
      anexoPrincipalCaminho: item.anexoPrincipalCaminho ?? ""
    });
    setErrosDoador({});
  }

  function editarCampanha(item: CaptacaoCampanha) {
    setCampanhaForm({
      id: item.id,
      nome: item.nome ?? "",
      descricaoCurta: item.descricaoCurta ?? "",
      descricaoCompleta: item.descricaoCompleta ?? "",
      objetivo: item.objetivo ?? "",
      metaFinanceira: String(item.metaFinanceira ?? ""),
      dataInicial: item.dataInicial ?? "",
      dataFinal: item.dataFinal ?? "",
      status: item.status ?? "rascunho",
      imagemBanner: item.imagemBanner ?? "",
      corDestaque: item.corDestaque ?? "#0f766e",
      tipo: item.tipo ?? "institucional",
      responsavel: item.responsavel ?? "",
      destaqueNoPortal: item.destaqueNoPortal,
      visivelAoPublico: item.visivelAoPublico,
      urlPublica: item.urlPublica ?? "",
      qrCodePublico: item.qrCodePublico ?? "",
      mensagemAgradecimento: item.mensagemAgradecimento ?? ""
    });
    setErrosCampanha({});
  }

  function editarDoacao(item: CaptacaoDoacao) {
    setDoacaoForm({
      id: item.id,
      doadorId: item.doadorId ?? "",
      campanhaId: item.campanhaId ?? "",
      valor: String(item.valor ?? ""),
      valorLiquido: String(item.valorLiquido ?? ""),
      valorTaxas: String(item.valorTaxas ?? ""),
      tipoDoacao: item.tipoDoacao ?? "unica",
      formaPagamento: item.formaPagamento ?? "pix",
      situacao: item.situacao ?? "pendente",
      origem: item.origem ?? "administrativo",
      identificadorExterno: item.identificadorExterno ?? "",
      txid: item.txid ?? "",
      linkPagamento: item.linkPagamento ?? "",
      dataVencimento: item.dataVencimento ?? "",
      observacoesInternas: item.observacoesInternas ?? "",
      usuarioResponsavel: item.usuarioResponsavel ?? "",
      comprovanteGerado: item.comprovanteGerado,
      recorrenciaAtiva: Boolean(item.recorrenciaId),
      recorrenciaId: item.recorrenciaId ?? "",
      recorrenciaValor: item.valor ? String(item.valor) : "",
      recorrenciaPeriodicidade: "mensal",
      recorrenciaFormaPagamento: item.formaPagamento ?? "cartao",
      recorrenciaDataProximaCobranca: "",
      recorrenciaQuantidadeCiclos: "",
      recorrenciaSemPrevisaoTermino: true,
      recorrenciaStatus: "ativa"
    });
    setErrosDoacao({});
  }

  function validarDoador() {
    const proximosErros: Record<string, string> = {};
    if (!doadorForm.nome.trim() || doadorForm.nome.trim().length < 3) {
      proximosErros.nome = "Informe o nome do doador.";
    }
    const documento =
      doadorForm.tipoDoador === "pessoa_fisica"
        ? normalizarCpf(doadorForm.cpfCnpj)
        : normalizarCnpj(doadorForm.cpfCnpj);
    if (doadorForm.tipoDoador === "pessoa_fisica" && documento && !validarCpf(documento)) {
      proximosErros.cpfCnpj = "Informe um CPF válido.";
    }
    if (
      ["pessoa_juridica", "patrocinador", "parceiro"].includes(doadorForm.tipoDoador) &&
      documento &&
      !validarCnpj(documento)
    ) {
      proximosErros.cpfCnpj = "Informe um CNPJ válido.";
    }
    if (doadorForm.emailPrincipal && !validarEmail(doadorForm.emailPrincipal)) {
      proximosErros.emailPrincipal = "Informe um e-mail válido.";
    }
    if (doadorForm.cep && !validarCep(normalizarCep(doadorForm.cep))) {
      proximosErros.cep = "Informe um CEP válido.";
    }
    setErrosDoador(proximosErros);
    return !Object.keys(proximosErros).length;
  }

  function validarCampanha() {
    const proximosErros: Record<string, string> = {};
    if (!campanhaForm.nome.trim() || campanhaForm.nome.trim().length < 3) {
      proximosErros.nome = "Informe o nome da campanha.";
    }
    setErrosCampanha(proximosErros);
    return !Object.keys(proximosErros).length;
  }

  function validarDoacao() {
    const proximosErros: Record<string, string> = {};
    if (!Number(doacaoForm.valor.replace(",", "."))) {
      proximosErros.valor = "Informe um valor válido.";
    }
    setErrosDoacao(proximosErros);
    return !Object.keys(proximosErros).length;
  }

  async function salvarDoador() {
    if (!validarDoador()) return;
    try {
      await salvarDoadorMutation.mutateAsync({
        id: doadorForm.id,
        payload: {
          tipoDoador: doadorForm.tipoDoador,
          nome: doadorForm.nome.trim(),
          nomeFantasia: doadorForm.nomeFantasia.trim() || undefined,
          cpfCnpj:
            doadorForm.tipoDoador === "pessoa_fisica"
              ? normalizarCpf(doadorForm.cpfCnpj)
              : normalizarCnpj(doadorForm.cpfCnpj),
          dataNascimentoFundacao: doadorForm.dataNascimentoFundacao || undefined,
          emailPrincipal: normalizarEmail(doadorForm.emailPrincipal) || undefined,
          emailSecundario: normalizarEmail(doadorForm.emailSecundario) || undefined,
          telefone: normalizarTelefone(doadorForm.telefone) || undefined,
          whatsapp: normalizarTelefone(doadorForm.whatsapp) || undefined,
          enderecoCompleto: doadorForm.enderecoCompleto.trim() || undefined,
          bairro: doadorForm.bairro.trim() || undefined,
          cidade: doadorForm.cidade.trim() || undefined,
          uf: doadorForm.uf.trim().toUpperCase() || undefined,
          cep: normalizarCep(doadorForm.cep) || undefined,
          observacoes: doadorForm.observacoes.trim() || undefined,
          origemCadastro: doadorForm.origemCadastro.trim() || undefined,
          status: doadorForm.status,
          aceitouLgpd: doadorForm.aceitouLgpd,
          dataAceiteLgpd: doadorForm.dataAceiteLgpd || undefined,
          aceitaEmail: doadorForm.aceitaEmail,
          aceitaWhatsapp: doadorForm.aceitaWhatsapp,
          aceitaReceberCampanhas: doadorForm.aceitaReceberCampanhas,
          categoriaDoador: doadorForm.categoriaDoador || undefined,
          responsavelRelacionamento: doadorForm.responsavelRelacionamento.trim() || undefined,
          observacoesInternas: doadorForm.observacoesInternas.trim() || undefined,
          portalAtivo: doadorForm.portalAtivo,
          anexoPrincipalCaminho: doadorForm.anexoPrincipalCaminho || undefined
        }
      });
      abrirMensagem("sucesso", "Doador salvo", "O cadastro do doador foi salvo com sucesso.");
      setDoadorForm((atual) => ({ ...defaultDoadorForm, responsavelRelacionamento: atual.responsavelRelacionamento }));
    } catch (error) {
      abrirMensagem("erro", "Erro ao salvar", error instanceof Error ? error.message : "Não foi possível salvar o doador.");
    }
  }

  async function salvarCampanha() {
    if (!validarCampanha()) return;
    try {
      await salvarCampanhaMutation.mutateAsync({
        id: campanhaForm.id,
        payload: {
          nome: campanhaForm.nome.trim(),
          descricaoCurta: campanhaForm.descricaoCurta.trim() || undefined,
          descricaoCompleta: campanhaForm.descricaoCompleta.trim() || undefined,
          objetivo: campanhaForm.objetivo.trim() || undefined,
          metaFinanceira: campanhaForm.metaFinanceira ? Number(campanhaForm.metaFinanceira.replace(",", ".")) : undefined,
          dataInicial: campanhaForm.dataInicial || undefined,
          dataFinal: campanhaForm.dataFinal || undefined,
          status: campanhaForm.status,
          imagemBanner: campanhaForm.imagemBanner || undefined,
          corDestaque: campanhaForm.corDestaque,
          tipo: campanhaForm.tipo,
          responsavel: campanhaForm.responsavel.trim() || undefined,
          destaqueNoPortal: campanhaForm.destaqueNoPortal,
          visivelAoPublico: campanhaForm.visivelAoPublico,
          urlPublica: campanhaForm.urlPublica.trim() || undefined,
          qrCodePublico: campanhaForm.qrCodePublico.trim() || undefined,
          mensagemAgradecimento: campanhaForm.mensagemAgradecimento.trim() || undefined
        }
      });
      abrirMensagem("sucesso", "Campanha salva", "A campanha foi salva com sucesso.");
      setCampanhaForm((atual) => ({ ...defaultCampanhaForm, responsavel: atual.responsavel }));
    } catch (error) {
      abrirMensagem("erro", "Erro ao salvar", error instanceof Error ? error.message : "Não foi possível salvar a campanha.");
    }
  }

  async function salvarDoacao() {
    if (!validarDoacao()) return;
    try {
      await salvarDoacaoMutation.mutateAsync({
        id: doacaoForm.id,
        payload: {
          doadorId: doacaoForm.doadorId || undefined,
          campanhaId: doacaoForm.campanhaId || undefined,
          valor: Number(doacaoForm.valor.replace(",", ".")),
          valorLiquido: doacaoForm.valorLiquido ? Number(doacaoForm.valorLiquido.replace(",", ".")) : undefined,
          valorTaxas: doacaoForm.valorTaxas ? Number(doacaoForm.valorTaxas.replace(",", ".")) : undefined,
          tipoDoacao: doacaoForm.tipoDoacao,
          formaPagamento: doacaoForm.formaPagamento,
          situacao: doacaoForm.situacao,
          origem: doacaoForm.origem,
          identificadorExterno: doacaoForm.identificadorExterno.trim() || undefined,
          txid: doacaoForm.txid.trim() || undefined,
          linkPagamento: doacaoForm.linkPagamento.trim() || undefined,
          dataVencimento: doacaoForm.dataVencimento || undefined,
          observacoesInternas: doacaoForm.observacoesInternas.trim() || undefined,
          usuarioResponsavel: doacaoForm.usuarioResponsavel.trim() || undefined,
          comprovanteGerado: doacaoForm.comprovanteGerado,
          recorrenciaId: doacaoForm.recorrenciaId || undefined,
          recorrencia: doacaoForm.recorrenciaAtiva
            ? {
                valorRecorrente: Number((doacaoForm.recorrenciaValor || doacaoForm.valor).replace(",", ".")),
                periodicidade: doacaoForm.recorrenciaPeriodicidade,
                formaPagamento: doacaoForm.recorrenciaFormaPagamento,
                dataProximaCobranca: doacaoForm.recorrenciaDataProximaCobranca || undefined,
                quantidadeCiclos: doacaoForm.recorrenciaQuantidadeCiclos ? Number(doacaoForm.recorrenciaQuantidadeCiclos) : undefined,
                semPrevisaoTermino: doacaoForm.recorrenciaSemPrevisaoTermino,
                status: doacaoForm.recorrenciaStatus
              }
            : undefined
        }
      });
      abrirMensagem("sucesso", "Doação salva", "A doação foi registrada com sucesso.");
      setDoacaoForm((atual) => ({ ...defaultDoacaoForm, usuarioResponsavel: atual.usuarioResponsavel }));
    } catch (error) {
      abrirMensagem("erro", "Erro ao salvar", error instanceof Error ? error.message : "Não foi possível salvar a doação.");
    }
  }

  async function salvarConfiguracoes() {
    try {
      await salvarConfiguracoesMutation.mutateAsync(configForm);
      abrirMensagem("sucesso", "Configurações salvas", "As configurações de pagamento foram atualizadas.");
    } catch (error) {
      abrirMensagem("erro", "Erro ao salvar", error instanceof Error ? error.message : "Não foi possível salvar as configurações.");
    }
  }

  async function carregarBannerCampanha(arquivo?: File) {
    if (!arquivo) return;
    if (!campanhaForm.id) {
      abrirMensagem("aviso", "Salve a campanha primeiro", "Salve a campanha antes de enviar o banner.");
      return;
    }
    try {
      const arquivoSalvo = await arquivosService.uploadPorEntidade({
        scope: "captacao_campanha_banner",
        entidadeTipo: "captacao_campanha",
        entidadeId: campanhaForm.id,
        arquivo
      });
      setCampanhaForm((atual) => ({ ...atual, imagemBanner: arquivoSalvo.caminhoArquivo }));
      abrirMensagem("sucesso", "Banner enviado", "O banner da campanha foi atualizado.");
    } catch (error) {
      abrirMensagem("erro", "Erro no upload", error instanceof Error ? error.message : "Não foi possível enviar o banner.");
    }
  }

  async function carregarAnexoDoador(arquivo?: File) {
    if (!arquivo) return;
    if (!doadorForm.id) {
      abrirMensagem("aviso", "Salve o doador primeiro", "Salve o cadastro antes de anexar arquivos.");
      return;
    }
    try {
      const arquivoSalvo = await arquivosService.uploadPorEntidade({
        scope: "captacao_doador_anexo",
        entidadeTipo: "captacao_doador",
        entidadeId: doadorForm.id,
        arquivo
      });
      setDoadorForm((atual) => ({ ...atual, anexoPrincipalCaminho: arquivoSalvo.caminhoArquivo }));
      abrirMensagem("sucesso", "Anexo enviado", "O anexo do doador foi atualizado.");
    } catch (error) {
      abrirMensagem("erro", "Erro no upload", error instanceof Error ? error.message : "Não foi possível enviar o anexo.");
    }
  }

  async function exportarRelatorio(formato: "pdf" | "excel") {
    try {
      const janela = formato === "pdf" ? reservarJanelaRelatorio("Gerando relatório de captação") : null;
      const blob = await captacaoRecursosService.exportarRelatorio(formato, filtros);
      if (formato === "pdf") {
        janela?.publicar(blob);
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `captacao-recursos-${dataHojeIso()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) {
      abrirMensagem("erro", "Erro ao exportar", error instanceof Error ? error.message : "Não foi possível exportar o relatório.");
    }
  }

  async function executarConfirmacao() {
    if (!confirmacao) return;
    try {
      setConfirmando(true);
      await confirmacao.acao();
      setConfirmacao(null);
    } catch (error) {
      abrirMensagem("erro", "Erro na ação", error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setConfirmando(false);
    }
  }

  async function copiarTexto(valor?: string | null, titulo = "Texto copiado") {
    if (!valor) return;
    try {
      await navigator.clipboard.writeText(valor);
      abrirMensagem("sucesso", titulo, "O conteúdo foi copiado para a área de transferência.");
    } catch {
      abrirMensagem("erro", "Falha ao copiar", "Não foi possível copiar o conteúdo.");
    }
  }

  const actions: AdminAction[] = useMemo(() => {
    switch (abaAtiva) {
      case "doadores":
        return [
          { label: "Novo doador", icon: Plus, variant: "outline", onClick: () => setDoadorForm((atual) => ({ ...defaultDoadorForm, responsavelRelacionamento: atual.responsavelRelacionamento })) },
          { label: salvarDoadorMutation.isPending ? "Salvando..." : "Salvar doador", icon: Save, variant: "default", disabled: salvarDoadorMutation.isPending, onClick: () => void salvarDoador() }
        ];
      case "doacoes":
        return [
          { label: "Nova doação", icon: Plus, variant: "outline", onClick: () => setDoacaoForm((atual) => ({ ...defaultDoacaoForm, usuarioResponsavel: atual.usuarioResponsavel })) },
          { label: salvarDoacaoMutation.isPending ? "Salvando..." : "Salvar doação", icon: Save, variant: "default", disabled: salvarDoacaoMutation.isPending, onClick: () => void salvarDoacao() }
        ];
      case "campanhas":
        return [
          { label: "Nova campanha", icon: Plus, variant: "outline", onClick: () => setCampanhaForm((atual) => ({ ...defaultCampanhaForm, responsavel: atual.responsavel })) },
          { label: salvarCampanhaMutation.isPending ? "Salvando..." : "Salvar campanha", icon: Save, variant: "default", disabled: salvarCampanhaMutation.isPending, onClick: () => void salvarCampanha() }
        ];
      case "configuracoes":
        return [
          { label: salvarConfiguracoesMutation.isPending ? "Salvando..." : "Salvar configurações", icon: Save, variant: "default", disabled: salvarConfiguracoesMutation.isPending, onClick: () => void salvarConfiguracoes() }
        ];
      case "relatorios":
        return [
          { label: "Exportar Excel", icon: FileSpreadsheet, variant: "outline", onClick: () => void exportarRelatorio("excel") },
          { label: "Exportar PDF", icon: Download, variant: "default", onClick: () => void exportarRelatorio("pdf") }
        ];
      default:
        return [{ label: "Atualizar dados", icon: RefreshCcw, variant: "outline", onClick: () => window.location.reload() }];
    }
  }, [abaAtiva, salvarCampanhaMutation.isPending, salvarConfiguracoesMutation.isPending, salvarDoacaoMutation.isPending, salvarDoadorMutation.isPending]);

  function renderFiltros() {
    return (
      <SecaoCard titulo="Filtros" descricao="Refine a visão do dashboard, das listas e dos relatórios.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-1">
            <Label>Palavra-chave</Label>
            <Input value={filtros.termo ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, termo: event.target.value, pagina: 1 }))} placeholder="Nome, campanha, txid..." />
          </div>
          <div className="space-y-1">
            <Label>Período inicial</Label>
            <Input type="date" value={filtros.periodoInicio ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, periodoInicio: event.target.value, pagina: 1 }))} />
          </div>
          <div className="space-y-1">
            <Label>Período final</Label>
            <Input type="date" value={filtros.periodoFim ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, periodoFim: event.target.value, pagina: 1 }))} />
          </div>
          <div className="space-y-1">
            <Label>Campanha</Label>
            <Select value={filtros.campanhaId ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, campanhaId: event.target.value, pagina: 1 }))}>
              <option value="">Todas</option>
              {campanhas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Forma de pagamento</Label>
            <Select value={filtros.formaPagamento ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, formaPagamento: event.target.value, pagina: 1 }))}>
              <option value="">Todas</option>
              {formaPagamentoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Situação</Label>
            <Select value={filtros.situacao ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, situacao: event.target.value, pagina: 1 }))}>
              <option value="">Todas</option>
              {situacaoDoacaoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={limparFiltros}>Limpar filtros</Button>
          <Button variant="ghost" onClick={() => void exportarRelatorio("excel")}>Aplicar e exportar</Button>
        </div>
      </SecaoCard>
    );
  }

  function renderDashboard() {
    const indicadores = dashboardQuery.data?.indicadores;
    const graficos = dashboardQuery.data?.graficos;
    return (
      <div className="space-y-3">
        {renderFiltros()}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <IndicadorCard titulo="Total arrecadado no dia" valor={formatarMoeda(indicadores?.totalArrecadadoDia)} />
          <IndicadorCard titulo="Total arrecadado no mês" valor={formatarMoeda(indicadores?.totalArrecadadoMes)} />
          <IndicadorCard titulo="Total arrecadado no ano" valor={formatarMoeda(indicadores?.totalArrecadadoAno)} />
          <IndicadorCard titulo="Quantidade de doações" valor={formatarNumero(indicadores?.quantidadeDoacoesRecebidas)} />
          <IndicadorCard titulo="Ticket médio" valor={formatarMoeda(indicadores?.ticketMedio)} />
          <IndicadorCard titulo="Doadores ativos" valor={formatarNumero(indicadores?.quantidadeDoadoresAtivos)} />
          <IndicadorCard titulo="Campanhas ativas" valor={formatarNumero(indicadores?.quantidadeCampanhasAtivas)} />
          <IndicadorCard titulo="Campanha destaque" valor={indicadores?.campanhaMaiorArrecadacao || "—"} />
          <IndicadorCard titulo="Doações pendentes" valor={formatarNumero(indicadores?.doacoesPendentes)} />
          <IndicadorCard titulo="Doações confirmadas" valor={formatarNumero(indicadores?.doacoesConfirmadas)} />
          <IndicadorCard titulo="Doações canceladas" valor={formatarNumero(indicadores?.doacoesCanceladas)} />
          <IndicadorCard titulo="Recorrências ativas" valor={formatarNumero(indicadores?.recorrenciasAtivas)} />
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <SecaoCard titulo="Arrecadação por mês">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graficos?.arrecadacaoPorMes ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={tooltipMoedaFormatter} />
                  <Bar dataKey="valor" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SecaoCard>
          <SecaoCard titulo="Arrecadação por forma de pagamento">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={graficos?.arrecadacaoPorFormaPagamento ?? []} dataKey="valor" nameKey="label" outerRadius={96}>
                    {(graficos?.arrecadacaoPorFormaPagamento ?? []).map((item, index) => <Cell key={`${item.label}-${index}`} fill={coresGraficos[index % coresGraficos.length]} />)}
                  </Pie>
                  <Tooltip formatter={tooltipMoedaFormatter} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SecaoCard>
          <SecaoCard titulo="Meta x arrecadado por campanha">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graficos?.metaPorCampanha ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={tooltipMoedaFormatter} />
                  <Legend />
                  <Bar dataKey="meta" fill="#cbd5e1" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="arrecadado" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SecaoCard>
          <SecaoCard titulo="Evolução de novos doadores">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graficos?.evolucaoNovosDoadores ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={tooltipNumeroFormatter} />
                  <Line type="monotone" dataKey="quantidade" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SecaoCard>
        </div>
      </div>
    );
  }

  function renderPortal() {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <IndicadorCard titulo="Portal ativo" valor={configForm.portalDoadorHabilitado ? "Sim" : "Não"} />
          <IndicadorCard titulo="Campanhas públicas" valor={configForm.campanhasPublicasHabilitadas ? "Ativas" : "Desativadas"} />
          <IndicadorCard titulo="Doações recorrentes" valor={configForm.doacoesRecorrentesHabilitadas ? "Permitidas" : "Desativadas"} />
          <IndicadorCard titulo="Comprovantes automáticos" valor={configForm.envioAutomaticoComprovantes ? "Ativos" : "Inativos"} />
        </div>
        <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
          <SecaoCard titulo="Portal do doador" descricao="Acesso seguro, histórico, comprovantes e nova doação.">
            <div className="space-y-3 rounded-xl bg-[linear-gradient(135deg,#0f766e_0%,#2563eb_100%)] p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">Experiência do doador</p>
              <h3 className="text-2xl font-semibold tracking-tight">Painel acolhedor, seguro e pronto para conversão</h3>
              <p className="text-sm text-white/80">O portal permite login do doador, consulta de histórico, download de comprovantes, nova doação e gestão de recorrências sem depender da área administrativa.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => window.open("/portal-doador", "_blank", "noopener,noreferrer")}>
                  <Link2 className="mr-1.5 h-4 w-4" />
                  Abrir portal
                </Button>
              </div>
            </div>
          </SecaoCard>
          <SecaoCard titulo="Campanhas preparadas para o portal" descricao="Campanhas ativas com links e visibilidade pública.">
            <div className="space-y-2">
              {campanhas.filter((item) => item.visivelAoPublico || item.destaqueNoPortal).length ? campanhas.filter((item) => item.visivelAoPublico || item.destaqueNoPortal).map((item) => (
                <div key={item.id} className="rounded-lg border border-[var(--g3-border)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.nome}</p>
                      <p className="text-xs text-[var(--g3-muted)]">{item.descricaoCurta || item.objetivo || "Sem descrição curta."}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClasseStatus(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(4, item.percentualAtingido || 0))}%`, background: item.corDestaque || "#0f766e" }} /></div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--g3-muted)]">
                    <span>{formatarMoeda(item.valorArrecadado)} arrecadados</span>
                    {item.urlPublica ? <><span>•</span><button className="text-[var(--g3-active)] underline" type="button" onClick={() => void copiarTexto(item.urlPublica, "Link público copiado")}>Copiar link</button></> : null}
                  </div>
                </div>
              )) : <p className="text-sm text-[var(--g3-muted)]">Nenhuma campanha está marcada para o portal no momento.</p>}
            </div>
          </SecaoCard>
        </div>
      </div>
    );
  }

  function renderComprovantes() {
    return (
      <div className="space-y-3">
        {renderFiltros()}
        <SecaoCard titulo="Comprovantes automáticos" descricao="Documentos em PDF com histórico e reenvio por e-mail.">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                <tr><th className="px-3 py-2 text-left">Comprovante</th><th className="px-3 py-2 text-left">Doador</th><th className="px-3 py-2 text-left">Doação</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {comprovantes.length ? comprovantes.map((item: CaptacaoComprovante) => (
                  <tr key={item.id} className="border-t border-[var(--g3-border)]">
                    <td className="px-3 py-2"><div className="font-medium">{item.numeroComprovante}</div><div className="text-xs text-[var(--g3-muted)]">{item.codigoValidacao}</div></td>
                    <td className="px-3 py-2">{item.doadorNome || "—"}</td>
                    <td className="px-3 py-2">{item.numeroDoacao || "—"}</td>
                    <td className="px-3 py-2">{formatarMoeda(item.valorLiquido)}</td>
                    <td className="px-3 py-2">{formatarDataHora(item.dataHora)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => void abrirArquivoAutenticado(item.arquivoCaminho, item.numeroComprovante)}><Eye className="mr-1.5 h-4 w-4" />Visualizar</Button>
                        <Button size="sm" variant="outline" onClick={() => void imprimirArquivoAutenticado(item.arquivoCaminho, item.numeroComprovante)}><Printer className="mr-1.5 h-4 w-4" />Imprimir</Button>
                        <Button size="sm" variant="outline" disabled={reenviarComprovanteMutation.isPending || !item.doacaoId} onClick={() => item.doacaoId ? void reenviarComprovanteMutation.mutateAsync(item.doacaoId).then(() => abrirMensagem("sucesso", "Comprovante reenviado", "O comprovante foi reenviado por e-mail.")) : undefined}><MailPlus className="mr-1.5 h-4 w-4" />Reenviar</Button>
                      </div>
                    </td>
                  </tr>
                )) : <TabelaVazia texto="Nenhum comprovante emitido." colSpan={6} />}
              </tbody>
            </table>
          </div>
        </SecaoCard>
      </div>
    );
  }

  function renderRelatorios() {
    return (
      <div className="space-y-3">
        {renderFiltros()}
        <SecaoCard titulo="Relatórios e exportações" descricao="PDF e Excel no padrão do G3N, com filtros aplicados.">
          <div className="grid gap-2">
            {["Doações por período", "Doações por campanha", "Doações por forma de pagamento", "Ranking de doadores", "Doadores recorrentes", "Relatório gerencial de captação", "Meta x realizado por campanha", "Comprovantes emitidos", "Inadimplência", "Consolidado por unidade"].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] px-3 py-3">
                <div>
                  <p className="text-sm font-medium">{item}</p>
                  <p className="text-xs text-[var(--g3-muted)]">Usa os filtros do topo e identifica data/hora de emissão.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void exportarRelatorio("excel")}><FileSpreadsheet className="mr-1.5 h-4 w-4" />Excel</Button>
                  <Button size="sm" variant="outline" onClick={() => void exportarRelatorio("pdf")}><FileText className="mr-1.5 h-4 w-4" />PDF</Button>
                </div>
              </div>
            ))}
          </div>
        </SecaoCard>
      </div>
    );
  }

  function renderPermissoes() {
    return (
      <div className="space-y-3">
        <SecaoCard titulo="Permissões detalhadas do módulo" descricao="Controle granular por perfil para dashboard, doadores, doações, campanhas, comprovantes, configurações e relatórios.">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {permissaoCaptacaoDetalhada.map((item) => (
              <div key={item} className="rounded-lg border border-[var(--g3-border)] px-3 py-3">
                <p className="text-sm font-semibold">{item}</p>
                <p className="mt-1 text-xs text-[var(--g3-muted)]">{permissoes.includes(item) || isAdmin ? "Disponível no seu perfil atual." : "Ainda não concedida ao seu perfil atual."}</p>
              </div>
            ))}
          </div>
        </SecaoCard>
        <SecaoCard titulo="Auditoria do módulo" descricao="Resumo dos últimos eventos para facilitar revisão e governança.">
          <div className="space-y-2">
            {logs.length ? logs.slice(0, 10).map((item: CaptacaoLogItem) => (
              <div key={item.id} className="rounded-lg border border-[var(--g3-border)] px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.acao}</p>
                  <span className="text-xs text-[var(--g3-muted)]">{formatarDataHora(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--g3-foreground)]">{item.descricao}</p>
                <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.entidadeTipo} • {item.createdBy || "Sistema"}</p>
              </div>
            )) : <p className="text-sm text-[var(--g3-muted)]">Nenhum evento auditável disponível.</p>}
          </div>
        </SecaoCard>
      </div>
    );
  }

  function renderDoadores() {
    return (
      <div className="space-y-3">
        {renderFiltros()}
        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <SecaoCard titulo="Lista de doadores" descricao="Selecione um doador com 1 clique para editar o cadastro.">
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Doador</th>
                    <th className="px-3 py-2 text-left">Documento</th>
                    <th className="px-3 py-2 text-left">Contato</th>
                    <th className="px-3 py-2 text-left">Total doado</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {doadores.length ? doadores.map((item) => (
                    <tr key={item.id} className={`cursor-pointer border-t border-[var(--g3-border)] ${doadorForm.id === item.id ? "bg-[var(--g3-primary-soft)]/55" : "bg-[var(--g3-card)]"}`} onClick={() => editarDoador(item)}>
                      <td className="px-3 py-2"><div className="font-medium">{item.nome}</div><div className="text-xs text-[var(--g3-muted)]">{item.tipoDoador.replaceAll("_", " ")}</div></td>
                      <td className="px-3 py-2"><DocumentLabel item={item} /></td>
                      <td className="px-3 py-2"><div>{item.emailPrincipal || "—"}</div><div className="text-xs text-[var(--g3-muted)]">{formatarTelefone(item.whatsapp || item.telefone) || "—"}</div></td>
                      <td className="px-3 py-2">{formatarMoeda(item.totalDoado)}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClasseStatus(item.status)}`}>{item.status}</span></td>
                    </tr>
                  )) : <TabelaVazia texto="Nenhum doador encontrado." colSpan={5} />}
                </tbody>
              </table>
            </div>
          </SecaoCard>
          <SecaoCard titulo="Cadastro de doador" descricao="Dados principais, contato, relacionamento e LGPD.">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1"><Label>Tipo de doador</Label><Select value={doadorForm.tipoDoador} onChange={(event) => setDoadorForm((atual) => ({ ...atual, tipoDoador: event.target.value }))}>{tipoDoadorOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
              <div className="space-y-1"><Label>Categoria</Label><Select value={doadorForm.categoriaDoador} onChange={(event) => setDoadorForm((atual) => ({ ...atual, categoriaDoador: event.target.value }))}>{categoriaDoadorOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
              <div className="space-y-1 md:col-span-2"><Label>Nome / razão social</Label><Input value={doadorForm.nome} onChange={(event) => setDoadorForm((atual) => ({ ...atual, nome: event.target.value }))} onBlur={validarDoador} /><CampoErro texto={errosDoador.nome} /></div>
              <div className="space-y-1"><Label>Nome fantasia</Label><Input value={doadorForm.nomeFantasia} onChange={(event) => setDoadorForm((atual) => ({ ...atual, nomeFantasia: event.target.value }))} /></div>
              <div className="space-y-1"><Label>CPF / CNPJ</Label><Input value={doadorForm.cpfCnpj} onChange={(event) => setDoadorForm((atual) => ({ ...atual, cpfCnpj: event.target.value }))} onBlur={validarDoador} /><CampoErro texto={errosDoador.cpfCnpj} /></div>
              <div className="space-y-1"><Label>E-mail principal</Label><Input value={doadorForm.emailPrincipal} onChange={(event) => setDoadorForm((atual) => ({ ...atual, emailPrincipal: normalizarEmail(event.target.value) }))} onBlur={validarDoador} /><CampoErro texto={errosDoador.emailPrincipal} /></div>
              <div className="space-y-1"><Label>WhatsApp</Label><Input value={mascararTelefoneInput(doadorForm.whatsapp)} onChange={(event) => setDoadorForm((atual) => ({ ...atual, whatsapp: normalizarTelefone(event.target.value) }))} /></div>
              <div className="space-y-1"><Label>Cidade</Label><Input value={doadorForm.cidade} onChange={(event) => setDoadorForm((atual) => ({ ...atual, cidade: event.target.value }))} /></div>
              <div className="space-y-1"><Label>UF</Label><Input maxLength={2} value={doadorForm.uf} onChange={(event) => setDoadorForm((atual) => ({ ...atual, uf: event.target.value.toUpperCase() }))} /></div>
              <div className="space-y-1"><Label>CEP</Label><Input value={formatarCep(doadorForm.cep)} onChange={(event) => setDoadorForm((atual) => ({ ...atual, cep: normalizarCep(event.target.value) }))} onBlur={validarDoador} /><CampoErro texto={errosDoador.cep} /></div>
              <div className="space-y-1"><Label>Responsável pelo relacionamento</Label><Input value={doadorForm.responsavelRelacionamento} onChange={(event) => setDoadorForm((atual) => ({ ...atual, responsavelRelacionamento: event.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Observações internas</Label><Textarea value={doadorForm.observacoesInternas} onChange={(event) => setDoadorForm((atual) => ({ ...atual, observacoesInternas: event.target.value }))} rows={3} /></div>
              <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2"><Checkbox checked={doadorForm.aceitouLgpd} onChange={(event) => { const checked = event.currentTarget.checked; setDoadorForm((atual) => ({ ...atual, aceitouLgpd: checked })); }} />Aceitou LGPD</label>
              <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2"><Checkbox checked={doadorForm.portalAtivo} onChange={(event) => { const checked = event.currentTarget.checked; setDoadorForm((atual) => ({ ...atual, portalAtivo: checked })); }} />Portal doador ativo</label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <IndicadorCard titulo="Total doado" valor={formatarMoeda(doadorSelecionado?.totalDoado)} />
              <IndicadorCard titulo="Doações" valor={formatarNumero(doadorSelecionado?.quantidadeDoacoes)} />
              <IndicadorCard titulo="Ticket médio" valor={formatarMoeda(doadorSelecionado?.ticketMedio)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setDoadorAbaInterna("historico")}>Histórico ({historicoDoacoesDoador.length})</Button>
              <Button variant="outline" onClick={() => setDoadorAbaInterna("comprovantes")}>Comprovantes ({comprovantesDoador.length})</Button>
              <Button variant="outline" onClick={() => setDoadorAbaInterna("campanhas")}>Campanhas ({campanhasDoador.length})</Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[var(--g3-border)] px-3 py-2 text-sm text-[var(--g3-muted)]"><Upload className="h-4 w-4" />Anexar arquivo<input className="hidden" type="file" onChange={(event) => void carregarAnexoDoador(event.target.files?.[0])} /></label>
            </div>
            {doadorAbaInterna === "historico" ? <div className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Número</th><th className="px-3 py-2 text-left">Campanha</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-left">Situação</th></tr></thead><tbody>{historicoDoacoesDoador.length ? historicoDoacoesDoador.map((item) => <tr key={item.id} className="border-t border-[var(--g3-border)]"><td className="px-3 py-2">{item.numeroDoacao}</td><td className="px-3 py-2">{item.campanhaNome || "—"}</td><td className="px-3 py-2">{formatarMoeda(item.valorLiquido || item.valor)}</td><td className="px-3 py-2">{item.situacao}</td></tr>) : <TabelaVazia texto="Nenhuma doação vinculada ao doador selecionado." colSpan={4} />}</tbody></table></div> : null}
            {doadorAbaInterna === "comprovantes" ? <div className="space-y-2">{comprovantesDoador.length ? comprovantesDoador.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--g3-border)] px-3 py-2"><span className="text-sm">{item.numeroComprovante}</span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void abrirArquivoAutenticado(item.arquivoCaminho, item.numeroComprovante)}><Eye className="mr-1.5 h-4 w-4" />Visualizar</Button><Button size="sm" variant="outline" onClick={() => void imprimirArquivoAutenticado(item.arquivoCaminho, item.numeroComprovante)}><Printer className="mr-1.5 h-4 w-4" />Imprimir</Button></div></div>) : <p className="text-sm text-[var(--g3-muted)]">Nenhum comprovante disponível.</p>}</div> : null}
            {doadorAbaInterna === "campanhas" ? <div className="space-y-2">{campanhasDoador.length ? campanhasDoador.map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] px-3 py-2 text-sm">{item.nome}</div>) : <p className="text-sm text-[var(--g3-muted)]">Nenhuma campanha apoiada ainda.</p>}</div> : null}
            {doadorAbaInterna === "anexos" ? <div className="space-y-2">{anexosDoador.length ? anexosDoador.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--g3-border)] px-3 py-2"><span className="text-sm">{item.nomeOriginal}</span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void abrirArquivoAutenticado(item.caminhoArquivo, item.nomeOriginal)}>Visualizar</Button><Button size="sm" variant="danger" onClick={() => setConfirmacao({ titulo: "Excluir anexo", texto: `Deseja excluir ${item.nomeOriginal}?`, acao: async () => { await arquivosService.excluir(item.id); abrirMensagem("sucesso", "Anexo excluído", "O arquivo foi removido."); } })}>Excluir</Button></div></div>) : <p className="text-sm text-[var(--g3-muted)]">Nenhum anexo enviado.</p>}</div> : null}
          </SecaoCard>
        </div>
      </div>
    );
  }

  function renderCampanhas() {
    return (
      <div className="space-y-3">
        {renderFiltros()}
        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <SecaoCard titulo="Campanhas de arrecadação" descricao="Metas, progresso e visibilidade pública.">
            <div className="grid gap-3 md:grid-cols-2">
              {campanhas.length ? campanhas.map((item) => <div key={item.id} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold">{item.nome}</h3><p className="text-xs text-[var(--g3-muted)]">{item.tipo.replaceAll("_", " ")} • {item.status}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClasseStatus(item.status)}`}>{item.status}</span></div><p className="mt-2 text-sm text-[var(--g3-muted)]">{item.descricaoCurta || item.objetivo || "Campanha sem descrição resumida."}</p><div className="mt-3 space-y-1"><div className="flex items-center justify-between text-xs text-[var(--g3-muted)]"><span>Meta</span><span>{formatarMoeda(item.metaFinanceira)}</span></div><div className="h-3 rounded-full bg-slate-200"><div className="h-3 rounded-full" style={{ width: `${Math.min(100, Math.max(6, item.percentualAtingido || 0))}%`, background: item.corDestaque || "#0f766e" }} /></div><div className="flex items-center justify-between text-xs text-[var(--g3-muted)]"><span>{formatarMoeda(item.valorArrecadado)} arrecadados</span><span>{item.percentualAtingido.toFixed(1)}%</span></div></div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => editarCampanha(item)}>Editar</Button><Button size="sm" variant="outline" onClick={() => void copiarTexto(item.urlPublica, "Link copiado")}><Link2 className="mr-1.5 h-4 w-4" />Copiar link</Button><Button size="sm" variant="outline" onClick={() => setConfirmacao({ titulo: "Alterar status da campanha", texto: `Deseja alterar o status de ${item.nome}?`, acao: async () => { const proximoStatus = item.status === "ativa" ? "pausada" : item.status === "pausada" ? "ativa" : "encerrada"; await alterarStatusCampanhaMutation.mutateAsync({ id: item.id, status: proximoStatus }); abrirMensagem("sucesso", "Status atualizado", "O status da campanha foi atualizado."); } })}>Alternar status</Button></div></div>) : <p className="text-sm text-[var(--g3-muted)]">Nenhuma campanha cadastrada.</p>}
            </div>
          </SecaoCard>
          <SecaoCard titulo="Cadastro de campanha" descricao="Meta financeira, identidade visual e mensagem.">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2"><Label>Nome da campanha</Label><Input value={campanhaForm.nome} onChange={(event) => setCampanhaForm((atual) => ({ ...atual, nome: event.target.value }))} onBlur={validarCampanha} /><CampoErro texto={errosCampanha.nome} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Descrição curta</Label><Input value={campanhaForm.descricaoCurta} onChange={(event) => setCampanhaForm((atual) => ({ ...atual, descricaoCurta: event.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Descrição completa</Label><Textarea value={campanhaForm.descricaoCompleta} onChange={(event) => setCampanhaForm((atual) => ({ ...atual, descricaoCompleta: event.target.value }))} rows={4} /></div>
              <div className="space-y-1"><Label>Meta financeira</Label><Input value={campanhaForm.metaFinanceira} onChange={(event) => setCampanhaForm((atual) => ({ ...atual, metaFinanceira: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Tipo</Label><Select value={campanhaForm.tipo} onChange={(event) => setCampanhaForm((atual) => ({ ...atual, tipo: event.target.value }))}>{tipoCampanhaOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
              <div className="space-y-1"><Label>Data inicial</Label><Input type="date" value={campanhaForm.dataInicial} onChange={(event) => setCampanhaForm((atual) => ({ ...atual, dataInicial: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Data final</Label><Input type="date" value={campanhaForm.dataFinal} onChange={(event) => setCampanhaForm((atual) => ({ ...atual, dataFinal: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Status</Label><Select value={campanhaForm.status} onChange={(event) => setCampanhaForm((atual) => ({ ...atual, status: event.target.value }))}>{statusCampanhaOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
              <div className="space-y-1"><Label>Cor de destaque</Label><Input type="color" value={campanhaForm.corDestaque} onChange={(event) => setCampanhaForm((atual) => ({ ...atual, corDestaque: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Responsável</Label><Input value={campanhaForm.responsavel} onChange={(event) => setCampanhaForm((atual) => ({ ...atual, responsavel: event.target.value }))} /></div>
              <div className="space-y-1"><Label>URL pública</Label><Input value={campanhaForm.urlPublica} onChange={(event) => setCampanhaForm((atual) => ({ ...atual, urlPublica: event.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Mensagem de agradecimento</Label><Textarea value={campanhaForm.mensagemAgradecimento} onChange={(event) => setCampanhaForm((atual) => ({ ...atual, mensagemAgradecimento: event.target.value }))} rows={3} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Banner da campanha</Label><label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[var(--g3-border)] px-4 py-4 text-sm text-[var(--g3-muted)]"><Upload className="h-4 w-4" />Enviar banner<input className="hidden" type="file" accept="image/*" onChange={(event) => void carregarBannerCampanha(event.target.files?.[0])} /></label></div>
              <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2"><Checkbox checked={campanhaForm.destaqueNoPortal} onChange={(event) => { const checked = event.currentTarget.checked; setCampanhaForm((atual) => ({ ...atual, destaqueNoPortal: checked })); }} />Destaque no portal</label>
              <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2"><Checkbox checked={campanhaForm.visivelAoPublico} onChange={(event) => { const checked = event.currentTarget.checked; setCampanhaForm((atual) => ({ ...atual, visivelAoPublico: checked })); }} />Visível ao público</label>
            </div>
          </SecaoCard>
        </div>
      </div>
    );
  }

  function renderDoacoes() {
    return (
      <div className="space-y-3">
        {renderFiltros()}
        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <SecaoCard titulo="Gestão de doações" descricao="Cobrança, confirmação, comprovante e vínculo com campanhas.">
            <div className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Número</th><th className="px-3 py-2 text-left">Doador</th><th className="px-3 py-2 text-left">Campanha</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-left">Pagamento</th><th className="px-3 py-2 text-left">Situação</th></tr></thead><tbody>{doacoes.length ? doacoes.map((item) => <tr key={item.id} className={`cursor-pointer border-t border-[var(--g3-border)] ${doacaoForm.id === item.id ? "bg-[var(--g3-primary-soft)]/55" : "bg-[var(--g3-card)]"}`} onClick={() => editarDoacao(item)}><td className="px-3 py-2">{item.numeroDoacao}</td><td className="px-3 py-2">{item.doadorNome || "—"}</td><td className="px-3 py-2">{item.campanhaNome || "—"}</td><td className="px-3 py-2">{formatarMoeda(item.valorLiquido || item.valor)}</td><td className="px-3 py-2">{item.formaPagamento.toUpperCase()}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClasseStatus(item.situacao)}`}>{item.situacao}</span></td></tr>) : <TabelaVazia texto="Nenhuma doação encontrada." colSpan={6} />}</tbody></table></div>
            <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!doacaoForm.id} onClick={() => doacaoForm.id ? void gerarCobrancaMutation.mutateAsync(doacaoForm.id).then(() => abrirMensagem("sucesso", "Cobrança gerada", "A cobrança foi gerada com sucesso.")) : undefined}>Gerar cobrança</Button><Button variant="outline" disabled={!doacaoForm.id} onClick={() => doacaoForm.id ? void confirmarDoacaoMutation.mutateAsync(doacaoForm.id).then(() => abrirMensagem("sucesso", "Doação confirmada", "O recebimento foi confirmado.")) : undefined}>Confirmar pagamento</Button><Button variant="outline" disabled={!doacaoForm.id} onClick={() => doacaoForm.id ? setConfirmacao({ titulo: "Cancelar doação", texto: `Deseja cancelar a doação ${doacaoForm.id}?`, acao: async () => { await cancelarDoacaoMutation.mutateAsync({ id: doacaoForm.id! }); abrirMensagem("sucesso", "Doação cancelada", "A doação foi cancelada."); } }) : undefined}>Cancelar</Button><Button variant="outline" disabled={!doacaoForm.id} onClick={() => doacaoForm.id ? setConfirmacao({ titulo: "Estornar doação", texto: `Deseja registrar estorno para ${doacaoForm.id}?`, acao: async () => { await estornarDoacaoMutation.mutateAsync({ id: doacaoForm.id! }); abrirMensagem("sucesso", "Doação estornada", "O estorno foi registrado."); } }) : undefined}>Estornar</Button><Button variant="outline" disabled={!doacaoForm.id} onClick={() => doacaoForm.id ? void emitirComprovanteMutation.mutateAsync(doacaoForm.id).then(() => abrirMensagem("sucesso", "Comprovante emitido", "O comprovante foi gerado com sucesso.")) : undefined}>Emitir comprovante</Button></div>
          </SecaoCard>
          <SecaoCard titulo="Cadastro e cobrança" descricao="Doações avulsas e recorrentes.">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1"><Label>Doador</Label><Select value={doacaoForm.doadorId} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, doadorId: event.target.value }))}><option value="">Não vincular</option>{doadores.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select></div>
              <div className="space-y-1"><Label>Campanha</Label><Select value={doacaoForm.campanhaId} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, campanhaId: event.target.value }))}><option value="">Não vincular</option>{campanhas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select></div>
              <div className="space-y-1"><Label>Valor</Label><Input value={doacaoForm.valor} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, valor: event.target.value }))} onBlur={validarDoacao} /><CampoErro texto={errosDoacao.valor} /></div>
              <div className="space-y-1"><Label>Forma de pagamento</Label><Select value={doacaoForm.formaPagamento} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, formaPagamento: event.target.value }))}>{formaPagamentoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
              <div className="space-y-1"><Label>Tipo de doação</Label><Select value={doacaoForm.tipoDoacao} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, tipoDoacao: event.target.value }))}>{tipoDoacaoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
              <div className="space-y-1"><Label>Situação</Label><Select value={doacaoForm.situacao} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, situacao: event.target.value }))}>{situacaoDoacaoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
              <div className="space-y-1"><Label>Origem</Label><Select value={doacaoForm.origem} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, origem: event.target.value }))}>{origemDoacaoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
              <div className="space-y-1"><Label>Data de vencimento</Label><Input type="date" value={doacaoForm.dataVencimento} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, dataVencimento: event.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Link de pagamento</Label><Input value={doacaoForm.linkPagamento} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, linkPagamento: event.target.value }))} /></div>
              <div className="space-y-1"><Label>TXID</Label><Input value={doacaoForm.txid} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, txid: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Identificador externo</Label><Input value={doacaoForm.identificadorExterno} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, identificadorExterno: event.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Observações internas</Label><Textarea value={doacaoForm.observacoesInternas} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, observacoesInternas: event.target.value }))} rows={3} /></div>
              <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2 md:col-span-2"><Checkbox checked={doacaoForm.recorrenciaAtiva} onChange={(event) => { const checked = event.currentTarget.checked; setDoacaoForm((atual) => ({ ...atual, recorrenciaAtiva: checked })); }} />Ativar doação recorrente</label>
              {doacaoForm.recorrenciaAtiva ? <><div className="space-y-1"><Label>Valor recorrente</Label><Input value={doacaoForm.recorrenciaValor} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, recorrenciaValor: event.target.value }))} /></div><div className="space-y-1"><Label>Periodicidade</Label><Select value={doacaoForm.recorrenciaPeriodicidade} onChange={(event) => setDoacaoForm((atual) => ({ ...atual, recorrenciaPeriodicidade: event.target.value }))}>{periodicidadeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div></> : null}
            </div>
          </SecaoCard>
        </div>
      </div>
    );
  }

  function renderConteudo() {
    switch (abaAtiva) {
      case "dashboard":
        return renderDashboard();
      case "doadores":
        return renderDoadores();
      case "doacoes":
        return renderDoacoes();
      case "campanhas":
        return renderCampanhas();
      case "portal":
        return renderPortal();
      case "comprovantes":
        return renderComprovantes();
      case "configuracoes":
        return renderConfiguracoes();
      case "relatorios":
        return renderRelatorios();
      case "permissoes":
        return renderPermissoes();
      default:
        return null;
    }
  }

  function renderConfiguracoes() {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 xl:grid-cols-2">
          <SecaoCard titulo="Geral">
            <div className="grid gap-2">
              <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2"><Checkbox checked={Boolean(configForm.moduloHabilitado)} onChange={(event) => { const checked = event.currentTarget.checked; setConfigForm((atual) => ({ ...atual, moduloHabilitado: checked })); }} />Habilitar módulo</label>
              <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2"><Checkbox checked={Boolean(configForm.portalDoadorHabilitado)} onChange={(event) => { const checked = event.currentTarget.checked; setConfigForm((atual) => ({ ...atual, portalDoadorHabilitado: checked })); }} />Habilitar portal doador</label>
              <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2"><Checkbox checked={Boolean(configForm.campanhasPublicasHabilitadas)} onChange={(event) => { const checked = event.currentTarget.checked; setConfigForm((atual) => ({ ...atual, campanhasPublicasHabilitadas: checked })); }} />Habilitar campanhas públicas</label>
              <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2"><Checkbox checked={Boolean(configForm.doacoesRecorrentesHabilitadas)} onChange={(event) => { const checked = event.currentTarget.checked; setConfigForm((atual) => ({ ...atual, doacoesRecorrentesHabilitadas: checked })); }} />Habilitar doações recorrentes</label>
              <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2"><Checkbox checked={Boolean(configForm.envioAutomaticoComprovantes)} onChange={(event) => { const checked = event.currentTarget.checked; setConfigForm((atual) => ({ ...atual, envioAutomaticoComprovantes: checked })); }} />Envio automático de comprovantes</label>
            </div>
          </SecaoCard>
          <SecaoCard titulo="PIX">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1"><Label>Chave PIX</Label><Input value={configForm.pixChave ?? ""} onChange={(event) => setConfigForm((atual) => ({ ...atual, pixChave: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Recebedor</Label><Input value={configForm.pixRecebedor ?? ""} onChange={(event) => setConfigForm((atual) => ({ ...atual, pixRecebedor: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Ambiente</Label><Select value={configForm.pixAmbiente ?? "sandbox"} onChange={(event) => setConfigForm((atual) => ({ ...atual, pixAmbiente: event.target.value }))}><option value="sandbox">Sandbox</option><option value="producao">Produção</option></Select></div>
              <div className="space-y-1"><Label>Provider</Label><Input value={configForm.pixProvider ?? ""} onChange={(event) => setConfigForm((atual) => ({ ...atual, pixProvider: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Expiração em minutos</Label><Input value={String(configForm.pixExpiracaoMinutos ?? 60)} onChange={(event) => setConfigForm((atual) => ({ ...atual, pixExpiracaoMinutos: Number(event.target.value || 0) }))} /></div>
              <div className="space-y-1"><Label>Webhook</Label><Input value={configForm.pixWebhookUrl ?? ""} onChange={(event) => setConfigForm((atual) => ({ ...atual, pixWebhookUrl: event.target.value }))} /></div>
            </div>
          </SecaoCard>
          <SecaoCard titulo="Cartão">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1"><Label>Provider</Label><Input value={configForm.cartaoProvider ?? ""} onChange={(event) => setConfigForm((atual) => ({ ...atual, cartaoProvider: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Ambiente</Label><Select value={configForm.cartaoAmbiente ?? "sandbox"} onChange={(event) => setConfigForm((atual) => ({ ...atual, cartaoAmbiente: event.target.value }))}><option value="sandbox">Sandbox</option><option value="producao">Produção</option></Select></div>
              <div className="space-y-1"><Label>Chave pública</Label><Input value={configForm.cartaoChavePublica ?? ""} onChange={(event) => setConfigForm((atual) => ({ ...atual, cartaoChavePublica: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Ref. chave privada</Label><Input value={configForm.cartaoChavePrivadaRef ?? ""} onChange={(event) => setConfigForm((atual) => ({ ...atual, cartaoChavePrivadaRef: event.target.value }))} /></div>
            </div>
          </SecaoCard>
          <SecaoCard titulo="Boleto e comunicação">
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1"><Label>Provider / banco</Label><Input value={configForm.boletoProvider ?? ""} onChange={(event) => setConfigForm((atual) => ({ ...atual, boletoProvider: event.target.value }))} /></div>
                <div className="space-y-1"><Label>Prazo padrão de vencimento</Label><Input value={String(configForm.boletoPrazoVencimentoDias ?? 5)} onChange={(event) => setConfigForm((atual) => ({ ...atual, boletoPrazoVencimentoDias: Number(event.target.value || 0) }))} /></div>
              </div>
              <div className="space-y-1"><Label>Mensagem de agradecimento</Label><Textarea value={configForm.mensagemAgradecimento ?? ""} onChange={(event) => setConfigForm((atual) => ({ ...atual, mensagemAgradecimento: event.target.value }))} rows={3} /></div>
              <div className="space-y-1"><Label>Modelo do comprovante</Label><Textarea value={configForm.modeloComprovante ?? ""} onChange={(event) => setConfigForm((atual) => ({ ...atual, modeloComprovante: event.target.value }))} rows={3} /></div>
            </div>
          </SecaoCard>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => navigate(captacaoTabPaths[tabId as CaptacaoTabId])}
        actions={actions}
        sectionLabel="Captação de recursos"
        pageTitle="Módulo 3"
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge="premium"
      >
        {renderConteudo()}
      </AdminPageLayout>
      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
      <PopupConfirmacao
        aberto={Boolean(confirmacao)}
        titulo={confirmacao?.titulo ?? ""}
        texto={confirmacao?.texto ?? ""}
        processando={confirmando}
        onCancel={() => !confirmando && setConfirmacao(null)}
        onConfirm={() => void executarConfirmacao()}
      />
    </>
  );
}
