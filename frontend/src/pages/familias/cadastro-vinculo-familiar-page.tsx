import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

const abas = [
  { id: "lista", label: "Listagem de familias" },
  { id: "cadastro", label: "Cadastro da familia" },
  { id: "endereco", label: "Endereco da familia" },
  { id: "membros", label: "Membros vinculados" },
  { id: "indicadores", label: "Indicadores sociais" }
] as const;

const opcoesSituacaoImovel = ["Proprio", "Alugado", "Cedido", "Financiado", "Ocupacao", "Outro"];
const opcoesTipoMoradia = [
  "Casa",
  "Apartamento",
  "Comodo",
  "Barraco",
  "Casa de madeira",
  "Sitio/Chacara",
  "Outro"
];

type AbaId = (typeof abas)[number]["id"];
type AcaoToolbar = {
  label: string;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  disabled: boolean;
};

function normalizarStatus(status?: string) {
  if (!status) return "ATIVO";
  return status.replaceAll("_", " ");
}

function nomeBeneficiario(beneficiario?: BeneficiarioResumo | null) {
  if (!beneficiario) return "Beneficiario";
  return beneficiario.nome_completo || beneficiario.nome_social || "Beneficiario";
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

function mapFormularioParaPayload(
  values: FamiliaFormValues,
  familiaId?: string
): Familia {
  const membros: FamiliaMembro[] = values.membros.map((membro) => ({
    id_familia_membro: membro.id_familia_membro,
    id_beneficiario: membro.id_beneficiario,
    parentesco: membro.parentesco,
    responsavel_familiar: membro.responsavel_familiar,
    contribui_renda: membro.contribui_renda,
    renda_individual: membro.renda_individual || undefined,
    participa_servicos: membro.participa_servicos,
    observacoes: membro.observacoes || undefined,
    usa_endereco_familia: membro.usa_endereco_familia
  }));

  return {
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
}

export function CadastroVinculoFamiliarPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("lista");
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
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const { data: listaData, isLoading: carregandoLista } = useFamilias(filtros);
  const { data: familiaData, isLoading: carregandoFamilia } = useFamilia(familiaSelecionadaId);
  const salvarMutation = useSalvarFamilia();
  const removerMembroMutation = useRemoverMembroFamilia();

  const {
    register,
    control,
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

  useEffect(() => {
    if (!familiaData?.familia) return;
    const values = mapFamiliaParaFormulario(familiaData.familia);
    reset(values);
    replace(values.membros);
    setSnapshot(values);
    setMensagem(null);
    setAbaAtiva("cadastro");
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
  const principalResultados = principalQuery.data?.beneficiarios ?? [];
  const membroResultados = membroQuery.data?.beneficiarios ?? [];
  const bloqueadoAcao = salvarMutation.isPending || removerMembroMutation.isPending || carregandoFamilia;

  const onSalvar = handleSubmit(async (values) => {
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
      setMensagem({ tipo: "sucesso", texto: "Familia salva com sucesso." });
      setFiltros((prev) => ({ ...prev }));
      setAbaAtiva("cadastro");
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Nao foi possivel salvar a familia."
      });
    }
  });

  function acaoBuscar(): void {
    setMensagem(null);
    setFiltros({ ...filtroDraft });
    setAbaAtiva("lista");
  }

  function acaoNovo(): void {
    setFamiliaSelecionadaId(undefined);
    setSnapshot(null);
    reset(familiaDefaultValues);
    replace([]);
    setPrincipalBusca("");
    setMembroBusca("");
    setMensagem(null);
    setAbaAtiva("cadastro");
  }

  function acaoCancelar(): void {
    if (!snapshot) {
      acaoNovo();
      return;
    }
    reset(snapshot);
    replace(snapshot.membros);
    setMensagem(null);
  }

  function acaoExcluir(): void {
    setMensagem({
      tipo: "erro",
      texto: "Exclusao de familia nao esta disponivel nesta fase da migracao."
    });
  }

  function acaoImprimir(): void {
    setMensagem({
      tipo: "erro",
      texto: "Impressao de vinculo familiar ainda nao foi migrada."
    });
  }

  function acaoFechar(): void {
    navigate("/");
  }

  function selecionarFamilia(familia: Familia) {
    if (!familia.id_familia) return;
    setFamiliaSelecionadaId(familia.id_familia);
    setMensagem(null);
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
      beneficiario_nome: beneficiario.nome_completo || beneficiario.nome_social || "Beneficiario",
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
      setValue("nome_familia", `Familia ${beneficiario.nome_completo ?? ""}`.trim(), {
        shouldDirty: true
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
        texto: "O responsavel principal nao pode ser removido da familia."
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
          texto: error?.response?.data?.message ?? "Nao foi possivel remover o membro."
        });
        return;
      }
    }
    remove(index);
    setMensagem(null);
  }

  const acoes = useMemo<AcaoToolbar[]>(
    () => [
      { label: "Buscar", onClick: acaoBuscar, variant: "outline" as const, disabled: false },
      { label: "Novo", onClick: acaoNovo, variant: "outline" as const, disabled: false },
      {
        label: "Salvar",
        onClick: () => {
          void onSalvar();
        },
        variant: "default" as const,
        disabled: false
      },
      { label: "Cancelar", onClick: acaoCancelar, variant: "outline" as const, disabled: false },
      { label: "Excluir", onClick: acaoExcluir, variant: "danger" as const, disabled: true },
      { label: "Imprimir", onClick: acaoImprimir, variant: "outline" as const, disabled: true },
      { label: "Fechar", onClick: acaoFechar, variant: "ghost" as const, disabled: false }
    ],
    [onSalvar]
  );

  return (
    <main className="g3-container space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {acoes.map((acao) => (
            <Button
              key={acao.label}
              variant={acao.variant}
              onClick={acao.onClick}
              disabled={bloqueadoAcao || acao.disabled}
            >
              {acao.label}
            </Button>
          ))}
        </div>
      </section>

      {mensagem && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            mensagem.tipo === "sucesso"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Listagem de familias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div>
                <Label>Nome da familia</Label>
                <Input
                  value={filtroDraft.nome_familia ?? ""}
                  onChange={(event) =>
                    setFiltroDraft((prev) => ({ ...prev, nome_familia: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Municipio</Label>
                <Input
                  value={filtroDraft.municipio ?? ""}
                  onChange={(event) =>
                    setFiltroDraft((prev) => ({ ...prev, municipio: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={filtroDraft.status ?? ""}
                  onChange={(event) =>
                    setFiltroDraft((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  <option value="">Todos</option>
                  {familiaStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {normalizarStatus(status)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setFiltroDraft({ nome_familia: "", municipio: "", status: "" })}
            >
              Limpar filtros
            </Button>

            <div className="max-h-[540px] overflow-auto rounded-md border border-slate-200">
              {carregandoLista ? (
                <p className="p-3 text-sm text-slate-500">Carregando familias...</p>
              ) : !familias.length ? (
                <p className="p-3 text-sm text-slate-500">Nenhuma familia encontrada.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-2 py-2">Familia</th>
                      <th className="px-2 py-2">Referencia</th>
                      <th className="px-2 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familias.map((familia) => (
                      <tr
                        key={familia.id_familia}
                        className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${
                          familia.id_familia === familiaSelecionadaId ? "bg-emerald-50" : ""
                        }`}
                        onClick={() => selecionarFamilia(familia)}
                      >
                        <td className="px-2 py-2">{familia.nome_familia}</td>
                        <td className="px-2 py-2 text-xs">{nomeBeneficiario(familia.referencia_familiar)}</td>
                        <td className="px-2 py-2 text-xs">{normalizarStatus(familia.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Cadastro de Vinculo Familiar</CardTitle>
            <div className="flex flex-wrap gap-2">
              {abas.map((aba) => (
                <Button
                  key={aba.id}
                  variant={abaAtiva === aba.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAbaAtiva(aba.id)}
                >
                  {aba.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {typeof errors.membros?.message === "string" && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.membros.message}
              </div>
            )}

            {abaAtiva === "cadastro" && (
              <section className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" {...register("id_referencia_familiar")} />
                <div>
                  <Label>Status</Label>
                  <Select {...register("status")}>
                    {familiaStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {normalizarStatus(status)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Nome da familia*</Label>
                  <Input {...register("nome_familia")} />
                  {errors.nome_familia && (
                    <p className="mt-1 text-xs text-red-600">{errors.nome_familia.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label>Buscar responsavel principal</Label>
                  <Input
                    value={principalBusca}
                    onChange={(event) => setPrincipalBusca(event.target.value)}
                    placeholder="Digite nome, CPF ou codigo"
                  />
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
                  <Label>Responsavel principal*</Label>
                  <Input readOnly value={principalBusca || ""} />
                  {errors.id_referencia_familiar && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.id_referencia_familiar.message}
                    </p>
                  )}
                </div>
              </section>
            )}

            {abaAtiva === "endereco" && (
              <section className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>CEP</Label>
                  <Input {...register("cep")} />
                </div>
                <div>
                  <Label>Logradouro</Label>
                  <Input {...register("logradouro")} />
                </div>
                <div>
                  <Label>Numero</Label>
                  <Input {...register("numero")} />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input {...register("complemento")} />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input {...register("bairro")} />
                </div>
                <div>
                  <Label>Ponto de referencia</Label>
                  <Input {...register("ponto_referencia")} />
                </div>
                <div>
                  <Label>Municipio</Label>
                  <Input {...register("municipio")} />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input maxLength={2} {...register("uf")} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Zona</Label>
                  <Input {...register("zona")} />
                </div>
              </section>
            )}

            {abaAtiva === "membros" && (
              <section className="space-y-4">
                <div>
                  <Label>Buscar beneficiario para vincular</Label>
                  <Input
                    value={membroBusca}
                    onChange={(event) => setMembroBusca(event.target.value)}
                    placeholder="Digite nome, CPF ou codigo"
                  />
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
                    {membrosFields.map((field, index) => (
                      <div key={field.id} className="rounded-md border border-slate-200 p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {getValues(`membros.${index}.beneficiario_nome`) || "Beneficiario"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {getValues(`membros.${index}.beneficiario_documento`) || "---"}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void removerMembro(index)}
                            disabled={removerMembroMutation.isPending}
                          >
                            Remover
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
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
                          <div>
                            <Label>Renda individual</Label>
                            <Input {...register(`membros.${index}.renda_individual` as const)} />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <Checkbox {...register(`membros.${index}.responsavel_familiar` as const)} />
                            Responsavel familiar
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <Checkbox {...register(`membros.${index}.contribui_renda` as const)} />
                            Contribui renda
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <Checkbox {...register(`membros.${index}.participa_servicos` as const)} />
                            Participa dos servicos
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <Checkbox {...register(`membros.${index}.usa_endereco_familia` as const)} />
                            Usa endereco da familia
                          </label>
                          <div className="sm:col-span-2">
                            <Label>Observacoes</Label>
                            <Textarea rows={2} {...register(`membros.${index}.observacoes` as const)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {abaAtiva === "indicadores" && (
              <section className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Situacao do imovel</Label>
                  <Select {...register("situacao_imovel")}>
                    <option value="">Selecione</option>
                    {opcoesSituacaoImovel.map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
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
                <div>
                  <Label>Total de membros</Label>
                  <Input
                    type="number"
                    min={0}
                    {...register("qtd_membros", {
                      setValueAs: (value) => (value === "" ? undefined : Number(value))
                    })}
                  />
                </div>
                <div>
                  <Label>Criancas</Label>
                  <Input
                    type="number"
                    min={0}
                    {...register("qtd_criancas", {
                      setValueAs: (value) => (value === "" ? undefined : Number(value))
                    })}
                  />
                </div>
                <div>
                  <Label>Adolescentes</Label>
                  <Input
                    type="number"
                    min={0}
                    {...register("qtd_adolescentes", {
                      setValueAs: (value) => (value === "" ? undefined : Number(value))
                    })}
                  />
                </div>
                <div>
                  <Label>Idosos</Label>
                  <Input
                    type="number"
                    min={0}
                    {...register("qtd_idosos", {
                      setValueAs: (value) => (value === "" ? undefined : Number(value))
                    })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Principais fontes de renda</Label>
                  <Textarea rows={2} {...register("principais_fontes_renda")} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Observacoes</Label>
                  <Textarea rows={3} {...register("observacoes")} />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox {...register("agua_encanada")} />
                  Agua encanada
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox {...register("energia_eletrica")} />
                  Energia eletrica
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox {...register("internet")} />
                  Internet
                </label>
              </section>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                onClick={() =>
                  setAbaAtiva(abas[Math.max(0, abas.findIndex((aba) => aba.id === abaAtiva) - 1)].id)
                }
                disabled={abaAtiva === "lista"}
              >
                Aba anterior
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setAbaAtiva(
                    abas[Math.min(abas.length - 1, abas.findIndex((aba) => aba.id === abaAtiva) + 1)].id
                  )
                }
                disabled={abaAtiva === "indicadores"}
              >
                Proxima aba
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
