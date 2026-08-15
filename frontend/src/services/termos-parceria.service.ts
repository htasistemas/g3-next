import { httpClient } from "./http-client";

export type TermoParceria = Record<string, any>;
export type DashboardTermosParceria = Record<string, any>;

const base = "/api/juridico/termos-parceria";

export const termosParceriaService = {
  async dashboard() {
    const { data } = await httpClient.get<{ dashboard: DashboardTermosParceria }>(`${base}/dashboard`);
    return data.dashboard;
  },
  async listar(params?: { status?: string; projetoId?: string; busca?: string; pagina?: number; limite?: number; ordem?: string; direcao?: string }) {
    const { data } = await httpClient.get<{ parcerias: TermoParceria[]; paginacao: { total: number; pagina: number; limite: number; totalPaginas: number } }>(base, { params });
    return { registros: data.parcerias, paginacao: data.paginacao };
  },
  async obter(id: string) {
    const { data } = await httpClient.get<{ parceria: TermoParceria }>(`${base}/${id}`);
    return data.parceria;
  },
  async criar(payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ parceria: TermoParceria }>(base, payload);
    return data.parceria;
  },
  async atualizar(id: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.put<{ parceria: TermoParceria }>(`${base}/${id}`, payload);
    return data.parceria;
  },
  async excluir(id: string) {
    await httpClient.delete(`${base}/${id}`);
  },
  async criarItem(id: string, entidade: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ registro: TermoParceria }>(`${base}/${id}/itens/${entidade}`, payload);
    return data.registro;
  },
  async excluirItem(id: string, entidade: string, itemId: string) {
    await httpClient.delete(`${base}/${id}/itens/${entidade}/${itemId}`);
  },
  async atualizarItem(id: string, entidade: string, itemId: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.patch<{ registro: TermoParceria }>(`${base}/${id}/itens/${entidade}/${itemId}`, payload);
    return data.registro;
  },
  async criarUnidade(id: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ unidade: TermoParceria }>(`${base}/${id}/unidades-executoras`, payload);
    return data.unidade;
  },
  async criarAditivo(id: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ aditivo: TermoParceria }>(`${base}/${id}/aditivos`, payload);
    return data.aditivo;
  }
};
