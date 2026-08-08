import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, Pencil, Search, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { educacionalService, type AlunosAgrupadosResponse, type UnidadeEnsinoCatalogo, type VidaAcademicaAlunoResponse } from "@/services/educacional.service";
import type { EducacionalItem } from "@/types/educacional";

function valor(item: Record<string, unknown>, ...chaves: string[]) {
  for (const chave of chaves) {
    const value = item[chave];
    if (value !== null && value !== undefined && String(value).trim()) return String(value);
  }
  return "—";
}

function idade(dataNascimento: unknown) {
  if (!dataNascimento) return "—";
  const nascimento = new Date(String(dataNascimento));
  if (Number.isNaN(nascimento.getTime())) return "—";
  const hoje = new Date();
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate())) anos -= 1;
  return `${anos} anos`;
}

type EducacionalAlunosAgrupadosPageProps = {
  titulo?: string;
  subtitulo?: string;
};

export function EducacionalAlunosAgrupadosPage({ titulo = "Alunos por instituição e sala", subtitulo }: EducacionalAlunosAgrupadosPageProps = {}) {
  const location = useLocation();
  const alunoParametro = useMemo(() => new URLSearchParams(location.search).get("aluno_id") ?? "", [location.search]);
  const [dados, setDados] = useState<AlunosAgrupadosResponse | null>(null);
  const [unidades, setUnidades] = useState<UnidadeEnsinoCatalogo[]>([]);
  const [anos, setAnos] = useState<EducacionalItem[]>([]);
  const [etapas, setEtapas] = useState<EducacionalItem[]>([]);
  const [series, setSeries] = useState<EducacionalItem[]>([]);
  const [filtros, setFiltros] = useState({ instituicao_id: "", ano_letivo_id: "", sala_id: "", busca: "", situacao: "", sem_sala: false, sem_instituicao: false });
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(true);
  const [carregandoVida, setCarregandoVida] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [edicao, setEdicao] = useState<{ matriculaId: string; alunoId: string; instituicaoId: string; salaId: string; turmaId: string; anoLetivoId: string; etapaId: string; serieId: string; numeroMatricula: string; data: string; motivo: string; observacoes: string } | null>(null);
  const [vidaAcademica, setVidaAcademica] = useState<VidaAcademicaAlunoResponse | null>(null);
  const [alunoAbertoPorParametro, setAlunoAbertoPorParametro] = useState("");

  const salas = useMemo(() => unidades.find((item) => item.id === filtros.instituicao_id)?.salas ?? [], [filtros.instituicao_id, unidades]);
  async function carregar() {
    setCarregando(true);
    setMensagem("");
    try {
      const resultado = await educacionalService.listarAlunosAgrupados({ ...filtros, instituicao_id: filtros.instituicao_id || undefined, ano_letivo_id: filtros.ano_letivo_id || undefined, sala_id: filtros.sala_id || undefined, situacao: filtros.situacao || undefined, busca: filtros.busca || undefined, pagina: 1, limite: 200 });
      setDados(resultado);
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível carregar os alunos agrupados.");
    } finally { setCarregando(false); }
  }
  useEffect(() => {
    void Promise.all([educacionalService.listarUnidadesEnsino(), educacionalService.listar("anos-letivos"), educacionalService.listar("etapas"), educacionalService.listar("series")]).then(([catalogo, anosLetivos, etapasLetivas, seriesLetivas]) => { setUnidades(catalogo); setAnos(anosLetivos); setEtapas(etapasLetivas); setSeries(seriesLetivas); }).catch(() => setMensagem("Não foi possível carregar os filtros educacionais."));
    void carregar();
  }, []);

  useEffect(() => {
    if (!alunoParametro || alunoAbertoPorParametro === alunoParametro) return;
    setAlunoAbertoPorParametro(alunoParametro);
    void abrirVidaAcademica({ aluno_id: alunoParametro });
  }, [alunoParametro, alunoAbertoPorParametro]);

  function atualizar(campo: string, valorCampo: string | boolean) {
    setFiltros((atual) => ({ ...atual, [campo]: valorCampo, ...(campo === "instituicao_id" ? { sala_id: "" } : {}) }));
  }
  function alternar(chave: string) { setAbertos((atual) => ({ ...atual, [chave]: !atual[chave] })); }
  function iniciarEdicao(aluno: Record<string, unknown>) {
    if (!aluno.matricula_id) { setMensagem("Este aluno ainda não possui matrícula educacional para editar."); return; }
    setEdicao({ matriculaId: String(aluno.matricula_id ?? ""), alunoId: String(aluno.aluno_id), instituicaoId: String(aluno.unidade_id ?? ""), salaId: String(aluno.sala_id ?? ""), turmaId: String(aluno.turma_id ?? ""), anoLetivoId: String(aluno.ano_letivo_id ?? anos[0]?.id ?? ""), etapaId: String(aluno.etapa_id ?? etapas[0]?.id ?? ""), serieId: String(aluno.serie_id ?? series[0]?.id ?? ""), numeroMatricula: String(aluno.numero_matricula ?? ""), data: new Date().toISOString().slice(0, 10), motivo: "", observacoes: "" });
  }
  async function abrirVidaAcademica(aluno: Record<string, unknown>) {
    setCarregandoVida(true);
    setMensagem("");
    try {
      setVidaAcademica(await educacionalService.obterVidaAcademicaAluno(String(aluno.aluno_id)));
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível carregar a vida acadêmica do aluno.");
    } finally {
      setCarregandoVida(false);
    }
  }
  async function salvarEdicao() {
    if (!edicao?.alunoId || !edicao.instituicaoId || !edicao.salaId || !edicao.anoLetivoId || !edicao.etapaId || !edicao.serieId || edicao.motivo.trim().length < 2) { setMensagem("Informe instituição, sala, ano letivo, etapa, série e motivo da alteração."); return; }
    setCarregando(true);
    try { if (edicao.matriculaId) await educacionalService.editarVinculoMatricula(edicao.matriculaId, { instituicao_id: Number(edicao.instituicaoId), sala_id: Number(edicao.salaId), turma_id: edicao.turmaId ? Number(edicao.turmaId) : null, data_alteracao: edicao.data, motivo: edicao.motivo.trim(), observacoes: edicao.observacoes.trim() || null }); else await educacionalService.criarVinculoAluno(edicao.alunoId, { instituicao_id: Number(edicao.instituicaoId), sala_id: Number(edicao.salaId), ano_letivo_id: Number(edicao.anoLetivoId), etapa_id: Number(edicao.etapaId), serie_id: Number(edicao.serieId), turma_id: edicao.turmaId ? Number(edicao.turmaId) : null, numero_matricula: edicao.numeroMatricula.trim() || null, data_inicio: edicao.data, motivo: edicao.motivo.trim(), observacoes: edicao.observacoes.trim() || null }); setEdicao(null); setMensagem("Vínculo educacional atualizado com sucesso."); await carregar(); }
    catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível atualizar o vínculo educacional."); }
    finally { setCarregando(false); }
  }

  function renderVidaAcademica() {
    if (carregandoVida) return <Card><CardContent className="p-6 text-sm text-[var(--g3-muted)]">Carregando vida acadêmica...</CardContent></Card>;
    if (!vidaAcademica) return null;
    const aluno = vidaAcademica.aluno ?? {};
    const matriculaAtual = vidaAcademica.matriculas[0] ?? {};
    const endereco = vidaAcademica.endereco ?? {};
    const responsaveis = vidaAcademica.responsaveis ?? [];
    const contatos = vidaAcademica.contatos ?? [];
    const documentosBeneficiario = vidaAcademica.documentos_beneficiario ?? [];
    const alertas = vidaAcademica.alertas ?? [];
    return <Card>
      <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Vida acadêmica 360º</CardTitle><p className="mt-1 text-sm text-[var(--g3-muted)]">{valor(aluno, "nome_completo")} · Código {valor(aluno, "codigo_beneficiario")} · Aluno #{valor(aluno, "aluno_id")}</p></div><Button type="button" variant="outline" onClick={() => setVidaAcademica(null)}>Fechar</Button></div></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="text-xs text-[var(--g3-muted)]">Matrícula atual</p><p className="font-semibold">{valor(matriculaAtual, "numero_matricula")}</p><p className="text-xs text-[var(--g3-muted)]">{valor(matriculaAtual, "situacao")}</p></div>
          <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="text-xs text-[var(--g3-muted)]">Turma e série</p><p className="font-semibold">{valor(matriculaAtual, "turma_nome", "sala_nome")}</p><p className="text-xs text-[var(--g3-muted)]">{valor(matriculaAtual, "etapa_nome")} · {valor(matriculaAtual, "serie_nome")}</p></div>
          <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="text-xs text-[var(--g3-muted)]">Frequência geral</p><p className="font-semibold">{String(vidaAcademica.frequencia.percentual ?? 0)}%</p><p className="text-xs text-[var(--g3-muted)]">{valor(vidaAcademica.frequencia, "presencas")} presença(s) de {valor(vidaAcademica.frequencia, "total")}</p></div>
          <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="text-xs text-[var(--g3-muted)]">Registros</p><p className="font-semibold">{vidaAcademica.notas.length} nota(s)</p><p className="text-xs text-[var(--g3-muted)]">{vidaAcademica.ocorrencias.length} ocorrência(s) · {vidaAcademica.documentos.length} documento(s)</p></div>
        </div>
        {alertas.length ? <div className="grid gap-2 md:grid-cols-2">{alertas.map((alerta) => <div key={`${alerta.tipo}-${alerta.mensagem}`} className={`rounded-md border p-3 text-sm ${alerta.severidade === "Crítica" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><strong>{alerta.severidade} · {alerta.tipo}</strong><p>{alerta.mensagem}</p></div>)}</div> : null}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-[var(--g3-border)] p-3 text-sm"><h3 className="mb-2 font-semibold">Identificação e contato</h3><p>{valor(aluno, "nome_completo")}</p><p className="text-[var(--g3-muted)]">Nascimento: {valor(aluno, "data_nascimento")} · CPF: {valor(aluno, "cpf")}</p><p className="text-[var(--g3-muted)]">Telefone: {valor(contatos[0] ?? aluno, "telefone_principal")} · E-mail: {valor(contatos[0] ?? aluno, "email")}</p></div>
          <div className="rounded-md border border-[var(--g3-border)] p-3 text-sm"><h3 className="mb-2 font-semibold">Endereço</h3><p>{valor(endereco, "endereco_resumido", "logradouro")}</p><p className="text-[var(--g3-muted)]">CEP {valor(endereco, "cep")} · {valor(endereco, "complemento")}</p></div>
          <div className="rounded-md border border-[var(--g3-border)] p-3 text-sm"><h3 className="mb-2 font-semibold">Responsáveis</h3><div className="space-y-2">{responsaveis.map((item) => <div key={String(item.responsavel_beneficiario_id)}><strong>{valor(item, "nome_completo")}</strong><p className="text-xs text-[var(--g3-muted)]">{valor(item, "parentesco")} · {valor(item, "telefone_principal")} · {valor(item, "email")}</p></div>)}{!responsaveis.length ? <p className="text-[var(--g3-muted)]">Nenhum responsável vinculado no cadastro familiar.</p> : null}</div></div>
        </div>
        <div><h3 className="mb-2 text-sm font-semibold">Documentos do cadastro central</h3><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{documentosBeneficiario.map((item) => <div key={String(item.id)} className="rounded-md border border-[var(--g3-border)] p-3 text-sm"><strong>{valor(item, "nome_documento", "tipo_documento")}</strong><p className="text-xs text-[var(--g3-muted)]">{valor(item, "numero_documento")} · validade {valor(item, "validade")}</p><p className="text-xs text-[var(--g3-muted)]">{item.caminho_arquivo ? "Arquivo anexado" : "Sem arquivo anexado"}</p></div>)}{!documentosBeneficiario.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum documento do cadastro central encontrado.</p> : null}</div></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div><h3 className="mb-2 text-sm font-semibold">Matrículas e histórico</h3><div className="space-y-2">{vidaAcademica.matriculas.map((item) => <div key={String(item.id)} className="rounded-md border border-[var(--g3-border)] p-3 text-sm"><strong>{valor(item, "numero_matricula")}</strong><span className="ml-2 text-[var(--g3-muted)]">{valor(item, "ano_letivo")} · {valor(item, "unidade_nome")} · {valor(item, "situacao")}</span></div>)}{!vidaAcademica.matriculas.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhuma matrícula encontrada.</p> : null}</div></div>
          <div><h3 className="mb-2 text-sm font-semibold">Linha do tempo</h3><div className="space-y-2">{vidaAcademica.linha_tempo.map((item, index) => <div key={`${item.tipo}-${index}`} className="rounded-md border border-[var(--g3-border)] p-3 text-sm"><strong>{item.tipo}</strong><span className="ml-2 text-[var(--g3-muted)]">{String(item.data ?? "---")}</span><p>{String(item.descricao ?? "Registro acadêmico")}</p></div>)}{!vidaAcademica.linha_tempo.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum evento acadêmico registrado.</p> : null}</div></div>
        </div>
      </CardContent>
    </Card>;
  }
  return <div className="space-y-4">
    <Card>
      <CardHeader><CardTitle>{titulo}</CardTitle>{subtitulo ? <p className="text-sm text-[var(--g3-muted)]">{subtitulo}</p> : null}</CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select value={filtros.instituicao_id} onChange={(event) => atualizar("instituicao_id", event.target.value)}><option value="">Todas as instituições</option>{unidades.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select>
          <Select value={filtros.ano_letivo_id} onChange={(event) => atualizar("ano_letivo_id", event.target.value)}><option value="">Todos os anos letivos</option>{anos.map((item) => <option key={item.id} value={item.id}>{String(item.ano ?? item.descricao ?? item.id)}</option>)}</Select>
          <Select value={filtros.sala_id} onChange={(event) => atualizar("sala_id", event.target.value)} disabled={!filtros.instituicao_id}><option value="">Todas as salas</option>{salas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select>
          <Select value={filtros.situacao} onChange={(event) => atualizar("situacao", event.target.value)}><option value="">Todas as situações</option><option value="ATIVA">Ativa</option><option value="PENDENTE">Pendente</option><option value="TRANSFERIDA">Transferida</option><option value="ENCERRADA">Encerrada</option></Select>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-[240px] flex-1 gap-2"><Input value={filtros.busca} onChange={(event) => atualizar("busca", event.target.value)} placeholder="Nome, CPF, matrícula, responsável ou telefone" onKeyDown={(event) => { if (event.key === "Enter") void carregar(); }} /><Button type="button" onClick={() => void carregar()} disabled={carregando}><Search className="mr-2 h-4 w-4" />Buscar</Button></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filtros.sem_sala} onChange={(event) => atualizar("sem_sala", event.target.checked)} />Alunos sem sala</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filtros.sem_instituicao} onChange={(event) => atualizar("sem_instituicao", event.target.checked)} />Alunos sem instituição</label>
          <Button type="button" variant="outline" onClick={() => { setFiltros({ instituicao_id: "", ano_letivo_id: "", sala_id: "", busca: "", situacao: "", sem_sala: false, sem_instituicao: false }); setTimeout(() => void carregar(), 0); }}>Limpar filtros</Button>
        </div>
      </CardContent>
    </Card>
    {mensagem ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{mensagem}</p> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {[["Instituições", dados?.indicadores.instituicoes ?? 0], ["Salas/turmas", dados?.indicadores.salas ?? 0], ["Alunos", dados?.indicadores.alunos ?? 0], ["Alunos ativos", dados?.indicadores.alunos_ativos ?? 0], ["Sem sala", dados?.indicadores.alunos_sem_sala ?? 0], ["Sem instituição", dados?.indicadores.alunos_sem_instituicao ?? 0]].map(([titulo, quantidade]) => <Card key={String(titulo)}><CardContent className="p-4"><p className="text-xs text-[var(--g3-muted)]">{titulo}</p><p className="mt-1 text-2xl font-semibold">{carregando ? "…" : quantidade}</p></CardContent></Card>)}
    </div>
    {carregando ? <Card><CardContent className="p-6 text-sm text-[var(--g3-muted)]">Carregando alunos agrupados...</CardContent></Card> : null}
    {!carregando && !dados?.grupos.length ? <Card><CardContent className="p-6 text-sm text-[var(--g3-muted)]">Nenhum aluno encontrado para os filtros informados.</CardContent></Card> : null}
    {edicao ? <Card><CardHeader><CardTitle>Editar vínculo educacional</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid gap-3 md:grid-cols-2"><Select value={edicao.instituicaoId} onChange={(event) => setEdicao((atual) => atual ? { ...atual, instituicaoId: event.target.value, salaId: "", turmaId: "" } : atual)}><option value="">Instituição</option>{unidades.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select><Select value={edicao.salaId} onChange={(event) => setEdicao((atual) => atual ? { ...atual, salaId: event.target.value } : atual)} disabled={!edicao.instituicaoId}><option value="">Sala</option>{(unidades.find((item) => item.id === edicao.instituicaoId)?.salas ?? []).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select><Input type="date" value={edicao.data} onChange={(event) => setEdicao((atual) => atual ? { ...atual, data: event.target.value } : atual)} /><Input value={edicao.motivo} onChange={(event) => setEdicao((atual) => atual ? { ...atual, motivo: event.target.value } : atual)} placeholder="Motivo da alteração" /><Input value={edicao.observacoes} onChange={(event) => setEdicao((atual) => atual ? { ...atual, observacoes: event.target.value } : atual)} placeholder="Observações (opcional)" /></div><div className="flex gap-2"><Button type="button" onClick={() => void salvarEdicao()} disabled={carregando}>Salvar vínculo</Button><Button type="button" variant="outline" onClick={() => setEdicao(null)}>Cancelar</Button></div></CardContent></Card> : null}
    {renderVidaAcademica()}
    <div className="space-y-3">{dados?.grupos.map((grupo) => { const chaveInstituicao = String(grupo.instituicao.id ?? "sem-instituicao"); const aberto = abertos[chaveInstituicao] ?? true; return <Card key={chaveInstituicao}>
      <CardHeader><button type="button" className="flex w-full items-center justify-between text-left" onClick={() => alternar(chaveInstituicao)}><span className="flex items-center gap-2">{aberto ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}<span><span className="block text-base font-semibold">{grupo.instituicao.nome}</span><span className="block text-xs font-normal text-[var(--g3-muted)]">{grupo.instituicao.cnpj ? `CNPJ ${grupo.instituicao.cnpj} · ` : ""}{grupo.instituicao.salas} sala(s) · {grupo.instituicao.alunos_ativos} aluno(s) ativo(s)</span></span></span><span className="rounded-full bg-[var(--g3-primary-soft)] px-3 py-1 text-xs"><UsersRound className="mr-1 inline h-3.5 w-3.5" />{grupo.instituicao.alunos_ativos + grupo.instituicao.alunos_inativos}</span></button></CardHeader>
      {aberto ? <CardContent className="space-y-3">{grupo.salas.map((sala) => { const chaveSala = `${chaveInstituicao}-${String(sala.id ?? "sem-sala")}`; const salaAberta = abertos[chaveSala] ?? true; return <div key={chaveSala} className="rounded-lg border border-[var(--g3-border)]"><button type="button" className="flex w-full items-center justify-between gap-3 p-3 text-left" onClick={() => alternar(chaveSala)}><span className="flex items-center gap-2">{salaAberta ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}<span><strong>{sala.nome}</strong><span className="ml-2 text-xs text-[var(--g3-muted)]">{[sala.turma_nome, sala.etapa_nome, sala.serie_nome, sala.turno].filter(Boolean).join(" · ") || "Dados acadêmicos não informados"}</span></span></span><span className="text-xs text-[var(--g3-muted)]">{sala.alunos.length} aluno(s) · {sala.vagas_disponiveis === null ? "capacidade não configurada" : `${sala.vagas_disponiveis} vaga(s)`}</span></button>{salaAberta ? <div className="overflow-x-auto border-t border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)]"><tr><th className="px-3 py-2 text-left">Aluno</th><th className="px-3 py-2 text-left">Matrícula</th><th className="px-3 py-2 text-left">Nascimento</th><th className="px-3 py-2 text-left">Responsável</th><th className="px-3 py-2 text-left">Situação</th><th className="px-3 py-2 text-left">Ações</th></tr></thead><tbody>{sala.alunos.map((aluno) => <tr key={String(aluno.aluno_id)} className="border-t border-[var(--g3-border)]"><td className="px-3 py-2 font-medium">{valor(aluno, "nome_completo")}</td><td className="px-3 py-2">{valor(aluno, "numero_matricula")}</td><td className="px-3 py-2">{valor(aluno, "data_nascimento")} · {idade(aluno.data_nascimento)}</td><td className="px-3 py-2">{valor(aluno, "nome_mae")} · {valor(aluno, "telefone_principal")}</td><td className="px-3 py-2">{valor(aluno, "situacao", "aluno_status")}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => void abrirVidaAcademica(aluno)}>Vida acadêmica</Button><Button type="button" size="sm" variant="outline" onClick={() => iniciarEdicao(aluno)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar vínculo</Button></div></td></tr>)}</tbody></table></div> : null}</div>; })}</CardContent> : null}
    </Card>; })}</div>
  </div>;
}
