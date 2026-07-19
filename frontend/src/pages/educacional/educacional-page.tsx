import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { BookOpenText, GraduationCap, Plus, Search, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { educacionalService, type EducacionalRecurso } from "@/services/educacional.service";
import type { BeneficiarioBusca, EducacionalItem } from "@/types/educacional";

type Aba = "visao-geral" | "estrutura" | "matriculas" | "enturmacao";

const recursos: Array<{ id: EducacionalRecurso; label: string }> = [
  { id: "anos-letivos", label: "Anos letivos" },
  { id: "etapas", label: "Etapas de ensino" },
  { id: "series", label: "Séries e anos escolares" },
  { id: "disciplinas", label: "Disciplinas" },
  { id: "turmas", label: "Turmas" }
];

function texto(item: EducacionalItem, ...chaves: string[]) {
  for (const chave of chaves) {
    const valor = item[chave];
    if (valor !== null && valor !== undefined && String(valor).trim()) return String(valor);
  }
  return "—";
}

function nomeRecurso(item: EducacionalItem, recurso: EducacionalRecurso) {
  if (recurso === "anos-letivos") return texto(item, "descricao", "ano");
  if (recurso === "disciplinas") return texto(item, "nome", "descricao");
  if (recurso === "turmas") return texto(item, "nome");
  return texto(item, "nome", "descricao");
}

export function EducacionalPage() {
  const location = useLocation();
  const [aba, setAba] = useState<Aba>(() => {
    const valor = new URLSearchParams(window.location.search).get("aba");
    return valor === "estrutura" || valor === "matriculas" || valor === "enturmacao" ? valor : "visao-geral";
  });
  const [resumo, setResumo] = useState<Record<string, number>>({});
  const [listas, setListas] = useState<Partial<Record<EducacionalRecurso, EducacionalItem[]>>>({});
  const [recurso, setRecurso] = useState<EducacionalRecurso>("anos-letivos");
  const [nome, setNome] = useState("");
  const [ano, setAno] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [beneficiarios, setBeneficiarios] = useState<BeneficiarioBusca[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<BeneficiarioBusca | null>(null);

  const carregar = async (alvos: EducacionalRecurso[] = recursos.map((item) => item.id)) => {
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
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { void carregar([ ...recursos.map((item) => item.id), "alunos", "matriculas", "enturmacoes"]); }, []);

  useEffect(() => {
    const valor = new URLSearchParams(location.search).get("aba");
    setAba(valor === "estrutura" || valor === "matriculas" || valor === "enturmacao" ? valor : "visao-geral");
  }, [location.search]);

  const itensAtuais = useMemo(() => listas[recurso] ?? [], [listas, recurso]);

  async function salvarEstrutura(event: React.FormEvent) {
    event.preventDefault();
    if (!nome.trim()) return setMensagem("Informe o nome ou descrição do cadastro.");
    setCarregando(true);
    try {
      const payload = recurso === "anos-letivos" ? { ano: Number(ano), descricao: nome, data_inicial: null, data_final: null, status: "PLANEJAMENTO" } : recurso === "disciplinas" ? { nome, descricao: nome, status: "ATIVA" } : { nome, descricao: nome, status: "ATIVA" };
      await educacionalService.salvar(recurso, payload);
      setNome(""); setAno(""); setMensagem("Cadastro salvo com sucesso.");
      await carregar([recurso]);
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível salvar o cadastro.");
    } finally { setCarregando(false); }
  }

  async function buscarBeneficiarios() {
    if (busca.trim().length < 2) return setMensagem("Informe ao menos 2 caracteres para buscar.");
    setCarregando(true);
    try { setBeneficiarios(await educacionalService.buscarBeneficiarios(busca)); }
    catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível buscar beneficiários."); }
    finally { setCarregando(false); }
  }

  async function vincular() {
    if (!alunoSelecionado) return;
    setCarregando(true);
    try { await educacionalService.vincularAluno(alunoSelecionado.id); setMensagem("Beneficiário vinculado como aluno."); setAlunoSelecionado(null); await carregar(["alunos"]); }
    catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível vincular o beneficiário."); }
    finally { setCarregando(false); }
  }


  const tabs = [
    { id: "visao-geral", label: "Visão geral", icon: BookOpenText },
    { id: "estrutura", label: "Estrutura acadêmica", icon: GraduationCap },
    { id: "matriculas", label: "Alunos e matrículas", icon: UsersRound },
    { id: "enturmacao", label: "Alunos por turma", icon: UsersRound }
  ];

  return <AdminPageLayout sectionLabel="Educacional" pageTitle="Gestão educacional" tabs={tabs} activeTab={aba} onChangeTab={(id) => setAba(id as Aba)} actions={[]}>
    {mensagem ? <div className="mb-4 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3 text-sm text-[var(--g3-foreground)]">{mensagem}</div> : null}
    {aba === "visao-geral" ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {[['Alunos ativos', 'alunos_ativos'], ['Matrículas ativas', 'matriculas_ativas'], ['Turmas ativas', 'turmas_ativas'], ['Disciplinas ativas', 'disciplinas_ativas'], ['Anos letivos abertos', 'anos_abertos']].map(([label, key]) => <Card key={key}><CardContent className="p-4"><p className="text-xs text-[var(--g3-muted)]">{label}</p><p className="mt-2 text-2xl font-bold text-[var(--g3-foreground)]">{resumo[key] ?? 0}</p></CardContent></Card>)}
    </div> : null}
    {aba === "estrutura" ? <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card><CardHeader><CardTitle>Cadastros da estrutura</CardTitle></CardHeader><CardContent className="space-y-2">{recursos.map((item) => <Button key={item.id} variant={recurso === item.id ? "default" : "outline"} className="w-full justify-start" onClick={() => setRecurso(item.id)}>{item.label}</Button>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>{recursos.find((item) => item.id === recurso)?.label}</CardTitle></CardHeader><CardContent><form className="mb-5 grid gap-3 sm:grid-cols-[1fr_160px_auto]" onSubmit={salvarEstrutura}><Input value={nome} onChange={(event) => setNome(event.target.value)} placeholder={recurso === "anos-letivos" ? "Descrição do ano letivo" : "Nome do cadastro"} /><Input value={ano} onChange={(event) => setAno(event.target.value)} type="number" placeholder={recurso === "anos-letivos" ? "Ano" : "Código opcional"} /><Button disabled={carregando}><Plus className="mr-2 h-4 w-4" />Adicionar</Button></form><div className="grid gap-2 sm:grid-cols-2">{itensAtuais.map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-3 text-sm"><strong>{nomeRecurso(item, recurso)}</strong><span className="ml-2 text-xs text-[var(--g3-muted)]">#{item.id}</span></div>)}</div>{!itensAtuais.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum cadastro encontrado.</p> : null}</CardContent></Card>
    </div> : null}
    {aba === "matriculas" ? <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Vincular beneficiário como aluno</CardTitle></CardHeader><CardContent><div className="flex gap-2"><Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Nome, CPF ou código" onKeyDown={(event) => { if (event.key === "Enter") void buscarBeneficiarios(); }} /><Button onClick={() => void buscarBeneficiarios()} disabled={carregando}><Search className="mr-2 h-4 w-4" />Buscar</Button></div><div className="mt-4 space-y-2">{beneficiarios.map((item) => <button type="button" key={item.id} onClick={() => setAlunoSelecionado(item)} className={`w-full rounded-lg border p-3 text-left text-sm ${alunoSelecionado?.id === item.id ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]" : "border-[var(--g3-border)] bg-[var(--g3-card-soft)]"}`}><strong>{item.nome}</strong><span className="ml-2 text-xs text-[var(--g3-muted)]">Código: {item.codigo ?? "—"}</span></button>)}</div>{alunoSelecionado ? <Button className="mt-4" onClick={() => void vincular()} disabled={carregando}>Vincular aluno selecionado</Button> : null}</CardContent></Card><Card><CardHeader><CardTitle>Alunos vinculados</CardTitle></CardHeader><CardContent className="space-y-2">{(listas.alunos ?? []).map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm">Aluno #{item.id} · Beneficiário #{String(item.beneficiario_id ?? "—")}</div>)}{!(listas.alunos ?? []).length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum aluno vinculado.</p> : null}</CardContent></Card></div> : null}
    {aba === "enturmacao" ? <Card><CardHeader><CardTitle>Alunos por turma</CardTitle></CardHeader><CardContent><p className="text-sm text-[var(--g3-muted)]">A fundação de matrículas e turmas está disponível. A distribuição de matrículas será concluída nesta área com validação de capacidade e ano letivo.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{(listas.turmas ?? []).map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm"><strong>{nomeRecurso(item, "turmas")}</strong><p className="text-xs text-[var(--g3-muted)]">Turma #{item.id}</p></div>)}</div></CardContent></Card> : null}
  </AdminPageLayout>;
}
