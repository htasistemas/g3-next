import { useEffect, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { educacionalService, type EducacionalRecurso } from "@/services/educacional.service";
import type { EducacionalItem } from "@/types/educacional";

type Recurso = "lista-espera" | "recuperacoes" | "resultados-finais" | "calendario";
const itens: Array<{ id: Recurso; label: string }> = [
  { id: "lista-espera", label: "Lista de espera" },
  { id: "recuperacoes", label: "Recuperações" },
  { id: "resultados-finais", label: "Resultado final" },
  { id: "calendario", label: "Calendário escolar" }
];
const texto = (item: EducacionalItem, ...chaves: string[]) => chaves.map((chave) => item[chave]).find((valor) => valor !== undefined && valor !== null && String(valor).trim())?.toString() ?? "—";

export function EducacionalFluxoAcademicoPage() {
  const [recurso, setRecurso] = useState<Recurso>("lista-espera");
  const [listas, setListas] = useState<Record<string, EducacionalItem[]>>({});
  const [formulario, setFormulario] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const alterar = (campo: string, valor: string) => setFormulario((atual) => ({ ...atual, [campo]: valor }));
  async function carregar() {
    setCarregando(true);
    try {
      const recursos: EducacionalRecurso[] = [recurso, "anos-letivos", "etapas", "series", "alunos", "matriculas", "disciplinas"];
      const respostas = await Promise.all(recursos.map((item) => educacionalService.listar(item)));
      setListas(Object.fromEntries(recursos.map((item, index) => [item, respostas[index]])));
    } catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível carregar o fluxo acadêmico."); }
    finally { setCarregando(false); }
  }
  useEffect(() => { void carregar(); }, [recurso]);
  async function salvar(event: FormEvent) {
    event.preventDefault();
    const camposObrigatorios = recurso === "lista-espera" ? ["ano_letivo_id", "etapa_id", "serie_id", "turno"] : recurso === "recuperacoes" ? ["matricula_id", "disciplina_id", "periodo", "tipo"] : recurso === "resultados-finais" ? ["matricula_id", "ano_letivo_id", "situacao"] : ["ano_letivo_id", "data_evento", "tipo", "titulo"];
    if (camposObrigatorios.some((campo) => !formulario[campo]?.trim())) { setMensagem("Preencha os campos obrigatórios antes de salvar."); return; }
    setCarregando(true);
    try {
      const payload: Record<string, unknown> = { ...formulario };
      for (const campo of ["beneficiario_id", "aluno_id", "ano_letivo_id", "unidade_id", "etapa_id", "serie_id", "matricula_id", "disciplina_id", "prioridade"]) if (payload[campo]) payload[campo] = Number(payload[campo]);
      if (recurso === "resultados-finais") { payload.media = formulario.media ? Number(formulario.media) : null; payload.frequencia = formulario.frequencia ? Number(formulario.frequencia) : null; }
      if (recurso === "recuperacoes") { payload.valor_maximo = formulario.valor_maximo ? Number(formulario.valor_maximo) : 10; payload.valor = formulario.valor ? Number(formulario.valor) : null; }
      if (recurso === "lista-espera") { payload.data_inscricao = formulario.data_inscricao || null; payload.situacao = "AGUARDANDO"; }
      if (recurso === "calendario") { payload.dia_letivo = formulario.dia_letivo === "true"; payload.status = "ATIVO"; }
      await educacionalService.salvar(recurso, payload);
      setFormulario({}); setMensagem("Registro salvo com sucesso."); await carregar();
    } catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível salvar o registro."); }
    finally { setCarregando(false); }
  }
  const opcoes = (lista: EducacionalItem[] | undefined, label: string, ...chaves: string[]) => <Select value={formulario[label] ?? ""} onChange={(event) => alterar(label, event.target.value)}><option value="">{label}</option>{(lista ?? []).map((item) => <option key={item.id} value={item.id}>{texto(item, ...chaves)}</option>)}</Select>;
  return <div className="grid gap-4 lg:grid-cols-[235px_1fr]"><Card><CardHeader><CardTitle>Gestão acadêmica</CardTitle></CardHeader><CardContent className="space-y-2">{itens.map((item, index) => <button key={item.id} type="button" onClick={() => { setRecurso(item.id); setFormulario({}); setMensagem(""); }} className={`flex min-h-10 w-full items-center gap-2 rounded-md border px-2 text-left text-xs font-medium ${recurso === item.id ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-transparent bg-[var(--g3-card-soft)]"}`}><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-emerald-800">{index + 1}</span>{item.label}</button>)}</CardContent></Card><Card><CardHeader><CardTitle>{itens.find((item) => item.id === recurso)?.label}</CardTitle></CardHeader><CardContent><form className="grid gap-3 sm:grid-cols-2" onSubmit={salvar}>{recurso === "lista-espera" ? <>{opcoes(listas["anos-letivos"], "ano_letivo_id", "ano", "descricao")}{opcoes(listas.etapas, "etapa_id", "nome")}{opcoes(listas.series, "serie_id", "nome")}<Select value={formulario.turno ?? ""} onChange={(event) => alterar("turno", event.target.value)}><option value="">Turno</option><option>Matutino</option><option>Vespertino</option><option>Integral</option><option>Noturno</option></Select><Input placeholder="ID do beneficiário (opcional)" value={formulario.beneficiario_id ?? ""} onChange={(event) => alterar("beneficiario_id", event.target.value)} /><Input placeholder="Prioridade" type="number" value={formulario.prioridade ?? "0"} onChange={(event) => alterar("prioridade", event.target.value)} /></> : null}{recurso === "recuperacoes" ? <>{opcoes(listas.matriculas, "matricula_id", "aluno_nome", "numero_matricula")}{opcoes(listas.disciplinas, "disciplina_id", "nome")}<Input placeholder="Período" value={formulario.periodo ?? ""} onChange={(event) => alterar("periodo", event.target.value)} /><Input placeholder="Tipo" value={formulario.tipo ?? ""} onChange={(event) => alterar("tipo", event.target.value)} /><Input placeholder="Valor máximo" type="number" value={formulario.valor_maximo ?? "10"} onChange={(event) => alterar("valor_maximo", event.target.value)} /><Input placeholder="Nota" type="number" value={formulario.valor ?? ""} onChange={(event) => alterar("valor", event.target.value)} /></> : null}{recurso === "resultados-finais" ? <>{opcoes(listas.matriculas, "matricula_id", "aluno_nome", "numero_matricula")}{opcoes(listas["anos-letivos"], "ano_letivo_id", "ano", "descricao")}<Input placeholder="Situação final" value={formulario.situacao ?? ""} onChange={(event) => alterar("situacao", event.target.value)} /><Input placeholder="Média" type="number" value={formulario.media ?? ""} onChange={(event) => alterar("media", event.target.value)} /><Input placeholder="Frequência (%)" type="number" value={formulario.frequencia ?? ""} onChange={(event) => alterar("frequencia", event.target.value)} /></> : null}{recurso === "calendario" ? <>{opcoes(listas["anos-letivos"], "ano_letivo_id", "ano", "descricao")}<Input placeholder="Data" type="date" value={formulario.data_evento ?? ""} onChange={(event) => alterar("data_evento", event.target.value)} /><Input placeholder="Tipo do evento" value={formulario.tipo ?? ""} onChange={(event) => alterar("tipo", event.target.value)} /><Input placeholder="Título" value={formulario.titulo ?? ""} onChange={(event) => alterar("titulo", event.target.value)} /><Select value={formulario.dia_letivo ?? "false"} onChange={(event) => alterar("dia_letivo", event.target.value)}><option value="false">Não é dia letivo</option><option value="true">É dia letivo</option></Select></> : null}<Button disabled={carregando} className="sm:col-span-2">Salvar</Button></form>{mensagem ? <p className="mt-3 text-sm text-[var(--g3-muted)]">{mensagem}</p> : null}<div className="mt-5 space-y-2">{(listas[recurso] ?? []).map((item) => <div key={item.id} className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm">{recurso === "lista-espera" ? `Prioridade ${texto(item, "prioridade")} · ${texto(item, "situacao")}` : recurso === "calendario" ? `${texto(item, "data_evento")} · ${texto(item, "titulo")}` : recurso === "resultados-finais" ? `${texto(item, "matricula_id")} · ${texto(item, "situacao")}` : `${texto(item, "periodo")} · ${texto(item, "tipo")} · ${texto(item, "valor")}`}</div>)}{!listas[recurso]?.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum registro encontrado.</p> : null}</div></CardContent></Card></div>;
}
