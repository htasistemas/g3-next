import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export type JobStatus = 'Aberta' | 'Pausada' | 'Encerrada';

export interface JobEncaminhamento {
  id: string;
  beneficiarioId: string;
  beneficiarioNome: string;
  data: string;
  status: string;
  observacoes?: string;
}

export interface JobCandidato {
  id: string;
  empregoId: string;
  beneficiarioId?: string | null;
  beneficiarioNome: string;
  necessidadesProfissionais?: string | null;
  status?: string | null;
  curriculoNome?: string | null;
  curriculoTipo?: string | null;
  curriculoConteudo?: string | null;
  criadoEm?: string;
}

export interface JobPayload {
  dadosVaga: {
    titulo: string;
    area?: string;
    tipo?: string;
    nivel?: string;
    modelo?: string;
    status: JobStatus;
    dataAbertura?: string;
    dataEncerramento?: string;
    tipoContrato?: string;
    cargaHoraria?: string;
    salario?: string;
    beneficios?: string;
  };
  empresaLocal?: {
    nomeEmpresa: string;
    cnpj?: string;
    responsavel?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
  requisitos?: {
    escolaridade?: string;
    experiencia?: string;
    habilidades?: string;
    requisitos?: string;
    descricao?: string;
    observacoes?: string;
  };
  encaminhamentos?: JobEncaminhamento[];
}

export interface JobRecord extends JobPayload {
  id: string;
  criadoEm: string;
  atualizadoEm?: string;
}

@Injectable({ providedIn: 'root' })
export class BancoEmpregosService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/banco-empregos`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<JobRecord[]> {
    return this.http.get<JobRecord[]>(this.baseUrl);
  }

  getById(id: string): Observable<JobRecord> {
    return this.http.get<JobRecord>(`${this.baseUrl}/${id}`);
  }

  create(payload: JobPayload): Observable<JobRecord> {
    return this.http.post<JobRecord>(this.baseUrl, payload);
  }

  update(id: string, payload: JobPayload): Observable<JobRecord> {
    return this.http.put<JobRecord>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listarCandidatos(empregoId: string): Observable<JobCandidato[]> {
    return this.http.get<JobCandidato[]>(`${this.baseUrl}/${empregoId}/candidatos`);
  }

  criarCandidato(empregoId: string, payload: Omit<JobCandidato, 'id' | 'criadoEm' | 'empregoId'>): Observable<JobCandidato> {
    return this.http.post<JobCandidato>(`${this.baseUrl}/${empregoId}/candidatos`, payload);
  }

  removerCandidato(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/candidatos/${id}`);
  }
}
