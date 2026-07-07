import { useEffect, useMemo, useRef, useState } from "react";
import {
  DatabaseZap,
  Download,
  HardDriveUpload,
  Layers3,
  LockKeyhole,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  TimerReset,
  TriangleAlert
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { backupSistemaService } from "@/services/backup-sistema.service";
import type { BackupSistemaItem, BackupSistemaResumo, BackupSistemaTipo } from "@/types/backup-sistema";

type AbaId = "painel" | "banco" | "imagens" | "historico";

type AcaoExecucao =
  | { tipo: "restaurar-banco"; backup: BackupSistemaItem }
  | { tipo: "restaurar-imagens"; backup: BackupSistemaItem }
  | null;

const abas: AdminTab[] = [
  { id: "painel", label: "Painel", icon: Sparkles },
  { id: "banco", label: "Banco de dados", icon: DatabaseZap },
  { id: "imagens", label: "Imagens", icon: Layers3 },
  { id: "historico", label: "Histórico", icon: TimerReset }
];

function formatarDataHora(valor?: string | null) {
  if (!valor) return "---";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "---";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(data);
}

function formatarData(valor?: string | null) {
  if (!valor) return "---";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "---";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(data);
}

function destacarTipo(tipo: BackupSistemaTipo) {
  return tipo === "BANCO"
    ? "border-sky-200 bg-sky-50 text-sky-800"
    : "border-violet-200 bg-violet-50 text-violet-800";
}

function extrairNomeBonito(tipo: BackupSistemaTipo) {
  return tipo === "BANCO" ? "Banco de dados" : "Imagens";
}

export function BackupRestauracaoPage() {
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("painel");
  const [resumo, setResumo] = useState<BackupSistemaResumo | null>(null);
  const [backups, setBackups] = useState<BackupSistemaItem[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<string>("");
  const [acaoExecucao, setAcaoExecucao] = useState<AcaoExecucao>(null);
  const [confirmarTexto, setConfirmarTexto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [baixandoId, setBaixandoId] = useState<string>("");
  const ultimaCargaRef = useRef<number>(0);

  const backupSelecionado = useMemo(
    () => backups.find((item) => item.id === selecionadoId) ?? null,
    [backups, selecionadoId]
  );
  const backupsBanco = useMemo(() => backups.filter((item) => item.tipo === "BANCO"), [backups]);
  const backupsImagens = useMemo(() => backups.filter((item) => item.tipo === "IMAGENS"), [backups]);

  async function carregarDados(silencioso = false) {
    if (!silencioso) setCarregando(true);
    try {
      const [painel, lista] = await Promise.all([
        backupSistemaService.obterPainel(),
        backupSistemaService.listarBackups()
      ]);
      setResumo(painel);
      setBackups(lista);
      ultimaCargaRef.current = Date.now();
      if (!selecionadoId && lista.length) {
        setSelecionadoId(lista[0].id);
      }
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Falha ao carregar",
        texto: error?.response?.data?.message ?? "Não foi possível carregar os dados de backup."
      });
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarDados();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (processando) return;
      if (Date.now() - ultimaCargaRef.current < 8000) return;
      void carregarDados(true);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [processando]);

  async function gerarBackup(tipo: "banco" | "imagens") {
    setProcessando(true);
    setPopup(null);

    try {
      if (tipo === "banco") {
        await backupSistemaService.gerarBackupBanco();
      } else {
        await backupSistemaService.gerarBackupImagens();
      }

      setPopup({
        tipo: "sucesso",
        titulo: "Operação concluída",
        texto:
          tipo === "banco"
            ? "Backup do banco de dados gerado com sucesso."
            : "Backup das imagens gerado com sucesso."
      });
      await carregarDados(true);
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Não foi possível concluir",
        texto: error?.response?.data?.message ?? "O sistema não conseguiu concluir a operação."
      });
    } finally {
      setProcessando(false);
    }
  }

  async function executarAcaoRestauracao() {
    if (!acaoExecucao) return;
    if (confirmarTexto.trim().toUpperCase() !== "RESTAURAR") {
      setPopup({
        tipo: "aviso",
        titulo: "Confirmação obrigatória",
        texto: "Digite RESTAURAR antes de concluir a ação."
      });
      return;
    }
    setProcessando(true);
    setPopup(null);

    try {
      if (acaoExecucao.tipo === "restaurar-banco") {
        await backupSistemaService.restaurarBackupBanco(acaoExecucao.backup.id);
      } else {
        await backupSistemaService.restaurarBackupImagens(acaoExecucao.backup.id);
      }

      setPopup({
        tipo: "sucesso",
        titulo: "Operação concluída",
        texto: acaoExecucao.tipo === "restaurar-banco" ? "Banco de dados restaurado com sucesso." : "Imagens restauradas com sucesso."
      });
      setAcaoExecucao(null);
      setConfirmarTexto("");
      await carregarDados(true);
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Não foi possível concluir",
        texto: error?.response?.data?.message ?? "O sistema não conseguiu concluir a operação."
      });
    } finally {
      setProcessando(false);
    }
  }

  async function baixarBackup(backup: BackupSistemaItem) {
    setBaixandoId(backup.id);
    try {
      const resposta = await backupSistemaService.baixarBackup(backup.id);
      const url = window.URL.createObjectURL(resposta.arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${backup.id}${backup.tipo === "BANCO" ? ".dump" : ".tar.gz"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setPopup({
        tipo: "sucesso",
        titulo: "Download preparado",
        texto: `O arquivo de ${extrairNomeBonito(backup.tipo).toLowerCase()} foi baixado com sucesso.`
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Falha no download",
        texto: error?.response?.data?.message ?? "Não foi possível baixar o backup selecionado."
      });
    } finally {
      setBaixandoId("");
    }
  }

  function abrirRestauracao(backup: BackupSistemaItem) {
    setSelecionadoId(backup.id);
    setConfirmarTexto("");
    setAcaoExecucao(
      backup.tipo === "BANCO"
        ? { tipo: "restaurar-banco", backup }
        : { tipo: "restaurar-imagens", backup }
    );
  }

  const temSelecaoBanco = backupsBanco.length > 0 && backupsBanco.some((item) => item.id === selecionadoId && item.tipo === "BANCO");
  const temSelecaoImagens =
    backupsImagens.length > 0 && backupsImagens.some((item) => item.id === selecionadoId && item.tipo === "IMAGENS");

  const actions: AdminAction[] = [
    {
      id: "atualizar-painel",
      label: "Atualizar painel",
      icon: RefreshCcw,
      variant: "outline",
      onClick: () => void carregarDados(),
      disabled: processando || carregando
    },
    {
      id: "gerar-backup-banco",
      label: "Gerar backup do banco",
      icon: DatabaseZap,
      variant: "default",
      onClick: () => void gerarBackup("banco"),
      disabled: processando
    },
    {
      id: "gerar-backup-imagens",
      label: "Gerar backup das imagens",
      icon: Layers3,
      variant: "outline",
      onClick: () => void gerarBackup("imagens"),
      disabled: processando
    }
  ];

  if (carregando) {
    return (
      <main className="g3-container">
        <p className="text-sm text-slate-600">Carregando gestão de backup e restauração...</p>
      </main>
    );
  }

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tab) => setAbaAtiva(tab as AbaId)}
        actions={actions}
        sectionLabel="Configurações gerais"
        pageTitle="Backup e restauração"
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        activeIcon={abaAtiva === "painel" ? Sparkles : abaAtiva === "banco" ? DatabaseZap : abaAtiva === "imagens" ? Layers3 : TimerReset}
      >
        <Card className="overflow-hidden border-[rgba(15,122,67,0.16)] bg-gradient-to-br from-emerald-50 via-white to-sky-50 shadow-[0_24px_80px_-40px_rgba(15,122,67,0.45)]">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">Operação crítica</Badge>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-[var(--g3-foreground)]">
                    Gestão unificada de banco e imagens
                  </h2>
                  <p className="max-w-3xl text-sm text-[var(--g3-muted)]">
                    Gere cópias seguras do banco de dados e das imagens do sistema, baixe os arquivos
                    produzidos e restaure com confirmação explícita. O fluxo foi desenhado para ser
                    didático, rastreável e seguro.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 text-xs text-[var(--g3-muted)] sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--g3-border)] bg-white/80 p-3">
                  <p className="font-semibold text-[var(--g3-foreground)]">Usuário logado</p>
                  <p className="mt-1">{usuario?.nome ?? usuario?.nomeUsuario ?? "Sistema"}</p>
                </div>
                <div className="rounded-2xl border border-[var(--g3-border)] bg-white/80 p-3">
                  <p className="font-semibold text-[var(--g3-foreground)]">Última atualização</p>
                  <p className="mt-1">{formatarDataHora(ultimaCargaRef.current ? new Date(ultimaCargaRef.current).toISOString() : null)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                titulo="Backups do banco"
                valor={String(resumo?.banco.total ?? 0)}
                detalhe={resumo?.banco.ultimoBackup ? `Último em ${formatarDataHora(resumo.banco.ultimoBackup.criadoEm)}` : "Nenhum backup criado"}
                icone={DatabaseZap}
              />
              <MetricCard
                titulo="Backups de imagens"
                valor={String(resumo?.imagens.total ?? 0)}
                detalhe={resumo?.imagens.ultimoBackup ? `Último em ${formatarDataHora(resumo.imagens.ultimoBackup.criadoEm)}` : "Nenhum backup criado"}
                icone={Layers3}
              />
              <MetricCard
                titulo="Banco atual"
                valor={resumo?.ambiente.databaseNome || "---"}
                detalhe="Base ativa no ambiente atual"
                icone={LockKeyhole}
              />
              <MetricCard
                titulo="Storage de imagens"
                valor={resumo?.ambiente.storageImagens ? "Ativo" : "---"}
                detalhe={resumo?.ambiente.storageRaiz || "Storage não identificado"}
                icone={HardDriveUpload}
              />
            </div>
          </CardContent>
        </Card>

        {abaAtiva === "painel" ? (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  <h3 className="text-base font-semibold text-[var(--g3-foreground)]">Fluxo recomendado</h3>
                </div>
                <div className="space-y-3">
                  {[
                    "1. Gere o backup do banco antes de qualquer manutenção crítica.",
                    "2. Gere o backup das imagens quando houver alteração em mídia ou storage.",
                    "3. Baixe os arquivos produzidos para validação externa, se necessário.",
                    "4. Na restauração, digite RESTAURAR e confirme apenas quando o ambiente estiver pronto."
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-[var(--g3-border)] bg-white/80 px-4 py-3 text-sm text-[var(--g3-foreground)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <TriangleAlert className="h-5 w-5 text-amber-600" />
                  <h3 className="text-base font-semibold text-[var(--g3-foreground)]">Cuidados</h3>
                </div>
                <ul className="space-y-2 text-sm text-[var(--g3-muted)]">
                  <li>As ações de restauração são restritas a administradores.</li>
                  <li>O banco pode ser temporariamente indisponível durante a restauração.</li>
                  <li>Os backups ficam organizados por tipo dentro de `/storage/backups/sistema`.</li>
                  <li>As imagens são restauradas preservando a árvore original do storage.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {abaAtiva === "banco" ? (
          <BackupSection
            titulo="Banco de dados"
            descricao="Crie, baixe e restaure cópias completas do banco PostgreSQL com um fluxo seguro e confirmado."
            lista={backupsBanco}
            selecionadoId={selecionadoId}
            onSelecionar={setSelecionadoId}
            onBaixar={baixarBackup}
            onRestaurar={abrirRestauracao}
            onGerar={() => void gerarBackup("banco")}
            processando={processando}
            baixandoId={baixandoId}
            restaurarDisponivel={temSelecaoBanco}
          />
        ) : null}

        {abaAtiva === "imagens" ? (
          <BackupSection
            titulo="Imagens do sistema"
            descricao="Proteja a árvore de imagens geradas pelo sistema com cópias compactadas e restauração guiada."
            lista={backupsImagens}
            selecionadoId={selecionadoId}
            onSelecionar={setSelecionadoId}
            onBaixar={baixarBackup}
            onRestaurar={abrirRestauracao}
            onGerar={() => void gerarBackup("imagens")}
            processando={processando}
            baixandoId={baixandoId}
            restaurarDisponivel={temSelecaoImagens}
          />
        ) : null}

        {abaAtiva === "historico" ? (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[var(--g3-foreground)]">Histórico consolidado</h3>
                  <p className="text-sm text-[var(--g3-muted)]">
                    Selecione um backup e use as ações rápidas para baixar ou restaurar.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void carregarDados()}>
                  <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                  Atualizar
                </Button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[var(--g3-border)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                    <tr>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Arquivo</th>
                      <th className="px-3 py-2 text-left">Tamanho</th>
                      <th className="px-3 py-2 text-left">Criado por</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.length ? (
                      backups.map((item) => {
                        const selecionado = item.id === selecionadoId;
                        return (
                          <tr
                            key={item.id}
                            className={`cursor-pointer border-t border-[var(--g3-border)] transition ${selecionado ? "bg-emerald-50" : "bg-white hover:bg-slate-50"}`}
                            onClick={() => setSelecionadoId(item.id)}
                          >
                            <td className="px-3 py-2">
                              <Badge className={destacarTipo(item.tipo)}>{extrairNomeBonito(item.tipo)}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="space-y-1">
                                <p>{formatarDataHora(item.criadoEm)}</p>
                                {item.restauradoEm ? (
                                  <p className="text-xs text-[var(--g3-muted)]">
                                    Restaurado em {formatarDataHora(item.restauradoEm)}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-medium text-[var(--g3-foreground)]">{item.arquivoNome}</p>
                              <p className="text-xs text-[var(--g3-muted)]">{item.id}</p>
                            </td>
                            <td className="px-3 py-2">{item.tamanhoFormatado}</td>
                            <td className="px-3 py-2">{item.criadoPor}</td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void baixarBackup(item);
                                  }}
                                  disabled={baixandoId === item.id}
                                >
                                  <Download className="mr-1.5 h-3.5 w-3.5" />
                                  {baixandoId === item.id ? "Baixando..." : "Baixar"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    abrirRestauracao(item);
                                  }}
                                >
                                  <TimerReset className="mr-1.5 h-3.5 w-3.5" />
                                  Restaurar
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="px-3 py-4 text-center text-[var(--g3-muted)]" colSpan={6}>
                          Nenhum backup disponível.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </AdminPageLayout>

        <PopupConfirmacao
          aberto={!!acaoExecucao}
        titulo={acaoExecucao?.tipo === "restaurar-banco" ? "Confirmar restauração do banco" : "Confirmar restauração das imagens"}
        texto={
          acaoExecucao?.tipo === "restaurar-banco"
            ? `Você vai restaurar o banco de dados a partir de ${acaoExecucao.backup.arquivoNome}. Digite RESTAURAR para liberar a ação.`
            : `Você vai restaurar as imagens a partir de ${acaoExecucao?.backup.arquivoNome}. Digite RESTAURAR para liberar a ação.`
        }
        processando={processando}
        onCancel={() => {
          setAcaoExecucao(null);
          setConfirmarTexto("");
        }}
        onConfirm={() => void executarAcaoRestauracao()}
        confirmarTexto="Restaurar"
        confirmarVariant="danger"
      >
        {acaoExecucao?.tipo?.startsWith("restaurar") ? (
          <div className="space-y-2">
            <Label htmlFor="confirmar-restauracao">Digite RESTAURAR para confirmar</Label>
            <Input
              id="confirmar-restauracao"
              value={confirmarTexto}
              onChange={(event) => setConfirmarTexto(event.target.value)}
              placeholder="RESTAURAR"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-[var(--g3-muted)]">
              Esta confirmação evita restauração acidental e obriga uma intenção explícita.
            </p>
          </div>
        ) : null}
      </PopupConfirmacao>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}

function MetricCard({
  titulo,
  valor,
  detalhe,
  icone: Icone
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  icone: LucideIcon;
}) {
  return (
    <div className="rounded-3xl border border-[var(--g3-border)] bg-white/90 p-4 shadow-[0_16px_50px_-36px_rgba(15,23,42,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
            {titulo}
          </p>
          <p className="text-xl font-semibold text-[var(--g3-foreground)]">{valor}</p>
        </div>
        <div className="rounded-2xl bg-[var(--g3-primary-soft)] p-2 text-[var(--g3-active)]">
          <Icone className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--g3-muted)]">{detalhe}</p>
    </div>
  );
}

function BackupSection({
  titulo,
  descricao,
  lista,
  selecionadoId,
  onSelecionar,
  onBaixar,
  onRestaurar,
  onGerar,
  processando,
  baixandoId,
  restaurarDisponivel
}: {
  titulo: string;
  descricao: string;
  lista: BackupSistemaItem[];
  selecionadoId: string;
  onSelecionar: (id: string) => void;
  onBaixar: (item: BackupSistemaItem) => Promise<void>;
  onRestaurar: (item: BackupSistemaItem) => void;
  onGerar: () => void;
  processando: boolean;
  baixandoId: string;
  restaurarDisponivel: boolean;
}) {
  const backupSelecionado = lista.find((item) => item.id === selecionadoId) ?? null;

  return (
    <div className="space-y-4">
      <Card className="border-[var(--g3-border)]">
        <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[var(--g3-foreground)]">{titulo}</h3>
            <p className="text-sm text-[var(--g3-muted)]">{descricao}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onGerar} disabled={processando}>
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Gerar novo backup
            </Button>
            <Button
              variant="danger"
              onClick={() => backupSelecionado && onRestaurar(backupSelecionado)}
              disabled={processando || !restaurarDisponivel || !backupSelecionado}
            >
              <TimerReset className="mr-1.5 h-3.5 w-3.5" />
              Restaurar selecionado
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-[var(--g3-border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
            <tr>
              <th className="px-3 py-2 text-left">Selecionar</th>
              <th className="px-3 py-2 text-left">Arquivo</th>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Tamanho</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length ? (
              lista.map((item) => {
                const selecionado = item.id === selecionadoId;
                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer border-t border-[var(--g3-border)] transition ${selecionado ? "bg-emerald-50" : "bg-white hover:bg-slate-50"}`}
                    onClick={() => onSelecionar(item.id)}
                  >
                    <td className="px-3 py-2">
                      <Badge className={destacarTipo(item.tipo)}>{extrairNomeBonito(item.tipo)}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-[var(--g3-foreground)]">{item.arquivoNome}</p>
                      <p className="text-xs text-[var(--g3-muted)]">{item.id}</p>
                    </td>
                    <td className="px-3 py-2">{formatarDataHora(item.criadoEm)}</td>
                    <td className="px-3 py-2">{item.tamanhoFormatado}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            void onBaixar(item);
                          }}
                          disabled={baixandoId === item.id}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          {baixandoId === item.id ? "Baixando..." : "Baixar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRestaurar(item);
                          }}
                        >
                          <TimerReset className="mr-1.5 h-3.5 w-3.5" />
                          Restaurar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-3 py-4 text-center text-[var(--g3-muted)]" colSpan={5}>
                  Nenhum backup disponível para este tipo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {backupSelecionado ? (
        <Card className="border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/20">
          <CardContent className="space-y-2 p-5 text-sm">
            <p className="font-semibold text-[var(--g3-foreground)]">Backup selecionado</p>
            <p className="text-[var(--g3-muted)]">{backupSelecionado.arquivoNome}</p>
            <p className="text-[var(--g3-muted)]">Criado em {formatarDataHora(backupSelecionado.criadoEm)}</p>
            <p className="text-[var(--g3-muted)]">Tamanho {backupSelecionado.tamanhoFormatado}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
