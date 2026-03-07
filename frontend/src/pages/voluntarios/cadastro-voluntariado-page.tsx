import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
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
import { useProfissionais } from "@/features/profissionais/use-profissionais";
import type { Voluntario, VoluntarioFiltro } from "@/types/voluntario";
import type { ProfissionalFiltro } from "@/types/profissional";
import { buscarEnderecoPorCep } from "@/services/cep.service";
import { reportsService } from "@/services/reports.service";
import { somenteDigitos } from "@/lib/validators";
import { formatarTextoPorCampo, normalizarObjetoTexto } from "@/lib/text-formatter";
import { mapaCamposTextoVoluntarioForm } from "@/lib/text-format-config";
import { abrirRelatorioPdf } from "@/lib/report-utils";
import { useAuth } from "@/hooks/use-auth";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario,
  ordemAcoesCrudPadrao
} from "@/lib/tela-padrao-beneficiario";

const abas = [
  { id: "listagem", label: "Listagem de voluntÃ¡rios", icon: ListFilter },
  { id: "dados", label: "Dados pessoais", icon: UserRound },
  { id: "contato", label: "Contato e competÃªncias", icon: HandHeart },
  { id: "endereco", label: "EndereÃ§o", icon: MapPinned },
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

const diasOptions = ["Segunda-feira", "TerÃ§a-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "SÃ¡bado"];
const periodosOptions = ["ManhÃ£", "Tarde", "Noite"];

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
  const [carregandoCep, setCarregandoCep] = useState(false);
  const [imprimindoRelatorio, setImprimindoRelatorio] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);
  const ultimoCepConsultadoRef = useRef("");

  const filtroProfissionais = useMemo<ProfissionalFiltro>(() => ({ nome: "", status: "" }), []);
  const { data: profissionaisData } = useProfissionais(filtroProfissionais);
  const { data: listaData, isLoading: carregandoLista } = useVoluntarios(filtros);
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

  const voluntarios = listaData?.voluntarios ?? [];
  const profissionais = profissionaisData?.profissionais ?? [];
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

  async function onSelecionarFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    const reader = new FileReader();
    reader.onload = () => setValue("foto_3x4", String(reader.result ?? ""), { shouldDirty: true, shouldValidate: true });
    reader.readAsDataURL(arquivo);
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
          texto: error?.response?.data?.message ?? "NÃ£o foi possÃ­vel salvar o voluntÃ¡rio."
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
    reset(voluntarioDefaultValues);
    setAbaAtiva("dados");
  }

  function acaoCancelar() {
    if (!snapshot) return acaoNovo();
    reset(snapshot);
  }

  function acaoExcluir() {
    if (!idSelecionado) return setMensagem({ tipo: "erro", texto: "Selecione um voluntÃ¡rio para excluir." });
    setPopupExcluirAberto(true);
  }

  async function confirmarExclusao() {
    if (!idSelecionado) return;
    try {
      await removerMutation.mutateAsync(idSelecionado);
      setPopupExcluirAberto(false);
      acaoNovo();
      setMensagem({ tipo: "sucesso", texto: "VoluntÃ¡rio excluÃ­do com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "NÃ£o foi possÃ­vel excluir o voluntÃ¡rio."
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
                  <div className="xl:col-span-3"><Label>CPF</Label><Input value={filtroDraft.cpf ?? ""} onChange={(e) => setFiltroDraft((s) => ({ ...s, cpf: e.target.value }))} /></div>
                  <div className="xl:col-span-3"><Label>E-mail</Label><Input value={filtroDraft.email ?? ""} onChange={(e) => setFiltroDraft((s) => ({ ...s, email: e.target.value }))} /></div>
                  <div className="xl:col-span-2"><Label>Status</Label><Select value={filtroDraft.status ?? ""} onChange={(e) => setFiltroDraft((s) => ({ ...s, status: e.target.value }))}><option value="">Todos</option>{voluntarioStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></div>
                  <div className="sm:col-span-2 xl:col-span-12 flex justify-end"><Button type="button" variant="outline" className="bg-[var(--g3-primary-soft)]" onClick={() => setFiltroDraft({ nome: "", cpf: "", status: "", email: "" })}>Limpar filtros</Button></div>
                </div>
                {carregandoLista ? <p className="text-sm text-slate-500">Carregando voluntÃ¡rios...</p> : (
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
                {abaAtiva === "dados" && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12"><div className="sm:col-span-2 xl:col-span-3 space-y-2"><Label>Foto 3x4</Label><div className="aspect-[3/4] overflow-hidden rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)]">{watch("foto_3x4") ? <img src={watch("foto_3x4")} alt="Foto do voluntÃ¡rio" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-xs text-[var(--g3-muted)]">Sem foto</div>}</div><input ref={inputFotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onSelecionarFoto(e)} /><Button type="button" variant="outline" size="sm" onClick={() => inputFotoRef.current?.click()}><Upload className="mr-1.5 h-3.5 w-3.5" />Enviar foto</Button></div><div className="sm:col-span-2 xl:col-span-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-12"><div className="sm:col-span-2 xl:col-span-6"><Label>Nome completo*</Label><Input {...register("nome_completo")} onBlurCapture={() => aplicarFormatacaoCampo("nome_completo")} />{errors.nome_completo && <p className="mt-1 text-xs text-red-600">{errors.nome_completo.message}</p>}</div><div className="xl:col-span-3"><Label>CPF*</Label><Input {...register("cpf")} />{errors.cpf && <p className="mt-1 text-xs text-red-600">{errors.cpf.message}</p>}</div><div className="xl:col-span-3"><Label>RG</Label><Input {...register("rg")} /></div><div className="xl:col-span-4"><Label>Data de nascimento</Label><Input type="date" {...register("data_nascimento")} /></div><div className="xl:col-span-4"><Label>GÃªnero</Label><Input {...register("genero")} onBlurCapture={() => aplicarFormatacaoCampo("genero")} /></div><div className="xl:col-span-4"><Label>ProfissÃ£o</Label><Input {...register("profissao")} onBlurCapture={() => aplicarFormatacaoCampo("profissao")} /></div><div className="xl:col-span-6"><Label>Profissional vinculado</Label><Select {...register("profissional_id")}><option value="">NÃ£o vincular</option>{profissionais.map((profissional) => <option key={profissional.id_profissional} value={profissional.id_profissional}>{profissional.nome_completo}</option>)}</Select></div><div className="xl:col-span-6"><Label>MotivaÃ§Ã£o</Label><Textarea {...register("motivacao")} rows={2} onBlurCapture={() => aplicarFormatacaoCampo("motivacao")} /></div></div></section>}
                {abaAtiva === "contato" && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12"><div className="xl:col-span-4"><Label>E-mail*</Label><Input type="email" {...register("email")} />{errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}</div><div className="xl:col-span-3"><Label>Telefone</Label><Input {...register("telefone")} /></div><div className="xl:col-span-3"><Label>Cidade</Label><Input {...register("cidade")} onBlurCapture={() => aplicarFormatacaoCampo("cidade")} /></div><div className="xl:col-span-2"><Label>Estado (UF)</Label><Input maxLength={2} {...register("estado")} /></div><div className="xl:col-span-6"><Label>Ãrea de interesse</Label><Input {...register("area_interesse")} onBlurCapture={() => aplicarFormatacaoCampo("area_interesse")} /></div><div className="xl:col-span-6"><Label>Idiomas</Label><Input {...register("idiomas")} onBlurCapture={() => aplicarFormatacaoCampo("idiomas")} /></div><div className="xl:col-span-6"><Label>Habilidades</Label><Textarea {...register("habilidades")} rows={2} onBlurCapture={() => aplicarFormatacaoCampo("habilidades")} /></div><div className="xl:col-span-6"><Label>LinkedIn</Label><Input {...register("linkedin")} /></div></section>}
                {abaAtiva === "endereco" && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12"><div className="xl:col-span-3"><Label>CEP</Label><Input {...register("cep")} />{carregandoCep && <p className="mt-1 text-xs text-slate-500">Consultando CEP...</p>}</div><div className="xl:col-span-6"><Label>EndereÃ§o</Label><Input {...register("logradouro")} onBlurCapture={() => aplicarFormatacaoCampo("logradouro")} /></div><div className="xl:col-span-3"><Label>NÃºmero</Label><Input {...register("numero")} /></div><div className="xl:col-span-4"><Label>Complemento</Label><Input {...register("complemento")} onBlurCapture={() => aplicarFormatacaoCampo("complemento")} /></div><div className="xl:col-span-4"><Label>Bairro</Label><Input {...register("bairro")} onBlurCapture={() => aplicarFormatacaoCampo("bairro")} /></div><div className="xl:col-span-4"><Label>Ponto de referÃªncia</Label><Input {...register("ponto_referencia")} onBlurCapture={() => aplicarFormatacaoCampo("ponto_referencia")} /></div><div className="xl:col-span-4"><Label>MunicÃ­pio</Label><Input {...register("municipio")} onBlurCapture={() => aplicarFormatacaoCampo("municipio")} /></div><div className="xl:col-span-2"><Label>UF</Label><Input maxLength={2} {...register("uf")} /></div><div className="xl:col-span-3"><Label>Zona</Label><Input {...register("zona")} /></div><div className="xl:col-span-3"><Label>Subzona</Label><Input {...register("subzona")} /></div><div className="sm:col-span-2 xl:col-span-12"><Button type="button" variant="outline" onClick={abrirMapa} disabled={!possuiEnderecoParaMapa}>Ver no Google Maps</Button></div></section>}
                {abaAtiva === "disponibilidade" && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12"><div className="xl:col-span-3"><Label>Status</Label><Select {...register("status")}>{voluntarioStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</Select></div><div className="xl:col-span-3"><Label>Carga horÃ¡ria semanal</Label><Input {...register("carga_horaria_semanal")} onBlurCapture={() => aplicarFormatacaoCampo("carga_horaria_semanal")} /></div><div className="xl:col-span-3"><Label>InÃ­cio previsto</Label><Input type="date" {...register("inicio_previsto")} /></div><label className="xl:col-span-2 flex items-center gap-2 text-sm"><Checkbox {...register("presencial")} checked={!!watch("presencial")} />Presencial</label><label className="xl:col-span-2 flex items-center gap-2 text-sm"><Checkbox {...register("remoto")} checked={!!watch("remoto")} />Remoto</label><div className="sm:col-span-2 xl:col-span-6"><Label>Dias disponÃ­veis</Label><div className="mt-2 flex flex-wrap gap-3">{diasOptions.map((item) => <label key={item} className="inline-flex items-center gap-2 text-sm"><Checkbox checked={watch("disponibilidade_dias")?.includes(item)} onChange={() => alternarLista("disponibilidade_dias", item)} />{item}</label>)}</div></div><div className="sm:col-span-2 xl:col-span-6"><Label>PerÃ­odos</Label><div className="mt-2 flex flex-wrap gap-3">{periodosOptions.map((item) => <label key={item} className="inline-flex items-center gap-2 text-sm"><Checkbox checked={watch("disponibilidade_periodos")?.includes(item)} onChange={() => alternarLista("disponibilidade_periodos", item)} />{item}</label>)}</div></div><div className="xl:col-span-12"><Label>ObservaÃ§Ãµes</Label><Textarea {...register("observacoes")} rows={2} onBlurCapture={() => aplicarFormatacaoCampo("observacoes")} /></div></section>}
                {abaAtiva === "termos" && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12"><label className="xl:col-span-4 flex items-center gap-2 text-sm"><Checkbox {...register("aceite_voluntariado")} checked={!!watch("aceite_voluntariado")} />Aceite de voluntariado</label><label className="xl:col-span-4 flex items-center gap-2 text-sm"><Checkbox {...register("aceite_imagem")} checked={!!watch("aceite_imagem")} />Aceite de uso de imagem</label><div className="xl:col-span-12"><Label>Documento de identificaÃ§Ã£o</Label><Textarea {...register("documento_identificacao")} rows={2} /></div><div className="xl:col-span-12"><Label>Comprovante de endereÃ§o</Label><Textarea {...register("comprovante_endereco")} rows={2} /></div><div className="xl:col-span-12"><Label>Assinatura digital</Label><Input {...register("assinatura_digital")} /></div></section>}
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {mensagem && <div className="fixed inset-0 z-[58] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => setMensagem(null)}><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="border-b border-slate-100 px-5 py-4"><h3 className={`text-base font-semibold ${mensagem.tipo === "sucesso" ? "text-emerald-800" : "text-red-700"}`}>{mensagem.tipo === "sucesso" ? "ConfirmaÃ§Ã£o" : "AtenÃ§Ã£o"}</h3></div><div className="px-5 py-4"><p className="text-sm text-slate-700">{mensagem.texto}</p></div><div className="flex justify-end border-t border-slate-100 px-5 py-3"><Button type="button" onClick={() => setMensagem(null)}>OK</Button></div></div></div>}
      {popupSalvarAberto && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => setPopupSalvarAberto(false)}><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">ConfirmaÃ§Ã£o</h3></div><div className="px-5 py-4"><p className="text-sm text-slate-700">Salvo com sucesso</p></div><div className="flex justify-end border-t border-slate-100 px-5 py-3"><Button type="button" onClick={() => setPopupSalvarAberto(false)}>OK</Button></div></div></div>}
      {popupExcluirAberto && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={() => !removerMutation.isPending && setPopupExcluirAberto(false)}><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-semibold text-slate-900">Confirmar exclusÃ£o</h3></div><div className="px-5 py-4"><p className="text-sm text-slate-700">Esta aÃ§Ã£o Ã© irreversÃ­vel. Deseja continuar?</p></div><div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3"><Button type="button" variant="outline" onClick={() => setPopupExcluirAberto(false)} disabled={removerMutation.isPending}>Cancelar</Button><Button type="button" variant="danger" onClick={() => void confirmarExclusao()} disabled={removerMutation.isPending}>{removerMutation.isPending ? "Excluindo..." : "Excluir"}</Button></div></div></div>}
    </main>
  );
}

