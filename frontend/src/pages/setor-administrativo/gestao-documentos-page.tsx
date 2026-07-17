import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Eye,
  ExternalLink,
  FileText,
  FileStack,
  FolderOpen,
  Paperclip,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  Upload,
  X,
  Edit2
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
  useAdicionarAnexoDocumentoInstituicao,
  useAdicionarHistoricoDocumentoInstituicao,
  useAnexosDocumentoInstituicao,
  useDocumentosInstituicao,
  useExcluirAnexoDocumentoInstituicao,
  useExcluirDocumentoInstituicao,
  useHistoricoDocumentoInstituicao,
  useSalvarDocumentoInstituicao,
  useSubstituirAnexoDocumentoInstituicao
} from "@/features/documentos-instituicao/use-documentos-instituicao";
import { abrirArquivoAutenticado, imprimirArquivoAutenticado } from "@/lib/arquivos";
import { formatarDataPtBr } from "@/lib/br-utils";
import { montarPayloadAnexoDocumentoInstituicao } from "@/lib/documentos-instituicao-anexo";
import { calcularDiasParaVencerDocumento } from "@/lib/documentos-instituicao-datas";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import type {
  DocumentoInstituicao,
  DocumentoInstituicaoAnexo,
  DocumentoInstituicaoPayload
} from "@/types/documentos-instituicao";
import { useAuth } from "@/hooks/use-auth";
import { httpClient } from "@/services/http-client";

type AbaId = "lista" | "cadastro" | "anexos" | "alertas" | "relatorios" | "links";

const abas: AdminTab[] = [
  { id: "lista", label: "Lista de documentos", icon: FolderOpen },
  { id: "cadastro", label: "Cadastro e edição", icon: FileStack },
  { id: "links", label: "Links externos", icon: ExternalLink },
  { id: "alertas", label: "Alertas e vencimentos", icon: AlertTriangle },
  { id: "relatorios", label: "Relatórios e dashboard", icon: Bell }
];

const tituloTela = "Documentos da instituição";

interface LinkExterno {
  id?: number;
  nome: string;
  url: string;
  tiposRelacionados?: string;
  observacao?: string;
}

const tiposDocumentoTerceiroSetor = [
  "Estatuto social",
  "Ata de fundação",
  "Ata de eleição da diretoria",
  "Ata de posse da diretoria",
  "Regimento interno",
  "Cartão do CNPJ",
  "Comprovante de inscrição municipal",
  "Comprovante de inscrição estadual",
  "Alvará de funcionamento",
  "AVCB ou CLCB",
  "Licença sanitária",
  "Licença ambiental",
  "Certidão negativa federal",
  "Certidão negativa estadual",
  "Certidão negativa municipal",
  "Certidão do FGTS",
  "Certidão trabalhista",
  "Balanço patrimonial",
  "Demonstração do resultado",
  "Plano de trabalho",
  "Termo de fomento ou colaboração",
  "Prestação de contas",
  "Procuração",
  "Apólice de seguro",
  "Contrato de locação",
  "Contrato de prestação de serviços",
  "Certificado digital",
  "Política de proteção de dados",
  "Manual de compliance",
  "Certificado de utilidade pública",
  "Qualificação OSCIP",
  "Certificado CEBAS"
] as const;

const categoriasDocumentoInstitucional = [
  "Governança institucional",
  "Jurídica",
  "Fiscal e tributária",
  "Contábil e financeira",
  "Trabalhista e RH",
  "Parcerias e convênios",
  "Certidões e regularidade",
  "Licenças e alvarás",
  "Patrimonial e seguros",
  "Compliance e políticas internas",
  "Operacional",
  "Prestação de contas"
] as const;

const formasAlertaOptions = ["Sistema", "E-mail", "WhatsApp", "Ambos"] as const;

type FormState = DocumentoInstituicaoPayload & { id?: string };

const defaultForm: FormState = {
  tipoDocumento: "",
  orgaoEmissor: "",
  descricao: "",
  categoria: "Fiscal e tributária",
  emissao: "",
  validade: "",
  responsavelInterno: "",
  modoRenovacao: "Manual",
  observacaoRenovacao: "",
  gerarAlerta: true,
  diasAntecedencia: [30],
  formaAlerta: "Sistema",
  emRenovacao: false,
  semVencimento: false,
  vencimentoIndeterminado: false
};

function criarFormularioPadrao(responsavelInterno = ""): FormState {
  return {
    ...defaultForm,
    responsavelInterno
  };
}

function obterNomeUsuarioLogado(
  usuario?: ReturnType<typeof useAuth>["usuario"] | null
) {
  return usuario?.nome?.trim() || usuario?.nomeUsuario?.trim() || "";
}

function mesclarOpcaoAtual(opcoes: readonly string[], valorAtual?: string | null) {
  const valor = String(valorAtual ?? "").trim();
  if (!valor) return [...opcoes];
  if (opcoes.some((item) => item.toLowerCase() === valor.toLowerCase())) {
    return [...opcoes];
  }
  return [valor, ...opcoes];
}

function ehArquivoPermitido(file: File) {
  return file.size > 0;
}

function formatarSituacaoDocumento(situacao?: string | null) {
  switch (situacao) {
    case "vencido":
      return "Vencido";
    case "vence_em_breve":
      return "Vence em breve";
    case "em_renovacao":
      return "Em renovação";
    case "sem_vencimento":
      return "Sem vencimento";
    case "valido":
      return "Válido";
    default:
      return "---";
  }
}

function obterClasseLinhaDocumento(situacao?: string | null, indice = 0) {
  if (situacao === "vencido") {
    return "bg-red-100";
  }
  if (situacao === "vence_em_breve") {
    return "bg-amber-100";
  }
  return indice % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35";
}

function obterClasseSeloSituacao(situacao?: string | null) {
  if (situacao === "vencido") {
    return "bg-red-200 text-red-900";
  }
  if (situacao === "vence_em_breve") {
    return "bg-amber-200 text-amber-900";
  }
  if (situacao === "valido") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (situacao === "em_renovacao") {
    return "bg-sky-100 text-sky-800";
  }
  return "bg-slate-100 text-slate-700";
}

function IconeSituacaoDocumento({ situacao }: { situacao?: string | null }) {
  if (situacao === "vencido") {
    return <AlertTriangle className="h-4 w-4" />;
  }
  if (situacao === "vence_em_breve") {
    return <Clock3 className="h-4 w-4" />;
  }
  if (situacao === "valido") {
    return <CheckCircle2 className="h-4 w-4" />;
  }
  return null;
}

export function GestaoDocumentosPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const responsavelLogado = useMemo(() => obterNomeUsuarioLogado(usuario), [usuario]);
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("lista");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<FormState>(() => criarFormularioPadrao(responsavelLogado));
  const [snapshot, setSnapshot] = useState<FormState>(() => criarFormularioPadrao(responsavelLogado));
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [historicoTexto, setHistoricoTexto] = useState("");
  const [anexosLocais, setAnexosLocais] = useState<DocumentoInstituicaoAnexo[]>([]);
  const [anexosPendentes, setAnexosPendentes] = useState<File[]>([]);
  const [anexoParaSubstituirId, setAnexoParaSubstituirId] = useState<string | null>(null);
  const [anexoProcessandoId, setAnexoProcessandoId] = useState<string | null>(null);
  const [uploadFileProgress, setUploadFileProgress] = useState<number | null>(null);
  const [uploadFileProgressNome, setUploadFileProgressNome] = useState("");
  const arquivoDocumentoInputRef = useRef<HTMLInputElement>(null);
  const arquivoDocumentoSubstituicaoInputRef = useRef<HTMLInputElement>(null);

  // Estados para Links Externos
  const [linksExternos, setLinksExternos] = useState<LinkExterno[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [modoEdicaoLink, setModoEdicaoLink] = useState(false);
  const [formLink, setFormLink] = useState<LinkExterno>({ nome: "", url: "", tiposRelacionados: "", observacao: "" });
  const [confirmarExcluirLink, setConfirmarExcluirLink] = useState<number | null>(null);
  const [sugestaoLinkAberto, setSugestaoLinkAberto] = useState(false);
  const [linksParaSugerir, setLinksParaSugerir] = useState<LinkExterno[]>([]);

  const { data, isLoading } = useDocumentosInstituicao();
  const anexosQuery = useAnexosDocumentoInstituicao(form.id);
  const historicoQuery = useHistoricoDocumentoInstituicao(form.id);
  const salvarMutation = useSalvarDocumentoInstituicao();
  const excluirMutation = useExcluirDocumentoInstituicao();
  const anexoMutation = useAdicionarAnexoDocumentoInstituicao();
  const substituirAnexoMutation = useSubstituirAnexoDocumentoInstituicao();
  const excluirAnexoMutation = useExcluirAnexoDocumentoInstituicao();
  const historicoMutation = useAdicionarHistoricoDocumentoInstituicao();

  const documentos = data ?? [];

  const documentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return documentos;
    return [...documentos]
      .filter((item) => {
        const alvo = `${item.tipoDocumento} ${item.orgaoEmissor} ${item.categoria ?? ""} ${item.situacao ?? ""}`;
        return alvo.toLowerCase().includes(termo);
      })
      .sort((a, b) => a.tipoDocumento.localeCompare(b.tipoDocumento, "pt-BR"));
  }, [busca, documentos]);

  const alertas = useMemo(() => {
    const hoje = new Date();
    return documentos
      .filter((item) => !!item.validade)
      .map((item) => {
        const diffDias = calcularDiasParaVencerDocumento(item.validade, hoje);
        return {
          ...item,
          diasParaVencer: diffDias ?? 0
        };
      })
      .sort((a, b) => a.diasParaVencer - b.diasParaVencer);
  }, [documentos]);

  const anexos = anexosQuery.data ?? [];
  const anexosParaExibir = anexos.length > 0 ? anexos : anexosLocais;
  const anexoPrincipal = anexosParaExibir[0];
  const anexosOcultos = Math.max(0, anexosParaExibir.length - 1);
  const carregandoAnexo =
    Boolean(form.id) && (anexosQuery.isLoading || anexosQuery.isFetching) && anexosParaExibir.length === 0;
  const historico = historicoQuery.data ?? [];

  useEffect(() => {
    if (!responsavelLogado) return;

    setForm((atual) =>
      atual.responsavelInterno?.trim()
        ? atual
        : {
            ...atual,
            responsavelInterno: responsavelLogado
          }
    );
    setSnapshot((atual) =>
      atual.responsavelInterno?.trim()
        ? atual
        : {
            ...atual,
            responsavelInterno: responsavelLogado
        }
    );
  }, [responsavelLogado]);

  // Carregar Links Externos
  useEffect(() => {
    if (abaAtiva === "links" || abaAtiva === "cadastro") {
      void carregarLinks();
    }
  }, [abaAtiva]);

  async function carregarLinks() {
    setLoadingLinks(true);
    try {
      const response = await httpClient.get("/api/links-externos");
      setLinksExternos(response.data);
    } catch (error) {
      console.error("Erro ao carregar links:", error);
    } finally {
      setLoadingLinks(false);
    }
  }

  const tiposDocumentoOptions = useMemo(
    () => mesclarOpcaoAtual(tiposDocumentoTerceiroSetor, form.tipoDocumento),
    [form.tipoDocumento]
  );
  const categoriasDocumentoOptions = useMemo(
    () => mesclarOpcaoAtual(categoriasDocumentoInstitucional, form.categoria),
    [form.categoria]
  );

  const carregandoAcoes =
    salvarMutation.isPending ||
    excluirMutation.isPending ||
    anexoMutation.isPending ||
    substituirAnexoMutation.isPending ||
    excluirAnexoMutation.isPending ||
    historicoMutation.isPending;

  const linksSugeridosParaTipo = useMemo(() => {
    const tipo = form.tipoDocumento.trim().toLowerCase();
    if (!tipo) return [];
    return linksExternos.filter((item) => {
      const relacionados = (item.tiposRelacionados || "").toLowerCase();
      return relacionados.includes(tipo);
    });
  }, [form.tipoDocumento, linksExternos]);

  function novo() {
    const proximo = criarFormularioPadrao(responsavelLogado);
    setForm(proximo);
    setSnapshot(proximo);
    setHistoricoTexto("");
    setAnexosLocais([]);
    setAnexosPendentes([]);
    setUploadFileProgress(null);
    setUploadFileProgressNome("");
    setAbaAtiva("cadastro");
  }

  function selecionar(item: DocumentoInstituicao) {
    const proximo: FormState = {
      id: item.id,
      tipoDocumento: item.tipoDocumento,
      orgaoEmissor: item.orgaoEmissor,
      descricao: item.descricao ?? "",
      categoria: item.categoria ?? "",
      emissao: item.emissao ?? "",
      validade: item.validade ?? "",
      responsavelInterno: responsavelLogado || item.responsavelInterno || "",
      modoRenovacao: item.modoRenovacao ?? "Manual",
      observacaoRenovacao: item.observacaoRenovacao ?? "",
      gerarAlerta: !!item.gerarAlerta,
      diasAntecedencia: item.diasAntecedencia ?? [30],
      formaAlerta: item.formaAlerta ?? "Sistema",
      emRenovacao: !!item.emRenovacao,
      semVencimento: !!item.semVencimento,
      vencimentoIndeterminado: !!item.vencimentoIndeterminado
    };
    setForm(proximo);
    setSnapshot(proximo);
    setAnexosLocais([]);
    setAnexosPendentes([]);
    setUploadFileProgress(null);
    setUploadFileProgressNome("");
    setAbaAtiva("cadastro");
  }

  function buscar() {
    setAbaAtiva("lista");
  }

  function cancelar() {
    setForm(snapshot);
    setAnexosLocais([]);
    setAnexosPendentes([]);
    setUploadFileProgress(null);
    setUploadFileProgressNome("");
  }

  async function salvar() {
    if (!form.tipoDocumento.trim() || !form.orgaoEmissor.trim() || !form.emissao) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe tipo, órgão emissor e data de emissão."
      });
      return;
    }
    try {
      const payload: FormState = {
        ...form,
        tipoDocumento: form.tipoDocumento.trim(),
        orgaoEmissor: form.orgaoEmissor.trim(),
        descricao: form.descricao?.trim() || undefined,
        categoria: form.categoria?.trim() || undefined,
        validade: form.semVencimento ? undefined : form.validade || undefined,
        responsavelInterno: form.responsavelInterno?.trim() || responsavelLogado || undefined,
        modoRenovacao: form.modoRenovacao?.trim() || undefined,
        observacaoRenovacao: form.observacaoRenovacao?.trim() || undefined,
        formaAlerta: form.formaAlerta?.trim() || undefined
      };

      const temAnexosPendentes = anexosPendentes.length > 0;
      setUploadFileProgressNome("Documento");
      setUploadFileProgress(0);

      const response = await salvarMutation.mutateAsync({
        ...payload,
        onUploadProgress: (event) => {
          const total = event.total ?? 0;
          const progresso = total > 0 ? Math.round((event.loaded * 100) / total) : 95;
          setUploadFileProgress(Math.max(1, Math.min(95, progresso)));
        }
      });
      const documentoId = response.id;
      const proximo = { ...payload, id: documentoId };
      setForm(proximo);
      setSnapshot(proximo);

      const resultadoAnexos = await enviarAnexosPendentes(documentoId);
      if (!temAnexosPendentes) {
        setUploadFileProgress(100);
      }
      const mensagem =
        resultadoAnexos.enviados > 0
          ? resultadoAnexos.falhou
            ? `Documento salvo, com ${resultadoAnexos.enviados} anexo(s) enviado(s) e arquivos pendentes na fila.`
            : resultadoAnexos.enviados === 1
              ? "Documento salvo com 1 anexo enviado."
              : `Documento salvo com ${resultadoAnexos.enviados} anexos enviados.`
          : resultadoAnexos.falhou
            ? "Documento salvo, mas alguns anexos ficaram pendentes."
            : "Documento salvo com sucesso.";
      setPopupMensagem({
        tipo: resultadoAnexos.falhou ? "aviso" : "sucesso",
        titulo: "Confirmação",
        texto: mensagem
      });
    } catch (error: any) {
      setUploadFileProgress(null);
      setUploadFileProgressNome("");
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o documento."
      });
    } finally {
      limparUploadFileProgress();
    }
  }

  function excluir() {
    if (!form.id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um documento para excluir."
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
        texto: "Documento excluído com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o documento."
      });
    }
  }

  function limparArquivoPendente(indice: number) {
    setAnexosPendentes((atuais) => atuais.filter((_, posicao) => posicao !== indice));
  }

  function formatarTamanhoArquivo(file: File) {
    const tamanhoKb = Math.max(1, Math.round(file.size / 1024));
    return `${tamanhoKb} KB`;
  }

  function adicionarArquivosPendentes(files: File[]) {
    if (!files.length) return;

    const arquivosInvalidos = files.filter((file) => !ehArquivoPermitido(file));
    if (arquivosInvalidos.length > 0) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Remova arquivos inválidos antes de enviar."
      });
      return;
    }

    setAnexosPendentes((atuais) => [...atuais, ...files]);
  }

  async function enviarAnexosPendentes(documentoId: string) {
    if (!anexosPendentes.length) return { enviados: 0, falhou: false };

    const pendentes = [...anexosPendentes];
    const anexosEnviados: DocumentoInstituicaoAnexo[] = [];
    const totalArquivos = pendentes.length;

    try {
      setUploadFileProgress(0);

      for (const [indice, file] of pendentes.entries()) {
        const progressoBase = Math.round((indice / totalArquivos) * 100);
        const nomeProgresso =
          totalArquivos > 1 ? `${file.name} (${indice + 1}/${totalArquivos})` : file.name;

        setUploadFileProgressNome(nomeProgresso);
        setUploadFileProgress(progressoBase);

        const payload = await montarPayloadAnexoDocumentoInstituicao({
          arquivo: file,
          usuario: responsavelLogado || "Usuário"
        });

        const anexo = await anexoMutation.mutateAsync({
          id: documentoId,
          payload,
          onUploadProgress: (event) => {
            const total = event.total ?? 0;
            const progressoArquivo = total > 0 ? Math.round((event.loaded * 100) / total) : 95;
            const progressoTotal = Math.round(((indice + progressoArquivo / 100) / totalArquivos) * 100);
            setUploadFileProgress(Math.max(progressoBase, Math.min(99, progressoTotal)));
          }
        });

        anexosEnviados.push(anexo);
        pendentes.shift();
        setAnexosPendentes([...pendentes]);
      }

      setUploadFileProgress(100);
      setAnexosLocais((atuais) => [...anexosEnviados, ...atuais]);
      setAnexosPendentes([]);
      limparUploadFileProgress();
      return { enviados: anexosEnviados.length, falhou: false };
    } catch (error: any) {
      setAnexosPendentes(pendentes);
      limparUploadFileProgress();
      return { enviados: anexosEnviados.length, falhou: true };
    }
  }

  function limparUploadFileProgress() {
    window.setTimeout(() => {
      setUploadFileProgress(null);
      setUploadFileProgressNome("");
    }, 800);
  }

  async function substituirAnexoExistente(anexoId: string, file: File) {
    if (!ehArquivoPermitido(file)) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Selecione um arquivo válido para envio."
      });
      setAnexoParaSubstituirId(null);
      return;
    }

    if (!form.id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um documento antes de substituir o anexo."
      });
      return;
    }

    setAnexoProcessandoId(anexoId);
    try {
      setUploadFileProgress(0);
      setUploadFileProgressNome(file.name);
      const payload = await montarPayloadAnexoDocumentoInstituicao({
        arquivo: file,
        usuario: responsavelLogado || "Usuário"
      });
      setUploadFileProgress(5);
      const anexo = await substituirAnexoMutation.mutateAsync({
        id: form.id,
        anexoId,
        payload,
        onUploadProgress: (event) => {
          const total = event.total ?? 0;
          const progresso = total > 0 ? Math.round((event.loaded * 100) / total) : 95;
          setUploadFileProgress(Math.max(5, Math.min(99, progresso)));
        }
      });
      setUploadFileProgress(100);
      setAnexosLocais((atuais) =>
        atuais.map((item) => (item.id === anexoId ? anexo : item))
      );
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Anexo substituído com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível substituir o anexo."
      });
    } finally {
      setAnexoProcessandoId(null);
      setAnexoParaSubstituirId(null);
      limparUploadFileProgress();
    }
  }

  async function abrirAnexo(item: DocumentoInstituicaoAnexo) {
    const candidatos = [
      `/api/documentos-instituicao/${item.documentoId}/anexos/${item.id}/arquivo`,
      item.arquivoId ? `/api/arquivos/${item.arquivoId}/conteudo` : null,
      item.arquivoUrl ?? null
    ].filter((valor): valor is string => Boolean(valor));

    for (const valorArquivo of candidatos) {
      try {
        await abrirArquivoAutenticado(valorArquivo, item.nomeArquivo);
        return;
      } catch (error: any) {
        const mensagem = String(error?.message ?? "");
        const eh404 = mensagem.includes("404") || mensagem.toLowerCase().includes("not found");
        if (!eh404 || valorArquivo === candidatos[candidatos.length - 1]) {
          setPopupMensagem({
            tipo: "erro",
            titulo: "Erro",
            texto: error?.message ?? "Não foi possível visualizar o anexo."
          });
          return;
        }
      }
    }
  }

  async function imprimirAnexo(item: DocumentoInstituicaoAnexo) {
    setAnexoProcessandoId(item.id);
    const candidatos = [
      `/api/documentos-instituicao/${item.documentoId}/anexos/${item.id}/arquivo`,
      item.arquivoId ? `/api/arquivos/${item.arquivoId}/conteudo` : null,
      item.arquivoUrl ?? null
    ].filter((valor): valor is string => Boolean(valor));

    try {
      for (const valorArquivo of candidatos) {
        try {
          await imprimirArquivoAutenticado(valorArquivo, item.nomeArquivo);
          return;
        } catch (error: any) {
          const mensagem = String(error?.message ?? "");
          const eh404 = mensagem.includes("404") || mensagem.toLowerCase().includes("not found");
          if (!eh404 || valorArquivo === candidatos[candidatos.length - 1]) {
            throw error;
          }
        }
      }
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível imprimir o anexo."
      });
    } finally {
      setAnexoProcessandoId(null);
    }
  }

  function solicitarSubstituicaoAnexo(anexoId: string) {
    setAnexoParaSubstituirId(anexoId);
    arquivoDocumentoSubstituicaoInputRef.current?.click();
  }

  function abrirSeletorArquivosPendentes() {
    arquivoDocumentoInputRef.current?.click();
  }

  async function excluirAnexoExistente(item: DocumentoInstituicaoAnexo) {
    if (!form.id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um documento antes de excluir o anexo."
      });
      return;
    }

    setAnexoProcessandoId(item.id);
    try {
      await excluirAnexoMutation.mutateAsync({ id: form.id, anexoId: item.id });
      setAnexosLocais((atuais) => atuais.filter((anexo) => anexo.id !== item.id));
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Anexo excluído com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o anexo."
      });
    } finally {
      setAnexoProcessandoId(null);
    }
  }

  async function adicionarHistorico() {
    if (!form.id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um documento antes de registrar histórico."
      });
      return;
    }
    if (!historicoTexto.trim()) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe a descrição do histórico."
      });
      return;
    }

    try {
      await historicoMutation.mutateAsync({
        id: form.id,
        payload: {
          usuario: responsavelLogado || "Usuário",
          tipoAlteracao: "Atualização",
          observacao: historicoTexto.trim(),
          dataHora: new Date().toISOString()
        }
      });
      setHistoricoTexto("");
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Histórico registrado com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível registrar o histórico."
      });
    }
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Relatório de documentos" });
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

  // Funções de Gerenciamento de Links
  function novoLink() {
    setFormLink({ nome: "", url: "", tiposRelacionados: "", observacao: "" });
    setModoEdicaoLink(true);
  }

  function editarLink(link: LinkExterno) {
    setFormLink({ ...link });
    setModoEdicaoLink(true);
  }

  async function salvarLink() {
    if (!formLink.nome.trim() || !formLink.url.trim()) {
      setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Nome e URL são obrigatórios." });
      return;
    }
    try {
      if (formLink.id) {
        await httpClient.put(`/api/links-externos/${formLink.id}`, formLink);
      } else {
        await httpClient.post("/api/links-externos", formLink);
      }
      setModoEdicaoLink(false);
      void carregarLinks();
      setPopupMensagem({ tipo: "sucesso", titulo: "Sucesso", texto: "Link salvo com sucesso!" });
    } catch (error) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: "Erro ao salvar o link." });
    }
  }

  function alternarTipoNoLink(tipo: string) {
    const tiposAtuais = formLink.tiposRelacionados 
      ? formLink.tiposRelacionados.split(",").map(t => t.trim()).filter(Boolean)
      : [];
    
    let novosTipos: string[];
    if (tiposAtuais.includes(tipo)) {
      novosTipos = tiposAtuais.filter(t => t !== tipo);
    } else {
      novosTipos = [...tiposAtuais, tipo];
    }
    
    setFormLink({ ...formLink, tiposRelacionados: novosTipos.join(", ") });
  }

  async function confirmarExclusaoLink() {
    if (!confirmarExcluirLink) return;
    try {
      await httpClient.delete(`/api/links-externos/${confirmarExcluirLink}`);
      setConfirmarExcluirLink(null);
      void carregarLinks();
      setPopupMensagem({ tipo: "sucesso", titulo: "Sucesso", texto: "Link removido!" });
    } catch (error) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: "Erro ao remover o link." });
    }
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
      <input
        ref={arquivoDocumentoInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) {
            adicionarArquivosPendentes(files);
          }
          event.target.value = "";
        }}
      />
      <input
        ref={arquivoDocumentoSubstituicaoInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          const anexoId = anexoParaSubstituirId;
          if (file && anexoId) {
            void substituirAnexoExistente(anexoId, file);
          } else {
            setAnexoParaSubstituirId(null);
          }
          event.target.value = "";
        }}
      />
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={abaAtiva === "links" ? [] : acoes}
        sectionLabel="Administração e gestão"
        pageTitle={tituloTela}
        activeTitle={abaAtiva === "lista" ? "Lista de documentos" : abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={form.id ? `Código: ${form.id}` : "Novo"}
      >
        {abaAtiva === "lista" ? (
          <section className="space-y-3">
            <div className="space-y-1">
              <Label>Buscar documento</Label>
              <Input
                placeholder="Tipo, órgão emissor, categoria ou situação"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Órgão emissor</th>
                    <th className="px-3 py-2 text-left">Anexo</th>
                    <th className="px-3 py-2 text-left">Emissão</th>
                    <th className="px-3 py-2 text-left">Validade</th>
                    <th className="px-3 py-2 text-left">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center">
                        Carregando documentos...
                      </td>
                    </tr>
                  ) : documentosFiltrados.length ? (
                    documentosFiltrados.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer border-t border-[var(--g3-border)] transition-colors hover:bg-[var(--g3-primary-soft)]/45 ${form.id === item.id ? "ring-1 ring-inset ring-[var(--g3-active)]" : ""} ${obterClasseLinhaDocumento(item.situacao, index)}`}
                        onClick={() => selecionar(item)}
                      >
                        <td className="px-3 py-2 font-medium">{item.tipoDocumento}</td>
                        <td className="px-3 py-2">{item.orgaoEmissor}</td>
                        <td className="px-3 py-2">
                          {item.anexoQuantidade && item.anexoQuantidade > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"
                              title={`${item.anexoQuantidade} anexo(s) cadastrado(s)`}
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              {item.anexoQuantidade} anexo(s)
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-[var(--g3-muted)]">Sem anexo</span>
                              <span className="text-[10px] text-amber-700">Sugestão: inclua o arquivo no cadastro.</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">{item.emissao ? formatarDataPtBr(item.emissao) : "---"}</td>
                        <td className="px-3 py-2">{item.validade ? formatarDataPtBr(item.validade) : "---"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${obterClasseSeloSituacao(item.situacao)}`}>
                            <IconeSituacaoDocumento situacao={item.situacao} />
                            {formatarSituacaoDocumento(item.situacao)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center">
                        Nenhum documento encontrado.
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
            <div className="md:col-span-2 xl:col-span-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 px-4 py-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-[var(--g3-active)]">Visualização do documento</p>
                  <p className="text-xs text-[var(--g3-muted)]">
                    Acesse o arquivo principal do cadastro ativo com um clique.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="border-emerald-700 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:text-white"
                  onClick={() => void abrirAnexo(anexoPrincipal)}
                  disabled={!anexoPrincipal || anexoProcessandoId === anexoPrincipal.id}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Visualizar documento
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tipo de documento *</Label>
              <Select
                value={form.tipoDocumento}
                onChange={(event) => {
                  const novoTipo = event.target.value;
                  setForm((atual) => ({ ...atual, tipoDocumento: novoTipo }));
                  
                  // Se houver links cadastrados para este tipo, abre o popup de sugestão
                  if (novoTipo) {
                    const links = linksExternos.filter((item) => {
                      const relacionados = (item.tiposRelacionados || "").toLowerCase();
                      return relacionados.includes(novoTipo.toLowerCase());
                    });
                    if (links.length > 0) {
                      setLinksParaSugerir(links);
                      setSugestaoLinkAberto(true);
                    }
                  }
                }}
              >
                <option value="">Selecione</option>
                {tiposDocumentoOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Órgão emissor *</Label>
              <Input
                value={form.orgaoEmissor}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, orgaoEmissor: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select
                value={form.categoria ?? ""}
                onChange={(event) => setForm((atual) => ({ ...atual, categoria: event.target.value }))}
              >
                <option value="">Selecione</option>
                {categoriasDocumentoOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Responsável interno</Label>
              <Input
                value={form.responsavelInterno ?? responsavelLogado}
                readOnly
                className="bg-[var(--g3-primary-soft)]/20"
              />
            </div>

            {linksSugeridosParaTipo.length > 0 && (
              <div className="rounded-md border border-[var(--g3-active)]/30 bg-[var(--g3-primary-soft)]/20 p-2 md:col-span-2 xl:col-span-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-[var(--g3-active)]">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Site sugerido para emissão/atualização deste documento:
                </p>
                <div className="mt-1 flex flex-wrap gap-3">
                  {linksSugeridosParaTipo.map((link, idx) => (
                    <div key={idx} className="flex flex-col">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline hover:text-blue-800"
                      >
                        {link.nome}
                      </a>
                      {link.observacao && (
                        <span className="text-[10px] text-[var(--g3-muted)]">({link.observacao})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Data de emissão *</Label>
              <Input
                type="date"
                value={form.emissao}
                onChange={(event) => setForm((atual) => ({ ...atual, emissao: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Validade</Label>
              <Input
                type="date"
                disabled={!!form.semVencimento}
                value={form.validade ?? ""}
                onChange={(event) => setForm((atual) => ({ ...atual, validade: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Modo de renovação</Label>
              <Select
                value={form.modoRenovacao ?? "Manual"}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, modoRenovacao: event.target.value }))
                }
              >
                <option value="Manual">Manual</option>
                <option value="Automática">Automática</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Forma de alerta</Label>
              <Select
                value={form.formaAlerta ?? "Sistema"}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, formaAlerta: event.target.value }))
                }
              >
                {formasAlertaOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={!!form.gerarAlerta}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, gerarAlerta: event.target.checked }))
                }
              />
              Gerar alerta
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.semVencimento}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    semVencimento: event.target.checked,
                    validade: event.target.checked ? "" : atual.validade
                  }))
                }
              />
              Sem vencimento
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.emRenovacao}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, emRenovacao: event.target.checked }))
                }
              />
              Em renovação
            </label>
            <div className="grid gap-3 md:col-span-2 md:grid-cols-2 xl:col-span-4">
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Textarea
                  rows={2}
                  className="min-h-20"
                  value={form.descricao ?? ""}
                  onChange={(event) => setForm((atual) => ({ ...atual, descricao: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Observação de renovação</Label>
                <Textarea
                  rows={2}
                  className="min-h-20"
                  value={form.observacaoRenovacao ?? ""}
                  onChange={(event) =>
                    setForm((atual) => ({ ...atual, observacaoRenovacao: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="md:col-span-2 xl:col-span-4">
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-sm">Arquivos do documento</CardTitle>
                      <p className="text-xs text-[var(--g3-muted)]">
                        Envie um ou mais arquivos deste cadastro para visualizar, imprimir, substituir ou excluir.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={abrirSeletorArquivosPendentes}
                      disabled={carregandoAcoes}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      {anexosPendentes.length > 0 || anexosParaExibir.length > 0 ? "Adicionar arquivos" : "Selecionar arquivos"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {uploadFileProgress !== null ? (
                    <div
                      className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3"
                      role="status"
                      aria-live="polite"
                      aria-label="Progresso do envio do arquivo"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[var(--g3-active)]">
                          {uploadFileProgressNome === "Documento"
                            ? "Salvando documento"
                            : `Enviando arquivo${uploadFileProgressNome ? `: ${uploadFileProgressNome}` : ""}`}
                        </span>
                        <span className="font-semibold text-[var(--g3-active)]">{uploadFileProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--g3-border)]">
                        <div
                          className="h-full rounded-full bg-[var(--g3-active)] transition-all"
                          style={{ width: `${uploadFileProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                  {anexosPendentes.length > 0 ? (
                    <div className="space-y-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                          Arquivos prontos para envio
                        </p>
                        <span className="text-xs text-[var(--g3-muted)]">
                          {anexosPendentes.length} arquivo(s)
                        </span>
                      </div>
                      <div className="space-y-2">
                        {anexosPendentes.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{file.name}</p>
                              <p className="text-xs text-[var(--g3-muted)]">{formatarTamanhoArquivo(file)}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => limparArquivoPendente(index)}
                              disabled={carregandoAcoes}
                            >
                              Remover
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-[var(--g3-muted)]">
                        Os arquivos serão enviados automaticamente quando você clicar em salvar.
                      </p>
                    </div>
                  ) : carregandoAnexo ? (
                    <div className="rounded-md border border-dashed border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/15 p-4 text-sm text-[var(--g3-muted)]">
                      Carregando PDF enviado...
                    </div>
                  ) : anexoPrincipal ? (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="rounded-full bg-[var(--g3-primary-soft)] p-2 text-[var(--g3-active)]">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="truncate text-sm font-semibold">{anexoPrincipal.nomeArquivo}</p>
                            <p className="text-xs text-[var(--g3-muted)]">
                              {anexoPrincipal.tipoMime ?? "application/pdf"} • {anexoPrincipal.tamanho ?? "---"}
                            </p>
                            {anexosOcultos ? (
                              <p className="text-xs text-[var(--g3-muted)]">
                                Além deste, há {anexosOcultos} arquivo(s) anexado(s) neste documento.
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch lg:flex-row lg:items-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void imprimirAnexo(anexoPrincipal)}
                            disabled={anexoProcessandoId === anexoPrincipal.id}
                          >
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                            Imprimir
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => solicitarSubstituicaoAnexo(anexoPrincipal.id)}
                            disabled={substituirAnexoMutation.isPending || anexoProcessandoId === anexoPrincipal.id}
                          >
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                            Substituir
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => void excluirAnexoExistente(anexoPrincipal)}
                            disabled={excluirAnexoMutation.isPending || anexoProcessandoId === anexoPrincipal.id}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                      {anexosParaExibir.length > 1 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-[var(--g3-muted)]">Demais arquivos anexados</p>
                          {anexosParaExibir.slice(1).map((anexo) => (
                            <div
                              key={anexo.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/10 p-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{anexo.nomeArquivo}</p>
                                <p className="text-xs text-[var(--g3-muted)]">
                                  {anexo.tipoMime ?? "application/pdf"} • {anexo.tamanho ?? "---"}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void abrirAnexo(anexo)}
                                  disabled={anexoProcessandoId === anexo.id}
                                >
                                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                                  Visualizar
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void imprimirAnexo(anexo)}
                                  disabled={anexoProcessandoId === anexo.id}
                                >
                                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                                  Imprimir
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => solicitarSubstituicaoAnexo(anexo.id)}
                                  disabled={substituirAnexoMutation.isPending || anexoProcessandoId === anexo.id}
                                >
                                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                                  Substituir
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => void excluirAnexoExistente(anexo)}
                                  disabled={excluirAnexoMutation.isPending || anexoProcessandoId === anexo.id}
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Excluir
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/15 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-full bg-[var(--g3-primary-soft)] p-2 text-[var(--g3-active)]">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">Nenhum arquivo enviado</p>
                          <p className="text-xs text-[var(--g3-muted)]">
                            Use o botão acima para anexar um ou mais arquivos deste documento.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {abaAtiva === "links" ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[var(--g3-primary-soft)]/30 p-4">
              <div className="space-y-1">
                <h3 className="flex items-center gap-2 font-semibold text-[var(--g3-active)]">
                  <ExternalLink className="h-5 w-5" />
                  Gerenciar Links Externos
                </h3>
                <p className="text-sm text-[var(--g3-muted)]">
                  Mantenha a lista de sites de certidões atualizada. Eles aparecerão no cadastro por tipo.
                </p>
              </div>
              <Button onClick={novoLink}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Link
              </Button>
            </div>

            {modoEdicaoLink && (
              <Card className="border-[var(--g3-active)] bg-[var(--g3-primary-soft)]/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{formLink.id ? "Editar Link" : "Novo Link"}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Nome do Link *</Label>
                    <Input
                      placeholder="Ex: Receita Federal"
                      value={formLink.nome}
                      onChange={(e) => setFormLink({ ...formLink, nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>URL (Endereço do Site) *</Label>
                    <Input
                      placeholder="https://..."
                      value={formLink.url}
                      onChange={(e) => setFormLink({ ...formLink, url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="mb-2 block">Tipos de Documento Relacionados (Selecione um ou mais)</Label>
                    <div className="flex flex-wrap gap-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-3 max-h-48 overflow-y-auto">
                      {tiposDocumentoTerceiroSetor.map((tipo) => {
                        const selecionado = formLink.tiposRelacionados?.split(", ").includes(tipo);
                        return (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => alternarTipoNoLink(tipo)}
                            className={`rounded-full px-3 py-1 text-xs transition-colors ${
                              selecionado 
                                ? "bg-[var(--g3-active)] text-white" 
                                : "bg-[var(--g3-primary-soft)] text-[var(--g3-active)] hover:bg-[var(--g3-active)]/20"
                            }`}
                          >
                            {tipo}
                          </button>
                        );
                      })}
                    </div>
                    {formLink.tiposRelacionados && (
                      <p className="mt-2 text-[10px] text-[var(--g3-muted)]">
                        <strong>Selecionados:</strong> {formLink.tiposRelacionados}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Observação</Label>
                    <Input
                      placeholder="Dica extra para o usuário"
                      value={formLink.observacao}
                      onChange={(e) => setFormLink({ ...formLink, observacao: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button onClick={() => void salvarLink()}>Salvar</Button>
                    <Button variant="outline" onClick={() => setModoEdicaoLink(false)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left w-12">Acesso</th>
                    <th className="px-3 py-2 text-left">Nome do Site</th>
                    <th className="px-3 py-2 text-left">Vínculos (Tipos)</th>
                    <th className="px-3 py-2 text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLinks ? (
                    <tr><td colSpan={4} className="p-4 text-center">Carregando...</td></tr>
                  ) : linksExternos.length ? (
                    linksExternos.map((link) => (
                      <tr key={link.id} className="border-t border-[var(--g3-border)] hover:bg-[var(--g3-primary-soft)]/20">
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 px-0"
                            title="Abrir site"
                            onClick={() => window.open(link.url, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 text-blue-600" />
                          </Button>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{link.nome}</div>
                          {link.observacao && <div className="text-[10px] text-amber-600">{link.observacao}</div>}
                        </td>
                        <td className="px-3 py-2 text-[var(--g3-muted)]">
                          {link.tiposRelacionados || "---"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 px-0" onClick={() => editarLink(link)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 px-0 text-red-500"
                              onClick={() => setConfirmarExcluirLink(link.id!)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="p-4 text-center">Nenhum link cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "anexos" ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={abrirSeletorArquivosPendentes} disabled={carregandoAcoes}>
                <Upload className="mr-1 h-3.5 w-3.5" />
                Adicionar arquivos
              </Button>
              <span className="text-sm text-[var(--g3-muted)]">
                Documento selecionado: {form.id ? form.tipoDocumento : "Nenhum ainda salvo"}
              </span>
            </div>

            {anexosPendentes.length > 0 ? (
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Arquivos pendentes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {anexosPendentes.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{file.name}</p>
                        <p className="text-xs text-[var(--g3-muted)]">{formatarTamanhoArquivo(file)}</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => limparArquivoPendente(index)}>
                        Remover
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-[var(--g3-muted)]">
                    Esses arquivos serão gravados quando você clicar em salvar o documento.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Anexos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {anexos.length ? (
                    anexos.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-2 text-sm"
                      >
                        <p className="font-semibold">{item.nomeArquivo}</p>
                        <p className="text-xs text-[var(--g3-muted)]">
                          {item.tipoMime ?? item.tipo} - {item.tamanho ?? "---"}
                        </p>
                        {item.arquivoUrl ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void abrirAnexo(item)}
                            >
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              Visualizar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void imprimirAnexo(item)}
                              disabled={anexoProcessandoId === item.id}
                            >
                              <Printer className="mr-1.5 h-3.5 w-3.5" />
                              Imprimir
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => solicitarSubstituicaoAnexo(item.id)}
                              disabled={substituirAnexoMutation.isPending || anexoProcessandoId === item.id}
                            >
                              <Upload className="mr-1.5 h-3.5 w-3.5" />
                              Substituir
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => void excluirAnexoExistente(item)}
                              disabled={excluirAnexoMutation.isPending || anexoProcessandoId === item.id}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Excluir
                            </Button>
                          </div>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--g3-muted)]">Nenhum anexo encontrado.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Histórico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder="Descreva a atualização realizada"
                      value={historicoTexto}
                      onChange={(event) => setHistoricoTexto(event.target.value)}
                    />
                    <Button onClick={() => void adicionarHistorico()} disabled={!form.id}>
                      Adicionar
                    </Button>
                  </div>
                  <div className="max-h-52 space-y-1 overflow-y-auto">
                    {historico.length ? (
                      historico.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-2 text-xs"
                        >
                          <p className="font-semibold">{item.tipoAlteracao}</p>
                          <p>{item.observacao ?? "---"}</p>
                          <p className="text-[var(--g3-muted)]">
                            {item.usuario} - {item.dataHora}
                          </p>
                        </article>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--g3-muted)]">Nenhum histórico registrado.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {abaAtiva === "alertas" ? (
          <section className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Documento</th>
                    <th className="px-3 py-2 text-left">Validade</th>
                    <th className="px-3 py-2 text-left">Dias para vencer</th>
                    <th className="px-3 py-2 text-left">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.length ? (
                    alertas.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-t border-[var(--g3-border)] ${obterClasseLinhaDocumento(item.situacao, index)}`}
                      >
                        <td className="px-3 py-2 font-medium">{item.tipoDocumento}</td>
                        <td className="px-3 py-2">{item.validade ? formatarDataPtBr(item.validade) : "---"}</td>
                        <td className="px-3 py-2">{item.diasParaVencer}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${obterClasseSeloSituacao(item.situacao)}`}>
                            <IconeSituacaoDocumento situacao={item.situacao} />
                            {formatarSituacaoDocumento(item.situacao)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center">
                        Nenhum alerta de vencimento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "relatorios" ? (
          <section className="grid gap-3 md:grid-cols-3">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total de documentos</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                {documentos.length}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Em renovação</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-amber-600">
                {documentos.filter((item) => item.emRenovacao).length}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Vencidos</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-danger)]">
                {documentos.filter((item) => item.situacao === "vencido").length}
              </CardContent>
            </Card>
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

      <PopupConfirmacao
        aberto={!!confirmarExcluirLink}
        titulo="Remover Link Externo"
        texto="Deseja realmente remover este site da lista?"
        onCancel={() => setConfirmarExcluirLink(null)}
        onConfirm={() => void confirmarExclusaoLink()}
        confirmarTexto="Sim, Remover"
      />

      {/* Popup de Sugestão de Link Externo */}
      {sugestaoLinkAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-[var(--g3-active)] shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader className="bg-[var(--g3-primary-soft)]/20 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-[var(--g3-active)]">
                  <ExternalLink className="h-5 w-5" />
                  Site Sugerido
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSugestaoLinkAberto(false)} className="h-8 w-8 px-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <p className="text-sm text-[var(--g3-muted)]">
                Para o tipo de documento <strong>{form.tipoDocumento}</strong>, recomendamos acessar o site oficial para emissão ou conferência:
              </p>
              
              <div className="space-y-3">
                {linksParaSugerir.map((link) => (
                  <div key={link.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3 transition-colors hover:bg-[var(--g3-primary-soft)]/10">
                    <div className="mb-1 font-semibold text-sm">{link.nome}</div>
                    {link.observacao && <p className="mb-3 text-[11px] text-amber-600 font-medium">Atenção: {link.observacao}</p>}
                    <Button 
                      className="w-full gap-2 text-xs" 
                      onClick={() => {
                        window.open(link.url, "_blank");
                        setSugestaoLinkAberto(false);
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Acessar Site Agora
                    </Button>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-center">
                <button 
                  onClick={() => setSugestaoLinkAberto(false)}
                  className="text-xs text-[var(--g3-muted)] underline hover:text-[var(--g3-active)]"
                >
                  Continuar sem acessar
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
