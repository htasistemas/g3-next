import { httpClient } from "./http-client";
import type {
  DisponibilidadeVeiculoConsulta,
  DisponibilidadeVeiculoDetalhe,
  DisponibilidadeVeiculoRegistro,
  DisponibilidadeVeiculoResumo,
  LocalDestinoVeiculo,
  MotoristaAutorizado,
  MotoristaDisponivel,
  RegistroDiarioBordo,
  VeiculoCadastro
} from "@/types/controle-veiculos";

type UploadArquivoResponse = {
  arquivo: {
    registro?: {
      id: number;
    };
    caminhoArquivo: string;
  };
};

export type UploadVeiculoResultado = {
  id?: number;
  caminhoArquivo: string;
};

export const controleVeiculosService = {
  async listarVeiculos() {
    const { data } = await httpClient.get<VeiculoCadastro[]>("/api/controle-veiculos/veiculos");
    return data;
  },

  async criarVeiculo(payload: VeiculoCadastro) {
    const { data } = await httpClient.post<VeiculoCadastro>("/api/controle-veiculos/veiculos", payload);
    return data;
  },

  async atualizarVeiculo(id: number, payload: VeiculoCadastro) {
    const { data } = await httpClient.put<VeiculoCadastro>(
      `/api/controle-veiculos/veiculos/${id}`,
      payload
    );
    return data;
  },

  async removerVeiculo(id: number) {
    await httpClient.delete(`/api/controle-veiculos/veiculos/${id}`);
  },

  async listarDiario() {
    const { data } = await httpClient.get<RegistroDiarioBordo[]>("/api/controle-veiculos/diario-bordo");
    return data;
  },

  async criarDiario(payload: RegistroDiarioBordo) {
    const { data } = await httpClient.post<RegistroDiarioBordo>(
      "/api/controle-veiculos/diario-bordo",
      payload
    );
    return data;
  },

  async atualizarDiario(id: number, payload: RegistroDiarioBordo) {
    const { data } = await httpClient.put<RegistroDiarioBordo>(
      `/api/controle-veiculos/diario-bordo/${id}`,
      payload
    );
    return data;
  },

  async removerDiario(id: number) {
    await httpClient.delete(`/api/controle-veiculos/diario-bordo/${id}`);
  },

  async listarLocaisDestino() {
    const { data } = await httpClient.get<LocalDestinoVeiculo[]>("/api/controle-veiculos/locais-destino");
    return data;
  },

  async criarLocalDestino(payload: LocalDestinoVeiculo) {
    const { data } = await httpClient.post<LocalDestinoVeiculo>("/api/controle-veiculos/locais-destino", payload);
    return data;
  },

  async atualizarLocalDestino(id: number, payload: LocalDestinoVeiculo) {
    const { data } = await httpClient.put<LocalDestinoVeiculo>(
      `/api/controle-veiculos/locais-destino/${id}`,
      payload
    );
    return data;
  },

  async removerLocalDestino(id: number) {
    await httpClient.delete(`/api/controle-veiculos/locais-destino/${id}`);
  },

  async listarMotoristasDisponiveis(nome?: string) {
    const { data } = await httpClient.get<MotoristaDisponivel[]>(
      "/api/controle-veiculos/motoristas-disponiveis",
      { params: { nome } }
    );
    return data;
  },

  async listarMotoristasAutorizados(veiculoId?: number | null) {
    const { data } = await httpClient.get<MotoristaAutorizado[]>(
      "/api/controle-veiculos/motoristas-autorizados",
      { params: veiculoId ? { veiculoId } : undefined }
    );
    return data;
  },

  async criarMotoristaAutorizado(payload: MotoristaAutorizado) {
    const { data } = await httpClient.post<MotoristaAutorizado>(
      "/api/controle-veiculos/motoristas-autorizados",
      payload
    );
    return data;
  },

  async atualizarMotoristaAutorizado(id: number, payload: MotoristaAutorizado) {
    const { data } = await httpClient.put<MotoristaAutorizado>(
      `/api/controle-veiculos/motoristas-autorizados/${id}`,
      payload
    );
    return data;
  },

  async removerMotoristaAutorizado(id: number) {
    await httpClient.delete(`/api/controle-veiculos/motoristas-autorizados/${id}`);
  },

  async uploadFotoVeiculo(arquivo: File, veiculoId?: number | null) {
    const formData = new FormData();
    formData.append("scope", "veiculo_foto");
    formData.append("entidadeTipo", "controle_veiculo");
    if (veiculoId) {
      formData.append("entidadeId", String(veiculoId));
    }
    formData.append("arquivo", arquivo);

    const { data } = await httpClient.post<UploadArquivoResponse>(
      "/api/arquivos/upload",
      formData
    );

    return {
      id: data.arquivo.registro?.id,
      caminhoArquivo: data.arquivo.caminhoArquivo
    } satisfies UploadVeiculoResultado;
  },

  async uploadDocumentoVeiculo(arquivo: File, veiculoId?: number | null) {
    const formData = new FormData();
    formData.append("scope", "veiculo_documento");
    formData.append("entidadeTipo", "controle_veiculo");
    if (veiculoId) {
      formData.append("entidadeId", String(veiculoId));
    }
    formData.append("arquivo", arquivo);

    const { data } = await httpClient.post<UploadArquivoResponse>(
      "/api/arquivos/upload",
      formData
    );

    return {
      id: data.arquivo.registro?.id,
      caminhoArquivo: data.arquivo.caminhoArquivo
    } satisfies UploadVeiculoResultado;
  },

  async listarDisponibilidades() {
    const { data } = await httpClient.get<{ disponibilidades: DisponibilidadeVeiculoRegistro[] }>(
      "/api/controle-veiculos/disponibilidade"
    );
    return data.disponibilidades ?? [];
  },

  async consultarDisponibilidade(params: DisponibilidadeVeiculoConsulta) {
    const { data } = await httpClient.get<DisponibilidadeVeiculoResumo>(
      "/api/controle-veiculos/disponibilidade/consulta",
      { params }
    );
    return data;
  },

  async resumirDisponibilidade(params: DisponibilidadeVeiculoConsulta) {
    const { data } = await httpClient.get<DisponibilidadeVeiculoResumo>(
      "/api/controle-veiculos/disponibilidade/resumo",
      { params }
    );
    return data;
  },

  async listarVeiculosDisponibilidade() {
    const { data } = await httpClient.get<
      Array<{ id: number; placa?: string | null; modelo?: string | null; marca?: string | null; rotulo: string }>
    >("/api/controle-veiculos/disponibilidade/veiculos/ativos");
    return data;
  },

  async obterAgendaVeiculo(veiculoId: number, params: DisponibilidadeVeiculoConsulta) {
    const { data } = await httpClient.get<DisponibilidadeVeiculoRegistro[]>(
      `/api/controle-veiculos/disponibilidade/veiculos/${veiculoId}/agenda`,
      { params }
    );
    return data;
  },

  async obterProximaDisponibilidade(veiculoId: number) {
    const { data } = await httpClient.get<{
      disponivelEm: string;
      situacaoAtual: string;
      bloqueios: DisponibilidadeVeiculoRegistro[];
    }>(`/api/controle-veiculos/disponibilidade/veiculos/${veiculoId}/proxima-disponibilidade`);
    return data;
  },

  async obterDetalheDisponibilidade(id: number): Promise<DisponibilidadeVeiculoDetalhe> {
    const { data } = await httpClient.get<DisponibilidadeVeiculoDetalhe>(
      `/api/controle-veiculos/disponibilidade/${id}`
    );
    return data;
  },

  async criarDisponibilidade(payload: Omit<DisponibilidadeVeiculoRegistro, "id" | "tenantId" | "version" | "bloqueios" | "proximaLiberacao" | "situacao" | "ativo">) {
    const { data } = await httpClient.post<DisponibilidadeVeiculoRegistro>(
      "/api/controle-veiculos/disponibilidade",
      payload
    );
    return data;
  },

  async atualizarDisponibilidade(
    id: number,
    payload: Omit<DisponibilidadeVeiculoRegistro, "id" | "tenantId" | "version" | "bloqueios" | "proximaLiberacao" | "situacao" | "ativo">
  ) {
    const { data } = await httpClient.put<DisponibilidadeVeiculoRegistro>(
      `/api/controle-veiculos/disponibilidade/${id}`,
      payload
    );
    return data;
  },

  async cancelarDisponibilidade(id: number, motivoCancelamento: string) {
    const { data } = await httpClient.patch<DisponibilidadeVeiculoRegistro>(
      `/api/controle-veiculos/disponibilidade/${id}/cancelar`,
      { motivoCancelamento }
    );
    return data;
  },

  async encerrarDisponibilidade(id: number) {
    const { data } = await httpClient.patch<DisponibilidadeVeiculoRegistro>(
      `/api/controle-veiculos/disponibilidade/${id}/encerrar`
    );
    return data;
  },

  async excluirDisponibilidade(id: number) {
    const { data } = await httpClient.delete<DisponibilidadeVeiculoRegistro>(
      `/api/controle-veiculos/disponibilidade/${id}`
    );
    return data;
  }
};
