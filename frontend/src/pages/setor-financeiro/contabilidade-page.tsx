import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Banknote,
  BookOpenText,
  Building2,
  FileText,
  FolderTree,
  HandCoins,
  History,
  Landmark,
  List,
  Paperclip,
  PiggyBank,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Search,
  Trash2,
  Undo2,
  Wallet,
  X
} from 'lucide-react';
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
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { AdminPageLayout, type AdminAction, type AdminTab } from '@/components/admin/admin-page-layout';
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from '@/components/admin/admin-popups';
import { ResponsiveChart } from '@/components/charts/responsive-chart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { resolverUrlArquivo } from '@/lib/arquivos';
import { imprimirConteudoAtual } from '@/lib/report-utils';
import {
  useArquivosLancamentoContabil,
  useAtualizarSituacaoConciliacao,
  useAtualizarSituacaoLancamento,
  useAtualizarStatusEmendaContabil,
  useCategoriasFinanceiras,
  useCentrosCustoContabeis,
  useComprasIntegradasContabilidade,
  useConciliacoesContabeis,
  useContasBancarias,
  useCriarConciliacaoContabil,
  useCriarEmendaContabil,
  useCriarTransferenciaContabil,
  useEmendasContabeis,
  useEstornarLancamento,
  useEstornarTransferenciaContabil,
  useExcluirArquivoLancamentoContabil,
  useGerarObrigacaoFinanceiraCompra,
  useHistoricoContabil,
  useLancamentosContabeis,
  useMovimentacoesContabeis,
  usePagarLancamento,
  useRemoverCategoriaFinanceira,
  useRemoverCentroCustoContabil,
  useRemoverContaBancaria,
  useRemoverLancamentoContabil,
  useRemoverMovimentacaoContabil,
  useSalvarCategoriaFinanceira,
  useSalvarCentroCustoContabil,
  useSalvarContaBancaria,
  useSalvarLancamentoContabil,
  useSalvarMovimentacaoContabil,
  useTransferenciasContabeis,
  useUploadArquivoLancamentoContabil
} from '@/features/contabilidade/use-contabilidade';
import type {
  CategoriaFinanceira,
  CategoriaFinanceiraPayload,
  CentroCusto,
  CentroCustoPayload,
  ConciliacaoFinanceira,
  ConciliacaoFinanceiraPayload,
  ContaBancaria,
  ContaBancariaPayload,
  EmendaImpositivaPayload,
  HistoricoContabilidade,
  LancamentoFinanceiro,
  LancamentoFinanceiroPayload,
  MovimentacaoFinanceira,
  MovimentacaoFinanceiraPayload,
  TransferenciaFinanceira,
  TransferenciaFinanceiraPayload
} from '@/types/contabilidade';

type AbaId =
  | 'painel'
  | 'lancamentos'
  | 'receitas'
  | 'despesas'
  | 'contasPagar'
  | 'contasReceber'
  | 'fluxoCaixa'
  | 'contas'
  | 'transferencias'
  | 'categorias'
  | 'centros'
  | 'conciliacao'
  | 'compras'
  | 'historico'
  | 'anexos'
  | 'relatorios'
  | 'impressoes'
  | 'emendas';

type ExclusaoTipo =
  | 'conta'
  | 'categoria'
  | 'centro'
  | 'lancamento'
  | 'movimentacao'
  | null;

const abas: AdminTab[] = [
  { id: 'painel', label: 'Painel financeiro', icon: List },
  { id: 'lancamentos', label: 'Lançamentos', icon: ReceiptText },
  { id: 'receitas', label: 'Receitas', icon: Banknote },
  { id: 'despesas', label: 'Despesas', icon: Wallet },
  { id: 'contasPagar', label: 'Contas a pagar', icon: HandCoins },
  { id: 'contasReceber', label: 'Contas a receber', icon: PiggyBank },
  { id: 'fluxoCaixa', label: 'Fluxo de caixa', icon: ArrowRightLeft },
  { id: 'contas', label: 'Contas bancárias e caixa', icon: Landmark },
  { id: 'transferencias', label: 'Transferências', icon: ArrowRightLeft },
  { id: 'categorias', label: 'Categorias financeiras / contábeis', icon: FolderTree },
  { id: 'centros', label: 'Centro de custo', icon: Building2 },
  { id: 'conciliacao', label: 'Conciliação bancária', icon: Search },
  { id: 'compras', label: 'Integração com compras', icon: ReceiptText },
  { id: 'historico', label: 'Histórico / auditoria', icon: History },
  { id: 'anexos', label: 'Anexos', icon: Paperclip },
  { id: 'relatorios', label: 'Relatórios', icon: FileText },
  { id: 'impressoes', label: 'Impressões', icon: Printer },
  { id: 'emendas', label: 'Emendas', icon: BookOpenText }
];

const coresGraficos = ['#0f766e', '#2563eb', '#f59e0b', '#dc2626', '#9333ea', '#0ea5e9'];
const hoje = new Date().toISOString().slice(0, 10);
const inicioMesAtual = `${hoje.slice(0, 8)}01`;
const statusEmAberto = new Set([
  'PREVISTO',
  'PENDENTE',
  'VENCIDO',
  'ATRASADO',
  'AGUARDANDO_PAGAMENTO',
  'AGUARDANDO_RECEBIMENTO',
  'RENEGOCIADO'
]);

const contaVazia: ContaBancariaPayload = {
  banco: '',
  agencia: '',
  numero: '',
  digito: '',
  nomeConta: '',
  tipo: 'CONTA_CORRENTE',
  titular: '',
  projetoVinculado: '',
  pixVinculado: false,
  tipoChavePix: '',
  chavePix: '',
  recebimentoLocal: false,
  saldoInicial: 0,
  dataSaldoInicial: hoje,
  limiteMinimoAlerta: 0,
  status: 'ATIVA',
  permiteMovimentacao: true,
  observacao: ''
};

const categoriaVazia: CategoriaFinanceiraPayload = {
  codigo: '',
  nome: '',
  tipo: 'DESPESA',
  grupo: '',
  subgrupo: '',
  aceitaLancamentoDireto: true,
  status: 'ATIVA',
  observacao: ''
};

const centroVazio: CentroCustoPayload = {
  codigo: '',
  nome: '',
  setorResponsavel: '',
  descricao: '',
  status: 'ATIVA'
};

const lancamentoVazio: LancamentoFinanceiroPayload = {
  dataLancamento: hoje,
  tipo: 'DESPESA',
  natureza: '',
  contaBancariaId: undefined,
  categoriaId: undefined,
  centroCustoId: undefined,
  setor: '',
  contraparte: '',
  documento: '',
  historico: '',
  valor: 0,
  formaPagamento: '',
  status: 'PENDENTE',
  origem: 'MANUAL',
  observacao: '',
  vencimento: hoje,
  dataBaixa: '',
  responsavel: '',
  projeto: '',
  compraId: undefined
};

const movimentacaoVazia: MovimentacaoFinanceiraPayload = {
  tipo: 'AJUSTE',
  descricao: '',
  contraparte: '',
  categoria: '',
  contaBancariaId: undefined,
  dataMovimentacao: hoje,
  valor: 0,
  origem: 'MANUAL',
  observacao: ''
};

const transferenciaVazia: TransferenciaFinanceiraPayload = {
  contaOrigemId: 0,
  contaDestinoId: 0,
  dataTransferencia: hoje,
  valor: 0,
  descricao: '',
  responsavel: '',
  observacao: ''
};

const conciliacaoVazia: ConciliacaoFinanceiraPayload = {
  contaBancariaId: 0,
  dataMovimento: hoje,
  descricaoExtrato: '',
  valorExtrato: 0,
  lancamentoFinanceiroId: undefined,
  movimentacaoFinanceiraId: undefined,
  situacao: 'PENDENTE',
  observacao: ''
};

const emendaVazia: EmendaImpositivaPayload = {
  identificacao: '',
  referenciaLegal: '',
  dataPrevista: hoje,
  valorPrevisto: 0,
  diasAlerta: 15,
  status: 'Pendente',
  observacoes: ''
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(valor?: string) {
  if (!valor) return 'Não informada';
  const partes = valor.split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor;
}

function formatarDataHora(valor?: string) {
  if (!valor) return 'Não informada';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(valor)
  );
}

function formatarStatus(valor?: string | null) {
  if (!valor) return 'Não informado';
  return valor
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizarBusca(valor?: string | null) {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function estaNoPeriodo(data: string | undefined, inicio: string, fim: string) {
  if (!data) return true;
  if (inicio && data < inicio) return false;
  if (fim && data > fim) return false;
  return true;
}

function baixarArquivo(nome: string, conteudo: string, mimeType: string) {
  const blob = new Blob([conteudo], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function serializarCsv(linhas: Array<Array<string | number | undefined>>) {
  return linhas
    .map((colunas) =>
      colunas
        .map((coluna) => `"${String(coluna ?? '').replaceAll('"', '""')}"`)
        .join(';')
    )
    .join('\n');
}

function toContaForm(item: ContaBancaria): ContaBancariaPayload {
  return {
    banco: item.banco,
    agencia: item.agencia,
    numero: item.numero,
    digito: item.digito,
    nomeConta: item.nomeConta,
    tipo: item.tipo,
    titular: item.titular,
    projetoVinculado: item.projetoVinculado,
    pixVinculado: item.pixVinculado,
    tipoChavePix: item.tipoChavePix,
    chavePix: item.chavePix,
    recebimentoLocal: item.recebimentoLocal,
    saldoInicial: item.saldoInicial,
    dataSaldoInicial: item.dataSaldoInicial,
    limiteMinimoAlerta: item.limiteMinimoAlerta,
    status: item.status,
    permiteMovimentacao: item.permiteMovimentacao,
    observacao: item.observacao
  };
}

function toCategoriaForm(item: CategoriaFinanceira): CategoriaFinanceiraPayload {
  return {
    codigo: item.codigo,
    nome: item.nome,
    tipo: item.tipo,
    grupo: item.grupo,
    subgrupo: item.subgrupo,
    categoriaPaiId: item.categoriaPaiId,
    aceitaLancamentoDireto: item.aceitaLancamentoDireto,
    status: item.status,
    observacao: item.observacao
  };
}

function toCentroForm(item: CentroCusto): CentroCustoPayload {
  return {
    codigo: item.codigo,
    nome: item.nome,
    setorResponsavel: item.setorResponsavel,
    descricao: item.descricao,
    status: item.status
  };
}

function toLancamentoForm(item: LancamentoFinanceiro): LancamentoFinanceiroPayload {
  return {
    dataLancamento: item.dataLancamento,
    tipo: item.tipo,
    natureza: item.natureza,
    contaBancariaId: item.contaBancariaId,
    categoriaId: item.categoriaId,
    centroCustoId: item.centroCustoId,
    setor: item.setor,
    contraparte: item.contraparte,
    documento: item.documento,
    historico: item.historico,
    valor: item.valor,
    formaPagamento: item.formaPagamento,
    status: item.status,
    origem: item.origem,
    observacao: item.observacao,
    vencimento: item.vencimento,
    dataBaixa: item.dataBaixa,
    responsavel: item.responsavel,
    projeto: item.projeto,
    compraId: item.compraId
  };
}

function toMovimentacaoForm(item: MovimentacaoFinanceira): MovimentacaoFinanceiraPayload {
  return {
    tipo: item.tipo,
    descricao: item.descricao,
    contraparte: item.contraparte,
    categoria: item.categoria,
    contaBancariaId: item.contaBancariaId,
    dataMovimentacao: item.dataMovimentacao,
    valor: item.valor,
    origem: item.origem,
    observacao: item.observacao
  };
}

function ResumoCard({
  titulo,
  valor,
  destaque = 'var(--g3-active)',
  subtitulo
}: {
  titulo: string;
  valor: string;
  destaque?: string;
  subtitulo?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3 shadow-sm">
      <p className="text-xs font-semibold text-[var(--g3-muted)]">{titulo}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: destaque }}>
        {valor}
      </p>
      {subtitulo ? <p className="mt-1 text-xs text-[var(--g3-muted)]">{subtitulo}</p> : null}
    </div>
  );
}

function Bloco({
  titulo,
  descricao,
  children
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--g3-foreground)]">{titulo}</h3>
        {descricao ? <p className="mt-1 text-xs text-[var(--g3-muted)]">{descricao}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ContabilidadePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>('painel');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [periodoInicial, setPeriodoInicial] = useState(inicioMesAtual);
  const [periodoFinal, setPeriodoFinal] = useState(hoje);
  const [filtroContaId, setFiltroContaId] = useState<number | undefined>();
  const [filtroCategoriaId, setFiltroCategoriaId] = useState<number | undefined>();
  const [filtroCentroId, setFiltroCentroId] = useState<number | undefined>();
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('');
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [tipoExclusao, setTipoExclusao] = useState<ExclusaoTipo>(null);

  const [contaSelecionadaId, setContaSelecionadaId] = useState<number>();
  const [categoriaSelecionadaId, setCategoriaSelecionadaId] = useState<number>();
  const [centroSelecionadoId, setCentroSelecionadoId] = useState<number>();
  const [lancamentoSelecionadoId, setLancamentoSelecionadoId] = useState<number>();
  const [movimentacaoSelecionadaId, setMovimentacaoSelecionadaId] = useState<number>();

  const [contaForm, setContaForm] = useState<ContaBancariaPayload>(contaVazia);
  const [categoriaForm, setCategoriaForm] = useState<CategoriaFinanceiraPayload>(categoriaVazia);
  const [centroForm, setCentroForm] = useState<CentroCustoPayload>(centroVazio);
  const [lancamentoForm, setLancamentoForm] = useState<LancamentoFinanceiroPayload>(lancamentoVazio);
  const [movimentacaoForm, setMovimentacaoForm] = useState<MovimentacaoFinanceiraPayload>(movimentacaoVazia);
  const [transferenciaForm, setTransferenciaForm] = useState<TransferenciaFinanceiraPayload>(transferenciaVazia);
  const [conciliacaoForm, setConciliacaoForm] = useState<ConciliacaoFinanceiraPayload>(conciliacaoVazia);
  const [emendaForm, setEmendaForm] = useState<EmendaImpositivaPayload>(emendaVazia);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [arquivoObservacao, setArquivoObservacao] = useState('');

  const contasQuery = useContasBancarias();
  const categoriasQuery = useCategoriasFinanceiras();
  const centrosQuery = useCentrosCustoContabeis();
  const lancamentosQuery = useLancamentosContabeis();
  const movimentacoesQuery = useMovimentacoesContabeis();
  const transferenciasQuery = useTransferenciasContabeis();
  const conciliacoesQuery = useConciliacoesContabeis();
  const comprasQuery = useComprasIntegradasContabilidade();
  const historicoQuery = useHistoricoContabil();
  const emendasQuery = useEmendasContabeis();
  const arquivosQuery = useArquivosLancamentoContabil(lancamentoSelecionadoId);

  const salvarContaMutation = useSalvarContaBancaria();
  const removerContaMutation = useRemoverContaBancaria();
  const salvarCategoriaMutation = useSalvarCategoriaFinanceira();
  const removerCategoriaMutation = useRemoverCategoriaFinanceira();
  const salvarCentroMutation = useSalvarCentroCustoContabil();
  const removerCentroMutation = useRemoverCentroCustoContabil();
  const salvarLancamentoMutation = useSalvarLancamentoContabil();
  const removerLancamentoMutation = useRemoverLancamentoContabil();
  const atualizarSituacaoLancamentoMutation = useAtualizarSituacaoLancamento();
  const pagarLancamentoMutation = usePagarLancamento();
  const estornarLancamentoMutation = useEstornarLancamento();
  const salvarMovimentacaoMutation = useSalvarMovimentacaoContabil();
  const removerMovimentacaoMutation = useRemoverMovimentacaoContabil();
  const criarTransferenciaMutation = useCriarTransferenciaContabil();
  const estornarTransferenciaMutation = useEstornarTransferenciaContabil();
  const criarConciliacaoMutation = useCriarConciliacaoContabil();
  const atualizarSituacaoConciliacaoMutation = useAtualizarSituacaoConciliacao();
  const gerarObrigacaoMutation = useGerarObrigacaoFinanceiraCompra();
  const criarEmendaMutation = useCriarEmendaContabil();
  const atualizarStatusEmendaMutation = useAtualizarStatusEmendaContabil();
  const uploadArquivoMutation = useUploadArquivoLancamentoContabil(lancamentoSelecionadoId);
  const excluirArquivoMutation = useExcluirArquivoLancamentoContabil(lancamentoSelecionadoId);

  const contas = contasQuery.data ?? [];
  const categorias = categoriasQuery.data ?? [];
  const centrosCusto = centrosQuery.data ?? [];
  const lancamentos = lancamentosQuery.data ?? [];
  const movimentacoes = movimentacoesQuery.data ?? [];
  const transferencias = transferenciasQuery.data ?? [];
  const conciliacoes = conciliacoesQuery.data ?? [];
  const comprasIntegradas = comprasQuery.data ?? [];
  const historico = historicoQuery.data ?? [];
  const emendas = emendasQuery.data ?? [];
  const arquivos = arquivosQuery.data ?? [];

  const termoBusca = normalizarBusca(filtroBusca);

  const lancamentosFiltrados = useMemo(
    () =>
      lancamentos.filter((item) => {
        if (!estaNoPeriodo(item.dataLancamento || item.vencimento, periodoInicial, periodoFinal)) return false;
        if (filtroContaId && item.contaBancariaId !== filtroContaId) return false;
        if (filtroCategoriaId && item.categoriaId !== filtroCategoriaId) return false;
        if (filtroCentroId && item.centroCustoId !== filtroCentroId) return false;
        if (filtroStatus && item.status !== filtroStatus) return false;
        if (filtroOrigem && (item.origem ?? '') !== filtroOrigem) return false;
        if (!termoBusca) return true;
        return normalizarBusca(
          [item.historico, item.natureza, item.contraparte, item.documento, item.categoriaNome, item.contaBancariaNome]
            .filter(Boolean)
            .join(' ')
        ).includes(termoBusca);
      }),
    [lancamentos, periodoInicial, periodoFinal, filtroContaId, filtroCategoriaId, filtroCentroId, filtroStatus, filtroOrigem, termoBusca]
  );

  const movimentacoesFiltradas = useMemo(
    () =>
      movimentacoes.filter((item) => {
        if (!estaNoPeriodo(item.dataMovimentacao, periodoInicial, periodoFinal)) return false;
        if (filtroContaId && item.contaBancariaId !== filtroContaId) return false;
        if (filtroOrigem && (item.origem ?? '') !== filtroOrigem) return false;
        if (!termoBusca) return true;
        return normalizarBusca([item.descricao, item.contraparte, item.categoria, item.contaBancariaNome].filter(Boolean).join(' ')).includes(termoBusca);
      }),
    [movimentacoes, periodoInicial, periodoFinal, filtroContaId, filtroOrigem, termoBusca]
  );

  const receitas = useMemo(() => lancamentosFiltrados.filter((item) => item.tipo === 'RECEITA'), [lancamentosFiltrados]);
  const despesas = useMemo(() => lancamentosFiltrados.filter((item) => item.tipo === 'DESPESA'), [lancamentosFiltrados]);
  const contasPagar = useMemo(() => despesas.filter((item) => statusEmAberto.has(item.status)), [despesas]);
  const contasReceber = useMemo(() => receitas.filter((item) => statusEmAberto.has(item.status)), [receitas]);

  const saldoGeral = useMemo(() => contas.reduce((acc, item) => acc + item.saldoAtual, 0), [contas]);
  const saldoBancos = useMemo(() => contas.filter((item) => item.tipo !== 'CAIXA_INTERNO').reduce((acc, item) => acc + item.saldoAtual, 0), [contas]);
  const saldoCaixa = useMemo(() => contas.filter((item) => item.tipo === 'CAIXA_INTERNO').reduce((acc, item) => acc + item.saldoAtual, 0), [contas]);
  const totalContasPagar = useMemo(() => contasPagar.reduce((acc, item) => acc + item.valor, 0), [contasPagar]);
  const totalContasReceber = useMemo(() => contasReceber.reduce((acc, item) => acc + item.valor, 0), [contasReceber]);
  const projecaoCaixa = saldoGeral + totalContasReceber - totalContasPagar;
  const comprasAguardandoPagamento = useMemo(() => comprasIntegradas.filter((item) => !item.statusFinanceiro || !['PAGO', 'RECEBIDO', 'CONCILIADO'].includes(item.statusFinanceiro)), [comprasIntegradas]);
  const contasSaldoBaixo = useMemo(() => contas.filter((item) => Number(item.limiteMinimoAlerta || 0) > 0 && item.saldoAtual <= Number(item.limiteMinimoAlerta || 0)), [contas]);

  const graficoMensal = useMemo(() => {
    const mapa = new Map<string, { periodo: string; receitas: number; despesas: number }>();
    for (const item of lancamentosFiltrados) {
      const data = (item.dataBaixa || item.dataLancamento || item.vencimento).slice(0, 7);
      const atual = mapa.get(data) ?? { periodo: data, receitas: 0, despesas: 0 };
      if (item.tipo === 'RECEITA') atual.receitas += item.valor;
      if (item.tipo === 'DESPESA') atual.despesas += item.valor;
      mapa.set(data, atual);
    }
    return Array.from(mapa.values()).sort((a, b) => a.periodo.localeCompare(b.periodo)).slice(-6).map((item) => ({ ...item, periodo: `${item.periodo.slice(5, 7)}/${item.periodo.slice(0, 4)}` }));
  }, [lancamentosFiltrados]);

  const graficoCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const item of despesas) {
      const chave = item.categoriaNome || item.natureza || 'Sem categoria';
      mapa.set(chave, (mapa.get(chave) ?? 0) + item.valor);
    }
    return Array.from(mapa.entries()).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor).slice(0, 6);
  }, [despesas]);

  const graficoSaldo = useMemo(
    () =>
      [...movimentacoesFiltradas]
        .sort((a, b) => a.dataMovimentacao.localeCompare(b.dataMovimentacao))
        .map((item) => ({ data: formatarData(item.dataMovimentacao), saldo: item.saldoAtual ?? 0 })),
    [movimentacoesFiltradas]
  );

  const processando =
    salvarContaMutation.isPending ||
    removerContaMutation.isPending ||
    salvarCategoriaMutation.isPending ||
    removerCategoriaMutation.isPending ||
    salvarCentroMutation.isPending ||
    removerCentroMutation.isPending ||
    salvarLancamentoMutation.isPending ||
    removerLancamentoMutation.isPending ||
    atualizarSituacaoLancamentoMutation.isPending ||
    pagarLancamentoMutation.isPending ||
    estornarLancamentoMutation.isPending ||
    salvarMovimentacaoMutation.isPending ||
    removerMovimentacaoMutation.isPending ||
    criarTransferenciaMutation.isPending ||
    estornarTransferenciaMutation.isPending ||
    criarConciliacaoMutation.isPending ||
    atualizarSituacaoConciliacaoMutation.isPending ||
    gerarObrigacaoMutation.isPending ||
    criarEmendaMutation.isPending ||
    atualizarStatusEmendaMutation.isPending ||
    uploadArquivoMutation.isPending ||
    excluirArquivoMutation.isPending;

  function limparFormularioAtual() {
    switch (abaAtiva) {
      case 'contas':
        setContaSelecionadaId(undefined);
        setContaForm(contaVazia);
        return;
      case 'categorias':
        setCategoriaSelecionadaId(undefined);
        setCategoriaForm(categoriaVazia);
        return;
      case 'centros':
        setCentroSelecionadoId(undefined);
        setCentroForm(centroVazio);
        return;
      case 'fluxoCaixa':
        setMovimentacaoSelecionadaId(undefined);
        setMovimentacaoForm(movimentacaoVazia);
        return;
      case 'transferencias':
        setTransferenciaForm(transferenciaVazia);
        return;
      case 'conciliacao':
        setConciliacaoForm(conciliacaoVazia);
        return;
      case 'emendas':
        setEmendaForm(emendaVazia);
        return;
      default:
        setLancamentoSelecionadoId(undefined);
        setLancamentoForm(lancamentoVazio);
    }
  }

  async function atualizarDados() {
    await queryClient.invalidateQueries({ queryKey: ['contabilidade'] });
    setPopup({
      tipo: 'sucesso',
      titulo: 'Atualização concluída',
      texto: 'Os dados financeiros foram recarregados.'
    });
  }

  function lancamentoAjustado(): LancamentoFinanceiroPayload {
    if (abaAtiva === 'receitas' || abaAtiva === 'contasReceber') {
      return { ...lancamentoForm, tipo: 'RECEITA', status: lancamentoForm.status || 'PENDENTE' };
    }
    if (abaAtiva === 'despesas' || abaAtiva === 'contasPagar') {
      return {
        ...lancamentoForm,
        tipo: 'DESPESA',
        status: abaAtiva === 'contasPagar' ? 'AGUARDANDO_PAGAMENTO' : lancamentoForm.status || 'PENDENTE'
      };
    }
    return lancamentoForm;
  }

  async function salvarAtual() {
    try {
      if (abaAtiva === 'contas') {
        if (!contaForm.banco.trim() || !contaForm.numero.trim() || !contaForm.nomeConta.trim()) {
          setPopup({ tipo: 'aviso', titulo: 'Validação', texto: 'Informe banco, número e nome da conta.' });
          return;
        }
        const resposta = await salvarContaMutation.mutateAsync({ id: contaSelecionadaId, payload: contaForm });
        setContaSelecionadaId(resposta.id);
        setContaForm(toContaForm(resposta));
        setPopup({ tipo: 'sucesso', titulo: 'Conta salva', texto: 'A conta bancária foi salva com sucesso.' });
        return;
      }

      if (abaAtiva === 'categorias') {
        if (!categoriaForm.codigo.trim() || !categoriaForm.nome.trim()) {
          setPopup({ tipo: 'aviso', titulo: 'Validação', texto: 'Informe código e nome da categoria.' });
          return;
        }
        const resposta = await salvarCategoriaMutation.mutateAsync({ id: categoriaSelecionadaId, payload: categoriaForm });
        setCategoriaSelecionadaId(resposta.id);
        setCategoriaForm(toCategoriaForm(resposta));
        setPopup({ tipo: 'sucesso', titulo: 'Categoria salva', texto: 'A categoria foi salva com sucesso.' });
        return;
      }

      if (abaAtiva === 'centros') {
        if (!centroForm.codigo.trim() || !centroForm.nome.trim() || !centroForm.setorResponsavel.trim()) {
          setPopup({ tipo: 'aviso', titulo: 'Validação', texto: 'Informe código, nome e setor responsável.' });
          return;
        }
        const resposta = await salvarCentroMutation.mutateAsync({ id: centroSelecionadoId, payload: centroForm });
        setCentroSelecionadoId(resposta.id);
        setCentroForm(toCentroForm(resposta));
        setPopup({ tipo: 'sucesso', titulo: 'Centro salvo', texto: 'O centro de custo foi salvo com sucesso.' });
        return;
      }

      if (abaAtiva === 'fluxoCaixa') {
        if (!movimentacaoForm.descricao.trim() || movimentacaoForm.valor <= 0) {
          setPopup({ tipo: 'aviso', titulo: 'Validação', texto: 'Informe descrição e valor maior que zero.' });
          return;
        }
        const resposta = await salvarMovimentacaoMutation.mutateAsync({ id: movimentacaoSelecionadaId, payload: movimentacaoForm });
        setMovimentacaoSelecionadaId(resposta.id);
        setMovimentacaoForm(toMovimentacaoForm(resposta));
        setPopup({ tipo: 'sucesso', titulo: 'Movimentação salva', texto: 'O fluxo de caixa foi atualizado.' });
        return;
      }

      if (abaAtiva === 'transferencias') {
        if (!transferenciaForm.contaOrigemId || !transferenciaForm.contaDestinoId || !transferenciaForm.descricao.trim() || !transferenciaForm.responsavel.trim() || transferenciaForm.valor <= 0) {
          setPopup({ tipo: 'aviso', titulo: 'Validação', texto: 'Preencha origem, destino, descrição, responsável e valor.' });
          return;
        }
        await criarTransferenciaMutation.mutateAsync(transferenciaForm);
        setTransferenciaForm(transferenciaVazia);
        setPopup({ tipo: 'sucesso', titulo: 'Transferência concluída', texto: 'A transferência foi registrada.' });
        return;
      }

      if (abaAtiva === 'conciliacao') {
        if (!conciliacaoForm.contaBancariaId || !conciliacaoForm.descricaoExtrato.trim()) {
          setPopup({ tipo: 'aviso', titulo: 'Validação', texto: 'Selecione a conta e descreva o item do extrato.' });
          return;
        }
        await criarConciliacaoMutation.mutateAsync(conciliacaoForm);
        setConciliacaoForm(conciliacaoVazia);
        setPopup({ tipo: 'sucesso', titulo: 'Conciliação registrada', texto: 'O item do extrato foi lançado.' });
        return;
      }

      if (abaAtiva === 'emendas') {
        if (!emendaForm.identificacao.trim()) {
          setPopup({ tipo: 'aviso', titulo: 'Validação', texto: 'Informe a identificação da emenda.' });
          return;
        }
        await criarEmendaMutation.mutateAsync(emendaForm);
        setEmendaForm(emendaVazia);
        setPopup({ tipo: 'sucesso', titulo: 'Emenda registrada', texto: 'A emenda foi salva com sucesso.' });
        return;
      }

      if (['painel', 'compras', 'historico', 'anexos', 'relatorios', 'impressoes'].includes(abaAtiva)) {
        setPopup({ tipo: 'aviso', titulo: 'Ação indisponível', texto: 'Use as ações específicas desta aba.' });
        return;
      }

      const payload = lancamentoAjustado();
      if (!payload.natureza.trim() || !payload.contraparte.trim() || !payload.historico.trim() || payload.valor <= 0) {
        setPopup({ tipo: 'aviso', titulo: 'Validação', texto: 'Preencha natureza, favorecido/pagador, histórico e valor maior que zero.' });
        return;
      }
      const resposta = await salvarLancamentoMutation.mutateAsync({ id: lancamentoSelecionadoId, payload });
      setLancamentoSelecionadoId(resposta.id);
      setLancamentoForm(toLancamentoForm(resposta));
      setPopup({ tipo: 'sucesso', titulo: 'Lançamento salvo', texto: 'O lançamento financeiro foi salvo com sucesso.' });
    } catch (error: any) {
      setPopup({ tipo: 'erro', titulo: 'Erro', texto: error?.response?.data?.message ?? 'Não foi possível salvar os dados.' });
    }
  }

  function solicitarExclusao() {
    if (abaAtiva === 'contas' && contaSelecionadaId) return setTipoExclusao('conta'), setConfirmarExclusao(true);
    if (abaAtiva === 'categorias' && categoriaSelecionadaId) return setTipoExclusao('categoria'), setConfirmarExclusao(true);
    if (abaAtiva === 'centros' && centroSelecionadoId) return setTipoExclusao('centro'), setConfirmarExclusao(true);
    if (['lancamentos', 'receitas', 'despesas', 'contasPagar', 'contasReceber'].includes(abaAtiva) && lancamentoSelecionadoId) return setTipoExclusao('lancamento'), setConfirmarExclusao(true);
    if (abaAtiva === 'fluxoCaixa' && movimentacaoSelecionadaId) return setTipoExclusao('movimentacao'), setConfirmarExclusao(true);
    setPopup({ tipo: 'aviso', titulo: 'Seleção necessária', texto: 'Selecione um registro válido para excluir.' });
  }

  async function confirmarExclusaoRegistro() {
    try {
      if (tipoExclusao === 'conta' && contaSelecionadaId) await removerContaMutation.mutateAsync(contaSelecionadaId);
      if (tipoExclusao === 'categoria' && categoriaSelecionadaId) await removerCategoriaMutation.mutateAsync(categoriaSelecionadaId);
      if (tipoExclusao === 'centro' && centroSelecionadoId) await removerCentroMutation.mutateAsync(centroSelecionadoId);
      if (tipoExclusao === 'lancamento' && lancamentoSelecionadoId) await removerLancamentoMutation.mutateAsync(lancamentoSelecionadoId);
      if (tipoExclusao === 'movimentacao' && movimentacaoSelecionadaId) await removerMovimentacaoMutation.mutateAsync(movimentacaoSelecionadaId);
      limparFormularioAtual();
      setPopup({ tipo: 'sucesso', titulo: 'Exclusão concluída', texto: 'O registro foi removido com sucesso.' });
    } catch (error: any) {
      setPopup({ tipo: 'erro', titulo: 'Erro', texto: error?.response?.data?.message ?? 'Não foi possível excluir o registro.' });
    } finally {
      setConfirmarExclusao(false);
      setTipoExclusao(null);
    }
  }

  async function baixarLancamento(item: LancamentoFinanceiro) {
    try {
      const contaId = item.contaBancariaId ?? contas.find((conta) => conta.status === 'ATIVA')?.id;
      if (!contaId) {
        setPopup({ tipo: 'aviso', titulo: 'Conta necessária', texto: 'Cadastre ou selecione uma conta ativa para fazer a baixa.' });
        return;
      }
      const recibo = await pagarLancamentoMutation.mutateAsync({
        id: item.id,
        payload: { contaBancariaId: contaId, data: hoje, formaPagamento: item.formaPagamento, responsavel: item.responsavel, observacao: item.observacao }
      });
      setPopup({
        tipo: 'sucesso',
        titulo: item.tipo === 'RECEITA' ? 'Recebimento confirmado' : 'Pagamento confirmado',
        texto: `Recibo ${recibo.numeroRecibo ?? 'gerado'} registrado com sucesso.`
      });
    } catch (error: any) {
      setPopup({ tipo: 'erro', titulo: 'Erro', texto: error?.response?.data?.message ?? 'Não foi possível baixar o lançamento.' });
    }
  }

  async function exportarRelatorio(tipo: 'comparativo' | 'fluxo' | 'receitas' | 'despesas' | 'contas') {
    const linhas =
      tipo === 'fluxo'
        ? [['Data', 'Descrição', 'Conta', 'Origem', 'Valor', 'Saldo atual'], ...movimentacoesFiltradas.map((item) => [formatarData(item.dataMovimentacao), item.descricao, item.contaBancariaNome, item.origem, item.valor, item.saldoAtual])]
        : tipo === 'receitas'
          ? [['Data', 'Histórico', 'Pagador', 'Categoria', 'Status', 'Valor'], ...receitas.map((item) => [formatarData(item.dataLancamento), item.historico, item.contraparte, item.categoriaNome, formatarStatus(item.status), item.valor])]
          : tipo === 'despesas'
            ? [['Data', 'Histórico', 'Favorecido', 'Categoria', 'Status', 'Valor'], ...despesas.map((item) => [formatarData(item.dataLancamento), item.historico, item.contraparte, item.categoriaNome, formatarStatus(item.status), item.valor])]
            : tipo === 'contas'
              ? [['Conta', 'Banco', 'Tipo', 'Saldo atual', 'Status'], ...contas.map((item) => [item.nomeConta, item.banco, formatarStatus(item.tipo), item.saldoAtual, formatarStatus(item.status)])]
              : [['Indicador', 'Valor'], ['Saldo geral', saldoGeral], ['Saldo em bancos', saldoBancos], ['Saldo em caixa', saldoCaixa], ['A pagar', totalContasPagar], ['A receber', totalContasReceber], ['Saldo projetado', projecaoCaixa]];

    baixarArquivo(`contabilidade-${tipo}-${hoje}.csv`, serializarCsv(linhas), 'text/csv;charset=utf-8');
    setPopup({ tipo: 'sucesso', titulo: 'Exportação concluída', texto: 'O relatório foi exportado com sucesso.' });
  }

  function renderFiltros() {
    return (
      <Bloco titulo="Filtros do período" descricao="Cards, listas e gráficos respeitam estes filtros em tempo real.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-1"><Label>Início</Label><Input type="date" value={periodoInicial} onChange={(event) => setPeriodoInicial(event.target.value)} /></div>
          <div className="space-y-1"><Label>Fim</Label><Input type="date" value={periodoFinal} onChange={(event) => setPeriodoFinal(event.target.value)} /></div>
          <div className="space-y-1"><Label>Conta</Label><Select value={filtroContaId ? String(filtroContaId) : ''} onChange={(event) => setFiltroContaId(Number(event.target.value) || undefined)}><option value="">Todas</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nomeConta}</option>)}</Select></div>
          <div className="space-y-1"><Label>Categoria</Label><Select value={filtroCategoriaId ? String(filtroCategoriaId) : ''} onChange={(event) => setFiltroCategoriaId(Number(event.target.value) || undefined)}><option value="">Todas</option>{categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}</Select></div>
          <div className="space-y-1"><Label>Centro de custo</Label><Select value={filtroCentroId ? String(filtroCentroId) : ''} onChange={(event) => setFiltroCentroId(Number(event.target.value) || undefined)}><option value="">Todos</option>{centrosCusto.map((centro) => <option key={centro.id} value={centro.id}>{centro.nome}</option>)}</Select></div>
          <div className="space-y-1"><Label>Status</Label><Input value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value.toUpperCase())} placeholder="Ex.: PENDENTE" /></div>
          <div className="space-y-1 xl:col-span-2"><Label>Origem</Label><Input value={filtroOrigem} onChange={(event) => setFiltroOrigem(event.target.value.toUpperCase())} placeholder="Ex.: COMPRA" /></div>
          <div className="space-y-1 xl:col-span-4"><Label>Busca rápida</Label><Input value={filtroBusca} onChange={(event) => setFiltroBusca(event.target.value)} placeholder="Descrição, conta, fornecedor, documento ou observação" /></div>
        </div>
      </Bloco>
    );
  }

  function renderPainel() {
    return (
      <section className="space-y-4">
        {renderFiltros()}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard titulo="Saldo geral" valor={formatarMoeda(saldoGeral)} />
          <ResumoCard titulo="Saldo em bancos" valor={formatarMoeda(saldoBancos)} />
          <ResumoCard titulo="Saldo em caixa" valor={formatarMoeda(saldoCaixa)} />
          <ResumoCard titulo="Saldo projetado" valor={formatarMoeda(projecaoCaixa)} destaque="#0f766e" />
          <ResumoCard titulo="Contas a pagar" valor={formatarMoeda(totalContasPagar)} destaque="#b45309" />
          <ResumoCard titulo="Contas a receber" valor={formatarMoeda(totalContasReceber)} destaque="#2563eb" />
          <ResumoCard titulo="Compras aguardando pagamento" valor={String(comprasAguardandoPagamento.length)} destaque="#9333ea" />
          <ResumoCard titulo="Contas com saldo baixo" valor={String(contasSaldoBaixo.length)} destaque="#dc2626" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Bloco titulo="Receitas x despesas por mês">
            <ResponsiveChart minHeight={260}>
              <BarChart data={graficoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--g3-border)" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(valor) => `R$ ${Math.round(Number(valor) / 1000)} mil`} />
                <Tooltip formatter={(valor) => formatarMoeda(Number(valor ?? 0))} />
                <Legend />
                <Bar dataKey="receitas" name="Receitas" fill="#0f766e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#dc2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveChart>
          </Bloco>

          <Bloco titulo="Despesas por categoria">
            <ResponsiveChart minHeight={260}>
              <PieChart>
                <Pie data={graficoCategoria} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={90}>
                  {graficoCategoria.map((item, index) => <Cell key={item.nome} fill={coresGraficos[index % coresGraficos.length]} />)}
                </Pie>
                <Tooltip formatter={(valor) => formatarMoeda(Number(valor ?? 0))} />
                <Legend />
              </PieChart>
            </ResponsiveChart>
          </Bloco>
        </div>

        <Bloco titulo="Evolução de saldo">
          <ResponsiveChart minHeight={260}>
            <LineChart data={graficoSaldo}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--g3-border)" />
              <XAxis dataKey="data" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(valor) => `R$ ${Math.round(Number(valor) / 1000)} mil`} />
              <Tooltip formatter={(valor) => formatarMoeda(Number(valor ?? 0))} />
              <Line dataKey="saldo" type="monotone" stroke="#2563eb" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveChart>
        </Bloco>
      </section>
    );
  }

  function renderFormularioLancamentos(titulo: string, descricao: string, lista: LancamentoFinanceiro[]) {
    return (
      <section className="space-y-4">
        {renderFiltros()}
        <Bloco titulo={titulo} descricao={descricao}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1"><Label>Data</Label><Input type="date" value={lancamentoForm.dataLancamento} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, dataLancamento: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Conta</Label><Select value={lancamentoForm.contaBancariaId ? String(lancamentoForm.contaBancariaId) : ''} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, contaBancariaId: Number(event.target.value) || undefined }))}><option value="">Selecione</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nomeConta}</option>)}</Select></div>
            <div className="space-y-1"><Label>Categoria</Label><Select value={lancamentoForm.categoriaId ? String(lancamentoForm.categoriaId) : ''} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, categoriaId: Number(event.target.value) || undefined }))}><option value="">Selecione</option>{categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}</Select></div>
            <div className="space-y-1"><Label>Centro de custo</Label><Select value={lancamentoForm.centroCustoId ? String(lancamentoForm.centroCustoId) : ''} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, centroCustoId: Number(event.target.value) || undefined }))}><option value="">Selecione</option>{centrosCusto.map((centro) => <option key={centro.id} value={centro.id}>{centro.nome}</option>)}</Select></div>
            <div className="space-y-1"><Label>Natureza</Label><Input value={lancamentoForm.natureza} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, natureza: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Favorecido / pagador</Label><Input value={lancamentoForm.contraparte} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, contraparte: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Documento</Label><Input value={lancamentoForm.documento ?? ''} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, documento: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Vencimento</Label><Input type="date" value={lancamentoForm.vencimento} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, vencimento: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Valor</Label><Input type="number" min={0} step="0.01" value={lancamentoForm.valor} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, valor: Number(event.target.value) || 0 }))} /></div>
            <div className="space-y-1"><Label>Forma de pagamento</Label><Input value={lancamentoForm.formaPagamento ?? ''} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, formaPagamento: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Status</Label><Input value={lancamentoForm.status} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, status: event.target.value.toUpperCase() as LancamentoFinanceiro['status'] }))} /></div>
            <div className="space-y-1"><Label>Origem</Label><Input value={lancamentoForm.origem ?? ''} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, origem: event.target.value }))} disabled={!!lancamentoForm.compraId} /></div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Histórico</Label><Textarea rows={3} value={lancamentoForm.historico} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, historico: event.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observação</Label><Textarea rows={2} value={lancamentoForm.observacao ?? ''} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, observacao: event.target.value }))} /></div>
          </div>
        </Bloco>

        <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Histórico</th>
                <th className="px-3 py-2 text-left">Favorecido / pagador</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Valor</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.length ? (
                lista.map((item, index) => (
                  <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? 'bg-[var(--g3-card)]' : 'bg-[var(--g3-primary-soft)]/35'}`}>
                    <td className="px-3 py-2">{formatarData(item.dataLancamento)}</td>
                    <td className="px-3 py-2">{item.historico}</td>
                    <td className="px-3 py-2">{item.contraparte}</td>
                    <td className="px-3 py-2">{formatarStatus(item.status)}</td>
                    <td className="px-3 py-2">{formatarMoeda(item.valor)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setLancamentoSelecionadoId(item.id); setLancamentoForm(toLancamentoForm(item)); }}>
                          Selecionar
                        </Button>
                        {statusEmAberto.has(item.status) ? (
                          <Button size="sm" variant="ghost" onClick={() => void baixarLancamento(item)}>
                            {item.tipo === 'RECEITA' ? 'Receber' : 'Pagar'}
                          </Button>
                        ) : null}
                        {['PAGO', 'RECEBIDO', 'CONCILIADO'].includes(item.status) ? (
                          <Button size="sm" variant="ghost" onClick={() => void estornarLancamentoMutation.mutateAsync(item.id)}>
                            Estornar
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-[var(--g3-muted)]">Nenhum lançamento encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderFluxoCaixa() {
    return (
      <section className="space-y-4">
        {renderFiltros()}
        <Bloco titulo="Ajuste manual de fluxo" descricao="Registre entradas, saídas e ajustes que ainda não nasceram de um lançamento.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1"><Label>Tipo</Label><Input value={movimentacaoForm.tipo} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, tipo: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Conta</Label><Select value={movimentacaoForm.contaBancariaId ? String(movimentacaoForm.contaBancariaId) : ''} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, contaBancariaId: Number(event.target.value) || undefined }))}><option value="">Selecione</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nomeConta}</option>)}</Select></div>
            <div className="space-y-1"><Label>Data</Label><Input type="date" value={movimentacaoForm.dataMovimentacao} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, dataMovimentacao: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Valor</Label><Input type="number" min={0} step="0.01" value={movimentacaoForm.valor} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, valor: Number(event.target.value) || 0 }))} /></div>
            <div className="space-y-1 xl:col-span-2"><Label>Descrição</Label><Input value={movimentacaoForm.descricao} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, descricao: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Contraparte</Label><Input value={movimentacaoForm.contraparte ?? ''} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, contraparte: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Categoria textual</Label><Input value={movimentacaoForm.categoria ?? ''} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, categoria: event.target.value }))} /></div>
          </div>
        </Bloco>

        <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Descrição</th>
                <th className="px-3 py-2 text-left">Conta</th>
                <th className="px-3 py-2 text-left">Origem</th>
                <th className="px-3 py-2 text-left">Valor</th>
                <th className="px-3 py-2 text-left">Saldo atual</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoesFiltradas.length ? movimentacoesFiltradas.map((item, index) => (
                <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? 'bg-[var(--g3-card)]' : 'bg-[var(--g3-primary-soft)]/35'}`}>
                  <td className="px-3 py-2">{formatarData(item.dataMovimentacao)}</td>
                  <td className="px-3 py-2">{item.descricao}</td>
                  <td className="px-3 py-2">{item.contaBancariaNome ?? 'Sem conta'}</td>
                  <td className="px-3 py-2">{formatarStatus(item.origem)}</td>
                  <td className="px-3 py-2">{formatarMoeda(item.valor)}</td>
                  <td className="px-3 py-2">{formatarMoeda(item.saldoAtual ?? 0)}</td>
                  <td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => { setMovimentacaoSelecionadaId(item.id); setMovimentacaoForm(toMovimentacaoForm(item)); }}>Selecionar</Button></td>
                </tr>
              )) : <tr><td colSpan={7} className="px-3 py-4 text-center text-[var(--g3-muted)]">Nenhuma movimentação encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderListaSimples<T extends { id?: number }>(
    titulo: string,
    descricao: string,
    cabecalho: React.ReactNode,
    corpo: React.ReactNode
  ) {
    return (
      <section className="space-y-4">
        <Bloco titulo={titulo} descricao={descricao}>
          {cabecalho}
        </Bloco>
        <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">{corpo}</div>
      </section>
    );
  }

  function renderContas() {
    return renderListaSimples(
      'Contas bancárias e caixa',
      'Cadastre contas, defina saldo inicial, saldo mínimo e permissão de movimentação.',
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1"><Label>Banco</Label><Input value={contaForm.banco} onChange={(event) => setContaForm((atual) => ({ ...atual, banco: event.target.value }))} /></div>
        <div className="space-y-1"><Label>Número</Label><Input value={contaForm.numero} onChange={(event) => setContaForm((atual) => ({ ...atual, numero: event.target.value }))} /></div>
        <div className="space-y-1"><Label>Nome da conta</Label><Input value={contaForm.nomeConta} onChange={(event) => setContaForm((atual) => ({ ...atual, nomeConta: event.target.value }))} /></div>
        <div className="space-y-1"><Label>Saldo inicial</Label><Input type="number" min={0} step="0.01" value={contaForm.saldoInicial} onChange={(event) => setContaForm((atual) => ({ ...atual, saldoInicial: Number(event.target.value) || 0 }))} /></div>
      </div>,
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Conta</th><th className="px-3 py-2 text-left">Banco</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Saldo</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
        <tbody>{contas.length ? contas.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? 'bg-[var(--g3-card)]' : 'bg-[var(--g3-primary-soft)]/35'}`}><td className="px-3 py-2">{item.nomeConta}</td><td className="px-3 py-2">{item.banco}</td><td className="px-3 py-2">{formatarStatus(item.tipo)}</td><td className="px-3 py-2">{formatarMoeda(item.saldoAtual)}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => { setContaSelecionadaId(item.id); setContaForm(toContaForm(item)); }}>Selecionar</Button></td></tr>) : <tr><td colSpan={5} className="px-3 py-4 text-center text-[var(--g3-muted)]">Nenhuma conta cadastrada.</td></tr>}</tbody>
      </table>
    );
  }

  function renderCategorias() {
    return renderListaSimples(
      'Categorias financeiras / contábeis',
      'Padronize classificações para receitas, despesas, relatórios e integrações.',
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1"><Label>Código</Label><Input value={categoriaForm.codigo} onChange={(event) => setCategoriaForm((atual) => ({ ...atual, codigo: event.target.value }))} /></div>
        <div className="space-y-1"><Label>Nome</Label><Input value={categoriaForm.nome} onChange={(event) => setCategoriaForm((atual) => ({ ...atual, nome: event.target.value }))} /></div>
        <div className="space-y-1"><Label>Tipo</Label><Select value={categoriaForm.tipo} onChange={(event) => setCategoriaForm((atual) => ({ ...atual, tipo: event.target.value as CategoriaFinanceira['tipo'] }))}><option value="RECEITA">Receita</option><option value="DESPESA">Despesa</option></Select></div>
        <div className="space-y-1"><Label>Status</Label><Select value={categoriaForm.status ?? 'ATIVA'} onChange={(event) => setCategoriaForm((atual) => ({ ...atual, status: event.target.value as CategoriaFinanceira['status'] }))}><option value="ATIVA">Ativa</option><option value="INATIVA">Inativa</option></Select></div>
      </div>,
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Código</th><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
        <tbody>{categorias.length ? categorias.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? 'bg-[var(--g3-card)]' : 'bg-[var(--g3-primary-soft)]/35'}`}><td className="px-3 py-2">{item.codigo}</td><td className="px-3 py-2">{item.nome}</td><td className="px-3 py-2">{formatarStatus(item.tipo)}</td><td className="px-3 py-2">{formatarStatus(item.status)}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => { setCategoriaSelecionadaId(item.id); setCategoriaForm(toCategoriaForm(item)); }}>Selecionar</Button></td></tr>) : <tr><td colSpan={5} className="px-3 py-4 text-center text-[var(--g3-muted)]">Nenhuma categoria cadastrada.</td></tr>}</tbody>
      </table>
    );
  }

  function renderCentros() {
    return renderListaSimples(
      'Centro de custo',
      'Separe receitas e despesas por área responsável.',
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1"><Label>Código</Label><Input value={centroForm.codigo} onChange={(event) => setCentroForm((atual) => ({ ...atual, codigo: event.target.value }))} /></div>
        <div className="space-y-1"><Label>Nome</Label><Input value={centroForm.nome} onChange={(event) => setCentroForm((atual) => ({ ...atual, nome: event.target.value }))} /></div>
        <div className="space-y-1"><Label>Setor responsável</Label><Input value={centroForm.setorResponsavel} onChange={(event) => setCentroForm((atual) => ({ ...atual, setorResponsavel: event.target.value }))} /></div>
        <div className="space-y-1"><Label>Status</Label><Select value={centroForm.status ?? 'ATIVA'} onChange={(event) => setCentroForm((atual) => ({ ...atual, status: event.target.value as CentroCusto['status'] }))}><option value="ATIVA">Ativa</option><option value="INATIVA">Inativa</option></Select></div>
      </div>,
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Código</th><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Setor responsável</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
        <tbody>{centrosCusto.length ? centrosCusto.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? 'bg-[var(--g3-card)]' : 'bg-[var(--g3-primary-soft)]/35'}`}><td className="px-3 py-2">{item.codigo}</td><td className="px-3 py-2">{item.nome}</td><td className="px-3 py-2">{item.setorResponsavel}</td><td className="px-3 py-2">{formatarStatus(item.status)}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => { setCentroSelecionadoId(item.id); setCentroForm(toCentroForm(item)); }}>Selecionar</Button></td></tr>) : <tr><td colSpan={5} className="px-3 py-4 text-center text-[var(--g3-muted)]">Nenhum centro de custo cadastrado.</td></tr>}</tbody>
      </table>
    );
  }

  function renderTransferencias() {
    return renderListaSimples(
      'Transferências',
      'Movimente recursos entre contas internas sem perder o vínculo entre saída e entrada.',
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1"><Label>Conta origem</Label><Select value={transferenciaForm.contaOrigemId ? String(transferenciaForm.contaOrigemId) : ''} onChange={(event) => setTransferenciaForm((atual) => ({ ...atual, contaOrigemId: Number(event.target.value) || 0 }))}><option value="">Selecione</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nomeConta}</option>)}</Select></div>
        <div className="space-y-1"><Label>Conta destino</Label><Select value={transferenciaForm.contaDestinoId ? String(transferenciaForm.contaDestinoId) : ''} onChange={(event) => setTransferenciaForm((atual) => ({ ...atual, contaDestinoId: Number(event.target.value) || 0 }))}><option value="">Selecione</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nomeConta}</option>)}</Select></div>
        <div className="space-y-1"><Label>Data</Label><Input type="date" value={transferenciaForm.dataTransferencia} onChange={(event) => setTransferenciaForm((atual) => ({ ...atual, dataTransferencia: event.target.value }))} /></div>
        <div className="space-y-1"><Label>Valor</Label><Input type="number" min={0} step="0.01" value={transferenciaForm.valor} onChange={(event) => setTransferenciaForm((atual) => ({ ...atual, valor: Number(event.target.value) || 0 }))} /></div>
      </div>,
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Origem</th><th className="px-3 py-2 text-left">Destino</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
        <tbody>{transferencias.length ? transferencias.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? 'bg-[var(--g3-card)]' : 'bg-[var(--g3-primary-soft)]/35'}`}><td className="px-3 py-2">{formatarData(item.dataTransferencia)}</td><td className="px-3 py-2">{item.contaOrigemNome}</td><td className="px-3 py-2">{item.contaDestinoNome}</td><td className="px-3 py-2">{formatarMoeda(item.valor)}</td><td className="px-3 py-2">{formatarStatus(item.status)}</td><td className="px-3 py-2 text-right">{item.status !== 'ESTORNADA' ? <Button size="sm" variant="outline" onClick={() => void estornarTransferenciaMutation.mutateAsync(item.id)}>Estornar</Button> : null}</td></tr>) : <tr><td colSpan={6} className="px-3 py-4 text-center text-[var(--g3-muted)]">Nenhuma transferência registrada.</td></tr>}</tbody>
      </table>
    );
  }

  function renderConciliacao() {
    return renderListaSimples(
      'Conciliação bancária',
      'Registre o item do extrato, vincule o lançamento interno e marque divergências de forma auditável.',
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1"><Label>Conta bancária</Label><Select value={conciliacaoForm.contaBancariaId ? String(conciliacaoForm.contaBancariaId) : ''} onChange={(event) => setConciliacaoForm((atual) => ({ ...atual, contaBancariaId: Number(event.target.value) || 0 }))}><option value="">Selecione</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nomeConta}</option>)}</Select></div>
        <div className="space-y-1"><Label>Data</Label><Input type="date" value={conciliacaoForm.dataMovimento} onChange={(event) => setConciliacaoForm((atual) => ({ ...atual, dataMovimento: event.target.value }))} /></div>
        <div className="space-y-1"><Label>Valor do extrato</Label><Input type="number" step="0.01" value={conciliacaoForm.valorExtrato} onChange={(event) => setConciliacaoForm((atual) => ({ ...atual, valorExtrato: Number(event.target.value) || 0 }))} /></div>
        <div className="space-y-1"><Label>Situação</Label><Input value={conciliacaoForm.situacao ?? 'PENDENTE'} onChange={(event) => setConciliacaoForm((atual) => ({ ...atual, situacao: event.target.value as ConciliacaoFinanceira['situacao'] }))} /></div>
      </div>,
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Conta</th><th className="px-3 py-2 text-left">Extrato</th><th className="px-3 py-2 text-left">Diferença</th><th className="px-3 py-2 text-left">Situação</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
        <tbody>{conciliacoes.length ? conciliacoes.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? 'bg-[var(--g3-card)]' : 'bg-[var(--g3-primary-soft)]/35'}`}><td className="px-3 py-2">{formatarData(item.dataMovimento)}</td><td className="px-3 py-2">{item.contaBancariaNome}</td><td className="px-3 py-2">{item.descricaoExtrato}</td><td className="px-3 py-2">{formatarMoeda(item.diferenca)}</td><td className="px-3 py-2">{formatarStatus(item.situacao)}</td><td className="px-3 py-2 text-right">{item.situacao !== 'CONCILIADO' ? <Button size="sm" variant="outline" onClick={() => void atualizarSituacaoConciliacaoMutation.mutateAsync({ id: item.id, situacao: 'CONCILIADO' })}>Conciliar</Button> : null}</td></tr>) : <tr><td colSpan={6} className="px-3 py-4 text-center text-[var(--g3-muted)]">Nenhum item de conciliação registrado.</td></tr>}</tbody>
      </table>
    );
  }

  function renderCompras() {
    return (
      <section className="space-y-4">
        {renderFiltros()}
        <div className="grid gap-3 md:grid-cols-4">
          <ResumoCard titulo="Compras integradas" valor={String(comprasIntegradas.length)} />
          <ResumoCard titulo="Valor aprovado" valor={formatarMoeda(comprasIntegradas.reduce((acc, item) => acc + item.valorAprovado, 0))} />
          <ResumoCard titulo="Valor reservado" valor={formatarMoeda(comprasIntegradas.reduce((acc, item) => acc + item.valorReservado, 0))} />
          <ResumoCard titulo="Valor autorizado" valor={formatarMoeda(comprasIntegradas.reduce((acc, item) => acc + item.valorAutorizado, 0))} />
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Compra</th><th className="px-3 py-2 text-left">Fornecedor</th><th className="px-3 py-2 text-left">Status da compra</th><th className="px-3 py-2 text-left">Status financeiro</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
            <tbody>{comprasIntegradas.length ? comprasIntegradas.map((item, index) => <tr key={item.compraId} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? 'bg-[var(--g3-card)]' : 'bg-[var(--g3-primary-soft)]/35'}`}><td className="px-3 py-2">{item.numeroCompra ?? item.compraId}</td><td className="px-3 py-2">{item.fornecedor ?? 'Não informado'}</td><td className="px-3 py-2">{formatarStatus(item.statusCompra)}</td><td className="px-3 py-2">{formatarStatus(item.statusFinanceiro)}</td><td className="px-3 py-2">{formatarMoeda(item.valorAutorizado || item.valorAprovado)}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="outline" disabled={!!item.lancamentoFinanceiroId} onClick={() => void gerarObrigacaoMutation.mutateAsync(item.compraId)}>{item.lancamentoFinanceiroId ? 'Obrigação gerada' : 'Gerar obrigação'}</Button></td></tr>) : <tr><td colSpan={6} className="px-3 py-4 text-center text-[var(--g3-muted)]">Nenhuma compra integrada encontrada.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderHistorico() {
    return (
      <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data e hora</th><th className="px-3 py-2 text-left">Usuário</th><th className="px-3 py-2 text-left">Aba</th><th className="px-3 py-2 text-left">Ação</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Observação</th></tr></thead>
          <tbody>{historico.length ? historico.map((item: HistoricoContabilidade, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? 'bg-[var(--g3-card)]' : 'bg-[var(--g3-primary-soft)]/35'}`}><td className="px-3 py-2">{formatarDataHora(item.dataHora)}</td><td className="px-3 py-2">{item.usuarioNome ?? 'Sistema'}</td><td className="px-3 py-2">{item.aba}</td><td className="px-3 py-2">{item.acao}</td><td className="px-3 py-2">{item.statusAnterior ? `${formatarStatus(item.statusAnterior)} → ${formatarStatus(item.statusNovo)}` : formatarStatus(item.statusNovo)}</td><td className="px-3 py-2">{item.observacao ?? '—'}</td></tr>) : <tr><td colSpan={6} className="px-3 py-4 text-center text-[var(--g3-muted)]">Nenhum evento de auditoria encontrado.</td></tr>}</tbody>
        </table>
      </div>
    );
  }

  function renderAnexos() {
    return (
      <section className="space-y-4">
        <Bloco titulo="Anexos financeiros" descricao="Vincule notas fiscais, recibos, comprovantes e extratos ao lançamento selecionado.">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1"><Label>Lançamento</Label><Select value={lancamentoSelecionadoId ? String(lancamentoSelecionadoId) : ''} onChange={(event) => setLancamentoSelecionadoId(Number(event.target.value) || undefined)}><option value="">Selecione</option>{lancamentos.map((item) => <option key={item.id} value={item.id}>{item.historico}</option>)}</Select></div>
            <div className="space-y-1"><Label>Arquivo</Label><Input type="file" onChange={(event) => setArquivoSelecionado(event.target.files?.[0] ?? null)} /></div>
            <div className="space-y-1"><Label>Observação</Label><Input value={arquivoObservacao} onChange={(event) => setArquivoObservacao(event.target.value)} /></div>
          </div>
          <div className="flex justify-end"><Button type="button" disabled={!lancamentoSelecionadoId || !arquivoSelecionado} onClick={() => { if (!lancamentoSelecionadoId || !arquivoSelecionado) return; void uploadArquivoMutation.mutateAsync({ arquivo: arquivoSelecionado, observacao: arquivoObservacao }).then(() => { setArquivoSelecionado(null); setArquivoObservacao(''); setPopup({ tipo: 'sucesso', titulo: 'Anexo enviado', texto: 'O documento foi anexado com sucesso.' }); }); }}>Anexar documento</Button></div>
        </Bloco>
        <div className="space-y-3">{arquivos.length ? arquivos.map((arquivo) => <div key={arquivo.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2"><div><p className="text-sm font-semibold text-[var(--g3-foreground)]">{arquivo.nomeOriginal}</p><p className="text-xs text-[var(--g3-muted)]">{arquivo.observacao ?? 'Sem observação'}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => window.open(resolverUrlArquivo(arquivo.caminhoArquivo), '_blank', 'noopener,noreferrer')}>Abrir</Button><Button size="sm" variant="danger" onClick={() => void excluirArquivoMutation.mutateAsync(arquivo.id)}>Excluir</Button></div></div>) : <p className="text-sm text-[var(--g3-muted)]">Selecione um lançamento para visualizar os anexos.</p>}</div>
      </section>
    );
  }

  function renderRelatorios() {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['comparativo', 'Comparativo receitas x despesas'],
          ['fluxo', 'Fluxo de caixa do período'],
          ['receitas', 'Receitas do período'],
          ['despesas', 'Despesas do período'],
          ['contas', 'Saldo por conta']
        ].map(([id, titulo]) => (
          <Bloco key={id} titulo={titulo} descricao="Exportação rápida e leitura didática para conferência gerencial.">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => void exportarRelatorio(id as 'comparativo' | 'fluxo' | 'receitas' | 'despesas' | 'contas')}>Exportar CSV</Button>
              <Button type="button" onClick={() => imprimirConteudoAtual({ titulo })}>Imprimir</Button>
            </div>
          </Bloco>
        ))}
      </div>
    );
  }

  function renderImpressoes() {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {['Comprovante de lançamento', 'Comprovante de pagamento', 'Comprovante de recebimento', 'Extrato financeiro', 'Fluxo de caixa', 'Relatório consolidado'].map((titulo) => (
          <Bloco key={titulo} titulo={titulo} descricao="Impressão padronizada pelo layout institucional atual do sistema.">
            <Button type="button" onClick={() => imprimirConteudoAtual({ titulo })}>Visualizar e imprimir</Button>
          </Bloco>
        ))}
      </div>
    );
  }

  function renderEmendas() {
    return renderListaSimples(
      'Emendas',
      'Funcionalidade preservada do financeiro para não interromper o que já existia.',
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1"><Label>Identificação</Label><Input value={emendaForm.identificacao} onChange={(event) => setEmendaForm((atual) => ({ ...atual, identificacao: event.target.value }))} /></div>
        <div className="space-y-1"><Label>Data prevista</Label><Input type="date" value={emendaForm.dataPrevista} onChange={(event) => setEmendaForm((atual) => ({ ...atual, dataPrevista: event.target.value }))} /></div>
        <div className="space-y-1"><Label>Valor previsto</Label><Input type="number" min={0} step="0.01" value={emendaForm.valorPrevisto} onChange={(event) => setEmendaForm((atual) => ({ ...atual, valorPrevisto: Number(event.target.value) || 0 }))} /></div>
        <div className="space-y-1"><Label>Status</Label><Input value={emendaForm.status} onChange={(event) => setEmendaForm((atual) => ({ ...atual, status: event.target.value }))} /></div>
      </div>,
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Identificação</th><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
        <tbody>{emendas.length ? emendas.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? 'bg-[var(--g3-card)]' : 'bg-[var(--g3-primary-soft)]/35'}`}><td className="px-3 py-2">{item.identificacao}</td><td className="px-3 py-2">{formatarData(item.dataPrevista)}</td><td className="px-3 py-2">{formatarMoeda(item.valorPrevisto)}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => void atualizarStatusEmendaMutation.mutateAsync({ id: item.id, status: 'Concluída' })}>Concluir</Button></td></tr>) : <tr><td colSpan={5} className="px-3 py-4 text-center text-[var(--g3-muted)]">Nenhuma emenda cadastrada.</td></tr>}</tbody>
      </table>
    );
  }

  const acoes: AdminAction[] = [
    { label: 'Atualizar', icon: Search, onClick: () => void atualizarDados(), variant: 'outline', disabled: processando },
    { label: 'Novo', icon: Plus, onClick: limparFormularioAtual, variant: 'default', disabled: processando },
    { label: 'Salvar', icon: Save, onClick: () => void salvarAtual(), variant: 'default', disabled: processando },
    { label: 'Cancelar', icon: Undo2, onClick: limparFormularioAtual, variant: 'outline', disabled: processando },
    { label: 'Excluir', icon: Trash2, onClick: solicitarExclusao, variant: 'danger', disabled: processando },
    { label: 'Imprimir', icon: Printer, onClick: () => imprimirConteudoAtual({ titulo: `Contabilidade / financeiro - ${abas.find((item) => item.id === abaAtiva)?.label ?? ''}` }), variant: 'outline' },
    { label: 'Fechar', icon: X, onClick: () => navigate('/dashboard/visao-geral'), variant: 'outline' }
  ];

  const codeBadge =
    abaAtiva === 'contas' && contaSelecionadaId
      ? `Conta ${contaSelecionadaId}`
      : ['lancamentos', 'receitas', 'despesas', 'contasPagar', 'contasReceber', 'anexos'].includes(abaAtiva) && lancamentoSelecionadoId
        ? `Lançamento ${lancamentoSelecionadoId}`
        : abaAtiva === 'categorias' && categoriaSelecionadaId
          ? `Categoria ${categoriaSelecionadaId}`
          : abaAtiva === 'centros' && centroSelecionadoId
            ? `Centro ${centroSelecionadoId}`
            : undefined;

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Setor financeiro"
        pageTitle="Contabilidade / financeiro"
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={codeBadge}
      >
        {abaAtiva === 'painel' ? renderPainel() : null}
        {abaAtiva === 'lancamentos' ? renderFormularioLancamentos('Lançamentos', 'Central principal das movimentações financeiras.', lancamentosFiltrados) : null}
        {abaAtiva === 'receitas' ? renderFormularioLancamentos('Receitas', 'Cadastre entradas, confirme recebimentos e acompanhe atrasos.', receitas) : null}
        {abaAtiva === 'despesas' ? renderFormularioLancamentos('Despesas', 'Controle saídas, documentos fiscais e responsáveis.', despesas) : null}
        {abaAtiva === 'contasPagar' ? renderFormularioLancamentos('Contas a pagar', 'Organize obrigações futuras e pagamentos aguardando execução.', contasPagar) : null}
        {abaAtiva === 'contasReceber' ? renderFormularioLancamentos('Contas a receber', 'Acompanhe títulos a receber e receitas em aberto.', contasReceber) : null}
        {abaAtiva === 'fluxoCaixa' ? renderFluxoCaixa() : null}
        {abaAtiva === 'contas' ? renderContas() : null}
        {abaAtiva === 'transferencias' ? renderTransferencias() : null}
        {abaAtiva === 'categorias' ? renderCategorias() : null}
        {abaAtiva === 'centros' ? renderCentros() : null}
        {abaAtiva === 'conciliacao' ? renderConciliacao() : null}
        {abaAtiva === 'compras' ? renderCompras() : null}
        {abaAtiva === 'historico' ? renderHistorico() : null}
        {abaAtiva === 'anexos' ? renderAnexos() : null}
        {abaAtiva === 'relatorios' ? renderRelatorios() : null}
        {abaAtiva === 'impressoes' ? renderImpressoes() : null}
        {abaAtiva === 'emendas' ? renderEmendas() : null}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarExclusao}
        titulo="Confirmar exclusão"
        texto="Esta ação é irreversível. Deseja continuar?"
        processando={processando}
        onCancel={() => setConfirmarExclusao(false)}
        onConfirm={() => void confirmarExclusaoRegistro()}
        confirmarTexto="Excluir"
      />
    </>
  );
}
