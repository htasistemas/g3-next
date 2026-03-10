import { httpClient } from "./http-client";
import type {
  MensagemDestinatario,
  MensagemEnvioPayload,
  MensagemEnvioResultado,
  MensagemHistorico,
  MensagemHistoricoFiltros,
  MensagemModelo,
  MensagemModeloFiltros,
  MensagemModeloForm,
  MensagemPreview,
  MensagemSuporte,
  MensagemTaxonomia,
  MensagemTaxonomiaTipo
} from "@/types/mensagens-personalizadas";

export const mensagensPersonalizadasService = {
  async obterSuporte() {
    const { data } = await httpClient.get<MensagemSuporte>("/api/mensagens-personalizadas/suporte");
    return data;
  },

  async listarModelos(filtros?: MensagemModeloFiltros) {
    const { data } = await httpClient.get<{ modelos: MensagemModelo[] }>(
      "/api/mensagens-personalizadas/modelos",
      { params: filtros }
    );
    return data.modelos ?? [];
  },

  async obterModelo(id: string) {
    const { data } = await httpClient.get<{ modelo: MensagemModelo }>(
      `/api/mensagens-personalizadas/modelos/${id}`
    );
    return data.modelo;
  },

  async criarModelo(payload: MensagemModeloForm) {
    const { data } = await httpClient.post<{ modelo: MensagemModelo }>(
      "/api/mensagens-personalizadas/modelos",
      payload
    );
    return data.modelo;
  },

  async atualizarModelo(id: string, payload: MensagemModeloForm) {
    const { data } = await httpClient.put<{ modelo: MensagemModelo }>(
      `/api/mensagens-personalizadas/modelos/${id}`,
      payload
    );
    return data.modelo;
  },

  async duplicarModelo(id: string) {
    const { data } = await httpClient.post<{ modelo: MensagemModelo }>(
      `/api/mensagens-personalizadas/modelos/${id}/duplicar`
    );
    return data.modelo;
  },

  async atualizarStatusModelo(id: string, status: "ATIVA" | "INATIVA") {
    const { data } = await httpClient.patch<{ modelo: MensagemModelo }>(
      `/api/mensagens-personalizadas/modelos/${id}/status`,
      { status }
    );
    return data.modelo;
  },

  async removerModelo(id: string) {
    await httpClient.delete(`/api/mensagens-personalizadas/modelos/${id}`);
  },

  async listarTaxonomias() {
    const { data } = await httpClient.get<{ taxonomias: MensagemTaxonomia[] }>(
      "/api/mensagens-personalizadas/taxonomias"
    );
    return data.taxonomias ?? [];
  },

  async criarTaxonomia(payload: {
    tipo: MensagemTaxonomiaTipo;
    nome: string;
    descricao?: string;
    status?: "ATIVA" | "INATIVA";
  }) {
    const { data } = await httpClient.post<{ taxonomia: MensagemTaxonomia }>(
      "/api/mensagens-personalizadas/taxonomias",
      payload
    );
    return data.taxonomia;
  },

  async atualizarTaxonomia(
    id: string,
    payload: {
      tipo: MensagemTaxonomiaTipo;
      nome: string;
      descricao?: string;
      status?: "ATIVA" | "INATIVA";
    }
  ) {
    const { data } = await httpClient.put<{ taxonomia: MensagemTaxonomia }>(
      `/api/mensagens-personalizadas/taxonomias/${id}`,
      payload
    );
    return data.taxonomia;
  },

  async removerTaxonomia(id: string) {
    await httpClient.delete(`/api/mensagens-personalizadas/taxonomias/${id}`);
  },

  async listarHistorico(filtros?: MensagemHistoricoFiltros) {
    const { data } = await httpClient.get<{ historico: MensagemHistorico[] }>(
      "/api/mensagens-personalizadas/historico",
      { params: filtros }
    );
    return data.historico ?? [];
  },

  async buscarDestinatarios(tipo: string, termo?: string, somenteAtivos = true) {
    const { data } = await httpClient.get<{ destinatarios: MensagemDestinatario[] }>(
      "/api/mensagens-personalizadas/destinatarios",
      { params: { tipo, termo, somenteAtivos } }
    );
    return data.destinatarios ?? [];
  },

  async gerarPreview(payload: {
    modeloId?: string;
    canal: "WHATSAPP" | "EMAIL";
    destinatarioTipo: string;
    destinatarioId: string;
    assuntoEditado?: string;
    mensagemEditada?: string;
    contextoExtra?: Record<string, unknown>;
  }) {
    const { data } = await httpClient.post<{ preview: MensagemPreview }>(
      "/api/mensagens-personalizadas/preview",
      payload
    );
    return data.preview;
  },

  async enviar(payload: MensagemEnvioPayload) {
    const { data } = await httpClient.post<{ resultado: MensagemEnvioResultado }>(
      "/api/mensagens-personalizadas/enviar",
      payload
    );
    return data.resultado;
  }
};
