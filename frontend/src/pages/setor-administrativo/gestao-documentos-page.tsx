import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  FileStack,
  FolderOpen,
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
import { imprimirConteudoAtual } from "@/lib/report-utils";
import { documentosInstituicaoService } from "@/services/documentos-instituicao.service";
import type {
  DocumentoInstituicao,
  DocumentoInstituicaoAnexo,
  DocumentoInstituicaoAnexoPayload,
  DocumentoInstituicaoPayload
} from "@/types/documentos-instituicao";
import { useAuth } from "@/hooks/use-auth";

type AbaId = "lista" | "cadastro" | "anexos" | "alertas" | "relatorios";

const abas: AdminTab[] = [
  { id: "lista", label: "Lista de documentos", icon: FolderOpen },
  { id: "cadastro", label: "Cadastro e edição", icon: FileStack },
  { id: "alertas", label: "Alertas e vencimentos", icon: AlertTriangle },
  { id: "relatorios", label: "Relatórios e dashboard", icon: Bell }
];

const tituloTela = "Gestão de documentos";

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

function obterTipoAnexoArquivo(file: File) {
  const nome = file.name.trim().toLowerCase();
  const indiceExtensao = nome.lastIndexOf(".");
  if (indiceExtensao >= 0 && indiceExtensao < nome.length - 1) {
    return nome.slice(indiceExtensao + 1).toUpperCase().slice(0, 30);
  }

  const mime = file.type.trim().toLowerCase();
  if (!mime) return "ARQUIVO";

  const tipoCurto = mime.includes("/") ? mime.split("/").at(-1) ?? mime : mime;
  const valor = tipoCurto
    .replace(/[\s._/-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .trim()
    .toUpperCase()
    .slice(0, 30);

  return valor || "ARQUIVO";
}

function ehArquivoPdf(file: File) {
  const nome = file.name.trim().toLowerCase();
  return file.type === "application/pdf" || nome.endsWith(".pdf");
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
  const [anexoPrincipalLocal, setAnexoPrincipalLocal] = useState<DocumentoInstituicaoAnexo | null>(null);
  const [anexoParaSubstituirId, setAnexoParaSubstituirId] = useState<string | null>(null);
  const [anexoProcessandoId, setAnexoProcessandoId] = useState<string | null>(null);

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
    return documentos.filter((item) => {
      const alvo = `${item.tipoDocumento} ${item.orgaoEmissor} ${item.categoria ?? ""} ${item.situacao ?? ""}`;
      return alvo.toLowerCase().includes(termo);
    });
  }, [busca, documentos]);

  const alertas = useMemo(() => {
    const hoje = new Date();
    return documentos
      .filter((item) => !!item.validade)
      .map((item) => {
        const validade = new Date(String(item.validade));
        const diffDias = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...item,
          diasParaVencer: diffDias
        };
      })
      .sort((a, b) => a.diasParaVencer - b.diasParaVencer);
  }, [documentos]);

  const anexos = anexosQuery.data ?? [];
  const anexoPrincipal = anexos[0] ?? anexoPrincipalLocal;
  const anexosOcultos = Math.max(0, anexos.length > 0 ? anexos.length - 1 : 0);
  const carregandoAnexo = Boolean(form.id) && (anexosQuery.isLoading || anexosQuery.isFetching) && !anexoPrincipal;
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

  useEffect(() => {
    setAnexoPrincipalLocal(null);
  }, [form.id]);

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

  function novo() {
    const proximo = criarFormularioPadrao(responsavelLogado);
    setForm(proximo);
    setSnapshot(proximo);
    setHistoricoTexto("");
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
    setAbaAtiva("cadastro");
  }

  function buscar() {
    setAbaAtiva("lista");
  }

  function cancelar() {
    setForm(snapshot);
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

      const response = await salvarMutation.mutateAsync(payload);
      const proximo = { ...payload, id: response.id };
      setForm(proximo);
      setSnapshot(proximo);
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Documento salvo com sucesso." });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o documento."
      });
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

  async function subirAnexo(file: File) {
    if (!ehArquivoPdf(file)) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Envie apenas arquivos em PDF."
      });
      return;
    }

    if (form.id) {
      try {
        const upload = await documentosInstituicaoService.uploadArquivoAnexo(form.id, file);
        const payload: DocumentoInstituicaoAnexoPayload = {
          nomeArquivo: upload.nomeOriginal || file.name,
          tipo: obterTipoAnexoArquivo(file),
          tipoMime: upload.mimeType || file.type || "application/octet-stream",
          conteudoBase64: upload.caminhoArquivo,
          tamanho: `${Math.round((upload.tamanhoBytes ?? file.size) / 1024)} KB`,
          dataUpload: new Date().toISOString().slice(0, 10),
          usuario: responsavelLogado || "Usuário"
        };

        const anexo = await anexoMutation.mutateAsync({ id: form.id, payload });
        setAnexoPrincipalLocal(anexo);
        setPopupMensagem({
          tipo: "sucesso",
          titulo: "Confirmação",
          texto: "Anexo enviado com sucesso."
        });
      } catch (error: any) {
        setPopupMensagem({
          tipo: "erro",
          titulo: "Erro",
          texto: error?.response?.data?.message ?? "Não foi possível enviar o anexo."
        });
      }
      return;
    }

    if (!form.id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um documento antes de anexar arquivo."
      });
      return;
    }

    const conteudoBase64 = await file.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      return btoa(binary);
    });

    const payload: DocumentoInstituicaoAnexoPayload = {
      nomeArquivo: file.name,
      tipo: obterTipoAnexoArquivo(file),
      tipoMime: file.type || "application/octet-stream",
      conteudoBase64,
      tamanho: `${Math.round(file.size / 1024)} KB`,
      dataUpload: new Date().toISOString().slice(0, 10),
      usuario: responsavelLogado || "Usuário"
    };

    try {
      const anexo = await anexoMutation.mutateAsync({ id: form.id, payload });
      setAnexoPrincipalLocal(anexo);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Anexo enviado com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível enviar o anexo."
      });
    }
  }

  async function substituirAnexoExistente(anexoId: string, file: File) {
    if (!ehArquivoPdf(file)) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Envie apenas arquivos em PDF."
      });
      setAnexoParaSubstituirId(null);
      return;
    }

    if (form.id) {
      setAnexoProcessandoId(anexoId);
      try {
        const upload = await documentosInstituicaoService.uploadArquivoAnexo(form.id, file);
        const payload: DocumentoInstituicaoAnexoPayload = {
          nomeArquivo: upload.nomeOriginal || file.name,
          tipo: obterTipoAnexoArquivo(file),
          tipoMime: upload.mimeType || file.type || "application/octet-stream",
          conteudoBase64: upload.caminhoArquivo,
          tamanho: `${Math.round((upload.tamanhoBytes ?? file.size) / 1024)} KB`,
          dataUpload: new Date().toISOString().slice(0, 10),
          usuario: responsavelLogado || "Usuário"
        };

        const anexo = await substituirAnexoMutation.mutateAsync({ id: form.id, anexoId, payload });
        setAnexoPrincipalLocal(anexo);
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
      }
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

    const conteudoBase64 = await file.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      return btoa(binary);
    });

    const payload: DocumentoInstituicaoAnexoPayload = {
      nomeArquivo: file.name,
      tipo: obterTipoAnexoArquivo(file),
      tipoMime: file.type || "application/octet-stream",
      conteudoBase64,
      tamanho: `${Math.round(file.size / 1024)} KB`,
      dataUpload: new Date().toISOString().slice(0, 10),
      usuario: responsavelLogado || "Usuário"
    };

    setAnexoProcessandoId(anexoId);
    try {
      await substituirAnexoMutation.mutateAsync({ id: form.id, anexoId, payload });
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
    }
  }

  async function abrirAnexo(item: DocumentoInstituicaoAnexo) {
    try {
      await abrirArquivoAutenticado(item.arquivoUrl, item.nomeArquivo);
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível visualizar o anexo."
      });
    }
  }

  async function imprimirAnexo(item: DocumentoInstituicaoAnexo) {
    setAnexoProcessandoId(item.id);
    try {
      await imprimirArquivoAutenticado(item.arquivoUrl, item.nomeArquivo);
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
    document.getElementById("arquivoDocumentoSubstituicao")?.click();
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
      setAnexoPrincipalLocal(null);
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
                    <th className="px-3 py-2 text-left">Emissão</th>
                    <th className="px-3 py-2 text-left">Validade</th>
                    <th className="px-3 py-2 text-left">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center">
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
                      <td colSpan={5} className="px-3 py-4 text-center">
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
            <input
              id="arquivoDocumento"
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void subirAnexo(file);
                }
                event.target.value = "";
              }}
            />
            <input
              id="arquivoDocumentoSubstituicao"
              type="file"
              accept=".pdf,application/pdf"
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
            <div className="space-y-1">
              <Label>Tipo de documento *</Label>
              <Select
                value={form.tipoDocumento}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, tipoDocumento: event.target.value }))
                }
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
            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={form.descricao ?? ""}
                onChange={(event) => setForm((atual) => ({ ...atual, descricao: event.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Observação de renovação</Label>
              <Textarea
                rows={2}
                value={form.observacaoRenovacao ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, observacaoRenovacao: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2 xl:col-span-4">
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-sm">Documento em PDF</CardTitle>
                      <p className="text-xs text-[var(--g3-muted)]">
                        Envie o PDF principal deste cadastro para visualizar, imprimir, substituir ou excluir.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        anexoPrincipal
                          ? solicitarSubstituicaoAnexo(anexoPrincipal.id)
                          : document.getElementById("arquivoDocumento")?.click()
                      }
                      disabled={!form.id || carregandoAcoes || anexoProcessandoId === anexoPrincipal?.id}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      {anexoPrincipal ? "Substituir PDF" : "Enviar PDF"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!form.id ? (
                    <div className="rounded-md border border-dashed border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-4 text-sm text-[var(--g3-muted)]">
                      Salve o documento primeiro para habilitar o envio do PDF.
                    </div>
                  ) : carregandoAnexo ? (
                    <div className="rounded-md border border-dashed border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/15 p-4 text-sm text-[var(--g3-muted)]">
                      Carregando PDF enviado...
                    </div>
                  ) : anexoPrincipal ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start gap-3 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
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
                              Há {anexosOcultos} arquivo(s) anterior(es) mantido(s) no histórico interno.
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void abrirAnexo(anexoPrincipal)}
                          disabled={anexoProcessandoId === anexoPrincipal.id}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Visualizar
                        </Button>
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
                  ) : (
                    <div className="rounded-md border border-dashed border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/15 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-full bg-[var(--g3-primary-soft)] p-2 text-[var(--g3-active)]">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">Nenhum PDF enviado</p>
                          <p className="text-xs text-[var(--g3-muted)]">
                            Use o botão acima para anexar o PDF principal deste documento.
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

        {abaAtiva === "anexos" ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="arquivoDocumento"
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void subirAnexo(file);
                  }
                  event.target.value = "";
                }}
              />
              <input
                id="arquivoDocumentoSubstituicao"
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
              <Button
                variant="outline"
                onClick={() => document.getElementById("arquivoDocumento")?.click()}
                disabled={!form.id}
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                Enviar Anexo
              </Button>
              <span className="text-sm text-[var(--g3-muted)]">
                Documento selecionado: {form.id ? form.tipoDocumento : "Nenhum"}
              </span>
            </div>

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
    </>
  );
}
