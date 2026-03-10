import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  FolderOpen,
  ImageUp,
  List,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  Upload,
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
import {
  useAdicionarFotoEvento,
  useFotoEvento,
  useFotosEventos,
  useRemoverFotoEvento,
  useRemoverFotoItemEvento,
  useSalvarFotoEvento
} from "@/features/fotos-eventos/use-fotos-eventos";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import type { FotoEventoPayload, FotoUploadPayload } from "@/types/fotos-eventos";

type AbaId = "lista" | "cadastro" | "detalhe";

const abas: AdminTab[] = [
  { id: "lista", label: "Listagem", icon: List },
  { id: "cadastro", label: "Cadastro De Evento", icon: Camera },
  { id: "detalhe", label: "Detalhe E Galeria", icon: FolderOpen }
];

type FormState = FotoEventoPayload & { id?: number };

const defaultForm: FormState = {
  titulo: "",
  descricao: "",
  dataEvento: "",
  local: "",
  status: "PLANEJADO",
  tags: [],
  unidadeId: null,
  fotoPrincipalUpload: null
};

export function FotosEventosPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("lista");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [snapshot, setSnapshot] = useState<FormState>(defaultForm);
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [confirmarExcluirFotoId, setConfirmarExcluirFotoId] = useState<number | null>(null);

  const { data, isLoading } = useFotosEventos({
    busca,
    status: filtroStatus || undefined,
    pagina: 0,
    tamanho: 60
  });
  const detalheQuery = useFotoEvento(form.id);
  const salvarMutation = useSalvarFotoEvento();
  const removerMutation = useRemoverFotoEvento();
  const adicionarFotoMutation = useAdicionarFotoEvento();
  const removerFotoMutation = useRemoverFotoItemEvento();

  const eventos = data?.eventos ?? [];
  const detalhes = detalheQuery.data;
  const fotos = detalhes?.fotos ?? [];

  const carregandoAcoes =
    salvarMutation.isPending ||
    removerMutation.isPending ||
    adicionarFotoMutation.isPending ||
    removerFotoMutation.isPending;

  const totalFotos = useMemo(
    () => eventos.reduce((acc, item) => acc + Number(item.totalFotos ?? 0), 0),
    [eventos]
  );

  function novo() {
    setForm(defaultForm);
    setSnapshot(defaultForm);
    setAbaAtiva("cadastro");
  }

  function selecionar(id: number) {
    const evento = eventos.find((item) => item.id === id);
    if (!evento) return;
    const proximo: FormState = {
      id: evento.id,
      titulo: evento.titulo,
      descricao: evento.descricao ?? "",
      dataEvento: evento.dataEvento,
      local: evento.local ?? "",
      status: evento.status ?? "PLANEJADO",
      tags: evento.tags ?? [],
      unidadeId: evento.unidadeId ?? null,
      fotoPrincipalUpload: null,
      fotoPrincipalId: evento.fotoPrincipalId ?? null
    };
    setForm(proximo);
    setSnapshot(proximo);
    setAbaAtiva("detalhe");
  }

  function buscar() {
    setAbaAtiva("lista");
  }

  function cancelar() {
    setForm(snapshot);
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.dataEvento) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe título e data do evento."
      });
      return;
    }

    try {
      const payload: FormState = {
        ...form,
        titulo: form.titulo.trim(),
        descricao: form.descricao?.trim() || undefined,
        local: form.local?.trim() || undefined,
        tags: form.tags?.filter(Boolean)
      };

      const response = await salvarMutation.mutateAsync(payload);
      const proximo: FormState = {
        id: response.id,
        titulo: response.titulo,
        descricao: response.descricao ?? "",
        dataEvento: response.dataEvento,
        local: response.local ?? "",
        status: response.status ?? "PLANEJADO",
        tags: response.tags ?? [],
        unidadeId: response.unidadeId ?? null,
        fotoPrincipalUpload: null,
        fotoPrincipalId: response.fotoPrincipalId ?? null
      };
      setForm(proximo);
      setSnapshot(proximo);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Evento salvo com sucesso."
      });
      setAbaAtiva("detalhe");
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o evento."
      });
    }
  }

  function excluir() {
    if (!form.id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um evento para excluir."
      });
      return;
    }
    setConfirmarExcluir(true);
  }

  async function confirmarExclusao() {
    if (!form.id) return;
    try {
      await removerMutation.mutateAsync(form.id);
      setConfirmarExcluir(false);
      novo();
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Evento excluído com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o evento."
      });
    }
  }

  async function arquivoParaUpload(file: File): Promise<FotoUploadPayload> {
    const conteudo = await file.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      return btoa(binary);
    });

    return {
      nomeArquivo: file.name,
      contentType: file.type || "image/jpeg",
      conteudo
    };
  }

  async function onSelecionarFotoPrincipal(file: File) {
    const upload = await arquivoParaUpload(file);
    setForm((atual) => ({ ...atual, fotoPrincipalUpload: upload }));
    setPopupMensagem({
      tipo: "sucesso",
      titulo: "Confirmação",
      texto: "Foto principal pronta para salvar."
    });
  }

  async function adicionarFoto(file: File) {
    if (!form.id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Salve o evento antes de adicionar fotos."
      });
      return;
    }
    try {
      const upload = await arquivoParaUpload(file);
      await adicionarFotoMutation.mutateAsync({
        id: form.id,
        payload: {
          arquivo: upload,
          ordem: fotos.length + 1
        }
      });
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Foto adicionada com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível adicionar a foto."
      });
    }
  }

  async function confirmarExclusaoFoto() {
    if (!form.id || !confirmarExcluirFotoId) return;
    try {
      await removerFotoMutation.mutateAsync({ id: form.id, fotoId: confirmarExcluirFotoId });
      setConfirmarExcluirFotoId(null);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Foto removida com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível remover a foto."
      });
    }
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Relatório de fotos de eventos" });
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
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={form.id ? `Código: ${form.id}` : "Novo"}
      >
        {abaAtiva === "lista" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1 md:col-span-2">
                <Label>Busca</Label>
                <Input
                  placeholder="Título, local ou tags"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value)}>
                  <option value="">Todos</option>
                  <option value="PLANEJADO">Planejado</option>
                  <option value="REALIZADO">Realizado</option>
                  <option value="CANCELADO">Cancelado</option>
                  <option value="ARQUIVADO">Arquivado</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Eventos Cadastrados</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                  {eventos.length}
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total De Fotos</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                  {totalFotos}
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Eventos Realizados</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                  {eventos.filter((item) => item.status === "REALIZADO").length}
                </CardContent>
              </Card>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Título</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Local</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Fotos</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center">
                        Carregando eventos...
                      </td>
                    </tr>
                  ) : eventos.length ? (
                    eventos.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2 font-medium">{item.titulo}</td>
                        <td className="px-3 py-2">{item.dataEvento}</td>
                        <td className="px-3 py-2">{item.local ?? "---"}</td>
                        <td className="px-3 py-2">{item.status ?? "---"}</td>
                        <td className="px-3 py-2">{item.totalFotos ?? 0}</td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => selecionar(item.id)}>
                            Selecionar
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center">
                        Nenhum evento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "cadastro" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1 xl:col-span-2">
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={(event) => setForm((atual) => ({ ...atual, titulo: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Data Do Evento *</Label>
              <Input
                type="date"
                value={form.dataEvento}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, dataEvento: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={form.status ?? "PLANEJADO"}
                onChange={(event) => setForm((atual) => ({ ...atual, status: event.target.value }))}
              >
                <option value="PLANEJADO">Planejado</option>
                <option value="REALIZADO">Realizado</option>
                <option value="CANCELADO">Cancelado</option>
                <option value="ARQUIVADO">Arquivado</option>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Local</Label>
              <Input
                value={form.local ?? ""}
                onChange={(event) => setForm((atual) => ({ ...atual, local: event.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={form.descricao ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, descricao: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={(form.tags ?? []).join(", ")}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    tags: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  }))
                }
              />
            </div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Foto Principal</Label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="fotoPrincipalEvento"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void onSelecionarFotoPrincipal(file);
                    }
                    event.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("fotoPrincipalEvento")?.click()}
                >
                  <ImageUp className="mr-1 h-3.5 w-3.5" />
                  Selecionar Foto Principal
                </Button>
                <span className="text-sm text-[var(--g3-muted)]">
                  {form.fotoPrincipalUpload?.nomeArquivo ?? "Nenhuma foto selecionada"}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {abaAtiva === "detalhe" ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
              <div>
                <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                  {(detalhes?.evento?.titulo ?? form.titulo) || "Evento não selecionado"}
                </p>
                <p className="text-xs text-[var(--g3-muted)]">
                  {(detalhes?.evento?.dataEvento ?? form.dataEvento) || "---"} -{" "}
                  {(detalhes?.evento?.local ?? form.local) || "---"}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <input
                  id="galeriaEvento"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void adicionarFoto(file);
                    }
                    event.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  disabled={!form.id}
                  onClick={() => document.getElementById("galeriaEvento")?.click()}
                >
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  Adicionar Foto
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {fotos.length ? (
                fotos.map((item) => (
                  <Card key={item.id} className="overflow-hidden border-[var(--g3-border)]">
                    <div className="aspect-video w-full bg-slate-100">
                      {item.arquivoUrl ? (
                        <img
                          src={item.arquivoUrl}
                          alt={item.legenda ?? "Foto do evento"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-[var(--g3-muted)]">
                          Sem visualização
                        </div>
                      )}
                    </div>
                    <CardContent className="space-y-2 p-3">
                      <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                        {item.nomeArquivo ?? "Foto"}
                      </p>
                      <p className="text-xs text-[var(--g3-muted)]">{item.legenda ?? "---"}</p>
                      <div className="flex justify-end">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmarExcluirFotoId(item.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-[var(--g3-muted)]">Nenhuma foto cadastrada para este evento.</p>
              )}
            </div>
          </section>
        ) : null}
      </AdminPageLayout>

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarExcluir}
        titulo="Confirmar Exclusão"
        texto="Esta ação é irreversível. Deseja continuar?"
        processando={removerMutation.isPending}
        onCancel={() => setConfirmarExcluir(false)}
        onConfirm={() => void confirmarExclusao()}
        confirmarTexto="Excluir"
      />
      <PopupConfirmacao
        aberto={!!confirmarExcluirFotoId}
        titulo="Confirmar Exclusão"
        texto="Deseja excluir esta foto da galeria?"
        processando={removerFotoMutation.isPending}
        onCancel={() => setConfirmarExcluirFotoId(null)}
        onConfirm={() => void confirmarExclusaoFoto()}
        confirmarTexto="Excluir"
      />
    </>
  );
}

