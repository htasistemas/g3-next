export type InformacaoAdministrativaRow = {
  id: bigint;
  tenant_id: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  usuario_acesso: string | null;
  senha_acesso: string | null;
  link: string | null;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type InformacaoAdministrativaInput = {
  categoria: string;
  titulo: string;
  descricao?: string;
  usuarioAcesso?: string;
  senhaAcesso?: string;
  link?: string;
  observacoes?: string;
};

export type InformacaoAdministrativaConfirmacaoInput = {
  senhaConfirmacao: string;
};

export type InformacaoAdministrativaCategoriaRow = {
  id: bigint;
  tenant_id: string;
  nome: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type InformacaoAdministrativaCategoriaInput = {
  nome: string;
  ativo?: boolean;
};
