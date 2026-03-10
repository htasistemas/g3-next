import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export type PlanoStatus =
  | 'EM_ELABORACAO'
  | 'ENVIADO_ANALISE'
  | 'APROVADO'
  | 'EM_EXECUCAO'
  | 'CONCLUIDO'
  | 'REPROVADO';

export interface PlanoEtapaPayload {
  id?: string;
  descricao: string;
  status?: string;
  dataInicioPrevista?: string;
  dataFimPrevista?: string;
  dataConclusao?: string;
  responsavel?: string;
}

export interface PlanoAtividadePayload {
  id?: string;
  descricao: string;
  justificativa?: string;
  publicoAlvo?: string;
  localExecucao?: string;
  produtoEsperado?: string;
  etapas: PlanoEtapaPayload[];
}

export interface PlanoMetaPayload {
  id?: string;
  codigo?: string;
  descricao: string;
  indicador?: string;
  unidadeMedida?: string;
  quantidadePrevista?: number;
  resultadoEsperado?: string;
  atividades: PlanoAtividadePayload[];
}

export interface CronogramaPayload {
  id?: string;
  referenciaTipo?: string;
  referenciaId?: string;
  referenciaDescricao?: string;
  competencia: string;
  descricaoResumida?: string;
  valorPrevisto?: number;
  fonteRecurso?: string;
  naturezaDespesa?: string;
  observacoes?: string;
}

export interface PlanoEquipePayload {
  id?: string;
  nome: string;
  funcao?: string;
  cpf?: string;
  cargaHoraria?: string;
  tipoVinculo?: string;
  contato?: string;
}

export interface PlanoTrabalhoPayload {
  id?: string;
  codigoInterno?: string;
  titulo: string;
  descricaoGeral: string;
  status: PlanoStatus;
  orgaoConcedente?: string;
  orgaoOutroDescricao?: string;
  areaPrograma?: string;
  dataElaboracao?: string;
  dataAprovacao?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  termoFomentoId: string;
  numeroProcesso?: string;
  modalidade?: string;
  observacoesVinculacao?: string;
  metas: PlanoMetaPayload[];
  cronograma: CronogramaPayload[];
  equipe: PlanoEquipePayload[];
  arquivoFormato?: string;
}

export interface PlanoTrabalho extends PlanoTrabalhoPayload {
  id: string;
  codigoInterno: string;
  termoFomento?: { id: string; numero: string; objeto?: string };
}

@Injectable({ providedIn: 'root' })
export class PlanoTrabalhoService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/planos-trabalho`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<PlanoTrabalho[]> {
    return this.http.get<{ planos: PlanoTrabalho[] }>(this.baseUrl).pipe(map((response) => response.planos));
  }

  get(id: string): Observable<PlanoTrabalho> {
    return this.http.get<{ plano: PlanoTrabalho }>(`${this.baseUrl}/${id}`).pipe(map((response) => response.plano));
  }

  create(payload: PlanoTrabalhoPayload): Observable<PlanoTrabalho> {
    return this.http.post<{ plano: PlanoTrabalho }>(this.baseUrl, payload).pipe(map((response) => response.plano));
  }

  update(id: string, payload: PlanoTrabalhoPayload): Observable<PlanoTrabalho> {
    return this.http.put<{ plano: PlanoTrabalho }>(`${this.baseUrl}/${id}`, payload).pipe(map((response) => response.plano));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  export(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/export`);
  }
}
