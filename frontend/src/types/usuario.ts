export type UsuarioStatus = "ATIVO" | "INATIVO" | "BLOQUEADO";
export type UsuarioOrigemTipo = "BENEFICIARIO" | "PROFISSIONAL" | "VOLUNTARIO";

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
  exigir_autenticacao_segura: boolean;
  permitir_biometria_facial_login: boolean;
  exigir_biometria_facial_login: boolean;
  tentativas_login_invalidas: number;
  ultimo_login_invalido_em?: string;
  ultimo_acesso_em?: string;
  origem_tipo?: UsuarioOrigemTipo;
  origem_id?: string;
  origem_nome?: string;
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

export type UsuarioRemocaoResponse = {
  id_usuario: string;
  removido_em: string;
};

export type UsuarioPermissoesResponse = {
  permissoes: UsuarioPermissaoCatalogo[];
};

export type UsuarioFaceStatus = {
  face_cadastrada: boolean;
  face_url?: string;
  face_cadastrada_em?: string;
};

export type UsuarioFacePayload = {
  face_imagem: string;
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
  exigir_autenticacao_segura?: boolean;
  permitir_biometria_facial_login?: boolean;
  exigir_biometria_facial_login?: boolean;
  senha?: string;
  confirmar_senha?: string;
  origem_tipo?: UsuarioOrigemTipo;
  origem_id?: string;
  origem_nome?: string;
};
export type UsuarioAcesso = {
  acesso_id: string;
  instituicao_id: string;
  tenant_id: string;
  entidade_juridica_id?: string | null;
  unidade_id?: string | null;
  projeto_id?: string | null;
  perfil_nome?: string | null;
  escopo: "INSTITUICAO" | "ENTIDADE_JURIDICA" | "UNIDADE" | "PROJETO";
  ativo: boolean;
  entidade_nome?: string | null;
  unidade_nome?: string | null;
  projeto_nome?: string | null;
};

export type UsuarioAcessoInput = Pick<UsuarioAcesso, "instituicao_id" | "entidade_juridica_id" | "unidade_id" | "projeto_id" | "perfil_nome" | "escopo" | "ativo">;
export type UsuarioAcessoCatalogo = {
  entidades: Array<{ id: string; nome: string; cnpj?: string }>;
  unidades: Array<{ id: string; nome: string; entidade_juridica_id?: string | null }>;
  projetos: Array<{ id: string; nome: string; unidade_organizacional_id?: string | null }>;
};
