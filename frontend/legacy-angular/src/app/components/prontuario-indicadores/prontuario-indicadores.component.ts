import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ProntuarioIndicadoresResponse } from '../../services/prontuario.service';

@Component({
  selector: 'app-prontuario-indicadores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prontuario-indicadores.component.html',
  styleUrl: './prontuario-indicadores.component.scss'
})
export class ProntuarioIndicadoresComponent {
  @Input() contagens: Record<string, number> = {};
  @Input() indicadoresResumo?: ProntuarioIndicadoresResponse | null;

  get indicadoresLista(): { label: string; value: number }[] {
    const mapping: { key: string; label: string }[] = [
      { key: 'atendimento', label: 'Atendimentos' },
      { key: 'procedimento', label: 'Procedimentos' },
      { key: 'encaminhamento', label: 'Encaminhamentos' },
      { key: 'evolucao', label: 'Evoluções' },
      { key: 'documento', label: 'Documentos/Anexos' },
      { key: 'visita_ref', label: 'Visitas domiciliares (referência)' },
      { key: 'outro', label: 'Outros registros' }
    ];

    return mapping.map((item) => ({
      label: item.label,
      value: this.contagens[item.key] ?? 0
    }));
  }

  get indicadoresGeral(): { label: string; value: number }[] {
    if (!this.indicadoresResumo) {
      return [];
    }
    return [
      { label: 'Doacoes recebidas', value: this.indicadoresResumo.totalDoacoes ?? 0 },
      { label: 'Cestas recebidas', value: this.indicadoresResumo.totalCestas ?? 0 },
      { label: 'Cursos participados', value: this.indicadoresResumo.totalCursos ?? 0 }
    ];
  }

  get taxaEncaminhamentos(): string {
    const taxa = this.indicadoresResumo?.taxaEncaminhamentosConcluidos ?? 0;
    return `${taxa.toFixed(1)}%`;
  }

  get tempoMedioRetorno(): string {
    const valor = this.indicadoresResumo?.tempoMedioRetornoDias;
    return valor !== null && valor !== undefined ? `${valor.toFixed(1)} dias` : '—';
  }
}


