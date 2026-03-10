import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { titleCaseWords } from '../../utils/capitalization.util';
import { AutocompleteComponent, AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';
import {
  ProntuarioAnexoRequest,
  ProntuarioRegistroRequest,
  ProntuarioRegistroResponse
} from '../../services/prontuario.service';

type TipoRegistro = ProntuarioRegistroRequest['tipo'];

@Component({
  selector: 'app-prontuario-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AutocompleteComponent],
  templateUrl: './prontuario-form-modal.component.html',
  styleUrl: './prontuario-form-modal.component.scss'
})
export class ProntuarioFormModalComponent implements OnChanges {
  @Input() aberto = false;
  @Input() registro: ProntuarioRegistroResponse | null = null;
  @Input() tipoInicial: ProntuarioRegistroRequest['tipo'] | null = null;
  @Input() opcoesProfissionais: AutocompleteOpcao[] = [];
  @Input() opcoesUnidades: AutocompleteOpcao[] = [];
  @Input() unidadePrincipalId: number | null = null;

  @Output() salvar = new EventEmitter<{ registro: ProntuarioRegistroRequest; anexo?: ProntuarioAnexoRequest }>();
  @Output() fechar = new EventEmitter<void>();

  formulario: FormGroup;
  mostrarErros = false;
  termoProfissional = '';

  constructor(private readonly fb: FormBuilder) {
    this.formulario = this.fb.group({
      tipo: ['atendimento', Validators.required],
      dataRegistro: ['', Validators.required],
      profissionalId: ['', Validators.required],
      unidadeId: [''],
      familiaId: [''],
      titulo: [''],
      descricao: ['', [Validators.required, Validators.minLength(10)]],
      status: ['aberto', Validators.required],
      nivelSigilo: ['Normal'],
      referenciaOrigemTipo: [''],
      referenciaOrigemId: [''],
      dataInicio: [''],
      dataFim: [''],
      tipoAtendimento: [''],
      localAtendimento: [''],
      servicoPrograma: [''],
      motivoDemanda: [''],
      classificacaoRisco: [''],
      resultadoAtendimento: [''],
      proximosPassos: [''],
      tipoProcedimento: [''],
      vinculoRegistro: [''],
      situacaoAtual: [''],
      pendencias: [''],
      destinoEncaminhamento: [''],
      motivoEncaminhamento: [''],
      prioridadeEncaminhamento: [''],
      statusEncaminhamento: [''],
      prazoRetorno: [''],
      formaEncaminhamento: [''],
      tipoDocumento: [''],
      dataDocumento: [''],
      origemDocumento: [''],
      anexoNome: [''],
      anexoUrl: [''],
      anexoTipo: ['']
    });

    this.formulario.get('tipo')?.valueChanges.subscribe((tipo) => {
      this.configurarValidacoes(tipo as TipoRegistro);
    });
    this.configurarValidacoes('atendimento');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['registro'] || changes['tipoInicial']) {
      this.preencherFormulario();
    }
    if (changes['opcoesProfissionais'] && !this.registro) {
      this.definirProfissionalPadrao();
    }
    if (changes['opcoesUnidades'] && !this.registro) {
      this.definirUnidadePadrao();
    }
  }

  get opcoesProfissionaisFiltradas(): AutocompleteOpcao[] {
    const termo = this.termoProfissional.trim().toLowerCase();
    if (!termo) {
      return this.opcoesProfissionais;
    }
    return this.opcoesProfissionais.filter((opcao) =>
      [opcao.label, opcao.sublabel].filter(Boolean).some((valor) => valor!.toLowerCase().includes(termo))
    );
  }

  selecionarProfissional(opcao: AutocompleteOpcao): void {
    this.formulario.patchValue({ profissionalId: opcao.id });
    this.termoProfissional = opcao.label;
  }

  atualizarTermoProfissional(valor: string): void {
    this.termoProfissional = valor;
    if (!valor) {
      this.formulario.patchValue({ profissionalId: '' });
    }
  }

  get tipoSelecionado(): TipoRegistro {
    return (this.formulario.get('tipo')?.value as TipoRegistro) ?? 'atendimento';
  }

  mostrarErro(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!control && this.mostrarErros && control.invalid;
  }

  mensagemErro(campo: string): string {
    const control = this.formulario.get(campo);
    if (!control || !control.errors) {
      return '';
    }
    if (control.errors['required']) {
      return 'Campo obrigatório.';
    }
    if (control.errors['minlength']) {
      return `Informe no mínimo ${control.errors['minlength'].requiredLength} caracteres.`;
    }
    return 'Campo inválido.';
  }

  getLabelDescricao(): string {
    switch (this.tipoSelecionado) {
      case 'procedimento':
        return 'Descrição do procedimento*';
      case 'evolucao':
        return 'Evolução detalhada*';
      case 'encaminhamento':
        return 'Descrição do encaminhamento*';
      case 'documento':
        return 'Descrição do documento*';
      case 'atendimento':
      default:
        return 'Registro pormenorizado do atendimento*';
    }
  }

  onArquivoSelecionado(event: Event): void {
    const target = event.target as HTMLInputElement;
    const arquivo = target.files?.[0];
    if (!arquivo) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.formulario.patchValue({
        anexoNome: arquivo.name,
        anexoTipo: arquivo.type || 'application/octet-stream',
        anexoUrl: base64
      });
    };
    reader.readAsDataURL(arquivo);
  }

  close(): void {
    this.fechar.emit();
  }

  submit(): void {
    this.mostrarErros = true;
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const value = this.formulario.value;
    const dadosExtra: Record<string, unknown> = {};
    const tipo = value.tipo as TipoRegistro;

    if (tipo === 'atendimento') {
      dadosExtra['dataInicio'] = value.dataInicio;
      dadosExtra['dataFim'] = value.dataFim;
      dadosExtra['tipoAtendimento'] = value.tipoAtendimento;
      dadosExtra['localAtendimento'] = value.localAtendimento;
      dadosExtra['servicoPrograma'] = titleCaseWords(value.servicoPrograma || '');
      dadosExtra['motivoDemanda'] = titleCaseWords(value.motivoDemanda || '');
      dadosExtra['classificacaoRisco'] = value.classificacaoRisco;
      dadosExtra['resultadoAtendimento'] = titleCaseWords(value.resultadoAtendimento || '');
      dadosExtra['proximosPassos'] = titleCaseWords(value.proximosPassos || '');
    }

    if (tipo === 'procedimento') {
      dadosExtra['tipoProcedimento'] = value.tipoProcedimento;
      if (value.vinculoRegistro) {
        dadosExtra['vinculoRegistro'] = value.vinculoRegistro;
      }
    }

    if (tipo === 'evolucao') {
      dadosExtra['situacaoAtual'] = value.situacaoAtual;
      dadosExtra['pendencias'] = titleCaseWords(value.pendencias || '');
    }

    if (tipo === 'encaminhamento') {
      dadosExtra['destino'] = titleCaseWords(value.destinoEncaminhamento || '');
      dadosExtra['motivo'] = titleCaseWords(value.motivoEncaminhamento || '');
      dadosExtra['prioridade'] = value.prioridadeEncaminhamento;
      dadosExtra['statusEncaminhamento'] = value.statusEncaminhamento;
      dadosExtra['prazoRetorno'] = value.prazoRetorno;
      dadosExtra['formaEncaminhamento'] = value.formaEncaminhamento;
    }

    if (tipo === 'documento') {
      dadosExtra['tipoDocumento'] = value.tipoDocumento;
      dadosExtra['dataDocumento'] = value.dataDocumento;
      dadosExtra['origemDocumento'] = value.origemDocumento;
    }

    const dataRegistro =
      tipo === 'atendimento'
        ? value.dataInicio || value.dataRegistro
        : tipo === 'documento'
          ? this.normalizarDataRegistro(value.dataDocumento || value.dataRegistro)
          : value.dataRegistro;

    const registro: ProntuarioRegistroRequest = {
      tipo,
      dataRegistro,
      profissionalId: value.profissionalId ? Number(value.profissionalId) : undefined,
      unidadeId: value.unidadeId ? Number(value.unidadeId) : undefined,
      familiaId: value.familiaId ? Number(value.familiaId) : undefined,
      titulo: value.titulo ? titleCaseWords(value.titulo) : undefined,
      descricao: value.descricao,
      status: value.status,
      dadosExtra,
      referenciaOrigemTipo: value.referenciaOrigemTipo || undefined,
      referenciaOrigemId: value.referenciaOrigemId ? Number(value.referenciaOrigemId) : undefined,
      nivelSigilo: value.nivelSigilo || undefined
    };

    const anexo =
      value.anexoNome && value.anexoUrl
        ? {
            nomeArquivo: value.anexoNome,
            urlArquivo: value.anexoUrl,
            tipoMime: value.anexoTipo || undefined
          }
        : undefined;

    this.salvar.emit({ registro, anexo });
  }

  private normalizarDataRegistro(valor: string): string {
    if (!valor) {
      return valor;
    }
    return valor.includes('T') ? valor : `${valor}T00:00`;
  }

  private preencherFormulario(): void {
    this.mostrarErros = false;
    if (!this.registro) {
      this.formulario.reset({
        tipo: this.tipoInicial ?? 'atendimento',
        dataRegistro: '',
        profissionalId: '',
        unidadeId: this.unidadePrincipalId ?? '',
        familiaId: '',
        titulo: '',
        descricao: '',
        status: 'aberto',
        nivelSigilo: 'Normal',
        referenciaOrigemTipo: '',
        referenciaOrigemId: '',
        dataInicio: '',
        dataFim: '',
        tipoAtendimento: '',
        localAtendimento: '',
        servicoPrograma: '',
        motivoDemanda: '',
        classificacaoRisco: '',
        resultadoAtendimento: '',
        proximosPassos: '',
        tipoProcedimento: '',
        vinculoRegistro: '',
        situacaoAtual: '',
        pendencias: '',
        destinoEncaminhamento: '',
        motivoEncaminhamento: '',
        prioridadeEncaminhamento: '',
        statusEncaminhamento: '',
        prazoRetorno: '',
        formaEncaminhamento: '',
        tipoDocumento: '',
        dataDocumento: '',
        origemDocumento: '',
        anexoNome: '',
        anexoUrl: '',
        anexoTipo: ''
      });
      this.termoProfissional = '';
      this.definirUnidadePadrao();
      return;
    }

    const extra = this.registro.dadosExtra || {};
    this.formulario.patchValue({
      tipo: this.registro.tipo,
      dataRegistro: this.registro.dataRegistro,
      profissionalId: this.registro.profissionalId ?? '',
      unidadeId: this.registro.unidadeId ?? '',
      familiaId: this.registro.familiaId ?? '',
      titulo: this.registro.titulo ?? '',
      descricao: this.registro.descricao,
      status: this.registro.status,
      nivelSigilo: this.registro.nivelSigilo ?? 'Normal',
      referenciaOrigemTipo: this.registro.referenciaOrigemTipo ?? '',
      referenciaOrigemId: this.registro.referenciaOrigemId ?? '',
      dataInicio: extra['dataInicio'] ?? '',
      dataFim: extra['dataFim'] ?? '',
      tipoAtendimento: extra['tipoAtendimento'] ?? '',
      localAtendimento: extra['localAtendimento'] ?? '',
      servicoPrograma: extra['servicoPrograma'] ?? '',
      motivoDemanda: extra['motivoDemanda'] ?? '',
      classificacaoRisco: extra['classificacaoRisco'] ?? '',
      resultadoAtendimento: extra['resultadoAtendimento'] ?? '',
      proximosPassos: extra['proximosPassos'] ?? '',
      tipoProcedimento: extra['tipoProcedimento'] ?? '',
      vinculoRegistro: extra['vinculoRegistro'] ?? '',
      situacaoAtual: extra['situacaoAtual'] ?? '',
      pendencias: extra['pendencias'] ?? '',
      destinoEncaminhamento: extra['destino'] ?? '',
      motivoEncaminhamento: extra['motivo'] ?? '',
      prioridadeEncaminhamento: extra['prioridade'] ?? '',
      statusEncaminhamento: extra['statusEncaminhamento'] ?? '',
      prazoRetorno: extra['prazoRetorno'] ?? '',
      formaEncaminhamento: extra['formaEncaminhamento'] ?? '',
      tipoDocumento: extra['tipoDocumento'] ?? '',
      dataDocumento: extra['dataDocumento'] ?? '',
      origemDocumento: extra['origemDocumento'] ?? '',
      anexoNome: '',
      anexoUrl: '',
      anexoTipo: ''
    });
    this.termoProfissional = this.obterNomeProfissional(this.registro.profissionalId ?? null);
    this.configurarValidacoes(this.registro.tipo);
  }

  private definirProfissionalPadrao(): void {
    if (this.registro || this.formulario.get('profissionalId')?.value) {
      return;
    }
    if (this.opcoesProfissionais.length === 1) {
      const opcao = this.opcoesProfissionais[0];
      this.formulario.patchValue({ profissionalId: opcao.id });
      this.termoProfissional = opcao.label;
    }
  }

  private definirUnidadePadrao(): void {
    if (this.registro) {
      return;
    }
    if (this.unidadePrincipalId) {
      this.formulario.patchValue({ unidadeId: this.unidadePrincipalId });
    }
  }

  private obterNomeProfissional(id: number | null): string {
    if (!id) return '';
    const opcao = this.opcoesProfissionais.find((item) => Number(item.id) === id);
    return opcao?.label ?? '';
  }

  private configurarValidacoes(tipo: TipoRegistro): void {
    const setRequired = (campo: string, requerido: boolean) => {
      const control = this.formulario.get(campo);
      if (!control) {
        return;
      }
      control.setValidators(requerido ? [Validators.required] : []);
      control.updateValueAndValidity({ emitEvent: false });
    };

    const setRequiredComMin = (campo: string, requerido: boolean, min = 10) => {
      const control = this.formulario.get(campo);
      if (!control) {
        return;
      }
      control.setValidators(
        requerido ? [Validators.required, Validators.minLength(min)] : [Validators.minLength(min)]
      );
      control.updateValueAndValidity({ emitEvent: false });
    };

    setRequired('dataRegistro', tipo !== 'atendimento' && tipo !== 'documento');
    setRequired('profissionalId', true);
    setRequiredComMin('descricao', true);

    setRequired('dataInicio', tipo === 'atendimento');
    setRequired('dataFim', tipo === 'atendimento');
    setRequired('tipoAtendimento', tipo === 'atendimento');
    setRequired('localAtendimento', tipo === 'atendimento');
    setRequired('servicoPrograma', tipo === 'atendimento');
    setRequired('motivoDemanda', tipo === 'atendimento');
    setRequired('classificacaoRisco', tipo === 'atendimento');
    setRequired('resultadoAtendimento', tipo === 'atendimento');
    setRequired('proximosPassos', tipo === 'atendimento');

    setRequired('tipoProcedimento', tipo === 'procedimento');

    setRequired('situacaoAtual', tipo === 'evolucao');
    setRequired('titulo', tipo === 'evolucao');

    setRequired('destinoEncaminhamento', tipo === 'encaminhamento');
    setRequired('motivoEncaminhamento', tipo === 'encaminhamento');
    setRequired('prioridadeEncaminhamento', tipo === 'encaminhamento');
    setRequired('statusEncaminhamento', tipo === 'encaminhamento');
    setRequired('prazoRetorno', tipo === 'encaminhamento');
    setRequired('formaEncaminhamento', tipo === 'encaminhamento');

    setRequired('tipoDocumento', tipo === 'documento');
    setRequired('dataDocumento', tipo === 'documento');
    setRequired('origemDocumento', tipo === 'documento');
  }
}



