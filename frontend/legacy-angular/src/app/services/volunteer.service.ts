import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface VolunteerPayload {
  id?: string;
  foto_3x4?: string;
  profissionalId?: number | null;
  nome: string;
  cpf: string;
  rg?: string;
  dataNascimento?: string;
  genero?: string;
  profissao?: string;
  motivacao?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  pontoReferencia?: string;
  municipio?: string;
  zona?: string;
  uf?: string;
  email: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  areaInteresse?: string;
  habilidades?: string;
  idiomas?: string;
  linkedin?: string;
  status?: string;
  disponibilidadeDias?: string[];
  disponibilidadePeriodos?: string[];
  cargaHoraria?: string;
  presencial?: boolean;
  remoto?: boolean;
  inicioPrevisto?: string;
  observacoes?: string;
  documentoIdentificacao?: string;
  comprovanteEndereco?: string;
  aceiteVoluntariado?: boolean;
  aceiteImagem?: boolean;
  assinaturaDigital?: string;
}

@Injectable({ providedIn: 'root' })
export class VolunteerService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/voluntarios`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<VolunteerPayload[]> {
    return this.http
      .get<{ voluntarios: VolunteerApiPayload[] }>(this.baseUrl)
      .pipe(map((response) => (response.voluntarios ?? []).map((item) => this.mapApiToPayload(item))));
  }

  create(payload: VolunteerPayload): Observable<VolunteerPayload> {
    return this.http
      .post<{ voluntario: VolunteerApiPayload }>(this.baseUrl, this.mapPayloadToApi(payload))
      .pipe(map(({ voluntario }) => this.mapApiToPayload(voluntario)));
  }

  update(id: string, payload: VolunteerPayload): Observable<VolunteerPayload> {
    return this.http
      .put<{ voluntario: VolunteerApiPayload }>(`${this.baseUrl}/${id}`, this.mapPayloadToApi(payload))
      .pipe(map(({ voluntario }) => this.mapApiToPayload(voluntario)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private mapPayloadToApi(payload: VolunteerPayload): VolunteerApiPayload {
    return {
      profissional_id: payload.profissionalId ?? null,
      foto_3x4: payload.foto_3x4,
      nome_completo: payload.nome,
      cpf: payload.cpf,
      rg: payload.rg,
      data_nascimento: payload.dataNascimento,
      genero: payload.genero,
      profissao: payload.profissao,
      motivacao: payload.motivacao,
      cep: payload.cep,
      logradouro: payload.logradouro,
      numero: payload.numero,
      complemento: payload.complemento,
      bairro: payload.bairro,
      ponto_referencia: payload.pontoReferencia,
      municipio: payload.municipio,
      zona: payload.zona,
      uf: payload.uf,
      telefone: payload.telefone,
      email: payload.email,
      cidade: payload.cidade,
      estado: payload.estado,
      area_interesse: payload.areaInteresse,
      habilidades: payload.habilidades,
      idiomas: payload.idiomas,
      linkedin: payload.linkedin,
      status: payload.status ?? 'ATIVO',
      disponibilidade_dias: payload.disponibilidadeDias ?? [],
      disponibilidade_periodos: payload.disponibilidadePeriodos ?? [],
      carga_horaria_semanal: payload.cargaHoraria,
      presencial: payload.presencial ?? false,
      remoto: payload.remoto ?? false,
      inicio_previsto: payload.inicioPrevisto,
      observacoes: payload.observacoes,
      documento_identificacao: payload.documentoIdentificacao,
      comprovante_endereco: payload.comprovanteEndereco,
      aceite_voluntariado: payload.aceiteVoluntariado ?? false,
      aceite_imagem: payload.aceiteImagem ?? false,
      assinatura_digital: payload.assinaturaDigital
    };
  }

  private mapApiToPayload(item: VolunteerApiPayload): VolunteerPayload {
    return {
      id: String(item.id_voluntario ?? ''),
      profissionalId: item.profissional_id ?? null,
      foto_3x4: item.foto_3x4,
      nome: item.nome_completo,
      cpf: item.cpf,
      rg: item.rg,
      dataNascimento: item.data_nascimento,
      genero: item.genero,
      profissao: item.profissao,
      motivacao: item.motivacao,
      cep: item.cep,
      logradouro: item.logradouro,
      numero: item.numero,
      complemento: item.complemento,
      bairro: item.bairro,
      pontoReferencia: item.ponto_referencia,
      municipio: item.municipio,
      zona: item.zona,
      uf: item.uf,
      telefone: item.telefone,
      email: item.email ?? '',
      cidade: item.cidade,
      estado: item.estado,
      areaInteresse: item.area_interesse,
      habilidades: item.habilidades,
      idiomas: item.idiomas,
      linkedin: item.linkedin,
      status: item.status ?? 'ATIVO',
      disponibilidadeDias: item.disponibilidade_dias ?? [],
      disponibilidadePeriodos: item.disponibilidade_periodos ?? [],
      cargaHoraria: item.carga_horaria_semanal,
      presencial: item.presencial ?? false,
      remoto: item.remoto ?? false,
      inicioPrevisto: item.inicio_previsto,
      observacoes: item.observacoes,
      documentoIdentificacao: item.documento_identificacao,
      comprovanteEndereco: item.comprovante_endereco,
      aceiteVoluntariado: item.aceite_voluntariado ?? false,
      aceiteImagem: item.aceite_imagem ?? false,
      assinaturaDigital: item.assinatura_digital
    };
  }
}

type VolunteerApiPayload = {
  id_voluntario?: number | string;
  profissional_id?: number | null;
  foto_3x4?: string;
  nome_completo: string;
  cpf: string;
  rg?: string;
  data_nascimento?: string;
  genero?: string;
  profissao?: string;
  motivacao?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  ponto_referencia?: string;
  municipio?: string;
  zona?: string;
  uf?: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  area_interesse?: string;
  habilidades?: string;
  idiomas?: string;
  linkedin?: string;
  status?: string;
  disponibilidade_dias?: string[];
  disponibilidade_periodos?: string[];
  carga_horaria_semanal?: string;
  presencial?: boolean;
  remoto?: boolean;
  inicio_previsto?: string;
  observacoes?: string;
  documento_identificacao?: string;
  comprovante_endereco?: string;
  aceite_voluntariado?: boolean;
  aceite_imagem?: boolean;
  assinatura_digital?: string;
};
