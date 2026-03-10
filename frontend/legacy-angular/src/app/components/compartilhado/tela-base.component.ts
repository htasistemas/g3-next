export type AcaoCrud = 'salvar' | 'excluir' | 'novo' | 'cancelar' | 'imprimir' | 'buscar';

export type ConfigAcoesCrud = {
  salvar?: boolean;
  excluir?: boolean;
  novo?: boolean;
  cancelar?: boolean;
  imprimir?: boolean;
  buscar?: boolean;
};

export type EstadoAcoesCrud = {
  salvar?: boolean;
  excluir?: boolean;
  novo?: boolean;
  cancelar?: boolean;
  imprimir?: boolean;
  buscar?: boolean;
};

export abstract class TelaBaseComponent {
  protected criarConfigAcoes(config: ConfigAcoesCrud = {}): Required<ConfigAcoesCrud> {
    return {
      salvar: false,
      excluir: false,
      novo: false,
      cancelar: false,
      imprimir: false,
      buscar: false,
      ...config
    };
  }
}

