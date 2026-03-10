import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BeneficiarioApiPayload } from './beneficiario-api.service';
import { RuntimeConfigService } from './runtime-config.service';

export interface FamiliaMembroPayload {
  id_familia_membro?: string;
  id_beneficiario: string;
  parentesco: string;
  responsavel_familiar?: boolean;
  usa_endereco_familia?: boolean;
  contribui_renda?: boolean;
  renda_individual?: number | string;
  participa_servicos?: boolean;
  observacoes?: string;
  beneficiario?: BeneficiarioApiPayload;
}

export interface FamiliaPayload {
  id_familia?: string;
  nome_familia: string;
  id_referencia_familiar?: string;
  referencia_familiar?: BeneficiarioApiPayload;
  status?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  ponto_referencia?: string;
  municipio?: string;
  uf?: string;
  zona?: string;
  situacao_imovel?: string;
  tipo_moradia?: string;
  agua_encanada?: boolean;
  esgoto_tipo?: string;
  coleta_lixo?: string;
  energia_eletrica?: boolean;
  internet?: boolean;
  arranjo_familiar?: string;
  qtd_membros?: number;
  qtd_criancas?: number;
  qtd_adolescentes?: number;
  qtd_idosos?: number;
  qtd_pessoas_deficiencia?: number;
  renda_familiar_total?: number | string;
  renda_per_capita?: number | string;
  faixa_renda_per_capita?: string;
  principais_fontes_renda?: string;
  situacao_inseguranca_alimentar?: string;
  possui_dividas_relevantes?: boolean;
  descricao_dividas?: string;
  vulnerabilidades_familia?: string;
  servicos_acompanhamento?: string;
  tecnico_responsavel?: string;
  periodicidade_atendimento?: string;
  proxima_visita_prevista?: string;
  observacoes?: string;
  membros?: FamiliaMembroPayload[];
}

@Injectable({ providedIn: 'root' })
export class FamilyService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/familias`;

  constructor(private readonly http: HttpClient) {}

  private toSnakeCase(value: any): any {
    const normalized: any = {};

    Object.entries(value ?? {}).forEach(([key, val]) => {
      const snakeKey = key.includes('_') ? key : key.replace(/([A-Z])/g, '_$1').toLowerCase();
      normalized[snakeKey] = val;
    });

    return normalized;
  }

  private normalizeBeneficiario(payload: any): BeneficiarioApiPayload {
    return this.toSnakeCase(payload) as BeneficiarioApiPayload;
  }

  private normalizeMember(payload: any): FamiliaMembroPayload {
    const normalized = this.toSnakeCase(payload);

    return {
      ...normalized,
      id_familia_membro: payload?.idFamiliaMembro ?? normalized.id_familia_membro,
      id_beneficiario: payload?.beneficiarioId ?? normalized.id_beneficiario,
      responsavel_familiar: payload?.responsavelFamiliar ?? normalized.responsavel_familiar,
      contribui_renda: payload?.contribuiRenda ?? normalized.contribui_renda,
      renda_individual: payload?.rendaIndividual ?? normalized.renda_individual,
      participa_servicos: payload?.participaServicos ?? normalized.participa_servicos,
      usa_endereco_familia: payload?.usaEnderecoFamilia ?? normalized.usa_endereco_familia,
      beneficiario: payload?.beneficiario
        ? this.normalizeBeneficiario(payload.beneficiario)
        : normalized.beneficiario
    } as FamiliaMembroPayload;
  }

  private normalizeFamily(payload: any): FamiliaPayload {
    const normalized = this.toSnakeCase(payload);

    return {
      ...normalized,
      id_familia: payload?.idFamilia ?? normalized.id_familia,
      nome_familia: payload?.nomeFamilia ?? normalized.nome_familia,
      id_referencia_familiar: payload?.idReferenciaFamiliar ?? normalized.id_referencia_familiar,
      referencia_familiar: payload?.referenciaFamiliar
        ? this.normalizeBeneficiario(payload.referenciaFamiliar)
        : normalized.referencia_familiar,
      membros: (payload?.membros ?? normalized.membros ?? []).map((member: any) => this.normalizeMember(member))
    } as FamiliaPayload;
  }

  list(params?: { nome_familia?: string; municipio?: string; referencia?: string }): Observable<{ familias: FamiliaPayload[] }> {
    let httpParams = new HttpParams();
    if (params?.nome_familia) httpParams = httpParams.set('nome_familia', params.nome_familia);
    if (params?.municipio) httpParams = httpParams.set('municipio', params.municipio);
    if (params?.referencia) httpParams = httpParams.set('referencia', params.referencia);
    return this.http
      .get<{ familias: FamiliaPayload[] }>(this.baseUrl, { params: httpParams })
      .pipe(map(({ familias }) => ({ familias: (familias ?? []).map((item) => this.normalizeFamily(item)) })));
  }

  getById(id: string): Observable<{ familia: FamiliaPayload }> {
    return this.http
      .get<{ familia: FamiliaPayload }>(`${this.baseUrl}/${id}`)
      .pipe(map(({ familia }) => ({ familia: this.normalizeFamily(familia) })));
  }

  create(payload: FamiliaPayload): Observable<{ familia: FamiliaPayload }> {
    return this.http
      .post<{ familia: FamiliaPayload }>(this.baseUrl, payload)
      .pipe(map(({ familia }) => ({ familia: this.normalizeFamily(familia) })));
  }

  update(id: string, payload: FamiliaPayload): Observable<{ familia: FamiliaPayload }> {
    return this.http
      .put<{ familia: FamiliaPayload }>(`${this.baseUrl}/${id}`, payload)
      .pipe(map(({ familia }) => ({ familia: this.normalizeFamily(familia) })));
  }

  addMember(familiaId: string, membro: FamiliaMembroPayload) {
    return this.http.post(`${this.baseUrl}/${familiaId}/membros`, membro);
  }

  updateMember(familiaId: string, membroId: string, membro: FamiliaMembroPayload) {
    return this.http.put(`${this.baseUrl}/${familiaId}/membros/${membroId}`, membro);
  }

  removeMember(familiaId: string, membroId: string) {
    return this.http.delete(`${this.baseUrl}/${familiaId}/membros/${membroId}`);
  }
}
