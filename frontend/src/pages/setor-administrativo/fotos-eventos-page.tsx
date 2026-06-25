import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Camera,
  CheckCircle2,
  Edit3,
  FolderOpen,
  ImagePlus,
  Images,
  List,
  MapPin,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
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
  useAdicionarFotosEventoLote,
  useDefinirCapaEvento,
  useFotoEvento,
  useFotosEventos,
  useRemoverFotoEvento,
  useRemoverFotoItemEvento,
  useReordenarFotosEvento,
  useSalvarFotoEvento
} from "@/features/fotos-eventos/use-fotos-eventos";
import { obterUrlArquivoAutenticado, resolverUrlArquivo } from "@/lib/arquivos";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import type { FotoEventoFotoPayload, FotoEventoPayload, FotoUploadPayload } from "@/types/fotos-eventos";

type AbaId = "lista" | "cards" | "cadastro" | "detalhe";

type FormState = FotoEventoPayload & { id?: number };

type UploadPendente = {
  chave: string;
  arquivo: File;
  previewUrl: string;
};

const abas: AdminTab[] = [
  { id: "lista", label: "Listagem", icon: List },
  { id: "cards", label: "Mural de eventos", icon: Images },
  { id: "cadastro", label: "Cadastro do evento", icon: Camera },
  { id: "detalhe", label: "Álbum do evento", icon: FolderOpen }
];

const tituloTela = "Fotos de eventos";

const defaultForm: FormState = {
  titulo: "",
  descricao: "",
  dataEvento: "",
  local: "",
  status: "PLANEJADO",
  tags: [],
  unidadeId: null,
  fotoPrincipalUpload: null,
  fotoPrincipalId: null
};

function formatarData(valor?: string | null) {
  if (!valor) return "---";
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function classeStatus(status?: string | null) {
  if (status === "REALIZADO") return "bg-emerald-100 text-emerald-700";
  if (status === "CANCELADO") return "bg-rose-100 text-rose-700";
  if (status === "ARQUIVADO") return "bg-slate-200 text-slate-700";
  return "bg-amber-100 text-amber-700";
}

function cardIndicador(titulo: string, valor: string | number, apoio: string) {
  return (
    <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-sm text-[var(--g3-muted)]">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-3xl font-semibold tracking-tight text-[var(--g3-active)]">{valor}</p>
        <p className="text-xs text-[var(--g3-muted)]">{apoio}</p>
      </CardContent>
    </Card>
  );
}

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
  const [uploadsPendentes, setUploadsPendentes] = useState<UploadPendente[]>([]);
  const [capasMural, setCapasMural] = useState<Record<number, string>>({});
  const [imagensAlbum, setImagensAlbum] = useState<Record<number, string>>({});

  const { data, isLoading } = useFotosEventos({
    busca,
    status: filtroStatus || undefined,
    pagina: 0,
    tamanho: 60
  });
  const detalheQuery = useFotoEvento(form.id);
  const salvarMutation = useSalvarFotoEvento();
  const removerMutation = useRemoverFotoEvento();
  const adicionarFotosLoteMutation = useAdicionarFotosEventoLote();
  const definirCapaMutation = useDefinirCapaEvento();
  const removerFotoMutation = useRemoverFotoItemEvento();
  const reordenarFotosMutation = useReordenarFotosEvento();

  const eventos = useMemo(() => data?.eventos ?? [], [data?.eventos]);
  const detalhes = detalheQuery.data;
  const fotos = useMemo(() => detalhes?.fotos ?? [], [detalhes?.fotos]);
  const fotoPrincipalId = detalhes?.evento?.fotoPrincipalId ?? form.fotoPrincipalId ?? null;

  useEffect(() => {
    let ativo = true;
    const revokes: Array<() => void> = [];
    const eventosComCapa = eventos.filter((item) => item.fotoPrincipalUrl);

    if (!eventosComCapa.length) {
      setCapasMural({});
      return () => undefined;
    }

    void (async () => {
      const entradas = await Promise.all(
        eventosComCapa.map(async (item) => {
          try {
            const arquivo = await obterUrlArquivoAutenticado(item.fotoPrincipalUrl, { cache: true, auditar: false });
            if (arquivo.revoke) revokes.push(arquivo.revoke);
            return [item.id, arquivo.url || resolverUrlArquivo(item.fotoPrincipalUrl)] as const;
          } catch {
            return [item.id, resolverUrlArquivo(item.fotoPrincipalUrl)] as const;
          }
        })
      );

      if (ativo) {
        setCapasMural(Object.fromEntries(entradas));
      }
    })();

    return () => {
      ativo = false;
      revokes.forEach((revoke) => revoke());
    };
  }, [eventos]);

  useEffect(() => {
    let ativo = true;
    const revokes: Array<() => void> = [];
    const fotosComArquivo = fotos.filter((item) => item.arquivoUrl);

    if (!fotosComArquivo.length) {
      setImagensAlbum({});
      return () => undefined;
    }

    void (async () => {
      const entradas = await Promise.all(
        fotosComArquivo.map(async (item) => {
          try {
            const arquivo = await obterUrlArquivoAutenticado(item.arquivoUrl, { cache: true, auditar: false });
            if (arquivo.revoke) revokes.push(arquivo.revoke);
            return [item.id, arquivo.url || resolverUrlArquivo(item.arquivoUrl)] as const;
          } catch {
            return [item.id, resolverUrlArquivo(item.arquivoUrl)] as const;
          }
        })
      );

      if (ativo) {
        setImagensAlbum(Object.fromEntries(entradas));
      }
    })();

    return () => {
      ativo = false;
      revokes.forEach((revoke) => revoke());
    };
  }, [fotos]);

  const carregandoAcoes =
    salvarMutation.isPending ||
    removerMutation.isPending ||
    adicionarFotosLoteMutation.isPending ||
    definirCapaMutation.isPending ||
    removerFotoMutation.isPending ||
    reordenarFotosMutation.isPending;

  const totalFotos = useMemo(
    () => eventos.reduce((acc, item) => acc + Number(item.totalFotos ?? 0), 0),
    [eventos]
  );

  const indicadoresLista = useMemo(() => {
    const eventosSemCapa = eventos.filter((item) => !item.fotoPrincipalId).length;
    const eventoComMaisFotos = eventos.reduce<(typeof eventos)[number] | null>((maior, atual) => {
      if (!maior) return atual;
      return Number(atual.totalFotos ?? 0) > Number(maior.totalFotos ?? 0) ? atual : maior;
    }, null);

    return {
      eventosRealizados: eventos.filter((item) => item.status === "REALIZADO").length,
      eventosSemCapa,
      eventoComMaisFotos
    };
  }, [eventos]);

  const indicadoresDetalhe = useMemo(() => {
    const recentes = fotos.filter((item) => {
      if (!item.criadoEm) return false;
      const criado = new Date(item.criadoEm).getTime();
      const limite = Date.now() - 1000 * 60 * 60 * 24 * 7;
      return criado >= limite;
    }).length;

    return {
      totalFotos: fotos.length,
      semCapa: fotoPrincipalId ? 0 : fotos.length ? 1 : 0,
      recentes,
      ultimaAtualizacao:
        detalhes?.evento?.atualizadoEm != null
          ? new Date(detalhes.evento.atualizadoEm).toLocaleString("pt-BR")
          : "---"
    };
  }, [detalhes?.evento?.atualizadoEm, fotoPrincipalId, fotos]);

  function limparUploadsPendentes() {
    setUploadsPendentes([]);
  }

  function novo() {
    setForm(defaultForm);
    setSnapshot(defaultForm);
    limparUploadsPendentes();
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
    limparUploadsPendentes();
    setAbaAtiva("detalhe");
  }

  function buscar() {
    setAbaAtiva("lista");
  }

  function abrirCards() {
    setAbaAtiva("cards");
  }

  function cancelar() {
    setForm(snapshot);
    limparUploadsPendentes();
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

  function adicionarUploadsPendentes(files: FileList | File[]) {
    const lista = Array.from(files);
    if (!lista.length) return;

    setUploadsPendentes((atual) => [
      ...atual,
      ...lista.map((arquivo, index) => ({
        chave: `${arquivo.name}-${arquivo.size}-${Date.now()}-${index}`,
        arquivo,
        previewUrl: URL.createObjectURL(arquivo)
      }))
    ]);
  }

  async function persistirUploadsPendentes(eventoId: number) {
    if (!uploadsPendentes.length) return;

    const fotosPayload: FotoEventoFotoPayload[] = [];
    for (let index = 0; index < uploadsPendentes.length; index += 1) {
      const item = uploadsPendentes[index];
      const upload = await arquivoParaUpload(item.arquivo);
      fotosPayload.push({
        arquivo: upload,
        legenda: index === 0 ? "Foto do evento" : undefined,
        ordem: fotos.length + index + 1
      });
    }

    await adicionarFotosLoteMutation.mutateAsync({
      id: eventoId,
      payload: {
        fotos: fotosPayload,
        fotoPrincipalIndex: 0
      }
    });

    limparUploadsPendentes();
  }

  async function salvar(statusSobrescrito?: string) {
    if (!form.titulo.trim() || !form.dataEvento) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe título e data do evento."
      });
      return;
    }

    try {
      const quantidadeUploadsPendentes = uploadsPendentes.length;
      const payload: FormState = {
        ...form,
        titulo: form.titulo.trim(),
        descricao: form.descricao?.trim() || undefined,
        local: form.local?.trim() || undefined,
        status: statusSobrescrito ?? form.status ?? "PLANEJADO",
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
      setAbaAtiva("detalhe");

      try {
        await persistirUploadsPendentes(response.id);
        setPopupMensagem({
          tipo: "sucesso",
          titulo: "Confirmação",
          texto:
            quantidadeUploadsPendentes > 0
              ? "Evento salvo e fotos adicionadas com sucesso."
              : "Evento salvo com sucesso."
        });
      } catch (error: any) {
        setPopupMensagem({
          tipo: "aviso",
          titulo: "Atenção",
          texto:
            error?.response?.data?.message ??
            "O evento foi salvo, mas não foi possível concluir o envio das fotos."
        });
      }
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
      setAbaAtiva("lista");
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

  async function adicionarFotosNaGaleria(files: FileList | File[]) {
    if (!form.id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Salve o evento antes de adicionar fotos."
      });
      return;
    }

    const lista = Array.from(files);
    if (!lista.length) return;

    try {
      const fotosPayload: FotoEventoFotoPayload[] = [];
      for (let index = 0; index < lista.length; index += 1) {
        const arquivo = await arquivoParaUpload(lista[index]);
        fotosPayload.push({
          arquivo,
          legenda: "Foto do evento",
          ordem: fotos.length + index + 1
        });
      }

      await adicionarFotosLoteMutation.mutateAsync({
        id: form.id,
        payload: { fotos: fotosPayload }
      });

      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: lista.length === 1 ? "Foto adicionada com sucesso." : "Fotos adicionadas com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível adicionar as fotos."
      });
    }
  }

  async function definirCapa(fotoId: number) {
    if (!form.id) return;

    try {
      await definirCapaMutation.mutateAsync({ id: form.id, fotoId });
      setForm((atual) => ({ ...atual, fotoPrincipalId: fotoId }));
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Capa do álbum atualizada com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível definir a capa."
      });
    }
  }

  async function moverFoto(fotoId: number, direcao: "subir" | "descer") {
    if (!form.id || fotos.length < 2) return;
    const indiceAtual = fotos.findIndex((item) => item.id === fotoId);
    if (indiceAtual < 0) return;

    const indiceDestino = direcao === "subir" ? indiceAtual - 1 : indiceAtual + 1;
    if (indiceDestino < 0 || indiceDestino >= fotos.length) return;

    const ordenadas = [...fotos];
    const [fotoMovida] = ordenadas.splice(indiceAtual, 1);
    ordenadas.splice(indiceDestino, 0, fotoMovida);

    try {
      await reordenarFotosMutation.mutateAsync({
        id: form.id,
        fotoIds: ordenadas.map((item) => item.id)
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível reordenar as fotos."
      });
    }
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Relatório de fotos e eventos" });
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

  const acoes: AdminAction[] =
    abaAtiva === "lista"
      ? [
          { label: "Buscar eventos", icon: Search, onClick: buscar, variant: "outline" },
          { label: "Abrir mural", icon: Images, onClick: abrirCards, variant: "ghost" },
          { label: "Novo evento", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
          { label: "Imprimir", icon: Upload, onClick: imprimir, variant: "ghost", disabled: carregandoAcoes },
          { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
        ]
      : abaAtiva === "cards"
        ? [
            { label: "Voltar para listagem", icon: List, onClick: buscar, variant: "outline" },
            { label: "Novo evento", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
            { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
          ]
      : abaAtiva === "cadastro"
        ? [
            {
              label: "Salvar evento",
              icon: Save,
              onClick: () => void salvar(),
              variant: "default",
              disabled: carregandoAcoes
            },
            {
              label: "Cancelar edição",
              icon: Undo2,
              onClick: cancelar,
              variant: "outline",
              disabled: carregandoAcoes
            },
            {
              label: "Abrir álbum",
              icon: FolderOpen,
              onClick: () => setAbaAtiva("detalhe"),
              variant: "ghost",
              disabled: !form.id || carregandoAcoes
            },
            { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
          ]
        : [
            {
              label: "Adicionar fotos",
              icon: ImagePlus,
              onClick: () => document.getElementById("galeriaEvento")?.click(),
              variant: "default",
              disabled: !form.id || carregandoAcoes
            },
            {
              label: "Editar evento",
              icon: Edit3,
              onClick: () => setAbaAtiva("cadastro"),
              variant: "outline",
              disabled: carregandoAcoes
            },
            {
              label: "Publicar evento",
              icon: CheckCircle2,
              onClick: () => void salvar("REALIZADO"),
              variant: "ghost",
              disabled: carregandoAcoes || form.status === "REALIZADO"
            },
            {
              label: "Excluir evento",
              icon: Trash2,
              onClick: excluir,
              variant: "danger",
              disabled: carregandoAcoes || !form.id
            },
            { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
          ];

  const capaAtual = fotos.find((item) => item.id === fotoPrincipalId);

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Administração e gestão"
        pageTitle={tituloTela}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={form.id ? `Código: ${form.id}` : "Novo"}
      >
        {abaAtiva === "lista" ? (
          <section className="space-y-4">
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
              {cardIndicador("Total de eventos", eventos.length, "Todos os álbuns cadastrados")}
              {cardIndicador("Total de fotos", totalFotos, "Volume consolidado da galeria")}
              {cardIndicador("Eventos realizados", indicadoresLista.eventosRealizados, "Eventos com status finalizado")}
              {cardIndicador("Álbuns sem capa", indicadoresLista.eventosSemCapa, "Eventos que ainda precisam de imagem de destaque")}
              {cardIndicador(
                "Evento com mais fotos",
                indicadoresLista.eventoComMaisFotos?.totalFotos ?? 0,
                indicadoresLista.eventoComMaisFotos?.titulo ?? "Nenhum evento em destaque"
              )}
              {cardIndicador(
                "Status predominante",
                eventos[0]?.status ?? "---",
                "Lista ordenada pelos eventos mais recentes"
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Evento</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Local</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Fotos</th>
                    <th className="px-3 py-2 text-left">Capa</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-5 text-center">
                        Carregando eventos...
                      </td>
                    </tr>
                  ) : eventos.length ? (
                    eventos.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer border-t border-[var(--g3-border)] transition hover:bg-[var(--g3-primary-soft)]/40 ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/20"
                        }`}
                        onClick={() => selecionar(item.id)}
                      >
                        <td className="px-3 py-3">
                          <div className="min-w-[220px]">
                            <p className="font-medium text-[var(--g3-foreground)]">{item.titulo}</p>
                            <p className="text-xs text-[var(--g3-muted)]">{item.descricao ?? "Sem descrição"}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3">{formatarData(item.dataEvento)}</td>
                        <td className="px-3 py-3">{item.local ?? "---"}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${classeStatus(item.status)}`}>
                            {item.status ?? "---"}
                          </span>
                        </td>
                        <td className="px-3 py-3">{item.totalFotos ?? 0}</td>
                        <td className="px-3 py-3">{item.fotoPrincipalId ? "Definida" : "Pendente"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-5 text-center text-[var(--g3-muted)]">
                        Nenhum evento encontrado para os filtros informados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "cards" ? (
          <section className="space-y-4">
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

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {isLoading ? (
                <Card className="sm:col-span-2 xl:col-span-3 2xl:col-span-4 border-[var(--g3-border)]">
                  <CardContent className="py-10 text-center text-sm text-[var(--g3-muted)]">
                    Carregando cards dos eventos...
                  </CardContent>
                </Card>
              ) : eventos.length ? (
                eventos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="overflow-hidden rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--g3-active)] hover:shadow-md"
                    onClick={() => selecionar(item.id)}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[var(--g3-primary-soft)]">
                      {item.fotoPrincipalUrl ? (
                        <img
                          src={capasMural[item.id] || resolverUrlArquivo(item.fotoPrincipalUrl)}
                          alt={item.titulo}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--g3-muted)]">
                          <Images className="h-8 w-8" />
                          <span className="text-xs font-medium">Sem foto principal</span>
                        </div>
                      )}
                      <div className="absolute left-3 top-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold backdrop-blur ${classeStatus(item.status)}`}>
                          {item.status ?? "---"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 p-4">
                      <div>
                        <p className="line-clamp-2 text-sm font-semibold text-[var(--g3-foreground)]">
                          {item.titulo}
                        </p>
                        <p className="mt-1 text-xs text-[var(--g3-muted)]">
                          {item.local ?? "Local não informado"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-[var(--g3-muted)]">
                        <span>{formatarData(item.dataEvento)}</span>
                        <span>{item.totalFotos ?? 0} fotos</span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <Card className="sm:col-span-2 xl:col-span-3 2xl:col-span-4 border-[var(--g3-border)]">
                  <CardContent className="py-10 text-center text-sm text-[var(--g3-muted)]">
                    Nenhum evento encontrado para os filtros informados.
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        ) : null}

        {abaAtiva === "cadastro" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2">
                <Label>Título *</Label>
                <Input
                  value={form.titulo}
                  onChange={(event) => setForm((atual) => ({ ...atual, titulo: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Data do evento *</Label>
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
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm">Upload de fotos</CardTitle>
                    <p className="text-xs text-[var(--g3-muted)]">
                      Adicione várias imagens do evento e escolha visualmente a capa antes de salvar.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="fotosEventoCadastro"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        if (event.target.files?.length) {
                          adicionarUploadsPendentes(event.target.files);
                        }
                        event.target.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      disabled={carregandoAcoes}
                      onClick={() => document.getElementById("fotosEventoCadastro")?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Adicionar fotos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {uploadsPendentes.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {uploadsPendentes.map((item, index) => {
                        const selecionadaComoCapa = index === 0;
                        return (
                          <div
                            key={item.chave}
                            className={`overflow-hidden rounded-xl border ${
                              selecionadaComoCapa
                                ? "border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]"
                                : "border-[var(--g3-border)]"
                            } bg-white`}
                          >
                            <div className="relative aspect-video bg-slate-100">
                              <img
                                src={item.previewUrl}
                                alt={item.arquivo.name}
                                className="h-full w-full object-cover"
                              />
                              {selecionadaComoCapa ? (
                                <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
                                  Capa do álbum
                                </span>
                              ) : null}
                            </div>
                            <div className="space-y-3 p-3">
                              <div>
                                <p className="line-clamp-1 text-sm font-medium text-[var(--g3-foreground)]">
                                  {item.arquivo.name}
                                </p>
                                <p className="text-xs text-[var(--g3-muted)]">
                                  {(item.arquivo.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant={selecionadaComoCapa ? "default" : "outline"}
                                  onClick={() =>
                                    setUploadsPendentes((atual) => {
                                      const indice = atual.findIndex((foto) => foto.chave === item.chave);
                                      if (indice <= 0) return atual;
                                      const novaLista = [...atual];
                                      const [fotoSelecionada] = novaLista.splice(indice, 1);
                                      novaLista.unshift(fotoSelecionada);
                                      return novaLista;
                                    })
                                  }
                                >
                                  <Star className="mr-1 h-3.5 w-3.5" />
                                  Definir capa
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setUploadsPendentes((atual) =>
                                      atual.filter((foto) => foto.chave !== item.chave)
                                    )
                                  }
                                >
                                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                                  Remover
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/25 px-6 text-center">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[var(--g3-foreground)]">
                          Nenhuma foto preparada para o evento
                        </p>
                        <p className="text-xs text-[var(--g3-muted)]">
                          Use Adicionar fotos para montar o álbum antes de salvar ou continue apenas com os dados do evento.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-3">
                {cardIndicador("Fotos preparadas", uploadsPendentes.length, "Arquivos pendentes de persistência")}
                {cardIndicador("Capa pronta", uploadsPendentes.length ? "Sim" : "Não", "A primeira imagem pendente será enviada como destaque")}
                {cardIndicador("Status do evento", form.status ?? "PLANEJADO", "Defina o estágio operacional do álbum")}
                {cardIndicador("Publicação", form.id ? "Evento salvo" : "Em cadastro", "A galeria completa é liberada após salvar")}
              </div>
            </div>
          </section>
        ) : null}

        {abaAtiva === "detalhe" ? (
          <section className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="overflow-hidden border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
                <div className="grid gap-0">
                  <div className="aspect-[16/9] bg-slate-100">
                    {capaAtual?.arquivoUrl ? (
                      <img
                        src={imagensAlbum[capaAtual.id] || resolverUrlArquivo(capaAtual.arquivoUrl)}
                        alt={capaAtual.legenda ?? "Capa do evento"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[var(--g3-primary-soft)]/30">
                        <div className="space-y-2 text-center">
                          <Images className="mx-auto h-10 w-10 text-[var(--g3-muted)]" />
                          <p className="text-sm text-[var(--g3-muted)]">Este evento ainda não possui capa definida.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-4 p-5">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${classeStatus(detalhes?.evento?.status ?? form.status)}`}>
                          {detalhes?.evento?.status ?? form.status ?? "PLANEJADO"}
                        </span>
                        {fotoPrincipalId ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                            Capa definida
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                            Capa pendente
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-semibold tracking-tight text-[var(--g3-foreground)]">
                        {(detalhes?.evento?.titulo ?? form.titulo) || "Evento não selecionado"}
                      </h2>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[var(--g3-border)] bg-white p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">
                          <CalendarDays className="h-4 w-4 text-[var(--g3-active)]" />
                          Data do evento
                        </div>
                        <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                          {formatarData(detalhes?.evento?.dataEvento ?? form.dataEvento)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--g3-border)] bg-white p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">
                          <MapPin className="h-4 w-4 text-[var(--g3-active)]" />
                          Local
                        </div>
                        <p className="text-sm font-semibold text-[var(--g3-foreground)]">{detalhes?.evento?.local ?? form.local ?? "---"}</p>
                      </div>
                    </div>
                    {String(detalhes?.evento?.descricao ?? form.descricao ?? "").trim() ? (
                      <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Descrição</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--g3-muted)]">
                          {detalhes?.evento?.descricao ?? form.descricao}
                        </p>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <input
                        id="galeriaEvento"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          if (event.target.files?.length) {
                            void adicionarFotosNaGaleria(event.target.files);
                          }
                          event.target.value = "";
                        }}
                      />
                      <Button
                        variant="default"
                        disabled={!form.id || carregandoAcoes}
                        onClick={() => document.getElementById("galeriaEvento")?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Adicionar fotos
                      </Button>
                      <Button variant="outline" disabled={!form.id || carregandoAcoes} onClick={() => setAbaAtiva("cadastro")}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Editar evento
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>

              <div className="grid gap-3">
                {cardIndicador("Fotos do evento", indicadoresDetalhe.totalFotos, "Total atual do álbum")}
                {cardIndicador("Fotos recentes", indicadoresDetalhe.recentes, "Incluídas nos últimos 7 dias")}
                {cardIndicador("Fotos sem capa", indicadoresDetalhe.semCapa, "Controle de destaque do álbum")}
                {cardIndicador("Última atualização", indicadoresDetalhe.ultimaAtualizacao, "Persistência sincronizada com o banco")}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {detalheQuery.isLoading ? (
                <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm sm:col-span-2 xl:col-span-3">
                  <CardContent className="py-10 text-center text-sm text-[var(--g3-muted)]">
                    Carregando galeria do evento...
                  </CardContent>
                </Card>
              ) : fotos.length ? (
                fotos.map((item, index) => {
                  const ehCapa = item.id === fotoPrincipalId;
                  return (
                    <Card
                      key={item.id}
                      className={`overflow-hidden border shadow-sm transition ${
                        ehCapa
                          ? "border-emerald-400 shadow-[0_10px_30px_-15px_rgba(16,185,129,0.6)]"
                          : "border-[var(--g3-border)]"
                      }`}
                    >
                      <div className="relative aspect-video bg-slate-100">
                        {item.arquivoUrl ? (
                          <img
                            src={imagensAlbum[item.id] || resolverUrlArquivo(item.arquivoUrl)}
                            alt={item.legenda ?? "Foto do evento"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-[var(--g3-muted)]">
                            Sem visualização
                          </div>
                        )}
                        {ehCapa ? (
                          <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
                            Capa do álbum
                          </span>
                        ) : null}
                      </div>
                      <CardContent className="space-y-3 p-4">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="line-clamp-1 text-sm font-semibold text-[var(--g3-foreground)]">
                                {item.nomeArquivo ?? "Foto"}
                              </p>
                              <p className="text-xs text-[var(--g3-muted)]">{item.legenda ?? "Sem legenda cadastrada"}</p>
                            </div>
                            <span className="rounded-full bg-[var(--g3-primary-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--g3-active)]">
                              Ordem {index + 1}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant={ehCapa ? "default" : "outline"}
                            title="Definir capa"
                            disabled={ehCapa || carregandoAcoes}
                            onClick={() => void definirCapa(item.id)}
                          >
                            <Star className="mr-1 h-3.5 w-3.5" />
                            {ehCapa ? "Capa atual" : "Definir capa"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Editar evento"
                            disabled={carregandoAcoes}
                            onClick={() => setAbaAtiva("cadastro")}
                          >
                            <Edit3 className="mr-1 h-3.5 w-3.5" />
                            Editar evento
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Mover para cima"
                            disabled={carregandoAcoes || index === 0}
                            onClick={() => void moverFoto(item.id, "subir")}
                          >
                            <ArrowUp className="mr-1 h-3.5 w-3.5" />
                            Reordenar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Mover para baixo"
                            disabled={carregandoAcoes || index === fotos.length - 1}
                            onClick={() => void moverFoto(item.id, "descer")}
                          >
                            <ArrowDown className="mr-1 h-3.5 w-3.5" />
                            Reordenar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            className="col-span-2"
                            title="Excluir foto"
                            disabled={carregandoAcoes}
                            onClick={() => setConfirmarExcluirFotoId(item.id)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Excluir foto
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm sm:col-span-2 xl:col-span-3">
                  <CardContent className="py-12 text-center">
                    <div className="mx-auto max-w-md space-y-2">
                      <Sparkles className="mx-auto h-10 w-10 text-[var(--g3-muted)]" />
                      <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                        A galeria ainda está vazia
                      </p>
                      <p className="text-xs text-[var(--g3-muted)]">
                        Use Adicionar fotos para montar o álbum, definir a capa e organizar a ordem visual do evento.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        ) : null}
      </AdminPageLayout>

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}

      <PopupConfirmacao
        aberto={confirmarExcluir}
        titulo="Confirmar exclusão"
        texto="Esta ação é irreversível. Deseja realmente continuar?"
        processando={removerMutation.isPending}
        onCancel={() => setConfirmarExcluir(false)}
        onConfirm={() => void confirmarExclusao()}
        confirmarTexto="Excluir"
      />

      <PopupConfirmacao
        aberto={!!confirmarExcluirFotoId}
        titulo="Confirmar exclusão"
        texto="Deseja excluir esta foto da galeria?"
        processando={removerFotoMutation.isPending}
        onCancel={() => setConfirmarExcluirFotoId(null)}
        onConfirm={() => void confirmarExclusaoFoto()}
        confirmarTexto="Excluir"
      />
    </>
  );
}
