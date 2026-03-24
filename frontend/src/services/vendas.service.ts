import { httpClient } from "./http-client";
import type { Venda, VendaFilters, VendaPayload } from "@/types/vendas";

export const vendasService = {
  async listar(filters: VendaFilters = {}) {
    const { data } = await httpClient.get<{ vendas: Venda[] }>("/api/vendas", {
      params: filters
    });
    return data;
  },

  async criar(payload: VendaPayload) {
    const { data } = await httpClient.post<Venda>("/api/vendas", payload);
    return data;
  }
};
