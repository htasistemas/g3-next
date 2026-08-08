import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { educacionalService, type ChamadaRapidaResponse, type EducacionalRecurso } from "@/services/educacional.service";
import type { EducacionalItem } from "@/types/educacional";

type AbaDiario = "diarios" | "frequencias";
const situacoes = [
  { value: "PRESENTE", label: "Presente" },
  { value: "AUSENTE", label: "Falta" },
  { value: "JUSTIFICADO", label: "Falta justificada" },
  { value: "ATRASO", label: "Atraso" },
  { value: "SAIDA_ANTECIPADA", label: "Saída antecipada" }
];

function nome(item: EducacionalItem | Record<string, unknown>, ...chaves: string[]) {
  for (const chave of chaves) {
    const valor = item[chave];
    if (valor !== null && valor !== undefined && String(valor).trim()) return String(valor);
  }
  return `Registro #${String(item.id ?? "")}`;
}

export function EducacionalDiarioPage({ recurso }: { recurso: AbaDiario }) {
  const location = useLocation();
  const diarioParametro = useMemo(() => new URLSearchParams(location.search).get("diario_aula_id") ?? "", [location.search]);
  const [listas, setListas] = useState<Record<string, EducacionalItem[]>>({});
  const [formulario, setFormulario] = useState({ turma_id: "", disciplina_id: "", data_aula: new Date().toISOString().slice(0, 10), conteudo: "", objetivos: "", atividades: "", observacoes: "", diario_aula_id: "" });
  const [chamada, setChamada] = useState<ChamadaRapidaResponse | null>(null);
  const [registros, setRegistros] = useState<Record<string, { situacao: string; justificativa: string; observacao: string }>>({});
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const alterar = (campo: keyof typeof formulario, valor: string) => setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  const opcoes = (itens: EducacionalItem[] | undefined, chaves: string[]) => (itens ?? []).map((item) => <option key={item.id} value={item.id}>{nome(item, ...chaves)}</option>);

  const resumoChamada = useMemo(() => {
    const valores = Object.values(registros);
    return {
      total: valores.length,
      presentes: valores.filter((item) => item.situacao === "PRESENTE").length,
      faltas: valores.filter((item) => item.situacao === "AUSENTE").length,
      justificadas: valores.filter((item) => item.situacao === "JUSTIFICADO").length
    };
  }, [registros]);

  const carregar = async () => {
    setCarregando(true);
    try {
      const recursos: EducacionalRecurso[] = recurso === "diarios" ? ["diarios", "turmas", "disciplinas"] : ["diarios"];
      const respostas = await Promise.all(recursos.map((item) => educacionalService.listar(item)));
      setListas(Object.fromEntries(recursos.map((item, index) => [item, respostas[index]])));
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível carregar o diário.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    setChamada(null);
    setRegistros({});
    setFormulario((atual) => ({ ...atual, diario_aula_id: "" }));
    void carregar().then(() => {
      if (recurso === "frequencias" && diarioParametro) void carregarChamada(diarioParametro);
    });
  }, [recurso, diarioParametro]);

  async function salvarDiario(event: FormEvent) {
    event.preventDefault();
    if (!formulario.turma_id || !formulario.disciplina_id || !formulario.data_aula || !formulario.conteudo.trim()) {
      setMensagem("Preencha turma, componente curricular, data e conteúdo ministrado.");
      return;
    }
    setCarregando(true);
    try {
      const aula = await educacionalService.salvar("diarios", {
        turma_id: Number(formulario.turma_id),
        disciplina_id: Number(formulario.disciplina_id),
        data_aula: formulario.data_aula,
        conteudo: formulario.conteudo,
        objetivos: formulario.objetivos.trim() || null,
        atividades: formulario.atividades.trim() || null,
        observacoes: formulario.observacoes.trim() || null,
        status: "FINALIZADO"
      });
      setFormulario((atual) => ({ ...atual, conteudo: "", objetivos: "", atividades: "", observacoes: "", diario_aula_id: String(aula.id) }));
      setMensagem("Aula registrada no diário. A chamada foi aberta para lançamento.");
      await carregar();
      await carregarChamada(String(aula.id));
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível salvar o registro.");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarChamada(diarioId: string) {
    alterar("diario_aula_id", diarioId);
    setChamada(null);
    setRegistros({});
    if (!diarioId) return;
    setCarregando(true);
    try {
      const dados = await educacionalService.obterChamadaRapida(diarioId);
      setChamada(dados);
      setRegistros(Object.fromEntries(dados.alunos.map((aluno) => [
        String(aluno.matricula_id),
        {
          situacao: String(aluno.situacao ?? "PRESENTE"),
          justificativa: String(aluno.justificativa ?? ""),
          observacao: String(aluno.observacao ?? "")
        }
      ])));
      setMensagem("");
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível carregar a chamada da aula.");
    } finally {
      setCarregando(false);
    }
  }

  function alterarRegistro(matriculaId: string, campo: "situacao" | "justificativa" | "observacao", valor: string) {
    setRegistros((atual) => ({ ...atual, [matriculaId]: { ...(atual[matriculaId] ?? { situacao: "PRESENTE", justificativa: "", observacao: "" }), [campo]: valor } }));
  }

  function marcarTodosComoPresentes() {
    setRegistros((atual) => Object.fromEntries(Object.entries(atual).map(([matriculaId, item]) => [matriculaId, { ...item, situacao: "PRESENTE" }])));
  }

  async function salvarChamada() {
    if (!formulario.diario_aula_id || !chamada?.alunos.length) {
      setMensagem("Selecione uma aula com alunos para salvar a chamada.");
      return;
    }
    setCarregando(true);
    try {
      const payload = chamada.alunos.map((aluno) => {
        const matriculaId = String(aluno.matricula_id);
        const registro = registros[matriculaId] ?? { situacao: "PRESENTE", justificativa: "", observacao: "" };
        return {
          matricula_id: Number(matriculaId),
          situacao: registro.situacao,
          justificativa: registro.justificativa.trim() || null,
          observacao: registro.observacao.trim() || null
        };
      });
      const resultado = await educacionalService.salvarChamadaRapida(formulario.diario_aula_id, payload);
      setMensagem(`Chamada salva com ${resultado.total} aluno(s).`);
      await carregarChamada(formulario.diario_aula_id);
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível salvar a chamada.");
    } finally {
      setCarregando(false);
    }
  }

  const itens = listas[recurso] ?? [];

  if (recurso === "diarios") {
    return <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <Card>
        <CardHeader><CardTitle>Diário de classe</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={salvarDiario}>
            <Select value={formulario.turma_id} onChange={(event) => alterar("turma_id", event.target.value)}><option value="">Turma</option>{opcoes(listas.turmas, ["nome"])}</Select>
            <Select value={formulario.disciplina_id} onChange={(event) => alterar("disciplina_id", event.target.value)}><option value="">Componente curricular</option>{opcoes(listas.disciplinas, ["nome"])}</Select>
            <Input type="date" value={formulario.data_aula} onChange={(event) => alterar("data_aula", event.target.value)} />
            <textarea className="min-h-32 w-full rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-3 text-sm" value={formulario.conteudo} onChange={(event) => alterar("conteudo", event.target.value)} placeholder="Conteúdo ministrado" />
            <textarea className="min-h-24 w-full rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-3 text-sm" value={formulario.objetivos} onChange={(event) => alterar("objetivos", event.target.value)} placeholder="Objetivos da aula (opcional)" title="Informe o que os alunos devem compreender ou desenvolver nesta aula." />
            <textarea className="min-h-24 w-full rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-3 text-sm" value={formulario.atividades} onChange={(event) => alterar("atividades", event.target.value)} placeholder="Atividades realizadas (opcional)" title="Registre atividades, exercícios, projetos ou práticas realizadas na aula." />
            <textarea className="min-h-20 w-full rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-3 text-sm" value={formulario.observacoes} onChange={(event) => alterar("observacoes", event.target.value)} placeholder="Observações da aula (opcional)" title="Registre informações pedagógicas ou administrativas importantes sobre a aula." />
            <Button type="submit" disabled={carregando}>{carregando ? "Salvando..." : "Salvar aula e abrir chamada"}</Button>
          </form>
          {mensagem ? <p className="mt-3 text-sm text-[var(--g3-muted)]">{mensagem}</p> : null}
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Aulas registradas</CardTitle></CardHeader><CardContent className="space-y-2">{itens.map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm">{`${nome(item, "data_aula")} · Turma ${nome(item, "turma_id")} · ${nome(item, "conteudo")}`}</div>)}{!itens.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum registro encontrado.</p> : null}</CardContent></Card>
      {chamada ? <Card className="lg:col-span-2"><CardHeader><CardTitle>Chamada da aula</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm text-[var(--g3-muted)]">{nome(chamada.diario, "data_aula")} · {nome(chamada.diario, "turma_nome")} · {nome(chamada.diario, "disciplina_nome")}</div><Button type="button" variant="outline" onClick={marcarTodosComoPresentes} disabled={!chamada.alunos.length || carregando}>Marcar todos presentes</Button></div><div className="grid gap-3 sm:grid-cols-4"><div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="text-xs text-[var(--g3-muted)]">Alunos</p><p className="text-xl font-semibold">{resumoChamada.total}</p></div><div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="text-xs text-[var(--g3-muted)]">Presentes</p><p className="text-xl font-semibold">{resumoChamada.presentes}</p></div><div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="text-xs text-[var(--g3-muted)]">Faltas</p><p className="text-xl font-semibold">{resumoChamada.faltas}</p></div><div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="text-xs text-[var(--g3-muted)]">Justificadas</p><p className="text-xl font-semibold">{resumoChamada.justificadas}</p></div></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)]"><tr><th className="px-3 py-2 text-left">Aluno</th><th className="px-3 py-2 text-left">Matrícula</th><th className="px-3 py-2 text-left">Situação</th><th className="px-3 py-2 text-left">Justificativa/observação</th></tr></thead><tbody>{chamada.alunos.map((aluno) => { const matriculaId = String(aluno.matricula_id); const registro = registros[matriculaId] ?? { situacao: "PRESENTE", justificativa: "", observacao: "" }; return <tr key={matriculaId} className="border-t border-[var(--g3-border)]"><td className="px-3 py-2 font-medium">{nome(aluno, "nome_completo")}</td><td className="px-3 py-2">{nome(aluno, "numero_matricula")}</td><td className="px-3 py-2"><Select value={registro.situacao} onChange={(event) => alterarRegistro(matriculaId, "situacao", event.target.value)}>{situacoes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></td><td className="px-3 py-2"><Input value={registro.situacao === "JUSTIFICADO" ? registro.justificativa : registro.observacao} onChange={(event) => alterarRegistro(matriculaId, registro.situacao === "JUSTIFICADO" ? "justificativa" : "observacao", event.target.value)} placeholder={registro.situacao === "JUSTIFICADO" ? "Justificativa da falta" : "Observação opcional"} /></td></tr>; })}</tbody></table></div>{!chamada.alunos.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum aluno ativo encontrado para a turma desta aula.</p> : null}<Button type="button" onClick={() => void salvarChamada()} disabled={carregando || !chamada.alunos.length}>{carregando ? "Salvando..." : "Salvar chamada"}</Button></CardContent></Card> : null}
    </div>;
  }

  return <div className="space-y-4">
    <Card>
      <CardHeader><CardTitle>Chamada rápida</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Select value={formulario.diario_aula_id} onChange={(event) => void carregarChamada(event.target.value)}><option value="">Selecione a aula</option>{opcoes(listas.diarios, ["data_aula", "id"])}</Select>
          <Button type="button" variant="outline" onClick={marcarTodosComoPresentes} disabled={!chamada?.alunos.length || carregando}>Marcar todos presentes</Button>
        </div>
        {chamada ? <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="text-xs text-[var(--g3-muted)]">Alunos</p><p className="text-xl font-semibold">{resumoChamada.total}</p></div>
          <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="text-xs text-[var(--g3-muted)]">Presentes</p><p className="text-xl font-semibold">{resumoChamada.presentes}</p></div>
          <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="text-xs text-[var(--g3-muted)]">Faltas</p><p className="text-xl font-semibold">{resumoChamada.faltas}</p></div>
          <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="text-xs text-[var(--g3-muted)]">Justificadas</p><p className="text-xl font-semibold">{resumoChamada.justificadas}</p></div>
        </div> : null}
        {mensagem ? <p className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-sm">{mensagem}</p> : null}
      </CardContent>
    </Card>
    {chamada ? <Card>
      <CardHeader><CardTitle>{nome(chamada.diario, "data_aula")} · {nome(chamada.diario, "turma_nome")} · {nome(chamada.diario, "disciplina_nome")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--g3-primary-soft)]"><tr><th className="px-3 py-2 text-left">Aluno</th><th className="px-3 py-2 text-left">Matrícula</th><th className="px-3 py-2 text-left">Situação</th><th className="px-3 py-2 text-left">Justificativa/observação</th></tr></thead>
            <tbody>{chamada.alunos.map((aluno) => {
              const matriculaId = String(aluno.matricula_id);
              const registro = registros[matriculaId] ?? { situacao: "PRESENTE", justificativa: "", observacao: "" };
              return <tr key={matriculaId} className="border-t border-[var(--g3-border)]">
                <td className="px-3 py-2 font-medium">{nome(aluno, "nome_completo")}</td>
                <td className="px-3 py-2">{nome(aluno, "numero_matricula")}</td>
                <td className="px-3 py-2"><Select value={registro.situacao} onChange={(event) => alterarRegistro(matriculaId, "situacao", event.target.value)}>{situacoes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></td>
                <td className="px-3 py-2"><Input value={registro.situacao === "JUSTIFICADO" ? registro.justificativa : registro.observacao} onChange={(event) => alterarRegistro(matriculaId, registro.situacao === "JUSTIFICADO" ? "justificativa" : "observacao", event.target.value)} placeholder={registro.situacao === "JUSTIFICADO" ? "Justificativa da falta" : "Observação opcional"} /></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {!chamada.alunos.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum aluno ativo encontrado para a turma desta aula.</p> : null}
        <Button type="button" onClick={() => void salvarChamada()} disabled={carregando || !chamada.alunos.length}>{carregando ? "Salvando..." : "Salvar chamada"}</Button>
      </CardContent>
    </Card> : null}
  </div>;
}
