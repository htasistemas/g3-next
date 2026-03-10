import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FilePlus2,
  FileSignature,
  Files,
  List,
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
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import {
  useAdicionarAditivoTermoFomento,
  useExcluirTermoFomento,
  useSalvarTermoFomento,
  useTermosFomento
} from "@/features/termos-fomento/use-termos-fomento";
import type { AditivoTermoFomento, TermoDocumento, TermoFomentoPayload } from "@/types/termo-fomento";

type AbaId = "listagem" | "dadosGerais" | "documentos" | "aditivos";

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem De Termos", icon: List },
  { id: "dadosGerais", label: "Dados Gerais", icon: FileSignature },
  { id: "documentos", label: "Documentos", icon: Files },
  { id: "aditivos", label: "Aditivos", icon: FilePlus2 }
];

const termoVazio: TermoFomentoPayload = {
  numeroTermo: "",
  tipoTermo: "Municipio",
  situacao: "Ativo",
  documentosRelacionados: [],
  aditivos: []
};

const aditivoVazio: AditivoTermoFomento = {
  tipoAditivo: "",
  dataAditivo: new Date().toISOString().slice(0, 10)
};

const documentoVazio: TermoDocumento = {
  nome: "",
  tipo: "outro"
};

export function TermoFomentoPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [termoIdSelecionado, setTermoIdSelecionado] = useState<string>();
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState<TermoFomentoPayload>(termoVazio);
  const [snapshot, setSnapshot] = useState<TermoFomentoPayload>(termoVazio);
  const [novoAditivo, setNovoAditivo] = useState<AditivoTermoFomento>(aditivoVazio);
  const [novoDocumento, setNovoDocumento] = useState<TermoDocumento>(documentoVazio);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const termosQuery = useTermosFomento();
  const salvarMutation = useSalvarTermoFomento();
  const excluirMutation = useExcluirTermoFomento();
  const adicionarAditivoMutation = useAdicionarAditivoTermoFomento();

  const termos = termosQuery.data ?? [];
  const termosFiltrados = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (!termo) return termos;
    return termos.filter((item) => {
      const alvo = `${item.numeroTermo} ${item.tipoTermo} ${item.orgaoConcedente ?? ""} ${item.situacao}`;
      return alvo.toLowerCase().includes(termo);
    });
  }, [filtro, termos]);

  const processando =
    salvarMutation.isPending || excluirMutation.isPending || adicionarAditivoMutation.isPending;

  function novo() {
    setTermoIdSelecionado(undefined);
    setForm(termoVazio);
    setSnapshot(termoVazio);
    setNovoAditivo(aditivoVazio);
    setNovoDocumento(documentoVazio);
    setAbaAtiva("dadosGerais");
  }

  function selecionarTermo(id: string) {
    const termo = termos.find((item) => item.id === id);
    if (!termo) return;
    const normalizado: TermoFomentoPayload = {
      ...termo,
      documentosRelacionados: termo.documentosRelacionados ?? [],
      aditivos: termo.aditivos ?? []
    };
    setTermoIdSelecionado(termo.id);
    setForm(normalizado);
    setSnapshot(normalizado);
    setAbaAtiva("dadosGerais");
  }

  function cancelar() {
    setForm(snapshot);
  }

  async function salvar() {
    if (!form.numeroTermo?.trim() || !form.tipoTermo || !form.situacao) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Preencha número do termo, tipo e situação."
      });
      return;
    }
    try {
      const response = await salvarMutation.mutateAsync({
        id: termoIdSelecionado,
        payload: {
          ...form,
          documentosRelacionados: form.documentosRelacionados ?? [],
          aditivos: form.aditivos ?? []
        }
      });
      setTermoIdSelecionado(response.id);
      setForm(response);
      setSnapshot(response);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Termo salvo com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o termo."
      });
    }
  }

  async function confirmarExclusaoTermo() {
    if (!termoIdSelecionado) return;
    try {
      await excluirMutation.mutateAsync(termoIdSelecionado);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Termo excluído com sucesso." });
      setConfirmarExclusao(false);
      novo();
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o termo."
      });
    }
  }

  function adicionarDocumentoRelacionado() {
    if (!novoDocumento.nome?.trim()) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe o nome do documento."
      });
      return;
    }
    setForm((atual) => ({
      ...atual,
      documentosRelacionados: [...(atual.documentosRelacionados ?? []), novoDocumento]
    }));
    setNovoDocumento(documentoVazio);
  }

  function removerDocumentoRelacionado(indice: number) {
    setForm((atual) => ({
      ...atual,
      documentosRelacionados: (atual.documentosRelacionados ?? []).filter((_, idx) => idx !== indice)
    }));
  }

  async function adicionarAditivo() {
    if (!novoAditivo.tipoAditivo?.trim() || !novoAditivo.dataAditivo) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Preencha tipo e data do aditivo."
      });
      return;
    }

    if (termoIdSelecionado) {
      try {
        const response = await adicionarAditivoMutation.mutateAsync({
          termoId: termoIdSelecionado,
          payload: novoAditivo
        });
        setForm(response);
        setSnapshot(response);
        setNovoAditivo(aditivoVazio);
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Aditivo adicionado com sucesso." });
        return;
      } catch (error: any) {
        setPopup({
          tipo: "erro",
          titulo: "Erro",
          texto: error?.response?.data?.message ?? "Não foi possível adicionar o aditivo."
        });
        return;
      }
    }

    setForm((atual) => ({
      ...atual,
      aditivos: [...(atual.aditivos ?? []), novoAditivo]
    }));
    setNovoAditivo(aditivoVazio);
  }

  function removerAditivo(indice: number) {
    setForm((atual) => ({
      ...atual,
      aditivos: (atual.aditivos ?? []).filter((_, idx) => idx !== indice)
    }));
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbaAtiva("listagem"), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: processando },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: processando },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: processando },
    {
      label: "Excluir",
      icon: Trash2,
      onClick: () => setConfirmarExclusao(true),
      variant: "danger",
      disabled: processando || !termoIdSelecionado
    },
    {
      label: "Imprimir",
      icon: Printer,
      onClick: () => {
        try {
          imprimirConteudoAtual({ titulo: "Termo de fomento" });
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
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={termoIdSelecionado ? `Código: ${termoIdSelecionado}` : "Novo"}
      >
        {abaAtiva === "listagem" ? (
          <section className="space-y-3">
            <div className="space-y-1">
              <Label>Pesquisar termo</Label>
              <Input
                placeholder="número, Órgão concedente ou situação"
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
              />
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">número</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Órgão concedente</th>
                    <th className="px-3 py-2 text-left">situação</th>
                  </tr>
                </thead>
                <tbody>
                  {termosQuery.isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center">
                        Carregando termos...
                      </td>
                    </tr>
                  ) : termosFiltrados.length ? (
                    termosFiltrados.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                        onClick={() => selecionarTermo(item.id)}
                      >
                        <td className="px-3 py-2 font-medium">{item.numeroTermo}</td>
                        <td className="px-3 py-2">{item.tipoTermo}</td>
                        <td className="px-3 py-2">{item.orgaoConcedente ?? "---"}</td>
                        <td className="px-3 py-2">{item.situacao}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center">
                        Nenhum termo encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "dadosGerais" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label>número do termo *</Label>
              <Input
                value={form.numeroTermo}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, numeroTermo: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo do termo *</Label>
              <Select
                value={form.tipoTermo}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, tipoTermo: event.target.value }))
                }
              >
                <option value="Uniao">União</option>
                <option value="Estado">Estado</option>
                <option value="Municipio">Município</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>situação *</Label>
              <Select
                value={form.situacao}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, situacao: event.target.value }))
                }
              >
                <option value="Ativo">Ativo</option>
                <option value="Aditivado">Aditivado</option>
                <option value="Encerrado">Encerrado</option>
                <option value="Cancelado">Cancelado</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Valor global</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.valorGlobal ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    valorGlobal: event.target.value ? Number(event.target.value) : undefined
                  }))
                }
              />
            </div>
            <div className="space-y-1 xl:col-span-2">
              <Label>Órgão concedente</Label>
              <Input
                value={form.orgaoConcedente ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, orgaoConcedente: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Data de assinatura</Label>
              <Input
                type="date"
                value={form.dataAssinatura ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, dataAssinatura: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Data de início da vigência</Label>
              <Input
                type="date"
                value={form.dataInicioVigencia ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, dataInicioVigencia: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Data de fim da vigência</Label>
              <Input
                type="date"
                value={form.dataFimVigencia ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, dataFimVigencia: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1 xl:col-span-2">
              <Label>Responsável interno</Label>
              <Input
                value={form.responsavelInterno ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, responsavelInterno: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Descrição do objeto</Label>
              <Textarea
                rows={3}
                value={form.descricaoObjeto ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, descricaoObjeto: event.target.value }))
                }
              />
            </div>
          </section>
        ) : null}

        {abaAtiva === "documentos" ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Documento principal do termo</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input
                    value={form.termoDocumento?.nome ?? ""}
                    onChange={(event) =>
                      setForm((atual) => ({
                        ...atual,
                        termoDocumento: {
                          id: atual.termoDocumento?.id,
                          tipo: "termo",
                          nome: event.target.value,
                          dataUrl: atual.termoDocumento?.dataUrl
                        }
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>URL / arquivo</Label>
                  <Input
                    value={form.termoDocumento?.dataUrl ?? ""}
                    onChange={(event) =>
                      setForm((atual) => ({
                        ...atual,
                        termoDocumento: {
                          id: atual.termoDocumento?.id,
                          tipo: "termo",
                          nome: atual.termoDocumento?.nome ?? "",
                          dataUrl: event.target.value
                        }
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Documentos relacionados</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Nome do documento</Label>
                  <Input
                    value={novoDocumento.nome}
                    onChange={(event) =>
                      setNovoDocumento((atual) => ({ ...atual, nome: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select
                    value={novoDocumento.tipo}
                    onChange={(event) =>
                      setNovoDocumento((atual) => ({
                        ...atual,
                        tipo: event.target.value as TermoDocumento["tipo"]
                      }))
                    }
                  >
                    <option value="outro">Outro</option>
                    <option value="termo">Termo</option>
                    <option value="aditivo">Aditivo</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>URL / arquivo</Label>
                  <Input
                    value={novoDocumento.dataUrl ?? ""}
                    onChange={(event) =>
                      setNovoDocumento((atual) => ({ ...atual, dataUrl: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="mt-3">
                <Button type="button" size="sm" onClick={adicionarDocumentoRelacionado}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar documento
                </Button>
              </div>
              <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                    <tr>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Arquivo</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.documentosRelacionados ?? []).length ? (
                      (form.documentosRelacionados ?? []).map((item, index) => (
                        <tr
                          key={`${item.nome}-${index}`}
                          className={`border-t border-[var(--g3-border)] ${
                            index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                          }`}
                        >
                          <td className="px-3 py-2">{item.nome}</td>
                          <td className="px-3 py-2">{item.tipo ?? "outro"}</td>
                          <td className="px-3 py-2">{item.dataUrl ?? "---"}</td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => removerDocumentoRelacionado(index)}
                            >
                              Remover
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center">
                          Nenhum documento relacionado adicionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {abaAtiva === "aditivos" ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Novo aditivo</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <Label>Tipo de aditivo *</Label>
                  <Input
                    value={novoAditivo.tipoAditivo}
                    onChange={(event) =>
                      setNovoAditivo((atual) => ({ ...atual, tipoAditivo: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={novoAditivo.dataAditivo}
                    onChange={(event) =>
                      setNovoAditivo((atual) => ({ ...atual, dataAditivo: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nova data de fim</Label>
                  <Input
                    type="date"
                    value={novoAditivo.novaDataFim ?? ""}
                    onChange={(event) =>
                      setNovoAditivo((atual) => ({ ...atual, novaDataFim: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Novo valor</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={novoAditivo.novoValor ?? ""}
                    onChange={(event) =>
                      setNovoAditivo((atual) => ({
                        ...atual,
                        novoValor: event.target.value ? Number(event.target.value) : undefined
                      }))
                    }
                  />
                </div>
                <div className="space-y-1 md:col-span-2 xl:col-span-4">
                  <Label>ObservAções</Label>
                  <Textarea
                    rows={2}
                    value={novoAditivo.observacoes ?? ""}
                    onChange={(event) =>
                      setNovoAditivo((atual) => ({ ...atual, observacoes: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="mt-3">
                <Button type="button" size="sm" onClick={() => void adicionarAditivo()}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar aditivo
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Nova data de fim</th>
                    <th className="px-3 py-2 text-left">Novo valor</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.aditivos ?? []).length ? (
                    (form.aditivos ?? []).map((item, index) => (
                      <tr
                        key={`${item.tipoAditivo}-${item.dataAditivo}-${index}`}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2">{item.tipoAditivo}</td>
                        <td className="px-3 py-2">{item.dataAditivo}</td>
                        <td className="px-3 py-2">{item.novaDataFim ?? "---"}</td>
                        <td className="px-3 py-2">
                          {item.novoValor != null
                            ? item.novoValor.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL"
                              })
                            : "---"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => removerAditivo(index)}
                          >
                            Remover
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center">
                        Nenhum aditivo adicionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarExclusao}
        titulo="Confirmar exclusão"
        texto="Esta ação é irreversível. Deseja continuar?"
        processando={processando}
        onCancel={() => setConfirmarExclusao(false)}
        onConfirm={() => void confirmarExclusaoTermo()}
        confirmarTexto="Excluir"
      />
    </>
  );
}


