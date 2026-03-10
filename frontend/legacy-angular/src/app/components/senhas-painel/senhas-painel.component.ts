import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { SenhasRealtimeService, SenhaEventoResponse } from '../../services/senhas-realtime.service';
import { SenhasService, SenhaChamadaResponse } from '../../services/senhas.service';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { NoticiasAssistenciaService } from '../../services/noticias-assistencia.service';
import { SenhasConfigService } from '../../services/senhas-config.service';
import { AssistanceUnitService, AssistanceUnitPayload } from '../../services/assistance-unit.service';

@Component({
  selector: 'app-senhas-painel',
  standalone: true,
  imports: [CommonModule, TelaPadraoComponent],
  templateUrl: './senhas-painel.component.html',
  styleUrl: './senhas-painel.component.scss'
})
export class SenhasPainelComponent implements OnInit, OnDestroy {
  chamadaAtual: SenhaChamadaResponse | null = null;
  ultimasChamadas: SenhaChamadaResponse[] = [];
  private assinatura?: Subscription;
  private refreshId?: ReturnType<typeof setInterval>;
  private relogioId?: ReturnType<typeof setInterval>;
  private noticiasId?: ReturnType<typeof setInterval>;
  unidadeId: number | null = null;
  horaAtual = new Date();
  nomeInstituicao = 'SISTEMA G3';
  nomeUnidadePainel: string | null = null;
  noticiasTicker: string[] = [];
  private ultimaChamadaId: string | null = null;
  fraseFala = 'Beneficiário {beneficiario} dirija-se a {sala} para atendimento.';
  velocidadeTicker = 60;
  modoNoticias: 'RSS' | 'MANUAL' = 'RSS';
  noticiasManuais = '';
  quantidadeUltimasChamadas = 4;
  unidadePainelId: number | null = null;

  constructor(
    private readonly senhasService: SenhasService,
    private readonly realtime: SenhasRealtimeService,
    private readonly route: ActivatedRoute,
    private readonly noticiasService: NoticiasAssistenciaService,
    private readonly configService: SenhasConfigService,
    private readonly unidadeService: AssistanceUnitService,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarPainel();
    this.route.queryParamMap.subscribe((params) => {
      const unidadeId = params.get('unidadeId');
      this.unidadeId = unidadeId ? Number(unidadeId) : null;
      this.carregarPainel();
    });

    this.assinatura = this.realtime.conectar().subscribe((evento: SenhaEventoResponse) => {
      if (evento?.evento === 'CHAMADA_SENHA') {
        this.zone.run(() => {
          const chamada = this.normalizarChamada(evento.dados);
          this.chamadaAtual = chamada;
          this.atualizarLista(chamada);
          this.falarChamada(chamada);
        });
      }
    });

    this.refreshId = setInterval(() => {
      this.carregarPainel();
    }, 5000);

    this.relogioId = setInterval(() => {
      this.horaAtual = new Date();
    }, 1000);

    this.carregarConfiguracoes();
  }

  ngOnDestroy(): void {
    this.assinatura?.unsubscribe();
    this.realtime.desconectar();
    if (this.refreshId) {
      clearInterval(this.refreshId);
    }
    if (this.relogioId) {
      clearInterval(this.relogioId);
    }
    if (this.noticiasId) {
      clearInterval(this.noticiasId);
    }
  }

  private carregarPainel(): void {
    this.senhasService.painel(this.unidadeId ?? undefined, this.quantidadeUltimasChamadas).subscribe({
      next: (lista) => {
        this.zone.run(() => {
          const normalizadas = (Array.isArray(lista) ? lista : []).map((item) => this.normalizarChamada(item));
          if (normalizadas.length > 0) {
            this.ultimasChamadas = normalizadas.slice(0, this.quantidadeUltimasChamadas);
            const chamadaAtiva =
              this.ultimasChamadas.find((item) => item.status === 'CHAMADO') ?? this.ultimasChamadas[0];
            this.chamadaAtual = chamadaAtiva ?? null;
            if (chamadaAtiva) {
              this.falarChamada(chamadaAtiva);
            }
            this.cdr.detectChanges();
            return;
          }
          this.tentarCarregarSemFiltro();
          this.senhasService.atual(this.unidadeId ?? undefined).subscribe({
            next: (chamada) => {
              const atualizada = chamada ? this.normalizarChamada(chamada) : null;
              if (!atualizada) {
                return;
              }
              this.chamadaAtual = atualizada;
              if (this.ultimasChamadas.length === 0) {
                this.ultimasChamadas = [atualizada];
              }
              this.falarChamada(atualizada);
              this.cdr.detectChanges();
            },
            error: () => {}
          });
        });
      },
      error: () => {
        this.tentarCarregarSemFiltro();
        this.senhasService.atual(this.unidadeId ?? undefined).subscribe({
          next: (chamada) => {
            this.zone.run(() => {
              const atualizada = chamada ? this.normalizarChamada(chamada) : null;
              if (!atualizada) {
                return;
              }
              this.chamadaAtual = atualizada;
              if (this.ultimasChamadas.length === 0) {
                this.ultimasChamadas = [atualizada];
              }
              this.falarChamada(atualizada);
              this.cdr.detectChanges();
            });
          },
          error: () => {}
        });
      }
    });
  }

  private atualizarLista(chamada: SenhaChamadaResponse): void {
    const atualizadas = [chamada, ...this.ultimasChamadas.filter((item) => item.id !== chamada.id)];
    const limite = this.quantidadeUltimasChamadas || 4;
    this.ultimasChamadas = atualizadas.slice(0, limite);
  }

  private falarChamada(chamada: SenhaChamadaResponse): void {
    if (!chamada?.id || this.ultimaChamadaId === chamada.id) {
      return;
    }
    this.ultimaChamadaId = chamada.id;
    const mensagem = this.fraseFala
      .replace('{beneficiario}', chamada.nomeBeneficiario)
      .replace('{sala}', chamada.localAtendimento);

    if (!('speechSynthesis' in window)) {
      console.warn('[senhas-painel] Navegador sem suporte a fala.');
      return;
    }

    const synth = window.speechSynthesis;
    console.info('[senhas-painel] Disparando fala:', mensagem);
    const falar = () => {
      const vozes = synth.getVoices();
      const vozGoogle = vozes.find(
        (voz) => voz.lang?.toLowerCase().startsWith('pt') && voz.name?.toLowerCase().includes('google')
      );
      const vozPt = vozes.find((voz) => voz.lang?.toLowerCase().startsWith('pt'));
      const utter = new SpeechSynthesisUtterance(mensagem);
      utter.lang = 'pt-BR';
      utter.voice = vozGoogle || vozPt || null;
      utter.rate = 0.95;
      synth.cancel();
      synth.speak(utter);
    };

    if (synth.getVoices().length === 0) {
      setTimeout(falar, 400);
      return;
    }
    falar();
  }

  private carregarNoticias(): void {
    if (this.modoNoticias === 'MANUAL') {
      this.noticiasTicker = this.converterNoticiasManuais();
      return;
    }
    this.noticiasService.listar(12, null).subscribe({
      next: (noticias) => {
        this.noticiasTicker = noticias.map((item) => item.titulo);
      },
      error: () => {
        if (this.noticiasTicker.length === 0) {
          this.noticiasTicker = ['Aguardando atualizacao das noticias da assistencia social.'];
        }
      }
    });
  }

  private carregarConfiguracoes(): void {
    this.configService.obter().subscribe({
      next: (config) => {
        this.fraseFala = config.fraseFala;
        this.velocidadeTicker = config.velocidadeTicker;
        this.modoNoticias = (config.modoNoticias as 'RSS' | 'MANUAL') ?? 'RSS';
        this.noticiasManuais = config.noticiasManuais ?? '';
        this.quantidadeUltimasChamadas =
          config.quantidadeUltimasChamadas ?? this.quantidadeUltimasChamadas;
        this.unidadePainelId = config.unidadePainelId ?? null;
        this.carregarNomeUnidadePainel();
        this.configurarAtualizacaoNoticias(config.rssUrl);
      }
    });
  }

  private carregarNoticiasComFonte(rssUrl: string): void {
    if (this.modoNoticias === 'MANUAL') {
      this.noticiasTicker = this.converterNoticiasManuais();
      return;
    }
    this.noticiasService.listar(12, rssUrl).subscribe({
      next: (noticias) => {
        this.noticiasTicker = noticias.map((item) => item.titulo);
      },
      error: () => {
        if (this.noticiasTicker.length === 0) {
          this.noticiasTicker = ['Aguardando atualizacao das noticias da assistencia social.'];
        }
      }
    });
  }

  private configurarAtualizacaoNoticias(rssUrl: string): void {
    if (this.noticiasId) {
      clearInterval(this.noticiasId);
      this.noticiasId = undefined;
    }
    if (this.modoNoticias === 'MANUAL') {
      this.noticiasTicker = this.converterNoticiasManuais();
      return;
    }
    this.carregarNoticiasComFonte(rssUrl);
    this.noticiasId = setInterval(() => {
      this.carregarNoticiasComFonte(rssUrl);
    }, 300000);
  }

  private converterNoticiasManuais(): string[] {
    const linhas = (this.noticiasManuais || '')
      .split(/[\n;]/)
      .map((linha) => linha.trim())
      .filter((linha) => linha.length > 0);
    return linhas.length ? linhas : ['Aguardando novas noticias.'];
  }

  private normalizarChamada(payload: SenhaChamadaResponse | any): SenhaChamadaResponse {
    if (!payload) {
      return payload as SenhaChamadaResponse;
    }
    return {
      id: payload.id,
      filaId: payload.filaId ?? payload.fila_id,
      beneficiarioId: payload.beneficiarioId ?? payload.beneficiario_id,
      nomeBeneficiario: payload.nomeBeneficiario ?? payload.nome_beneficiario ?? '',
      localAtendimento: payload.localAtendimento ?? payload.local_atendimento ?? '',
      status: payload.status,
      dataHoraChamada: payload.dataHoraChamada ?? payload.data_hora_chamada,
      unidadeId: payload.unidadeId ?? payload.unidade_id,
      chamadoPor: payload.chamadoPor ?? payload.chamado_por
    } as SenhaChamadaResponse;
  }

  private tentarCarregarSemFiltro(): void {
    if (this.unidadeId == null) {
      return;
    }
    const limite = this.quantidadeUltimasChamadas || 4;
    this.senhasService.painel(undefined, limite).subscribe({
      next: (lista) => {
        const normalizadas = lista.map((item) => this.normalizarChamada(item));
        if (normalizadas.length === 0) {
          return;
        }
        this.ultimasChamadas = normalizadas.slice(0, limite);
        const chamadaAtiva =
          this.ultimasChamadas.find((item) => item.status === 'CHAMADO') ?? this.ultimasChamadas[0];
        this.chamadaAtual = chamadaAtiva ?? null;
      },
      error: () => {}
    });
  }

  private carregarNomeUnidadePainel(): void {
    if (!this.unidadePainelId) {
      this.nomeUnidadePainel = null;
      this.cdr.detectChanges();
      return;
    }
    this.unidadeService.list().subscribe({
      next: (unidades: AssistanceUnitPayload[]) => {
        const unidade = unidades.find((item) => item.id === this.unidadePainelId);
        this.nomeUnidadePainel = unidade?.nomeFantasia ?? null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.nomeUnidadePainel = null;
      }
    });
  }

}

