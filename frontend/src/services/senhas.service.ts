import { httpClient } from "./http-client";
import type {
  SenhaChamarRequest,
  SenhaChamadaResponse,
  SenhaEmitirRequest,
  SenhaFilaResponse,
  SenhaFinalizarRequest,
  SenhasConfigRequest,
  SenhasConfigResponse
} from "@/types/senhas";

export const senhasService = {
  async listarAguardando(unidadeId?: number | null) {
    const { data } = await httpClient.get<SenhaFilaResponse[]>("/api/senhas/aguardando", {
      params: unidadeId ? { unidadeId } : undefined
    });
    return data ?? [];
  },

  async emitir(payload: SenhaEmitirRequest) {
    const { data } = await httpClient.post<SenhaFilaResponse>("/api/senhas/emitir", payload);
    return data;
  },

  async chamar(payload: SenhaChamarRequest) {
    const { data } = await httpClient.post<SenhaChamadaResponse>("/api/senhas/chamar", payload);
    return data;
  },

  async finalizar(payload: SenhaFinalizarRequest) {
    await httpClient.post("/api/senhas/finalizar", payload);
  },

  async finalizarFila(filaId: number) {
    await httpClient.post("/api/senhas/finalizar-fila", null, {
      params: { filaId }
    });
  },

  async painel(unidadeId?: number | null, limite = 10) {
    const { data } = await httpClient.get<SenhaChamadaResponse[]>("/api/senhas/painel", {
      params: { unidadeId: unidadeId ?? undefined, limite }
    });
    return data ?? [];
  },

  async atual(unidadeId?: number | null) {
    const { data } = await httpClient.get<SenhaChamadaResponse | null>("/api/senhas/atual", {
      params: unidadeId ? { unidadeId } : undefined
    });
    return data;
  },

  async obterConfig() {
    const { data } = await httpClient.get<SenhasConfigResponse>("/api/senhas/config");
    return data;
  },

  async atualizarConfig(payload: SenhasConfigRequest) {
    const { data } = await httpClient.put<SenhasConfigResponse>("/api/senhas/config", payload);
    return data;
  }
};
