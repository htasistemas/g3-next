import { CommonModule, formatDate } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faServer } from '@fortawesome/free-solid-svg-icons';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { Subscription, timer } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  GerenciamentoDadosBackupResponse,
  GerenciamentoDadosConfiguracaoResponse,
  GerenciamentoDadosService,
  GerenciamentoDadosRestauracaoResponse,
} from '../../services/gerenciamento-dados.service';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';

type BackupStatus = 'executando' | 'sucesso' | 'falha';

interface BackupRecord {
  id: number;
  codigo: string;
  rotulo: string;
  tipo: 'Completo' | 'Incremental';
  status: BackupStatus;
  iniciadoEm: string;
  iniciadoEmFormatado: string;
  armazenadoEm?: string;
  tamanho?: string;
  criptografado: boolean;
  retencaoDias: number;
}

@Component({
  selector: 'app-data-management',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    DialogComponent,
    PopupMessagesComponent,
  ],
  templateUrl: './data-management.component.html',
  styleUrl: './data-management.component.scss'
})
export class DataManagementComponent implements OnInit, OnDestroy {
  readonly faServer = faServer;
  configuracao: GerenciamentoDadosConfiguracaoResponse | null = null;
  runningBackupId: number | null = null;
  backupSolicitando = false;
  recentBackups: BackupRecord[] = [];
  popupErros: string[] = [];
  restauracaoFeedback: { tipo: 'success' | 'error' | 'info'; mensagem: string } | null = null;
  restauracaoEmAndamento = false;
  dialogoRestaurarAberto = false;
  backupSelecionado: BackupRecord | null = null;
  restauracaoInicio: Date | null = null;
  dialogoRestaurarArquivoAberto = false;
  arquivoRestauracao: File | null = null;
  restaurandoArquivo = false;
  erroRestauracaoArquivo: string | null = null;
  private atualizacaoBackupsSub: Subscription | null = null;

  constructor(
    private readonly gerenciamentoDadosService: GerenciamentoDadosService
  ) {}

  ngOnInit(): void {
    this.carregarConfiguracao();
    this.carregarBackups();
  }

  ngOnDestroy(): void {
    this.atualizacaoBackupsSub?.unsubscribe();
    this.atualizacaoBackupsSub = null;
  }

  startBackup(): void {
    this.popupErros = [];
    if (this.runningBackupId || this.backupSolicitando) {
      return;
    }

    const retencaoDias = this.configuracao?.retencaoDias ?? 15;
    const armazenadoEm = this.configuracao?.caminhoDestino ?? 'C:\\Backup G3';
    const criptografado = !!this.configuracao?.criptografia;

    this.backupSolicitando = true;
    this.gerenciamentoDadosService
      .criarBackup({
        rotulo: 'Backup completo manual',
        tipo: 'Completo',
        status: 'executando',
        armazenadoEm,
        criptografado,
        retencaoDias,
      })
      .pipe(finalize(() => (this.backupSolicitando = false)))
      .subscribe({
        next: (backup) => {
          const item = this.mapearBackupResposta(backup);
          this.recentBackups = [item, ...this.recentBackups].slice(0, 6);
          this.runningBackupId = item.status === 'executando' ? item.id : null;
          this.gerenciarAtualizacaoAutomatica();
        },
        error: () => {
          const builder = new PopupErrorBuilder();
          builder.adicionar('Não foi possível iniciar o backup completo.');
          builder.adicionar('Verifique a configuração e tente novamente.');
          this.popupErros = builder.build();
        },
      });
  }

  abrirDialogoRestaurar(backup: BackupRecord): void {
    this.backupSelecionado = backup;
    this.dialogoRestaurarAberto = true;
  }

  cancelarDialogoRestaurar(): void {
    this.dialogoRestaurarAberto = false;
    this.backupSelecionado = null;
  }

  abrirDialogoRestaurarArquivo(): void {
    this.dialogoRestaurarArquivoAberto = true;
    this.arquivoRestauracao = null;
    this.erroRestauracaoArquivo = null;
  }

  cancelarDialogoRestaurarArquivo(): void {
    this.dialogoRestaurarArquivoAberto = false;
    this.arquivoRestauracao = null;
    this.erroRestauracaoArquivo = null;
  }

  onArquivoRestauracaoSelecionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.arquivoRestauracao = file;
    this.erroRestauracaoArquivo = null;
  }

  fecharPopup(): void {
    this.popupErros = [];
  }

  confirmarDialogoRestaurar(): void {
    if (!this.backupSelecionado) {
      this.cancelarDialogoRestaurar();
      return;
    }

    const backupId = this.backupSelecionado.id;
    this.dialogoRestaurarAberto = false;
    this.restauracaoFeedback = {
      tipo: 'info',
      mensagem: 'Restauração iniciada. Aguarde a conclusão.',
    };
    this.restauracaoEmAndamento = true;
    this.restauracaoInicio = new Date();
    this.gerenciarAtualizacaoAutomatica();

    this.gerenciamentoDadosService.restaurarBackup(backupId).subscribe({
      next: (response) => this.aplicarFeedbackRestauracao(response),
      error: () => {
        this.restauracaoFeedback = {
          tipo: 'error',
          mensagem: 'Falha ao solicitar a restauração do backup.',
        };
        this.restauracaoEmAndamento = false;
        this.restauracaoInicio = null;
        this.gerenciarAtualizacaoAutomatica();
      },
    });
  }

  confirmarRestaurarArquivo(): void {
    if (this.restaurandoArquivo) {
      return;
    }
    if (!this.arquivoRestauracao) {
      this.erroRestauracaoArquivo = 'Selecione um arquivo .sql para restaurar.';
      return;
    }
    if (!this.arquivoRestauracao.name.toLowerCase().endsWith('.sql')) {
      this.erroRestauracaoArquivo = 'Formato inválido. Envie um arquivo .sql.';
      return;
    }

    this.restaurandoArquivo = true;
    this.restauracaoFeedback = {
      tipo: 'info',
      mensagem: 'Restauração iniciada. Aguarde a conclusão.',
    };
    this.restauracaoEmAndamento = true;
    this.restauracaoInicio = new Date();
    this.gerenciarAtualizacaoAutomatica();

    this.gerenciamentoDadosService.restaurarBackupArquivo(this.arquivoRestauracao).subscribe({
      next: (response) => {
        this.aplicarFeedbackRestauracao(response);
        this.cancelarDialogoRestaurarArquivo();
      },
      error: () => {
        this.restauracaoFeedback = {
          tipo: 'error',
          mensagem: 'Falha ao restaurar o backup externo.',
        };
        this.restauracaoEmAndamento = false;
        this.restauracaoInicio = null;
        this.gerenciarAtualizacaoAutomatica();
      },
    }).add(() => {
      this.restaurandoArquivo = false;
    });
  }

  lastSuccessfulBackup(): BackupRecord | undefined {
    return this.recentBackups.find((backup) => backup.status === 'sucesso');
  }

  backupEmAndamento(): BackupRecord | null {
    if (!this.runningBackupId) {
      return null;
    }
    const atual = this.recentBackups.find((backup) => backup.id === this.runningBackupId);
    return atual && atual.status === 'executando' ? atual : null;
  }

  private carregarConfiguracao(): void {
    this.gerenciamentoDadosService
      .obterConfiguracao()
      .subscribe((configuracao) => {
        this.configuracao = configuracao;
      });
  }

  private carregarBackups(): void {
    this.gerenciamentoDadosService.listarBackups().subscribe((backups) => {
      this.recentBackups = backups.map((backup) => this.mapearBackupResposta(backup));
      if (this.runningBackupId) {
        const atual = this.recentBackups.find((backup) => backup.id === this.runningBackupId);
        this.runningBackupId = atual && atual.status === 'executando' ? atual.id : null;
      }
      this.gerenciarAtualizacaoAutomatica();
    });
  }

  private aplicarFeedbackRestauracao(response: GerenciamentoDadosRestauracaoResponse): void {
    this.restauracaoFeedback = {
      tipo: response.status === 'sucesso' ? 'success' : 'error',
      mensagem: response.mensagem,
    };
    this.restauracaoEmAndamento = false;
    this.restauracaoInicio = null;
    this.carregarBackups();
  }

  private mapearBackupResposta(backup: GerenciamentoDadosBackupResponse): BackupRecord {
    const iniciadoEmFormatado = this.formatarDataHora(backup.iniciadoEm);
    return {
      id: backup.id,
      codigo: backup.codigo,
      rotulo: backup.rotulo,
      tipo: backup.tipo as BackupRecord['tipo'],
      status: backup.status as BackupStatus,
      iniciadoEm: backup.iniciadoEm,
      iniciadoEmFormatado,
      armazenadoEm: backup.armazenadoEm,
      tamanho: backup.tamanho,
      criptografado: backup.criptografado,
      retencaoDias: backup.retencaoDias,
    };
  }

  private formatarDataHora(valor?: string): string {
    if (!valor) {
      return '--';
    }
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) {
      return valor;
    }
    return formatDate(data, 'dd/MM/yyyy HH:mm', 'pt-BR');
  }

  obterDuracaoDesde(dataInicio?: string | Date | null): string {
    if (!dataInicio) {
      return '--';
    }
    const inicio = typeof dataInicio === 'string' ? new Date(dataInicio) : dataInicio;
    if (Number.isNaN(inicio.getTime())) {
      return '--';
    }
    const duracaoMs = Math.max(Date.now() - inicio.getTime(), 0);
    const totalSegundos = Math.floor(duracaoMs / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    const valorMinutos = minutos.toString().padStart(2, '0');
    const valorSegundos = segundos.toString().padStart(2, '0');
    return horas > 0
      ? `${horas}:${valorMinutos}:${valorSegundos}`
      : `${valorMinutos}:${valorSegundos}`;
  }

  private gerenciarAtualizacaoAutomatica(): void {
    const deveAtualizar = !!this.runningBackupId || this.restauracaoEmAndamento;
    if (deveAtualizar && !this.atualizacaoBackupsSub) {
      this.atualizacaoBackupsSub = timer(0, 5000).subscribe(() => {
        this.carregarBackups();
      });
      return;
    }
    if (!deveAtualizar && this.atualizacaoBackupsSub) {
      this.atualizacaoBackupsSub.unsubscribe();
      this.atualizacaoBackupsSub = null;
    }
  }
}

