import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RuntimeConfigService } from './runtime-config.service';

export interface DoadorRequest {
  nome: string;
  tipoPessoa?: string;
  documento?: string;
  responsavelEmpresa?: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  observacoes?: string;
}

export interface DoadorResponse extends DoadorRequest {
  id: number;
}

export interface RecebimentoDoacaoRequest {
  doadorId?: number;
  contaRecebimentoId?: number | null;
  tipoDoacao: string;
  descricao?: string;
  quantidadeItens?: number;
  valorMedio?: number;
  valorTotal?: number;
  valor?: number;
  dataRecebimento: string;
  formaRecebimento?: string;
  recorrente: boolean;
  periodicidade?: string;
  proximaCobranca?: string;
  status: string;
  observacoes?: string;
}

export interface RecebimentoDoacaoResponse extends RecebimentoDoacaoRequest {
  id: number;
  doadorNome?: string;
  contabilidadePendente: boolean;
}

@Injectable({ providedIn: 'root' })
export class RecebimentoDoacaoService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/recebimentos-doacao`;

  constructor(private readonly http: HttpClient) {}

  listarDoadores(): Observable<DoadorResponse[]> {
    return this.http.get<DoadorResponse[]>(`${this.baseUrl}/doadores`);
  }

  criarDoador(payload: DoadorRequest): Observable<DoadorResponse> {
    return this.http.post<DoadorResponse>(`${this.baseUrl}/doadores`, payload); 
  }

  excluirDoador(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/doadores/${id}`);
  }

  listarRecebimentos(): Observable<RecebimentoDoacaoResponse[]> {
    return this.http
      .get<{ recebimentos: RecebimentoDoacaoResponse[] }>(this.baseUrl)
      .pipe(map((response) => response.recebimentos || []));
  }

  criarRecebimento(payload: RecebimentoDoacaoRequest): Observable<RecebimentoDoacaoResponse> {
    return this.http.post<RecebimentoDoacaoResponse>(this.baseUrl, payload);
  }

  atualizarRecebimento(
    id: number,
    payload: RecebimentoDoacaoRequest
  ): Observable<RecebimentoDoacaoResponse> {
    return this.http.put<RecebimentoDoacaoResponse>(`${this.baseUrl}/${id}`, payload);
  }

  excluirRecebimento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
