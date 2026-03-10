import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export type ChamadoTipo = 'ERRO' | 'MELHORIA' | 'NOVA_IMPLEMENTACAO' | 'CORRECAO';
export type ChamadoStatus =
  | 'ABERTO'
  | 'EM_ANALISE'
  | 'EM_DESENVOLVIMENTO'
  | 'EM_TESTE'
  | 'AGUARDANDO_CLIENTE'
  | 'RESOLVIDO'
  | 'FECHADO'
  | 'REABERTO'
  | 'CANCELADO';
export type ChamadoPrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type ChamadoImpacto = 'BAIXO' | 'MEDIO' | 'ALTO';

export interface ChamadoTecnicoPayload {
  id?: string;
  codigo?: string;
  titulo: string;
  descricao: string;
  tipo: ChamadoTipo;
  status?: ChamadoStatus;
  prioridade: ChamadoPrioridade;
  impacto: ChamadoImpacto;
  modulo: string;
  menu: string;
  cliente: string;
  ambiente?: string;
  versao_sistema?: string;
  passos_reproducao?: string;
  resultado_atual?: string;
  resultado_esperado?: string;
  usuarios_teste?: string;
  prazo_sla_em_horas?: number;
  data_limite_sla?: string;
  responsavel_usuario_id?: number | null;
  criado_por_usuario_id?: number | null;
  resposta_desenvolvedor?: string;
  respondido_em?: string;
  respondido_por_usuario_id?: number | null;
  tags?: string;
  criado_em?: string;
  atualizado_em?: string;
  sla_atrasado?: boolean;
}

export interface ChamadoTecnicoListaResponse {
  chamados: ChamadoTecnicoPayload[];
  pagina: number;
  tamanho_pagina: number;
  total: number;
}

export interface ChamadoTecnicoAcao {
  id: string;
  tipo: string;
  descricao: string;
  de_status?: ChamadoStatus | null;
  para_status?: ChamadoStatus | null;
  de_responsavel_id?: number | null;
  para_responsavel_id?: number | null;
  criado_por_usuario_id?: number | null;
  criado_em: string;
}

export interface ChamadoTecnicoComentario {
  id: string;
  comentario: string;
  criado_por_usuario_id?: number | null;
  criado_em: string;
}

export interface ChamadoTecnicoAnexo {
  id: string;
  nome_arquivo: string;
  mime_type: string;
  tamanho_bytes?: number | null;
  storage_path?: string | null;
  arquivo_url?: string | null;
  criado_por_usuario_id?: number | null;
  criado_em: string;
}

export interface AuditoriaEvento {
  id: string;
  usuario_id?: number | null;
  acao: string;
  entidade: string;
  entidade_id?: string | null;
  dados_json?: string | null;
  criado_em: string;
}

export interface ChamadoTecnicoAuditoriaVinculo {
  id: string;
  auditoria_evento: AuditoriaEvento;
  criado_em: string;
}

@Injectable({ providedIn: 'root' })
export class ChamadoTecnicoService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/chamados`;

  constructor(private readonly http: HttpClient) {}

  criar(payload: ChamadoTecnicoPayload): Observable<ChamadoTecnicoPayload> {
    return this.http.post<ChamadoTecnicoPayload>(this.baseUrl, payload);
  }

  listar(params: {
    status?: string;
    tipo?: string;
    prioridade?: string;
    responsavel?: string;
    modulo?: string;
    cliente?: string;
    data_inicio?: string;
    data_fim?: string;
    texto?: string;
    pagina?: number;
    tamanho_pagina?: number;
  }): Observable<ChamadoTecnicoListaResponse> {
    let httpParams = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<ChamadoTecnicoListaResponse>(this.baseUrl, { params: httpParams });
  }

  detalhar(id: string): Observable<ChamadoTecnicoPayload> {
    return this.http.get<ChamadoTecnicoPayload>(`${this.baseUrl}/${id}`);
  }

  atualizar(id: string, payload: ChamadoTecnicoPayload): Observable<ChamadoTecnicoPayload> {
    return this.http.put<ChamadoTecnicoPayload>(`${this.baseUrl}/${id}`, payload);
  }

  remover(id: string, usuarioId?: number | null): Observable<void> {
    const params = usuarioId ? new HttpParams().set('usuarioId', usuarioId) : undefined;
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { params });
  }

  alterarStatus(id: string, status: ChamadoStatus, usuarioId?: number | null): Observable<ChamadoTecnicoPayload> {
    return this.http.post<ChamadoTecnicoPayload>(`${this.baseUrl}/${id}/status`, {
      status,
      usuario_id: usuarioId ?? null,
    });
  }

  atribuirResponsavel(
    id: string,
    responsavelUsuarioId: number | null,
    usuarioId?: number | null
  ): Observable<ChamadoTecnicoPayload> {
    return this.http.post<ChamadoTecnicoPayload>(`${this.baseUrl}/${id}/atribuir`, {
      responsavel_usuario_id: responsavelUsuarioId,
      usuario_id: usuarioId ?? null,
    });
  }

  listarAcoes(id: string): Observable<ChamadoTecnicoAcao[]> {
    return this.http.get<ChamadoTecnicoAcao[]>(`${this.baseUrl}/${id}/acoes`);
  }

  adicionarComentario(
    id: string,
    comentario: string,
    usuarioId?: number | null
  ): Observable<ChamadoTecnicoComentario> {
    return this.http.post<ChamadoTecnicoComentario>(`${this.baseUrl}/${id}/comentarios`, {
      comentario,
      usuario_id: usuarioId ?? null,
    });
  }

  listarComentarios(id: string): Observable<ChamadoTecnicoComentario[]> {
    return this.http.get<ChamadoTecnicoComentario[]>(`${this.baseUrl}/${id}/comentarios`);
  }

  adicionarAnexo(
    id: string,
    anexo: { nome_arquivo: string; mime_type: string; tamanho_bytes?: number; conteudo_base64: string },
    usuarioId?: number | null
  ): Observable<ChamadoTecnicoAnexo> {
    return this.http.post<ChamadoTecnicoAnexo>(`${this.baseUrl}/${id}/anexos`, {
      ...anexo,
      usuario_id: usuarioId ?? null,
    });
  }

  listarAnexos(id: string): Observable<ChamadoTecnicoAnexo[]> {
    return this.http.get<ChamadoTecnicoAnexo[]>(`${this.baseUrl}/${id}/anexos`);
  }

  vincularAuditoria(
    id: string,
    auditoriaEventoId: string,
    usuarioId?: number | null
  ): Observable<ChamadoTecnicoAuditoriaVinculo> {
    return this.http.post<ChamadoTecnicoAuditoriaVinculo>(`${this.baseUrl}/${id}/vincular-auditoria`, {
      auditoria_evento_id: auditoriaEventoId,
      usuario_id: usuarioId ?? null,
    });
  }

  listarAuditoriaVinculada(id: string): Observable<ChamadoTecnicoAuditoriaVinculo[]> {
    return this.http.get<ChamadoTecnicoAuditoriaVinculo[]>(`${this.baseUrl}/${id}/auditoria-vinculada`);
  }

  listarAuditoria(params: {
    data_inicio?: string;
    data_fim?: string;
    usuario_id?: string;
    entidade?: string;
    texto?: string;
  }): Observable<AuditoriaEvento[]> {
    let httpParams = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<AuditoriaEvento[]>(`${this.runtimeConfig.apiUrl}/api/auditoria-eventos`, {
      params: httpParams,
    });
  }
}
