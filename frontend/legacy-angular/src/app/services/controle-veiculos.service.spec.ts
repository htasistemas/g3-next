import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ControleVeiculosService } from './controle-veiculos.service';
import { RuntimeConfigService } from './runtime-config.service';

describe('ControleVeiculosService', () => {
  let service: ControleVeiculosService;
  let mockHttp: HttpTestingController;
  let urlApiBase: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ControleVeiculosService);
    mockHttp = TestBed.inject(HttpTestingController);
    urlApiBase = TestBed.inject(RuntimeConfigService).apiUrl.replace(/\/api\/?$/, '');
  });

  afterEach(() => {
    mockHttp.verify();
  });

  it('deve listar veiculos', () => {
    service.listarVeiculos().subscribe((veiculos) => {
      expect(veiculos.length).toBe(1);
      expect(veiculos[0].placa).toBe('ABC-1234');
    });

    const requisicao = mockHttp.expectOne(`${urlApiBase}/api/controle-veiculos/veiculos`);
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush([
      {
        id: 1,
        placa: 'ABC-1234',
        modelo: 'Gol',
        marca: 'Volkswagen',
        ano: 2020,
        tipoCombustivel: 'Flex',
        mediaConsumoPadrao: 10,
        capacidadeTanqueLitros: 50,
        ativo: true
      }
    ]);
  });

  it('deve criar registro do diario', () => {
    service
      .criarRegistro({
        veiculoId: 1,
        data: '2024-10-10',
        condutor: 'Carlos Silva',
        horarioSaida: '08:00',
        kmInicial: 1000,
        horarioChegada: '10:00',
        kmFinal: 1050,
        destino: 'Centro'
      })
      .subscribe((registro) => {
        expect(registro.id).toBe(10);
        expect(registro.kmRodados).toBe(50);
      });

    const requisicao = mockHttp.expectOne(`${urlApiBase}/api/controle-veiculos/diario-bordo`);
    expect(requisicao.request.method).toBe('POST');
    requisicao.flush({
      id: 10,
      veiculoId: 1,
      data: '2024-10-10',
      condutor: 'Carlos Silva',
      horarioSaida: '08:00',
      kmInicial: 1000,
      horarioChegada: '10:00',
      kmFinal: 1050,
      destino: 'Centro',
      combustivelConsumidoLitros: 5,
      kmRodados: 50,
      mediaConsumo: 10
    });
  });
});

