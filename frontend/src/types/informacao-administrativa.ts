export type InformacaoAdministrativa = {
  id: string;
  categoria: string;
  titulo: string;
  descricao: string;
  usuarioAcesso: string;
  senhaAcesso: string;
  link: string;
  observacoes: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type InformacaoAdministrativaPayload = {
  categoria: string;
  titulo: string;
  descricao?: string;
  usuarioAcesso?: string;
  senhaAcesso?: string;
  link?: string;
  observacoes?: string;
  senhaConfirmacao: string;
};

export type InformacaoAdministrativaCategoria = {
  id: string;
  nome: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type InformacaoAdministrativaCategoriaPayload = {
  nome: string;
  ativo?: boolean;
  senhaConfirmacao: string;
};
