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
import { parametrosSistemaService } from "@/services/parametros-sistema.service";
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
  texto?: string;
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

type ConfirmacaoCarenciaState = {
  payload: DoacaoRealizada;
  mensagemCarencia: string;
  mensagemSucesso: string;
  mensagemErroPadrao: string;
  onSuccess?: (response: { doacao: DoacaoRealizada }) => Promise<void> | void;
};

type ItemEstoque = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  estoque_atual: number;
};

const secaoTela = "Setor financeiro";
const tituloTela = "Doação realizada";

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

function montarRotuloItem(codigo?: string, descricao?: string) {
  const codigoLimpo = paraTexto(codigo);
  const descricaoLimpa = paraTexto(descricao);
  if (codigoLimpo && descricaoLimpa) {
    return `${codigoLimpo} - ${descricaoLimpa}`;
  }
  return descricaoLimpa ?? codigoLimpo ?? "";
}

function normalizarTextoBusca(valor?: string) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function correspondeBusca(termo: string, ...campos: Array<string | undefined>) {
  const termoNormalizado = normalizarTextoBusca(termo);
  if (!termoNormalizado) {
    return true;
  }

  const termoDigitos = termo.replace(/\D/g, "");
  return campos.some((campo) => {
    const valor = campo ?? "";
    return (
      normalizarTextoBusca(valor).includes(termoNormalizado) ||
      (termoDigitos.length > 0 && valor.replace(/\D/g, "").includes(termoDigitos))
    );
  });
}

function formatarDataComHifen(valor?: string) {
  const texto = paraTexto(valor);
  if (!texto) return "---";
  const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) {
    return `${matchIso[3]}-${matchIso[2]}-${matchIso[1]}`;
  }

  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) {
    return texto;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
    .format(data)
    .replaceAll("/", "-");
}

function extrairMensagemErroApi(error: any) {
  return error?.response?.data?.message ?? error?.message;
}

function erroExigeAutorizacaoCarencia(error: any) {
  const status = Number(error?.response?.status ?? 0);
  const mensagem = normalizarTextoBusca(extrairMensagemErroApi(error) ?? "");
  return status === 409 && mensagem.includes("carencia");
}

export function DoacoesRealizadasPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const isAdmin = (usuario?.permissoes ?? []).includes("ADMINISTRADOR");

  const [abaAtiva, setAbaAtiva] = useState<AbaId>("identificacao");
  const [idSelecionado, setIdSelecionado] = useState<string>();
  const [snapshot, setSnapshot] = useState<DoacaoRealizadaFormValues | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [confirmacaoCarencia, setConfirmacaoCarencia] =
    useState<ConfirmacaoCarenciaState | null>(null);
  const [senhaAdministrativa, setSenhaAdministrativa] = useState("");
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
  const [beneficiarioSelecionadoNome, setBeneficiarioSelecionadoNome] = useState("");
  const [familiaSelecionadaNome, setFamiliaSelecionadaNome] = useState("");
  const [termoItem, setTermoItem] = useState("");
  const [itemSelecionadoNome, setItemSelecionadoNome] = useState("");
  const [termoPlano, setTermoPlano] = useState("");
  const [itemPlanejadoSelecionadoNome, setItemPlanejadoSelecionadoNome] = useState("");
  const [plano, setPlano] = useState<PlanoForm>(planoInicial);
  const [planoSelecionado, setPlanoSelecionado] = useState<string>();

  const { data: listaData, isLoading: carregandoLista } = useDoacoesRealizadas(filtros);
  const { data: detalheData } = useDoacaoRealizada(idSelecionado);
  const { data: planejadasData, isLoading: carregandoPlanejadas } = useDoacoesPlanejadas(filtrosPlanejados);
  const { data: carenciaData } = useQuery({
    queryKey: ["configuracoes", "parametros", "carencia", "doacoes-realizadas"],
    queryFn: () => parametrosSistemaService.obterCarenciaDoacoesRealizadas()
  });

  const salvarMutation = useSalvarDoacaoRealizada();
  const removerMutation = useRemoverDoacaoRealizada();
  const salvarPlanejadaMutation = useSalvarDoacaoPlanejada();
  const removerPlanejadaMutation = useRemoverDoacaoPlanejada();
  const processandoAcoes =
    salvarMutation.isPending ||
    removerMutation.isPending ||
    salvarPlanejadaMutation.isPending ||
    removerPlanejadaMutation.isPending;
  const nomeResponsavelAtual =
    paraTexto(usuario?.nome) ??
    paraTexto(usuario?.nomeUsuario) ??
    "";
  const tempoCarenciaDias = Number(carenciaData?.tempoCarenciaDias ?? 0);
  const valoresIniciaisCadastro = useMemo<DoacaoRealizadaFormValues>(
    () => ({
      ...doacaoRealizadaDefaultValues,
      responsavel: nomeResponsavelAtual
    }),
    [nomeResponsavelAtual]
  );

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

  const { data: itensPlanejamentoData } = useQuery({
    queryKey: ["doacoes-realizadas", "itens-planejamento", termoPlano],
    queryFn: () => doacoesRealizadasService.listarItensEstoque(termoPlano),
    enabled: termoPlano.trim().length >= 2
  });

  const {
    register,
    reset,
    setValue,
    getValues,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<DoacaoRealizadaFormInput, unknown, DoacaoRealizadaFormValues>({
    resolver: zodResolver(doacaoRealizadaFormSchema),
    defaultValues: valoresIniciaisCadastro as DoacaoRealizadaFormInput
  });

  const beneficiarioSelecionadoId = paraTexto(watch("beneficiario_id")) ?? "";
  const familiaSelecionadaId = paraTexto(watch("vinculo_familiar_id")) ?? "";

  const doacoes = listaData?.doacoes ?? [];
  const planejadas = planejadasData?.doacoes ?? [];
  const beneficiariosEncontrados = beneficiariosData?.beneficiarios ?? [];
  const familiasEncontradas = familiasData?.familias ?? [];
  const itensEncontrados = (itensData?.itens ?? []) as ItemEstoque[];
  const itensPlanejamentoEncontrados = (itensPlanejamentoData?.itens ?? []) as ItemEstoque[];
  const buscaBeneficiarioBloqueada = Boolean(familiaSelecionadaId);
  const buscaFamiliaBloqueada = Boolean(beneficiarioSelecionadoId);
  const beneficiarios =
    termoBeneficiario.trim().length >= 2 &&
    !buscaBeneficiarioBloqueada &&
    (!beneficiarioSelecionadoId || termoBeneficiario.trim() !== beneficiarioSelecionadoNome.trim())
      ? beneficiariosEncontrados.filter((item) =>
          correspondeBusca(termoBeneficiario, item.nome_completo, item.codigo, item.cpf)
        )
      : [];
  const familias =
    termoFamilia.trim().length >= 2 &&
    !buscaFamiliaBloqueada &&
    (!familiaSelecionadaId || termoFamilia.trim() !== familiaSelecionadaNome.trim())
      ? familiasEncontradas.filter((item) => correspondeBusca(termoFamilia, item.nome_familia))
      : [];
  const itensCatalogo =
    termoItem.trim().length >= 2 && (!novoItem.item_id || termoItem.trim() !== itemSelecionadoNome.trim())
      ? itensEncontrados.filter((item) => correspondeBusca(termoItem, item.codigo, item.descricao))
      : [];
  const itensPlanejamentoCatalogo =
    termoPlano.trim().length >= 2 && (!plano.item_id || termoPlano.trim() !== itemPlanejadoSelecionadoNome.trim())
      ? itensPlanejamentoEncontrados.filter((item) => correspondeBusca(termoPlano, item.codigo, item.descricao))
      : [];

  useEffect(() => {
    if (!beneficiarioSelecionadoId) {
      if (termoBeneficiario && termoBeneficiario === beneficiarioSelecionadoNome) {
        setTermoBeneficiario("");
      }
      setBeneficiarioSelecionadoNome("");
      return;
    }

    const selecionado = beneficiariosEncontrados.find((item) => item.id === beneficiarioSelecionadoId);
    if (selecionado) {
      setBeneficiarioSelecionadoNome(selecionado.nome_completo);
      setTermoBeneficiario(selecionado.nome_completo);
    }
  }, [beneficiarioSelecionadoId, beneficiarioSelecionadoNome, beneficiariosEncontrados, termoBeneficiario]);

  useEffect(() => {
    if (!familiaSelecionadaId) {
      if (termoFamilia && termoFamilia === familiaSelecionadaNome) {
        setTermoFamilia("");
      }
      setFamiliaSelecionadaNome("");
      return;
    }

    const selecionada = familiasEncontradas.find((item) => item.id === familiaSelecionadaId);
    if (selecionada) {
      setFamiliaSelecionadaNome(selecionada.nome_familia);
      setTermoFamilia(selecionada.nome_familia);
    }
  }, [familiaSelecionadaId, familiaSelecionadaNome, familiasEncontradas, termoFamilia]);

  useEffect(() => {
    if (!beneficiarioSelecionadoId || !beneficiarioSelecionadoNome) {
      return;
    }

    if (termoBeneficiario !== beneficiarioSelecionadoNome) {
      setValue("beneficiario_id", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [beneficiarioSelecionadoId, beneficiarioSelecionadoNome, setValue, termoBeneficiario]);

  useEffect(() => {
    if (!familiaSelecionadaId || !familiaSelecionadaNome) {
      return;
    }

    if (termoFamilia !== familiaSelecionadaNome) {
      setValue("vinculo_familiar_id", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [familiaSelecionadaId, familiaSelecionadaNome, setValue, termoFamilia]);

  useEffect(() => {
    syncFiltroPlanejadoComCadastro({
      beneficiario_id: beneficiarioSelecionadoId ?? "",
      vinculo_familiar_id: familiaSelecionadaId ?? ""
    });
  }, [beneficiarioSelecionadoId, familiaSelecionadaId]);

  useEffect(() => {
    if (!nomeResponsavelAtual) {
      return;
    }

    const responsavelAtual = paraTexto(getValues("responsavel"));
    const doacaoSelecionadaId = paraTexto(getValues("id_doacao_realizada"));
    if (!doacaoSelecionadaId || !responsavelAtual) {
      setValue("responsavel", nomeResponsavelAtual, { shouldDirty: false, shouldValidate: true });
    }
  }, [getValues, nomeResponsavelAtual, setValue]);

  useEffect(() => {
    if (!detalheData?.doacao) return;
    const formValues: DoacaoRealizadaFormValues = {
      ...valoresIniciaisCadastro,
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
    setNovoItem({ item_id: "", quantidade: 1 });
    setTermoItem("");
    setItemSelecionadoNome("");
    setTermoPlano("");
    setItemPlanejadoSelecionadoNome("");
    setBeneficiarioSelecionadoNome(detalheData.doacao.beneficiario_nome ?? "");
    setFamiliaSelecionadaNome(detalheData.doacao.familia_nome ?? "");
    setTermoBeneficiario(detalheData.doacao.beneficiario_nome ?? "");
    setTermoFamilia(detalheData.doacao.familia_nome ?? "");
    syncFiltroPlanejadoComCadastro({
      beneficiario_id: detalheData.doacao.beneficiario_id ?? "",
      vinculo_familiar_id: detalheData.doacao.vinculo_familiar_id ?? ""
    });
    setAbaAtiva("identificacao");
  }, [detalheData, reset, valoresIniciaisCadastro]);

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

  function syncFiltroPlanejadoComCadastro(
    valores?: Partial<Pick<DoacaoRealizadaFormValues, "beneficiario_id" | "vinculo_familiar_id">>
  ) {
    setFiltrosPlanejados({
      beneficiario_id: paraTexto(valores?.beneficiario_id ?? getValues("beneficiario_id")),
      vinculo_familiar_id: paraTexto(valores?.vinculo_familiar_id ?? getValues("vinculo_familiar_id"))
    });
  }

  function limparBeneficiarioSelecionado() {
    setValue("beneficiario_id", "", { shouldDirty: true, shouldValidate: true });
    setBeneficiarioSelecionadoNome("");
    setTermoBeneficiario("");
    syncFiltroPlanejadoComCadastro({ beneficiario_id: "" });
  }

  function limparFamiliaSelecionada() {
    setValue("vinculo_familiar_id", "", { shouldDirty: true, shouldValidate: true });
    setFamiliaSelecionadaNome("");
    setTermoFamilia("");
    syncFiltroPlanejadoComCadastro({ vinculo_familiar_id: "" });
  }

  function alterarTermoBeneficiario(value: string) {
    setTermoBeneficiario(value);
    if (!beneficiarioSelecionadoId || value.trim() === beneficiarioSelecionadoNome.trim()) {
      return;
    }
    setValue("beneficiario_id", "", { shouldDirty: true, shouldValidate: true });
    syncFiltroPlanejadoComCadastro({ beneficiario_id: "" });
  }

  function alterarTermoFamilia(value: string) {
    setTermoFamilia(value);
    if (!familiaSelecionadaId || value.trim() === familiaSelecionadaNome.trim()) {
      return;
    }
    setValue("vinculo_familiar_id", "", { shouldDirty: true, shouldValidate: true });
    syncFiltroPlanejadoComCadastro({ vinculo_familiar_id: "" });
  }

  function selecionarBeneficiario(item: { id: string; nome_completo: string }) {
    setValue("beneficiario_id", item.id, { shouldDirty: true, shouldValidate: true });
    setBeneficiarioSelecionadoNome(item.nome_completo);
    setTermoBeneficiario(item.nome_completo);
    setValue("vinculo_familiar_id", "", { shouldDirty: true, shouldValidate: false });
    setFamiliaSelecionadaNome("");
    setTermoFamilia("");
    syncFiltroPlanejadoComCadastro({ beneficiario_id: item.id, vinculo_familiar_id: "" });
  }

  function selecionarFamilia(item: { id: string; nome_familia: string }) {
    setValue("vinculo_familiar_id", item.id, { shouldDirty: true, shouldValidate: true });
    setFamiliaSelecionadaNome(item.nome_familia);
    setTermoFamilia(item.nome_familia);
    setValue("beneficiario_id", "", { shouldDirty: true, shouldValidate: false });
    setBeneficiarioSelecionadoNome("");
    setTermoBeneficiario("");
    syncFiltroPlanejadoComCadastro({ beneficiario_id: "", vinculo_familiar_id: item.id });
  }

  function alterarTermoItem(value: string) {
    setTermoItem(value);
    if (!novoItem.item_id || value.trim() === itemSelecionadoNome.trim()) {
      return;
    }
    setNovoItem((atual) => ({
      ...atual,
      item_id: "",
      codigo_item: undefined,
      descricao_item: undefined,
      unidade_item: undefined
    }));
    setItemSelecionadoNome("");
  }

  function selecionarItem(item: ItemEstoque) {
    const rotulo = montarRotuloItem(item.codigo, item.descricao);
    setNovoItem((atual) => ({
      ...atual,
      item_id: String(item.id),
      codigo_item: item.codigo,
      descricao_item: item.descricao,
      unidade_item: item.unidade
    }));
    setItemSelecionadoNome(rotulo);
    setTermoItem(rotulo);
  }

  function removerItem(index: number) {
    setItens((atual) => atual.filter((_, itemIndex) => itemIndex !== index));
  }

  function alterarTermoPlano(value: string) {
    setTermoPlano(value);
    if (!plano.item_id || value.trim() === itemPlanejadoSelecionadoNome.trim()) {
      return;
    }
    setPlano((atual) => ({ ...atual, item_id: "" }));
    setItemPlanejadoSelecionadoNome("");
  }

  function selecionarItemPlanejado(item: ItemEstoque) {
    const rotulo = montarRotuloItem(item.codigo, item.descricao);
    setPlano((atual) => ({ ...atual, item_id: String(item.id) }));
    setItemPlanejadoSelecionadoNome(rotulo);
    setTermoPlano(rotulo);
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
    reset(valoresIniciaisCadastro);
    setItens([]);
    setNovoItem({ item_id: "", quantidade: 1 });
    setTermoItem("");
    setItemSelecionadoNome("");
    setTermoPlano("");
    setItemPlanejadoSelecionadoNome("");
    setBeneficiarioSelecionadoNome("");
    setFamiliaSelecionadaNome("");
    setTermoBeneficiario("");
    setTermoFamilia("");
    setPlano(planoInicial);
    setPlanoSelecionado(undefined);
    setSnapshot(null);
    setFiltrosPlanejados({});
    setAbaAtiva("identificacao");
  }

  function cancelar() {
    if (abaAtiva === "planejamento") {
      setPlano(planoInicial);
      setPlanoSelecionado(undefined);
      setTermoPlano("");
      setItemPlanejadoSelecionadoNome("");
      return;
    }
    reset(snapshot ?? valoresIniciaisCadastro);
    setItens(detalheData?.doacao?.itens ?? []);
    setNovoItem({ item_id: "", quantidade: 1 });
    setTermoItem("");
    setItemSelecionadoNome("");
    setTermoPlano("");
    setItemPlanejadoSelecionadoNome("");
    setTermoBeneficiario(detalheData?.doacao?.beneficiario_nome ?? "");
    setTermoFamilia(detalheData?.doacao?.familia_nome ?? "");
    setBeneficiarioSelecionadoNome(detalheData?.doacao?.beneficiario_nome ?? "");
    setFamiliaSelecionadaNome(detalheData?.doacao?.familia_nome ?? "");
    syncFiltroPlanejadoComCadastro({
      beneficiario_id: detalheData?.doacao?.beneficiario_id ?? "",
      vinculo_familiar_id: detalheData?.doacao?.vinculo_familiar_id ?? ""
    });
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
        setTermoPlano("");
        setItemPlanejadoSelecionadoNome("");
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

  async function imprimirRecibo(item: DoacaoRealizada) {
    if (!item.id_doacao_realizada) {
      setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Selecione uma doação válida para imprimir o recibo." });
      return;
    }

    try {
      const blob = await reportsService.gerarReciboDoacaoRealizada({
        doacaoRealizadaId: item.id_doacao_realizada,
        usuarioEmissor: usuario?.nomeUsuario
      });
      abrirRelatorioPdf(blob);
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.message ?? "Não foi possível gerar o recibo da doação." });
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
    setItens((atual) => [
      ...atual,
      {
        item_id: novoItem.item_id,
        codigo_item: novoItem.codigo_item,
        descricao_item: novoItem.descricao_item,
        unidade_item: novoItem.unidade_item,
        quantidade: novoItem.quantidade
      }
    ]);
    setNovoItem({ item_id: "", quantidade: 1 });
    setTermoItem("");
    setItemSelecionadoNome("");
  }

  async function executarRegistroEntrega(configuracao: ConfirmacaoCarenciaState) {
    try {
      const response = await salvarMutation.mutateAsync(configuracao.payload);

      if (configuracao.onSuccess) {
        await configuracao.onSuccess(response);
      }

      setValue("id_doacao_realizada", response.doacao.id_doacao_realizada ?? "");
      setIdSelecionado(response.doacao.id_doacao_realizada);
      setConfirmacaoCarencia(null);
      setSenhaAdministrativa("");
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: configuracao.mensagemSucesso });
      setAbaAtiva("historico");
      return response;
    } catch (error: any) {
      const mensagemErro = extrairMensagemErroApi(error) ?? configuracao.mensagemErroPadrao;

      if (erroExigeAutorizacaoCarencia(error)) {
        if (!isAdmin) {
          setPopup({
            tipo: "erro",
            titulo: "Carência de entrega",
            texto: `${mensagemErro} Somente um administrador logado pode autorizar esta entrega.`
          });
          return;
        }

        setSenhaAdministrativa("");
        setConfirmacaoCarencia({
          ...configuracao,
          mensagemCarencia: mensagemErro
        });
        return;
      }

      setPopup({ tipo: "erro", titulo: "Erro", texto: mensagemErro });
    }
  }

  async function salvarDoacao(values: DoacaoRealizadaFormValues) {
    const beneficiarioId = paraTexto(values.beneficiario_id);
    const vinculoId = paraTexto(values.vinculo_familiar_id);
    if (!beneficiarioId && !vinculoId) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Selecione beneficiário ou família para registrar a entrega." });
      return;
    }
    if (!itens.length) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Adicione pelo menos um item antes de registrar a entrega." });
      return;
    }
    await executarRegistroEntrega({
      payload: {
        ...values,
        beneficiario_id: beneficiarioId,
        vinculo_familiar_id: vinculoId,
        tipo_doacao: "Doação entregue",
        situacao: "Entregue",
        responsavel: formatarTextoPorCampo(
          "responsavel",
          nomeResponsavelAtual || values.responsavel,
          mapaCamposTextoDoacaoRealizadaForm
        ) as string,
        observacoes: formatarTextoPorCampo(
          "observacoes",
          values.observacoes,
          mapaCamposTextoDoacaoRealizadaForm
        ) as string,
        itens
      },
      mensagemCarencia: "",
      mensagemSucesso: "Doação entregue registrada com sucesso.",
      mensagemErroPadrao: "Não foi possível registrar a doação entregue."
    });
    return;

    try {
      const payload: DoacaoRealizada = {
        ...values,
        beneficiario_id: beneficiarioId,
        vinculo_familiar_id: vinculoId,
        tipo_doacao: "Doação entregue",
        situacao: "Entregue",
        responsavel: formatarTextoPorCampo(
          "responsavel",
          nomeResponsavelAtual || values.responsavel,
          mapaCamposTextoDoacaoRealizadaForm
        ) as string,
        observacoes: formatarTextoPorCampo("observacoes", values.observacoes, mapaCamposTextoDoacaoRealizadaForm) as string,
        itens
      };
      const response = await salvarMutation.mutateAsync(payload);
      setValue("id_doacao_realizada", response.doacao.id_doacao_realizada ?? "");
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Doação entregue registrada com sucesso." });
      setAbaAtiva("historico");
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível registrar a doação entregue." });
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
    await executarRegistroEntrega({
      payload: {
        beneficiario_id: item.beneficiario_id,
        vinculo_familiar_id: item.vinculo_familiar_id,
        tipo_doacao: "Doação entregue",
        situacao: "Entregue",
        responsavel: nomeResponsavelAtual || paraTexto(getValues("responsavel")),
        observacoes: item.observacoes,
        data_doacao: new Date().toISOString().slice(0, 10),
        itens: [{ item_id: item.item_id, quantidade: item.quantidade, observacoes: item.observacoes }]
      },
      mensagemCarencia: "",
      mensagemSucesso: "Doação planejada registrada como entregue.",
      mensagemErroPadrao: "Não foi possível realizar a doação planejada.",
      onSuccess: async () => {
        await salvarPlanejadaMutation.mutateAsync({ ...item, status: "Entregue" });
      }
    });
    return;

    try {
      await salvarMutation.mutateAsync({
        beneficiario_id: item.beneficiario_id,
        vinculo_familiar_id: item.vinculo_familiar_id,
        tipo_doacao: "Doação entregue",
        situacao: "Entregue",
        responsavel: nomeResponsavelAtual || paraTexto(getValues("responsavel")),
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
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: processandoAcoes },
    {
      label: "Salvar",
      texto:
        abaAtiva === "planejamento"
          ? salvarPlanejadaMutation.isPending
            ? "Salvando..."
            : "Salvar"
          : salvarMutation.isPending
            ? "Registrando..."
            : "Registrar entrega",
      icon: Save,
      onClick: () => {
        if (abaAtiva === "planejamento") {
          void salvarPlanejamento();
          return;
        }
        void handleSubmit(salvarDoacao)();
      },
      variant: "default",
      disabled: processandoAcoes
    },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: processandoAcoes },
    { label: "Excluir", icon: Trash2, onClick: () => void excluir(), variant: "danger", disabled: processandoAcoes },
    { label: "Imprimir", icon: Printer, onClick: () => void imprimir(), variant: "outline" },
    { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
  ];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-4 lg:px-8">
      <div className={classesTelaPadraoBeneficiario.container}>
        <Card className={classesTelaPadraoBeneficiario.barraAcoes} data-print="toolbar">
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                  {secaoTela}
                </p>
                <h1 className="text-sm font-semibold tracking-tight text-[var(--g3-foreground)] sm:text-base">
                  {tituloTela}
                </h1>
              </div>

              <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
                {ordemAcoesCrudPadrao.map((ordem) => {
                  const acao = acoes.find((item) => item.label === ordem);
                  if (!acao) return null;
                  const Icone = acao.icon;
                  return (
                    <Button key={acao.label} type="button" variant={acao.variant} onClick={acao.onClick} disabled={acao.disabled} className={`${classesTelaPadraoBeneficiario.botaoAcao} h-8 px-3 py-1 text-xs`}>
                      <Icone className="h-3.5 w-3.5" />
                      {acao.texto ?? acao.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={classesTelaPadraoBeneficiario.gradePrincipal} data-print="layout-grid">
          <Card className={classesTelaPadraoBeneficiario.cardAbas} data-print="tabs">
            <CardContent className={classesTelaPadraoBeneficiario.conteudoAbas}>
              {abas.map((aba, index) => (
                <button key={aba.id} type="button" className={classeBotaoAbaLateral(abaAtiva === aba.id)} onClick={() => setAbaAtiva(aba.id)}>
                  <span className={classeNumeroAbaLateral(abaAtiva === aba.id)}>{index + 1}</span>
                  <span className="min-w-0 break-words">{aba.label}</span>
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
                  <input type="hidden" {...register("beneficiario_id")} />
                  <input type="hidden" {...register("vinculo_familiar_id")} />
                  <input type="hidden" {...register("tipo_doacao")} />
                  <input type="hidden" {...register("situacao")} />
                  <div className="grid gap-3 xl:grid-cols-2">
                    <div className="space-y-1"><Label>Buscar beneficiário</Label><Input value={termoBeneficiario} onChange={(e) => alterarTermoBeneficiario(e.target.value)} disabled={buscaBeneficiarioBloqueada} placeholder={buscaBeneficiarioBloqueada ? "Limpe a família para buscar beneficiário" : ""} />{beneficiarios.map((item) => <button key={item.id} type="button" className="block w-full rounded border border-[var(--g3-border)] px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]" onClick={() => selecionarBeneficiario(item)}>{item.nome_completo}</button>)}</div>
                    <div className="space-y-1"><Label>Buscar família</Label><Input value={termoFamilia} onChange={(e) => alterarTermoFamilia(e.target.value)} disabled={buscaFamiliaBloqueada} placeholder={buscaFamiliaBloqueada ? "Limpe o beneficiário para buscar família" : ""} />{familias.map((item) => <button key={item.id} type="button" className="block w-full rounded border border-[var(--g3-border)] px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]" onClick={() => selecionarFamilia(item)}>{item.nome_familia}</button>)}</div>
                  </div>
                  <div className="hidden">
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-[var(--g3-muted)]">Beneficiário selecionado</p>
                          <p className="text-sm font-medium text-[var(--g3-foreground)]">
                            {beneficiarioSelecionadoNome || "Nenhum beneficiário selecionado."}
                          </p>
                          {beneficiarioSelecionadoId ? (
                            <p className="text-xs text-[var(--g3-muted)]">Código {beneficiarioSelecionadoId}</p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={limparBeneficiarioSelecionado}
                          disabled={!beneficiarioSelecionadoId}
                        >
                          Limpar
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-[var(--g3-muted)]">Família selecionada</p>
                          <p className="text-sm font-medium text-[var(--g3-foreground)]">
                            {familiaSelecionadaNome || "Nenhuma família selecionada."}
                          </p>
                          {familiaSelecionadaId ? (
                            <p className="text-xs text-[var(--g3-muted)]">Código {familiaSelecionadaId}</p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={limparFamiliaSelecionada}
                          disabled={!familiaSelecionadaId}
                        >
                          Limpar
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="hidden"><Label>Tipo de doação *</Label><Input {...register("tipo_doacao")} />{errors.tipo_doacao && <p className="text-xs text-rose-600">{errors.tipo_doacao.message}</p>}</div>
                    <div className="hidden"><Label>Situação *</Label><Select {...register("situacao")}><option value="Entregue">Entregue</option></Select></div>
                    <div className="space-y-1"><Label>Data da doação *</Label><Input type="date" {...register("data_doacao")} />{errors.data_doacao && <p className="text-xs text-rose-600">{errors.data_doacao.message}</p>}</div>
                    <div className="space-y-1"><Label>Responsável</Label><Input {...register("responsavel")} readOnly /></div>
                  </div>
                  <div className="space-y-1"><Label>Observações</Label><Textarea rows={1} className="min-h-12" {...register("observacoes")} /></div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {tempoCarenciaDias > 0
                      ? `Carência configurada: ${tempoCarenciaDias} dia(s) por item e destinatário.`
                      : "Carência de entrega desativada."}
                  </div>
                  <div className="grid gap-3 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-5">
                    <div className="space-y-1 md:col-span-3"><Label>Buscar item</Label><Input value={termoItem} onChange={(e) => alterarTermoItem(e.target.value)} />{itensCatalogo.map((item) => <button key={item.id} type="button" className="block w-full rounded border border-[var(--g3-border)] px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]" onClick={() => selecionarItem(item)}><span className="block font-medium">{item.codigo} - {item.descricao}</span><span className="block text-[11px] text-[var(--g3-muted)]">Estoque disponível: {item.estoque_atual}</span></button>)}</div>
                    <div className="space-y-1"><Label>Quantidade</Label><Input type="number" min={1} value={novoItem.quantidade ?? 1} onChange={(e) => setNovoItem((atual) => ({ ...atual, quantidade: Number(e.target.value) }))} /></div>
                    <div className="flex items-end"><Button type="button" className="w-full" onClick={adicionarItem}><Plus className="h-4 w-4" />Adicionar</Button></div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                        <tr>
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-left">Unidade</th>
                          <th className="px-3 py-2 text-left">Quantidade</th>
                          <th className="px-3 py-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.length ? itens.map((item, index) => <tr key={`${item.item_id}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2"><span className="block">{montarRotuloItem(item.codigo_item, item.descricao_item) || `Item ${item.item_id}`}</span>{item.fora_carencia ? <span className="block text-xs text-amber-700">Fora da carência{item.autorizado_por_nome ? ` | autorizado por ${item.autorizado_por_nome}` : ""}</span> : null}</td><td className="px-3 py-2">{item.unidade_item || "---"}</td><td className="px-3 py-2">{item.quantidade}</td><td className="px-3 py-2 text-right"><Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={() => removerItem(index)}><Trash2 className="h-4 w-4" />Remover</Button></td></tr>) : <tr><td className="px-3 py-4 text-center text-[var(--g3-muted)]" colSpan={4}>Nenhum item adicionado.</td></tr>}
                      </tbody>
                    </table>
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
                  <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Beneficiário/Família</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Situação</th><th className="px-3 py-2 text-left">Itens</th></tr></thead><tbody>{carregandoLista ? <tr><td className="px-3 py-4 text-center" colSpan={5}>Carregando...</td></tr> : doacoes.length ? doacoes.map((item, index) => <tr key={item.id_doacao_realizada} onClick={() => item.id_doacao_realizada && setIdSelecionado(item.id_doacao_realizada)} className={`cursor-pointer border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{formatarDataComHifen(item.data_doacao)}</td><td className="px-3 py-2">{item.beneficiario_nome || item.familia_nome || "---"}</td><td className="px-3 py-2">{item.tipo_doacao}</td><td className="px-3 py-2">{item.situacao}</td><td className="px-3 py-2"><div className="flex items-center gap-2"><span>{item.total_itens ?? item.itens.length}</span><Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={(event) => { event.stopPropagation(); void imprimirRecibo(item); }} disabled={!item.id_doacao_realizada}><Printer className="h-4 w-4" /></Button></div></td></tr>) : <tr><td className="px-3 py-4 text-center" colSpan={5}>Nenhuma doação encontrada.</td></tr>}</tbody></table></div>
                </div>
              )}

              {abaAtiva === "planejamento" && (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-1 xl:col-span-2"><Label>Item planejado</Label><Input value={termoPlano} onChange={(e) => alterarTermoPlano(e.target.value)} />{itensPlanejamentoCatalogo.map((item) => <button key={item.id} type="button" className="block w-full rounded border border-[var(--g3-border)] px-2 py-1 text-left text-xs hover:bg-[var(--g3-primary-soft)]" onClick={() => selecionarItemPlanejado(item)}>{item.codigo} - {item.descricao}</button>)}</div>
                    <div className="space-y-1"><Label>Quantidade</Label><Input type="number" min={1} value={plano.quantidade} onChange={(e) => setPlano((atual) => ({ ...atual, quantidade: Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label>Data prevista</Label><Input type="date" value={plano.data_prevista} onChange={(e) => setPlano((atual) => ({ ...atual, data_prevista: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Prioridade</Label><Select value={plano.prioridade} onChange={(e) => setPlano((atual) => ({ ...atual, prioridade: e.target.value }))}><option value="Baixa">Baixa</option><option value="Média">Média</option><option value="Alta">Alta</option></Select></div>
                    <div className="space-y-1"><Label>Status</Label><Select value={plano.status} onChange={(e) => setPlano((atual) => ({ ...atual, status: e.target.value }))}><option value="Pendente">Pendente</option><option value="Em separação">Em separação</option><option value="Pronto">Pronto</option><option value="Entregue">Entregue</option><option value="Cancelada">Cancelada</option></Select></div>
                    <div className="space-y-1 xl:col-span-2"><Label>Observações</Label><Input value={plano.observacoes ?? ""} onChange={(e) => setPlano((atual) => ({ ...atual, observacoes: e.target.value }))} /></div>
                  </div>
                  <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setPlano(planoInicial); setPlanoSelecionado(undefined); setTermoPlano(""); setItemPlanejadoSelecionadoNome(""); }} disabled={processandoAcoes}>Limpar</Button><Button type="button" onClick={() => void salvarPlanejamento()} disabled={processandoAcoes}>{salvarPlanejadaMutation.isPending ? "Salvando..." : "Salvar planejamento"}</Button></div>
                  <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Beneficiário/Família</th><th className="px-3 py-2 text-left">Previsto</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{carregandoPlanejadas ? <tr><td className="px-3 py-4 text-center" colSpan={5}>Carregando...</td></tr> : planejadas.length ? planejadas.map((item, index) => <tr key={item.id_doacao_planejada} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.item_descricao ?? item.item_codigo}</td><td className="px-3 py-2">{item.beneficiario_nome || item.familia_nome || "---"}</td><td className="px-3 py-2">{item.quantidade} em {formatarDataComHifen(item.data_prevista)}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2 text-right"><div className="flex justify-end gap-1"><Button type="button" variant="outline" className="h-7 px-2 text-xs" onClick={() => { const rotuloPlano = montarRotuloItem(item.item_codigo, item.item_descricao); setPlanoSelecionado(item.id_doacao_planejada); setPlano({ id_doacao_planejada: item.id_doacao_planejada, item_id: item.item_id, quantidade: item.quantidade, data_prevista: item.data_prevista ?? planoInicial.data_prevista, prioridade: item.prioridade, status: item.status, observacoes: item.observacoes }); setItemPlanejadoSelecionadoNome(rotuloPlano); setTermoPlano(rotuloPlano); }} disabled={processandoAcoes}>Editar</Button><Button type="button" variant="outline" className="h-7 border-emerald-300 bg-emerald-100 px-2 text-xs text-emerald-800 hover:bg-emerald-200" onClick={() => void realizarPlanejada(item)} disabled={processandoAcoes}>{salvarMutation.isPending || salvarPlanejadaMutation.isPending ? "Processando..." : "Realizar"}</Button></div></td></tr>) : <tr><td className="px-3 py-4 text-center" colSpan={5}>Nenhum planejamento encontrado.</td></tr>}</tbody></table></div>
                </div>
              )}

              {abaAtiva === "dashboard" && (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <article className="rounded-xl border border-emerald-200 bg-emerald-100 p-4 text-center shadow-[0_14px_32px_-20px_rgba(22,163,74,0.75)]"><p className="text-xs font-medium text-emerald-700">Doações entregues</p><p className="text-xl font-bold text-emerald-900">{painel.totalDoacoes}</p></article>
                  <article className="rounded-xl border border-emerald-200 bg-emerald-100 p-4 text-center shadow-[0_14px_32px_-20px_rgba(22,163,74,0.75)]"><p className="text-xs font-medium text-emerald-700">Itens entregues</p><p className="text-xl font-bold text-emerald-900">{painel.totalItens}</p></article>
                  <article className="rounded-xl border border-emerald-200 bg-emerald-100 p-4 text-center shadow-[0_14px_32px_-20px_rgba(22,163,74,0.75)]"><p className="text-xs font-medium text-emerald-700">Planejamentos pendentes</p><p className="text-xl font-bold text-emerald-900">{painel.totalPendentes}</p></article>
                  <article className="rounded-xl border border-emerald-200 bg-emerald-100 p-4 text-center shadow-[0_14px_32px_-20px_rgba(22,163,74,0.75)]"><p className="text-xs font-medium text-emerald-700">Itens pendentes</p><p className="text-xl font-bold text-emerald-900">{painel.totalItensPendentes}</p></article>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {popup && <PopupMensagem popup={popup} onClose={() => setPopup(null)} />}
      {confirmacaoCarencia && (
        <div
          className="fixed inset-0 z-[61] flex items-center justify-center bg-slate-900/45 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !salvarMutation.isPending && setConfirmacaoCarencia(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Autorizar entrega fora da carência</h3>
            </div>
            <div className="space-y-3 px-5 py-4">
              <p className="text-sm text-slate-700">{confirmacaoCarencia.mensagemCarencia}</p>
              <p className="text-xs text-slate-500">
                Confirme com a senha do administrador logado para continuar.
              </p>
              <div className="space-y-1">
                <Label>Senha administrativa</Label>
                <Input
                  type="password"
                  value={senhaAdministrativa}
                  onChange={(event) => setSenhaAdministrativa(event.target.value)}
                  disabled={salvarMutation.isPending}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmacaoCarencia(null)}
                disabled={salvarMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() =>
                  void executarRegistroEntrega({
                    ...confirmacaoCarencia,
                    payload: {
                      ...confirmacaoCarencia.payload,
                      autorizar_fora_carencia: true,
                      senha_administrativa: senhaAdministrativa
                    }
                  })
                }
                disabled={salvarMutation.isPending || !senhaAdministrativa.trim()}
              >
                {salvarMutation.isPending ? "Autorizando..." : "Autorizar entrega"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
