export type BeneficiarioStatus =
  | "ATIVO"
  | "COMPLETO"
  | "INATIVO"
  | "DESATUALIZADO"
  | "INCOMPLETO"
  | "EM_ANALISE"
  | "BLOQUEADO";

export type DocumentoBeneficiario = {
  id?: string;
  nome: string;
  numeroDocumento?: string;
  nomeArquivo?: string;
  caminhoArquivo?: string;
  contentType?: string;
  obrigatorio?: boolean;
  ignorado?: boolean;
};

export type Beneficiario = {
  id_beneficiario?: string;
  codigo?: string;
  status?: BeneficiarioStatus;
  nome_completo: string;
  nome_social?: string;
  apelido?: string;
  data_nascimento: string;
  foto_3x4?: string;
  nome_mae: string;
  nome_pai?: string;
  sexo_biologico?: string;
  identidade_genero?: string;
  cor_raca?: string;
  estado_civil?: string;
  nacionalidade?: string;
  naturalidade_cidade?: string;
  naturalidade_uf?: string;
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
  cep: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  ponto_referencia?: string;
  municipio?: string;
  uf?: string;
  zona?: string;
  subzona?: string;
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
  documentos_obrigatorios?: DocumentoBeneficiario[];
  data_cadastro?: string;
  data_atualizacao?: string;
};

export type BeneficiarioListaResponse = {
  beneficiarios: Beneficiario[];
};

export type BeneficiarioItemResponse = {
  beneficiario: Beneficiario;
  senha_portal_gerada?: string;
};

export type BeneficiarioFiltro = {
  nome?: string;
  status?: string;
  codigo?: string;
  cpf?: string;
  data_nascimento?: string;
};
