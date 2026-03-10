import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class ContratacaoService {
  private readonly baseUrl = `${environment.apiUrl}/api/rh/contratacao`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  usuarioIdAtual(): number {
    const id = this.auth.user()?.id;
    return id ? Number(id) : 0;
  }

  listarCandidatos(termo: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/candidatos`, { params: { termo } });
  }

  buscarCandidato(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/candidatos/${id}`);
  }

  criarCandidato(payload: any, usuarioId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/candidatos`, payload, { params: { usuarioId } });
  }

  atualizarCandidato(id: number, payload: any, usuarioId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/candidatos/${id}`, payload, { params: { usuarioId } });
  }

  inativarCandidato(id: number, usuarioId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/candidatos/${id}`, { params: { usuarioId } });
  }

  buscarProcessoPorCandidato(candidatoId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/processos/por-candidato/${candidatoId}`);
  }

  atualizarStatus(processoId: number, payload: any, usuarioId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/processos/${processoId}/status`, payload, { params: { usuarioId } });
  }

  listarEntrevistas(processoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/processos/${processoId}/entrevistas`);
  }

  salvarEntrevista(processoId: number, payload: any, usuarioId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/processos/${processoId}/entrevistas`, payload, { params: { usuarioId } });
  }

  buscarFicha(processoId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/processos/${processoId}/ficha`);
  }

  salvarFicha(processoId: number, payload: any, usuarioId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/processos/${processoId}/ficha`, payload, { params: { usuarioId } });
  }

  listarDocumentos(processoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/processos/${processoId}/documentos`);
  }

  atualizarDocumento(id: number, payload: any, usuarioId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/documentos/${id}`, payload, { params: { usuarioId } });
  }

  listarArquivos(processoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/processos/${processoId}/arquivos`);
  }

  adicionarArquivo(processoId: number, payload: any, usuarioId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/processos/${processoId}/arquivos`, payload, { params: { usuarioId } });
  }

  listarTermos(processoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/processos/${processoId}/termos`);
  }

  salvarTermo(processoId: number, payload: any, usuarioId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/processos/${processoId}/termos`, payload, { params: { usuarioId } });
  }

  buscarPpd(processoId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/processos/${processoId}/ppd`);
  }

  salvarPpd(processoId: number, payload: any, usuarioId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/processos/${processoId}/ppd`, payload, { params: { usuarioId } });
  }

  buscarCartaBanco(processoId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/processos/${processoId}/carta-banco`);
  }

  salvarCartaBanco(processoId: number, payload: any, usuarioId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/processos/${processoId}/carta-banco`, payload, { params: { usuarioId } });
  }

  listarAuditoria(processoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/processos/${processoId}/auditoria`);
  }
}
