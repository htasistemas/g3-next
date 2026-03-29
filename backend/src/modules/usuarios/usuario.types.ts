export const usuarioStatusValues = ["ATIVO", "INATIVO", "BLOQUEADO"] as const;

export type UsuarioStatus = (typeof usuarioStatusValues)[number];
export const usuarioOrigemTipoValues = ["BENEFICIARIO", "PROFISSIONAL", "VOLUNTARIO"] as const;
export type UsuarioOrigemTipo = (typeof usuarioOrigemTipoValues)[number];

export type UsuarioInputBase = {
  nome_completo: string;
  nome_exibicao?: string;
  nome_usuario: string;
  email: string;
  telefone?: string;
  cpf?: string;
  matricula?: string;
  setor?: string;
  unidade?: string;
  cargo?: string;
  perfil_acesso?: string;
  permissoes?: string[];
  status?: UsuarioStatus;
  exigir_troca_senha?: boolean;
  origem_tipo?: UsuarioOrigemTipo;
  origem_id?: string;
  origem_nome?: string;
};

export type UsuarioCreateInput = UsuarioInputBase & {
  senha: string;
  confirmar_senha: string;
};

export type UsuarioUpdateInput = UsuarioInputBase;

export type UsuarioStatusInput = {
  status: UsuarioStatus;
};

export type UsuarioResetSenhaInput = {
  nova_senha: string;
  confirmar_nova_senha: string;
  exigir_troca_senha?: boolean;
};

export type UsuarioFilters = {
  nome?: string;
  login?: string;
  email?: string;
  perfil?: string;
  setor?: string;
  unidade?: string;
  status?: UsuarioStatus;
  criado_de?: string;
  criado_ate?: string;
  pagina: number;
  tamanho_pagina: number;
};

export type UsuarioAuditoriaItem = {
  id: string;
  acao: string;
  usuario_id?: string;
  usuario_nome?: string;
  dados_json?: Record<string, unknown> | null;
  criado_em: string;
};

export type UsuarioPermissaoCatalogo = {
  nome: string;
  modulo: string;
  tela: string;
  acao: string;
};

export type UsuarioResponse = {
  id_usuario: string;
  nome_completo?: string;
  nome_exibicao?: string;
  nome_usuario: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  matricula?: string;
  setor?: string;
  unidade?: string;
  cargo?: string;
  perfil_acesso?: string;
  permissoes: string[];
  status: UsuarioStatus;
  exigir_troca_senha: boolean;
  tentativas_login_invalidas: number;
  ultimo_login_invalido_em?: string;
  ultimo_acesso_em?: string;
  origem_tipo?: UsuarioOrigemTipo;
  origem_id?: string;
  origem_nome?: string;
  criado_em: string;
  atualizado_em: string;
};

export type UsuarioDetalheResponse = {
  usuario: UsuarioResponse;
  auditoria: UsuarioAuditoriaItem[];
};

export type UsuarioRemocaoResponse = {
  id_usuario: string;
  removido_em: string;
};
