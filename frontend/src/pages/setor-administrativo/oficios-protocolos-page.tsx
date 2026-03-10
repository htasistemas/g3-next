import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  ListChecks,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { useExcluirOficio, useOficios, useSalvarOficio } from "@/features/oficios/use-oficios";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import type { OficioPayload, OficioTramite } from "@/types/oficio";
import { useAuth } from "@/hooks/use-auth";

type AbaId = "dashboard" | "identificacao" | "conteudo" | "tramitacao" | "listagem";

const abas: AdminTab[] = [
  { id: "dashboard", label: "Dashboard", icon: ClipboardList },
  { id: "identificacao", label: "Identificação E Protocolo", icon: FileText },
  { id: "conteudo", label: "Redação Do Ofício", icon: FileText },
  { id: "tramitacao", label: "Tramitação E Acompanhamento", icon: ListChecks },
  { id: "listagem", label: "Ofícios Registrados", icon: ListChecks }
];

const tituloTela = "Ofícios e protocolos";

const hojeIso = new Date().toISOString().slice(0, 10);

const defaultForm: OficioPayload = {
  identificacao: {
    tipo: "emissao",
    numero: "",
    data: hojeIso,
    setorOrigem: "",
    responsavel: "",
    destinatario: "",
    destinatarioResponsavel: "",
    destinatarioCargo: "",
    meioEnvio: "Sistema G3",
    prazoResposta: "",
    classificacao: ""
  },
  conteudo: {
    razaoSocial: "",
    logoUrl: "",
    titulo: "",
    saudacao: "",
    para: "",
    cargoPara: "",
    assunto: "",
    corpo: "",
    finalizacao: "",
    assinaturaNome: "",
    assinaturaCargo: "",
    rodape: ""
  },
  protocolo: {
    status: "Rascunho",
    protocoloEnvio: "",
    dataEnvio: "",
    protocoloRecebimento: "",
    dataRecebimento: "",
    proximoDestino: "",
    observacoes: ""
  },
  tramites: []
};

export function OficiosProtocolosPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("dashboard");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<OficioPayload>(defaultForm);
  const [snapshot, setSnapshot] = useState<OficioPayload>(defaultForm);
  const [tramite, setTramite] = useState<OficioTramite>({
    data: hojeIso,
    origem: "",
    destino: "",
    responsavel: "",
    acao: "",
    observacoes: ""
  });
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);

  const { data } = useOficios();
  const salvarMutation = useSalvarOficio();
  const excluirMutation = useExcluirOficio();

  const oficios = data?.oficios ?? [];

  const oficiosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return oficios;
    return oficios.filter((item) => {
      const alvo = `${item.identificacao.numero} ${item.conteudo.assunto} ${item.identificacao.responsavel} ${item.protocolo.status}`;
      return alvo.toLowerCase().includes(termo);
    });
  }, [busca, oficios]);

  const dashboard = useMemo(() => {
    return {
      total: oficios.length,
      recebidos: oficios.filter((item) => item.identificacao.tipo === "recebimento").length,
      emitidos: oficios.filter((item) => item.identificacao.tipo === "emissao").length,
      enviados: oficios.filter((item) => item.protocolo.status === "Enviado").length,
      emAnalise: oficios.filter((item) => item.protocolo.status === "Em analise").length,
      arquivados: oficios.filter((item) => item.protocolo.status === "Arquivado").length
    };
  }, [oficios]);

  const carregandoAcoes = salvarMutation.isPending || excluirMutation.isPending;

  function novo() {
    setForm(defaultForm);
    setSnapshot(defaultForm);
    setTramite({
      data: hojeIso,
      origem: "",
      destino: "",
      responsavel: "",
      acao: "",
      observacoes: ""
    });
    setAbaAtiva("identificacao");
  }

  function selecionar(item: OficioPayload) {
    const proximo: OficioPayload = {
      ...item,
      tramites: item.tramites ?? []
    };
    setForm(proximo);
    setSnapshot(proximo);
    setAbaAtiva("identificacao");
  }

  function buscar() {
    setAbaAtiva("listagem");
  }

  function cancelar() {
    setForm(snapshot);
  }

  async function salvar() {
    const numero = form.identificacao.numero.trim();
    const responsavel = form.identificacao.responsavel.trim();
    const assunto = form.conteudo.assunto.trim();
    const corpo = form.conteudo.corpo.trim();
    const razao = form.conteudo.razaoSocial.trim();

    if (!numero || !responsavel || !assunto || !corpo || !razao) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Preencha número, responsável, razão social, assunto e corpo do ofício."
      });
      return;
    }

    try {
      const payload: OficioPayload = {
        ...form,
        criadoPor: Number(usuario?.id) || undefined,
        identificacao: {
          ...form.identificacao,
          numero,
          responsavel,
          setorOrigem: form.identificacao.setorOrigem.trim(),
          meioEnvio: form.identificacao.meioEnvio.trim()
        },
        conteudo: {
          ...form.conteudo,
          razaoSocial: razao,
          assunto,
          corpo
        },
        tramites: (form.tramites ?? []).filter((item) => item.acao && item.acao.trim().length > 0)
      };

      const response = await salvarMutation.mutateAsync(payload);
      setForm(response);
      setSnapshot(response);
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Ofício salvo com sucesso." });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o ofício."
      });
    }
  }

  function excluir() {
    if (!form.id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um ofício para excluir."
      });
      return;
    }
    setConfirmarExcluir(true);
  }

  async function confirmarExclusao() {
    if (!form.id) return;
    try {
      await excluirMutation.mutateAsync(form.id);
      setConfirmarExcluir(false);
      novo();
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Ofício excluído com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o ofício."
      });
    }
  }

  function adicionarTramite() {
    if (!tramite.acao.trim()) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe a ação da tramitação."
      });
      return;
    }
    setForm((atual) => ({
      ...atual,
      tramites: [...(atual.tramites ?? []), { ...tramite }]
    }));
    setTramite({
      data: hojeIso,
      origem: "",
      destino: "",
      responsavel: "",
      acao: "",
      observacoes: ""
    });
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Relatório de ofícios" });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível preparar a impressão."
      });
    }
  }

  function fechar() {
    navigate("/dashboard/visao-geral");
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: buscar, variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
    { label: "Excluir", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
    { label: "Imprimir", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
    { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Setor administrativo"
        pageTitle={tituloTela}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={form.id ? `Código: ${form.id}` : "Novo"}
      >
        {abaAtiva === "dashboard" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total De Ofícios</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                {dashboard.total}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Emitidos</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                {dashboard.emitidos}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recebidos</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                {dashboard.recebidos}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Enviados</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-amber-600">
                {dashboard.enviados}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Em Análise</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-amber-600">
                {dashboard.emAnalise}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Arquivados</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-danger)]">
                {dashboard.arquivados}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {abaAtiva === "identificacao" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={form.identificacao.tipo}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    identificacao: {
                      ...atual.identificacao,
                      tipo: event.target.value as "emissao" | "recebimento"
                    }
                  }))
                }
              >
                <option value="emissao">Emissão</option>
                <option value="recebimento">Recebimento</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Número *</Label>
              <Input
                value={form.identificacao.numero}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    identificacao: { ...atual.identificacao, numero: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Data *</Label>
              <Input
                type="date"
                value={form.identificacao.data}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    identificacao: { ...atual.identificacao, data: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Meio De Envio *</Label>
              <Select
                value={form.identificacao.meioEnvio}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    identificacao: { ...atual.identificacao, meioEnvio: event.target.value }
                  }))
                }
              >
                <option value="Sistema G3">Sistema G3</option>
                <option value="E-mail">E-mail</option>
                <option value="Correio">Correio</option>
                <option value="Entrega presencial">Entrega presencial</option>
              </Select>
            </div>
            <div className="space-y-1 xl:col-span-2">
              <Label>Setor De Origem *</Label>
              <Input
                value={form.identificacao.setorOrigem}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    identificacao: { ...atual.identificacao, setorOrigem: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1 xl:col-span-2">
              <Label>Responsável *</Label>
              <Input
                value={form.identificacao.responsavel}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    identificacao: { ...atual.identificacao, responsavel: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Prazo De Resposta</Label>
              <Input
                value={form.identificacao.prazoResposta ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    identificacao: { ...atual.identificacao, prazoResposta: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Classificação</Label>
              <Input
                value={form.identificacao.classificacao ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    identificacao: { ...atual.identificacao, classificacao: event.target.value }
                  }))
                }
              />
            </div>
          </section>
        ) : null}

        {abaAtiva === "conteudo" ? (
          <section className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Razão Social *</Label>
              <Input
                value={form.conteudo.razaoSocial}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    conteudo: { ...atual.conteudo, razaoSocial: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Assunto *</Label>
              <Input
                value={form.conteudo.assunto}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    conteudo: { ...atual.conteudo, assunto: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Corpo Do Ofício *</Label>
              <Textarea
                rows={10}
                value={form.conteudo.corpo}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    conteudo: { ...atual.conteudo, corpo: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Assinatura Nome</Label>
              <Input
                value={form.conteudo.assinaturaNome ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    conteudo: { ...atual.conteudo, assinaturaNome: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Assinatura Cargo</Label>
              <Input
                value={form.conteudo.assinaturaCargo ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    conteudo: { ...atual.conteudo, assinaturaCargo: event.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Rodapé</Label>
              <Textarea
                rows={2}
                value={form.conteudo.rodape ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    conteudo: { ...atual.conteudo, rodape: event.target.value }
                  }))
                }
              />
            </div>
          </section>
        ) : null}

        {abaAtiva === "tramitacao" ? (
          <section className="space-y-3">
            <div className="grid gap-3 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={tramite.data ?? ""}
                  onChange={(event) => setTramite((atual) => ({ ...atual, data: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Origem</Label>
                <Input
                  value={tramite.origem ?? ""}
                  onChange={(event) => setTramite((atual) => ({ ...atual, origem: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Destino</Label>
                <Input
                  value={tramite.destino ?? ""}
                  onChange={(event) => setTramite((atual) => ({ ...atual, destino: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Responsável</Label>
                <Input
                  value={tramite.responsavel ?? ""}
                  onChange={(event) =>
                    setTramite((atual) => ({ ...atual, responsavel: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Aão *</Label>
                <Input
                  value={tramite.acao}
                  onChange={(event) => setTramite((atual) => ({ ...atual, acao: event.target.value }))}
                />
              </div>
              <div className="space-y-1 md:col-span-2 xl:col-span-5">
                <Label>Observações</Label>
                <Textarea
                  rows={2}
                  value={tramite.observacoes ?? ""}
                  onChange={(event) =>
                    setTramite((atual) => ({ ...atual, observacoes: event.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2 xl:col-span-5">
                <Button onClick={adicionarTramite}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Adicionar Tramitação
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Origem</th>
                    <th className="px-3 py-2 text-left">Destino</th>
                    <th className="px-3 py-2 text-left">Responsável</th>
                    <th className="px-3 py-2 text-left">Aão</th>
                    <th className="px-3 py-2 text-left">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.tramites ?? []).length ? (
                    (form.tramites ?? []).map((item, index) => (
                      <tr
                        key={`${item.data}-${item.acao}-${index}`}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2">{item.data ?? "---"}</td>
                        <td className="px-3 py-2">{item.origem ?? "---"}</td>
                        <td className="px-3 py-2">{item.destino ?? "---"}</td>
                        <td className="px-3 py-2">{item.responsavel ?? "---"}</td>
                        <td className="px-3 py-2">{item.acao}</td>
                        <td className="px-3 py-2">{item.observacoes ?? "---"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center">
                        Nenhum registro de tramitação.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "listagem" ? (
          <section className="space-y-3">
            <div className="space-y-1">
              <Label>Buscar Ofício</Label>
              <Input
                placeholder="Número, assunto, responsável ou status"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Número</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Assunto</th>
                    <th className="px-3 py-2 text-left">Responsável</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {oficiosFiltrados.length ? (
                    oficiosFiltrados.map((item, index) => (
                      <tr
                        key={item.id ?? `${item.identificacao.numero}-${index}`}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2">{item.identificacao.numero}</td>
                        <td className="px-3 py-2">{item.identificacao.data}</td>
                        <td className="px-3 py-2">{item.conteudo.assunto}</td>
                        <td className="px-3 py-2">{item.identificacao.responsavel}</td>
                        <td className="px-3 py-2">{item.protocolo.status}</td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => selecionar(item)}>
                            Selecionar
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center">
                        Nenhum ofício encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </AdminPageLayout>

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarExcluir}
        titulo="Confirmar Exclusão"
        texto="Esta ação é irreversível. Deseja continuar?"
        processando={excluirMutation.isPending}
        onCancel={() => setConfirmarExcluir(false)}
        onConfirm={() => void confirmarExclusao()}
        confirmarTexto="Excluir"
      />
    </>
  );
}

