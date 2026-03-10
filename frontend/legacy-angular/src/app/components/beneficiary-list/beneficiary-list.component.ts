import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BeneficiaryPayload, BeneficiaryService } from '../../services/beneficiary.service';
import { formatarDataSemFuso } from '../../utils/data-format.util';

@Component({
  selector: 'app-beneficiary-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './beneficiary-list.component.html',
  styleUrl: './beneficiary-list.component.scss'
})
export class BeneficiaryListComponent implements OnInit {
  beneficiaries: BeneficiaryPayload[] = [];
  filtered: BeneficiaryPayload[] = [];
  searchTerm = '';
  loading = false;
  error: string | null = null;
  orderIvfDesc = true;

  constructor(private readonly beneficiaryService: BeneficiaryService, private readonly router: Router) {}

  ngOnInit(): void {
    this.loadBeneficiaries();
  }

  loadBeneficiaries(): void {
    this.loading = true;
    this.error = null;

    this.beneficiaryService.list().subscribe({
      next: ({ beneficiarios }) => {
        this.beneficiaries = beneficiarios ?? [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Nao foi possivel carregar os beneficiarios. Tente novamente.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filtered = [...this.beneficiaries];
    } else {
      this.filtered = this.beneficiaries.filter((beneficiary) => {
        const name = beneficiary.nomeCompleto?.toLowerCase() ?? '';
        const cpf = beneficiary.cpf?.toLowerCase() ?? beneficiary.documentos?.toLowerCase() ?? '';
        const code = beneficiary.codigo?.toLowerCase() ?? '';
        return name.includes(term) || cpf.includes(term) || code.includes(term);
      });
    }

    this.filtered.sort((a, b) => {
      const diff = this.getIvfScore(b) - this.getIvfScore(a);
      return this.orderIvfDesc ? diff : -diff;
    });
  }

  newBeneficiary(): void {
    this.router.navigate(['/cadastros/beneficiarios']);
  }

  editBeneficiary(id: number | undefined): void {
    if (!id) {
      return;
    }

    this.router.navigate(['/cadastros/beneficiarios', id]);
  }

  toggleIvfOrder(): void {
    this.orderIvfDesc = !this.orderIvfDesc;
    this.applyFilter();
  }

  getIvfScore(beneficiary: BeneficiaryPayload): number {
    return beneficiary.indiceVulnerabilidade?.pontuacaoTotal ?? 0;
  }

  getIvfLabel(beneficiary: BeneficiaryPayload): string {
    return beneficiary.indiceVulnerabilidade?.faixaVulnerabilidade ?? 'Sem calculo';
  }

  getBadgeClass(faixa?: string): string {
    switch (faixa) {
      case 'Critica':
        return 'bg-red-100 text-red-700';
      case 'Alta':
        return 'bg-orange-100 text-orange-700';
      case 'Media':
        return 'bg-amber-100 text-amber-700';
      case 'Baixa':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  formatarDataNascimento(dataNascimento?: string): string {
    return formatarDataSemFuso(dataNascimento);
  }
}

