import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faRotateLeft, faFileLines } from '@fortawesome/free-solid-svg-icons';
import { Subject, takeUntil } from 'rxjs';
import { TextTemplateService } from '../../services/text-template.service';

@Component({
  selector: 'app-text-templates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './text-templates.component.html'
})
export class TextTemplatesComponent implements OnInit, OnDestroy {
  readonly faFloppyDisk = faFloppyDisk;
  readonly faRotateLeft = faRotateLeft;
  readonly faFileLines = faFileLines;

  form!: FormGroup;
  feedback: { type: 'success' | 'error'; message: string } | null = null;
  private destroy$ = new Subject<void>();

  constructor(private readonly fb: FormBuilder, private readonly templates: TextTemplateService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      cession: [''],
      loan: ['']
    });

    this.templates.templates$.pipe(takeUntil(this.destroy$)).subscribe((templates) => {
      this.form.patchValue(templates, { emitEvent: false });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  save(): void {
    if (!this.form.valid) return;

    this.templates.updateTemplates(this.form.value);
    this.feedback = { type: 'success', message: 'Modelos atualizados com sucesso.' };
  }

  resetToDefault(field?: 'cession' | 'loan'): void {
    if (!field) {
      const defaults = this.templates.reset();
      this.form.patchValue(defaults, { emitEvent: false });
      this.feedback = { type: 'success', message: 'Modelos restaurados para o padrão.' };
      return;
    }

    const defaults = this.templates.getDefaults();
    const updated = this.templates.updateTemplates({ [field]: defaults[field] });
    this.form.patchValue({ [field]: updated[field] }, { emitEvent: false });
    this.feedback = { type: 'success', message: 'Modelo restaurado para o padrão.' };
  }
}

