import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { SalaRecord } from './salas.service';
import { RuntimeConfigService } from './runtime-config.service';

export type CourseType = 'Curso' | 'Atendimento' | 'Oficina';
export type EnrollmentStatus = 'Ativo' | 'Concluído' | 'Cancelado';
export type StatusAgendamento = 'AGUARDANDO' | 'CONFIRMADO' | 'REMARCAR' | 'REMARCADO' | 'NAO_RESPONDEU';

export interface Enrollment {
  id: string;
  beneficiaryName: string;
  cpf: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  dataAgendada?: string | null;
  horaAgendada?: string | null;
  statusAgendamento?: StatusAgendamento | null;
  profissionalId?: string | null;
  profissionalNome?: string | null;
  profissionalTipo?: string | null;
  confirmacaoPresenca?: boolean;
}

export type PresencaStatus = 'PRESENTE' | 'AUSENTE';

export interface PresencaItem {
  matriculaId: string;
  status: PresencaStatus;
}

export interface PresencaResponse {
  dataAula: string;
  presencas: PresencaItem[];
}

export interface PresencaDataRecord {
  id: string;
  dataAula: string;
  status: 'GERADA' | 'PREENCHIDA' | 'CANCELADA';
  observacoes?: string | null;
  totalPresencas?: number | null;
  totalAnexos?: number | null;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface PresencaDataListaResponse {
  datas: PresencaDataRecord[];
}

export interface PresencaAnexoRecord {
  id: string;
  presencaDataId: string;
  nomeArquivo: string;
  tipoMime: string;
  tamanho?: string | null;
  arquivoUrl?: string | null;
  dataUpload?: string | null;
  usuario?: string | null;
  criadoEm?: string | null;
}

export interface WaitlistEntry {
  id: string;
  beneficiaryName: string;
  cpf: string;
  joinedAt: string;
}

export interface CourseRecord {
  id: string;
  tipo: CourseType;
  nome: string;
  descricao: string;
  imagem?: string | null;
  vagasTotais: number;
  vagasDisponiveis: number;
  cargaHoraria?: number | null;
  horarioInicial: string;
  duracaoHoras: number;
  diasSemana: string[];
  faixasEtarias?: string[];
  restricoes?: string | null;
  vagaPreferencialIdosos?: boolean;
  sexoPermitido?: string;
  profissional: string;
  instituicaoParceira?: string | null;
  salaId?: string | number | null;
  sala?: SalaRecord | null;
  createdAt: string;
  updatedAt?: string;
  status: 'TRIAGEM' | 'EM_ANDAMENTO' | 'ENCAMINHADO' | 'EM_VISITA' | 'CONCLUIDO';
  statusHistory?: { status: CourseRecord['status']; changedAt: string; justification?: string }[];
  dataTriagem?: string | null;
  dataEncaminhamento?: string | null;
  dataConclusao?: string | null;
  enrollments: Enrollment[];
  waitlist: WaitlistEntry[];
}

export interface CoursePayload
  extends Omit<CourseRecord, 'id' | 'createdAt' | 'updatedAt' | 'vagasDisponiveis' | 'sala'> {
  vagasDisponiveis?: number;
}

@Injectable({ providedIn: 'root' })
export class CursosAtendimentosService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/cursos-atendimentos`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<CourseRecord[]> {
    return this.http
      .get<{ records: CourseRecord[] }>(this.baseUrl)
      .pipe(map((response) => response.records ?? []));
  }

  create(payload: CoursePayload): Observable<CourseRecord> {
    return this.http
      .post<{ record: CourseRecord }>(this.baseUrl, payload)
      .pipe(map((response) => response.record));
  }

  update(id: string, payload: Partial<CoursePayload>): Observable<CourseRecord> {
    return this.http
      .put<{ record: CourseRecord }>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((response) => response.record));
  }

  updateStatus(
    id: string,
    payload: { status: CourseRecord['status']; justification?: string },
  ): Observable<CourseRecord> {
    return this.http
      .patch<{ record: CourseRecord }>(`${this.baseUrl}/${id}/status`, payload)
      .pipe(map((response) => response.record));
  }

  listarPresencas(cursoId: string, dataAula: string): Observable<PresencaResponse> {
    return this.http.get<PresencaResponse>(`${this.baseUrl}/${cursoId}/presencas`, {
      params: { data: dataAula },
    });
  }

  salvarPresencas(cursoId: string, payload: PresencaResponse): Observable<PresencaResponse> {
    return this.http.post<PresencaResponse>(`${this.baseUrl}/${cursoId}/presencas`, payload);
  }

  listarPresencaDatas(cursoId: string, somentePendentes = false): Observable<PresencaDataListaResponse> {
    return this.http.get<PresencaDataListaResponse>(`${this.baseUrl}/${cursoId}/presencas/datas`, {
      params: { pendentes: String(somentePendentes) }
    });
  }

  criarPresencaData(
    cursoId: string,
    payload: { dataAula: string; observacoes?: string | null }
  ): Observable<PresencaDataRecord> {
    return this.http.post<PresencaDataRecord>(`${this.baseUrl}/${cursoId}/presencas/datas`, payload);
  }

  atualizarPresencaData(
    cursoId: string,
    presencaDataId: string,
    payload: { observacoes?: string | null; status?: string }
  ): Observable<PresencaDataRecord> {
    return this.http.put<PresencaDataRecord>(
      `${this.baseUrl}/${cursoId}/presencas/datas/${presencaDataId}`,
      payload
    );
  }

  cancelarPresencaData(cursoId: string, presencaDataId: string): Observable<PresencaDataRecord> {
    return this.http.patch<PresencaDataRecord>(
      `${this.baseUrl}/${cursoId}/presencas/datas/${presencaDataId}/cancelar`,
      {}
    );
  }

  removerPresencaData(cursoId: string, presencaDataId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${cursoId}/presencas/datas/${presencaDataId}`);
  }

  listarPresencasPorData(cursoId: string, presencaDataId: string): Observable<PresencaResponse> {
    return this.http.get<PresencaResponse>(
      `${this.baseUrl}/${cursoId}/presencas/datas/${presencaDataId}/itens`
    );
  }

  salvarPresencasPorData(
    cursoId: string,
    presencaDataId: string,
    payload: PresencaResponse
  ): Observable<PresencaResponse> {
    return this.http.post<PresencaResponse>(
      `${this.baseUrl}/${cursoId}/presencas/datas/${presencaDataId}/itens`,
      payload
    );
  }

  listarPresencaAnexos(cursoId: string, presencaDataId: string): Observable<PresencaAnexoRecord[]> {
    return this.http.get<PresencaAnexoRecord[]>(
      `${this.baseUrl}/${cursoId}/presencas/datas/${presencaDataId}/anexos`
    );
  }

  adicionarPresencaAnexo(
    cursoId: string,
    presencaDataId: string,
    payload: {
      nomeArquivo: string;
      tipoMime: string;
      conteudoBase64: string;
      tamanho?: string | null;
      dataUpload?: string | null;
      usuario: string;
    }
  ): Observable<PresencaAnexoRecord> {
    return this.http.post<PresencaAnexoRecord>(
      `${this.baseUrl}/${cursoId}/presencas/datas/${presencaDataId}/anexos`,
      payload
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

