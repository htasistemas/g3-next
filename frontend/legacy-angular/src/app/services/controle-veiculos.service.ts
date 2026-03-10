import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface VeiculoCadastro {
  id: number;
  placa: string | null;
  modelo: string | null;
  marca: string | null;
  ano: number | null;
  tipoCombustivel: string | null;
  mediaConsumoPadrao: number | null;
  capacidadeTanqueLitros: number | null;
  observacoes?: string | null;
  ativo: boolean | null;
  fotoFrente?: string | null;
  fotoLateralEsquerda?: string | null;
  fotoLateralDireita?: string | null;
  fotoTraseira?: string | null;
  documentoVeiculoPdf?: string | null;
}

export interface RegistroDiarioBordo {
  id: number;
  veiculoId: number | null;
  data: string | null;
  condutor: string | null;
  horarioSaida: string | null;
  kmInicial: number | null;
  horarioChegada: string | null;
  kmFinal: number | null;
  destino: string | null;
  combustivelConsumidoLitros: number | null;
  kmRodados: number | null;
  mediaConsumo: number | null;
  observacoes?: string | null;
}

export interface VeiculoCadastroEntrada {
  placa: string;
  modelo: string;
  marca: string;
  ano: number | null;
  tipoCombustivel: string;
  mediaConsumoPadrao: number | null;
  capacidadeTanqueLitros: number | null;
  observacoes?: string | null;
  ativo: boolean | null;
  fotoFrente?: string | null;
  fotoLateralEsquerda?: string | null;
  fotoLateralDireita?: string | null;
  fotoTraseira?: string | null;
  documentoVeiculoPdf?: string | null;
}

export interface RegistroDiarioBordoEntrada {
  veiculoId: number | null;
  data: string | null;
  condutor: string | null;
  horarioSaida: string | null;
  kmInicial: number | null;
  horarioChegada: string | null;
  kmFinal: number | null;
  destino: string | null;
  observacoes?: string | null;
}

export interface MotoristaDisponivel {
  id: number;
  tipoOrigem: string;
  nome: string;
}

export interface MotoristaAutorizado {
  id: number;
  veiculoId: number;
  placaVeiculo: string | null;
  modeloVeiculo: string | null;
  tipoOrigem: string;
  motoristaId: number;
  nomeMotorista: string;
  numeroCarteira?: string | null;
  categoriaCarteira?: string | null;
  vencimentoCarteira?: string | null;
  arquivoCarteiraPdf?: string | null;
}

export interface MotoristaAutorizadoEntrada {
  veiculoId: number;
  tipoOrigem: string;
  motoristaId: number;
  numeroCarteira?: string | null;
  categoriaCarteira?: string | null;
  vencimentoCarteira?: string | null;
  arquivoCarteiraPdf?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ControleVeiculosService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly urlApiBase = this.runtimeConfig.apiUrl.replace(/\/api\/?$/, '');
  private readonly urlBase = `${this.urlApiBase}/api/controle-veiculos`;

  constructor(private readonly http: HttpClient) {}

  listarVeiculos(): Observable<VeiculoCadastro[]> {
    return this.http.get<VeiculoCadastro[]>(`${this.urlBase}/veiculos`);
  }

  listarRegistros(): Observable<RegistroDiarioBordo[]> {
    return this.http.get<RegistroDiarioBordo[]>(`${this.urlBase}/diario-bordo`);
  }

  criarVeiculo(dados: VeiculoCadastroEntrada): Observable<VeiculoCadastro> {
    return this.http.post<VeiculoCadastro>(`${this.urlBase}/veiculos`, dados);
  }

  atualizarVeiculo(id: number, dados: VeiculoCadastroEntrada): Observable<VeiculoCadastro> {
    return this.http.put<VeiculoCadastro>(`${this.urlBase}/veiculos/${id}`, dados);
  }

  removerVeiculo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlBase}/veiculos/${id}`);
  }

  criarRegistro(dados: RegistroDiarioBordoEntrada): Observable<RegistroDiarioBordo> {
    return this.http.post<RegistroDiarioBordo>(`${this.urlBase}/diario-bordo`, dados);
  }

  atualizarRegistro(id: number, dados: RegistroDiarioBordoEntrada): Observable<RegistroDiarioBordo> {
    return this.http.put<RegistroDiarioBordo>(`${this.urlBase}/diario-bordo/${id}`, dados);
  }

  removerRegistro(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlBase}/diario-bordo/${id}`);
  }

  listarMotoristasDisponiveis(nome?: string): Observable<MotoristaDisponivel[]> {
    const params = nome ? `?nome=${encodeURIComponent(nome)}` : '';
    return this.http.get<MotoristaDisponivel[]>(`${this.urlBase}/motoristas-disponiveis${params}`);
  }

  listarMotoristasAutorizados(veiculoId?: number | null): Observable<MotoristaAutorizado[]> {
    const params = veiculoId ? `?veiculoId=${veiculoId}` : '';
    return this.http.get<MotoristaAutorizado[]>(`${this.urlBase}/motoristas-autorizados${params}`);
  }

  criarMotoristaAutorizado(dados: MotoristaAutorizadoEntrada): Observable<MotoristaAutorizado> {
    return this.http.post<MotoristaAutorizado>(`${this.urlBase}/motoristas-autorizados`, dados);
  }

  atualizarMotoristaAutorizado(
    id: number,
    dados: MotoristaAutorizadoEntrada
  ): Observable<MotoristaAutorizado> {
    return this.http.put<MotoristaAutorizado>(`${this.urlBase}/motoristas-autorizados/${id}`, dados);
  }

  removerMotoristaAutorizado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlBase}/motoristas-autorizados/${id}`);
  }
}
