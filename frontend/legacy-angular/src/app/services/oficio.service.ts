import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RuntimeConfigService } from './runtime-config.service';

export interface TramiteRegistro {
  data?: string;
  origem?: string;
  destino?: string;
  responsavel?: string;
  acao: string;
  observacoes?: string;
}

export interface OficioPayload {
  id?: string;
  pdfAssinadoNome?: string;
  pdfAssinadoUrl?: string;
  identificacao: {
    tipo: 'emissao' | 'recebimento';
    numero: string;
    data: string;
    setorOrigem: string;
    responsavel: string;
    destinatario?: string;
    meioEnvio: string;
    prazoResposta?: string;
    classificacao?: string;
  };
  conteudo: {
    razaoSocial: string;
    logoUrl?: string;
    titulo?: string;
    saudacao?: string;
    para?: string;
    cargoPara?: string;
    assunto: string;
    corpo: string;
    finalizacao?: string;
    assinaturaNome?: string;
    assinaturaCargo?: string;
    rodape?: string;
  };
  protocolo: {
    status: string;
    protocoloEnvio?: string;
    dataEnvio?: string;
    protocoloRecebimento?: string;
    dataRecebimento?: string;
    proximoDestino?: string;
    observacoes?: string;
  };
  tramites: TramiteRegistro[];
}

export interface OficioPdfAssinadoPayload {
  nomeArquivo: string;
  tipoMime: string;
  conteudoBase64: string;
}

export interface OficioImagemPayload {
  id?: string;
  oficioId?: string;
  nomeArquivo: string;
  tipoMime: string;
  conteudoBase64: string;
  ordem: number;
}

interface OficioListaResponse {
  oficios: OficioPayload[];
}

@Injectable({ providedIn: 'root' })
export class OficioService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/oficios`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<OficioPayload[]> {
    return this.http
      .get<OficioListaResponse>(this.baseUrl)
      .pipe(map((response) => (response?.oficios ?? []).map((item) => this.normalizar(item))))
      .pipe(catchError(this.logAndRethrow('ao carregar oficios')));
  }

  create(payload: OficioPayload): Observable<OficioPayload> {
    return this.http
      .post<OficioPayload>(this.baseUrl, payload)
      .pipe(map((item) => this.normalizar(item)))
      .pipe(catchError(this.logAndRethrow('ao criar oficio')));
  }

  update(id: string, payload: OficioPayload): Observable<OficioPayload> {
    return this.http
      .put<OficioPayload>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((item) => this.normalizar(item)))
      .pipe(catchError(this.logAndRethrow('ao atualizar oficio')));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.logAndRethrow('ao excluir oficio')));
  }

  salvarPdfAssinado(id: string, payload: OficioPdfAssinadoPayload): Observable<OficioPayload> {
    return this.http
      .post<OficioPayload>(`${this.baseUrl}/${id}/pdf-assinado`, payload)
      .pipe(map((item) => this.normalizar(item)))
      .pipe(catchError(this.logAndRethrow('ao anexar PDF assinado')));
  }

  removerPdfAssinado(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}/pdf-assinado`)
      .pipe(catchError(this.logAndRethrow('ao excluir PDF assinado')));
  }

  listarImagens(id: string): Observable<OficioImagemPayload[]> {
    return this.http
      .get<OficioImagemPayload[]>(`${this.baseUrl}/${id}/imagens`)
      .pipe(
        map((imagens) => (imagens ?? []).map((imagem) => this.normalizarImagem(imagem))),
        catchError(this.logAndRethrow('ao carregar imagens do oficio'))
      );
  }

  adicionarImagem(id: string, payload: OficioImagemPayload): Observable<OficioImagemPayload> {
    return this.http
      .post<OficioImagemPayload>(`${this.baseUrl}/${id}/imagens`, payload)
      .pipe(
        map((imagem) => this.normalizarImagem(imagem)),
        catchError(this.logAndRethrow('ao anexar imagem no oficio'))
      );
  }

  removerImagem(id: string, imagemId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}/imagens/${imagemId}`)
      .pipe(catchError(this.logAndRethrow('ao excluir imagem do oficio')));
  }

  obterPdfAssinadoUrl(id: string): string {
    return `${this.baseUrl}/${id}/pdf-assinado`;
  }

  private normalizar(oficio: OficioPayload): OficioPayload {
    return {
      ...oficio,
      id: oficio.id ? String(oficio.id) : undefined,
      tramites: oficio.tramites ?? []
    };
  }

  private normalizarImagem(imagem: OficioImagemPayload): OficioImagemPayload {
    return {
      ...imagem,
      id: imagem.id ? String(imagem.id) : undefined,
      oficioId: imagem.oficioId ? String(imagem.oficioId) : undefined,
      ordem: Number(imagem.ordem ?? 0)
    };
  }

  private logAndRethrow(operacao: string) {
    return (error: unknown) => {
      console.error(`Erro ${operacao}`, error);
      return throwError(() => error);
    };
  }
}


