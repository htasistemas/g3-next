import { useEffect, useMemo, useState } from 'react';
import {
  FilePlus2,
  FileSignature,
  Files,
  List,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  Upload,
  X,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  AdminPageLayout,
  type AdminAction,
  type AdminTab,
} from '@/components/admin/admin-page-layout';
import { CadastroSucessoModal } from '@/components/admin/cadastro-sucesso-modal';
import {
  PopupConfirmacao,
  PopupMensagem,
  type PopupMensagemState,
} from '@/components/admin/admin-popups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatarCnpj, formatarCpf, formatarMoedaInput, normalizarCnpj, normalizarCpf, normalizarMoeda, validarCnpj, validarCpf } from '@/lib/br-utils';
import { abrirArquivoAutenticado } from '@/lib/arquivos';
import { arquivosService } from '@/services/arquivos.service';
import { projetosService } from '@/services/projetos.service';
import { planoTrabalhoService } from '@/services/plano-trabalho.service';
import { termoFomentoService } from '@/services/termo-fomento.service';
import { contabilidadeService } from '@/services/contabilidade.service';
import { profissionaisService } from '@/services/profissionais.service';
import { prestacaoContasService } from '@/services/prestacao-contas.service';
import type { ContaBancaria } from '@/types/contabilidade';
import type { Profissional } from '@/types/profissional';
import { termosParceriaService, type TermoParceria } from '@/services/termos-parceria.service';
import { reportsService } from '@/services/reports.service';
import { abrirRelatorioPdf } from '@/lib/report-utils';

type Aba = 'listagem' | 'dadosGerais' | 'documentos' | 'aditivos';
const abas: AdminTab[] = [
  { id: 'listagem', label: 'Listagem de termos', icon: List },
  { id: 'dadosGerais', label: 'Dados gerais', icon: FileSignature },
  { id: 'documentos', label: 'Documentos', icon: Files },
  { id: 'aditivos', label: 'Aditivos', icon: FilePlus2 },
];
const tipos = [
  'TERMO_COLABORACAO',
  'TERMO_FOMENTO',
  'TERMO_COOPERACAO',
  'ACORDO_COOPERACAO',
  'CONVENIO',
  'CONTRATO_GESTAO',
  'TERMO_PARCERIA',
  'INSTRUMENTO_PRIVADO',
  'OUTRO',
];
const situacoes = [
  'RASCUNHO',
  'EM_ANALISE',
  'AGUARDANDO_ASSINATURA',
  'VIGENTE',
  'SUSPENSO',
  'ENCERRADO',
  'CANCELADO',
  'RESCINDIDO',
];
const tipoLabel: Record<string, string> = {
  TERMO_COLABORACAO: 'Termo de colaboração',
  TERMO_FOMENTO: 'Termo de fomento',
  TERMO_COOPERACAO: 'Termo de cooperação',
  ACORDO_COOPERACAO: 'Acordo de cooperação',
  CONVENIO: 'Convênio',
  CONTRATO_GESTAO: 'Contrato de gestão',
  TERMO_PARCERIA: 'Termo de parceria',
  INSTRUMENTO_PRIVADO: 'Instrumento privado',
  OUTRO: 'Outro',
};
const situacaoLabel: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  EM_ANALISE: 'Em análise',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura',
  VIGENTE: 'Vigente',
  SUSPENSO: 'Suspenso',
  ENCERRADO: 'Encerrado',
  CANCELADO: 'Cancelado',
  RESCINDIDO: 'Rescindido',
};
const tipificacoes = ['CERTIFICAVEL', 'NAO_CERTIFICAVEL'];
const orgaosCedentes = ['Fundo Municipal da Infância e Adolescência (FIA)', 'Fundo Municipal do Idoso', 'Outro'];
const vazio: Record<string, any> = {
  tipoInstrumento: 'TERMO_FOMENTO',
  numeroInstrumento: '',
  ij: '',
  cnpj: '',
  tipificacao: 'NAO_CERTIFICAVEL',
  numeroVotoComissao: '',
  origemTermo: '',
  nomenclaturaTermo: '',
  responsavelIndicacao: '',
  orgaoCedente: '',
  statusCadastro: 'ATIVO',
  banco: '',
  agencia: '',
  conta: '',
  operacao: '',
  contaBancariaId: '',
  representanteLegal: '',
  representanteCpf: '',
  representanteCargo: '',
  representanteProfissionalId: '',
  ano: new Date().getFullYear(),
  titulo: '',
  objeto: '',
  descricao: '',
  justificativa: '',
  publicoAlvo: '',
  territorio: '',
  projetoId: '',
  unidadeId: '',
  planoTrabalhoId: '',
  termoFomentoId: '',
  concedenteId: '',
  numeroProcesso: '',
  numeroProcessoAdministrativo: '',
  numeroSei: '',
  numeroProposta: '',
  numeroPrograma: '',
  numeroEdital: '',
  unidadeGestora: '',
  orgaoResponsavel: '',
  gestorParceria: '',
  fiscalParceria: '',
  responsavelOrganizacao: '',
  situacao: 'RASCUNHO',
  dataAssinatura: '',
  inicioVigencia: '',
  terminoVigencia: '',
  prazoPrestacaoParcial: '',
  prazoPrestacaoFinal: '',
  permiteProrrogacao: false,
  valorGlobal: 0,
  valorRepasse: 0,
  contrapartidaFinanceira: 0,
  contrapartidaBensServicos: 0,
  recursosProprios: 0,
  quantidadeParcelas: '',
  contaBancariaExclusiva: '',
  fonteRecurso: '',
  baseLegal: '',
  legislacaoAplicavel: '',
  regulamento: '',
  municipio: '',
  estado: '',
  observacoes: '',
};
const data = (value: unknown) => {
  const m = String(value ?? '')
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '—';
};
const moeda = (value: unknown) =>
  Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (value: unknown) => Number(value ?? 0) || 0;
const texto = (value: unknown) => String(value ?? '—').replaceAll('_', ' ');

function Campo({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function CartaoResumo({
  label,
  value,
  destaque = false,
}: {
  label: string;
  value: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--g3-border)] bg-white p-3">
      <p className="text-xs text-[var(--g3-muted)]">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${destaque ? 'text-[var(--g3-active)]' : 'text-slate-900'}`}
      >
        {value}
      </p>
    </div>
  );
}

export function TermosParceriaPage() {
  const [aba, setAba] = useState<Aba>('listagem');
  const [termoId, setTermoId] = useState<string>();
  const [form, setForm] = useState({ ...vazio });
  const [snapshot, setSnapshot] = useState({ ...vazio });
  const [lista, setLista] = useState<TermoParceria[]>([]);
  const [projetos, setProjetos] = useState<Array<{ id: string | number; nome: string }>>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [termosFomento, setTermosFomento] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [concedentes, setConcedentes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroProjeto, setFiltroProjeto] = useState('');
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState({ total: 0, totalPaginas: 1 });
  const [dashboard, setDashboard] = useState<Record<string, any>>({});
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [novoItem, setNovoItem] = useState<Record<string, any>>({});
  const [tipoAditivo, setTipoAditivo] = useState('');
  const [justificativaAditivo, setJustificativaAditivo] = useState('');
  const [inicioAditivo, setInicioAditivo] = useState('');
  const [fimAditivo, setFimAditivo] = useState('');
  const [prorrogacaoVigencia, setProrrogacaoVigencia] = useState(false);
  const [valorTotalPlanoAditivo, setValorTotalPlanoAditivo] = useState(0);
  const [parcelaAditivo, setParcelaAditivo] = useState('');
  const [valorNovaParcelaAditivo, setValorNovaParcelaAditivo] = useState(0);
  const [acrescimoAditivo, setAcrescimoAditivo] = useState(0);
  const [corrigirAPartirParcela, setCorrigirAPartirParcela] = useState('');
  const termoAtual = useMemo(
    () => lista.find((item) => String(item.id) === termoId),
    [lista, termoId],
  );
  const valorDisponivel =
    numero(form.valorRepasse) +
    numero(form.contrapartidaFinanceira) +
    numero(form.contrapartidaBensServicos) +
    numero(form.recursosProprios) -
    (termoAtual?.valorExecutado ?? 0);
  const setCampo = (campo: string, valor: unknown) =>
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  const mensagemErro = (erro: any, padrao: string) => erro?.response?.data?.message ?? padrao;
  const alertaVoto = !form.numeroVotoComissao && form.dataAssinatura && new Date(`${form.dataAssinatura}T00:00:00`).getTime() <= new Date(new Date().setMonth(new Date().getMonth() - 3)).getTime();
  const alertaVigencia = form.terminoVigencia && new Date(`${form.terminoVigencia}T00:00:00`).getTime() - Date.now() <= 90 * 86400000 && new Date(`${form.terminoVigencia}T00:00:00`).getTime() >= Date.now();

  async function carregar() {
    setCarregando(true);
    try {
      const resultado = await termosParceriaService.listar({
        busca: filtro || undefined,
        status: filtroStatus || undefined,
        projetoId: filtroProjeto || undefined,
        pagina,
        limite: 20,
        ordem: 'cadastro',
        direcao: 'desc',
      });
      setLista(resultado.registros);
      setPaginacao({
        total: resultado.paginacao.total,
        totalPaginas: resultado.paginacao.totalPaginas || 1,
      });
    } catch (e) {
      setPopup({
        tipo: 'erro',
        titulo: 'Não foi possível carregar',
        texto: mensagemErro(e, 'Não foi possível carregar os termos de parceria.'),
      });
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => {
    void carregar();
    void termosParceriaService
      .dashboard()
      .then(setDashboard)
      .catch(() => undefined);
    void projetosService
      .listar()
      .then((items) => setProjetos(items.map((item) => ({ id: item.id, nome: item.nome }))))
      .catch(() => undefined);
    void planoTrabalhoService
      .listar()
      .then(setPlanos)
      .catch(() => undefined);
    void termoFomentoService
      .listar()
      .then(setTermosFomento)
      .catch(() => undefined);
    void contabilidadeService
      .listarContasBancarias()
      .then((items) => setContasBancarias(items.filter((item) => item.status === 'ATIVA')))
      .catch(() => undefined);
    void profissionaisService
      .listar({ status: 'ATIVO' })
      .then((resultado) => setProfissionais(resultado.profissionais))
      .catch(() => undefined);
    void prestacaoContasService
      .listarProfissional('concedentes')
      .then(setConcedentes)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    void carregar();
  }, [pagina, filtroStatus, filtroProjeto]);
  function novo() {
    setTermoId(undefined);
    setForm({ ...vazio });
    setSnapshot({ ...vazio });
    setNovoItem({});
    setAba('dadosGerais');
  }
  function preencherContaBancaria(contaId: string) {
    const conta = contasBancarias.find((item) => String(item.id) === contaId);
    if (!conta) return;
    const numeroConta = [conta.numero?.trim(), conta.digito?.trim()].filter(Boolean).join('-');
    const operacao = conta.tipo === 'CONTA_CORRENTE' ? 'Conta corrente' : conta.tipo === 'POUPANCA' ? 'Poupança' : conta.tipo === 'APLICACAO' ? 'Aplicação' : 'Caixa interno';
    setForm((atual) => ({ ...atual, contaBancariaId: contaId, banco: conta.banco ?? atual.banco, agencia: conta.agencia ?? atual.agencia, conta: numeroConta || atual.conta, operacao }));
  }
  function preencherRepresentante(profissionalId: string) {
    const profissional = profissionais.find((item) => String(item.id_profissional) === profissionalId);
    if (!profissional) return;
    setForm((atual) => ({ ...atual, representanteProfissionalId: profissionalId, representanteLegal: profissional.nome_completo, representanteCpf: normalizarCpf(profissional.cpf), representanteCargo: profissional.categoria || atual.representanteCargo }));
  }
  async function selecionar(item: TermoParceria) {
    try {
      const detalhe = await termosParceriaService.obter(String(item.id));
      setTermoId(String(item.id));
      setForm({
        ...vazio,
        ...detalhe,
        projetoId: String(detalhe.projetoId ?? ''),
        unidadeId: String(detalhe.unidadeId ?? ''),
      });
      setSnapshot({ ...vazio, ...detalhe });
      setAba('dadosGerais');
    } catch (e) {
      setPopup({
        tipo: 'erro',
        titulo: 'Não foi possível abrir',
        texto: mensagemErro(e, 'Não foi possível abrir o termo de parceria.'),
      });
    }
  }
  async function salvar() {
    if (!form.tipoInstrumento || !form.projetoId || String(form.objeto).trim().length < 5 || !form.numeroInstrumento || !validarCnpj(form.cnpj) || !form.origemTermo || !form.nomenclaturaTermo || !form.banco || !form.agencia || !form.conta || !form.operacao || !form.dataAssinatura || !form.inicioVigencia || !form.terminoVigencia || !form.representanteLegal || !validarCpf(form.representanteCpf) || !form.representanteCargo || !form.orgaoCedente) {
      setPopup({
        tipo: 'aviso',
        titulo: 'Validação',
        texto: 'Preencha os campos obrigatórios do termo, incluindo CNPJ, conta bancária, vigência e representante legal.',
      });
      return;
    }
    setSalvando(true);
    try {
      const resultado = termoId
        ? await termosParceriaService.atualizar(termoId, form)
        : await termosParceriaService.criar(form);
      setTermoId(String(resultado.id));
      setForm({ ...vazio, ...resultado });
      setSnapshot({ ...vazio, ...resultado });
      setSucesso(!termoId);
      await carregar();
      setAba('listagem');
    } catch (e) {
      setPopup({
        tipo: 'erro',
        titulo: 'Não foi possível salvar',
        texto: mensagemErro(e, 'Verifique os campos destacados e tente novamente.'),
      });
    } finally {
      setSalvando(false);
    }
  }
  async function gerarRelatorioPorProjeto() {
    try {
      const blob = await reportsService.gerarRelacaoTermosParceria({
        projetoId: filtroProjeto || undefined,
        status: filtroStatus || undefined,
        busca: filtro || undefined,
      });
      abrirRelatorioPdf(blob);
    } catch (e) {
      setPopup({ tipo: 'erro', titulo: 'Não foi possível gerar o relatório', texto: mensagemErro(e, 'Não foi possível preparar o relatório por projeto.') });
    }
  }
  async function gerarRelatorioCompleto() {
    if (!termoId) {
      setPopup({ tipo: 'aviso', titulo: 'Selecione um termo', texto: 'Abra um termo antes de gerar o relatório completo.' });
      return;
    }
    try {
      const blob = await reportsService.gerarTermoParceriaCompleto({ termoId });
      abrirRelatorioPdf(blob);
    } catch (e) {
      setPopup({ tipo: 'erro', titulo: 'Não foi possível gerar o relatório', texto: mensagemErro(e, 'Não foi possível preparar o relatório completo do termo.') });
    }
  }
  async function excluir() {
    if (!termoId) return;
    setSalvando(true);
    try {
      await termosParceriaService.excluir(termoId);
      setConfirmarExclusao(false);
      novo();
      await carregar();
      setPopup({
        tipo: 'sucesso',
        titulo: 'Termo excluído',
        texto: 'O termo foi excluído logicamente e permanece no histórico.',
      });
    } catch (e) {
      setPopup({
        tipo: 'erro',
        titulo: 'Não foi possível excluir',
        texto: mensagemErro(e, 'Não foi possível excluir o termo.'),
      });
    } finally {
      setSalvando(false);
    }
  }
  async function adicionarItem(entidade: string) {
    if (!termoId) {
      setPopup({
        tipo: 'aviso',
        titulo: 'Salve o termo',
        texto: 'Salve o termo antes de incluir itens de execução.',
      });
      return;
    }
    setSalvando(true);
    try {
      await termosParceriaService.criarItem(termoId, entidade, novoItem);
      const atualizado = await termosParceriaService.obter(termoId);
      setForm((anterior) => ({ ...anterior, ...atualizado }));
      setNovoItem({});
      setPopup({
        tipo: 'sucesso',
        titulo: 'Registro adicionado',
        texto: 'O item foi vinculado ao termo de parceria.',
      });
    } catch (e) {
      setPopup({
        tipo: 'erro',
        titulo: 'Não foi possível adicionar',
        texto: mensagemErro(e, 'Verifique os dados informados.'),
      });
    } finally {
      setSalvando(false);
    }
  }
  async function removerItem(entidade: string, id: string) {
    if (!termoId) return;
    try {
      await termosParceriaService.excluirItem(termoId, entidade, id);
      const atualizado = await termosParceriaService.obter(termoId);
      setForm((anterior) => ({ ...anterior, ...atualizado }));
    } catch (e) {
      setPopup({
        tipo: 'erro',
        titulo: 'Não foi possível excluir',
        texto: mensagemErro(e, 'O registro não pôde ser excluído.'),
      });
    }
  }
  async function enviarDocumento() {
    if (!termoId || !arquivo) {
      setPopup({
        tipo: 'aviso',
        titulo: 'Salve o termo',
        texto: 'Salve o termo e selecione um arquivo antes de enviar.',
      });
      return;
    }
    setSalvando(true);
    try {
      const enviado = await arquivosService.uploadPorEntidade({
        scope: 'prestacao_contas_documento',
        entidadeTipo: 'prestacao_contas',
        entidadeId: termoId,
        arquivo,
      });
      await termosParceriaService.criarItem(termoId, 'documentos', {
        categoria: 'OUTROS',
        tipo: 'Documento do termo',
        descricao: enviado.nomeOriginal,
        arquivoId: enviado.id,
        nomeOriginal: enviado.nomeOriginal,
      });
      setArquivo(null);
      setPopup({
        tipo: 'sucesso',
        titulo: 'Documento enviado',
        texto: 'O arquivo foi armazenado e vinculado ao termo.',
      });
      const atualizado = await termosParceriaService.obter(termoId);
      setForm((anterior) => ({ ...anterior, ...atualizado }));
    } catch (e) {
      setPopup({
        tipo: 'erro',
        titulo: 'Não foi possível enviar',
        texto: mensagemErro(e, 'Não foi possível enviar o documento.'),
      });
    } finally {
      setSalvando(false);
    }
  }
  async function adicionarAditivo() {
    if (!termoId || !tipoAditivo.trim() || !justificativaAditivo.trim()) {
      setPopup({
        tipo: 'aviso',
        titulo: 'Validação',
        texto: 'Informe o tipo e a justificativa do aditivo.',
      });
      return;
    }
    if (prorrogacaoVigencia && (!inicioAditivo || !fimAditivo || !parcelaAditivo.trim() || valorNovaParcelaAditivo <= 0)) {
      setPopup({ tipo: 'aviso', titulo: 'Validação', texto: 'Na prorrogação, informe o início, o término, a parcela e o valor da nova parcela.' });
      return;
    }
    if (acrescimoAditivo > 0 && !corrigirAPartirParcela.trim()) {
      setPopup({ tipo: 'aviso', titulo: 'Validação', texto: 'Informe a parcela a partir da qual o acréscimo será corrigido.' });
      return;
    }
    setSalvando(true);
    try {
      await termosParceriaService.criarAditivo(termoId, {
        numero: `${form.numeroInstrumento || 'TERMO'}-AD-${(termoAtual?.aditivos?.length ?? 0) + 1}`,
        tipo: tipoAditivo,
        justificativa: justificativaAditivo,
        dataAditivo: new Date().toISOString().slice(0, 10),
        novaVigenciaInicio: inicioAditivo || null,
        novaVigenciaFim: fimAditivo || null,
        prorrogacaoVigencia,
        valorTotalPlano: numero(valorTotalPlanoAditivo || form.valorGlobal),
        parcela: parcelaAditivo || null,
        valorNovaParcela: numero(valorNovaParcelaAditivo),
        valorAnterior: numero(form.valorGlobal),
        acrescimo: numero(acrescimoAditivo),
        corrigirAPartirParcela: corrigirAPartirParcela || null,
        novoValor: numero(form.valorGlobal) + numero(acrescimoAditivo),
      });
      const atualizado = await termosParceriaService.obter(termoId);
      setForm((anterior) => ({ ...anterior, ...atualizado }));
      setTipoAditivo('');
      setJustificativaAditivo('');
      setInicioAditivo('');
      setFimAditivo('');
      setProrrogacaoVigencia(false);
      setValorTotalPlanoAditivo(0);
      setParcelaAditivo('');
      setValorNovaParcelaAditivo(0);
      setAcrescimoAditivo(0);
      setCorrigirAPartirParcela('');
      setPopup({
        tipo: 'sucesso',
        titulo: 'Aditivo adicionado',
        texto: 'O aditivo foi registrado no histórico do termo.',
      });
    } catch (e) {
      setPopup({
        tipo: 'erro',
        titulo: 'Não foi possível adicionar',
        texto: mensagemErro(e, 'Não foi possível adicionar o aditivo.'),
      });
    } finally {
      setSalvando(false);
    }
  }
  const acoes: AdminAction[] = [
    {
      label: 'Buscar',
      icon: Search,
      onClick: () => {
        setAba('listagem');
        void carregar();
      },
      variant: 'outline',
    },
    { label: 'Relatório por projeto', icon: Printer, onClick: () => void gerarRelatorioPorProjeto(), variant: 'outline' },
    { label: 'Relatório completo', icon: Files, onClick: () => void gerarRelatorioCompleto(), variant: 'outline', disabled: !termoId },
    { label: 'Novo', icon: Plus, onClick: novo, variant: 'default' },
    {
      label: 'Salvar',
      icon: Save,
      onClick: () => void salvar(),
      variant: 'default',
      disabled: salvando || aba !== 'dadosGerais',
    },
    {
      label: 'Cancelar',
      icon: Undo2,
      onClick: () => {
        setForm({ ...snapshot });
        setAba('listagem');
      },
      variant: 'outline',
      disabled: salvando,
    },
    {
      label: 'Duplicar termo',
      icon: FilePlus2,
      onClick: () => {
        setTermoId(undefined);
        setForm({ ...form, id: undefined, numeroInstrumento: '', situacao: 'RASCUNHO' });
        setAba('dadosGerais');
      },
      variant: 'outline',
      disabled: !termoId,
    },
    {
      label: 'Excluir',
      icon: Trash2,
      onClick: () => setConfirmarExclusao(true),
      variant: 'danger',
      disabled: !termoId,
    },
    { label: 'Imprimir', icon: Printer, onClick: () => window.print(), variant: 'outline' },
    { label: 'Fechar', icon: X, onClick: () => setAba('listagem'), variant: 'outline' },
  ];
  const executar = form.despesas ?? [];
  const recebido = numero(
    form.receitas?.reduce((s: number, item: any) => s + numero(item.valorRecebido), 0),
  );
  const executado = numero(
    executar.reduce((s: number, item: any) => s + numero(item.valorLiquido), 0),
  );

  return (
    <>
      <AdminPageLayout
        sectionLabel="Jurídico e Compliance"
        pageTitle="Termos de parceria"
        tabs={abas}
        activeTab={aba}
        onChangeTab={(id) => setAba(id as Aba)}
        actions={acoes}
        activeTitle={abas.find((item) => item.id === aba)?.label}
        codeBadge={termoId ? `Código: ${termoId}` : 'Novo'}
      >
        {aba === 'listagem' ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <CartaoResumo
                label="Parcerias vigentes"
                value={String(dashboard.vigentes ?? 0)}
                destaque
              />
              <CartaoResumo label="Em elaboração" value={String(dashboard.emElaboracao ?? 0)} />
              <CartaoResumo label="A vencer em 30 dias" value={String(dashboard.aVencer ?? 0)} />
              <CartaoResumo
                label="Valor contratado"
                value={moeda(dashboard.valorTotalContratado)}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
              <div>
                <Label>Pesquisar termo</Label>
                <Input
                  placeholder="Número, título, objeto ou situação"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPagina(1);
                      void carregar();
                    }
                  }}
                />
              </div>
              <div>
                <Label>Situação</Label>
                <Select
                  value={filtroStatus}
                  onChange={(e) => {
                    setFiltroStatus(e.target.value);
                    setPagina(1);
                  }}
                >
                  <option value="">Todas as situações</option>
                  {situacoes.map((item) => (
                    <option key={item} value={item}>
                      {situacaoLabel[item]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Projeto</Label>
                <Select
                  value={filtroProjeto}
                  onChange={(e) => {
                    setFiltroProjeto(e.target.value);
                    setPagina(1);
                  }}
                >
                  <option value="">Todos os projetos</option>
                  {projetos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => {
                  setFiltro('');
                  setFiltroStatus('');
                  setFiltroProjeto('');
                  setPagina(1);
                }}
              >
                Limpar filtros
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Número</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Referente a</th>
                    <th className="px-3 py-2 text-left">Vigência</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2 text-left">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-t border-[var(--g3-border)] hover:bg-[var(--g3-primary-soft)]/40"
                      onClick={() => void selecionar(item)}
                    >
                      <td className="px-3 py-2 font-medium">
                        {item.numeroInstrumento || 'Sem número'}
                      </td>
                      <td className="px-3 py-2">
                        {tipoLabel[item.tipoInstrumento] ?? texto(item.tipoInstrumento)}
                      </td>
                      <td className="px-3 py-2">{item.objeto || item.titulo || '—'}</td>
                      <td className="px-3 py-2">
                        {data(item.inicioVigencia)} a {data(item.terminoVigencia)}
                      </td>
                      <td className="px-3 py-2 text-right">{moeda(item.valorGlobal)}</td>
                      <td className="px-3 py-2">
                        {situacaoLabel[item.situacao] ?? texto(item.situacao)}
                      </td>
                    </tr>
                  ))}
                  {!carregando && !lista.length ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center">
                        Nenhum termo encontrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              {carregando ? <p className="p-4 text-center text-sm">Carregando termos...</p> : null}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>{paginacao.total} termo(s) encontrado(s)</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="rounded border px-3 py-2">
                  Página {pagina} de {paginacao.totalPaginas}
                </span>
                <Button
                  variant="outline"
                  disabled={pagina >= paginacao.totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </section>
        ) : null}
        {aba === 'dadosGerais' ? (
          <section className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <CartaoResumo label="Valor global" value={moeda(form.valorGlobal)} destaque />
              <CartaoResumo label="Total recebido" value={moeda(recebido || form.valorRecebido)} />
              <CartaoResumo
                label="Total executado"
                value={moeda(executado || form.valorExecutado)}
              />
              <CartaoResumo label="Saldo disponível" value={moeda(valorDisponivel)} />
            </div>
            <div className="rounded-lg border border-[var(--g3-border)] p-4">
              <h3 className="font-semibold text-[var(--g3-active)]">Conta bancária do termo</h3>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">Selecione uma conta ativa cadastrada em Contabilidade para preencher os dados automaticamente.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <Campo label="Conta cadastrada *" className="md:col-span-4">
                  <Select value={String(form.contaBancariaId ?? '')} onChange={(e) => preencherContaBancaria(e.target.value)}>
                    <option value="">Selecione uma conta bancária ativa</option>
                    {contasBancarias.map((item) => <option key={item.id} value={item.id}>{item.nomeConta} — {item.banco} / {item.numero}{item.digito ? `-${item.digito}` : ''}</option>)}
                  </Select>
                </Campo>
                <Campo label="Banco *"><Input value={form.banco ?? ''} onChange={(e) => setCampo('banco', e.target.value)} /></Campo>
                <Campo label="Agência *"><Input value={form.agencia ?? ''} onChange={(e) => setCampo('agencia', e.target.value)} /></Campo>
                <Campo label="Conta *"><Input value={form.conta ?? ''} onChange={(e) => setCampo('conta', e.target.value)} /></Campo>
                <Campo label="Operação *"><Input value={form.operacao ?? ''} onChange={(e) => setCampo('operacao', e.target.value)} /></Campo>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--g3-border)] p-4">
              <h3 className="font-semibold text-[var(--g3-active)]">Representante legal</h3>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">Selecione um profissional ativo cadastrado. Nome, CPF e categoria serão preenchidos automaticamente.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Campo label="Profissional cadastrado *" className="md:col-span-3">
                  <Select value={String(form.representanteProfissionalId ?? '')} onChange={(e) => preencherRepresentante(e.target.value)}>
                    <option value="">Selecione o representante legal</option>
                    {profissionais.map((item) => <option key={item.id_profissional} value={item.id_profissional}>{item.nome_completo}{item.categoria ? ` — ${item.categoria}` : ''}</option>)}
                  </Select>
                </Campo>
                <Campo label="Representante legal *"><Input value={form.representanteLegal ?? ''} onChange={(e) => setCampo('representanteLegal', e.target.value)} /></Campo>
                <Campo label="CPF do representante *"><Input value={formatarCpf(form.representanteCpf)} onChange={(e) => setCampo('representanteCpf', normalizarCpf(e.target.value))} maxLength={14} /></Campo>
                <Campo label="Cargo/função *"><Input value={form.representanteCargo ?? ''} onChange={(e) => setCampo('representanteCargo', e.target.value)} /></Campo>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--g3-border)] p-4">
              <h3 className="font-semibold text-[var(--g3-active)]">Identificação e vínculos</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Campo label="Tipo de instrumento *">
                  <Select
                    value={form.tipoInstrumento}
                    onChange={(e) => setCampo('tipoInstrumento', e.target.value)}
                  >
                    {tipos.map((item) => (
                      <option key={item} value={item}>
                        {tipoLabel[item]}
                      </option>
                    ))}
                  </Select>
                </Campo>
                <Campo label="Número do termo *">
                  <Input
                    value={form.numeroInstrumento ?? ''}
                    onChange={(e) => setCampo('numeroInstrumento', e.target.value)}
                  />
                </Campo>
                <Campo label="IJ">
                  <Input value={form.ij ?? ''} onChange={(e) => setCampo('ij', e.target.value)} />
                </Campo>
                <Campo label="CNPJ *">
                  <Input value={formatarCnpj(form.cnpj)} onChange={(e) => setCampo('cnpj', normalizarCnpj(e.target.value))} maxLength={18} />
                </Campo>
                <Campo label="Tipificação *">
                  <Select value={form.tipificacao} onChange={(e) => setCampo('tipificacao', e.target.value)}>
                    {tipificacoes.map((item) => <option key={item} value={item}>{item === 'CERTIFICAVEL' ? 'Certificável' : 'Não certificável'}</option>)}
                  </Select>
                </Campo>
                <Campo label="Ano">
                  <Input
                    type="number"
                    min="1900"
                    max="2200"
                    value={form.ano ?? ''}
                    onChange={(e) => setCampo('ano', Number(e.target.value))}
                  />
                </Campo>
                <Campo label="Projeto vinculado *">
                  <Select
                    value={String(form.projetoId ?? '')}
                    onChange={(e) => setCampo('projetoId', e.target.value)}
                  >
                    <option value="">Selecione o projeto</option>
                    {projetos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </Select>
                </Campo>
                <Campo label="Plano de trabalho">
                  <Select
                    value={String(form.planoTrabalhoId ?? '')}
                    onChange={(e) => setCampo('planoTrabalhoId', e.target.value)}
                  >
                    <option value="">Selecione o plano de trabalho</option>
                    {planos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome || item.titulo || `Plano ${item.id}`}
                      </option>
                    ))}
                  </Select>
                </Campo>
                <Campo label="Termo de fomento relacionado">
                  <Select
                    value={String(form.termoFomentoId ?? '')}
                    onChange={(e) => setCampo('termoFomentoId', e.target.value)}
                  >
                    <option value="">Nenhum termo de fomento relacionado</option>
                    {termosFomento.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.numeroTermo || item.numero_termo || `Termo ${item.id}`} — {item.referenteA || item.referenciaTermo || item.objeto || ''}
                      </option>
                    ))}
                  </Select>
                </Campo>
                <Campo label="Situação *">
                  <Select
                    value={form.situacao}
                    onChange={(e) => setCampo('situacao', e.target.value)}
                  >
                    {situacoes.map((item) => (
                      <option key={item} value={item}>
                        {situacaoLabel[item]}
                      </option>
                    ))}
                  </Select>
                </Campo>
                <Campo label="Nomenclatura conforme o termo *" className="md:col-span-2">
                  <Input
                    value={form.nomenclaturaTermo ?? ''}
                    onChange={(e) => { setCampo('nomenclaturaTermo', e.target.value); setCampo('titulo', e.target.value); }}
                  />
                </Campo>
                <Campo label="Órgão cedente *">
                  <Select value={form.orgaoCedente ?? ''} onChange={(e) => setCampo('orgaoCedente', e.target.value)}>
                    <option value="">Selecione o órgão cedente</option>
                    {orgaosCedentes.map((item) => <option key={item} value={item}>{item}</option>)}
                  </Select>
                </Campo>
                <Campo label="Órgão concedente cadastrado">
                  <Select value={String(form.concedenteId ?? '')} onChange={(e) => setCampo('concedenteId', e.target.value)}>
                    <option value="">Selecione um concedente cadastrado</option>
                    {concedentes.map((item) => <option key={item.id} value={item.id}>{item.razaoSocial || item.nome || `Concedente ${item.id}`}{item.cpfCnpj ? ` — ${item.cpfCnpj}` : ''}</option>)}
                  </Select>
                </Campo>
                <Campo label="Nº do voto da Comissão Diretiva da União">
                  <Input value={form.numeroVotoComissao ?? ''} onChange={(e) => setCampo('numeroVotoComissao', e.target.value)} />
                </Campo>
                <Campo label="Origem do termo (origem da verba) *">
                  <Input value={form.origemTermo ?? ''} onChange={(e) => setCampo('origemTermo', e.target.value)} />
                </Campo>
                <Campo label="Responsável pela indicação">
                  <Input value={form.responsavelIndicacao ?? ''} onChange={(e) => setCampo('responsavelIndicacao', e.target.value)} />
                </Campo>
                <Campo label="Status do cadastro *">
                  <Select value={form.statusCadastro ?? 'ATIVO'} onChange={(e) => setCampo('statusCadastro', e.target.value)}>
                    <option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option>
                  </Select>
                </Campo>
                <Campo label="Número do processo">
                  <Input
                    value={form.numeroProcesso ?? ''}
                    onChange={(e) => setCampo('numeroProcesso', e.target.value)}
                  />
                </Campo>
                <Campo label="Processo administrativo">
                  <Input
                    value={form.numeroProcessoAdministrativo ?? ''}
                    onChange={(e) => setCampo('numeroProcessoAdministrativo', e.target.value)}
                  />
                </Campo>
                <Campo label="Número SEI">
                  <Input
                    value={form.numeroSei ?? ''}
                    onChange={(e) => setCampo('numeroSei', e.target.value)}
                  />
                </Campo>
                <Campo label="Número da proposta">
                  <Input
                    value={form.numeroProposta ?? ''}
                    onChange={(e) => setCampo('numeroProposta', e.target.value)}
                  />
                </Campo>
                <Campo label="Número do programa">
                  <Input
                    value={form.numeroPrograma ?? ''}
                    onChange={(e) => setCampo('numeroPrograma', e.target.value)}
                  />
                </Campo>
                <Campo label="Número do edital">
                  <Input
                    value={form.numeroEdital ?? ''}
                    onChange={(e) => setCampo('numeroEdital', e.target.value)}
                  />
                </Campo>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--g3-border)] p-4">
              <h3 className="font-semibold text-[var(--g3-active)]">
                Objeto, público e responsabilidades
              </h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Campo label="Objeto da parceria *" className="md:col-span-2">
                  <Textarea
                    rows={4}
                    value={form.objeto ?? ''}
                    onChange={(e) => setCampo('objeto', e.target.value)}
                  />
                </Campo>
                <Campo label="Descrição complementar">
                  <Textarea
                    rows={3}
                    value={form.descricao ?? ''}
                    onChange={(e) => setCampo('descricao', e.target.value)}
                  />
                </Campo>
                <Campo label="Justificativa">
                  <Textarea
                    rows={3}
                    value={form.justificativa ?? ''}
                    onChange={(e) => setCampo('justificativa', e.target.value)}
                  />
                </Campo>
                <Campo label="Público-alvo">
                  <Textarea
                    rows={2}
                    value={form.publicoAlvo ?? ''}
                    onChange={(e) => setCampo('publicoAlvo', e.target.value)}
                  />
                </Campo>
                <Campo label="Território de execução">
                  <Textarea
                    rows={2}
                    value={form.territorio ?? ''}
                    onChange={(e) => setCampo('territorio', e.target.value)}
                  />
                </Campo>
                <Campo label="Gestor da parceria">
                  <Input
                    value={form.gestorParceria ?? ''}
                    onChange={(e) => setCampo('gestorParceria', e.target.value)}
                  />
                </Campo>
                <Campo label="Fiscal da parceria">
                  <Input
                    value={form.fiscalParceria ?? ''}
                    onChange={(e) => setCampo('fiscalParceria', e.target.value)}
                  />
                </Campo>
                <Campo label="Responsável pela organização">
                  <Input
                    value={form.responsavelOrganizacao ?? ''}
                    onChange={(e) => setCampo('responsavelOrganizacao', e.target.value)}
                  />
                </Campo>
                <Campo label="Órgão responsável">
                  <Input
                    value={form.orgaoResponsavel ?? ''}
                    onChange={(e) => setCampo('orgaoResponsavel', e.target.value)}
                  />
                </Campo>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--g3-border)] p-4">
              <h3 className="font-semibold text-[var(--g3-active)]">
                Vigência, recursos e prestação de contas
              </h3>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <Campo label="Data de assinatura">
                  <Input
                    type="date"
                    value={form.dataAssinatura ?? ''}
                    onChange={(e) => setCampo('dataAssinatura', e.target.value)}
                  />
                </Campo>
                <Campo label="Início da vigência">
                  <Input
                    type="date"
                    value={form.inicioVigencia ?? ''}
                    onChange={(e) => setCampo('inicioVigencia', e.target.value)}
                  />
                </Campo>
                <Campo label="Fim da vigência">
                  <Input
                    type="date"
                    value={form.terminoVigencia ?? ''}
                    onChange={(e) => setCampo('terminoVigencia', e.target.value)}
                  />
                </Campo>
                {alertaVoto ? <div className="md:col-span-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Informe o nº do voto da Comissão Diretiva da União. Já se passaram três meses desde a assinatura.</div> : null}
                {alertaVigencia ? <div className="md:col-span-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">A vigência do termo termina em até 90 dias.</div> : null}
                <Campo label="Quantidade de parcelas">
                  <Input
                    type="number"
                    min="0"
                    value={form.quantidadeParcelas ?? ''}
                    onChange={(e) => setCampo('quantidadeParcelas', Number(e.target.value))}
                  />
                </Campo>
                {(
                  [
                    ['valorGlobal', 'Valor global'],
                    ['valorRepasse', 'Valor do repasse'],
                    ['contrapartidaFinanceira', 'Contrapartida financeira'],
                    ['contrapartidaBensServicos', 'Contrapartida em bens e serviços'],
                    ['recursosProprios', 'Recursos próprios'],
                  ] as const
                ).map(([key, label]) => (
                  <Campo key={key} label={label}>
                    <Input
                      inputMode="decimal"
                      value={formatarMoedaInput(form[key] ?? 0)}
                      onChange={(e) => setCampo(key, normalizarMoeda(e.target.value))}
                    />
                  </Campo>
                ))}
                <Campo label="Prazo da prestação parcial (dias)">
                  <Input
                    type="number"
                    min="0"
                    value={form.prazoPrestacaoParcial ?? ''}
                    onChange={(e) => setCampo('prazoPrestacaoParcial', Number(e.target.value))}
                  />
                </Campo>
                <Campo label="Prazo da prestação final (dias)">
                  <Input
                    type="number"
                    min="0"
                    value={form.prazoPrestacaoFinal ?? ''}
                    onChange={(e) => setCampo('prazoPrestacaoFinal', Number(e.target.value))}
                  />
                </Campo>
                <Campo label="Fonte do recurso">
                  <Input
                    value={form.fonteRecurso ?? ''}
                    onChange={(e) => setCampo('fonteRecurso', e.target.value)}
                  />
                </Campo>
                <Campo label="Conta bancária exclusiva">
                  <Input
                    value={form.contaBancariaExclusiva ?? ''}
                    onChange={(e) => setCampo('contaBancariaExclusiva', e.target.value)}
                  />
                </Campo>
                <Campo label="Município">
                  <Input
                    value={form.municipio ?? ''}
                    onChange={(e) => setCampo('municipio', e.target.value)}
                  />
                </Campo>
                <Campo label="UF">
                  <Input
                    maxLength={2}
                    value={form.estado ?? ''}
                    onChange={(e) => setCampo('estado', e.target.value.toUpperCase())}
                  />
                </Campo>
                <label className="flex items-center gap-2 pt-6 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form.permiteProrrogacao)}
                    onChange={(e) => setCampo('permiteProrrogacao', e.target.checked)}
                  />{' '}
                  Permite prorrogação
                </label>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--g3-border)] p-4">
              <h3 className="font-semibold text-[var(--g3-active)]">
                Plano de trabalho e execução
              </h3>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">
                Cadastre metas, rubricas, recebimentos e despesas vinculados ao termo. Os vínculos e
                saldos são validados no backend.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded border p-3">
                  <h4 className="font-semibold">Metas e indicadores</h4>
                  <div className="mt-2 grid gap-2">
                    <Input
                      placeholder="Descrição da meta"
                      value={novoItem.descricao ?? ''}
                      onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })}
                    />
                    <Input
                      placeholder="Indicador"
                      value={novoItem.indicador ?? ''}
                      onChange={(e) => setNovoItem({ ...novoItem, indicador: e.target.value })}
                    />
                    <Input
                      placeholder="Quantidade prevista"
                      type="number"
                      value={novoItem.quantidadePrevista ?? ''}
                      onChange={(e) =>
                        setNovoItem({ ...novoItem, quantidadePrevista: Number(e.target.value) })
                      }
                    />
                    <Button
                      variant="outline"
                      onClick={() => void adicionarItem('metas')}
                      disabled={salvando || !novoItem.descricao}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Adicionar meta
                    </Button>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    {(form.metas ?? []).map((item: any) => (
                      <div key={item.id} className="flex justify-between gap-2 border-t py-2">
                        <span>
                          {item.descricao}
                          {item.indicador ? ` — ${item.indicador}` : ''}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void removerItem('metas', String(item.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded border p-3">
                  <h4 className="font-semibold">Rubricas e orçamento</h4>
                  <div className="mt-2 grid gap-2">
                    <Input
                      placeholder="Categoria"
                      value={novoItem.categoria ?? ''}
                      onChange={(e) => setNovoItem({ ...novoItem, categoria: e.target.value })}
                    />
                    <Input
                      placeholder="Descrição da rubrica"
                      value={novoItem.descricao ?? ''}
                      onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })}
                    />
                    <Input
                      placeholder="Valor total"
                      inputMode="decimal"
                      value={formatarMoedaInput(novoItem.valorTotal ?? 0)}
                      onChange={(e) =>
                        setNovoItem({ ...novoItem, valorTotal: normalizarMoeda(e.target.value) })
                      }
                    />
                    <Button
                      variant="outline"
                      onClick={() => void adicionarItem('rubricas')}
                      disabled={salvando || !novoItem.categoria || !novoItem.descricao}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Adicionar rubrica
                    </Button>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    {(form.rubricas ?? []).map((item: any) => (
                      <div key={item.id} className="flex justify-between gap-2 border-t py-2">
                        <span>
                          {item.categoria} — {moeda(item.valorTotal)}
                          <small className="block text-xs text-[var(--g3-muted)]">
                            Saldo:{' '}
                            {moeda(
                              numero(item.valorTotal) -
                                numero(item.valorComprometido) -
                                numero(item.valorPago),
                            )}
                          </small>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void removerItem('rubricas', String(item.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded border p-3">
                  <h4 className="font-semibold">Recebimentos</h4>
                  <div className="mt-2 grid gap-2">
                    <Input
                      placeholder="Parcela"
                      value={novoItem.parcela ?? ''}
                      onChange={(e) => setNovoItem({ ...novoItem, parcela: e.target.value })}
                    />
                    <Input
                      type="date"
                      aria-label="Data de desembolso"
                      value={novoItem.dataDesembolso ?? ''}
                      onChange={(e) => setNovoItem({ ...novoItem, dataDesembolso: e.target.value })}
                    />
                    <Input
                      placeholder="Valor previsto"
                      inputMode="decimal"
                      value={formatarMoedaInput(novoItem.valorPrevisto ?? 0)}
                      onChange={(e) =>
                        setNovoItem({ ...novoItem, valorPrevisto: normalizarMoeda(e.target.value) })
                      }
                    />
                    <Input
                      placeholder="Valor recebido"
                      inputMode="decimal"
                      value={formatarMoedaInput(novoItem.valorRecebido ?? 0)}
                      onChange={(e) =>
                        setNovoItem({ ...novoItem, valorRecebido: normalizarMoeda(e.target.value) })
                      }
                    />
                    <Button
                      variant="outline"
                      onClick={() => void adicionarItem('receitas')}
                      disabled={salvando}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Adicionar recebimento
                    </Button>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    {(form.receitas ?? []).map((item: any) => (
                      <div key={item.id} className="flex justify-between gap-2 border-t py-2">
                        <span>
                          Parcela {item.parcela || '—'} — {moeda(item.valorPrevisto)} — desembolso {data(item.dataDesembolso || item.dataPrevista)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void removerItem('receitas', String(item.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded border p-3">
                  <h4 className="font-semibold">Despesas executadas</h4>
                  <div className="mt-2 grid gap-2">
                    <Input
                      placeholder="Fornecedor"
                      value={novoItem.fornecedor ?? ''}
                      onChange={(e) => setNovoItem({ ...novoItem, fornecedor: e.target.value })}
                    />
                    <Input
                      placeholder="Descrição da despesa"
                      value={novoItem.descricao ?? ''}
                      onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })}
                    />
                    <Input
                      placeholder="Valor líquido"
                      inputMode="decimal"
                      value={formatarMoedaInput(novoItem.valorLiquido ?? 0)}
                      onChange={(e) =>
                        setNovoItem({ ...novoItem, valorLiquido: normalizarMoeda(e.target.value) })
                      }
                    />
                    <Input
                      placeholder="ID da rubrica"
                      value={novoItem.rubricaId ?? ''}
                      onChange={(e) => setNovoItem({ ...novoItem, rubricaId: e.target.value })}
                    />
                    <Button
                      variant="outline"
                      onClick={() => void adicionarItem('despesas')}
                      disabled={salvando || !novoItem.descricao}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Adicionar despesa
                    </Button>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    {(form.despesas ?? []).map((item: any) => (
                      <div key={item.id} className="flex justify-between gap-2 border-t py-2">
                        <span>
                          {item.fornecedor || 'Fornecedor não informado'} —{' '}
                          {moeda(item.valorLiquido)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void removerItem('despesas', String(item.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--g3-border)] p-4">
              <h3 className="font-semibold">Legislação e observações</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Campo label="Base legal">
                  <Textarea
                    rows={2}
                    value={form.baseLegal ?? ''}
                    onChange={(e) => setCampo('baseLegal', e.target.value)}
                  />
                </Campo>
                <Campo label="Legislação aplicável">
                  <Textarea
                    rows={2}
                    value={form.legislacaoAplicavel ?? ''}
                    onChange={(e) => setCampo('legislacaoAplicavel', e.target.value)}
                  />
                </Campo>
                <Campo label="Regulamento">
                  <Textarea
                    rows={2}
                    value={form.regulamento ?? ''}
                    onChange={(e) => setCampo('regulamento', e.target.value)}
                  />
                </Campo>
                <Campo label="Observações">
                  <Textarea
                    rows={2}
                    value={form.observacoes ?? ''}
                    onChange={(e) => setCampo('observacoes', e.target.value)}
                  />
                </Campo>
              </div>
            </div>
          </section>
        ) : null}
        {aba === 'documentos' ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--g3-border)] p-4">
              <h3 className="font-semibold text-[var(--g3-active)]">Documentos e comprovações</h3>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">
                O arquivo fica no storage; o banco guarda apenas metadados e vínculo seguro ao
                termo.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-[260px] flex-1">
                  <Label>Arquivo</Label>
                  <Input
                    type="file"
                    accept="application/pdf,image/*,.doc,.docx,.xlsx"
                    onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                    disabled={!termoId}
                  />
                </div>
                <Button
                  onClick={() => void enviarDocumento()}
                  disabled={salvando || !termoId || !arquivo}
                >
                  <Upload className="mr-1 h-4 w-4" /> Enviar documento
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Documento</th>
                    <th className="px-3 py-2 text-left">Categoria</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.documentos ?? []).map((item: any) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">
                        {item.nomeOriginal || item.descricao || 'Documento'}
                      </td>
                      <td className="px-3 py-2">{item.categoria || '—'}</td>
                      <td className="px-3 py-2">{data(item.criadoEm)}</td>
                      <td className="px-3 py-2 text-right">
                        {item.arquivoId ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void abrirArquivoAutenticado(String(item.arquivoId))}
                          >
                            <Download className="mr-1 h-4 w-4" /> Baixar
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void removerItem('documentos', String(item.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!(form.documentos ?? []).length ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center">
                        Nenhum documento vinculado ao termo.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        {aba === 'aditivos' ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--g3-border)] p-4">
              <h3 className="font-semibold text-[var(--g3-active)]">Histórico e novos aditivos</h3>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">
                O termo principal é preenchido automaticamente. Informe as alterações de vigência,
                cronograma e valor que serão preservadas no histórico.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label>Termo principal</Label>
                  <Input value={form.nomenclaturaTermo || form.titulo || form.numeroInstrumento || 'Termo atual'} readOnly />
                </div>
                <div>
                  <Label>Tipo de aditivo *</Label>
                <Input
                  placeholder="Tipo do aditivo"
                  value={tipoAditivo}
                  onChange={(e) => setTipoAditivo(e.target.value)}
                />
                </div>
                <div>
                  <Label>Novo início da vigência</Label>
                  <Input type="date" value={inicioAditivo} onChange={(e) => setInicioAditivo(e.target.value)} />
                </div>
                <div>
                  <Label>Novo término da vigência</Label>
                  <Input type="date" value={fimAditivo} onChange={(e) => setFimAditivo(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 rounded-md border border-[var(--g3-border)] px-3 py-2 text-sm">
                  <input type="checkbox" checked={prorrogacaoVigencia} onChange={(e) => setProrrogacaoVigencia(e.target.checked)} />
                  Prorrogação de vigência
                </label>
                <div>
                  <Label>Valor total do plano</Label>
                  <Input type="text" inputMode="decimal" value={formatarMoedaInput(valorTotalPlanoAditivo || form.valorGlobal || 0)} onChange={(e) => setValorTotalPlanoAditivo(normalizarMoeda(e.target.value))} />
                </div>
                <div>
                  <Label>Parcela do novo cronograma</Label>
                  <Input placeholder="Ex.: 1, 2 ou 1ª parcela" value={parcelaAditivo} onChange={(e) => setParcelaAditivo(e.target.value)} />
                </div>
                <div>
                  <Label>Valor da nova parcela</Label>
                  <Input type="text" inputMode="decimal" value={formatarMoedaInput(valorNovaParcelaAditivo)} onChange={(e) => setValorNovaParcelaAditivo(normalizarMoeda(e.target.value))} />
                </div>
                <div>
                  <Label>Acréscimo de valor</Label>
                  <Input type="text" inputMode="decimal" value={formatarMoedaInput(acrescimoAditivo)} onChange={(e) => setAcrescimoAditivo(normalizarMoeda(e.target.value))} />
                </div>
                <div>
                  <Label>Corrigir a partir da parcela</Label>
                  <Input placeholder="Ex.: 3ª parcela" value={corrigirAPartirParcela} onChange={(e) => setCorrigirAPartirParcela(e.target.value)} />
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <Label>Justificativa detalhada *</Label>
                <Input
                  placeholder="Justificativa detalhada"
                  value={justificativaAditivo}
                  onChange={(e) => setJustificativaAditivo(e.target.value)}
                />
                </div>
                <div className="flex items-end">
                <Button onClick={() => void adicionarAditivo()} disabled={salvando || !termoId}>
                  <Plus className="mr-1 h-4 w-4" /> Adicionar
                </Button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Número</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-right">Valor anterior</th>
                    <th className="px-3 py-2 text-right">Novo valor</th>
                    <th className="px-3 py-2 text-right">Acréscimo</th>
                    <th className="px-3 py-2 text-left">Cronograma</th>
                    <th className="px-3 py-2 text-left">Justificativa</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.aditivos ?? []).map((item: any) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{item.numero}</td>
                      <td className="px-3 py-2">{item.tipo}</td>
                      <td className="px-3 py-2">{data(item.dataAditivo)}</td>
                      <td className="px-3 py-2 text-right">{moeda(item.valorAnterior)}</td>
                      <td className="px-3 py-2 text-right">{moeda(item.novoValor)}</td>
                      <td className="px-3 py-2 text-right">{moeda(item.acrescimo)}</td>
                      <td className="px-3 py-2">{item.prorrogacaoVigencia ? `${item.parcela || '—'} · ${moeda(item.valorNovaParcela)}` : '—'}</td>
                      <td className="px-3 py-2">{item.justificativa || '—'}</td>
                    </tr>
                  ))}
                  {!(form.aditivos ?? []).length ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center">
                        Nenhum aditivo cadastrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </AdminPageLayout>
      <PopupConfirmacao
        aberto={confirmarExclusao}
        titulo="Confirmar exclusão"
        texto="O termo será excluído logicamente e permanecerá no histórico. Deseja continuar?"
        processando={salvando}
        onCancel={() => setConfirmarExclusao(false)}
        onConfirm={() => void excluir()}
        confirmarTexto="Excluir"
      />
      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <CadastroSucessoModal
        aberto={sucesso}
        onClose={() => setSucesso(false)}
        titulo="Termo cadastrado com sucesso"
        numero={termoId}
      />
    </>
  );
}
