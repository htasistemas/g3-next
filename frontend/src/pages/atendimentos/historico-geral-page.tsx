import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ClipboardList,
  FileDown,
  Gift,
  HandHeart,
  History,
  Search,
  UserRound
} from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useCentralBuscaBeneficiarios, useCentralVisaoGeral } from "@/features/central-atendimentos/use-central-atendimentos";
import { useBeneficiario } from "@/features/beneficiarios/use-beneficiarios";
import { doacoesPlanejadasService } from "@/services/doacoes-planejadas.service";
import { agendamentosService } from "@/services/agendamentos.service";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import { useAuth } from "@/hooks/use-auth";
import type { Agendamento } from "@/types/agendamento";
import type {
  CentralAtendimento,
  CentralBeneficio,
  CentralEncaminhamento,
  CentralHistoricoItem,
  CentralInscricao
} from "@/types/central-atendimentos";
import type { DoacaoPlanejada } from "@/types/doacao-planejada";

type AbaId = "visao-geral" | "beneficios" | "atendimentos" | "atuais" | "futuros";

type FiltrosHistorico = {
  periodoInicio: string;
  periodoFim: string;
  tipoBeneficio: string;
  status: string;
  responsavel: string;
  tipoAtendimento: string;
};

type LinhaBeneficio = {
  id: string;
  data?: string;
  tipo: string;
  item: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  responsavel: string;
  observacoes: string;
  status: string;
  origem: string;
};

type LinhaAtendimento = {
  id: string;
  data: string;
  tipoAtendimento: string;
  profissional: string;
  descricao: string;
  encaminhamentos: string;
  resultado: string;
  status: string;
};

type LinhaAtividade = {
  id: string;
  categoria: string;
  titulo: string;
  data?: string;
  responsavel: string;
  status: string;
  descricao: string;
};

type ColunaTabela<Row> = {
  id: string;
  label: string;
  className?: string;
  sortValue?: (row: Row) => string | number;
  render: (row: Row) => React.ReactNode;
};

const abas: AdminTab[] = [
  { id: "visao-geral", label: "Visão geral", icon: ClipboardList },
  { id: "beneficios", label: "Benefícios", icon: Gift },
  { id: "atendimentos", label: "Atendimentos", icon: HandHeart },
  { id: "atuais", label: "Atividades atuais", icon: UserRound },
  { id: "futuros", label: "Agendamentos futuros", icon: CalendarClock }
];

const filtrosIniciais: FiltrosHistorico = {
  periodoInicio: "",
  periodoFim: "",
  tipoBeneficio: "",
  status: "",
  responsavel: "",
  tipoAtendimento: ""
};

function normalizarTexto(valor?: string | null) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarCpf(valor?: string) {
  const digitos = (valor ?? "").replace(/\D/g, "");
  if (digitos.length !== 11) return valor || "---";
  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatarTelefone(valor?: string) {
  const digitos = (valor ?? "").replace(/\D/g, "");
  if (digitos.length === 11) {
    return digitos.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (digitos.length === 10) {
    return digitos.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return valor || "---";
}

function formatarData(valor?: string) {
  if (!valor) return "---";
  const texto = valor.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [ano, mes, dia] = texto.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString("pt-BR");
}

function formatarDataHora(valor?: string) {
  if (!valor) return "---";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return formatarData(valor);
  return data.toLocaleString("pt-BR");
}

function formatarMoeda(valor?: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor ?? 0);
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function statusAtivo(valor?: string) {
  const texto = normalizarTexto(valor);
  return ["ativo", "em andamento", "agendado", "confirmado", "pendente", "aberto", "retorno pendente"].includes(texto);
}

function statusEncerrado(valor?: string) {
  const texto = normalizarTexto(valor);
  return ["cancelado", "finalizado", "atendido", "faltou", "alta"].includes(texto);
}

function aplicarFiltrosData<T>(
  itens: T[],
  filtros: FiltrosHistorico,
  resolver: (item: T) => {
    data?: string;
    tipoBeneficio?: string;
    status?: string;
    responsavel?: string;
    tipoAtendimento?: string;
  }
) {
  return itens.filter((item) => {
    const dados = resolver(item);
    const data = (dados.data ?? "").slice(0, 10);
    if (filtros.periodoInicio && data && data < filtros.periodoInicio) return false;
    if (filtros.periodoFim && data && data > filtros.periodoFim) return false;
    if (filtros.tipoBeneficio && !normalizarTexto(dados.tipoBeneficio).includes(normalizarTexto(filtros.tipoBeneficio))) {
      return false;
    }
    if (filtros.status && !normalizarTexto(dados.status).includes(normalizarTexto(filtros.status))) {
      return false;
    }
    if (filtros.responsavel && !normalizarTexto(dados.responsavel).includes(normalizarTexto(filtros.responsavel))) {
      return false;
    }
    if (
      filtros.tipoAtendimento &&
      !normalizarTexto(dados.tipoAtendimento).includes(normalizarTexto(filtros.tipoAtendimento))
    ) {
      return false;
    }
    return true;
  });
}

function TabelaPaginada<Row extends { id: string }>({
  columns,
  rows,
  emptyMessage,
  pageSize = 8,
  initialSort
}: {
  columns: ColunaTabela<Row>[];
  rows: Row[];
  emptyMessage: string;
  pageSize?: number;
  initialSort?: { columnId: string; direction: "asc" | "desc" };
}) {
  const sortableColumns = columns.filter((column) => column.sortValue);
  const [sortColumn, setSortColumn] = useState(initialSort?.columnId ?? sortableColumns[0]?.id ?? "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialSort?.direction ?? "desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [rows.length, sortColumn, sortDirection]);

  const sortedRows = useMemo(() => {
    const column = columns.find((item) => item.id === sortColumn && item.sortValue);
    if (!column?.sortValue) return rows;
    return [...rows].sort((left, right) => {
      const valorLeft = column.sortValue?.(left) ?? "";
      const valorRight = column.sortValue?.(right) ?? "";
      if (valorLeft === valorRight) return 0;
      const resultado = valorLeft > valorRight ? 1 : -1;
      return sortDirection === "asc" ? resultado : -resultado;
    });
  }, [columns, rows, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const rowsPaginadas = sortedRows.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-8 text-center text-sm text-[var(--g3-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-[var(--g3-border)]">
        <div className="max-h-[460px] overflow-auto">
          <table className="min-w-full divide-y divide-[var(--g3-border)] text-sm">
            <thead className="bg-[var(--g3-card-soft)]">
              <tr>
                {columns.map((column) => {
                  const ativo = sortColumn === column.id;
                  return (
                    <th key={column.id} className={`px-3 py-2 text-left font-semibold text-[var(--g3-foreground)] ${column.className ?? ""}`}>
                      {column.sortValue ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 transition hover:text-[var(--g3-active)]"
                          onClick={() => {
                            if (ativo) {
                              setSortDirection((estado) => (estado === "asc" ? "desc" : "asc"));
                              return;
                            }
                            setSortColumn(column.id);
                            setSortDirection("desc");
                          }}
                        >
                          {column.label}
                          <span className="text-[10px] text-[var(--g3-muted)]">{ativo ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span>
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--g3-border)] bg-[var(--g3-card)]">
              {rowsPaginadas.map((row) => (
                <tr key={row.id} className="align-top">
                  {columns.map((column) => (
                    <td key={column.id} className={`px-3 py-2 text-[var(--g3-foreground)] ${column.className ?? ""}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-xs text-[var(--g3-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>
          Página {pageSafe} de {totalPages} • {rows.length} registro(s)
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--g3-border)] px-3 py-1.5 transition hover:bg-[var(--g3-card-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage((estado) => Math.max(1, estado - 1))}
            disabled={pageSafe === 1}
          >
            Anterior
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--g3-border)] px-3 py-1.5 transition hover:bg-[var(--g3-card-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage((estado) => Math.min(totalPages, estado + 1))}
            disabled={pageSafe === totalPages}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

function CardResumo({ titulo, valor, detalhe }: { titulo: string; valor: string | number; detalhe?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">{titulo}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--g3-foreground)]">{valor}</p>
      {detalhe ? <p className="mt-1 text-xs text-[var(--g3-muted)]">{detalhe}</p> : null}
    </div>
  );
}

function montarAtividadesAtuais(
  inscricoes: CentralInscricao[],
  atendimentos: CentralAtendimento[],
  encaminhamentos: CentralEncaminhamento[],
  doacoesPlanejadas: DoacaoPlanejada[]
) {
  const hoje = hojeIso();
  const linhas: LinhaAtividade[] = [];

  inscricoes.forEach((item) => {
    const dataInicio = item.dataInicio ?? item.dataInscricao;
    if (statusEncerrado(item.situacao) || (dataInicio && dataInicio > hoje)) {
      return;
    }
    linhas.push({
      id: `inscricao-${item.id}`,
      categoria: item.tipo ?? "Curso ou atividade",
      titulo: item.nome,
      data: dataInicio,
      responsavel: item.responsavel ?? "---",
      status: item.situacao ?? "Ativo",
      descricao: [item.local, item.dataFinal ? `Término previsto: ${formatarData(item.dataFinal)}` : undefined]
        .filter(Boolean)
        .join(" • ")
    });
  });

  atendimentos
    .filter((item) => statusAtivo(item.status))
    .forEach((item) => {
      linhas.push({
        id: `atendimento-${item.id}`,
        categoria: "Acompanhamento",
        titulo: item.tipoAtendimento,
        data: item.dataHora,
        responsavel: item.profissionalResponsavel,
        status: item.status ?? "Em andamento",
        descricao: item.resumo
      });
    });

  encaminhamentos
    .filter((item) => statusAtivo(item.status))
    .forEach((item) => {
      linhas.push({
        id: `encaminhamento-${item.id}`,
        categoria: "Encaminhamento",
        titulo: `${item.tipo} • ${item.destino}`,
        data: item.retornoEsperado ?? item.data,
        responsavel: item.profissional,
        status: item.status ?? "Pendente",
        descricao: item.motivo
      });
    });

  doacoesPlanejadas
    .filter((item) => !statusEncerrado(item.status) && (item.data_prevista ?? "") <= hoje)
    .forEach((item) => {
      linhas.push({
        id: `doacao-planejada-atual-${item.id_doacao_planejada}`,
        categoria: "Benefício em andamento",
        titulo: item.item_descricao ?? item.item_codigo ?? "Doação planejada",
        data: item.data_prevista,
        responsavel: item.beneficiario_nome ?? item.familia_nome ?? "---",
        status: item.status,
        descricao: item.observacoes ?? ""
      });
    });

  return linhas.sort((a, b) => String(b.data ?? "").localeCompare(String(a.data ?? "")));
}

function montarAtividadesFuturas(
  agendamentos: Agendamento[],
  encaminhamentos: CentralEncaminhamento[],
  inscricoes: CentralInscricao[],
  doacoesPlanejadas: DoacaoPlanejada[]
) {
  const hoje = hojeIso();
  const linhas: LinhaAtividade[] = [];

  agendamentos
    .filter((item) => (item.data ?? "") >= hoje && !statusEncerrado(item.status))
    .forEach((item) => {
      linhas.push({
        id: `agendamento-${item.id}`,
        categoria: "Atendimento agendado",
        titulo: item.tipoAtendimento,
        data: item.data,
        responsavel: item.profissionalNome ?? "---",
        status: item.status ?? "Agendado",
        descricao: [item.unidade, item.setor, item.horaInicial].filter(Boolean).join(" • ")
      });
    });

  doacoesPlanejadas
    .filter((item) => (item.data_prevista ?? "") >= hoje && !statusEncerrado(item.status))
    .forEach((item) => {
      linhas.push({
        id: `doacao-planejada-futura-${item.id_doacao_planejada}`,
        categoria: "Próxima retirada de benefício",
        titulo: item.item_descricao ?? item.item_codigo ?? "Doação planejada",
        data: item.data_prevista,
        responsavel: item.beneficiario_nome ?? item.familia_nome ?? "---",
        status: item.status,
        descricao: item.observacoes ?? ""
      });
    });

  inscricoes
    .filter((item) => item.dataInicio && item.dataInicio >= hoje)
    .forEach((item) => {
      linhas.push({
        id: `inscricao-futura-${item.id}`,
        categoria: item.tipo ?? "Curso futuro",
        titulo: item.nome,
        data: item.dataInicio,
        responsavel: item.responsavel ?? "---",
        status: item.situacao ?? "Agendado",
        descricao: item.local ?? ""
      });
    });

  encaminhamentos
    .filter((item) => !statusEncerrado(item.status) && (item.retornoEsperado ?? item.data ?? "") >= hoje)
    .forEach((item) => {
      linhas.push({
        id: `encaminhamento-futuro-${item.id}`,
        categoria: "Encaminhamento pendente",
        titulo: `${item.tipo} • ${item.destino}`,
        data: item.retornoEsperado ?? item.data,
        responsavel: item.profissional,
        status: item.status ?? "Pendente",
        descricao: item.motivo
      });
    });

  return linhas.sort((a, b) => String(a.data ?? "").localeCompare(String(b.data ?? "")));
}

export function HistoricoGeralPage() {
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("visao-geral");
  const [termoBusca, setTermoBusca] = useState("");
  const [filtros, setFiltros] = useState<FiltrosHistorico>(filtrosIniciais);
  const [beneficiarioId, setBeneficiarioId] = useState<string>();
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const podeVerAgendamentos = (usuario?.permissoes ?? []).some((permissao) =>
    ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "AGENDAMENTOS_VISUALIZAR"].includes(permissao)
  );

  const buscaBeneficiarios = useCentralBuscaBeneficiarios(
    buscaAplicada.trim().length >= 2 ? { busca: buscaAplicada } : {}
  );
  const visaoQuery = useCentralVisaoGeral(beneficiarioId);
  const beneficiarioDetalheQuery = useBeneficiario(beneficiarioId);

  const doacoesPlanejadasQuery = useQuery({
    queryKey: ["historico-geral", "doacoes-planejadas", usuario?.tenant_id ?? "sem-tenant", beneficiarioId],
    queryFn: async () =>
      doacoesPlanejadasService.listar({
        beneficiario_id: String(beneficiarioId),
        data_inicial: "",
        data_final: ""
      }),
    enabled: Boolean(usuario && beneficiarioId)
  });

  const agendamentosQuery = useQuery({
    queryKey: ["historico-geral", "agendamentos", usuario?.tenant_id ?? "sem-tenant", beneficiarioId],
    queryFn: async () =>
      agendamentosService.listar({
        beneficiarioId: String(beneficiarioId),
        periodoInicio: hojeIso()
      }),
    enabled: Boolean(usuario && beneficiarioId && podeVerAgendamentos)
  });

  const beneficiariosEncontrados = buscaBeneficiarios.data?.beneficiarios ?? [];
  const visao = visaoQuery.data;
  const beneficiarioDetalhe = beneficiarioDetalheQuery.data?.beneficiario;
  const doacoesPlanejadas = doacoesPlanejadasQuery.data?.doacoes ?? [];
  const agendamentos = agendamentosQuery.data ?? [];

  const beneficiosHistoricos = useMemo<LinhaBeneficio[]>(() => {
    const itens = (visao?.beneficios ?? []).map((item: CentralBeneficio) => ({
      id: `${item.origem ?? "beneficio"}-${item.id}`,
      data: item.data,
      tipo: item.tipo,
      item: item.item,
      quantidade: item.quantidade ?? 0,
      valorUnitario: item.valorUnitario ?? 0,
      valorTotal: item.valorTotal ?? 0,
      responsavel: item.profissionalResponsavel ?? "---",
      observacoes: item.observacoes ?? "",
      status: "Retirado",
      origem: item.origem === "doacao" ? "Doação realizada" : "Central de Atendimentos"
    }));

    return aplicarFiltrosData(itens, filtros, (item) => ({
      data: item.data,
      tipoBeneficio: `${item.tipo} ${item.item}`,
      status: item.status,
      responsavel: item.responsavel
    }));
  }, [filtros, visao?.beneficios]);

  const atendimentosHistoricos = useMemo<LinhaAtendimento[]>(() => {
    const encaminhamentos = visao?.encaminhamentos ?? [];
    const itens = (visao?.atendimentos ?? []).map((item: CentralAtendimento) => {
      const encaminhamentosRelacionados = encaminhamentos
        .filter((encaminhamento) => {
          const dataAtendimento = item.dataHora.slice(0, 10);
          return (encaminhamento.data ?? "").slice(0, 10) >= dataAtendimento;
        })
        .slice(0, 2)
        .map((encaminhamento) => `${encaminhamento.tipo} para ${encaminhamento.destino}`);

      return {
        id: item.id,
        data: item.dataHora,
        tipoAtendimento: item.tipoAtendimento,
        profissional: item.profissionalResponsavel,
        descricao: item.resumo,
        encaminhamentos: encaminhamentosRelacionados.join(" • ") || (item.observacoes ?? "---"),
        resultado: item.status ?? item.classificacao ?? "Concluído",
        status: item.status ?? "Concluído"
      };
    });

    return aplicarFiltrosData(itens, filtros, (item) => ({
      data: item.data,
      responsavel: item.profissional,
      status: item.status,
      tipoAtendimento: item.tipoAtendimento
    }));
  }, [filtros, visao?.atendimentos, visao?.encaminhamentos]);

  const atividadesAtuais = useMemo(
    () =>
      aplicarFiltrosData(
        montarAtividadesAtuais(
          visao?.inscricoes ?? [],
          visao?.atendimentos ?? [],
          visao?.encaminhamentos ?? [],
          doacoesPlanejadas
        ),
        filtros,
        (item) => ({
          data: item.data,
          status: item.status,
          responsavel: item.responsavel,
          tipoAtendimento: item.categoria
        })
      ),
    [doacoesPlanejadas, filtros, visao?.atendimentos, visao?.encaminhamentos, visao?.inscricoes]
  );

  const atividadesFuturas = useMemo(
    () =>
      aplicarFiltrosData(
        montarAtividadesFuturas(agendamentos, visao?.encaminhamentos ?? [], visao?.inscricoes ?? [], doacoesPlanejadas),
        filtros,
        (item) => ({
          data: item.data,
          status: item.status,
          responsavel: item.responsavel,
          tipoAtendimento: item.categoria
        })
      ),
    [agendamentos, doacoesPlanejadas, filtros, visao?.encaminhamentos, visao?.inscricoes]
  );

  const historicoConsolidado = useMemo(() => {
    const itens = (visao?.historico ?? []).filter((item: CentralHistoricoItem) => {
      if (filtros.periodoInicio && item.data && item.data.slice(0, 10) < filtros.periodoInicio) return false;
      if (filtros.periodoFim && item.data && item.data.slice(0, 10) > filtros.periodoFim) return false;
      return true;
    });

    return itens.sort((a, b) => String(b.data ?? "").localeCompare(String(a.data ?? "")));
  }, [filtros.periodoFim, filtros.periodoInicio, visao?.historico]);

  const totalValorDestinado = beneficiosHistoricos.reduce((acumulado, item) => acumulado + (item.valorTotal ?? 0), 0);
  const proximoAgendamento = atividadesFuturas[0];
  const situacaoAtualInstituicao =
    atividadesAtuais.length > 0
      ? "Em acompanhamento ativo"
      : atividadesFuturas.length > 0
        ? "Com movimentações futuras agendadas"
        : visao?.beneficiario.situacaoCadastral ?? "Sem movimentações recentes";
  const nenhumHistorico =
    Boolean(beneficiarioId) &&
    beneficiosHistoricos.length === 0 &&
    atendimentosHistoricos.length === 0 &&
    atividadesAtuais.length === 0 &&
    atividadesFuturas.length === 0 &&
    historicoConsolidado.length === 0;

  const actions: AdminAction[] = [
    {
      id: "imprimir",
      label: "Imprimir ou salvar em PDF",
      icon: FileDown,
      variant: "outline",
      disabled: !beneficiarioId,
      onClick: () =>
        imprimirConteudoAtual({
          titulo: `Histórico geral - ${visao?.beneficiario.nomeCompleto ?? "beneficiário"}`,
          seletor: '[data-historico-geral-impressao="true"]',
          tamanhoPagina: "A4",
          estilosExtras: `
            .g3-historico-busca,
            .g3-historico-filtros {
              display: none !important;
            }
          `
        })
    },
    {
      id: "limpar-filtros",
      label: "Limpar filtros",
      icon: History,
      variant: "ghost",
      onClick: () => setFiltros(filtrosIniciais)
    }
  ];

  return (
    <div data-historico-geral-impressao="true">
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={actions}
        sectionLabel="Atendimentos"
        pageTitle="Histórico geral"
        activeTitle={abas.find((aba) => aba.id === abaAtiva)?.label}
        activeIcon={abas.find((aba) => aba.id === abaAtiva)?.icon}
        codeBadge={visao?.beneficiario.codigo ? `Código ${visao.beneficiario.codigo}` : undefined}
      >
        <section className="g3-historico-busca space-y-3">
          <div className="rounded-2xl border border-[var(--g3-border)] bg-[linear-gradient(135deg,rgba(18,97,160,0.08),rgba(65,149,97,0.08))] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="busca-beneficiario-historico">Buscar beneficiário</Label>
                <Input
                  id="busca-beneficiario-historico"
                  value={termoBusca}
                  onChange={(event) => setTermoBusca(event.target.value)}
                  placeholder="Digite nome, CPF, código ou família"
                />
              </div>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--g3-primary)] px-4 text-sm font-medium text-white transition hover:brightness-95"
                onClick={() => setBuscaAplicada(termoBusca)}
              >
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </button>
            </div>
            <p className="mt-3 text-sm text-[var(--g3-muted)]">
              Consulte em um único lugar o histórico completo do beneficiário dentro da instituição.
            </p>
          </div>

          {buscaAplicada.trim().length >= 2 ? (
            <div className="overflow-hidden rounded-xl border border-[var(--g3-border)]">
              <div className="max-h-64 overflow-auto">
                <table className="min-w-full divide-y divide-[var(--g3-border)] text-sm">
                  <thead className="bg-[var(--g3-card-soft)]">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Nome</th>
                      <th className="px-3 py-2 text-left font-semibold">CPF</th>
                      <th className="px-3 py-2 text-left font-semibold">Telefone</th>
                      <th className="px-3 py-2 text-left font-semibold">Situação</th>
                      <th className="px-3 py-2 text-left font-semibold">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--g3-border)] bg-[var(--g3-card)]">
                    {buscaBeneficiarios.isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-[var(--g3-muted)]">
                          Buscando beneficiários...
                        </td>
                      </tr>
                    ) : beneficiariosEncontrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-[var(--g3-muted)]">
                          Nenhum beneficiário encontrado.
                        </td>
                      </tr>
                    ) : (
                      beneficiariosEncontrados.map((item) => (
                        <tr key={item.id} className={beneficiarioId === item.id ? "bg-[var(--g3-primary-soft)]/50" : ""}>
                          <td className="px-3 py-2">{item.nomeCompleto}</td>
                          <td className="px-3 py-2">{formatarCpf(item.cpf)}</td>
                          <td className="px-3 py-2">{formatarTelefone(item.telefone)}</td>
                          <td className="px-3 py-2">{item.situacaoCadastral ?? "---"}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="rounded-md border border-[var(--g3-border)] px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--g3-card-soft)]"
                              onClick={() => {
                                setBeneficiarioId(item.id);
                                setAbaAtiva("visao-geral");
                              }}
                            >
                              Selecionar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>

        <section className="g3-historico-filtros space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="periodo-inicio">Período inicial</Label>
                <Input
                  id="periodo-inicio"
                  type="date"
                  value={filtros.periodoInicio}
                  onChange={(event) => setFiltros((estado) => ({ ...estado, periodoInicio: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodo-fim">Período final</Label>
                <Input
                  id="periodo-fim"
                  type="date"
                  value={filtros.periodoFim}
                  onChange={(event) => setFiltros((estado) => ({ ...estado, periodoFim: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo-beneficio">Tipo de benefício</Label>
                <Input
                  id="tipo-beneficio"
                  value={filtros.tipoBeneficio}
                  onChange={(event) => setFiltros((estado) => ({ ...estado, tipoBeneficio: event.target.value }))}
                  placeholder="Ex.: cesta básica"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-historico">Status</Label>
                <Select
                  id="status-historico"
                  value={filtros.status}
                  onChange={(event) => setFiltros((estado) => ({ ...estado, status: event.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="retirado">Retirado</option>
                  <option value="pendente">Pendente</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="agendado">Agendado</option>
                  <option value="ativo">Ativo</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsavel-historico">Responsável</Label>
                <Input
                  id="responsavel-historico"
                  value={filtros.responsavel}
                  onChange={(event) => setFiltros((estado) => ({ ...estado, responsavel: event.target.value }))}
                  placeholder="Nome do responsável"
                />
              </div>
              <div className="space-y-2 md:col-span-2 xl:col-span-5">
                <Label htmlFor="tipo-atendimento-filtro">Tipo de atendimento</Label>
                <Input
                  id="tipo-atendimento-filtro"
                  value={filtros.tipoAtendimento}
                  onChange={(event) => setFiltros((estado) => ({ ...estado, tipoAtendimento: event.target.value }))}
                  placeholder="Ex.: atendimento social"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {!beneficiarioId ? (
          <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-10 text-center text-sm text-[var(--g3-muted)]">
            Selecione um beneficiário para carregar o histórico geral.
          </div>
        ) : visaoQuery.isLoading || beneficiarioDetalheQuery.isLoading ? (
          <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-10 text-center text-sm text-[var(--g3-muted)]">
            Carregando histórico do beneficiário...
          </div>
        ) : nenhumHistorico ? (
          <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-10 text-center text-sm text-[var(--g3-muted)]">
            Nenhum histórico encontrado para este beneficiário.
          </div>
        ) : (
          <>
            <section className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Dados do beneficiário</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Nome completo</p>
                    <p className="mt-1 text-sm text-[var(--g3-foreground)]">{visao?.beneficiario.nomeCompleto ?? "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">CPF</p>
                    <p className="mt-1 text-sm text-[var(--g3-foreground)]">{formatarCpf(visao?.beneficiario.cpf)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Data de nascimento</p>
                    <p className="mt-1 text-sm text-[var(--g3-foreground)]">{formatarData(visao?.beneficiario.dataNascimento)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Telefone</p>
                    <p className="mt-1 text-sm text-[var(--g3-foreground)]">{formatarTelefone(visao?.beneficiario.telefone)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Endereço</p>
                    <p className="mt-1 text-sm text-[var(--g3-foreground)]">{visao?.beneficiario.endereco ?? "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Situação cadastral</p>
                    <p className="mt-1 text-sm text-[var(--g3-foreground)]">{visao?.beneficiario.situacaoCadastral ?? "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Data de cadastro</p>
                    <p className="mt-1 text-sm text-[var(--g3-foreground)]">{formatarData(beneficiarioDetalhe?.data_cadastro)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Resumo geral</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <CardResumo titulo="Atendimentos realizados" valor={atendimentosHistoricos.length} />
                  <CardResumo titulo="Benefícios recebidos" valor={beneficiosHistoricos.length} />
                  <CardResumo titulo="Valor total destinado" valor={formatarMoeda(totalValorDestinado)} />
                  <CardResumo
                    titulo="Último atendimento"
                    valor={formatarDataHora(visao?.beneficiario.ultimoAtendimento)}
                  />
                  <CardResumo
                    titulo="Próximo atendimento agendado"
                    valor={proximoAgendamento ? formatarData(proximoAgendamento.data) : "---"}
                    detalhe={proximoAgendamento?.titulo}
                  />
                  <CardResumo titulo="Situação atual na instituição" valor={situacaoAtualInstituicao} />
                </CardContent>
              </Card>
            </section>

            {abaAtiva === "visao-geral" ? (
              <div className="space-y-3">
                <div className="grid gap-3 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Linha do tempo consolidada</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TabelaPaginada
                        rows={historicoConsolidado.map((item) => ({ ...item }))}
                        emptyMessage="Nenhum histórico encontrado para este beneficiário."
                        columns={[
                          {
                            id: "data",
                            label: "Data",
                            sortValue: (row) => row.data ?? "",
                            render: (row) => formatarData(row.data)
                          },
                          {
                            id: "categoria",
                            label: "Categoria",
                            sortValue: (row) => row.categoria,
                            render: (row) => row.categoria
                          },
                          {
                            id: "titulo",
                            label: "Título",
                            sortValue: (row) => row.titulo,
                            render: (row) => (
                              <div>
                                <p className="font-medium">{row.titulo}</p>
                                <p className="text-xs text-[var(--g3-muted)]">{row.descricao ?? "---"}</p>
                              </div>
                            )
                          },
                          {
                            id: "profissional",
                            label: "Responsável",
                            sortValue: (row) => row.profissional ?? "",
                            render: (row) => row.profissional ?? "---"
                          }
                        ]}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Panorama atual</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-xl border border-[var(--g3-border)] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Cursos e atividades ativas</p>
                        <p className="mt-2 text-2xl font-semibold">{atividadesAtuais.filter((item) => item.categoria !== "Benefício em andamento").length}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--g3-border)] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Encaminhamentos e pendências futuras</p>
                        <p className="mt-2 text-2xl font-semibold">{atividadesFuturas.length}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--g3-border)] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Observação</p>
                        <p className="mt-2 text-sm text-[var(--g3-muted)]">
                          Esta visão reúne cadastro, benefícios, atendimentos, cursos, acompanhamentos e agenda futura em um único lugar.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}

            {abaAtiva === "beneficios" ? (
              <TabelaPaginada
                rows={beneficiosHistoricos}
                emptyMessage="Nenhum histórico encontrado para este beneficiário."
                columns={[
                  {
                    id: "tipo",
                    label: "Tipo do benefício",
                    sortValue: (row) => `${row.tipo} ${row.item}`,
                    render: (row) => (
                      <div>
                        <p className="font-medium">{row.tipo}</p>
                        <p className="text-xs text-[var(--g3-muted)]">{row.item}</p>
                      </div>
                    )
                  },
                  {
                    id: "data",
                    label: "Data da retirada",
                    sortValue: (row) => row.data ?? "",
                    render: (row) => formatarData(row.data)
                  },
                  {
                    id: "quantidade",
                    label: "Quantidade",
                    sortValue: (row) => row.quantidade,
                    render: (row) => row.quantidade
                  },
                  {
                    id: "valorUnitario",
                    label: "Valor unitário",
                    sortValue: (row) => row.valorUnitario,
                    render: (row) => formatarMoeda(row.valorUnitario)
                  },
                  {
                    id: "valorTotal",
                    label: "Valor total",
                    sortValue: (row) => row.valorTotal,
                    render: (row) => formatarMoeda(row.valorTotal)
                  },
                  {
                    id: "responsavel",
                    label: "Responsável",
                    sortValue: (row) => row.responsavel,
                    render: (row) => row.responsavel
                  },
                  {
                    id: "status",
                    label: "Status",
                    sortValue: (row) => row.status,
                    render: (row) => (
                      <div>
                        <p>{row.status}</p>
                        <p className="text-xs text-[var(--g3-muted)]">{row.origem}</p>
                      </div>
                    )
                  },
                  {
                    id: "observacoes",
                    label: "Observações",
                    render: (row) => row.observacoes || "---"
                  }
                ]}
              />
            ) : null}

            {abaAtiva === "atendimentos" ? (
              <TabelaPaginada
                rows={atendimentosHistoricos}
                emptyMessage="Nenhum histórico encontrado para este beneficiário."
                columns={[
                  {
                    id: "data",
                    label: "Data",
                    sortValue: (row) => row.data,
                    render: (row) => formatarDataHora(row.data)
                  },
                  {
                    id: "tipoAtendimento",
                    label: "Tipo de atendimento",
                    sortValue: (row) => row.tipoAtendimento,
                    render: (row) => row.tipoAtendimento
                  },
                  {
                    id: "profissional",
                    label: "Profissional",
                    sortValue: (row) => row.profissional,
                    render: (row) => row.profissional
                  },
                  {
                    id: "descricao",
                    label: "Descrição",
                    render: (row) => row.descricao
                  },
                  {
                    id: "encaminhamentos",
                    label: "Encaminhamentos",
                    render: (row) => row.encaminhamentos
                  },
                  {
                    id: "resultado",
                    label: "Resultado",
                    sortValue: (row) => row.resultado,
                    render: (row) => row.resultado
                  }
                ]}
              />
            ) : null}

            {abaAtiva === "atuais" ? (
              <TabelaPaginada
                rows={atividadesAtuais}
                emptyMessage="Nenhum histórico encontrado para este beneficiário."
                columns={[
                  {
                    id: "categoria",
                    label: "Categoria",
                    sortValue: (row) => row.categoria,
                    render: (row) => row.categoria
                  },
                  {
                    id: "titulo",
                    label: "Atividade",
                    sortValue: (row) => row.titulo,
                    render: (row) => row.titulo
                  },
                  {
                    id: "data",
                    label: "Início ou referência",
                    sortValue: (row) => row.data ?? "",
                    render: (row) => formatarData(row.data)
                  },
                  {
                    id: "responsavel",
                    label: "Responsável",
                    sortValue: (row) => row.responsavel,
                    render: (row) => row.responsavel
                  },
                  {
                    id: "status",
                    label: "Status",
                    sortValue: (row) => row.status,
                    render: (row) => row.status
                  },
                  {
                    id: "descricao",
                    label: "Observações",
                    render: (row) => row.descricao || "---"
                  }
                ]}
              />
            ) : null}

            {abaAtiva === "futuros" ? (
              <TabelaPaginada
                rows={atividadesFuturas}
                emptyMessage="Nenhum histórico encontrado para este beneficiário."
                columns={[
                  {
                    id: "categoria",
                    label: "Categoria",
                    sortValue: (row) => row.categoria,
                    render: (row) => row.categoria
                  },
                  {
                    id: "titulo",
                    label: "Agendamento ou previsão",
                    sortValue: (row) => row.titulo,
                    render: (row) => row.titulo
                  },
                  {
                    id: "data",
                    label: "Data prevista",
                    sortValue: (row) => row.data ?? "",
                    render: (row) => formatarData(row.data)
                  },
                  {
                    id: "responsavel",
                    label: "Responsável",
                    sortValue: (row) => row.responsavel,
                    render: (row) => row.responsavel
                  },
                  {
                    id: "status",
                    label: "Status",
                    sortValue: (row) => row.status,
                    render: (row) => row.status
                  },
                  {
                    id: "descricao",
                    label: "Observações",
                    render: (row) => row.descricao || "---"
                  }
                ]}
                initialSort={{ columnId: "data", direction: "asc" }}
              />
            ) : null}
          </>
        )}
      </AdminPageLayout>
    </div>
  );
}
