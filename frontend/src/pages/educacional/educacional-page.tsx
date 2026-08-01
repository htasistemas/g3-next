import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { educacionalService, type EducacionalRecurso } from "@/services/educacional.service";
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

type Aba = "visao-geral" | "estrutura" | "alunos" | "matriculas" | "enturmacao" | "professores" | "grade-curricular" | "horarios" | "diarios" | "frequencias" | "planos-aula" | "planejamentos" | "avaliacoes" | "notas" | "boletins" | "historicos" | "ocorrencias" | "agenda" | "documentos" | "relatorios" | "rotinas-infantis" | "desenvolvimentos-infantis" | "transferencias" | "autorizacoes" | "fluxo-academico";
type Formulario = Record<string, string>;

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

function texto(item: EducacionalItem, ...chaves: string[]) {
  for (const chave of chaves) {
    const valor = item[chave];
    if (valor !== null && valor !== undefined && String(valor).trim()) return String(valor);
  }
  return "—";
}

function nomeRecurso(item: EducacionalItem, recurso: EducacionalRecurso) {
  if (recurso === "anos-letivos") return `${texto(item, "ano")} — ${texto(item, "descricao")}`;
  return texto(item, "nome", "descricao");
}

function opcoes(lista: EducacionalItem[] | undefined, recurso: EducacionalRecurso) {
  return (lista ?? []).map((item) => <option key={item.id} value={item.id}>{nomeRecurso(item, recurso)}</option>);
}

export function EducacionalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>("visao-geral");
  const [resumo, setResumo] = useState<Record<string, number>>({});
  const [listas, setListas] = useState<Partial<Record<EducacionalRecurso, EducacionalItem[]>>>({});
  const [recurso, setRecurso] = useState<EducacionalRecurso>("anos-letivos");
  const [formulario, setFormulario] = useState<Formulario>(formularioInicial);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [beneficiarios, setBeneficiarios] = useState<BeneficiarioBusca[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<BeneficiarioBusca | null>(null);
  const [matricula, setMatricula] = useState({ aluno_id: "", ano_letivo_id: "", etapa_id: "", serie_id: "", turma_id: "", numero_matricula: "" });
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
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível carregar os dados educacionais.");
    } finally { setCarregando(false); }
  };

  useEffect(() => { void carregar(); }, []);
  useEffect(() => {
    const valor = new URLSearchParams(location.search).get("aba");
    setAba(valor === "estrutura" || valor === "alunos" || valor === "matriculas" || valor === "enturmacao" || valor === "professores" || valor === "grade-curricular" || valor === "horarios" || valor === "diarios" || valor === "frequencias" || valor === "planos-aula" || valor === "planejamentos" || valor === "avaliacoes" || valor === "notas" || valor === "boletins" || valor === "historicos" || valor === "ocorrencias" || valor === "agenda" || valor === "documentos" || valor === "relatorios" || valor === "rotinas-infantis" || valor === "desenvolvimentos-infantis" || valor === "transferencias" || valor === "autorizacoes" || valor === "fluxo-academico" ? valor : "visao-geral");
    const recursoSolicitado = new URLSearchParams(location.search).get("recurso") as EducacionalRecurso | null;
    if (recursos.some((item) => item.id === recursoSolicitado)) {
      setRecurso(recursoSolicitado as EducacionalRecurso);
    }
  }, [location.search]);

  const itensAtuais = useMemo(() => listas[recurso] ?? [], [listas, recurso]);
  const atualizarFormulario = (campo: string, valor: string) => setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  const atualizarMatricula = (campo: string, valor: string) => setMatricula((anterior) => ({ ...anterior, [campo]: valor }));

  function selecionarRecurso(novoRecurso: EducacionalRecurso) {
    setRecurso(novoRecurso);
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
      await educacionalService.salvar(recurso, payload);
      setFormulario(formularioInicial);
      setMensagem(`${recursos.find((item) => item.id === recurso)?.label ?? "Cadastro"} salvo com sucesso.`);
      await carregar([recurso]);
    } catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível salvar o cadastro."); }
    finally { setCarregando(false); }
  }

  async function buscarBeneficiarios() {
    if (busca.trim().length < 2) { setMensagem("Informe ao menos 2 caracteres para buscar."); return; }
    setCarregando(true);
    try { setBeneficiarios(await educacionalService.buscarBeneficiarios(busca)); }
    catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível buscar beneficiários."); }
    finally { setCarregando(false); }
  }

  async function vincular() {
    if (!alunoSelecionado) return;
    setCarregando(true);
    try { const aluno = await educacionalService.vincularAluno(alunoSelecionado.id); atualizarMatricula("aluno_id", String(aluno.id)); setMensagem("Beneficiário vinculado como aluno."); setAlunoSelecionado(null); await carregar(["alunos"]); }
    catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível vincular o beneficiário."); }
    finally { setCarregando(false); }
  }

  async function criarMatricula(event: FormEvent) {
    event.preventDefault();
    if (!matricula.aluno_id || !matricula.ano_letivo_id || !matricula.etapa_id || !matricula.serie_id || !matricula.numero_matricula.trim()) { setMensagem("Informe aluno, ano letivo, etapa, série e número da matrícula."); return; }
    setCarregando(true);
    try {
      await educacionalService.salvar("matriculas", { aluno_id: Number(matricula.aluno_id), ano_letivo_id: Number(matricula.ano_letivo_id), etapa_id: Number(matricula.etapa_id), serie_id: Number(matricula.serie_id), turma_id: matricula.turma_id ? Number(matricula.turma_id) : null, numero_matricula: matricula.numero_matricula.trim(), data_matricula: new Date().toISOString().slice(0, 10), situacao: "ATIVA" });
      setMatricula({ aluno_id: "", ano_letivo_id: "", etapa_id: "", serie_id: "", turma_id: "", numero_matricula: "" });
      setMensagem("Matrícula criada com sucesso.");
      await carregar(["matriculas"]);
    } catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível criar a matrícula."); }
    finally { setCarregando(false); }
  }

  async function salvarEnturmacao(event: FormEvent) {
    event.preventDefault();
    if (!enturmacao.matricula_id || !enturmacao.turma_id) { setMensagem("Selecione a matrícula e a turma."); return; }
    setCarregando(true);
    try { await educacionalService.salvar("enturmacoes", { matricula_id: Number(enturmacao.matricula_id), turma_id: Number(enturmacao.turma_id), data_inicio: new Date().toISOString().slice(0, 10) }); setEnturmacao({ matricula_id: "", turma_id: "" }); setMensagem("Aluno alocado na turma com sucesso."); await carregar(["enturmacoes"]); }
    catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível alocar o aluno na turma."); }
    finally { setCarregando(false); }
  }

  const grupo = new URLSearchParams(location.search).get("grupo");
  const abasGrupo = grupo === "alunos"
    ? [{ label: "Alunos", aba: "alunos" }, { label: "Matrículas", aba: "matriculas" }, { label: "Transferências", aba: "transferencias" }, { label: "Autorizações", aba: "autorizacoes" }]
    : grupo === "diario"
      ? [{ label: "Diário de classe", aba: "diarios" }, { label: "Plano de aula", aba: "planos-aula" }, { label: "Avaliações e notas", aba: "avaliacoes" }, { label: "Chamada e frequência", aba: "frequencias" }]
      : grupo === "professores"
        ? [{ label: "Professores e equipe pedagógica", aba: "professores" }, { label: "Planejamento pedagógico", aba: "planejamentos" }]
        : [];

  return <AdminPageLayout sectionLabel="Educacional" pageTitle={aba === "visao-geral" ? "Visão geral" : aba === "estrutura" ? "Estrutura acadêmica" : aba === "alunos" || aba === "matriculas" ? "Alunos" : aba === "enturmacao" ? "Alunos por turma" : aba === "professores" ? "Professores e equipe pedagógica" : aba === "grade-curricular" ? "Grade curricular" : aba === "horarios" ? "Horários" : aba === "diarios" ? "Diário de classe" : aba === "frequencias" ? "Chamada e frequência" : aba === "planos-aula" ? "Plano de aula" : aba === "planejamentos" ? "Planejamento pedagógico" : aba === "avaliacoes" ? "Avaliações e notas" : aba === "notas" ? "Notas" : aba === "boletins" ? "Boletins" : aba === "historicos" ? "Histórico escolar" : aba === "ocorrencias" ? "Ocorrências" : aba === "agenda" ? "Agenda escolar" : aba === "documentos" ? "Documentos/Declarações" : aba === "relatorios" ? "Relatórios e indicadores" : aba === "transferencias" ? "Transferências" : aba === "autorizacoes" ? "Autorizações" : aba === "rotinas-infantis" ? "Rotina infantil" : "Desenvolvimento infantil"} actions={[]}>
    {mensagem ? <div className="mb-4 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3 text-sm text-[var(--g3-foreground)]">{mensagem}</div> : null}
    {abasGrupo.length ? <div className="float-left mb-4 mr-4 w-full max-w-[235px] rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-2">{abasGrupo.map((item, index) => <button key={item.label} type="button" onClick={() => navigate(`/educacional?grupo=${grupo}&aba=${item.aba}`)} className={`mb-2 flex min-h-10 w-full items-center gap-2 rounded-md border px-2 text-left text-xs font-medium transition last:mb-0 ${aba === item.aba ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-transparent bg-[var(--g3-card)] text-[var(--g3-foreground)] hover:border-emerald-600"}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${aba === item.aba ? "bg-emerald-700 text-white" : "bg-white text-emerald-800"}`}>{index + 1}</span>{item.label}</button>)}</div> : null}
    {aba === "visao-geral" ? <EducacionalVisaoGeralPage resumo={resumo} carregando={carregando} /> : null}
    {aba === "fluxo-academico" ? <EducacionalFluxoAcademicoPage /> : null}
    {aba === "estrutura" ? <div className="grid gap-4 lg:grid-cols-[280px_1fr]"><Card><CardHeader><CardTitle>Cadastros da estrutura</CardTitle></CardHeader><CardContent className="space-y-2">{recursos.map((item, index) => <button key={item.id} type="button" className={`flex min-h-10 w-full items-center gap-2 rounded-md border px-2 text-left text-xs font-medium transition ${recurso === item.id ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-transparent bg-[var(--g3-card-soft)] text-[var(--g3-foreground)] hover:border-emerald-600"}`} onClick={() => selecionarRecurso(item.id)}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${recurso === item.id ? "bg-emerald-700 text-white" : "bg-white text-emerald-800"}`}>{index + 1}</span>{item.label}</button>)}</CardContent></Card><Card><CardHeader><CardTitle>{recursos.find((item) => item.id === recurso)?.label}</CardTitle></CardHeader><CardContent><form className="mb-5 space-y-3" onSubmit={salvarEstrutura}><div className="grid gap-3 sm:grid-cols-2"><Input value={formulario.nome} onChange={(event) => atualizarFormulario("nome", event.target.value)} placeholder="Nome" hidden={recurso === "anos-letivos"} /><Input value={formulario.descricao} onChange={(event) => atualizarFormulario("descricao", event.target.value)} placeholder={recurso === "anos-letivos" ? "Descrição do ano letivo" : "Descrição (opcional)"} /><Input value={formulario.ano} onChange={(event) => atualizarFormulario("ano", event.target.value)} type="number" placeholder="Ano letivo" hidden={recurso !== "anos-letivos"} /><Input value={formulario.codigo} onChange={(event) => atualizarFormulario("codigo", event.target.value)} placeholder="Código (opcional)" hidden={recurso !== "disciplinas"} /><Input value={formulario.area} onChange={(event) => atualizarFormulario("area", event.target.value)} placeholder="Área (opcional)" hidden={recurso !== "disciplinas"} /><Input value={formulario.carga_horaria} onChange={(event) => atualizarFormulario("carga_horaria", event.target.value)} type="number" placeholder="Carga horária" hidden={recurso !== "disciplinas"} /><Select value={formulario.etapa_id} onChange={(event) => atualizarFormulario("etapa_id", event.target.value)} hidden={recurso !== "series" && recurso !== "turmas"}><option value="">Etapa de ensino</option>{opcoes(listas.etapas, "etapas")}</Select><Select value={formulario.ano_letivo_id} onChange={(event) => atualizarFormulario("ano_letivo_id", event.target.value)} hidden={recurso !== "turmas"}><option value="">Ano letivo</option>{opcoes(listas["anos-letivos"], "anos-letivos")}</Select><Select value={formulario.serie_id} onChange={(event) => atualizarFormulario("serie_id", event.target.value)} hidden={recurso !== "turmas"}><option value="">Série / ano escolar</option>{opcoes(listas.series, "series")}</Select><Select value={formulario.turno} onChange={(event) => atualizarFormulario("turno", event.target.value)} hidden={recurso !== "turmas"}><option value="INTEGRAL">Integral</option><option value="MATUTINO">Matutino</option><option value="VESPERTINO">Vespertino</option><option value="NOTURNO">Noturno</option></Select><Input value={formulario.capacidade_maxima} onChange={(event) => atualizarFormulario("capacidade_maxima", event.target.value)} type="number" min="1" placeholder="Capacidade máxima" hidden={recurso !== "turmas"} /></div><Button disabled={carregando}><Plus className="mr-2 h-4 w-4" />Salvar cadastro</Button></form><div className="grid gap-2 sm:grid-cols-2">{itensAtuais.map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-3 text-sm"><strong>{nomeRecurso(item, recurso)}</strong><span className="ml-2 text-xs text-[var(--g3-muted)]">#{item.id}</span></div>)}</div>{!itensAtuais.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum cadastro encontrado.</p> : null}</CardContent></Card></div> : null}
    {aba === "alunos" ? <Card><CardHeader><CardTitle>Alunos vinculados</CardTitle></CardHeader><CardContent className="space-y-2">{(listas.alunos ?? []).map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm"><strong>{texto(item, "nome_completo", "aluno_nome")}</strong><span className="ml-2 text-xs text-[var(--g3-muted)]">Código do beneficiário: {texto(item, "codigo_beneficiario")} · Aluno #{item.id}</span></div>)}{!(listas.alunos ?? []).length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum aluno vinculado.</p> : null}</CardContent></Card> : null}
    {aba === "matriculas" ? <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Vincular beneficiário como aluno</CardTitle></CardHeader><CardContent><div className="flex gap-2"><Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Nome, CPF ou código" onKeyDown={(event) => { if (event.key === "Enter") void buscarBeneficiarios(); }} /><Button onClick={() => void buscarBeneficiarios()} disabled={carregando}><Search className="mr-2 h-4 w-4" />Buscar</Button></div><div className="mt-4 space-y-2">{beneficiarios.map((item) => <button type="button" key={item.id} onClick={() => setAlunoSelecionado(item)} className={`w-full rounded-lg border p-3 text-left text-sm ${alunoSelecionado?.id === item.id ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]" : "border-[var(--g3-border)] bg-[var(--g3-card-soft)]"}`}><strong>{item.nome}</strong><span className="ml-2 text-xs text-[var(--g3-muted)]">Código: {item.codigo ?? "—"}</span></button>)}</div>{alunoSelecionado ? <Button className="mt-4" onClick={() => void vincular()} disabled={carregando}>Vincular aluno selecionado</Button> : null}<form className="mt-6 space-y-3 border-t border-[var(--g3-border)] pt-4" onSubmit={criarMatricula}><p className="text-sm font-semibold">Nova matrícula</p><Select value={matricula.aluno_id} onChange={(event) => atualizarMatricula("aluno_id", event.target.value)}><option value="">Aluno</option>{(listas.alunos ?? []).map((item) => <option key={item.id} value={item.id}>{texto(item, "nome_completo")} · #{item.id}</option>)}</Select><div className="grid gap-2 sm:grid-cols-2"><Select value={matricula.ano_letivo_id} onChange={(event) => atualizarMatricula("ano_letivo_id", event.target.value)}><option value="">Ano letivo</option>{opcoes(listas["anos-letivos"], "anos-letivos")}</Select><Select value={matricula.etapa_id} onChange={(event) => atualizarMatricula("etapa_id", event.target.value)}><option value="">Etapa</option>{opcoes(listas.etapas, "etapas")}</Select><Select value={matricula.serie_id} onChange={(event) => atualizarMatricula("serie_id", event.target.value)}><option value="">Série / ano</option>{opcoes(listas.series, "series")}</Select><Select value={matricula.turma_id} onChange={(event) => atualizarMatricula("turma_id", event.target.value)}><option value="">Turma opcional</option>{opcoes(listas.turmas, "turmas")}</Select></div><Input value={matricula.numero_matricula} onChange={(event) => atualizarMatricula("numero_matricula", event.target.value)} placeholder="Número da matrícula" /><Button disabled={carregando}>Criar matrícula</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Matrículas registradas</CardTitle></CardHeader><CardContent className="space-y-2">{(listas.matriculas ?? []).map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm"><strong>{texto(item, "aluno_nome", "numero_matricula")}</strong><span className="ml-2 text-xs text-[var(--g3-muted)]">Matrícula {texto(item, "numero_matricula")} · Turma {texto(item, "turma_nome")} · {texto(item, "situacao")}</span></div>)}{!(listas.matriculas ?? []).length ? <p className="text-sm text-[var(--g3-muted)]">Nenhuma matrícula encontrada.</p> : null}</CardContent></Card></div> : null}
    {aba === "enturmacao" ? <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Alunos por turma</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={salvarEnturmacao}><Select value={enturmacao.matricula_id} onChange={(event) => setEnturmacao((anterior) => ({ ...anterior, matricula_id: event.target.value }))}><option value="">Matrícula</option>{(listas.matriculas ?? []).map((item) => <option key={item.id} value={item.id}>{texto(item, "numero_matricula")} — aluno #{texto(item, "aluno_id")}</option>)}</Select><Select value={enturmacao.turma_id} onChange={(event) => setEnturmacao((anterior) => ({ ...anterior, turma_id: event.target.value }))}><option value="">Turma</option>{opcoes(listas.turmas, "turmas")}</Select><Button disabled={carregando}>Alocar aluno na turma</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Histórico de alocações</CardTitle></CardHeader><CardContent className="space-y-2">{(listas.enturmacoes ?? []).map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm">Matrícula #{texto(item, "matricula_id")} · Turma #{texto(item, "turma_id")}</div>)}{!(listas.enturmacoes ?? []).length ? <p className="text-sm text-[var(--g3-muted)]">Nenhuma alocação encontrada.</p> : null}</CardContent></Card></div> : null}
    {aba === "professores" ? <Card><CardHeader><CardTitle>Professores e equipe pedagógica</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-[var(--g3-muted)]">Use o cadastro central de profissionais para localizar ou atualizar o profissional. O vínculo educacional será associado ao cadastro existente, sem duplicar a pessoa.</p><Button type="button" onClick={() => navigate("/cadastros/profissionais")}>Abrir cadastro de profissionais</Button></CardContent></Card> : null}
    {aba === "transferencias" || aba === "autorizacoes" ? <EducacionalAlunosFluxosPage recurso={aba} /> : null}
    {aba === "grade-curricular" || aba === "horarios" ? <EducacionalAcademicoPage recurso={aba} /> : null}
    {aba === "diarios" || aba === "frequencias" ? <EducacionalDiarioPage recurso={aba} /> : null}
    {aba === "planos-aula" || aba === "planejamentos" ? <EducacionalPlanejamentoPage recurso={aba} /> : null}
    {aba === "avaliacoes" || aba === "notas" ? <EducacionalAvaliacoesPage recurso={aba} /> : null}
    {aba === "boletins" || aba === "historicos" ? <EducacionalBoletinsPage recurso={aba} /> : null}
    {aba === "ocorrencias" || aba === "agenda" ? <EducacionalGestaoPage recurso={aba} /> : null}
    {aba === "documentos" ? <EducacionalDocumentosPage /> : null}
    {aba === "relatorios" ? <EducacionalRelatoriosPage /> : null}
    {aba === "rotinas-infantis" || aba === "desenvolvimentos-infantis" ? <EducacionalCrechePage recurso={aba} /> : null}
  </AdminPageLayout>;
}
