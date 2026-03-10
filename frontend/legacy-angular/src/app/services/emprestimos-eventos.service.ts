import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export type StatusEmprestimoEvento =
  | 'RASCUNHO'
  | 'AGENDADO'
  | 'RETIRADO'
  | 'DEVOLVIDO'
  | 'CANCELADO';

export type TipoItemEmprestimo = 'PATRIMONIO' | 'ALMOXARIFADO';

export interface EventoEmprestimoResponse {
  id: number;
  titulo: string;
  descricao?: string | null;
  local?: string | null;
  dataInicio: string;
  dataFim: string;
  status: string;
}

export interface ResponsavelResumoResponse {
  id: number;
  nome: string;
}

export interface EmprestimoEventoItemResponse {
  id?: number;
  itemId: number;
  tipoItem: TipoItemEmprestimo;
  quantidade: number;
  statusItem: string;
  observacaoItem?: string | null;
  nomeItem?: string | null;
  numeroPatrimonio?: string | null;
}

export interface EmprestimoEventoResponse {
  id: number;
  evento: EventoEmprestimoResponse;
  unidadeId?: number | null;
  responsavel?: ResponsavelResumoResponse | null;
  dataRetiradaPrevista: string;
  dataDevolucaoPrevista: string;
  dataRetiradaReal?: string | null;
  dataDevolucaoReal?: string | null;
  status: StatusEmprestimoEvento;
  observacoes?: string | null;
  itens?: EmprestimoEventoItemResponse[];
}

export interface EmprestimoEventoRequest {
  eventoId: number;
  unidadeId?: number | null;
  responsavelId?: number | null;
  dataRetiradaPrevista: string;
  dataDevolucaoPrevista: string;
  dataRetiradaReal?: string | null;
  dataDevolucaoReal?: string | null;
  status: StatusEmprestimoEvento;
  observacoes?: string | null;
  itens?: EmprestimoEventoItemResponse[];
}

export interface AgendaResumoDiaResponse {
  data: string;
  temBloqueio: boolean;
  qtdEmprestimos: number;
  emprestimoIds?: number[];
}

export interface AgendaDiaDetalheResponse {
  emprestimoId: number;
  status: StatusEmprestimoEvento;
  periodo: {
    retiradaPrevista: string;
    devolucaoPrevista: string;
    retiradaReal?: string | null;
    devolucaoReal?: string | null;
  };
  responsavel?: ResponsavelResumoResponse | null;
  evento: EventoEmprestimoResponse;
  itens: EmprestimoEventoItemResponse[];
}

export interface DisponibilidadeItemResponse {
  disponivel: boolean;
  quantidadeDisponivel?: number | null;
  conflitos?: {
    emprestimoId: number;
    eventoTitulo: string;
    inicio: string;
    fim: string;
    status: string;
    quantidadeReservada?: number | null;
  }[];
}

export interface EmprestimoEventoMovimentacaoResponse {
  id: number;
  acao: string;
  descricao?: string | null;
  usuarioId?: number | null;
  criadoEm: string;
}

@Injectable({ providedIn: 'root' })
export class EmprestimosEventosService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly urlBase = `${this.runtimeConfig.apiUrl}/api/emprestimos-eventos`;

  constructor(private readonly http: HttpClient) {}

  listar(parametros: {
    inicio?: string;
    fim?: string;
    status?: string;
    evento?: number;
    item?: number;
    unidade?: number;
  }): Observable<{ emprestimos: EmprestimoEventoResponse[] }> {
    return this.http.get<{ emprestimos: EmprestimoEventoResponse[] }>(this.urlBase, {
      params: { ...parametros }
    });
  }

  obter(id: number): Observable<EmprestimoEventoResponse> {
    return this.http.get<EmprestimoEventoResponse>(`${this.urlBase}/${id}`);
  }

  criar(dados: EmprestimoEventoRequest): Observable<EmprestimoEventoResponse> {
    return this.http.post<EmprestimoEventoResponse>(this.urlBase, dados);
  }

  atualizar(id: number, dados: EmprestimoEventoRequest): Observable<EmprestimoEventoResponse> {
    return this.http.put<EmprestimoEventoResponse>(`${this.urlBase}/${id}`, dados);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlBase}/${id}`);
  }

  confirmarRetirada(id: number, usuarioId?: number | null): Observable<EmprestimoEventoResponse> {
    return this.http.post<EmprestimoEventoResponse>(
      `${this.urlBase}/${id}/confirmar-retirada`,
      null,
      { params: usuarioId ? { usuarioId } : {} }
    );
  }

  confirmarDevolucao(id: number, usuarioId?: number | null): Observable<EmprestimoEventoResponse> {
    return this.http.post<EmprestimoEventoResponse>(
      `${this.urlBase}/${id}/confirmar-devolucao`,
      null,
      { params: usuarioId ? { usuarioId } : {} }
    );
  }

  cancelar(id: number, usuarioId?: number | null): Observable<EmprestimoEventoResponse> {
    return this.http.post<EmprestimoEventoResponse>(`${this.urlBase}/${id}/cancelar`, null, {
      params: usuarioId ? { usuarioId } : {}
    });
  }

  agendaResumo(inicio: string, fim: string): Observable<AgendaResumoDiaResponse[]> {
    return this.http.get<AgendaResumoDiaResponse[]>(`${this.urlBase}/agenda/resumo`, {
      params: { inicio, fim }
    });
  }

  agendaDia(data: string): Observable<AgendaDiaDetalheResponse[]> {
    return this.http.get<AgendaDiaDetalheResponse[]>(`${this.urlBase}/agenda/dia`, {
      params: { data }
    });
  }

  disponibilidade(parametros: {
    itemId: number;
    tipoItem: TipoItemEmprestimo;
    quantidade?: number;
    inicio: string;
    fim: string;
    emprestimoId?: number;
  }): Observable<DisponibilidadeItemResponse> {
    return this.http.get<DisponibilidadeItemResponse>(`${this.urlBase}/disponibilidade`, {
      params: { ...parametros }
    });
  }

  listarEventos(): Observable<EventoEmprestimoResponse[]> {
    return this.http.get<EventoEmprestimoResponse[]>(`${this.urlBase}/eventos`);
  }

  criarEvento(dados: {
    titulo: string;
    descricao?: string | null;
    local?: string | null;
    dataInicio: string;
    dataFim: string;
    status?: string | null;
  }): Observable<EventoEmprestimoResponse> {
    return this.http.post<EventoEmprestimoResponse>(`${this.urlBase}/eventos`, dados);
  }

  atualizarEvento(
    id: number,
    dados: {
      titulo: string;
      descricao?: string | null;
      local?: string | null;
      dataInicio: string;
      dataFim: string;
      status?: string | null;
    }
  ): Observable<EventoEmprestimoResponse> {
    return this.http.put<EventoEmprestimoResponse>(`${this.urlBase}/eventos/${id}`, dados);
  }

  excluirEvento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlBase}/eventos/${id}`);
  }

  listarMovimentacoes(id: number): Observable<{ movimentacoes: EmprestimoEventoMovimentacaoResponse[] }> {
    return this.http.get<{ movimentacoes: EmprestimoEventoMovimentacaoResponse[] }>(
      `${this.urlBase}/${id}/movimentacoes`
    );
  }
}

