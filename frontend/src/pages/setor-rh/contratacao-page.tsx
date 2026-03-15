import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  FileSearch,
  List,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  UserRound,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import {
  useAuditoriaRh,
  useAtualizarDocumentoRh,
  useAtualizarStatusProcessoRh,
  useCandidatoRh,
  useCandidatosRh,
  useDocumentosRh,
  useEntrevistasRh,
  useInativarCandidatoRh,
  useProcessoRh,
  useSalvarCandidatoRh,
  useSalvarEntrevistaRh
} from "@/features/rh-contratacao/use-rh-contratacao";
import type { RhCandidatoDetalhe, RhCandidatoPayload, RhEntrevistaPayload } from "@/types/rh-contratacao";

type AbaId = "listagem" | "dadosCandidato" | "processo" | "entrevistas" | "documentos" | "auditoria";

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem De Candidatos", icon: List },
  { id: "dadosCandidato", label: "Dados Do Candidato", icon: UserRound },
  { id: "processo", label: "Processo", icon: ClipboardCheck },
  { id: "entrevistas", label: "Entrevistas", icon: ClipboardCheck },
  { id: "documentos", label: "Documentos", icon: FileSearch },
  { id: "auditoria", label: "Auditoria", icon: FileSearch }
];

const candidatoVazio: RhCandidatoPayload = {
  nomeCompleto: "",
  statusProcesso: "TRIAGEM"
};

const entrevistaVazia: RhEntrevistaPayload = {
  tipoRoteiro: "PADRAO",
  dataEntrevista: new Date().toISOString().slice(0, 10)
};

function mapDetalheParaPayload(candidato: RhCandidatoDetalhe, statusProcesso?: string): RhCandidatoPayload {
  return {
    nomeCompleto: candidato.nomeCompleto,
    cpf: candidato.cpf,
    rg: candidato.rg,
    pis: candidato.pis,
    dataNascimento: candidato.dataNascimento,
    naturalidade: candidato.naturalidade,
    estadoCivil: candidato.estadoCivil,
    nomeMae: candidato.nomeMae,
    nomeConjuge: candidato.nomeConjuge,
    vagaPretendida: candidato.vagaPretendida,
    dataPreenchimento: candidato.dataPreenchimento,
    filhosPossui: candidato.filhosPossui,
    filhos: candidato.filhos,
    deficienciaPossui: candidato.deficienciaPossui,
    deficienciaTipo: candidato.deficienciaTipo,
    deficienciaDescricao: candidato.deficienciaDescricao,
    endereco: candidato.endereco,
    telefone: candidato.telefone,
    whatsapp: candidato.whatsapp,
    anexos: candidato.anexos,
    statusProcesso
  };
}

function renderizarJsonLegado(valor: unknown) {
  if (valor == null) return "Não informado.";
  if (typeof valor === "string") return valor;
  try {
    return JSON.stringify(valor, null, 2);
  } catch {
    return String(valor);
  }
}

export function ContratacaoPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [filtro, setFiltro] = useState("");
  const [candidatoSelecionadoId, setCandidatoSelecionadoId] = useState<number>();
  const [form, setForm] = useState<RhCandidatoPayload>(candidatoVazio);
  const [snapshot, setSnapshot] = useState<RhCandidatoPayload>(candidatoVazio);
  const [entrevistaForm, setEntrevistaForm] = useState<RhEntrevistaPayload>(entrevistaVazia);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarInativacao, setConfirmarInativacao] = useState(false);

  const candidatosQuery = useCandidatosRh(filtro);
  const candidatoDetalheQuery = useCandidatoRh(candidatoSelecionadoId);
  const processoQuery = useProcessoRh(candidatoSelecionadoId);
  const entrevistasQuery = useEntrevistasRh(processoQuery.data?.id);
  const documentosQuery = useDocumentosRh(processoQuery.data?.id);
  const auditoriaQuery = useAuditoriaRh(processoQuery.data?.id);

  const salvarCandidatoMutation = useSalvarCandidatoRh();
  const inativarCandidatoMutation = useInativarCandidatoRh();
  const atualizarStatusMutation = useAtualizarStatusProcessoRh();
  const salvarEntrevistaMutation = useSalvarEntrevistaRh();
  const atualizarDocumentoMutation = useAtualizarDocumentoRh();

  const candidatos = candidatosQuery.data ?? [];
  const processo = processoQuery.data;
  const candidatoDetalhado = candidatoDetalheQuery.data;
  const entrevistas = entrevistasQuery.data ?? [];
  const documentos = documentosQuery.data ?? [];
  const auditoria = auditoriaQuery.data ?? [];

  const candidatoAtual = useMemo(() => {
    if (!candidatoSelecionadoId) return undefined;
    return candidatos.find((item) => item.candidatoId === candidatoSelecionadoId);
  }, [candidatos, candidatoSelecionadoId]);

  const processando =
    salvarCandidatoMutation.isPending ||
    inativarCandidatoMutation.isPending ||
    atualizarStatusMutation.isPending ||
    salvarEntrevistaMutation.isPending ||
    atualizarDocumentoMutation.isPending;

  useEffect(() => {
    if (!candidatoDetalhado) return;
    const payload = mapDetalheParaPayload(candidatoDetalhado, processo?.status ?? form.statusProcesso);
    setForm(payload);
    setSnapshot(payload);
  }, [candidatoDetalhado, processo?.status]);

  function novo() {
    setCandidatoSelecionadoId(undefined);
    setForm(candidatoVazio);
    setSnapshot(candidatoVazio);
    setEntrevistaForm(entrevistaVazia);
    setAbaAtiva("dadosCandidato");
  }

  function selecionarCandidato(candidatoId: number) {
    const candidato = candidatos.find((item) => item.candidatoId === candidatoId);
    setCandidatoSelecionadoId(candidatoId);
    if (candidato) {
      const payload: RhCandidatoPayload = {
        nomeCompleto: candidato.nomeCompleto,
        cpf: candidato.cpf,
        telefone: candidato.telefone,
        vagaPretendida: candidato.vagaPretendida,
        statusProcesso: candidato.status
      };
      setForm(payload);
      setSnapshot(payload);
    }
    setAbaAtiva("dadosCandidato");
  }

  function cancelar() {
    setForm(snapshot);
  }

  async function salvar() {
    if (!form.nomeCompleto?.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe o nome completo do candidato." });
      return;
    }

    try {
      const response = await salvarCandidatoMutation.mutateAsync({
        id: candidatoSelecionadoId,
        payload: form
      });
      setCandidatoSelecionadoId(response.candidatoId);
      setSnapshot(form);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Candidato salvo com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o candidato."
      });
    }
  }

  async function confirmarInativacaoCandidato() {
    if (!candidatoSelecionadoId) return;
    try {
      await inativarCandidatoMutation.mutateAsync(candidatoSelecionadoId);
      setConfirmarInativacao(false);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Candidato inativado com sucesso." });
      novo();
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível inativar o candidato."
      });
    }
  }

  async function atualizarStatus(status: string) {
    if (!processo?.id) {
      setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Selecione um candidato com processo ativo." });
      return;
    }
    try {
      await atualizarStatusMutation.mutateAsync({ processoId: processo.id, status });
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Status do processo atualizado." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível atualizar o status do processo."
      });
    }
  }

  async function salvarEntrevista() {
    if (!processo?.id) {
      setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Selecione um candidato com processo ativo." });
      return;
    }
    if (!entrevistaForm.tipoRoteiro?.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe o tipo de roteiro da entrevista." });
      return;
    }
    try {
      await salvarEntrevistaMutation.mutateAsync({ processoId: processo.id, payload: entrevistaForm });
      setEntrevistaForm(entrevistaVazia);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Entrevista registrada com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível registrar a entrevista."
      });
    }
  }

  async function atualizarStatusDocumento(documentoId: number, status: string) {
    if (!processo?.id) return;
    try {
      await atualizarDocumentoMutation.mutateAsync({
        processoId: processo.id,
        documentoId,
        payload: { status }
      });
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Documento atualizado com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível atualizar o documento."
      });
    }
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbaAtiva("listagem"), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: processando },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: processando },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: processando },
    {
      label: "Excluir",
      icon: Trash2,
      onClick: () => setConfirmarInativacao(true),
      variant: "danger",
      disabled: processando || !candidatoSelecionadoId
    },
    {
      label: "Imprimir",
      icon: Printer,
      onClick: () => {
        try {
          imprimirConteudoAtual({ titulo: "Contratação" });
        } catch (error: any) {
          setPopup({
            tipo: "erro",
            titulo: "Erro",
            texto: error?.message ?? "Não foi possível preparar a impressão."
          });
        }
      },
      variant: "outline"
    },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Setor RH"
        pageTitle="Contratação"
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={candidatoSelecionadoId ? `Candidato: ${candidatoSelecionadoId}` : "Novo"}
      >
        {abaAtiva === "listagem" ? (
          <section className="space-y-3">
            <div className="space-y-1">
              <Label>Pesquisar candidato</Label>
              <Input placeholder="Nome ou CPF" value={filtro} onChange={(event) => setFiltro(event.target.value)} />
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Nome</th>
                    <th className="px-3 py-2 text-left">CPF</th>
                    <th className="px-3 py-2 text-left">Vaga pretendida</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatosQuery.isLoading ? (
                    <tr><td colSpan={4} className="px-3 py-4 text-center">Carregando candidatos...</td></tr>
                  ) : candidatos.length ? (
                    candidatos.map((item, index) => (
                      <tr key={item.candidatoId} className={`cursor-pointer border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => selecionarCandidato(item.candidatoId)}>
                        <td className="px-3 py-2 font-medium">{item.nomeCompleto}</td>
                        <td className="px-3 py-2">{item.cpf ?? "---"}</td>
                        <td className="px-3 py-2">{item.vagaPretendida ?? "---"}</td>
                        <td className="px-3 py-2">{item.status ?? "---"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="px-3 py-4 text-center">Nenhum candidato encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "dadosCandidato" ? (
          <section className="space-y-4">
            {candidatoSelecionadoId && candidatoDetalheQuery.isLoading ? (
              <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 p-3 text-sm text-[var(--g3-muted)]">
                Carregando dados completos do legado...
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 md:col-span-2"><Label>Nome completo *</Label><Input value={form.nomeCompleto} onChange={(event) => setForm((atual) => ({ ...atual, nomeCompleto: event.target.value }))} /></div>
              <div className="space-y-1"><Label>CPF</Label><Input value={form.cpf ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, cpf: event.target.value }))} /></div>
              <div className="space-y-1"><Label>RG</Label><Input value={form.rg ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, rg: event.target.value }))} /></div>
              <div className="space-y-1"><Label>PIS</Label><Input value={form.pis ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, pis: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Data de nascimento</Label><Input type="date" value={form.dataNascimento ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, dataNascimento: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Naturalidade</Label><Input value={form.naturalidade ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, naturalidade: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Estado civil</Label><Input value={form.estadoCivil ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, estadoCivil: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, telefone: event.target.value }))} /></div>
              <div className="space-y-1"><Label>WhatsApp</Label><Input value={form.whatsapp ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, whatsapp: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Vaga pretendida</Label><Input value={form.vagaPretendida ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, vagaPretendida: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Data de preenchimento</Label><Input type="date" value={form.dataPreenchimento ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, dataPreenchimento: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Status inicial do processo</Label><Select value={form.statusProcesso ?? "TRIAGEM"} onChange={(event) => setForm((atual) => ({ ...atual, statusProcesso: event.target.value }))}><option value="TRIAGEM">Triagem</option><option value="ENTREVISTA">Entrevista</option><option value="DOCUMENTACAO">Documentação</option><option value="APROVADO">Aprovado</option><option value="REPROVADO">Reprovado</option><option value="ADMITIDO">Admitido</option></Select></div>
              <div className="space-y-1 md:col-span-2"><Label>Nome da mãe</Label><Input value={form.nomeMae ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, nomeMae: event.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Nome do cônjuge</Label><Input value={form.nomeConjuge ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, nomeConjuge: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Possui filhos?</Label><Select value={form.filhosPossui ? "SIM" : "NAO"} onChange={(event) => setForm((atual) => ({ ...atual, filhosPossui: event.target.value === "SIM" }))}><option value="NAO">Não</option><option value="SIM">Sim</option></Select></div>
              <div className="space-y-1"><Label>Possui deficiência?</Label><Select value={form.deficienciaPossui ? "SIM" : "NAO"} onChange={(event) => setForm((atual) => ({ ...atual, deficienciaPossui: event.target.value === "SIM" }))}><option value="NAO">Não</option><option value="SIM">Sim</option></Select></div>
              <div className="space-y-1"><Label>Tipo de deficiência</Label><Input value={form.deficienciaTipo ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, deficienciaTipo: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Descrição da deficiência</Label><Input value={form.deficienciaDescricao ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, deficienciaDescricao: event.target.value }))} /></div>
            </div>
            <div className="grid gap-3 xl:grid-cols-3">
              <div className="space-y-1 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                <Label>Endereço legado</Label>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-[var(--g3-muted)]">{renderizarJsonLegado(form.endereco)}</pre>
              </div>
              <div className="space-y-1 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                <Label>Filhos / dependentes</Label>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-[var(--g3-muted)]">{renderizarJsonLegado(form.filhos)}</pre>
              </div>
              <div className="space-y-1 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                <Label>Anexos legados</Label>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-[var(--g3-muted)]">{renderizarJsonLegado(form.anexos)}</pre>
              </div>
            </div>
          </section>
        ) : null}

        {abaAtiva === "processo" ? (
          <section className="space-y-3">
            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <p className="text-sm"><span className="font-semibold">Candidato:</span> {candidatoAtual?.nomeCompleto ?? "Não selecionado"}</p>
              <p className="text-sm"><span className="font-semibold">Status atual:</span> {processo?.status ?? "---"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void atualizarStatus("TRIAGEM")}>Triagem</Button>
                <Button size="sm" variant="outline" onClick={() => void atualizarStatus("ENTREVISTA")}>Entrevista</Button>
                <Button size="sm" variant="outline" onClick={() => void atualizarStatus("DOCUMENTACAO")}>Documentação</Button>
                <Button size="sm" variant="outline" onClick={() => void atualizarStatus("APROVADO")}>Aprovar</Button>
                <Button size="sm" variant="outline" onClick={() => void atualizarStatus("REPROVADO")}>Reprovar</Button>
                <Button size="sm" variant="outline" onClick={() => void atualizarStatus("ADMITIDO")}>Admitir</Button>
              </div>
            </div>
          </section>
        ) : null}

        {abaAtiva === "entrevistas" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Tipo de roteiro</Label><Input value={entrevistaForm.tipoRoteiro ?? ""} onChange={(event) => setEntrevistaForm((atual) => ({ ...atual, tipoRoteiro: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Data da entrevista</Label><Input type="date" value={entrevistaForm.dataEntrevista ?? ""} onChange={(event) => setEntrevistaForm((atual) => ({ ...atual, dataEntrevista: event.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Parecer</Label><Textarea rows={2} value={entrevistaForm.parecer ?? ""} onChange={(event) => setEntrevistaForm((atual) => ({ ...atual, parecer: event.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={entrevistaForm.observacoes ?? ""} onChange={(event) => setEntrevistaForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
            </div>
            <Button size="sm" onClick={() => void salvarEntrevista()} disabled={!processo?.id}><Plus className="mr-1.5 h-3.5 w-3.5" />Registrar entrevista</Button>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Parecer</th></tr></thead><tbody>{entrevistas.length ? entrevistas.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.dataEntrevista?.slice(0, 10) ?? "---"}</td><td className="px-3 py-2">{item.tipoRoteiro ?? "---"}</td><td className="px-3 py-2">{item.parecer ?? "---"}</td></tr>) : <tr><td colSpan={3} className="px-3 py-4 text-center">Nenhuma entrevista registrada.</td></tr>}</tbody></table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "documentos" ? (
          <section className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Documento</th><th className="px-3 py-2 text-left">Obrigatório</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{documentos.length ? documentos.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.tipoDocumento}</td><td className="px-3 py-2">{item.obrigatorio ? "Sim" : "Não"}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2 text-right space-x-1"><Button size="sm" variant="outline" onClick={() => void atualizarStatusDocumento(item.id, "ok")}>Marcar OK</Button><Button size="sm" variant="outline" onClick={() => void atualizarStatusDocumento(item.id, "pendente")}>Pendente</Button><Button size="sm" variant="outline" onClick={() => void atualizarStatusDocumento(item.id, "ignorado")}>Ignorar</Button></td></tr>) : <tr><td colSpan={4} className="px-3 py-4 text-center">Nenhum documento encontrado.</td></tr>}</tbody></table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "auditoria" ? (
          <section className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Ação</th><th className="px-3 py-2 text-left">Ator</th><th className="px-3 py-2 text-left">Detalhes</th></tr></thead><tbody>{auditoria.length ? auditoria.map((item, index) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.criadoEm?.slice(0, 19).replace("T", " ") ?? "---"}</td><td className="px-3 py-2">{item.acao}</td><td className="px-3 py-2">{item.atorNome ?? "Sistema"}</td><td className="px-3 py-2">{item.detalhes ?? "---"}</td></tr>) : <tr><td colSpan={4} className="px-3 py-4 text-center">Sem eventos de auditoria.</td></tr>}</tbody></table>
            </div>
          </section>
        ) : null}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarInativacao}
        titulo="Confirmar inativação"
        texto="Esta ação inativa o candidato. Deseja continuar?"
        processando={processando}
        onCancel={() => setConfirmarInativacao(false)}
        onConfirm={() => void confirmarInativacaoCandidato()}
        confirmarTexto="Inativar"
      />
    </>
  );
}
