import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  Plus,
  Save,
  Undo2,
  Trash2,
  Printer,
  X,
  ListFilter,
  IdCard,
  MapPinned,
  UsersRound,
  HandCoins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  familiaDefaultValues,
  familiaFormSchema,
  familiaStatusOptions,
  parentescoOptions,
  type FamiliaFormValues
} from "@/features/familias/familia.schema";
import {
  useFamilia,
  useFamilias,
  useRemoverMembroFamilia,
  useSalvarFamilia
} from "@/features/familias/use-familias";
import { beneficiariosService } from "@/services/beneficiarios.service";
import type { Beneficiario, BeneficiarioFiltro } from "@/types/beneficiario";
import type { BeneficiarioResumo, Familia, FamiliaFiltro, FamiliaMembro } from "@/types/familia";
import {
  mapaCamposTextoFamiliaForm,
  mapaMembroFamiliaForm
} from "@/lib/text-format-config";
import { formatarTextoPorCampo, normalizarObjetoTexto } from "@/lib/text-formatter";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario,
  ordemAcoesCrudPadrao
} from "@/lib/tela-padrao-beneficiario";

const tituloTela = "Cadastro de vínculo familiar";

const abas = [
  { id: "listagem", label: "Listagem de famílias", icon: ListFilter },
  { id: "dados", label: "Dados da família", icon: IdCard },
  { id: "endereco", label: "Endereço", icon: MapPinned },
  { id: "membros", label: "Membros vinculados", icon: UsersRound },
  { id: "indicadores", label: "Indicadores sociais", icon: HandCoins }
] as const;

const opcoesSituacaoImovel = ["Próprio", "Alugado", "Cedido", "Financiado", "Ocupação", "Outro"];
const opcoesTipoMoradia = [
  "Casa",
  "Apartamento",
  "Cômodo",
  "Barraco",
  "Casa de madeira",
  "Sítio/Chácara",
  "Outro"
];

const mensagemImpressaoNaoMigrada = "A impressão de vínculo familiar ainda não foi migrada.";
const mensagemExclusaoNaoMigrada =
  "A exclusão de família será disponibilizada na próxima etapa da migração.";

type AbaId = (typeof abas)[number]["id"];

type AcaoCrud = {
  label: string;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  icon: LucideIcon;
};

type Mensagem = {
  tipo: "sucesso" | "erro";
  texto: string;
};

function normalizarStatus(status?: string) {
  if (!status) return "ATIVO";
  return status.replaceAll("_", " ");
}

function labelStatus(status?: string) {
  const texto = normalizarStatus(status).toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function variantStatus(status?: string) {
  if (status === "ATIVO") return "success" as const;
  if (status === "BLOQUEADO") return "danger" as const;
  return "warning" as const;
}

function nomeBeneficiario(beneficiario?: BeneficiarioResumo | null) {
  if (!beneficiario) return "Beneficiário";
  return beneficiario.nome_completo || beneficiario.nome_social || "Beneficiário";
}

function documentoBeneficiario(beneficiario?: BeneficiarioResumo | null) {
  if (!beneficiario) return "";
  return beneficiario.cpf || beneficiario.codigo || "";
}

function montarFiltroBuscaBeneficiario(termoBruto: string): BeneficiarioFiltro {
  const termo = termoBruto.trim();
  const digitos = termo.replace(/\D/g, "");

  if (digitos.length === 11) {
    return { cpf: digitos };
  }

  if (digitos.length >= 4 && /^\d+$/.test(digitos)) {
    return { codigo: digitos };
  }

  return { nome: termo };
}

function mapFamiliaParaFormulario(familia: Familia): FamiliaFormValues {
  return {
    ...familiaDefaultValues,
    ...familia,
    id_referencia_familiar: familia.id_referencia_familiar ?? "",
    status: (familia.status as FamiliaFormValues["status"]) ?? "ATIVO",
    membros: (familia.membros ?? []).map((membro) => ({
      id_familia_membro: membro.id_familia_membro,
      id_beneficiario: membro.id_beneficiario,
      parentesco: membro.parentesco || "",
      responsavel_familiar: membro.responsavel_familiar ?? false,
      contribui_renda: membro.contribui_renda ?? false,
      renda_individual: membro.renda_individual ?? "",
      participa_servicos: membro.participa_servicos ?? false,
      observacoes: membro.observacoes ?? "",
      usa_endereco_familia: membro.usa_endereco_familia ?? true,
      beneficiario_nome: nomeBeneficiario(membro.beneficiario),
      beneficiario_documento: documentoBeneficiario(membro.beneficiario)
    })),
    qtd_membros: familia.qtd_membros ?? familia.membros?.length ?? 0
  };
}

function mapFormularioParaPayload(values: FamiliaFormValues, familiaId?: string): Familia {
  const membros: FamiliaMembro[] = values.membros.map((membro) => {
    const membroNormalizado = normalizarObjetoTexto(membro, mapaMembroFamiliaForm);
    return {
      id_familia_membro: membro.id_familia_membro,
      id_beneficiario: membro.id_beneficiario,
      parentesco: membroNormalizado.parentesco,
      responsavel_familiar: membro.responsavel_familiar,
      contribui_renda: membro.contribui_renda,
      renda_individual: membro.renda_individual || undefined,
      participa_servicos: membro.participa_servicos,
      observacoes: membroNormalizado.observacoes || undefined,
      usa_endereco_familia: membro.usa_endereco_familia
    };
  });

  const payload: Familia = {
    id_familia: familiaId,
    nome_familia: values.nome_familia,
    id_referencia_familiar: values.id_referencia_familiar,
    status: values.status,
    cep: values.cep || undefined,
    logradouro: values.logradouro || undefined,
    numero: values.numero || undefined,
    complemento: values.complemento || undefined,
    bairro: values.bairro || undefined,
    ponto_referencia: values.ponto_referencia || undefined,
    municipio: values.municipio || undefined,
    uf: values.uf?.toUpperCase() || undefined,
    zona: values.zona || undefined,
    situacao_imovel: values.situacao_imovel || undefined,
    tipo_moradia: values.tipo_moradia || undefined,
    agua_encanada: values.agua_encanada,
    esgoto_tipo: values.esgoto_tipo || undefined,
    coleta_lixo: values.coleta_lixo || undefined,
    energia_eletrica: values.energia_eletrica,
    internet: values.internet,
    arranjo_familiar: values.arranjo_familiar || undefined,
    qtd_membros: values.qtd_membros ?? membros.length,
    qtd_criancas: values.qtd_criancas,
    qtd_adolescentes: values.qtd_adolescentes,
    qtd_idosos: values.qtd_idosos,
    qtd_pessoas_deficiencia: values.qtd_pessoas_deficiencia,
    renda_familiar_total: values.renda_familiar_total || undefined,
    renda_per_capita: values.renda_per_capita || undefined,
    faixa_renda_per_capita: values.faixa_renda_per_capita || undefined,
    principais_fontes_renda: values.principais_fontes_renda || undefined,
    situacao_inseguranca_alimentar: values.situacao_inseguranca_alimentar || undefined,
    possui_dividas_relevantes: values.possui_dividas_relevantes,
    descricao_dividas: values.descricao_dividas || undefined,
    vulnerabilidades_familia: values.vulnerabilidades_familia || undefined,
    servicos_acompanhamento: values.servicos_acompanhamento || undefined,
    tecnico_responsavel: values.tecnico_responsavel || undefined,
    periodicidade_atendimento: values.periodicidade_atendimento || undefined,
    proxima_visita_prevista: values.proxima_visita_prevista || undefined,
    observacoes: values.observacoes || undefined,
    membros
  };

  return normalizarObjetoTexto(payload, mapaCamposTextoFamiliaForm);
}

export function CadastroVinculoFamiliarPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [filtroDraft, setFiltroDraft] = useState<FamiliaFiltro>({
    nome_familia: "",
    municipio: "",
    status: ""
  });
  const [filtros, setFiltros] = useState<FamiliaFiltro>(filtroDraft);
  const [familiaSelecionadaId, setFamiliaSelecionadaId] = useState<string | undefined>();
  const [snapshot, setSnapshot] = useState<FamiliaFormValues | null>(null);
  const [principalBusca, setPrincipalBusca] = useState("");
  const [membroBusca, setMembroBusca] = useState("");
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [popupSalvarAberto, setPopupSalvarAberto] = useState(false);
  const [popupExcluirAberto, setPopupExcluirAberto] = useState(false);
  const [popupImprimirAberto, setPopupImprimirAberto] = useState(false);

  const { data: listaData, isLoading: carregandoLista } = useFamilias(filtros);
  const { data: familiaData, isLoading: carregandoFamilia } = useFamilia(familiaSelecionadaId);
  const salvarMutation = useSalvarFamilia();
  const removerMembroMutation = useRemoverMembroFamilia();

  const {
    register,
    control,
    watch,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors }
  } = useForm<FamiliaFormValues>({
    resolver: zodResolver(familiaFormSchema),
    defaultValues: familiaDefaultValues
  });

  const { fields: membrosFields, append, remove, replace } = useFieldArray({
    name: "membros",
    control
  });

  const membrosWatch = watch("membros");

  useEffect(() => {
    if (!familiaData?.familia) return;
    const values = mapFamiliaParaFormulario(familiaData.familia);
    reset(values);
    replace(values.membros);
    setSnapshot(values);
    setMensagem(null);
    setAbaAtiva("dados");
    setPrincipalBusca(nomeBeneficiario(familiaData.familia.referencia_familiar));
  }, [familiaData, replace, reset]);

  useEffect(() => {
    setValue("qtd_membros", membrosFields.length);
  }, [membrosFields.length, setValue]);

  const principalQuery = useQuery({
    queryKey: ["familias", "busca-principal", principalBusca],
    queryFn: () => beneficiariosService.listar(montarFiltroBuscaBeneficiario(principalBusca)),
    enabled: principalBusca.trim().length >= 2
  });

  const membroQuery = useQuery({
    queryKey: ["familias", "busca-membro", membroBusca],
    queryFn: () => beneficiariosService.listar(montarFiltroBuscaBeneficiario(membroBusca)),
    enabled: membroBusca.trim().length >= 2
  });

  const familias = listaData?.familias ?? [];
  const familiaAtual = familiaData?.familia;
  const principalResultados = principalQuery.data?.beneficiarios ?? [];
  const membroResultados = membroQuery.data?.beneficiarios ?? [];
  const bloqueadoAcao = salvarMutation.isPending || removerMembroMutation.isPending || carregandoFamilia;

  const abaAtual = abas.find((aba) => aba.id === abaAtiva);
  const tituloAbaAtiva = abaAtual?.label ?? tituloTela;
  const IconeAbaAtiva = abaAtual?.icon ?? IdCard;

  const onSalvar = handleSubmit(
    async (values) => {
      setMensagem(null);
      try {
        const payload = mapFormularioParaPayload(values, familiaSelecionadaId);
        const response = await salvarMutation.mutateAsync(payload);
        const familia = response.familia;
        const valuesAtualizados = mapFamiliaParaFormulario(familia);

        setFamiliaSelecionadaId(familia.id_familia);
        reset(valuesAtualizados);
        replace(valuesAtualizados.membros);
        setSnapshot(valuesAtualizados);
        setFiltros((prev) => ({ ...prev }));
        setAbaAtiva("dados");
        setPopupSalvarAberto(true);
      } catch (error: any) {
        setMensagem({
          tipo: "erro",
          texto: error?.response?.data?.message ?? "Não foi possível salvar a família."
        });
      }
    },
    () => {
      setAbaAtiva("dados");
      setMensagem({
        tipo: "erro",
        texto: "Preencha os campos obrigatórios antes de salvar."
      });
    }
  );

  function acaoSalvar() {
    void onSalvar();
  }

  function acaoBuscar() {
    setMensagem(null);
    setFiltros({ ...filtroDraft });
    setAbaAtiva("listagem");
  }

  function acaoNovo() {
    setFamiliaSelecionadaId(undefined);
    setSnapshot(null);
    reset(familiaDefaultValues);
    replace([]);
    setPrincipalBusca("");
    setMembroBusca("");
    setMensagem(null);
    setAbaAtiva("dados");
  }

  function acaoCancelar() {
    if (!snapshot) {
      acaoNovo();
      return;
    }

    reset(snapshot);
    replace(snapshot.membros);
    setMensagem(null);
  }

  function acaoExcluir() {
    if (!familiaSelecionadaId) {
      setMensagem({ tipo: "erro", texto: "Selecione uma família para excluir." });
      return;
    }
    setPopupExcluirAberto(true);
  }

  function confirmarExclusaoFamilia() {
    setPopupExcluirAberto(false);
    setMensagem({ tipo: "erro", texto: mensagemExclusaoNaoMigrada });
  }

  function acaoImprimir() {
    if (!familiaSelecionadaId) {
      setMensagem({ tipo: "erro", texto: "Selecione uma família para imprimir." });
      return;
    }
    setPopupImprimirAberto(true);
  }

  function confirmarImpressao() {
    setPopupImprimirAberto(false);
    setMensagem({ tipo: "erro", texto: mensagemImpressaoNaoMigrada });
  }

  function acaoFechar() {
    navigate("/");
  }

  function aplicarFormatacaoCampo(campo: keyof FamiliaFormValues) {
    const valorAtual = getValues(campo);
    const valorFormatado = formatarTextoPorCampo(String(campo), valorAtual, mapaCamposTextoFamiliaForm);

    if (typeof valorAtual === "string" && typeof valorFormatado === "string" && valorAtual !== valorFormatado) {
      setValue(campo, valorFormatado as FamiliaFormValues[keyof FamiliaFormValues], {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }

  function aplicarFormatacaoMembro(index: number, campo: "observacoes") {
    const chave = `membros.${index}.${campo}` as const;
    const valorAtual = getValues(chave);
    const valorFormatado = formatarTextoPorCampo(campo, valorAtual, mapaMembroFamiliaForm);

    if (typeof valorAtual === "string" && typeof valorFormatado === "string" && valorAtual !== valorFormatado) {
      setValue(chave, valorFormatado, {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }

  function selecionarFamilia(familia: Familia) {
    if (!familia.id_familia) return;
    setFamiliaSelecionadaId(familia.id_familia);
    setAbaAtiva("dados");
    setMensagem(null);
  }

  function alternarResponsavelFamiliar(index: number, marcado: boolean) {
    const membros = getValues("membros");

    membros.forEach((_, indice) => {
      setValue(`membros.${indice}.responsavel_familiar`, marcado ? indice === index : false, {
        shouldDirty: true,
        shouldValidate: true
      });
    });

    if (!marcado) {
      return;
    }

    const membro = membros[index];
    if (membro?.id_beneficiario) {
      setValue("id_referencia_familiar", membro.id_beneficiario, {
        shouldDirty: true,
        shouldValidate: true
      });
    }

    setPrincipalBusca(membro?.beneficiario_nome || "");
  }

  function adicionarOuAtualizarMembro(beneficiario: Beneficiario, responsavel: boolean) {
    if (!beneficiario.id_beneficiario) return;

    const membros = getValues("membros");
    const membroId = beneficiario.id_beneficiario;
    const indexExistente = membros.findIndex((membro) => membro.id_beneficiario === membroId);

    if (indexExistente >= 0) {
      const atualizados = [...membros];
      atualizados[indexExistente] = {
        ...atualizados[indexExistente],
        responsavel_familiar: responsavel || atualizados[indexExistente].responsavel_familiar,
        parentesco: responsavel ? "Responsavel familiar" : atualizados[indexExistente].parentesco
      };

      if (responsavel) {
        atualizados.forEach((item, index) => {
          if (index !== indexExistente) {
            item.responsavel_familiar = false;
          }
        });
      }

      replace(atualizados);
      return;
    }

    if (responsavel) {
      const atualizados = membros.map((item) => ({
        ...item,
        responsavel_familiar: false
      }));
      replace(atualizados);
    }

    append({
      id_beneficiario: membroId,
      parentesco: responsavel ? "Responsavel familiar" : "",
      responsavel_familiar: responsavel,
      contribui_renda: false,
      renda_individual: "",
      participa_servicos: false,
      observacoes: "",
      usa_endereco_familia: true,
      beneficiario_nome: beneficiario.nome_completo || beneficiario.nome_social || "Beneficiário",
      beneficiario_documento: beneficiario.cpf || beneficiario.nis || beneficiario.codigo || ""
    });
  }

  function selecionarPrincipal(beneficiario: Beneficiario) {
    if (!beneficiario.id_beneficiario) return;

    setValue("id_referencia_familiar", beneficiario.id_beneficiario, {
      shouldDirty: true,
      shouldValidate: true
    });

    if (!getValues("nome_familia")) {
      setValue("nome_familia", `Família ${beneficiario.nome_completo ?? ""}`.trim(), {
        shouldDirty: true,
        shouldValidate: true
      });
    }

    adicionarOuAtualizarMembro(beneficiario, true);
    setPrincipalBusca(beneficiario.nome_completo || beneficiario.nome_social || "");
  }

  function adicionarMembro(beneficiario: Beneficiario) {
    adicionarOuAtualizarMembro(beneficiario, false);
    setMembroBusca("");
  }

  async function removerMembro(index: number) {
    const membro = getValues(`membros.${index}`);
    const principalId = getValues("id_referencia_familiar");

    if (membro.id_beneficiario === principalId) {
      setMensagem({
        tipo: "erro",
        texto: "O responsável principal não pode ser removido da família."
      });
      return;
    }

    if (familiaSelecionadaId && membro.id_familia_membro) {
      try {
        await removerMembroMutation.mutateAsync({
          familiaId: familiaSelecionadaId,
          membroId: membro.id_familia_membro
        });
      } catch (error: any) {
        setMensagem({
          tipo: "erro",
          texto: error?.response?.data?.message ?? "Não foi possível remover o membro."
        });
        return;
      }
    }

    remove(index);
    setMensagem(null);
  }

  const acoes: AcaoCrud[] = useMemo(
    () => [
      { label: "Buscar", onClick: acaoBuscar, variant: "outline", icon: Search },
      { label: "Novo", onClick: acaoNovo, variant: "outline", icon: Plus },
      { label: "Salvar", onClick: acaoSalvar, variant: "default", icon: Save },
      { label: "Cancelar", onClick: acaoCancelar, variant: "outline", icon: Undo2 },
      { label: "Excluir", onClick: acaoExcluir, variant: "danger", icon: Trash2 },
      { label: "Imprimir", onClick: acaoImprimir, variant: "outline", icon: Printer },
      { label: "Fechar", onClick: acaoFechar, variant: "outline", icon: X }
    ],
    [onSalvar, snapshot, filtros, filtroDraft, familiaSelecionadaId]
  );

  const acoesNaOrdemPadrao = ordemAcoesCrudPadrao
    .map((label) => acoes.find((acao) => acao.label === label))
    .filter((acao): acao is AcaoCrud => !!acao);

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <section className={classesTelaPadraoBeneficiario.barraAcoes}>
        <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
          {acoesNaOrdemPadrao.map((acao) => (
            <Button
              key={acao.label}
              type="button"
              variant={acao.variant}
              size="sm"
              className={classesTelaPadraoBeneficiario.botaoAcao}
              onClick={acao.onClick}
              disabled={
                bloqueadoAcao ||
                ((acao.label === "Excluir" || acao.label === "Imprimir") && !familiaSelecionadaId)
              }
            >
              <acao.icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {acao.label}
            </Button>
          ))}
        </div>
      </section>

      <div className={classesTelaPadraoBeneficiario.gradePrincipal}>
        <Card className={classesTelaPadraoBeneficiario.cardAbas}>
          <CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>
            {abas.map((aba, indice) => (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaAtiva(aba.id)}
                className={classeBotaoAbaLateral(abaAtiva === aba.id)}
              >
                <span className={classeNumeroAbaLateral(abaAtiva === aba.id)} aria-hidden="true">
                  {indice + 1}
                </span>
                <span>{aba.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
          <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
            <div className={classesTelaPadraoBeneficiario.tituloAba}>
              <IconeAbaAtiva className="h-4 w-4" aria-hidden="true" />
              <CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>
                {tituloAbaAtiva}
              </CardTitle>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={variantStatus(familiaAtual?.status)}>
                {labelStatus(familiaAtual?.status ?? "ATIVO")}
              </Badge>
              <Badge variant={classesTelaPadraoBeneficiario.badgeCodigo}>
                Código {familiaAtual?.id_familia ?? "---"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-3">
            {typeof errors.membros?.message === "string" && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.membros.message}
              </div>
            )}

            {abaAtiva === "listagem" && (
              <section className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-12">
                  <div className="sm:col-span-2 xl:col-span-5">
                    <Label>Nome da família</Label>
                    <Input
                      className="h-8 text-xs"
                      value={filtroDraft.nome_familia ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, nome_familia: event.target.value }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-1 xl:col-span-3">
                    <Label>Município</Label>
                    <Input
                      className="h-8 text-xs"
                      value={filtroDraft.municipio ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, municipio: event.target.value }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-1 xl:col-span-2">
                    <Label>Status</Label>
                    <Select
                      className="h-8 text-xs"
                      value={filtroDraft.status ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((prev) => ({ ...prev, status: event.target.value }))
                      }
                    >
                      <option value="">Todos</option>
                      {familiaStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {labelStatus(status)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="sm:col-span-2 xl:col-span-2">
                    <Label className="invisible">Limpar</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      onClick={() => setFiltroDraft({ nome_familia: "", municipio: "", status: "" })}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                </div>

                <div className="max-h-[560px] overflow-auto rounded-lg border border-slate-200">
                  {carregandoLista ? (
                    <p className="p-3 text-sm text-slate-500">Carregando famílias...</p>
                  ) : !familias.length ? (
                    <p className="p-3 text-sm text-slate-500">Nenhuma família encontrada.</p>
                  ) : (
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-2 py-2">Código</th>
                          <th className="px-2 py-2">Nome da família</th>
                          <th className="px-2 py-2">Responsável</th>
                          <th className="px-2 py-2">Município/UF</th>
                          <th className="px-2 py-2">Status</th>
                          <th className="px-2 py-2">Membros</th>
                        </tr>
                      </thead>
                      <tbody>
                        {familias.map((familia, index) => {
                          const selecionada = familia.id_familia === familiaSelecionadaId;
                          return (
                            <tr
                              key={familia.id_familia}
                              className={`cursor-pointer border-t border-slate-200 ${
                                selecionada
                                  ? "bg-[var(--g3-primary-soft)]"
                                  : index % 2 === 0
                                    ? "bg-white"
                                    : "bg-slate-50"
                              } hover:bg-slate-100`}
                              onClick={() => selecionarFamilia(familia)}
                            >
                              <td className="px-2 py-2">{familia.id_familia ?? "---"}</td>
                              <td className="px-2 py-2 font-medium text-slate-800">{familia.nome_familia}</td>
                              <td className="px-2 py-2">{nomeBeneficiario(familia.referencia_familiar)}</td>
                              <td className="px-2 py-2">
                                {[familia.municipio, familia.uf].filter(Boolean).join("/") || "---"}
                              </td>
                              <td className="px-2 py-2">{labelStatus(familia.status)}</td>
                              <td className="px-2 py-2">{familia.qtd_membros ?? familia.membros?.length ?? 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}

            {abaAtiva === "dados" && (
              <section className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" {...register("id_referencia_familiar")} />
                <div>
                  <Label>Status*</Label>
                  <Select {...register("status")}>
                    {familiaStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {labelStatus(status)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Total de membros</Label>
                  <Input type="number" min={0} {...register("qtd_membros")} />
                </div>

                <div className="sm:col-span-2">
                  <Label>Nome da família*</Label>
                  <Input
                    {...register("nome_familia")}
                    onBlurCapture={() => aplicarFormatacaoCampo("nome_familia")}
                  />
                  {errors.nome_familia && (
                    <p className="mt-1 text-xs text-red-600">{errors.nome_familia.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Label>Buscar responsável principal</Label>
                  <Input
                    value={principalBusca}
                    onChange={(event) => setPrincipalBusca(event.target.value)}
                    placeholder="Digite nome, CPF ou código"
                  />

                  {principalQuery.isFetching && (
                    <p className="mt-1 text-xs text-slate-500">Buscando beneficiários...</p>
                  )}

                  {!!principalResultados.length && (
                    <div className="mt-2 max-h-48 overflow-auto rounded-md border border-slate-200">
                      {principalResultados.map((beneficiario) => (
                        <button
                          key={beneficiario.id_beneficiario}
                          type="button"
                          className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => selecionarPrincipal(beneficiario)}
                        >
                          <span>{beneficiario.nome_completo || beneficiario.nome_social}</span>
                          <span className="text-xs text-slate-500">
                            {beneficiario.cpf || beneficiario.nis || beneficiario.codigo || "---"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Label>Responsável principal*</Label>
                  <Input readOnly value={principalBusca || ""} />
                  {errors.id_referencia_familiar && (
                    <p className="mt-1 text-xs text-red-600">{errors.id_referencia_familiar.message}</p>
                  )}
                </div>
              </section>
            )}

            {abaAtiva === "endereco" && (
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                <div className="xl:col-span-2">
                  <Label>CEP</Label>
                  <Input {...register("cep")} />
                </div>
                <div className="xl:col-span-5">
                  <Label>Logradouro</Label>
                  <Input {...register("logradouro")} onBlurCapture={() => aplicarFormatacaoCampo("logradouro")} />
                </div>
                <div className="xl:col-span-2">
                  <Label>Número</Label>
                  <Input {...register("numero")} />
                </div>
                <div className="xl:col-span-3">
                  <Label>Complemento</Label>
                  <Input {...register("complemento")} onBlurCapture={() => aplicarFormatacaoCampo("complemento")} />
                </div>

                <div className="xl:col-span-4">
                  <Label>Bairro</Label>
                  <Input {...register("bairro")} onBlurCapture={() => aplicarFormatacaoCampo("bairro")} />
                </div>
                <div className="xl:col-span-4">
                  <Label>Ponto de referência</Label>
                  <Input
                    {...register("ponto_referencia")}
                    onBlurCapture={() => aplicarFormatacaoCampo("ponto_referencia")}
                  />
                </div>
                <div className="xl:col-span-3">
                  <Label>Município</Label>
                  <Input {...register("municipio")} onBlurCapture={() => aplicarFormatacaoCampo("municipio")} />
                </div>
                <div className="xl:col-span-1">
                  <Label>UF</Label>
                  <Input maxLength={2} {...register("uf")} />
                </div>

                <div className="xl:col-span-4">
                  <Label>Zona</Label>
                  <Input {...register("zona")} onBlurCapture={() => aplicarFormatacaoCampo("zona")} />
                </div>
              </section>
            )}

            {abaAtiva === "membros" && (
              <section className="space-y-4">
                <div>
                  <Label>Buscar beneficiário para vincular</Label>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={membroBusca}
                      onChange={(event) => setMembroBusca(event.target.value)}
                      placeholder="Digite nome, CPF ou código"
                    />
                  </div>

                  {membroQuery.isFetching && (
                    <p className="mt-1 text-xs text-slate-500">Buscando beneficiários...</p>
                  )}

                  {!!membroResultados.length && (
                    <div className="mt-2 max-h-48 overflow-auto rounded-md border border-slate-200">
                      {membroResultados.map((beneficiario) => (
                        <button
                          key={beneficiario.id_beneficiario}
                          type="button"
                          className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => adicionarMembro(beneficiario)}
                        >
                          <span>{beneficiario.nome_completo || beneficiario.nome_social}</span>
                          <span className="text-xs text-slate-500">
                            {beneficiario.cpf || beneficiario.nis || beneficiario.codigo || "---"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!membrosFields.length ? (
                  <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    Nenhum membro vinculado.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {membrosFields.map((field, index) => {
                      const membroAtual = membrosWatch?.[index];

                      return (
                        <article key={field.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {membroAtual?.beneficiario_nome || "Beneficiário"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {membroAtual?.beneficiario_documento || "---"}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void removerMembro(index)}
                              disabled={removerMembroMutation.isPending}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                              Remover
                            </Button>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-12">
                            <div className="sm:col-span-2 xl:col-span-4">
                              <Label>Parentesco*</Label>
                              <Select {...register(`membros.${index}.parentesco` as const)}>
                                <option value="">Selecione</option>
                                {parentescoOptions.map((opcao) => (
                                  <option key={opcao} value={opcao}>
                                    {opcao}
                                  </option>
                                ))}
                              </Select>
                            </div>

                            <div className="sm:col-span-2 xl:col-span-2">
                              <Label>Renda individual</Label>
                              <Input {...register(`membros.${index}.renda_individual` as const)} />
                            </div>

                            <label className="sm:col-span-1 xl:col-span-2 flex items-center gap-2 text-sm text-slate-700">
                              <Checkbox
                                checked={!!membroAtual?.responsavel_familiar}
                                onChange={(event) =>
                                  alternarResponsavelFamiliar(index, event.target.checked)
                                }
                              />
                              Responsável
                            </label>

                            <label className="sm:col-span-1 xl:col-span-2 flex items-center gap-2 text-sm text-slate-700">
                              <Checkbox {...register(`membros.${index}.contribui_renda` as const)} />
                              Contribui renda
                            </label>

                            <label className="sm:col-span-1 xl:col-span-2 flex items-center gap-2 text-sm text-slate-700">
                              <Checkbox {...register(`membros.${index}.participa_servicos` as const)} />
                              Participa dos serviços
                            </label>

                            <label className="sm:col-span-1 xl:col-span-2 flex items-center gap-2 text-sm text-slate-700">
                              <Checkbox {...register(`membros.${index}.usa_endereco_familia` as const)} />
                              Usa endereço da família
                            </label>

                            <div className="sm:col-span-2 xl:col-span-12">
                              <Label>Observações</Label>
                              <Textarea
                                rows={2}
                                {...register(`membros.${index}.observacoes` as const)}
                                onBlurCapture={() => aplicarFormatacaoMembro(index, "observacoes")}
                              />
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {abaAtiva === "indicadores" && (
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                <div className="xl:col-span-3">
                  <Label>Situação do imóvel</Label>
                  <Select {...register("situacao_imovel")}>
                    <option value="">Selecione</option>
                    {opcoesSituacaoImovel.map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="xl:col-span-3">
                  <Label>Tipo de moradia</Label>
                  <Select {...register("tipo_moradia")}>
                    <option value="">Selecione</option>
                    {opcoesTipoMoradia.map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="xl:col-span-2">
                  <Label>Crianças</Label>
                  <Input
                    type="number"
                    min={0}
                    {...register("qtd_criancas", {
                      setValueAs: (value) => (value === "" ? undefined : Number(value))
                    })}
                  />
                </div>

                <div className="xl:col-span-2">
                  <Label>Adolescentes</Label>
                  <Input
                    type="number"
                    min={0}
                    {...register("qtd_adolescentes", {
                      setValueAs: (value) => (value === "" ? undefined : Number(value))
                    })}
                  />
                </div>

                <div className="xl:col-span-2">
                  <Label>Idosos</Label>
                  <Input
                    type="number"
                    min={0}
                    {...register("qtd_idosos", {
                      setValueAs: (value) => (value === "" ? undefined : Number(value))
                    })}
                  />
                </div>

                <div className="xl:col-span-3">
                  <Label>Pessoas com deficiência</Label>
                  <Input
                    type="number"
                    min={0}
                    {...register("qtd_pessoas_deficiencia", {
                      setValueAs: (value) => (value === "" ? undefined : Number(value))
                    })}
                  />
                </div>

                <div className="xl:col-span-3">
                  <Label>Renda familiar total</Label>
                  <Input {...register("renda_familiar_total")} />
                </div>

                <div className="xl:col-span-3">
                  <Label>Renda per capita</Label>
                  <Input {...register("renda_per_capita")} />
                </div>

                <div className="xl:col-span-3">
                  <Label>Faixa de renda per capita</Label>
                  <Input
                    {...register("faixa_renda_per_capita")}
                    onBlurCapture={() => aplicarFormatacaoCampo("faixa_renda_per_capita")}
                  />
                </div>

                <div className="xl:col-span-4">
                  <Label>Esgoto</Label>
                  <Input {...register("esgoto_tipo")} onBlurCapture={() => aplicarFormatacaoCampo("esgoto_tipo")} />
                </div>

                <div className="xl:col-span-4">
                  <Label>Coleta de lixo</Label>
                  <Input {...register("coleta_lixo")} onBlurCapture={() => aplicarFormatacaoCampo("coleta_lixo")} />
                </div>

                <div className="xl:col-span-4">
                  <Label>Arranjo familiar</Label>
                  <Input
                    {...register("arranjo_familiar")}
                    onBlurCapture={() => aplicarFormatacaoCampo("arranjo_familiar")}
                  />
                </div>

                <div className="xl:col-span-6">
                  <Label>Principais fontes de renda</Label>
                  <Textarea
                    rows={2}
                    {...register("principais_fontes_renda")}
                    onBlurCapture={() => aplicarFormatacaoCampo("principais_fontes_renda")}
                  />
                </div>

                <div className="xl:col-span-6">
                  <Label>Situação de insegurança alimentar</Label>
                  <Textarea
                    rows={2}
                    {...register("situacao_inseguranca_alimentar")}
                    onBlurCapture={() => aplicarFormatacaoCampo("situacao_inseguranca_alimentar")}
                  />
                </div>

                <label className="xl:col-span-2 flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox {...register("agua_encanada")} />
                  Água encanada
                </label>

                <label className="xl:col-span-2 flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox {...register("energia_eletrica")} />
                  Energia elétrica
                </label>

                <label className="xl:col-span-2 flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox {...register("internet")} />
                  Internet
                </label>

                <label className="xl:col-span-2 flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox {...register("possui_dividas_relevantes")} />
                  Possui dívidas
                </label>

                <div className="xl:col-span-6">
                  <Label>Descrição de dívidas</Label>
                  <Textarea
                    rows={2}
                    {...register("descricao_dividas")}
                    onBlurCapture={() => aplicarFormatacaoCampo("descricao_dividas")}
                  />
                </div>

                <div className="xl:col-span-6">
                  <Label>Vulnerabilidades da família</Label>
                  <Textarea
                    rows={2}
                    {...register("vulnerabilidades_familia")}
                    onBlurCapture={() => aplicarFormatacaoCampo("vulnerabilidades_familia")}
                  />
                </div>

                <div className="xl:col-span-4">
                  <Label>Serviços de acompanhamento</Label>
                  <Input
                    {...register("servicos_acompanhamento")}
                    onBlurCapture={() => aplicarFormatacaoCampo("servicos_acompanhamento")}
                  />
                </div>

                <div className="xl:col-span-4">
                  <Label>Técnico responsável</Label>
                  <Input
                    {...register("tecnico_responsavel")}
                    onBlurCapture={() => aplicarFormatacaoCampo("tecnico_responsavel")}
                  />
                </div>

                <div className="xl:col-span-4">
                  <Label>Periodicidade de atendimento</Label>
                  <Input
                    {...register("periodicidade_atendimento")}
                    onBlurCapture={() => aplicarFormatacaoCampo("periodicidade_atendimento")}
                  />
                </div>

                <div className="xl:col-span-3">
                  <Label>Próxima visita prevista</Label>
                  <Input type="date" {...register("proxima_visita_prevista")} />
                </div>

                <div className="xl:col-span-9">
                  <Label>Observações</Label>
                  <Textarea
                    rows={2}
                    {...register("observacoes")}
                    onBlurCapture={() => aplicarFormatacaoCampo("observacoes")}
                  />
                </div>
              </section>
            )}
          </CardContent>
        </Card>
      </div>

      {mensagem && (
        <div
          className="fixed inset-0 z-[58] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setMensagem(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3
                className={`text-base font-semibold ${
                  mensagem.tipo === "sucesso" ? "text-emerald-800" : "text-red-700"
                }`}
              >
                {mensagem.tipo === "sucesso" ? "Confirmação" : "Atenção"}
              </h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700">{mensagem.texto}</p>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <Button type="button" onClick={() => setMensagem(null)}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupSalvarAberto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPopupSalvarAberto(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Confirmação</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700">Salvo com sucesso.</p>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <Button type="button" onClick={() => setPopupSalvarAberto(false)}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupExcluirAberto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPopupExcluirAberto(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Confirmar exclusão</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700">Esta ação é irreversível. Deseja continuar?</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setPopupExcluirAberto(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={confirmarExclusaoFamilia}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {popupImprimirAberto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPopupImprimirAberto(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Imprimir vínculo familiar</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700">Deseja gerar a impressão desta família?</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setPopupImprimirAberto(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={confirmarImpressao}>
                Continuar
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
