import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ChevronRight,
  Camera,
  Fingerprint,
  History,
  KeyRound,
  ListFilter,
  LoaderCircle,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  UserRound,
  X
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  usuarioDefaultValues,
  usuarioFormSchema,
  usuarioOrigemOptions,
  usuarioStatusOptions,
  type UsuarioFormInput,
  type UsuarioFormValues
} from "@/features/usuarios/usuario.schema";
import {
  useRemoverUsuarioFace,
  useAtualizarStatusUsuario,
  usePermissoesUsuarios,
  useRemoverUsuario,
  useResetarSenhaUsuario,
  useSalvarUsuario,
  useSalvarUsuarioFace,
  useCatalogoAcessos,
  useSalvarUsuarioAcessos,
  useUsuarioAcessos,
  useUsuario,
  useUsuarioFace,
  useUsuarios
} from "@/features/usuarios/use-usuarios";
import { obterUrlArquivoAutenticado } from "@/lib/arquivos";
import { formatarTextoPorCampo } from "@/lib/text-formatter";
import { mapaCamposTextoUsuarioForm } from "@/lib/text-format-config";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import { beneficiariosService } from "@/services/beneficiarios.service";
import { profissionaisService } from "@/services/profissionais.service";
import { voluntariosService } from "@/services/voluntarios.service";
import type { Beneficiario } from "@/types/beneficiario";
import type { Profissional } from "@/types/profissional";
import type {
  Usuario,
  UsuarioAcessoInput,
  UsuarioFiltros,
  UsuarioOrigemTipo,
  UsuarioPayload,
  UsuarioPermissaoCatalogo,
  UsuarioStatus
} from "@/types/usuario";
import type { Voluntario } from "@/types/voluntario";

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem de usuários", icon: ListFilter },
  { id: "cadastro", label: "Cadastro e edição", icon: UserRound },
  { id: "permissoes", label: "Permissões e acessos", icon: ShieldCheck },
  { id: "auditoria", label: "Auditoria e histórico", icon: History }
];

type AbaId = (typeof abas)[number]["id"];

type ConfirmacaoState =
  | {
      tipo: "status";
      titulo: string;
      texto: string;
      usuarioId: string;
      status: UsuarioStatus;
    }
  | {
      tipo: "excluir";
      titulo: string;
      texto: string;
      usuarioId: string;
    }
  | {
      tipo: "remover_face";
      titulo: string;
      texto: string;
      usuarioId: string;
    };

type OrigemBuscaItem = {
  tipo: UsuarioOrigemTipo;
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  unidade?: string;
  setor?: string;
  cargo?: string;
  descricao?: string;
};

type ResumoTela = {
  tela: string;
  modulo: string;
  acoes: {
    visualizar?: string;
    editar?: string;
    excluir?: string;
    aprovar?: string;
    imprimir?: string;
    exportar?: string;
    configurar?: string;
  };
};

const pageSizeDefault = 10;

function mapUsuarioParaFormulario(usuario: Usuario): UsuarioFormValues {
  return {
    ...usuarioDefaultValues,
    id_usuario: usuario.id_usuario,
    nome_completo: usuario.nome_completo ?? "",
    nome_exibicao: usuario.nome_exibicao ?? "",
    nome_usuario: usuario.nome_usuario,
    email: usuario.email ?? "",
    telefone: usuario.telefone ?? "",
    cpf: usuario.cpf ?? "",
    matricula: usuario.matricula ?? "",
    setor: usuario.setor ?? "",
    unidade: usuario.unidade ?? "",
    cargo: usuario.cargo ?? "",
    perfil_acesso: usuario.perfil_acesso ?? usuario.permissoes[0] ?? "OPERADOR",
    permissoes: usuario.permissoes.length ? usuario.permissoes : ["OPERADOR"],
    status: usuario.status,
    exigir_troca_senha: usuario.exigir_troca_senha,
    exigir_autenticacao_segura: usuario.exigir_autenticacao_segura,
    permitir_biometria_facial_login: usuario.permitir_biometria_facial_login,
    exigir_biometria_facial_login: usuario.exigir_biometria_facial_login,
    origem_tipo: usuario.origem_tipo,
    origem_id: usuario.origem_id,
    origem_nome: usuario.origem_nome,
    senha: "",
    confirmar_senha: ""
  };
}

function mapFormularioParaPayload(values: UsuarioFormValues): UsuarioPayload {
  const permissoes = Array.from(
    new Set(
      [...(values.permissoes ?? []), values.perfil_acesso ?? ""]
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
    )
  );

  const payload: UsuarioPayload = {
    nome_completo: values.nome_completo.trim(),
    nome_exibicao: values.nome_exibicao?.trim() || undefined,
    nome_usuario: values.nome_usuario.trim(),
    email: values.email.trim(),
    telefone: values.telefone?.trim() || undefined,
    cpf: values.cpf?.trim() || undefined,
    matricula: values.matricula?.trim() || undefined,
    setor: values.setor?.trim() || undefined,
    unidade: values.unidade?.trim() || undefined,
    cargo: values.cargo?.trim() || undefined,
    perfil_acesso: values.perfil_acesso?.trim().toUpperCase() || undefined,
    permissoes,
    status: values.status,
    exigir_troca_senha: !!values.exigir_troca_senha,
    exigir_autenticacao_segura: !!values.exigir_autenticacao_segura,
    permitir_biometria_facial_login: !!values.permitir_biometria_facial_login,
    exigir_biometria_facial_login: !!values.exigir_biometria_facial_login,
    origem_tipo: values.origem_tipo,
    origem_id: values.origem_id?.trim() || undefined,
    origem_nome: values.origem_nome?.trim() || undefined
  };

  if (!values.id_usuario) {
    payload.senha = values.senha?.trim();
    payload.confirmar_senha = values.confirmar_senha?.trim();
  }

  return payload;
}

function formatarDataHora(valor?: string) {
  if (!valor) return "---";
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleString("pt-BR");
}

function formatarStatus(status: UsuarioStatus) {
  if (status === "ATIVO") return "Ativo";
  if (status === "INATIVO") return "Inativo";
  return "Bloqueado";
}

function formatarTipoOrigem(tipo?: UsuarioOrigemTipo) {
  if (tipo === "BENEFICIARIO") return "Beneficiário";
  if (tipo === "PROFISSIONAL") return "Profissional";
  if (tipo === "VOLUNTARIO") return "Voluntário";
  return "Sem vínculo";
}

function formatarPerfil(nome?: string) {
  if (!nome) return "Não definido";
  if (nome === "ADMINISTRADOR") return "Administrador";
  if (nome === "OPERADOR") return "Operacional";
  if (nome === "LEITURA_APENAS") return "Leitura apenas";
  return nome
    .toLowerCase()
    .split("_")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

function ordenarPermissoesPorModulo(permissoes: UsuarioPermissaoCatalogo[]) {
  const map = new Map<string, UsuarioPermissaoCatalogo[]>();
  permissoes.forEach((item) => {
    const grupo = map.get(item.modulo) ?? [];
    grupo.push(item);
    map.set(item.modulo, grupo);
  });

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .map(([modulo, itens]) => ({
      modulo,
      itens: itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    }));
}

function agruparPermissoesPorTela(permissoes: UsuarioPermissaoCatalogo[], selecionadas: string[]): ResumoTela[] {
  const porTela = new Map<string, ResumoTela>();

  permissoes
    .filter((item) => selecionadas.includes(item.nome))
    .forEach((item) => {
      const chave = `${item.modulo}::${item.tela}`;
      const atual =
        porTela.get(chave) ??
        ({
          modulo: item.modulo,
          tela: item.tela,
          acoes: {}
        } satisfies ResumoTela);

      const acao = item.acao.toLowerCase();
      if (acao.includes("visualizar") || acao.includes("leitura") || acao.includes("acesso")) atual.acoes.visualizar = item.nome;
      if (acao.includes("editar") || acao.includes("cadastrar") || acao.includes("alterar") || acao.includes("operar")) atual.acoes.editar = item.nome;
      if (acao.includes("excluir") || acao.includes("remover") || acao.includes("deletar")) atual.acoes.excluir = item.nome;
      if (acao.includes("aprovar") || acao.includes("autorizar")) atual.acoes.aprovar = item.nome;
      if (acao.includes("imprimir")) atual.acoes.imprimir = item.nome;
      if (acao.includes("exportar")) atual.acoes.exportar = item.nome;
      if (acao.includes("configurar")) atual.acoes.configurar = item.nome;

      porTela.set(chave, atual);
    });

  return [...porTela.values()].sort((a, b) =>
    `${a.modulo} ${a.tela}`.localeCompare(`${b.modulo} ${b.tela}`, "pt-BR")
  );
}

function sugerirLogin(nome: string, email?: string) {
  const candidatoEmail = email?.split("@")[0]?.trim();
  if (candidatoEmail) {
    return candidatoEmail.toLowerCase();
  }

  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
}

function mapBeneficiarioOrigem(item: Beneficiario): OrigemBuscaItem {
  return {
    tipo: "BENEFICIARIO",
    id: item.id_beneficiario ?? "",
    nome: item.nome_completo,
    cpf: item.cpf,
    email: item.email,
    telefone: item.telefone_principal,
    setor: "Beneficiários",
    descricao: item.codigo ? `Código ${item.codigo}` : undefined
  };
}

function mapProfissionalOrigem(item: Profissional): OrigemBuscaItem {
  return {
    tipo: "PROFISSIONAL",
    id: item.id_profissional ?? "",
    nome: item.nome_completo,
    cpf: item.cpf,
    email: item.email,
    telefone: item.telefone,
    unidade: item.unidade,
    setor: item.vinculo,
    cargo: item.categoria,
    descricao: item.categoria
  };
}

function mapVoluntarioOrigem(item: Voluntario): OrigemBuscaItem {
  return {
    tipo: "VOLUNTARIO",
    id: item.id_voluntario ?? "",
    nome: item.nome_completo,
    cpf: item.cpf,
    email: item.email,
    telefone: item.telefone,
    setor: "Voluntariado",
    cargo: item.profissao,
    descricao: item.profissao
  };
}

export function UsuariosPage() {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [idSelecionado, setIdSelecionado] = useState<string>();
  const [snapshot, setSnapshot] = useState<UsuarioFormValues | null>(null);
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [popupConfirmacao, setPopupConfirmacao] = useState<ConfirmacaoState | null>(null);
  const [popupResetSenhaAberto, setPopupResetSenhaAberto] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [exigirTrocaSenhaReset, setExigirTrocaSenhaReset] = useState(true);
  const [buscaPermissao, setBuscaPermissao] = useState("");
  const [modulosExpandidos, setModulosExpandidos] = useState<string[]>([]);
  const [origemBusca, setOrigemBusca] = useState("");
  const [origemBuscaAplicada, setOrigemBuscaAplicada] = useState("");
  const [popupFaceAberto, setPopupFaceAberto] = useState(false);
  const [rascunhoFace, setRascunhoFace] = useState("");
  const [previewFaceUrl, setPreviewFaceUrl] = useState("");
  const [cameraFaceAtiva, setCameraFaceAtiva] = useState(false);
  const [acessosRascunho, setAcessosRascunho] = useState<UsuarioAcessoInput[]>([]);
  const [filtroDraft, setFiltroDraft] = useState<UsuarioFiltros>({
    nome: "",
    login: "",
    email: "",
    perfil: "",
    setor: "",
    unidade: "",
    status: "",
    criado_de: "",
    criado_ate: "",
    pagina: 1,
    tamanho_pagina: pageSizeDefault
  });
  const [filtros, setFiltros] = useState<UsuarioFiltros>(filtroDraft);

  const { data: listaData, isLoading: carregandoLista, isFetching: atualizandoLista } = useUsuarios(filtros);
  const { data: usuarioData, isLoading: carregandoUsuario } = useUsuario(idSelecionado);
  const { data: faceData, isLoading: carregandoFace } = useUsuarioFace(idSelecionado);
  const { data: permissoesData, isLoading: carregandoPermissoes } = usePermissoesUsuarios();
  const { data: acessosData, isLoading: carregandoAcessos } = useUsuarioAcessos(idSelecionado);
  const { data: catalogoAcessos } = useCatalogoAcessos();

  const salvarMutation = useSalvarUsuario();
  const atualizarStatusMutation = useAtualizarStatusUsuario();
  const resetarSenhaMutation = useResetarSenhaUsuario();
  const salvarFaceMutation = useSalvarUsuarioFace();
  const removerFaceMutation = useRemoverUsuarioFace();
  const removerMutation = useRemoverUsuario();
  const salvarAcessosMutation = useSalvarUsuarioAcessos();
  const videoFaceRef = useRef<HTMLVideoElement | null>(null);
  const streamFaceRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!idSelecionado) {
      setAcessosRascunho([]);
      return;
    }
    if (acessosData?.acessos) {
      setAcessosRascunho(acessosData.acessos.map((acesso) => ({
        instituicao_id: acesso.instituicao_id,
        entidade_juridica_id: acesso.entidade_juridica_id,
        unidade_id: acesso.unidade_id,
        projeto_id: acesso.projeto_id,
        perfil_nome: acesso.perfil_nome,
        escopo: acesso.escopo,
        ativo: acesso.ativo
      })));
    }
  }, [acessosData?.acessos, idSelecionado]);

  const {
    register,
    reset,
    setValue,
    getValues,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<UsuarioFormInput, unknown, UsuarioFormValues>({
    resolver: zodResolver(usuarioFormSchema),
    defaultValues: usuarioDefaultValues as UsuarioFormInput
  });

  const permissoesSelecionadasValue = watch("permissoes");
  const perfilSelecionado = watch("perfil_acesso") ?? "OPERADOR";
  const origemTipoSelecionada = watch("origem_tipo");
  const origemNomeSelecionada = watch("origem_nome");
  const emailUsuarioAtual = watch("email");
  const usuarioIdAtual = watch("id_usuario");
  const ehAdminImutavel = emailUsuarioAtual?.toLowerCase() === "htasistemas@gmail.com";

  const permissoesSelecionadas = Array.isArray(permissoesSelecionadasValue)
    ? permissoesSelecionadasValue
    : typeof permissoesSelecionadasValue === "string"
      ? permissoesSelecionadasValue
          .split(/[;,]/g)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  const acaoEmAndamento =
    salvarMutation.isPending ||
    atualizarStatusMutation.isPending ||
    resetarSenhaMutation.isPending ||
    salvarFaceMutation.isPending ||
    removerFaceMutation.isPending ||
    removerMutation.isPending ||
    salvarAcessosMutation.isPending;

  const gruposPermissoes = useMemo(() => {
    const todos = ordenarPermissoesPorModulo(permissoesData?.permissoes ?? []);
    if (!buscaPermissao.trim()) return todos;

    const termo = buscaPermissao.toLowerCase();
    return todos
      .map((grupo) => ({
        ...grupo,
        itens: grupo.itens.filter(
          (item) =>
            item.nome.toLowerCase().includes(termo) ||
            item.modulo.toLowerCase().includes(termo) ||
            item.tela.toLowerCase().includes(termo) ||
            item.acao.toLowerCase().includes(termo)
        )
      }))
      .filter((grupo) => grupo.itens.length > 0);
  }, [buscaPermissao, permissoesData?.permissoes]);

  const resumoPermissoes = useMemo(
    () => agruparPermissoesPorTela(permissoesData?.permissoes ?? [], permissoesSelecionadas),
    [permissoesData?.permissoes, permissoesSelecionadas]
  );

  const perfisDisponiveis = useMemo(() => {
    const base = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
    const extras = [perfilSelecionado].filter(Boolean);
    return Array.from(
      new Set(
        [...base, ...extras].filter((item) =>
          (permissoesData?.permissoes ?? []).some((permissao) => permissao.nome === item)
        )
      )
    );
  }, [perfilSelecionado, permissoesData?.permissoes]);

  const origemBuscaHabilitada = !!origemTipoSelecionada && origemBuscaAplicada.trim().length >= 2;

  const { data: origemResultados = [], isFetching: buscandoOrigem } = useQuery({
    queryKey: ["usuarios", tenantKey, "origem", origemTipoSelecionada, origemBuscaAplicada],
    enabled: origemBuscaHabilitada,
    queryFn: async (): Promise<OrigemBuscaItem[]> => {
      const termo = origemBuscaAplicada.trim();
      if (origemTipoSelecionada === "BENEFICIARIO") {
        const resultado = await beneficiariosService.listar({ nome: termo });
        return (resultado.beneficiarios ?? []).map(mapBeneficiarioOrigem).filter((item) => item.id);
      }

      if (origemTipoSelecionada === "PROFISSIONAL") {
        const resultado = await profissionaisService.listar({ nome: termo });
        return (resultado.profissionais ?? []).map(mapProfissionalOrigem).filter((item) => item.id);
      }

      const resultado = await voluntariosService.listar({ nome: termo });
      return (resultado.voluntarios ?? []).map(mapVoluntarioOrigem).filter((item) => item.id);
    }
  });

  useEffect(() => {
    if (!usuarioData?.usuario) return;
    const formValues = mapUsuarioParaFormulario(usuarioData.usuario);
    reset(formValues);
    setSnapshot(formValues);
  }, [reset, usuarioData]);

  useEffect(() => {
    setRascunhoFace("");
    if (!idSelecionado) {
      setPreviewFaceUrl("");
    }
  }, [idSelecionado]);

  useEffect(() => {
    if (!idSelecionado) {
      setPreviewFaceUrl("");
      return;
    }

    if (rascunhoFace) {
      setPreviewFaceUrl(rascunhoFace);
      return;
    }

    const faceUrlSalva = faceData?.face_url;
    if (!faceUrlSalva) {
      setPreviewFaceUrl("");
      return;
    }

    let ativo = true;
    let revokeAtual: (() => void) | undefined;

    async function carregarPreviewSalva() {
      try {
        const arquivo = await obterUrlArquivoAutenticado(faceUrlSalva, { cache: false, auditar: false });
        if (!ativo) {
          arquivo.revoke?.();
          return;
        }
        revokeAtual = arquivo.revoke;
        setPreviewFaceUrl(arquivo.url);
      } catch {
        if (ativo) {
          setPreviewFaceUrl("");
        }
      }
    }

    void carregarPreviewSalva();

    return () => {
      ativo = false;
      revokeAtual?.();
    };
  }, [faceData?.face_url, idSelecionado, rascunhoFace]);

  useEffect(() => {
    if (!popupFaceAberto) {
      pararCameraFace();
    }
    return () => {
      pararCameraFace();
    };
  }, [popupFaceAberto, idSelecionado]);

  useEffect(() => {
    if (!popupFaceAberto || !cameraFaceAtiva) return;
    anexarStreamFaceAoVideo();
  }, [cameraFaceAtiva, popupFaceAberto]);

  function aplicarFormatacaoCampo(campo: keyof UsuarioFormValues) {
    const valorAtual = getValues(campo);
    const valorFormatado = formatarTextoPorCampo(campo, valorAtual, mapaCamposTextoUsuarioForm);
    if (typeof valorFormatado === "string") {
      setValue(campo, valorFormatado as UsuarioFormValues[typeof campo], {
        shouldDirty: true
      });
    }
  }

  function selecionarUsuario(id: string, aba: AbaId = "cadastro") {
    setIdSelecionado(id);
    setAbaAtiva(aba);
  }

  function buscar() {
    setFiltros((atual) => ({ ...atual, ...filtroDraft, pagina: 1 }));
  }

  function novo() {
    setIdSelecionado(undefined);
    setSnapshot(null);
    setOrigemBusca("");
    setOrigemBuscaAplicada("");
    reset(usuarioDefaultValues);
    setAbaAtiva("cadastro");
  }

  function cancelar() {
    reset(snapshot ?? usuarioDefaultValues);
  }

  function limparFiltros() {
    const base: UsuarioFiltros = {
      nome: "",
      login: "",
      email: "",
      perfil: "",
      setor: "",
      unidade: "",
      status: "",
      criado_de: "",
      criado_ate: "",
      pagina: 1,
      tamanho_pagina: filtros.tamanho_pagina ?? pageSizeDefault
    };
    setFiltroDraft(base);
    setFiltros(base);
  }

  function abrirPopupExcluir(usuarioId: string) {
    setPopupConfirmacao({
      tipo: "excluir",
      titulo: "Confirmar exclusão",
      texto: "Esta ação é irreversível. Deseja realmente continuar?",
      usuarioId
    });
  }

  function excluirAtual() {
    const id = getValues("id_usuario");
    if (!id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um usuário para excluir."
      });
      return;
    }

    abrirPopupExcluir(id);
  }

  function abrirPopupStatus(usuario: Usuario, status: UsuarioStatus) {
    setPopupConfirmacao({
      tipo: "status",
      titulo: "Confirmar alteração",
      texto: `Deseja alterar o status para ${formatarStatus(status).toLowerCase()}?`,
      usuarioId: usuario.id_usuario,
      status
    });
  }

  function obterMensagemErro(error: any, fallback: string) {
    return error?.response?.data?.message ?? error?.message ?? fallback;
  }

  function abrirCadastroFace() {
    if (!usuarioIdAtual) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Salve o usuário",
        texto: "Salve o cadastro do usuário antes de registrar a biometria facial."
      });
      return;
    }

    setPopupFaceAberto(true);
    window.setTimeout(() => {
      void iniciarCameraFace();
    }, 80);
  }

  async function iniciarCameraFace() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Câmera indisponível",
        texto: "Este dispositivo não permite captura de câmera para biometria facial."
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      streamFaceRef.current = stream;
      setCameraFaceAtiva(true);
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Câmera indisponível",
        texto: obterMensagemErro(error, "Não foi possível acessar a câmera para captura facial.")
      });
    }
  }

  function anexarStreamFaceAoVideo() {
    const stream = streamFaceRef.current;
    const video = videoFaceRef.current;
    if (!stream || !video) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const reproduzir = () => {
      void video.play().catch(() => undefined);
    };

    if (video.readyState >= 1) {
      reproduzir();
      return;
    }

    video.onloadedmetadata = reproduzir;
  }

  function pararCameraFace() {
    streamFaceRef.current?.getTracks().forEach((track) => track.stop());
    streamFaceRef.current = null;
    if (videoFaceRef.current) {
      videoFaceRef.current.onloadedmetadata = null;
      videoFaceRef.current.srcObject = null;
    }
    setCameraFaceAtiva(false);
  }

  function capturarFace() {
    const video = videoFaceRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Capture novamente",
        texto: "A câmera ainda não está pronta para a captura facial."
      });
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Captura não concluída",
        texto: "Não foi possível preparar a imagem da biometria facial."
      });
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setRascunhoFace(canvas.toDataURL("image/jpeg", 0.86));
  }

  async function salvarFaceUsuario() {
    if (!usuarioIdAtual) return;
    if (!rascunhoFace) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Capture a face",
        texto: "Capture a imagem da face antes de salvar a biometria facial."
      });
      return;
    }

    try {
      const resultado = await salvarFaceMutation.mutateAsync({
        id_usuario: usuarioIdAtual,
        face_imagem: rascunhoFace
      });
      setRascunhoFace("");
      setPopupFaceAberto(false);
      pararCameraFace();
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Biometria facial",
        texto: resultado.mensagem
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Biometria facial",
        texto: obterMensagemErro(error, "Não foi possível salvar a biometria facial.")
      });
    }
  }

  function abrirPopupRemoverFace() {
    if (!usuarioIdAtual || !faceData?.face_cadastrada) return;
    setPopupConfirmacao({
      tipo: "remover_face",
      titulo: "Remover biometria facial",
      texto: "Deseja remover a biometria facial cadastrada para este usuário? O login facial deixará de funcionar até novo cadastro.",
      usuarioId: usuarioIdAtual
    });
  }

  function trocarPermissao(nomePermissao: string) {
    if (ehAdminImutavel) return;

    const marcada = permissoesSelecionadas.includes(nomePermissao);
    const proximo = marcada
      ? permissoesSelecionadas.filter((item) => item !== nomePermissao)
      : [...permissoesSelecionadas, nomePermissao];

    setValue("permissoes", proximo, { shouldDirty: true, shouldValidate: true });
    if (!proximo.length) {
      setValue("perfil_acesso", "", { shouldDirty: true, shouldValidate: true });
      return;
    }
    if (!proximo.includes(perfilSelecionado)) {
      setValue("perfil_acesso", proximo[0], { shouldDirty: true, shouldValidate: true });
    }
  }

  function expandirTodos() {
    setModulosExpandidos(gruposPermissoes.map((item) => item.modulo));
  }

  function recolherTodos() {
    setModulosExpandidos([]);
  }

  function marcarTudo() {
    if (ehAdminImutavel) return;
    const todasPermissoes = gruposPermissoes.flatMap((grupo) => grupo.itens.map((item) => item.nome));
    setValue("permissoes", Array.from(new Set([...permissoesSelecionadas, ...todasPermissoes])), {
      shouldDirty: true,
      shouldValidate: true
    });
  }

  function desmarcarTudo() {
    if (ehAdminImutavel) return;
    setValue("permissoes", [], { shouldDirty: true, shouldValidate: true });
    setValue("perfil_acesso", "", { shouldDirty: true, shouldValidate: true });
  }

  function aplicarOrigem(item: OrigemBuscaItem) {
    setValue("origem_tipo", item.tipo, { shouldDirty: true, shouldValidate: true });
    setValue("origem_id", item.id, { shouldDirty: true, shouldValidate: true });
    setValue("origem_nome", item.nome, { shouldDirty: true, shouldValidate: true });
    setValue("nome_completo", item.nome, { shouldDirty: true, shouldValidate: true });
    setValue("email", item.email ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("telefone", item.telefone ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("cpf", item.cpf ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("unidade", item.unidade ?? getValues("unidade"), { shouldDirty: true, shouldValidate: true });
    setValue("setor", item.setor ?? getValues("setor"), { shouldDirty: true, shouldValidate: true });
    setValue("cargo", item.cargo ?? getValues("cargo"), { shouldDirty: true, shouldValidate: true });

    if (!usuarioIdAtual || !getValues("nome_usuario").trim()) {
      setValue("nome_usuario", sugerirLogin(item.nome, item.email), {
        shouldDirty: true,
        shouldValidate: true
      });
    }

    setPopupMensagem({
      tipo: "sucesso",
      titulo: "Origem importada",
      texto: "Os dados foram carregados para edição antes do salvamento."
    });
  }

  function limparOrigem() {
    setValue("origem_tipo", undefined, { shouldDirty: true, shouldValidate: true });
    setValue("origem_id", undefined, { shouldDirty: true, shouldValidate: true });
    setValue("origem_nome", undefined, { shouldDirty: true, shouldValidate: true });
    setOrigemBusca("");
    setOrigemBuscaAplicada("");
  }

  async function salvar(values: UsuarioFormValues) {
    try {
      const resultado = await salvarMutation.mutateAsync({
        ...mapFormularioParaPayload(values),
        id_usuario: values.id_usuario
      });
      const formValues = mapUsuarioParaFormulario(resultado.usuario);
      reset(formValues);
      setSnapshot(formValues);
      setIdSelecionado(resultado.usuario.id_usuario);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Usuário salvo",
        texto: "O cadastro foi persistido com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro ao salvar",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o usuário."
      });
    }
  }

  async function confirmarPopupAcao() {
    if (!popupConfirmacao) return;

    try {
      if (popupConfirmacao.tipo === "status") {
        const resultado = await atualizarStatusMutation.mutateAsync({
          id_usuario: popupConfirmacao.usuarioId,
          status: popupConfirmacao.status
        });

        if (idSelecionado === resultado.usuario.id_usuario) {
          const formValues = mapUsuarioParaFormulario(resultado.usuario);
          reset(formValues);
          setSnapshot(formValues);
        }

        setPopupMensagem({
          tipo: "sucesso",
          titulo: "Status atualizado",
          texto: "O status do usuário foi atualizado com sucesso."
        });
      }

      if (popupConfirmacao.tipo === "excluir") {
        await removerMutation.mutateAsync(popupConfirmacao.usuarioId);
        if (idSelecionado === popupConfirmacao.usuarioId) {
          setIdSelecionado(undefined);
          setSnapshot(null);
          reset(usuarioDefaultValues);
          setAbaAtiva("listagem");
        }

        setPopupMensagem({
          tipo: "sucesso",
          titulo: "Usuário excluído",
          texto: "O usuário foi excluído com sucesso."
        });
      }

      if (popupConfirmacao.tipo === "remover_face") {
        const resultado = await removerFaceMutation.mutateAsync(popupConfirmacao.usuarioId);
        setRascunhoFace("");
        setPopupMensagem({
          tipo: "sucesso",
          titulo: "Biometria facial",
          texto: resultado.mensagem
        });
      }
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro na operação",
        texto: error?.response?.data?.message ?? "Não foi possível concluir a operação."
      });
    } finally {
      setPopupConfirmacao(null);
    }
  }

  async function confirmarResetSenha() {
    const id = getValues("id_usuario");
    if (!id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um usuário para redefinir a senha."
      });
      return;
    }

    if (!novaSenha || !confirmarNovaSenha) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Informe e confirme a nova senha."
      });
      return;
    }

    if (novaSenha.length < 6 || confirmarNovaSenha.length < 6) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "A nova senha deve ter no mínimo 6 caracteres."
      });
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "As senhas não conferem."
      });
      return;
    }

    try {
      await resetarSenhaMutation.mutateAsync({
        id_usuario: id,
        nova_senha: novaSenha,
        confirmar_nova_senha: confirmarNovaSenha,
        exigir_troca_senha: exigirTrocaSenhaReset
      });
      setPopupResetSenhaAberto(false);
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setExigirTrocaSenhaReset(true);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Senha redefinida",
        texto: "A nova senha foi registrada com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro ao redefinir senha",
        texto: error?.response?.data?.message ?? "Não foi possível redefinir a senha."
      });
    }
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Usuários" });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro na impressão",
        texto: error?.message ?? "Não foi possível preparar a impressão."
      });
    }
  }

  function fechar() {
    navigate("/dashboard/visao-geral");
  }

  const acoesCrudPorAba: Record<AbaId, AdminAction[]> = {
    listagem: [
      { label: "Buscar usuários", icon: Search, onClick: buscar, variant: "outline", disabled: acaoEmAndamento },
      { label: "Novo usuário", icon: Plus, onClick: novo, variant: "default", disabled: acaoEmAndamento },
      { label: "Imprimir listagem", icon: Printer, onClick: imprimir, variant: "outline" },
      { label: "Fechar tela", icon: X, onClick: fechar, variant: "outline" }
    ],
    cadastro: [
      { label: "Ir para listagem", icon: Search, onClick: () => setAbaAtiva("listagem"), variant: "outline" },
      { label: "Novo usuário", icon: Plus, onClick: novo, variant: "outline", disabled: acaoEmAndamento },
      { label: "Salvar usuário", icon: Save, onClick: () => void handleSubmit(salvar)(), variant: "default", disabled: acaoEmAndamento },
      { label: "Cancelar edição", icon: Undo2, onClick: cancelar, variant: "outline", disabled: acaoEmAndamento },
      { label: "Excluir usuário", icon: Trash2, onClick: excluirAtual, variant: "danger", disabled: acaoEmAndamento || !usuarioIdAtual },
      { label: "Imprimir cadastro", icon: Printer, onClick: imprimir, variant: "outline" },
      { label: "Fechar tela", icon: X, onClick: fechar, variant: "outline" }
    ],
    permissoes: [
      { label: "Expandir módulos", icon: ChevronDown, onClick: expandirTodos, variant: "outline", disabled: carregandoPermissoes },
      { label: "Recolher módulos", icon: ChevronRight, onClick: recolherTodos, variant: "outline", disabled: carregandoPermissoes },
      { label: "Marcar permissões", icon: ShieldCheck, onClick: marcarTudo, variant: "default", disabled: carregandoPermissoes || ehAdminImutavel },
      { label: "Limpar permissões", icon: Undo2, onClick: desmarcarTudo, variant: "outline", disabled: carregandoPermissoes || ehAdminImutavel },
      { label: "Salvar permissões", icon: Save, onClick: () => void handleSubmit(salvar)(), variant: "default", disabled: acaoEmAndamento },
      { label: "Fechar tela", icon: X, onClick: fechar, variant: "outline" }
    ],
    auditoria: [
      { label: "Ir para listagem", icon: Search, onClick: () => setAbaAtiva("listagem"), variant: "outline" },
      { label: "Imprimir histórico", icon: Printer, onClick: imprimir, variant: "outline" },
      { label: "Fechar tela", icon: X, onClick: fechar, variant: "outline" }
    ]
  };

  const paginaAtual = listaData?.paginacao.pagina ?? 1;
  const totalPaginas = listaData?.paginacao.total_paginas ?? 1;

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tab) => setAbaAtiva(tab as AbaId)}
        actions={acoesCrudPorAba[abaAtiva]}
        sectionLabel="Configurações gerais"
        pageTitle="Usuários"
        activeTitle={abas.find((aba) => aba.id === abaAtiva)?.label}
        codeBadge={usuarioIdAtual ? `Código: ${usuarioIdAtual}` : "Novo usuário"}
      >
        {abaAtiva === "listagem" && (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={filtroDraft.nome ?? ""} onChange={(event) => setFiltroDraft((atual) => ({ ...atual, nome: event.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Login</Label>
                <Input value={filtroDraft.login ?? ""} onChange={(event) => setFiltroDraft((atual) => ({ ...atual, login: event.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input value={filtroDraft.email ?? ""} onChange={(event) => setFiltroDraft((atual) => ({ ...atual, email: event.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={filtroDraft.status ?? ""} onChange={(event) => setFiltroDraft((atual) => ({ ...atual, status: event.target.value as UsuarioStatus | "" }))}>
                  <option value="">Todos</option>
                  {usuarioStatusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={limparFiltros} disabled={acaoEmAndamento}>
                Limpar filtros
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Nome</th>
                    <th className="px-3 py-2 text-left">Login</th>
                    <th className="px-3 py-2 text-left">Perfil</th>
                    <th className="px-3 py-2 text-left">Origem</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Último acesso</th>
                    <th className="px-3 py-2 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {carregandoLista && (
                    <tr>
                      <td className="px-3 py-5 text-center text-[var(--g3-muted)]" colSpan={7}>
                        Carregando usuários...
                      </td>
                    </tr>
                  )}
                  {!carregandoLista && !listaData?.usuarios.length && (
                    <tr>
                      <td className="px-3 py-5 text-center text-[var(--g3-muted)]" colSpan={7}>
                        Nenhum usuário encontrado para os filtros informados.
                      </td>
                    </tr>
                  )}
                  {listaData?.usuarios.map((usuario, indice) => {
                    const linhaSelecionada = usuario.id_usuario === idSelecionado;
                    const proximoStatus = usuario.status === "ATIVO" ? "INATIVO" : "ATIVO";

                    return (
                      <tr
                        key={usuario.id_usuario}
                        className={[
                          "cursor-pointer border-t border-[var(--g3-border)] transition-colors",
                          indice % 2 === 0 ? "bg-white" : "bg-[var(--g3-primary-soft)]/25",
                          linhaSelecionada ? "bg-[var(--g3-primary-soft)]/70" : "hover:bg-[var(--g3-primary-soft)]/40"
                        ].join(" ")}
                        onClick={() => selecionarUsuario(usuario.id_usuario, "cadastro")}
                      >
                        <td className="px-3 py-2">{usuario.nome_completo ?? "---"}</td>
                        <td className="px-3 py-2">{usuario.nome_usuario}</td>
                        <td className="px-3 py-2">{formatarPerfil(usuario.perfil_acesso)}</td>
                        <td className="px-3 py-2">{formatarTipoOrigem(usuario.origem_tipo)}</td>
                        <td className="px-3 py-2">{formatarStatus(usuario.status)}</td>
                        <td className="px-3 py-2">{formatarDataHora(usuario.ultimo_acesso_em)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Editar usuário"
                              aria-label="Editar usuário"
                              disabled={acaoEmAndamento}
                              onClick={(event) => {
                                event.stopPropagation();
                                selecionarUsuario(usuario.id_usuario, "cadastro");
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Redefinir senha"
                              aria-label="Redefinir senha"
                              disabled={acaoEmAndamento}
                              onClick={(event) => {
                                event.stopPropagation();
                                setIdSelecionado(usuario.id_usuario);
                                setPopupResetSenhaAberto(true);
                              }}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title={proximoStatus === "ATIVO" ? "Ativar usuário" : "Inativar usuário"}
                              aria-label={proximoStatus === "ATIVO" ? "Ativar usuário" : "Inativar usuário"}
                              disabled={acaoEmAndamento}
                              onClick={(event) => {
                                event.stopPropagation();
                                abrirPopupStatus(usuario, proximoStatus);
                              }}
                            >
                              {proximoStatus === "ATIVO" ? <LockOpen className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title={usuario.status === "BLOQUEADO" ? "Desbloquear usuário" : "Bloquear usuário"}
                              aria-label={usuario.status === "BLOQUEADO" ? "Desbloquear usuário" : "Bloquear usuário"}
                              disabled={acaoEmAndamento}
                              onClick={(event) => {
                                event.stopPropagation();
                                abrirPopupStatus(usuario, usuario.status === "BLOQUEADO" ? "ATIVO" : "BLOQUEADO");
                              }}
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                            <div className="ml-2 border-l border-[var(--g3-border)] pl-2">
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Excluir usuário"
                                aria-label="Excluir usuário"
                                disabled={acaoEmAndamento}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  abrirPopupExcluir(usuario.id_usuario);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--g3-muted)]">
                Total: {listaData?.paginacao.total ?? 0}
                {atualizandoLista ? " (atualizando...)" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={paginaAtual <= 1} onClick={() => setFiltros((atual) => ({ ...atual, pagina: paginaAtual - 1 }))}>
                  Anterior
                </Button>
                <span className="text-xs text-[var(--g3-muted)]">
                  Página {paginaAtual} de {totalPaginas}
                </span>
                <Button type="button" variant="outline" size="sm" disabled={paginaAtual >= totalPaginas} onClick={() => setFiltros((atual) => ({ ...atual, pagina: paginaAtual + 1 }))}>
                  Próxima
                </Button>
              </div>
            </div>
          </section>
        )}

        {abaAtiva === "cadastro" && (
          <section className="space-y-4">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Importar dados de origem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_140px]">
                  <div className="space-y-1">
                    <Label>Origem</Label>
                    <Select
                      value={origemTipoSelecionada ?? ""}
                      onChange={(event) => {
                        const value = event.target.value as UsuarioOrigemTipo | "";
                        if (!value) {
                          limparOrigem();
                          return;
                        }
                        setValue("origem_tipo", value, { shouldDirty: true, shouldValidate: true });
                        setValue("origem_id", undefined, { shouldDirty: true, shouldValidate: true });
                        setValue("origem_nome", undefined, { shouldDirty: true, shouldValidate: true });
                        setOrigemBusca("");
                        setOrigemBuscaAplicada("");
                      }}
                    >
                      <option value="">Sem origem</option>
                      {usuarioOrigemOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Buscar cadastro</Label>
                    <Input
                      placeholder="Digite nome, código ou referência"
                      value={origemBusca}
                      disabled={!origemTipoSelecionada}
                      onChange={(event) => setOrigemBusca(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          setOrigemBuscaAplicada(origemBusca);
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" className="w-full" disabled={!origemTipoSelecionada || origemBusca.trim().length < 2} onClick={() => setOrigemBuscaAplicada(origemBusca)}>
                      Buscar
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed border-[var(--g3-border)] p-3 text-sm">
                  <p className="font-medium text-[var(--g3-foreground)]">Vínculo atual</p>
                  <p className="mt-1 text-[var(--g3-muted)]">
                    {origemTipoSelecionada && origemNomeSelecionada
                      ? `${formatarTipoOrigem(origemTipoSelecionada)}: ${origemNomeSelecionada}`
                      : "Nenhum vínculo selecionado."}
                  </p>
                  {!!origemTipoSelecionada && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={limparOrigem} disabled={acaoEmAndamento}>
                        Limpar vínculo
                      </Button>
                    </div>
                  )}
                </div>

                {!!errors.origem_id && <p className="text-xs text-red-600">{errors.origem_id.message}</p>}

                {origemBuscaHabilitada && (
                  <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                        <tr>
                          <th className="px-3 py-2 text-left">Nome</th>
                          <th className="px-3 py-2 text-left">Documento</th>
                          <th className="px-3 py-2 text-left">Contato</th>
                          <th className="px-3 py-2 text-left">Detalhe</th>
                          <th className="px-3 py-2 text-left">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buscandoOrigem && (
                          <tr>
                            <td className="px-3 py-4 text-center text-[var(--g3-muted)]" colSpan={5}>
                              Buscando cadastros...
                            </td>
                          </tr>
                        )}
                        {!buscandoOrigem && !origemResultados.length && (
                          <tr>
                            <td className="px-3 py-4 text-center text-[var(--g3-muted)]" colSpan={5}>
                              Nenhum cadastro encontrado para a origem selecionada.
                            </td>
                          </tr>
                        )}
                        {origemResultados.map((item) => (
                          <tr key={`${item.tipo}-${item.id}`} className="border-t border-[var(--g3-border)]">
                            <td className="px-3 py-2">{item.nome}</td>
                            <td className="px-3 py-2">{item.cpf ?? "---"}</td>
                            <td className="px-3 py-2">{item.email ?? item.telefone ?? "---"}</td>
                            <td className="px-3 py-2">{item.descricao ?? item.unidade ?? "---"}</td>
                            <td className="px-3 py-2">
                              <Button type="button" variant="outline" size="sm" disabled={acaoEmAndamento} onClick={() => aplicarOrigem(item)}>
                                Importar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
              <div className="space-y-1 xl:col-span-5">
                <Label>Nome completo *</Label>
                <Input {...register("nome_completo")} onBlur={() => aplicarFormatacaoCampo("nome_completo")} />
                {errors.nome_completo && <p className="text-xs text-red-600">{errors.nome_completo.message}</p>}
              </div>
              <div className="space-y-1 xl:col-span-3">
                <Label>Nome de exibição</Label>
                <Input {...register("nome_exibicao")} onBlur={() => aplicarFormatacaoCampo("nome_exibicao")} />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Login *</Label>
                <Input {...register("nome_usuario")} />
                {errors.nome_usuario && <p className="text-xs text-red-600">{errors.nome_usuario.message}</p>}
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Status *</Label>
                <Select {...register("status")}>
                  {usuarioStatusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1 xl:col-span-4">
                <Label>E-mail *</Label>
                <Input type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Telefone</Label>
                <Input {...register("telefone")} />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>CPF</Label>
                <Input {...register("cpf")} />
                {errors.cpf && <p className="text-xs text-red-600">{errors.cpf.message}</p>}
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Matrícula</Label>
                <Input {...register("matricula")} />
              </div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Perfil principal</Label>
                <Select
                  value={perfilSelecionado}
                  onChange={(event) => {
                    const value = event.target.value;
                    setValue("perfil_acesso", value, { shouldDirty: true, shouldValidate: true });
                    if (value && !permissoesSelecionadas.includes(value)) {
                      setValue("permissoes", [...permissoesSelecionadas, value], {
                        shouldDirty: true,
                        shouldValidate: true
                      });
                    }
                  }}
                >
                  {perfisDisponiveis.map((permissao) => (
                    <option key={permissao} value={permissao}>
                      {formatarPerfil(permissao)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1 xl:col-span-4">
                <Label>Setor</Label>
                <Input {...register("setor")} onBlur={() => aplicarFormatacaoCampo("setor")} />
              </div>
              <div className="space-y-1 xl:col-span-4">
                <Label>Unidade</Label>
                <Input {...register("unidade")} onBlur={() => aplicarFormatacaoCampo("unidade")} />
              </div>
              <div className="space-y-1 xl:col-span-4">
                <Label>Cargo ou função</Label>
                <Input {...register("cargo")} onBlur={() => aplicarFormatacaoCampo("cargo")} />
              </div>

              {!!origemTipoSelecionada && (
                <>
                  <div className="space-y-1 xl:col-span-3">
                    <Label>Tipo de origem</Label>
                    <Input value={formatarTipoOrigem(origemTipoSelecionada)} readOnly />
                  </div>
                  <div className="space-y-1 xl:col-span-5">
                    <Label>Origem vinculada</Label>
                    <Input value={origemNomeSelecionada ?? ""} readOnly />
                  </div>
                  <div className="space-y-1 xl:col-span-4">
                    <Label>ID da origem</Label>
                    <Input value={watch("origem_id") ?? ""} readOnly />
                  </div>
                </>
              )}

              {!usuarioIdAtual && (
                <>
                  <div className="space-y-1 xl:col-span-3">
                    <Label>Senha inicial *</Label>
                    <Input type="password" {...register("senha")} />
                    {errors.senha && <p className="text-xs text-red-600">{errors.senha.message}</p>}
                  </div>
                  <div className="space-y-1 xl:col-span-3">
                    <Label>Confirmar senha *</Label>
                    <Input type="password" {...register("confirmar_senha")} />
                    {errors.confirmar_senha && <p className="text-xs text-red-600">{errors.confirmar_senha.message}</p>}
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 xl:col-span-12">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--g3-foreground)]">
                  <Checkbox
                    checked={!!watch("exigir_troca_senha")}
                    onChange={(event) =>
                      setValue("exigir_troca_senha", event.target.checked, {
                        shouldDirty: true,
                        shouldValidate: true
                      })
                    }
                  />
                  Exigir troca de senha no primeiro acesso
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--g3-foreground)]">
                  <Checkbox
                    checked={!!watch("exigir_autenticacao_segura")}
                    onChange={(event) =>
                      setValue("exigir_autenticacao_segura", event.target.checked, {
                        shouldDirty: true,
                        shouldValidate: true
                      })
                    }
                  />
                  Exigir autenticação segura por e-mail
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--g3-foreground)]">
                  <Checkbox
                    checked={!!watch("permitir_biometria_facial_login")}
                    onChange={(event) => {
                      const marcado = event.target.checked;
                      setValue("permitir_biometria_facial_login", marcado, {
                        shouldDirty: true,
                        shouldValidate: true
                      });
                      if (!marcado) {
                        setValue("exigir_biometria_facial_login", false, {
                          shouldDirty: true,
                          shouldValidate: true
                        });
                      }
                    }}
                  />
                  Permitir biometria facial no login
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--g3-foreground)]">
                  <Checkbox
                    checked={!!watch("exigir_biometria_facial_login")}
                    onChange={(event) => {
                      const marcado = event.target.checked;
                      setValue("exigir_biometria_facial_login", marcado, {
                        shouldDirty: true,
                        shouldValidate: true
                      });
                      if (marcado) {
                        setValue("permitir_biometria_facial_login", true, {
                          shouldDirty: true,
                          shouldValidate: true
                        });
                      }
                    }}
                  />
                  Exigir biometria facial no login
                </label>
                <Button type="button" variant="outline" size="sm" disabled={!usuarioIdAtual || acaoEmAndamento} onClick={() => setPopupResetSenhaAberto(true)}>
                  <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                  Redefinir senha
                </Button>
              </div>
              <p className="xl:col-span-12 -mt-2 text-xs text-[var(--g3-muted)]">
                Quando a autenticação por e-mail estiver marcada, esta conta confirma a contrassenha enviada por e-mail. Quando a biometria facial for exigida, a senha abre a câmera para validar a face cadastrada no usuário.
              </p>
            </section>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Fingerprint className="h-4 w-4 text-[var(--g3-active)]" />
                  Biometria facial
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[160px_1fr]">
                <div className="overflow-hidden rounded-lg border border-[var(--g3-border)] bg-slate-950">
                  {previewFaceUrl ? (
                    <img src={previewFaceUrl} alt="Prévia da biometria facial" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center px-3 text-center text-xs text-slate-300">
                      Nenhuma face cadastrada.
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        faceData?.face_cadastrada
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {carregandoFace ? "Carregando..." : faceData?.face_cadastrada ? "Face cadastrada" : "Face não cadastrada"}
                    </span>
                    {faceData?.face_cadastrada_em ? (
                      <span className="text-xs text-[var(--g3-muted)]">
                        Último cadastro em {formatarDataHora(faceData.face_cadastrada_em)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-[var(--g3-muted)]">
                    Cadastre a face diretamente neste usuário para liberar a biometria no login, mesmo sem vínculo com registro de ponto ou profissional da instituição.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={!usuarioIdAtual || acaoEmAndamento} onClick={abrirCadastroFace}>
                      <Camera className="mr-1.5 h-3.5 w-3.5" />
                      {faceData?.face_cadastrada ? "Atualizar biometria" : "Cadastrar biometria"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!usuarioIdAtual || !faceData?.face_cadastrada || acaoEmAndamento}
                      onClick={abrirPopupRemoverFace}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Remover biometria
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Resumo do perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/40 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--g3-muted)]">Perfil principal</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">{formatarPerfil(perfilSelecionado)}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/40 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--g3-muted)]">Telas acessíveis</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">{resumoPermissoes.length}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/40 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--g3-muted)]">Permissões marcadas</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--g3-foreground)]">{permissoesSelecionadas.length}</p>
                  </div>
                </div>

                {!resumoPermissoes.length ? (
                  <p className="text-sm text-[var(--g3-muted)]">
                    Selecione permissões para visualizar claramente as telas e ações liberadas.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                        <tr>
                          <th className="px-3 py-2 text-left">Módulo</th>
                          <th className="px-3 py-2 text-left">Tela</th>
                          <th className="px-3 py-2 text-left">Ações liberadas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumoPermissoes.slice(0, 8).map((item) => {
                          const acoes = Object.entries(item.acoes)
                            .filter(([, valor]) => !!valor)
                            .map(([acao]) => acao);
                          return (
                            <tr key={`${item.modulo}-${item.tela}`} className="border-t border-[var(--g3-border)]">
                              <td className="px-3 py-2">{item.modulo}</td>
                              <td className="px-3 py-2">{item.tela}</td>
                              <td className="px-3 py-2">{acoes.join(", ") || "---"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {abaAtiva === "permissoes" && (
          <section className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">Escopo organizacional</CardTitle>
                    <p className="mt-1 text-xs text-[var(--g3-muted)]">Instituição vinculada: somente a instituição do administrador atual. Defina onde este usuário pode atuar; as permissões abaixo definem o que ele pode fazer.</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" disabled={!usuarioIdAtual || ehAdminImutavel || !usuario?.instituicao_id} onClick={() => setAcessosRascunho((atual) => [...atual, { instituicao_id: usuario?.instituicao_id ?? "", escopo: "INSTITUICAO", ativo: true, perfil_nome: perfilSelecionado }])}>
                    <Plus className="mr-1 h-4 w-4" />Adicionar escopo
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!usuarioIdAtual ? <p className="text-sm text-[var(--g3-muted)]">Salve o usuário antes de configurar os vínculos de acesso.</p> : null}
                {usuarioIdAtual && !usuario?.instituicao_id ? <p className="text-sm text-amber-700">Este usuário ainda não possui instituição vinculada. Vincule-o à instituição no cadastro antes de definir o escopo.</p> : null}
                {carregandoAcessos ? <p className="text-sm text-[var(--g3-muted)]">Carregando escopos...</p> : null}
                {acessosRascunho.map((acesso, indice) => (
                  <div key={`${indice}-${acesso.escopo}`} className="grid gap-2 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-[180px_1fr_1fr_1fr_auto] md:items-end">
                    <div>
                      <Label>Nível do escopo</Label>
                      <Select value={acesso.escopo} onChange={(event) => setAcessosRascunho((atual) => atual.map((item, itemIndex) => itemIndex === indice ? { ...item, escopo: event.target.value as UsuarioAcessoInput["escopo"], entidade_juridica_id: undefined, unidade_id: undefined, projeto_id: undefined } : item))}>
                        <option value="INSTITUICAO">Toda a instituição</option>
                        <option value="ENTIDADE_JURIDICA">Entidade jurídica</option>
                        <option value="UNIDADE">Unidade</option>
                        <option value="PROJETO">Projeto</option>
                      </Select>
                    </div>
                    {acesso.escopo === "ENTIDADE_JURIDICA" ? <div><Label>Entidade jurídica</Label><Select value={acesso.entidade_juridica_id ?? ""} onChange={(event) => setAcessosRascunho((atual) => atual.map((item, itemIndex) => itemIndex === indice ? { ...item, entidade_juridica_id: event.target.value || undefined } : item))}><option value="">Selecione</option>{(catalogoAcessos?.entidades ?? []).map((item) => <option key={item.id} value={item.id}>{item.nome}{item.cnpj ? ` · ${item.cnpj}` : ""}</option>)}</Select></div> : null}
                    {acesso.escopo === "UNIDADE" ? <div><Label>Unidade</Label><Select value={acesso.unidade_id ?? ""} onChange={(event) => setAcessosRascunho((atual) => atual.map((item, itemIndex) => itemIndex === indice ? { ...item, unidade_id: event.target.value || undefined } : item))}><option value="">Selecione</option>{(catalogoAcessos?.unidades ?? []).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select></div> : null}
                    {acesso.escopo === "PROJETO" ? <div><Label>Projeto</Label><Select value={acesso.projeto_id ?? ""} onChange={(event) => setAcessosRascunho((atual) => atual.map((item, itemIndex) => itemIndex === indice ? { ...item, projeto_id: event.target.value || undefined } : item))}><option value="">Selecione</option>{(catalogoAcessos?.projetos ?? []).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select></div> : null}
                    <div><Label>Perfil no escopo</Label><Input value={acesso.perfil_nome ?? perfilSelecionado} onChange={(event) => setAcessosRascunho((atual) => atual.map((item, itemIndex) => itemIndex === indice ? { ...item, perfil_nome: event.target.value } : item))} /></div>
                    <Button type="button" variant="ghost" size="sm" aria-label="Remover escopo" disabled={ehAdminImutavel} onClick={() => setAcessosRascunho((atual) => atual.filter((_, itemIndex) => itemIndex !== indice))}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                ))}
                {usuarioIdAtual && !acessosRascunho.length ? <p className="rounded-md border border-dashed border-[var(--g3-border)] p-3 text-sm text-amber-700">Nenhum escopo configurado.</p> : null}
                <div className="flex justify-end border-t border-[var(--g3-border)] pt-3">
                  <Button type="button" disabled={!usuarioIdAtual || ehAdminImutavel || salvarAcessosMutation.isPending || !acessosRascunho.length} onClick={() => { if (usuarioIdAtual) salvarAcessosMutation.mutate({ id: usuarioIdAtual, acessos: acessosRascunho }); }}>
                    {salvarAcessosMutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar escopos
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-3">
                <div className="flex flex-col gap-3 border-b border-[var(--g3-border)] pb-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--g3-muted)]" />
                    <Input
                      placeholder="Buscar permissão, módulo, tela ou ação"
                      className="pl-9"
                      value={buscaPermissao}
                      onChange={(event) => setBuscaPermissao(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={expandirTodos} disabled={carregandoPermissoes}>
                      Expandir todos
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={recolherTodos} disabled={carregandoPermissoes}>
                      Recolher todos
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={marcarTudo} disabled={carregandoPermissoes || ehAdminImutavel}>
                      Marcar tudo
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={desmarcarTudo} disabled={carregandoPermissoes || ehAdminImutavel}>
                      Desmarcar tudo
                    </Button>
                  </div>
                </div>

                {carregandoPermissoes && <p className="text-sm text-[var(--g3-muted)]">Carregando permissões...</p>}
                {!carregandoPermissoes && !gruposPermissoes.length && <p className="text-sm text-[var(--g3-muted)]">Nenhuma permissão cadastrada.</p>}
                {ehAdminImutavel && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Este usuário está protegido e mantém acesso total ao sistema.</div>}

                {gruposPermissoes.map((grupo) => {
                  const expandido = modulosExpandidos.includes(grupo.modulo);
                  const telas = agruparPermissoesPorTela(grupo.itens, grupo.itens.map((item) => item.nome));

                  return (
                    <Card key={grupo.modulo} className="overflow-hidden border border-[var(--g3-border)] shadow-sm">
                      <CardHeader
                        className="flex cursor-pointer flex-row items-center justify-between bg-[var(--g3-primary-soft)]/45 py-3"
                        onClick={() =>
                          setModulosExpandidos((atual) =>
                            atual.includes(grupo.modulo) ? atual.filter((item) => item !== grupo.modulo) : [...atual, grupo.modulo]
                          )
                        }
                      >
                        <CardTitle className="text-sm font-semibold text-[var(--g3-active)]">{grupo.modulo}</CardTitle>
                        {expandido ? <ChevronDown className="h-4 w-4 text-[var(--g3-active)]" /> : <ChevronRight className="h-4 w-4 text-[var(--g3-active)]" />}
                      </CardHeader>

                      {expandido && (
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-[var(--g3-primary-soft)]/25 text-[var(--g3-active)]">
                                <tr>
                                  <th className="px-4 py-2 text-left">Tela</th>
                                  <th className="w-20 px-2 py-2 text-center text-[11px]">Ver</th>
                                  <th className="w-20 px-2 py-2 text-center text-[11px]">Editar</th>
                                  <th className="w-20 px-2 py-2 text-center text-[11px]">Excluir</th>
                                  <th className="w-20 px-2 py-2 text-center text-[11px]">Aprovar</th>
                                  <th className="w-20 px-2 py-2 text-center text-[11px]">Imprimir</th>
                                  <th className="w-20 px-2 py-2 text-center text-[11px]">Exportar</th>
                                  <th className="w-24 px-2 py-2 text-center text-[11px]">Configurar</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--g3-border)]">
                                {telas.map((item) => (
                                  <tr key={`${item.modulo}-${item.tela}`} className="hover:bg-[var(--g3-primary-soft)]/12">
                                    <td className="px-4 py-2.5 font-medium text-[var(--g3-foreground)]">{item.tela}</td>
                                    {(["visualizar", "editar", "excluir", "aprovar", "imprimir", "exportar", "configurar"] as const).map((acao) => (
                                      <td key={acao} className="px-2 py-2.5 text-center">
                                        {item.acoes[acao] ? (
                                          <Checkbox
                                            checked={permissoesSelecionadas.includes(item.acoes[acao] as string)}
                                            onChange={() => trocarPermissao(item.acoes[acao] as string)}
                                            disabled={ehAdminImutavel}
                                            className="mx-auto"
                                          />
                                        ) : null}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
              <Card className="border-[var(--g3-border)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Leitura gerencial do perfil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/40 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--g3-muted)]">Perfil principal</p>
                    <p className="mt-1 font-semibold text-[var(--g3-foreground)]">{formatarPerfil(perfilSelecionado)}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--g3-border)] p-3">
                    <p className="font-medium text-[var(--g3-foreground)]">O que este perfil acessa</p>
                    <p className="mt-1 text-[var(--g3-muted)]">
                      {resumoPermissoes.length ? `${resumoPermissoes.length} telas mapeadas por módulo e ação.` : "Nenhuma permissão operacional marcada."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {resumoPermissoes.slice(0, 6).map((item) => (
                      <div key={`${item.modulo}-${item.tela}`} className="rounded-lg border border-[var(--g3-border)] p-3">
                        <p className="font-medium text-[var(--g3-foreground)]">{item.tela}</p>
                        <p className="text-xs text-[var(--g3-muted)]">{item.modulo}</p>
                        <p className="mt-1 text-xs text-[var(--g3-foreground)]">
                          {Object.entries(item.acoes)
                            .filter(([, valor]) => !!valor)
                            .map(([acao]) => acao)
                            .join(", ") || "Sem ação operacional"}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {abaAtiva === "auditoria" && (
          <section className="space-y-3">
            {carregandoUsuario && <p className="text-sm text-[var(--g3-muted)]">Carregando histórico...</p>}
            {!carregandoUsuario && !idSelecionado && <p className="text-sm text-[var(--g3-muted)]">Selecione um usuário na listagem.</p>}
            {!carregandoUsuario && idSelecionado && !usuarioData?.auditoria?.length && <p className="text-sm text-[var(--g3-muted)]">Nenhum registro de auditoria encontrado para este usuário.</p>}

            {!!usuarioData?.auditoria?.length && (
              <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                    <tr>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Ação</th>
                      <th className="px-3 py-2 text-left">Executado por</th>
                      <th className="px-3 py-2 text-left">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarioData.auditoria.map((item, indice) => (
                      <tr key={item.id} className={`border-t border-[var(--g3-border)] ${indice % 2 === 0 ? "bg-white" : "bg-[var(--g3-primary-soft)]/25"}`}>
                        <td className="px-3 py-2">{formatarDataHora(item.criado_em)}</td>
                        <td className="px-3 py-2">{item.acao}</td>
                        <td className="px-3 py-2">{item.usuario_nome ?? "Sistema"}</td>
                        <td className="px-3 py-2">
                          <pre className="max-w-[560px] whitespace-pre-wrap break-all text-xs text-[var(--g3-muted)]">
                            {item.dados_json ? JSON.stringify(item.dados_json, null, 2) : "---"}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </AdminPageLayout>

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}

      <PopupConfirmacao
        aberto={!!popupConfirmacao}
        titulo={popupConfirmacao?.titulo ?? ""}
        texto={popupConfirmacao?.texto ?? ""}
        processando={acaoEmAndamento}
        confirmarTexto={popupConfirmacao?.tipo === "excluir" || popupConfirmacao?.tipo === "remover_face" ? "Remover" : "Confirmar"}
        confirmarVariant={popupConfirmacao?.tipo === "excluir" || popupConfirmacao?.tipo === "remover_face" ? "danger" : "default"}
        onCancel={() => setPopupConfirmacao(null)}
        onConfirm={() => void confirmarPopupAcao()}
      />

      {popupFaceAberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => { if (!salvarFaceMutation.isPending) setPopupFaceAberto(false); }}>
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-[var(--g3-active)]" />
                <h3 className="text-base font-semibold text-slate-900">Cadastrar biometria facial</h3>
              </div>
              <Button variant="ghost" size="sm" disabled={salvarFaceMutation.isPending} onClick={() => setPopupFaceAberto(false)}>
                Fechar
              </Button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                <video
                  ref={videoFaceRef}
                  className="aspect-[4/3] max-h-[52vh] w-full object-cover"
                  muted
                  playsInline
                  autoPlay
                  onLoadedMetadata={anexarStreamFaceAoVideo}
                />
                {!cameraFaceAtiva ? (
                  <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-slate-300">
                    Aguardando autorização da câmera.
                  </div>
                ) : null}
              </div>

              {rascunhoFace ? (
                <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                  <img src={rascunhoFace} alt="Prévia capturada da biometria facial" className="aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover" />
                  <p className="text-sm text-[var(--g3-muted)]">
                    Prévia capturada. Salve para vincular esta biometria facial ao usuário selecionado.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={salvarFaceMutation.isPending} onClick={() => setPopupFaceAberto(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="outline" disabled={salvarFaceMutation.isPending} onClick={capturarFace}>
                <Camera className="mr-1.5 h-3.5 w-3.5" />
                Capturar face
              </Button>
              <Button type="button" disabled={salvarFaceMutation.isPending || !rascunhoFace} onClick={() => void salvarFaceUsuario()}>
                {salvarFaceMutation.isPending ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                Salvar biometria
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupResetSenhaAberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => { if (!resetarSenhaMutation.isPending) setPopupResetSenhaAberto(false); }}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Redefinir senha</h3>
            </div>
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Nova senha</Label>
                <Input type="password" value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Confirmar nova senha</Label>
                <Input type="password" value={confirmarNovaSenha} onChange={(event) => setConfirmarNovaSenha(event.target.value)} />
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--g3-foreground)] sm:col-span-2">
                <Checkbox checked={exigirTrocaSenhaReset} onChange={(event) => setExigirTrocaSenhaReset(event.target.checked)} />
                Exigir troca de senha no próximo acesso
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" disabled={resetarSenhaMutation.isPending} onClick={() => setPopupResetSenhaAberto(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={resetarSenhaMutation.isPending} onClick={() => void confirmarResetSenha()}>
                {resetarSenhaMutation.isPending ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
