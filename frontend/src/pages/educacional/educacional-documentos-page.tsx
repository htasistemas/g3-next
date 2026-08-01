import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { arquivosService } from "@/services/arquivos.service";
import { educacionalService } from "@/services/educacional.service";
import type { EducacionalItem } from "@/types/educacional";

function texto(item: EducacionalItem, ...chaves: string[]) { for (const chave of chaves) { const valor = item[chave]; if (valor !== null && valor !== undefined && String(valor).trim()) return String(valor); } return `Registro #${item.id}`; }

export function EducacionalDocumentosPage() {
  const [listas, setListas] = useState<Record<string, EducacionalItem[]>>({});
  const [formulario, setFormulario] = useState({ aluno_id: "", matricula_id: "", tipo: "", titulo: "", data_emissao: new Date().toISOString().slice(0, 10) });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const alterar = (campo: keyof typeof formulario, valor: string) => setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  const opcoes = (itens: EducacionalItem[] | undefined, chaves: string[]) => (itens ?? []).map((item) => <option key={item.id} value={item.id}>{texto(item, ...chaves)}</option>);
  const carregar = async () => { setCarregando(true); try { const [documentos, alunos, matriculas] = await Promise.all([educacionalService.listar("documentos"), educacionalService.listar("alunos"), educacionalService.listar("matriculas")]); setListas({ documentos, alunos, matriculas }); } catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível carregar os documentos."); } finally { setCarregando(false); } };
  useEffect(() => { void carregar(); }, []);
  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!formulario.tipo || !formulario.titulo) { setMensagem("Informe o tipo e o título do documento."); return; }
    setCarregando(true);
    try {
      const documento = await educacionalService.salvar("documentos", { aluno_id: formulario.aluno_id ? Number(formulario.aluno_id) : null, matricula_id: formulario.matricula_id ? Number(formulario.matricula_id) : null, tipo: formulario.tipo, titulo: formulario.titulo, data_emissao: formulario.data_emissao, caminho_arquivo: null, mime_type: null, status: "EMITIDO" });
      if (arquivo) {
        const salvo = await arquivosService.uploadParaDocumentoEducacional(String(documento.id), arquivo);
        await educacionalService.salvar("documentos", { aluno_id: formulario.aluno_id ? Number(formulario.aluno_id) : null, matricula_id: formulario.matricula_id ? Number(formulario.matricula_id) : null, tipo: formulario.tipo, titulo: formulario.titulo, data_emissao: formulario.data_emissao, caminho_arquivo: salvo.caminhoArquivo, mime_type: salvo.mimeType, status: "EMITIDO" }, String(documento.id));
      }
      setFormulario({ aluno_id: "", matricula_id: "", tipo: "", titulo: "", data_emissao: new Date().toISOString().slice(0, 10) });
      setArquivo(null);
      setMensagem(arquivo ? "Documento e arquivo salvos com sucesso." : "Documento registrado sem arquivo anexado.");
      await carregar();
    } catch (erro) { setMensagem(erro instanceof Error ? erro.message : "Não foi possível registrar o documento."); }
    finally { setCarregando(false); }
  }
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,440px)_1fr]"><Card><CardHeader><CardTitle>Documentos e declarações</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={salvar}><Select value={formulario.aluno_id} onChange={(event) => alterar("aluno_id", event.target.value)}><option value="">Aluno (opcional)</option>{opcoes(listas.alunos, ["nome_completo", "beneficiario_id", "numero_aluno"])}</Select><Select value={formulario.matricula_id} onChange={(event) => alterar("matricula_id", event.target.value)}><option value="">Matrícula (opcional)</option>{opcoes(listas.matriculas, ["numero_matricula", "aluno_id"])}</Select><Input value={formulario.tipo} onChange={(event) => alterar("tipo", event.target.value)} placeholder="Tipo de documento" /><Input value={formulario.titulo} onChange={(event) => alterar("titulo", event.target.value)} placeholder="Título" /><Input type="date" value={formulario.data_emissao} onChange={(event) => alterar("data_emissao", event.target.value)} /><Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,image/*" onChange={(event) => setArquivo(event.target.files?.[0] ?? null)} /><p className="text-xs text-[var(--g3-muted)]">O arquivo será armazenado no storage; o banco guardará apenas os metadados e o caminho lógico.</p><Button disabled={carregando}>{carregando ? "Salvando..." : "Registrar documento"}</Button></form>{mensagem ? <p className="mt-3 text-sm text-[var(--g3-muted)]">{mensagem}</p> : null}</CardContent></Card><Card><CardHeader><CardTitle>Documentos registrados</CardTitle></CardHeader><CardContent className="space-y-2">{(listas.documentos ?? []).map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm"><strong>{texto(item, "titulo")}</strong><span className="ml-2 text-xs text-[var(--g3-muted)]">{texto(item, "tipo")} · {texto(item, "data_emissao")} · {item.caminho_arquivo ? "Arquivo anexado" : "Sem arquivo"}</span></div>)}{!(listas.documentos ?? []).length ? <p className="text-sm text-[var(--g3-muted)]">Nenhum documento registrado.</p> : null}</CardContent></Card></div>;
}
