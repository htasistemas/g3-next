import { DOCUMENT } from '@angular/common';
import { Directive, Inject, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core';

type EstadoBotao = {
  aguardandoReabilitacao: boolean;
  ariaBusyAnterior: string | null;
  bloqueado: boolean;
  deadline: number;
};

@Directive({
  selector: '[appExecucaoUmClique]',
  standalone: true,
})
export class ExecucaoUmCliqueDirective implements OnInit, OnDestroy {
  private readonly estadoPorBotao = new WeakMap<HTMLButtonElement, EstadoBotao>();
  private removerListenerClick?: () => void;
  private readonly intervaloVerificacaoMs = 140;
  private readonly cooldownMinimoMs = 550;
  private readonly timeoutMaximoMs = 20000;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly renderer: Renderer2,
    private readonly zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.zone.runOutsideAngular(() => {
      this.removerListenerClick = this.renderer.listen(this.document, 'click', (event: Event) => {
        this.onClick(event);
      });
    });
  }

  ngOnDestroy(): void {
    this.removerListenerClick?.();
  }

  private onClick(event: Event): void {
    const alvo = event.target as HTMLElement | null;
    const botao = alvo?.closest('button') as HTMLButtonElement | null;
    if (!botao || this.deveIgnorar(botao)) {
      return;
    }

    const estadoAtual = this.estadoPorBotao.get(botao);
    if (estadoAtual?.bloqueado) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    const estado: EstadoBotao = {
      aguardandoReabilitacao: false,
      ariaBusyAnterior: botao.getAttribute('aria-busy'),
      bloqueado: true,
      deadline: Date.now() + this.timeoutMaximoMs,
    };
    this.estadoPorBotao.set(botao, estado);

    this.marcarProcessando(botao);
    this.agendarLiberacao(botao, Date.now() + this.cooldownMinimoMs);
  }

  private agendarLiberacao(botao: HTMLButtonElement, liberacaoMinimaEm: number): void {
    window.setTimeout(() => {
      const estado = this.estadoPorBotao.get(botao);
      if (!estado?.bloqueado) {
        return;
      }

      if (Date.now() >= estado.deadline) {
        this.liberar(botao);
        return;
      }

      if (Date.now() < liberacaoMinimaEm) {
        this.agendarLiberacao(botao, liberacaoMinimaEm);
        return;
      }

      if (botao.disabled) {
        estado.aguardandoReabilitacao = true;
        this.agendarLiberacao(botao, liberacaoMinimaEm);
        return;
      }

      if (estado.aguardandoReabilitacao && !botao.disabled) {
        this.liberar(botao);
        return;
      }

      this.liberar(botao);
    }, this.intervaloVerificacaoMs);
  }

  private marcarProcessando(botao: HTMLButtonElement): void {
    this.renderer.addClass(botao, 'g3-acao-async--loading');
    this.renderer.setAttribute(botao, 'aria-busy', 'true');
  }

  private liberar(botao: HTMLButtonElement): void {
    const estado = this.estadoPorBotao.get(botao);
    this.estadoPorBotao.delete(botao);
    this.renderer.removeClass(botao, 'g3-acao-async--loading');

    if (!estado || estado.ariaBusyAnterior === null) {
      this.renderer.removeAttribute(botao, 'aria-busy');
      return;
    }

    this.renderer.setAttribute(botao, 'aria-busy', estado.ariaBusyAnterior);
  }

  private deveIgnorar(botao: HTMLButtonElement): boolean {
    if (botao.hasAttribute('data-no-async-guard')) {
      return true;
    }
    return botao.closest('[data-no-async-guard="true"]') !== null;
  }
}
