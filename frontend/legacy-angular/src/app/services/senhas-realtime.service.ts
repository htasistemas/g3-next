import { Injectable, inject } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';
import { SenhaChamadaResponse } from './senhas.service';
import { RuntimeConfigService } from './runtime-config.service';

export interface SenhaEventoResponse {
  evento: string;
  dados: SenhaChamadaResponse;
}

@Injectable({ providedIn: 'root' })
export class SenhasRealtimeService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private cliente: Client | null = null;
  private assunto = new Subject<SenhaEventoResponse>();

  conectar(): Observable<SenhaEventoResponse> {
    if (!this.cliente) {
      this.criarCliente();
    }
    return this.assunto.asObservable();
  }

  desconectar(): void {
    if (this.cliente) {
      this.cliente.deactivate();
      this.cliente = null;
    }
  }

  private criarCliente(): void {
    const url = `${this.runtimeConfig.apiUrl}/ws`;
    this.cliente = new Client({
      webSocketFactory: () => new SockJS(url),
      reconnectDelay: 5000
    });

    this.cliente.onConnect = () => {
      this.cliente?.subscribe('/topic/senhas', (mensagem: IMessage) => {
        try {
          const payload = JSON.parse(mensagem.body) as SenhaEventoResponse;
          this.assunto.next(payload);
        } catch {
          // Ignorar mensagens invalidas
        }
      });
    };

    this.cliente.activate();
  }
}
