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
  | "calendario"
  | "configuracoes";

export type UnidadeEnsinoCatalogo = {
  id: string;
  nome: string;
  salas: Array<{ id: string; nome: string; capacidade_maxima: number; ocupadas: number; disponiveis: number | null; lotada: boolean }>;
};

export type AlunosAgrupadosResponse = {
  grupos: Array<{
    instituicao: { id?: string; nome: string; cnpj?: string | null; alunos_ativos: number; alunos_inativos: number; salas: number };
    salas: Array<{
      id?: string;
      nome: string;
      turma_nome?: string | null;
      etapa_nome?: string | null;
      serie_nome?: string | null;
      turno?: string | null;
      capacidade: number;
      vagas_disponiveis: number | null;
      alunos: Array<Record<string, unknown>>;
    }>;
  }>;
  total: number;
  pagina: number;
  limite: number;
  indicadores: { instituicoes: number; salas: number; alunos: number; alunos_ativos: number; alunos_sem_sala: number; alunos_sem_instituicao: number };
};

export type VidaAcademicaAlunoResponse = {
  aluno: Record<string, unknown>;
  matriculas: Array<Record<string, unknown>>;
  endereco?: Record<string, unknown> | null;
  contatos?: Array<Record<string, unknown>>;
  responsaveis?: Array<Record<string, unknown>>;
  documentos_beneficiario?: Array<Record<string, unknown>>;
  alertas?: Array<{ tipo: string; severidade: string; mensagem: string }>;
  frequencia: Record<string, unknown> & { percentual?: number };
  notas: Array<Record<string, unknown>>;
  ocorrencias: Array<Record<string, unknown>>;
  documentos: Array<Record<string, unknown>>;
  historico: Array<Record<string, unknown>>;
  linha_tempo: Array<{ tipo: string; data?: unknown; descricao?: unknown; origem?: Record<string, unknown> }>;
};

export type ChamadaRapidaResponse = {
  diario: Record<string, unknown>;
  alunos: Array<Record<string, unknown>>;
  resumo: { total: number; preenchidos: number; pendentes: number };
};
export type PendenciaEducacionalTipo = "documentos" | "chamadas" | "baixa-frequencia" | "turmas-sem-professor" | "capacidade";
export type PendenciasEducacionaisResponse = {
  tipo: PendenciaEducacionalTipo;
  titulo: string;
  descricao: string;
  total: number;
  itens: Array<Record<string, unknown>>;
  filtros: Record<string, unknown>;
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
  async buscarAlunos(termo: string) {
    const { data } = await httpClient.get<{ alunos: EducacionalItem[] }>("/api/educacional/alunos/busca-matricula", {
      params: { busca: termo }
    });
    return data.alunos;
  },
  async listarUnidadesEnsino() {
    const { data } = await httpClient.get<{ unidades: UnidadeEnsinoCatalogo[] }>("/api/educacional/unidades-ensino");
    return data.unidades;
  },
  async proximoNumeroMatricula() {
    const { data } = await httpClient.get<{ numero: string }>("/api/educacional/matriculas/proximo-numero");
    return data.numero;
  },
  async listarAlunosAgrupados(params: Record<string, string | number | boolean | undefined>) {
    const { data } = await httpClient.get<AlunosAgrupadosResponse>("/api/educacional/alunos/agrupados", { params });
    return data;
  },
  async listarPendenciasEducacionais(tipo: PendenciaEducacionalTipo, params?: Record<string, string | number | undefined>) {
    const { data } = await httpClient.get<PendenciasEducacionaisResponse>(`/api/educacional/pendencias/${tipo}`, { params });
    return data;
  },
  async obterVidaAcademicaAluno(alunoId: string) {
    const { data } = await httpClient.get<VidaAcademicaAlunoResponse>(`/api/educacional/alunos/${alunoId}/vida-academica`);
    return data;
  },
  async obterChamadaRapida(diarioId: string) {
    const { data } = await httpClient.get<ChamadaRapidaResponse>(`/api/educacional/diarios/${diarioId}/chamada`);
    return data;
  },
  async salvarChamadaRapida(diarioId: string, registros: Array<Record<string, unknown>>) {
    const { data } = await httpClient.post<{ itens: EducacionalItem[]; total: number }>(`/api/educacional/diarios/${diarioId}/chamada`, { registros });
    return data;
  },
  async gerarBoletimAutomatico(payload: { matricula_id: number; ano_letivo_id: number; periodo: string }) {
    const { data } = await httpClient.post<{ item: EducacionalItem; calculo: Record<string, unknown> }>("/api/educacional/boletins/gerar", payload);
    return data;
  },
  async gerarHistoricoAutomatico(payload: { aluno_id: number; ano_letivo_id: number }) {
    const { data } = await httpClient.post<{ item: EducacionalItem; calculo: Record<string, unknown> }>("/api/educacional/historicos/gerar", payload);
    return data;
  },
  async listarHistoricoMatricula(matriculaId: string) {
    const { data } = await httpClient.get<{ itens: Array<Record<string, unknown>> }>(`/api/educacional/matriculas/${matriculaId}/historico`);
    return data.itens;
  },
  async transferirMatricula(matriculaId: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.post(`/api/educacional/matriculas/${matriculaId}/transferir`, payload);
    return data;
  },
  async rematricular(matriculaId: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.post(`/api/educacional/matriculas/${matriculaId}/rematricular`, payload);
    return data;
  },
  async rematricularLote(payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ total: number; criadas: EducacionalItem[]; recusadas: Array<{ matricula_id: string; motivo: string }> }>("/api/educacional/matriculas/rematricular-lote", payload);
    return data;
  },
  async sugerirRecuperacoes(params: Record<string, string | number | undefined>) {
    const { data } = await httpClient.get<{ itens: EducacionalItem[]; total: number; media_minima: number }>("/api/educacional/recuperacoes/sugestoes", { params });
    return data;
  },
  async editarVinculoMatricula(matriculaId: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.put<{ item: EducacionalItem }>(`/api/educacional/matriculas/${matriculaId}/vinculo`, payload);
    return data.item;
  },
  async criarVinculoAluno(alunoId: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ item: EducacionalItem }>(`/api/educacional/alunos/${alunoId}/vinculo`, payload);
    return data.item;
  },
  async vincularAluno(beneficiarioId: string) {
    const { data } = await httpClient.post<{ aluno: EducacionalItem }>("/api/educacional/alunos/vincular", {
      beneficiario_id: beneficiarioId
    });
    return data.aluno;
  }
};
