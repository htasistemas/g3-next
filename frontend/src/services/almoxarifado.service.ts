import { httpClient } from "./http-client";
import type {
  ComposicaoKitItem,
  ItemAlmoxarifado,
  MovimentacaoAlmoxarifado,
  VinculoKitMovimentacao
} from "@/types/almoxarifado";

export const almoxarifadoService = {
  async listarItens() {
    const { data } = await httpClient.get<{ itens: ItemAlmoxarifado[] }>("/api/almoxarifado/items");
    return data;
  },

  async obterProximoCodigo() {
    const { data } = await httpClient.get<{ codigo: string }>("/api/almoxarifado/items/next-code");
    return data;
  },

  async criarItem(payload: ItemAlmoxarifado) {
    const { data } = await httpClient.post<ItemAlmoxarifado>("/api/almoxarifado/items", payload);
    return data;
  },

  async atualizarItem(id: string, payload: ItemAlmoxarifado) {
    const { data } = await httpClient.put<ItemAlmoxarifado>(`/api/almoxarifado/items/${id}`, payload);
    return data;
  },

  async removerItem(id: string) {
    await httpClient.delete(`/api/almoxarifado/items/${id}`);
  },

  async listarMovimentacoes() {
    const { data } = await httpClient.get<{ movimentacoes: MovimentacaoAlmoxarifado[] }>(
      "/api/almoxarifado/movements"
    );
    return data;
  },

  async registrarMovimentacao(payload: MovimentacaoAlmoxarifado) {
    const { data } = await httpClient.post<{
      movimentacao: MovimentacaoAlmoxarifado;
      item: ItemAlmoxarifado;
    }>("/api/almoxarifado/movements", payload);
    return data;
  },

  async listarComposicaoKit(itemId: string) {
    const { data } = await httpClient.get<ComposicaoKitItem[]>(
      `/api/almoxarifado/produtos/${itemId}/kit-composicao`
    );
    return data;
  },

  async atualizarComposicaoKit(itemId: string, itens: ComposicaoKitItem[]) {
    const { data } = await httpClient.put<ComposicaoKitItem[]>(
      `/api/almoxarifado/produtos/${itemId}/kit-composicao`,
      itens
    );
    return data;
  },

  async listarVinculosKit(movimentacaoId: string) {
    const { data } = await httpClient.get<VinculoKitMovimentacao[]>(
      `/api/almoxarifado/movements/${movimentacaoId}/kit-vinculos`
    );
    return data;
  }
};
