import { Injectable } from '@angular/core';
import { buildTermoVoluntariadoHTML } from './templates/termo-voluntariado.template';

type UnidadeTermo = {
  nomeFantasia?: string;
  razaoSocial?: string;
  cnpj?: string;
  inscricaoMunicipal?: string;
  endereco?: string;
  numeroEndereco?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  coordenadorNome?: string;
  logomarca?: string;
  logomarcaRelatorio?: string;
};

type ProfissionalTermo = {
  nome?: string;
  rg?: string;
  cpf?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  email?: string;
  telefoneCelular?: string;
  telefoneResidencial?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    cidade?: string;
    uf?: string;
  };
  voluntarioOutraInstituicao?: boolean;
  voluntarioOutraDescricao?: string;
  voluntariadoLocalAtividade?: string;
  voluntariadoPeriodo?: string;
  voluntariadoDisponibilidade?: {
    dom?: string[];
    seg?: string[];
    ter?: string[];
    qua?: string[];
    qui?: string[];
    sex?: string[];
    sab?: string[];
  };
  voluntariadoAtividades?: string[];
  voluntariadoOutros?: string;
  lgpdAceite?: boolean;
  imagemAceite?: boolean;
};

@Injectable({ providedIn: 'root' })
export class VoluntariadoTermoPrintService {
  printTermoVoluntariado(
    unidade: UnidadeTermo,
    voluntario: ProfissionalTermo,
    usuarioEmissor?: string,
    vinculoTipo: 'VOLUNTARIO' | 'CLT' | 'PJ' = 'VOLUNTARIO'
  ): void {
    const html = buildTermoVoluntariadoHTML(
      unidade,
      voluntario,
      usuarioEmissor,
      vinculoTipo
    );
    const janela = window.open('', '_blank', 'width=900,height=1200');
    if (!janela) return;

    janela.document.write(html);
    janela.document.close();
    janela.focus();
    janela.print();
    setTimeout(() => janela.close(), 500);
  }
}

