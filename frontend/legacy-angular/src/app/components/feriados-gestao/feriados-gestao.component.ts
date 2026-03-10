import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendarDay } from '@fortawesome/free-solid-svg-icons';
import { FeriadoPayload, FeriadoService } from '../../services/feriado.service';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { concatMap, from, finalize } from 'rxjs';

interface StepTab {
  id: string;
  label: string;
}

@Component({
  selector: 'app-feriados-gestao',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule, TelaPadraoComponent, PopupMessagesComponent],
  templateUrl: './feriados-gestao.component.html',
  styleUrl: './feriados-gestao.component.scss'
})
export class FeriadosGestaoComponent extends TelaBaseComponent implements OnInit {
  readonly faCalendarDay = faCalendarDay;
  form: FormGroup;
  filtroForm: FormGroup;
  feriados: FeriadoPayload[] = [];
  feriadosFiltrados: FeriadoPayload[] = [];
  feriadoSelecionado: FeriadoPayload | null = null;
  editingId: string | null = null;
  saving = false;
  popupErros: string[] = [];
  popupTitulo = 'Aviso';
  private importacaoExecutada = false;
  anosDisponiveis: number[] = [];
  anoSelecionado = new Date().getFullYear();

  private readonly feriadosImportados: FeriadoPayload[] = [
    { data: '2026-01-01', descricao: 'Confraternização Universal - Ano Novo' },
    { data: '2026-02-13', descricao: 'Carnaval' },
    { data: '2026-03-29', descricao: 'Sexta-Feira Santa' },
    { data: '2026-03-31', descricao: 'Páscoa' },
    { data: '2026-04-21', descricao: 'Tiradentes' },
    { data: '2026-05-01', descricao: 'Dia do Trabalhador' },
    { data: '2026-09-07', descricao: 'Independência' },
    { data: '2026-10-12', descricao: 'Nossa Senhora Aparecida' },
    { data: '2026-11-02', descricao: 'Finados' },
    { data: '2026-11-15', descricao: 'Proclamação da República' },
    { data: '2026-12-25', descricao: 'Natal' }
  ];

  tabs: StepTab[] = [
    { id: 'cadastro', label: 'Cadastro de feriados' },
    { id: 'listagem', label: 'Feriados cadastrados' }
  ];
  activeTab = 'cadastro';

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    buscar: true,
    novo: true,
    salvar: true,
    cancelar: true,
    excluir: true,
    imprimir: true
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly feriadoService: FeriadoService
  ) {
    super();
    this.form = this.fb.group({
      data: ['', Validators.required],
      descricao: ['', Validators.required]
    });
    this.filtroForm = this.fb.group({
      ano: [this.anoSelecionado],
      data: [''],
      descricao: ['']
    });
  }

  ngOnInit(): void {
    this.anosDisponiveis = this.gerarAnosDisponiveis();
    this.carregarFeriados();
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.saving,
      cancelar: this.saving,
      novo: this.saving,
      excluir: !this.editingId,
      imprimir: this.saving,
      buscar: this.saving
    };
  }

  get activeTabIndex(): number {
    return this.tabs.findIndex((tab) => tab.id === this.activeTab);
  }

  get hasNextTab(): boolean {
    return this.activeTabIndex < this.tabs.length - 1;
  }

  get hasPreviousTab(): boolean {
    return this.activeTabIndex > 0;
  }

  get nextTabLabel(): string {
    return this.hasNextTab ? this.tabs[this.activeTabIndex + 1].label : '';
  }

  changeTab(tab: string): void {
    this.activeTab = tab;
  }

  goToNextTab(): void {
    if (this.hasNextTab) {
      this.changeTab(this.tabs[this.activeTabIndex + 1].id);
    }
  }

  goToPreviousTab(): void {
    if (this.hasPreviousTab) {
      this.changeTab(this.tabs[this.activeTabIndex - 1].id);
    }
  }

  submit(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.popupTitulo = 'Campos obrigatórios';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatórios antes de salvar.')
        .build();
      return;
    }
    this.saving = true;
    const payload: FeriadoPayload = {
      data: this.form.value.data,
      descricao: this.form.value.descricao
    };

    if (this.editingId) {
      this.feriadoService.atualizar(this.editingId, payload).subscribe({
        next: () => {
          this.popupTitulo = 'Sucesso';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Feriado atualizado com sucesso.')
            .build();
          this.carregarFeriados();
          this.resetForm();
        },
        error: () => {
          this.popupTitulo = 'Erro ao salvar';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível salvar o feriado.')
            .build();
        },
        complete: () => {
          this.saving = false;
        }
      });
      return;
    }

    this.feriadoService.criar(payload).subscribe({
      next: () => {
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Feriado cadastrado com sucesso.')
          .build();
        this.carregarFeriados();
        this.resetForm();
      },
      error: () => {
        this.popupTitulo = 'Erro ao salvar';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível salvar o feriado.')
          .build();
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  excluirSelecionado(): void {
    if (!this.editingId) return;
    this.feriadoService.excluir(this.editingId).subscribe({
      next: () => {
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Feriado excluído com sucesso.')
          .build();
        this.carregarFeriados();
        this.resetForm();
      },
      error: () => {
        this.popupTitulo = 'Erro ao excluir';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível excluir o feriado.')
          .build();
      }
    });
  }

  startNew(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.form.reset({ data: '', descricao: '' });
    this.editingId = null;
    this.feriadoSelecionado = null;
    this.changeTab('cadastro');
  }

  onBuscar(): void {
    this.changeTab('listagem');
  }

  closeForm(): void {
    window.history.back();
  }

  fecharPopupErros(): void {
    this.popupErros = [];
  }

  aplicarFiltro(): void {
    const anoFiltro = this.filtroForm.value.ano;
    const filtroData = (this.filtroForm.value.data || '').trim();
    const filtroDescricao = (this.filtroForm.value.descricao || '').trim().toLowerCase();
    this.feriadosFiltrados = this.feriados.filter((feriado) => {
      if (anoFiltro) {
        const anoFeriado = Number(feriado.data?.slice(0, 4));
        if (anoFeriado && anoFeriado !== Number(anoFiltro)) return false;
      }
      const dataOk = !filtroData || feriado.data === filtroData;
      const descOk =
        !filtroDescricao || (feriado.descricao || '').toLowerCase().includes(filtroDescricao);
      return dataOk && descOk;
    });
  }

  limparFiltro(): void {
    this.filtroForm.reset({ ano: this.anoSelecionado, data: '', descricao: '' });
    this.feriadosFiltrados = [...this.feriados];
  }

  selecionarFeriado(feriado: FeriadoPayload): void {
    this.feriadoSelecionado = feriado;
    this.editingId = feriado.id ?? null;
    this.form.patchValue({
      data: feriado.data,
      descricao: feriado.descricao
    });
    this.changeTab('cadastro');
  }

  imprimirLista(): void {
    const linhas = this.feriadosFiltrados.length ? this.feriadosFiltrados : this.feriados;
    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) return;
    const linhasHtml = linhas
      .map(
        (item) =>
          `<tr><td>${item.data}</td><td>${item.descricao}</td></tr>`
      )
      .join('');
    w.document.write(`
      <html>
        <head>
          <title>Relatório de feriados</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: Arial, sans-serif; font-size: 12pt; color: #000; }
            h1 { font-size: 14pt; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 6px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Relatório de feriados</h1>
          <table>
            <thead>
              <tr><th>Data</th><th>Descrição</th></tr>
            </thead>
            <tbody>${linhasHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.onload = () => w.print();
  }

  private carregarFeriados(): void {
    this.feriadoService.listar().subscribe({
      next: (feriados) => {
        this.feriados = feriados ?? [];
        this.feriadosFiltrados = [...this.feriados];
        this.importarFeriadosSeNecessario();
      },
      error: () => {
        this.feriados = [];
        this.feriadosFiltrados = [];
        this.popupTitulo = 'Erro ao carregar';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível carregar os feriados.')
          .build();
      }
    });
  }

  private importarFeriadosSeNecessario(): void {
    if (this.importacaoExecutada) return;
    this.importacaoExecutada = true;
    const chaveExistente = new Set(
      this.feriados.map((feriado) => `${feriado.data}|${feriado.descricao}`.toLowerCase().trim())
    );
    const ano = this.anoSelecionado;
    this.feriadoService.listarPublicos(ano, 'BR').subscribe({
      next: (feriadosPublicos: FeriadoPayload[]) => {
        const base = feriadosPublicos.length ? feriadosPublicos : this.feriadosImportados;
        const faltantes = base.filter(
          (feriado: FeriadoPayload) => !chaveExistente.has(`${feriado.data}|${feriado.descricao}`.toLowerCase().trim())
        );
        if (!faltantes.length) return;
        from(faltantes)
          .pipe(
            concatMap((feriado) => this.feriadoService.criar(feriado)),
            finalize(() => this.carregarFeriados())
          )
          .subscribe({
            error: () => {
              this.popupTitulo = 'Erro ao importar';
              this.popupErros = new PopupErrorBuilder()
                .adicionar('Não foi possível importar todos os feriados.')
                .build();
            }
          });
      },
      error: () => {
        this.popupTitulo = 'Erro ao importar';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível importar os feriados públicos.')
          .build();
      }
    });
  }

  onAnoChange(): void {
    this.anoSelecionado = Number(this.filtroForm.value.ano || new Date().getFullYear());
    this.importacaoExecutada = false;
    this.carregarFeriados();
  }

  private gerarAnosDisponiveis(): number[] {
    const anoAtual = new Date().getFullYear();
    return [anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2];
  }
}
