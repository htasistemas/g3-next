import { httpClient } from "./http-client";
import type {
  DisponibilidadeItemEmprestimo,
  EmprestimoEvento,
  EmprestimoEventoPayload,
  EventoEmprestimo,
  ItemEmprestimoEvento,
  StatusEmprestimoEvento,
  TipoItemEmprestimo
} from "@/types/emprestimos-eventos";

export const emprestimosEventosService = {
  async listar(params?: {
    inicio?: string;
    fim?: string;
    status?: string;
    evento?: number;
    item?: number;
    unidade?: number;
  }) {
    const { data } = await httpClient.get<{ emprestimos: EmprestimoEvento[] }>(
      "/api/emprestimos-eventos",
      { params }
    );
    return data;
  },

  async obter(id: number) {
    const { data } = await httpClient.get<EmprestimoEvento>(`/api/emprestimos-eventos/${id}`);
    return data;
  },

  async criar(payload: EmprestimoEventoPayload) {
    const { data } = await httpClient.post<EmprestimoEvento>("/api/emprestimos-eventos", payload);
    return data;
  },

  async atualizar(id: number, payload: EmprestimoEventoPayload) {
    const { data } = await httpClient.put<EmprestimoEvento>(`/api/emprestimos-eventos/${id}`, payload);
    return data;
  },

  async excluir(id: number) {
    await httpClient.delete(`/api/emprestimos-eventos/${id}`);
  },

  async confirmarRetirada(id: number, usuarioId?: number) {
    const { data } = await httpClient.post<EmprestimoEvento>(
      `/api/emprestimos-eventos/${id}/confirmar-retirada`,
      null,
      { params: usuarioId ? { usuarioId } : undefined }
    );
    return data;
  },

  async confirmarDevolucao(id: number, usuarioId?: number) {
    const { data } = await httpClient.post<EmprestimoEvento>(
      `/api/emprestimos-eventos/${id}/confirmar-devolucao`,
      null,
      { params: usuarioId ? { usuarioId } : undefined }
    );
    return data;
  },

  async cancelar(id: number, usuarioId?: number) {
    const { data } = await httpClient.post<EmprestimoEvento>(
      `/api/emprestimos-eventos/${id}/cancelar`,
      null,
      { params: usuarioId ? { usuarioId } : undefined }
    );
    return data;
  },

  async agendaResumo(inicio: string, fim: string) {
    const { data } = await httpClient.get<
      Array<{ data: string; temBloqueio: boolean; qtdEmprestimos: number; emprestimoIds: number[] }>
    >("/api/emprestimos-eventos/agenda/resumo", { params: { inicio, fim } });
    return data;
  },

  async agendaDia(dataRef: string) {
    const { data } = await httpClient.get<
      Array<{
        emprestimoId: number;
        status: StatusEmprestimoEvento;
        periodo: {
          retiradaPrevista: string;
          devolucaoPrevista: string;
          retiradaReal?: string | null;
          devolucaoReal?: string | null;
        };
        responsavel?: { id: number; nome: string } | null;
        evento: EventoEmprestimo;
        itens: ItemEmprestimoEvento[];
      }>
    >("/api/emprestimos-eventos/agenda/dia", { params: { data: dataRef } });
    return data;
  },

  async disponibilidade(params: {
    itemId: number;
    tipoItem: TipoItemEmprestimo;
    quantidade?: number;
    inicio: string;
    fim: string;
    emprestimoId?: number;
  }) {
    const { data } = await httpClient.get<DisponibilidadeItemEmprestimo>(
      "/api/emprestimos-eventos/disponibilidade",
      { params }
    );
    return data;
  },

  async listarEventos() {
    const { data } = await httpClient.get<EventoEmprestimo[]>("/api/emprestimos-eventos/eventos");
    return data;
  },

  async criarEvento(payload: Omit<EventoEmprestimo, "id">) {
    const { data } = await httpClient.post<EventoEmprestimo>("/api/emprestimos-eventos/eventos", payload);
    return data;
  },

  async atualizarEvento(id: number, payload: Omit<EventoEmprestimo, "id">) {
    const { data } = await httpClient.put<EventoEmprestimo>(
      `/api/emprestimos-eventos/eventos/${id}`,
      payload
    );
    return data;
  },

  async excluirEvento(id: number) {
    await httpClient.delete(`/api/emprestimos-eventos/eventos/${id}`);
  },

  async listarMovimentacoes(id: number) {
    const { data } = await httpClient.get<{
      movimentacoes: Array<{
        id: number;
        emprestimoId: number;
        acao: string;
        descricao?: string | null;
        usuarioId?: number | null;
        criadoEm: string;
      }>;
    }>(`/api/emprestimos-eventos/${id}/movimentacoes`);
    return data;
  }
};
