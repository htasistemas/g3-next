import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RuntimeConfigService } from './runtime-config.service';

export interface OcorrenciaCriancaPayload {
  id?: string;
  dataPreenchimento: string;
  localViolencia?: string;
  localViolenciaOutro?: string;
  violenciaMotivadaPor?: string[];
  violenciaMotivadaOutro?: string;
  violenciaPraticadaPor?: string[];
  violenciaPraticadaOutro?: string;
  outrasViolacoes?: string[];
  vitimaNome: string;
  vitimaIdade: number | null;
  vitimaRacaCor?: string;
  vitimaIdentidadeGenero?: string;
  vitimaOrientacaoSexual?: string;
  vitimaOrientacaoOutro?: string;
  vitimaEscolaridade?: string;
  vitimaResponsavelTipo?: string;
  vitimaResponsavelNome?: string;
  vitimaTelefoneResponsavel?: string;
  vitimaEnderecoLogradouro?: string;
  vitimaEnderecoComplemento?: string;
  vitimaEnderecoBairro?: string;
  vitimaEnderecoMunicipio?: string;
  autorNome?: string;
  autorIdade?: number | null;
  autorNaoConsta?: boolean;
  autorParentesco?: string;
  autorParentescoGrau?: string;
  autorResponsavelTipo?: string;
  autorResponsavelNome?: string;
  autorResponsavelTelefone?: string;
  autorResponsavelNaoConsta?: boolean;
  autorEnderecoLogradouro?: string;
  autorEnderecoComplemento?: string;
  autorEnderecoBairro?: string;
  autorEnderecoMunicipio?: string;
  autorEnderecoNaoConsta?: boolean;
  tipificacaoViolencia?: string[];
  tipificacaoPsicologica?: string[];
  tipificacaoSexual?: string[];
  violenciaAutoprovocada?: string[];
  outroTipoViolenciaDescricao?: string;
  resumoViolencia: string;
  encaminharConselho?: boolean | null;
  encaminharMotivo?: string;
  dataEnvioConselho?: string;
  denunciaOrigem?: string[];
  denunciaOrigemOutro?: string;
}

export interface OcorrenciaCriancaAnexoPayload {
  id?: string;
  ocorrenciaId?: string;
  nomeArquivo: string;
  tipoMime: string;
  conteudoBase64: string;
  ordem: number;
  criadoEm?: string;
  atualizadoEm?: string;
}

@Injectable({ providedIn: 'root' })
export class OcorrenciaCriancaService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/ocorrencias-crianca`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<OcorrenciaCriancaPayload[]> {
    return this.http
      .get<OcorrenciaCriancaPayload[]>(this.baseUrl)
      .pipe(
        map((resposta) => (resposta ?? []).map((item) => this.normalizar(item))),
        catchError(this.logAndRethrow('ao carregar ocorrencias'))
      );
  }

  obter(id: string): Observable<OcorrenciaCriancaPayload> {
    return this.http
      .get<OcorrenciaCriancaPayload>(`${this.baseUrl}/${id}`)
      .pipe(map((item) => this.normalizar(item)))
      .pipe(catchError(this.logAndRethrow('ao carregar ocorrencia')));
  }

  criar(payload: OcorrenciaCriancaPayload): Observable<OcorrenciaCriancaPayload> {
    return this.http
      .post<OcorrenciaCriancaPayload>(this.baseUrl, payload)
      .pipe(map((item) => this.normalizar(item)))
      .pipe(catchError(this.logAndRethrow('ao criar ocorrencia')));
  }

  atualizar(id: string, payload: OcorrenciaCriancaPayload): Observable<OcorrenciaCriancaPayload> {
    return this.http
      .put<OcorrenciaCriancaPayload>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((item) => this.normalizar(item)))
      .pipe(catchError(this.logAndRethrow('ao atualizar ocorrencia')));
  }

  remover(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.logAndRethrow('ao excluir ocorrencia')));
  }

  listarAnexos(id: string): Observable<OcorrenciaCriancaAnexoPayload[]> {
    return this.http
      .get<OcorrenciaCriancaAnexoPayload[]>(`${this.baseUrl}/${id}/anexos`)
      .pipe(
        map((anexos) => (anexos ?? []).map((item) => this.normalizarAnexo(item))),
        catchError(this.logAndRethrow('ao carregar anexos'))
      );
  }

  adicionarAnexo(
    id: string,
    payload: OcorrenciaCriancaAnexoPayload
  ): Observable<OcorrenciaCriancaAnexoPayload> {
    return this.http
      .post<OcorrenciaCriancaAnexoPayload>(`${this.baseUrl}/${id}/anexos`, payload)
      .pipe(map((item) => this.normalizarAnexo(item)))
      .pipe(catchError(this.logAndRethrow('ao anexar arquivo')));
  }

  removerAnexo(id: string, anexoId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}/anexos/${anexoId}`)
      .pipe(catchError(this.logAndRethrow('ao remover anexo')));
  }

  obterPdfDenunciaUrl(id: string): string {
    return `${this.baseUrl}/${id}/pdf/denuncia`;
  }

  obterPdfConselhoTutelarUrl(id: string): string {
    return `${this.baseUrl}/${id}/pdf/conselho-tutelar`;
  }

  private normalizar(ocorrencia: OcorrenciaCriancaPayload): OcorrenciaCriancaPayload {
    return {
      ...ocorrencia,
      id: ocorrencia.id ? String(ocorrencia.id) : undefined,
      violenciaMotivadaPor: ocorrencia.violenciaMotivadaPor ?? [],
      violenciaPraticadaPor: ocorrencia.violenciaPraticadaPor ?? [],
      outrasViolacoes: ocorrencia.outrasViolacoes ?? [],
      tipificacaoViolencia: ocorrencia.tipificacaoViolencia ?? [],
      tipificacaoPsicologica: ocorrencia.tipificacaoPsicologica ?? [],
      tipificacaoSexual: ocorrencia.tipificacaoSexual ?? [],
      violenciaAutoprovocada: ocorrencia.violenciaAutoprovocada ?? [],
      denunciaOrigem: ocorrencia.denunciaOrigem ?? []
    };
  }

  private normalizarAnexo(anexo: OcorrenciaCriancaAnexoPayload): OcorrenciaCriancaAnexoPayload {
    return {
      ...anexo,
      id: anexo.id ? String(anexo.id) : undefined,
      ocorrenciaId: anexo.ocorrenciaId ? String(anexo.ocorrenciaId) : undefined,
      ordem: Number(anexo.ordem ?? 0)
    };
  }

  private logAndRethrow(operacao: string) {
    return (error: unknown) => {
      console.error(`Erro ${operacao}`, error);
      return throwError(() => error);
    };
  }
}
