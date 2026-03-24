import { httpClient } from "./http-client";
import type {
  BarracaEvento,
  DashboardCarteiraEvento,
  EventoCarteira,
  ItemEventoCarteira,
  MovimentacaoCarteira,
  ParticipanteCarteira,
  VendaCarteira
} from "@/types/carteira-evento";

export const carteiraEventoService = {
  listarEventos(params?: Record<string, unknown>) {
    return httpClient.get<{ eventos: EventoCarteira[] }>("/api/carteira-evento/eventos", { params }).then((r) => r.data);
  },
  criarEvento(payload: Record<string, unknown>) {
    return httpClient.post<EventoCarteira>("/api/carteira-evento/eventos", payload).then((r) => r.data);
  },
  atualizarEvento(id: number, payload: Record<string, unknown>) {
    return httpClient.put<EventoCarteira>(`/api/carteira-evento/eventos/${id}`, payload).then((r) => r.data);
  },
  listarParticipantes(params?: Record<string, unknown>) {
    return httpClient.get<{ participantes: ParticipanteCarteira[] }>("/api/carteira-evento/participantes", { params }).then((r) => r.data);
  },
  buscarParticipante(id: number) {
    return httpClient.get<ParticipanteCarteira>(`/api/carteira-evento/participantes/${id}`).then((r) => r.data);
  },
  criarParticipante(payload: Record<string, unknown>) {
    return httpClient.post<ParticipanteCarteira>("/api/carteira-evento/participantes", payload).then((r) => r.data);
  },
  atualizarParticipante(id: number, payload: Record<string, unknown>) {
    return httpClient.put<ParticipanteCarteira>(`/api/carteira-evento/participantes/${id}`, payload).then((r) => r.data);
  },
  alterarStatusParticipante(id: number, status: string) {
    return httpClient.post<ParticipanteCarteira>(`/api/carteira-evento/participantes/${id}/status`, { status }).then((r) => r.data);
  },
  emitirSegundaVia(id: number, invalidarAnterior: boolean) {
    return httpClient.post<ParticipanteCarteira>(`/api/carteira-evento/participantes/${id}/segunda-via`, { invalidarAnterior }).then((r) => r.data);
  },
  listarBarracas(params?: Record<string, unknown>) {
    return httpClient.get<{ barracas: BarracaEvento[] }>("/api/carteira-evento/barracas", { params }).then((r) => r.data);
  },
  criarBarraca(payload: Record<string, unknown>) {
    return httpClient.post<BarracaEvento>("/api/carteira-evento/barracas", payload).then((r) => r.data);
  },
  atualizarBarraca(id: number, payload: Record<string, unknown>) {
    return httpClient.put<BarracaEvento>(`/api/carteira-evento/barracas/${id}`, payload).then((r) => r.data);
  },
  listarItens(params?: Record<string, unknown>) {
    return httpClient.get<{ itens: ItemEventoCarteira[] }>("/api/carteira-evento/itens", { params }).then((r) => r.data);
  },
  criarItem(payload: Record<string, unknown>) {
    return httpClient.post<ItemEventoCarteira>("/api/carteira-evento/itens", payload).then((r) => r.data);
  },
  atualizarItem(id: number, payload: Record<string, unknown>) {
    return httpClient.put<ItemEventoCarteira>(`/api/carteira-evento/itens/${id}`, payload).then((r) => r.data);
  },
  recarregar(payload: Record<string, unknown>) {
    return httpClient.post<ParticipanteCarteira>("/api/carteira-evento/recargas", payload).then((r) => r.data);
  },
  transferir(payload: Record<string, unknown>) {
    return httpClient.post<{ origem: ParticipanteCarteira; destino: ParticipanteCarteira; referencia: string }>("/api/carteira-evento/transferencias", payload).then((r) => r.data);
  },
  ajustar(payload: Record<string, unknown>) {
    return httpClient.post<ParticipanteCarteira>("/api/carteira-evento/ajustes", payload).then((r) => r.data);
  },
  consultarToken(payload: { evento_id: number; token: string }) {
    return httpClient.post<ParticipanteCarteira>("/api/carteira-evento/operacao/consultar-token", payload).then((r) => r.data);
  },
  realizarVenda(payload: Record<string, unknown>) {
    return httpClient.post<VendaCarteira>("/api/carteira-evento/operacao/venda", payload).then((r) => r.data);
  },
  extrato(participanteId: number) {
    return httpClient
      .get<{ participante: ParticipanteCarteira; saldoAtual: number; movimentacoes: MovimentacaoCarteira[] }>("/api/carteira-evento/extrato", {
        params: { participante_id: participanteId }
      })
      .then((r) => r.data);
  },
  dashboard(eventoId: number) {
    return httpClient.get<DashboardCarteiraEvento>("/api/carteira-evento/dashboard", { params: { evento_id: eventoId } }).then((r) => r.data);
  },
  fechamento(eventoId: number) {
    return httpClient.get<Record<string, unknown>>("/api/carteira-evento/fechamento", { params: { evento_id: eventoId } }).then((r) => r.data);
  },
  relatorio(eventoId: number, tipo: string) {
    return httpClient.get<{ tipo: string; dados: unknown }>("/api/carteira-evento/relatorios", { params: { evento_id: eventoId, tipo } }).then((r) => r.data);
  }
};
