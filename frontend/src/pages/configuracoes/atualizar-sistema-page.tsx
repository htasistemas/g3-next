import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Clock3,
  Download,
  FileText,
  ListChecks,
  RefreshCcw,
  RotateCcw,
  Save,
  ScrollText
} from "lucide-react";
import {
  PopupConfirmacao,
  PopupMensagem,
  type PopupMensagemState
} from "@/components/admin/admin-popups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { classesTelaPadraoBeneficiario } from "@/lib/tela-padrao-beneficiario";
import { atualizacaoSistemaService } from "@/services/atualizacao-sistema.service";
import type {
  AtualizacaoSistemaChangelogItem,
  AtualizacaoSistemaConfig,
  AtualizacaoSistemaHistoricoItem,
  AtualizacaoSistemaLogItem,
  AtualizacaoSistemaManifesto,
  AtualizacaoSistemaStatus
} from "@/types/atualizacao-sistema";

type ConfirmacaoState =
  | { tipo: "atualizar" }
  | { tipo: "rollback"; historicoId?: string }
  | null;

function formatarDataHifen(valor?: string | null) {
  if (!valor) return "---";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    const [ano, mes, dia] = valor.slice(0, 10).split("-");
    return ano && mes && dia ? `${dia}-${mes}-${ano}` : valor;
  }
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = String(data.getFullYear()).padStart(4, "0");
  return `${dia}-${mes}-${ano}`;
}

function formatarDataHoraHifen(valor?: string | null) {
  if (!valor) return "---";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return `${formatarDataHifen(valor)} ${String(data.getHours()).padStart(2, "0")}:${String(data.getMinutes()).padStart(2, "0")}`;
}

function formatarDuracao(duracaoMs?: number | null) {
  if (!duracaoMs) return "---";
  const totalSegundos = Math.floor(duracaoMs / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return minutos ? `${minutos}min ${segundos}s` : `${segundos}s`;
}

function classeStatus(status?: string) {
  switch ((status ?? "").toUpperCase()) {
    case "CONCLUIDO":
    case "ATUALIZADO":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "DISPONIVEL":
    case "PROCESSANDO":
    case "ROLLBACK":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "FALHA":
      return "border-rose-200 bg-rose-50 text-rose-800";
    default:
      return "border-[var(--g3-border)] bg-[var(--g3-card)] text-[var(--g3-foreground)]";
  }
}

function ModalBase({
  aberto,
  titulo,
  onClose,
  children
}: {
  aberto: boolean;
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--g3-border)] px-5 py-4">
          <h3 className="text-base font-semibold text-[var(--g3-foreground)]">{titulo}</h3>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
        <div className="max-h-[calc(85vh-72px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function AtualizarSistemaPage() {
  const { usuario } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [salvandoModo, setSalvandoModo] = useState(false);
  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState>(null);
  const [modalLogsAberto, setModalLogsAberto] = useState(false);
  const [modalChangelogAberto, setModalChangelogAberto] = useState(false);
  const [config, setConfig] = useState<AtualizacaoSistemaConfig>({ modo: "MANUAL" });
  const [status, setStatus] = useState<AtualizacaoSistemaStatus | null>(null);
  const [manifesto, setManifesto] = useState<AtualizacaoSistemaManifesto | null>(null);
  const [changelog, setChangelog] = useState<AtualizacaoSistemaChangelogItem[]>([]);
  const [historico, setHistorico] = useState<AtualizacaoSistemaHistoricoItem[]>([]);
  const [logs, setLogs] = useState<AtualizacaoSistemaLogItem[]>([]);
  const [draftModo, setDraftModo] = useState<AtualizacaoSistemaConfig["modo"]>("MANUAL");
  const [execucaoLogsSelecionada, setExecucaoLogsSelecionada] = useState("");

  const permissoes = usuario?.permissoes ?? [];
  const canUpdate = permissoes.includes("ADMINISTRADOR") || permissoes.includes("CONFIG_ATUALIZAR_SISTEMA");
  const canChangeMode = permissoes.includes("ADMINISTRADOR") || permissoes.includes("CONFIG_ALTERAR_MODO_ATUALIZACAO");
  const canRollback = permissoes.includes("ADMINISTRADOR") || permissoes.includes("CONFIG_EXECUTAR_ROLLBACK");
  const houveMudancaModo = draftModo !== config.modo;
  const ultimaEntradaChangelog = changelog[0] ?? null;
  const ultimoHistorico = historico[0] ?? null;

  async function carregarDados(silencioso = false) {
    if (!silencioso) setCarregando(true);
    try {
      const [statusAtual, configAtual, versaoPublicada, changelogAtual, historicoAtual] = await Promise.all([
        atualizacaoSistemaService.obterStatus(),
        atualizacaoSistemaService.obterConfig(),
        atualizacaoSistemaService.obterVersaoPublicada(),
        atualizacaoSistemaService.obterChangelog(),
        atualizacaoSistemaService.obterHistorico()
      ]);

      setStatus(statusAtual);
      setConfig(configAtual);
      setDraftModo(configAtual.modo);
      setManifesto(versaoPublicada.manifesto);
      setChangelog(changelogAtual);
      setHistorico(historicoAtual);
      const execucaoAtual = statusAtual.execucaoId || historicoAtual[0]?.execucaoId || "";
      if (execucaoAtual) setExecucaoLogsSelecionada((atual) => atual || execucaoAtual);
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível carregar a atualização do sistema." });
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }

  async function carregarLogs(execucaoId?: string) {
    try {
      const referencia = execucaoId || execucaoLogsSelecionada || status?.execucaoId || historico[0]?.execucaoId;
      const itens = await atualizacaoSistemaService.obterLogs(referencia);
      setLogs(itens);
      if (referencia) setExecucaoLogsSelecionada(referencia);
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível carregar os logs." });
    }
  }

  useEffect(() => {
    void carregarDados();
  }, []);

  useEffect(() => {
    const intervalo = globalThis.setInterval(() => {
      void carregarDados(true);
      if (status?.emExecucao || modalLogsAberto) void carregarLogs();
    }, status?.emExecucao ? 2500 : 8000);
    return () => globalThis.clearInterval(intervalo);
  }, [modalLogsAberto, status?.emExecucao, execucaoLogsSelecionada]);

  async function verificarAtualizacao() {
    try {
      setProcessandoAcao(true);
      const resultado = await atualizacaoSistemaService.verificarAtualizacao();
      setStatus(resultado.status);
      setManifesto(resultado.manifesto ?? null);
      setPopup({ tipo: "sucesso", titulo: "Verificação concluída", texto: resultado.atualizacaoDisponivel ? `Nova versão disponível: ${resultado.versaoPublicada}.` : `Versão instalada: ${resultado.versaoInstalada}.` });
      await carregarDados(true);
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível verificar a atualização." });
    } finally {
      setProcessandoAcao(false);
    }
  }

  async function salvarModo() {
    try {
      setSalvandoModo(true);
      const salvo = await atualizacaoSistemaService.salvarConfig({ modo: draftModo });
      setConfig(salvo);
      setDraftModo(salvo.modo);
      setPopup({ tipo: "sucesso", titulo: "Configuração salva", texto: `Modo atual: ${salvo.modo === "AUTOMATICO" ? "Automático" : "Manual"}.` });
      await carregarDados(true);
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar o modo de atualização." });
    } finally {
      setSalvandoModo(false);
    }
  }

  async function baixarPacote() {
    try {
      setProcessandoAcao(true);
      const resultado = await atualizacaoSistemaService.baixarAtualizacao();
      setPopup({ tipo: resultado.validado ? "sucesso" : "aviso", titulo: resultado.validado ? "Pacote validado" : "Pacote localizado", texto: resultado.validado ? `Pacote ${resultado.packageName} baixado e validado com sucesso.` : `Pacote ${resultado.packageName} localizado, mas o checksum não confere.` });
      await carregarDados(true);
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível localizar ou baixar o pacote." });
    } finally {
      setProcessandoAcao(false);
    }
  }

  async function confirmarAcao() {
    if (!confirmacao) return;
    try {
      setProcessandoAcao(true);
      if (confirmacao.tipo === "atualizar") {
        const resposta = await atualizacaoSistemaService.aplicarAtualizacao();
        setPopup({ tipo: "sucesso", titulo: "Atualização iniciada", texto: `Execução ${resposta.execucaoId} iniciada com sucesso.` });
        setExecucaoLogsSelecionada(resposta.execucaoId);
      } else {
        const resposta = await atualizacaoSistemaService.rollback(confirmacao.historicoId);
        setPopup({ tipo: "sucesso", titulo: "Rollback iniciado", texto: `Execução ${resposta.execucaoId} iniciada com sucesso.` });
        setExecucaoLogsSelecionada(resposta.execucaoId);
      }
      setConfirmacao(null);
      await carregarDados(true);
      await carregarLogs();
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? (confirmacao.tipo === "atualizar" ? "Não foi possível iniciar a atualização." : "Não foi possível iniciar o rollback.") });
    } finally {
      setProcessandoAcao(false);
    }
  }

  const cards = useMemo(() => [
    { titulo: "Versão instalada", valor: status?.versaoInstalada || "---", detalhe: status?.ultimaAtualizacaoEm ? `Última atualização em ${formatarDataHoraHifen(status.ultimaAtualizacaoEm)}` : "Sem atualização registrada", icon: ListChecks },
    { titulo: "Versão publicada", valor: status?.versaoPublicada || manifesto?.latestVersion || "---", detalhe: manifesto?.releaseDate ? `Publicada em ${formatarDataHifen(manifesto.releaseDate)}` : "Sem data publicada", icon: ScrollText },
    { titulo: "Modo atual", valor: config.modo === "AUTOMATICO" ? "Automático" : "Manual", detalhe: config.modo === "AUTOMATICO" ? "Novas versões são detectadas e aplicadas automaticamente." : "Novas versões ficam disponíveis até a ação manual.", icon: Clock3 },
    { titulo: "Status da atualização", valor: status?.status || "---", detalhe: status?.mensagem || "Sem mensagem de status.", icon: AlertTriangle }
  ], [config.modo, manifesto?.latestVersion, manifesto?.releaseDate, status]);

  if (carregando) {
    return <main className="g3-container"><p className="text-sm text-slate-600">Carregando atualização do sistema...</p></main>;
  }

  return (
    <>
      <main className={classesTelaPadraoBeneficiario.container}>
        <section className={classesTelaPadraoBeneficiario.barraAcoes} data-print="toolbar">
          <div className={classesTelaPadraoBeneficiario.gradeAcoes}>
            <Button size="sm" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => void verificarAtualizacao()} disabled={processandoAcao}>
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Verificar atualização
            </Button>
            <Button size="sm" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => void baixarPacote()} disabled={!canUpdate || processandoAcao || !!status?.emExecucao}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Baixar pacote
            </Button>
            <Button size="sm" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => setConfirmacao({ tipo: "atualizar" })} disabled={!canUpdate || processandoAcao || !!status?.emExecucao || !status?.atualizacaoDisponivel}>
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Atualizar sistema
            </Button>
            <Button size="sm" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => setConfirmacao({ tipo: "rollback", historicoId: ultimoHistorico?.id })} disabled={!canRollback || processandoAcao || !!status?.emExecucao || !ultimoHistorico?.rollbackDisponivel}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Executar rollback
            </Button>
            <Button size="sm" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => { setModalLogsAberto(true); void carregarLogs(); }}>
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Ver logs
            </Button>
            <Button size="sm" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => setModalChangelogAberto(true)}>
              <ScrollText className="mr-1.5 h-3.5 w-3.5" />
              Ver changelog
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icone = card.icon;
            return (
              <Card key={card.titulo} className="shadow-[0_18px_40px_-28px_rgba(15,122,67,0.45)]">
                <CardHeader className="space-y-1 pb-2">
                  <div className="flex items-center gap-2 text-[var(--g3-active)]">
                    <Icone className="h-4 w-4" />
                    <CardTitle className="text-sm font-semibold">{card.titulo}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-2xl font-bold text-[var(--g3-foreground)]">{card.valor}</p>
                  <p className="text-xs text-[var(--g3-muted)]">{card.detalhe}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-[var(--g3-active)]">Configuração e status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Modo de atualização</Label>
                  <Select value={draftModo} onChange={(event) => setDraftModo(event.target.value as AtualizacaoSistemaConfig["modo"])} disabled={!canChangeMode || salvandoModo || !!status?.emExecucao}>
                    <option value="MANUAL">Manual</option>
                    <option value="AUTOMATICO">Automático</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Responsável pela última atualização</Label>
                  <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/30 px-3 py-2 text-sm">{status?.responsavelUltimaAtualizacao || ultimoHistorico?.usuarioResponsavel || "---"}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void salvarModo()} disabled={!canChangeMode || salvandoModo || !houveMudancaModo || !!status?.emExecucao}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {salvandoModo ? "Salvando..." : "Salvar modo"}
                </Button>
                <Badge className={classeStatus(status?.status)}>{status?.status || "SEM STATUS"}</Badge>
                {status?.atualizacaoDisponivel ? <Badge className="border-amber-200 bg-amber-50 text-amber-800">Nova versão disponível</Badge> : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--g3-muted)]">
                  <span>Progresso da atualização</span>
                  <span>{Math.max(0, Math.min(100, Number(status?.progresso ?? 0)))}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[var(--g3-primary-soft)]/60">
                  <div className="h-full rounded-full bg-[var(--g3-active)] transition-all" style={{ width: `${Math.max(0, Math.min(100, Number(status?.progresso ?? 0)))}%` }} />
                </div>
                <p className="text-sm text-[var(--g3-muted)]">{status?.mensagem || "Sem processamento em andamento."}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3 text-sm">
                  <p className="font-semibold">Data da última atualização</p>
                  <p className="mt-1 text-[var(--g3-muted)]">{formatarDataHoraHifen(status?.ultimaAtualizacaoEm || ultimoHistorico?.dataHora)}</p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3 text-sm">
                  <p className="font-semibold">Data da última verificação</p>
                  <p className="mt-1 text-[var(--g3-muted)]">{formatarDataHoraHifen(status?.ultimaVerificacaoEm)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-[var(--g3-active)]">Changelog da versão</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-[var(--g3-foreground)]">{ultimaEntradaChangelog?.version || manifesto?.latestVersion || "---"}</p>
                  <Badge className={classeStatus(ultimaEntradaChangelog?.releaseType)}>{ultimaEntradaChangelog?.releaseType || manifesto?.releaseType || "stable"}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--g3-muted)]">{formatarDataHifen(ultimaEntradaChangelog?.releaseDate || manifesto?.releaseDate)}</p>
                <p className="mt-3 text-sm text-[var(--g3-foreground)]">{ultimaEntradaChangelog?.title || manifesto?.description || "Sem descrição publicada."}</p>
                <p className="mt-2 text-sm text-[var(--g3-muted)]">{ultimaEntradaChangelog?.description || "Nenhum detalhe adicional informado."}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Mudanças publicadas</p>
                {(ultimaEntradaChangelog?.changes ?? []).length ? (
                  <ul className="space-y-1 text-sm text-[var(--g3-muted)]">
                    {(ultimaEntradaChangelog?.changes ?? []).slice(0, 5).map((item) => <li key={item} className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2">{item}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--g3-muted)]">Sem itens detalhados no changelog.</p>
                )}
              </div>

              <Textarea readOnly value={[`Pacote publicado: ${manifesto?.packageName || "---"}`, `Checksum: ${manifesto?.checksum || "---"}`, `Compatibilidade mínima: ${manifesto?.minCompatibleVersion || "---"}`, `Origem remota: ${manifesto?.downloadUrl || "Pacote local em /updates/packages"}`].join("\n")} className="min-h-[132px] resize-none" />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-semibold text-[var(--g3-active)]">Histórico de atualizações</CardTitle>
            <Button size="sm" variant="outline" onClick={() => { setModalLogsAberto(true); void carregarLogs(ultimoHistorico?.execucaoId); }}>
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Logs da última execução
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Data/hora</th>
                    <th className="px-3 py-2 text-left">Versões</th>
                    <th className="px-3 py-2 text-left">Modo</th>
                    <th className="px-3 py-2 text-left">Responsável</th>
                    <th className="px-3 py-2 text-left">Duração</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.length ? historico.map((item, index) => (
                    <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/20"}`}>
                      <td className="px-3 py-2">{formatarDataHoraHifen(item.dataHora)}</td>
                      <td className="px-3 py-2"><p>{item.versaoAnterior || "---"} → {item.versaoNova || "---"}</p><p className="text-xs text-[var(--g3-muted)]">{item.execucaoId}</p></td>
                      <td className="px-3 py-2">{item.modo === "AUTOMATICO" ? "Automático" : "Manual"}</td>
                      <td className="px-3 py-2">{item.usuarioResponsavel || "Sistema"}</td>
                      <td className="px-3 py-2">{formatarDuracao(item.duracaoMs)}</td>
                      <td className="px-3 py-2"><Badge className={classeStatus(item.status)}>{item.status}</Badge></td>
                      <td className="px-3 py-2"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => { setModalLogsAberto(true); void carregarLogs(item.execucaoId); }}>Logs</Button><Button size="sm" variant="outline" onClick={() => setConfirmacao({ tipo: "rollback", historicoId: item.id })} disabled={!canRollback || !item.rollbackDisponivel || !!status?.emExecucao}>Rollback</Button></div></td>
                    </tr>
                  )) : (
                    <tr><td className="px-3 py-4 text-center text-[var(--g3-muted)]" colSpan={7}>Nenhuma atualização registrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
      <ModalBase aberto={modalLogsAberto} titulo="Logs da atualização" onClose={() => setModalLogsAberto(false)}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Execução selecionada</p>
              <p className="text-xs text-[var(--g3-muted)]">{execucaoLogsSelecionada || "---"}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void carregarLogs()}>
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Atualizar logs
            </Button>
          </div>
          <div className="space-y-2">
            {logs.length ? logs.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--g3-border)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={classeStatus(item.nivel)}>{item.nivel}</Badge>
                  <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.etapa}</p>
                  <p className="text-xs text-[var(--g3-muted)]">{formatarDataHoraHifen(item.criadoEm)}</p>
                </div>
                <p className="mt-2 text-sm text-[var(--g3-foreground)]">{item.mensagem}</p>
                {item.detalhes ? <Textarea readOnly value={JSON.stringify(item.detalhes, null, 2)} className="mt-3 min-h-[100px] resize-none text-xs" /> : null}
              </div>
            )) : <p className="text-sm text-[var(--g3-muted)]">Nenhum log disponível para a execução selecionada.</p>}
          </div>
        </div>
      </ModalBase>

      <ModalBase aberto={modalChangelogAberto} titulo="Changelog publicado" onClose={() => setModalChangelogAberto(false)}>
        <div className="space-y-3">
          {changelog.length ? changelog.map((item) => (
            <div key={`${item.version}-${item.releaseDate ?? ""}`} className="rounded-xl border border-[var(--g3-border)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-[var(--g3-foreground)]">{item.version}</p>
                <Badge className={classeStatus(item.releaseType)}>{item.releaseType || "stable"}</Badge>
                <p className="text-xs text-[var(--g3-muted)]">{formatarDataHifen(item.releaseDate)}</p>
              </div>
              <p className="mt-2 text-sm font-medium text-[var(--g3-foreground)]">{item.title || "Sem título"}</p>
              <p className="mt-1 text-sm text-[var(--g3-muted)]">{item.description || "Sem descrição detalhada."}</p>
              {(item.changes ?? []).length ? <ul className="mt-3 space-y-1 text-sm text-[var(--g3-muted)]">{(item.changes ?? []).map((change) => <li key={change} className="rounded-md bg-[var(--g3-primary-soft)]/20 px-3 py-2">{change}</li>)}</ul> : null}
            </div>
          )) : <p className="text-sm text-[var(--g3-muted)]">Nenhuma entrada de changelog publicada.</p>}
        </div>
      </ModalBase>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao aberto={!!confirmacao} titulo={confirmacao?.tipo === "rollback" ? "Confirmar rollback" : "Confirmar atualização"} texto={confirmacao?.tipo === "rollback" ? "Deseja realmente restaurar a última versão disponível no backup?" : "Deseja aplicar a nova versão publicada nesta instância?"} processando={processandoAcao} onCancel={() => setConfirmacao(null)} onConfirm={() => void confirmarAcao()} confirmarTexto={confirmacao?.tipo === "rollback" ? "Executar rollback" : "Atualizar sistema"} confirmarVariant={confirmacao?.tipo === "rollback" ? "outline" : "default"} />
    </>
  );
}
