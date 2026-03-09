import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Clock3,
  Gift,
  LayoutDashboard,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  UserRound,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  doacaoRealizadaDefaultValues,
  doacaoRealizadaFormSchema,
  situacaoDoacaoRealizadaOptions,
  type DoacaoRealizadaFormInput,
  type DoacaoRealizadaFormValues
} from "@/features/doacoes-realizadas/doacao-realizada.schema";
import {
  useDoacaoRealizada,
  useDoacoesRealizadas,
  useRemoverDoacaoRealizada,
  useSalvarDoacaoRealizada
} from "@/features/doacoes-realizadas/use-doacoes-realizadas";
import {
  useDoacoesPlanejadas,
  useRemoverDoacaoPlanejada,
  useSalvarDoacaoPlanejada
} from "@/features/doacoes-realizadas/use-doacoes-planejadas";
import { doacoesRealizadasService } from "@/services/doacoes-realizadas.service";
import { reportsService } from "@/services/reports.service";
import { abrirRelatorioPdf } from "@/lib/report-utils";
import { formatarTextoPorCampo } from "@/lib/text-formatter";
import { mapaCamposTextoDoacaoRealizadaForm } from "@/lib/text-format-config";
import {
  classeBotaoAbaLateral,
  classeNumeroAbaLateral,
  classesTelaPadraoBeneficiario,
  ordemAcoesCrudPadrao
} from "@/lib/tela-padrao-beneficiario";
import { useAuth } from "@/hooks/use-auth";
import type { DoacaoPlanejada, DoacaoPlanejadaFiltro } from "@/types/doacao-planejada";
import type { DoacaoRealizada, DoacaoRealizadaFiltro, DoacaoRealizadaItem } from "@/types/doacao-realizada";

const abas = [
  { id: "identificacao", label: "Identificação", icon: UserRound },
  { id: "historico", label: "Histórico de doações", icon: ClipboardList },
  { id: "planejamento", label: "Doações a realizar", icon: Clock3 },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard }
] as const;

type AbaId = (typeof abas)[number]["id"];

type AcaoCrud = {
  label: (typeof ordemAcoesCrudPadrao)[number];
  icon: LucideIcon;
  onClick: () => void;
  variant: "default" | "outline" | "danger" | "ghost";
  disabled?: boolean;
};

type PopupState = {
  tipo: "sucesso" | "erro" | "aviso";
  titulo: string;
  texto: string;
};

type PlanoForm = {
  id_doacao_planejada?: string;
  item_id: string;
  quantidade: number;
  data_prevista: string;
  prioridade: string;
  status: string;
  observacoes?: string;
  motivo_cancelamento?: string;
};

const planoInicial: PlanoForm = {
  item_id: "",
  quantidade: 1,
  data_prevista: new Date().toISOString().slice(0, 10),
  prioridade: "Média",
  status: "Pendente",
  observacoes: "",
  motivo_cancelamento: ""
};

function PopupMensagem({ popup, onClose }: { popup: PopupState; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className={`text-base font-semibold ${popup.tipo === "erro" ? "text-rose-700" : "text-emerald-800"}`}>
            {popup.titulo}
          </h3>
        </div>
        <div className="px-5 py-4"><p className="text-sm text-slate-700">{popup.texto}</p></div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-3"><Button type="button" onClick={onClose}>OK</Button></div>
      </div>
    </div>
  );
}

function paraTexto(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  const texto = valor.trim();
  return texto.length ? texto : undefined;
}

export function DoacoesRealizadasPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [abaAtiva, setAbaAtiva] = useState<AbaId>("identificacao");
  const [idSelecionado, setIdSelecionado] = useState<string>();
  const [snapshot, setSnapshot] = useState<DoacaoRealizadaFormValues | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [filtroDraft, setFiltroDraft] = useState<DoacaoRealizadaFiltro>({
    beneficiario_nome: "",
    tipo_doacao: "",
    situacao: "",
    data_inicial: "",
    data_final: ""
  });
  const [filtros, setFiltros] = useState<DoacaoRealizadaFiltro>(filtroDraft);
  const [filtrosPlanejados, setFiltrosPlanejados] = useState<DoacaoPlanejadaFiltro>({});
  const [itens, setItens] = useState<DoacaoRealizadaItem[]>([]);
  const [novoItem, setNovoItem] = useState<DoacaoRealizadaItem>({ item_id: "", quantidade: 1 });
  const [termoBeneficiario, setTermoBeneficiario] = useState("");
  const [termoFamilia, setTermoFamilia] = useState("");
  const [termoItem, setTermoItem] = useState("");
  const [plano, setPlano] = useState<PlanoForm>(planoInicial);
  const [planoSelecionado, setPlanoSelecionado] = useState<string>();

  const { data: listaData, isLoading: carregandoLista } = useDoacoesRealizadas(filtros);
  const { data: detalheData } = useDoacaoRealizada(idSelecionado);
  const { data: planejadasData, isLoading: carregandoPlanejadas } = useDoacoesPlanejadas(filtrosPlanejados);

  const salvarMutation = useSalvarDoacaoRealizada();
  const removerMutation = useRemoverDoacaoRealizada();
  const salvarPlanejadaMutation = useSalvarDoacaoPlanejada();
  const removerPlanejadaMutation = useRemoverDoacaoPlanejada();

  const { data: beneficiariosData } = useQuery({
    queryKey: ["doacoes-realizadas", "beneficiarios", termoBeneficiario],
    queryFn: () => doacoesRealizadasService.listarBeneficiarios(termoBeneficiario),
    enabled: termoBeneficiario.trim().length >= 2
  });

  const { data: familiasData } = useQuery({
    queryKey: ["doacoes-realizadas", "familias", termoFamilia],
    queryFn: () => doacoesRealizadasService.listarFamilias(termoFamilia),
    enabled: termoFamilia.trim().length >= 2
  });

  const { data: itensData } = useQuery({
    queryKey: ["doacoes-realizadas", "itens", termoItem],
    queryFn: () => doacoesRealizadasService.listarItensEstoque(termoItem),
    enabled: termoItem.trim().length >= 2
  });

  const {
    register,
    reset,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors }
  } = useForm<DoacaoRealizadaFormInput, unknown, DoacaoRealizadaFormValues>({
    resolver: zodResolver(doacaoRealizadaFormSchema),
    defaultValues: doacaoRealizadaDefaultValues as DoacaoRealizadaFormInput
  });

  const doacoes = listaData?.doacoes ?? [];
  const planejadas = planejadasData?.doacoes ?? [];
  const beneficiarios = beneficiariosData?.beneficiarios ?? [];
  const familias = familiasData?.familias ?? [];
  const itensCatalogo = itensData?.itens ?? [];

  useEffect(() => {
    if (!detalheData?.doacao) return;
    const formValues: DoacaoRealizadaFormValues = {
      ...doacaoRealizadaDefaultValues,
      ...detalheData.doacao,
      id_doacao_realizada: detalheData.doacao.id_doacao_realizada,
      beneficiario_id: detalheData.doacao.beneficiario_id ?? "",
      vinculo_familiar_id: detalheData.doacao.vinculo_familiar_id ?? "",
      responsavel: detalheData.doacao.responsavel ?? "",
      observacoes: detalheData.doacao.observacoes ?? ""
    };
    reset(formValues);
    setSnapshot(formValues);
    setItens(detalheData.doacao.itens ?? []);
    setAbaAtiva("identificacao");
  }, [detalheData, reset]);

  const painel = useMemo(() => {
    const totalDoacoes = doacoes.length;
    const totalItens = doacoes.reduce((soma, item) => soma + (item.total_itens ?? item.itens.length ?? 0), 0);
    const pendentes = planejadas.filter((item) => {
      const status = (item.status ?? "").toLowerCase();
      return status !== "entregue" && status !== "cancelada";
    });
    const totalPendentes = pendentes.length;
    const totalItensPendentes = pendentes.reduce((soma, item) => soma + item.quantidade, 0);
    return { totalDoacoes, totalItens, totalPendentes, totalItensPendentes };
  }, [doacoes, planejadas]);

  function syncFiltroPlanejadoComCadastro() {
    setFiltrosPlanejados({
      beneficiario_id: paraTexto(getValues("beneficiario_id")),
      vinculo_familiar_id: paraTexto(getValues("vinculo_familiar_id"))
    });
  }

  function buscar() {
    setFiltros({ ...filtroDraft });
    syncFiltroPlanejadoComCadastro();
    if (abaAtiva === "identificacao") {
      setAbaAtiva("historico");
    }
  }

  function novo() {
    setIdSelecionado(undefined);
    reset(doacaoRealizadaDefaultValues);
    setItens([]);
    setNovoItem({ item_id: "", quantidade: 1 });
    setPlano(planoInicial);
    setPlanoSelecionado(undefined);
    setSnapshot(null);
    setAbaAtiva("identificacao");
  }

  function cancelar() {
    if (abaAtiva === "planejamento") {
      setPlano(planoInicial);
      setPlanoSelecionado(undefined);
      return;
    }
    reset(snapshot ?? doacaoRealizadaDefaultValues);
    setItens(detalheData?.doacao?.itens ?? []);
  }

  async function excluir() {
    if (abaAtiva === "planejamento") {
      if (!planoSelecionado) {
        setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Selecione um planejamento para excluir." });
        return;
      }
      try {
        await removerPlanejadaMutation.mutateAsync(planoSelecionado);
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Planejamento excluído com sucesso." });
        setPlano(planoInicial);
        setPlanoSelecionado(undefined);
      } catch (error: any) {
        setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível excluir o planejamento." });
      }
      return;
    }

    const id = getValues("id_doacao_realizada");
    if (!id) {
      setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Selecione uma doação para excluir." });
      return;
    }
    try {
      await removerMutation.mutateAsync(id);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Doação excluída com sucesso." });
      novo();
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível excluir." });
    }
  }

  async function imprimir() {
    try {
      const blob = await reportsService.gerarRelacaoDoacoesRealizadas({ ...filtros, usuarioEmissor: usuario?.nomeUsuario });
      abrirRelatorioPdf(blob);
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.message ?? "Não foi possível gerar o relatório." });
    }
  }

  function fechar() {
    navigate("/dashboard/visao-geral");
  }

  function adicionarItem() {
    if (!novoItem.item_id || novoItem.quantidade < 1) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Selecione um item e informe a quantidade." });
      return;
    }
    if (itens.some((item) => String(item.item_id) === String(novoItem.item_id))) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Item já adicionado na doação." });
      return;
    }
    const catalogo = itensCatalogo.find((item) => String(item.id) === String(novoItem.item_id));
    setItens((atual) => [
      ...atual,
      {
        item_id: novoItem.item_id,
        codigo_item: catalogo?.codigo,
        descricao_item: catalogo?.descricao,
        unidade_item: catalogo?.unidade,
        quantidade: novoItem.quantidade,
        observacoes: novoItem.observacoes
      }
    ]);
    setNovoItem({ item_id: "", quantidade: 1 });
  }

  async function salvarDoacao(values: DoacaoRealizadaFormValues) {
    try {
      const payload: DoacaoRealizada = {
        ...values,
        beneficiario_id: paraTexto(values.beneficiario_id),
        vinculo_familiar_id: paraTexto(values.vinculo_familiar_id),
        responsavel: formatarTextoPorCampo("responsavel", values.responsavel, mapaCamposTextoDoacaoRealizadaForm) as string,
        observacoes: formatarTextoPorCampo("observacoes", values.observacoes, mapaCamposTextoDoacaoRealizadaForm) as string,
        itens
      };
      const response = await salvarMutation.mutateAsync(payload);
      setValue("id_doacao_realizada", response.doacao.id_doacao_realizada ?? "");
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Doação salva com sucesso." });
      setAbaAtiva("historico");
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar a doação." });
    }
  }

  async function salvarPlanejamento() {
    const beneficiarioId = paraTexto(getValues("beneficiario_id"));
    const vinculoId = paraTexto(getValues("vinculo_familiar_id"));
    if (!beneficiarioId && !vinculoId) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Selecione beneficiário ou família na aba Identificação." });
      return;
    }
    if (!plano.item_id || plano.quantidade < 1) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Selecione item e quantidade para o planejamento." });
      return;
    }
    try {
      const payload: DoacaoPlanejada = {
        id_doacao_planejada: plano.id_doacao_planejada,
        beneficiario_id: beneficiarioId || undefined,
        vinculo_familiar_id: vinculoId || undefined,
        item_id: plano.item_id,
        quantidade: plano.quantidade,
        data_prevista: plano.data_prevista,
        prioridade: plano.prioridade,
        status: plano.status,
        observacoes: plano.observacoes
      };
      const response = await salvarPlanejadaMutation.mutateAsync(payload);
      setPlanoSelecionado(response.doacao.id_doacao_planejada);
      setPlano((atual) => ({ ...atual, id_doacao_planejada: response.doacao.id_doacao_planejada }));
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Planejamento salvo com sucesso." });
      syncFiltroPlanejadoComCadastro();
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar o planejamento." });
    }
  }

  async function realizarPlanejada(item: DoacaoPlanejada) {
    try {
      await salvarMutation.mutateAsync({
        beneficiario_id: item.beneficiario_id,
        vinculo_familiar_id: item.vinculo_familiar_id,
        tipo_doacao: item.item_descricao ? `Doação de ${item.item_descricao}` : "Doação planejada",
        situacao: "Entregue",
        responsavel: paraTexto(getValues("responsavel")) || usuario?.nome || usuario?.nomeUsuario,
        observacoes: item.observacoes,
        data_doacao: new Date().toISOString().slice(0, 10),
        itens: [{ item_id: item.item_id, quantidade: item.quantidade, observacoes: item.observacoes }]
      });
      await salvarPlanejadaMutation.mutateAsync({ ...item, status: "Entregue" });
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Doação planejada registrada como entregue." });
      setAbaAtiva("historico");
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível realizar a doação planejada." });
    }
  }

  const acoes: AcaoCrud[] = [
    { label: "Buscar", icon: Search, onClick: buscar, variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default" },
    {
      label: "Salvar",
      icon: Save,
      onClick: () => {
        if (abaAtiva === "planejamento") {
          void salvarPlanejamento();
          return;
        }
        void handleSubmit(salvarDoacao)();
      },
      variant: "default",
      disabled: salvarMutation.isPending || salvarPlanejadaMutation.isPending
    },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline" },
    { label: "Excluir", icon: Trash2, onClick: () => void excluir(), variant: "danger" },
    { label: "Imprimir", icon: Printer, onClick: () => void imprimir(), variant: "outline" },
    { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
  ];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-4 lg:px-8">
      <div className={classesTelaPadraoBeneficiario.container}>
        <Card className={classesTelaPadraoBeneficiario.barraAcoes}>
          <CardContent className="p-0">
            <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
              {ordemAcoesCrudPadrao.map((ordem) => {
                const acao = acoes.find((item) => item.label === ordem);
                if (!acao) return null;
                const Icone = acao.icon;
                return (
                  <Button key={acao.label} type="button" variant={acao.variant} onClick={acao.onClick} disabled={acao.disabled} className={`${classesTelaPadraoBeneficiario.botaoAcao} h-8 px-3 py-1 text-xs`}>
                    <Icone className="h-3.5 w-3.5" />
                    {acao.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className={classesTelaPadraoBeneficiario.gradePrincipal}>
          <Card className={classesTelaPadraoBeneficiario.cardAbas}>
            <CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>
              {abas.map((aba, index) => (
                <button key={aba.id} type="button" className={classeBotaoAbaLateral(abaAtiva === aba.id)} onClick={() => setAbaAtiva(aba.id)}>
                  <span className={classeNumeroAbaLateral(abaAtiva === aba.id)}>{index + 1}</span>
                  <span className="truncate">{aba.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
            <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
              <CardTitle className={classesTelaPadraoBeneficiario.tituloAba}><Gift className="h-4 w-4" /><span className={classesTelaPadraoBeneficiario.tituloAbaTexto}>{abas.find((item) => item.id === abaAtiva)?.label}</span></CardTitle>
              <span className="rounded-full border border-[var(--g3-border)] bg-[var(--g3-card)] px-2 py-1 text-xs text-[var(--g3-muted)]">Código: {getValues("id_doacao_realizada") ?? "---"}</span>
            </CardHeader>

            <CardContent className="space-y-4 p-3">
              {abaAtiva === "identificacao" && (
                <div className="space-y-4">
                  <div className="grid gap-3 xl:grid-cols-2">
                    <div className="space-y-1"><Label>Buscar beneficiário</Label><Input value={termoBeneficiario} onChange={(e) => setTermoBeneficiario(e.target.value)} />{beneficiarios.map((item) => <button key={item.id} type="button" className="block w-full rounded border border-[var(--g3-border)] px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]" onClick={() => { setValue("beneficiario_id", item.id, { shouldDirty: true, shouldValidate: true }); setValue("vinculo_familiar_id", "", { shouldDirty: true, shouldValidate: false }); syncFiltroPlanejadoComCadastro(); }}>{item.nome_completo}</button>)}</div>
                    <div className="space-y-1"><Label>Buscar família</Label><Input value={termoFamilia} onChange={(e) => setTermoFamilia(e.target.value)} />{familias.map((item) => <button key={item.id} type="button" className="block w-full rounded border border-[var(--g3-border)] px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]" onClick={() => { setValue("vinculo_familiar_id", item.id, { shouldDirty: true, shouldValidate: true }); setValue("beneficiario_id", "", { shouldDirty: true, shouldValidate: false }); syncFiltroPlanejadoComCadastro(); }}>{item.nome_familia}</button>)}</div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1"><Label>Tipo de doação *</Label><Input {...register("tipo_doacao")} />{errors.tipo_doacao && <p className="text-xs text-rose-600">{errors.tipo_doacao.message}</p>}</div>
                    <div className="space-y-1"><Label>Situação *</Label><Select {...register("situacao")}>{situacaoDoacaoRealizadaOptions.map((item) => <option key={item} value={item}>{item}</option>)}</Select></div>
                    <div className="space-y-1"><Label>Data da doação *</Label><Input type="date" {...register("data_doacao")} />{errors.data_doacao && <p className="text-xs text-rose-600">{errors.data_doacao.message}</p>}</div>
                    <div className="space-y-1"><Label>Responsável</Label><Input {...register("responsavel")} /></div>
                  </div>
                  <div className="space-y-1"><Label>Observações</Label><Textarea rows={3} {...register("observacoes")} /></div>
                  <div className="grid gap-3 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-6">
                    <div className="space-y-1 md:col-span-2"><Label>Buscar item</Label><Input value={termoItem} onChange={(e) => setTermoItem(e.target.value)} />{itensCatalogo.map((item) => <button key={item.id} type="button" className="block w-full rounded border border-[var(--g3-border)] px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]" onClick={() => setNovoItem((atual) => ({ ...atual, item_id: String(item.id), codigo_item: item.codigo, descricao_item: item.descricao, unidade_item: item.unidade }))}>{item.codigo} - {item.descricao}</button>)}</div>
                    <div className="space-y-1"><Label>Quantidade</Label><Input type="number" min={1} value={novoItem.quantidade ?? 1} onChange={(e) => setNovoItem((atual) => ({ ...atual, quantidade: Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label>Observações</Label><Input value={novoItem.observacoes ?? ""} onChange={(e) => setNovoItem((atual) => ({ ...atual, observacoes: e.target.value }))} /></div>
                    <div className="flex items-end"><Button type="button" className="w-full" onClick={adicionarItem}><Plus className="h-4 w-4" />Adicionar</Button></div>
                  </div>
                </div>
              )}

              {abaAtiva === "historico" && (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-1"><Label>Beneficiário/Família</Label><Input value={filtroDraft.beneficiario_nome ?? ""} onChange={(e) => setFiltroDraft((a) => ({ ...a, beneficiario_nome: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Tipo</Label><Input value={filtroDraft.tipo_doacao ?? ""} onChange={(e) => setFiltroDraft((a) => ({ ...a, tipo_doacao: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Situação</Label><Input value={filtroDraft.situacao ?? ""} onChange={(e) => setFiltroDraft((a) => ({ ...a, situacao: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Data inicial</Label><Input type="date" value={filtroDraft.data_inicial ?? ""} onChange={(e) => setFiltroDraft((a) => ({ ...a, data_inicial: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Data final</Label><Input type="date" value={filtroDraft.data_final ?? ""} onChange={(e) => setFiltroDraft((a) => ({ ...a, data_final: e.target.value }))} /></div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Beneficiário/Família</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Situação</th><th className="px-3 py-2 text-left">Itens</th></tr></thead><tbody>{carregandoLista ? <tr><td className="px-3 py-4 text-center" colSpan={5}>Carregando...</td></tr> : doacoes.length ? doacoes.map((item, index) => <tr key={item.id_doacao_realizada} onClick={() => item.id_doacao_realizada && setIdSelecionado(item.id_doacao_realizada)} className={`cursor-pointer border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.data_doacao}</td><td className="px-3 py-2">{item.beneficiario_nome || item.familia_nome || "---"}</td><td className="px-3 py-2">{item.tipo_doacao}</td><td className="px-3 py-2">{item.situacao}</td><td className="px-3 py-2">{item.total_itens ?? item.itens.length}</td></tr>) : <tr><td className="px-3 py-4 text-center" colSpan={5}>Nenhuma doação encontrada.</td></tr>}</tbody></table></div>
                </div>
              )}

              {abaAtiva === "planejamento" && (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-1 xl:col-span-2"><Label>Item planejado</Label><Input value={termoItem} onChange={(e) => setTermoItem(e.target.value)} />{itensCatalogo.map((item) => <button key={item.id} type="button" className="block w-full rounded border border-[var(--g3-border)] px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]" onClick={() => setPlano((atual) => ({ ...atual, item_id: String(item.id) }))}>{item.codigo} - {item.descricao}</button>)}</div>
                    <div className="space-y-1"><Label>Quantidade</Label><Input type="number" min={1} value={plano.quantidade} onChange={(e) => setPlano((atual) => ({ ...atual, quantidade: Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label>Data prevista</Label><Input type="date" value={plano.data_prevista} onChange={(e) => setPlano((atual) => ({ ...atual, data_prevista: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Prioridade</Label><Select value={plano.prioridade} onChange={(e) => setPlano((atual) => ({ ...atual, prioridade: e.target.value }))}><option value="Baixa">Baixa</option><option value="Média">Média</option><option value="Alta">Alta</option></Select></div>
                    <div className="space-y-1"><Label>Status</Label><Select value={plano.status} onChange={(e) => setPlano((atual) => ({ ...atual, status: e.target.value }))}><option value="Pendente">Pendente</option><option value="Em separação">Em separação</option><option value="Pronto">Pronto</option><option value="Entregue">Entregue</option><option value="Cancelada">Cancelada</option></Select></div>
                    <div className="space-y-1 xl:col-span-2"><Label>Observações</Label><Input value={plano.observacoes ?? ""} onChange={(e) => setPlano((atual) => ({ ...atual, observacoes: e.target.value }))} /></div>
                  </div>
                  <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setPlano(planoInicial); setPlanoSelecionado(undefined); }}>Limpar</Button><Button type="button" onClick={() => void salvarPlanejamento()}>Salvar planejamento</Button></div>
                  <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Beneficiário/Família</th><th className="px-3 py-2 text-left">Previsto</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{carregandoPlanejadas ? <tr><td className="px-3 py-4 text-center" colSpan={5}>Carregando...</td></tr> : planejadas.length ? planejadas.map((item, index) => <tr key={item.id_doacao_planejada} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.item_descricao ?? item.item_codigo}</td><td className="px-3 py-2">{item.beneficiario_nome || item.familia_nome || "---"}</td><td className="px-3 py-2">{item.quantidade} em {item.data_prevista}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2 text-right"><div className="flex justify-end gap-1"><Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setPlanoSelecionado(item.id_doacao_planejada); setPlano({ id_doacao_planejada: item.id_doacao_planejada, item_id: item.item_id, quantidade: item.quantidade, data_prevista: item.data_prevista ?? planoInicial.data_prevista, prioridade: item.prioridade, status: item.status, observacoes: item.observacoes }); }}>Editar</Button><Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={() => void realizarPlanejada(item)}>Realizar</Button></div></td></tr>) : <tr><td className="px-3 py-4 text-center" colSpan={5}>Nenhum planejamento encontrado.</td></tr>}</tbody></table></div>
                </div>
              )}

              {abaAtiva === "dashboard" && (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <article className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"><p className="text-xs text-[var(--g3-muted)]">Doações entregues</p><p className="text-xl font-bold text-[var(--g3-active)]">{painel.totalDoacoes}</p></article>
                  <article className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"><p className="text-xs text-[var(--g3-muted)]">Itens entregues</p><p className="text-xl font-bold text-[var(--g3-active)]">{painel.totalItens}</p></article>
                  <article className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"><p className="text-xs text-[var(--g3-muted)]">Planejamentos pendentes</p><p className="text-xl font-bold text-[var(--g3-active)]">{painel.totalPendentes}</p></article>
                  <article className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"><p className="text-xs text-[var(--g3-muted)]">Itens pendentes</p><p className="text-xl font-bold text-[var(--g3-active)]">{painel.totalItensPendentes}</p></article>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {popup && <PopupMensagem popup={popup} onClose={() => setPopup(null)} />}
    </section>
  );
}
