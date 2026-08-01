export type UsuarioAutenticado = {
  id: string;
  nomeUsuario: string;
  nome?: string;
  email?: string;
  tenant_id?: string;
  instituicao_id?: string;
  instituicao_nome?: string;
  instituicao_slug?: string;
  instituicao_logo_url?: string;
  cnpj?: string;
  plano?: string;
  perfil?: string;
  is_superadmin?: boolean;
  permissoes: string[];
};

export type JwtPayload = {
  sub: string;
  nomeUsuario: string;
  nome?: string;
  tenant_id?: string;
  instituicao_id?: string;
  instituicao_nome?: string;
  instituicao_slug?: string;
  cnpj?: string;
  plano?: string;
  perfil?: string;
  is_superadmin?: boolean;
  permissoes: string[];
};
