import { httpClient } from "./http-client";
import type {
  LocalDestinoVeiculo,
  MotoristaAutorizado,
  MotoristaDisponivel,
  RegistroDiarioBordo,
  VeiculoCadastro
} from "@/types/controle-veiculos";

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

    const { data } = await httpClient.post<{ arquivo: { caminho_arquivo: string } }>(
      "/api/arquivos/upload",
      formData
    );

    return data.arquivo.caminho_arquivo;
  },

  async uploadDocumentoVeiculo(arquivo: File, veiculoId?: number | null) {
    const formData = new FormData();
    formData.append("scope", "veiculo_documento");
    formData.append("entidadeTipo", "controle_veiculo");
    if (veiculoId) {
      formData.append("entidadeId", String(veiculoId));
    }
    formData.append("arquivo", arquivo);

    const { data } = await httpClient.post<{ arquivo: { caminho_arquivo: string } }>(
      "/api/arquivos/upload",
      formData
    );

    return data.arquivo.caminho_arquivo;
  }
};
