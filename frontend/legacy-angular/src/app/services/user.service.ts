import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface UserPayload {
  id: number;
  nomeUsuario: string;
  nome?: string;
  email?: string;
  criadoEm?: string;
  atualizadoEm?: string;
  permissoes?: string[];
  horarioEntrada1?: string;
  horarioSaida1?: string;
  horarioEntrada2?: string;
  horarioSaida2?: string;
  horarioSegundaEntrada1?: string;
  horarioSegundaSaida1?: string;
  horarioSegundaEntrada2?: string;
  horarioSegundaSaida2?: string;
  horarioTercaEntrada1?: string;
  horarioTercaSaida1?: string;
  horarioTercaEntrada2?: string;
  horarioTercaSaida2?: string;
  horarioQuartaEntrada1?: string;
  horarioQuartaSaida1?: string;
  horarioQuartaEntrada2?: string;
  horarioQuartaSaida2?: string;
  horarioQuintaEntrada1?: string;
  horarioQuintaSaida1?: string;
  horarioQuintaEntrada2?: string;
  horarioQuintaSaida2?: string;
  horarioSextaEntrada1?: string;
  horarioSextaSaida1?: string;
  horarioSextaEntrada2?: string;
  horarioSextaSaida2?: string;
  horarioSabadoEntrada1?: string;
  horarioSabadoSaida1?: string;
  horarioSabadoEntrada2?: string;
  horarioSabadoSaida2?: string;
  horarioDomingoEntrada1?: string;
  horarioDomingoSaida1?: string;
  horarioDomingoEntrada2?: string;
  horarioDomingoSaida2?: string;
}

export interface UserInput {
  nome: string;
  email: string;
  senha: string;
  permissoes: string[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/usuarios`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<UserPayload[]> {
    return this.http
      .get<{ usuarios?: UserPayload[] } | UserPayload[]>(this.baseUrl)
      .pipe(map((response) => (Array.isArray(response) ? response : response.usuarios ?? [])));
  }

  create(payload: UserInput, usuarioId: number): Observable<UserPayload> {
    const params = new HttpParams().set('usuarioId', String(usuarioId));
    return this.http.post<UserPayload>(this.baseUrl, payload, { params });
  }

  update(id: number, payload: Partial<UserInput>, usuarioId: number): Observable<UserPayload> {
    const params = new HttpParams().set('usuarioId', String(usuarioId));
    return this.http.put<UserPayload>(`${this.baseUrl}/${id}`, payload, { params });
  }

  delete(id: number, usuarioId: number): Observable<void> {
    const params = new HttpParams().set('usuarioId', String(usuarioId));
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { params });
  }
}
