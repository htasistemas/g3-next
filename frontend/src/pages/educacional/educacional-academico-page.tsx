import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { educacionalService } from "@/services/educacional.service";
import type { EducacionalItem } from "@/types/educacional";

type RecursoAcademico = "grade-curricular" | "horarios";

function nome(item: EducacionalItem, ...chaves: string[]) {
  for (const chave of chaves) {
    const valor = item[chave];
    if (valor !== null && valor !== undefined && String(valor).trim()) return String(valor);
  }
  return `Registro #${item.id}`;
}

export function EducacionalAcademicoPage({ recurso }: { recurso: RecursoAcademico }) {
  const [listas, setListas] = useState<Record<string, EducacionalItem[]>>({});
  const [formulario, setFormulario] = useState({ ano_letivo_id: "", etapa_id: "", serie_id: "", disciplina_id: "", aulas_semanais: "", turma_id: "", dia_semana: "1", hora_inicio: "", hora_fim: "" });
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    try {
      const recursos = recurso === "grade-curricular" ? ["grade-curricular", "anos-letivos", "etapas", "series", "disciplinas"] : ["horarios", "turmas", "disciplinas"];
      const respostas = await Promise.all(recursos.map((item) => educacionalService.listar(item as never)));
      setListas(Object.fromEntries(recursos.map((item, index) => [item, respostas[index]])));
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível carregar os dados acadêmicos.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { void carregar(); }, [recurso]);

  const alterar = (campo: keyof typeof formulario, valor: string) => setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  const opcoes = (itens: EducacionalItem[] | undefined, chaves: string[]) => (itens ?? []).map((item) => <option key={item.id} value={item.id}>{nome(item, ...chaves)}</option>);

  async function salvar(event: FormEvent) {
    event.preventDefault();
    const obrigatorios = recurso === "grade-curricular" ? [formulario.ano_letivo_id, formulario.etapa_id, formulario.serie_id, formulario.disciplina_id, formulario.aulas_semanais] : [formulario.turma_id, formulario.disciplina_id, formulario.hora_inicio, formulario.hora_fim];
    if (obrigatorios.some((valor) => !valor)) {
      setMensagem("Preencha todos os campos obrigatórios.");
      return;
    }
    setCarregando(true);
    try {
      const payload = recurso === "grade-curricular"
        ? { ano_letivo_id: Number(formulario.ano_letivo_id), etapa_id: Number(formulario.etapa_id), serie_id: Number(formulario.serie_id), disciplina_id: Number(formulario.disciplina_id), aulas_semanais: Number(formulario.aulas_semanais), status: "ATIVA" }
        : { turma_id: Number(formulario.turma_id), disciplina_id: Number(formulario.disciplina_id), dia_semana: Number(formulario.dia_semana), hora_inicio: formulario.hora_inicio, hora_fim: formulario.hora_fim, status: "ATIVO" };
      await educacionalService.salvar(recurso, payload);
      setMensagem(recurso === "grade-curricular" ? "Componente adicionado à grade curricular." : "Horário escolar salvo com sucesso.");
      setFormulario({ ano_letivo_id: "", etapa_id: "", serie_id: "", disciplina_id: "", aulas_semanais: "", turma_id: "", dia_semana: "1", hora_inicio: "", hora_fim: "" });
      await carregar();
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível salvar o registro.");
    } finally {
      setCarregando(false);
    }
  }

  const itens = listas[recurso] ?? [];
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
    <Card><CardHeader><CardTitle>{recurso === "grade-curricular" ? "Grade curricular" : "Horários"}</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={salvar}>
      {recurso === "grade-curricular" ? <><Select value={formulario.ano_letivo_id} onChange={(event) => alterar("ano_letivo_id", event.target.value)}><option value="">Ano letivo</option>{opcoes(listas["anos-letivos"], ["ano", "descricao"])}</Select><Select value={formulario.etapa_id} onChange={(event) => alterar("etapa_id", event.target.value)}><option value="">Etapa de ensino</option>{opcoes(listas.etapas, ["nome"])}</Select><Select value={formulario.serie_id} onChange={(event) => alterar("serie_id", event.target.value)}><option value="">Série/Ano</option>{opcoes(listas.series, ["nome"])}</Select><Select value={formulario.disciplina_id} onChange={(event) => alterar("disciplina_id", event.target.value)}><option value="">Componente curricular</option>{opcoes(listas.disciplinas, ["nome"])}</Select><Input type="number" min="0" value={formulario.aulas_semanais} onChange={(event) => alterar("aulas_semanais", event.target.value)} placeholder="Aulas semanais" /></> : <><Select value={formulario.turma_id} onChange={(event) => alterar("turma_id", event.target.value)}><option value="">Turma</option>{opcoes(listas.turmas, ["nome"])}</Select><Select value={formulario.disciplina_id} onChange={(event) => alterar("disciplina_id", event.target.value)}><option value="">Componente curricular</option>{opcoes(listas.disciplinas, ["nome"])}</Select><Select value={formulario.dia_semana} onChange={(event) => alterar("dia_semana", event.target.value)}><option value="1">Segunda-feira</option><option value="2">Terça-feira</option><option value="3">Quarta-feira</option><option value="4">Quinta-feira</option><option value="5">Sexta-feira</option><option value="6">Sábado</option></Select><div className="grid grid-cols-2 gap-2"><Input type="time" value={formulario.hora_inicio} onChange={(event) => alterar("hora_inicio", event.target.value)} /><Input type="time" value={formulario.hora_fim} onChange={(event) => alterar("hora_fim", event.target.value)} /></div></>}
      <Button type="submit" disabled={carregando}>Salvar</Button>
    </form>{mensagem ? <p className="mt-3 text-sm text-[var(--g3-muted)]">{mensagem}</p> : null}</CardContent></Card>
    <Card><CardHeader><CardTitle>{recurso === "grade-curricular" ? "Componentes cadastrados" : "Horários cadastrados"}</CardTitle></CardHeader><CardContent className="space-y-2">{itens.map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm">{recurso === "grade-curricular" ? `${nome(item, "disciplina_id")} · ${nome(item, "aulas_semanais")} aulas semanais` : `${nome(item, "turma_id")} · ${nome(item, "hora_inicio")} às ${nome(item, "hora_fim")}`}</div>)}{!itens.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum registro encontrado.</p> : null}</CardContent></Card>
  </div>;
}
