import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export type ProntuarioTipoRegistro =
  | 'atendimento'
  | 'procedimento'
  | 'evolucao'
  | 'encaminhamento'
  | 'documento'
  | 'visita_ref'
  | 'outro';

export interface BeneficiarioResumo {
  id: number;
  nomeCompleto: string;
  cpf?: string;
  nis?: string;
  dataNascimento?: string;
  nomeMae?: string;
  whatsapp?: string;
  telefone?: string;
  endereco?: string;
  status?: string;
  foto3x4?: string;
  vulnerabilidades?: string[];
  familiaReferencia?: string;
}

export interface ProntuarioIndicadoresResponse {
  totalAtendimentos: number;
  totalDoacoes: number;
  totalCestas: number;
  totalCursos: number;
  totalEncaminhamentos: number;
  taxaEncaminhamentosConcluidos: number;
  tempoMedioRetornoDias?: number | null;
  ultimoContato?: string | null;
  pendenciasAbertas: number;
  classificacaoRiscoAtual?: string | null;
  statusAcompanhamento?: string | null;
}

export interface ProntuarioResumoResponse {
  beneficiario: BeneficiarioResumo;
  contagens: Record<string, number>;
  indicadores?: ProntuarioIndicadoresResponse;
  ultimaAtualizacao?: string;
}

export interface ProntuarioRegistroRequest {
  tipo: ProntuarioTipoRegistro;
  dataRegistro: string;
  profissionalId?: number | null;
  unidadeId?: number | null;
  familiaId?: number | null;
  titulo?: string;
  descricao: string;
  dadosExtra?: Record<string, unknown>;
  status: 'aberto' | 'concluido' | 'cancelado';
  referenciaOrigemTipo?: string;
  referenciaOrigemId?: number | null;
  nivelSigilo?: string;
}

export interface ProntuarioRegistroResponse extends ProntuarioRegistroRequest {
  id: number;
  beneficiarioId: number;
  criadoEm?: string;
  criadoPor?: number;
  atualizadoEm?: string;
  atualizadoPor?: number;
}

export interface ProntuarioRegistroListaResponse {
  registros: ProntuarioRegistroResponse[];
  total: number;
  pagina: number;
  tamanhoPagina: number;
}

export interface ProntuarioFiltro {
  tipo?: string;
  de?: string;
  ate?: string;
  profissionalId?: number | null;
  unidadeId?: number | null;
  status?: string;
  texto?: string;
  page?: number;
  pageSize?: number;
}

export interface ProntuarioAnexoRequest {
  nomeArquivo: string;
  tipoMime?: string;
  urlArquivo: string;
}

export interface ProntuarioAnexoResponse extends ProntuarioAnexoRequest {
  id: number;
  registroId: number;
  criadoEm: string;
}

@Injectable({ providedIn: 'root' })
export class ProntuarioService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api`;

  constructor(private readonly http: HttpClient) {}

  obterResumo(beneficiarioId: number): Observable<ProntuarioResumoResponse> {
    return this.http.get<ProntuarioResumoResponse>(`${this.baseUrl}/beneficiarios/${beneficiarioId}/prontuario/resumo`);
  }

  listarRegistros(beneficiarioId: number, filtros: ProntuarioFiltro): Observable<ProntuarioRegistroListaResponse> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ProntuarioRegistroListaResponse>(
      `${this.baseUrl}/beneficiarios/${beneficiarioId}/prontuario/registros`,
      { params }
    );
  }

  criarRegistro(beneficiarioId: number, payload: ProntuarioRegistroRequest): Observable<ProntuarioRegistroResponse> {
    return this.http.post<ProntuarioRegistroResponse>(
      `${this.baseUrl}/beneficiarios/${beneficiarioId}/prontuario/registros`,
      payload
    );
  }

  atualizarRegistro(registroId: number, payload: ProntuarioRegistroRequest): Observable<ProntuarioRegistroResponse> {
    return this.http.put<ProntuarioRegistroResponse>(`${this.baseUrl}/prontuario/registros/${registroId}`, payload);
  }

  removerRegistro(registroId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/prontuario/registros/${registroId}`);
  }

  adicionarAnexo(registroId: number, payload: ProntuarioAnexoRequest): Observable<ProntuarioAnexoResponse> {
    return this.http.post<ProntuarioAnexoResponse>(`${this.baseUrl}/prontuario/registros/${registroId}/anexos`, payload);
  }
}
