import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface DocumentoObrigatorio {
  id?: number | string;
  nome: string;
  nomeArquivo?: string;
  caminhoArquivo?: string;
  file?: File;
  obrigatorio?: boolean;
  required?: boolean;
  baseRequired?: boolean;
  conteudo?: string;
  contentType?: string;
}

export interface VulnerabilityIndexPayload {
  id?: string;
  idBeneficiario?: string;
  pontuacaoTotal?: number;
  faixaVulnerabilidade?: string;
  dataCalculo?: string;
}

export interface BeneficiaryPayload {
  id?: number;
  codigo?: string;
  cpf?: string;
  cep: string;
  nomeCompleto: string;
  nomeSocial?: string;
  apelido?: string;
  nomeMae?: string;
  nomePai?: string;
  rg?: string;
  orgaoEmissor?: string;
  ufEmissor?: string;
  dataEmissaoRg?: string;
  documentos: string;
  dataNascimento: string;
  idade?: number;
  sexo?: string;
  sexoBiologico?: string;
  identidadeGenero?: string;
  corRaca?: string;
  nacionalidade?: string;
  naturalidade?: string;
  telefone?: string;
  telefoneFixo?: string;
  celular?: string;
  contatoWhatsApp?: boolean;
  telefoneRecado?: string;
  nomeRecado?: string;
  email: string;
  logradouro?: string;
  endereco?: string;
  numero?: string;
  numeroEndereco?: string;
  complemento?: string;
  pontoReferencia?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  uf?: string;
  zona?: string;
  subzona?: string;
  situacaoImovel?: string;
  tipoMoradia?: string;
  condicoesMoradia?: string[];
  acessoAgua?: string;
  esgoto?: string;
  coletaLixo?: string;
  energiaEletrica?: string;
  internet?: string;
  parentesco?: string;
  observacoes?: string;
  status?: string;
  motivoBloqueio?: string;
  nis?: string;
  nisBeneficio?: string;
  estadoCivil?: string;
  situacaoEscolarCrianca?: string;
  responsavelLegal?: boolean;
  responsavelPor?: string;
  responsavelLegalPor?: string;
  situacaoMoradia?: string;
  pessoasResidencia?: number | string;
  rendaFamiliar?: number | string;
  rendaPerCapita?: number | string;
  renda?: number | string;
  situacaoTrabalho?: string;
  localTrabalho?: string;
  fonteRenda?: string;
  programasSociais?: string;
  contatoPreferencias?: string[];
  horarioContato?: string;
  autorizacaoContato?: boolean;
  possuiFilhosMenores?: boolean;
  possuiCnh?: boolean;
  quantidadeFilhosMenores?: number;
  escolaridade?: string;
  rendaIndividual?: number | string;
  informacoesMoradia?: string;
  condicoesSaneamento?: string;
  situacaoEmprego?: string;
  ocupacao?: string;
  alfabetizado?: string;
  serieConcluida?: string;
  situacaoEscolarAtual?: string;
  nivelEnsino?: string;
  moraComFamilia?: string;
  responsavelFamiliar?: boolean;
  vinculoFamiliar?: string;
  situacoesVulnerabilidade?: string[];
  acompanhamentos?: string[];
  tempoAcompanhamento?: string;
  origemEncaminhamento?: string;
  possuiDeficiencia?: string | boolean;
  tiposDeficiencia?: string[];
  cidPrincipal?: string;
  usaMedicacao?: string | boolean;
  medicacaoDescricao?: string;
  acompanhamentoSaude?: string[];
  recebeBeneficio?: string | boolean;
  beneficiosAtuais?: string[];
  valorBeneficios?: number | string;
  tempoBeneficios?: string;
  historicoBeneficio?: string;
  documentosAnexos: DocumentoObrigatorio[];
  foto?: string | null;
  indiceVulnerabilidade?: VulnerabilityIndexPayload | null;
  optaReceberCestaBasica?: boolean;
  aptoReceberCestaBasica?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BeneficiaryService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly apiBaseUrl = this.runtimeConfig.apiUrl.replace(/\/api\/?$/, '');
  private readonly baseUrl = `${this.apiBaseUrl}/api/beneficiarios`;

  constructor(private readonly http: HttpClient) {}

  getById(id: number): Observable<BeneficiaryPayload> {
    return this.http
      .get<{ beneficiario: BeneficiaryPayload }>(`${this.baseUrl}/${id}`)
      .pipe(map(({ beneficiario }) => beneficiario));
  }

  getRequiredDocuments(): Observable<{ documents: DocumentoObrigatorio[] }> {
    return this.http.get<{ documents: DocumentoObrigatorio[] }>(`${this.baseUrl}/documents`);
  }

  list(filters?: { nome?: string; cpf?: string; codigo?: string; data_nascimento?: string }): Observable<{ beneficiarios: BeneficiaryPayload[] }> {
    let params = new HttpParams();
    if (filters?.nome) params = params.set('nome', filters.nome);
    if (filters?.cpf) params = params.set('cpf', filters.cpf);
    if (filters?.codigo) params = params.set('codigo', filters.codigo);
    if (filters?.data_nascimento) params = params.set('data_nascimento', filters.data_nascimento);

    return this.http
      .get<{ beneficiarios?: BeneficiaryPayload[] }>(this.baseUrl, { params })
      .pipe(
      map((response) => {
        return { beneficiarios: response?.beneficiarios ?? [] };
      })
    );
  }

  verifyDuplicidade(payload: {
    nomeCompleto?: string;
    nomeMae?: string;
    dataNascimento?: string;
    cpf?: string;
  }): Observable<{ candidatos: BeneficiaryPayload[] }> {
    return this.http.post<{ candidatos: BeneficiaryPayload[] }>(`${this.baseUrl}/verificar-duplicidade`, payload);
  }

  recalculateIvf(idBeneficiario: string): Observable<VulnerabilityIndexPayload> {
    const url = `${this.runtimeConfig.apiUrl}/api/ivf/${idBeneficiario}/recalcular`;
    return this.http.post<{ indice: VulnerabilityIndexPayload }>(url, {}).pipe(map(({ indice }) => indice));
  }

  save(payload: BeneficiaryPayload, photoFile?: File | null): Observable<BeneficiaryPayload> {
    const formData = this.buildFormData(payload, photoFile);

    if (payload.id) {
      return this.http.put<BeneficiaryPayload>(`${this.baseUrl}/${payload.id}`, formData);
    }

    return this.http.post<BeneficiaryPayload>(this.baseUrl, formData);
  }

  atualizarAptidaoCestaBasica(
    id: number,
    payload: { optaReceberCestaBasica?: boolean; aptoReceberCestaBasica?: boolean | null }
  ): Observable<BeneficiaryPayload> {
    return this.http.patch<BeneficiaryPayload>(`${this.baseUrl}/${id}/aptidao-cesta-basica`, {
        opta_receber_cesta_basica: payload.optaReceberCestaBasica,
        apto_receber_cesta_basica: payload.aptoReceberCestaBasica
      });
  }

  private buildFormData(payload: BeneficiaryPayload, photoFile?: File | null): FormData {
    const formData = new FormData();
    const { documentosAnexos, foto, ...rest } = payload;

    Object.entries(rest).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });

    const documentsWithoutFiles = (documentosAnexos ?? []).map(({ file, ...doc }) => doc);
    formData.append('documentosAnexos', JSON.stringify(documentsWithoutFiles));

    documentosAnexos?.forEach((doc, index) => {
      if (doc.file) {
        formData.append(`documentosArquivos[${index}]`, doc.file, doc.file.name || doc.nomeArquivo || `documento-${index + 1}`);
      }
    });

    if (photoFile) {
      formData.append('fotoArquivo', photoFile, photoFile.name || 'foto.jpg');
    } else if (foto) {
      formData.append('foto', foto);
    }

    return formData;
  }
}
