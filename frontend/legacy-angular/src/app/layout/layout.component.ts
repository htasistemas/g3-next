import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faChevronDown,
  faChevronUp,
  faChevronLeft,
  faChevronRight,
  faRightFromBracket,
  faSun,
  faMoon,
  faUserCircle
} from '@fortawesome/free-solid-svg-icons';
import { menuSections, MenuItem } from './menu-config';
import { AssistanceUnitService } from '../services/assistance-unit.service';
import { ThemeService } from '../services/theme.service';
import { filter, take, takeUntil } from 'rxjs/operators';
import { firstValueFrom, Subject } from 'rxjs';
import { TarefasPendenciasService } from '../services/tarefas-pendencias.service';
import { LembreteDiario, LembretesDiariosService } from '../services/lembretes-diarios.service';
import { ConfigService } from '../services/config.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, FormsModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit, OnDestroy {

  readonly faChevronDown = faChevronDown;
  readonly faChevronUp = faChevronUp;
  readonly faChevronLeft = faChevronLeft;
  readonly faChevronRight = faChevronRight;
  readonly faRightFromBracket = faRightFromBracket;
  readonly faUserCircle = faUserCircle;
  readonly faSun = faSun;
  readonly faMoon = faMoon;
  pageTitle = 'Visao geral';
  get activeUnitLogo$() {
    return this.assistanceUnitService.currentUnitLogo$;
  }
  private destroy$ = new Subject<void>();
  isSidebarCollapsed = true;

  openSection: string | null = null;

  menuSections: MenuItem[] = [];
  tarefasAbertas = 0;
  tarefasVencidas = 0;
  private tarefasRefreshId?: ReturnType<typeof setInterval>;
  lembretesPendentes: LembreteDiario[] = [];
  lembretesAtrasados: LembreteDiario[] = [];
  lembretesAbertos = false;
  lembreteSelecionado: LembreteDiario | null = null;
  adiarAberto = false;
  adiarData = '';
  adiarHora = '';
  versaoSistema = '';
  private lembretesRefreshId?: ReturnType<typeof setInterval>;

  constructor(
    private readonly auth: AuthService,
    private readonly assistanceUnitService: AssistanceUnitService,
    public readonly themeService: ThemeService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly tarefasService: TarefasPendenciasService,
    private readonly lembretesService: LembretesDiariosService,
    private readonly configService: ConfigService
  ) {}

  ngOnInit(): void {
    this.menuSections = this.filtrarMenuPorPermissoes(menuSections);
    const initialRoute = this.findDeepestChild(this.activatedRoute);
    this.pageTitle = initialRoute.snapshot.data['title'] || 'Visao geral';

    this.assistanceUnitService
      .carregarUnidadeAtual()
      .pipe(take(1))
      .subscribe({
        error: () => {
          this.assistanceUnitService.setActiveUnit('Navegação', null);
        }
      });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const deepest = this.findDeepestChild(this.activatedRoute);
        this.pageTitle = deepest.snapshot.data['title'] || 'Visao geral';
      });

    this.carregarResumoTarefas();
    this.tarefasRefreshId = setInterval(() => {
      this.carregarResumoTarefas();
    }, 30000);

    this.carregarResumoLembretes();
    this.lembretesRefreshId = setInterval(() => {
      this.carregarResumoLembretes();
    }, 30000);

    this.carregarVersaoSistema();
  }

  get username(): string {
    const usuario = this.auth.user();
    return usuario?.nome ?? usuario?.nomeUsuario ?? 'Admin';
  }

  toggleSection(label: string): void {
    if (this.isSidebarCollapsed) {
      this.isSidebarCollapsed = false;
      this.openSection = label;
      return;
    }
    this.openSection = this.openSection === label ? null : label;
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    this.auth.logout();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  get themeLabel(): 'Claro' | 'Escuro' {
    return this.themeService.currentTheme() === 'dark' ? 'Escuro' : 'Claro';
  }

  ngOnDestroy(): void {
    if (this.tarefasRefreshId) {
      clearInterval(this.tarefasRefreshId);
    }
    if (this.lembretesRefreshId) {
      clearInterval(this.lembretesRefreshId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  abrirTarefas(): void {
    this.router.navigate(['administrativo/tarefas']);
  }

  abrirTarefasAbertas(): void {
    this.router.navigate(['administrativo/tarefas'], { queryParams: { filtro: 'abertas' } });
  }

  abrirTarefasVencidas(): void {
    this.router.navigate(['administrativo/tarefas'], { queryParams: { filtro: 'vencidas' } });
  }

  abrirLembretes(): void {
    this.router.navigate(['administrativo/lembretes-diarios']);
  }

  abrirLembretesDiarios(): void {
    this.router.navigate(['administrativo/lembretes-diarios'], { queryParams: { aba: 'lembretesCriados' } });
  }

  fecharLembretes(): void {
    this.lembretesAbertos = false;
  }

  concluirLembrete(lembrete: LembreteDiario): void {
    this.lembretesService.concluir(lembrete.id).subscribe({
      next: () => this.carregarResumoLembretes()
    });
  }

  abrirAdiarLembrete(lembrete: LembreteDiario): void {
    this.lembreteSelecionado = lembrete;
    this.adiarData = '';
    this.adiarHora = '09:00';
    this.adiarAberto = true;
  }

  fecharAdiarLembrete(): void {
    this.adiarAberto = false;
    this.adiarData = '';
    this.adiarHora = '';
  }

  confirmarAdiarLembrete(): void {
    if (!this.lembreteSelecionado || !this.adiarData || !this.adiarHora) return;
    const dataHora = `${this.adiarData}T${this.adiarHora}:00`;
    this.lembretesService.adiar(this.lembreteSelecionado.id, { novaDataHora: dataHora }).subscribe({
      next: () => {
        this.carregarResumoLembretes();
        this.fecharAdiarLembrete();
      }
    });
  }

  private findDeepestChild(route: ActivatedRoute): ActivatedRoute {
    let child: ActivatedRoute = route;

    while (child.firstChild) {
      child = child.firstChild;
    }

    return child;
  }

  private filtrarMenuPorPermissoes(sections: MenuItem[]): MenuItem[] {
    const permissoes = this.auth.user()?.permissoes ?? [];
    return sections
      .map((section) => {
        const children =
          section.children?.filter((child) => {
            if (!child.permissao) return true;
            return permissoes.includes(child.permissao);
          }) ?? [];
        return { ...section, children };
      })
      .filter((section) => (section.children ?? []).length > 0);
  }

  private carregarResumoTarefas(): void {
    this.tarefasService.list().subscribe({
      next: (tarefas) => {
        const abertas = tarefas.filter((item) => item.status !== 'Concluída');
        this.tarefasAbertas = abertas.length;
        this.tarefasVencidas = abertas.filter((item) => {
          const prazo = new Date(item.prazo ?? '');
          if (Number.isNaN(prazo.getTime())) return false;
          return prazo < new Date();
        }).length;
      },
      error: () => {
        this.tarefasAbertas = 0;
        this.tarefasVencidas = 0;
      }
    });
  }

  private carregarResumoLembretes(): void {
    const usuarioId = this.usuarioIdAtual();
    this.lembretesService.listar(usuarioId ?? undefined).subscribe({
      next: (lembretes: LembreteDiario[]) => {
        const agora = new Date();
        const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0);
        const pendentes = (lembretes ?? []).filter((item: LembreteDiario) => {
          if (item.status !== 'PENDENTE') return false;
          const execucao = new Date(item.proximaExecucaoEm);
          return execucao <= agora;
        });
        this.lembretesAtrasados = pendentes.filter((item: LembreteDiario) => {
          const execucao = new Date(item.proximaExecucaoEm);
          return execucao < inicioHoje;
        });
        this.lembretesPendentes = pendentes;
      },
      error: () => {
        this.lembretesPendentes = [];
        this.lembretesAtrasados = [];
      }
    });
  }

  private usuarioIdAtual(): number | null {
    const usuario = this.auth.user();
    if (!usuario?.id) return null;
    const id = Number(usuario.id);
    return Number.isNaN(id) ? null : id;
  }

  private carregarVersaoSistema(): void {
    firstValueFrom(this.configService.getVersaoSistema())
      .then((response) => {
        const versao = (response?.versao || '').trim();
        if (versao) {
          this.versaoSistema = versao;
          return;
        }
        return this.carregarVersaoArquivo();
      })
      .catch(() => this.carregarVersaoArquivo());
  }

  private carregarVersaoArquivo(): Promise<void> {
    return firstValueFrom(this.configService.getVersaoArquivo())
      .then((versao) => {
        const normalizado = (versao || '').trim();
        if (normalizado) {
          this.versaoSistema = normalizado;
          return;
        }
        return this.carregarVersaoLocal();
      })
      .catch(() => this.carregarVersaoLocal());
  }

  private carregarVersaoLocal(): Promise<void> {
    return firstValueFrom(this.configService.getVersaoLocal())
      .then((versao) => {
        this.versaoSistema = (versao || '').trim();
      })
      .catch(() => {
        this.versaoSistema = '';
      });
  }

}
