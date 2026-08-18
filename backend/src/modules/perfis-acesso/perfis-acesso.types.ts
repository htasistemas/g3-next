export type PerfilAcessoInput = {
  nome: string;
  descricao?: string;
  ativo?: boolean;
  administrativo?: boolean;
  observacoes?: string;
  permissoes: string[];
};
