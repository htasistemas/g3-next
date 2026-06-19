import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  ChartColumn,
  CheckSquare2,
  FileText,
  FolderHeart,
  History,
  Plus,
  RefreshCw,
  Save,
  UserSearch,
  UsersRound
} from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCandidatoBancoEmpregos,
  useCandidatosBancoEmpregos,
  useDashboardBancoEmpregos,
  useHistoricoBancoEmpregos,
  useInativarCandidatoBancoEmpregos,
  useProcessoBancoEmpregos,
  useProcessosBancoEmpregos,
  useRemoverDocumentoBancoEmpregos,
  useRemoverVagaBancoEmpregos,
  useSalvarAvaliacaoBancoEmpregos,
  useSalvarCandidatoBancoEmpregos,
  useSalvarProcessoBancoEmpregos,
  useSalvarVagaBancoEmpregos,
  useUploadDocumentoBancoEmpregos,
  useVagaBancoEmpregos,
  useVagasBancoEmpregos
} from "@/features/banco-empregos/use-banco-empregos";
import { resolverUrlArquivo } from "@/lib/arquivos";
import {
  calcularIdade,
  formatarCep,
  formatarCpf,
  formatarDataPtBr,
  formatarTelefone,
  mascararTelefoneInput,
  normalizarCep,
  normalizarCpf,
  normalizarEmail,
  validarCpf,
  validarEmail
} from "@/lib/br-utils";
import { bancoEmpregosService } from "@/services/banco-empregos.service";
import type {
  BancoEmpregosAvaliacao,
  BancoEmpregosAvaliacaoPayload,
  BancoEmpregosCandidato,
  BancoEmpregosCandidatoFiltros,
  BancoEmpregosCandidatoPayload,
  BancoEmpregosCriterio,
  BancoEmpregosDocumento,
  BancoEmpregosExperiencia,
  BancoEmpregosFormacao,
  BancoEmpregosHabilidade,
  BancoEmpregosHistoricoFiltros,
  BancoEmpregosProcesso,
  BancoEmpregosProcessoFiltros,
  BancoEmpregosProcessoPayload,
  BancoEmpregosVaga,
  BancoEmpregosVagaFiltros,
  BancoEmpregosVagaPayload
} from "@/types/banco-empregos";

type AbaId =
  | "candidatos"
  | "vagas"
  | "triagem"
  | "documentos"
  | "encaminhamentos"
  | "cartas"
  | "relatorios"
  | "historico";

type ErrosFormulario = Record<string, string | undefined>;
type ConfirmacaoState = {
  titulo: string;
  texto: string;
  confirmarTexto?: string;
  confirmarVariant?: "default" | "outline" | "danger" | "ghost";
  onConfirm: () => Promise<void> | void;
} | null;

const abas: AdminTab[] = [
  { id: "candidatos", label: "Candidatos", icon: UsersRound },
  { id: "vagas", label: "Vagas", icon: BriefcaseBusiness },
  { id: "triagem", label: "Triagem / seleção", icon: UserSearch },
  { id: "documentos", label: "Currículos e documentos", icon: FolderHeart },
  { id: "encaminhamentos", label: "Encaminhamentos", icon: CheckSquare2 },
  { id: "cartas", label: "Cartas / impressões", icon: FileText },
  { id: "relatorios", label: "Relatórios", icon: ChartColumn },
  { id: "historico", label: "Histórico", icon: History }
];

const panelClass = "rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)]";
const selectClassName =
  "h-9 w-full rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 text-sm text-[var(--g3-foreground)] outline-none ring-[var(--g3-active)] transition focus:ring-2";
const tableWrapperClass = "overflow-x-auto rounded-xl border border-[var(--g3-border)]";
const tableHeadClass = "bg-[var(--g3-primary-soft)] text-[var(--g3-active)]";
const thClass = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide";
const tdClass = "px-3 py-2 text-sm";

const situacaoCandidatoOptions = [
  { value: "ATIVO", label: "Ativo" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "PRE_SELECIONADO", label: "Pré-selecionado" },
  { value: "EM_ENTREVISTA", label: "Em entrevista" },
  { value: "ENCAMINHADO", label: "Encaminhado" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "REPROVADO", label: "Reprovado" },
  { value: "CONTRATADO", label: "Contratado" },
  { value: "BANCO_TALENTOS", label: "Banco de talentos" },
  { value: "INATIVO", label: "Inativo" }
] as const;

const situacaoVagaOptions = [
  { value: "ABERTA", label: "Aberta" },
  { value: "EM_TRIAGEM", label: "Em triagem" },
  { value: "EM_ENTREVISTA", label: "Em entrevista" },
  { value: "PREENCHIDA", label: "Preenchida" },
  { value: "CANCELADA", label: "Cancelada" }
] as const;

const etapaProcessoOptions = [
  { value: "TRIAGEM_INICIAL", label: "Triagem inicial" },
  { value: "PRE_SELECIONADOS", label: "Pré-selecionados" },
  { value: "ENTREVISTA_AGENDADA", label: "Entrevista agendada" },
  { value: "APROVADOS", label: "Aprovados" },
  { value: "REPROVADOS", label: "Reprovados" },
  { value: "CONTRATADOS", label: "Contratados" },
  { value: "BANCO_TALENTOS", label: "Banco de talentos" }
] as const;

const statusProcessoOptions = [
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "ENCAMINHADO", label: "Encaminhado" },
  { value: "ENTREVISTA_MARCADA", label: "Entrevista marcada" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "REPROVADO", label: "Reprovado" },
  { value: "CONTRATADO", label: "Contratado" },
  { value: "BANCO_TALENTOS", label: "Banco de talentos" }
] as const;

const categoriaDocumentoOptions = [
  { value: "CURRICULO", label: "Currículo" },
  { value: "CERTIFICADO", label: "Certificado" },
  { value: "DOCUMENTO_COMPLEMENTAR", label: "Documento complementar" }
] as const;

const faixaEtariaOptions = [
  { value: "", label: "Todas" },
  { value: "ADOLESCENTE", label: "Adolescentes" },
  { value: "JOVEM", label: "Jovens" },
  { value: "ADULTO", label: "Adultos" },
  { value: "IDOSO", label: "Idosos" }
];

function mascararCpfInput(valor?: string | null) {
  const digitos = normalizarCpf(valor).slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function experienciaVazia(): BancoEmpregosExperiencia {
  return { empresa: "", cargo: "", dataInicio: "", dataFim: "", atividades: "", motivoSaida: "" };
}

function formacaoVazia(): BancoEmpregosFormacao {
  return { curso: "", instituicao: "", situacao: "", anoConclusao: "" };
}

function habilidadeVazia(): BancoEmpregosHabilidade {
  return { categoria: "", descricao: "", nivel: "" };
}

function criterioVazio(): BancoEmpregosCriterio {
  return { criterio: "", peso: 1, nota: 0, observacao: "" };
}

function candidatoVazio(): BancoEmpregosCandidatoPayload {
  return {
    nomeCompleto: "",
    cpf: "",
    rg: "",
    dataNascimento: "",
    sexo: "",
    estadoCivil: "",
    telefone: "",
    whatsapp: "",
    email: "",
    cep: "",
    endereco: "",
    bairro: "",
    cidade: "",
    uf: "",
    escolaridade: "",
    cursos: "",
    formacaoComplementar: "",
    areaInteresse: "",
    cargoPretendido: "",
    pretensaoSalarial: undefined,
    disponibilidade: "",
    possuiExperiencia: false,
    ultimaEmpresa: "",
    funcaoExercida: "",
    tempoExperiencia: "",
    resumoProfissional: "",
    observacoes: "",
    situacao: "ATIVO",
    experiencias: [experienciaVazia()],
    formacoes: [formacaoVazia()],
    habilidades: [habilidadeVazia()],
    curriculoExtraido: {}
  };
}

function vagaVazia(): BancoEmpregosVagaPayload {
  return {
    titulo: "",
    empresaNome: "",
    area: "",
    quantidadeVagas: 1,
    requisitos: "",
    escolaridadeMinima: "",
    experienciaMinima: "",
    bairro: "",
    cidade: "",
    tipoContratacao: "",
    jornada: "",
    faixaSalarial: "",
    beneficios: "",
    observacoes: "",
    dataAbertura: "",
    dataLimite: "",
    situacao: "ABERTA",
    projetoServico: "",
    unidadeReferencia: "",
    criterios: [criterioVazio()]
  };
}

function processoVazio(vagaId = "", candidatoId = ""): BancoEmpregosProcessoPayload {
  return {
    vagaId,
    candidatoId,
    etapa: "TRIAGEM_INICIAL",
    status: "EM_ANALISE",
    observacoes: "",
    responsavelNome: "",
    dataEntrevista: "",
    dataEncaminhamento: "",
    selecionado: false,
    contratado: false
  };
}

function avaliacaoVazia(criterios?: BancoEmpregosCriterio[]): BancoEmpregosAvaliacaoPayload {
  return {
    criterios:
      criterios && criterios.length
        ? criterios.map((item) => ({
            criterio: item.criterio ?? "",
            peso: item.peso ?? 1,
            nota: item.nota ?? 0,
            observacao: item.observacao ?? ""
          }))
        : [criterioVazio()],
    observacaoGeral: ""
  };
}

function mapearCandidatoParaFormulario(candidato: BancoEmpregosCandidato): BancoEmpregosCandidatoPayload {
  return {
    beneficiarioId: candidato.beneficiarioId ?? "",
    nomeCompleto: candidato.nomeCompleto ?? "",
    cpf: candidato.cpf ?? "",
    rg: candidato.rg ?? "",
    dataNascimento: candidato.dataNascimento ?? "",
    sexo: candidato.sexo ?? "",
    estadoCivil: candidato.estadoCivil ?? "",
    telefone: candidato.telefone ?? "",
    whatsapp: candidato.whatsapp ?? "",
    email: candidato.email ?? "",
    cep: candidato.cep ?? "",
    endereco: candidato.endereco ?? "",
    bairro: candidato.bairro ?? "",
    cidade: candidato.cidade ?? "",
    uf: candidato.uf ?? "",
    escolaridade: candidato.escolaridade ?? "",
    cursos: candidato.cursos ?? "",
    formacaoComplementar: candidato.formacaoComplementar ?? "",
    areaInteresse: candidato.areaInteresse ?? "",
    cargoPretendido: candidato.cargoPretendido ?? "",
    pretensaoSalarial: candidato.pretensaoSalarial ?? undefined,
    disponibilidade: candidato.disponibilidade ?? "",
    possuiExperiencia: Boolean(candidato.possuiExperiencia),
    ultimaEmpresa: candidato.ultimaEmpresa ?? "",
    funcaoExercida: candidato.funcaoExercida ?? "",
    tempoExperiencia: candidato.tempoExperiencia ?? "",
    resumoProfissional: candidato.resumoProfissional ?? "",
    observacoes: candidato.observacoes ?? "",
    situacao: candidato.situacao ?? "ATIVO",
    experiencias: candidato.experiencias?.length ? candidato.experiencias : [experienciaVazia()],
    formacoes: candidato.formacoes?.length ? candidato.formacoes : [formacaoVazia()],
    habilidades: candidato.habilidades?.length ? candidato.habilidades : [habilidadeVazia()],
    curriculoExtraido: candidato.curriculoExtraido ?? {}
  };
}

function mapearVagaParaFormulario(vaga: BancoEmpregosVaga): BancoEmpregosVagaPayload {
  return {
    titulo: vaga.titulo ?? "",
    empresaNome: vaga.empresaNome ?? "",
    area: vaga.area ?? "",
    quantidadeVagas: vaga.quantidadeVagas ?? 1,
    requisitos: vaga.requisitos ?? "",
    escolaridadeMinima: vaga.escolaridadeMinima ?? "",
    experienciaMinima: vaga.experienciaMinima ?? "",
    bairro: vaga.bairro ?? "",
    cidade: vaga.cidade ?? "",
    tipoContratacao: vaga.tipoContratacao ?? "",
    jornada: vaga.jornada ?? "",
    faixaSalarial: vaga.faixaSalarial ?? "",
    beneficios: vaga.beneficios ?? "",
    observacoes: vaga.observacoes ?? "",
    dataAbertura: vaga.dataAbertura ?? "",
    dataLimite: vaga.dataLimite ?? "",
    situacao: vaga.situacao ?? "ABERTA",
    projetoServico: vaga.projetoServico ?? "",
    unidadeReferencia: vaga.unidadeReferencia ?? "",
    criterios: vaga.criterios?.length ? vaga.criterios : [criterioVazio()]
  };
}

function mapearProcessoParaFormulario(processo: BancoEmpregosProcesso): BancoEmpregosProcessoPayload {
  return {
    vagaId: processo.vagaId,
    candidatoId: processo.candidatoId,
    etapa: processo.etapa ?? "TRIAGEM_INICIAL",
    status: processo.status ?? "EM_ANALISE",
    observacoes: processo.observacoes ?? "",
    responsavelNome: processo.responsavelNome ?? "",
    dataEntrevista: processo.dataEntrevista ?? "",
    dataEncaminhamento: processo.dataEncaminhamento ?? "",
    selecionado: Boolean(processo.selecionado),
    contratado: Boolean(processo.contratado)
  };
}

function mapearAvaliacaoParaFormulario(
  avaliacao?: BancoEmpregosAvaliacao | null,
  criteriosBase?: BancoEmpregosCriterio[]
): BancoEmpregosAvaliacaoPayload {
  if (avaliacao) {
    return {
      criterios: avaliacao.criterios?.length ? avaliacao.criterios : [criterioVazio()],
      observacaoGeral: avaliacao.observacaoGeral ?? ""
    };
  }
  return avaliacaoVazia(criteriosBase);
}

function obterTextoSugestao(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function obterListaSugestao(valor: unknown) {
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function badgeVariantPorStatus(valor?: string | null): "default" | "success" | "warning" | "danger" | "info" {
  const texto = String(valor ?? "").toUpperCase();
  if (["ATIVO", "ABERTA", "APROVADO", "CONTRATADO", "PREENCHIDA"].includes(texto)) return "success";
  if (["EM_ANALISE", "EM_TRIAGEM", "EM_ENTREVISTA", "ENTREVISTA_MARCADA", "PRE_SELECIONADO"].includes(texto)) {
    return "warning";
  }
  if (["REPROVADO", "CANCELADA", "INATIVO"].includes(texto)) return "danger";
  if (["ENCAMINHADO", "BANCO_TALENTOS"].includes(texto)) return "info";
  return "default";
}

function encontrarRotulo(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string | null
) {
  return options.find((item) => item.value === value)?.label ?? value ?? "---";
}

function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function CampoErro({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <p className="text-xs text-red-600">{texto}</p>;
}

function ResumoCard({
  titulo,
  valor,
  subtitulo
}: {
  titulo: string;
  valor: number | string;
  subtitulo?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--g3-border)] bg-[linear-gradient(180deg,#eff8f1_0%,#ffffff_100%)] p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">{valor}</p>
      {subtitulo ? <p className="mt-1 text-xs text-[var(--g3-muted)]">{subtitulo}</p> : null}
    </div>
  );
}

function SecaoFormulario({
  titulo,
  descricao,
  children
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={panelClass}>
      <div className="border-b border-[var(--g3-border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--g3-foreground)]">{titulo}</h3>
        {descricao ? <p className="mt-1 text-xs text-[var(--g3-muted)]">{descricao}</p> : null}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

async function lerTextoArquivo(arquivo: File) {
  try {
    const texto = await arquivo.text();
    return texto.replace(/[\u0000-\u001F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 10000);
  } catch {
    return "";
  }
}

export function BancoEmpregosPage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("candidatos");
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [candidatoSelecionadoId, setCandidatoSelecionadoId] = useState<string | undefined>();
  const [vagaSelecionadaId, setVagaSelecionadaId] = useState<string | undefined>();
  const [processoSelecionadoId, setProcessoSelecionadoId] = useState<string | undefined>();
  const [comparacaoProcessoId, setComparacaoProcessoId] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [documentoCategoria, setDocumentoCategoria] =
    useState<"CURRICULO" | "CERTIFICADO" | "DOCUMENTO_COMPLEMENTAR">("CURRICULO");
  const [documentoDescricao, setDocumentoDescricao] = useState("");
  const [textoExtraido, setTextoExtraido] = useState("");
  const [errosCandidato, setErrosCandidato] = useState<ErrosFormulario>({});
  const [errosVaga, setErrosVaga] = useState<ErrosFormulario>({});
  const [errosProcesso, setErrosProcesso] = useState<ErrosFormulario>({});
  const [errosDocumento, setErrosDocumento] = useState<ErrosFormulario>({});
  const [candidatoForm, setCandidatoForm] = useState<BancoEmpregosCandidatoPayload>(candidatoVazio());
  const [vagaForm, setVagaForm] = useState<BancoEmpregosVagaPayload>(vagaVazia());
  const [processoForm, setProcessoForm] = useState<BancoEmpregosProcessoPayload>(processoVazio());
  const [avaliacaoForm, setAvaliacaoForm] = useState<BancoEmpregosAvaliacaoPayload>(avaliacaoVazia());
  const [filtrosCandidatos, setFiltrosCandidatos] = useState<BancoEmpregosCandidatoFiltros>({
    pagina: 1,
    limite: 20,
    situacao: "ATIVO"
  });
  const [filtrosVagas, setFiltrosVagas] = useState<BancoEmpregosVagaFiltros>({
    pagina: 1,
    limite: 20,
    situacao: "ABERTA"
  });
  const [filtrosProcessos, setFiltrosProcessos] = useState<BancoEmpregosProcessoFiltros>({
    pagina: 1,
    limite: 60
  });
  const [filtrosHistorico, setFiltrosHistorico] = useState<BancoEmpregosHistoricoFiltros>({
    pagina: 1,
    limite: 40
  });

  const dashboardQuery = useDashboardBancoEmpregos(filtrosCandidatos);
  const candidatosQuery = useCandidatosBancoEmpregos(filtrosCandidatos);
  const vagasQuery = useVagasBancoEmpregos(filtrosVagas);
  const processosQuery = useProcessosBancoEmpregos(filtrosProcessos);
  const historicoQuery = useHistoricoBancoEmpregos(filtrosHistorico);
  const candidatoDetalheQuery = useCandidatoBancoEmpregos(candidatoSelecionadoId);
  const vagaDetalheQuery = useVagaBancoEmpregos(vagaSelecionadaId);
  const processoDetalheQuery = useProcessoBancoEmpregos(processoSelecionadoId);
  const salvarCandidatoMutation = useSalvarCandidatoBancoEmpregos();
  const inativarCandidatoMutation = useInativarCandidatoBancoEmpregos();
  const salvarVagaMutation = useSalvarVagaBancoEmpregos();
  const removerVagaMutation = useRemoverVagaBancoEmpregos();
  const salvarProcessoMutation = useSalvarProcessoBancoEmpregos();
  const salvarAvaliacaoMutation = useSalvarAvaliacaoBancoEmpregos();
  const uploadDocumentoMutation = useUploadDocumentoBancoEmpregos(candidatoSelecionadoId);
  const removerDocumentoMutation = useRemoverDocumentoBancoEmpregos(candidatoSelecionadoId);

  const dashboard = dashboardQuery.data;
  const candidatos = candidatosQuery.data?.candidatos ?? [];
  const vagas = vagasQuery.data?.vagas ?? [];
  const processos = processosQuery.data?.processos ?? [];
  const historico = historicoQuery.data?.historico ?? [];
  const candidatoSelecionado = candidatoDetalheQuery.data?.candidato;
  const vagaSelecionada = vagaDetalheQuery.data?.vaga;
  const processoSelecionado = processoDetalheQuery.data;
  const documentosSelecionados: BancoEmpregosDocumento[] = candidatoDetalheQuery.data?.documentos ?? [];
  const processosDoCandidato = candidatoDetalheQuery.data?.processos ?? [];

  const candidatosOptions = useMemo(() => {
    const base = [...candidatos];
    if (candidatoSelecionado && !base.some((item) => item.id === candidatoSelecionado.id)) {
      base.unshift(candidatoSelecionado);
    }
    return base;
  }, [candidatos, candidatoSelecionado]);

  const vagasOptions = useMemo(() => {
    const base = [...vagas];
    if (vagaSelecionada && !base.some((item) => item.id === vagaSelecionada.id)) {
      base.unshift(vagaSelecionada);
    }
    return base;
  }, [vagas, vagaSelecionada]);

  const processosDaVagaAtual = useMemo(() => {
    const vagaId = processoSelecionado?.vagaId ?? vagaSelecionadaId;
    return [...processos]
      .filter((item) => !vagaId || item.vagaId === vagaId)
      .sort((a, b) => {
        const aderencia = (b.aderenciaPercentual ?? 0) - (a.aderenciaPercentual ?? 0);
        if (aderencia !== 0) return aderencia;
        return (b.notaFinal ?? 0) - (a.notaFinal ?? 0);
      });
  }, [processos, processoSelecionado?.vagaId, vagaSelecionadaId]);

  const melhorProcesso = processosDaVagaAtual[0];
  const processoComparado =
    processosDaVagaAtual.find((item) => item.id === comparacaoProcessoId) ?? processosDaVagaAtual[1] ?? null;
  const idadeCandidato = calcularIdade(candidatoForm.dataNascimento);
  const documentosOrdenados = [...documentosSelecionados].sort((a, b) => (b.versao ?? 0) - (a.versao ?? 0));

  useEffect(() => {
    if (candidatoSelecionado) {
      setCandidatoForm(mapearCandidatoParaFormulario(candidatoSelecionado));
      setErrosCandidato({});
    }
  }, [candidatoSelecionado?.id]);

  useEffect(() => {
    if (vagaSelecionada) {
      setVagaForm(mapearVagaParaFormulario(vagaSelecionada));
      setErrosVaga({});
    }
  }, [vagaSelecionada?.id]);

  useEffect(() => {
    if (processoSelecionado) {
      setProcessoForm(mapearProcessoParaFormulario(processoSelecionado));
      const criteriosBase =
        vagasOptions.find((item) => item.id === processoSelecionado.vagaId)?.criterios ?? vagaSelecionada?.criterios;
      setAvaliacaoForm(mapearAvaliacaoParaFormulario(processoSelecionado.avaliacao, criteriosBase));
      setErrosProcesso({});
    }
  }, [processoSelecionado?.id, vagaSelecionada?.criterios, vagasOptions]);

  useEffect(() => {
    if (!candidatoSelecionadoId && candidatos[0]) {
      setCandidatoSelecionadoId(candidatos[0].id);
    }
  }, [candidatoSelecionadoId, candidatos]);

  useEffect(() => {
    if (!vagaSelecionadaId && vagas[0]) {
      setVagaSelecionadaId(vagas[0].id);
    }
  }, [vagaSelecionadaId, vagas]);

  function abrirPopup(tipo: PopupMensagemState["tipo"], titulo: string, texto: string) {
    setPopup({ tipo, titulo, texto });
  }

  function novoCandidato() {
    setCandidatoSelecionadoId(undefined);
    setCandidatoForm(candidatoVazio());
    setErrosCandidato({});
    setAbaAtiva("candidatos");
  }

  function novaVaga() {
    setVagaSelecionadaId(undefined);
    setVagaForm(vagaVazia());
    setErrosVaga({});
    setAbaAtiva("vagas");
  }

  function novoProcesso() {
    setProcessoSelecionadoId(undefined);
    setProcessoForm(processoVazio(vagaSelecionadaId ?? "", candidatoSelecionadoId ?? ""));
    const criteriosBase =
      vagaSelecionada?.criterios ?? vagasOptions.find((item) => item.id === vagaSelecionadaId)?.criterios;
    setAvaliacaoForm(avaliacaoVazia(criteriosBase));
    setErrosProcesso({});
    setAbaAtiva("triagem");
  }

  function validarCampoCandidato(campo: string, valor: string | number | boolean | undefined) {
    if (campo === "nomeCompleto" && !String(valor ?? "").trim()) return "Informe o nome completo.";
    if (campo === "cpf") {
      const cpf = normalizarCpf(String(valor ?? ""));
      if (cpf && !validarCpf(cpf)) return "CPF inválido.";
    }
    if (campo === "email") {
      const email = normalizarEmail(String(valor ?? ""));
      if (email && !validarEmail(email)) return "E-mail inválido.";
    }
    if (campo === "cep") {
      const cep = normalizarCep(String(valor ?? ""));
      if (cep && cep.length !== 8) return "CEP inválido.";
    }
    if (campo === "telefone" || campo === "whatsapp") {
      const digitos = String(valor ?? "").replace(/\D/g, "");
      if (digitos && ![10, 11].includes(digitos.length)) return "Informe um telefone com 10 ou 11 dígitos.";
    }
    return undefined;
  }

  function validarFormularioCandidato() {
    const proximosErros: ErrosFormulario = {
      nomeCompleto: validarCampoCandidato("nomeCompleto", candidatoForm.nomeCompleto),
      cpf: validarCampoCandidato("cpf", candidatoForm.cpf),
      email: validarCampoCandidato("email", candidatoForm.email),
      cep: validarCampoCandidato("cep", candidatoForm.cep),
      telefone: validarCampoCandidato("telefone", candidatoForm.telefone),
      whatsapp: validarCampoCandidato("whatsapp", candidatoForm.whatsapp)
    };
    setErrosCandidato(proximosErros);
    return !Object.values(proximosErros).some(Boolean);
  }

  function validarFormularioVaga() {
    const proximosErros: ErrosFormulario = {};
    if (!vagaForm.titulo?.trim()) proximosErros.titulo = "Informe o título da vaga.";
    if (!vagaForm.empresaNome?.trim()) proximosErros.empresaNome = "Informe a empresa ou instituição.";
    if (vagaForm.dataAbertura && vagaForm.dataLimite && vagaForm.dataLimite < vagaForm.dataAbertura) {
      proximosErros.dataLimite = "A data limite não pode ser anterior à data de abertura.";
    }
    setErrosVaga(proximosErros);
    return !Object.values(proximosErros).some(Boolean);
  }

  function validarFormularioProcesso() {
    const proximosErros: ErrosFormulario = {};
    if (!processoForm.vagaId) proximosErros.vagaId = "Selecione uma vaga.";
    if (!processoForm.candidatoId) proximosErros.candidatoId = "Selecione um candidato.";
    setErrosProcesso(proximosErros);
    return !Object.values(proximosErros).some(Boolean);
  }

  async function salvarCandidato() {
    if (!validarFormularioCandidato()) {
      abrirPopup("erro", "Dados inválidos", "Revise os campos obrigatórios do candidato.");
      return;
    }
    try {
      const resposta = await salvarCandidatoMutation.mutateAsync({
        id: candidatoSelecionadoId,
        payload: {
          ...candidatoForm,
          cpf: normalizarCpf(candidatoForm.cpf),
          email: normalizarEmail(candidatoForm.email),
          cep: normalizarCep(candidatoForm.cep),
          experiencias: (candidatoForm.experiencias ?? []).filter((item) =>
            Object.values(item).some((valor) => String(valor ?? "").trim().length > 0)
          ),
          formacoes: (candidatoForm.formacoes ?? []).filter((item) =>
            Object.values(item).some((valor) => String(valor ?? "").trim().length > 0)
          ),
          habilidades: (candidatoForm.habilidades ?? []).filter((item) =>
            Object.values(item).some((valor) => String(valor ?? "").trim().length > 0)
          )
        }
      });
      setCandidatoSelecionadoId(resposta.candidato.id);
      abrirPopup("sucesso", "Cadastro salvo", "Os dados do candidato foram atualizados com sucesso.");
    } catch (error) {
      abrirPopup("erro", "Falha ao salvar", error instanceof Error ? error.message : "Não foi possível salvar o candidato.");
    }
  }

  async function salvarVaga() {
    if (!validarFormularioVaga()) {
      abrirPopup("erro", "Dados inválidos", "Revise os campos obrigatórios da vaga.");
      return;
    }
    try {
      const resposta = await salvarVagaMutation.mutateAsync({
        id: vagaSelecionadaId,
        payload: {
          ...vagaForm,
          criterios: (vagaForm.criterios ?? []).filter((item) => item.criterio?.trim())
        }
      });
      setVagaSelecionadaId(resposta.vaga.id);
      abrirPopup("sucesso", "Vaga salva", "A vaga foi registrada com sucesso.");
    } catch (error) {
      abrirPopup("erro", "Falha ao salvar", error instanceof Error ? error.message : "Não foi possível salvar a vaga.");
    }
  }

  async function salvarProcesso() {
    if (!validarFormularioProcesso()) {
      abrirPopup("erro", "Dados inválidos", "Selecione a vaga e o candidato para continuar.");
      return;
    }
    try {
      const resposta = await salvarProcessoMutation.mutateAsync({
        id: processoSelecionadoId,
        payload: processoForm
      });
      setProcessoSelecionadoId(resposta.id);
      setVagaSelecionadaId(resposta.vagaId);
      setCandidatoSelecionadoId(resposta.candidatoId);
      abrirPopup("sucesso", "Triagem atualizada", "O processo seletivo foi salvo.");
    } catch (error) {
      abrirPopup("erro", "Falha ao salvar", error instanceof Error ? error.message : "Não foi possível salvar o processo.");
    }
  }

  async function salvarAvaliacao() {
    if (!processoSelecionadoId) {
      abrirPopup("aviso", "Selecione um processo", "Escolha um processo da triagem para registrar a avaliação.");
      return;
    }
    if (!(avaliacaoForm.criterios ?? []).some((item) => item.criterio?.trim())) {
      abrirPopup("erro", "Avaliação incompleta", "Informe ao menos um critério de avaliação.");
      return;
    }
    try {
      await salvarAvaliacaoMutation.mutateAsync({
        processoId: processoSelecionadoId,
        payload: {
          ...avaliacaoForm,
          criterios: (avaliacaoForm.criterios ?? []).filter((item) => item.criterio?.trim())
        }
      });
      abrirPopup("sucesso", "Avaliação salva", "A avaliação e o ranking foram atualizados.");
    } catch (error) {
      abrirPopup("erro", "Falha ao avaliar", error instanceof Error ? error.message : "Não foi possível salvar a avaliação.");
    }
  }

  async function enviarDocumento() {
    const proximosErros: ErrosFormulario = {};
    if (!candidatoSelecionadoId) proximosErros.candidatoId = "Selecione um candidato.";
    if (!arquivoSelecionado) proximosErros.arquivo = "Selecione um arquivo para enviar.";
    setErrosDocumento(proximosErros);
    if (Object.values(proximosErros).some(Boolean) || !candidatoSelecionadoId || !arquivoSelecionado) {
      abrirPopup("erro", "Upload incompleto", "Selecione o candidato e o arquivo antes de enviar.");
      return;
    }
    try {
      const texto = textoExtraido.trim() || (await lerTextoArquivo(arquivoSelecionado));
      await uploadDocumentoMutation.mutateAsync({
        categoria: documentoCategoria,
        descricao: documentoDescricao,
        textoExtraido: texto,
        arquivo: arquivoSelecionado
      });
      setArquivoSelecionado(null);
      setDocumentoDescricao("");
      setTextoExtraido("");
      abrirPopup("sucesso", "Documento enviado", "O arquivo foi anexado ao candidato e entrou no histórico.");
    } catch (error) {
      abrirPopup("erro", "Falha no upload", error instanceof Error ? error.message : "Não foi possível anexar o documento.");
    }
  }

  function aplicarSugestoesCurriculo() {
    const sugestoes = candidatoSelecionado?.curriculoExtraido;
    if (!sugestoes) {
      abrirPopup("aviso", "Sem sugestões", "Ainda não há leitura estruturada disponível para este currículo.");
      return;
    }
    const cursos = obterListaSugestao(sugestoes.cursos);
    const experiencias = obterListaSugestao(sugestoes.experiencias);
    setCandidatoForm((atual) => ({
      ...atual,
      email: atual.email || obterTextoSugestao(sugestoes.email),
      telefone: atual.telefone || obterTextoSugestao(sugestoes.telefone),
      escolaridade: atual.escolaridade || obterTextoSugestao(sugestoes.escolaridade),
      cursos: atual.cursos || cursos.join("; "),
      resumoProfissional: atual.resumoProfissional || experiencias.join(" | "),
      curriculoExtraido: sugestoes
    }));
    abrirPopup("sucesso", "Sugestões aplicadas", "As informações extraídas foram aplicadas apenas nos campos vazios.");
  }

  async function moverProcesso(
    processo: BancoEmpregosProcesso,
    etapa: BancoEmpregosProcessoPayload["etapa"],
    status: BancoEmpregosProcessoPayload["status"],
    extras?: Partial<BancoEmpregosProcessoPayload>
  ) {
    try {
      const atualizado = await salvarProcessoMutation.mutateAsync({
        id: processo.id,
        payload: { ...mapearProcessoParaFormulario(processo), etapa, status, ...extras }
      });
      setProcessoSelecionadoId(atualizado.id);
      abrirPopup("sucesso", "Processo atualizado", "A movimentação foi registrada no histórico.");
    } catch (error) {
      abrirPopup("erro", "Falha na movimentação", error instanceof Error ? error.message : "Não foi possível atualizar o processo.");
    }
  }

  async function gerarCarta(tipo: "encaminhamento" | "recomendacao" | "comprovante" | "ficha", processoId?: string) {
    const id = processoId ?? processoSelecionadoId;
    if (!id) {
      abrirPopup("aviso", "Selecione um processo", "Escolha um processo para emitir a carta ou a ficha.");
      return;
    }
    try {
      const blob = await bancoEmpregosService.gerarCarta(id, tipo);
      baixarBlob(blob, `banco-empregos-${tipo}-${id}.pdf`);
      abrirPopup("sucesso", "Documento gerado", "O PDF foi preparado para impressão.");
    } catch (error) {
      abrirPopup("erro", "Falha ao gerar PDF", error instanceof Error ? error.message : "Não foi possível gerar o documento.");
    }
  }

  async function exportar(tipo: "candidatos" | "vagas" | "triagem", formato: "csv" | "pdf") {
    try {
      const blob = await bancoEmpregosService.exportar(
        tipo,
        formato,
        tipo === "candidatos" ? filtrosCandidatos : tipo === "vagas" ? filtrosVagas : filtrosProcessos
      );
      baixarBlob(blob, `banco-empregos-${tipo}.${formato}`);
      abrirPopup("sucesso", "Exportação concluída", "O arquivo filtrado foi gerado com sucesso.");
    } catch (error) {
      abrirPopup("erro", "Falha na exportação", error instanceof Error ? error.message : "Não foi possível exportar o relatório.");
    }
  }

  async function recarregarTudo() {
    await Promise.all([
      dashboardQuery.refetch(),
      candidatosQuery.refetch(),
      vagasQuery.refetch(),
      processosQuery.refetch(),
      historicoQuery.refetch(),
      candidatoSelecionadoId ? candidatoDetalheQuery.refetch() : Promise.resolve(),
      vagaSelecionadaId ? vagaDetalheQuery.refetch() : Promise.resolve(),
      processoSelecionadoId ? processoDetalheQuery.refetch() : Promise.resolve()
    ]);
  }

  function atualizarExperiencia(indice: number, campo: keyof BancoEmpregosExperiencia, valor: string) {
    setCandidatoForm((atual) => {
      const experiencias = [...(atual.experiencias ?? [experienciaVazia()])];
      experiencias[indice] = { ...experiencias[indice], [campo]: valor };
      return { ...atual, experiencias };
    });
  }

  function atualizarFormacao(indice: number, campo: keyof BancoEmpregosFormacao, valor: string) {
    setCandidatoForm((atual) => {
      const formacoes = [...(atual.formacoes ?? [formacaoVazia()])];
      formacoes[indice] = { ...formacoes[indice], [campo]: valor };
      return { ...atual, formacoes };
    });
  }

  function atualizarHabilidade(indice: number, campo: keyof BancoEmpregosHabilidade, valor: string) {
    setCandidatoForm((atual) => {
      const habilidades = [...(atual.habilidades ?? [habilidadeVazia()])];
      habilidades[indice] = { ...habilidades[indice], [campo]: valor };
      return { ...atual, habilidades };
    });
  }

  function atualizarCriterioVaga(indice: number, campo: keyof BancoEmpregosCriterio, valor: string) {
    setVagaForm((atual) => {
      const criterios = [...(atual.criterios ?? [criterioVazio()])];
      criterios[indice] = {
        ...criterios[indice],
        [campo]: campo === "peso" || campo === "nota" ? (valor ? Number(valor) : 0) : valor
      };
      return { ...atual, criterios };
    });
  }

  function atualizarCriterioAvaliacao(indice: number, campo: keyof BancoEmpregosCriterio, valor: string) {
    setAvaliacaoForm((atual) => {
      const criterios = [...(atual.criterios ?? [criterioVazio()])];
      criterios[indice] = {
        ...criterios[indice],
        [campo]: campo === "peso" || campo === "nota" ? (valor ? Number(valor) : 0) : valor
      };
      return { ...atual, criterios };
    });
  }

  const actions: AdminAction[] = [
    {
      label: abaAtiva === "candidatos" ? "Novo candidato" : abaAtiva === "vagas" ? "Nova vaga" : "Novo vínculo",
      icon: Plus,
      variant: "outline",
      onClick: () => {
        if (abaAtiva === "candidatos") return novoCandidato();
        if (abaAtiva === "vagas") return novaVaga();
        return novoProcesso();
      }
    },
    {
      label: "Salvar",
      icon: Save,
      variant: "default",
      onClick: () => {
        if (abaAtiva === "candidatos") return void salvarCandidato();
        if (abaAtiva === "vagas") return void salvarVaga();
        if (abaAtiva === "triagem") return void salvarProcesso();
        if (abaAtiva === "documentos") return void enviarDocumento();
      }
    },
    {
      label: "Recarregar",
      icon: RefreshCw,
      variant: "outline",
      onClick: () => {
        void recarregarTudo();
      }
    }
  ];

  const conteudoCandidatos = (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <div className="space-y-4">
        <SecaoFormulario titulo="Filtros inteligentes" descricao="Cruze filtros antes de carregar a lista operacional.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={filtrosCandidatos.nome ?? ""} onChange={(event) => setFiltrosCandidatos((atual) => ({ ...atual, nome: event.target.value, pagina: 1 }))} />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input value={mascararCpfInput(filtrosCandidatos.cpf)} onChange={(event) => setFiltrosCandidatos((atual) => ({ ...atual, cpf: normalizarCpf(event.target.value), pagina: 1 }))} />
            </div>
            <div className="space-y-1">
              <Label>Bairro</Label>
              <Input value={filtrosCandidatos.bairro ?? ""} onChange={(event) => setFiltrosCandidatos((atual) => ({ ...atual, bairro: event.target.value, pagina: 1 }))} />
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input value={filtrosCandidatos.cidade ?? ""} onChange={(event) => setFiltrosCandidatos((atual) => ({ ...atual, cidade: event.target.value, pagina: 1 }))} />
            </div>
            <div className="space-y-1">
              <Label>Faixa etária</Label>
              <select className={selectClassName} value={filtrosCandidatos.faixaEtaria ?? ""} onChange={(event) => setFiltrosCandidatos((atual) => ({ ...atual, faixaEtaria: event.target.value || undefined, pagina: 1 }))}>
                {faixaEtariaOptions.map((item) => <option key={item.value || "todas"} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Situação</Label>
              <select className={selectClassName} value={filtrosCandidatos.situacao ?? ""} onChange={(event) => setFiltrosCandidatos((atual) => ({ ...atual, situacao: event.target.value || undefined, pagina: 1 }))}>
                <option value="">Todas</option>
                {situacaoCandidatoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFiltrosCandidatos({ pagina: 1, limite: 20, situacao: "ATIVO" })}>Limpar filtros</Button>
            <Button variant="outline" onClick={() => void exportar("candidatos", "csv")}>Exportar lista</Button>
          </div>
        </SecaoFormulario>

        <SecaoFormulario titulo="Lista de candidatos" descricao={`Mostrando ${candidatos.length} de ${candidatosQuery.data?.total ?? 0} registros.`}>
          <div className={tableWrapperClass}>
            <table className="min-w-full text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className={thClass}>Nome</th>
                  <th className={thClass}>Contato</th>
                  <th className={thClass}>Território</th>
                  <th className={thClass}>Situação</th>
                  <th className={thClass}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {candidatos.map((item, index) => (
                  <tr key={item.id} className={`border-t border-[var(--g3-border)] ${candidatoSelecionadoId === item.id ? "bg-[var(--g3-primary-soft)]/60" : index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/20"}`}>
                    <td className={tdClass}><button type="button" className="text-left" onClick={() => setCandidatoSelecionadoId(item.id)}><p className="font-semibold">{item.nomeCompleto}</p><p className="text-xs text-[var(--g3-muted)]">{item.cargoPretendido || "Cargo não informado"}</p></button></td>
                    <td className={tdClass}><p>{formatarTelefone(item.telefone) || "---"}</p><p className="text-xs text-[var(--g3-muted)]">{item.email || "---"}</p></td>
                    <td className={tdClass}><p>{item.bairro || "---"}</p><p className="text-xs text-[var(--g3-muted)]">{item.cidade || "---"}</p></td>
                    <td className={tdClass}><Badge variant={badgeVariantPorStatus(item.situacao)}>{encontrarRotulo(situacaoCandidatoOptions, item.situacao)}</Badge></td>
                    <td className={tdClass}>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setCandidatoSelecionadoId(item.id)}>Editar</Button>
                        <Button size="sm" variant="outline" onClick={() => { setCandidatoSelecionadoId(item.id); setAbaAtiva("triagem"); }}>Triagem</Button>
                        <Button size="sm" variant="danger" onClick={() => setConfirmacao({ titulo: "Inativar candidato", texto: `Deseja inativar ${item.nomeCompleto} sem excluir o histórico?`, confirmarTexto: "Inativar", confirmarVariant: "danger", onConfirm: async () => { await inativarCandidatoMutation.mutateAsync(item.id); if (candidatoSelecionadoId === item.id) novoCandidato(); abrirPopup("sucesso", "Candidato inativado", "O cadastro foi inativado com rastreabilidade."); } })}>Inativar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!candidatos.length ? <tr><td className="px-3 py-6 text-center text-sm text-[var(--g3-muted)]" colSpan={5}>Nenhum candidato encontrado com os filtros informados.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </SecaoFormulario>

        <SecaoFormulario titulo="Histórico do candidato" descricao="Vagas já vinculadas e andamento de cada processo.">
          <div className="space-y-2">
            {processosDoCandidato.length ? processosDoCandidato.map((processo) => (
              <Card key={processo.id}>
                <CardContent className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--g3-foreground)]">{processo.vagaTitulo || "Vaga sem título"}</p>
                    <p className="text-xs text-[var(--g3-muted)]">{processo.empresaNome || "Empresa não informada"} • {encontrarRotulo(etapaProcessoOptions, processo.etapa)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={badgeVariantPorStatus(processo.status)}>{encontrarRotulo(statusProcessoOptions, processo.status)}</Badge>
                    <Button size="sm" variant="outline" onClick={() => { setProcessoSelecionadoId(processo.id); setAbaAtiva("triagem"); }}>Abrir processo</Button>
                  </div>
                </CardContent>
              </Card>
            )) : <p className="text-sm text-[var(--g3-muted)]">Ainda não há processos seletivos vinculados a este candidato.</p>}
          </div>
        </SecaoFormulario>
      </div>

      <div className="space-y-4">
        <SecaoFormulario titulo="Cadastro completo" descricao={candidatoSelecionado ? `Cadastro #${candidatoSelecionado.id} • idade automática ${idadeCandidato ?? 0} anos` : "Novo cadastro de candidato"}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2"><Label>Nome completo</Label><Input value={candidatoForm.nomeCompleto} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, nomeCompleto: event.target.value }))} onBlur={() => setErrosCandidato((atual) => ({ ...atual, nomeCompleto: validarCampoCandidato("nomeCompleto", candidatoForm.nomeCompleto) }))} /><CampoErro texto={errosCandidato.nomeCompleto} /></div>
            <div className="space-y-1"><Label>CPF</Label><Input value={mascararCpfInput(candidatoForm.cpf)} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, cpf: normalizarCpf(event.target.value) }))} onBlur={() => setErrosCandidato((atual) => ({ ...atual, cpf: validarCampoCandidato("cpf", candidatoForm.cpf) }))} /><CampoErro texto={errosCandidato.cpf} /></div>
            <div className="space-y-1"><Label>RG</Label><Input value={candidatoForm.rg ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, rg: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Data de nascimento</Label><Input type="date" value={candidatoForm.dataNascimento ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, dataNascimento: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Idade</Label><Input readOnly value={idadeCandidato != null ? String(idadeCandidato) : ""} /></div>
            <div className="space-y-1"><Label>Sexo</Label><Input value={candidatoForm.sexo ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, sexo: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Estado civil</Label><Input value={candidatoForm.estadoCivil ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, estadoCivil: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Telefone</Label><Input value={mascararTelefoneInput(candidatoForm.telefone)} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, telefone: event.target.value }))} onBlur={() => setErrosCandidato((atual) => ({ ...atual, telefone: validarCampoCandidato("telefone", candidatoForm.telefone) }))} /><CampoErro texto={errosCandidato.telefone} /></div>
            <div className="space-y-1"><Label>WhatsApp</Label><Input value={mascararTelefoneInput(candidatoForm.whatsapp)} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, whatsapp: event.target.value }))} onBlur={() => setErrosCandidato((atual) => ({ ...atual, whatsapp: validarCampoCandidato("whatsapp", candidatoForm.whatsapp) }))} /><CampoErro texto={errosCandidato.whatsapp} /></div>
            <div className="space-y-1 md:col-span-2"><Label>E-mail</Label><Input value={candidatoForm.email ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, email: event.target.value }))} onBlur={() => setErrosCandidato((atual) => ({ ...atual, email: validarCampoCandidato("email", candidatoForm.email) }))} /><CampoErro texto={errosCandidato.email} /></div>
            <div className="space-y-1"><Label>CEP</Label><Input value={formatarCep(candidatoForm.cep)} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, cep: normalizarCep(event.target.value) }))} onBlur={() => setErrosCandidato((atual) => ({ ...atual, cep: validarCampoCandidato("cep", candidatoForm.cep) }))} /><CampoErro texto={errosCandidato.cep} /></div>
            <div className="space-y-1"><Label>UF</Label><Input value={candidatoForm.uf ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, uf: event.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Endereço</Label><Input value={candidatoForm.endereco ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, endereco: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Bairro</Label><Input value={candidatoForm.bairro ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, bairro: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Cidade</Label><Input value={candidatoForm.cidade ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, cidade: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Escolaridade</Label><Input value={candidatoForm.escolaridade ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, escolaridade: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Área de interesse</Label><Input value={candidatoForm.areaInteresse ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, areaInteresse: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Cargo pretendido</Label><Input value={candidatoForm.cargoPretendido ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, cargoPretendido: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Disponibilidade</Label><Input value={candidatoForm.disponibilidade ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, disponibilidade: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Situação do candidato</Label><select className={selectClassName} value={candidatoForm.situacao ?? "ATIVO"} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, situacao: event.target.value as BancoEmpregosCandidatoPayload["situacao"] }))}>{situacaoCandidatoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div className="flex items-center gap-2 pt-7"><Checkbox checked={Boolean(candidatoForm.possuiExperiencia)} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, possuiExperiencia: event.target.checked }))} /><Label className="mb-0 normal-case tracking-normal text-sm text-[var(--g3-foreground)]">Possui experiência</Label></div>
            <div className="space-y-1 md:col-span-2"><Label>Cursos</Label><Textarea rows={3} value={candidatoForm.cursos ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, cursos: event.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Formação complementar</Label><Textarea rows={3} value={candidatoForm.formacaoComplementar ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, formacaoComplementar: event.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Resumo profissional</Label><Textarea rows={4} value={candidatoForm.resumoProfissional ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, resumoProfissional: event.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Observações</Label><Textarea rows={3} value={candidatoForm.observacoes ?? ""} onChange={(event) => setCandidatoForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
          </div>
        </SecaoFormulario>

        <SecaoFormulario titulo="Experiências, formação e habilidades" descricao="A triagem usa estes blocos na comparação por vaga.">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Experiências</h4><Button size="sm" variant="outline" onClick={() => setCandidatoForm((atual) => ({ ...atual, experiencias: [...(atual.experiencias ?? []), experienciaVazia()] }))}>Adicionar</Button></div>
              {(candidatoForm.experiencias ?? []).map((item, indice) => <div key={`exp-${indice}`} className="grid gap-2 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-2"><Input placeholder="Empresa" value={item.empresa ?? ""} onChange={(event) => atualizarExperiencia(indice, "empresa", event.target.value)} /><Input placeholder="Cargo" value={item.cargo ?? ""} onChange={(event) => atualizarExperiencia(indice, "cargo", event.target.value)} /><Input type="date" value={item.dataInicio ?? ""} onChange={(event) => atualizarExperiencia(indice, "dataInicio", event.target.value)} /><Input type="date" value={item.dataFim ?? ""} onChange={(event) => atualizarExperiencia(indice, "dataFim", event.target.value)} /><Textarea className="md:col-span-2" placeholder="Atividades exercidas" value={item.atividades ?? ""} onChange={(event) => atualizarExperiencia(indice, "atividades", event.target.value)} /><Textarea className="md:col-span-2" placeholder="Motivo da saída" value={item.motivoSaida ?? ""} onChange={(event) => atualizarExperiencia(indice, "motivoSaida", event.target.value)} /></div>)}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Formação</h4><Button size="sm" variant="outline" onClick={() => setCandidatoForm((atual) => ({ ...atual, formacoes: [...(atual.formacoes ?? []), formacaoVazia()] }))}>Adicionar</Button></div>
              {(candidatoForm.formacoes ?? []).map((item, indice) => <div key={`for-${indice}`} className="grid gap-2 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-2"><Input placeholder="Curso / formação" value={item.curso ?? ""} onChange={(event) => atualizarFormacao(indice, "curso", event.target.value)} /><Input placeholder="Instituição" value={item.instituicao ?? ""} onChange={(event) => atualizarFormacao(indice, "instituicao", event.target.value)} /><Input placeholder="Situação" value={item.situacao ?? ""} onChange={(event) => atualizarFormacao(indice, "situacao", event.target.value)} /><Input placeholder="Ano de conclusão" value={item.anoConclusao ?? ""} onChange={(event) => atualizarFormacao(indice, "anoConclusao", event.target.value)} /></div>)}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Habilidades</h4><Button size="sm" variant="outline" onClick={() => setCandidatoForm((atual) => ({ ...atual, habilidades: [...(atual.habilidades ?? []), habilidadeVazia()] }))}>Adicionar</Button></div>
              {(candidatoForm.habilidades ?? []).map((item, indice) => <div key={`hab-${indice}`} className="grid gap-2 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-3"><Input placeholder="Categoria" value={item.categoria ?? ""} onChange={(event) => atualizarHabilidade(indice, "categoria", event.target.value)} /><Input placeholder="Descrição" value={item.descricao ?? ""} onChange={(event) => atualizarHabilidade(indice, "descricao", event.target.value)} /><Input placeholder="Nível" value={item.nivel ?? ""} onChange={(event) => atualizarHabilidade(indice, "nivel", event.target.value)} /></div>)}
            </div>
          </div>
        </SecaoFormulario>
      </div>
    </div>
  );

  const conteudoVagas = (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
      <div className="space-y-4">
        <SecaoFormulario titulo="Filtros de vagas" descricao="Controle de abertura, área, empresa e vagas sem selecionado.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1"><Label>Título</Label><Input value={filtrosVagas.titulo ?? ""} onChange={(event) => setFiltrosVagas((atual) => ({ ...atual, titulo: event.target.value, pagina: 1 }))} /></div>
            <div className="space-y-1"><Label>Empresa</Label><Input value={filtrosVagas.empresaNome ?? ""} onChange={(event) => setFiltrosVagas((atual) => ({ ...atual, empresaNome: event.target.value, pagina: 1 }))} /></div>
            <div className="space-y-1"><Label>Área</Label><Input value={filtrosVagas.area ?? ""} onChange={(event) => setFiltrosVagas((atual) => ({ ...atual, area: event.target.value, pagina: 1 }))} /></div>
            <div className="space-y-1"><Label>Cidade</Label><Input value={filtrosVagas.cidade ?? ""} onChange={(event) => setFiltrosVagas((atual) => ({ ...atual, cidade: event.target.value, pagina: 1 }))} /></div>
            <div className="space-y-1"><Label>Situação</Label><select className={selectClassName} value={filtrosVagas.situacao ?? ""} onChange={(event) => setFiltrosVagas((atual) => ({ ...atual, situacao: event.target.value || undefined, pagina: 1 }))}><option value="">Todas</option>{situacaoVagaOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div className="flex items-center gap-2 pt-7"><Checkbox checked={Boolean(filtrosVagas.semSelecionado)} onChange={(event) => setFiltrosVagas((atual) => ({ ...atual, semSelecionado: event.target.checked || undefined, pagina: 1 }))} /><Label className="mb-0 normal-case tracking-normal text-sm text-[var(--g3-foreground)]">Somente vagas sem selecionado</Label></div>
          </div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setFiltrosVagas({ pagina: 1, limite: 20, situacao: "ABERTA" })}>Limpar filtros</Button><Button variant="outline" onClick={() => void exportar("vagas", "csv")}>Exportar vagas</Button></div>
        </SecaoFormulario>

        <SecaoFormulario titulo="Painel de vagas" descricao={`Mostrando ${vagas.length} de ${vagasQuery.data?.total ?? 0} vagas.`}>
          <div className={tableWrapperClass}>
            <table className="min-w-full text-sm">
              <thead className={tableHeadClass}><tr><th className={thClass}>Vaga</th><th className={thClass}>Empresa</th><th className={thClass}>Local</th><th className={thClass}>Situação</th><th className={thClass}>Ações</th></tr></thead>
              <tbody>
                {vagas.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${vagaSelecionadaId === item.id ? "bg-[var(--g3-primary-soft)]/60" : index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/20"}`}><td className={tdClass}><button type="button" className="text-left" onClick={() => setVagaSelecionadaId(item.id)}><p className="font-semibold">{item.titulo}</p><p className="text-xs text-[var(--g3-muted)]">{item.area || "Área não informada"}</p></button></td><td className={tdClass}>{item.empresaNome}</td><td className={tdClass}>{item.bairro || "---"}<p className="text-xs text-[var(--g3-muted)]">{item.cidade || "---"}</p></td><td className={tdClass}><Badge variant={badgeVariantPorStatus(item.situacao)}>{encontrarRotulo(situacaoVagaOptions, item.situacao)}</Badge></td><td className={tdClass}><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setVagaSelecionadaId(item.id)}>Editar</Button><Button size="sm" variant="outline" onClick={() => { setVagaSelecionadaId(item.id); setFiltrosProcessos((atual) => ({ ...atual, vagaId: item.id, pagina: 1 })); setAbaAtiva("triagem"); }}>Triagem</Button><Button size="sm" variant="danger" onClick={() => setConfirmacao({ titulo: "Inativar vaga", texto: `Deseja remover a vaga ${item.titulo}?`, confirmarTexto: "Remover", confirmarVariant: "danger", onConfirm: async () => { await removerVagaMutation.mutateAsync(item.id); if (vagaSelecionadaId === item.id) novaVaga(); abrirPopup("sucesso", "Vaga inativada", "A vaga foi retirada da operação ativa."); } })}>Excluir</Button></div></td></tr>)}
                {!vagas.length ? <tr><td className="px-3 py-6 text-center text-sm text-[var(--g3-muted)]" colSpan={5}>Nenhuma vaga encontrada com os filtros informados.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </SecaoFormulario>
      </div>

      <div className="space-y-4">
        <SecaoFormulario titulo="Cadastro de vaga" descricao={vagaSelecionada ? `Vaga #${vagaSelecionada.id} • ${vagaSelecionada.totalProcessos ?? 0} processo(s)` : "Nova oportunidade de trabalho"}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2"><Label>Título da vaga</Label><Input value={vagaForm.titulo} onChange={(event) => setVagaForm((atual) => ({ ...atual, titulo: event.target.value }))} /><CampoErro texto={errosVaga.titulo} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Empresa / instituição</Label><Input value={vagaForm.empresaNome} onChange={(event) => setVagaForm((atual) => ({ ...atual, empresaNome: event.target.value }))} /><CampoErro texto={errosVaga.empresaNome} /></div>
            <div className="space-y-1"><Label>Área</Label><Input value={vagaForm.area ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, area: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Quantidade de vagas</Label><Input type="number" min={1} value={vagaForm.quantidadeVagas ?? 1} onChange={(event) => setVagaForm((atual) => ({ ...atual, quantidadeVagas: Number(event.target.value || 1) }))} /></div>
            <div className="space-y-1"><Label>Bairro</Label><Input value={vagaForm.bairro ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, bairro: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Cidade</Label><Input value={vagaForm.cidade ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, cidade: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Tipo de contratação</Label><Input value={vagaForm.tipoContratacao ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, tipoContratacao: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Jornada</Label><Input value={vagaForm.jornada ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, jornada: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Faixa salarial</Label><Input value={vagaForm.faixaSalarial ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, faixaSalarial: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Situação da vaga</Label><select className={selectClassName} value={vagaForm.situacao ?? "ABERTA"} onChange={(event) => setVagaForm((atual) => ({ ...atual, situacao: event.target.value as BancoEmpregosVagaPayload["situacao"] }))}>{situacaoVagaOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div className="space-y-1"><Label>Data de abertura</Label><Input type="date" value={vagaForm.dataAbertura ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, dataAbertura: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Data limite</Label><Input type="date" value={vagaForm.dataLimite ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, dataLimite: event.target.value }))} /><CampoErro texto={errosVaga.dataLimite} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Requisitos</Label><Textarea rows={3} value={vagaForm.requisitos ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, requisitos: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Escolaridade mínima</Label><Input value={vagaForm.escolaridadeMinima ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, escolaridadeMinima: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Experiência mínima</Label><Input value={vagaForm.experienciaMinima ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, experienciaMinima: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Projeto / serviço</Label><Input value={vagaForm.projetoServico ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, projetoServico: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Unidade de referência</Label><Input value={vagaForm.unidadeReferencia ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, unidadeReferencia: event.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Benefícios</Label><Textarea rows={2} value={vagaForm.beneficios ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, beneficios: event.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Observações</Label><Textarea rows={3} value={vagaForm.observacoes ?? ""} onChange={(event) => setVagaForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
          </div>
        </SecaoFormulario>

        <SecaoFormulario titulo="Critérios da vaga" descricao="Pesos base para ranking, aderência e avaliação comparativa.">
          <div className="space-y-2">
            {(vagaForm.criterios ?? []).map((item, indice) => <div key={`crit-vaga-${indice}`} className="grid gap-2 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-[minmax(0,1fr)_120px_120px]"><Input placeholder="Critério" value={item.criterio ?? ""} onChange={(event) => atualizarCriterioVaga(indice, "criterio", event.target.value)} /><Input type="number" min={0} step="0.1" placeholder="Peso" value={item.peso ?? 0} onChange={(event) => atualizarCriterioVaga(indice, "peso", event.target.value)} /><Input type="number" min={0} step="0.1" placeholder="Nota base" value={item.nota ?? 0} onChange={(event) => atualizarCriterioVaga(indice, "nota", event.target.value)} /><Textarea className="md:col-span-3" placeholder="Observação do critério" value={item.observacao ?? ""} onChange={(event) => atualizarCriterioVaga(indice, "observacao", event.target.value)} /></div>)}
            <Button size="sm" variant="outline" onClick={() => setVagaForm((atual) => ({ ...atual, criterios: [...(atual.criterios ?? []), criterioVazio()] }))}>Adicionar critério</Button>
          </div>
        </SecaoFormulario>
      </div>
    </div>
  );

  const conteudoTriagem = (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <div className="space-y-4">
        <SecaoFormulario titulo="Filtro da triagem" descricao="Vincule candidato e vaga, depois mova cada etapa com um clique.">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1"><Label>Vaga</Label><select className={selectClassName} value={filtrosProcessos.vagaId ?? ""} onChange={(event) => setFiltrosProcessos((atual) => ({ ...atual, vagaId: event.target.value || undefined, pagina: 1 }))}><option value="">Todas</option>{vagasOptions.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select></div>
            <div className="space-y-1"><Label>Candidato</Label><select className={selectClassName} value={filtrosProcessos.candidatoId ?? ""} onChange={(event) => setFiltrosProcessos((atual) => ({ ...atual, candidatoId: event.target.value || undefined, pagina: 1 }))}><option value="">Todos</option>{candidatosOptions.map((item) => <option key={item.id} value={item.id}>{item.nomeCompleto}</option>)}</select></div>
            <div className="space-y-1"><Label>Etapa</Label><select className={selectClassName} value={filtrosProcessos.etapa ?? ""} onChange={(event) => setFiltrosProcessos((atual) => ({ ...atual, etapa: event.target.value || undefined, pagina: 1 }))}><option value="">Todas</option>{etapaProcessoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div className="space-y-1"><Label>Status</Label><select className={selectClassName} value={filtrosProcessos.status ?? ""} onChange={(event) => setFiltrosProcessos((atual) => ({ ...atual, status: event.target.value || undefined, pagina: 1 }))}><option value="">Todos</option>{statusProcessoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          </div>
        </SecaoFormulario>

        <div className="grid gap-3 xl:grid-cols-2">
          {etapaProcessoOptions.map((etapa) => {
            const itens = processos.filter((item) => item.etapa === etapa.value);
            return (
              <Card key={etapa.value}>
                <CardHeader><CardTitle>{etapa.label}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {itens.length ? itens.map((item) => (
                    <div key={item.id} className="rounded-lg border border-[var(--g3-border)] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{item.candidatoNome || "Candidato"}</p>
                          <p className="text-xs text-[var(--g3-muted)]">{item.vagaTitulo || "Vaga"} • {item.empresaNome || "Empresa"}</p>
                        </div>
                        <Badge variant={badgeVariantPorStatus(item.status)}>{encontrarRotulo(statusProcessoOptions, item.status)}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setProcessoSelecionadoId(item.id); setVagaSelecionadaId(item.vagaId); setCandidatoSelecionadoId(item.candidatoId); }}>Abrir</Button>
                        <Button size="sm" variant="outline" onClick={() => void moverProcesso(item, "ENTREVISTA_AGENDADA", "ENTREVISTA_MARCADA")}>Entrevista</Button>
                        <Button size="sm" variant="outline" onClick={() => void moverProcesso(item, "APROVADOS", "APROVADO", { selecionado: true })}>Selecionar</Button>
                        <Button size="sm" variant="outline" onClick={() => void moverProcesso(item, "REPROVADOS", "REPROVADO")}>Reprovar</Button>
                      </div>
                    </div>
                  )) : <p className="text-sm text-[var(--g3-muted)]">Sem candidatos nesta etapa.</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <SecaoFormulario titulo="Vínculo candidato x vaga" descricao="O processo seletivo registra etapa, status, responsável e datas-chave.">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2"><Label>Vaga</Label><select className={selectClassName} value={processoForm.vagaId} onChange={(event) => setProcessoForm((atual) => ({ ...atual, vagaId: event.target.value }))}><option value="">Selecione</option>{vagasOptions.map((item) => <option key={item.id} value={item.id}>{item.titulo} • {item.empresaNome}</option>)}</select><CampoErro texto={errosProcesso.vagaId} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Candidato</Label><select className={selectClassName} value={processoForm.candidatoId} onChange={(event) => setProcessoForm((atual) => ({ ...atual, candidatoId: event.target.value }))}><option value="">Selecione</option>{candidatosOptions.map((item) => <option key={item.id} value={item.id}>{item.nomeCompleto}</option>)}</select><CampoErro texto={errosProcesso.candidatoId} /></div>
            <div className="space-y-1"><Label>Etapa</Label><select className={selectClassName} value={processoForm.etapa ?? "TRIAGEM_INICIAL"} onChange={(event) => setProcessoForm((atual) => ({ ...atual, etapa: event.target.value as BancoEmpregosProcessoPayload["etapa"] }))}>{etapaProcessoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div className="space-y-1"><Label>Status</Label><select className={selectClassName} value={processoForm.status ?? "EM_ANALISE"} onChange={(event) => setProcessoForm((atual) => ({ ...atual, status: event.target.value as BancoEmpregosProcessoPayload["status"] }))}>{statusProcessoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div className="space-y-1"><Label>Responsável</Label><Input value={processoForm.responsavelNome ?? ""} onChange={(event) => setProcessoForm((atual) => ({ ...atual, responsavelNome: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Data da entrevista</Label><Input type="date" value={processoForm.dataEntrevista ?? ""} onChange={(event) => setProcessoForm((atual) => ({ ...atual, dataEntrevista: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Data do encaminhamento</Label><Input type="date" value={processoForm.dataEncaminhamento ?? ""} onChange={(event) => setProcessoForm((atual) => ({ ...atual, dataEncaminhamento: event.target.value }))} /></div>
            <div className="flex items-center gap-2 pt-7"><Checkbox checked={Boolean(processoForm.selecionado)} onChange={(event) => setProcessoForm((atual) => ({ ...atual, selecionado: event.target.checked }))} /><Label className="mb-0 normal-case tracking-normal text-sm text-[var(--g3-foreground)]">Selecionado</Label></div>
            <div className="flex items-center gap-2 pt-7"><Checkbox checked={Boolean(processoForm.contratado)} onChange={(event) => setProcessoForm((atual) => ({ ...atual, contratado: event.target.checked }))} /><Label className="mb-0 normal-case tracking-normal text-sm text-[var(--g3-foreground)]">Contratado</Label></div>
            <div className="space-y-1 md:col-span-2"><Label>Observações</Label><Textarea rows={3} value={processoForm.observacoes ?? ""} onChange={(event) => setProcessoForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
          </div>
          <div className="flex flex-wrap gap-2"><Button onClick={() => void salvarProcesso()}>Salvar vínculo</Button><Button variant="outline" onClick={() => setProcessoForm(processoVazio(vagaSelecionadaId ?? "", candidatoSelecionadoId ?? ""))}>Limpar</Button></div>
        </SecaoFormulario>

        <SecaoFormulario titulo="Avaliação e ranking" descricao="Pontuação ponderada para destacar o melhor candidato da vaga.">
          <div className="space-y-2">
            {(avaliacaoForm.criterios ?? []).map((item, indice) => <div key={`crit-av-${indice}`} className="grid gap-2 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-[minmax(0,1fr)_110px_110px]"><Input placeholder="Critério" value={item.criterio ?? ""} onChange={(event) => atualizarCriterioAvaliacao(indice, "criterio", event.target.value)} /><Input type="number" min={0} step="0.1" placeholder="Peso" value={item.peso ?? 0} onChange={(event) => atualizarCriterioAvaliacao(indice, "peso", event.target.value)} /><Input type="number" min={0} step="0.1" placeholder="Nota" value={item.nota ?? 0} onChange={(event) => atualizarCriterioAvaliacao(indice, "nota", event.target.value)} /><Textarea className="md:col-span-3" placeholder="Observação" value={item.observacao ?? ""} onChange={(event) => atualizarCriterioAvaliacao(indice, "observacao", event.target.value)} /></div>)}
            <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setAvaliacaoForm((atual) => ({ ...atual, criterios: [...(atual.criterios ?? []), criterioVazio()] }))}>Adicionar critério</Button><Button size="sm" onClick={() => void salvarAvaliacao()}>Salvar avaliação</Button></div>
          </div>
          <div className="mt-3 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3">
            <p className="text-sm font-semibold">Melhor candidato atual</p>
            <p className="mt-1 text-sm">{melhorProcesso?.candidatoNome || "Nenhum candidato avaliado"}</p>
            <p className="text-xs text-[var(--g3-muted)]">Aderência {melhorProcesso?.aderenciaPercentual ?? 0}% • nota {melhorProcesso?.notaFinal ?? 0}</p>
          </div>
          <div className="space-y-2">
            <Label>Comparar com</Label>
            <select className={selectClassName} value={comparacaoProcessoId} onChange={(event) => setComparacaoProcessoId(event.target.value)}>
              <option value="">Selecione outro processo</option>
              {processosDaVagaAtual.map((item) => <option key={item.id} value={item.id}>{item.candidatoNome}</option>)}
            </select>
            {processoComparado ? <div className="rounded-lg border border-[var(--g3-border)] p-3 text-sm"><p><span className="font-semibold">{processoComparado.candidatoNome}</span> • {processoComparado.candidatoBairro || "---"}</p><p className="text-xs text-[var(--g3-muted)]">Aderência {processoComparado.aderenciaPercentual ?? 0}% • nota {processoComparado.notaFinal ?? 0}</p></div> : null}
          </div>
        </SecaoFormulario>
      </div>
    </div>
  );

  const conteudoDocumentos = (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
      <div className="space-y-4">
        <SecaoFormulario titulo="Upload de currículos e documentos" descricao="Armazenamento versionado com leitura estruturada opcional.">
          <div className="space-y-3">
            <div className="space-y-1"><Label>Candidato</Label><select className={selectClassName} value={candidatoSelecionadoId ?? ""} onChange={(event) => setCandidatoSelecionadoId(event.target.value || undefined)}><option value="">Selecione</option>{candidatosOptions.map((item) => <option key={item.id} value={item.id}>{item.nomeCompleto}</option>)}</select><CampoErro texto={errosDocumento.candidatoId} /></div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1"><Label>Categoria</Label><select className={selectClassName} value={documentoCategoria} onChange={(event) => setDocumentoCategoria(event.target.value as typeof documentoCategoria)}>{categoriaDocumentoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
              <div className="space-y-1"><Label>Arquivo</Label><Input type="file" onChange={(event) => setArquivoSelecionado(event.target.files?.[0] ?? null)} /><CampoErro texto={errosDocumento.arquivo} /></div>
            </div>
            <div className="space-y-1"><Label>Descrição</Label><Input value={documentoDescricao} onChange={(event) => setDocumentoDescricao(event.target.value)} /></div>
            <div className="space-y-1"><Label>Texto extraído</Label><Textarea rows={4} value={textoExtraido} onChange={(event) => setTextoExtraido(event.target.value)} placeholder="Opcional: confirme ou complemente o texto lido do currículo." /></div>
            <div className="flex flex-wrap gap-2"><Button onClick={() => void enviarDocumento()}>Enviar arquivo</Button><Button variant="outline" onClick={() => void aplicarSugestoesCurriculo()}>Aplicar sugestões</Button></div>
          </div>
        </SecaoFormulario>

        <SecaoFormulario titulo="Leitura estruturada" descricao="Sugestões preservam o que o usuário já confirmou no cadastro.">
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Nome:</span> {candidatoSelecionado?.nomeCompleto || "---"}</p>
            <p><span className="font-semibold">CPF:</span> {formatarCpf(candidatoSelecionado?.cpf) || "---"}</p>
            <p><span className="font-semibold">Território:</span> {candidatoSelecionado?.bairro || "---"} • {candidatoSelecionado?.cidade || "---"} • CEP {formatarCep(candidatoSelecionado?.cep) || "---"}</p>
            <p><span className="font-semibold">Última leitura:</span> {candidatoSelecionado?.dataEnvioCurriculo ? formatarDataPtBr(candidatoSelecionado.dataEnvioCurriculo.slice(0, 10)) : "---"} • versão {candidatoSelecionado?.curriculoVersao ?? 0}</p>
          </div>
        </SecaoFormulario>
      </div>

      <div className="space-y-4">
        <SecaoFormulario titulo="Documentos do candidato" descricao="Visualização, download e exclusão lógica com histórico.">
          <div className="space-y-2">
            {documentosOrdenados.length ? documentosOrdenados.map((item) => <Card key={item.id}><CardContent className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{item.nomeOriginal}</p><p className="text-xs text-[var(--g3-muted)]">{encontrarRotulo(categoriaDocumentoOptions, item.categoria)} • versão {item.versao} • {item.dataUpload ? formatarDataPtBr(item.dataUpload.slice(0, 10)) : "---"}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => window.open(resolverUrlArquivo(item.caminhoArquivo), "_blank", "noopener,noreferrer")}>Abrir</Button><Button size="sm" variant="danger" onClick={() => setConfirmacao({ titulo: "Remover documento", texto: `Deseja remover ${item.nomeOriginal}?`, confirmarTexto: "Remover", confirmarVariant: "danger", onConfirm: async () => { await removerDocumentoMutation.mutateAsync(item.id); abrirPopup("sucesso", "Documento removido", "O arquivo foi excluído logicamente e permaneceu auditado."); } })}>Excluir</Button></div></CardContent></Card>) : <p className="text-sm text-[var(--g3-muted)]">Selecione um candidato para visualizar os arquivos.</p>}
          </div>
        </SecaoFormulario>
      </div>
    </div>
  );

  const conteudoEncaminhamentos = (
    <SecaoFormulario titulo="Encaminhamentos realizados" descricao="Controle dos candidatos já enviados às vagas.">
      <div className={tableWrapperClass}>
        <table className="min-w-full text-sm">
          <thead className={tableHeadClass}><tr><th className={thClass}>Candidato</th><th className={thClass}>Vaga</th><th className={thClass}>Data</th><th className={thClass}>Status</th><th className={thClass}>Ações</th></tr></thead>
          <tbody>
            {processos.filter((item) => item.status === "ENCAMINHADO" || Boolean(item.dataEncaminhamento)).map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/20"}`}><td className={tdClass}>{item.candidatoNome || "---"}</td><td className={tdClass}>{item.vagaTitulo || "---"}</td><td className={tdClass}>{item.dataEncaminhamento ? formatarDataPtBr(item.dataEncaminhamento) : "---"}</td><td className={tdClass}><Badge variant={badgeVariantPorStatus(item.status)}>{encontrarRotulo(statusProcessoOptions, item.status)}</Badge></td><td className={tdClass}><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void gerarCarta("encaminhamento", item.id)}>Carta</Button><Button size="sm" variant="outline" onClick={() => void gerarCarta("comprovante", item.id)}>Comprovante</Button></div></td></tr>)}
            {!processos.some((item) => item.status === "ENCAMINHADO" || Boolean(item.dataEncaminhamento)) ? <tr><td className="px-3 py-6 text-center text-sm text-[var(--g3-muted)]" colSpan={5}>Nenhum encaminhamento encontrado.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </SecaoFormulario>
  );

  const conteudoCartas = (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)]">
      <SecaoFormulario titulo="Processo selecionado" descricao="Defina o processo e emita os documentos institucionais em PDF.">
        <div className="space-y-3">
          <div className="space-y-1"><Label>Processo</Label><select className={selectClassName} value={processoSelecionadoId ?? ""} onChange={(event) => setProcessoSelecionadoId(event.target.value || undefined)}><option value="">Selecione</option>{processos.map((item) => <option key={item.id} value={item.id}>{item.candidatoNome} • {item.vagaTitulo}</option>)}</select></div>
          <div className="rounded-lg border border-[var(--g3-border)] p-3 text-sm">
            <p><span className="font-semibold">Candidato:</span> {processoSelecionado?.candidatoNome || "---"}</p>
            <p><span className="font-semibold">Vaga:</span> {processoSelecionado?.vagaTitulo || "---"}</p>
            <p><span className="font-semibold">Empresa:</span> {processoSelecionado?.empresaNome || "---"}</p>
            <p><span className="font-semibold">Status:</span> {encontrarRotulo(statusProcessoOptions, processoSelecionado?.status)}</p>
          </div>
        </div>
      </SecaoFormulario>
      <SecaoFormulario titulo="Cartas e impressões" descricao="Padrão institucional do G3N para encaminhamento, recomendação, comprovante e ficha.">
        <div className="grid gap-3 md:grid-cols-2">
          <Button onClick={() => void gerarCarta("encaminhamento")}>Carta de encaminhamento</Button>
          <Button onClick={() => void gerarCarta("recomendacao")}>Carta de recomendação</Button>
          <Button variant="outline" onClick={() => void gerarCarta("comprovante")}>Comprovante</Button>
          <Button variant="outline" onClick={() => void gerarCarta("ficha")}>Ficha resumida</Button>
        </div>
      </SecaoFormulario>
    </div>
  );

  const conteudoRelatorios = (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
      <SecaoFormulario titulo="Exportações e relatórios" descricao="CSV e PDF com base nos filtros ativos do módulo.">
        <div className="grid gap-3 md:grid-cols-2">
          <Button variant="outline" onClick={() => void exportar("candidatos", "csv")}>Candidatos CSV</Button>
          <Button variant="outline" onClick={() => void exportar("candidatos", "pdf")}>Candidatos PDF</Button>
          <Button variant="outline" onClick={() => void exportar("vagas", "csv")}>Vagas CSV</Button>
          <Button variant="outline" onClick={() => void exportar("vagas", "pdf")}>Vagas PDF</Button>
          <Button variant="outline" onClick={() => void exportar("triagem", "csv")}>Triagem CSV</Button>
          <Button variant="outline" onClick={() => void exportar("triagem", "pdf")}>Triagem PDF</Button>
        </div>
      </SecaoFormulario>

      <Card>
        <CardHeader><CardTitle>Indicadores rápidos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Bairros com maior concentração</p>
            <div className="mt-2 space-y-2">{(dashboard?.rankingBairros ?? []).slice(0, 5).map((item) => <div key={item.nome} className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] px-3 py-2 text-sm"><span>{item.nome}</span><Badge>{String(item.total)}</Badge></div>)}</div>
          </div>
          <div>
            <p className="text-sm font-semibold">Áreas de interesse</p>
            <div className="mt-2 space-y-2">{(dashboard?.rankingAreas ?? []).slice(0, 5).map((item) => <div key={item.nome} className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] px-3 py-2 text-sm"><span>{item.nome}</span><Badge>{String(item.total)}</Badge></div>)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const conteudoHistorico = (
    <SecaoFormulario titulo="Histórico e auditoria" descricao="Todas as ações do módulo ficam rastreadas por entidade, usuário e data.">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1"><Label>Entidade</Label><select className={selectClassName} value={filtrosHistorico.entidadeTipo ?? ""} onChange={(event) => setFiltrosHistorico((atual) => ({ ...atual, entidadeTipo: event.target.value || undefined, pagina: 1 }))}><option value="">Todas</option><option value="CANDIDATO">Candidato</option><option value="VAGA">Vaga</option><option value="PROCESSO">Processo</option><option value="DOCUMENTO">Documento</option></select></div>
        <div className="space-y-1"><Label>Candidato</Label><select className={selectClassName} value={filtrosHistorico.candidatoId ?? ""} onChange={(event) => setFiltrosHistorico((atual) => ({ ...atual, candidatoId: event.target.value || undefined, pagina: 1 }))}><option value="">Todos</option>{candidatosOptions.map((item) => <option key={item.id} value={item.id}>{item.nomeCompleto}</option>)}</select></div>
        <div className="space-y-1"><Label>Vaga</Label><select className={selectClassName} value={filtrosHistorico.vagaId ?? ""} onChange={(event) => setFiltrosHistorico((atual) => ({ ...atual, vagaId: event.target.value || undefined, pagina: 1 }))}><option value="">Todas</option>{vagasOptions.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select></div>
        <div className="space-y-1"><Label>Processo</Label><select className={selectClassName} value={filtrosHistorico.processoId ?? ""} onChange={(event) => setFiltrosHistorico((atual) => ({ ...atual, processoId: event.target.value || undefined, pagina: 1 }))}><option value="">Todos</option>{processos.map((item) => <option key={item.id} value={item.id}>{item.candidatoNome} • {item.vagaTitulo}</option>)}</select></div>
      </div>
      <div className={tableWrapperClass}>
        <table className="min-w-full text-sm">
          <thead className={tableHeadClass}><tr><th className={thClass}>Data</th><th className={thClass}>Entidade</th><th className={thClass}>Ação</th><th className={thClass}>Usuário</th><th className={thClass}>Observação</th></tr></thead>
          <tbody>
            {historico.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/20"}`}><td className={tdClass}>{item.criadoEm ? `${formatarDataPtBr(item.criadoEm.slice(0, 10))} ${item.criadoEm.slice(11, 16)}` : "---"}</td><td className={tdClass}>{item.entidadeTipo}</td><td className={tdClass}>{item.acao}</td><td className={tdClass}>{item.usuarioNome || "Sistema"}</td><td className={tdClass}>{item.observacao || "---"}</td></tr>)}
            {!historico.length ? <tr><td className="px-3 py-6 text-center text-sm text-[var(--g3-muted)]" colSpan={5}>Sem eventos para os filtros informados.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </SecaoFormulario>
  );

  const conteudoAba =
    abaAtiva === "candidatos"
      ? conteudoCandidatos
      : abaAtiva === "vagas"
        ? conteudoVagas
        : abaAtiva === "triagem"
          ? conteudoTriagem
          : abaAtiva === "documentos"
            ? conteudoDocumentos
            : abaAtiva === "encaminhamentos"
              ? conteudoEncaminhamentos
              : abaAtiva === "cartas"
                ? conteudoCartas
                : abaAtiva === "relatorios"
                  ? conteudoRelatorios
                  : conteudoHistorico;

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={actions}
        sectionLabel="Atendimentos diários"
        pageTitle="Banco de empregos"
        codeBadge={
          abaAtiva === "candidatos"
            ? candidatoSelecionadoId
              ? `Candidato #${candidatoSelecionadoId}`
              : "Novo cadastro"
            : abaAtiva === "vagas"
              ? vagaSelecionadaId
                ? `Vaga #${vagaSelecionadaId}`
                : "Nova vaga"
              : processoSelecionadoId
                ? `Processo #${processoSelecionadoId}`
                : "Gestão seletiva"
        }
      >
        <section className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResumoCard titulo="Total de candidatos" valor={dashboard?.cards.totalCandidatos ?? 0} />
            <ResumoCard titulo="Candidatos ativos" valor={dashboard?.cards.candidatosAtivos ?? 0} />
            <ResumoCard titulo="Em entrevista" valor={dashboard?.cards.emEntrevista ?? 0} />
            <ResumoCard titulo="Currículos anexados" valor={dashboard?.cards.curriculosAnexados ?? 0} />
            <ResumoCard titulo="Encaminhados" valor={dashboard?.cards.encaminhados ?? 0} />
            <ResumoCard titulo="Aprovados" valor={dashboard?.cards.aprovados ?? 0} />
            <ResumoCard titulo="Contratados" valor={dashboard?.cards.contratados ?? 0} />
            <ResumoCard titulo="Vagas abertas" valor={dashboard?.cards.vagasAbertas ?? 0} />
          </div>
        </section>
        {conteudoAba}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao
        aberto={Boolean(confirmacao)}
        titulo={confirmacao?.titulo ?? ""}
        texto={confirmacao?.texto ?? ""}
        confirmarTexto={confirmacao?.confirmarTexto}
        confirmarVariant={confirmacao?.confirmarVariant}
        processando={confirmando}
        onCancel={() => {
          if (!confirmando) setConfirmacao(null);
        }}
        onConfirm={() => {
          if (!confirmacao) return;
          setConfirmando(true);
          void Promise.resolve()
            .then(() => confirmacao.onConfirm())
            .finally(() => {
            setConfirmando(false);
            setConfirmacao(null);
            });
        }}
      />
    </>
  );
}
