import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RhConfiguracaoPontoRequest {
  cargaSemanalMinutos?: number;
  cargaSegQuiMinutos?: number;
  cargaSextaMinutos?: number;
  cargaSabadoMinutos?: number;
  cargaDomingoMinutos?: number;
  toleranciaMinutos?: number;
  ignorarValidacaoRede?: boolean;
}

export interface RhConfiguracaoPontoResponse extends RhConfiguracaoPontoRequest {
  id: number;
  atualizadoEm?: string;
}

export interface RhPontoBaterRequest {
  funcionarioId?: number;
  tipo: string;
  senha: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
}

export interface RhPontoMarcacaoResponse {
  id: number;
  tipo: string;
  dataHoraServidor: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  distanciaMetros: number;
  dentroPerimetro: boolean | null;
}

export interface RhPontoDiaResponse {
  id: number;
  funcionarioId: number;
  data: string;
  ocorrencia: string;
  observacoes?: string;
  cargaPrevistaMinutos: number;
  toleranciaMinutos: number;
  totalTrabalhadoMinutos: number;
  extrasMinutos: number;
  faltasAtrasosMinutos: number;
  marcacoes: RhPontoMarcacaoResponse[];
}

export interface RhPontoDiaResumoResponse {
  data: string;
  ocorrencia: string;
  entradaManha: string;
  saidaManha: string;
  entradaTarde: string;
  saidaTarde: string;
  totalTrabalhadoMinutos: number;
  extrasMinutos: number;
  faltasAtrasosMinutos: number;
  bancoHorasMinutos?: number;
  cargaPrevistaMinutos?: number;
  observacoes?: string;
  pontoDiaId?: number;
}

export interface RhPontoEspelhoResponse {
  funcionarioId: number;
  mes: number;
  ano: number;
  totalTrabalhadoMinutos: number;
  totalDevidoMinutos: number;
  totalExtrasMinutos: number;
  totalFaltasAtrasosMinutos: number;
  totalBancoHorasMinutos?: number;
  diasTrabalhados: number;
  dias: RhPontoDiaResumoResponse[];
}

export interface RhPontoAuditoriaResponse {
  id: number;
  funcionarioId?: number | null;
  unidadeId?: number | null;
  tipoMarcacao?: string | null;
  ipDetectado?: string | null;
  userAgent?: string | null;
  dataHoraServidor?: string;
  resultado?: string | null;
  motivo?: string | null;
  acao?: string | null;
  detalhes?: string | null;
  pontoMarcacaoId?: number | null;
}

export interface UnidadeAssistencialResponse {
  id: number;
  nomeFantasia: string;
  razaoSocial?: string;
  cnpj?: string;
  email?: string;
  site?: string;
  telefone?: string;
  unidadePrincipal?: boolean;
  endereco?: string;
  numeroEndereco?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  latitude?: string;
  longitude?: string;
  raioPontoMetros?: number;
  accuracyMaxPontoMetros?: number;
  ipValidacaoPonto?: string;
  ipsPublicosPonto?: string;
  redesLocaisPonto?: string;
  modoValidacaoPonto?: string;
  pingTimeoutMs?: number;
}

export interface UnidadeAssistencialConsultaResponse {
  unidade: UnidadeAssistencialResponse;
}

@Injectable({ providedIn: 'root' })
export class FolhaPontoService {
  private readonly baseUrl = `${environment.apiUrl}/api/rh/ponto`;
  private readonly unidadesUrl = `${environment.apiUrl}/api/unidades-assistenciais`;

  constructor(private readonly http: HttpClient) {}

  buscarConfiguracao(): Observable<RhConfiguracaoPontoResponse> {
    return this.http.get<RhConfiguracaoPontoResponse>(`${this.baseUrl}/configuracao`);
  }

  atualizarConfiguracao(usuarioId: number, payload: RhConfiguracaoPontoRequest): Observable<RhConfiguracaoPontoResponse> {
    return this.http.put<RhConfiguracaoPontoResponse>(`${this.baseUrl}/configuracao`, payload, {
      params: { usuarioId }
    });
  }

  baterPonto(usuarioId: number, payload: RhPontoBaterRequest): Observable<RhPontoDiaResponse> {
    return this.http.post<RhPontoDiaResponse>(`${this.baseUrl}/bater`, payload, {
      params: { usuarioId }
    });
  }

  consultarEspelho(mes: number, ano: number, funcionarioId: number): Observable<RhPontoEspelhoResponse> {
    return this.http.get<RhPontoEspelhoResponse>(`${this.baseUrl}/espelho`, {
      params: { mes, ano, funcionarioId }
    });
  }

  atualizarDia(
    id: number,
    usuarioId: number,
    payload: {
      ocorrencia?: string;
      justificativa?: string;
      senhaAdmin?: string;
      entrada1?: string;
      saida1?: string;
      entrada2?: string;
      saida2?: string;
    }
  ): Observable<RhPontoDiaResponse> {
    return this.http.put<RhPontoDiaResponse>(`${this.baseUrl}/dia/${id}`, payload, {
      params: { usuarioId }
    });
  }

  exportarExcel(mes: number, ano: number, funcionarioId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/relatorio/excel`, {
      params: { mes, ano, funcionarioId },
      responseType: 'blob'
    });
  }

  imprimirEspelhoPdf(
    mes: number,
    ano: number,
    funcionarioId: number,
    usuarioId: number
  ): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/relatorio/espelho-pdf`, {
      params: { mes, ano, funcionarioId, usuarioId },
      responseType: 'blob'
    });
  }

  imprimirRelacaoColaboradores(usuarioId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/relatorio/colaboradores-pdf`, {
      params: { usuarioId },
      responseType: 'blob'
    });
  }

  imprimirConfiguracaoPonto(usuarioId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/relatorio/configuracao-pdf`, {
      params: { usuarioId },
      responseType: 'blob'
    });
  }

  listarAuditoria(
    usuarioId: number,
    filtros: {
      funcionarioId?: number | null;
      unidadeId?: number | null;
      resultado?: string | null;
      inicio?: string | null;
      fim?: string | null;
      limite?: number | null;
    }
  ): Observable<RhPontoAuditoriaResponse[]> {
    let params = new HttpParams().set('usuarioId', usuarioId);
    if (filtros.funcionarioId) {
      params = params.set('funcionarioId', filtros.funcionarioId);
    }
    if (filtros.unidadeId) {
      params = params.set('unidadeId', filtros.unidadeId);
    }
    if (filtros.resultado) {
      params = params.set('resultado', filtros.resultado);
    }
    if (filtros.inicio) {
      params = params.set('inicio', filtros.inicio);
    }
    if (filtros.fim) {
      params = params.set('fim', filtros.fim);
    }
    if (filtros.limite) {
      params = params.set('limite', filtros.limite);
    }
    return this.http.get<RhPontoAuditoriaResponse[]>(`${this.baseUrl}/auditoria`, { params });
  }

  buscarUnidadeAtual(): Observable<UnidadeAssistencialConsultaResponse> {
    return this.http.get<UnidadeAssistencialConsultaResponse>(`${this.unidadesUrl}/atual`);
  }

  geocodificarEnderecoUnidade(
    id: number,
    forcar = false
  ): Observable<UnidadeAssistencialResponse> {
    const opcoes: { params?: HttpParams } = {};
    if (forcar) {
      opcoes.params = new HttpParams().set('forcar', 'true');
    }
    return this.http.post<UnidadeAssistencialResponse>(
      `${this.unidadesUrl}/${id}/geocodificar-endereco`,
      {},
      opcoes
    );
  }
}
