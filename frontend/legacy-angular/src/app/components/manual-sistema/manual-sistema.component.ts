import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBook, faChevronDown, faChevronUp, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import {
  ManualSistemaMudanca,
  ManualSistemaSecao,
  ManualSistemaSecaoResumo,
  ManualSistemaService
} from '../../services/manual-sistema.service';

@Component({
  selector: 'app-manual-sistema',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    TelaPadraoComponent
  ],
  templateUrl: './manual-sistema.component.html',
  styleUrl: './manual-sistema.component.scss'
})
export class ManualSistemaComponent implements OnInit, OnDestroy {
  readonly faBook = faBook;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faChevronDown = faChevronDown;
  readonly faChevronUp = faChevronUp;

  termoPesquisa = '';
  secoesResumo: ManualSistemaSecaoResumo[] = [];
  secoesCarregadas = new Map<string, ManualSistemaSecao>();
  conteudosSeguros = new Map<string, string>();
  secoesAbertas = new Set<string>();
  carregandoResumo = false;
  carregandoChangelog = false;
  buscandoConteudo = false;
  erroResumo: string | null = null;
  erroChangelog: string | null = null;
  ultimaAtualizacao: string | null = null;
  changelog: ManualSistemaMudanca[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly manualService: ManualSistemaService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.carregarResumo();
    this.carregarChangelog();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get secoesFiltradas(): ManualSistemaSecaoResumo[] {
    const termo = this.normalizarTexto(this.termoPesquisa);
    if (!termo) {
      return this.secoesOrdenadas(this.secoesResumo);
    }

    return this.secoesOrdenadas(
      this.secoesResumo.filter((secao) => {
        const titulo = this.normalizarTexto(secao.titulo);
        const tags = this.normalizarTexto(secao.tags || '');
        const conteudo = this.normalizarTexto(this.obterTextoConteudo(secao.slug));
        return (
          titulo.includes(termo) ||
          tags.includes(termo) ||
          conteudo.includes(termo)
        );
      })
    );
  }

  aoAlterarPesquisa(): void {
    const termo = this.normalizarTexto(this.termoPesquisa);
    if (termo.length >= 3) {
      this.carregarConteudosParaBusca();
    }
  }

  limparPesquisa(): void {
    this.termoPesquisa = '';
  }

  alternarSecao(slug: string): void {
    if (this.secoesAbertas.has(slug)) {
      this.secoesAbertas.delete(slug);
      return;
    }

    this.secoesAbertas.add(slug);
    if (!this.secoesCarregadas.has(slug)) {
      this.carregarSecao(slug);
    }
  }

  secaoAberta(slug: string): boolean {
    return this.secoesAbertas.has(slug);
  }

  irParaSecao(slug: string): void {
    this.secoesAbertas.add(slug);
    if (!this.secoesCarregadas.has(slug)) {
      this.carregarSecao(slug, () => this.rolarParaSecao(slug));
      return;
    }
    this.rolarParaSecao(slug);
  }

  obterConteudoSeguro(slug: string): string | null {
    return this.conteudosSeguros.get(slug) || null;
  }

  voltarParaConfiguracoes(): void {
    this.router.navigate(['/configuracoes/parametros']);
  }

  formatarDataHora(valor?: string | null): string {
    if (!valor) {
      return '--';
    }
    const data = new Date(valor);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private carregarResumo(): void {
    this.carregandoResumo = true;
    this.erroResumo = null;
    this.manualService
      .buscarResumo()
      .pipe(
        finalize(() => {
          this.carregandoResumo = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (resumo) => {
          this.secoesResumo = resumo.secoes || [];
          this.ultimaAtualizacao = resumo.ultimaAtualizacao
            ? this.formatarDataHora(resumo.ultimaAtualizacao)
            : null;
          if (this.secoesResumo.length > 0) {
            const primeira = this.secoesResumo[0];
            this.secoesAbertas.add(primeira.slug);
            this.carregarSecao(primeira.slug);
          }
        },
        error: () => {
          this.erroResumo = 'Não foi possível carregar o manual do sistema.';
        }
      });
  }

  private carregarChangelog(): void {
    this.carregandoChangelog = true;
    this.erroChangelog = null;
    this.manualService
      .buscarChangelog(8)
      .pipe(
        finalize(() => {
          this.carregandoChangelog = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.changelog = response.mudancas || [];
        },
        error: () => {
          this.erroChangelog = 'Não foi possível carregar o histórico de mudanças.';
        }
      });
  }

  private carregarSecao(slug: string, aoCarregar?: () => void): void {
    this.manualService
      .buscarSecao(slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (secao) => {
          this.secoesCarregadas.set(slug, secao);
          this.conteudosSeguros.set(slug, secao.conteudo || '');
          if (aoCarregar) {
            aoCarregar();
          }
        },
        error: () => {
          this.conteudosSeguros.set(slug, '<p>Não foi possível carregar esta seção.</p>');
        }
      });
  }

  private carregarConteudosParaBusca(): void {
    const pendentes = this.secoesResumo.filter((secao) => !this.secoesCarregadas.has(secao.slug));
    if (pendentes.length === 0 || this.buscandoConteudo) {
      return;
    }
    this.buscandoConteudo = true;
    let carregados = 0;
    pendentes.forEach((secao) => {
      this.manualService
        .buscarSecao(secao.slug)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (secaoCompleta) => {
            this.secoesCarregadas.set(secao.slug, secaoCompleta);
            this.conteudosSeguros.set(secao.slug, secaoCompleta.conteudo || '');
          },
          error: () => {
            this.conteudosSeguros.set(secao.slug, '<p>Conteúdo indisponível.</p>');
          },
          complete: () => {
            carregados += 1;
            if (carregados === pendentes.length) {
              this.buscandoConteudo = false;
            }
          }
        });
    });
  }

  private rolarParaSecao(slug: string): void {
    const alvo = document.getElementById(this.obterIdSecao(slug));
    if (alvo) {
      alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private obterIdSecao(slug: string): string {
    return `manual-secao-${slug}`;
  }

  private obterTextoConteudo(slug: string): string {
    const secao = this.secoesCarregadas.get(slug);
    if (!secao?.conteudo) {
      return '';
    }
    return secao.conteudo.replace(/<[^>]+>/g, ' ');
  }

  private secoesOrdenadas(secoes: ManualSistemaSecaoResumo[]): ManualSistemaSecaoResumo[] {
    return [...secoes].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }

  private normalizarTexto(valor: string): string {
    return (valor || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }
}




