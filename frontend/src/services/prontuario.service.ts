import { httpClient } from "./http-client";
import type { ProntuarioAtendimento, ProntuarioAtendimentoForm, ProntuarioContexto, ProntuarioBeneficiario } from "@/types/prontuario";

export const prontuarioService = {
  async buscarBeneficiarios(busca: string) {
    const { data } = await httpClient.get<{ beneficiarios: Array<{ id: string; codigo?: string; nomeCompleto: string; nomeSocial?: string; dataNascimento?: string; cpf?: string; telefone?: string; ultimoAtendimento?: string }> }>(
      "/api/central-atendimentos/beneficiarios/busca",
      { params: { busca } }
    );
    return data.beneficiarios.map((item): ProntuarioBeneficiario => ({
      id: String(item.id),
      codigo: item.codigo,
      nome_completo: item.nomeCompleto,
      nome_social: item.nomeSocial,
      data_nascimento: item.dataNascimento,
      cpf: item.cpf,
      telefone: item.telefone,
      ultimo_atendimento: item.ultimoAtendimento
    }));
  },
  async obterContexto(id: string) {
    const { data } = await httpClient.get<ProntuarioContexto>(`/api/prontuario/beneficiarios/${id}/contexto`);
    return data;
  },
  async criar(id: string, payload: ProntuarioAtendimentoForm) {
    const { data } = await httpClient.post<{ atendimento: ProntuarioAtendimento }>(`/api/prontuario/beneficiarios/${id}/atendimentos`, payload);
    return data.atendimento;
  },
  async atualizar(id: string, payload: ProntuarioAtendimentoForm) {
    const { data } = await httpClient.put<{ atendimento: ProntuarioAtendimento }>(`/api/prontuario/atendimentos/${id}`, payload);
    return data.atendimento;
  },
  async finalizar(id: string) {
    const { data } = await httpClient.post<{ atendimento: ProntuarioAtendimento }>(`/api/prontuario/atendimentos/${id}/finalizar`);
    return data.atendimento;
  },
  async adendo(id: string, conteudo: string, motivo?: string) {
    const { data } = await httpClient.post<{ atendimento: ProntuarioAtendimento }>(`/api/prontuario/atendimentos/${id}/adendos`, { conteudo, motivo });
    return data.atendimento;
  }
};
