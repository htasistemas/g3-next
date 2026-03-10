import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface PermissionPayload {
  id: number;
  nome: string;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/usuarios/permissoes`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<PermissionPayload[]> {
    return this.http.get<PermissionPayload[]>(this.baseUrl);
  }
}
