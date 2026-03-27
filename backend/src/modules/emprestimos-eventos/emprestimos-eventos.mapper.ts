import type {
  EmprestimoEventoItemRow,
  EmprestimoEventoMovimentacaoRow,
  EmprestimoEventoRow,
  EventoEmprestimoRow,
  ResponsavelEmprestimoRow
} from "./emprestimos-eventos.types.js";

function toIsoDateTime(value?: Date | null) {
  return value ? value.toISOString() : null;
}

export function mapEventoEmprestimoToResponse(row: EventoEmprestimoRow) {
  return {
    id: Number(row.id),
    titulo: row.titulo,
    descricao: row.descricao ?? null,
    local: row.local ?? null,
    dataInicio: row.data_inicio.toISOString(),
    dataFim: row.data_fim.toISOString(),
    status: row.status
  };
}

export function mapEmprestimoItemToResponse(row: EmprestimoEventoItemRow) {
  return {
    id: Number(row.id),
    itemId: Number(row.item_id),
    tipoItem: row.tipo_item,
    quantidade: row.quantidade,
    statusItem: row.status_item,
    observacaoItem: row.observacao_item ?? null,
    nomeItem: row.nome_item ?? null,
    numeroPatrimonio: row.numero_patrimonio ?? null
  };
}

export function mapEmprestimoToResponse(
  row: EmprestimoEventoRow,
  itens: EmprestimoEventoItemRow[]
) {
  return {
    id: Number(row.id),
    evento: {
      id: Number(row.evento_id),
      titulo: row.evento_titulo,
      descricao: row.evento_descricao ?? null,
      local: row.evento_local ?? null,
      dataInicio: row.evento_data_inicio.toISOString(),
      dataFim: row.evento_data_fim.toISOString(),
      status: row.evento_status
    },
    unidadeId: row.unidade_id ? Number(row.unidade_id) : null,
    responsavel: row.responsavel_id || row.responsavel_nome
      ? {
          id: row.responsavel_id ? Number(row.responsavel_id) : null,
          nome: row.responsavel_nome ?? ""
        }
      : null,
    dataRetiradaPrevista: row.data_retirada_prevista.toISOString(),
    dataDevolucaoPrevista: row.data_devolucao_prevista.toISOString(),
    dataRetiradaReal: toIsoDateTime(row.data_retirada_real),
    dataDevolucaoReal: toIsoDateTime(row.data_devolucao_real),
    status: row.status,
    observacoes: row.observacoes ?? null,
    itens: itens.map(mapEmprestimoItemToResponse)
  };
}

export function mapMovimentacaoToResponse(row: EmprestimoEventoMovimentacaoRow) {
  return {
    id: Number(row.id),
    emprestimoId: Number(row.emprestimo_id),
    acao: row.acao,
    descricao: row.descricao ?? null,
    usuarioId: row.usuario_id ? Number(row.usuario_id) : null,
    criadoEm: row.criado_em.toISOString()
  };
}

export function mapResponsavelEmprestimoToResponse(row: ResponsavelEmprestimoRow) {
  return {
    id: Number(row.id),
    nome: row.nome,
    documento: row.documento ?? null,
    telefone: row.telefone ?? null,
    email: row.email ?? null,
    observacoes: row.observacoes ?? null,
    criadoEm: row.criado_em.toISOString(),
    atualizadoEm: row.atualizado_em.toISOString()
  };
}
