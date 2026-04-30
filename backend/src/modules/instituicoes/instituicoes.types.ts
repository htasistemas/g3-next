export const instituicaoStatusValues = ["ativo", "inativo", "bloqueado"] as const;
export const instituicaoPlanoValues = [
  "essencial",
  "profissional",
  "avancado",
  "premium",
  "enterprise"
] as const;

export type InstituicaoStatus = (typeof instituicaoStatusValues)[number];
export type InstituicaoPlano = (typeof instituicaoPlanoValues)[number];

export type InstituicaoAdminInicialInput = {
  nome: string;
  nome_usuario: string;
  email: string;
  senha: string;
};

export type InstituicaoInput = {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  slug: string;
  codigo?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  plano: InstituicaoPlano;
  status: InstituicaoStatus;
  logo_url?: string;
  cor_tema?: string;
  admin_inicial?: InstituicaoAdminInicialInput;
};

export type InstituicaoUpdateInput = Partial<InstituicaoInput>;

export type InstituicaoResumo = {
  id: string;
  tenant_id: string;
  codigo?: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  slug: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  plano: InstituicaoPlano;
  status: InstituicaoStatus;
  logo_url?: string;
  cor_tema?: string;
  quantidade_usuarios: number;
  ultimo_acesso_em?: string;
  criado_em: string;
  atualizado_em: string;
};
