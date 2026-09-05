import { httpClient } from "./http-client";
import type { PessoaListaResponse, PessoaVinculo } from "@/types/pessoa";

export const pessoasService = {
  async listar(params?: { search?: string; tipoVinculo?: string; page?: number; pageSize?: number }) {
    const { data } = await httpClient.get<PessoaListaResponse>("/api/pessoas", { params });
    return data;
  },
  async listarVinculos(id: string) {
    const { data } = await httpClient.get<{ vinculos: PessoaVinculo[] }>(`/api/pessoas/${id}/vinculos`);
    return data.vinculos;
  },
  async listarAuditoria(id: string) {
    const { data } = await httpClient.get<{ auditoria: Array<{ id: string; vinculoId?: string; usuarioId?: string; acao: string; motivo?: string; criadoEm?: string }> }>(`/api/pessoas/${id}/vinculos/auditoria`);
    return data.auditoria;
  },
  async listarDuplicidades() {
    const { data } = await httpClient.get<{ duplicidades: Array<{ quantidade: number; pessoas: Array<{ id: string; nomeCompleto: string; dataNascimento?: string; cpfMascarado?: string; status: string }> }> }>("/api/pessoas/duplicidades");
    return data.duplicidades;
  },
  async revisarDuplicidade(pessoaId: string, status: "DIFERENTES" | "CORRIGIDA" | "CONSOLIDACAO_AUTORIZADA", observacao?: string) {
    const { data } = await httpClient.patch(`/api/pessoas/duplicidades/${pessoaId}/revisao`, { status, observacao });
    return data;
  },
  async criarVinculo(pessoaId: string | undefined, payload: { tipoVinculo: string; entidadeId?: number; identificadorExterno?: string; principal?: boolean }) {
    if (!pessoaId) throw new Error("Selecione uma pessoa antes de adicionar o vínculo.");
    const { data } = await httpClient.post(`/api/pessoas/${pessoaId}/vinculos`, payload);
    return data;
  }
};
