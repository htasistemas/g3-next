export const familiaStatusValues = ["ATIVO", "INATIVO", "BLOQUEADO"] as const;

export type FamiliaStatus = (typeof familiaStatusValues)[number];

export type FamiliaMembroInput = {
  id_familia_membro?: number;
  id_beneficiario: number;
  parentesco: string;
  responsavel_familiar?: boolean;
  contribui_renda?: boolean;
  renda_individual?: string;
  participa_servicos?: boolean;
  observacoes?: string;
  usa_endereco_familia?: boolean;
};

export type FamiliaInput = {
  nome_familia: string;
  id_referencia_familiar?: number;
  status?: FamiliaStatus;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  ponto_referencia?: string;
  municipio?: string;
  uf?: string;
  zona?: string;
  situacao_imovel?: string;
  tipo_moradia?: string;
  agua_encanada?: boolean;
  esgoto_tipo?: string;
  coleta_lixo?: string;
  energia_eletrica?: boolean;
  internet?: boolean;
  arranjo_familiar?: string;
  qtd_membros?: number;
  qtd_criancas?: number;
  qtd_adolescentes?: number;
  qtd_idosos?: number;
  qtd_pessoas_deficiencia?: number;
  renda_familiar_total?: string;
  renda_per_capita?: string;
  faixa_renda_per_capita?: string;
  principais_fontes_renda?: string;
  situacao_inseguranca_alimentar?: string;
  possui_dividas_relevantes?: boolean;
  descricao_dividas?: string;
  vulnerabilidades_familia?: string;
  servicos_acompanhamento?: string;
  tecnico_responsavel?: string;
  periodicidade_atendimento?: string;
  proxima_visita_prevista?: string;
  observacoes?: string;
  membros?: FamiliaMembroInput[];
};

export type FamiliaFilters = {
  nome_familia?: string;
  municipio?: string;
  referencia?: string;
  status?: string;
};
