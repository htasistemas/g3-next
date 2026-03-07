export type FamiliaStatus = "ATIVO" | "INATIVO" | "BLOQUEADO";

export type BeneficiarioResumo = {
  id_beneficiario: string;
  codigo?: string;
  nome_completo: string;
  nome_social?: string;
  cpf?: string;
  telefone_principal?: string;
  bairro?: string;
  data_nascimento?: string;
};

export type FamiliaMembro = {
  id_familia_membro?: string;
  id_beneficiario: string;
  parentesco: string;
  responsavel_familiar?: boolean;
  contribui_renda?: boolean;
  renda_individual?: string;
  participa_servicos?: boolean;
  observacoes?: string;
  usa_endereco_familia?: boolean;
  beneficiario?: BeneficiarioResumo | null;
};

export type Familia = {
  id_familia?: string;
  nome_familia: string;
  id_referencia_familiar?: string;
  referencia_familiar?: BeneficiarioResumo | null;
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
  membros?: FamiliaMembro[];
  data_cadastro?: string;
  data_atualizacao?: string;
};

export type FamiliaFiltro = {
  nome_familia?: string;
  municipio?: string;
  referencia?: string;
  status?: string;
};

export type FamiliaListaResponse = {
  familias: Familia[];
};

export type FamiliaItemResponse = {
  familia: Familia;
};
