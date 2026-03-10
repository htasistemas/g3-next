import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  AtualizarVersaoRequest,
  BeneficiaryDocumentConfig,
  ConfigService,
  HistoricoVersaoResponse
} from '../../services/config.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './system-settings.component.html',
  styleUrl: './system-settings.component.scss'
})
export class SystemSettingsComponent implements OnInit {
  form: FormGroup;
  saving = false;
  feedback: { type: 'success' | 'error'; message: string } | null = null;
  versaoForm: FormGroup;
  salvandoVersao = false;
  feedbackVersao: { type: 'success' | 'error'; message: string } | null = null;
  historicoVersoes: HistoricoVersaoResponse[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly configService: ConfigService
  ) {
    this.form = this.fb.group({
      documents: this.fb.array([])
    });
    this.versaoForm = this.fb.group({
      versao: [''],
      descricao: ['']
    });
  }

  get documents(): FormArray {
    return this.form.get('documents') as FormArray;
  }

  ngOnInit(): void {
    this.loadDocuments();
    this.loadVersaoAtual();
    this.loadHistoricoVersoes();
  }

  loadDocuments(): void {
    this.configService.getBeneficiaryDocuments().subscribe({
      next: ({ documents }) => {
        const controls = documents.map((doc) =>
          this.fb.group({
            id: [doc.id],
            nome: [doc.nome],
            obrigatorio: [doc.obrigatorio]
          })
        );
        this.form.setControl('documents', this.fb.array(controls));
      },
      error: (error) => {
        console.error('Erro ao carregar configura??es', error);
        this.feedback = { type: 'error', message: 'N?o foi poss?vel carregar as configura??es.' };
      }
    });
  }

  save(): void {
    this.feedback = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const documents = (this.form.value.documents || []) as BeneficiaryDocumentConfig[];

    this.configService.updateBeneficiaryDocuments(documents).subscribe({
      next: () => {
        this.feedback = { type: 'success', message: 'Configura??es salvas com sucesso.' };
      },
      error: (error) => {
        console.error('Erro ao salvar configura??es', error);
        this.feedback = { type: 'error', message: 'Falha ao salvar configura??es. Tente novamente.' };
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  loadVersaoAtual(): void {
    this.configService.getVersaoSistema().subscribe({
      next: (response) => {
        this.versaoForm.patchValue({
          versao: response.versao || '',
          descricao: response.descricao || ''
        });
      },
      error: (error) => {
        console.error('Erro ao carregar vers?o do sistema', error);
        this.feedbackVersao = { type: 'error', message: 'N?o foi poss?vel carregar a vers?o do sistema.' };
      }
    });
  }

  loadHistoricoVersoes(): void {
    this.configService.listarHistoricoVersoes().subscribe({
      next: (response) => {
        this.historicoVersoes = response || [];
      },
      error: (error) => {
        console.error('Erro ao carregar hist?rico de vers?es', error);
        this.feedbackVersao = { type: 'error', message: 'N?o foi poss?vel carregar o hist?rico de vers?es.' };
      }
    });
  }

  salvarVersao(): void {
    this.feedbackVersao = null;
    if (this.versaoForm.invalid) {
      this.versaoForm.markAllAsTouched();
      return;
    }

    const payload = this.versaoForm.value as AtualizarVersaoRequest;
    this.salvandoVersao = true;

    this.configService.atualizarVersaoSistema(payload).subscribe({
      next: () => {
        this.feedbackVersao = { type: 'success', message: 'Vers?o atualizada com sucesso.' };
        this.loadHistoricoVersoes();
      },
      error: (error) => {
        console.error('Erro ao atualizar vers?o do sistema', error);
        this.feedbackVersao = { type: 'error', message: 'N?o foi poss?vel atualizar a vers?o do sistema.' };
      },
      complete: () => {
        this.salvandoVersao = false;
      }
    });
  }
}

