import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  DoorOpen,
  ExternalLink,
  FileText,
  ListFilter,
  MapPinned,
  Phone,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  Upload,
  UserPlus,
  UsersRound,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MensagemAcoesRapidas } from "@/components/mensagens-personalizadas/mensagem-acoes-rapidas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { buscarEnderecoPorCep } from "@/services/cep.service";
import { reportsService } from "@/services/reports.service";
import {
  unidadeAssistencialDefaultValues,
  unidadeAssistencialFormSchema,
  type UnidadeAssistencialFormValues
} from "@/features/unidades-assistenciais/unidade-assistencial.schema";
import {
  useRemoverUnidadeAssistencial,
  useSalvarUnidadeAssistencial,
  useUnidadeAssistencial,
  useUnidadesAssistenciais
} from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario,
  ordemAcoesCrudPadrao
} from "@/lib/tela-padrao-beneficiario";
import { somenteDigitos } from "@/lib/validators";
import {
  mapaCamposTextoUnidadeForm,
  mapaDiretoriaUnidadeForm,
  mapaSalaUnidadeForm
} from "@/lib/text-format-config";
import { formatarTextoPorCampo, normalizarObjetoTexto } from "@/lib/text-formatter";
import { abrirRelatorioPdf } from "@/lib/report-utils";
import { resolverUrlArquivo } from "@/lib/arquivos";
import { fotoMaximaBytes, lerArquivoComoDataUrl } from "@/lib/foto-3x4";
import { useAuth } from "@/hooks/use-auth";
import type {
  DiretoriaUnidade,
  UnidadeAssistencial,
  UnidadeAssistencialFiltro
} from "@/types/unidade-assistencial";

const abas = [
  { id: "listagem", label: "Listagem de unidades", icon: ListFilter },
  { id: "dados", label: "Dados gerais", icon: Building2 },
  { id: "contato", label: "Contato e operação", icon: Phone },
  { id: "endereco", label: "Endereço", icon: MapPinned },
  { id: "diretoria", label: "Diretoria", icon: UsersRound },
  { id: "salas", label: "Salas de atendimento", icon: DoorOpen },
  { id: "observacoes", label: "Observações", icon: FileText }
] as const;

const modosValidacaoPontoOptions = [
  { value: "IP_OU_REDE", label: "IP ou rede interna" },
  { value: "IP", label: "Somente IP fixo" },
  { value: "REDE", label: "Somente rede (CIDR)" },
  { value: "GEO", label: "Somente geolocalização" },
  { value: "GEO_OU_IP", label: "Geolocalização ou IP/rede" },
  { value: "LIVRE", label: "Livre (sem bloqueio)" }
] as const;

type AbaId = (typeof abas)[number]["id"];

type AcaoCrud = {
  label: string;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  icon: LucideIcon;
};

const tituloTela = "Cadastro de unidade assistencial";

function formatarCnpj(valor?: string) {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== 14) {
    return valor || "---";
  }
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}

function formatarTelefone(valor?: string) {
  const digitos = somenteDigitos(valor);
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return valor || "---";
}

function mapUnidadeParaFormulario(unidade: UnidadeAssistencial): UnidadeAssistencialFormValues {
  return {
    ...unidadeAssistencialDefaultValues,
    ...unidade,
    unidade_principal: !!unidade.unidade_principal,
    diretoria:
      unidade.diretoria?.map((membro) => ({
        id: membro.id,
        nome_completo: membro.nome_completo ?? "",
        documento: membro.documento ?? "",
        funcao: membro.funcao ?? "",
        mandato_inicio: membro.mandato_inicio ?? "",
        mandato_fim: membro.mandato_fim ?? ""
      })) ?? [],
    salas:
      unidade.salas?.map((sala) => ({
        id: sala.id,
        nome: sala.nome ?? ""
      })) ?? []
  };
}

function limparDiretoria(payload: Array<Partial<DiretoriaUnidade>>): DiretoriaUnidade[] {
  return payload
    .map((membro) => {
      const membroNormalizado = normalizarObjetoTexto(membro, mapaDiretoriaUnidadeForm);
      return {
        ...membroNormalizado,
        nome_completo: membroNormalizado.nome_completo?.trim() ?? "",
        documento: membro.documento?.trim() ?? "",
        funcao: membroNormalizado.funcao?.trim() ?? "",
        mandato_inicio: membro.mandato_inicio?.trim() || undefined,
        mandato_fim: membro.mandato_fim?.trim() || undefined
      };
    })
    .filter((membro) => membro.nome_completo && membro.documento && membro.funcao);
}

function limparSalas(payload: Array<{ id?: string; nome?: string }>) {
  const salasNormalizadas = payload
    .map((sala) => {
      const salaNormalizada = normalizarObjetoTexto(sala, mapaSalaUnidadeForm);
      return {
        id: sala.id,
        nome: salaNormalizada.nome?.trim() ?? ""
      };
    })
    .filter((sala) => sala.nome.length > 0);

  const nomes = new Set<string>();
  return salasNormalizadas.filter((sala) => {
    if (nomes.has(sala.nome)) return false;
    nomes.add(sala.nome);
    return true;
  });
}

function mapFormularioParaPayload(
  values: UnidadeAssistencialFormValues,
  unidadeId?: string
): UnidadeAssistencial {
  const payload: UnidadeAssistencial = {
    id_unidade: unidadeId,
    nome_fantasia: values.nome_fantasia.trim(),
    razao_social: values.razao_social?.trim() || undefined,
    cnpj: values.cnpj?.trim() || undefined,
    telefone: values.telefone?.trim() || undefined,
    email: values.email?.trim() || undefined,
    site: values.site?.trim() || undefined,
    horario_funcionamento: values.horario_funcionamento?.trim() || undefined,
    observacoes: values.observacoes?.trim() || undefined,
    unidade_principal: !!values.unidade_principal,
    cep: values.cep?.trim() || undefined,
    logradouro: values.logradouro?.trim() || undefined,
    numero: values.numero?.trim() || undefined,
    complemento: values.complemento?.trim() || undefined,
    bairro: values.bairro?.trim() || undefined,
    ponto_referencia: values.ponto_referencia?.trim() || undefined,
    cidade: values.cidade?.trim() || undefined,
    estado: values.estado?.trim().toUpperCase() || undefined,
    zona: values.zona?.trim() || undefined,
    subzona: values.subzona?.trim() || undefined,
    latitude: values.latitude?.trim() || undefined,
    longitude: values.longitude?.trim() || undefined,
    raio_ponto_metros: values.raio_ponto_metros,
    accuracy_max_ponto_metros: values.accuracy_max_ponto_metros,
    ip_validacao_ponto: values.ip_validacao_ponto?.trim() || undefined,
    ips_publicos_ponto: values.ips_publicos_ponto?.trim() || undefined,
    redes_locais_ponto: values.redes_locais_ponto?.trim() || undefined,
    modo_validacao_ponto: values.modo_validacao_ponto?.trim() || undefined,
    ping_timeout_ms: values.ping_timeout_ms,
    logomarca: values.logomarca?.trim() || undefined,
    logomarca_relatorio: values.logomarca_relatorio?.trim() || undefined,
    diretoria: limparDiretoria(values.diretoria ?? []),
    salas: limparSalas(values.salas ?? [])
  };

  return normalizarObjetoTexto(payload, mapaCamposTextoUnidadeForm);
}

export function CadastroUnidadeAssistencialPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [filtroDraft, setFiltroDraft] = useState<UnidadeAssistencialFiltro>({
    nome_fantasia: "",
    cnpj: "",
    cidade: "",
    unidade_principal: undefined
  });
  const [filtros, setFiltros] = useState<UnidadeAssistencialFiltro>(filtroDraft);
  const [unidadeSelecionadaId, setUnidadeSelecionadaId] = useState<string | undefined>();
  const [snapshot, setSnapshot] = useState<UnidadeAssistencialFormValues | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [popupSalvarAberto, setPopupSalvarAberto] = useState(false);
  const [popupExcluirAberto, setPopupExcluirAberto] = useState(false);
  const [carregandoCep, setCarregandoCep] = useState(false);
  const [imprimindoRelatorio, setImprimindoRelatorio] = useState(false);
  const ultimoCepConsultadoRef = useRef("");
  const inputLogomarcaRef = useRef<HTMLInputElement | null>(null);
  const inputLogomarcaRelatorioRef = useRef<HTMLInputElement | null>(null);

  const { data: listaData, isLoading: carregandoLista } = useUnidadesAssistenciais(filtros);
  const { data: unidadeData, isLoading: carregandoDetalhes } = useUnidadeAssistencial(unidadeSelecionadaId);
  const salvarMutation = useSalvarUnidadeAssistencial();
  const removerMutation = useRemoverUnidadeAssistencial();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    control,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(unidadeAssistencialFormSchema),
    defaultValues: unidadeAssistencialDefaultValues
  });

  const {
    fields: diretoriaFields,
    append: appendDiretoria,
    remove: removerDiretoria,
    replace: replaceDiretoria
  } = useFieldArray({
    control,
    name: "diretoria"
  });

  const {
    fields: salasFields,
    append: appendSala,
    remove: removerSala,
    replace: replaceSalas
  } = useFieldArray({
    control,
    name: "salas"
  });

  const cepAtual = watch("cep") || "";
  const nomeFantasiaAtual = watch("nome_fantasia") || "";
  const cnpjAtual = watch("cnpj") || "";
  const telefoneAtual = watch("telefone") || "";
  const emailAtual = watch("email") || "";
  const logradouroAtual = watch("logradouro") || "";
  const numeroAtual = watch("numero") || "";
  const bairroAtual = watch("bairro") || "";
  const cidadeAtual = watch("cidade") || "";
  const estadoAtual = watch("estado") || "";
  const logomarcaAtual = watch("logomarca") || "";
  const logomarcaRelatorioAtual = watch("logomarca_relatorio") || "";

  useEffect(() => {
    if (!unidadeData?.unidade) return;
    const values = mapUnidadeParaFormulario(unidadeData.unidade);
    reset(values);
    replaceDiretoria(values.diretoria ?? []);
    replaceSalas(values.salas ?? []);
    setSnapshot(values);
    setMensagem(null);
    setAbaAtiva("dados");
  }, [replaceDiretoria, replaceSalas, reset, unidadeData]);

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
        setValue("cidade", endereco.municipio, { shouldDirty: true, shouldValidate: true });
        setValue("estado", endereco.uf, { shouldDirty: true, shouldValidate: true });

        const complementoAtual = (getValues("complemento") ?? "").trim();
        if (!complementoAtual && endereco.complemento) {
          setValue("complemento", endereco.complemento, {
            shouldDirty: true,
            shouldValidate: true
          });
        }

        setMensagem({
          tipo: "sucesso",
          texto: "Endereço preenchido automaticamente pelo CEP."
        });
      } catch (error: any) {
        if (!ativo) return;
        setMensagem({
          tipo: "erro",
          texto: error?.message ?? "Não foi possível consultar o CEP informado."
        });
      } finally {
        if (ativo) {
          setCarregandoCep(false);
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [cepAtual, getValues, setValue]);

  const unidades = listaData?.unidades ?? [];
  const unidadeAtual = unidadeData?.unidade;
  const bloqueadoAcao =
    salvarMutation.isPending || removerMutation.isPending || carregandoDetalhes || imprimindoRelatorio;
  const abaAtual = abas.find((aba) => aba.id === abaAtiva);
  const tituloAbaAtiva = abaAtual?.label ?? tituloTela;
  const IconeAbaAtiva = abaAtual?.icon ?? Building2;

  const possuiEnderecoParaMapa = useMemo(() => {
    return [logradouroAtual, numeroAtual, bairroAtual, cidadeAtual, estadoAtual, cepAtual].some(
      (valor) => valor.trim().length > 0
    );
  }, [bairroAtual, cepAtual, cidadeAtual, estadoAtual, logradouroAtual, numeroAtual]);

  function abrirEnderecoNoGoogleMaps() {
    const partesEndereco = [logradouroAtual, numeroAtual, bairroAtual, cidadeAtual, estadoAtual, cepAtual]
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
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function aplicarFormatacaoCampo(campo: keyof UnidadeAssistencialFormValues) {
    const valorAtual = getValues(campo);
    const valorFormatado = formatarTextoPorCampo(
      String(campo),
      valorAtual,
      mapaCamposTextoUnidadeForm
    );

    if (typeof valorAtual === "string" && typeof valorFormatado === "string" && valorAtual !== valorFormatado) {
      setValue(campo, valorFormatado as UnidadeAssistencialFormValues[keyof UnidadeAssistencialFormValues], {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }

  function aplicarFormatacaoDiretoria(indice: number, campo: "nome_completo" | "funcao") {
    const chave = `diretoria.${indice}.${campo}` as const;
    const valorAtual = getValues(chave);
    const valorFormatado = formatarTextoPorCampo(campo, valorAtual, mapaDiretoriaUnidadeForm);

    if (typeof valorAtual === "string" && typeof valorFormatado === "string" && valorAtual !== valorFormatado) {
      setValue(chave, valorFormatado, {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }

  function aplicarFormatacaoSala(indice: number) {
    const chave = `salas.${indice}.nome` as const;
    const valorAtual = getValues(chave);
    const valorFormatado = formatarTextoPorCampo("nome", valorAtual, mapaSalaUnidadeForm);

    if (typeof valorAtual === "string" && typeof valorFormatado === "string" && valorAtual !== valorFormatado) {
      setValue(chave, valorFormatado, {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  }

  async function carregarLogomarca(
    campo: "logomarca" | "logomarca_relatorio",
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";

    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setMensagem({ tipo: "erro", texto: "Selecione um arquivo de imagem válido." });
      return;
    }

    if (arquivo.size > fotoMaximaBytes) {
      setMensagem({ tipo: "erro", texto: "A imagem deve ter no máximo 5 MB." });
      return;
    }

    try {
      const dataUrl = await lerArquivoComoDataUrl(arquivo);
      setValue(campo, dataUrl, { shouldDirty: true, shouldValidate: true });
      setMensagem(null);
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.message ?? "Não foi possível processar a imagem enviada."
      });
    }
  }

  function removerLogomarca(campo: "logomarca" | "logomarca_relatorio") {
    setValue(campo, "", { shouldDirty: true, shouldValidate: true });
    setMensagem(null);
  }

  const onSalvar = handleSubmit(
    async (values) => {
      setMensagem(null);
      try {
        const payload = mapFormularioParaPayload(values as UnidadeAssistencialFormValues, unidadeSelecionadaId);
        const response = await salvarMutation.mutateAsync(payload);
        const unidade = response.unidade;
        if (unidade?.id_unidade) {
          setUnidadeSelecionadaId(unidade.id_unidade);
        }

        const atualizado = mapUnidadeParaFormulario(unidade ?? payload);
        reset(atualizado);
        replaceDiretoria(atualizado.diretoria ?? []);
        replaceSalas(atualizado.salas ?? []);
        setSnapshot(atualizado);
        setFiltros((estadoAtual) => ({ ...estadoAtual }));
        setPopupSalvarAberto(true);
      } catch (error: any) {
        setMensagem({
          tipo: "erro",
          texto: error?.response?.data?.message ?? "Não foi possível salvar a unidade assistencial."
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
    setMensagem(null);
    setUnidadeSelecionadaId(undefined);
    setSnapshot(null);
    reset(unidadeAssistencialDefaultValues);
    replaceDiretoria([]);
    replaceSalas([]);
    setAbaAtiva("dados");
  }

  function acaoCancelar() {
    if (!snapshot) {
      acaoNovo();
      return;
    }
    reset(snapshot);
    replaceDiretoria(snapshot.diretoria ?? []);
    replaceSalas(snapshot.salas ?? []);
    setMensagem(null);
  }

  function acaoExcluir() {
    if (!unidadeSelecionadaId) {
      setMensagem({ tipo: "erro", texto: "Selecione uma unidade para excluir." });
      return;
    }
    setPopupExcluirAberto(true);
  }

  async function confirmarExclusao() {
    if (!unidadeSelecionadaId) {
      setPopupExcluirAberto(false);
      setMensagem({ tipo: "erro", texto: "Selecione uma unidade para excluir." });
      return;
    }

    try {
      await removerMutation.mutateAsync(unidadeSelecionadaId);
      setPopupExcluirAberto(false);
      acaoNovo();
      setMensagem({ tipo: "sucesso", texto: "Unidade assistencial excluída com sucesso." });
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir a unidade assistencial."
      });
    }
  }

  async function acaoImprimir() {
    try {
      setImprimindoRelatorio(true);
      setMensagem(null);
      const blob = await reportsService.gerarRelacaoUnidadesAssistenciais({
        ...filtros,
        usuarioEmissor: usuario?.nome || usuario?.nomeUsuario || "Sistema G3-Next"
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

  function acaoFechar() {
    navigate("/");
  }

  function selecionarUnidade(item: UnidadeAssistencial) {
    if (!item.id_unidade) return;
    setUnidadeSelecionadaId(item.id_unidade);
    setAbaAtiva("dados");
    setMensagem(null);
  }

  const acoes: AcaoCrud[] = [
    { label: "Buscar", onClick: acaoBuscar, variant: "outline", icon: Search },
    { label: "Novo", onClick: acaoNovo, variant: "outline", icon: Plus },
    { label: "Salvar", onClick: acaoSalvar, variant: "default", icon: Save },
    { label: "Cancelar", onClick: acaoCancelar, variant: "outline", icon: Undo2 },
    { label: "Excluir", onClick: () => void acaoExcluir(), variant: "danger", icon: Trash2 },
    { label: "Imprimir", onClick: () => void acaoImprimir(), variant: "outline", icon: Printer },
    { label: "Fechar", onClick: acaoFechar, variant: "outline", icon: X }
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
              <Button
                key={acao.label}
                type="button"
                variant={acao.variant}
                size="sm"
                className={classesTelaPadraoBeneficiario.botaoAcao}
                onClick={acao.onClick}
                disabled={bloqueadoAcao || (acao.label === "Excluir" && !unidadeSelecionadaId)}
              >
                <acao.icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
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
                {abaAtiva === "listagem" ? "Listagem" : tituloAbaAtiva}
              </CardTitle>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={unidadeAtual?.unidade_principal ? "success" : "default"}>
                {unidadeAtual?.unidade_principal ? "Unidade principal" : "Unidade"}
              </Badge>
              <Badge variant={classesTelaPadraoBeneficiario.badgeCodigo}>
                Código {unidadeAtual?.id_unidade ?? "---"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            {abaAtiva === "listagem" ? (
              <section className="space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-12">
                  <div className="sm:col-span-2 lg:col-span-5">
                    <Label>Nome fantasia</Label>
                    <Input
                      className="h-8 text-xs"
                      value={filtroDraft.nome_fantasia ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((estadoAtual) => ({
                          ...estadoAtual,
                          nome_fantasia: event.target.value
                        }))
                      }
                      placeholder="Buscar por nome fantasia"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <Label>CNPJ</Label>
                    <Input
                      className="h-8 text-xs"
                      value={filtroDraft.cnpj ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((estadoAtual) => ({
                          ...estadoAtual,
                          cnpj: event.target.value
                        }))
                      }
                      placeholder="00000000000000"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <Label>Cidade</Label>
                    <Input
                      className="h-8 text-xs"
                      value={filtroDraft.cidade ?? ""}
                      onChange={(event) =>
                        setFiltroDraft((estadoAtual) => ({
                          ...estadoAtual,
                          cidade: event.target.value
                        }))
                      }
                      placeholder="Buscar por cidade"
                    />
                  </div>

                  <div className="lg:col-span-1">
                    <Label className="opacity-0">Principal</Label>
                    <label className="flex h-8 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700">
                      <Checkbox
                        checked={!!filtroDraft.unidade_principal}
                        onChange={(event) =>
                          setFiltroDraft((estadoAtual) => ({
                            ...estadoAtual,
                            unidade_principal: event.target.checked ? true : undefined
                          }))
                        }
                      />
                      Principal
                    </label>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  onClick={() =>
                    setFiltroDraft({
                      nome_fantasia: "",
                      cnpj: "",
                      cidade: "",
                      unidade_principal: undefined
                    })
                  }
                >
                  Limpar filtros
                </Button>

                <div className="max-h-[420px] overflow-auto rounded-md border border-slate-200">
                  {carregandoLista ? (
                    <p className="p-3 text-sm text-slate-500">Carregando unidades assistenciais...</p>
                  ) : unidades.length === 0 ? (
                    <p className="p-3 text-sm text-slate-500">Nenhuma unidade assistencial encontrada.</p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-2 py-2">Nome fantasia</th>
                          <th className="px-2 py-2">CNPJ</th>
                          <th className="px-2 py-2">Cidade</th>
                          <th className="px-2 py-2">Telefone</th>
                          <th className="px-2 py-2">Principal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unidades.map((item, indice) => (
                          <tr
                            key={item.id_unidade}
                            className={`cursor-pointer border-t border-slate-100 hover:bg-emerald-50/70 ${
                              item.id_unidade === unidadeSelecionadaId
                                ? "bg-emerald-50"
                                : indice % 2 === 0
                                  ? "bg-white"
                                  : "bg-slate-100"
                            }`}
                            onClick={() => selecionarUnidade(item)}
                          >
                            <td className="px-2 py-2">{item.nome_fantasia}</td>
                            <td className="px-2 py-2">{formatarCnpj(item.cnpj)}</td>
                            <td className="px-2 py-2">{item.cidade ?? "---"}</td>
                            <td className="px-2 py-2 whitespace-nowrap">{formatarTelefone(item.telefone)}</td>
                            <td className="px-2 py-2">
                              <Badge variant={item.unidade_principal ? "success" : "default"}>
                                {item.unidade_principal ? "Sim" : "Não"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            ) : (
              <form className="min-w-0 space-y-4" onSubmit={onSalvar}>
                {abaAtiva === "dados" && (
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                    <div className="sm:col-span-2 xl:col-span-6">
                      <Label htmlFor="nome_fantasia">Nome fantasia*</Label>
                      <Input
                        id="nome_fantasia"
                        {...register("nome_fantasia")}
                        onBlurCapture={() => aplicarFormatacaoCampo("nome_fantasia")}
                      />
                      {errors.nome_fantasia && (
                        <p className="mt-1 text-xs text-red-600">{errors.nome_fantasia.message}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2 xl:col-span-6">
                      <Label htmlFor="razao_social">Razão social</Label>
                      <Input
                        id="razao_social"
                        {...register("razao_social")}
                        onBlurCapture={() => aplicarFormatacaoCampo("razao_social")}
                      />
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input id="cnpj" {...register("cnpj")} placeholder="00.000.000/0000-00" />
                      {errors.cnpj && <p className="mt-1 text-xs text-red-600">{errors.cnpj.message}</p>}
                    </div>

                    <div className="xl:col-span-3">
                      <input type="hidden" {...register("logomarca")} />
                      <Label>Logomarca da unidade vazado</Label>
                      <div className="mt-2 flex aspect-[4/3] w-full max-w-[170px] items-center justify-center overflow-hidden rounded-md border border-emerald-800 bg-emerald-900">
                        {logomarcaAtual ? (
                          <img
                            src={resolverUrlArquivo(logomarcaAtual)}
                            alt="Logomarca da unidade vazado"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="px-3 text-center text-xs text-emerald-100">Sem logomarca</span>
                        )}
                      </div>
                      <input
                        ref={inputLogomarcaRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void carregarLogomarca("logomarca", event)}
                      />
                      <div className="mt-2 flex w-full max-w-[170px] gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => inputLogomarcaRef.current?.click()}
                        >
                          <Upload className="mr-1.5 h-3.5 w-3.5" />
                          Enviar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => removerLogomarca("logomarca")}
                          disabled={!logomarcaAtual}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Remover
                        </Button>
                      </div>
                    </div>

                    <div className="xl:col-span-3">
                      <input type="hidden" {...register("logomarca_relatorio")} />
                      <Label>Logomarca do relatório</Label>
                      <div className="mt-2 flex aspect-[4/3] w-full max-w-[170px] items-center justify-center overflow-hidden rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)]">
                        {logomarcaRelatorioAtual ? (
                          <img
                            src={resolverUrlArquivo(logomarcaRelatorioAtual)}
                            alt="Logomarca do relatório"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="px-3 text-center text-xs text-[var(--g3-muted)]">Sem logomarca</span>
                        )}
                      </div>
                      <input
                        ref={inputLogomarcaRelatorioRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void carregarLogomarca("logomarca_relatorio", event)}
                      />
                      <div className="mt-2 flex w-full max-w-[170px] gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => inputLogomarcaRelatorioRef.current?.click()}
                        >
                          <Upload className="mr-1.5 h-3.5 w-3.5" />
                          Enviar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => removerLogomarca("logomarca_relatorio")}
                          disabled={!logomarcaRelatorioAtual}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Remover
                        </Button>
                      </div>
                    </div>

                    <div className="sm:col-span-2 xl:col-span-12">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <Checkbox {...register("unidade_principal")} checked={!!watch("unidade_principal")} />
                        Unidade principal
                      </label>
                    </div>
                  </section>
                )}

                {abaAtiva === "contato" && (
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                    <div className="xl:col-span-4">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input id="telefone" {...register("telefone")} placeholder="(00) 00000-0000" />
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" {...register("email")} placeholder="contato@dominio.com" />
                      {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="site">Site</Label>
                      <Input id="site" {...register("site")} placeholder="https://..." />
                    </div>

                    <div className="sm:col-span-2 xl:col-span-12">
                      <MensagemAcoesRapidas
                        titulo="Mensagens da instituição"
                        destinatarioTipo="INSTITUICAO"
                        destinatario={{
                          id: unidadeSelecionadaId,
                          nome: nomeFantasiaAtual.trim() || undefined,
                          email: emailAtual.trim() || undefined,
                          telefone: telefoneAtual.trim() || undefined,
                          documento: somenteDigitos(cnpjAtual) || undefined,
                          detalhe: cidadeAtual && estadoAtual ? `${cidadeAtual} / ${estadoAtual}` : cidadeAtual || undefined
                        }}
                        contextoExtra={{ unidadeId: unidadeSelecionadaId }}
                        onFeedback={({ tipo, texto }) =>
                          setMensagem({
                            tipo: tipo === "sucesso" ? "sucesso" : "erro",
                            texto
                          })
                        }
                      />
                    </div>

                    <div className="sm:col-span-2 xl:col-span-6">
                      <Label htmlFor="horario_funcionamento">Horário de funcionamento</Label>
                      <Input
                        id="horario_funcionamento"
                        {...register("horario_funcionamento")}
                        onBlurCapture={() => aplicarFormatacaoCampo("horario_funcionamento")}
                        placeholder="08:00 às 18:00"
                      />
                    </div>

                    <div className="sm:col-span-2 xl:col-span-12">
                      <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] p-3">
                        <h4 className="text-sm font-semibold text-[var(--g3-active)]">Validação de ponto</h4>
                        <p className="mt-1 text-xs text-[var(--g3-muted)]">
                          Configure as regras de registro de ponto para esta unidade.
                        </p>
                      </div>
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="modo_validacao_ponto">Modo de validação do ponto</Label>
                      <Select id="modo_validacao_ponto" {...register("modo_validacao_ponto")}>
                        {modosValidacaoPontoOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="raio_ponto_metros">Raio permitido (metros)</Label>
                      <Input
                        id="raio_ponto_metros"
                        type="number"
                        min={1}
                        step={1}
                        {...register("raio_ponto_metros", {
                          setValueAs: (value) => (value === "" ? undefined : Number(value))
                        })}
                        placeholder="100"
                      />
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="accuracy_max_ponto_metros">Precisão máxima GPS (metros)</Label>
                      <Input
                        id="accuracy_max_ponto_metros"
                        type="number"
                        min={1}
                        step={1}
                        {...register("accuracy_max_ponto_metros", {
                          setValueAs: (value) => (value === "" ? undefined : Number(value))
                        })}
                        placeholder="80"
                      />
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="ip_validacao_ponto">IP fixo permitido</Label>
                      <Input
                        id="ip_validacao_ponto"
                        {...register("ip_validacao_ponto")}
                        placeholder="200.200.200.10"
                      />
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="ips_publicos_ponto">IPs públicos permitidos</Label>
                      <Input
                        id="ips_publicos_ponto"
                        {...register("ips_publicos_ponto")}
                        placeholder="200.200.200.10; 200.200.200.11"
                      />
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="redes_locais_ponto">Redes locais permitidas (CIDR)</Label>
                      <Input
                        id="redes_locais_ponto"
                        {...register("redes_locais_ponto")}
                        placeholder="192.168.0.0/24; 10.0.0.0/8"
                      />
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="ping_timeout_ms">Timeout de verificação (ms)</Label>
                      <Input
                        id="ping_timeout_ms"
                        type="number"
                        min={500}
                        step={100}
                        {...register("ping_timeout_ms", {
                          setValueAs: (value) => (value === "" ? undefined : Number(value))
                        })}
                        placeholder="2000"
                      />
                    </div>
                  </section>
                )}

                {abaAtiva === "endereco" && (
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                    <div className="xl:col-span-3">
                      <Label htmlFor="cep">CEP</Label>
                      <Input id="cep" {...register("cep")} placeholder="00000-000" />
                      {errors.cep && <p className="mt-1 text-xs text-red-600">{errors.cep.message}</p>}
                      {carregandoCep && <p className="mt-1 text-xs text-slate-500">Consultando CEP...</p>}
                    </div>

                    <div className="xl:col-span-6">
                      <Label htmlFor="logradouro">Logradouro</Label>
                      <Input
                        id="logradouro"
                        {...register("logradouro")}
                        onBlurCapture={() => aplicarFormatacaoCampo("logradouro")}
                      />
                    </div>

                    <div className="xl:col-span-3">
                      <Label htmlFor="numero">Número</Label>
                      <Input id="numero" {...register("numero")} />
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input
                        id="complemento"
                        {...register("complemento")}
                        onBlurCapture={() => aplicarFormatacaoCampo("complemento")}
                      />
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input
                        id="bairro"
                        {...register("bairro")}
                        onBlurCapture={() => aplicarFormatacaoCampo("bairro")}
                      />
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="ponto_referencia">Ponto de referência</Label>
                      <Input
                        id="ponto_referencia"
                        {...register("ponto_referencia")}
                        onBlurCapture={() => aplicarFormatacaoCampo("ponto_referencia")}
                      />
                    </div>

                    <div className="xl:col-span-4">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        {...register("cidade")}
                        onBlurCapture={() => aplicarFormatacaoCampo("cidade")}
                      />
                    </div>

                    <div className="xl:col-span-2">
                      <Label htmlFor="estado">Estado (UF)</Label>
                      <Input id="estado" maxLength={2} {...register("estado")} />
                    </div>

                    <div className="xl:col-span-3">
                      <Label htmlFor="zona">Zona</Label>
                      <Input
                        id="zona"
                        {...register("zona")}
                        onBlurCapture={() => aplicarFormatacaoCampo("zona")}
                        placeholder="Urbana, rural..."
                      />
                    </div>

                    <div className="xl:col-span-3">
                      <Label htmlFor="subzona">Subzona</Label>
                      <Input
                        id="subzona"
                        {...register("subzona")}
                        onBlurCapture={() => aplicarFormatacaoCampo("subzona")}
                        placeholder="Norte, Sul..."
                      />
                    </div>

                    <div className="xl:col-span-3">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input id="latitude" {...register("latitude")} placeholder="-00.000000" />
                    </div>

                    <div className="xl:col-span-3">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input id="longitude" {...register("longitude")} placeholder="-00.000000" />
                    </div>

                    <div className="sm:col-span-2 xl:col-span-12">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={abrirEnderecoNoGoogleMaps}
                        disabled={!possuiEnderecoParaMapa}
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Ver no Google Maps
                      </Button>
                    </div>
                  </section>
                )}

                {abaAtiva === "diretoria" && (
                  <section className="space-y-3">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          appendDiretoria({
                            nome_completo: "",
                            documento: "",
                            funcao: "",
                            mandato_inicio: "",
                            mandato_fim: ""
                          })
                        }
                      >
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Adicionar membro
                      </Button>
                    </div>

                    {diretoriaFields.length === 0 ? (
                      <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        Nenhum membro de diretoria adicionado.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {diretoriaFields.map((field, indice) => (
                          <article
                            key={field.id}
                            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-slate-900">
                                Membro {indice + 1}
                              </h4>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => removerDiretoria(indice)}
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                Remover
                              </Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                              <div className="sm:col-span-2 xl:col-span-5">
                                <Label htmlFor={`diretoria_nome_${indice}`}>Nome completo*</Label>
                                <Input
                                  id={`diretoria_nome_${indice}`}
                                  {...register(`diretoria.${indice}.nome_completo`)}
                                  onBlurCapture={() => aplicarFormatacaoDiretoria(indice, "nome_completo")}
                                />
                              </div>

                              <div className="xl:col-span-3">
                                <Label htmlFor={`diretoria_documento_${indice}`}>Documento*</Label>
                                <Input
                                  id={`diretoria_documento_${indice}`}
                                  {...register(`diretoria.${indice}.documento`)}
                                />
                              </div>

                              <div className="xl:col-span-4">
                                <Label htmlFor={`diretoria_funcao_${indice}`}>Função*</Label>
                                <Input
                                  id={`diretoria_funcao_${indice}`}
                                  {...register(`diretoria.${indice}.funcao`)}
                                  onBlurCapture={() => aplicarFormatacaoDiretoria(indice, "funcao")}
                                />
                              </div>

                              <div className="xl:col-span-3">
                                <Label htmlFor={`diretoria_mandato_inicio_${indice}`}>Mandato início</Label>
                                <Input
                                  id={`diretoria_mandato_inicio_${indice}`}
                                  {...register(`diretoria.${indice}.mandato_inicio`)}
                                  placeholder="MM/AAAA"
                                />
                              </div>

                              <div className="xl:col-span-3">
                                <Label htmlFor={`diretoria_mandato_fim_${indice}`}>Mandato fim</Label>
                                <Input
                                  id={`diretoria_mandato_fim_${indice}`}
                                  {...register(`diretoria.${indice}.mandato_fim`)}
                                  placeholder="MM/AAAA"
                                />
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {abaAtiva === "salas" && (
                  <section className="space-y-3">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => appendSala({ nome: "" })}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Adicionar sala
                      </Button>
                    </div>

                    {salasFields.length === 0 ? (
                      <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        Nenhuma sala ou auditório cadastrado.
                      </p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-700">
                            <tr>
                              <th className="w-16 px-3 py-2 font-semibold">#</th>
                              <th className="px-3 py-2 font-semibold">Nome da sala ou auditório</th>
                              <th className="w-40 px-3 py-2 text-right font-semibold">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salasFields.map((field, indice) => (
                              <tr
                                key={field.id}
                                className={indice % 2 === 0 ? "bg-white" : "bg-emerald-50/30"}
                              >
                                <td className="px-3 py-2 text-slate-600">{indice + 1}</td>
                                <td className="px-3 py-2">
                                  <Input
                                    id={`sala_nome_${indice}`}
                                    {...register(`salas.${indice}.nome`)}
                                    onBlurCapture={() => aplicarFormatacaoSala(indice)}
                                    placeholder="Ex.: Sala 01, Auditório Principal"
                                  />
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    onClick={() => removerSala(indice)}
                                  >
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                    Remover
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                )}

                {abaAtiva === "observacoes" && (
                  <section className="space-y-3">
                    <div>
                      <Label htmlFor="observacoes">Observações</Label>
                      <Textarea
                        id="observacoes"
                        {...register("observacoes")}
                        onBlurCapture={() => aplicarFormatacaoCampo("observacoes")}
                        className="min-h-[180px]"
                      />
                    </div>
                  </section>
                )}
              </form>
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
              <p className="text-sm text-slate-700">Salvo com sucesso</p>
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
          onClick={() => {
            if (!removerMutation.isPending) setPopupExcluirAberto(false);
          }}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setPopupExcluirAberto(false)}
                disabled={removerMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void confirmarExclusao()}
                disabled={removerMutation.isPending}
              >
                {removerMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

