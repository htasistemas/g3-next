import { httpClient } from "./http-client";
import type {
  DisponibilidadeItemEmprestimo,
  EmprestimoEvento,
  EmprestimoEventoPayload,
  EventoEmprestimo,
  ItemEmprestimoEvento,
  ResponsavelEmprestimo,
  ResponsavelEmprestimoPayload,
  StatusEmprestimoEvento,
  TipoDiaAgendaEmprestimo,
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

  async confirmarReserva(id: number, usuarioId?: number) {
    const { data } = await httpClient.post<EmprestimoEvento>(
      `/api/emprestimos-eventos/${id}/confirmar-reserva`,
      null,
      { params: usuarioId ? { usuarioId } : undefined }
    );
    return data;
  },

  async enviarAlertaDevolucaoEmail(id: number) {
    const { data } = await httpClient.post<{ destinatario: string; enviadoEm: string }>(
      `/api/emprestimos-eventos/${id}/alerta-devolucao/email`
    );
    return data;
  },

  async enviarConfirmacaoReservaEmail(id: number) {
    const { data } = await httpClient.post<{ destinatario: string; enviadoEm: string }>(
      `/api/emprestimos-eventos/${id}/confirmacao-reserva/email`
    );
    return data;
  },

  async obterPreviewConfirmacaoReservaEmail(id: number) {
    const { data } = await httpClient.get<{
      destinatario: string;
      assunto: string;
      mensagem: string;
    }>(`/api/emprestimos-eventos/${id}/confirmacao-reserva/email/preview`);
    return data;
  },

  async agendaResumo(inicio: string, fim: string) {
    const { data } = await httpClient.get<
      Array<{
        data: string;
        temBloqueio: boolean;
        temApoio?: boolean;
        qtdEmprestimos: number;
        qtdApoios?: number;
        emprestimoIds: number[];
      }>
    >("/api/emprestimos-eventos/agenda/resumo", { params: { inicio, fim } });
    return data;
  },

  async agendaDia(dataRef: string) {
    const { data } = await httpClient.get<
      Array<{
        emprestimoId: number;
        status: StatusEmprestimoEvento;
        tipoDia?: TipoDiaAgendaEmprestimo;
        periodo: {
          retiradaPrevista: string;
          devolucaoPrevista: string;
          retiradaReal?: string | null;
          devolucaoReal?: string | null;
          retiradaApoio?: string | null;
          eventoInicio?: string | null;
          eventoFim?: string | null;
          devolucaoApoio?: string | null;
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

  async listarResponsaveis() {
    const { data } = await httpClient.get<ResponsavelEmprestimo[]>("/api/emprestimos-eventos/responsaveis");
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

  async criarResponsavel(payload: ResponsavelEmprestimoPayload) {
    const { data } = await httpClient.post<ResponsavelEmprestimo>("/api/emprestimos-eventos/responsaveis", payload);
    return data;
  },

  async atualizarResponsavel(id: number, payload: ResponsavelEmprestimoPayload) {
    const { data } = await httpClient.put<ResponsavelEmprestimo>(
      `/api/emprestimos-eventos/responsaveis/${id}`,
      payload
    );
    return data;
  },

  async excluirResponsavel(id: number) {
    await httpClient.delete(`/api/emprestimos-eventos/responsaveis/${id}`);
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
