import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DocumentoObrigatorio } from './beneficiary.service';
import { RuntimeConfigService } from './runtime-config.service';

export interface BeneficiarioApiPayload {
  id_beneficiario?: string;
  id_familia?: string;
  nome_familia?: string;
  codigo_familia?: string;
  registro_familia?: string;
  codigo?: string;
  status?: 'ATIVO' | 'INATIVO' | 'DESATUALIZADO' | 'INCOMPLETO' | 'EM_ANALISE' | 'BLOQUEADO' | string;
  motivo_bloqueio?: string;
  foto_3x4?: string;
  nome_completo: string;
  nome_social?: string;
  apelido?: string;
  data_nascimento: string;
  sexo_biologico?: string;
  identidade_genero?: string;
  cor_raca?: string;
  estado_civil?: string;
  nacionalidade?: string;
  naturalidade_cidade?: string;
  naturalidade_uf?: string;
  nome_mae: string;
  nome_pai?: string;
  cpf?: string | null;
  rg_numero?: string;
  rg_orgao_emissor?: string;
  rg_uf?: string;
  rg_data_emissao?: string;
  nis?: string;
  certidao_tipo?: string;
  certidao_livro?: string;
  certidao_folha?: string;
  certidao_termo?: string;
  certidao_cartorio?: string;
  certidao_municipio?: string;
  certidao_uf?: string;
  titulo_eleitor?: string;
  cnh?: string;
  cartao_sus?: string;
  telefone_principal?: string;
  telefone_principal_whatsapp?: boolean;
  telefone_secundario?: string;
  telefone_recado_nome?: string;
  telefone_recado_numero?: string;
  telefone?: string;
  email?: string;
  permite_contato_tel?: boolean;
  permite_contato_whatsapp?: boolean;
  permite_contato_sms?: boolean;
  permite_contato_email?: boolean;
  horario_preferencial_contato?: string;
  usa_endereco_familia?: boolean;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  ponto_referencia?: string;
  municipio?: string;
  uf?: string;
  latitude?: string;
  longitude?: string;
  zona?: string;
  subzona?: string;
  situacao_imovel?: string;
  tipo_moradia?: string;
  agua_encanada?: boolean;
  esgoto_tipo?: string;
  coleta_lixo?: string;
  energia_eletrica?: boolean;
  internet?: boolean;
  mora_com_familia?: boolean;
  responsavel_legal?: boolean;
  vinculo_familiar?: string;
  situacao_vulnerabilidade?: string;
  sabe_ler_escrever?: boolean;
  nivel_escolaridade?: string;
  estuda_atualmente?: boolean;
  ocupacao?: string;
  situacao_trabalho?: string;
  local_trabalho?: string;
  renda_mensal?: number | string;
  fonte_renda?: string;
  possui_deficiencia?: boolean;
  tipo_deficiencia?: string;
  cid_principal?: string;
  usa_medicacao_continua?: boolean;
  descricao_medicacao?: string;
  servico_saude_referencia?: string;
  recebe_beneficio?: boolean;
  beneficios_descricao?: string;
  valor_total_beneficios?: number | string;
  beneficios_recebidos?: string[];
  aceite_lgpd?: boolean;
  data_aceite_lgpd?: string;
  observacoes?: string;
  opta_receber_cesta_basica?: boolean;
  apto_receber_cesta_basica?: boolean;
  documentosObrigatorios?: DocumentoObrigatorio[];
  documentos_obrigatorios?: DocumentoObrigatorio[];
  composicao_familiar?: string;
  criancas_adolescentes?: number | string;
  idosos?: number | string;
  acompanhamento_cras?: boolean;
  acompanhamento_saude?: boolean;
  participa_comunidade?: string;
  rede_apoio?: string;
  data_cadastro?: string;
  data_atualizacao?: string;
}

@Injectable({ providedIn: 'root' })
export class BeneficiarioApiService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly apiBaseUrl = this.runtimeConfig.apiUrl.replace(/\/api\/?$/, '');
  private readonly baseUrl = `${this.apiBaseUrl}/api/beneficiarios`;

  constructor(private readonly http: HttpClient) {}

  private logAndRethrow(operation: string) {
    return (error: any) => {
      console.error(`Erro ${operation}`, error);
      return throwError(() => error);
    };
  }

  private normalizePayload(payload: any): BeneficiarioApiPayload {
    const normalized: any = {};

    Object.entries(payload ?? {}).forEach(([key, value]) => {
      const snakeKey = key.includes('_') ? key : key.replace(/([A-Z])/g, '_$1').toLowerCase();
      normalized[snakeKey] = value;
    });

    if (!normalized.codigo && normalized.codigo_beneficiario) {
      normalized.codigo = normalized.codigo_beneficiario;
    }
    if (!normalized.id_beneficiario && normalized.id) {
      normalized.id_beneficiario = String(normalized.id);
    }

    return normalized as BeneficiarioApiPayload;
  }

  list(params?: {
    nome?: string;
    cpf?: string;
    nis?: string;
    codigo?: string;
    data_nascimento?: string;
    status?: string;
  }): Observable<{ beneficiarios: BeneficiarioApiPayload[] }> {
    let httpParams = new HttpParams();
    if (params?.nome) httpParams = httpParams.set('nome', params.nome);
    if (params?.cpf) httpParams = httpParams.set('cpf', params.cpf);
    if (params?.nis) httpParams = httpParams.set('nis', params.nis);
    if (params?.codigo) httpParams = httpParams.set('codigo', params.codigo);
    if (params?.data_nascimento) httpParams = httpParams.set('data_nascimento', params.data_nascimento);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    return this.http
      .get<{ beneficiarios: BeneficiarioApiPayload[] } | BeneficiarioApiPayload[] | { beneficiario?: BeneficiarioApiPayload }>(
        this.baseUrl,
        { params: httpParams }
      )
      .pipe(
        map((response) => {
          const beneficiarios = (() => {
            if (Array.isArray(response)) return response;
            if ('beneficiarios' in response) return response.beneficiarios ?? [];
            if ('beneficiario' in response) return response.beneficiario ? [response.beneficiario] : [];
            return [];
          })();

          return { beneficiarios: beneficiarios.map((item) => this.normalizePayload(item)) };
        })
      );
  }

  obterProximoCodigo(): Observable<{ codigo: string }> {
    return this.http.get<{ codigo: string }>(`${this.baseUrl}/proximo-codigo`);
  }

  getById(id: string): Observable<{ beneficiario: BeneficiarioApiPayload }> {
    return this.http
      .get<{ beneficiario: BeneficiarioApiPayload }>(`${this.baseUrl}/${id}`)
      .pipe(
        map(({ beneficiario }) => ({ beneficiario: this.normalizePayload(beneficiario) })),
        catchError(this.logAndRethrow('ao buscar beneficiario'))
      );
  }

  create(payload: BeneficiarioApiPayload): Observable<{ beneficiario: BeneficiarioApiPayload }> {
    return this.http
      .post<{ beneficiario: BeneficiarioApiPayload }>(this.baseUrl, payload)
      .pipe(catchError(this.logAndRethrow('ao criar beneficiario')));
  }

  update(id: string, payload: BeneficiarioApiPayload): Observable<{ beneficiario: BeneficiarioApiPayload }> {
    return this.http
      .put<{ beneficiario: BeneficiarioApiPayload }>(`${this.baseUrl}/${id}`, payload)
      .pipe(catchError(this.logAndRethrow('ao atualizar beneficiario')));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  geocodificarEndereco(id: string, forcar = false): Observable<{ beneficiario: BeneficiarioApiPayload }> {
    const params = forcar ? new HttpParams().set('forcar', 'true') : undefined;
    return this.http.post<{ beneficiario: BeneficiarioApiPayload }>(`${this.baseUrl}/${id}/geocodificar-endereco`, {}, { params });
  }
}
