import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { educacionalService, type EducacionalRecurso, type UnidadeEnsinoCatalogo } from "@/services/educacional.service";
import type { EducacionalItem } from "@/types/educacional";

type Recurso = "lista-espera" | "rematriculas" | "recuperacoes" | "resultados-finais" | "calendario" | "configuracoes";
const itens: Array<{ id: Recurso; label: string }> = [
  { id: "lista-espera", label: "Lista de espera" },
  { id: "rematriculas", label: "Rematrículas" },
  { id: "recuperacoes", label: "Recuperações" },
  { id: "resultados-finais", label: "Resultado final" },
  { id: "calendario", label: "Calendário escolar" },
  { id: "configuracoes", label: "Configurações educacionais" }
];

const texto = (item: EducacionalItem, ...chaves: string[]) => chaves.map((chave) => item[chave]).find((valor) => valor !== undefined && valor !== null && String(valor).trim())?.toString() ?? "—";

export function EducacionalFluxoAcademicoPage() {
  const [recurso, setRecurso] = useState<Recurso>("lista-espera");
  const [listas, setListas] = useState<Record<string, EducacionalItem[]>>({});
  const [unidades, setUnidades] = useState<UnidadeEnsinoCatalogo[]>([]);
  const [formulario, setFormulario] = useState<Record<string, string>>({});
  const [matriculasSelecionadas, setMatriculasSelecionadas] = useState<string[]>([]);
  const [sugestoesRecuperacao, setSugestoesRecuperacao] = useState<EducacionalItem[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const salas = useMemo(() => unidades.find((item) => item.id === formulario.unidade_id)?.salas ?? [], [formulario.unidade_id, unidades]);
  const alterar = (campo: string, valor: string) => setFormulario((atual) => ({ ...atual, [campo]: valor, ...(campo === "unidade_id" ? { sala_id: "" } : {}) }));
  const alternarMatricula = (id: string) => setMatriculasSelecionadas((atuais) => atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]);

  async function carregarSugestoesRecuperacao() {
    if (!formulario.ano_letivo_id) {
      setMensagem("Selecione o ano letivo para sugerir recuperações.");
      return;
    }
    setCarregando(true);
    try {
      const resposta = await educacionalService.sugerirRecuperacoes({
        ano_letivo_id: Number(formulario.ano_letivo_id),
        periodo: formulario.periodo || undefined,
        disciplina_id: formulario.disciplina_id ? Number(formulario.disciplina_id) : undefined,
        media_minima: formulario.media_minima ? Number(formulario.media_minima) : 6
      });
      setSugestoesRecuperacao(resposta.itens);
      setMensagem(`${resposta.total} aluno(s) encontrado(s) abaixo da média mínima.`);
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível sugerir recuperações.");
    } finally {
      setCarregando(false);
    }
  }

  async function criarRecuperacaoSugerida(item: EducacionalItem) {
    setCarregando(true);
    try {
      await educacionalService.salvar("recuperacoes", {
        matricula_id: Number(item.matricula_id),
        disciplina_id: Number(item.disciplina_id),
        periodo: String(item.periodo ?? formulario.periodo ?? "Período"),
        tipo: "Recuperação sugerida",
        valor_maximo: 10,
        valor: null,
        resultado: `Média atual ${texto(item, "media_atual")} abaixo da mínima ${texto(item, "media_minima")}`,
        status: "ABERTA"
      });
      setSugestoesRecuperacao((atuais) => atuais.filter((sugestao) => String(sugestao.matricula_id) !== String(item.matricula_id) || String(sugestao.disciplina_id) !== String(item.disciplina_id)));
      setMensagem("Recuperação aberta para o aluno selecionado.");
      await carregar();
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível criar a recuperação sugerida.");
    } finally {
      setCarregando(false);
    }
  }

  async function carregar() {
    setCarregando(true);
    try {
      const recursoLista: EducacionalRecurso = recurso === "rematriculas" ? "matriculas" : recurso;
      const recursos: EducacionalRecurso[] = [recursoLista, "anos-letivos", "etapas", "series", "alunos", "matriculas", "disciplinas", "turmas"];
      const respostas = await Promise.all(recursos.map((item) => educacionalService.listar(item)));
      setListas(Object.fromEntries(recursos.map((item, index) => [item, respostas[index]])));
      if (recurso === "rematriculas") setUnidades(await educacionalService.listarUnidadesEnsino());
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível carregar o fluxo acadêmico.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { void carregar(); }, [recurso]);

  async function salvar(event: FormEvent) {
    event.preventDefault();
    const idsRematricula = recurso === "rematriculas"
      ? (matriculasSelecionadas.length ? matriculasSelecionadas : formulario.matricula_id ? [formulario.matricula_id] : [])
      : [];
    const camposObrigatorios = recurso === "lista-espera"
      ? ["ano_letivo_id", "etapa_id", "serie_id", "turno"]
      : recurso === "rematriculas"
        ? ["ano_letivo_id", "unidade_id", "sala_id", "etapa_id", "serie_id", "data_inicio", "motivo"]
        : recurso === "recuperacoes"
          ? ["matricula_id", "disciplina_id", "periodo", "tipo"]
          : recurso === "resultados-finais"
            ? ["matricula_id", "ano_letivo_id", "situacao"]
            : recurso === "configuracoes"
              ? ["chave", "valor"]
              : ["ano_letivo_id", "data_evento", "tipo", "titulo"];
    if (camposObrigatorios.some((campo) => !formulario[campo]?.trim()) || (recurso === "rematriculas" && !idsRematricula.length)) {
      setMensagem("Preencha os campos obrigatórios antes de salvar.");
      return;
    }

    setCarregando(true);
    try {
      const payload: Record<string, unknown> = { ...formulario };
      for (const campo of ["beneficiario_id", "aluno_id", "ano_letivo_id", "unidade_id", "sala_id", "etapa_id", "serie_id", "matricula_id", "disciplina_id", "turma_id", "prioridade"]) {
        if (payload[campo]) payload[campo] = Number(payload[campo]);
      }
      if (recurso === "rematriculas") {
        delete payload.matricula_id;
        if (idsRematricula.length > 1) {
          const resultado = await educacionalService.rematricularLote({ ...payload, matriculas_ids: idsRematricula.map(Number) });
          setFormulario({});
          setMatriculasSelecionadas([]);
          setMensagem(`${resultado.criadas.length} rematrícula(s) criada(s). ${resultado.recusadas.length ? `${resultado.recusadas.length} não foram criadas por regra de validação.` : ""}`.trim());
          await carregar();
          return;
        }
        await educacionalService.rematricular(idsRematricula[0], payload);
        setFormulario({});
        setMatriculasSelecionadas([]);
        setMensagem("Rematrícula criada preservando a matrícula anterior no histórico.");
        await carregar();
        return;
      }
      if (recurso === "resultados-finais") {
        payload.media = formulario.media ? Number(formulario.media) : null;
        payload.frequencia = formulario.frequencia ? Number(formulario.frequencia) : null;
      }
      if (recurso === "recuperacoes") {
        payload.valor_maximo = formulario.valor_maximo ? Number(formulario.valor_maximo) : 10;
        payload.valor = formulario.valor ? Number(formulario.valor) : null;
      }
      if (recurso === "lista-espera") {
        payload.data_inscricao = formulario.data_inscricao || null;
        payload.situacao = "AGUARDANDO";
      }
      if (recurso === "calendario") {
        payload.dia_letivo = formulario.dia_letivo === "true";
        payload.status = "ATIVO";
      }
      if (recurso === "configuracoes") {
        payload.ativo = formulario.ativo !== "false";
      }
      await educacionalService.salvar(recurso, payload);
      setFormulario({});
      setMensagem("Registro salvo com sucesso.");
      await carregar();
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível salvar o registro.");
    } finally {
      setCarregando(false);
    }
  }

  const opcoes = (lista: EducacionalItem[] | undefined, label: string, ...chaves: string[]) => <Select value={formulario[label] ?? ""} onChange={(event) => alterar(label, event.target.value)}><option value="">{label}</option>{(lista ?? []).map((item) => <option key={item.id} value={item.id}>{texto(item, ...chaves)}</option>)}</Select>;
  const registros = listas[recurso === "rematriculas" ? "matriculas" : recurso] ?? [];

  return <div className="grid gap-4 lg:grid-cols-[235px_1fr]">
    <Card>
      <CardHeader><CardTitle>Gestão acadêmica</CardTitle></CardHeader>
      <CardContent className="space-y-2">{itens.map((item, index) => <button key={item.id} type="button" onClick={() => { setRecurso(item.id); setFormulario({}); setMatriculasSelecionadas([]); setSugestoesRecuperacao([]); setMensagem(""); }} className={`flex min-h-10 w-full items-center gap-2 rounded-md border px-2 text-left text-xs font-medium ${recurso === item.id ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-transparent bg-[var(--g3-card-soft)]"}`}><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-emerald-800">{index + 1}</span>{item.label}</button>)}</CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>{itens.find((item) => item.id === recurso)?.label}</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={salvar}>
          {recurso === "lista-espera" ? <>
            {opcoes(listas["anos-letivos"], "ano_letivo_id", "ano", "descricao")}
            {opcoes(listas.etapas, "etapa_id", "nome")}
            {opcoes(listas.series, "serie_id", "nome")}
            <Select value={formulario.turno ?? ""} onChange={(event) => alterar("turno", event.target.value)}><option value="">Turno</option><option>Matutino</option><option>Vespertino</option><option>Integral</option><option>Noturno</option></Select>
            <Input placeholder="ID do beneficiário (opcional)" value={formulario.beneficiario_id ?? ""} onChange={(event) => alterar("beneficiario_id", event.target.value)} />
            <Input placeholder="Prioridade" type="number" value={formulario.prioridade ?? "0"} onChange={(event) => alterar("prioridade", event.target.value)} />
          </> : null}
          {recurso === "rematriculas" ? <>
            {opcoes(listas.matriculas, "matricula_id", "aluno_nome", "numero_matricula")}
            <div className="max-h-44 overflow-auto rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-2 text-sm sm:col-span-2">
              <p className="mb-2 text-xs font-semibold text-[var(--g3-muted)]">Selecione várias matrículas para rematricular em lote</p>
              <div className="grid gap-2 sm:grid-cols-2">{(listas.matriculas ?? []).map((item) => {
                const id = String(item.id);
                return <label key={id} className="flex items-center gap-2 rounded-md bg-[var(--g3-card)] px-2 py-2">
                  <input type="checkbox" checked={matriculasSelecionadas.includes(id)} onChange={() => alternarMatricula(id)} />
                  <span>{texto(item, "aluno_nome", "aluno_id")} · Matrícula {texto(item, "numero_matricula")}</span>
                </label>;
              })}</div>
            </div>
            {opcoes(listas["anos-letivos"], "ano_letivo_id", "ano", "descricao")}
            <Select value={formulario.unidade_id ?? ""} onChange={(event) => alterar("unidade_id", event.target.value)}><option value="">Unidade de ensino</option>{unidades.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select>
            <Select value={formulario.sala_id ?? ""} onChange={(event) => alterar("sala_id", event.target.value)} disabled={!formulario.unidade_id}><option value="">Sala</option>{salas.map((item) => <option key={item.id} value={item.id} disabled={item.lotada}>{item.nome} — {item.disponiveis === null ? "capacidade não configurada" : `${item.disponiveis} vaga(s)`}</option>)}</Select>
            {opcoes(listas.etapas, "etapa_id", "nome")}
            {opcoes(listas.series, "serie_id", "nome")}
            {opcoes(listas.turmas, "turma_id", "nome")}
            <Input placeholder="Número da matrícula (opcional)" value={formulario.numero_matricula ?? ""} onChange={(event) => alterar("numero_matricula", event.target.value)} />
            <Input type="date" value={formulario.data_inicio ?? new Date().toISOString().slice(0, 10)} onChange={(event) => alterar("data_inicio", event.target.value)} />
            <Input placeholder="Motivo da rematrícula" value={formulario.motivo ?? ""} onChange={(event) => alterar("motivo", event.target.value)} />
            <Input placeholder="Observações (opcional)" value={formulario.observacoes ?? ""} onChange={(event) => alterar("observacoes", event.target.value)} />
          </> : null}
          {recurso === "recuperacoes" ? <>
            {opcoes(listas["anos-letivos"], "ano_letivo_id", "ano", "descricao")}
            {opcoes(listas.matriculas, "matricula_id", "aluno_nome", "numero_matricula")}
            {opcoes(listas.disciplinas, "disciplina_id", "nome")}
            <Input placeholder="Período" value={formulario.periodo ?? ""} onChange={(event) => alterar("periodo", event.target.value)} />
            <Input placeholder="Tipo" value={formulario.tipo ?? ""} onChange={(event) => alterar("tipo", event.target.value)} />
            <Input placeholder="Média mínima" type="number" value={formulario.media_minima ?? "6"} onChange={(event) => alterar("media_minima", event.target.value)} />
            <Input placeholder="Valor máximo" type="number" value={formulario.valor_maximo ?? "10"} onChange={(event) => alterar("valor_maximo", event.target.value)} />
            <Input placeholder="Nota" type="number" value={formulario.valor ?? ""} onChange={(event) => alterar("valor", event.target.value)} />
            <Button type="button" variant="outline" disabled={carregando} onClick={() => void carregarSugestoesRecuperacao()}>Sugerir recuperações</Button>
          </> : null}
          {recurso === "resultados-finais" ? <>
            {opcoes(listas.matriculas, "matricula_id", "aluno_nome", "numero_matricula")}
            {opcoes(listas["anos-letivos"], "ano_letivo_id", "ano", "descricao")}
            <Input placeholder="Situação final" value={formulario.situacao ?? ""} onChange={(event) => alterar("situacao", event.target.value)} />
            <Input placeholder="Média" type="number" value={formulario.media ?? ""} onChange={(event) => alterar("media", event.target.value)} />
            <Input placeholder="Frequência (%)" type="number" value={formulario.frequencia ?? ""} onChange={(event) => alterar("frequencia", event.target.value)} />
          </> : null}
          {recurso === "calendario" ? <>
            {opcoes(listas["anos-letivos"], "ano_letivo_id", "ano", "descricao")}
            <Input placeholder="Data" type="date" value={formulario.data_evento ?? ""} onChange={(event) => alterar("data_evento", event.target.value)} />
            <Input placeholder="Tipo do evento" value={formulario.tipo ?? ""} onChange={(event) => alterar("tipo", event.target.value)} />
            <Input placeholder="Título" value={formulario.titulo ?? ""} onChange={(event) => alterar("titulo", event.target.value)} />
            <Select value={formulario.dia_letivo ?? "false"} onChange={(event) => alterar("dia_letivo", event.target.value)}><option value="false">Não é dia letivo</option><option value="true">É dia letivo</option></Select>
          </> : null}
          {recurso === "configuracoes" ? <>
            <Select value={formulario.chave ?? ""} onChange={(event) => alterar("chave", event.target.value)}><option value="">Configuração</option><option value="media_minima">Média mínima</option><option value="frequencia_minima">Frequência mínima (%)</option><option value="periodos_avaliativos">Períodos avaliativos</option><option value="capacidade_padrao_turma">Capacidade padrão de turma</option></Select>
            <Input placeholder="Valor" value={formulario.valor ?? ""} onChange={(event) => alterar("valor", event.target.value)} title="Informe o valor da configuração para a instituição atual." />
            <Input placeholder="Descrição (opcional)" value={formulario.descricao ?? ""} onChange={(event) => alterar("descricao", event.target.value)} />
            <Select value={formulario.ativo ?? "true"} onChange={(event) => alterar("ativo", event.target.value)}><option value="true">Ativa</option><option value="false">Inativa</option></Select>
          </> : null}
          <Button type="submit" disabled={carregando} className="sm:col-span-2">{recurso === "rematriculas" ? matriculasSelecionadas.length > 1 ? `Criar ${matriculasSelecionadas.length} rematrículas` : "Criar rematrícula" : "Salvar"}</Button>
        </form>
        {mensagem ? <p className="mt-3 text-sm text-[var(--g3-muted)]">{mensagem}</p> : null}
        {recurso === "recuperacoes" && sugestoesRecuperacao.length ? <div className="mt-5 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><p className="mb-3 text-sm font-semibold">Sugestões de recuperação</p><div className="space-y-2">{sugestoesRecuperacao.map((item) => <div key={`${item.matricula_id}-${item.disciplina_id}-${item.periodo}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[var(--g3-card)] p-3 text-sm"><span><strong>{texto(item, "aluno_nome")}</strong> · {texto(item, "disciplina_nome")} · média {texto(item, "media_atual")} / mínima {texto(item, "media_minima")}</span><Button type="button" size="sm" onClick={() => void criarRecuperacaoSugerida(item)} disabled={carregando}>Abrir recuperação</Button></div>)}</div></div> : null}
        <div className="mt-5 space-y-2">{registros.map((item) => <div key={item.id} className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm">{recurso === "lista-espera" ? `Prioridade ${texto(item, "prioridade")} · ${texto(item, "situacao")}` : recurso === "calendario" ? `${texto(item, "data_evento")} · ${texto(item, "titulo")}` : recurso === "resultados-finais" ? `${texto(item, "matricula_id")} · ${texto(item, "situacao")}` : recurso === "rematriculas" ? `${texto(item, "aluno_nome", "aluno_id")} · Matrícula ${texto(item, "numero_matricula")} · Ano ${texto(item, "ano_letivo_id")}` : recurso === "configuracoes" ? `${texto(item, "chave")} · ${texto(item, "valor")} · ${texto(item, "descricao")}` : `${texto(item, "periodo")} · ${texto(item, "tipo")} · ${texto(item, "valor")}`}</div>)}{!registros.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum registro encontrado.</p> : null}</div>
      </CardContent>
    </Card>
  </div>;
}
