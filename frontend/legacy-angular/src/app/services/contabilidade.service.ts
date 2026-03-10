import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface ContaBancariaRequest {
  banco: string;
  agencia?: string;
  numero: string;
  tipo: string;
  projetoVinculado?: string;
  pixVinculado?: boolean;
  tipoChavePix?: string;
  chavePix?: string;
  recebimentoLocal?: boolean;
  saldo: number;
  dataAtualizacao: string;
}

export interface ContaBancariaResponse extends ContaBancariaRequest {
  id: number;
}

export interface LancamentoFinanceiroRequest {
  tipo: string;
  descricao: string;
  contraparte: string;
  vencimento: string;
  valor: number;
  situacao: string;
  compraId?: number;
}

export interface LancamentoFinanceiroResponse extends LancamentoFinanceiroRequest {
  id: number;
}

export interface ReciboPagamentoContaResponse {
  contaBancariaId?: number;
  banco?: string;
  numero?: string;
  valor?: number;
}

export interface ReciboPagamentoResponse {
  numeroRecibo?: string;
  dataPagamento?: string;
  valorTotal?: number;
  compraId?: number;
  descricao?: string;
  responsavel?: string;
  contas?: ReciboPagamentoContaResponse[];
}

export interface MovimentacaoFinanceiraRequest {
  tipo: string;
  descricao: string;
  contraparte?: string;
  categoria?: string;
  contaBancariaId?: number;
  dataMovimentacao: string;
  valor: number;
}

export interface MovimentacaoFinanceiraResponse extends MovimentacaoFinanceiraRequest {
  id: number;
  contaBancariaNumero?: string;
  contaBancariaBanco?: string;
}

export interface EmendaImpositivaRequest {
  identificacao: string;
  referenciaLegal?: string;
  dataPrevista: string;
  valorPrevisto: number;
  diasAlerta: number;
  status: string;
  observacoes?: string;
}

export interface EmendaImpositivaResponse extends EmendaImpositivaRequest {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class ContabilidadeService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/contabilidade`;

  constructor(private readonly http: HttpClient) {}

  listarContasBancarias(): Observable<ContaBancariaResponse[]> {
    return this.http.get<ContaBancariaResponse[]>(`${this.baseUrl}/contas-bancarias`);
  }

  criarContaBancaria(payload: ContaBancariaRequest): Observable<ContaBancariaResponse> {
    return this.http.post<ContaBancariaResponse>(`${this.baseUrl}/contas-bancarias`, payload);
  }

  atualizarContaBancaria(id: number, payload: ContaBancariaRequest): Observable<ContaBancariaResponse> {
    return this.http.put<ContaBancariaResponse>(`${this.baseUrl}/contas-bancarias/${id}`, payload);
  }

  removerContaBancaria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/contas-bancarias/${id}`);
  }

  listarLancamentos(): Observable<LancamentoFinanceiroResponse[]> {
    return this.http.get<LancamentoFinanceiroResponse[]>(`${this.baseUrl}/lancamentos`);
  }

  criarLancamento(payload: LancamentoFinanceiroRequest): Observable<LancamentoFinanceiroResponse> {
    return this.http.post<LancamentoFinanceiroResponse>(`${this.baseUrl}/lancamentos`, payload);
  }

  atualizarLancamento(id: number, payload: LancamentoFinanceiroRequest): Observable<LancamentoFinanceiroResponse> {
    return this.http.put<LancamentoFinanceiroResponse>(`${this.baseUrl}/lancamentos/${id}`, payload);
  }

  atualizarSituacaoLancamento(id: number, status: string): Observable<LancamentoFinanceiroResponse> {
    return this.http.patch<LancamentoFinanceiroResponse>(`${this.baseUrl}/lancamentos/${id}/status`, { status });
  }

  pagarLancamento(id: number, responsavel?: string): Observable<ReciboPagamentoResponse> {
    return this.http.post<ReciboPagamentoResponse>(`${this.baseUrl}/lancamentos/${id}/pagamento`, {
      responsavel
    });
  }

  listarMovimentacoes(): Observable<MovimentacaoFinanceiraResponse[]> {
    return this.http.get<MovimentacaoFinanceiraResponse[]>(`${this.baseUrl}/movimentacoes`);
  }

  criarMovimentacao(payload: MovimentacaoFinanceiraRequest): Observable<MovimentacaoFinanceiraResponse> {
    return this.http.post<MovimentacaoFinanceiraResponse>(`${this.baseUrl}/movimentacoes`, payload);
  }

  atualizarMovimentacao(
    id: number,
    payload: MovimentacaoFinanceiraRequest
  ): Observable<MovimentacaoFinanceiraResponse> {
    return this.http.put<MovimentacaoFinanceiraResponse>(`${this.baseUrl}/movimentacoes/${id}`, payload);
  }

  removerMovimentacao(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/movimentacoes/${id}`);
  }

  removerLancamento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/lancamentos/${id}`);
  }

  listarEmendas(): Observable<EmendaImpositivaResponse[]> {
    return this.http.get<EmendaImpositivaResponse[]>(`${this.baseUrl}/emendas`);
  }

  criarEmenda(payload: EmendaImpositivaRequest): Observable<EmendaImpositivaResponse> {
    return this.http.post<EmendaImpositivaResponse>(`${this.baseUrl}/emendas`, payload);
  }

  atualizarStatusEmenda(id: number, status: string): Observable<EmendaImpositivaResponse> {
    return this.http.patch<EmendaImpositivaResponse>(`${this.baseUrl}/emendas/${id}/status`, { status });
  }
}
