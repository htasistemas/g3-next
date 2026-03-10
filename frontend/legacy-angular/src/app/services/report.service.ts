import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface AuthorizationTermPayload {
  beneficiarioNome: string;
  rg?: string | null;
  cpf?: string | null;
  enderecoCompleto?: string | null;
  cidade?: string | null;
  uf?: string | null;
  finalidadeDados?: string | null;
  finalidadeImagem?: string | null;
  vigencia?: string | null;
  localAssinatura?: string | null;
  dataAssinatura?: string | null;
  responsavelNome?: string | null;
  responsavelCpf?: string | null;
  responsavelRelacao?: string | null;
  representanteNome?: string | null;
  representanteCargo?: string | null;
  issuedBy?: string | null;
}

export interface BeneficiaryReportFilters {
  nome?: string;
  cpf?: string;
  codigo?: string;
  status?: string;
  dataNascimento?: string;
  ordenarPor?: string;
  ordem?: string;
  usuarioEmissor?: string;
}

export interface CursosAtendimentosRelacaoFilters {
  nome?: string;
  tipo?: string;
  status?: string;
  profissional?: string;
  salaId?: string;
  usuarioEmissor?: string;
}

export interface SolicitacaoComprasPayload {
  solicitacaoId: string;
  usuarioEmissor?: string;
}

export interface EmprestimoEventoRelatorioPayload {
  emprestimoId: string;
  usuarioEmissor?: string;
}

export interface InformacoesAdministrativasRelatorioFilters {
  tipo?: string;
  categoria?: string;
  titulo?: string;
  tags?: string;
  status?: boolean | null;
  usuarioEmissor?: string;
}

export interface DoacoesPlanejadasRelatorioFilters {
  usuarioEmissor?: string;
}

export interface DoacoesBeneficiarioRelatorioFilters {
  beneficiarioId: string;
  usuarioEmissor?: string;
}

export interface CursoAtendimentoListaPresencaPayload {
  cursoId: string;
  dataAula: string;
  usuarioEmissor?: string;
  exibirCpf?: boolean;
}

export interface RelatorioExtratoMensalPayload {
  mesReferencia?: string;
  usuarioEmissor?: string;
}

export interface RelatorioContasBancariasPayload {
  dataReferencia?: string;
  usuarioEmissor?: string;
}

export interface RelatorioContasPendentesPayload {
  usuarioEmissor?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/reports`;

  constructor(private readonly http: HttpClient) {}

  generateAuthorizationTerm(payload: AuthorizationTermPayload): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.baseUrl}/authorization-term`, payload, {
      responseType: 'blob',
      observe: 'response'
    });
  }

  generateBeneficiaryList(filters: BeneficiaryReportFilters): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/beneficiarios/relacao`, filters, { responseType: 'blob' });
  }

  generateBeneficiaryProfile(payload: { beneficiarioId: string; usuarioEmissor?: string }): Observable<Blob> {
    return this.http.post(
      `${this.baseUrl}/beneficiarios/ficha`,
      payload,
      { responseType: 'blob' }
    );
  }

  generateCursosAtendimentosList(filters: CursosAtendimentosRelacaoFilters): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/cursos-atendimentos/relacao`, filters, {
      responseType: 'blob'
    });
  }

  generateCursoAtendimentoFicha(payload: {
    cursoId: string;
    usuarioEmissor?: string;
  }): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/cursos-atendimentos/ficha`, payload, {
      responseType: 'blob'
    });
  }

  generateCursoAtendimentoListaPresenca(
    payload: CursoAtendimentoListaPresencaPayload
  ): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/cursos-atendimentos/presenca-lista`, payload, {
      responseType: 'blob'
    });
  }

  generateExtratoMensalContabilidade(payload: RelatorioExtratoMensalPayload): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/contabilidade/extrato-mensal`, payload, {
      responseType: 'blob'
    });
  }

  generateContasAReceber(payload: RelatorioContasPendentesPayload): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/contabilidade/contas-receber`, payload, {
      responseType: 'blob'
    });
  }

  generateContasAPagar(payload: RelatorioContasPendentesPayload): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/contabilidade/contas-pagar`, payload, {
      responseType: 'blob'
    });
  }

  generateContasBancarias(payload: RelatorioContasBancariasPayload): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/contabilidade/contas-bancarias`, payload, {
      responseType: 'blob'
    });
  }

  generateSolicitacaoCompras(payload: SolicitacaoComprasPayload): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/autorizacao-compras/solicitacao`, payload, {
      responseType: 'blob'
    });
  }

  generateEmprestimoEventoRelatorio(
    dados: EmprestimoEventoRelatorioPayload
  ): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/emprestimos-eventos/relatorio`, dados, {
      responseType: 'blob'
    });
  }

  generateEmprestimoEventoTermo(
    dados: EmprestimoEventoRelatorioPayload
  ): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/emprestimos-eventos/termo`, dados, {
      responseType: 'blob'
    });
  }

  generateInformacoesAdministrativasReport(
    filtros: InformacoesAdministrativasRelatorioFilters
  ): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/informacoes-administrativas/relatorio`, filtros, {
      responseType: 'blob'
    });
  }

  generateDoacoesPlanejadasPendentes(
    filtros: DoacoesPlanejadasRelatorioFilters
  ): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/doacoes-planejadas/pendentes`, filtros, {
      responseType: 'blob'
    });
  }

  generateDoacoesBeneficiario(
    filtros: DoacoesBeneficiarioRelatorioFilters
  ): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/doacoes/beneficiario`, filtros, {
      responseType: 'blob'
    });
  }
}
