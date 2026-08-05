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

export type LoginMfaRequired = {
  mfaRequired: true;
  challengeId: string;
  method: "email" | "passkey" | "face";
  maskedEmail?: string;
  options?: any;
  fallbackEmailAvailable?: boolean;
  devCode?: string;
};

export type LoginAuthResult =
  | {
      token: string;
      usuario: UsuarioAutenticado;
    }
  | LoginMfaRequired;

export type TenantContextoLogin = {
  id: string;
  tenant_id: string;
  codigo?: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  slug: string;
  email?: string;
  telefone?: string;
  plano: string;
  status: string;
  logo_url?: string;
  cor_tema?: string;
};
