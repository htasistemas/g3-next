import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, timeout } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { RuntimeConfigService } from './runtime-config.service';

interface LoginResponse {
  token: string;
  usuario?: {
    id: string;
    nomeUsuario: string;
    nome?: string;
    email?: string;
    permissoes?: string[];
  };
  user?: {
    id: string;
    nomeUsuario: string;
    nome?: string;
    email?: string;
    permissoes?: string[];
  };
}

interface CadastroContaRequest {
  nome: string;
  email: string;
  senha: string;
}

interface RecuperarSenhaRequest {
  email: string;
}

interface RedefinirSenhaRequest {
  token: string;
  senha: string;
  confirmarSenha: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly storageKey = 'g3_session';
  private readonly requestTimeoutMs = 10000;
  private get baseUrl(): string {
    const normalizado = this.runtimeConfig.apiUrl.replace(/\/api(\/api)+/g, '/api');
    const apiBaseUrl = normalizado.replace(/\/api\/?$/, '');
    return `${apiBaseUrl}/api/auth`;
  }
  readonly user = signal<{
    id: string;
    nomeUsuario: string;
    nome?: string;
    email?: string;
    permissoes?: string[];
  } | null>(this.loadUser());

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  login(nomeUsuario: string, senha: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, { nomeUsuario, senha })
      .pipe(
        timeout(this.requestTimeoutMs),
        tap((response) => {
          const usuario =
            response.usuario ?? { id: '0', nomeUsuario };
          this.persistSession({
            ...response,
            user: usuario,
          });
        })
      );
  }

  loginGoogle(token: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/google`, { idToken: token })
      .pipe(
        timeout(this.requestTimeoutMs),
        tap((response) => {
          const usuario = response.usuario ?? response.user ?? { id: '0', nomeUsuario: '' };
          this.persistSession({
            ...response,
            user: usuario,
          });
        })
      );
  }

  registrarConta(payload: CadastroContaRequest): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/registrar`, payload)
      .pipe(timeout(this.requestTimeoutMs));
  }

  solicitarRecuperacaoSenha(email: string): Observable<void> {
    const payload: RecuperarSenhaRequest = { email };
    return this.http
      .post<void>(`${this.baseUrl}/recuperar-senha`, payload)
      .pipe(timeout(this.requestTimeoutMs));
  }

  redefinirSenha(payload: RedefinirSenhaRequest): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/redefinir-senha`, payload)
      .pipe(timeout(this.requestTimeoutMs));
  }

  logout(): void {
    this.user.set(null);
    sessionStorage.removeItem(this.storageKey);
    this.router.navigate(['/login']);
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  get token(): string | null {
    const session = this.loadSession();
    return session?.token ?? null;
  }

  private loadSession(): LoginResponse | null {
    const rawSessao = sessionStorage.getItem(this.storageKey);
    if (rawSessao) {
      return JSON.parse(rawSessao) as LoginResponse;
    }

    const legado = localStorage.getItem(this.storageKey);
    if (!legado) {
      return null;
    }

    sessionStorage.setItem(this.storageKey, legado);
    localStorage.removeItem(this.storageKey);
    return JSON.parse(legado) as LoginResponse;
  }

  private loadUser(): {
    id: string;
    nomeUsuario: string;
    nome?: string;
    email?: string;
    permissoes?: string[];
  } | null {
    return this.loadSession()?.user ?? null;
  }

  private persistSession(session: LoginResponse): void {
    this.user.set(session.user ?? null);
    sessionStorage.setItem(this.storageKey, JSON.stringify(session));
  }

}
