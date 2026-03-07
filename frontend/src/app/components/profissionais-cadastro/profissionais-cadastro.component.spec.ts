import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ProfissionaisCadastroComponent } from './profissionais-cadastro.component';

describe('ProfissionaisCadastroComponent', () => {
  function createSpyObj<T extends object>(methods: string[]): T {
    const target: Record<string, ReturnType<typeof vi.fn>> = {};
    methods.forEach((method) => {
      target[method] = vi.fn();
    });
    return target as unknown as T;
  }

  function criarComponente(): ProfissionaisCadastroComponent {
    const fb = new FormBuilder();
    const professionalServiceMock = createSpyObj<any>([
      'list',
      'create',
      'update',
      'delete'
    ]);
    professionalServiceMock.list.mockReturnValue(of([]));
    const assistanceUnitServiceMock = createSpyObj<any>(['get', 'list']);
    assistanceUnitServiceMock.get.mockReturnValue(of({ unidade: null }));
    assistanceUnitServiceMock.list.mockReturnValue(of([]));
    const termoPrintServiceMock = createSpyObj<any>(['printTermoVoluntariado']);
    const authServiceMock = createSpyObj<any>(['user']);
    const httpMock = createSpyObj<any>(['get']);
    const salasServiceMock = createSpyObj<any>(['list']);
    salasServiceMock.list.mockReturnValue(of([]));

    return new ProfissionaisCadastroComponent(
      fb,
      professionalServiceMock,
      assistanceUnitServiceMock,
      termoPrintServiceMock,
      authServiceMock,
      httpMock,
      salasServiceMock
    );
  }

  it('dispara a busca com Enter apenas uma vez', () => {
    const componente = criarComponente();
    const evento = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    } as any;
    const buscarSpy = vi.spyOn(componente, 'onBuscar');

    componente.onBuscarEnter(evento);

    expect(buscarSpy).toHaveBeenCalledTimes(1);
    expect(evento.preventDefault).toHaveBeenCalled();
    expect(evento.stopPropagation).toHaveBeenCalled();
  });

  it('aciona busca e abre a aba de listagem', () => {
    const componente = criarComponente();
    const buscarSpy = vi.spyOn(componente as any, 'buscarProfissionaisNaListagem');
    componente.changeTab('dados');

    componente.onBuscar();

    expect(componente.activeTab).toBe('lista');
    expect(buscarSpy).toHaveBeenCalled();
  });
});
