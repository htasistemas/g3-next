import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export type ProjetoPrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type ProjetoStatus = 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'PARADO' | 'CONCLUIDO' | 'CANCELADO';
export type ProjetoArea =
  | 'ASSISTENCIA_SOCIAL'
  | 'EDUCACAO'
  | 'SAUDE'
  | 'ALIMENTACAO'
  | 'CAPACITACAO_PROFISSIONAL'
  | 'CULTURA'
  | 'ESPORTE'
  | 'HABITACAO'
  | 'CAPTACAO_RECURSOS'
  | 'OUTRO';
export type ProjetoTarefaTipo =
  | 'PLANEJAMENTO'
  | 'EXECUCAO'
  | 'ATENDIMENTO'
  | 'COMPRA'
  | 'PRESTACAO_CONTAS'
  | 'RELATORIO'
  | 'REUNIAO'
  | 'MONITORAMENTO'
  | 'DIVULGACAO'
  | 'OUTRO';
export type ProjetoTarefaStatus = 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'PARADO' | 'CONCLUIDO';

export interface ProjetoTaskPayload {
  titulo: string;
  descricao?: string;
  tipo_tarefa: ProjetoTarefaTipo;
  responsavel: string;
  prioridade: ProjetoPrioridade;
  status: ProjetoTarefaStatus;
  data_prevista?: string | null;
  data_conclusao?: string | null;
  observacoes?: string;
  ordem_kanban?: number;
  ativo?: boolean;
}

export interface ProjetoTaskRecord {
  id: string;
  projetoId: string;
  titulo: string;
  descricao: string;
  tipoTarefa: ProjetoTarefaTipo;
  tipoTarefaLabel: string;
  responsavel: string;
  prioridade: ProjetoPrioridade;
  prioridadeLabel: string;
  status: ProjetoTarefaStatus;
  statusLabel: string;
  dataPrevista?: string | null;
  dataConclusao?: string | null;
  observacoes: string;
  ordemKanban: number;
  ativo: boolean;
  atrasada: boolean;
}

export interface ProjetoHistoricoRecord {
  id: string;
  projetoId: string;
  tarefaId?: string | null;
  tipoEvento: string;
  descricao: string;
  usuarioNome: string;
  createdAt: string;
}

export interface ProjetoPayload {
  nome: string;
  descricao_completa?: string;
  objetivo_geral?: string;
  publico_alvo?: string;
  unidade_assistencial_id?: string | null;
  responsavel: string;
  equipe_envolvida?: string[];
  data_inicio: string;
  prazo_previsto: string;
  data_termino_real?: string | null;
  prioridade: ProjetoPrioridade;
  status: ProjetoStatus;
  area_projeto: ProjetoArea;
  fonte_recurso?: string;
  observacoes?: string;
  ativo?: boolean;
}

export interface ProjetoRecord {
  id: string;
  nome: string;
  descricaoCurta: string;
  descricaoCompleta: string;
  objetivoGeral: string;
  publicoAlvo: string;
  unidadeAssistencialId?: string | null;
  unidadeAssistencialNome: string;
  responsavel: string;
  equipeEnvolvida: string[];
  dataInicio: string | null;
  prazoPrevisto: string | null;
  dataTerminoReal?: string | null;
  prioridade: ProjetoPrioridade;
  prioridadeLabel: string;
  status: ProjetoStatus;
  statusLabel: string;
  areaProjeto: ProjetoArea;
  areaProjetoLabel: string;
  fonteRecurso: string;
  observacoes: string;
  ativo: boolean;
  percentualEvolucao: number;
  quantidadeTarefas: number;
  quantidadeTarefasConcluidas: number;
  indicadorPrazo: 'ATRASADO' | 'NO_PRAZO' | 'CONCLUIDO';
  tarefas: ProjetoTaskRecord[];
  historico: ProjetoHistoricoRecord[];
}

export interface ProjetoFilters {
  nome?: string;
  responsavel?: string;
  status?: ProjetoStatus | '';
  prioridade?: ProjetoPrioridade | '';
  area_projeto?: ProjetoArea | '';
  data_inicio_de?: string;
  data_inicio_ate?: string;
  prazo_de?: string;
  prazo_ate?: string;
  atrasados?: boolean;
  concluidos?: boolean;
  unidade_assistencial_id?: string;
}

export interface ProjetoDashboardResumo {
  totalProjetos: number;
  projetosEmAndamento: number;
  projetosParados: number;
  projetosConcluidos: number;
  projetosAtrasados: number;
  percentualMedioEvolucao: number;
  tarefasAbertas: number;
  tarefasConcluidas: number;
}

export interface ProjetoDashboardGraficoItem {
  chave?: string;
  faixa?: string;
  total: number;
}

export interface ProjetoDashboard {
  resumo: ProjetoDashboardResumo;
  graficos: {
    projetosPorStatus: ProjetoDashboardGraficoItem[];
    projetosPorPrioridade: ProjetoDashboardGraficoItem[];
    evolucaoProjetos: ProjetoDashboardGraficoItem[];
    tarefasPorResponsavel: ProjetoDashboardGraficoItem[];
    projetosVencendo: ProjetoDashboardGraficoItem[];
  };
}

@Injectable({ providedIn: 'root' })
export class ProjetosService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/administrativo/projetos`;

  constructor(private readonly http: HttpClient) {}

  list(filters: ProjetoFilters = {}): Observable<ProjetoRecord[]> {
    return this.http
      .get<{ projetos: ProjetoRecord[] }>(this.baseUrl, { params: this.toParams(filters) })
      .pipe(map((response) => response.projetos ?? []));
  }

  get(id: string): Observable<ProjetoRecord> {
    return this.http
      .get<{ projeto: ProjetoRecord }>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.projeto));
  }

  create(payload: ProjetoPayload): Observable<ProjetoRecord> {
    return this.http
      .post<{ projeto: ProjetoRecord }>(this.baseUrl, payload)
      .pipe(map((response) => response.projeto));
  }

  update(id: string, payload: ProjetoPayload): Observable<ProjetoRecord> {
    return this.http
      .put<{ projeto: ProjetoRecord }>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((response) => response.projeto));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  dashboard(filters: ProjetoFilters = {}): Observable<ProjetoDashboard> {
    return this.http.get<ProjetoDashboard>(`${this.baseUrl}/dashboard`, { params: this.toParams(filters) });
  }

  history(id: string): Observable<ProjetoHistoricoRecord[]> {
    return this.http
      .get<{ historico: ProjetoHistoricoRecord[] }>(`${this.baseUrl}/${id}/historico`)
      .pipe(map((response) => response.historico ?? []));
  }

  createTask(projetoId: string, payload: ProjetoTaskPayload): Observable<ProjetoTaskRecord> {
    return this.http
      .post<{ tarefa: ProjetoTaskRecord }>(`${this.baseUrl}/${projetoId}/tarefas`, payload)
      .pipe(map((response) => response.tarefa));
  }

  updateTask(projetoId: string, tarefaId: string, payload: ProjetoTaskPayload): Observable<ProjetoTaskRecord> {
    return this.http
      .put<{ tarefa: ProjetoTaskRecord }>(`${this.baseUrl}/${projetoId}/tarefas/${tarefaId}`, payload)
      .pipe(map((response) => response.tarefa));
  }

  moveTask(projetoId: string, tarefaId: string, status: ProjetoTarefaStatus): Observable<ProjetoTaskRecord> {
    return this.http
      .patch<{ tarefa: ProjetoTaskRecord }>(`${this.baseUrl}/${projetoId}/tarefas/${tarefaId}/status`, { status })
      .pipe(map((response) => response.tarefa));
  }

  generateReport(tipo: string, filtros: Record<string, unknown>): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/relatorios/${tipo}/pdf`, filtros, { responseType: 'blob' });
  }

  private toParams(filters: ProjetoFilters) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      params = params.set(key, String(value));
    });
    return params;
  }
}
