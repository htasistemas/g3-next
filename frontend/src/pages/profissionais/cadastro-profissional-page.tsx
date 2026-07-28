import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Camera,
  FileText,
  ListFilter,
  MapPinned,
  Plus,
  Printer,
  Save,
  Search,
  Stethoscope,
  Trash2,
  Undo2,
  Upload,
  UserRound,
  UsersRound,
  X,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MensagemAcoesRapidas } from "@/components/mensagens-personalizadas/mensagem-acoes-rapidas";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  profissionalDefaultValues,
  profissionalFormSchema,
  profissionalStatusOptions,
  type ProfissionalFormValues
} from "@/features/profissionais/profissional.schema";
import {
  useProfissional,
  useProfissionais,
  useRemoverProfissional,
  useSalvarProfissional
} from "@/features/profissionais/use-profissionais";
import { useBeneficiarios } from "@/features/beneficiarios/use-beneficiarios";
import type { Profissional, ProfissionalFiltro } from "@/types/profissional";
import type { Beneficiario, BeneficiarioFiltro } from "@/types/beneficiario";
import type { MatriculaSalaCatalogo } from "@/types/matricula";
import { buscarEnderecoPorCep } from "@/services/cep.service";
import { matriculasService } from "@/services/matriculas.service";
import { unidadesAssistenciaisService } from "@/services/unidades-assistenciais.service";
import { reportsService } from "@/services/reports.service";
import { somenteDigitos } from "@/lib/validators";
import { formatarTextoPorCampo, normalizarObjetoTexto } from "@/lib/text-formatter";
import { mapaCamposTextoProfissionalForm } from "@/lib/text-format-config";
import { reservarJanelaRelatorio } from "@/lib/report-utils";
import { resolverUrlArquivo } from "@/lib/arquivos";
import {
  ajustarParaFotoTresPorQuatro,
  capturarFotoTresPorQuatroDoVideo,
  fotoMaximaBytes,
  lerArquivoComoDataUrl
} from "@/lib/foto-3x4";
import { useAuth } from "@/hooks/use-auth";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario,
  ordemAcoesCrudPadrao
} from "@/lib/tela-padrao-beneficiario";

const abas = [
  { id: "listagem", label: "Listagem de profissionais", icon: ListFilter },
  { id: "dados", label: "Dados pessoais", icon: UserRound },
  { id: "endereco", label: "Endereço", icon: MapPinned },
  { id: "perfil", label: "Perfil profissional", icon: Stethoscope },
  { id: "agenda", label: "Agenda e canais", icon: UsersRound },
  { id: "resumo", label: "Resumo e observações", icon: FileText }
] as const;

type AbaId = (typeof abas)[number]["id"];

type AcaoCrud = {
  label: string;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  icon: LucideIcon;
};

const disponibilidadesOptions = ["Manhá", "Tarde", "Noite"];
const canaisAtendimentoOptions = ["Presencial", "Online", "Telefone"];
const vinculosOptions = ["VOLUNTARIO", "CLT", "PJ", "ESTAGIARIO"];
const sexoOptions = ["Masculino", "Feminino", "Outro"];
const subzonaEnderecoOptions = [
  { value: "ZONA_NORTE", label: "Zona Norte" },
  { value: "ZONA_SUL", label: "Zona Sul" },
  { value: "ZONA_LESTE", label: "Zona Leste" },
  { value: "ZONA_OESTE", label: "Zona Oeste" },
  { value: "ZONA_CENTRAL", label: "Zona Central" }
] as const;
const tituloTela = "Cadastro de profissionais";

function formatarCpf(valor?: string) {
  if (!valor) return "---";
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length !== 11) return valor;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function formatarTelefone(valor?: string) {
  if (!valor) return "---";
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return valor;
}

function formatarStatus(status?: string) {
  if (!status) return "Em análise";
  const texto = status.toLowerCase().replaceAll("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mapParaFormulario(profissional: Profissional): ProfissionalFormValues {
  return {
    ...profissionalDefaultValues,
    ...profissional,
    disponibilidade: profissional.disponibilidade ?? [],
    canais_atendimento: profissional.canais_atendimento ?? [],
    tags: profissional.tags ?? [],
    status: profissional.status ?? "EM_ANALISE"
  };
}

function mapParaPayload(values: ProfissionalFormValues, id?: string): Profissional {
  const payload: Profissional = {
    id_profissional: id,
    nome_completo: values.nome_completo.trim(),
    cpf: values.cpf?.trim() || undefined,
    nome_social: values.nome_social?.trim() || undefined,
    apelido: values.apelido?.trim() || undefined,
    data_nascimento: values.data_nascimento?.trim() || undefined,
    foto_3x4: values.foto_3x4?.trim() || undefined,
    sexo_biologico: values.sexo_biologico?.trim() || undefined,
    identidade_genero: values.identidade_genero?.trim() || undefined,
    cor_raca: values.cor_raca?.trim() || undefined,
    estado_civil: values.estado_civil?.trim() || undefined,
    nacionalidade: values.nacionalidade?.trim() || undefined,
    naturalidade_cidade: values.naturalidade_cidade?.trim() || undefined,
    naturalidade_uf: values.naturalidade_uf?.trim() || undefined,
    nome_mae: values.nome_mae?.trim() || undefined,
    nome_pai: values.nome_pai?.trim() || undefined,
    vinculo: values.vinculo?.trim() || undefined,
    categoria: values.categoria.trim(),
    registro_conselho: values.registro_conselho?.trim() || undefined,
    especialidade: values.especialidade?.trim() || undefined,
    email: values.email?.trim() || undefined,
    telefone: values.telefone?.trim() || undefined,
    unidade: values.unidade?.trim() || undefined,
    sala_atendimento: values.sala_atendimento?.trim() || undefined,
    carga_horaria: values.carga_horaria,
    disponibilidade: values.disponibilidade,
    canais_atendimento: values.canais_atendimento,
    status: values.status,
    tags: values.tags,
    resumo: values.resumo?.trim() || undefined,
    observacoes: values.observacoes?.trim() || undefined,
    cep: values.cep?.trim() || undefined,
    logradouro: values.logradouro?.trim() || undefined,
    numero: values.numero?.trim() || undefined,
    complemento: values.complemento?.trim() || undefined,
    bairro: values.bairro?.trim() || undefined,
    ponto_referencia: values.ponto_referencia?.trim() || undefined,
    municipio: values.municipio?.trim() || undefined,
    zona: values.zona?.trim() || undefined,
    subzona: values.subzona?.trim() || undefined,
    uf: values.uf?.trim().toUpperCase() || undefined
  };
  return normalizarObjetoTexto(payload, mapaCamposTextoProfissionalForm);
}

export function CadastroProfissionalPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [filtroDraft, setFiltroDraft] = useState<ProfissionalFiltro>({
    nome: "",
    categoria: "",
    status: "",
    cpf: "",
    vinculo: ""
  });
  const [filtros, setFiltros] = useState<ProfissionalFiltro>(filtroDraft);
  const [idSelecionado, setIdSelecionado] = useState<string>();
  const [snapshot, setSnapshot] = useState<ProfissionalFormValues | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [popupSalvarAberto, setPopupSalvarAberto] = useState(false);
  const [codigoCadastroSalvo, setCodigoCadastroSalvo] = useState("");
  const [popupExcluirAberto, setPopupExcluirAberto] = useState(false);
  const [popupBuscarBeneficiarioAberto, setPopupBuscarBeneficiarioAberto] = useState(false);
  const [filtroBeneficiarioDraft, setFiltroBeneficiarioDraft] = useState<BeneficiarioFiltro>({
    nome: "",
    cpf: "",
    codigo: "",
    status: ""
  });
  const [filtrosBeneficiario, setFiltrosBeneficiario] = useState<BeneficiarioFiltro>({
    nome: "",
    cpf: "",
    codigo: "",
    status: ""
  });
  const [carregandoCep, setCarregandoCep] = useState(false);
  const [imprimindoRelatorio, setImprimindoRelatorio] = useState(false);
  const [webcamAberta, setWebcamAberta] = useState(false);
  const [carregandoWebcam, setCarregandoWebcam] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamWebcamRef = useRef<MediaStream | null>(null);
  const ultimoCepConsultadoRef = useRef("");

  const { data: listaData, isLoading: carregandoLista } = useProfissionais(filtros);
  const buscaBeneficiarioAtiva =
    popupBuscarBeneficiarioAberto &&
    ((filtrosBeneficiario.nome?.trim().length ?? 0) >= 2 ||
      (filtrosBeneficiario.codigo?.trim().length ?? 0) >= 1 ||
      somenteDigitos(filtrosBeneficiario.cpf).length === 11);
  const { data: beneficiariosBuscaData, isLoading: carregandoBuscaBeneficiario } = useBeneficiarios(
    filtrosBeneficiario,
    { enabled: buscaBeneficiarioAtiva }
  );
  const { data: detalhesData, isLoading: carregandoDetalhes } = useProfissional(idSelecionado);
  const { data: unidadesCatalogoData } = useQuery({
    queryKey: ["profissionais", "catalogo-unidades"],
    queryFn: () => unidadesAssistenciaisService.listar()
  });
  const { data: salasCatalogoData } = useQuery({
    queryKey: ["profissionais", "catalogo-salas"],
    queryFn: () => matriculasService.listarSalas()
  });
  const salvarMutation = useSalvarProfissional();
  const removerMutation = useRemoverProfissional();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(profissionalFormSchema),
    defaultValues: profissionalDefaultValues
  });

  const cepAtual = watch("cep") || "";
  const nomeCompletoAtual = watch("nome_completo") || "";
  const cpfAtual = watch("cpf") || "";
  const emailAtual = watch("email") || "";
  const telefoneAtual = watch("telefone") || "";
  const logradouroAtual = watch("logradouro") || "";
  const numeroAtual = watch("numero") || "";
  const bairroAtual = watch("bairro") || "";
  const municipioAtual = watch("municipio") || "";
  const ufAtual = watch("uf") || "";
  const subzonaAtual = watch("subzona") || "";
  const unidadeAgendaAtual = (watch("unidade") || "").trim();

  useEffect(() => {
    if (!detalhesData?.profissional) return;
    const values = mapParaFormulario(detalhesData.profissional);
    reset(values);
    setSnapshot(values);
    ultimoCepConsultadoRef.current = somenteDigitos(values.cep ?? "");
  }, [detalhesData, reset]);

  useEffect(() => {
    const cepNormalizado = somenteDigitos(cepAtual);
    if (cepNormalizado.length < 8) {
      ultimoCepConsultadoRef.current = "";
      setCarregandoCep(false);
      return;
    }
    if (cepNormalizado.length !== 8) {
      setCarregandoCep(false);
      return;
    }
    if (ultimoCepConsultadoRef.current === cepNormalizado) {
      return;
    }

    let ativo = true;
    setCarregandoCep(true);

    void (async () => {
      try {
        const endereco = await buscarEnderecoPorCep(cepNormalizado);
        if (!ativo) return;
        ultimoCepConsultadoRef.current = cepNormalizado;

        if (!endereco) {
          setMensagem({ tipo: "erro", texto: "CEP não encontrado." });
          return;
        }

        setValue("logradouro", endereco.logradouro, { shouldDirty: true, shouldValidate: true });
        setValue("bairro", endereco.bairro, { shouldDirty: true, shouldValidate: true });
        setValue("municipio", endereco.municipio, { shouldDirty: true, shouldValidate: true });
        setValue("uf", endereco.uf, { shouldDirty: true, shouldValidate: true });

        const complementoAtual = (getValues("complemento") ?? "").trim();
        if (!complementoAtual && endereco.complemento) {
          setValue("complemento", endereco.complemento, {
            shouldDirty: true,
            shouldValidate: true
          });
        }
      } catch (error: any) {
        if (!ativo) return;
        setMensagem({
          tipo: "erro",
          texto: error?.message ?? "Não foi possível consultar o CEP informado."
        });
      } finally {
        if (ativo) setCarregandoCep(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [cepAtual, getValues, setValue]);

  useEffect(() => {
    if (!webcamAberta) return;
    const video = videoRef.current;
    const stream = streamWebcamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play();
  }, [webcamAberta]);

  useEffect(() => {
    return () => {
      const stream = streamWebcamRef.current;
      if (!stream) return;
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamWebcamRef.current = null;
    };
  }, []);

  const profissionais = listaData?.profissionais ?? [];
  const beneficiariosBusca = beneficiariosBuscaData?.beneficiarios ?? [];
  const unidadesCatalogo = unidadesCatalogoData?.unidades ?? [];
  const salasCatalogo = salasCatalogoData?.salas ?? [];
  const salasAgendaFiltradas = useMemo(() => {
    if (!unidadeAgendaAtual) return salasCatalogo;
    const unidadeNormalizada = unidadeAgendaAtual.toLocaleLowerCase("pt-BR");
    const salasDaUnidade = salasCatalogo.filter((sala: MatriculaSalaCatalogo) =>
      (sala.unidade_nome ?? "").toLocaleLowerCase("pt-BR").includes(unidadeNormalizada)
    );
    return salasDaUnidade.length ? salasDaUnidade : salasCatalogo;
  }, [salasCatalogo, unidadeAgendaAtual]);
  const bloqueadoAcao =
    salvarMutation.isPending || removerMutation.isPending || carregandoDetalhes || imprimindoRelatorio;
  const abaAtual = abas.find((aba) => aba.id === abaAtiva);
  const IconeAbaAtiva = abaAtual?.icon ?? ListFilter;

  const possuiEnderecoParaMapa = useMemo(() => {
    return [logradouroAtual, numeroAtual, bairroAtual, municipioAtual, ufAtual, cepAtual].some(
      (valor) => valor.trim().length > 0
    );
  }, [bairroAtual, cepAtual, logradouroAtual, municipioAtual, numeroAtual, ufAtual]);

  function aplicarFormatacaoCampo(campo: keyof ProfissionalFormValues) {
    const valorAtual = getValues(campo);
    const valorFormatado = formatarTextoPorCampo(String(campo), valorAtual, mapaCamposTextoProfissionalForm);
    if (typeof valorAtual === "string" && typeof valorFormatado === "string" && valorAtual !== valorFormatado) {
      setValue(campo, valorFormatado as ProfissionalFormValues[keyof ProfissionalFormValues], {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }

  function alternarLista(campo: "disponibilidade" | "canais_atendimento", item: string) {
    const atual = getValues(campo) ?? [];
    const proximo = atual.includes(item) ? atual.filter((v) => v !== item) : [...atual, item];
    setValue(campo, proximo, { shouldDirty: true, shouldValidate: true });
  }

  function buscarBeneficiariosParaProfissional() {
    const nome = filtroBeneficiarioDraft.nome?.trim() ?? "";
    const cpf = somenteDigitos(filtroBeneficiarioDraft.cpf);
    const codigo = filtroBeneficiarioDraft.codigo?.trim() ?? "";

    if (nome.length < 2 && cpf.length !== 11 && codigo.length < 1) {
      setMensagem({
        tipo: "erro",
        texto: "Informe pelo menos nome (2 letras), CPF completo ou código para buscar beneficiários."
      });
      return;
    }

    setMensagem(null);
    setFiltrosBeneficiario({
      ...filtroBeneficiarioDraft,
      cpf: filtroBeneficiarioDraft.cpf?.trim() ?? ""
    });
  }

  function selecionarBeneficiarioParaProfissional(beneficiario: Beneficiario) {
    const proximoCategoria = (getValues("categoria") ?? "").trim() || "Profissional";

    setValue("nome_completo", beneficiario.nome_completo ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("cpf", beneficiario.cpf ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("data_nascimento", beneficiario.data_nascimento ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("foto_3x4", beneficiario.foto_3x4 ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("sexo_biologico", beneficiario.sexo_biologico ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("cor_raca", beneficiario.cor_raca ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("estado_civil", beneficiario.estado_civil ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("nacionalidade", beneficiario.nacionalidade ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("naturalidade_cidade", beneficiario.naturalidade_cidade ?? "", {
      shouldDirty: true,
      shouldValidate: true
    });
    setValue("naturalidade_uf", beneficiario.naturalidade_uf ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("nome_mae", beneficiario.nome_mae ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("nome_pai", beneficiario.nome_pai ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("email", beneficiario.email ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("telefone", beneficiario.telefone_principal ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("categoria", proximoCategoria, { shouldDirty: true, shouldValidate: true });
    setValue("cep", beneficiario.cep ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("logradouro", beneficiario.logradouro ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("numero", beneficiario.numero ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("complemento", beneficiario.complemento ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("bairro", beneficiario.bairro ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("ponto_referencia", beneficiario.ponto_referencia ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("municipio", beneficiario.municipio ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("zona", beneficiario.zona ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("subzona", beneficiario.subzona ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("uf", beneficiario.uf ?? "", { shouldDirty: true, shouldValidate: true });

    setPopupBuscarBeneficiarioAberto(false);
    setAbaAtiva("dados");
    setMensagem({
      tipo: "sucesso",
      texto: "Dados do beneficiário carregados no cadastro do profissional."
    });
  }

  function encerrarWebcam() {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    const stream = streamWebcamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    streamWebcamRef.current = null;
    setWebcamAberta(false);
  }

  async function abrirWebcam() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMensagem({
        tipo: "erro",
        texto: "Este navegador não permite captura por webcam."
      });
      return;
    }

    setMensagem(null);
    setCarregandoWebcam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      streamWebcamRef.current = stream;
      setWebcamAberta(true);
    } catch {
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível acessar a webcam. Verifique as permissões."
      });
    } finally {
      setCarregandoWebcam(false);
    }
  }

  async function definirFotoPorDataUrl(dataUrl: string) {
    const fotoTratada = await ajustarParaFotoTresPorQuatro(dataUrl);
    setValue("foto_3x4", fotoTratada, { shouldDirty: true, shouldValidate: true });
  }

  async function onSelecionarFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setMensagem({ tipo: "erro", texto: "Selecione um arquivo de imagem válido." });
      return;
    }

    if (arquivo.size > fotoMaximaBytes) {
      setMensagem({
        tipo: "erro",
        texto: "A foto deve ter no máximo 5 MB."
      });
      return;
    }

    try {
      const dataUrl = await lerArquivoComoDataUrl(arquivo);
      await definirFotoPorDataUrl(dataUrl);
      setMensagem(null);
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.message ?? "Não foi possível processar a foto enviada."
      });
    }
  }

  async function capturarFotoWebcam() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setMensagem({
        tipo: "erro",
        texto: "A webcam ainda não está pronta para captura."
      });
      return;
    }

    try {
      const dataUrl = capturarFotoTresPorQuatroDoVideo(video);
      await definirFotoPorDataUrl(dataUrl);
      encerrarWebcam();
      setMensagem(null);
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.message ?? "Não foi possível concluir a captura da foto."
      });
    }
  }

  function removerFoto() {
    setValue("foto_3x4", "", { shouldDirty: true, shouldValidate: true });
    setMensagem(null);
  }

  const onSalvar = handleSubmit(
    async (values) => {
      try {
        const payload = mapParaPayload(values as ProfissionalFormValues, idSelecionado);
        const response = await salvarMutation.mutateAsync(payload);
        const profissional = response.profissional;
        if (profissional?.id_profissional) setIdSelecionado(profissional.id_profissional);
        const atual = mapParaFormulario(profissional ?? payload);
        reset(atual);
        setSnapshot(atual);
        setCodigoCadastroSalvo(profissional?.id_profissional ?? idSelecionado ?? "");
        setPopupSalvarAberto(true);
        setFiltros((prev) => ({ ...prev }));
      } catch (error: any) {
        setMensagem({
          tipo: "erro",
          texto: error?.response?.data?.message ?? "Não foi possível salvar o profissional."
        });
      }
    },
    () => {
      setAbaAtiva("dados");
      setMensagem({ tipo: "erro", texto: "Preencha os campos obrigatórios antes de salvar." });
    }
  );

  function acaoBuscar() {
    setFiltros({ ...filtroDraft });
    setAbaAtiva("listagem");
  }

  function acaoNovo() {
    encerrarWebcam();
    setIdSelecionado(undefined);
    setSnapshot(null);
    reset(profissionalDefaultValues);
    setPopupBuscarBeneficiarioAberto(false);
    setFiltroBeneficiarioDraft({ nome: "", cpf: "", codigo: "", status: "" });
    setFiltrosBeneficiario({ nome: "", cpf: "", codigo: "", status: "" });
    setAbaAtiva("dados");
  }

  function acaoCancelar() {
    if (!snapshot) return acaoNovo();
    encerrarWebcam();
    reset(snapshot);
  }

  function acaoExcluir() {
    if (!idSelecionado) return setMensagem({ tipo: "erro", texto: "Selecione um profissional para excluir." });
    setPopupExcluirAberto(true);
  }

  async function confirmarExclusao() {
    if (!idSelecionado) return;
    try {
      await removerMutation.mutateAsync(idSelecionado);
      setPopupExcluirAberto(false);
      acaoNovo();
      setMensagem({ tipo: "sucesso", texto: "Profissional excluído com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o profissional."
      });
    }
  }

  async function acaoImprimir() {
    if (abaAtiva !== "listagem" && !idSelecionado) {
      setMensagem({ tipo: "erro", texto: "Salve ou selecione um profissional para imprimir o cadastro." });
      return;
    }

    const imprimindoListagem = abaAtiva === "listagem";
    let janela: ReturnType<typeof reservarJanelaRelatorio> | undefined;

    try {
      setImprimindoRelatorio(true);
      setMensagem(null);
      janela = reservarJanelaRelatorio(
        imprimindoListagem ? "Gerando lista de profissionais" : "Gerando cadastro do profissional"
      );
      const usuarioEmissor = usuario?.nome || usuario?.nomeUsuario || "Sistema G3-Next";

      if (!imprimindoListagem && idSelecionado) {
        const blob = await reportsService.gerarFichaProfissional({
          profissionalId: idSelecionado,
          usuarioEmissor
        });
        janela.publicar(blob);
        return;
      }

      const blob = await reportsService.gerarRelacaoProfissionais({
        ...filtros,
        usuarioEmissor
      });
      janela.publicar(blob);
    } catch (error: any) {
      janela?.fechar();
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível gerar o relatório."
      });
    } finally {
      setImprimindoRelatorio(false);
    }
  }

  function abrirMapa() {
    const partesEndereco = [logradouroAtual, numeroAtual, bairroAtual, municipioAtual, ufAtual, cepAtual]
      .map((valor) => valor.trim())
      .filter((valor) => valor.length > 0);

    if (partesEndereco.length === 0) {
      setMensagem({
        tipo: "erro",
        texto: "Preencha o endereço antes de abrir no Google Maps."
      });
      return;
    }

    const query = encodeURIComponent(partesEndereco.join(", "));
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
  }

  const acoes: AcaoCrud[] = [
    { label: "Buscar", onClick: acaoBuscar, variant: "outline", icon: Search },
    { label: "Novo", onClick: acaoNovo, variant: "outline", icon: Plus },
    { label: "Salvar", onClick: () => void onSalvar(), variant: "default", icon: Save },
    { label: "Cancelar", onClick: acaoCancelar, variant: "outline", icon: Undo2 },
    { label: "Excluir", onClick: acaoExcluir, variant: "danger", icon: Trash2 },
    { label: "Imprimir", onClick: acaoImprimir, variant: "outline", icon: Printer },
    { label: "Fechar", onClick: () => navigate("/"), variant: "outline", icon: X }
  ];

  const acoesNaOrdemPadrao = ordemAcoesCrudPadrao
    .map((label) => acoes.find((acao) => acao.label === label))
    .filter((acao): acao is AcaoCrud => !!acao);
  const rotuloImpressao = abaAtiva === "listagem" ? "Imprimir listagem" : "Imprimir cadastro";

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <section className={classesTelaPadraoBeneficiario.barraAcoes} data-print="toolbar">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
              Cadastros em geral
            </p>
            <h1 className="text-sm font-semibold tracking-tight text-[var(--g3-foreground)] sm:text-base">
              {tituloTela}
            </h1>
          </div>

          <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
            {acoesNaOrdemPadrao.map((acao) => (
              <Button key={acao.label} type="button" variant={acao.variant} size="sm" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={acao.onClick} disabled={bloqueadoAcao || (acao.label === "Excluir" && !idSelecionado)}>
                <acao.icon className="mr-1.5 h-3.5 w-3.5" />
                {acao.label === "Imprimir" ? rotuloImpressao : acao.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <div className={classesTelaPadraoBeneficiario.gradePrincipal} data-print="layout-grid">
        <Card className={classesTelaPadraoBeneficiario.cardAbas} data-print="tabs">
          <CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>
            {abas.map((aba, indice) => (
              <button key={aba.id} type="button" onClick={() => setAbaAtiva(aba.id)} className={classeBotaoAbaLateral(abaAtiva === aba.id)}>
                <span className={classeNumeroAbaLateral(abaAtiva === aba.id)}>{indice + 1}</span>
                <span>{aba.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
          <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
            <div className={classesTelaPadraoBeneficiario.tituloAba}>
              <IconeAbaAtiva className="h-4 w-4" />
              <CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>
                {abaAtiva === "listagem" ? "Listagem" : abaAtual?.label}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {abaAtiva === "listagem" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                  <div className="xl:col-span-4"><Label>Nome</Label><Input value={filtroDraft.nome ?? ""} onChange={(e) => setFiltroDraft((s) => ({ ...s, nome: e.target.value }))} /></div>
                  <div className="xl:col-span-3"><Label>Categoria</Label><Input value={filtroDraft.categoria ?? ""} onChange={(e) => setFiltroDraft((s) => ({ ...s, categoria: e.target.value }))} /></div>
                  <div className="xl:col-span-2"><Label>Status</Label><Select value={filtroDraft.status ?? ""} onChange={(e) => setFiltroDraft((s) => ({ ...s, status: e.target.value }))}><option value="">Todos</option>{profissionalStatusOptions.map((status) => <option key={status} value={status}>{formatarStatus(status)}</option>)}</Select></div>
                  <div className="xl:col-span-3"><Label>CPF</Label><Input value={filtroDraft.cpf ?? ""} onChange={(e) => setFiltroDraft((s) => ({ ...s, cpf: e.target.value }))} /></div>
                  <div className="sm:col-span-2 xl:col-span-12 flex justify-end"><Button type="button" variant="outline" className="bg-[var(--g3-primary-soft)]" onClick={() => setFiltroDraft({ nome: "", categoria: "", status: "", cpf: "", vinculo: "" })}>Limpar filtros</Button></div>
                </div>
                {carregandoLista ? <p className="text-sm text-slate-500">Carregando profissionais...</p> : (
                  <div className="overflow-hidden rounded-lg border border-[var(--g3-border)]">
                    {profissionais.map((item, indice) => (
                      <button key={item.id_profissional} type="button" onClick={() => { if (item.id_profissional) { setIdSelecionado(item.id_profissional); setAbaAtiva("dados"); } }} className={`grid w-full gap-2 border-b border-[var(--g3-border)] px-3 py-2 text-left xl:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] ${indice % 2 === 0 ? "bg-white" : "bg-[var(--g3-primary-soft)]/30"}`}>
                        <span className="text-sm font-semibold">{item.nome_completo}</span>
                        <span className="text-xs text-[var(--g3-muted)]">{item.categoria}</span>
                        <span className="text-xs text-[var(--g3-muted)]">{formatarStatus(item.status)}</span>
                        <span className="text-xs text-[var(--g3-muted)]">{formatarCpf(item.cpf)}</span>
                        <span className="text-xs text-[var(--g3-muted)]">{formatarTelefone(item.telefone)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {abaAtiva !== "listagem" && (
              <form className="space-y-3">
                                {abaAtiva === "dados" && (
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                    <div className="sm:col-span-2 xl:col-span-3 flex flex-col items-start space-y-2">
                      <Label>Foto 4x3</Label>
                      <div className="w-full max-w-[170px] aspect-[4/3] overflow-hidden rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)]">
                        {watch("foto_3x4") ? (
                          <img
                            src={resolverUrlArquivo(watch("foto_3x4"))}
                            alt="Foto do profissional"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-[var(--g3-muted)]">
                            Sem foto
                          </div>
                        )}
                      </div>
                      <input
                        ref={inputFotoRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => void onSelecionarFoto(e)}
                      />
                      <div className="flex w-full max-w-[170px] flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => inputFotoRef.current?.click()}
                        >
                          <Upload className="mr-1.5 h-3.5 w-3.5" />
                          Enviar foto
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void abrirWebcam()}
                          disabled={carregandoWebcam}
                        >
                          <Camera className="mr-1.5 h-3.5 w-3.5" />
                          {carregandoWebcam ? "Abrindo webcam..." : "Capturar webcam"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removerFoto}
                          disabled={!watch("foto_3x4")}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Remover foto
                        </Button>
                      </div>
                    </div>

                    <div className="sm:col-span-2 xl:col-span-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                      <div className="sm:col-span-2 xl:col-span-8">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <Label>Nome completo*</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                            onClick={() => setPopupBuscarBeneficiarioAberto(true)}
                          >
                            Buscar beneficiário
                          </Button>
                        </div>
                        <Input
                          {...register("nome_completo")}
                          className="h-9"
                          onBlurCapture={() => aplicarFormatacaoCampo("nome_completo")}
                        />
                        {errors.nome_completo && (
                          <p className="mt-1 text-xs text-red-600">{errors.nome_completo.message}</p>
                        )}
                      </div>
                      <div className="xl:col-span-4">
                        <Label>CPF</Label>
                        <Input
                          {...register("cpf")}
                          className={`h-9 ${errors.cpf ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          maxLength={14}
                          placeholder="000.000.000-00"
                        />
                        {errors.cpf && <p className="mt-1 text-xs text-red-600">{errors.cpf.message}</p>}
                      </div>
                      <div className="xl:col-span-4">
                        <Label>Atividade Exercida*</Label>
                        <Input
                          {...register("categoria")}
                          className="h-9"
                          onBlurCapture={() => aplicarFormatacaoCampo("categoria")}
                        />
                        {errors.categoria && <p className="mt-1 text-xs text-red-600">{errors.categoria.message}</p>}
                      </div>
                      <div className="xl:col-span-4">
                        <Label>Data de nascimento</Label>
                        <Input type="date" className="h-9" {...register("data_nascimento")} />
                      </div>
                      <div className="xl:col-span-4">
                        <Label>Sexo</Label>
                        <Select {...register("sexo_biologico")} className="h-9">
                          <option value="">Selecione</option>
                          {sexoOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="xl:col-span-4">
                        <Label>Nacionalidade</Label>
                        <Input
                          {...register("nacionalidade")}
                          className="h-9"
                          onBlurCapture={() => aplicarFormatacaoCampo("nacionalidade")}
                        />
                      </div>
                      <div className="xl:col-span-4">
                        <Label>Naturalidade (cidade)</Label>
                        <Input
                          {...register("naturalidade_cidade")}
                          className="h-9"
                          onBlurCapture={() => aplicarFormatacaoCampo("naturalidade_cidade")}
                        />
                      </div>
                      <div className="xl:col-span-2">
                        <Label>UF</Label>
                        <Input maxLength={2} className="h-9" {...register("naturalidade_uf")} />
                      </div>
                      <div className="xl:col-span-6">
                        <Label>Nome da mãe</Label>
                        <Input
                          {...register("nome_mae")}
                          className="h-9"
                          onBlurCapture={() => aplicarFormatacaoCampo("nome_mae")}
                        />
                      </div>
                      <div className="xl:col-span-6">
                        <Label>Nome do pai</Label>
                        <Input
                          {...register("nome_pai")}
                          className="h-9"
                          onBlurCapture={() => aplicarFormatacaoCampo("nome_pai")}
                        />
                      </div>
                    </div>
                  </section>
                )}
                {abaAtiva === "endereco" && (
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                    <div className="xl:col-span-3">
                      <Label>CEP</Label>
                      <Input
                        {...register("cep")}
                        className={`h-9 ${errors.cep ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        maxLength={9}
                        placeholder="00000-000"
                      />
                      {carregandoCep && (
                        <p className="mt-1 text-xs text-emerald-700">Consultando CEP...</p>
                      )}
                      {errors.cep && <p className="mt-1 text-xs text-red-600">{errors.cep.message}</p>}
                    </div>
                    <div className="xl:col-span-2">
                      <Label>Zona</Label>
                      <Select {...register("zona")} className="h-9">
                        <option value="">Selecione</option>
                        <option value="URBANA">Urbana</option>
                        <option value="RURAL">Rural</option>
                      </Select>
                    </div>
                    <div className="xl:col-span-3">
                      <Label>Subzona</Label>
                      <Select {...register("subzona")} className="h-9">
                        <option value="">Selecione</option>
                        {subzonaEnderecoOptions.map((subzona) => (
                          <option key={subzona.value} value={subzona.value}>
                            {subzona.label}
                          </option>
                        ))}
                        {subzonaAtual &&
                          !subzonaEnderecoOptions.some((subzona) => subzona.value === subzonaAtual) && (
                            <option value={subzonaAtual}>{subzonaAtual}</option>
                          )}
                      </Select>
                    </div>
                    <div className="flex items-end xl:col-span-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                        onClick={abrirMapa}
                        disabled={!possuiEnderecoParaMapa}
                      >
                        <MapPinned className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Ver no Google Maps
                      </Button>
                    </div>

                    <div className="sm:col-span-2 xl:col-span-8">
                      <Label>Endereço</Label>
                      <Input
                        {...register("logradouro")}
                        className="h-9"
                        onBlurCapture={() => aplicarFormatacaoCampo("logradouro")}
                      />
                    </div>
                    <div className="xl:col-span-2">
                      <Label>Número</Label>
                      <Input {...register("numero")} className="h-9" />
                    </div>
                    <div className="xl:col-span-2">
                      <Label>Complemento</Label>
                      <Input
                        {...register("complemento")}
                        className="h-9"
                        onBlurCapture={() => aplicarFormatacaoCampo("complemento")}
                      />
                    </div>
                    <div className="xl:col-span-4">
                      <Label>Bairro</Label>
                      <Input
                        {...register("bairro")}
                        className="h-9"
                        onBlurCapture={() => aplicarFormatacaoCampo("bairro")}
                      />
                    </div>
                    <div className="xl:col-span-4">
                      <Label>Município</Label>
                      <Input
                        {...register("municipio")}
                        className="h-9"
                        onBlurCapture={() => aplicarFormatacaoCampo("municipio")}
                      />
                    </div>
                    <div className="xl:col-span-2">
                      <Label>UF</Label>
                      <Input maxLength={2} {...register("uf")} className="h-9" />
                    </div>
                    <div className="sm:col-span-2 xl:col-span-12">
                      <Label>Ponto de referência</Label>
                      <Input
                        {...register("ponto_referencia")}
                        className="h-9"
                        onBlurCapture={() => aplicarFormatacaoCampo("ponto_referencia")}
                      />
                    </div>
                  </section>
                )}
                {abaAtiva === "perfil" && (
                  <>
                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                      <div className="xl:col-span-3"><Label>Vínculo</Label><Select {...register("vinculo")}><option value="">Selecione</option>{vinculosOptions.map((item) => <option key={item} value={item}>{item}</option>)}</Select></div>
                      <div className="xl:col-span-4"><Label>Registro em conselho</Label><Input {...register("registro_conselho")} onBlurCapture={() => aplicarFormatacaoCampo("registro_conselho")} /></div>
                      <div className="xl:col-span-5"><Label>Especialidade</Label><Input {...register("especialidade")} onBlurCapture={() => aplicarFormatacaoCampo("especialidade")} /></div>
                      <div className="xl:col-span-4"><Label>E-mail</Label><Input type="email" {...register("email")} /></div>
                      <div className="xl:col-span-3"><Label>Telefone</Label><Input {...register("telefone")} /></div>
                      <div className="sm:col-span-2 xl:col-span-12">
                        <MensagemAcoesRapidas
                          titulo="Mensagens do profissional"
                          destinatarioTipo="PROFISSIONAL"
                          destinatario={{
                            id: idSelecionado,
                            nome: nomeCompletoAtual.trim() || undefined,
                            email: emailAtual.trim() || undefined,
                            telefone: telefoneAtual.trim() || undefined,
                            documento: somenteDigitos(cpfAtual) || undefined,
                            detalhe: municipioAtual && ufAtual ? `${municipioAtual} / ${ufAtual}` : municipioAtual || undefined
                          }}
                          contextoExtra={{ profissionalId: idSelecionado }}
                          onFeedback={({ tipo, texto }) =>
                            setMensagem({
                              tipo: tipo === "sucesso" ? "sucesso" : "erro",
                              texto
                            })
                          }
                        />
                      </div>
                    </section>
                  </>
                )}
                {abaAtiva === "agenda" && (
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                    <div className="xl:col-span-5">
                      <Label>Unidade</Label>
                      <Input
                        list="catalogo-unidades-assistenciais"
                        {...register("unidade")}
                        onBlurCapture={() => aplicarFormatacaoCampo("unidade")}
                      />
                      <datalist id="catalogo-unidades-assistenciais">
                        {unidadesCatalogo.map((unidade) => (
                          <option
                            key={unidade.id_unidade ?? unidade.nome_fantasia}
                            value={unidade.nome_fantasia}
                          >
                            {`${unidade.cidade ?? ""}${unidade.estado ? ` - ${unidade.estado}` : ""}`}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <div className="xl:col-span-4">
                      <Label>Sala</Label>
                      <Input
                        list="catalogo-salas-atendimento"
                        {...register("sala_atendimento")}
                        onBlurCapture={() => aplicarFormatacaoCampo("sala_atendimento")}
                      />
                      <datalist id="catalogo-salas-atendimento">
                        {salasAgendaFiltradas.map((sala: MatriculaSalaCatalogo) => (
                          <option key={sala.id_sala} value={sala.nome}>
                            {sala.unidade_nome ?? ""}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <div className="xl:col-span-3">
                      <Label>Carga horária</Label>
                      <Input
                        type="number"
                        min={1}
                        {...register("carga_horaria", {
                          setValueAs: (value) => (value === "" ? undefined : Number(value))
                        })}
                      />
                    </div>
                    <div className="xl:col-span-3">
                      <Label>Status</Label>
                      <Select {...register("status")}>
                        {profissionalStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {formatarStatus(status)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="sm:col-span-2 xl:col-span-5">
                      <Label>Disponibilidade</Label>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {disponibilidadesOptions.map((item) => (
                          <label key={item} className="inline-flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={watch("disponibilidade")?.includes(item)}
                              onChange={() => alternarLista("disponibilidade", item)}
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="sm:col-span-2 xl:col-span-4">
                      <Label>Canais</Label>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {canaisAtendimentoOptions.map((item) => (
                          <label key={item} className="inline-flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={watch("canais_atendimento")?.includes(item)}
                              onChange={() => alternarLista("canais_atendimento", item)}
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
                {abaAtiva === "resumo" && <section className="grid gap-3 xl:grid-cols-12"><div className="xl:col-span-12"><Label>Tags (separadas por vírgula)</Label><Input value={(watch("tags") ?? []).join(", ")} onChange={(e) => setValue("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean), { shouldDirty: true, shouldValidate: true })} /></div><div className="xl:col-span-12"><Label>Resumo</Label><Textarea {...register("resumo")} rows={3} onBlurCapture={() => aplicarFormatacaoCampo("resumo")} /></div><div className="xl:col-span-12"><Label>Observações</Label><Textarea {...register("observacoes")} rows={3} onBlurCapture={() => aplicarFormatacaoCampo("observacoes")} /></div></section>}
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {mensagem && <div className="fixed inset-0 z-[58] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => setMensagem(null)}><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="border-b border-slate-100 px-5 py-4"><h3 className={`text-base font-semibold ${mensagem.tipo === "sucesso" ? "text-emerald-800" : "text-red-700"}`}>{mensagem.tipo === "sucesso" ? "Confirmação" : "Atenção"}</h3></div><div className="px-5 py-4"><p className="text-sm text-slate-700">{mensagem.texto}</p></div><div className="flex justify-end border-t border-slate-100 px-5 py-3"><Button type="button" onClick={() => setMensagem(null)}>OK</Button></div></div></div>}
      {popupSalvarAberto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setPopupSalvarAberto(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 pb-6 pt-8 shadow-2xl sm:px-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Fechar confirmação do cadastro"
              className="absolute right-4 top-4 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              onClick={() => setPopupSalvarAberto(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-20 w-20 stroke-[1.8] text-[var(--g3-primary)]" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-semibold text-slate-800">
                Cadastro realizado com sucesso
              </h3>
              <p className="mt-3 text-sm text-slate-500">
                Número do cadastro: <span className="font-semibold text-slate-700">{codigoCadastroSalvo || "—"}</span>
              </p>
            </div>
            <div className="mt-7">
              <Button
                type="button"
                className="h-12 w-full rounded-lg bg-[var(--g3-primary-button)] text-base font-semibold text-white shadow-sm hover:bg-[var(--g3-primary-button-hover)]"
                onClick={() => setPopupSalvarAberto(false)}
              >
                Finalizar cadastro
              </Button>
            </div>
          </div>
        </div>
      )}
      {popupExcluirAberto && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => !removerMutation.isPending && setPopupExcluirAberto(false)}><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Confirmar exclusão</h3></div><div className="px-5 py-4"><p className="text-sm text-slate-700">Esta ação é irreversível. Deseja continuar?</p></div><div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3"><Button type="button" variant="outline" onClick={() => setPopupExcluirAberto(false)} disabled={removerMutation.isPending}>Cancelar</Button><Button type="button" variant="danger" onClick={() => void confirmarExclusao()} disabled={removerMutation.isPending}>{removerMutation.isPending ? "Excluindo..." : "Excluir"}</Button></div></div></div>}
      {webcamAberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-4"
          role="dialog"
          aria-modal="true"
          onClick={encerrarWebcam}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Capturar Foto 4x3</h3>
              <Button type="button" variant="ghost" size="sm" onClick={encerrarWebcam}>
                Fechar
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 sm:max-w-sm">
                <video
                  ref={videoRef}
                  className="aspect-[4/3] w-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              </div>
              <p className="text-center text-xs text-slate-600">
                Posicione o rosto no centro e clique em Capturar.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
              <Button type="button" variant="outline" onClick={encerrarWebcam}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void capturarFotoWebcam()}>
                Capturar
              </Button>
            </div>
          </div>
        </div>
      )}
      {popupBuscarBeneficiarioAberto && (
        <div
          className="fixed inset-0 z-[62] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setPopupBuscarBeneficiarioAberto(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[var(--g3-border)] px-5 py-4">
              <h3 className="text-base font-semibold text-[var(--g3-foreground)]">
                Buscar beneficiário para transformar em profissional
              </h3>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                <div className="xl:col-span-6">
                  <Label>Nome</Label>
                  <Input
                    value={filtroBeneficiarioDraft.nome ?? ""}
                    placeholder="Digite pelo menos 2 letras"
                    onChange={(event) =>
                      setFiltroBeneficiarioDraft((estadoAtual) => ({
                        ...estadoAtual,
                        nome: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="xl:col-span-3">
                  <Label>CPF</Label>
                  <Input
                    value={filtroBeneficiarioDraft.cpf ?? ""}
                    placeholder="000.000.000-00"
                    onChange={(event) =>
                      setFiltroBeneficiarioDraft((estadoAtual) => ({
                        ...estadoAtual,
                        cpf: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="xl:col-span-3">
                  <Label>Código</Label>
                  <Input
                    value={filtroBeneficiarioDraft.codigo ?? ""}
                    placeholder="Código do beneficiário"
                    onChange={(event) =>
                      setFiltroBeneficiarioDraft((estadoAtual) => ({
                        ...estadoAtual,
                        codigo: event.target.value
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={buscarBeneficiariosParaProfissional}>
                  Buscar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-[var(--g3-primary-soft)]"
                  onClick={() => {
                    setFiltroBeneficiarioDraft({ nome: "", cpf: "", codigo: "", status: "" });
                    setFiltrosBeneficiario({ nome: "", cpf: "", codigo: "", status: "" });
                  }}
                >
                  Limpar filtros
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border border-[var(--g3-border)]">
                {carregandoBuscaBeneficiario ? (
                  <p className="p-3 text-sm text-[var(--g3-muted)]">Buscando beneficiários...</p>
                ) : !buscaBeneficiarioAtiva ? (
                  <p className="p-3 text-sm text-[var(--g3-muted)]">
                    Informe nome, CPF ou código e clique em Buscar.
                  </p>
                ) : beneficiariosBusca.length === 0 ? (
                  <p className="p-3 text-sm text-[var(--g3-muted)]">Nenhum beneficiário encontrado.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Código</th>
                          <th className="px-3 py-2 font-semibold">Nome</th>
                          <th className="px-3 py-2 font-semibold">CPF</th>
                          <th className="px-3 py-2 text-right font-semibold">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {beneficiariosBusca.map((beneficiario, indice) => (
                          <tr
                            key={beneficiario.id_beneficiario}
                            className={indice % 2 === 0 ? "bg-white" : "bg-[var(--g3-primary-soft)]/30"}
                          >
                            <td className="px-3 py-2">{beneficiario.codigo ?? "---"}</td>
                            <td className="px-3 py-2">{beneficiario.nome_completo || beneficiario.nome_social}</td>
                            <td className="px-3 py-2">{formatarCpf(beneficiario.cpf)}</td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => selecionarBeneficiarioParaProfissional(beneficiario)}
                              >
                                Selecionar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-[var(--g3-border)] px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setPopupBuscarBeneficiarioAberto(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}






