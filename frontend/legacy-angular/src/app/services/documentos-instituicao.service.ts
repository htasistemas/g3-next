import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RuntimeConfigService } from './runtime-config.service';

export interface DocumentoInstituicaoRequestPayload {
  tipoDocumento: string;
  orgaoEmissor: string;
  descricao?: string;
  categoria?: string;
  emissao: string;
  validade?: string | null;
  responsavelInterno?: string;
  modoRenovacao?: string;
  observacaoRenovacao?: string;
  gerarAlerta?: boolean;
  diasAntecedencia?: number[];
  formaAlerta?: string;
  emRenovacao?: boolean;
  semVencimento?: boolean;
  vencimentoIndeterminado?: boolean;
}

export type DocumentoSituacao = 'valido' | 'vence_em_breve' | 'vencido' | 'em_renovacao' | 'sem_vencimento';

export interface DocumentoInstituicaoResponsePayload extends DocumentoInstituicaoRequestPayload {
  id: string;
  situacao?: DocumentoSituacao;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface DocumentoInstituicaoAnexoRequestPayload {
  nomeArquivo: string;
  tipo: string;
  tipoMime: string;
  conteudoBase64: string;
  tamanho?: string;
  dataUpload?: string;
  usuario: string;
}

export interface DocumentoInstituicaoAnexoResponsePayload {
  id: string;
  documentoId: string;
  nomeArquivo: string;
  tipo: string;
  tipoMime?: string;
  tamanho?: string;
  dataUpload?: string;
  usuario: string;
  arquivoUrl?: string;
  criadoEm?: string;
}

export interface DocumentoInstituicaoHistoricoRequestPayload {
  dataHora?: string;
  usuario: string;
  tipoAlteracao: string;
  observacao?: string;
}

export interface DocumentoInstituicaoHistoricoResponsePayload
  extends DocumentoInstituicaoHistoricoRequestPayload {
  id: string;
  documentoId: string;
  criadoEm?: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentosInstituicaoService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/documentos-instituicao`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<DocumentoInstituicaoResponsePayload[]> {
    return this.http
      .get<DocumentoInstituicaoResponsePayload[]>(this.baseUrl)
      .pipe(
        map((documentos) => (documentos ?? []).map((item) => this.normalizarDocumento(item))),
        catchError(this.logAndRethrow('ao carregar documentos institucionais'))
      );
  }

  criar(payload: DocumentoInstituicaoRequestPayload): Observable<DocumentoInstituicaoResponsePayload> {
    return this.http
      .post<DocumentoInstituicaoResponsePayload>(this.baseUrl, payload)
      .pipe(
        map((item) => this.normalizarDocumento(item)),
        catchError(this.logAndRethrow('ao criar documento institucional'))
      );
  }

  atualizar(id: string, payload: DocumentoInstituicaoRequestPayload): Observable<DocumentoInstituicaoResponsePayload> {
    return this.http
      .put<DocumentoInstituicaoResponsePayload>(`${this.baseUrl}/${id}`, payload)
      .pipe(
        map((item) => this.normalizarDocumento(item)),
        catchError(this.logAndRethrow('ao atualizar documento institucional'))
      );
  }

  excluir(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.logAndRethrow('ao excluir documento institucional')));
  }

  listarAnexos(documentoId: string): Observable<DocumentoInstituicaoAnexoResponsePayload[]> {
    return this.http
      .get<DocumentoInstituicaoAnexoResponsePayload[]>(`${this.baseUrl}/${documentoId}/anexos`)
      .pipe(
        map((anexos) => (anexos ?? []).map((item) => this.normalizarAnexo(item))),
        catchError(this.logAndRethrow('ao carregar anexos'))
      );
  }

  adicionarAnexo(
    documentoId: string,
    payload: DocumentoInstituicaoAnexoRequestPayload
  ): Observable<DocumentoInstituicaoAnexoResponsePayload> {
    return this.http
      .post<DocumentoInstituicaoAnexoResponsePayload>(`${this.baseUrl}/${documentoId}/anexos`, payload)
      .pipe(
        map((item) => this.normalizarAnexo(item)),
        catchError(this.logAndRethrow('ao adicionar anexo'))
      );
  }

  listarHistorico(documentoId: string): Observable<DocumentoInstituicaoHistoricoResponsePayload[]> {
    return this.http
      .get<DocumentoInstituicaoHistoricoResponsePayload[]>(`${this.baseUrl}/${documentoId}/historico`)
      .pipe(
        map((registros) => (registros ?? []).map((item) => this.normalizarHistorico(item))),
        catchError(this.logAndRethrow('ao carregar historico'))
      );
  }

  adicionarHistorico(
    documentoId: string,
    payload: DocumentoInstituicaoHistoricoRequestPayload
  ): Observable<DocumentoInstituicaoHistoricoResponsePayload> {
    return this.http
      .post<DocumentoInstituicaoHistoricoResponsePayload>(`${this.baseUrl}/${documentoId}/historico`, payload)
      .pipe(
        map((item) => this.normalizarHistorico(item)),
        catchError(this.logAndRethrow('ao registrar historico'))
      );
  }

  private normalizarDocumento(
    documento: DocumentoInstituicaoResponsePayload
  ): DocumentoInstituicaoResponsePayload {
    return {
      ...documento,
      id: String(documento.id ?? ''),
    };
  }

  private normalizarAnexo(
    anexo: DocumentoInstituicaoAnexoResponsePayload
  ): DocumentoInstituicaoAnexoResponsePayload {
    return {
      ...anexo,
      id: String(anexo.id ?? ''),
      documentoId: String(anexo.documentoId ?? ''),
      arquivoUrl: this.normalizarUrl(anexo.arquivoUrl),
    };
  }

  private normalizarHistorico(
    historico: DocumentoInstituicaoHistoricoResponsePayload
  ): DocumentoInstituicaoHistoricoResponsePayload {
    return {
      ...historico,
      id: String(historico.id ?? ''),
      documentoId: String(historico.documentoId ?? ''),
    };
  }

  private logAndRethrow(operacao: string) {
    return (error: unknown) => {
      console.error(`Erro ${operacao}`, error);
      return throwError(() => error);
    };
  }

  private normalizarUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${this.runtimeConfig.apiUrl}${url}`;
  }
}
