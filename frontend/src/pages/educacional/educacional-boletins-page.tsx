import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { educacionalService, type EducacionalRecurso } from "@/services/educacional.service";
import type { EducacionalItem } from "@/types/educacional";

type RecursoBoletim = "boletins" | "historicos";

function texto(item: EducacionalItem | Record<string, unknown>, ...chaves: string[]) {
  for (const chave of chaves) {
    const valor = item[chave];
    if (valor !== null && valor !== undefined && String(valor).trim()) return String(valor);
  }
  return `Registro #${String(item.id ?? "")}`;
}

export function EducacionalBoletinsPage({ recurso }: { recurso: RecursoBoletim }) {
  const [listas, setListas] = useState<Record<string, EducacionalItem[]>>({});
  const [formulario, setFormulario] = useState({ matricula_id: "", aluno_id: "", ano_letivo_id: "", periodo: "", media: "", frequencia: "", resultado: "", escola_descricao: "", etapa_descricao: "", serie_descricao: "" });
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const alterar = (campo: keyof typeof formulario, valor: string) => setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  const opcoes = (itens: EducacionalItem[] | undefined, chaves: string[]) => (itens ?? []).map((item) => <option key={item.id} value={item.id}>{texto(item, ...chaves)}</option>);

  const carregar = async () => {
    setCarregando(true);
    try {
      const recursos: EducacionalRecurso[] = recurso === "boletins" ? ["boletins", "matriculas", "anos-letivos"] : ["historicos", "alunos", "anos-letivos"];
      const respostas = await Promise.all(recursos.map((item) => educacionalService.listar(item)));
      setListas(Object.fromEntries(recursos.map((item, index) => [item, respostas[index]])));
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível carregar os registros escolares.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { void carregar(); }, [recurso]);

  async function gerarBoletimAutomatico() {
    if (!formulario.matricula_id || !formulario.ano_letivo_id || !formulario.periodo.trim()) {
      setMensagem("Selecione matrícula, ano letivo e período para gerar o boletim automaticamente.");
      return;
    }
    setCarregando(true);
    try {
      const resposta = await educacionalService.gerarBoletimAutomatico({
        matricula_id: Number(formulario.matricula_id),
        ano_letivo_id: Number(formulario.ano_letivo_id),
        periodo: formulario.periodo.trim()
      });
      const item = resposta.item;
      setFormulario((atual) => ({
        ...atual,
        media: item.media !== null && item.media !== undefined ? String(item.media) : "",
        frequencia: item.frequencia !== null && item.frequencia !== undefined ? String(item.frequencia) : "",
        resultado: String(item.resultado ?? "")
      }));
      setMensagem(`Boletim gerado automaticamente. Média: ${texto(item, "media")}. Frequência: ${texto(item, "frequencia")}%.`);
      await carregar();
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível gerar o boletim automaticamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function gerarHistoricoAutomatico() {
    if (!formulario.aluno_id || !formulario.ano_letivo_id) {
      setMensagem("Selecione aluno e ano letivo para gerar o histórico automaticamente.");
      return;
    }
    setCarregando(true);
    try {
      const resposta = await educacionalService.gerarHistoricoAutomatico({
        aluno_id: Number(formulario.aluno_id),
        ano_letivo_id: Number(formulario.ano_letivo_id)
      });
      const item = resposta.item;
      setFormulario((atual) => ({
        ...atual,
        escola_descricao: String(item.escola_descricao ?? ""),
        etapa_descricao: String(item.etapa_descricao ?? ""),
        serie_descricao: String(item.serie_descricao ?? ""),
        media: item.media !== null && item.media !== undefined ? String(item.media) : "",
        frequencia: item.frequencia !== null && item.frequencia !== undefined ? String(item.frequencia) : "",
        resultado: String(item.resultado ?? "")
      }));
      setMensagem(`Histórico gerado automaticamente. Resultado: ${texto(item, "resultado")}.`);
      await carregar();
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível gerar o histórico automaticamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    const boletim = recurso === "boletins";
    const obrigatorios = boletim ? [formulario.matricula_id, formulario.ano_letivo_id, formulario.periodo] : [formulario.aluno_id, formulario.ano_letivo_id, formulario.resultado];
    if (obrigatorios.some((valor) => !valor)) {
      setMensagem("Preencha os campos obrigatórios.");
      return;
    }
    setCarregando(true);
    try {
      const payload = boletim
        ? { matricula_id: Number(formulario.matricula_id), ano_letivo_id: Number(formulario.ano_letivo_id), periodo: formulario.periodo, media: formulario.media ? Number(formulario.media) : null, frequencia: formulario.frequencia ? Number(formulario.frequencia) : null, resultado: formulario.resultado || null, emitido_em: new Date().toISOString() }
        : { aluno_id: Number(formulario.aluno_id), ano_letivo_id: Number(formulario.ano_letivo_id), escola_descricao: formulario.escola_descricao || null, etapa_descricao: formulario.etapa_descricao || null, serie_descricao: formulario.serie_descricao || null, media: formulario.media ? Number(formulario.media) : null, frequencia: formulario.frequencia ? Number(formulario.frequencia) : null, resultado: formulario.resultado };
      await educacionalService.salvar(recurso, payload);
      setMensagem(boletim ? "Boletim registrado." : "Histórico escolar registrado.");
      await carregar();
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível salvar o registro.");
    } finally {
      setCarregando(false);
    }
  }

  const itens = listas[recurso] ?? [];

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,460px)_1fr]">
    <Card>
      <CardHeader><CardTitle>{recurso === "boletins" ? "Boletins" : "Histórico escolar"}</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={salvar}>
          {recurso === "boletins" ? <>
            <Select value={formulario.matricula_id} onChange={(event) => alterar("matricula_id", event.target.value)}><option value="">Matrícula</option>{opcoes(listas.matriculas, ["aluno_nome", "numero_matricula", "aluno_id"])}</Select>
            <Select value={formulario.ano_letivo_id} onChange={(event) => alterar("ano_letivo_id", event.target.value)}><option value="">Ano letivo</option>{opcoes(listas["anos-letivos"], ["ano", "descricao"])}</Select>
            <Input value={formulario.periodo} onChange={(event) => alterar("periodo", event.target.value)} placeholder="Período" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void gerarBoletimAutomatico()} disabled={carregando}>Gerar automaticamente</Button>
              <Button type="submit" variant="outline" disabled={carregando}>Salvar ajuste manual</Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input type="number" min="0" value={formulario.media} onChange={(event) => alterar("media", event.target.value)} placeholder="Média" />
              <Input type="number" min="0" max="100" value={formulario.frequencia} onChange={(event) => alterar("frequencia", event.target.value)} placeholder="Frequência (%)" />
              <Input value={formulario.resultado} onChange={(event) => alterar("resultado", event.target.value)} placeholder="Resultado" />
            </div>
          </> : <>
            <Select value={formulario.aluno_id} onChange={(event) => alterar("aluno_id", event.target.value)}><option value="">Aluno</option>{opcoes(listas.alunos, ["beneficiario_id", "numero_aluno"])}</Select>
            <Select value={formulario.ano_letivo_id} onChange={(event) => alterar("ano_letivo_id", event.target.value)}><option value="">Ano letivo</option>{opcoes(listas["anos-letivos"], ["ano", "descricao"])}</Select>
            <Input value={formulario.escola_descricao} onChange={(event) => alterar("escola_descricao", event.target.value)} placeholder="Escola" />
            <Input value={formulario.etapa_descricao} onChange={(event) => alterar("etapa_descricao", event.target.value)} placeholder="Etapa" />
            <Input value={formulario.serie_descricao} onChange={(event) => alterar("serie_descricao", event.target.value)} placeholder="Série/Ano" />
            <Input type="number" min="0" value={formulario.media} onChange={(event) => alterar("media", event.target.value)} placeholder="Média" />
            <Input type="number" min="0" max="100" value={formulario.frequencia} onChange={(event) => alterar("frequencia", event.target.value)} placeholder="Frequência (%)" />
            <Input value={formulario.resultado} onChange={(event) => alterar("resultado", event.target.value)} placeholder="Resultado final" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void gerarHistoricoAutomatico()} disabled={carregando}>Gerar automaticamente</Button>
              <Button type="submit" variant="outline" disabled={carregando}>Salvar ajuste manual</Button>
            </div>
          </>}
        </form>
        {mensagem ? <p className="mt-3 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-sm">{mensagem}</p> : null}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Registros salvos</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {itens.map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm">{recurso === "boletins" ? `${texto(item, "periodo")} · Matrícula ${texto(item, "matricula_id")} · Média ${texto(item, "media")} · Frequência ${texto(item, "frequencia")}%` : `${texto(item, "serie_descricao")} · ${texto(item, "resultado")} · Ano ${texto(item, "ano_letivo_id")}`}</div>)}
        {!itens.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum registro encontrado.</p> : null}
      </CardContent>
    </Card>
  </div>;
}
