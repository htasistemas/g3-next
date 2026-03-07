export type UsuarioStatus = "ATIVO" | "INATIVO" | "BLOQUEADO";

export type Usuario = {
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
  criado_em: string;
  atualizado_em: string;
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

export type UsuarioListaResponse = {
  usuarios: Usuario[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
  };
};

export type UsuarioDetalheResponse = {
  usuario: Usuario;
  auditoria: UsuarioAuditoriaItem[];
};

export type UsuarioPermissoesResponse = {
  permissoes: UsuarioPermissaoCatalogo[];
};

export type UsuarioFiltros = {
  nome?: string;
  login?: string;
  email?: string;
  perfil?: string;
  setor?: string;
  unidade?: string;
  status?: UsuarioStatus | "";
  criado_de?: string;
  criado_ate?: string;
  pagina?: number;
  tamanho_pagina?: number;
};

export type UsuarioPayload = {
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
  senha?: string;
  confirmar_senha?: string;
};
