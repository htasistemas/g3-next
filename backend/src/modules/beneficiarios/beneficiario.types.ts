export const beneficiarioStatusValues = [
  "ATIVO",
  "INATIVO",
  "DESATUALIZADO",
  "INCOMPLETO",
  "EM_ANALISE",
  "BLOQUEADO"
] as const;

export type BeneficiarioStatus = (typeof beneficiarioStatusValues)[number];

export type DocumentoObrigatorioInput = {
  id?: string | number;
  nome: string;
  numeroDocumento?: string;
  nomeArquivo?: string;
  caminhoArquivo?: string;
  contentType?: string;
  obrigatorio?: boolean;
  ignorado?: boolean;
  conteudo?: string;
};

export type BeneficiarioInput = {
  codigo?: string;
  status?: BeneficiarioStatus;
  nome_completo: string;
  nome_social?: string;
  apelido?: string;
  data_nascimento: string;
  foto_3x4?: string;
  sexo_biologico?: string;
  identidade_genero?: string;
  cor_raca?: string;
  estado_civil?: string;
  nacionalidade?: string;
  naturalidade_cidade?: string;
  naturalidade_uf?: string;
  nome_mae: string;
  nome_pai?: string;
  opta_receber_cesta_basica?: boolean;
  apto_receber_cesta_basica?: boolean;
  cep: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  ponto_referencia?: string;
  municipio?: string;
  uf?: string;
  latitude?: string;
  longitude?: string;
  zona?: string;
  subzona?: string;
  telefone_principal: string;
  telefone_principal_whatsapp?: boolean;
  telefone_secundario?: string;
  telefone_recado_nome?: string;
  telefone_recado_numero?: string;
  email?: string;
  permite_contato_tel?: boolean;
  permite_contato_whatsapp?: boolean;
  permite_contato_sms?: boolean;
  permite_contato_email?: boolean;
  horario_preferencial_contato?: string;
  cpf: string;
  senha_portal?: string;
  rg_numero?: string;
  rg_orgao_emissor?: string;
  rg_uf?: string;
  rg_data_emissao?: string;
  nis?: string;
  certidao_tipo?: string;
  certidao_livro?: string;
  certidao_folha?: string;
  certidao_termo?: string;
  certidao_cartorio?: string;
  certidao_municipio?: string;
  certidao_uf?: string;
  titulo_eleitor?: string;
  cnh?: string;
  cartao_sus?: string;
  mora_com_familia?: boolean;
  responsavel_legal?: boolean;
  vinculo_familiar?: string;
  situacao_vulnerabilidade?: string;
  composicao_familiar?: string;
  criancas_adolescentes?: number;
  idosos?: number;
  acompanhamento_cras?: boolean;
  acompanhamento_saude?: boolean;
  participa_comunidade?: string;
  rede_apoio?: string;
  sabe_ler_escrever?: boolean;
  nivel_escolaridade?: string;
  estuda_atualmente?: boolean;
  ocupacao?: string;
  situacao_trabalho?: string;
  local_trabalho?: string;
  renda_mensal?: string;
  fonte_renda?: string;
  possui_deficiencia?: boolean;
  tipo_deficiencia?: string;
  cid_principal?: string;
  usa_medicacao_continua?: boolean;
  descricao_medicacao?: string;
  servico_saude_referencia?: string;
  recebe_beneficio?: boolean;
  beneficios_descricao?: string;
  valor_total_beneficios?: string;
  beneficios_recebidos?: string[];
  aceite_lgpd: boolean;
  data_aceite_lgpd?: string;
  observacoes?: string;
  documentos_obrigatorios?: DocumentoObrigatorioInput[];
};

export type BeneficiarioFilters = {
  nome?: string;
  status?: string;
  codigo?: string;
  cpf?: string;
  nis?: string;
  data_nascimento?: string;
};

export type BeneficiarioAddressSuggestionFilters = {
  municipio?: string;
  bairro?: string;
};
