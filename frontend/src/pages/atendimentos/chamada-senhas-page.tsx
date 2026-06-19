import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  CheckCircle2,
  List,
  Monitor,
  Plus,
  Printer,
  Save,
  Search,
  Undo2,
  UserRound,
  Volume2,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminPageLayout,
  type AdminAction,
  type AdminTab
} from "@/components/admin/admin-page-layout";
import {
  PopupMensagem,
  type PopupMensagemState
} from "@/components/admin/admin-popups";
import {
  useAtualizarSenhasConfig,
  useChamarSenha,
  useEmitirSenha,
  useFinalizarSenhaFila,
  useSenhaAtual,
  useSenhasAguardando,
  useSenhasConfig
} from "@/features/senhas/use-senhas";
import {
  destravarSinteseVoz,
  emitirEventoPainelChamada,
  falarChamadaNavegador,
  FRASE_FALA_PADRAO,
  painelJaFalouChamada,
  painelAtivoComVoz
} from "@/lib/senhas-voz";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import { beneficiariosService } from "@/services/beneficiarios.service";
import { unidadesAssistenciaisService } from "@/services/unidades-assistenciais.service";
import type { Beneficiario } from "@/types/beneficiario";
import type { SenhaAvisoSonoro } from "@/types/senhas";
import type { UnidadeAssistencial } from "@/types/unidade-assistencial";

type AbaId = "entrada" | "fila" | "config";

const abas: AdminTab[] = [
  { id: "entrada", label: "Entrada na fila", icon: UserRound },
  { id: "fila", label: "Fila aguardando", icon: List },
  { id: "config", label: "Configurações do painel", icon: Monitor }
];

const tituloTela = "Chamada de senhas";

function tocarAvisoSonoro() {
  try {
    if (!("AudioContext" in window || "webkitAudioContext" in window)) return;
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioCtx();
    const now = context.currentTime;
    const beepDuration = 0.55;
    const gap = 0.22;

    const agendarBeep = (start: number, baseFreq: number) => {
      const gain = context.createGain();
      const osc1 = context.createOscillator();
      const osc2 = context.createOscillator();

      gain.gain.value = 0.0001;
      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.value = baseFreq;
      osc2.frequency.value = baseFreq * 1.5;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(context.destination);

      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + beepDuration);

      osc1.start(start);
      osc2.start(start + 0.03);
      osc1.stop(start + beepDuration);
      osc2.stop(start + beepDuration);
    };

    agendarBeep(now, 960);
    agendarBeep(now + beepDuration + gap, 840);
    agendarBeep(now + (beepDuration + gap) * 2, 720);

    const timeoutId = window.setTimeout(() => {
      void context.close();
      window.clearTimeout(timeoutId);
    }, 2200);
  } catch {
    // Sem áudio disponível ou bloqueado.
  }
}

function obterBeneficiarioId(beneficiario: Beneficiario | null) {
  return Number(beneficiario?.id_beneficiario ?? 0) || null;
}

export function ChamadaSenhasPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("entrada");
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [unidades, setUnidades] = useState<UnidadeAssistencial[]>([]);
  const [unidadeSelecionadaId, setUnidadeSelecionadaId] = useState<number | null>(null);
  const [buscaBeneficiario, setBuscaBeneficiario] = useState("");
  const [resultadoBeneficiarios, setResultadoBeneficiarios] = useState<Beneficiario[]>([]);
  const [beneficiarioSelecionado, setBeneficiarioSelecionado] = useState<Beneficiario | null>(null);
  const [prioridade, setPrioridade] = useState("Normal");
  const [salaSelecionada, setSalaSelecionada] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>("");

  const senhasQuery = useSenhasAguardando(unidadeSelecionadaId);
  const senhaAtualQuery = useSenhaAtual(unidadeSelecionadaId);
  const emitirMutation = useEmitirSenha();
  const chamarMutation = useChamarSenha();
  const finalizarFilaMutation = useFinalizarSenhaFila();
  const configQuery = useSenhasConfig();
  const atualizarConfigMutation = useAtualizarSenhasConfig();

  const [configFrase, setConfigFrase] = useState("");
  const [configRss, setConfigRss] = useState("");
  const [configVelocidade, setConfigVelocidade] = useState<number>(60);
  const [configModoNoticias, setConfigModoNoticias] = useState<"RSS" | "MANUAL">("RSS");
  const [configNoticiasManuais, setConfigNoticiasManuais] = useState("");
  const [configQuantidade, setConfigQuantidade] = useState<number>(4);
  const [configTitulo, setConfigTitulo] = useState("Chamada de senhas");
  const [configDescricao, setConfigDescricao] = useState("Controle da fila de atendimento.");
  const [configUnidadePainelId, setConfigUnidadePainelId] = useState<number | null>(null);
  const [configAvisosSonoros, setConfigAvisosSonoros] = useState<SenhaAvisoSonoro[]>([]);
  const [configAvisoSonoroAtivoId, setConfigAvisoSonoroAtivoId] = useState<string | null>(null);

  useEffect(() => {
    void unidadesAssistenciaisService.listar().then((res) => {
      const lista = res.unidades ?? [];
      setUnidades(lista);
      if (!unidadeSelecionadaId && lista.length) {
        setUnidadeSelecionadaId(Number(lista[0].id_unidade ?? 0) || null);
      }
    });
  }, [unidadeSelecionadaId]);

  useEffect(() => {
    const termo = buscaBeneficiario.trim();

    if (!termo || termo.length < 2) {
      setResultadoBeneficiarios([]);
      return;
    }

    if (beneficiarioSelecionado && termo === beneficiarioSelecionado.nome_completo) {
      setResultadoBeneficiarios([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void beneficiariosService
        .listar({ nome: termo })
        .then((res) => {
          const lista = (res.beneficiarios ?? []).slice(0, 8);
          setResultadoBeneficiarios(lista);
        })
        .catch(() => setResultadoBeneficiarios([]));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [beneficiarioSelecionado, buscaBeneficiario]);

  useEffect(() => {
    if (!configQuery.data) {
      return;
    }

    setConfigFrase(configQuery.data.fraseFala);
    setConfigRss(configQuery.data.rssUrl);
    setConfigVelocidade(configQuery.data.velocidadeTicker);
    setConfigModoNoticias((configQuery.data.modoNoticias as "RSS" | "MANUAL") ?? "RSS");
    setConfigNoticiasManuais(configQuery.data.noticiasManuais ?? "");
    setConfigQuantidade(configQuery.data.quantidadeUltimasChamadas);
    setConfigTitulo(configQuery.data.tituloTela ?? "Chamada de senhas");
    setConfigDescricao(
      configQuery.data.descricaoTela ?? "Controle da fila de atendimento."
    );
    setConfigUnidadePainelId(configQuery.data.unidadePainelId ?? null);
    setConfigAvisosSonoros(configQuery.data.avisosSonoros ?? []);
    setConfigAvisoSonoroAtivoId(configQuery.data.avisoSonoroAtivoId ?? null);
  }, [configQuery.data]);

  const beneficiarioSelecionadoId = obterBeneficiarioId(beneficiarioSelecionado);

  const salasDisponiveis = useMemo(() => {
    const unidade = unidades.find(
      (item) => Number(item.id_unidade) === unidadeSelecionadaId
    );

    return unidade?.salas ?? [];
  }, [unidadeSelecionadaId, unidades]);

  const filaFiltrada = useMemo(() => {
    const lista = senhasQuery.data ?? [];

    if (!filtroPrioridade) {
      return lista;
    }

    return lista.filter((item) =>
      filtroPrioridade === "Prioridade" ? item.prioridade >= 2 : item.prioridade === 1
    );
  }, [filtroPrioridade, senhasQuery.data]);

  const processandoFila = chamarMutation.isPending || finalizarFilaMutation.isPending;
  const processandoTela =
    emitirMutation.isPending || processandoFila || atualizarConfigMutation.isPending;
  const chamadaAtual = senhaAtualQuery.data;

  function selecionarBeneficiario(item: Beneficiario) {
    setBeneficiarioSelecionado(item);
    setBuscaBeneficiario(item.nome_completo);
    setResultadoBeneficiarios([]);
  }

  function alterarBuscaBeneficiario(valor: string) {
    setBuscaBeneficiario(valor);

    if (beneficiarioSelecionado && valor !== beneficiarioSelecionado.nome_completo) {
      setBeneficiarioSelecionado(null);
    }
  }

  async function emitir() {
    if (!beneficiarioSelecionadoId || !salaSelecionada) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Selecione um beneficiário válido e a sala de atendimento."
      });
      return;
    }

    try {
      await emitirMutation.mutateAsync({
        beneficiarioId: beneficiarioSelecionadoId,
        prioridade: prioridade === "Prioridade" ? 2 : 1,
        unidadeId: unidadeSelecionadaId,
        salaAtendimento: salaSelecionada
      });

      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Beneficiário inserido na fila."
      });
      setBuscaBeneficiario("");
      setBeneficiarioSelecionado(null);
      setResultadoBeneficiarios([]);
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível inserir na fila."
      });
    }
  }

  async function chamar(filaId: number, localAtendimento: string) {
    try {
      destravarSinteseVoz();

      const chamada = await chamarMutation.mutateAsync({
        filaId,
        localAtendimento,
        unidadeId: unidadeSelecionadaId
      });
      emitirEventoPainelChamada(chamada);

      window.setTimeout(() => {
        if (!painelAtivoComVoz() || !painelJaFalouChamada(chamada.id)) {
          falarChamadaNavegador({
            frase: configFrase || FRASE_FALA_PADRAO,
            beneficiario: chamada.nomeBeneficiario,
            sala: chamada.localAtendimento
          });
        }
      }, 5500);

      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: `Beneficiário chamado para ${localAtendimento}.`
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível chamar o beneficiário."
      });
    }
  }

  async function rechamarAtual() {
    if (!chamadaAtual) {
      return;
    }

    await chamar(chamadaAtual.filaId, chamadaAtual.localAtendimento || "Guichê");
  }

  async function concluirFila(filaId: number) {
    try {
      await finalizarFilaMutation.mutateAsync(filaId);
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Atendimento concluído."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível concluir o atendimento."
      });
    }
  }

  async function salvarConfiguracoes() {
    if (
      !configFrase.trim() ||
      !configFrase.includes("{beneficiario}") ||
      !configFrase.includes("{sala}")
    ) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "A frase deve conter {beneficiario} e {sala}."
      });
      return;
    }

    try {
      await atualizarConfigMutation.mutateAsync({
        fraseFala: configFrase,
        rssUrl: configRss,
        velocidadeTicker: configVelocidade,
        modoNoticias: configModoNoticias,
        noticiasManuais: configNoticiasManuais || null,
        quantidadeUltimasChamadas: configQuantidade,
        unidadePainelId: configUnidadePainelId,
        tituloTela: configTitulo,
        descricaoTela: configDescricao,
        avisosSonoros: configAvisosSonoros,
        avisoSonoroAtivoId: configAvisoSonoroAtivoId
      });

      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Configurações salvas com sucesso."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar configurações."
      });
    }
  }

  function selecionarAvisoSonoro(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith("audio/")) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Selecione um arquivo de áudio válido."
      });
      event.target.value = "";
      return;
    }

    if (arquivo.size > 1_500_000) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "O aviso sonoro deve ter no máximo 1,5 MB."
      });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultado = typeof reader.result === "string" ? reader.result : null;
      if (!resultado) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setConfigAvisosSonoros((atual) => [
        ...atual,
        {
          id,
          nome: arquivo.name,
          url: resultado
        }
      ]);
      setConfigAvisoSonoroAtivoId((atual) => atual ?? id);
    };
    reader.onerror = () => {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: "Não foi possível ler o arquivo de áudio."
      });
    };
    reader.readAsDataURL(arquivo);
    event.target.value = "";
  }

  function removerAvisoSonoro(id: string) {
    const proximaLista = configAvisosSonoros.filter((item) => item.id !== id);
    setConfigAvisosSonoros(proximaLista);
    setConfigAvisoSonoroAtivoId((atual) => {
      if (atual && atual !== id) return atual;
      return proximaLista[0]?.id ?? null;
    });
  }

  function testarAvisoSonoro() {
    destravarSinteseVoz();
    const avisoAtivo =
      configAvisosSonoros.find((item) => item.id === configAvisoSonoroAtivoId) ??
      configAvisosSonoros[0];
    if (!avisoAtivo?.url) {
      tocarAvisoSonoro();
      return;
    }

    const audio = new Audio(avisoAtivo.url);
    void audio.play().catch(() => {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: "Não foi possível reproduzir o aviso sonoro selecionado."
      });
    });
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Chamada de senhas" });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível preparar a impressão."
      });
    }
  }

  const acoes: AdminAction[] = [
    {
      label: "Buscar",
      icon: Search,
      onClick: () => setAbaAtiva("fila"),
      variant: "outline"
    },
    {
      label: "Novo",
      icon: Plus,
      onClick: () => setAbaAtiva("entrada"),
      variant: "default",
      disabled: processandoTela
    },
    {
      label:
        abaAtiva === "config"
          ? atualizarConfigMutation.isPending
            ? "Salvando..."
            : "Salvar"
          : emitirMutation.isPending
            ? "Incluindo..."
            : "Salvar",
      icon: Save,
      onClick: () => void (abaAtiva === "config" ? salvarConfiguracoes() : emitir()),
      variant: "default",
      disabled: processandoTela
    },
    {
      label: "Cancelar",
      icon: Undo2,
      onClick: () => setAbaAtiva("entrada"),
      variant: "outline",
      disabled: processandoTela
    },
    { label: "Imprimir", icon: Printer, onClick: imprimir, variant: "outline" },
    {
      label: "Fechar",
      icon: X,
      onClick: () => navigate("/dashboard/visao-geral"),
      variant: "outline"
    }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Atendimentos diários"
        pageTitle={tituloTela}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
      >
        {abaAtiva === "entrada" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="beneficiario-fila">Beneficiário</Label>
                <Input
                  id="beneficiario-fila"
                  value={buscaBeneficiario}
                  onChange={(event) => alterarBuscaBeneficiario(event.target.value)}
                  placeholder="Digite o nome do beneficiário"
                  autoComplete="off"
                  disabled={processandoTela}
                />
                <p className="text-xs text-[var(--g3-muted)]">
                  Digite o nome e selecione o beneficiário sugerido.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="unidade-fila">Unidade</Label>
                <Select
                  id="unidade-fila"
                  value={String(unidadeSelecionadaId ?? "")}
                  onChange={(event) =>
                    setUnidadeSelecionadaId(Number(event.target.value) || null)
                  }
                  disabled={processandoTela}
                >
                  <option value="">Selecione</option>
                  {unidades.map((unidade) => (
                    <option key={unidade.id_unidade} value={unidade.id_unidade}>
                      {unidade.nome_fantasia}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sala-atendimento">Sala de atendimento</Label>
                <Select
                  id="sala-atendimento"
                  value={salaSelecionada}
                  onChange={(event) => setSalaSelecionada(event.target.value)}
                  disabled={processandoTela}
                >
                  <option value="">Selecione</option>
                  {salasDisponiveis.map((sala) => (
                    <option key={sala.id} value={sala.nome}>
                      {sala.nome}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="prioridade-fila">Prioridade</Label>
                <Select
                  id="prioridade-fila"
                  value={prioridade}
                  onChange={(event) => setPrioridade(event.target.value)}
                  disabled={processandoTela}
                >
                  <option value="Normal">Normal</option>
                  <option value="Prioridade">Prioridade</option>
                </Select>
              </div>
            </div>

            {resultadoBeneficiarios.length ? (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-2 shadow-sm">
                {resultadoBeneficiarios.map((item) => (
                  <button
                    key={item.id_beneficiario ?? item.cpf ?? item.codigo}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--g3-primary-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => selecionarBeneficiario(item)}
                    disabled={processandoTela}
                  >
                    <span className="font-medium text-[var(--g3-foreground)]">
                      {item.nome_completo}
                    </span>
                    <span className="text-xs text-[var(--g3-muted)]">
                      {item.cpf || item.codigo || "Sem documento"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {beneficiarioSelecionado ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                Beneficiário selecionado: <strong>{beneficiarioSelecionado.nome_completo}</strong>
              </div>
            ) : null}

            <Button
              onClick={() => void emitir()}
              disabled={emitirMutation.isPending || processandoFila}
            >
              <BellRing className="mr-1.5 h-3.5 w-3.5" />
              {emitirMutation.isPending ? "Incluindo..." : "Incluir na fila"}
            </Button>
          </section>
        ) : null}

        {abaAtiva === "fila" ? (
          <section className="space-y-4">
            {chamadaAtual ? (
              <article className="rounded-2xl border border-emerald-200 bg-[linear-gradient(145deg,#f5fff7_0%,#dcfce7_100%)] p-4 shadow-[0_18px_45px_rgba(22,101,52,0.12)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/80">
                      Chamada atual
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-emerald-950">
                      {chamadaAtual.nomeBeneficiario}
                    </h2>
                    <p className="mt-2 text-base font-semibold text-emerald-700">
                      {chamadaAtual.localAtendimento}
                    </p>
                    <p className="mt-1 text-sm text-emerald-900/70">
                      Chamado em{" "}
                      {new Date(chamadaAtual.dataHoraChamada).toLocaleString("pt-BR")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={() => void rechamarAtual()}
                      disabled={processandoFila}
                    >
                      <Volume2 className="mr-1.5 h-4 w-4" />
                      {chamarMutation.isPending ? "Chamando..." : "Chamar novamente"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void concluirFila(chamadaAtual.filaId)}
                      disabled={processandoFila}
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      {finalizarFilaMutation.isPending ? "Concluindo..." : "Concluir chamado"}
                    </Button>
                  </div>
                </div>
              </article>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="filtro-prioridade">Filtrar prioridade</Label>
                <Select
                  id="filtro-prioridade"
                  value={filtroPrioridade}
                  onChange={(event) => setFiltroPrioridade(event.target.value)}
                  disabled={processandoFila}
                >
                  <option value="">Todas</option>
                  <option value="Prioridade">Prioridade</option>
                  <option value="Normal">Normal</option>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Beneficiário</th>
                    <th className="px-3 py-2 text-left">Sala</th>
                    <th className="px-3 py-2 text-left">Prioridade</th>
                    <th className="px-3 py-2 text-left">Entrada</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filaFiltrada.length ? (
                    filaFiltrada.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0
                            ? "bg-[var(--g3-card)]"
                            : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2">{item.nomeBeneficiario}</td>
                        <td className="px-3 py-2">{item.salaAtendimento ?? "-"}</td>
                        <td className="px-3 py-2">
                          {item.prioridade >= 2 ? "Prioridade" : "Normal"}
                        </td>
                        <td className="px-3 py-2">
                          {new Date(item.dataHoraEntrada).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                void chamar(
                                  item.id,
                                  (item.salaAtendimento ?? salaSelecionada) || "Guichê"
                                )
                              }
                              disabled={processandoFila}
                            >
                              {chamarMutation.isPending ? "Chamando..." : "Chamar"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void concluirFila(item.id)}
                              disabled={processandoFila}
                            >
                              {finalizarFilaMutation.isPending
                                ? "Concluindo..."
                                : "Concluir"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center">
                        {senhasQuery.isLoading
                          ? "Carregando fila..."
                          : "Nenhum beneficiário aguardando."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "config" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="config-titulo">Título da tela</Label>
              <Input
                id="config-titulo"
                value={configTitulo}
                onChange={(event) => setConfigTitulo(event.target.value)}
                disabled={atualizarConfigMutation.isPending}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="config-descricao">Descrição da tela</Label>
              <Input
                id="config-descricao"
                value={configDescricao}
                onChange={(event) => setConfigDescricao(event.target.value)}
                disabled={atualizarConfigMutation.isPending}
              />
            </div>

            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label htmlFor="config-frase">Frase da chamada</Label>
              <Input
                id="config-frase"
                value={configFrase}
                onChange={(event) => setConfigFrase(event.target.value)}
                disabled={atualizarConfigMutation.isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="config-modo-noticias">Modo de notícias</Label>
              <Select
                id="config-modo-noticias"
                value={configModoNoticias}
                onChange={(event) =>
                  setConfigModoNoticias(event.target.value as "RSS" | "MANUAL")
                }
                disabled={atualizarConfigMutation.isPending}
              >
                <option value="RSS">RSS</option>
                <option value="MANUAL">Manual</option>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-3">
              <Label htmlFor="config-rss">Feed RSS</Label>
              <Input
                id="config-rss"
                value={configRss}
                onChange={(event) => setConfigRss(event.target.value)}
                disabled={atualizarConfigMutation.isPending}
              />
            </div>

            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label htmlFor="config-noticias-manuais">Notícias manuais</Label>
              <Textarea
                id="config-noticias-manuais"
                rows={4}
                value={configNoticiasManuais}
                onChange={(event) => setConfigNoticiasManuais(event.target.value)}
                disabled={atualizarConfigMutation.isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="config-velocidade">Velocidade do ticker</Label>
              <Input
                id="config-velocidade"
                type="number"
                value={configVelocidade}
                onChange={(event) => setConfigVelocidade(Number(event.target.value) || 60)}
                disabled={atualizarConfigMutation.isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="config-quantidade">Qtd. últimas chamadas</Label>
              <Input
                id="config-quantidade"
                type="number"
                value={configQuantidade}
                onChange={(event) => setConfigQuantidade(Number(event.target.value) || 4)}
                disabled={atualizarConfigMutation.isPending}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="config-unidade-painel">Unidade do painel</Label>
              <Select
                id="config-unidade-painel"
                value={String(configUnidadePainelId ?? "")}
                onChange={(event) =>
                  setConfigUnidadePainelId(Number(event.target.value) || null)
                }
                disabled={atualizarConfigMutation.isPending}
              >
                <option value="">Unidade atual</option>
                {unidades.map((unidade) => (
                  <option key={unidade.id_unidade} value={unidade.id_unidade}>
                    {unidade.nome_fantasia}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2 xl:col-span-4">
              <Label htmlFor="config-aviso-sonoro">Aviso sonoro do painel</Label>
              <Input
                id="config-aviso-sonoro"
                type="file"
                accept="audio/*"
                onChange={selecionarAvisoSonoro}
                disabled={atualizarConfigMutation.isPending}
              />
              <p className="text-xs text-[var(--g3-muted)]">
                Selecione um arquivo MP3 ou WAV de até 1,5 MB para tocar antes da chamada.
              </p>
              <div className="space-y-2 rounded-lg border border-[var(--g3-border)] p-3">
                {configAvisosSonoros.length ? (
                  configAvisosSonoros.map((item) => (
                    <label
                      key={item.id}
                      className="flex flex-col gap-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="aviso-sonoro-ativo"
                          checked={configAvisoSonoroAtivoId === item.id}
                          onChange={() => setConfigAvisoSonoroAtivoId(item.id)}
                        />
                        {item.nome}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removerAvisoSonoro(item.id)}
                        disabled={atualizarConfigMutation.isPending}
                      >
                        Remover
                      </Button>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-[var(--g3-muted)]">
                    Nenhum aviso sonoro cadastrado.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <span className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2 text-sm">
                  {configAvisosSonoros.find((item) => item.id === configAvisoSonoroAtivoId)?.nome ??
                    "Aviso padrão do sistema"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={testarAvisoSonoro}
                  disabled={atualizarConfigMutation.isPending}
                >
                  <Volume2 className="mr-2 h-4 w-4" />
                  Testar aviso sonoro
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-4 sm:flex-row sm:flex-wrap">
              <Button
                onClick={() => void salvarConfiguracoes()}
                disabled={atualizarConfigMutation.isPending}
              >
                {atualizarConfigMutation.isPending
                  ? "Salvando configurações..."
                  : "Salvar configurações"}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(
                    `/senhas/painel${
                      configUnidadePainelId ? `?unidadeId=${configUnidadePainelId}` : ""
                    }`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                disabled={atualizarConfigMutation.isPending}
              >
                Abrir painel
              </Button>
            </div>
          </section>
        ) : null}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}
