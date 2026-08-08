import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Printer, Save, Search, Undo2 } from "lucide-react";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { educacionalService, type EducacionalRecurso, type UnidadeEnsinoCatalogo } from "@/services/educacional.service";
import type { BeneficiarioBusca, EducacionalItem } from "@/types/educacional";
import { EducacionalAcademicoPage } from "./educacional-academico-page";
import { EducacionalDiarioPage } from "./educacional-diario-page";
import { EducacionalPlanejamentoPage } from "./educacional-planejamento-page";
import { EducacionalAvaliacoesPage } from "./educacional-avaliacoes-page";
import { EducacionalBoletinsPage } from "./educacional-boletins-page";
import { EducacionalGestaoPage } from "./educacional-gestao-page";
import { EducacionalDocumentosPage } from "./educacional-documentos-page";
import { EducacionalRelatoriosPage } from "./educacional-relatorios-page";
import { EducacionalCrechePage } from "./educacional-creche-page";
import { EducacionalAlunosFluxosPage } from "./educacional-alunos-fluxos-page";
import { EducacionalVisaoGeralPage } from "./educacional-visao-geral-page";
import { EducacionalFluxoAcademicoPage } from "./educacional-fluxo-academico-page";
import { EducacionalProfissionaisPage } from "./educacional-profissionais-page";
import { EducacionalParceriasPublicasPage } from "./educacional-parcerias-publicas-page";
import { EducacionalAlunosAgrupadosPage } from "./educacional-alunos-agrupados-page";
import { EducacionalPendenciasPage } from "./educacional-pendencias-page";
import { classeBotaoAbaLateral, classeNumeroAbaLateral } from "@/lib/tela-padrao-beneficiario";

type Aba = "visao-geral" | "pendencias" | "estrutura" | "alunos" | "vida-academica" | "matriculas" | "responsaveis" | "unidades" | "enturmacao" | "professores" | "grade-curricular" | "horarios" | "diarios" | "frequencias" | "planos-aula" | "planejamentos" | "avaliacoes" | "notas" | "boletins" | "historicos" | "ocorrencias" | "agenda" | "documentos" | "relatorios" | "rotinas-infantis" | "desenvolvimentos-infantis" | "transferencias" | "autorizacoes" | "fluxo-academico" | "parcerias";
type Formulario = Record<string, string>;
type MatriculaFormulario = {
  aluno_id: string;
  ano_letivo_id: string;
  unidade_id: string;
  sala_id: string;
  etapa_id: string;
  serie_id: string;
  turma_id: string;
  numero_matricula: string;
  origem: "NOVO" | "TRANSFERENCIA" | "REMATRICULA" | "RETORNO" | "OUTRO";
  escola_anterior: string;
  responsavel_nome: string;
  transporte_escolar: string;
  transporte_descricao: string;
  documentacao_identificacao: string;
  documentacao_comprovante_residencia: string;
  informacoes_complementares: string;
};

const recursos: Array<{ id: EducacionalRecurso; label: string }> = [
  { id: "anos-letivos", label: "Anos letivos" },
  { id: "etapas", label: "Etapas de ensino" },
  { id: "series", label: "Séries e anos escolares" },
  { id: "disciplinas", label: "Disciplinas" },
  { id: "turmas", label: "Turmas" }
];

const formularioInicial: Formulario = {
  ano: "", descricao: "", nome: "", codigo: "", area: "", carga_horaria: "", etapa_id: "",
  ano_letivo_id: "", serie_id: "", turno: "INTEGRAL", capacidade_maxima: ""
  , disciplina_id: "", aulas_semanais: "", turma_id: "", professor_id: "", sala_id: "", dia_semana: "1", hora_inicio: "", hora_fim: ""
};

const matriculaInicial: MatriculaFormulario = {
  aluno_id: "",
  ano_letivo_id: "",
  unidade_id: "",
  sala_id: "",
  etapa_id: "",
  serie_id: "",
  turma_id: "",
  numero_matricula: "",
  origem: "NOVO",
  escola_anterior: "",
  responsavel_nome: "",
  transporte_escolar: "false",
  transporte_descricao: "",
  documentacao_identificacao: "false",
  documentacao_comprovante_residencia: "false",
  informacoes_complementares: ""
};

function texto(item: EducacionalItem, ...chaves: string[]) {
  for (const chave of chaves) {
    const valor = item[chave];
    if (valor !== null && valor !== undefined && String(valor).trim()) return corrigirAcentuacaoEducacional(String(valor));
  }
  return corrigirAcentuacaoEducacional("—");
}

function nomeRecurso(item: EducacionalItem, recurso: EducacionalRecurso) {
  if (recurso === "anos-letivos") return `${texto(item, "ano")} — ${texto(item, "descricao")}`;
  return texto(item, "nome", "descricao");
}

function opcoes(lista: EducacionalItem[] | undefined, recurso: EducacionalRecurso) {
  return (lista ?? []).map((item) => <option key={item.id} value={item.id}>{nomeRecurso(item, recurso)}</option>);
}

function corrigirAcentuacaoEducacional(valor: string) {
  let textoCorrigido = valor;
  if (/[\u00c3\u00c2\u00e2]/.test(textoCorrigido)) {
    try {
      const bytes = Uint8Array.from(textoCorrigido, (caractere) => caractere.charCodeAt(0) & 0xff);
      textoCorrigido = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      textoCorrigido = valor;
    }
  }

  return textoCorrigido
    .replace(/Educa\uFFFD\uFFFDo/g, "Educação")
    .replace(/educa\uFFFD\uFFFDo/g, "educação")
    .replace(/Per\uFFFDodo/g, "Período")
    .replace(/per\uFFFDodo/g, "período")
    .replace(/S\uFFFDrie/g, "Série")
    .replace(/s\uFFFDrie/g, "série")
    .replace(/(\d)\uFFFD/g, "$1º");
}

function mensagemErro(erro: unknown, fallback: string) {
  const resposta = erro && typeof erro === "object" && "response" in erro
    ? (erro as { response?: { data?: { message?: unknown; error?: unknown; erro?: unknown } } }).response
    : undefined;
  const mensagem = resposta?.data?.message ?? resposta?.data?.error ?? resposta?.data?.erro;
  if (typeof mensagem === "string" && mensagem.trim()) return corrigirAcentuacaoEducacional(mensagem);
  return erro instanceof Error && erro.message ? corrigirAcentuacaoEducacional(erro.message) : fallback;
}

export function EducacionalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const turmaParametro = useMemo(() => new URLSearchParams(location.search).get("turma_id") ?? "", [location.search]);
  const [aba, setAba] = useState<Aba>("visao-geral");
  const [resumo, setResumo] = useState<Record<string, number>>({});
  const [listas, setListas] = useState<Partial<Record<EducacionalRecurso, EducacionalItem[]>>>({});
  const [recurso, setRecurso] = useState<EducacionalRecurso>("anos-letivos");
  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(formularioInicial);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [beneficiarios, setBeneficiarios] = useState<BeneficiarioBusca[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<BeneficiarioBusca | null>(null);
  const [matricula, setMatricula] = useState<MatriculaFormulario>(matriculaInicial);
  const [unidadesEnsino, setUnidadesEnsino] = useState<UnidadeEnsinoCatalogo[]>([]);
  const [enturmacao, setEnturmacao] = useState({ matricula_id: "", turma_id: "" });

  const carregar = async (alvos: EducacionalRecurso[] = [...recursos.map((item) => item.id), "alunos", "matriculas", "enturmacoes"]) => {
    setCarregando(true);
    try {
      const [dadosResumo, ...dadosListas] = await Promise.all([
        educacionalService.resumo(),
        ...alvos.map((item) => educacionalService.listar(item))
      ]);
      setResumo(dadosResumo as unknown as Record<string, number>);
      setListas((anterior) => ({ ...anterior, ...Object.fromEntries(alvos.map((item, index) => [item, dadosListas[index]])) }));
    } catch (erro) {
      setMensagem(mensagemErro(erro, "Não foi possível carregar os dados educacionais."));
    } finally { setCarregando(false); }
  };

  useEffect(() => { void carregar(); }, []);
  useEffect(() => {
    const valor = new URLSearchParams(location.search).get("aba");
    setAba(valor === "pendencias" || valor === "estrutura" || valor === "alunos" || valor === "vida-academica" || valor === "matriculas" || valor === "responsaveis" || valor === "unidades" || valor === "enturmacao" || valor === "professores" || valor === "grade-curricular" || valor === "horarios" || valor === "diarios" || valor === "frequencias" || valor === "planos-aula" || valor === "planejamentos" || valor === "avaliacoes" || valor === "notas" || valor === "boletins" || valor === "historicos" || valor === "ocorrencias" || valor === "agenda" || valor === "documentos" || valor === "relatorios" || valor === "rotinas-infantis" || valor === "desenvolvimentos-infantis" || valor === "transferencias" || valor === "autorizacoes" || valor === "fluxo-academico" || valor === "parcerias" ? valor : "visao-geral");
    const recursoSolicitado = new URLSearchParams(location.search).get("recurso") as EducacionalRecurso | null;
    if (recursos.some((item) => item.id === recursoSolicitado)) {
      setRecurso(recursoSolicitado as EducacionalRecurso);
    }
  }, [location.search]);
  useEffect(() => {
    if (aba !== "matriculas") return;
    void educacionalService.listarUnidadesEnsino().then(setUnidadesEnsino).catch((erro) => setMensagem(mensagemErro(erro, "Não foi possível carregar as unidades de ensino.")));
    void carregarProximoNumeroMatricula();
  }, [aba]);

  const itensAtuais = useMemo(() => listas[recurso] ?? [], [listas, recurso]);
  useEffect(() => {
    if (recurso !== "turmas" || !turmaParametro || idEditando === turmaParametro) return;
    const turma = (listas.turmas ?? []).find((item) => String(item.id) === turmaParametro);
    if (turma) editarEstrutura(turma);
  }, [recurso, turmaParametro, listas.turmas, idEditando]);
  const atualizarFormulario = (campo: string, valor: string) => setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  const atualizarMatricula = (campo: keyof MatriculaFormulario, valor: string) => setMatricula((anterior) => ({ ...anterior, [campo]: valor }));

  async function carregarProximoNumeroMatricula(sobrescrever = false) {
    try {
      const numero = await educacionalService.proximoNumeroMatricula();
      setMatricula((anterior) => sobrescrever || !anterior.numero_matricula.trim()
        ? { ...anterior, numero_matricula: numero }
        : anterior);
    } catch (erro) {
      setMensagem(mensagemErro(erro, "Não foi possível gerar o próximo número da matrícula."));
    }
  }

  function selecionarRecurso(novoRecurso: EducacionalRecurso) {
    setRecurso(novoRecurso);
    setIdEditando(null);
    setFormulario(formularioInicial);
    setMensagem("");
  }

  async function salvarEstrutura(event: FormEvent) {
    event.preventDefault();
    const nome = formulario.nome.trim();
    const descricao = formulario.descricao.trim();
    if ((recurso !== "anos-letivos" && !nome) || (recurso === "anos-letivos" && (!formulario.ano || !descricao))) {
      setMensagem(recurso === "anos-letivos" ? "Informe o ano e a descrição do ano letivo." : "Informe o nome do cadastro.");
      return;
    }

    let payload: Record<string, unknown>;
    if (recurso === "anos-letivos") payload = { ano: Number(formulario.ano), descricao, data_inicial: null, data_final: null, status: "PLANEJAMENTO" };
    else if (recurso === "etapas") payload = { nome, descricao: descricao || null, status: "ATIVA" };
    else if (recurso === "series") payload = { nome, etapa_id: Number(formulario.etapa_id), descricao: descricao || null, status: "ATIVA" };
    else if (recurso === "disciplinas") payload = { nome, codigo: formulario.codigo.trim() || null, area: formulario.area.trim() || null, carga_horaria: formulario.carga_horaria ? Number(formulario.carga_horaria) : null, status: "ATIVA" };
    else if (recurso === "turmas") payload = { nome, ano_letivo_id: Number(formulario.ano_letivo_id), etapa_id: Number(formulario.etapa_id), serie_id: Number(formulario.serie_id), turno: formulario.turno, capacidade_maxima: Number(formulario.capacidade_maxima), unidade_id: null, sala_id: null, professor_responsavel_id: null, professor_responsavel_nome: null, status: "ATIVA" };
    else if (recurso === "grade-curricular") payload = { ano_letivo_id: Number(formulario.ano_letivo_id), etapa_id: Number(formulario.etapa_id), serie_id: Number(formulario.serie_id), disciplina_id: Number(formulario.disciplina_id), aulas_semanais: Number(formulario.aulas_semanais), carga_horaria: formulario.carga_horaria ? Number(formulario.carga_horaria) : null, status: "ATIVA" };
    else payload = { turma_id: Number(formulario.turma_id), disciplina_id: Number(formulario.disciplina_id), professor_id: formulario.professor_id ? Number(formulario.professor_id) : null, sala_id: formulario.sala_id ? Number(formulario.sala_id) : null, dia_semana: Number(formulario.dia_semana), hora_inicio: formulario.hora_inicio, hora_fim: formulario.hora_fim, status: "ATIVO" };

    if (["series", "turmas", "grade-curricular", "horarios"].includes(recurso) && Object.values(payload).some((valor) => valor === 0 || Number.isNaN(valor) || valor === "")) {
      setMensagem("Preencha todas as relações obrigatórias antes de salvar.");
      return;
    }
    setCarregando(true);
    try {
      await educacionalService.salvar(recurso, payload, idEditando ?? undefined);
      setFormulario(formularioInicial);
      setIdEditando(null);
      setMensagem(`${recursos.find((item) => item.id === recurso)?.label ?? "Cadastro"} salvo com sucesso.`);
      await carregar([recurso]);
    } catch (erro) { setMensagem(mensagemErro(erro, "Não foi possível salvar o cadastro.")); }
    finally { setCarregando(false); }
  }

  async function buscarBeneficiarios() {
    if (busca.trim().length < 2) { setMensagem("Informe ao menos 2 caracteres para buscar."); return; }
    setCarregando(true);
    try { setBeneficiarios(await educacionalService.buscarBeneficiarios(busca)); }
    catch (erro) { setMensagem(mensagemErro(erro, "Não foi possível buscar beneficiários.")); }
    finally { setCarregando(false); }
  }

  async function vincular() {
    if (!alunoSelecionado) return;
    setCarregando(true);
    try { const aluno = await educacionalService.vincularAluno(alunoSelecionado.id); atualizarMatricula("aluno_id", String(aluno.id)); setMensagem("Beneficiário vinculado como aluno."); setAlunoSelecionado(null); await carregar(["alunos"]); }
    catch (erro) { setMensagem(mensagemErro(erro, "Não foi possível vincular o beneficiário.")); }
    finally { setCarregando(false); }
  }

  async function criarMatricula(event: FormEvent) {
    event.preventDefault();
    if (!matricula.aluno_id || !matricula.ano_letivo_id || !matricula.unidade_id || !matricula.sala_id || !matricula.etapa_id || !matricula.serie_id || !matricula.numero_matricula.trim()) { setMensagem("Informe aluno, ano letivo, unidade de ensino, sala, etapa, série e número da matrícula."); return; }
    setCarregando(true);
    try {
      await educacionalService.salvar("matriculas", {
        aluno_id: Number(matricula.aluno_id),
        ano_letivo_id: Number(matricula.ano_letivo_id),
        unidade_id: Number(matricula.unidade_id),
        sala_id: Number(matricula.sala_id),
        etapa_id: Number(matricula.etapa_id),
        serie_id: Number(matricula.serie_id),
        turma_id: matricula.turma_id ? Number(matricula.turma_id) : null,
        numero_matricula: matricula.numero_matricula.trim(),
        data_matricula: new Date().toISOString().slice(0, 10),
        data_inicio: new Date().toISOString().slice(0, 10),
        origem: matricula.origem,
        escola_anterior: matricula.escola_anterior.trim() || null,
        responsavel_nome: matricula.responsavel_nome.trim() || null,
        transporte_escolar: matricula.transporte_escolar === "true",
        transporte_descricao: matricula.transporte_descricao.trim() || null,
        documentacao: {
          identificacao: matricula.documentacao_identificacao === "true",
          comprovante_residencia: matricula.documentacao_comprovante_residencia === "true"
        },
        informacoes_complementares: matricula.informacoes_complementares.trim() || null,
        situacao: "ATIVA"
      });
      const proximoNumero = await educacionalService.proximoNumeroMatricula();
      setMatricula({ ...matriculaInicial, numero_matricula: proximoNumero });
      setMensagem("Matrícula criada com sucesso.");
      await carregar(["matriculas"]);
    } catch (erro) { setMensagem(mensagemErro(erro, "Não foi possível criar a matrícula.")); }
    finally { setCarregando(false); }
  }

  async function salvarEnturmacao(event: FormEvent) {
    event.preventDefault();
    if (!enturmacao.matricula_id || !enturmacao.turma_id) { setMensagem("Selecione a matrícula e a turma."); return; }
    setCarregando(true);
    try { await educacionalService.salvar("enturmacoes", { matricula_id: Number(enturmacao.matricula_id), turma_id: Number(enturmacao.turma_id), data_inicio: new Date().toISOString().slice(0, 10) }); setEnturmacao({ matricula_id: "", turma_id: "" }); setMensagem("Aluno alocado na turma com sucesso."); await carregar(["enturmacoes"]); }
    catch (erro) { setMensagem(mensagemErro(erro, "Não foi possível alocar o aluno na turma.")); }
    finally { setCarregando(false); }
  }

  function limparFormularioAtual() {
    setFormulario(formularioInicial);
    setMatricula(matriculaInicial);
    setEnturmacao({ matricula_id: "", turma_id: "" });
    setBusca("");
    setBeneficiarios([]);
    setAlunoSelecionado(null);
    setMensagem("");
    setIdEditando(null);
    if (aba === "matriculas") void carregarProximoNumeroMatricula(true);
  }

  function editarEstrutura(item: EducacionalItem) {
    setIdEditando(String(item.id));
    setFormulario({
      ...formularioInicial,
      ano: String(item.ano ?? ""),
      descricao: String(item.descricao ?? ""),
      nome: String(item.nome ?? ""),
      codigo: String(item.codigo ?? ""),
      area: String(item.area ?? ""),
      carga_horaria: String(item.carga_horaria ?? ""),
      etapa_id: String(item.etapa_id ?? ""),
      ano_letivo_id: String(item.ano_letivo_id ?? ""),
      serie_id: String(item.serie_id ?? ""),
      turno: String(item.turno ?? "INTEGRAL"),
      capacidade_maxima: String(item.capacidade_maxima ?? "")
    });
    setMensagem(`Editando ${nomeRecurso(item, recurso)}.`);
  }

  function salvarFormularioAtual() {
    const formularioAtivo = document.querySelector<HTMLFormElement>("form");
    if (!formularioAtivo) {
      setMensagem("A aba atual não possui um formulário de gravação.");
      return;
    }
    formularioAtivo.requestSubmit();
  }

  function buscarNaAbaAtual() {
    if (aba === "matriculas") {
      void buscarBeneficiarios();
      return;
    }
    void carregar();
  }

  const possuiFormulario = !["visao-geral", "pendencias", "professores", "responsaveis", "unidades", "vida-academica"].includes(aba);
  const acoes: import("@/components/admin/admin-page-layout").AdminAction[] = [
    ...(aba === "matriculas" || aba === "visao-geral" ? [{ id: "buscar", label: "Buscar", icon: Search, variant: "outline" as const, onClick: buscarNaAbaAtual }] : []),
    ...(possuiFormulario ? [{ id: "novo", label: "Novo", icon: Plus, variant: "outline" as const, onClick: limparFormularioAtual }] : []),
    ...(possuiFormulario ? [{ id: "salvar", label: "Salvar", icon: Save, variant: "default" as const, onClick: salvarFormularioAtual, disabled: carregando }] : []),
    ...(possuiFormulario ? [{ id: "cancelar", label: "Cancelar", icon: Undo2, variant: "outline" as const, onClick: limparFormularioAtual }] : []),
    { id: "imprimir", label: "Imprimir", icon: Printer, variant: "outline" as const, onClick: () => window.print() },
    { id: "fechar", label: "Fechar", icon: ArrowLeft, variant: "outline" as const, onClick: () => navigate("/educacional") }
  ];

  const grupo = new URLSearchParams(location.search).get("grupo");
  const abasGrupo: Array<{ label: string; aba: Aba; secao: string }> = grupo === "alunos"
    ? [{ secao: "Cadastro e matrícula", label: "Alunos", aba: "alunos" }, { secao: "Cadastro e matrícula", label: "Vida acadêmica 360º", aba: "vida-academica" }, { secao: "Cadastro e matrícula", label: "Matrículas", aba: "matriculas" }, { secao: "Cadastro e matrícula", label: "Alunos por turma", aba: "enturmacao" }, { secao: "Cadastro e matrícula", label: "Responsáveis e famílias", aba: "responsaveis" }]
    : grupo === "vida-escolar"
      ? [{ secao: "Movimentação", label: "Transferências", aba: "transferencias" }, { secao: "Movimentação", label: "Autorizações", aba: "autorizacoes" }, { secao: "Documentos e resultados", label: "Documentos e declarações", aba: "documentos" }, { secao: "Documentos e resultados", label: "Histórico escolar", aba: "historicos" }, { secao: "Documentos e resultados", label: "Boletins e resultados", aba: "boletins" }]
    : grupo === "estrutura"
      ? [{ secao: "Cadastros", label: "Estrutura acadêmica", aba: "estrutura" }, { secao: "Cadastros", label: "Unidades escolares", aba: "unidades" }, { secao: "Organização acadêmica", label: "Gestão acadêmica", aba: "fluxo-academico" }, { secao: "Organização acadêmica", label: "Grade curricular", aba: "grade-curricular" }, { secao: "Organização acadêmica", label: "Horários", aba: "horarios" }]
      : grupo === "professores"
        ? [{ secao: "Equipe", label: "Professores e equipe", aba: "professores" }, { secao: "Operação pedagógica", label: "Planejamento pedagógico", aba: "planejamentos" }, { secao: "Operação pedagógica", label: "Plano de aula", aba: "planos-aula" }, { secao: "Operação pedagógica", label: "Diário de classe", aba: "diarios" }, { secao: "Operação pedagógica", label: "Frequência e chamada", aba: "frequencias" }, { secao: "Avaliação", label: "Avaliações", aba: "avaliacoes" }, { secao: "Avaliação", label: "Lançamento de notas", aba: "notas" }]
      : grupo === "parcerias"
        ? [{ label: "Parcerias públicas", aba: "parcerias", secao: "Prestação de contas" }]
      : grupo === "gestao"
          ? [{ secao: "Acompanhamento escolar", label: "Ocorrências", aba: "ocorrencias" }, { secao: "Acompanhamento escolar", label: "Agenda escolar", aba: "agenda" }, { secao: "Educação infantil", label: "Rotina infantil", aba: "rotinas-infantis" }, { secao: "Educação infantil", label: "Desenvolvimento infantil", aba: "desenvolvimentos-infantis" }]
          : [];

  return <AdminPageLayout sectionLabel="Educacional" pageTitle={aba === "parcerias" ? "Parcerias públicas e prestação de contas" : aba === "visao-geral" ? "Visão geral" : aba === "pendencias" ? "Pendências educacionais" : aba === "estrutura" || aba === "fluxo-academico" || aba === "unidades" ? "Estrutura acadêmica" : aba === "vida-academica" ? "Vida acadêmica 360º" : aba === "alunos" || aba === "matriculas" || aba === "responsaveis" ? "Alunos" : aba === "enturmacao" ? "Alunos por turma" : aba === "professores" ? "Professores e equipe pedagógica" : aba === "grade-curricular" ? "Grade curricular" : aba === "horarios" ? "Horários" : aba === "diarios" ? "Diário de classe" : aba === "frequencias" ? "Chamada e frequência" : aba === "planos-aula" ? "Plano de aula" : aba === "planejamentos" ? "Planejamento pedagógico" : aba === "avaliacoes" ? "Avaliações e notas" : aba === "notas" ? "Notas" : aba === "boletins" ? "Boletins" : aba === "historicos" ? "Histórico escolar" : aba === "ocorrencias" ? "Ocorrências" : aba === "agenda" ? "Agenda escolar" : aba === "documentos" ? "Documentos/Declarações" : aba === "relatorios" ? "Relatórios e indicadores" : aba === "transferencias" ? "Transferências" : aba === "autorizacoes" ? "Autorizações" : aba === "rotinas-infantis" ? "Rotina infantil" : "Desenvolvimento infantil"} actions={acoes}>
    {mensagem ? <div className="mb-4 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3 text-sm text-[var(--g3-foreground)]">{mensagem}</div> : null}
    {abasGrupo.length ? <div className="float-left mb-4 mr-4 w-full max-w-[240px] rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-2"><div className="space-y-3">{abasGrupo.map((item, index) => <div key={item.label}>{index === 0 || item.secao !== abasGrupo[index - 1]?.secao ? <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">{item.secao}</p> : null}<button type="button" onClick={() => item.aba === "unidades" || item.aba === "responsaveis" ? navigate(item.aba === "unidades" ? "/cadastros/unidades-assistenciais?tipo_unidade=ENSINO" : "/cadastros/vinculo-familiar") : navigate(`/educacional?grupo=${grupo}&aba=${item.aba}`)} className={classeBotaoAbaLateral(aba === item.aba)}><span className={classeNumeroAbaLateral(aba === item.aba)}>{index + 1}</span><span className="min-w-0 break-words">{item.label}</span></button></div>)}</div></div> : null}
    {aba === "visao-geral" ? <EducacionalVisaoGeralPage resumo={resumo} carregando={carregando} /> : null}
    {aba === "pendencias" ? <EducacionalPendenciasPage /> : null}
    {aba === "fluxo-academico" ? <EducacionalFluxoAcademicoPage /> : null}
    {aba === "responsaveis" ? <Card><CardHeader><CardTitle>Responsáveis e famílias</CardTitle></CardHeader><CardContent><p className="mb-3 text-sm text-[var(--g3-muted)]">Use o cadastro central de vínculos familiares para manter os responsáveis sem duplicar pessoas.</p><Button type="button" onClick={() => navigate("/cadastros/vinculo-familiar")}>Abrir responsáveis e famílias</Button></CardContent></Card> : null}
    {aba === "unidades" ? <Card><CardHeader><CardTitle>Unidades escolares</CardTitle></CardHeader><CardContent><p className="mb-3 text-sm text-[var(--g3-muted)]">As unidades escolares são mantidas no cadastro mestre de Unidades de atendimento, filtradas por tipo de ensino.</p><Button type="button" onClick={() => navigate("/cadastros/unidades-assistenciais?tipo_unidade=ENSINO")}>Abrir unidades escolares</Button></CardContent></Card> : null}
    {aba === "estrutura" ? <div className="grid gap-4 lg:grid-cols-[280px_1fr]"><Card><CardHeader><CardTitle>Cadastros da estrutura</CardTitle></CardHeader><CardContent className="space-y-2">{recursos.map((item, index) => <button key={item.id} type="button" className={`flex min-h-10 w-full items-center gap-2 rounded-md border px-2 text-left text-xs font-medium transition ${recurso === item.id ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-transparent bg-[var(--g3-card-soft)] text-[var(--g3-foreground)] hover:border-emerald-600"}`} onClick={() => selecionarRecurso(item.id)}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${recurso === item.id ? "bg-emerald-700 text-white" : "bg-white text-emerald-800"}`}>{index + 1}</span>{item.label}</button>)}</CardContent></Card><Card><CardHeader><CardTitle>{idEditando ? "Editar cadastro" : recursos.find((item) => item.id === recurso)?.label}</CardTitle></CardHeader><CardContent><form className="mb-5 space-y-3" onSubmit={salvarEstrutura}><div className="grid gap-3 sm:grid-cols-2"><Input value={formulario.nome} onChange={(event) => atualizarFormulario("nome", event.target.value)} placeholder="Nome" hidden={recurso === "anos-letivos"} /><Input value={formulario.descricao} onChange={(event) => atualizarFormulario("descricao", event.target.value)} placeholder={recurso === "anos-letivos" ? "Descrição do ano letivo" : "Descrição (opcional)"} /><Input value={formulario.ano} onChange={(event) => atualizarFormulario("ano", event.target.value)} type="number" placeholder="Ano letivo" hidden={recurso !== "anos-letivos"} /><Input value={formulario.codigo} onChange={(event) => atualizarFormulario("codigo", event.target.value)} placeholder="Código (opcional)" hidden={recurso !== "disciplinas"} /><Input value={formulario.area} onChange={(event) => atualizarFormulario("area", event.target.value)} placeholder="Área (opcional)" hidden={recurso !== "disciplinas"} /><Input value={formulario.carga_horaria} onChange={(event) => atualizarFormulario("carga_horaria", event.target.value)} type="number" placeholder="Carga horária" hidden={recurso !== "disciplinas"} /><Select value={formulario.etapa_id} onChange={(event) => atualizarFormulario("etapa_id", event.target.value)} hidden={recurso !== "series" && recurso !== "turmas"}><option value="">Etapa de ensino</option>{opcoes(listas.etapas, "etapas")}</Select><Select value={formulario.ano_letivo_id} onChange={(event) => atualizarFormulario("ano_letivo_id", event.target.value)} hidden={recurso !== "turmas"}><option value="">Ano letivo</option>{opcoes(listas["anos-letivos"], "anos-letivos")}</Select><Select value={formulario.serie_id} onChange={(event) => atualizarFormulario("serie_id", event.target.value)} hidden={recurso !== "turmas"}><option value="">Série / ano escolar</option>{opcoes(listas.series, "series")}</Select><Select value={formulario.turno} onChange={(event) => atualizarFormulario("turno", event.target.value)} hidden={recurso !== "turmas"}><option value="INTEGRAL">Integral</option><option value="MATUTINO">Matutino</option><option value="VESPERTINO">Vespertino</option><option value="NOTURNO">Noturno</option></Select><Input value={formulario.capacidade_maxima} onChange={(event) => atualizarFormulario("capacidade_maxima", event.target.value)} type="number" min="1" placeholder="Capacidade máxima" hidden={recurso !== "turmas"} /></div><Button type="submit" disabled={carregando}>{idEditando ? "Atualizar cadastro" : "Salvar cadastro"}</Button></form><div className="grid gap-2 sm:grid-cols-2">{itensAtuais.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-3 text-sm"><div><strong>{nomeRecurso(item, recurso)}</strong><span className="ml-2 text-xs text-[var(--g3-muted)]">#{item.id}</span></div><Button type="button" size="sm" variant="outline" onClick={() => editarEstrutura(item)}>Editar</Button></div>)}</div>{!itensAtuais.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum cadastro encontrado.</p> : null}</CardContent></Card></div> : null}
    {aba === "alunos" ? <EducacionalAlunosAgrupadosPage /> : null}
    {aba === "vida-academica" ? <EducacionalAlunosAgrupadosPage titulo="Vida acadêmica 360º" subtitulo="Pesquise o aluno e clique em Vida acadêmica para abrir identificação, matrículas, frequência, notas, ocorrências, documentos, histórico e linha do tempo." /> : null}
    {aba === "matriculas" ? <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Vincular beneficiário como aluno</CardTitle></CardHeader><CardContent><div className="flex gap-2"><Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Nome, CPF ou código" onKeyDown={(event) => { if (event.key === "Enter") void buscarBeneficiarios(); }} /><Button onClick={() => void buscarBeneficiarios()} disabled={carregando}><Search className="mr-2 h-4 w-4" />Buscar</Button></div><div className="mt-4 space-y-2">{beneficiarios.map((item) => <button type="button" key={item.id} onClick={() => setAlunoSelecionado(item)} className={`w-full rounded-lg border p-3 text-left text-sm ${alunoSelecionado?.id === item.id ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]" : "border-[var(--g3-border)] bg-[var(--g3-card-soft)]"}`}><strong>{item.nome}</strong><span className="ml-2 text-xs text-[var(--g3-muted)]">Código: {item.codigo ?? "—"}</span></button>)}</div>{alunoSelecionado ? <Button className="mt-4" onClick={() => void vincular()} disabled={carregando}>Vincular aluno selecionado</Button> : null}<form className="mt-6 space-y-3 border-t border-[var(--g3-border)] pt-4" onSubmit={criarMatricula}><p className="text-sm font-semibold">Nova matrícula</p><Select value={matricula.aluno_id} onChange={(event) => atualizarMatricula("aluno_id", event.target.value)}><option value="">Aluno</option>{(listas.alunos ?? []).map((item) => <option key={item.id} value={item.id}>{texto(item, "nome_completo")} · #{item.id}</option>)}</Select><Select value={matricula.unidade_id} onChange={(event) => setMatricula((anterior) => ({ ...anterior, unidade_id: event.target.value, sala_id: "" }))}><option value="">Unidade de ensino</option>{unidadesEnsino.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}</Select><Select value={matricula.sala_id} onChange={(event) => atualizarMatricula("sala_id", event.target.value)} disabled={!matricula.unidade_id}><option value="">Sala disponível</option>{(unidadesEnsino.find((unidade) => unidade.id === matricula.unidade_id)?.salas ?? []).map((sala) => <option key={sala.id} value={sala.id} disabled={sala.lotada}>{sala.nome} — {sala.disponiveis === null ? "capacidade não configurada" : `${sala.disponiveis} vaga(s) disponível(is) de ${sala.capacidade_maxima}`}</option>)}</Select><div className="grid gap-2 sm:grid-cols-2"><Select value={matricula.ano_letivo_id} onChange={(event) => atualizarMatricula("ano_letivo_id", event.target.value)}><option value="">Ano letivo</option>{opcoes(listas["anos-letivos"], "anos-letivos")}</Select><Select value={matricula.etapa_id} onChange={(event) => atualizarMatricula("etapa_id", event.target.value)}><option value="">Etapa</option>{opcoes(listas.etapas, "etapas")}</Select><Select value={matricula.serie_id} onChange={(event) => atualizarMatricula("serie_id", event.target.value)}><option value="">Série / ano</option>{opcoes(listas.series, "series")}</Select><Select value={matricula.turma_id} onChange={(event) => atualizarMatricula("turma_id", event.target.value)}><option value="">Turma opcional</option>{opcoes(listas.turmas, "turmas")}</Select></div><Input value={matricula.numero_matricula} onChange={(event) => atualizarMatricula("numero_matricula", event.target.value)} placeholder="Número da matrícula" title="O sistema sugere um número sequencial, mas você pode editar antes de salvar." /><div className="grid gap-2 sm:grid-cols-2"><Select value={matricula.origem} onChange={(event) => atualizarMatricula("origem", event.target.value)} title="Informe como o aluno chegou a esta matrícula."><option value="NOVO">Nova matrícula</option><option value="TRANSFERENCIA">Transferência</option><option value="REMATRICULA">Rematrícula</option><option value="RETORNO">Retorno</option><option value="OUTRO">Outra origem</option></Select><Input value={matricula.escola_anterior} onChange={(event) => atualizarMatricula("escola_anterior", event.target.value)} placeholder="Escola anterior (opcional)" title="Informe a escola anterior quando a origem for transferência ou retorno." /></div><Input value={matricula.responsavel_nome} onChange={(event) => atualizarMatricula("responsavel_nome", event.target.value)} placeholder="Responsável pela matrícula (opcional)" title="Informe o responsável que está acompanhando ou assinando esta matrícula." /><div className="grid gap-2 sm:grid-cols-2"><Select value={matricula.transporte_escolar} onChange={(event) => atualizarMatricula("transporte_escolar", event.target.value)} title="Indique se o aluno utiliza transporte escolar."><option value="false">Sem transporte escolar</option><option value="true">Utiliza transporte escolar</option></Select><Input value={matricula.transporte_descricao} onChange={(event) => atualizarMatricula("transporte_descricao", event.target.value)} placeholder="Detalhes do transporte (opcional)" title="Informe rota, linha ou observação do transporte quando necessário." /></div><div className="grid gap-2 sm:grid-cols-2"><Select value={matricula.documentacao_identificacao} onChange={(event) => atualizarMatricula("documentacao_identificacao", event.target.value)} title="Marque se o documento de identificação já foi conferido."><option value="false">Identificação pendente</option><option value="true">Identificação conferida</option></Select><Select value={matricula.documentacao_comprovante_residencia} onChange={(event) => atualizarMatricula("documentacao_comprovante_residencia", event.target.value)} title="Marque se o comprovante de residência já foi conferido."><option value="false">Comprovante pendente</option><option value="true">Comprovante conferido</option></Select></div><textarea value={matricula.informacoes_complementares} onChange={(event) => atualizarMatricula("informacoes_complementares", event.target.value)} placeholder="Informações complementares (opcional)" title="Registre informações administrativas importantes para esta matrícula." className="min-h-20 w-full rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2 text-sm text-[var(--g3-foreground)] shadow-sm outline-none transition focus:border-[var(--g3-active)] focus:ring-2 focus:ring-[var(--g3-ring)]" /><Button type="submit" disabled={carregando}>Criar matrícula</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Matrículas registradas</CardTitle></CardHeader><CardContent className="space-y-2">{(listas.matriculas ?? []).map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm"><strong>{texto(item, "aluno_nome", "numero_matricula")}</strong><span className="ml-2 text-xs text-[var(--g3-muted)]">Matrícula {texto(item, "numero_matricula")} · Unidade {texto(item, "unidade_id")} · Sala {texto(item, "sala_id")} · Turma {texto(item, "turma_nome")} · {texto(item, "situacao")}</span></div>)}{!(listas.matriculas ?? []).length ? <p className="text-sm text-[var(--g3-muted)]">Nenhuma matrícula encontrada.</p> : null}</CardContent></Card></div> : null}
    {aba === "enturmacao" ? <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Alunos por turma</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={salvarEnturmacao}><Select value={enturmacao.matricula_id} onChange={(event) => setEnturmacao((anterior) => ({ ...anterior, matricula_id: event.target.value }))}><option value="">Matrícula</option>{(listas.matriculas ?? []).map((item) => <option key={item.id} value={item.id}>{texto(item, "numero_matricula")} — aluno #{texto(item, "aluno_id")}</option>)}</Select><Select value={enturmacao.turma_id} onChange={(event) => setEnturmacao((anterior) => ({ ...anterior, turma_id: event.target.value }))}><option value="">Turma</option>{opcoes(listas.turmas, "turmas")}</Select><Button type="submit" disabled={carregando}>Alocar aluno na turma</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Histórico de alocações</CardTitle></CardHeader><CardContent className="space-y-2">{(listas.enturmacoes ?? []).map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm">Matrícula #{texto(item, "matricula_id")} · Turma #{texto(item, "turma_id")}</div>)}{!(listas.enturmacoes ?? []).length ? <p className="text-sm text-[var(--g3-muted)]">Nenhuma alocação encontrada.</p> : null}</CardContent></Card></div> : null}
    {aba === "professores" ? <EducacionalProfissionaisPage /> : null}
    {aba === "transferencias" || aba === "autorizacoes" ? <EducacionalAlunosFluxosPage recurso={aba} /> : null}
    {aba === "grade-curricular" || aba === "horarios" ? <EducacionalAcademicoPage recurso={aba} /> : null}
    {aba === "diarios" || aba === "frequencias" ? <EducacionalDiarioPage recurso={aba} /> : null}
    {aba === "planos-aula" || aba === "planejamentos" ? <EducacionalPlanejamentoPage recurso={aba} /> : null}
    {aba === "avaliacoes" || aba === "notas" ? <EducacionalAvaliacoesPage recurso={aba} /> : null}
    {aba === "boletins" || aba === "historicos" ? <EducacionalBoletinsPage recurso={aba} /> : null}
    {aba === "ocorrencias" || aba === "agenda" ? <EducacionalGestaoPage recurso={aba} /> : null}
    {aba === "documentos" ? <EducacionalDocumentosPage /> : null}
    {aba === "relatorios" ? <EducacionalRelatoriosPage /> : null}
    {aba === "parcerias" ? <EducacionalParceriasPublicasPage /> : null}
    {aba === "rotinas-infantis" || aba === "desenvolvimentos-infantis" ? <EducacionalCrechePage recurso={aba} /> : null}
  </AdminPageLayout>;
}
