import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface RuntimeConfig {
  apiUrl?: string;
  googleClientId?: string;
  pontoBypass?: boolean;
}

const DEFAULT_API_URL = '/api';
const PLACEHOLDER = '$API_BASE_URL';
const GOOGLE_PLACEHOLDER = '$GOOGLE_CLIENT_ID';

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private config: RuntimeConfig = {};

  constructor(private readonly http: HttpClient) {}

  load(): Promise<void> {
    return firstValueFrom(this.http.get<RuntimeConfig>('assets/config.json'))
      .then((config) => {
        this.config = config ?? {};
      })
      .catch(() => {
        this.config = {};
      });
  }

  get apiUrl(): string {
    const apiUrlRuntime = this.obterApiUrlRuntime();
    let normalizado = (apiUrlRuntime ?? DEFAULT_API_URL).replace(/\/api(\/api)+/g, '/api');
    normalizado = normalizado.replace(/\/api\/?$/, '');
    return normalizado;
  }

  get googleClientId(): string {
    const runtime = this.obterGoogleClientIdRuntime();
    const normalizado = (runtime ?? '').trim();
    if (!normalizado || normalizado === GOOGLE_PLACEHOLDER) return '';
    return normalizado;
  }

  get pontoBypass(): boolean {
    if (typeof window !== 'undefined') {
      const valor = (window as any).__env?.pontoBypass;
      if (valor !== undefined) {
        return this.normalizarBoolean(valor);
      }
    }
    if (this.config.pontoBypass !== undefined) {
      return Boolean(this.config.pontoBypass);
    }
    return false;
  }

  private obterApiUrlRuntime(): string | undefined {
    if (typeof window === 'undefined') {
      const rawServer = (this.config.apiUrl ?? '').trim();
      if (rawServer && rawServer !== PLACEHOLDER) return rawServer;
      return undefined;
    }

    const apiUrlWindow = ((window as any).__env?.apiUrl as string | undefined) ?? '';
    const normalizadoWindow = apiUrlWindow.trim();
    if (normalizadoWindow && normalizadoWindow !== PLACEHOLDER) {
      return normalizadoWindow;
    }

    const rawConfig = (this.config.apiUrl ?? '').trim();
    if (rawConfig && rawConfig !== PLACEHOLDER) {
      return rawConfig;
    }

    const { protocol, hostname, port } = window.location;
    if (port === '4200') {
      return 'http://localhost:8080';
    }
    if (hostname) {
      const portaNormalizada = port ? `:${port}` : '';
      return `${protocol}//${hostname}${portaNormalizada}`;
    }
    return 'http://localhost:3000';
  }

  private obterGoogleClientIdRuntime(): string | undefined {
    if (typeof window === 'undefined') {
      return (this.config.googleClientId ?? '').trim();
    }
    const clientIdWindow = ((window as any).__env?.googleClientId as string | undefined) ?? '';
    const normalizadoWindow = clientIdWindow.trim();
    if (normalizadoWindow) return normalizadoWindow;
    return (this.config.googleClientId ?? '').trim();
  }

  private normalizarBoolean(valor: unknown): boolean {
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') {
      const normalizado = valor.trim().toLowerCase();
      return normalizado === 'true' || normalizado === '1' || normalizado === 'sim';
    }
    return false;
  }
}
