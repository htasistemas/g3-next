import { httpClient } from "./http-client";
import type { EvidenciaPublica, IndicadorPublico, ParceriaPublica } from "@/types/educacional-parcerias-publicas";
import type { BeneficiarioBusca, EducacionalItem, EducacionalResumo } from "@/types/educacional";

export type EducacionalRecurso =
  | "anos-letivos"
  | "etapas"
  | "series"
  | "disciplinas"
  | "turmas"
  | "alunos"
  | "matriculas"
  | "enturmacoes"
  | "profissionais"
  | "grade-curricular"
  | "horarios"
  | "diarios"
  | "frequencias"
  | "planos-aula"
  | "planejamentos"
  | "avaliacoes"
  | "notas"
  | "boletins"
  | "historicos"
  | "ocorrencias"
  | "agenda"
  | "documentos"
  | "rotinas-infantis"
  | "desenvolvimentos-infantis"
  | "transferencias"
  | "autorizacoes"
  | "lista-espera"
  | "recuperacoes"
  | "resultados-finais"
  | "calendario";

export type UnidadeEnsinoCatalogo = {
  id: string;
  nome: string;
  salas: Array<{ id: string; nome: string; capacidade_maxima: number; ocupadas: number; disponiveis: number | null; lotada: boolean }>;
};

export const educacionalService = {
  async listarParceriasPublicas() {
    const { data } = await httpClient.get<{ itens: ParceriaPublica[] }>("/api/educacional/parcerias-publicas");
    return data.itens;
  },
  async criarParceriaPublica(payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ item: ParceriaPublica }>("/api/educacional/parcerias-publicas", payload);
    return data.item;
  },
  async criarIndicadorPublico(payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ item: IndicadorPublico }>("/api/educacional/parcerias-publicas/indicadores", payload);
    return data.item;
  },
  async criarEvidenciaPublica(payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ item: EvidenciaPublica }>("/api/educacional/parcerias-publicas/evidencias", payload);
    return data.item;
  },
  async resumo(filtros?: Record<string, string>) {
    const { data } = await httpClient.get<EducacionalResumo>("/api/educacional/resumo", { params: filtros });
    return data;
  },
  async listar(recurso: EducacionalRecurso) {
    const { data } = await httpClient.get<{ itens: EducacionalItem[] }>(`/api/educacional/${recurso}`);
    return data.itens;
  },
  async salvar(recurso: EducacionalRecurso, payload: Record<string, unknown>, id?: string) {
    const { data } = id
      ? await httpClient.put<{ item: EducacionalItem }>(`/api/educacional/${recurso}/${id}`, payload)
      : await httpClient.post<{ item: EducacionalItem }>(`/api/educacional/${recurso}`, payload);
    return data.item;
  },
  async buscarBeneficiarios(termo: string) {
    const { data } = await httpClient.get<{ beneficiarios: Array<Record<string, unknown>> }>("/api/educacional/alunos/busca", {
      params: { busca: termo }
    });
    return data.beneficiarios.map((item) => ({
      id: String(item.id),
      codigo: item.codigo ? String(item.codigo) : null,
      nome: String(item.nome_completo ?? ""),
      dataNascimento: item.data_nascimento ? String(item.data_nascimento) : null,
      nomeMae: item.nome_mae ? String(item.nome_mae) : null
    }));
  },
  async listarUnidadesEnsino() {
    const { data } = await httpClient.get<{ unidades: UnidadeEnsinoCatalogo[] }>("/api/educacional/unidades-ensino");
    return data.unidades;
  },
  async vincularAluno(beneficiarioId: string) {
    const { data } = await httpClient.post<{ aluno: EducacionalItem }>("/api/educacional/alunos/vincular", {
      beneficiario_id: beneficiarioId
    });
    return data.aluno;
  }
};
