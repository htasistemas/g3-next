import { useDeferredValue, useMemo, useState } from "react";
import { Activity, CalendarRange, FileDown, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { imprimirHtml } from "@/lib/report-utils";
import {
  AgendaCardList,
  BeneficiarioSelector,
  DataSelector,
  GenerateCardButton,
  ItemResumoCard,
  ItemSelector,
  TipoSelector
} from "@/modules/agendamentos-operacional/components";
import {
  useAgendamentos,
  useBeneficiariosOperacionaisAgendamento,
  useCancelarAgendamento,
  useIndicadoresAgendamentos,
  useItensOperacionaisAgendamento,
  useListaEsperaAgendamentos,
  useNotificarAgendamento,
  useSalvarAgendamentoOperacional
} from "@/features/agendamentos/use-agendamentos";
import type { Agendamento, AgendamentoOperacionalItem, AgendamentoOperacionalTipo } from "@/types/agendamento";

type AbaId = "agenda" | "dashboard" | "espera";

const abas: AdminTab[] = [
  { id: "agenda", label: "Agendamento operacional", icon: CalendarRange },
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "espera", label: "Lista de espera", icon: Users }
];

const hoje = new Date().toISOString().slice(0, 10);

function obterInicioSemana(dataBase: Date) {
  const data = new Date(dataBase);
  const dia = data.getDay();
  const deslocamento = dia === 0 ? -6 : 1 - dia;
  data.setDate(data.getDate() + deslocamento);
  data.setHours(0, 0, 0, 0);
  return data;
}

function obterFimSemana(dataBase: Date) {
  const inicio = obterInicioSemana(dataBase);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);
  return fim;
}

function normalizarData(data?: string) {
  if (!data) return null;
  const parsed = new Date(`${data.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function escapeHtml(value?: string | number | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function AgendamentosPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("agenda");
  const [tipo, setTipo] = useState<AgendamentoOperacionalTipo | undefined>();
  const [buscaItem, setBuscaItem] = useState("");
  const buscaItemAdiada = useDeferredValue(buscaItem);
  const [itemSelecionado, setItemSelecionado] = useState<AgendamentoOperacionalItem | null>(null);
  const [dataAgendamento, setDataAgendamento] = useState(hoje);
  const [buscaBeneficiario, setBuscaBeneficiario] = useState("");
  const [beneficiariosSelecionados, setBeneficiariosSelecionados] = useState<number[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState<Agendamento | null>(null);

  const agendamentosQuery = useAgendamentos({});
  const indicadoresQuery = useIndicadoresAgendamentos({});
  const listaEsperaQuery = useListaEsperaAgendamentos();
  const itensQuery = useItensOperacionaisAgendamento(tipo, buscaItemAdiada);
  const beneficiariosQuery = useBeneficiariosOperacionaisAgendamento(itemSelecionado?.id ?? null);
  const salvarMutation = useSalvarAgendamentoOperacional();
  const cancelarMutation = useCancelarAgendamento();
  const notificarMutation = useNotificarAgendamento();

  const cards = useMemo(
    () =>
      (agendamentosQuery.data ?? [])
        .filter((item) => item.itemOrigemId || item.itemNome || item.coletivo)
        .sort((a, b) => `${a.data ?? ""}${a.horaInicial ?? ""}`.localeCompare(`${b.data ?? ""}${b.horaInicial ?? ""}`)),
    [agendamentosQuery.data]
  );

  const cardSelecionado = cards.find((item) => item.id === selecionadoId) ?? null;

  const beneficiariosFiltrados = useMemo(() => {
    const termo = buscaBeneficiario.trim().toLowerCase();
    const base = beneficiariosQuery.data ?? [];
    if (!termo) return base;
    return base.filter((item) => item.nomeCompleto.toLowerCase().includes(termo));
  }, [beneficiariosQuery.data, buscaBeneficiario]);

  const resumoOperacional = [
    { label: "Tipo", value: tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : "Não selecionado" },
    { label: "Item", value: itemSelecionado?.nome || "Não selecionado" },
    { label: "Data", value: dataAgendamento ? new Date(`${dataAgendamento}T12:00:00`).toLocaleDateString("pt-BR") : "Não selecionada" },
    { label: "Beneficiários", value: `${beneficiariosSelecionados.length} selecionado(s)` }
  ];

  const dashboardResumo = useMemo(() => {
    const hojeData = new Date();
    const inicioSemana = obterInicioSemana(hojeData);
    const fimSemana = obterFimSemana(hojeData);
    const inicioMes = new Date(hojeData.getFullYear(), hojeData.getMonth(), 1);
    const fimMes = new Date(hojeData.getFullYear(), hojeData.getMonth() + 1, 0, 23, 59, 59, 999);

    const participantesAgendados = cards.reduce((total, item) => total + (item.participantes?.length ?? 0), 0);
    const frequenciaMedia = cards.length ? Math.round((participantesAgendados / cards.length) * 10) / 10 : 0;
    const faltasSemana = cards.filter((item) => {
      const data = normalizarData(item.data);
      const status = (item.status ?? "").trim().toUpperCase();
      return data && data >= inicioSemana && data <= fimSemana && status === "FALTOU";
    }).length;
    const sessoesMes = cards.filter((item) => {
      const data = normalizarData(item.data);
      return data && data >= inicioMes && data <= fimMes;
    }).length;

    return [
      { label: "Pacientes agendados", value: participantesAgendados },
      { label: "Frequência média", value: frequenciaMedia.toLocaleString("pt-BR") },
      { label: "Faltas da semana", value: faltasSemana },
      { label: "Sessões do mês", value: sessoesMes },
      { label: "Lista de espera", value: (listaEsperaQuery.data ?? []).length },
      { label: "Total de cards", value: cards.length },
      { label: "Confirmados", value: indicadoresQuery.data?.confirmados ?? 0 }
    ];
  }, [cards, indicadoresQuery.data?.confirmados, listaEsperaQuery.data]);

  const acoes: AdminAction[] = [
    {
      label: "Nova agenda",
      icon: CalendarRange,
      onClick: () => {
        setSelecionadoId(null);
        setTipo(undefined);
        setBuscaItem("");
        setItemSelecionado(null);
        setBuscaBeneficiario("");
        setBeneficiariosSelecionados([]);
        setDataAgendamento(hoje);
        setAbaAtiva("agenda");
      },
      variant: "default"
    },
    { label: "Exportar", icon: FileDown, onClick: () => void 0, variant: "outline", disabled: true },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  async function salvarCard() {
    if (!tipo || !itemSelecionado?.id || !beneficiariosSelecionados.length || !dataAgendamento) {
      setPopup({ tipo: "erro", titulo: "Atenção", texto: "Selecione tipo, item, beneficiários e data antes de gerar a agenda." });
      return;
    }

    try {
      const salvo = await salvarMutation.mutateAsync({
        id: cardSelecionado?.id ? String(cardSelecionado.id) : undefined,
        tipo,
        itemId: itemSelecionado.id,
        data: dataAgendamento,
        matriculasIds: beneficiariosSelecionados
      });
      setSelecionadoId(salvo?.id ?? null);
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: cardSelecionado?.id ? "Agenda atualizada com sucesso." : "Agenda gerada com sucesso."
      });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível gerar a agenda." });
    }
  }

  async function executarNotificacao(item: Agendamento, canal: "WHATSAPP" | "EMAIL") {
    if (!item.id) return;
    try {
      const resultado = await notificarMutation.mutateAsync({ id: item.id, canal });
      if (canal === "WHATSAPP") {
        (resultado.links ?? []).slice(0, 10).forEach((link) => window.open(link, "_blank", "noopener,noreferrer"));
      }
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto:
          canal === "EMAIL"
            ? `Envio por e-mail concluído. Enviados: ${resultado.enviados}. Ignorados: ${resultado.ignorados}.`
            : `Links de WhatsApp preparados. Enviados: ${resultado.enviados}. Ignorados: ${resultado.ignorados}.`
      });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível enviar a comunicação." });
    }
  }

  function imprimirFichaPresenca(item: Agendamento) {
    const participantes = item.participantes ?? [];
    const linhas = participantes.length
      ? participantes
          .map(
            (participante, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(participante.beneficiarioNome)}</td>
                <td>${escapeHtml(participante.telefone || "-")}</td>
                <td></td>
                <td></td>
              </tr>`
          )
          .join("")
      : `
        <tr>
          <td>1</td>
          <td colspan="4">Sem beneficiários vinculados ao card.</td>
        </tr>`;

    imprimirHtml({
      titulo: `Ficha de presença - ${item.itemNome || item.tipoAtendimento}`,
      tamanhoPagina: "A4 portrait",
      estilosExtras: `
        .g3-ficha { color: #0f172a; }
        .g3-topo { border-bottom: 3px solid #047857; padding-bottom: 14px; margin-bottom: 18px; }
        .g3-topo h1 { margin: 0; font-size: 24px; color: #065f46; }
        .g3-topo p { margin: 6px 0 0; font-size: 13px; color: #475569; }
        .g3-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
        .g3-meta-item { border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px 12px; background: #f8fafc; }
        .g3-meta-item strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin-bottom: 4px; }
        .g3-meta-item span { font-size: 14px; font-weight: 600; color: #0f172a; }
        .g3-tabela thead th { background: #ecfdf5; color: #065f46; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
        .g3-tabela th, .g3-tabela td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
        .g3-tabela td { font-size: 13px; min-height: 36px; }
        .g3-rodape { margin-top: 26px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        .g3-assinatura { padding-top: 28px; border-top: 1px solid #94a3b8; text-align: center; font-size: 12px; color: #475569; }
      `,
      html: `
        <section class="g3-ficha">
          <header class="g3-topo">
            <h1>Ficha de presença</h1>
            <p>Relatório operacional do G3N</p>
          </header>
          <section class="g3-meta">
            <div class="g3-meta-item"><strong>Atividade</strong><span>${escapeHtml(item.itemNome || item.tipoAtendimento)}</span></div>
            <div class="g3-meta-item"><strong>Tipo</strong><span>${escapeHtml(item.itemTipo || item.setor || "-")}</span></div>
            <div class="g3-meta-item"><strong>Profissional</strong><span>${escapeHtml(item.profissionalNome || "Sem profissional definido")}</span></div>
            <div class="g3-meta-item"><strong>Data</strong><span>${escapeHtml(item.data ? new Date(`${item.data}T12:00:00`).toLocaleDateString("pt-BR") : "-")}</span></div>
            <div class="g3-meta-item"><strong>Horário</strong><span>${escapeHtml(item.horaInicial || "-")}</span></div>
            <div class="g3-meta-item"><strong>Local</strong><span>${escapeHtml(item.itemLocal || item.sala || item.unidade || "-")}</span></div>
          </section>
          <table class="g3-tabela">
            <thead>
              <tr>
                <th style="width: 56px;">#</th>
                <th>Beneficiário</th>
                <th style="width: 180px;">Telefone</th>
                <th style="width: 180px;">Assinatura</th>
                <th style="width: 120px;">Presença</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
          <footer class="g3-rodape">
            <div class="g3-assinatura">Responsável pelo atendimento</div>
            <div class="g3-assinatura">Data e conferência</div>
          </footer>
        </section>`
    });
  }

  function carregarParaEdicao(item: Agendamento) {
    setAbaAtiva("agenda");
    setSelecionadoId(item.id ?? null);
    setTipo(item.itemTipo);
    setBuscaItem("");
    setBuscaBeneficiario("");
    const itemResumo: AgendamentoOperacionalItem = {
      id: item.itemOrigemId ?? 0,
      nome: item.itemNome || item.tipoAtendimento,
      profissionalNome: item.profissionalNome,
      horario: item.horaInicial,
      diasSemana: item.itemDiasSemana,
      local: item.itemLocal || item.sala || item.unidade
    };
    setItemSelecionado(itemResumo.id ? itemResumo : null);
    setDataAgendamento(item.data ?? hoje);
    setBeneficiariosSelecionados(
      (item.participantes ?? [])
        .map((participante) => participante.matriculaId ?? participante.beneficiarioId)
        .filter(Boolean) as number[]
    );
  }

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Atendimentos"
        pageTitle="Agendamentos"
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={cardSelecionado?.id ? `Código: ${cardSelecionado.id}` : "Novo"}
      >
        <section className="space-y-4">
          {abaAtiva === "agenda" ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {resumoOperacional.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-[var(--g3-border)] bg-white px-4 py-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">{item.label}</p>
                    <p className="mt-2 text-sm font-medium text-[var(--g3-foreground)]">{item.value}</p>
                  </div>
                ))}
              </div>

              <Card className="border-[var(--g3-border)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfb_100%)] shadow-sm">
                <CardContent className="space-y-4">
                  <p className="text-xs text-[var(--g3-muted)]">
                    Selecione o tipo, escolha o item já existente nas inscrições, marque os beneficiários vinculados e gere a agenda do dia.
                  </p>
                  <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <TipoSelector
                      value={tipo}
                      onChange={(value) => {
                        setTipo(value);
                        setItemSelecionado(null);
                        setBeneficiariosSelecionados([]);
                      }}
                    />
                    <ItemSelector
                      busca={buscaItem}
                      onBuscaChange={setBuscaItem}
                      itens={itensQuery.data ?? []}
                      selecionadoId={itemSelecionado?.id ?? null}
                      onSelect={(item) => {
                        setItemSelecionado(item);
                        setBeneficiariosSelecionados([]);
                      }}
                      carregando={itensQuery.isLoading}
                    />
                  </div>
                  <ItemResumoCard item={itemSelecionado} />
                  <BeneficiarioSelector
                    busca={buscaBeneficiario}
                    onBuscaChange={setBuscaBeneficiario}
                    beneficiarios={beneficiariosFiltrados}
                    selecionados={beneficiariosSelecionados}
                    onToggle={(matriculaId) =>
                      setBeneficiariosSelecionados((atual) =>
                        atual.includes(matriculaId) ? atual.filter((item) => item !== matriculaId) : [...atual, matriculaId]
                      )
                    }
                    onSelecionarTodos={() =>
                      setBeneficiariosSelecionados(beneficiariosFiltrados.filter((item) => item.selecionavel).map((item) => item.matriculaId))
                    }
                    onLimparSelecao={() => setBeneficiariosSelecionados([])}
                    carregando={beneficiariosQuery.isLoading}
                  />
                  <DataSelector value={dataAgendamento} onChange={setDataAgendamento} />
                  <GenerateCardButton
                    disabled={!tipo || !itemSelecionado?.id || !beneficiariosSelecionados.length || !dataAgendamento}
                    loading={salvarMutation.isPending}
                    onClick={salvarCard}
                    texto={cardSelecionado?.id ? "Atualizar Agenda" : "Gerar Agenda"}
                  />
                </CardContent>
              </Card>

              <Card className="border-[var(--g3-border)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfb_100%)] shadow-sm">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-sm">Agenda operacional gerada</CardTitle>
                  <p className="text-xs text-[var(--g3-muted)]">
                    Cards organizados por data, com leitura rápida do item, profissional, horário, local e participantes.
                  </p>
                </CardHeader>
                <CardContent>
                  <AgendaCardList
                    cards={cards}
                    selecionadoId={selecionadoId}
                    onEditar={carregarParaEdicao}
                    onCancelar={(item) => setConfirmarCancelar(item)}
                    onWhatsApp={(item) => void executarNotificacao(item, "WHATSAPP")}
                    onEmail={(item) => void executarNotificacao(item, "EMAIL")}
                    onImprimir={imprimirFichaPresenca}
                  />
                </CardContent>
              </Card>
            </div>
          ) : null}

          {abaAtiva === "dashboard" ? (
            <Card className="border-[var(--g3-border)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfb_100%)] shadow-sm">
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm">Dashboard operacional</CardTitle>
                <p className="text-xs text-[var(--g3-muted)]">
                  Visão rápida da agenda com foco em demanda, confirmação e volume de atendimento.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {dashboardResumo.map((card) => (
                  <div key={card.label} className="rounded-2xl border border-[var(--g3-border)] bg-white px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold text-[var(--g3-foreground)]">{card.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {abaAtiva === "espera" ? (
            <Card className="border-[var(--g3-border)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfb_100%)] shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Lista de espera</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(listaEsperaQuery.data ?? []).length ? (
                  (listaEsperaQuery.data ?? []).map((item) => (
                    <div key={item.id} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.beneficiarioNome}</p>
                      <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.tipoAtendimento} - {item.prioridade || "Normal"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--g3-muted)]">Nenhum item na lista de espera.</p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </section>
      </AdminPageLayout>

      <PopupConfirmacao
        aberto={Boolean(confirmarCancelar)}
        titulo="Cancelar agenda"
        texto="Deseja realmente cancelar esta agenda operacional?"
        processando={cancelarMutation.isPending}
        onCancel={() => setConfirmarCancelar(null)}
        onConfirm={() => {
          if (!confirmarCancelar?.id) return;
          void cancelarMutation
            .mutateAsync({ id: confirmarCancelar.id, motivo: "Cancelado pela agenda operacional." })
            .then(() => {
              setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Agenda cancelada com sucesso." });
              setConfirmarCancelar(null);
            })
            .catch((error: any) =>
              setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível cancelar a agenda." })
            );
        }}
        confirmarTexto="Cancelar agenda"
      />

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}
