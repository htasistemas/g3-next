import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export type ProfessionalStatus = 'ATIVO' | 'INATIVO' | 'DESATUALIZADO' | 'INCOMPLETO' | 'EM_ANALISE' | 'BLOQUEADO';

export interface ProfessionalPayload {
  id?: string;
  nomeCompleto: string;
  cpf?: string;
  dataNascimento?: string;
  foto3x4?: string | null;
  sexoBiologico?: string;
  estadoCivil?: string;
  nacionalidade?: string;
  naturalidadeCidade?: string;
  naturalidadeUf?: string;
  nomeMae?: string;
  vinculo?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  pontoReferencia?: string;
  municipio?: string;
  zona?: string;
  subzona?: string;
  uf?: string;
  categoria: string;
  registroConselho?: string;
  especialidade?: string;
  email?: string;
  telefone?: string;
  unidade?: string;
  salaAtendimento?: string;
  cargaHoraria?: number;
  disponibilidade?: string[];
  canaisAtendimento?: string[];
  status?: ProfessionalStatus;
  tags?: string[];
  resumo?: string;
  observacoes?: string;
}

export interface ProfessionalRecord extends ProfessionalPayload {
  id: string;
  criadoEm: string;
  atualizadoEm?: string;
  status: ProfessionalStatus;
}

type ProfessionalApiPayload = {
  id_profissional?: string | number;
  nome_completo: string;
  cpf?: string;
  data_nascimento?: string;
  foto_3x4?: string | null;
  sexo_biologico?: string;
  estado_civil?: string;
  nacionalidade?: string;
  naturalidade_cidade?: string;
  naturalidade_uf?: string;
  nome_mae?: string;
  vinculo?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  ponto_referencia?: string;
  municipio?: string;
  zona?: string;
  subzona?: string;
  uf?: string;
  categoria: string;
  registro_conselho?: string;
  especialidade?: string;
  email?: string;
  telefone?: string;
  unidade?: string;
  sala_atendimento?: string;
  carga_horaria?: number;
  disponibilidade?: string[];
  canais_atendimento?: string[];
  status?: string;
  tags?: string[];
  resumo?: string;
  observacoes?: string;
  data_cadastro?: string;
  data_atualizacao?: string;
};

@Injectable({ providedIn: 'root' })
export class ProfessionalService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/profissionais`;
  private cachedProfessionals: ProfessionalRecord[] = [];

  constructor(private readonly http: HttpClient) {}

  list(nome?: string): Observable<ProfessionalRecord[]> {
    let params = new HttpParams();
    if (nome) params = params.set('nome', nome);

    return this.http
      .get<{ profissionais: ProfessionalApiPayload[] }>(this.baseUrl, { params })
      .pipe(
        map((response) => {
          const records = (response.profissionais ?? []).map((item) => this.mapApiToRecord(item));
          if (!nome) {
            this.cachedProfessionals = records;
          }
          return records;
        }),
        catchError((error) => {
          console.error('Erro ao carregar profissionais', error);
          return throwError(() => error);
        })
      );
  }

  create(payload: ProfessionalPayload): Observable<ProfessionalRecord> {
    return this.http
      .post<{ profissional: ProfessionalApiPayload }>(this.baseUrl, this.mapPayloadToApi(payload))
      .pipe(map(({ profissional }) => this.mapApiToRecord(profissional)));
  }

  update(id: string, payload: ProfessionalPayload): Observable<ProfessionalRecord> {
    return this.http
      .put<{ profissional: ProfessionalApiPayload }>(`${this.baseUrl}/${id}`, this.mapPayloadToApi(payload))
      .pipe(map(({ profissional }) => this.mapApiToRecord(profissional)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  search(term: string): ProfessionalRecord[] {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return [];

    return (this.cachedProfessionals ?? [])
      .filter((item) =>
        [item.nomeCompleto, item.especialidade, item.categoria]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(normalized))
      )
      .slice(0, 8);
  }

  private mapPayloadToApi(payload: ProfessionalPayload): ProfessionalApiPayload {
    return {
      nome_completo: payload.nomeCompleto,
      cpf: payload.cpf,
      data_nascimento: payload.dataNascimento,
      foto_3x4: payload.foto3x4 ?? null,
      sexo_biologico: payload.sexoBiologico,
      estado_civil: payload.estadoCivil,
      nacionalidade: payload.nacionalidade,
      naturalidade_cidade: payload.naturalidadeCidade,
      naturalidade_uf: payload.naturalidadeUf,
      nome_mae: payload.nomeMae,
      vinculo: payload.vinculo,
      cep: payload.cep,
      logradouro: payload.logradouro,
      numero: payload.numero,
      complemento: payload.complemento,
      bairro: payload.bairro,
      ponto_referencia: payload.pontoReferencia,
      municipio: payload.municipio,
      zona: payload.zona,
      subzona: payload.subzona,
      uf: payload.uf,
      categoria: payload.categoria,
      registro_conselho: payload.registroConselho,
      especialidade: payload.especialidade,
      email: payload.email,
      telefone: payload.telefone,
      unidade: payload.unidade,
      sala_atendimento: payload.salaAtendimento,
      carga_horaria: payload.cargaHoraria,
      disponibilidade: payload.disponibilidade ?? [],
      canais_atendimento: payload.canaisAtendimento ?? [],
      status: payload.status,
      tags: payload.tags ?? [],
      resumo: payload.resumo,
      observacoes: payload.observacoes
    };
  }

  private mapApiToRecord(item: ProfessionalApiPayload): ProfessionalRecord {
    return {
      id: String(item.id_profissional ?? ''),
      nomeCompleto: item.nome_completo,
      cpf: item.cpf,
      dataNascimento: item.data_nascimento,
      foto3x4: item.foto_3x4 ?? null,
      sexoBiologico: item.sexo_biologico,
      estadoCivil: item.estado_civil,
      nacionalidade: item.nacionalidade,
      naturalidadeCidade: item.naturalidade_cidade,
      naturalidadeUf: item.naturalidade_uf,
      nomeMae: item.nome_mae,
      vinculo: item.vinculo,
      cep: item.cep,
      logradouro: item.logradouro,
      numero: item.numero,
      complemento: item.complemento,
      bairro: item.bairro,
      pontoReferencia: item.ponto_referencia,
      municipio: item.municipio,
      zona: item.zona,
      subzona: item.subzona,
      uf: item.uf,
      categoria: item.categoria,
      registroConselho: item.registro_conselho,
      especialidade: item.especialidade,
      email: item.email,
      telefone: item.telefone,
      unidade: item.unidade,
      salaAtendimento: item.sala_atendimento,
      cargaHoraria: item.carga_horaria,
      disponibilidade: item.disponibilidade ?? [],
      canaisAtendimento: item.canais_atendimento ?? [],
      status: (item.status as ProfessionalStatus) ?? 'EM_ANALISE',
      tags: item.tags ?? [],
      resumo: item.resumo,
      observacoes: item.observacoes,
      criadoEm: item.data_cadastro ?? new Date().toISOString(),
      atualizadoEm: item.data_atualizacao
    };
  }
}
