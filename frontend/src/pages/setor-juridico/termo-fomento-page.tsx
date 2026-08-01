import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FilePlus2,
  FileSignature,
  Files,
  Eye,
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
import { CadastroSucessoModal } from "@/components/admin/cadastro-sucesso-modal";
import { useProfissionais } from "@/features/profissionais/use-profissionais";
import { formatarMoedaInput, normalizarMoeda } from "@/lib/br-utils";
import { abrirArquivoAutenticado, imprimirArquivoAutenticado } from "@/lib/arquivos";
import { arquivosService } from "@/services/arquivos.service";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { gerarHtmlTermoFomento } from "@/features/termos-fomento/termo-fomento-report";
import {
  useAdicionarAditivoTermoFomento,
  useExcluirTermoFomento,
  useSalvarTermoFomento,
  useTermosFomento
} from "@/features/termos-fomento/use-termos-fomento";
import type { AditivoTermoFomento, TermoDocumento, TermoFomentoPayload } from "@/types/termo-fomento";
import {
  clonarTermoFomento,
  validarTermoFomento,
  validarTermoFomentoParaImpressao
} from "@/features/termos-fomento/termo-fomento-utils";

function CampoErro({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <p className="text-xs text-red-600">{texto}</p>;
}

function ProgressoUpload({ nome, progresso }: { nome: string; progresso: number | null }) {
  if (progresso === null) return null;

  return (
    <div
      className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3"
      role="status"
      aria-live="polite"
      aria-label={`Progresso do envio de ${nome}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[var(--g3-active)]">
          Enviando {nome.toLocaleLowerCase("pt-BR")}
        </span>
        <span className="font-semibold text-[var(--g3-active)]">{progresso}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--g3-border)]">
        <div
          className="h-full rounded-full bg-[var(--g3-active)] transition-all"
          style={{ width: `${progresso}%` }}
        />
      </div>
    </div>
  );
}

type AbaId = "listagem" | "dadosGerais" | "documentos" | "aditivos";

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem de termos", icon: List },
  { id: "dadosGerais", label: "Dados gerais", icon: FileSignature },
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
  tipo: "Termo de Fomento"
};

const tiposDocumento = [
  "Termo de Fomento",
  "Primeiro Aditivo",
  "Segundo Aditivo",
  "Terceiro Aditivo",
  "Quarto Aditivo",
  "Quinto Aditivo"
];

const orgaosConcedentesPrincipais = [
  "Prefeitura Municipal",
  "Secretaria Municipal de Assistência Social",
  "Secretaria Municipal de Saúde",
  "Secretaria Municipal de Educação",
  "Fundo Municipal de Assistência Social",
  "Governo do Estado",
  "Secretaria Estadual de Assistência Social",
  "Secretaria Estadual de Saúde",
  "Secretaria Estadual de Educação",
  "Fundo Estadual de Assistência Social",
  "Governo Federal",
  "Ministério do Desenvolvimento e Assistência Social, Família e Combate à Fome",
  "Ministério da Saúde",
  "Ministério da Educação",
  "Fundo Nacional de Assistência Social",
  "Caixa Econômica Federal"
];

const tiposAditivoPrincipais = [
  "Prorrogação de vigência",
  "Alteração de valor",
  "Acréscimo de valor",
  "Supressão de valor",
  "Alteração do objeto",
  "Alteração do plano de trabalho",
  "Alteração de órgão ou partícipe",
  "Remanejamento orçamentário",
  "Rerratificação",
  "Rescisão",
  "Outro"
];

export function TermoFomentoPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [termoIdSelecionado, setTermoIdSelecionado] = useState<string>();
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState<TermoFomentoPayload>(termoVazio);
  const [snapshot, setSnapshot] = useState<TermoFomentoPayload>(termoVazio);
  const [novoAditivo, setNovoAditivo] = useState<AditivoTermoFomento>(aditivoVazio);
  const [novoDocumento, setNovoDocumento] = useState<TermoDocumento>(documentoVazio);
  const [valorGlobalInput, setValorGlobalInput] = useState("");
  const [mostrarSugestoesOrgaos, setMostrarSugestoesOrgaos] = useState(false);
  const [arquivoDocumento, setArquivoDocumento] = useState<File | null>(null);
  const [novoAditivoValorInput, setNovoAditivoValorInput] = useState("");
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [progressoArquivo, setProgressoArquivo] = useState<number | null>(null);
  const [nomeArquivoEmEnvio, setNomeArquivoEmEnvio] = useState("");
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [cadastroSucesso, setCadastroSucesso] = useState<{ id: string; novo: boolean } | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [documentoParaExcluir, setDocumentoParaExcluir] = useState<{
    documento: TermoDocumento;
    indiceRelacionado: number | null;
  } | null>(null);
  const [excluindoDocumento, setExcluindoDocumento] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  const termosQuery = useTermosFomento();
  const salvarMutation = useSalvarTermoFomento();
  const excluirMutation = useExcluirTermoFomento();
  const adicionarAditivoMutation = useAdicionarAditivoTermoFomento();
  const profissionaisQuery = useProfissionais({ status: "ATIVO" });

  const termos = termosQuery.data ?? [];
  const documentosVinculados = useMemo(
    () => [
      ...(form.termoDocumento?.dataUrl
        ? [{ ...form.termoDocumento, tipo: "termo" as const, origem: "Documento principal", indiceRelacionado: null }]
        : []),
      ...(form.documentosRelacionados ?? []).map((documento, indiceRelacionado) => ({
        ...documento,
        origem: "Documento relacionado",
        indiceRelacionado
      }))
    ],
    [form.documentosRelacionados, form.termoDocumento]
  );
  const termosFiltrados = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (!termo) return termos;
    return termos.filter((item) => {
      const alvo = `${item.numeroTermo} ${item.tipoTermo} ${item.referenciaTermo ?? ""} ${item.responsavelIndicacao ?? ""} ${item.orgaoConcedente ?? ""} ${item.situacao}`;
      return alvo.toLowerCase().includes(termo);
    });
  }, [filtro, termos]);

  const processando =
    salvarMutation.isPending || excluirMutation.isPending || adicionarAditivoMutation.isPending;
  const termoCompletoParaImpressao = Object.keys(validarTermoFomentoParaImpressao(form)).length === 0;
  const orgaosFiltrados = useMemo(() => {
    const termo = (form.orgaoConcedente ?? "").trim().toLocaleLowerCase("pt-BR");
    return orgaosConcedentesPrincipais
      .filter((orgao) => !termo || orgao.toLocaleLowerCase("pt-BR").includes(termo))
      .slice(0, 8);
  }, [form.orgaoConcedente]);

  function novo() {
    setTermoIdSelecionado(undefined);
    setForm(termoVazio);
    setValorGlobalInput("");
    setSnapshot(termoVazio);
    setErros({});
    setNovoAditivo(aditivoVazio);
    setNovoAditivoValorInput("");
    setNovoDocumento(documentoVazio);
    setArquivoDocumento(null);
    setAbaAtiva("dadosGerais");
  }

  function selecionarTermo(id: string) {
    const termo = termos.find((item) => item.id === id);
    if (!termo) return;
    const normalizado: TermoFomentoPayload = {
      ...clonarTermoFomento(termo),
      documentosRelacionados: termo.documentosRelacionados ?? [],
      aditivos: termo.aditivos ?? []
    };
    setTermoIdSelecionado(termo.id);
    setForm(normalizado);
    setValorGlobalInput(normalizado.valorGlobal == null ? "" : formatarMoedaInput(normalizado.valorGlobal));
    setSnapshot(normalizado);
    setArquivoDocumento(null);
    setErros({});
    setAbaAtiva("dadosGerais");
  }

  function cancelar() {
    setForm(clonarTermoFomento(snapshot));
    setErros({});
  }

  async function salvar() {
    const novosErros = validarTermoFomento(form, "rascunho");
    setErros(novosErros);
    if (Object.keys(novosErros).length) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Revise os campos obrigatórios antes de salvar."
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
      setValorGlobalInput(response.valorGlobal == null ? "" : formatarMoedaInput(response.valorGlobal));
      setSnapshot(response);
      setErros({});
      setAbaAtiva("listagem");
      setCadastroSucesso({ id: response.id, novo: !termoIdSelecionado });
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

  async function enviarDocumento() {
    if (!termoIdSelecionado) {
      setPopup({ tipo: "aviso", titulo: "Salve o termo", texto: "Salve o termo antes de enviar documentos." });
      return;
    }
    if (!arquivoDocumento) {
      setPopup({ tipo: "aviso", titulo: "Arquivo não selecionado", texto: "Selecione o arquivo do documento." });
      return;
    }

    try {
      setEnviandoArquivo(true);
      setNomeArquivoEmEnvio(arquivoDocumento.name);
      setProgressoArquivo(0);
      const arquivo = await arquivosService.uploadPorEntidade({
        scope: "termo_fomento_documento",
        entidadeTipo: "termo_fomento",
        entidadeId: termoIdSelecionado,
        arquivo: arquivoDocumento,
        observacao: `Documento do termo de fomento: ${novoDocumento.tipo ?? "Termo de Fomento"}`,
        onUploadProgress: (event) => {
          const total = event.total ?? 0;
          const progresso = total > 0 ? Math.round((event.loaded * 100) / total) : 95;
          setProgressoArquivo(Math.max(1, Math.min(95, progresso)));
        }
      });
      setProgressoArquivo(100);
      const documento = {
        ...novoDocumento,
        id: String(arquivo.id),
        nome: arquivo.nomeOriginal,
        dataUrl: arquivo.caminhoArquivo
      };
      setForm((atual) => ({
        ...atual,
        documentosRelacionados: [...(atual.documentosRelacionados ?? []), documento]
      }));
      setNovoDocumento(documentoVazio);
      setArquivoDocumento(null);
      setPopup({ tipo: "sucesso", titulo: "Arquivo enviado", texto: "O documento foi armazenado. Clique em Salvar para registrar o vínculo no termo." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro no upload", texto: error?.response?.data?.message ?? "Não foi possível armazenar o documento." });
    } finally {
      setEnviandoArquivo(false);
      setProgressoArquivo(null);
      setNomeArquivoEmEnvio("");
    }
  }

  async function confirmarExclusaoDocumento() {
    const item = documentoParaExcluir;
    if (!item?.documento.id) {
      setPopup({
        tipo: "erro",
        titulo: "Erro ao excluir documento",
        texto: "Não foi possível identificar o arquivo enviado."
      });
      return;
    }

    try {
      setExcluindoDocumento(true);
      await arquivosService.excluir(item.documento.id);
      if (item.indiceRelacionado != null) {
        removerDocumentoRelacionado(item.indiceRelacionado);
      } else {
        setForm((atual) => ({ ...atual, termoDocumento: null }));
      }
      setDocumentoParaExcluir(null);
      setPopup({
        tipo: "sucesso",
        titulo: "Documento excluído",
        texto: "O arquivo foi removido. Clique em Salvar para registrar a alteração no termo."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro ao excluir documento",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o arquivo."
      });
    } finally {
      setExcluindoDocumento(false);
    }
  }

  function removerDocumentoRelacionado(indice: number) {
    setForm((atual) => ({
      ...atual,
      documentosRelacionados: (atual.documentosRelacionados ?? []).filter((_, idx) => idx !== indice)
    }));
  }

  async function visualizarDocumento(documento: TermoDocumento) {
    try {
      await abrirArquivoAutenticado(documento.dataUrl, documento.nome || "Documento do termo de fomento");
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro ao visualizar documento",
        texto: error?.message ?? "Não foi possível visualizar o documento."
      });
    }
  }

  async function imprimirDocumento(documento: TermoDocumento) {
    try {
      await imprimirArquivoAutenticado(documento.dataUrl, documento.nome || "Documento do termo de fomento");
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro ao imprimir documento",
        texto: error?.message ?? "Não foi possível preparar a impressão do documento."
      });
    }
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
        setValorGlobalInput(response.valorGlobal == null ? "" : formatarMoedaInput(response.valorGlobal));
        setSnapshot(response);
        setNovoAditivo(aditivoVazio);
        setNovoAditivoValorInput("");
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
    setNovoAditivoValorInput("");
  }

  function removerAditivo(indice: number) {
    setForm((atual) => ({
      ...atual,
      aditivos: (atual.aditivos ?? []).filter((_, idx) => idx !== indice)
    }));
  }

  function duplicarTermo() {
    const duplicado = clonarTermoFomento(form);
    duplicado.id = undefined;
    duplicado.numeroTermo = "";
    duplicado.situacao = "Ativo";
    duplicado.aditivos = [];
    setTermoIdSelecionado(undefined);
    setForm(duplicado);
    setValorGlobalInput(duplicado.valorGlobal == null ? "" : formatarMoedaInput(duplicado.valorGlobal));
    setSnapshot(clonarTermoFomento(duplicado));
    setErros({});
    setAbaAtiva("dadosGerais");
    setPopup({
      tipo: "sucesso",
      titulo: "Termo duplicado",
      texto: "A cópia foi preparada para salvar como novo termo."
    });
  }

  function imprimirTermo() {
    const faltantes = validarTermoFomentoParaImpressao(form);
    setErros(faltantes);
    if (Object.keys(faltantes).length) {
      setPopup({
        tipo: "aviso",
        titulo: "Termo incompleto",
        texto: "Complete os dados obrigatórios e o documento principal antes de imprimir."
      });
      return;
    }
    const janela = window.open("", "_blank", "noopener,noreferrer,width=960,height=900");
    if (!janela) {
      setPopup({
        tipo: "aviso",
        titulo: "Pop-up bloqueado",
        texto: "Libere a abertura de janelas para gerar a impressão do termo."
      });
      return;
    }
    janela.document.write(gerarHtmlTermoFomento(form));
    janela.document.close();
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbaAtiva("listagem"), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: processando },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: processando },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: processando },
    {
      label: "Duplicar termo",
      icon: FilePlus2,
      onClick: duplicarTermo,
      variant: "outline",
      disabled: processando || !form.numeroTermo
    },
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
      onClick: imprimirTermo,
      variant: "outline",
      disabled: !termoCompletoParaImpressao
    },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  return (
    <>
      <AdminPageLayout
        sectionLabel="Jurídico e Compliance"
        pageTitle="Termo de fomento"
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
                placeholder="Número, órgão concedente ou situação"
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
              />
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Número</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Referente a</th>
                    <th className="px-3 py-2 text-left">Órgão concedente</th>
                    <th className="px-3 py-2 text-left">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {termosQuery.isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center">
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
                        <td className="px-3 py-2">{item.referenciaTermo ?? "---"}</td>
                        <td className="px-3 py-2">{item.orgaoConcedente ?? "---"}</td>
                        <td className="px-3 py-2">{item.situacao}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center">
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
              <Label>Número do termo *</Label>
              <Input
                value={form.numeroTermo}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, numeroTermo: event.target.value }))
                }
              />
              <CampoErro texto={erros.numeroTermo} />
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
              <CampoErro texto={erros.tipoTermo} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Referente a</Label>
              <Input
                value={form.referenciaTermo ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, referenciaTermo: event.target.value }))
                }
                placeholder="Ex.: execução do projeto de atendimento social"
              />
              <p className="text-xs text-[var(--g3-muted)]">
                Informe de forma resumida a finalidade ou o projeto ao qual o termo se refere.
              </p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Responsável pela indicação</Label>
              <Input
                value={form.responsavelIndicacao ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, responsavelIndicacao: event.target.value }))
                }
                placeholder="Ex.: Vereador(a) X ou Deputado(a) Y"
              />
              <p className="text-xs text-[var(--g3-muted)]">
                Informe o nome e o cargo de quem indicou ou articulou o termo, quando aplicável.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Situação *</Label>
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
              <CampoErro texto={erros.situacao} />
            </div>
            <div className="space-y-1">
              <Label>Valor global</Label>
              <Input
                inputMode="decimal"
                placeholder="0,00"
                value={valorGlobalInput}
                onChange={(event) => {
                  const valor = event.target.value.replace(/[^\d,.-]/g, "");
                  setValorGlobalInput(valor);
                  setForm((atual) => ({ ...atual, valorGlobal: valor.trim() ? normalizarMoeda(valor) : undefined }));
                }}
                onBlur={() => setValorGlobalInput(form.valorGlobal == null ? "" : formatarMoedaInput(form.valorGlobal))}
              />
              <CampoErro texto={erros.valorGlobal} />
            </div>
            <div className="space-y-1 xl:col-span-2">
              <Label>Órgão concedente</Label>
              <div className="relative">
                <Input
                  value={form.orgaoConcedente ?? ""}
                  onFocus={() => setMostrarSugestoesOrgaos(true)}
                  onBlur={() => window.setTimeout(() => setMostrarSugestoesOrgaos(false), 150)}
                  onChange={(event) => {
                    setForm((atual) => ({ ...atual, orgaoConcedente: event.target.value }));
                    setMostrarSugestoesOrgaos(true);
                  }}
                  placeholder="Selecione ou digite outro órgão"
                  autoComplete="off"
                />
                {mostrarSugestoesOrgaos && orgaosFiltrados.length ? (
                  <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-1 shadow-lg">
                    {orgaosFiltrados.map((orgao) => (
                      <button
                        key={orgao}
                        type="button"
                        className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--g3-foreground)] transition hover:bg-[var(--g3-primary-soft)]"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setForm((atual) => ({ ...atual, orgaoConcedente: orgao }));
                          setMostrarSugestoesOrgaos(false);
                        }}
                      >
                        {orgao}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-[var(--g3-muted)]">Selecione uma sugestão ou informe manualmente outro órgão.</p>
              <CampoErro texto={erros.orgaoConcedente} />
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
              <CampoErro texto={erros.dataAssinatura} />
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
              <CampoErro texto={erros.dataInicioVigencia} />
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
              <CampoErro texto={erros.dataFimVigencia} />
            </div>
            <div className="space-y-1 xl:col-span-2">
              <Label>Responsável interno</Label>
              <Select
                value={form.responsavelInterno ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, responsavelInterno: event.target.value }))
                }
              >
                <option value="">Selecione um profissional</option>
                {(profissionaisQuery.data?.profissionais ?? []).map((profissional) => (
                  <option key={profissional.id_profissional ?? profissional.nome_completo} value={profissional.nome_completo}>
                    {profissional.nome_completo}{profissional.categoria ? ` - ${profissional.categoria}` : ""}
                  </option>
                ))}
              </Select>
              {!profissionaisQuery.isLoading && !(profissionaisQuery.data?.profissionais ?? []).length ? (
                <p className="text-xs text-[var(--g3-muted)]">Nenhum profissional ativo cadastrado.</p>
              ) : null}
              <CampoErro texto={erros.responsavelInterno} />
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
              <CampoErro texto={erros.descricaoObjeto} />
            </div>
          </section>
        ) : null}

        {abaAtiva === "documentos" ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Enviar documento</h3>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">
                Envie qualquer documento relacionado ao termo de fomento. Todos os arquivos serão listados abaixo.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select
                    value={novoDocumento.tipo}
                    onChange={(event) => setNovoDocumento((atual) => ({ ...atual, tipo: event.target.value }))}
                  >
                    {tiposDocumento.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Arquivo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={(event) => setArquivoDocumento(event.target.files?.[0] ?? null)}
                      disabled={enviandoArquivo || !termoIdSelecionado}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void enviarDocumento()}
                      disabled={enviandoArquivo || !termoIdSelecionado || !arquivoDocumento}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      {enviandoArquivo ? "Enviando..." : "Enviar documento"}
                    </Button>
                  </div>
                  <ProgressoUpload
                    nome={nomeArquivoEmEnvio || "arquivo"}
                    progresso={progressoArquivo}
                  />
                  <p className="text-xs text-[var(--g3-muted)]">
                    {termoIdSelecionado ? "O arquivo será armazenado no storage do sistema." : "Salve o termo antes de enviar documentos."}
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-[var(--g3-border)] p-3">
                <h4 className="text-sm font-semibold text-[var(--g3-active)]">Documentos vinculados ao termo</h4>
                <p className="mt-1 text-xs text-[var(--g3-muted)]">
                  Visualize ou imprima qualquer documento já enviado para este termo de fomento.
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                    <tr>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Origem</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentosVinculados.length ? (
                      documentosVinculados.map((item, index) => (
                        <tr
                          key={`${item.id ?? item.dataUrl ?? item.nome}-${index}`}
                          className={`border-t border-[var(--g3-border)] ${
                            index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                          }`}
                        >
                          <td className="px-3 py-2">{item.nome}</td>
                          <td className="px-3 py-2">{item.tipo ?? "outro"}</td>
                          <td className="px-3 py-2">{item.origem}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void visualizarDocumento(item)}
                                disabled={!item.dataUrl}
                                aria-label={`Visualizar ${item.nome}`}
                                title="Visualizar documento"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void imprimirDocumento(item)}
                                disabled={!item.dataUrl}
                                aria-label={`Imprimir ${item.nome}`}
                                title="Imprimir documento"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                onClick={() => setDocumentoParaExcluir({ documento: item, indiceRelacionado: item.indiceRelacionado })}
                                disabled={!item.id}
                                aria-label={`Excluir ${item.nome}`}
                                title="Excluir documento"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center">
                          Nenhum documento vinculado ao termo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <CampoErro texto={erros.documentosRelacionados} />
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
                  <Select
                    value={novoAditivo.tipoAditivo}
                    onChange={(event) =>
                      setNovoAditivo((atual) => ({ ...atual, tipoAditivo: event.target.value }))
                    }
                  >
                    <option value="">Selecione o tipo</option>
                    {tiposAditivoPrincipais.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </Select>
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
                    inputMode="decimal"
                    placeholder="0,00"
                    value={novoAditivoValorInput}
                    onChange={(event) => {
                      const valor = event.target.value.replace(/[^\d,.-]/g, "");
                      setNovoAditivoValorInput(valor);
                      setNovoAditivo((atual) => ({ ...atual, novoValor: valor.trim() ? normalizarMoeda(valor) : undefined }));
                    }}
                    onBlur={() => setNovoAditivoValorInput(novoAditivo.novoValor == null ? "" : formatarMoedaInput(novoAditivo.novoValor))}
                  />
                </div>
                <div className="space-y-1 md:col-span-2 xl:col-span-4">
                  <Label>Observações</Label>
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
      <CadastroSucessoModal
        aberto={Boolean(cadastroSucesso)}
        titulo={cadastroSucesso?.novo ? "Termo cadastrado com sucesso" : "Termo atualizado com sucesso"}
        rotuloNumero="Número do termo"
        numero={cadastroSucesso?.id}
        onClose={() => setCadastroSucesso(null)}
      />
      <PopupConfirmacao
        aberto={confirmarExclusao}
        titulo="Confirmar exclusão"
        texto="Esta ação é irreversível. Deseja continuar?"
        processando={processando}
        onCancel={() => setConfirmarExclusao(false)}
        onConfirm={() => void confirmarExclusaoTermo()}
        confirmarTexto="Excluir"
      />
      <PopupConfirmacao
        aberto={Boolean(documentoParaExcluir)}
        titulo="Excluir documento"
        texto="O arquivo será removido do armazenamento e da listagem do termo. Deseja continuar?"
        processando={excluindoDocumento}
        onCancel={() => {
          if (!excluindoDocumento) setDocumentoParaExcluir(null);
        }}
        onConfirm={() => void confirmarExclusaoDocumento()}
        confirmarTexto="Excluir documento"
      />
    </>
  );
}


