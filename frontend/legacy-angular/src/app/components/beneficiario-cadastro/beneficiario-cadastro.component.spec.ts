import { FormBuilder } from '@angular/forms';
import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BeneficiarioCadastroComponent } from './beneficiario-cadastro.component';
import { RuntimeConfigService } from '../../services/runtime-config.service';

describe('BeneficiarioCadastroComponent', () => {
  function createSpyObj<T extends object>(methods: string[]): T {
    const target: Record<string, ReturnType<typeof vi.fn>> = {};
    methods.forEach((method) => {
      target[method] = vi.fn();
    });
    return target as unknown as T;
  }

  function criarComponente(): BeneficiarioCadastroComponent {
    const fb = new FormBuilder();
    const serviceMock = createSpyObj<any>([
      'list',
      'getById',
      'create',
      'update',
      'delete',
      'geocodificarEndereco'
    ]);
    serviceMock.list.mockReturnValue(of({ beneficiarios: [] }));
    serviceMock.getById.mockReturnValue(of({ beneficiario: null }));
    serviceMock.delete.mockReturnValue(of(void 0));
    serviceMock.geocodificarEndereco.mockReturnValue(of({ beneficiario: {} }));

    const beneficiaryServiceMock = createSpyObj<any>(['list', 'getRequiredDocuments']);
    beneficiaryServiceMock.list.mockReturnValue(of({ beneficiarios: [] }));
    beneficiaryServiceMock.getRequiredDocuments.mockReturnValue(of({ documents: [] }));

    const configServiceMock = createSpyObj<any>(['getBeneficiaryDocuments']);
    configServiceMock.getBeneficiaryDocuments.mockReturnValue(of({ documents: [] }));
    const routerMock = createSpyObj<any>(['navigate']);
    const routeMock = { paramMap: of(convertToParamMap({})) } as any;
    const httpMock = createSpyObj<any>(['get']);
    const assistanceUnitServiceMock = createSpyObj<any>(['get']);
    const reportServiceMock = createSpyObj<any>([
      'gerarRelatorioBeneficiarios',
      'gerarFichaBeneficiario',
      'gerarTermoAutorizacao'
    ]);
    const authServiceMock = createSpyObj<any>(['getUsuarioAtual']);
    const ngZone = {
      run: (fn: (...args: unknown[]) => unknown) => fn(),
      runOutsideAngular: (fn: (...args: unknown[]) => unknown) => fn()
    } as unknown as NgZone;
    const sanitizerMock = createSpyObj<any>(['bypassSecurityTrustResourceUrl']);
    const runtimeConfigMock = { apiUrl: 'http://localhost:8080' } as RuntimeConfigService;

    TestBed.configureTestingModule({
      providers: [{ provide: RuntimeConfigService, useValue: runtimeConfigMock }]
    });

    return TestBed.runInInjectionContext(
      () =>
        new BeneficiarioCadastroComponent(
          fb,
          serviceMock,
          beneficiaryServiceMock,
          configServiceMock,
          routerMock,
          routeMock,
          httpMock,
          assistanceUnitServiceMock,
          reportServiceMock,
          authServiceMock,
          ngZone,
          sanitizerMock
        )
    );
  }

  it('dispara a busca com Enter apenas uma vez', () => {
    const componente = criarComponente();
    const evento = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    } as any;
    const buscarSpy = vi.spyOn(componente, 'buscarBeneficiariosNaListagem');

    componente.onBuscarEnter(evento);

    expect(buscarSpy).toHaveBeenCalledTimes(1);
    expect(evento.preventDefault).toHaveBeenCalled();
    expect(evento.stopPropagation).toHaveBeenCalled();
  });

  it('reinicia o cadastro ao cancelar', () => {
    const componente = criarComponente();
    const novoSpy = vi.spyOn(componente, 'startNewBeneficiario');

    componente.onCancel();

    expect(novoSpy).toHaveBeenCalled();
  });

  it('exibe popup de sucesso ao salvar', async () => {
    const componente = criarComponente();
    const serviceMock = (componente as any).service;
    serviceMock.create.mockReturnValue(
      of({
        beneficiario: {
          id_beneficiario: '10',
          codigo: '0010',
          nome_completo: 'Maria Teste',
          nome_mae: 'Josefa Teste',
          data_nascimento: '1990-01-01',
          cpf: '11144477735',
          status: 'EM_ANALISE'
        }
      })
    );
    (componente as any).beneficiarioId = null;
    componente.form.patchValue({
      status: 'EM_ANALISE',
      dadosPessoais: {
        nome_completo: 'Maria Teste',
        data_nascimento: '1990-01-01',
        nome_mae: 'Josefa Teste'
      },
      endereco: { cep: '12345-678' },
      contato: { telefone_principal: '11999999999' },
      documentos: { cpf: '111.444.777-35' },
      observacoes: { aceite_lgpd: true }
    });

    await componente.submit();

    expect(componente.popupTitulo).toBe('Sucesso');
    expect(componente.popupMensagens.length).toBe(1);
  });

  it('limpa o estado de upload ao reconstruir a lista de documentos', () => {
    const componente = criarComponente();
    (componente as any).uploadProgress = { 7: 35 };
    (componente as any).uploadingDocuments = true;

    (componente as any).resetDocumentArray([{ nome: 'CPF', obrigatorio: true }]);

    expect((componente as any).uploadingDocuments).toBe(false);
    expect(Object.keys((componente as any).uploadProgress)).toHaveLength(0);
  });

  it('remove anexo limpando caminho e estado de envio', () => {
    const componente = criarComponente();
    componente.addOptionalDocument();
    componente.anexos.at(0).patchValue({
      id: 10,
      nomeArquivo: 'cpf.pdf',
      caminhoArquivo: 'storage/beneficiarios/1/cpf.pdf',
      conteudo: 'base64...',
      contentType: 'application/pdf',
    });
    (componente as any).uploadProgress = { 0: 20 };
    (componente as any).uploadingDocuments = true;

    componente.removeUploadedDocument(0);

    const doc = componente.anexos.at(0).value as any;
    expect(doc.id).toBeNull();
    expect(doc.nomeArquivo).toBe('');
    expect(doc.caminhoArquivo).toBe('');
    expect(doc.conteudo).toBe('');
    expect((componente as any).uploadingDocuments).toBe(false);
  });
});
