export type InstituicaoPlano = "essencial" | "profissional" | "avancado" | "premium" | "enterprise";
export type InstituicaoStatus = "ativo" | "inativo" | "bloqueado";

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

export type InstituicaoAdminInicialInput = {
  nome: string;
  nome_usuario: string;
  email: string;
  senha: string;
};

export type InstituicaoPayload = {
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
