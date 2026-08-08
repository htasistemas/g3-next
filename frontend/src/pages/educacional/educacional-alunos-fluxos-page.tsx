import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { educacionalService } from "@/services/educacional.service";
import type { EducacionalItem } from "@/types/educacional";

type Props = { recurso: "transferencias" | "autorizacoes" };

export function EducacionalAlunosFluxosPage({ recurso }: Props) {
  const [itens, setItens] = useState<EducacionalItem[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ aluno_id: "", tipo: "INTERNA", data_transferencia: new Date().toISOString().slice(0, 10), instituicao_externa: "", motivo: "", situacao: "SOLICITADA", observacoes: "", data_emissao: new Date().toISOString().slice(0, 10), autorizado: "false" });
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const carregar = async () => setItens(await educacionalService.listar(recurso));
  useEffect(() => { void carregar(); }, [recurso]);
  const atualizar = (campo: string, valor: string) => setForm((anterior) => ({ ...anterior, [campo]: valor }));
  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    if (!form.aluno_id) { setMensagem("Informe o aluno vinculado à operação."); return; }
    setCarregando(true);
    try {
      const payload = recurso === "transferencias"
        ? { aluno_id: Number(form.aluno_id), tipo: form.tipo, data_transferencia: form.data_transferencia, instituicao_externa: form.instituicao_externa || null, motivo: form.motivo || null, situacao: form.situacao, observacoes: form.observacoes || null }
        : { aluno_id: Number(form.aluno_id), tipo: form.tipo || "Saída", data_emissao: form.data_emissao, autorizado: form.autorizado === "true", observacoes: form.observacoes || null };
      await educacionalService.salvar(recurso, payload);
      setMensagem("Registro salvo com sucesso.");
      await carregar();
    } catch (error) { setMensagem(error instanceof Error ? error.message : "Não foi possível salvar o registro."); }
    finally { setCarregando(false); }
  }
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]"><Card><CardHeader><CardTitle>{recurso === "transferencias" ? "Nova transferência" : "Nova autorização"}</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={salvar}><Input value={form.aluno_id} onChange={(event) => atualizar("aluno_id", event.target.value)} type="number" min="1" placeholder="Código do aluno" />{recurso === "transferencias" ? <><Select value={form.tipo} onChange={(event) => atualizar("tipo", event.target.value)}><option value="INTERNA">Transferência interna</option><option value="EXTERNA">Transferência externa</option></Select><Input value={form.data_transferencia} onChange={(event) => atualizar("data_transferencia", event.target.value)} type="date" /><Input value={form.instituicao_externa} onChange={(event) => atualizar("instituicao_externa", event.target.value)} placeholder="Instituição externa (se aplicável)" /><Input value={form.motivo} onChange={(event) => atualizar("motivo", event.target.value)} placeholder="Motivo" /></> : <><Input value={form.tipo} onChange={(event) => atualizar("tipo", event.target.value)} placeholder="Tipo de autorização" /><Input value={form.data_emissao} onChange={(event) => atualizar("data_emissao", event.target.value)} type="date" /><Select value={form.autorizado} onChange={(event) => atualizar("autorizado", event.target.value)}><option value="false">Não autorizado</option><option value="true">Autorizado</option></Select></>}<Input value={form.observacoes} onChange={(event) => atualizar("observacoes", event.target.value)} placeholder="Observações" /><Button type="submit" disabled={carregando}>Salvar</Button>{mensagem ? <p className="text-sm text-[var(--g3-muted)]">{mensagem}</p> : null}</form></CardContent></Card><Card><CardHeader><CardTitle>Histórico</CardTitle></CardHeader><CardContent className="space-y-2">{itens.map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm">Aluno #{String(item.aluno_id ?? "—")} · {String(item.tipo ?? "Registro")} · {String(item.situacao ?? item.data_emissao ?? item.data_transferencia ?? "")}</div>)}{!itens.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum registro encontrado.</p> : null}</CardContent></Card></div>;
}
