import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface AutorizacaoCompraRequest {
  titulo: string;
  tipo: string;
  area?: string;
  responsavel: string;
  dataPrevista?: string;
  valor: number;
  justificativa?: string;
  centroCusto?: string;
  status: string;
  aprovador?: string;
  decisao?: string;
  observacoesAprovacao?: string;
  dataAprovacao?: string;
  dispensarCotacao?: boolean;
  motivoDispensa?: string;
  vencedor?: string;
  registroPatrimonio?: boolean;
  registroAlmoxarifado?: boolean;
  numeroReserva?: string;
  numeroTermo?: string;
  autorizacaoPagamentoNumero?: string;
  autorizacaoPagamentoAutor?: string;
  autorizacaoPagamentoData?: string;
  autorizacaoPagamentoObservacoes?: string;
  prioridade?: 'urgente' | 'normal' | 'baixa';
  quantidadeItens?: number;
}

export interface AutorizacaoCompraResponse extends AutorizacaoCompraRequest {   
  id: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AutorizacaoCompraCotacaoRequest {
  fornecedor: string;
  razaoSocial?: string;
  cnpj?: string;
  cartaoCnpjUrl?: string;
  valor: number;
  prazoEntrega?: string;
  validade?: string;
  conformidade?: string;
  observacoes?: string;
  orcamentoFisicoNome?: string;
  orcamentoFisicoTipo?: string;
  orcamentoFisicoConteudo?: string;
}

export interface AutorizacaoCompraCotacaoResponse extends AutorizacaoCompraCotacaoRequest {
  id: number;
  autorizacaoCompraId: number;
  criadoEm: string;
  cartaoCnpjNome?: string;
  cartaoCnpjTipo?: string;
  cartaoCnpjConteudo?: string;
}

export interface FornecedorCnpjResponse {
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
}

export interface AutorizacaoCompraReservaBancariaRequest {
  contaBancariaId: number;
  valor: number;
}

export interface AutorizacaoCompraReservaBancariaResponse {
  id: number;
  autorizacaoCompraId: number;
  contaBancariaId: number;
  valor: number;
}

export interface AutorizacaoPagamentoRequest {
  autor?: string;
  data?: string;
  observacoes?: string;
}


@Injectable({ providedIn: 'root' })
export class AutorizacaoComprasService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/financeiro/autorizacao-compras`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<AutorizacaoCompraResponse[]> {
    return this.http.get<AutorizacaoCompraResponse[]>(this.baseUrl);
  }

  create(payload: AutorizacaoCompraRequest): Observable<AutorizacaoCompraResponse> {
    return this.http.post<AutorizacaoCompraResponse>(this.baseUrl, payload);
  }

  update(id: string, payload: AutorizacaoCompraRequest): Observable<AutorizacaoCompraResponse> {
    return this.http.put<AutorizacaoCompraResponse>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listQuotes(id: string): Observable<AutorizacaoCompraCotacaoResponse[]> {
    return this.http.get<AutorizacaoCompraCotacaoResponse[]>(`${this.baseUrl}/${id}/cotacoes`);
  }

  createQuote(
    id: string,
    payload: AutorizacaoCompraCotacaoRequest
  ): Observable<AutorizacaoCompraCotacaoResponse> {
    return this.http.post<AutorizacaoCompraCotacaoResponse>(`${this.baseUrl}/${id}/cotacoes`, payload);
  }

  deleteQuote(id: string, quoteId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/cotacoes/${quoteId}`);
  }

  buscarFornecedorPorCnpj(cnpj: string): Observable<FornecedorCnpjResponse> {   
    return this.http.get<FornecedorCnpjResponse>(
      `${this.runtimeConfig.apiUrl}/api/financeiro/fornecedores/cnpj/${cnpj}`
    );
  }

  registrarReservaBancaria(
    id: string,
    payload: AutorizacaoCompraReservaBancariaRequest
  ): Observable<AutorizacaoCompraReservaBancariaResponse> {
    return this.http.post<AutorizacaoCompraReservaBancariaResponse>(
      `${this.baseUrl}/${id}/reservas-bancarias`,
      payload
    );
  }

  removerReservaBancaria(id: string, contaId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/reservas-bancarias/${contaId}`);
  }

  gerarAutorizacaoPagamento(
    id: string,
    payload: AutorizacaoPagamentoRequest
  ): Observable<AutorizacaoCompraResponse> {
    return this.http.post<AutorizacaoCompraResponse>(
      `${this.baseUrl}/${id}/autorizacao-pagamento`,
      payload
    );
  }

}
