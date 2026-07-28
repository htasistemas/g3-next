import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  CopyPlus,
  FileArchive,
  FileText,
  Flag,
  Goal,
  ExternalLink,
  List,
  Plus,
  Printer,
  Save,
  Search,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  Wallet,
  X,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminPageLayout,
  type AdminAction,
  type AdminTab
} from "@/components/admin/admin-page-layout";
import {
  PopupConfirmacao,
  PopupMensagem,
  type PopupMensagemState
} from "@/components/admin/admin-popups";
import { arquivosService } from "@/services/arquivos.service";
import { resolverUrlArquivo } from "@/lib/arquivos";
import { useContasBancarias } from "@/features/contabilidade/use-contabilidade";
import { useExcluirPlanoTrabalho, usePlanosTrabalho, useSalvarPlanoTrabalho } from "@/features/planos-trabalho/use-planos-trabalho";
import {
  calcularValorTotalAplicacao,
  clonarPlano,
  formatarCep,
  formatarCnpj,
  formatarCpf,
  formatarMoeda,
  gerarCronogramaExecucao,
  mascararTelefoneInput,
  novaEtapaMeta,
  novaMeta,
  novoChecklistPrestacao,
  novoDesembolso,
  novoItemAplicacao,
  novoObjetivoEspecifico,
  normalizarCep,
  normalizarCnpj,
  normalizarCpf,
  normalizarEmail,
  planoVazio,
  somarAplicacaoRecursos,
  somarDesembolso,
  validarPlano,
  validarPlanoParaImpressao
} from "@/features/planos-trabalho/plano-trabalho-utils";
import { gerarHtmlPlanoTrabalho } from "@/features/planos-trabalho/plano-trabalho-report";
import { useUnidadesAssistenciais } from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import { useTermosFomento } from "@/features/termos-fomento/use-termos-fomento";
import type { ArquivoMetadata } from "@/types/arquivo";
import type {
  PlanoAplicacaoRecurso,
  PlanoChecklistPrestacao,
  PlanoDesembolso,
  PlanoMeta,
  PlanoMetaEtapa,
  PlanoObjetivoEspecifico,
  PlanoStatus,
  PlanoTrabalho,
  PlanoTrabalhoPayload
} from "@/types/plano-trabalho";
import type { ContaBancaria } from "@/types/contabilidade";
import type { UnidadeAssistencial } from "@/types/unidade-assistencial";
import { AiFieldSuggestionButton } from "@/modules/ai/components/ai-field-suggestion-button";

type AbaId =
  | "listagem"
  | "identificacao"
  | "instituicao"
  | "historico"
  | "objeto"
  | "justificativa"
  | "objetivos"
  | "metas"
  | "cronograma"
  | "aplicacao"
  | "desembolso"
  | "monitoramento"
  | "prestacao"
  | "anexos"
  | "declaracao";

type OrdenacaoPlano = "maisRecente" | "maisAntigo" | "az";

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem", icon: List },
  { id: "identificacao", label: "Identificação do plano", icon: ClipboardList },
  { id: "instituicao", label: "Dados da instituição", icon: Building2 },
  { id: "historico", label: "Apresentação e histórico", icon: FileText },
  { id: "objeto", label: "Objeto do plano", icon: Flag },
  { id: "justificativa", label: "Justificativa", icon: FileText },
  { id: "objetivos", label: "Objetivos", icon: Goal },
  { id: "metas", label: "Metas, etapas e indicadores", icon: Target },
  { id: "cronograma", label: "Cronograma de execução", icon: CalendarRange },
  { id: "aplicacao", label: "Plano de aplicação", icon: Wallet },
  { id: "desembolso", label: "Cronograma de desembolso", icon: Wallet },
  { id: "monitoramento", label: "Monitoramento e avaliação", icon: ClipboardCheck },
  { id: "prestacao", label: "Prestação de contas", icon: ShieldCheck },
  { id: "anexos", label: "Anexos", icon: FileArchive },
  { id: "declaracao", label: "Declaração e aprovação", icon: CheckCircle2 }
];

const ordemAbas: AbaId[] = abas.filter((aba) => aba.id !== "listagem").map((aba) => aba.id as AbaId);

const statusOptions: Array<{ value: PlanoStatus; label: string }> = [
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "EM_EXECUCAO", label: "Em execução" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "REPROVADO", label: "Reprovado" }
];

const tiposParceria = [
  "Termo de Fomento",
  "Termo de Colaboração",
  "Convênio",
  "Emenda",
  "Recurso Próprio",
  "Outro"
];

const orgaosConcedentesPrincipais = [
  "Prefeitura Municipal",
  "Secretaria Municipal de Assistência Social",
  "Secretaria Municipal de Saúde",
  "Secretaria Municipal de Educação",
  "Fundo Municipal de Assistência Social",
  "Governo do Estado",
  "Secretaria Estadual de Assistência Social",
  "Secretaria Estadual de Saúde",
  "Secretaria Estadual de Educação",
  "Fundo Estadual de Assistência Social",
  "Governo Federal",
  "Ministério do Desenvolvimento e Assistência Social, Família e Combate à Fome",
  "Ministério da Saúde",
  "Ministério da Educação",
  "Fundo Nacional de Assistência Social",
  "Caixa Econômica Federal"
];

const areasAtuacao = [
  "Assistência social",
  "Saúde",
  "Educação",
  "Cultura",
  "Esporte",
  "Segurança alimentar",
  "Capacitação profissional",
  "Convivência",
  "Outros"
];

const periodosPrestacao = ["Mensal", "Bimestral", "Trimestral", "Semestral", "Anual", "Final"];
const instrumentosMonitoramentoOptions = [
  "Lista de presença",
  "Relatório técnico",
  "Fotos",
  "Pesquisa",
  "Prontuário",
  "Atendimento",
  "Comprovantes"
];

const statusMetaEtapa = ["Planejada", "Em andamento", "Concluída", "Atrasada", "Suspensa"];
const naturezasDespesa = [
  "Material de consumo",
  "Serviços de terceiros",
  "Recursos humanos",
  "Transporte",
  "Alimentação",
  "Comunicação",
  "Estrutura",
  "Outros"
];
const fontesRecurso = ["Público", "Emenda", "Próprio", "Contrapartida", "Outro"];
const tiposAnexo = ["Edital", "Plano aprovado", "Orçamentos", "Certidões", "Declarações", "Fotos", "Relatórios", "Outros"];

function formatarMesAnoInput(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 6);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
}

function formatarDataPtBr(valor?: string) {
  if (!valor) return "---";
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function normalizarNomePessoaInput(valor: string) {
  return valor
    .trim()
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((parte, index) => {
      if (index > 0 && ["da", "de", "do", "das", "dos", "e"].includes(parte)) return parte;
      return parte.charAt(0).toLocaleUpperCase("pt-BR") + parte.slice(1);
    })
    .join(" ");
}

function calcularProgressoSecao(form: PlanoTrabalhoPayload) {
  const secoes = [
    Boolean(form.titulo && form.orgaoParceiro && form.periodoInicio && form.periodoFim),
    Boolean(form.razaoSocial && form.cnpj && form.representanteLegal && form.representanteCpf),
    Boolean(form.historicoOsc || form.finalidadeInstitucional || form.capacidadeTecnicaOperacional),
    Boolean(form.descricaoObjeto && form.areaAtuacao && form.publicoAlvo),
    Boolean(form.problemaSocial && form.impactoEsperado),
    Boolean(form.objetivoGeral),
    Boolean(form.metas.length),
    Boolean(gerarCronogramaExecucao(form).length),
    Boolean(form.aplicacaoRecursos.length),
    Boolean(form.desembolso.length),
    Boolean(form.formaAcompanhamento || form.instrumentosMonitoramento.length),
    Boolean(form.periodicidadePrestacao || form.checklistPrestacao.length),
    Boolean(form.declaracaoVeracidade)
  ];
  const concluidas = secoes.filter(Boolean).length;
  return {
    concluidas,
    total: secoes.length,
    percentual: Math.round((concluidas / secoes.length) * 100)
  };
}

function primeiraMensagemErro(erros: Record<string, string>) {
  return Object.values(erros)[0] ?? "Existem pendências no plano.";
}

function BlocoAjuda({
  titulo,
  texto,
  itens
}: {
  titulo: string;
  texto: string;
  itens?: string[];
}) {
  return (
    <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/40 p-4">
      <p className="text-sm font-semibold text-[var(--g3-active)]">{titulo}</p>
      <p className="mt-1 text-sm text-[var(--g3-muted)]">{texto}</p>
      {itens?.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--g3-muted)]">
          {itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CampoErro({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <p className="text-xs text-red-600">{texto}</p>;
}

function BadgePendencia({ texto }: { texto: string }) {
  return (
    <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      {texto}
    </span>
  );
}

export function PlanoTrabalhoPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [planoSelecionadoId, setPlanoSelecionadoId] = useState<string>();
  const [filtroPesquisa, setFiltroPesquisa] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroOrdenacao, setFiltroOrdenacao] = useState<OrdenacaoPlano>("maisRecente");
  const [form, setForm] = useState<PlanoTrabalhoPayload>(clonarPlano(planoVazio()));
  const [snapshot, setSnapshot] = useState<PlanoTrabalhoPayload>(clonarPlano(planoVazio()));
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [arquivos, setArquivos] = useState<ArquivoMetadata[]>([]);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [tipoAnexo, setTipoAnexo] = useState("Edital");
  const [observacaoAnexo, setObservacaoAnexo] = useState("");
  const [carregandoArquivos, setCarregandoArquivos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bloqueioAcao, setBloqueioAcao] = useState<string | null>(null);

  const filtroPesquisaDebounced = useDeferredValue(filtroPesquisa);

  const planosQuery = usePlanosTrabalho();
  const termosQuery = useTermosFomento();
  const salvarMutation = useSalvarPlanoTrabalho();
  const excluirMutation = useExcluirPlanoTrabalho();
  const unidadesAssistenciaisQuery = useUnidadesAssistenciais({});
  const contasBancariasQuery = useContasBancarias();

  const planos = planosQuery.data ?? [];
  const termos = termosQuery.data ?? [];
  const unidadesAssistenciais = useMemo(
    () => unidadesAssistenciaisQuery.data?.unidades ?? [],
    [unidadesAssistenciaisQuery.data]
  );
  const contasBancarias = contasBancariasQuery.data ?? [];
  const processando = salvarMutation.isPending || excluirMutation.isPending || uploading;
  const cronogramaExecucao = useMemo(() => gerarCronogramaExecucao(form), [form]);
  const contextoApresentacaoIa = [
    `Instituição: ${form.razaoSocial || form.nomeFantasia || "não informada"}.`,
    `Área de atuação: ${form.areaAtuacao || "não informada"}.`,
    `Objeto do plano: ${form.descricaoObjeto || "não informado"}.`,
    `Público-alvo do plano: ${form.publicoAlvo || "não informado"}.`,
    `Histórico atual: ${form.historicoOsc || "não informado"}.`,
    `Finalidade institucional atual: ${form.finalidadeInstitucional || "não informada"}.`,
    `Experiência anterior atual: ${form.experienciaAnterior || "não informada"}.`,
    `Conselhos, certificações ou registros atuais: ${form.conselhosCertificacoes || "não informado"}.`,
    `Público atendido atualmente: ${form.publicoAtendidoAtual || "não informado"}.`,
    `Capacidade técnica e operacional atual: ${form.capacidadeTecnicaOperacional || "não informada"}.`
  ].join(" ");
  const progresso = useMemo(() => calcularProgressoSecao(form), [form]);
  const totalAplicacao = useMemo(() => somarAplicacaoRecursos(form), [form]);
  const totalDesembolso = useMemo(() => somarDesembolso(form), [form]);
  const pendenciasEnvio = useMemo(() => validarPlano(form, "envio"), [form]);
  const pendenciasImpressao = useMemo(() => validarPlanoParaImpressao(form), [form]);
  const planoCompletoParaImpressao = Object.keys(pendenciasImpressao).length === 0;
  const [unidadeAssistencialSelecionadaId, setUnidadeAssistencialSelecionadaId] = useState("");
  const [contaBancariaSelecionadaId, setContaBancariaSelecionadaId] = useState("");
  const [mostrarSugestoesOrgaos, setMostrarSugestoesOrgaos] = useState(false);

  function obterRepresentanteDaUnidade(unidade: UnidadeAssistencial) {
    const diretoria = unidade.diretoria ?? [];
    const preferido = diretoria.find((item) =>
      /presidente|representante|diretor|coordena|secret[aá]rio/i.test(item.funcao || "")
    );
    return preferido ?? diretoria[0] ?? null;
  }

  function preencherDadosDaUnidade(unidade: UnidadeAssistencial) {
    const representante = obterRepresentanteDaUnidade(unidade);
    setForm((atual) => ({
      ...atual,
      razaoSocial: unidade.razao_social?.trim() || unidade.nome_fantasia || atual.razaoSocial,
      nomeFantasia: unidade.nome_fantasia || atual.nomeFantasia,
      cnpj: unidade.cnpj?.trim() || atual.cnpj,
      cep: unidade.cep?.trim() || atual.cep,
      logradouro: unidade.logradouro?.trim() || atual.logradouro,
      numero: unidade.numero?.trim() || atual.numero,
      complemento: unidade.complemento?.trim() || atual.complemento,
      bairro: unidade.bairro?.trim() || atual.bairro,
      cidade: unidade.cidade?.trim() || atual.cidade,
      uf: unidade.estado?.trim()?.toUpperCase() || atual.uf,
      telefone: unidade.telefone?.replace(/\D/g, "") || atual.telefone,
      email: unidade.email?.trim().toLowerCase() || atual.email,
      representanteLegal: representante?.nome_completo?.trim() || atual.representanteLegal,
      representanteCpf:
        representante?.documento?.replace(/\D/g, "").length === 11
          ? representante.documento.replace(/\D/g, "")
          : atual.representanteCpf,
      representanteCargo: representante?.funcao?.trim() || atual.representanteCargo
    }));
  }

  function obterContaDescricao(conta: ContaBancaria) {
    const partes = [conta.nomeConta, conta.banco, conta.agencia, conta.numero, conta.digito].filter(Boolean);
    return partes.join(" - ");
  }

  function formatarOperacaoConta(conta: ContaBancaria) {
    switch (conta.tipo) {
      case "CONTA_CORRENTE":
        return "Conta corrente";
      case "POUPANCA":
        return "Poupança";
      case "APLICACAO":
        return "Aplicação";
      case "CAIXA_INTERNO":
        return "Caixa interno";
      default:
        return "";
    }
  }

  function preencherDadosBancarios(conta: ContaBancaria) {
    const numeroConta = [conta.numero?.trim(), conta.digito?.trim()].filter(Boolean).join("-");
    setForm((atual) => ({
      ...atual,
      bancoNome: conta.banco?.trim() || atual.bancoNome,
      bancoAgencia: conta.agencia?.trim() || atual.bancoAgencia,
      bancoConta: numeroConta || atual.bancoConta,
      bancoOperacao: formatarOperacaoConta(conta) || atual.bancoOperacao,
      bancoPix: conta.chavePix?.trim() || atual.bancoPix,
      bancoObservacao: [
        conta.nomeConta?.trim(),
        conta.titular?.trim() ? `Titular: ${conta.titular.trim()}` : "",
        conta.projetoVinculado?.trim() ? `Projeto: ${conta.projetoVinculado.trim()}` : "",
        conta.observacao?.trim() ?? ""
      ]
        .filter(Boolean)
        .join(" | ") || atual.bancoObservacao
    }));
  }

  useEffect(() => {
    if (!planoSelecionadoId) {
      setArquivos([]);
      return;
    }

    let ativo = true;
    setCarregandoArquivos(true);
    arquivosService
      .listarPorEntidade("plano_trabalho", planoSelecionadoId)
      .then((lista) => {
        if (ativo) setArquivos(lista);
      })
      .catch(() => {
        if (ativo) setArquivos([]);
      })
      .finally(() => {
        if (ativo) setCarregandoArquivos(false);
      });

    return () => {
      ativo = false;
    };
  }, [planoSelecionadoId]);

  const planosFiltrados = useMemo(() => {
    const termo = filtroPesquisaDebounced.trim().toLowerCase();
    const filtrados = planos.filter((plano) => {
      const alvo = [
        plano.codigoInterno,
        plano.titulo,
        plano.orgaoParceiro,
        plano.status,
        plano.razaoSocial,
        plano.numeroProcesso ?? "",
        plano.termoFomento?.numero ?? ""
      ]
        .join(" ")
        .toLowerCase();
      if (termo && !alvo.includes(termo)) return false;
      if (filtroStatus && plano.status !== filtroStatus) return false;
      return true;
    });

    return filtrados.sort((a, b) => {
      if (filtroOrdenacao === "az") return a.titulo.localeCompare(b.titulo, "pt-BR");
      const idA = Number(a.id);
      const idB = Number(b.id);
      return filtroOrdenacao === "maisAntigo" ? idA - idB : idB - idA;
    });
  }, [filtroOrdenacao, filtroPesquisaDebounced, filtroStatus, planos]);

  const indiceAba = ordemAbas.indexOf(abaAtiva);
  const temAbaAnterior = indiceAba > 0;
  const temProximaAba = indiceAba >= 0 && indiceAba < ordemAbas.length - 1;
  const proximaAbaLabel = temProximaAba ? abas.find((aba) => aba.id === ordemAbas[indiceAba + 1])?.label ?? "" : "";

  const termoSelecionado = useMemo(
    () => termos.find((item) => item.id === form.termoFomentoId) ?? null,
    [form.termoFomentoId, termos]
  );
  const termosFomentoDisponiveis = useMemo(
    () => (form.tipoParceria === "Termo de Fomento" ? termos : []),
    [form.tipoParceria, termos]
  );
  const orgaosFiltrados = useMemo(() => {
    const termo = form.orgaoParceiro.trim().toLocaleLowerCase("pt-BR");
    return orgaosConcedentesPrincipais
      .filter((orgao) => !termo || orgao.toLocaleLowerCase("pt-BR").includes(termo))
      .slice(0, 8);
  }, [form.orgaoParceiro]);

  function atualizarCampo<K extends keyof PlanoTrabalhoPayload>(campo: K, valor: PlanoTrabalhoPayload[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function vincularTermoFomento(termoId: string) {
    const termo = termosFomentoDisponiveis.find((item) => item.id === termoId);
    setForm((atual) => ({
      ...atual,
      termoFomentoId: termoId,
      orgaoParceiro: termo?.orgaoConcedente?.trim() || atual.orgaoParceiro,
      periodoInicio: termo?.dataInicioVigencia || atual.periodoInicio,
      periodoFim: termo?.dataFimVigencia || atual.periodoFim
    }));
  }

  function novoPlano() {
    const vazio = clonarPlano(planoVazio());
    setPlanoSelecionadoId(undefined);
    setUnidadeAssistencialSelecionadaId("");
    setContaBancariaSelecionadaId("");
    setForm(vazio);
    setSnapshot(vazio);
    setErros({});
    setArquivos([]);
    setAbaAtiva("identificacao");
  }

  function selecionarPlano(plano: PlanoTrabalho) {
    const normalizado = clonarPlano(plano);
    setPlanoSelecionadoId(plano.id);
    setUnidadeAssistencialSelecionadaId("");
    setContaBancariaSelecionadaId("");
    setForm(normalizado);
    setSnapshot(normalizado);
    setErros({});
    setAbaAtiva("identificacao");
  }

  function cancelarEdicao() {
    setForm(clonarPlano(snapshot));
    setErros({});
    setUnidadeAssistencialSelecionadaId("");
    setContaBancariaSelecionadaId("");
  }

  function limparFiltros() {
    setFiltroPesquisa("");
    setFiltroStatus("");
    setFiltroOrdenacao("maisRecente");
  }

  async function persistirPlano(
    status: PlanoStatus,
    modo: "rascunho" | "envio",
    mensagemSucesso: string
  ) {
    const payload = clonarPlano({ ...form, status });
    const novosErros = validarPlano(payload, modo);
    setErros(novosErros);
    if (Object.keys(novosErros).length) {
      setPopup({
        tipo: "aviso",
        titulo: "Pendências no plano",
        texto: primeiraMensagemErro(novosErros)
      });
      return;
    }

    try {
      setBloqueioAcao("salvar");
      const salvo = await salvarMutation.mutateAsync({
        id: planoSelecionadoId,
        payload: {
          ...payload,
          termoFomentoId: payload.termoFomentoId?.trim() ? payload.termoFomentoId : undefined
        }
      });
      const normalizado = clonarPlano(salvo);
      setPlanoSelecionadoId(salvo.id);
      setForm(normalizado);
      setSnapshot(normalizado);
      setPopup({ tipo: "sucesso", titulo: "Plano atualizado", texto: mensagemSucesso });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro ao salvar",
        texto:
          error?.response?.data?.message ??
          error?.response?.data?.mensagem ??
          "Não foi possível salvar o plano de trabalho."
      });
    } finally {
      setTimeout(() => setBloqueioAcao(null), 600);
    }
  }

  async function excluirAtual() {
    if (!planoSelecionadoId) return;
    try {
      await excluirMutation.mutateAsync(planoSelecionadoId);
      setConfirmarExclusao(false);
      setPopup({ tipo: "sucesso", titulo: "Plano excluído", texto: "O plano foi removido com sucesso." });
      novoPlano();
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro ao excluir",
        texto:
          error?.response?.data?.message ??
          error?.response?.data?.mensagem ??
          "Não foi possível excluir o plano."
      });
    }
  }

  function validarAtual() {
    const novosErros = validarPlano(form, "envio");
    setErros(novosErros);
    if (Object.keys(novosErros).length) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação do plano",
        texto: `${Object.keys(novosErros).length} pendência(s) encontrada(s). Revise a checklist final.`
      });
      return;
    }
    setPopup({
      tipo: "sucesso",
      titulo: "Plano validado",
      texto: "O plano está consistente e pode ser enviado para análise."
    });
  }

  function duplicarPlano() {
    const duplicado = clonarPlano(form);
    duplicado.id = undefined;
    duplicado.codigoInterno = "";
    duplicado.status = "RASCUNHO";
    duplicado.titulo = duplicado.titulo ? `${duplicado.titulo} (cópia)` : "";
    setPlanoSelecionadoId(undefined);
    setForm(duplicado);
    setSnapshot(clonarPlano(duplicado));
    setArquivos([]);
    setAbaAtiva("identificacao");
    setPopup({
      tipo: "sucesso",
      titulo: "Plano duplicado",
      texto: "A cópia foi preparada como novo rascunho. Salve para gerar um novo registro."
    });
  }

  function exportarPlano() {
    const blob = new Blob([JSON.stringify(form, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(form.codigoInterno || "plano-trabalho").replace(/\s+/g, "-").toLowerCase()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function imprimirOuPdf() {
    const faltantes = validarPlanoParaImpressao(form);
    if (Object.keys(faltantes).length) {
      setPopup({
        tipo: "aviso",
        titulo: "Plano incompleto",
        texto: "Complete os campos obrigatórios antes de imprimir o plano de trabalho."
      });
      return;
    }
    const janela = window.open("", "_blank", "noopener,noreferrer,width=960,height=900");
    if (!janela) {
      setPopup({
        tipo: "aviso",
        titulo: "Pop-up bloqueado",
        texto: "Libere a abertura de janelas para gerar a versão de impressão/PDF."
      });
      return;
    }
    janela.document.write(gerarHtmlPlanoTrabalho(form, cronogramaExecucao, arquivos));
    janela.document.close();
  }

  async function anexarDocumento() {
    if (!planoSelecionadoId) {
      setPopup({
        tipo: "aviso",
        titulo: "Salve o plano primeiro",
        texto: "Para anexar documentos, salve o plano ao menos uma vez."
      });
      return;
    }
    if (!arquivoSelecionado) {
      setPopup({
        tipo: "aviso",
        titulo: "Selecione um arquivo",
        texto: "Escolha o documento que será anexado ao plano."
      });
      return;
    }
    try {
      setUploading(true);
      const arquivo = await arquivosService.uploadPorEntidade({
        scope: "plano_trabalho_documento",
        entidadeTipo: "plano_trabalho",
        entidadeId: planoSelecionadoId,
        arquivo: arquivoSelecionado,
        observacao: `${tipoAnexo}${observacaoAnexo ? ` - ${observacaoAnexo}` : ""}`
      });
      setArquivos((atual) => [arquivo, ...atual]);
      setArquivoSelecionado(null);
      setObservacaoAnexo("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPopup({
        tipo: "sucesso",
        titulo: "Documento anexado",
        texto: "O documento foi armazenado com sucesso."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Falha no upload",
        texto:
          error?.response?.data?.message ??
          error?.response?.data?.mensagem ??
          "Não foi possível anexar o documento."
      });
    } finally {
      setUploading(false);
    }
  }

  async function excluirAnexo(id: number) {
    try {
      await arquivosService.excluir(id);
      setArquivos((atual) => atual.filter((item) => item.id !== id));
      setPopup({
        tipo: "sucesso",
        titulo: "Documento excluído",
        texto: "O anexo foi removido logicamente e permaneceu auditado."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro ao excluir anexo",
        texto:
          error?.response?.data?.message ??
          error?.response?.data?.mensagem ??
          "Não foi possível excluir o anexo."
      });
    }
  }

  function irParaAbaAnterior() {
    if (!temAbaAnterior) return;
    setAbaAtiva(ordemAbas[indiceAba - 1]);
  }

  function irParaProximaAba() {
    if (!temProximaAba) return;
    setAbaAtiva(ordemAbas[indiceAba + 1]);
  }

  function renderResumoTopo() {
    if (abaAtiva === "listagem") return null;
    return (
      <div className="space-y-3 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-active)]">
              Progresso do preenchimento
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--g3-foreground)]">
              {form.titulo || "Novo plano de trabalho"}
            </h2>
            <p className="text-sm text-[var(--g3-muted)]">
              Situação atual:{" "}
              <span className="font-semibold text-[var(--g3-foreground)]">
                {statusOptions.find((item) => item.value === form.status)?.label ?? form.status}
              </span>
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Execução</p>
              <p className="mt-1 text-sm font-semibold">{formatarDataPtBr(form.periodoInicio)} a {formatarDataPtBr(form.periodoFim)}</p>
            </div>
            <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Aplicação</p>
              <p className="mt-1 text-sm font-semibold">{formatarMoeda(totalAplicacao)}</p>
            </div>
            <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Desembolso</p>
              <p className="mt-1 text-sm font-semibold">{formatarMoeda(totalDesembolso)}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--g3-muted)]">Seções concluídas</span>
            <span className="font-semibold text-[var(--g3-foreground)]">
              {progresso.concluidas}/{progresso.total} ({progresso.percentual}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--g3-primary-soft)]">
            <div
              className="h-full rounded-full bg-[var(--g3-primary)] transition-all"
              style={{ width: `${progresso.percentual}%` }}
            />
          </div>
          {Object.keys(pendenciasEnvio).length ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.values(pendenciasEnvio)
                .slice(0, 4)
                .map((item) => (
                  <BadgePendencia key={item} texto={item} />
                ))}
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              O plano está sem pendências críticas de envio.
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderNavegacaoAba() {
    if (abaAtiva === "listagem") return null;
    return (
      <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 p-3">
        {temAbaAnterior ? (
          <Button type="button" size="sm" variant="outline" onClick={irParaAbaAnterior}>
            Voltar
          </Button>
        ) : null}
        {temProximaAba ? (
          <Button type="button" size="sm" onClick={irParaProximaAba}>
            Próximo: {proximaAbaLabel}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => void persistirPlano("RASCUNHO", "rascunho", "Plano salvo como rascunho.")}
            disabled={processando || bloqueioAcao === "salvar"}
          >
            {processando ? "Salvando..." : "Salvar rascunho"}
          </Button>
        )}
      </div>
    );
  }

  function atualizarObjetivo(index: number, patch: Partial<PlanoObjetivoEspecifico>) {
    setForm((atual) => ({
      ...atual,
      objetivosEspecificos: (atual.objetivosEspecificos ?? []).map((item, idx) =>
        idx === index ? { ...item, ...patch } : item
      )
    }));
  }

  function atualizarMeta(index: number, patch: Partial<PlanoMeta>) {
    const metaAtual = form.metas[index];
    const metaAtualizada = metaAtual ? { ...metaAtual, ...patch } : null;
    setForm((atual) => ({
      ...atual,
      metas: (atual.metas ?? []).map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    }));
    if (metaAtualizada && ("dataInicio" in patch || "dataFim" in patch)) {
      validarPeriodoRegistro(
        `meta_${index}_`,
        metaAtualizada.dataInicio,
        metaAtualizada.dataFim,
        "A meta"
      );
    }
  }

  function atualizarEtapa(metaIndex: number, etapaIndex: number, patch: Partial<PlanoMetaEtapa>) {
    const etapaAtual = form.metas[metaIndex]?.etapas?.[etapaIndex];
    const etapaAtualizada = etapaAtual ? { ...etapaAtual, ...patch } : null;
    setForm((atual) => ({
      ...atual,
      metas: (atual.metas ?? []).map((meta, idx) =>
        idx === metaIndex
          ? {
              ...meta,
              etapas: (meta.etapas ?? []).map((etapa, etapaIdx) =>
                etapaIdx === etapaIndex ? { ...etapa, ...patch } : etapa
              )
            }
          : meta
      )
    }));
    if (etapaAtualizada && ("dataInicio" in patch || "dataFim" in patch)) {
      validarPeriodoRegistro(
        `meta_${metaIndex}_etapa_${etapaIndex}_`,
        etapaAtualizada.dataInicio,
        etapaAtualizada.dataFim,
        "A etapa"
      );
    }
  }

  function validarPeriodoRegistro(
    chave: string,
    dataInicio: string | null | undefined,
    dataFim: string | null | undefined,
    rotulo: string
  ) {
    setErros((atuais) => {
      const novos = { ...atuais };
      delete novos[`${chave}dataInicio`];
      delete novos[`${chave}dataFim`];

      if (form.periodoInicio && form.periodoFim && dataInicio) {
        if (dataInicio < form.periodoInicio || dataInicio > form.periodoFim) {
          novos[`${chave}dataInicio`] = `${rotulo} deve iniciar entre ${formatarDataPtBr(form.periodoInicio)} e ${formatarDataPtBr(form.periodoFim)}.`;
        }
      }
      if (form.periodoInicio && form.periodoFim && dataFim) {
        if (dataFim < form.periodoInicio || dataFim > form.periodoFim) {
          novos[`${chave}dataFim`] = `${rotulo} deve terminar entre ${formatarDataPtBr(form.periodoInicio)} e ${formatarDataPtBr(form.periodoFim)}.`;
        }
      }
      if (dataInicio && dataFim && dataFim < dataInicio) {
        novos[`${chave}dataFim`] = `${rotulo} não pode terminar antes do início (${formatarDataPtBr(dataInicio)}).`;
      }
      return novos;
    });
  }

  function atualizarAplicacao(index: number, patch: Partial<PlanoAplicacaoRecurso>) {
    setForm((atual) => ({
      ...atual,
      aplicacaoRecursos: (atual.aplicacaoRecursos ?? []).map((item, idx) =>
        idx === index ? { ...item, ...patch } : item
      )
    }));
  }

  function atualizarDesembolso(index: number, patch: Partial<PlanoDesembolso>) {
    setForm((atual) => ({
      ...atual,
      desembolso: (atual.desembolso ?? []).map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    }));
  }

  function atualizarChecklist(index: number, patch: Partial<PlanoChecklistPrestacao>) {
    setForm((atual) => ({
      ...atual,
      checklistPrestacao: (atual.checklistPrestacao ?? []).map((item, idx) =>
        idx === index ? { ...item, ...patch } : item
      )
    }));
  }

  const acoesBase: AdminAction[] = [
    {
      id: "novo",
      label: "Novo plano",
      icon: Plus,
      onClick: novoPlano,
      variant: "default",
      disabled: processando
    },
    {
      id: "salvar_rascunho",
      label: "Salvar rascunho",
      icon: Save,
      onClick: () => void persistirPlano("RASCUNHO", "rascunho", "Plano salvo como rascunho."),
      variant: "default",
      disabled: processando || bloqueioAcao === "salvar"
    },
    {
      id: "validar",
      label: "Validar plano",
      icon: ClipboardCheck,
      onClick: validarAtual,
      variant: "outline",
      disabled: processando
    },
    {
      label: "Enviar para análise",
      icon: Send,
      onClick: () => void persistirPlano("EM_ANALISE", "envio", "Plano enviado para análise."),
      variant: "outline",
      disabled: processando || bloqueioAcao === "salvar"
    },
    {
      id: "aprovar",
      label: "Aprovar",
      icon: CheckCircle2,
      onClick: () =>
        void persistirPlano("APROVADO", "envio", "Plano aprovado e disponível para execução."),
      variant: "outline",
      disabled: processando || bloqueioAcao === "salvar"
    },
    {
      id: "reprovar",
      label: "Reprovar",
      icon: XCircle,
      onClick: () => void persistirPlano("REPROVADO", "rascunho", "Plano marcado como reprovado."),
      variant: "outline",
      disabled: processando || bloqueioAcao === "salvar"
    },
    {
      id: "duplicar",
      label: "Duplicar plano",
      icon: CopyPlus,
      onClick: duplicarPlano,
      variant: "outline",
      disabled: processando || !form.titulo
    },
    ...(planoCompletoParaImpressao
      ? [
          {
            id: "gerar_pdf",
            label: "Gerar PDF",
            icon: FileText,
            onClick: imprimirOuPdf,
            variant: "outline" as const
          },
          {
            id: "imprimir",
            label: "Imprimir",
            icon: Printer,
            onClick: imprimirOuPdf,
            variant: "outline" as const
          }
        ]
      : []),
    {
      id: "exportar",
      label: "Exportar",
      icon: FileArchive,
      onClick: exportarPlano,
      variant: "outline"
    },
    {
      id: "anexar_documento",
      label: "Anexar documento",
      icon: Upload,
      onClick: () => setAbaAtiva("anexos"),
      variant: "outline"
    },
    {
      id: "cancelar",
      label: "Cancelar",
      icon: XCircle,
      onClick: cancelarEdicao,
      variant: "outline",
      disabled: processando
    },
    {
      id: "excluir",
      label: "Excluir",
      icon: Trash2,
      onClick: () => setConfirmarExclusao(true),
      variant: "danger",
      disabled: processando || !planoSelecionadoId
    },
    {
      id: "fechar",
      label: "Fechar",
      icon: X,
      onClick: () => navigate("/dashboard/visao-geral"),
      variant: "outline"
    }
  ];

  const acoesVisiveisPorAba: Partial<Record<AbaId, string[]>> = {
    listagem: ["Novo plano", "Duplicar plano", "Excluir", "Fechar"],
    identificacao: ["Novo plano", "Salvar rascunho", "Duplicar plano", "Cancelar", "Fechar"],
    instituicao: ["Salvar rascunho", "Cancelar", "Fechar"],
    historico: ["Salvar rascunho", "Cancelar", "Fechar"],
    objeto: ["Salvar rascunho", "Cancelar", "Fechar"],
    justificativa: ["Salvar rascunho", "Cancelar", "Fechar"],
    objetivos: ["Salvar rascunho", "Cancelar", "Fechar"],
    metas: ["Salvar rascunho", "Cancelar", "Fechar"],
    cronograma: ["Salvar rascunho", "Cancelar", "Fechar"],
    aplicacao: ["Salvar rascunho", "Cancelar", "Fechar"],
    desembolso: ["Salvar rascunho", "Cancelar", "Fechar"],
    monitoramento: ["Salvar rascunho", "Cancelar", "Fechar"],
    prestacao: ["Salvar rascunho", "Anexar documento", "Cancelar", "Fechar"],
    anexos: ["Salvar rascunho", "Gerar PDF", "Imprimir", "Exportar", "Cancelar", "Excluir", "Fechar"],
    declaracao: [
      "Salvar rascunho",
      "Validar plano",
      "Enviar para análise",
      "Aprovar",
      "Reprovar",
      "Gerar PDF",
      "Imprimir",
      "Exportar",
      "Cancelar",
      "Excluir",
      "Fechar"
    ]
  };

  const normalizarChaveAcao = (valor: string) =>
    valor
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const acoesPermitidas = new Set(
    (acoesVisiveisPorAba[abaAtiva] ?? ["Fechar"]).map((valor) => normalizarChaveAcao(valor))
  );
  const acoes = acoesBase.filter((acao) => acoesPermitidas.has(normalizarChaveAcao(acao.label)));

  return (
    <>
      <AdminPageLayout
        sectionLabel="Jurídico e Compliance"
        pageTitle="Plano de trabalho"
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actionsClassName="w-full grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        actionButtonClassName="w-full justify-start xl:min-w-[168px]"
        actions={acoes}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={planoSelecionadoId ? `Código: ${form.codigoInterno || planoSelecionadoId}` : "Novo plano"}
      >
        {renderResumoTopo()}

        {abaAtiva === "listagem" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2">
                <Label>Pesquisa</Label>
                <Input
                  placeholder="Código, título, órgão, CNPJ, status ou termo"
                  value={filtroPesquisa}
                  onChange={(event) => setFiltroPesquisa(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Situação</Label>
                <Select value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value)}>
                  <option value="">Todas</option>
                  {statusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Ordenação</Label>
                <Select
                  value={filtroOrdenacao}
                  onChange={(event) => setFiltroOrdenacao(event.target.value as OrdenacaoPlano)}
                >
                  <option value="maisRecente">Mais recente</option>
                  <option value="maisAntigo">Mais antigo</option>
                  <option value="az">A-Z</option>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button type="button" variant="outline" size="sm" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Título</th>
                    <th className="px-3 py-2 text-left">Instituição</th>
                    <th className="px-3 py-2 text-left">Órgão parceiro</th>
                    <th className="px-3 py-2 text-left">Situação</th>
                    <th className="px-3 py-2 text-left">Período</th>
                    <th className="px-3 py-2 text-left">Aplicação</th>
                  </tr>
                </thead>
                <tbody>
                  {planosQuery.isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-[var(--g3-muted)]">
                        Carregando planos...
                      </td>
                    </tr>
                  ) : planosFiltrados.length ? (
                    planosFiltrados.map((plano) => (
                      <tr
                        key={plano.id}
                        onClick={() => selecionarPlano(plano)}
                        className={`cursor-pointer border-t border-[var(--g3-border)] transition-colors ${
                          planoSelecionadoId === plano.id
                            ? "bg-[var(--g3-primary-soft)]"
                            : "hover:bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-3 font-semibold">{plano.codigoInterno}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-[var(--g3-foreground)]">{plano.titulo}</p>
                          <p className="text-xs text-[var(--g3-muted)]">{plano.tipoParceria || "---"}</p>
                        </td>
                        <td className="px-3 py-3">{plano.razaoSocial || "---"}</td>
                        <td className="px-3 py-3">{plano.orgaoParceiro || "---"}</td>
                        <td className="px-3 py-3">
                          {statusOptions.find((item) => item.value === plano.status)?.label ?? plano.status}
                        </td>
                        <td className="px-3 py-3">
                          {formatarDataPtBr(plano.periodoInicio)} a {formatarDataPtBr(plano.periodoFim)}
                        </td>
                        <td className="px-3 py-3">{formatarMoeda(somarAplicacaoRecursos(plano))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-[var(--g3-muted)]">
                        Nenhum plano encontrado com os filtros informados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "identificacao" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2">
                <Label>Título do plano de trabalho *</Label>
                <Input
                  value={form.titulo}
                  onChange={(event) => atualizarCampo("titulo", event.target.value)}
                />
                <CampoErro texto={erros.titulo} />
              </div>
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select
                  value={form.tipoParceria}
                  onChange={(event) => {
                    const tipo = event.target.value;
                    setForm((atual) => ({
                      ...atual,
                      tipoParceria: tipo,
                      termoFomentoId: tipo === "Termo de Fomento" ? atual.termoFomentoId : undefined
                    }));
                  }}
                >
                  {tiposParceria.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
                <CampoErro texto={erros.tipoParceria} />
              </div>
              <div className="space-y-1">
                <Label>Situação *</Label>
                <Select value={form.status} onChange={(event) => atualizarCampo("status", event.target.value)}>
                  {statusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Órgão concedente ou parceiro *</Label>
                <div className="relative">
                  <Input
                    value={form.orgaoParceiro}
                    onFocus={() => setMostrarSugestoesOrgaos(true)}
                    onBlur={() => window.setTimeout(() => setMostrarSugestoesOrgaos(false), 150)}
                    onChange={(event) => {
                      atualizarCampo("orgaoParceiro", event.target.value);
                      setMostrarSugestoesOrgaos(true);
                    }}
                    placeholder="Selecione ou digite outro órgão"
                    autoComplete="off"
                  />
                  {mostrarSugestoesOrgaos && orgaosFiltrados.length ? (
                    <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-1 shadow-lg">
                      {orgaosFiltrados.map((orgao) => (
                        <button
                          key={orgao}
                          type="button"
                          className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--g3-foreground)] transition hover:bg-[var(--g3-primary-soft)]"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            atualizarCampo("orgaoParceiro", orgao);
                            setMostrarSugestoesOrgaos(false);
                          }}
                        >
                          {orgao}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <p className="text-xs text-[var(--g3-muted)]">Você pode selecionar uma sugestão ou informar manualmente outro órgão.</p>
                <CampoErro texto={erros.orgaoParceiro} />
              </div>
              <div className="space-y-1">
                <Label>Número do edital/chamamento</Label>
                <Input
                  value={form.editalChamamento ?? ""}
                  onChange={(event) => atualizarCampo("editalChamamento", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Número do processo</Label>
                <Input
                  value={form.numeroProcesso ?? ""}
                  onChange={(event) => atualizarCampo("numeroProcesso", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Período inicial *</Label>
                <Input
                  type="date"
                  value={form.periodoInicio}
                  onChange={(event) => atualizarCampo("periodoInicio", event.target.value)}
                />
                <CampoErro texto={erros.periodoInicio} />
              </div>
              <div className="space-y-1">
                <Label>Período final *</Label>
                <Input
                  type="date"
                  value={form.periodoFim}
                  onChange={(event) => atualizarCampo("periodoFim", event.target.value)}
                />
                <CampoErro texto={erros.periodoFim} />
              </div>
              <div className="space-y-1">
                <Label>Responsável técnico *</Label>
                <Input
                  value={form.responsavelTecnico}
                  onChange={(event) => atualizarCampo("responsavelTecnico", event.target.value)}
                  onBlur={(event) => atualizarCampo("responsavelTecnico", normalizarNomePessoaInput(event.target.value))}
                />
                <CampoErro texto={erros.responsavelTecnico} />
              </div>
              <div className="space-y-1">
                <Label>Responsável legal *</Label>
                <Input
                  value={form.responsavelLegal}
                  onChange={(event) => atualizarCampo("responsavelLegal", event.target.value)}
                  onBlur={(event) => atualizarCampo("responsavelLegal", normalizarNomePessoaInput(event.target.value))}
                />
                <CampoErro texto={erros.responsavelLegal} />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Termo de fomento vinculado</Label>
                  {form.tipoParceria === "Termo de Fomento" ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => navigate("/setor-juridico/termo-fomento")}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Cadastrar termo
                    </Button>
                  ) : null}
                </div>
                {form.tipoParceria === "Termo de Fomento" ? (
                  <>
                    <Select value={form.termoFomentoId ?? ""} onChange={(event) => vincularTermoFomento(event.target.value)}>
                      <option value="">Selecione um termo cadastrado</option>
                      {termosFomentoDisponiveis.map((termo) => (
                        <option key={termo.id} value={termo.id}>
                          {termo.numeroTermo} - {termo.descricaoObjeto || termo.orgaoConcedente || "Sem descrição"}
                        </option>
                      ))}
                    </Select>
                    {!termosFomentoDisponiveis.length ? (
                      <p className="text-xs text-[var(--g3-muted)]">Nenhum termo de fomento cadastrado. Use Cadastrar termo para incluir um novo.</p>
                    ) : null}
                  </>
                ) : (
                  <p className="rounded-lg border border-dashed border-[var(--g3-border)] px-3 py-2 text-xs text-[var(--g3-muted)]">
                    O vínculo fica disponível quando o tipo da parceria for Termo de fomento.
                  </p>
                )}
              </div>
              {termoSelecionado ? (
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 p-3 xl:col-span-2">
                  <p className="text-sm font-semibold text-[var(--g3-active)]">Resumo do termo vinculado</p>
                  <p className="mt-1 text-sm text-[var(--g3-muted)]">
                    {termoSelecionado.numeroTermo} - {termoSelecionado.descricaoObjeto || "Sem objeto informado"}
                  </p>
                </div>
              ) : null}
            </div>
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "instituicao" ? (
          <section className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/25 p-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Carregar dados da unidade assistencial</Label>
                <Select
                  value={unidadeAssistencialSelecionadaId}
                  onChange={(event) => {
                    const unidadeId = event.target.value;
                    setUnidadeAssistencialSelecionadaId(unidadeId);
                    if (!unidadeId) return;
                    const unidade = unidadesAssistenciais.find(
                      (item) => item.id_unidade === unidadeId
                    );
                    if (unidade) preencherDadosDaUnidade(unidade);
                  }}
                >
                  <option value="">Selecionar unidade cadastrada</option>
                  {unidadesAssistenciais.map((item) => (
                    <option key={item.id_unidade} value={item.id_unidade}>
                      {item.nome_fantasia}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Carregar dados bancários da conta</Label>
                <Select
                  value={contaBancariaSelecionadaId}
                  onChange={(event) => {
                    const contaId = event.target.value;
                    setContaBancariaSelecionadaId(contaId);
                    if (!contaId) return;
                    const conta = contasBancarias.find((item) => String(item.id) === contaId);
                    if (conta) preencherDadosBancarios(conta);
                  }}
                >
                  <option value="">Selecionar conta cadastrada</option>
                  {contasBancarias.map((item) => (
                    <option key={item.id} value={item.id}>
                      {obterContaDescricao(item)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2">
                <Label>Razão social *</Label>
                <Input
                  value={form.razaoSocial}
                  onChange={(event) => atualizarCampo("razaoSocial", event.target.value)}
                />
                <CampoErro texto={erros.razaoSocial} />
              </div>
              <div className="space-y-1">
                <Label>Nome fantasia</Label>
                <Input
                  value={form.nomeFantasia ?? ""}
                  onChange={(event) => atualizarCampo("nomeFantasia", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>CNPJ *</Label>
                <Input
                  value={formatarCnpj(form.cnpj)}
                  onChange={(event) => atualizarCampo("cnpj", normalizarCnpj(event.target.value))}
                />
                <CampoErro texto={erros.cnpj} />
              </div>
              <div className="space-y-1">
                <Label>CEP</Label>
                <Input
                  value={formatarCep(form.cep)}
                  onChange={(event) => atualizarCampo("cep", normalizarCep(event.target.value))}
                />
                <CampoErro texto={erros.cep} />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Logradouro</Label>
                <Input
                  value={form.logradouro ?? ""}
                  onChange={(event) => atualizarCampo("logradouro", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Número</Label>
                <Input
                  value={form.numero ?? ""}
                  onChange={(event) => atualizarCampo("numero", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Complemento</Label>
                <Input
                  value={form.complemento ?? ""}
                  onChange={(event) => atualizarCampo("complemento", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Bairro</Label>
                <Input
                  value={form.bairro ?? ""}
                  onChange={(event) => atualizarCampo("bairro", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input
                  value={form.cidade ?? ""}
                  onChange={(event) => atualizarCampo("cidade", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>UF</Label>
                <Input
                  maxLength={2}
                  value={form.uf ?? ""}
                  onChange={(event) => atualizarCampo("uf", event.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input
                  value={mascararTelefoneInput(form.telefone ?? "")}
                  onChange={(event) => atualizarCampo("telefone", event.target.value.replace(/\D/g, ""))}
                />
                <CampoErro texto={erros.telefone} />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>E-mail</Label>
                <Input
                  value={form.email ?? ""}
                  onChange={(event) => atualizarCampo("email", event.target.value)}
                  onBlur={(event) => atualizarCampo("email", normalizarEmail(event.target.value))}
                />
                <CampoErro texto={erros.email} />
              </div>
              <div className="space-y-1">
                <Label>Representante legal *</Label>
                <Input
                  value={form.representanteLegal}
                  onChange={(event) => atualizarCampo("representanteLegal", event.target.value)}
                  onBlur={(event) => atualizarCampo("representanteLegal", normalizarNomePessoaInput(event.target.value))}
                />
                <CampoErro texto={erros.representanteLegal} />
              </div>
              <div className="space-y-1">
                <Label>CPF do representante *</Label>
                <Input
                  value={formatarCpf(form.representanteCpf)}
                  onChange={(event) => atualizarCampo("representanteCpf", normalizarCpf(event.target.value))}
                />
                <CampoErro texto={erros.representanteCpf} />
              </div>
              <div className="space-y-1">
                <Label>Cargo/função</Label>
                <Input
                  value={form.representanteCargo ?? ""}
                  onChange={(event) => atualizarCampo("representanteCargo", event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[var(--g3-border)] p-4">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Dados bancários da conta específica</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-1">
                <Label>Banco</Label>
                <Input value={form.bancoNome ?? ""} onChange={(event) => atualizarCampo("bancoNome", event.target.value)} />
                <CampoErro texto={erros.bancoNome} />
              </div>
              <div className="space-y-1">
                <Label>Agência</Label>
                <Input value={form.bancoAgencia ?? ""} onChange={(event) => atualizarCampo("bancoAgencia", event.target.value)} />
                <CampoErro texto={erros.bancoAgencia} />
              </div>
              <div className="space-y-1">
                <Label>Conta</Label>
                <Input value={form.bancoConta ?? ""} onChange={(event) => atualizarCampo("bancoConta", event.target.value)} />
                <CampoErro texto={erros.bancoConta} />
              </div>
                <div className="space-y-1">
                  <Label>Operação</Label>
                  <Input value={form.bancoOperacao ?? ""} onChange={(event) => atualizarCampo("bancoOperacao", event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Chave PIX</Label>
                  <Input value={form.bancoPix ?? ""} onChange={(event) => atualizarCampo("bancoPix", event.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2 xl:col-span-5">
                  <Label>Observação bancária</Label>
                  <Textarea rows={2} value={form.bancoObservacao ?? ""} onChange={(event) => atualizarCampo("bancoObservacao", event.target.value)} />
                </div>
              </div>
            </div>
          {renderNavegacaoAba()}
        </section>
      ) : null}

        {abaAtiva === "historico" ? (
          <section className="space-y-4">
            <BlocoAjuda
              titulo="Como preencher esta seção"
              texto="Explique de forma objetiva quem é a organização, o que ela faz hoje, sua experiência anterior e por que possui estrutura para executar o plano com segurança."
              itens={[
                "Informe a trajetória institucional e os principais marcos.",
                "Descreva a finalidade institucional de forma clara.",
                "Liste experiências anteriores relacionadas ao objeto proposto.",
                "Destaque registros, conselhos, certificações e capacidade operacional."
              ]}
            />
            <div className="grid gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Histórico da OSC</Label>
                  <AiFieldSuggestionButton
                    prompt={`Redija um histórico institucional claro e formal para a seção Apresentação e histórico de um plano de trabalho. ${contextoApresentacaoIa} O texto atual deste campo é: ${form.historicoOsc || "vazio"}. Preserve fatos informados, organize a trajetória, os marcos e a atuação da instituição. Se o texto atual estiver preenchido, aprimore-o e complemente-o sem inventar dados.`}
                    onApply={(suggestao) => atualizarCampo("historicoOsc", suggestao)}
                  />
                </div>
                <Textarea rows={4} value={form.historicoOsc ?? ""} onChange={(event) => atualizarCampo("historicoOsc", event.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Finalidade institucional</Label>
                  <AiFieldSuggestionButton
                    prompt={`Redija a finalidade institucional de uma organização da sociedade civil para um plano de trabalho. ${contextoApresentacaoIa} O texto atual deste campo é: ${form.finalidadeInstitucional || "vazio"}. Torne o texto claro, objetivo e alinhado à missão da instituição, sem criar informações não fornecidas.`}
                    onApply={(suggestao) => atualizarCampo("finalidadeInstitucional", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.finalidadeInstitucional ?? ""} onChange={(event) => atualizarCampo("finalidadeInstitucional", event.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Experiência anterior na área</Label>
                  <AiFieldSuggestionButton
                    prompt={`Descreva a experiência anterior da instituição na área do plano de trabalho. ${contextoApresentacaoIa} O texto atual deste campo é: ${form.experienciaAnterior || "vazio"}. Organize experiências, serviços e resultados apenas com base nas informações fornecidas; quando faltarem dados, use uma redação prudente sem inventar números ou nomes.`}
                    onApply={(suggestao) => atualizarCampo("experienciaAnterior", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.experienciaAnterior ?? ""} onChange={(event) => atualizarCampo("experienciaAnterior", event.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Conselhos, certificações ou registros</Label>
                  <AiFieldSuggestionButton
                    prompt={`Organize as informações sobre conselhos, certificações e registros da instituição para um plano de trabalho. ${contextoApresentacaoIa} O texto atual deste campo é: ${form.conselhosCertificacoes || "vazio"}. Melhore a clareza e a apresentação sem inventar certificações, números ou órgãos.`}
                    onApply={(suggestao) => atualizarCampo("conselhosCertificacoes", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.conselhosCertificacoes ?? ""} onChange={(event) => atualizarCampo("conselhosCertificacoes", event.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Público atendido atualmente</Label>
                  <AiFieldSuggestionButton
                    prompt={`Descreva o público atendido atualmente pela instituição para um plano de trabalho. ${contextoApresentacaoIa} O texto atual deste campo é: ${form.publicoAtendidoAtual || "vazio"}. Organize o perfil do público e a forma de atendimento somente com base no contexto informado, sem inventar quantitativos.`}
                    onApply={(suggestao) => atualizarCampo("publicoAtendidoAtual", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.publicoAtendidoAtual ?? ""} onChange={(event) => atualizarCampo("publicoAtendidoAtual", event.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Capacidade técnica e operacional</Label>
                  <AiFieldSuggestionButton
                    prompt={`Descreva a capacidade técnica e operacional da instituição para executar o plano de trabalho. ${contextoApresentacaoIa} O texto atual deste campo é: ${form.capacidadeTecnicaOperacional || "vazio"}. Relacione equipe, estrutura, processos e experiência apenas quando houver base nas informações fornecidas; aprimore o texto atual sem inventar dados.`}
                    onApply={(suggestao) => atualizarCampo("capacidadeTecnicaOperacional", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.capacidadeTecnicaOperacional ?? ""} onChange={(event) => atualizarCampo("capacidadeTecnicaOperacional", event.target.value)} />
              </div>
            </div>
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "objeto" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-4">
                <div className="flex items-center justify-between gap-2">
                  <Label>Descrição objetiva do que será executado *</Label>
                  <AiFieldSuggestionButton
                    prompt={`Sugira o objeto de um plano de trabalho de assistência social. Contexto: área de atuação ${form.areaAtuacao || "não informada"}, público-alvo ${form.publicoAlvo || "não informado"}, local de execução ${form.localExecucao || "não informado"}.`}
                    onApply={(suggestao) => atualizarCampo("descricaoObjeto", suggestao)}
                  />
                </div>
                <Textarea rows={4} value={form.descricaoObjeto} onChange={(event) => atualizarCampo("descricaoObjeto", event.target.value)} />
                <CampoErro texto={erros.descricaoObjeto} />
              </div>
              <div className="space-y-1">
                <Label>Área de atuação *</Label>
                <Select value={form.areaAtuacao} onChange={(event) => atualizarCampo("areaAtuacao", event.target.value)}>
                  <option value="">Selecione</option>
                  {areasAtuacao.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
                <CampoErro texto={erros.areaAtuacao} />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Local de execução *</Label>
                <Input value={form.localExecucao} onChange={(event) => atualizarCampo("localExecucao", event.target.value)} />
                <CampoErro texto={erros.localExecucao} />
              </div>
              <div className="space-y-1">
                <Label>Abrangência territorial</Label>
                <Input value={form.abrangenciaTerritorial ?? ""} onChange={(event) => atualizarCampo("abrangenciaTerritorial", event.target.value)} />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Público-alvo *</Label>
                <Input value={form.publicoAlvo} onChange={(event) => atualizarCampo("publicoAlvo", event.target.value)} />
                <CampoErro texto={erros.publicoAlvo} />
              </div>
              <div className="space-y-1">
                <Label>Quantidade estimada de beneficiários</Label>
                <Input type="number" min={0} value={form.quantidadeBeneficiarios ?? ""} onChange={(event) => atualizarCampo("quantidadeBeneficiarios", event.target.value ? Number(event.target.value) : undefined)} />
              </div>
              <div className="space-y-1 xl:col-span-4">
                <Label>Critérios de seleção dos beneficiários</Label>
                <Textarea rows={3} value={form.criteriosSelecao ?? ""} onChange={(event) => atualizarCampo("criteriosSelecao", event.target.value)} />
              </div>
            </div>
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "justificativa" ? (
          <section className="space-y-4">
            <BlocoAjuda
              titulo="Checklist de justificativa"
              texto="A justificativa deve demonstrar o problema público/social, sua relevância, a capacidade da instituição e o impacto esperado com base em dados concretos."
              itens={[
                "Qual problema social será enfrentado?",
                "Quais são as principais causas e consequências?",
                "Quais dados, indicadores ou estatísticas comprovam a necessidade?",
                "Por que a instituição está apta para executar a proposta?",
                "Qual transformação ou impacto se espera alcançar?"
              ]}
            />
            <div className="grid gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Qual problema social será enfrentado? *</Label>
                  <AiFieldSuggestionButton
                    prompt={`Descreva o problema social que justifica este plano de trabalho. Área: ${form.areaAtuacao || "não informada"}. Público-alvo: ${form.publicoAlvo || "não informado"}. Objeto: ${form.descricaoObjeto || "não informado"}. Local: ${form.localExecucao || "não informado"}. Histórico e capacidade da instituição: ${form.historicoOsc || form.capacidadeTecnicaOperacional || "não informados"}. Texto atual: ${form.problemaSocial || "vazio"}. Aprimore o texto atual quando houver, sem inventar dados ou estatísticas.`}
                    onApply={(suggestao) => atualizarCampo("problemaSocial", suggestao)}
                  />
                </div>
                <Textarea rows={4} value={form.problemaSocial} onChange={(event) => atualizarCampo("problemaSocial", event.target.value)} />
                <CampoErro texto={erros.problemaSocial} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Quais são as causas e consequências?</Label>
                  <AiFieldSuggestionButton
                    prompt={`Explique as principais causas e consequências do problema social deste plano de trabalho. Área: ${form.areaAtuacao || "não informada"}. Público-alvo: ${form.publicoAlvo || "não informado"}. Problema descrito: ${form.problemaSocial || "não informado"}. Texto atual: ${form.causasConsequencias || "vazio"}. Organize a relação de causa e efeito e aprimore o texto atual sem inventar fatos.`}
                    onApply={(suggestao) => atualizarCampo("causasConsequencias", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.causasConsequencias ?? ""} onChange={(event) => atualizarCampo("causasConsequencias", event.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Quais dados ou indicadores justificam a proposta?</Label>
                  <AiFieldSuggestionButton
                    prompt={`Sugira como apresentar os dados e indicadores que justificam este plano de trabalho. Problema social: ${form.problemaSocial || "não informado"}. Público-alvo: ${form.publicoAlvo || "não informado"}. Local: ${form.localExecucao || "não informado"}. Dados atuais informados: ${form.dadosIndicadores || "nenhum"}. Texto atual: ${form.dadosIndicadores || "vazio"}. Não invente números, fontes ou estatísticas; se não houver dados, sugira uma redação prudente indicando a necessidade de complementar as fontes.`}
                    onApply={(suggestao) => atualizarCampo("dadosIndicadores", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.dadosIndicadores ?? ""} onChange={(event) => atualizarCampo("dadosIndicadores", event.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Por que a instituição tem capacidade de executar?</Label>
                  <AiFieldSuggestionButton
                    prompt={`Justifique por que a instituição tem capacidade para executar este plano de trabalho. Histórico: ${form.historicoOsc || "não informado"}. Finalidade: ${form.finalidadeInstitucional || "não informada"}. Experiência: ${form.experienciaAnterior || "não informada"}. Capacidade técnica e operacional: ${form.capacidadeTecnicaOperacional || "não informada"}. Objeto: ${form.descricaoObjeto || "não informado"}. Texto atual: ${form.capacidadeExecucao || "vazio"}. Aprimore o texto sem inventar equipe, estrutura, certificações ou resultados.`}
                    onApply={(suggestao) => atualizarCampo("capacidadeExecucao", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.capacidadeExecucao ?? ""} onChange={(event) => atualizarCampo("capacidadeExecucao", event.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Qual impacto esperado?</Label>
                  <AiFieldSuggestionButton
                    prompt={`Descreva o impacto esperado deste plano de trabalho. Objeto: ${form.descricaoObjeto || "não informado"}. Problema social: ${form.problemaSocial || "não informado"}. Público-alvo: ${form.publicoAlvo || "não informado"}. Objetivo geral: ${form.objetivoGeral || "não informado"}. Texto atual: ${form.impactoEsperado || "vazio"}. Relacione mudanças esperadas de forma clara e mensurável quando houver base, sem inventar números ou resultados garantidos.`}
                    onApply={(suggestao) => atualizarCampo("impactoEsperado", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.impactoEsperado ?? ""} onChange={(event) => atualizarCampo("impactoEsperado", event.target.value)} />
              </div>
            </div>
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "objetivos" ? (
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label>Objetivo geral *</Label>
                <AiFieldSuggestionButton
                  prompt={`Sugira um objetivo geral para um plano de trabalho de assistência social. Objeto: ${form.descricaoObjeto || "não informado"}. Problema social: ${form.problemaSocial || "não informado"}. Público-alvo: ${form.publicoAlvo || "não informado"}.`}
                  onApply={(suggestao) => atualizarCampo("objetivoGeral", suggestao)}
                />
              </div>
              <Textarea rows={3} value={form.objetivoGeral} onChange={(event) => atualizarCampo("objetivoGeral", event.target.value)} />
              <CampoErro texto={erros.objetivoGeral} />
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--g3-border)] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--g3-active)]">Objetivos específicos</h3>
                <Button type="button" size="sm" onClick={() => setForm((atual) => ({ ...atual, objetivosEspecificos: [...(atual.objetivosEspecificos ?? []), novoObjetivoEspecifico()] }))}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar objetivo
                </Button>
              </div>
              {(form.objetivosEspecificos ?? []).length ? (
                <div className="space-y-3">
                  {(form.objetivosEspecificos ?? []).map((objetivo, index) => (
                    <div key={`objetivo-${index}`} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-4">
                      <div className="grid gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Label>Descrição</Label>
                            <AiFieldSuggestionButton
                              prompt={`Sugira um objetivo específico mensurável para o plano. Objeto: ${form.descricaoObjeto || "não informado"}. Objetivo geral: ${form.objetivoGeral || "não informado"}.`}
                              onApply={(suggestao) => atualizarObjetivo(index, { descricao: suggestao })}
                            />
                          </div>
                          <Textarea rows={2} value={objetivo.descricao} onChange={(event) => atualizarObjetivo(index, { descricao: event.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label>Resultado esperado</Label>
                          <Textarea rows={2} value={objetivo.resultadoEsperado ?? ""} onChange={(event) => atualizarObjetivo(index, { resultadoEsperado: event.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label>Relação com metas</Label>
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {(form.metas ?? []).length ? (
                              (form.metas ?? []).map((meta) => {
                                const checked = (objetivo.metasVinculadas ?? []).includes(meta.numeroMeta);
                                return (
                                  <label key={`${meta.numeroMeta}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-[var(--g3-border)] px-3 py-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) =>
                                        atualizarObjetivo(index, {
                                          metasVinculadas: event.target.checked
                                            ? [...(objetivo.metasVinculadas ?? []), meta.numeroMeta]
                                            : (objetivo.metasVinculadas ?? []).filter((item) => item !== meta.numeroMeta)
                                        })
                                      }
                                    />
                                    {meta.numeroMeta || "Meta sem número"} - {meta.descricao || "Sem descrição"}
                                  </label>
                                );
                              })
                            ) : (
                              <p className="text-sm text-[var(--g3-muted)]">Cadastre metas para habilitar a vinculação.</p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button type="button" variant="danger" size="sm" onClick={() => setForm((atual) => ({ ...atual, objetivosEspecificos: (atual.objetivosEspecificos ?? []).filter((_, idx) => idx !== index) }))}>
                            Remover
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--g3-muted)]">Nenhum objetivo específico cadastrado.</p>
              )}
            </div>
            <CampoErro texto={erros.objetivosEspecificos} />
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "metas" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] p-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--g3-active)]">Metas, etapas e indicadores</h3>
                <p className="text-sm text-[var(--g3-muted)]">Cada meta precisa ser clara, específica, mensurável e vinculada às entregas do plano.</p>
              </div>
              <Button type="button" size="sm" onClick={() => setForm((atual) => ({ ...atual, metas: [...(atual.metas ?? []), novaMeta()] }))}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Adicionar meta
              </Button>
            </div>

            {(form.metas ?? []).length ? (
              <div className="space-y-4">
                {(form.metas ?? []).map((meta, metaIndex) => (
                  <div key={`meta-${metaIndex}`} className="rounded-xl border border-[var(--g3-border)] p-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <div className="space-y-1">
                        <Label>Número da meta *</Label>
                        <Input value={meta.numeroMeta} onChange={(event) => atualizarMeta(metaIndex, { numeroMeta: event.target.value })} />
                      </div>
                      <div className="space-y-1 xl:col-span-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label>Descrição da meta *</Label>
                          <AiFieldSuggestionButton
                            prompt={`Sugira uma meta clara, específica e mensurável para o plano. Objeto: ${form.descricaoObjeto || "não informado"}. Objetivo geral: ${form.objetivoGeral || "não informado"}. Público-alvo: ${form.publicoAlvo || "não informado"}.`}
                            onApply={(suggestao) => atualizarMeta(metaIndex, { descricao: suggestao })}
                          />
                        </div>
                        <Input value={meta.descricao} onChange={(event) => atualizarMeta(metaIndex, { descricao: event.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Indicador de resultado</Label>
                        <Input value={meta.indicadorResultado ?? ""} onChange={(event) => atualizarMeta(metaIndex, { indicadorResultado: event.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Unidade de medida</Label>
                        <Input value={meta.unidadeMedida ?? ""} onChange={(event) => atualizarMeta(metaIndex, { unidadeMedida: event.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Quantidade prevista</Label>
                        <Input type="number" min={0} value={meta.quantidadePrevista ?? ""} onChange={(event) => atualizarMeta(metaIndex, { quantidadePrevista: event.target.value ? Number(event.target.value) : undefined })} />
                      </div>
                      <div className="space-y-1 xl:col-span-2">
                        <Label>Meio de verificação</Label>
                        <Input value={meta.meioVerificacao ?? ""} onChange={(event) => atualizarMeta(metaIndex, { meioVerificacao: event.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Data inicial</Label>
                        <Input type="date" min={form.periodoInicio || undefined} max={form.periodoFim || undefined} value={meta.dataInicio ?? ""} onChange={(event) => atualizarMeta(metaIndex, { dataInicio: event.target.value })} />
                        <CampoErro texto={erros[`meta_${metaIndex}_dataInicio`]} />
                      </div>
                      <div className="space-y-1">
                        <Label>Data final</Label>
                        <Input type="date" min={form.periodoInicio || undefined} max={form.periodoFim || undefined} value={meta.dataFim ?? ""} onChange={(event) => atualizarMeta(metaIndex, { dataFim: event.target.value })} />
                        <CampoErro texto={erros[`meta_${metaIndex}_dataFim`]} />
                      </div>
                      <div className="space-y-1">
                        <Label>Responsável</Label>
                        <Input value={meta.responsavel ?? ""} onChange={(event) => atualizarMeta(metaIndex, { responsavel: event.target.value })} onBlur={(event) => atualizarMeta(metaIndex, { responsavel: normalizarNomePessoaInput(event.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Situação</Label>
                        <Select value={meta.situacao ?? "Planejada"} onChange={(event) => atualizarMeta(metaIndex, { situacao: event.target.value })}>
                          {statusMetaEtapa.map((item) => <option key={item} value={item}>{item}</option>)}
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[var(--g3-active)]">Etapas/fases da meta</p>
                        <Button type="button" size="sm" variant="outline" onClick={() => atualizarMeta(metaIndex, { etapas: [...(meta.etapas ?? []), novaEtapaMeta()] })}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Adicionar etapa
                        </Button>
                      </div>
                      {(meta.etapas ?? []).length ? (
                        <div className="space-y-3">
                          {(meta.etapas ?? []).map((etapa, etapaIndex) => (
                            <div key={`etapa-${metaIndex}-${etapaIndex}`} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4">
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div className="space-y-1">
                                  <Label>Nome da etapa/fase *</Label>
                                  <Input value={etapa.nome} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { nome: event.target.value })} />
                                </div>
                                <div className="space-y-1 xl:col-span-2">
                                  <Label>Ação a executar</Label>
                                  <Input value={etapa.acaoExecutar ?? ""} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { acaoExecutar: event.target.value })} />
                                </div>
                                <div className="space-y-1">
                                  <Label>Situação</Label>
                                  <Select value={etapa.situacao ?? "Planejada"} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { situacao: event.target.value })}>
                                    {statusMetaEtapa.map((item) => <option key={item} value={item}>{item}</option>)}
                                  </Select>
                                </div>
                                <div className="space-y-1 xl:col-span-4">
                                  <Label>Descrição detalhada</Label>
                                  <Textarea rows={2} value={etapa.descricaoDetalhada ?? ""} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { descricaoDetalhada: event.target.value })} />
                                </div>
                                <div className="space-y-1">
                                  <Label>Público atendido</Label>
                                  <Input value={etapa.publicoAtendido ?? ""} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { publicoAtendido: event.target.value })} />
                                </div>
                                <div className="space-y-1">
                                  <Label>Quantidade</Label>
                                  <Input type="number" min={0} value={etapa.quantidade ?? ""} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { quantidade: event.target.value ? Number(event.target.value) : undefined })} />
                                </div>
                                <div className="space-y-1">
                                  <Label>Unidade</Label>
                                  <Input value={etapa.unidade ?? ""} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { unidade: event.target.value })} />
                                </div>
                                <div className="space-y-1">
                                  <Label>Local</Label>
                                  <Input value={etapa.local ?? ""} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { local: event.target.value })} />
                                </div>
                                <div className="space-y-1">
                                  <Label>Data inicial</Label>
                                  <Input type="date" min={form.periodoInicio || undefined} max={form.periodoFim || undefined} value={etapa.dataInicio ?? ""} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { dataInicio: event.target.value })} />
                                  <CampoErro texto={erros[`meta_${metaIndex}_etapa_${etapaIndex}_dataInicio`]} />
                                </div>
                                <div className="space-y-1">
                                  <Label>Data final</Label>
                                  <Input type="date" min={form.periodoInicio || undefined} max={form.periodoFim || undefined} value={etapa.dataFim ?? ""} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { dataFim: event.target.value })} />
                                  <CampoErro texto={erros[`meta_${metaIndex}_etapa_${etapaIndex}_dataFim`]} />
                                </div>
                                <div className="space-y-1">
                                  <Label>Valor estimado</Label>
                                  <Input type="number" min={0} step="0.01" value={etapa.valorEstimado ?? ""} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { valorEstimado: event.target.value ? Number(event.target.value) : undefined })} />
                                </div>
                                <div className="space-y-1">
                                  <Label>Responsável</Label>
                                  <Input value={etapa.responsavel ?? ""} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { responsavel: event.target.value })} onBlur={(event) => atualizarEtapa(metaIndex, etapaIndex, { responsavel: normalizarNomePessoaInput(event.target.value) })} />
                                </div>
                                <div className="space-y-1 xl:col-span-4">
                                  <Label>Documento comprobatório esperado</Label>
                                  <Input value={etapa.documentoComprobatorioEsperado ?? ""} onChange={(event) => atualizarEtapa(metaIndex, etapaIndex, { documentoComprobatorioEsperado: event.target.value })} />
                                </div>
                              </div>
                              <div className="mt-3 flex justify-end">
                                <Button type="button" variant="danger" size="sm" onClick={() => atualizarMeta(metaIndex, { etapas: (meta.etapas ?? []).filter((_, idx) => idx !== etapaIndex) })}>
                                  Remover etapa
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--g3-muted)]">Nenhuma etapa cadastrada para esta meta.</p>
                      )}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button type="button" variant="danger" size="sm" onClick={() => setForm((atual) => ({ ...atual, metas: (atual.metas ?? []).filter((_, idx) => idx !== metaIndex) }))}>
                        Remover meta
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--g3-border)] p-6 text-center text-sm text-[var(--g3-muted)]">
                Nenhuma meta cadastrada.
              </div>
            )}
            <CampoErro texto={erros.metas || erros.metasIndicadores || erros.metasEtapas || erros.etapasResponsavel} />
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "cronograma" ? (
          <section className="space-y-4">
            <BlocoAjuda
              titulo="Cronograma gerado automaticamente"
              texto="O cronograma de execução é montado a partir das metas e etapas cadastradas. Revise sempre se as datas estão dentro do período de execução e se cada etapa tem responsável."
            />
            <div className="overflow-x-auto rounded-xl border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Meta</th>
                    <th className="px-3 py-2 text-left">Etapa/fase</th>
                    <th className="px-3 py-2 text-left">Especificação</th>
                    <th className="px-3 py-2 text-left">Unidade</th>
                    <th className="px-3 py-2 text-left">Quantidade</th>
                    <th className="px-3 py-2 text-left">Início</th>
                    <th className="px-3 py-2 text-left">Término</th>
                    <th className="px-3 py-2 text-left">Responsável</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cronogramaExecucao.length ? (
                    cronogramaExecucao.map((item, index) => (
                      <tr key={`${item.metaNumero}-${item.etapaNome}-${index}`} className="border-t border-[var(--g3-border)]">
                        <td className="px-3 py-2">{item.metaNumero}</td>
                        <td className="px-3 py-2">{item.etapaNome}</td>
                        <td className="px-3 py-2">{item.especificacao}</td>
                        <td className="px-3 py-2">{item.unidade || "---"}</td>
                        <td className="px-3 py-2">{item.quantidade ?? "---"}</td>
                        <td className="px-3 py-2">{formatarDataPtBr(item.inicio)}</td>
                        <td className="px-3 py-2">{formatarDataPtBr(item.termino)}</td>
                        <td className="px-3 py-2">{item.responsavel || "---"}</td>
                        <td className="px-3 py-2">{item.status || "---"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-[var(--g3-muted)]">
                        Cadastre metas e etapas para gerar o cronograma.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3">
              {cronogramaExecucao.length ? (
                cronogramaExecucao.map((item, index) => (
                  <div key={`timeline-${index}`} className="flex gap-3 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4">
                    <div className="mt-1 h-3 w-3 rounded-full bg-[var(--g3-primary)]" />
                    <div>
                      <p className="font-semibold text-[var(--g3-foreground)]">
                        {item.metaNumero} - {item.etapaNome}
                      </p>
                      <p className="text-sm text-[var(--g3-muted)]">{item.especificacao}</p>
                      <p className="mt-1 text-xs text-[var(--g3-muted)]">
                        {formatarDataPtBr(item.inicio)} até {formatarDataPtBr(item.termino)} • {item.responsavel || "Sem responsável"}
                      </p>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
            <CampoErro texto={erros.cronogramaExecucao} />
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "aplicacao" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] p-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--g3-active)]">Plano de aplicação dos recursos</h3>
                <p className="text-sm text-[var(--g3-muted)]">Lance as despesas previstas, vinculando meta, etapa e fonte do recurso sempre que possível.</p>
              </div>
              <Button type="button" size="sm" onClick={() => setForm((atual) => ({ ...atual, aplicacaoRecursos: [...(atual.aplicacaoRecursos ?? []), novoItemAplicacao()] }))}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Adicionar despesa
              </Button>
            </div>

            {(form.aplicacaoRecursos ?? []).length ? (
              <div className="space-y-3">
                {(form.aplicacaoRecursos ?? []).map((item, index) => (
                  <div key={`aplicacao-${index}`} className="rounded-xl border border-[var(--g3-border)] p-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <div className="space-y-1">
                        <Label>Categoria da despesa *</Label>
                        <Select value={item.categoriaDespesa} onChange={(event) => atualizarAplicacao(index, { categoriaDespesa: event.target.value })}>
                          <option value="">Selecione</option>
                          {naturezasDespesa.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Item *</Label>
                        <Input value={item.item} onChange={(event) => atualizarAplicacao(index, { item: event.target.value })} />
                      </div>
                      <div className="space-y-1 xl:col-span-3">
                        <Label>Descrição</Label>
                        <Input value={item.descricao ?? ""} onChange={(event) => atualizarAplicacao(index, { descricao: event.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Quantidade</Label>
                        <Input type="number" min={0} step="0.01" value={item.quantidade ?? ""} onChange={(event) => atualizarAplicacao(index, { quantidade: event.target.value ? Number(event.target.value) : undefined })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Unidade</Label>
                        <Input value={item.unidade ?? ""} onChange={(event) => atualizarAplicacao(index, { unidade: event.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Valor unitário</Label>
                        <Input type="number" min={0} step="0.01" value={item.valorUnitario ?? ""} onChange={(event) => atualizarAplicacao(index, { valorUnitario: event.target.value ? Number(event.target.value) : undefined })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Valor total</Label>
                        <Input type="number" min={0} step="0.01" value={item.valorTotal ?? ""} onChange={(event) => atualizarAplicacao(index, { valorTotal: event.target.value ? Number(event.target.value) : undefined })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Fonte do recurso</Label>
                        <Select value={item.fonteRecurso ?? ""} onChange={(event) => atualizarAplicacao(index, { fonteRecurso: event.target.value })}>
                          <option value="">Selecione</option>
                          {fontesRecurso.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Meta vinculada</Label>
                        <Select value={item.metaNumero ?? ""} onChange={(event) => atualizarAplicacao(index, { metaNumero: event.target.value })}>
                          <option value="">Selecione</option>
                          {(form.metas ?? []).map((meta) => <option key={meta.numeroMeta} value={meta.numeroMeta}>{meta.numeroMeta} - {meta.descricao}</option>)}
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Etapa vinculada</Label>
                        <Input value={item.etapaNome ?? ""} onChange={(event) => atualizarAplicacao(index, { etapaNome: event.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Natureza da despesa</Label>
                        <Input value={item.naturezaDespesa ?? ""} onChange={(event) => atualizarAplicacao(index, { naturezaDespesa: event.target.value })} />
                      </div>
                      <div className="space-y-1 xl:col-span-3">
                        <Label>Observação</Label>
                        <Input value={item.observacao ?? ""} onChange={(event) => atualizarAplicacao(index, { observacao: event.target.value })} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-[var(--g3-muted)]">
                        Valor calculado: <span className="font-semibold text-[var(--g3-foreground)]">{formatarMoeda(calcularValorTotalAplicacao(item))}</span>
                      </p>
                      <Button type="button" variant="danger" size="sm" onClick={() => setForm((atual) => ({ ...atual, aplicacaoRecursos: (atual.aplicacaoRecursos ?? []).filter((_, idx) => idx !== index) }))}>
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--g3-border)] p-6 text-center text-sm text-[var(--g3-muted)]">
                Nenhuma despesa cadastrada.
              </div>
            )}
            <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 px-4 py-3 text-sm">
              Total do plano de aplicação: <span className="font-semibold">{formatarMoeda(totalAplicacao)}</span>
            </div>
            <CampoErro texto={erros.aplicacaoRecursos} />
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "desembolso" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[var(--g3-border)] p-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--g3-active)]">Cronograma de desembolso</h3>
                <p className="text-sm text-[var(--g3-muted)]">Distribua os valores por mês/ano e confira a igualdade com o plano de aplicação.</p>
              </div>
              <Button type="button" size="sm" onClick={() => setForm((atual) => ({ ...atual, desembolso: [...(atual.desembolso ?? []), novoDesembolso()] }))}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Adicionar desembolso
              </Button>
            </div>
            {(form.desembolso ?? []).length ? (
              <div className="space-y-3">
                {(form.desembolso ?? []).map((item, index) => (
                  <div key={`desembolso-${index}`} className="rounded-xl border border-[var(--g3-border)] p-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <div className="space-y-1">
                        <Label>Mês/ano</Label>
                        <Input value={item.mesAno} placeholder="MM/AAAA" onChange={(event) => atualizarDesembolso(index, { mesAno: formatarMesAnoInput(event.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Valor previsto</Label>
                        <Input type="number" min={0} step="0.01" value={item.valorPrevisto ?? ""} onChange={(event) => atualizarDesembolso(index, { valorPrevisto: event.target.value ? Number(event.target.value) : undefined })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Fonte do recurso</Label>
                        <Select value={item.fonteRecurso ?? ""} onChange={(event) => atualizarDesembolso(index, { fonteRecurso: event.target.value })}>
                          <option value="">Selecione</option>
                          {fontesRecurso.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Meta vinculada</Label>
                        <Select value={item.metaNumero ?? ""} onChange={(event) => atualizarDesembolso(index, { metaNumero: event.target.value })}>
                          <option value="">Selecione</option>
                          {(form.metas ?? []).map((meta) => <option key={meta.numeroMeta} value={meta.numeroMeta}>{meta.numeroMeta}</option>)}
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Observação</Label>
                        <Input value={item.observacao ?? ""} onChange={(event) => atualizarDesembolso(index, { observacao: event.target.value })} />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button type="button" variant="danger" size="sm" onClick={() => setForm((atual) => ({ ...atual, desembolso: (atual.desembolso ?? []).filter((_, idx) => idx !== index) }))}>
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--g3-border)] p-6 text-center text-sm text-[var(--g3-muted)]">
                Nenhum desembolso cadastrado.
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 px-4 py-3 text-sm">
                Total do plano de aplicação: <span className="font-semibold">{formatarMoeda(totalAplicacao)}</span>
              </div>
              <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 px-4 py-3 text-sm">
                Total do desembolso: <span className="font-semibold">{formatarMoeda(totalDesembolso)}</span>
              </div>
            </div>
            {Math.abs(totalAplicacao - totalDesembolso) > 0.009 ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Há divergência entre o total do plano de aplicação e o cronograma de desembolso.
              </div>
            ) : null}
            <CampoErro texto={erros.desembolso} />
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "monitoramento" ? (
          <section className="space-y-4">
            <div className="grid gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Forma de acompanhamento</Label>
                  <AiFieldSuggestionButton
                    prompt={`Sugira uma forma clara de acompanhamento e monitoramento para este plano de trabalho. Objeto: ${form.descricaoObjeto || "não informado"}. Metas: ${form.metas.length ? form.metas.map((meta) => meta.descricao).join("; ") : "não informadas"}. Público-alvo: ${form.publicoAlvo || "não informado"}. Instrumentos selecionados: ${form.instrumentosMonitoramento?.join(", ") || "não informados"}. Texto atual: ${form.formaAcompanhamento || "vazio"}. Aprimore o texto existente sem inventar estruturas ou procedimentos não informados.`}
                    onApply={(suggestao) => atualizarCampo("formaAcompanhamento", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.formaAcompanhamento ?? ""} onChange={(event) => atualizarCampo("formaAcompanhamento", event.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Indicadores de monitoramento</Label>
                  <AiFieldSuggestionButton
                    prompt={`Sugira indicadores de monitoramento para este plano de trabalho. Objeto: ${form.descricaoObjeto || "não informado"}. Objetivo geral: ${form.objetivoGeral || "não informado"}. Metas: ${form.metas.length ? form.metas.map((meta) => meta.descricao).join("; ") : "não informadas"}. Resultado esperado: ${form.resultadoEsperadoMonitoramento || "não informado"}. Texto atual: ${form.indicadoresMonitoramento || "vazio"}. Proponha indicadores observáveis e formas de verificação sem inventar metas numéricas.`}
                    onApply={(suggestao) => atualizarCampo("indicadoresMonitoramento", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.indicadoresMonitoramento ?? ""} onChange={(event) => atualizarCampo("indicadoresMonitoramento", event.target.value)} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Periodicidade</Label>
                    <AiFieldSuggestionButton
                      prompt={`Sugira uma periodicidade adequada para o monitoramento deste plano de trabalho, considerando objeto, metas, indicadores e complexidade da execução. Objeto: ${form.descricaoObjeto || "não informado"}. Indicadores: ${form.indicadoresMonitoramento || "não informados"}. Valor atual: ${form.periodicidadeMonitoramento || "vazio"}. Responda somente com uma sugestão curta como mensal, bimestral, trimestral ou semestral.`}
                      onApply={(suggestao) => atualizarCampo("periodicidadeMonitoramento", suggestao)}
                    />
                  </div>
                  <Input value={form.periodicidadeMonitoramento ?? ""} onChange={(event) => atualizarCampo("periodicidadeMonitoramento", event.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Responsável pela coleta dos dados</Label>
                    <AiFieldSuggestionButton
                      prompt={`Sugira como identificar o responsável pela coleta dos dados do monitoramento deste plano. Instituição: ${form.razaoSocial || form.nomeFantasia || "não informada"}. Capacidade técnica: ${form.capacidadeTecnicaOperacional || "não informada"}. Forma de acompanhamento: ${form.formaAcompanhamento || "não informada"}. Valor atual: ${form.responsavelColetaDados || "vazio"}. Se não houver nome informado, indique uma função ou equipe sem inventar pessoa.`}
                      onApply={(suggestao) => atualizarCampo("responsavelColetaDados", suggestao)}
                    />
                  </div>
                  <Input value={form.responsavelColetaDados ?? ""} onChange={(event) => atualizarCampo("responsavelColetaDados", event.target.value)} onBlur={(event) => atualizarCampo("responsavelColetaDados", normalizarNomePessoaInput(event.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Instrumentos</Label>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {instrumentosMonitoramentoOptions.map((item) => {
                    const checked = (form.instrumentosMonitoramento ?? []).includes(item);
                    return (
                      <label key={item} className="inline-flex items-center gap-2 rounded-lg border border-[var(--g3-border)] px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            atualizarCampo(
                              "instrumentosMonitoramento",
                              event.target.checked
                                ? [...(form.instrumentosMonitoramento ?? []), item]
                                : (form.instrumentosMonitoramento ?? []).filter((valor) => valor !== item)
                            )
                          }
                        />
                        {item}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Resultado esperado</Label>
                  <AiFieldSuggestionButton
                    prompt={`Descreva os resultados esperados do monitoramento deste plano de trabalho. Objeto: ${form.descricaoObjeto || "não informado"}. Objetivo geral: ${form.objetivoGeral || "não informado"}. Indicadores: ${form.indicadoresMonitoramento || "não informados"}. Público-alvo: ${form.publicoAlvo || "não informado"}. Texto atual: ${form.resultadoEsperadoMonitoramento || "vazio"}. Aprimore o texto com resultados verificáveis, sem inventar números ou garantias.`}
                    onApply={(suggestao) => atualizarCampo("resultadoEsperadoMonitoramento", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.resultadoEsperadoMonitoramento ?? ""} onChange={(event) => atualizarCampo("resultadoEsperadoMonitoramento", event.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label>Evidências obrigatórias</Label>
                  <AiFieldSuggestionButton
                    prompt={`Sugira evidências e documentos que comprovem a execução e os resultados deste plano de trabalho. Objeto: ${form.descricaoObjeto || "não informado"}. Metas: ${form.metas.length ? form.metas.map((meta) => meta.descricao).join("; ") : "não informadas"}. Instrumentos de monitoramento: ${form.instrumentosMonitoramento?.join(", ") || "não informados"}. Texto atual: ${form.evidenciasObrigatorias || "vazio"}. Organize a lista e aprimore o texto existente sem inventar exigências legais específicas.`}
                    onApply={(suggestao) => atualizarCampo("evidenciasObrigatorias", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.evidenciasObrigatorias ?? ""} onChange={(event) => atualizarCampo("evidenciasObrigatorias", event.target.value)} />
              </div>
            </div>
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "prestacao" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <Label>Periodicidade</Label>
                <Select value={form.periodicidadePrestacao ?? ""} onChange={(event) => atualizarCampo("periodicidadePrestacao", event.target.value)}>
                  <option value="">Selecione</option>
                  {periodosPrestacao.map((item) => <option key={item} value={item}>{item}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data limite de entrega</Label>
                <Input type="date" value={form.dataLimitePrestacao ?? ""} onChange={(event) => atualizarCampo("dataLimitePrestacao", event.target.value)} />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Responsável</Label>
                  <AiFieldSuggestionButton
                    prompt={`Sugira o perfil ou função responsável pela prestação de contas deste plano. Instituição: ${form.razaoSocial || form.nomeFantasia || "não informada"}. Capacidade técnica: ${form.capacidadeTecnicaOperacional || "não informada"}. Texto atual: ${form.responsavelPrestacao || "vazio"}. Se não houver nome informado, sugira uma função sem inventar pessoa.`}
                    onApply={(suggestao) => atualizarCampo("responsavelPrestacao", suggestao)}
                  />
                </div>
                <Input value={form.responsavelPrestacao ?? ""} onChange={(event) => atualizarCampo("responsavelPrestacao", event.target.value)} onBlur={(event) => atualizarCampo("responsavelPrestacao", normalizarNomePessoaInput(event.target.value))} />
              </div>
              <div className="space-y-1 xl:col-span-4">
                <div className="flex items-center justify-between gap-2">
                  <Label>Documentos exigidos</Label>
                  <AiFieldSuggestionButton
                    prompt={`Sugira uma lista de documentos para a prestação de contas deste plano de trabalho. Objeto: ${form.descricaoObjeto || "não informado"}. Metas: ${form.metas.length ? form.metas.map((meta) => meta.descricao).join("; ") : "não informadas"}. Forma de acompanhamento: ${form.formaAcompanhamento || "não informada"}. Evidências obrigatórias: ${form.evidenciasObrigatorias || "não informadas"}. Texto atual: ${form.documentosExigidos || "vazio"}. Organize os itens sem inventar uma exigência legal específica e considere os documentos normalmente relacionados à execução descrita.`}
                    onApply={(suggestao) => atualizarCampo("documentosExigidos", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.documentosExigidos ?? ""} onChange={(event) => atualizarCampo("documentosExigidos", event.target.value)} />
              </div>
              <div className="space-y-1 xl:col-span-4">
                <div className="flex items-center justify-between gap-2">
                  <Label>Observações</Label>
                  <AiFieldSuggestionButton
                    prompt={`Redija observações úteis para a prestação de contas deste plano de trabalho. Objeto: ${form.descricaoObjeto || "não informado"}. Periodicidade: ${form.periodicidadePrestacao || "não informada"}. Responsável: ${form.responsavelPrestacao || "não informado"}. Documentos exigidos: ${form.documentosExigidos || "não informados"}. Texto atual: ${form.observacoesPrestacao || "vazio"}. Aprimore o texto atual com orientações práticas, sem criar prazos ou obrigações não informados.`}
                    onApply={(suggestao) => atualizarCampo("observacoesPrestacao", suggestao)}
                  />
                </div>
                <Textarea rows={3} value={form.observacoesPrestacao ?? ""} onChange={(event) => atualizarCampo("observacoesPrestacao", event.target.value)} />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--g3-border)] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--g3-active)]">Checklist de documentos</h3>
                <Button type="button" size="sm" onClick={() => setForm((atual) => ({ ...atual, checklistPrestacao: [...(atual.checklistPrestacao ?? []), novoChecklistPrestacao()] }))}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar item
                </Button>
              </div>
              {(form.checklistPrestacao ?? []).length ? (
                <div className="space-y-3">
                  {(form.checklistPrestacao ?? []).map((item, index) => (
                    <div key={`checklist-${index}`} className="grid gap-3 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                      <div className="space-y-1">
                        <Label>Documento</Label>
                        <Input value={item.descricao} onChange={(event) => atualizarChecklist(index, { descricao: event.target.value })} />
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={item.obrigatorio !== false} onChange={(event) => atualizarChecklist(index, { obrigatorio: event.target.checked })} />
                        Obrigatório
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={Boolean(item.concluido)} onChange={(event) => atualizarChecklist(index, { concluido: event.target.checked })} />
                        Concluído
                      </label>
                      <Button type="button" variant="danger" size="sm" onClick={() => setForm((atual) => ({ ...atual, checklistPrestacao: (atual.checklistPrestacao ?? []).filter((_, idx) => idx !== index) }))}>
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--g3-muted)]">Nenhum item no checklist.</p>
              )}
            </div>
            <CampoErro texto={erros.checklistPrestacao} />
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "anexos" ? (
          <section className="space-y-4">
            <div className="rounded-xl border border-[var(--g3-border)] p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label>Tipo do anexo</Label>
                  <Select value={tipoAnexo} onChange={(event) => setTipoAnexo(event.target.value)}>
                    {tiposAnexo.map((item) => <option key={item} value={item}>{item}</option>)}
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Observação</Label>
                  <Input value={observacaoAnexo} onChange={(event) => setObservacaoAnexo(event.target.value)} placeholder="Ex.: certidão negativa de débitos" />
                </div>
                <div className="space-y-1">
                  <Label>Arquivo</Label>
                  <Input ref={fileInputRef} type="file" onChange={(event) => setArquivoSelecionado(event.target.files?.[0] ?? null)} />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="button" onClick={() => void anexarDocumento()} disabled={uploading}>
                  {uploading ? "Anexando..." : "Anexar documento"}
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--g3-border)] p-4">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Documentos anexados</h3>
              {carregandoArquivos ? (
                <p className="text-sm text-[var(--g3-muted)]">Carregando anexos...</p>
              ) : arquivos.length ? (
                arquivos.map((arquivo) => (
                  <div key={arquivo.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3">
                    <div>
                      <p className="font-semibold text-[var(--g3-foreground)]">{arquivo.nomeOriginal}</p>
                      <p className="text-xs text-[var(--g3-muted)]">{arquivo.observacao || "Sem observação"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(resolverUrlArquivo(arquivo.caminhoArquivo), "_blank", "noopener,noreferrer")}>
                        Abrir
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => void excluirAnexo(arquivo.id)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--g3-muted)]">Nenhum documento anexado.</p>
              )}
            </div>
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "declaracao" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <Label>Local</Label>
                <Input value={form.localDeclaracao ?? ""} onChange={(event) => atualizarCampo("localDeclaracao", event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Data</Label>
                <Input type="date" value={form.dataDeclaracao ?? ""} onChange={(event) => atualizarCampo("dataDeclaracao", event.target.value)} />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Nome do representante legal</Label>
                <Input value={form.nomeRepresentanteDeclaracao ?? ""} onChange={(event) => atualizarCampo("nomeRepresentanteDeclaracao", event.target.value)} onBlur={(event) => atualizarCampo("nomeRepresentanteDeclaracao", normalizarNomePessoaInput(event.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>CPF</Label>
                <Input value={formatarCpf(form.cpfRepresentanteDeclaracao)} onChange={(event) => atualizarCampo("cpfRepresentanteDeclaracao", normalizarCpf(event.target.value))} />
                <CampoErro texto={erros.cpfRepresentanteDeclaracao} />
              </div>
              <div className="space-y-1">
                <Label>Cargo</Label>
                <Input value={form.cargoRepresentanteDeclaracao ?? ""} onChange={(event) => atualizarCampo("cargoRepresentanteDeclaracao", event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Aprovação interna</Label>
                <Input value={form.aprovacaoInterna ?? ""} onChange={(event) => atualizarCampo("aprovacaoInterna", event.target.value)} placeholder="Ex.: Diretoria executiva" />
              </div>
              <div className="space-y-1">
                <Label>Situação da aprovação</Label>
                <Input value={form.situacaoAprovacao ?? ""} onChange={(event) => atualizarCampo("situacaoAprovacao", event.target.value)} placeholder="Ex.: Aprovado internamente" />
              </div>
              <div className="space-y-1 xl:col-span-4">
                <Label>Observação do aprovador</Label>
                <Textarea rows={3} value={form.observacaoAprovador ?? ""} onChange={(event) => atualizarCampo("observacaoAprovador", event.target.value)} />
              </div>
              <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 p-4 xl:col-span-4">
                <label className="inline-flex items-start gap-3 text-sm text-[var(--g3-foreground)]">
                  <input type="checkbox" checked={Boolean(form.declaracaoVeracidade)} onChange={(event) => atualizarCampo("declaracaoVeracidade", event.target.checked)} />
                  Declaro que as informações apresentadas neste plano de trabalho são verdadeiras, coerentes com a capacidade institucional da organização e compatíveis com a parceria proposta.
                </label>
                <CampoErro texto={erros.declaracaoVeracidade} />
              </div>
            </div>

            <div className="rounded-xl border border-[var(--g3-border)] p-4">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Checklist final de conformidade</h3>
              <div className="mt-3 grid gap-2">
                {Object.keys(pendenciasEnvio).length ? (
                  Object.values(pendenciasEnvio).map((item) => (
                    <div key={item} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    Nenhuma pendência crítica encontrada. O plano está pronto para análise.
                  </div>
                )}
              </div>
            </div>
            {renderNavegacaoAba()}
          </section>
        ) : null}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarExclusao}
        titulo="Confirmar exclusão"
        texto="Esta ação é irreversível. Deseja excluir definitivamente este plano de trabalho?"
        processando={processando}
        onCancel={() => setConfirmarExclusao(false)}
        onConfirm={() => void excluirAtual()}
        confirmarTexto="Excluir"
      />
    </>
  );
}
