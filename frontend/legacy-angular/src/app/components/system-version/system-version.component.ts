import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTags } from '@fortawesome/free-solid-svg-icons';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { ConfigService, HistoricoVersaoResponse } from '../../services/config.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, finalize, takeUntil, timeout } from 'rxjs';

@Component({
  selector: 'app-system-version',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, TelaPadraoComponent],
  templateUrl: './system-version.component.html',
  styleUrl: './system-version.component.scss'
})
export class SystemVersionComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly faTags = faTags;
  currentVersion = '';
  versaoDisponivel = '';
  historicoVersoes: HistoricoVersaoResponse[] = [];
  carregandoVersao = false;
  carregandoVersaoDisponivel = false;
  carregandoHistorico = false;
  erroVersao: string | null = null;
  erroVersaoDisponivel: string | null = null;
  erroHistorico: string | null = null;
  atualizandoVersao = false;
  feedbackAtualizacao: string | null = null;
  paginaAtual = 1;
  readonly itensPorPagina = 5;
  private versaoAlvo = '';
  private readonly resumoAtualizacao =
    'Cadastro de informações administrativas e controle de permissões em usuários.';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly configService: ConfigService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.recarregarDados();
    this.loadVersaoDisponivel();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.router.url.includes('/configuracoes/versao')) {
          this.recarregarDados();
          this.loadVersaoDisponivel();
        }
      });
  }

  ngAfterViewInit(): void {
    this.recarregarDados();
    this.loadVersaoDisponivel();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private recarregarDados(): void {
    this.loadVersaoAtual();
    this.loadHistorico();
  }

  loadVersaoAtual(): void {
    this.carregandoVersao = true;
    this.erroVersao = null;
    this.configService.getVersaoSistema()
      .pipe(
        timeout(15000),
        finalize(() => {
          this.carregandoVersao = false;
        })
      )
      .subscribe({
      next: (response) => {
        this.currentVersion = response.versao || '';
        this.atualizarVersaoSistemaSeNecessario();
      },
      error: () => {
        this.erroVersao = 'Não foi possível carregar a versão do sistema.';     
      }
    });
  }

  loadHistorico(): void {
    this.carregandoHistorico = true;
    this.erroHistorico = null;
    this.configService.listarHistoricoVersoes()
      .pipe(
        timeout(15000),
        finalize(() => {
          this.carregandoHistorico = false;
        })
      )
      .subscribe({
      next: (response) => {
        this.historicoVersoes = response || [];
        this.paginaAtual = 1;
      },
      error: () => {
        this.erroHistorico = 'Não foi possível carregar o histórico de versões.';
      }
    });
  }

  loadVersaoDisponivel(): void {
    this.carregandoVersaoDisponivel = true;
    this.erroVersaoDisponivel = null;
    this.configService.getVersaoArquivo()
      .pipe(
        timeout(15000),
        finalize(() => {
          this.carregandoVersaoDisponivel = false;
        })
      )
      .subscribe({
      next: (versao) => {
        const versaoLimpa = (versao || '').trim();
        this.versaoDisponivel = versaoLimpa;
        this.versaoAlvo = versaoLimpa;
        this.atualizarVersaoSistemaSeNecessario();
      },
      error: () => {
        this.erroVersaoDisponivel = 'Não foi possível carregar a versão disponível.';
      }
    });
  }

  formatarDataHora(valor: string): string {
    if (!valor) {
      return '';
    }
    const data = new Date(valor);
    return data.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.historicoVersoes.length / this.itensPorPagina));
  }

  get historicoPaginado(): HistoricoVersaoResponse[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    return this.historicoVersoes.slice(inicio, inicio + this.itensPorPagina);
  }

  avancarPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual += 1;
    }
  }

  voltarPagina(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual -= 1;
    }
  }

  private atualizarVersaoSistemaSeNecessario(): void {
    if (!this.versaoAlvo) return;
    if (this.atualizandoVersao) return;
    if (this.currentVersion === this.versaoAlvo) return;

    this.atualizandoVersao = true;
    this.feedbackAtualizacao = null;
    this.configService
      .atualizarVersaoSistema({
        versao: this.versaoAlvo,
        descricao: this.resumoAtualizacao
      })
      .subscribe({
        next: (response) => {
          this.currentVersion = response.versao || this.versaoAlvo;
          this.feedbackAtualizacao = 'Versão atualizada com sucesso.';
          this.loadHistorico();
        },
        error: () => {
          this.feedbackAtualizacao = 'Não foi possível atualizar a versão.';
        },
        complete: () => {
          this.atualizandoVersao = false;
        }
      });
  }

  atualizarSistema(): void {
    if (!this.versaoDisponivel || this.versaoDisponivel === this.currentVersion) {
      return;
    }
    this.feedbackAtualizacao = 'Live update pendente de implementação.';
  }
}
