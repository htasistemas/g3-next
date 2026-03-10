import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, FileText, List, Plus, Printer, Save, Search, Trash2, Undo2, Upload, User, UserSearch, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { useAdicionarAnexoOcorrenciaCrianca, useAnexosOcorrenciaCrianca, useOcorrenciasCrianca, useRemoverAnexoOcorrenciaCrianca, useRemoverOcorrenciaCrianca, useSalvarOcorrenciaCrianca } from "@/features/ocorrencias-crianca/use-ocorrencias-crianca";
import { ocorrenciasCriancaService } from "@/services/ocorrencias-crianca.service";
import type { OcorrenciaCriancaPayload } from "@/types/ocorrencia-crianca";

type AbaId = "ocorrencia" | "vitima" | "autor" | "classificacao" | "relato";
const abas: AdminTab[] = [
  { id: "ocorrencia", label: "Ocorrência", icon: AlertTriangle },
  { id: "vitima", label: "Vítima", icon: User },
  { id: "autor", label: "Possível Autor", icon: UserSearch },
  { id: "classificacao", label: "Classificação", icon: List },
  { id: "relato", label: "Relato E Encaminhamento", icon: FileText }
];

const defaultForm: OcorrenciaCriancaPayload = { dataPreenchimento: new Date().toISOString().slice(0, 10), vitimaNome: "", vitimaIdade: null, resumoViolencia: "", violenciaMotivadaPor: [], violenciaPraticadaPor: [], tipificacaoViolencia: [], denunciaOrigem: [] };

async function arquivoParaBase64(arquivo: File) {
  const buffer = await arquivo.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

export function OcorrenciasPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("ocorrencia");
  const [form, setForm] = useState<OcorrenciaCriancaPayload>(defaultForm);
  const [snapshot, setSnapshot] = useState<OcorrenciaCriancaPayload>(defaultForm);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [abrirBusca, setAbrirBusca] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");
  const [abrirImpressao, setAbrirImpressao] = useState(false);

  const ocorrenciasQuery = useOcorrenciasCrianca();
  const salvarMutation = useSalvarOcorrenciaCrianca();
  const removerMutation = useRemoverOcorrenciaCrianca();
  const anexosQuery = useAnexosOcorrenciaCrianca(form.id);
  const adicionarAnexoMutation = useAdicionarAnexoOcorrenciaCrianca(form.id);
  const removerAnexoMutation = useRemoverAnexoOcorrenciaCrianca(form.id);
  const anexos = anexosQuery.data ?? [];
  const carregandoAcoes =
    salvarMutation.isPending ||
    removerMutation.isPending ||
    adicionarAnexoMutation.isPending ||
    removerAnexoMutation.isPending;

  const ocorrenciasFiltradas = useMemo(() => {
    const termo = termoBusca.toLowerCase().trim();
    return (ocorrenciasQuery.data ?? []).filter((item) => `${item.vitimaNome} ${item.dataPreenchimento}`.toLowerCase().includes(termo));
  }, [ocorrenciasQuery.data, termoBusca]);

  function novo() { setForm(defaultForm); setSnapshot(defaultForm); setAbaAtiva("ocorrencia"); }
  function cancelar() { setForm(snapshot); }
  function selecionar(item: OcorrenciaCriancaPayload) { setForm(item); setSnapshot(item); setAbaAtiva("ocorrencia"); setAbrirBusca(false); }

  async function salvar() {
    if (!form.dataPreenchimento || !form.vitimaNome?.trim() || form.vitimaIdade == null || !form.resumoViolencia?.trim()) { setPopup({ tipo: "aviso", titulo: "Validação", texto: "Preencha data, nome da vítima, idade e resumo da ocorrência." }); return; }
    try {
      const response = await salvarMutation.mutateAsync({ id: form.id, payload: form });
      setForm(response); setSnapshot(response);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Ocorrência salva com sucesso." });
    } catch (error: any) { setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar." }); }
  }

  async function confirmarExclusao() {
    if (!form.id) return;
    try { await removerMutation.mutateAsync(form.id); setConfirmarExcluir(false); novo(); setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Ocorrência excluída com sucesso." }); }
    catch (error: any) { setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível excluir." }); }
  }

  async function anexarArquivo(arquivo: File) {
    if (!form.id) { setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Salve a ocorrência antes de anexar arquivos." }); return; }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(arquivo.type)) { setPopup({ tipo: "aviso", titulo: "Validação", texto: "Envie apenas PDF, JPG ou PNG." }); return; }
    if (arquivo.size > 10 * 1024 * 1024) { setPopup({ tipo: "aviso", titulo: "Validação", texto: "Arquivo acima de 10MB." }); return; }
    try {
      await adicionarAnexoMutation.mutateAsync({ nomeArquivo: arquivo.name, tipoMime: arquivo.type, conteudoBase64: await arquivoParaBase64(arquivo), ordem: anexos.length + 1 });
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Anexo adicionado com sucesso." });
    } catch (error: any) { setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível anexar arquivo." }); }
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbrirBusca(true), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    { label: salvarMutation.isPending ? "Salvando..." : "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
    { label: "Excluir", icon: Trash2, onClick: () => setConfirmarExcluir(true), variant: "danger", disabled: !form.id || carregandoAcoes },
    { label: "Imprimir", icon: Printer, onClick: () => setAbrirImpressao(true), variant: "outline", disabled: !form.id },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  return (
    <>
      <AdminPageLayout tabs={abas} activeTab={abaAtiva} onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)} actions={acoes} activeTitle={abas.find((item) => item.id === abaAtiva)?.label} codeBadge={form.id ? `Código: ${form.id}` : "Novo"}>
        {abaAtiva === "ocorrencia" ? <section className="space-y-3"><div className="grid gap-3 md:grid-cols-2"><div className="space-y-1"><Label>Data De Preenchimento *</Label><Input type="date" value={form.dataPreenchimento} onChange={(event) => setForm((atual) => ({ ...atual, dataPreenchimento: event.target.value }))} /></div><div className="space-y-1"><Label>Local Da Violência</Label><Input value={form.localViolencia ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, localViolencia: event.target.value }))} /></div></div><div className="space-y-1"><Label>Violência Motivada Por</Label><Input value={(form.violenciaMotivadaPor ?? []).join(", ")} onChange={(event) => setForm((atual) => ({ ...atual, violenciaMotivadaPor: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} /></div><div className="space-y-1"><Label>Violência Praticada Por</Label><Input value={(form.violenciaPraticadaPor ?? []).join(", ")} onChange={(event) => setForm((atual) => ({ ...atual, violenciaPraticadaPor: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} /></div></section> : null}
        {abaAtiva === "vitima" ? <section className="grid gap-3 md:grid-cols-2"><div className="space-y-1"><Label>Nome Da Vítima *</Label><Input value={form.vitimaNome} onChange={(event) => setForm((atual) => ({ ...atual, vitimaNome: event.target.value }))} /></div><div className="space-y-1"><Label>Idade *</Label><Input type="number" value={form.vitimaIdade ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, vitimaIdade: Number(event.target.value) || null }))} /></div><div className="space-y-1"><Label>Raça/Cor</Label><Input value={form.vitimaRacaCor ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, vitimaRacaCor: event.target.value }))} /></div><div className="space-y-1"><Label>Escolaridade</Label><Input value={form.vitimaEscolaridade ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, vitimaEscolaridade: event.target.value }))} /></div></section> : null}
        {abaAtiva === "autor" ? <section className="grid gap-3 md:grid-cols-2"><div className="space-y-1"><Label>Nome Do Autor</Label><Input value={form.autorNome ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, autorNome: event.target.value }))} /></div><div className="space-y-1"><Label>Idade Do Autor</Label><Input type="number" value={form.autorIdade ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, autorIdade: Number(event.target.value) || null }))} /></div><div className="space-y-1"><Label>Parentesco</Label><Input value={form.autorParentesco ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, autorParentesco: event.target.value }))} /></div><div className="space-y-1"><Label>Nome Responsável</Label><Input value={form.autorResponsavelNome ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, autorResponsavelNome: event.target.value }))} /></div></section> : null}
        {abaAtiva === "classificacao" ? <section className="space-y-3"><div className="space-y-1"><Label>Tipificação Da Violência</Label><Textarea rows={3} value={(form.tipificacaoViolencia ?? []).join(", ")} onChange={(event) => setForm((atual) => ({ ...atual, tipificacaoViolencia: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} /></div><div className="space-y-1"><Label>Violência Autoprovocada</Label><Textarea rows={2} value={(form.violenciaAutoprovocada ?? []).join(", ")} onChange={(event) => setForm((atual) => ({ ...atual, violenciaAutoprovocada: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} /></div></section> : null}
        {abaAtiva === "relato" ? <section className="space-y-3"><div className="space-y-1"><Label>Resumo da violência *</Label><Textarea rows={5} value={form.resumoViolencia} onChange={(event) => setForm((atual) => ({ ...atual, resumoViolencia: event.target.value }))} disabled={carregandoAcoes} /></div><div className="space-y-1"><Label>Encaminhar ao Conselho Tutelar</Label><Select value={form.encaminharConselho === null || form.encaminharConselho === undefined ? "" : form.encaminharConselho ? "sim" : "nao"} onChange={(event) => setForm((atual) => ({ ...atual, encaminharConselho: event.target.value === "sim" ? true : event.target.value === "nao" ? false : null }))} disabled={carregandoAcoes}><option value="">Não informado</option><option value="sim">Sim</option><option value="nao">Não</option></Select></div><div className="space-y-1"><Label>Anexos</Label><Input type="file" accept=".pdf,image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) { void anexarArquivo(file); } event.target.value = ""; }} disabled={carregandoAcoes} /></div>{adicionarAnexoMutation.isPending ? <p className="text-sm text-[var(--g3-muted)]">Enviando anexo...</p> : null}<div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Arquivo</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{anexos.length ? anexos.map((anexo, index) => <tr key={anexo.id ?? index} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{anexo.nomeArquivo}</td><td className="px-3 py-2">{anexo.tipoMime}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="danger" onClick={() => anexo.id ? void removerAnexoMutation.mutateAsync(anexo.id) : undefined} disabled={adicionarAnexoMutation.isPending || removerAnexoMutation.isPending}>{removerAnexoMutation.isPending ? "Removendo..." : "Remover"}</Button></td></tr>) : <tr><td colSpan={3} className="px-3 py-4 text-center">Nenhum anexo adicionado.</td></tr>}</tbody></table></div></section> : null}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao aberto={confirmarExcluir} titulo="Confirmar Exclusão" texto="Esta ação é irreversível. Deseja continuar?" processando={removerMutation.isPending} onCancel={() => setConfirmarExcluir(false)} onConfirm={() => void confirmarExclusao()} confirmarTexto="Excluir" />

      {abrirBusca ? <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4" onClick={() => setAbrirBusca(false)}><div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-4" onClick={(event) => event.stopPropagation()}><div className="mb-3 flex items-center justify-between"><h3 className="text-base font-semibold">Buscar ocorrência</h3><Button variant="outline" size="sm" onClick={() => setAbrirBusca(false)}>Fechar</Button></div><Input placeholder="Buscar por nome da vítima ou data" value={termoBusca} onChange={(event) => setTermoBusca(event.target.value)} /><div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Vítima</th></tr></thead><tbody>{ocorrenciasFiltradas.length ? ocorrenciasFiltradas.map((item, index) => <tr key={item.id ?? index} className={`cursor-pointer border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => selecionar(item)}><td className="px-3 py-2">{item.dataPreenchimento}</td><td className="px-3 py-2">{item.vitimaNome}</td></tr>) : <tr><td colSpan={2} className="px-3 py-4 text-center">{ocorrenciasQuery.isLoading ? "Carregando ocorrências..." : "Nenhum registro encontrado."}</td></tr>}</tbody></table></div></div></div> : null}

      {abrirImpressao && form.id ? <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4" onClick={() => setAbrirImpressao(false)}><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4" onClick={(event) => event.stopPropagation()}><h3 className="mb-3 text-base font-semibold">Opções de impressão</h3><div className="space-y-2"><Button className="w-full" onClick={() => window.open(ocorrenciasCriancaService.obterPdfDenunciaUrl(form.id as string), "_blank", "noopener,noreferrer")}>Ficha completa da denúncia</Button><Button className="w-full" variant="outline" onClick={() => window.open(ocorrenciasCriancaService.obterPdfConselhoTutelarUrl(form.id as string), "_blank", "noopener,noreferrer")}>Ficha ao Conselho Tutelar</Button></div><div className="mt-3 flex justify-end"><Button variant="outline" onClick={() => setAbrirImpressao(false)}>Fechar</Button></div></div></div> : null}
    </>
  );
}

