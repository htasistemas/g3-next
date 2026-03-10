import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export type SituacaoVisita = 'Agendada' | 'Em andamento' | 'Realizada' | 'Cancelada';

export interface EnderecoVisita {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

export interface VisitaAnexo {
  id?: number;
  nome: string;
  tipo: string;
  tamanho?: string;
}

export interface VisitaDomiciliar {
  id: number;
  beneficiarioId: number;
  beneficiario: string;
  unidade: string;
  responsavel: string;
  dataVisita: string;
  horarioInicial: string;
  horarioFinal?: string;
  tipoVisita?: string;
  situacao: SituacaoVisita;
  usarEnderecoBeneficiario: boolean;
  endereco: EnderecoVisita;
  observacoesIniciais?: string;
  condicoes: {
    tipoMoradia?: string;
    situacaoPosse?: string;
    comodos?: number | null;
    saneamento?: string;
    abastecimentoAgua?: string;
    energiaEletrica?: string;
    condicoesHigiene?: string;
    situacaoRisco?: string[];
    observacoes?: string;
  };
  situacaoSocial: {
    rendaFamiliar?: string;
    faixaRenda?: string;
    beneficios?: string[];
    redeApoio?: string;
    vinculos?: string;
    observacoes?: string;
  };
  registro: {
    relato?: string;
    necessidades?: string;
    encaminhamentos?: string;
    orientacoes?: string;
    plano?: string;
    optaReceberCestaBasica?: boolean | null;
    aptoReceberCestaBasica?: boolean | null;
    motivoNaoReceberCestaBasica?: string;
  };
  anexos: VisitaAnexo[];
  createdAt?: string;
  updatedAt?: string;
}

interface VisitaDomiciliarListaResponse {
  visitas: Array<{
    id: number;
    beneficiarioId: number;
    beneficiarioNome: string;
    unidade: string;
    responsavel: string;
    dataVisita: string;
    horarioInicial: string;
    horarioFinal?: string;
    tipoVisita?: string;
    situacao: string;
    usarEnderecoBeneficiario: boolean;
    endereco?: EnderecoVisita;
    observacoesIniciais?: string;
    condicoes?: VisitaDomiciliar['condicoes'];
    situacaoSocial?: VisitaDomiciliar['situacaoSocial'];
    registro?: VisitaDomiciliar['registro'];
    anexos?: VisitaAnexo[];
    criadoEm?: string;
    atualizadoEm?: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class VisitaDomiciliarService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/visitas-domiciliares`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<VisitaDomiciliar[]> {
    return new Observable((subscriber) => {
      this.http.get<VisitaDomiciliarListaResponse>(this.baseUrl).subscribe({
        next: (response) => {
          const visitas =
            response?.visitas?.map((item) => ({
              id: item.id,
              beneficiarioId: item.beneficiarioId,
              beneficiario: item.beneficiarioNome,
              unidade: item.unidade,
              responsavel: item.responsavel,
              dataVisita: item.dataVisita,
              horarioInicial: item.horarioInicial,
              horarioFinal: item.horarioFinal,
              tipoVisita: item.tipoVisita,
              situacao: item.situacao as SituacaoVisita,
              usarEnderecoBeneficiario: item.usarEnderecoBeneficiario,
              endereco: item.endereco || {},
              observacoesIniciais: item.observacoesIniciais,
              condicoes: item.condicoes || {},
              situacaoSocial: item.situacaoSocial || {},
              registro: item.registro || {},
              anexos: item.anexos || [],
              createdAt: item.criadoEm,
              updatedAt: item.atualizadoEm
            })) ?? [];
          subscriber.next(visitas);
          subscriber.complete();
        },
        error: (error) => subscriber.error(error)
      });
    });
  }

  create(payload: VisitaDomiciliar): Observable<VisitaDomiciliar> {
    return this.http.post<VisitaDomiciliar>(this.baseUrl, this.mapPayload(payload));
  }

  update(id: number, payload: VisitaDomiciliar): Observable<VisitaDomiciliar> {
    return this.http.put<VisitaDomiciliar>(`${this.baseUrl}/${id}`, this.mapPayload(payload));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private mapPayload(payload: VisitaDomiciliar): Record<string, unknown> {
    return {
      beneficiarioId: payload.beneficiarioId,
      unidade: payload.unidade,
      responsavel: payload.responsavel,
      dataVisita: payload.dataVisita,
      horarioInicial: payload.horarioInicial,
      horarioFinal: payload.horarioFinal || null,
      tipoVisita: payload.tipoVisita,
      situacao: payload.situacao,
      usarEnderecoBeneficiario: payload.usarEnderecoBeneficiario,
      endereco: payload.endereco,
      observacoesIniciais: payload.observacoesIniciais,
      condicoes: payload.condicoes,
      situacaoSocial: payload.situacaoSocial,
      registro: payload.registro,
      anexos: (payload.anexos || []).map((anexo) => ({
        nome: anexo.nome,
        tipo: anexo.tipo,
        tamanho: anexo.tamanho
      }))
    };
  }
}
