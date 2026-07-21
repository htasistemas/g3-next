import { httpClient } from "./http-client";
import type { ImportacaoLinha, ValidacaoImportacao } from "@/types/importacao-dados";
import type { InstituicaoResumo } from "@/types/instituicao";

export const importacaoDadosService = {
  async listarInstituicoes(busca?: string) {
    const { data } = await httpClient.get<{ instituicoes: InstituicaoResumo[] }>("/api/master/importacao-dados/instituicoes", { params: { busca } });
    return data.instituicoes ?? [];
  },
  async validar(arquivo: File, instituicaoId: string, mapeamento?: Record<string, string>) {
    const form = new FormData(); form.append("arquivo", arquivo); form.append("instituicao_id", instituicaoId);
    if (mapeamento) form.append("mapeamento", JSON.stringify(mapeamento));
    const { data } = await httpClient.post<ValidacaoImportacao>("/api/master/importacao-dados/validar", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 });
    return data;
  },
  async confirmar(id: string, acoes: Record<string, string>) {
    const { data } = await httpClient.post<{ id: string; status: string; resumo: Record<string, number>; linhas: ImportacaoLinha[] }>(`/api/master/importacao-dados/${id}/confirmar`, { acoes });
    return data;
  },
  async historico() {
    const { data } = await httpClient.get<{ importacoes: Array<Record<string, unknown>> }>("/api/master/importacao-dados/historico"); return data.importacoes ?? [];
  },
  async relatorio(id: string) {
    const { data } = await httpClient.get<Blob>(`/api/master/importacao-dados/${id}/relatorio`, { responseType: "blob" }); return data;
  }
};
