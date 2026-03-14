import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Camera,
  CalendarClock,
  FileText,
  HandHeart,
  ListFilter,
  MapPinned,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  Upload,
  UserRound,
  X
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
  voluntarioDefaultValues,
  voluntarioFormSchema,
  voluntarioStatusOptions,
  type VoluntarioFormValues
} from "@/features/voluntarios/voluntario.schema";
import {
  useVoluntario,
  useVoluntarios,
  useRemoverVoluntario,
  useSalvarVoluntario
} from "@/features/voluntarios/use-voluntarios";
import { useBeneficiarios } from "@/features/beneficiarios/use-beneficiarios";
import { useProfissionais } from "@/features/profissionais/use-profissionais";
import type { Voluntario, VoluntarioFiltro } from "@/types/voluntario";
import type { ProfissionalFiltro } from "@/types/profissional";
import type { Beneficiario, BeneficiarioFiltro } from "@/types/beneficiario";
import { buscarEnderecoPorCep } from "@/services/cep.service";
import { reportsService } from "@/services/reports.service";
import { somenteDigitos } from "@/lib/validators";
import { formatarTextoPorCampo, normalizarObjetoTexto } from "@/lib/text-formatter";
import { mapaCamposTextoVoluntarioForm } from "@/lib/text-format-config";
import { abrirRelatorioPdf } from "@/lib/report-utils";
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

const tituloTela = "Cadastro de voluntariado";

const abas = [
  { id: "listagem", label: "Listagem de voluntários", icon: ListFilter },
  { id: "dados", label: "Dados pessoais", icon: UserRound },
  { id: "contato", label: "Contato e competências", icon: HandHeart },
  { id: "endereco", label: "Endereço", icon: MapPinned },
  { id: "disponibilidade", label: "Disponibilidade", icon: CalendarClock },
  { id: "termos", label: "Termos e documentos", icon: FileText }
] as const;

type AbaId = (typeof abas)[number]["id"];

type AcaoCrud = {
  label: string;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  icon: LucideIcon;
};

const diasOptions = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const periodosOptions = ["Manhá", "Tarde", "Noite"];

function formatarCpf(valor?: string) {
  if (!valor) return "---";
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length !== 11) return valor;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function mapParaFormulario(voluntario: Voluntario): VoluntarioFormValues {
  return {
    ...voluntarioDefaultValues,
    ...voluntario,
    disponibilidade_dias: voluntario.disponibilidade_dias ?? [],
    disponibilidade_periodos: voluntario.disponibilidade_periodos ?? [],
    presencial: voluntario.presencial ?? true,
    remoto: voluntario.remoto ?? false,
    aceite_voluntariado: voluntario.aceite_voluntariado ?? false,
    aceite_imagem: voluntario.aceite_imagem ?? false,
    status: voluntario.status ?? "ATIVO"
  };
}

function mapParaPayload(values: VoluntarioFormValues, id?: string): Voluntario {
  const payload: Voluntario = {
    id_voluntario: id,
    profissional_id: values.profissional_id || undefined,
    nome_completo: values.nome_completo.trim(),
    cpf: values.cpf.trim(),
    rg: values.rg?.trim() || undefined,
    foto_3x4: values.foto_3x4?.trim() || undefined,
    data_nascimento: values.data_nascimento?.trim() || undefined,
    genero: values.genero?.trim() || undefined,
    profissao: values.profissao?.trim() || undefined,
    motivacao: values.motivacao?.trim() || undefined,
    telefone: values.telefone?.trim() || undefined,
    email: values.email.trim(),
    cidade: values.cidade?.trim() || undefined,
    estado: values.estado?.trim().toUpperCase() || undefined,
    area_interesse: values.area_interesse?.trim() || undefined,
    habilidades: values.habilidades?.trim() || undefined,
    idiomas: values.idiomas?.trim() || undefined,
    linkedin: values.linkedin?.trim() || undefined,
    status: values.status,
    disponibilidade_dias: values.disponibilidade_dias,
    disponibilidade_periodos: values.disponibilidade_periodos,
    carga_horaria_semanal: values.carga_horaria_semanal?.trim() || undefined,
    presencial: values.presencial,
    remoto: values.remoto,
    inicio_previsto: values.inicio_previsto?.trim() || undefined,
    observacoes: values.observacoes?.trim() || undefined,
    documento_identificacao: values.documento_identificacao?.trim() || undefined,
    comprovante_endereco: values.comprovante_endereco?.trim() || undefined,
    aceite_voluntariado: values.aceite_voluntariado,
    aceite_imagem: values.aceite_imagem,
    assinatura_digital: values.assinatura_digital?.trim() || undefined,
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

  return normalizarObjetoTexto(payload, mapaCamposTextoVoluntarioForm);
}

export function CadastroVoluntariadoPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [filtroDraft, setFiltroDraft] = useState<VoluntarioFiltro>({
    nome: "",
    cpf: "",
    status: "",
    email: ""
  });
  const [filtros, setFiltros] = useState<VoluntarioFiltro>(filtroDraft);
  const [idSelecionado, setIdSelecionado] = useState<string>();
  const [snapshot, setSnapshot] = useState<VoluntarioFormValues | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [popupSalvarAberto, setPopupSalvarAberto] = useState(false);
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

  const filtroProfissionais = useMemo<ProfissionalFiltro>(() => ({ nome: "", status: "" }), []);
  const { data: profissionaisData } = useProfissionais(filtroProfissionais);
  const { data: listaData, isLoading: carregandoLista } = useVoluntarios(filtros);
  const buscaBeneficiarioAtiva =
    popupBuscarBeneficiarioAberto &&
    ((filtrosBeneficiario.nome?.trim().length ?? 0) >= 2 ||
      (filtrosBeneficiario.codigo?.trim().length ?? 0) >= 1 ||
      somenteDigitos(filtrosBeneficiario.cpf).length === 11);
  const { data: beneficiariosBuscaData, isLoading: carregandoBuscaBeneficiario } = useBeneficiarios(
    filtrosBeneficiario,
    { enabled: buscaBeneficiarioAtiva }
  );
  const { data: detalhesData, isLoading: carregandoDetalhes } = useVoluntario(idSelecionado);
  const salvarMutation = useSalvarVoluntario();
  const removerMutation = useRemoverVoluntario();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(voluntarioFormSchema),
    defaultValues: voluntarioDefaultValues
  });

  const cepAtual = watch("cep") || "";
  const nomeCompletoAtual = watch("nome_completo") || "";
  const cpfAtual = watch("cpf") || "";
  const emailAtual = watch("email") || "";
  const telefoneAtual = watch("telefone") || "";
  const cidadeContatoAtual = watch("cidade") || "";
  const estadoContatoAtual = watch("estado") || "";
  const logradouroAtual = watch("logradouro") || "";
  const numeroAtual = watch("numero") || "";
  const bairroAtual = watch("bairro") || "";
  const municipioAtual = watch("municipio") || "";
  const ufAtual = watch("uf") || "";

  useEffect(() => {
    if (!detalhesData?.voluntario) return;
    const values = mapParaFormulario(detalhesData.voluntario);
    reset(values);
    setSnapshot(values);
    ultimoCepConsultadoRef.current = somenteDigitos(values.cep ?? "");
  }, [detalhesData, reset]);

  useEffect(() => {
    const cepNormalizado = somenteDigitos(cepAtual);
    if (cepNormalizado.length !== 8) return;
    if (ultimoCepConsultadoRef.current === cepNormalizado) return;

    let ativo = true;
    setCarregandoCep(true);

    void (async () => {
      try {
        const endereco = await buscarEnderecoPorCep(cepNormalizado);
        if (!ativo || !endereco) return;
        ultimoCepConsultadoRef.current = cepNormalizado;
        setValue("logradouro", endereco.logradouro, { shouldDirty: true, shouldValidate: true });
        setValue("bairro", endereco.bairro, { shouldDirty: true, shouldValidate: true });
        setValue("municipio", endereco.municipio, { shouldDirty: true, shouldValidate: true });
        setValue("uf", endereco.uf, { shouldDirty: true, shouldValidate: true });
      } finally {
        if (ativo) setCarregandoCep(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [cepAtual, setValue]);

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

  const voluntarios = listaData?.voluntarios ?? [];
  const profissionais = profissionaisData?.profissionais ?? [];
  const beneficiariosBusca = beneficiariosBuscaData?.beneficiarios ?? [];
  const bloqueadoAcao =
    salvarMutation.isPending || removerMutation.isPending || carregandoDetalhes || imprimindoRelatorio;
  const abaAtual = abas.find((aba) => aba.id === abaAtiva);
  const IconeAbaAtiva = abaAtual?.icon ?? ListFilter;

  const possuiEnderecoParaMapa = useMemo(() => {
    return [logradouroAtual, numeroAtual, bairroAtual, municipioAtual, ufAtual, cepAtual].some((valor) => valor.trim().length > 0);
  }, [bairroAtual, cepAtual, logradouroAtual, municipioAtual, numeroAtual, ufAtual]);

  function aplicarFormatacaoCampo(campo: keyof VoluntarioFormValues) {
    const valorAtual = getValues(campo);
    const valorFormatado = formatarTextoPorCampo(String(campo), valorAtual, mapaCamposTextoVoluntarioForm);
    if (typeof valorAtual === "string" && typeof valorFormatado === "string" && valorAtual !== valorFormatado) {
      setValue(campo, valorFormatado as VoluntarioFormValues[keyof VoluntarioFormValues], {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }

  function alternarLista(campo: "disponibilidade_dias" | "disponibilidade_periodos", item: string) {
    const atual = getValues(campo) ?? [];
    const proximo = atual.includes(item) ? atual.filter((v) => v !== item) : [...atual, item];
    setValue(campo, proximo, { shouldDirty: true, shouldValidate: true });
  }

  function buscarBeneficiariosParaVoluntariado() {
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

  function selecionarBeneficiarioParaVoluntariado(beneficiario: Beneficiario) {
    setValue("nome_completo", beneficiario.nome_completo ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("cpf", beneficiario.cpf ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("rg", beneficiario.rg_numero ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("data_nascimento", beneficiario.data_nascimento ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("foto_3x4", beneficiario.foto_3x4 ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("genero", beneficiario.sexo_biologico ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("profissao", beneficiario.ocupacao ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("telefone", beneficiario.telefone_principal ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("email", beneficiario.email ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("cidade", beneficiario.municipio ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("estado", beneficiario.uf ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("cep", beneficiario.cep ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("logradouro", beneficiario.logradouro ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("numero", beneficiario.numero ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("complemento", beneficiario.complemento ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("bairro", beneficiario.bairro ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("ponto_referencia", beneficiario.ponto_referencia ?? "", {
      shouldDirty: true,
      shouldValidate: true
    });
    setValue("municipio", beneficiario.municipio ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("zona", beneficiario.zona ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("subzona", beneficiario.subzona ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("uf", beneficiario.uf ?? "", { shouldDirty: true, shouldValidate: true });

    setPopupBuscarBeneficiarioAberto(false);
    setAbaAtiva("dados");
    setMensagem({
      tipo: "sucesso",
      texto: "Dados do beneficiário carregados no cadastro do voluntariado."
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
        const payload = mapParaPayload(values as VoluntarioFormValues, idSelecionado);
        const response = await salvarMutation.mutateAsync(payload);
        const voluntario = response.voluntario;
        if (voluntario?.id_voluntario) setIdSelecionado(voluntario.id_voluntario);
        const atual = mapParaFormulario(voluntario ?? payload);
        reset(atual);
        setSnapshot(atual);
        setPopupSalvarAberto(true);
        setFiltros((prev) => ({ ...prev }));
      } catch (error: any) {
        setMensagem({
          tipo: "erro",
          texto: error?.response?.data?.message ?? "Não foi possível salvar o voluntário."
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
    reset(voluntarioDefaultValues);
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
    if (!idSelecionado) return setMensagem({ tipo: "erro", texto: "Selecione um voluntário para excluir." });
    setPopupExcluirAberto(true);
  }

  async function confirmarExclusao() {
    if (!idSelecionado) return;
    try {
      await removerMutation.mutateAsync(idSelecionado);
      setPopupExcluirAberto(false);
      acaoNovo();
      setMensagem({ tipo: "sucesso", texto: "Voluntário excluído com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o voluntário."
      });
    }
  }

  async function acaoImprimir() {
    try {
      setImprimindoRelatorio(true);
      setMensagem(null);
      const usuarioEmissor = usuario?.nome || usuario?.nomeUsuario || "Sistema G3-Next";

      if (idSelecionado) {
        const blob = await reportsService.gerarFichaVoluntario({
          voluntarioId: idSelecionado,
          usuarioEmissor
        });
        abrirRelatorioPdf(blob);
        return;
      }

      const blob = await reportsService.gerarRelacaoVoluntarios({
        ...filtros,
        usuarioEmissor
      });
      abrirRelatorioPdf(blob);
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível gerar o relatório."
      });
    } finally {
      setImprimindoRelatorio(false);
    }
  }
  function abrirMapa() {
    const query = encodeURIComponent([logradouroAtual, numeroAtual, bairroAtual, municipioAtual, ufAtual, cepAtual].filter(Boolean).join(", "));
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

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <section className={classesTelaPadraoBeneficiario.barraAcoes} data-print="toolbar">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
              Cadastros
            </p>
            <h1 className="text-sm font-semibold tracking-tight text-[var(--g3-foreground)] sm:text-base">
              {tituloTela}
            </h1>
          </div>

          <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
            {acoesNaOrdemPadrao.map((acao) => (
              <Button key={acao.label} type="button" variant={acao.variant} size="sm" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={acao.onClick} disabled={bloqueadoAcao || (acao.label === "Excluir" && !idSelecionado)}>
                <acao.icon className="mr-1.5 h-3.5 w-3.5" />
                {acao.label}
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
                  <div className="xl:col-span-3"><Label>CPF</Label><Input value={filtroDraft.cpf ?? ""} onChange={(e) => setFiltroDraft((s) => ({ ...s, cpf: e.target.value }))} /></div>
                  <div className="xl:col-span-3"><Label>E-mail</Label><Input value={filtroDraft.email ?? ""} onChange={(e) => setFiltroDraft((s) => ({ ...s, email: e.target.value }))} /></div>
                  <div className="xl:col-span-2"><Label>Status</Label><Select value={filtroDraft.status ?? ""} onChange={(e) => setFiltroDraft((s) => ({ ...s, status: e.target.value }))}><option value="">Todos</option>{voluntarioStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></div>
                  <div className="sm:col-span-2 xl:col-span-12 flex justify-end"><Button type="button" variant="outline" className="bg-[var(--g3-primary-soft)]" onClick={() => setFiltroDraft({ nome: "", cpf: "", status: "", email: "" })}>Limpar filtros</Button></div>
                </div>
                {carregandoLista ? <p className="text-sm text-slate-500">Carregando voluntários...</p> : (
                  <div className="overflow-hidden rounded-lg border border-[var(--g3-border)]">
                    {voluntarios.map((item, indice) => (
                      <button key={item.id_voluntario} type="button" onClick={() => { if (item.id_voluntario) { setIdSelecionado(item.id_voluntario); setAbaAtiva("dados"); } }} className={`grid w-full gap-2 border-b border-[var(--g3-border)] px-3 py-2 text-left xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,0.9fr)] ${indice % 2 === 0 ? "bg-white" : "bg-[var(--g3-primary-soft)]/30"}`}>
                        <span className="text-sm font-semibold">{item.nome_completo}</span>
                        <span className="text-xs text-[var(--g3-muted)]">{formatarCpf(item.cpf)}</span>
                        <span className="text-xs text-[var(--g3-muted)]">{item.email}</span>
                        <span className="text-xs text-[var(--g3-muted)]">{item.status}</span>
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
                          <img src={resolverUrlArquivo(watch("foto_3x4"))} alt="Foto do voluntário" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-[var(--g3-muted)]">Sem foto</div>
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
                        <Button type="button" variant="outline" size="sm" onClick={() => inputFotoRef.current?.click()}>
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
                      <div className="sm:col-span-2 xl:col-span-6">
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
                        <Input {...register("nome_completo")} onBlurCapture={() => aplicarFormatacaoCampo("nome_completo")} />
                        {errors.nome_completo && <p className="mt-1 text-xs text-red-600">{errors.nome_completo.message}</p>}
                      </div>

                      <div className="xl:col-span-3">
                        <Label>CPF*</Label>
                        <Input {...register("cpf")} />
                        {errors.cpf && <p className="mt-1 text-xs text-red-600">{errors.cpf.message}</p>}
                      </div>

                      <div className="xl:col-span-3">
                        <Label>RG</Label>
                        <Input {...register("rg")} />
                      </div>

                      <div className="xl:col-span-4">
                        <Label>Data de nascimento</Label>
                        <Input type="date" {...register("data_nascimento")} />
                      </div>

                      <div className="xl:col-span-4">
                        <Label>Gênero</Label>
                        <Input {...register("genero")} onBlurCapture={() => aplicarFormatacaoCampo("genero")} />
                      </div>

                      <div className="xl:col-span-4">
                        <Label>Profissão</Label>
                        <Input {...register("profissao")} onBlurCapture={() => aplicarFormatacaoCampo("profissao")} />
                      </div>

                      <div className="xl:col-span-6">
                        <Label>Profissional vinculado</Label>
                        <Select {...register("profissional_id")}>
                          <option value="">Não vincular</option>
                          {profissionais.map((profissional) => (
                            <option key={profissional.id_profissional} value={profissional.id_profissional}>
                              {profissional.nome_completo}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="xl:col-span-6">
                        <Label>Motivação</Label>
                        <Textarea {...register("motivacao")} rows={2} onBlurCapture={() => aplicarFormatacaoCampo("motivacao")} />
                      </div>
                    </div>
                  </section>
                )}
                {abaAtiva === "contato" && (
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                    <div className="xl:col-span-4"><Label>E-mail*</Label><Input type="email" {...register("email")} />{errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}</div>
                    <div className="xl:col-span-3"><Label>Telefone</Label><Input {...register("telefone")} /></div>
                    <div className="xl:col-span-3"><Label>Cidade</Label><Input {...register("cidade")} onBlurCapture={() => aplicarFormatacaoCampo("cidade")} /></div>
                    <div className="xl:col-span-2"><Label>Estado (UF)</Label><Input maxLength={2} {...register("estado")} /></div>
                    <div className="xl:col-span-6"><Label>Área de interesse</Label><Input {...register("area_interesse")} onBlurCapture={() => aplicarFormatacaoCampo("area_interesse")} /></div>
                    <div className="xl:col-span-6"><Label>Idiomas</Label><Input {...register("idiomas")} onBlurCapture={() => aplicarFormatacaoCampo("idiomas")} /></div>
                    <div className="xl:col-span-6"><Label>Habilidades</Label><Textarea {...register("habilidades")} rows={2} onBlurCapture={() => aplicarFormatacaoCampo("habilidades")} /></div>
                    <div className="xl:col-span-6"><Label>LinkedIn</Label><Input {...register("linkedin")} /></div>
                    <div className="sm:col-span-2 xl:col-span-12">
                      <MensagemAcoesRapidas
                        titulo="Mensagens do voluntário"
                        destinatarioTipo="VOLUNTARIO"
                        destinatario={{
                          id: idSelecionado,
                          nome: nomeCompletoAtual.trim() || undefined,
                          email: emailAtual.trim() || undefined,
                          telefone: telefoneAtual.trim() || undefined,
                          documento: somenteDigitos(cpfAtual) || undefined,
                          detalhe:
                            cidadeContatoAtual && estadoContatoAtual
                              ? `${cidadeContatoAtual} / ${estadoContatoAtual}`
                              : cidadeContatoAtual || undefined
                        }}
                        contextoExtra={{ voluntarioId: idSelecionado }}
                        onFeedback={({ tipo, texto }) =>
                          setMensagem({
                            tipo: tipo === "sucesso" ? "sucesso" : "erro",
                            texto
                          })
                        }
                      />
                    </div>
                  </section>
                )}
                {abaAtiva === "endereco" && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12"><div className="xl:col-span-3"><Label>CEP</Label><Input {...register("cep")} />{carregandoCep && <p className="mt-1 text-xs text-slate-500">Consultando CEP...</p>}</div><div className="xl:col-span-6"><Label>Endereço</Label><Input {...register("logradouro")} onBlurCapture={() => aplicarFormatacaoCampo("logradouro")} /></div><div className="xl:col-span-3"><Label>Número</Label><Input {...register("numero")} /></div><div className="xl:col-span-4"><Label>Complemento</Label><Input {...register("complemento")} onBlurCapture={() => aplicarFormatacaoCampo("complemento")} /></div><div className="xl:col-span-4"><Label>Bairro</Label><Input {...register("bairro")} onBlurCapture={() => aplicarFormatacaoCampo("bairro")} /></div><div className="xl:col-span-4"><Label>Ponto de referência</Label><Input {...register("ponto_referencia")} onBlurCapture={() => aplicarFormatacaoCampo("ponto_referencia")} /></div><div className="xl:col-span-4"><Label>Município</Label><Input {...register("municipio")} onBlurCapture={() => aplicarFormatacaoCampo("municipio")} /></div><div className="xl:col-span-2"><Label>UF</Label><Input maxLength={2} {...register("uf")} /></div><div className="xl:col-span-3"><Label>Zona</Label><Input {...register("zona")} /></div><div className="xl:col-span-3"><Label>Subzona</Label><Input {...register("subzona")} /></div><div className="sm:col-span-2 xl:col-span-12"><Button type="button" variant="outline" onClick={abrirMapa} disabled={!possuiEnderecoParaMapa}>Ver no Google Maps</Button></div></section>}
                {abaAtiva === "disponibilidade" && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12"><div className="xl:col-span-3"><Label>Status</Label><Select {...register("status")}>{voluntarioStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></div><div className="xl:col-span-3"><Label>Carga horária semanal</Label><Input {...register("carga_horaria_semanal")} onBlurCapture={() => aplicarFormatacaoCampo("carga_horaria_semanal")} /></div><div className="xl:col-span-3"><Label>Início previsto</Label><Input type="date" {...register("inicio_previsto")} /></div><label className="xl:col-span-2 flex items-center gap-2 text-sm"><Checkbox {...register("presencial")} checked={!!watch("presencial")} />Presencial</label><label className="xl:col-span-2 flex items-center gap-2 text-sm"><Checkbox {...register("remoto")} checked={!!watch("remoto")} />Remoto</label><div className="sm:col-span-2 xl:col-span-6"><Label>Dias disponíveis</Label><div className="mt-2 flex flex-wrap gap-3">{diasOptions.map((item) => <label key={item} className="inline-flex items-center gap-2 text-sm"><Checkbox checked={watch("disponibilidade_dias")?.includes(item)} onChange={() => alternarLista("disponibilidade_dias", item)} />{item}</label>)}</div></div><div className="sm:col-span-2 xl:col-span-6"><Label>Períodos</Label><div className="mt-2 flex flex-wrap gap-3">{periodosOptions.map((item) => <label key={item} className="inline-flex items-center gap-2 text-sm"><Checkbox checked={watch("disponibilidade_periodos")?.includes(item)} onChange={() => alternarLista("disponibilidade_periodos", item)} />{item}</label>)}</div></div><div className="xl:col-span-12"><Label>Observações</Label><Textarea {...register("observacoes")} rows={2} onBlurCapture={() => aplicarFormatacaoCampo("observacoes")} /></div></section>}
                {abaAtiva === "termos" && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12"><label className="xl:col-span-4 flex items-center gap-2 text-sm"><Checkbox {...register("aceite_voluntariado")} checked={!!watch("aceite_voluntariado")} />Aceite de voluntariado</label><label className="xl:col-span-4 flex items-center gap-2 text-sm"><Checkbox {...register("aceite_imagem")} checked={!!watch("aceite_imagem")} />Aceite de uso de imagem</label><div className="xl:col-span-12"><Label>Documento de identificação</Label><Textarea {...register("documento_identificacao")} rows={2} /></div><div className="xl:col-span-12"><Label>Comprovante de endereço</Label><Textarea {...register("comprovante_endereco")} rows={2} /></div><div className="xl:col-span-12"><Label>Assinatura digital</Label><Input {...register("assinatura_digital")} /></div></section>}
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {mensagem && <div className="fixed inset-0 z-[58] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => setMensagem(null)}><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="border-b border-slate-100 px-5 py-4"><h3 className={`text-base font-semibold ${mensagem.tipo === "sucesso" ? "text-emerald-800" : "text-red-700"}`}>{mensagem.tipo === "sucesso" ? "Confirmação" : "Atenção"}</h3></div><div className="px-5 py-4"><p className="text-sm text-slate-700">{mensagem.texto}</p></div><div className="flex justify-end border-t border-slate-100 px-5 py-3"><Button type="button" onClick={() => setMensagem(null)}>OK</Button></div></div></div>}
      {popupSalvarAberto && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => setPopupSalvarAberto(false)}><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Confirmação</h3></div><div className="px-5 py-4"><p className="text-sm text-slate-700">Salvo com sucesso</p></div><div className="flex justify-end border-t border-slate-100 px-5 py-3"><Button type="button" onClick={() => setPopupSalvarAberto(false)}>OK</Button></div></div></div>}
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
                Buscar beneficiário para transformar em voluntário
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
                <Button type="button" variant="outline" onClick={buscarBeneficiariosParaVoluntariado}>
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
                                onClick={() => selecionarBeneficiarioParaVoluntariado(beneficiario)}
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




