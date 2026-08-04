import { httpClient } from "./http-client";
import type {
  PrestacaoContas,
  PrestacaoContasPayload,
  PrestacaoIaConfig,
  PrestacaoProfissionalEntidade,
  PrestacaoProfissionalRegistro,
  PrestacaoProfissionalVisaoGeral
} from "@/types/prestacao-contas";

const baseUrl = "/api/transparencias";

export const prestacaoContasService = {
  async listar() {
    const { data } = await httpClient.get<{ transparencias: PrestacaoContas[] }>(baseUrl);
    return data.transparencias;
  },

  async obter(id: string) {
    const { data } = await httpClient.get<{ transparencia: PrestacaoContas }>(`${baseUrl}/${id}`);
    return data.transparencia;
  },

  async criar(payload: PrestacaoContasPayload) {
    const { data } = await httpClient.post<{ transparencia: PrestacaoContas }>(baseUrl, payload);
    return data.transparencia;
  },

  async atualizar(id: string, payload: PrestacaoContasPayload) {
    const { data } = await httpClient.put<{ transparencia: PrestacaoContas }>(
      `${baseUrl}/${id}`,
      payload
    );
    return data.transparencia;
  },

  async excluir(id: string) {
    await httpClient.delete(`${baseUrl}/${id}`);
  },

  async alterarWorkflow(id: string, acao: string) {
    const { data } = await httpClient.post<{ transparencia: PrestacaoContas }>(`${baseUrl}/${id}/workflow`, { acao });
    return data.transparencia;
  },

  async obterVisaoGeralProfissional() {
    const { data } = await httpClient.get<{ dados: PrestacaoProfissionalVisaoGeral }>(
      `${baseUrl}/profissional/visao-geral`
    );
    return data.dados;
  },

  async listarProfissional(entidade: PrestacaoProfissionalEntidade) {
    const { data } = await httpClient.get<{ registros: PrestacaoProfissionalRegistro[] }>(
      `${baseUrl}/profissional/${entidade}`
    );
    return data.registros;
  },

  async criarProfissional(entidade: PrestacaoProfissionalEntidade, payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ registro: PrestacaoProfissionalRegistro }>(
      `${baseUrl}/profissional/${entidade}`,
      payload
    );
    return data.registro;
  },

  async listarAuditoriaProfissional() {
    const { data } = await httpClient.get<{ registros: PrestacaoProfissionalRegistro[] }>(
      `${baseUrl}/profissional/auditoria`
    );
    return data.registros;
  },

  async listarConfiguracoesIa() {
    const { data } = await httpClient.get<{ registros: PrestacaoIaConfig[] }>(`${baseUrl}/profissional/ia`);
    return data.registros;
  },

  async salvarConfiguracaoIa(payload: PrestacaoIaConfig & { credencial?: string }) {
    const { data } = await httpClient.put<{ registro: PrestacaoIaConfig }>(`${baseUrl}/profissional/ia`, payload);
    return data.registro;
  },

  async testarConfiguracaoIa(tipo: "IA" | "OCR") {
    const { data } = await httpClient.post<{ resultado: { sucesso: boolean; mensagem: string } }>(
      `${baseUrl}/profissional/ia/testar`,
      { tipo }
    );
    return data.resultado;
  },

  async analisarDocumento(documentoId: string) {
    const { data } = await httpClient.post<{ resultado: Record<string, unknown> }>(
      `${baseUrl}/profissional/ocr/analisar-documento`,
      { documentoId }
    );
    return data.resultado;
  },

  async acionarAssistente(comando: string, contexto: Record<string, unknown> = {}) {
    const { data } = await httpClient.post<{ resultado: Record<string, unknown> }>(
      `${baseUrl}/profissional/assistente`,
      { comando, contexto }
    );
    return data.resultado;
  }
};
