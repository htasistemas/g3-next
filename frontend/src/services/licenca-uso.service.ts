import { httpClient } from "./http-client";
import type {
  LicencaUsoConfiguracao,
  LicencaUsoCheckoutResponse,
  LicencaUsoResponse,
  LicencaUsoRetornoCheckoutResponse
} from "@/types/licenca-uso";

export const licencaUsoService = {
  async obterConfiguracao() {
    const { data } = await httpClient.get<LicencaUsoResponse>("/api/configuracoes/licenca-uso");
    return data;
  },

  async salvarConfiguracao(configuracao: LicencaUsoConfiguracao) {
    const { data } = await httpClient.put<LicencaUsoResponse>("/api/configuracoes/licenca-uso", {
      configuracao
    });
    return data;
  },

  async gerarCheckout() {
    const { data } = await httpClient.post<LicencaUsoCheckoutResponse>("/api/configuracoes/licenca-uso/checkout");
    return data;
  },

  async confirmarRetornoCheckout(payload: {
    order_nsu?: string;
    transaction_nsu?: string;
    slug?: string;
    receipt_url?: string;
  }) {
    const { data } = await httpClient.post<LicencaUsoRetornoCheckoutResponse>(
      "/api/configuracoes/licenca-uso/checkout/confirmar-retorno",
      payload
    );
    return data;
  }
};
