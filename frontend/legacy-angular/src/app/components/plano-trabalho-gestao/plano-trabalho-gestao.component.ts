import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  PlanoTrabalhoService,
  PlanoTrabalho,
  PlanoTrabalhoPayload,
  PlanoStatus
} from '../../services/plano-trabalho.service';
import { TermoFomentoPayload, TermoFomentoService } from '../../services/termo-fomento.service';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { titleCaseWords } from '../../utils/capitalization.util';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClipboardCheck } from '@fortawesome/free-solid-svg-icons';

import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
interface StepTab {
  id: string;
  label: string;
}

@Component({
  selector: 'app-plano-trabalho-gestao',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule, TelaPadraoComponent, PopupMessagesComponent],
  templateUrl: './plano-trabalho-gestao.component.html',
  styleUrl: './plano-trabalho-gestao.component.scss'
})
export class PlanoTrabalhoGestaoComponent extends TelaBaseComponent implements OnInit {
  readonly faClipboardCheck = faClipboardCheck;
  form: FormGroup;
  activeTab = 'identificacao';
  saving = false;
  editingId: string | null = null;
  popupErros: string[] = [];
  private popupTimeout?: ReturnType<typeof setTimeout>;

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({    
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true,
    imprimir: true,
    buscar: true
  });

  tabs: StepTab[] = [
    { id: 'identificacao', label: 'Identificação' },
    { id: 'vinculo', label: 'Vinculação ao Termo' },
    { id: 'metas', label: 'Metas e Atividades' },
    { id: 'cronograma', label: 'Cronograma Físico-Financeiro' },
    { id: 'equipe', label: 'Equipe / Responsáveis' },
    { id: 'arquivos', label: 'Arquivos e Exportação' },
    { id: 'listagem', label: 'Listagem de Planos' }
  ];

  statusOptions: { value: PlanoStatus; label: string }[] = [
    { value: 'EM_ELABORACAO', label: 'Em elaboração' },
    { value: 'ENVIADO_ANALISE', label: 'Enviado para análise' },
    { value: 'APROVADO', label: 'Aprovado' },
    { value: 'EM_EXECUCAO', label: 'Em execução' },
    { value: 'CONCLUIDO', label: 'Concluído' },
    { value: 'REPROVADO', label: 'Reprovado' }
  ];

  orgaoOptions = ['União', 'Estado', 'Município', 'Outro'];
  statusEtapas = ['NAO_INICIADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'ATRASADA'];
  fonteRecursos = ['União', 'Estado', 'Município', 'Contrapartida', 'Outros'];

  planos: PlanoTrabalho[] = [];
  termos: TermoFomentoPayload[] = [];
  planosFiltrados: PlanoTrabalho[] = [];
  searchPlano = '';
  statusFiltro: PlanoStatus | '' = '';
  somenteVencidos = false;
  ordenacao: 'maisRecente' | 'maisAntigo' | 'az' = 'maisRecente';

  constructor(
    private readonly fb: FormBuilder,
    private readonly planoService: PlanoTrabalhoService,
    private readonly termoService: TermoFomentoService,
    private readonly router: Router
  ) {
    super();
    this.form = this.buildForm();
  }

  ngOnInit(): void {
    this.loadPlanos();
    this.loadTermos();
  }

  get activeTabIndex(): number {
    return this.tabs.findIndex((tab) => tab.id === this.activeTab);
  }

  get hasPreviousTab(): boolean {
    return this.activeTabIndex > 0;
  }

  get hasNextTab(): boolean {
    return this.activeTabIndex < this.tabs.length - 1;
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.saving,
      excluir: !this.editingId,
      novo: this.saving,
      cancelar: this.saving,
      imprimir: this.saving,
      buscar: this.saving
    };
  }

  get nextTabLabel(): string {
    return this.hasNextTab ? this.tabs[this.activeTabIndex + 1].label : '';
  }

  get metas(): FormArray {
    return this.form.get('metas') as FormArray;
  }

  get cronograma(): FormArray {
    return this.form.get('cronograma') as FormArray;
  }

  get equipe(): FormArray {
    return this.form.get('equipe') as FormArray;
  }

  get selectedTermo(): TermoFomentoPayload | undefined {
    const termoId = this.form.get('vinculo.termoFomentoId')?.value;
    return this.termos.find((t) => t.id === termoId);
  }

  get edicaoRestrita(): boolean {
    const status = this.form.get('identificacao.status')?.value as PlanoStatus;
    return status === 'APROVADO' || status === 'EM_EXECUCAO' || status === 'CONCLUIDO';
  }

  changeTab(tab: string): void {
    this.activeTab = tab;
  }

  goToNextTab(): void {
    if (this.hasNextTab) this.changeTab(this.tabs[this.activeTabIndex + 1].id);
  }

  goToPreviousTab(): void {
    if (this.hasPreviousTab) this.changeTab(this.tabs[this.activeTabIndex - 1].id);
  }

  buildForm(): FormGroup {
    return this.fb.group({
      identificacao: this.fb.group({
        codigoInterno: [{ value: '', disabled: true }],
        titulo: ['', Validators.required],
        descricaoGeral: ['', Validators.required],
        status: ['EM_ELABORACAO', Validators.required],
        orgaoConcedente: ['União'],
        orgaoOutroDescricao: [''],
        areaPrograma: [''],
        dataElaboracao: [''],
        dataAprovacao: [''],
        vigenciaInicio: [''],
        vigenciaFim: ['']
      }),
      vinculo: this.fb.group({
        termoFomentoId: ['', Validators.required],
        numeroProcesso: [''],
        modalidade: [''],
        observacoesVinculacao: ['']
      }),
      metas: this.fb.array([]),
      cronograma: this.fb.array([]),
      equipe: this.fb.array([]),
      arquivos: this.fb.group({
        formato: ['PDF']
      })
    });
  }

  addMeta(meta?: any): void {
    this.metas.push(
      this.fb.group({
        id: [meta?.id],
        codigo: [meta?.codigo || ''],
        descricao: [meta?.descricao || '', Validators.required],
        indicador: [meta?.indicador || ''],
        unidadeMedida: [meta?.unidadeMedida || ''],
        quantidadePrevista: [meta?.quantidadePrevista || null],
        resultadoEsperado: [meta?.resultadoEsperado || ''],
        atividades: this.fb.array([])
      })
    );

    const metaIndex = this.metas.length - 1;
    (meta?.atividades || []).forEach((atividade: any) => this.addAtividade(metaIndex, atividade));
  }

  removeMeta(index: number): void {
    this.metas.removeAt(index);
  }

  atividades(metaIndex: number): FormArray {
    return this.metas.at(metaIndex).get('atividades') as FormArray;
  }

  addAtividade(metaIndex: number, atividade?: any): void {
    this.atividades(metaIndex).push(
      this.fb.group({
        id: [atividade?.id],
        descricao: [atividade?.descricao || '', Validators.required],
        justificativa: [atividade?.justificativa || ''],
        publicoAlvo: [atividade?.publicoAlvo || ''],
        localExecucao: [atividade?.localExecucao || ''],
        produtoEsperado: [atividade?.produtoEsperado || ''],
        etapas: this.fb.array([])
      })
    );

    const atividadeIndex = this.atividades(metaIndex).length - 1;
    (atividade?.etapas || []).forEach((etapa: any) => this.addEtapa(metaIndex, atividadeIndex, etapa));
  }

  removeAtividade(metaIndex: number, atividadeIndex: number): void {
    this.atividades(metaIndex).removeAt(atividadeIndex);
  }

  etapas(metaIndex: number, atividadeIndex: number): FormArray {
    return this.atividades(metaIndex).at(atividadeIndex).get('etapas') as FormArray;
  }

  addEtapa(metaIndex: number, atividadeIndex: number, etapa?: any): void {
    this.etapas(metaIndex, atividadeIndex).push(
      this.fb.group({
        id: [etapa?.id],
        descricao: [etapa?.descricao || '', Validators.required],
        status: [etapa?.status || 'NAO_INICIADA'],
        dataInicioPrevista: [etapa?.dataInicioPrevista || ''],
        dataFimPrevista: [etapa?.dataFimPrevista || ''],
        dataConclusao: [etapa?.dataConclusao || ''],
        responsavel: [etapa?.responsavel || '']
      })
    );
  }

  removeEtapa(metaIndex: number, atividadeIndex: number, etapaIndex: number): void {
    this.etapas(metaIndex, atividadeIndex).removeAt(etapaIndex);
  }

  addCronogramaItem(item?: any): void {
    this.cronograma.push(
      this.fb.group({
        id: [item?.id],
        referenciaTipo: [item?.referenciaTipo || ''],
        referenciaId: [item?.referenciaId || ''],
        referenciaDescricao: [item?.referenciaDescricao || ''],
        competencia: [item?.competencia || '', Validators.required],
        descricaoResumida: [item?.descricaoResumida || ''],
        valorPrevisto:
          item?.valorPrevisto !== undefined && item?.valorPrevisto !== null
            ? this.formatCurrencyValue(item.valorPrevisto, true)
            : '',
        fonteRecurso: [item?.fonteRecurso || ''],
        naturezaDespesa: [item?.naturezaDespesa || ''],
        observacoes: [item?.observacoes || '']
      })
    );
  }

  removeCronogramaItem(index: number): void {
    this.cronograma.removeAt(index);
  }

  addResponsavel(membro?: any): void {
    this.equipe.push(
      this.fb.group({
        id: [membro?.id],
        nome: [membro?.nome || '', Validators.required],
        funcao: [membro?.funcao || ''],
        cpf: [membro?.cpf ? this.formatCpf(membro.cpf) : '', [this.cpfValidator]],
        cargaHoraria: [membro?.cargaHoraria || ''],
        tipoVinculo: [membro?.tipoVinculo || ''],
        contato: [membro?.contato || '']
      })
    );
  }

  removeResponsavel(index: number): void {
    this.equipe.removeAt(index);
  }

  referenciasPlanejamento(): { id: string; label: string; tipo: string }[] {
    const refs: { id: string; label: string; tipo: string }[] = [];
    this.metas.controls.forEach((metaControl, metaIndex) => {
      const metaValue = metaControl.value;
      refs.push({ id: metaValue.id || `meta-${metaIndex}`, label: `Meta: ${metaValue.descricao}`, tipo: 'Meta' });
      this.atividades(metaIndex).controls.forEach((atividadeControl, atvIndex) => {
        const atvValue = atividadeControl.value;
        const atvId = atvValue.id || `meta-${metaIndex}-atv-${atvIndex}`;
        refs.push({ id: atvId, label: `Atividade: ${atvValue.descricao}`, tipo: 'Atividade' });
        this.etapas(metaIndex, atvIndex).controls.forEach((etapaControl, etapaIndex) => {
          const etapaValue = etapaControl.value;
          refs.push({
            id: etapaValue.id || `${atvId}-etapa-${etapaIndex}`,
            label: `Etapa: ${etapaValue.descricao}`,
            tipo: 'Etapa'
          });
        });
      });
    });
    return refs;
  }

  submit(): void {
    this.popupErros = [];
    this.saving = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarPopup('Preencha os campos obrigatorios para prosseguir.');
      this.saving = false;
      return;
    }

    const identificacao = this.form.get('identificacao')!.getRawValue();
    const vinculo = this.form.get('vinculo')!.value;

    if (identificacao.vigenciaInicio && identificacao.vigenciaFim && identificacao.vigenciaInicio > identificacao.vigenciaFim) {
      this.mostrarPopup('A data inicial da vigencia deve ser anterior ou igual a final.');
      this.saving = false;
      this.activeTab = 'identificacao';
      return;
    }

    if (!vinculo.termoFomentoId) {
      this.mostrarPopup('Selecione um Termo de Fomento para salvar o plano de trabalho.');
      this.saving = false;
      this.activeTab = 'vinculo';
      return;
    }

    const cronogramaPayload = (this.cronograma.value as any[]).map((item) => ({
      ...item,
      valorPrevisto: this.parseCurrencyValue(item.valorPrevisto)
    }));

    const equipePayload = (this.equipe.value as any[]).map((membro) => ({
      ...membro,
      cpf: this.normalizeCpf(membro.cpf)
    }));

    const payload: PlanoTrabalhoPayload = {
      ...identificacao,
      termoFomentoId: vinculo.termoFomentoId,
      numeroProcesso: vinculo.numeroProcesso,
      modalidade: vinculo.modalidade,
      observacoesVinculacao: vinculo.observacoesVinculacao,
      metas: this.metas.value,
      cronograma: cronogramaPayload,
      equipe: equipePayload,
      status: identificacao.status,
      arquivoFormato: this.form.get('arquivos.formato')?.value
    };

    const request$ = this.editingId
      ? this.planoService.update(this.editingId, payload)
      : this.planoService.create(payload);

    request$.subscribe({
      next: (plano) => {
        this.saving = false;
        this.mostrarPopup('Plano de trabalho salvo com sucesso.');
        this.editingId = plano.id;
        this.loadPlanos();
        this.patchForm(plano);
      },
      error: () => {
        this.saving = false;
        this.mostrarPopup('Não foi possível salvar o plano de trabalho.');
      }
    });
  }

  patchForm(plano: PlanoTrabalho): void {
    this.metas.clear();
    this.cronograma.clear();
    this.equipe.clear();

    const termoId = (plano as any).termoFomentoId || plano.termoFomento?.id || '';

    this.form.patchValue({
      identificacao: {
        codigoInterno: plano.codigoInterno,
        titulo: plano.titulo,
        descricaoGeral: plano.descricaoGeral,
        status: plano.status,
        orgaoConcedente: plano.orgaoConcedente,
        orgaoOutroDescricao: plano.orgaoOutroDescricao,
        areaPrograma: plano.areaPrograma,
        dataElaboracao: plano.dataElaboracao,
        dataAprovacao: plano.dataAprovacao,
        vigenciaInicio: plano.vigenciaInicio,
        vigenciaFim: plano.vigenciaFim
      },
      vinculo: {
        termoFomentoId: termoId,
        numeroProcesso: plano.numeroProcesso,
        modalidade: plano.modalidade,
        observacoesVinculacao: plano.observacoesVinculacao
      },
      arquivos: {
        formato: plano.arquivoFormato || 'PDF'
      }
    });

    (plano.metas || []).forEach((meta) => this.addMeta(meta));
    (plano.cronograma || []).forEach((item) => this.addCronogramaItem(item));
    (plano.equipe || []).forEach((membro) => this.addResponsavel(membro));
  }

  editPlano(plano: PlanoTrabalho): void {
    this.editingId = plano.id;
    this.popupErros = [];
    this.patchForm(plano);
    this.activeTab = 'identificacao';
  }

  startNovo(): void {
    this.editingId = null;
    this.popupErros = [];
    this.form = this.buildForm();
    this.metas.clear();
    this.cronograma.clear();
    this.equipe.clear();
    this.changeTab('identificacao');
  }

  deletePlano(plano: PlanoTrabalho): void {
    if (!confirm('Deseja remover o plano selecionado?')) return;
    this.planoService.delete(plano.id).subscribe({
      next: () => {
        this.loadPlanos();
        if (this.editingId === plano.id) {
          this.startNovo();
        }
        this.mostrarPopup('Plano de trabalho excluído com sucesso.');
      },
      error: () => {
        this.mostrarPopup('Não foi possível excluir o plano de trabalho.');
      }
    });
  }

  loadPlanos(): void {
    this.planoService.list().subscribe({
      next: (planos) => {
        this.planos = planos;
        this.applyPlanosFilters();
      },
      error: () => {
        this.planos = [];
        this.planosFiltrados = [];
        this.mostrarPopup('Não foi possível carregar os planos de trabalho.');
      }
    });
  }

  loadTermos(): void {
    this.termoService.list().subscribe({
      next: (termos) => {
        this.termos = termos;
      },
      error: () => {
        this.termos = [];
        this.mostrarPopup('Não foi possível carregar os termos de fomento.');
      }
    });
  }

  totalCronogramaPorFonte(): Record<string, number> {
    return this.cronograma.value.reduce((acc: Record<string, number>, item: any) => {
      const fonte = item.fonteRecurso || 'Não informado';
      const valor = this.parseCurrencyValue(item.valorPrevisto) || 0;
      acc[fonte] = (acc[fonte] || 0) + valor;
      return acc;
    }, {});
  }

  totalCronograma(): number {
    return Object.values(this.totalCronogramaPorFonte()).reduce((sum, value) => sum + value, 0);
  }

  statusLabel(status: string): string {
    return this.statusOptions.find((item) => item.value === status)?.label || status;
  }

  onSearchPlanoInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchPlano = target?.value ?? '';
    this.applyPlanosFilters();
  }

  onStatusPlanoFiltroChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const value = target?.value ?? '';
    this.statusFiltro = (value as PlanoStatus) || '';
    this.applyPlanosFilters();
  }

  onBuscar(): void {
    this.changeTab('listagem');
    this.applyPlanosFilters();
  }

  applyPlanosFilters(): void {
    const query = this.normalizarTexto(this.searchPlano);
    const filtrados = this.planos.filter((plano) => {
      const termoNumero = plano.termoFomento?.numero || '';
      const matchesQuery =
        !query ||
        this.normalizarTexto(plano.codigoInterno).includes(query) ||
        this.normalizarTexto(plano.titulo).includes(query) ||
        this.normalizarTexto(termoNumero).includes(query);
      const matchesStatus = !this.statusFiltro || plano.status === this.statusFiltro;
      const matchesVencido = !this.somenteVencidos || this.isVencido(plano);
      return matchesQuery && matchesStatus && matchesVencido;
    });
    this.planosFiltrados = this.ordenarPlanos(filtrados);
  }

  onOrdenacaoPlanoChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const value = target?.value ?? 'maisRecente';
    this.ordenacao = (value as 'maisRecente' | 'maisAntigo' | 'az') || 'maisRecente';
    this.applyPlanosFilters();
  }

  resumoStatusPlanos(): { label: string; total: number }[] {
    const total = this.planos.length;
    const emElaboracao = this.contarPorStatus('EM_ELABORACAO');
    const emExecucao = this.contarPorStatus('EM_EXECUCAO');
    const aprovados = this.contarPorStatus('APROVADO');
    const concluidos = this.contarPorStatus('CONCLUIDO');
    const reprovados = this.contarPorStatus('REPROVADO');
    const enviados = this.contarPorStatus('ENVIADO_ANALISE');
    return [
      { label: 'Total', total },
      { label: 'Em elaboração', total: emElaboracao },
      { label: 'Enviado', total: enviados },
      { label: 'Aprovado', total: aprovados },
      { label: 'Em execução', total: emExecucao },
      { label: 'Concluído', total: concluidos },
      { label: 'Reprovado', total: reprovados }
    ];
  }

  private contarPorStatus(status: PlanoStatus): number {
    return this.planos.filter((plano) => plano.status === status).length;
  }

  private ordenarPlanos(planos: PlanoTrabalho[]): PlanoTrabalho[] {
    const copia = [...planos];
    switch (this.ordenacao) {
      case 'maisAntigo':
        return copia.sort((a, b) => this.dataPlano(a) - this.dataPlano(b));
      case 'az':
        return copia.sort((a, b) =>
          this.normalizarTexto(a.titulo).localeCompare(this.normalizarTexto(b.titulo))
        );
      case 'maisRecente':
      default:
        return copia.sort((a, b) => this.dataPlano(b) - this.dataPlano(a));
    }
  }

  private dataPlano(plano: PlanoTrabalho): number {
    if (!plano.vigenciaInicio) return 0;
    const data = new Date(plano.vigenciaInicio);
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
  }

  isVencido(plano: PlanoTrabalho): boolean {
    if (!plano.vigenciaFim) return false;
    const fim = new Date(plano.vigenciaFim);
    const hoje = new Date();
    return fim.getTime() < hoje.setHours(0, 0, 0, 0);
  }

  gerarArquivo(planoSelecionado?: PlanoTrabalho): void {
    const targetId = planoSelecionado?.id || this.editingId;
    if (!targetId) {
      this.mostrarPopup('Salve o plano antes de gerar o arquivo de exportação.');
      this.changeTab('identificacao');
      return;
    }

    this.planoService.export(targetId).subscribe({
      next: (payload) => {
        const popup = window.open('', '_blank', 'width=900,height=700');
        if (!popup) return;
        popup.document.write('<pre>' + JSON.stringify(payload, null, 2) + '</pre>');
      },
      error: () => {
        this.mostrarPopup('Não foi possível gerar o arquivo de exportação.');
      }
    });
  }

  salvar(): void {
    this.submit();
  }

  novo(): void {
    this.startNovo();
  }

  cancelar(): void {
    this.startNovo();
  }

  excluirAtual(): void {
    if (!this.editingId) return;
    const plano = this.planos.find((item) => item.id === this.editingId);
    if (!plano) return;
    this.deletePlano(plano);
  }

  imprimir(): void {
    this.gerarArquivo();
  }

  fechar(): void {
    this.router.navigate(['/juridico/planos-trabalho']);
  }

  fecharPopupErros(): void {
    this.popupErros = [];
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
      this.popupTimeout = undefined;
    }
  }

  onValorPrevistoInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const valor = this.formatCurrencyInput(input, true);
    this.cronograma.at(index).get('valorPrevisto')?.setValue(valor, { emitEvent: false });
  }

  onCpfInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatCpf(input.value);
    this.equipe.at(index).get('cpf')?.setValue(formatted, { emitEvent: false });
  }

  capitalizarCampo(caminho: (string | number)[]): void {
    const control = this.form.get(caminho);
    const valor = control?.value as string;
    if (!control || !valor) return;
    control.setValue(titleCaseWords(valor), { emitEvent: false });
  }

  private mostrarPopup(mensagem: string): void {
    this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
    }
    this.popupTimeout = setTimeout(() => {
      this.popupErros = [];
      this.popupTimeout = undefined;
    }, 10000);
  }

  private formatCurrencyInput(input: HTMLInputElement, comPrefixo: boolean): string {
    const digits = (input.value || '').replace(/\D/g, '');
    const numberValue = digits ? Number(digits) / 100 : 0;
    const masked = this.formatCurrencyValue(numberValue, comPrefixo);
    input.value = masked;
    return masked;
  }

  private formatCurrencyValue(value: number, comPrefixo: boolean): string {
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
    return comPrefixo ? formatted : formatted.replace('R$', '').trim();
  }

  private normalizeCpf(value?: string | null): string {
    return (value || '').replace(/\D/g, '');
  }

  private formatCpf(value?: string | null): string {
    const digits = this.normalizeCpf(value);
    if (!digits) return '';
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 9);
    const part4 = digits.slice(9, 11);
    let formatted = part1;
    if (part2) formatted += `.${part2}`;
    if (part3) formatted += `.${part3}`;
    if (part4) formatted += `-${part4}`;
    return formatted;
  }

  private cpfValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = this.normalizeCpf(control.value as string);
    if (!value) return null;
    if (value.length !== 11 || /^(\d)\1+$/.test(value)) return { cpfInvalid: true };
    let soma = 0;
    for (let i = 0; i < 9; i += 1) {
      soma += Number(value.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== Number(value.charAt(9))) return { cpfInvalid: true };
    soma = 0;
    for (let i = 0; i < 10; i += 1) {
      soma += Number(value.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    return resto === Number(value.charAt(10)) ? null : { cpfInvalid: true };
  };

  private parseCurrencyValue(value: string | number | null | undefined): number | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    const digits = value.toString().replace(/\D/g, '');
    if (!digits) return undefined;
    return Number(digits) / 100;
  }

  private normalizarTexto(valor: string): string {
    return (valor || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}

