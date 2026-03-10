import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface AssistanceUnitPayload {
  id?: number;
  nomeFantasia: string;
  razaoSocial?: string;
  enderecoId?: number;
  cnpj?: string;
  telefone?: string;
  email?: string;
  site?: string;
  cep?: string;
  endereco?: string;
  numeroEndereco?: string;
  complemento?: string;
  bairro?: string;
  pontoReferencia?: string;
  cidade?: string;
  zona?: string;
  subzona?: string;
  estado?: string;
  latitude?: string;
  longitude?: string;
  observacoes?: string;
  logomarca?: string;
  logomarcaRelatorio?: string;
  diretoria?: DiretoriaUnidadePayload[];
  horarioFuncionamento?: string;
  unidadePrincipal?: boolean;
  raioPontoMetros?: number;
  accuracyMaxPontoMetros?: number;
  ipValidacaoPonto?: string;
  ipsPublicosPonto?: string;
  redesLocaisPonto?: string;
  modoValidacaoPonto?: string;
  pingTimeoutMs?: number;
}

export interface DiretoriaUnidadePayload {
  id?: number;
  nomeCompleto: string;
  documento: string;
  funcao: string;
  mandatoInicio?: string;
  mandatoFim?: string;
}

@Injectable({ providedIn: 'root' })
export class AssistanceUnitService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/unidades-assistenciais`;
  private readonly activeUnitKey = 'g3-active-assistance-unit';
  private readonly activeUnitLogoKey = 'g3-active-assistance-logo';

  private readonly currentUnitNameSubject = new BehaviorSubject<string>(
    localStorage.getItem(this.activeUnitKey) || 'Navegação'
  );

  private readonly currentUnitLogoSubject = new BehaviorSubject<string | null>(
    localStorage.getItem(this.activeUnitLogoKey)
  );

  readonly currentUnitName$ = this.currentUnitNameSubject.asObservable();
  readonly currentUnitLogo$ = this.currentUnitLogoSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  get(): Observable<{ unidade: AssistanceUnitPayload | null }> {
    return this.http.get<{ unidade: AssistanceUnitPayload | null }>(`${this.baseUrl}/atual`);
  }

  list(): Observable<AssistanceUnitPayload[]> {
    return this.http.get<AssistanceUnitPayload[]>(this.baseUrl);
  }

  save(payload: AssistanceUnitPayload): Observable<AssistanceUnitPayload> {     
    if (payload.id) {
      const { id, ...dados } = payload;
      return this.http.put<AssistanceUnitPayload>(`${this.baseUrl}/${id}`, dados);
    }

    return this.http.post<AssistanceUnitPayload>(this.baseUrl, payload);        
  }

  remove(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(tap(() => this.setActiveUnit('Navegação', null)));
  }

  carregarUnidadeAtual(): Observable<AssistanceUnitPayload | null> {
    return this.get().pipe(
      tap(({ unidade }) => {
        if (unidade) {
          this.setActiveUnit(unidade.nomeFantasia, unidade.logomarca ?? null);
          return;
        }
        this.setActiveUnit('Navegação', null);
      }),
      map(({ unidade }) => unidade ?? null)
    );
  }

  geocodificarEndereco(id: number, forcar = false): Observable<AssistanceUnitPayload> {
    const opcoes: { params?: HttpParams } = {};
    if (forcar) {
      opcoes.params = new HttpParams().set('forcar', 'true');
    }
    return this.http.post<AssistanceUnitPayload>(`${this.baseUrl}/${id}/geocodificar-endereco`, {}, opcoes);
  }

  setActiveUnit(name: string, logo?: string | null): void {
    this.currentUnitNameSubject.next(name);
    localStorage.setItem(this.activeUnitKey, name);
    this.setActiveUnitLogo(logo ?? null);
  }

  private setActiveUnitLogo(logo: string | null): void {
    this.currentUnitLogoSubject.next(logo);

    if (logo) {
      localStorage.setItem(this.activeUnitLogoKey, logo);
      return;
    }

    localStorage.removeItem(this.activeUnitLogoKey);
  }
}
