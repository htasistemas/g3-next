import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { buscarEnderecoPorCep } from "@/services/cep.service";
import { reportsService } from "@/services/reports.service";
import { somenteDigitos } from "@/lib/validators";
import { formatarTextoPorCampo, normalizarObjetoTexto } from "@/lib/text-formatter";
import { mapaCamposTextoProfissionalForm } from "@/lib/text-format-config";
import { abrirRelatorioPdf } from "@/lib/report-utils";
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
  { id: "endereco", label: "EndereÃ§o", icon: MapPinned },
  { id: "perfil", label: "Perfil profissional", icon: Stethoscope },
  { id: "agenda", label: "Agenda e canais", icon: UsersRound },
  { id: "resumo", label: "Resumo e observaÃ§Ãµes", icon: FileText }
] as const;

type AbaId = (typeof abas)[number]["id"];

type AcaoCrud = {
  label: string;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  icon: LucideIcon;
};

const disponibilidadesOptions = ["ManhÃ£", "Tarde", "Noite"];
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

function formatarCpf(valor?: string) {
  if (!valor) return "---";
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length !== 11) return valor;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function formatarStatus(status?: string) {
  if (!status) return "Em anÃ¡lise";
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
  const inputFotoRef = useRef<HTMLInputElement | null>(null);
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
  const logradouroAtual = watch("logradouro") || "";
  const numeroAtual = watch("numero") || "";
  const bairroAtual = watch("bairro") || "";
  const municipioAtual = watch("municipio") || "";
  const ufAtual = watch("uf") || "";
  const subzonaAtual = watch("subzona") || "";

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
          setMensagem({ tipo: "erro", texto: "CEP nÃ£o encontrado." });
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
          texto: error?.message ?? "NÃ£o foi possÃ­vel consultar o CEP informado."
        });
      } finally {
        if (ativo) setCarregandoCep(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [cepAtual, getValues, setValue]);

  const profissionais = listaData?.profissionais ?? [];
  const beneficiariosBusca = beneficiariosBuscaData?.beneficiarios ?? [];
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
        texto: "Informe pelo menos nome (2 letras), CPF completo ou cÃ³digo para buscar beneficiÃ¡rios."
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
      texto: "Dados do beneficiÃ¡rio carregados no cadastro do profissional."
    });
  }

  async function onSelecionarFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    const reader = new FileReader();
    reader.onload = () => {
      setValue("foto_3x4", String(reader.result ?? ""), { shouldDirty: true, shouldValidate: true });
    };
    reader.readAsDataURL(arquivo);
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
        setPopupSalvarAberto(true);
        setFiltros((prev) => ({ ...prev }));
      } catch (error: any) {
        setMensagem({
          tipo: "erro",
          texto: error?.response?.data?.message ?? "NÃ£o foi possÃ­vel salvar o profissional."
        });
      }
    },
    () => {
      setAbaAtiva("dados");
      setMensagem({ tipo: "erro", texto: "Preencha os campos obrigatÃ³rios antes de salvar." });
    }
  );

  function acaoBuscar() {
    setFiltros({ ...filtroDraft });
    setAbaAtiva("listagem");
  }

  function acaoNovo() {
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
      setMensagem({ tipo: "sucesso", texto: "Profissional excluÃ­do com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "NÃ£o foi possÃ­vel excluir o profissional."
      });
    }
  }

  async function acaoImprimir() {
    try {
      setImprimindoRelatorio(true);
      setMensagem(null);
      const usuarioEmissor = usuario?.nome || usuario?.nomeUsuario || "Sistema G3-Next";

      if (idSelecionado) {
        const blob = await reportsService.gerarFichaProfissional({
          profissionalId: idSelecionado,
          usuarioEmissor
        });
        abrirRelatorioPdf(blob);
        return;
      }

      const blob = await reportsService.gerarRelacaoProfissionais({
        ...filtros,
        usuarioEmissor
      });
      abrirRelatorioPdf(blob);
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "NÃ£o foi possÃ­vel gerar o relatÃ³rio."
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
        texto: "Preencha o endereÃ§o antes de abrir no Google Maps."
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

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <section className={classesTelaPadraoBeneficiario.barraAcoes}>
        <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
          {acoesNaOrdemPadrao.map((acao) => (
            <Button key={acao.label} type="button" variant={acao.variant} size="sm" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={acao.onClick} disabled={bloqueadoAcao || (acao.label === "Excluir" && !idSelecionado)}>
              <acao.icon className="mr-1.5 h-3.5 w-3.5" />
              {acao.label}
            </Button>
          ))}
        </div>
      </section>

      <div className={classesTelaPadraoBeneficiario.gradePrincipal}>
        <Card className={classesTelaPadraoBeneficiario.cardAbas}>
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
              <CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>{abaAtual?.label}</CardTitle>
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
                      <button key={item.id_profissional} type="button" onClick={() => { if (item.id_profissional) { setIdSelecionado(item.id_profissional); setAbaAtiva("dados"); } }} className={`grid w-full gap-2 border-b border-[var(--g3-border)] px-3 py-2 text-left xl:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] ${indice % 2 === 0 ? "bg-white" : "bg-[var(--g3-primary-soft)]/30"}`}>
                        <span className="text-sm font-semibold">{item.nome_completo}</span>
                        <span className="text-xs text-[var(--g3-muted)]">{item.categoria}</span>
                        <span className="text-xs text-[var(--g3-muted)]">{formatarStatus(item.status)}</span>
                        <span className="text-xs text-[var(--g3-muted)]">{formatarCpf(item.cpf)}</span>
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
                    <div className="sm:col-span-2 xl:col-span-3 space-y-2">
                      <Label>Foto 3x4</Label>
                      <div className="aspect-[3/4] overflow-hidden rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)]">
                        {watch("foto_3x4") ? (
                          <img
                            src={watch("foto_3x4")}
                            alt="Foto do profissional"
                            className="h-full w-full object-contain"
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => inputFotoRef.current?.click()}
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        Enviar foto
                      </Button>
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
                        <Label>Categoria*</Label>
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
                {abaAtiva === "perfil" && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12"><div className="xl:col-span-3"><Label>VÃ­nculo</Label><Select {...register("vinculo")}><option value="">Selecione</option>{vinculosOptions.map((item) => <option key={item} value={item}>{item}</option>)}</Select></div><div className="xl:col-span-4"><Label>Registro em conselho</Label><Input {...register("registro_conselho")} onBlurCapture={() => aplicarFormatacaoCampo("registro_conselho")} /></div><div className="xl:col-span-5"><Label>Especialidade</Label><Input {...register("especialidade")} onBlurCapture={() => aplicarFormatacaoCampo("especialidade")} /></div><div className="xl:col-span-4"><Label>E-mail</Label><Input type="email" {...register("email")} /></div><div className="xl:col-span-3"><Label>Telefone</Label><Input {...register("telefone")} /></div></section>}
                {abaAtiva === "agenda" && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12"><div className="xl:col-span-5"><Label>Unidade</Label><Input {...register("unidade")} onBlurCapture={() => aplicarFormatacaoCampo("unidade")} /></div><div className="xl:col-span-4"><Label>Sala</Label><Input {...register("sala_atendimento")} onBlurCapture={() => aplicarFormatacaoCampo("sala_atendimento")} /></div><div className="xl:col-span-3"><Label>Carga horÃ¡ria</Label><Input type="number" min={1} {...register("carga_horaria", { setValueAs: (value) => (value === "" ? undefined : Number(value)) })} /></div><div className="xl:col-span-3"><Label>Status</Label><Select {...register("status")}>{profissionalStatusOptions.map((status) => <option key={status} value={status}>{formatarStatus(status)}</option>)}</Select></div><div className="sm:col-span-2 xl:col-span-5"><Label>Disponibilidade</Label><div className="mt-2 flex flex-wrap gap-3">{disponibilidadesOptions.map((item) => <label key={item} className="inline-flex items-center gap-2 text-sm"><Checkbox checked={watch("disponibilidade")?.includes(item)} onChange={() => alternarLista("disponibilidade", item)} />{item}</label>)}</div></div><div className="sm:col-span-2 xl:col-span-4"><Label>Canais</Label><div className="mt-2 flex flex-wrap gap-3">{canaisAtendimentoOptions.map((item) => <label key={item} className="inline-flex items-center gap-2 text-sm"><Checkbox checked={watch("canais_atendimento")?.includes(item)} onChange={() => alternarLista("canais_atendimento", item)} />{item}</label>)}</div></div></section>}
                {abaAtiva === "resumo" && <section className="grid gap-3 xl:grid-cols-12"><div className="xl:col-span-12"><Label>Tags (separadas por vÃ­rgula)</Label><Input value={(watch("tags") ?? []).join(", ")} onChange={(e) => setValue("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean), { shouldDirty: true, shouldValidate: true })} /></div><div className="xl:col-span-12"><Label>Resumo</Label><Textarea {...register("resumo")} rows={3} onBlurCapture={() => aplicarFormatacaoCampo("resumo")} /></div><div className="xl:col-span-12"><Label>ObservaÃ§Ãµes</Label><Textarea {...register("observacoes")} rows={3} onBlurCapture={() => aplicarFormatacaoCampo("observacoes")} /></div></section>}
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {mensagem && <div className="fixed inset-0 z-[58] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => setMensagem(null)}><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="border-b border-slate-100 px-5 py-4"><h3 className={`text-base font-semibold ${mensagem.tipo === "sucesso" ? "text-emerald-800" : "text-red-700"}`}>{mensagem.tipo === "sucesso" ? "ConfirmaÃ§Ã£o" : "AtenÃ§Ã£o"}</h3></div><div className="px-5 py-4"><p className="text-sm text-slate-700">{mensagem.texto}</p></div><div className="flex justify-end border-t border-slate-100 px-5 py-3"><Button type="button" onClick={() => setMensagem(null)}>OK</Button></div></div></div>}
      {popupSalvarAberto && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => setPopupSalvarAberto(false)}><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">ConfirmaÃ§Ã£o</h3></div><div className="px-5 py-4"><p className="text-sm text-slate-700">Salvo com sucesso</p></div><div className="flex justify-end border-t border-slate-100 px-5 py-3"><Button type="button" onClick={() => setPopupSalvarAberto(false)}>OK</Button></div></div></div>}
      {popupExcluirAberto && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => !removerMutation.isPending && setPopupExcluirAberto(false)}><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Confirmar exclusÃ£o</h3></div><div className="px-5 py-4"><p className="text-sm text-slate-700">Esta aÃ§Ã£o Ã© irreversÃ­vel. Deseja continuar?</p></div><div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3"><Button type="button" variant="outline" onClick={() => setPopupExcluirAberto(false)} disabled={removerMutation.isPending}>Cancelar</Button><Button type="button" variant="danger" onClick={() => void confirmarExclusao()} disabled={removerMutation.isPending}>{removerMutation.isPending ? "Excluindo..." : "Excluir"}</Button></div></div></div>}
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

